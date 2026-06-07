/**
 * Centralized Service Registry for microservices discovery
 * Integrates with Consul for distributed service discovery with fallback to environment variables
 */

import { consulClient } from "./consulClient";

interface ServiceEntry {
  name: string;
  url: string;
  port: number;
  healthy?: boolean;
  lastHealthCheck?: Date;
  source?: "consul" | "memory";
}

class ServiceRegistry {
  private services: Map<string, Map<string, ServiceEntry>> = new Map();
  private consulAvailable: boolean = false;

  constructor() {
    this.initializeConsul();
  }

  /**
   * Initialize Consul connection
   */
  private async initializeConsul(): Promise<void> {
    try {
      this.consulAvailable = await consulClient.isAvailable();
      if (this.consulAvailable) {
        console.log("✓ Connected to Consul service discovery");
      } else {
        console.warn(
          "⚠️ Consul service discovery unavailable - using fallback mode",
        );
      }
    } catch (error) {
      console.warn("⚠️ Failed to initialize Consul:", (error as Error).message);
      this.consulAvailable = false;
    }
  }

  /**
   * Register a service (with Consul if available, fallback to memory)
   */
  async register(name: string, id: string, port: number): Promise<void> {
    const url = `http://${name}:${port}`;
    const serviceId = `${name}-${id}`;
    const healthCheckUrl = `http://${name}:${port}/health`;
    // Always store in memory for quick access
    let allInstances = this.services.get(name);
    if (!allInstances) {
      allInstances = new Map<string, ServiceEntry>();
      allInstances.set(serviceId, {
        name,
        url,
        port,
        healthy: true,
        lastHealthCheck: new Date(),
        source: "memory",
      });
      this.services.set(name, allInstances);
    }
    // If Consul available, register there too
    let counter = 0;
    while (counter < 5) {
      counter++;
      try {
        const registered = await consulClient.registerService({
          ID: serviceId,
          Name: name,
          Address: name,
          Port: port,
          Check: {
            HTTP: healthCheckUrl,
            Interval: "10s",
            Timeout: "5s",
            DeregisterCriticalServiceAfter: "60s",
          },
          Tags: ["v1"],
        });

        if (registered) {
          allInstances.get(serviceId)!.source = "consul";
          this.services.set(name, allInstances);
          console.log(`✓ Service registered with Consul: ${name}:${port}`);
          console.log(`${serviceId} heath check url ${healthCheckUrl}`);
          break;
        }
      } catch (error) {
        console.warn(
          `⚠️ Consul registration failed for ${name}, using memory storage:`,
          (error as Error).message,
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  /**
   * Deregister a service from Consul
   */
  async deregister(name: string, serviceId: string): Promise<void> {
    console.log(`-------degister checking consul avalability----`, this.isConsulAvailable(), serviceId);
    if (this.isConsulAvailable()) {
      try {
        await consulClient.deregisterService(serviceId);
        let allInstances = this.services.get(name);
        if (allInstances) {
          allInstances.delete(serviceId);
        }
        console.log(`✓ Service deregistered from Consul: ${name}`);
      } catch (error) {
        console.error(
          `✗ Failed to deregister from Consul:`,
          (error as Error).message,
        );
      }
    }
  }

  /**
   * Discover a service URL by name (check Consul first, then memory, then env vars)
   */
  async discover(name: string): Promise<string | null> {
    // Try Consul first if available
    console.log(`---${this.isConsulAvailable()}-----`);
    if (this.isConsulAvailable()) {
      try {
        const result = await consulClient.discoverService(name);
        console.log(`-------discovery response-------`, result?.url);
        if (result) {
          return result.url;
        }
      } catch (error) {
        console.warn(
          `⚠️ Consul discovery failed for ${name}:`,
          (error as Error).message,
        );
      }
    }
    const fallback = this.services.get(name);
    if (!fallback) return null;
    const instances = [...fallback.values()];
    return instances[Math.floor(Math.random() * instances.length)].url;
  }

  /**
   * Get all registered services
   */
  getAll(): ServiceEntry[] {
    const response: ServiceEntry[] = [];
    console.log(`-------services object---------`, JSON.stringify(this.services.values()))
    const allServices = [...this.services.values()];
    if (allServices?.length) {
      allServices.forEach((service) => {
        response.push(...service.values());
      });
    }
    return response;
  }

  /**
   * Check if a service is registered
   */
  isRegistered(name: string): boolean {
    const serviceMap = this.services.get(name);
    const servicesInstances = [...(serviceMap?.values() || [])];
    return servicesInstances.length > 0;
  }

  /**
   * Check Consul availability
   */
  isConsulAvailable(): boolean {
    return this.consulAvailable;
  }

  /**
   * Get discovery info for debugging
   */
  getDiscoveryInfo(): {
    consul: { available: boolean; config: any };
    services: ServiceEntry[];
  } {
    return {
      consul: {
        available: this.consulAvailable,
        config: this.consulAvailable ? consulClient.getConfig() : null,
      },
      services: this.getAll(),
    };
  }

  /**
   * Refresh all services: keep healthy, remove/deregister unhealthy
   */
  async refreshAll(): Promise<void> {
    console.log(`------refreshAll------`, this.isConsulAvailable());
    if (!this.isConsulAvailable()) return;

    try {
      // 1. Get all service names from Consul
      const allServices = await consulClient.listServices();
      console.log(`---------allServices-------`, JSON.stringify(allServices));
      const serviceNames = Object.keys(allServices);

      // 2. For each service, get all instances (with health)
      for (const name of serviceNames) {
        if (name === "consul") continue;
        const instances = await consulClient.getAllServiceInstances(name);
        const serviceInstances = this.services.get(name);
        console.log(`------all instances-----`, JSON.stringify({ instances, memoryInstances: serviceInstances }));
        for (const instance of instances) {
          const isHealthy =
            !instance.Checks ||
            instance.Checks.every((check: any) => check.Status === "passing");
          const key = instance.Service.ID;
          console.log(`${key}: isHealth: ${isHealthy}, health: ${JSON.stringify(instance.Checks)}`);
          if (isHealthy) {
            if (serviceInstances?.has(key)) {
              serviceInstances.set(key, {
                name,
                url: `http://${instance.Service.Address}:${instance.Service.Port}`,
                port: Number(instance.Service.Port),
                healthy: true,
                lastHealthCheck: new Date(),
                source: "consul",
              });
            }
          } 
          // else {
          //   console.log(`----deregister service----`, key);
          //   if (serviceInstances?.has(key)) {
          //     serviceInstances.delete(key);
          //   }
          //   // Try to deregister this unhealthy instance (by instance ID if available)
          //   try {
          //     await this.deregister(name, key);
          //   } catch (err) {
          //     console.warn(
          //       `Failed to deregister unhealthy instance ${key}:`,
          //       (err as Error).message,
          //     );
          //   }
          // }
        }
      }
    } catch (err) {
      console.error(
        "Error refreshing services from Consul:",
        (err as Error).message,
      );
    }
  }
}

// Export singleton instance
export const serviceRegistry = new ServiceRegistry();
export default serviceRegistry;
