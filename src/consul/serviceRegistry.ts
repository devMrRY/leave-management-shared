/**
 * Centralized Service Registry for microservices discovery
 * Integrates with Consul for distributed service discovery with fallback to environment variables
 */

import { consulClient } from './consulClient';

interface ServiceEntry {
  name: string;
  url: string;
  port: number;
  healthy?: boolean;
  lastHealthCheck?: Date;
  source?: 'consul' | 'env' | 'memory';
}

class ServiceRegistry {
  private services: Map<string, ServiceEntry> = new Map();
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
        console.log('✓ Connected to Consul service discovery');
      } else {
        console.warn('⚠️ Consul service discovery unavailable - using fallback mode');
      }
    } catch (error) {
      console.warn('⚠️ Failed to initialize Consul:', (error as Error).message);
      this.consulAvailable = false;
    }
  }

  /**
   * Register a service (with Consul if available, fallback to memory)
   */
  async register(name: string, host: string, port: number): Promise<void> {
    const url = `http://${host}:${port}`;
    const serviceId = `${name}-${host}`;
    const healthCheckUrl = `http://${host}:${port}/health`;

    // Always store in memory for quick access
    this.services.set(name, {
      name,
      url,
      port,
      healthy: true,
      lastHealthCheck: new Date(),
      source: 'memory'
    });

    // If Consul available, register there too
    (async () => {
      while (true) {
        try {
          const registered = await consulClient.registerService({
            ID: serviceId,
            Name: name,
            Address: host,
            Port: port,
            Check: {
              HTTP: healthCheckUrl,
              Interval: '10s',
              Timeout: '5s',
              DeregisterCriticalServiceAfter: '30s'
            },
            Tags: ['v1']
          });
  
          if (registered) {
            this.services.get(name)!.source = 'consul';
            console.log(`✓ Service registered with Consul: ${name}`);
            break;
          }
        } catch (error) {
          console.warn(`⚠️ Consul registration failed for ${name}, using memory storage:`, (error as Error).message);
          await new Promise(resolve =>
            setTimeout(resolve, 5000)
          );
        }
      }
    })();
  }

  /**
   * Deregister a service from Consul
   */
  async deregister(id: string): Promise<void> {
    const serviceId = `${id}`;

    if (this.consulAvailable && this.services.has(serviceId)) {
      try {
        await consulClient.deregisterService(serviceId);
        this.services.delete(serviceId);
        console.log(`✓ Service deregistered from Consul: ${name}`);
      } catch (error) {
        console.error(`✗ Failed to deregister from Consul:`, (error as Error).message);
      }
    }
  }

  /**
   * Discover a service URL by name (check Consul first, then memory, then env vars)
   */
  async discover(name: string): Promise<string | null> {
    // Try Consul first if available
    if (this.consulAvailable) {
      try {
        const result = await consulClient.discoverService(name);
        if (result) {
          const key = `${name}-${result.instances[0]?.ServiceAddress || '1'}`;
          // Update memory cache
          this.services.set(key, {
            name,
            url: result.url,
            port: parseInt(result.url.split(':').pop() || '0', 10),
            healthy: true,
            lastHealthCheck: new Date(),
            source: 'consul'
          });
          return result.url;
        }
      } catch (error) {
        console.warn(`⚠️ Consul discovery failed for ${name}:`, (error as Error).message);
      }
    }

    // Fall back to memory
    const service = this.services.get(name);
    if (service) {
      return service.url;
    }

    // Fall back to environment variables
    const envKey = `${name.toUpperCase().replace(/-/g, '_')}_URL`;
    const envUrl = process.env[envKey];
    if (envUrl) {
      console.warn(`⚠️ Using environment variable fallback for ${name}: ${envKey}`);
      return envUrl;
    }

    console.warn(`⚠ Service not found: ${name}`);
    return null;
  }

  /**
   * Get all registered services
   */
  getAll(): ServiceEntry[] {
    return Array.from(this.services.values());
  }

  /**
   * Check if a service is registered
   */
  isRegistered(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Update service health status
   */
  setHealthStatus(name: string, healthy: boolean): void {
    const service = this.services.get(name);
    if (service) {
      service.healthy = healthy;
      service.lastHealthCheck = new Date();
    }
  }

  /**
   * Get service health status
   */
  getHealthStatus(name: string): boolean | null {
    const service = this.services.get(name);
    return service ? service.healthy ?? false : null;
  }

  /**
   * List all services with their status
   */
  status(): string {
    if (this.services.size === 0) {
      return 'No services registered';
    }

    return Array.from(this.services.values())
      .map(s => `${s.name}: ${s.url} (${s.healthy ? 'healthy' : 'unhealthy'}) [${s.source}]`)
      .join('\n');
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
  getDiscoveryInfo(): { consul: { available: boolean; config: any }, services: ServiceEntry[] } {
    return {
      consul: {
        available: this.consulAvailable,
        config: this.consulAvailable ? consulClient.getConfig() : null
      },
      services: this.getAll()
    };
  }

  /**
   * Refresh all services: keep healthy, remove/deregister unhealthy
   */
  async refreshAll(): Promise<void> {
    if (!this.consulAvailable) return;

    try {
      // 1. Get all service names from Consul
      const allServices = await consulClient.listServices();
      const serviceNames = Object.keys(allServices);

      // 2. For each service, get all instances (with health)
      for (const name of serviceNames) {
        if (name === 'consul') continue;
        const instances = await consulClient.getAllServiceInstances(name);
        for (const instance of instances) {
          const isHealthy = !instance.Checks || instance.Checks.every((check: any) => check.Status === 'passing');
          const key = instance.Service.ID || '1';
          
          if (isHealthy) {
            this.services.set(key, {
              name,
              url: `http://${instance.Service.Address}:${instance.Service.Port}`,
              port: Number(instance.Service.Port),
              healthy: true,
              lastHealthCheck: new Date(),
              source: 'consul'
            });
          } else {
            this.services.delete(key);
            // Try to deregister this unhealthy instance (by instance ID if available)
            try {
              await this.deregister(key);
            } catch (err) {
              console.warn(`Failed to deregister unhealthy instance ${key}:`, (err as Error).message);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error refreshing services from Consul:', (err as Error).message);
    }
  }
}

// Export singleton instance
export const serviceRegistry = new ServiceRegistry();
export default serviceRegistry;
