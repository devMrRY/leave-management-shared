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
            DeregisterCriticalServiceAfter: "2m",
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
  async deregister(name: string): Promise<void> {
    this.services.delete(name);
  }

  /**
   * Discover a service URL by name (check Consul first, then memory, then env vars)
   */
  async discover(name: string): Promise<string | null> {
    // Try Consul first if available
    const serviceInstances = this.services.get(name);
    const allInstances = [...(serviceInstances?.values() || [])];
    const instance =
      allInstances[Math.floor(Math.random() * allInstances.length)];
    if (instance) {
      return instance.url;
    }

    if (this.isConsulAvailable()) {
      try {
        const result = await consulClient.discoverService(name);
        if (result) {
          return result.url;
        }
      } catch (error) {
        console.warn(
          `⚠️ Consul discovery failed for ${name}:`,
          (error as Error).message,
        );
        return null;
      }
    }
    return null;
  }

  /**
   * Get all registered services
   */
  getAll(): ServiceEntry[] {
    const response: ServiceEntry[] = [];
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
    if (!this.isConsulAvailable()) {
      this.initializeConsul();
      return;
    }

    try {
      // 1. Get all service names from Consul
      const allServices = await consulClient.listServices();
      const serviceNames = Object.keys(allServices);

      // 2. For each service, get all instances (with health)
      for (const name of serviceNames) {
        if (name === "consul") continue;
        const instances = await consulClient.getAllServiceInstances(name);
        let serviceInstances = this.services.get(name);
        for (const instance of instances) {
          const isHealthy =
            !instance.Checks ||
            instance.Checks.every((check: any) => check.Status === "passing");
          const key = instance.Service.ID;
          if (isHealthy) {
            if (!serviceInstances) {
              serviceInstances = new Map<string, ServiceEntry>();
            }
            serviceInstances.set(key, {
              name,
              url: `http://${instance.Service.Address}:${instance.Service.Port}`,
              port: Number(instance.Service.Port),
              healthy: true,
              lastHealthCheck: new Date(),
              source: "consul",
            });
          }
          else {
            if (serviceInstances?.has(key)) {
              serviceInstances.delete(key);
            }
          }
        }
        if (serviceInstances) this.services.set(name, serviceInstances);
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
