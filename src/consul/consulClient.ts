/**
 * Consul Service Discovery Client
 * Communicates with Consul HTTP API for service registration, discovery, and health checks
 */

interface ConsulServiceConfig {
  ID: string;
  Name: string;
  Address: string;
  Port: number;
  Check?: {
    HTTP: string;
    Interval: string;
    Timeout: string;
    DeregisterCriticalServiceAfter?: string;
  };
  Tags?: string[];
}

interface ConsulServiceInstance {
  ID: string;
  Service: {
    ID: string;
    Service: string;
    Address: string;
    Port: number;
    Tags?: string[];
  };
  Checks: Array<{
    CheckID: string;
    Name: string;
    Status: string;
  }>;
}

interface ServiceDiscoveryResult {
  url: string;
  instances: ConsulServiceInstance[];
}

class ConsulClient {
  private consulUrl: string;
  private consulHost: string;
  private consulPort: number;

  constructor() {
    this.consulHost = process.env.CONSUL_HOST || "consul";
    this.consulPort = parseInt(process.env.CONSUL_PORT || "8500", 10);
    this.consulUrl = `http://${this.consulHost}:${this.consulPort}`;
  }

  /**
   * Check if Consul is available
   */
  async isAvailable(): Promise<boolean> {
    for (let i = 0; i < 5; i++) {
      try {
        console.log(`Checking consul attempt ${i + 1}`);
        console.log("Checking consul: ", this.consulUrl);
        const response = await fetch(`${this.consulUrl}/v1/agent/self`);
        console.log("Status: ", response.status);
        return response.ok;
      } catch (error) {
        console.log(`consul unavailable reAttempt ${i + 1} failed`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
    return false;
  }

  /**
   * Register a service with Consul
   */
  async registerService(config: ConsulServiceConfig): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.consulUrl}/v1/agent/service/register`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        },
      );

      if (!response.ok) {
        throw new Error(`Registration failed: ${response.statusText}`);
      }
      return true;
    } catch (error) {
      console.error("✗ Consul registration failed:", (error as Error).message);
      return false;
    }
  }

  /**
   * Deregister a service from Consul
   */
  async deregisterService(serviceId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.consulUrl}/v1/agent/service/deregister/${serviceId}`,
        {
          method: "PUT",
        },
      );

      if (!response.ok) {
        throw new Error(`Deregistration failed: ${response.statusText}`);
      }
      return true;
    } catch (error) {
      console.error(
        "✗ Consul deregistration failed:",
        (error as Error).message,
      );
      return false;
    }
  }

  /**
   * Discover a service and get its URL
   */
  async discoverService(
    serviceName: string,
  ): Promise<ServiceDiscoveryResult | null> {
    try {
      const response = await fetch(
        `${this.consulUrl}/v1/health/service/${serviceName}?passing=true`,
      );
      if (!response.ok) {
        throw new Error(`Discovery failed: ${response.statusText}`);
      }
      const healthyInstances: ConsulServiceInstance[] = await response.json();

      if (healthyInstances.length === 0) {
        console.warn(`⚠️ No healthy instances for service: ${serviceName}`);
        return null;
      }

      // Use first healthy instance (in production, implement load balancing)
      const instance =
        healthyInstances[Math.floor(Math.random() * healthyInstances.length)];
      const url = this.buildServiceUrl(instance);
      console.log(`----found instance :: ${instance}-------`);
      return { url, instances: [instance] };
    } catch (error) {
      console.warn(
        `⚠️ Service discovery failed for ${serviceName}:`,
        (error as Error).message,
      );
      return null;
    }
  }

  /**
   * Get all service instances (with health) for a service
   */
  async getAllServiceInstances(
    serviceName: string,
  ): Promise<ConsulServiceInstance[]> {
    try {
      const response = await fetch(
        `${this.consulUrl}/v1/health/service/${serviceName}`,
      );
      if (!response.ok) {
        throw new Error(
          `Failed to fetch all service instances: ${response.statusText}`,
        );
      }
      // Consul returns array of objects with .Service and .Checks
      const data = await response.json();
      // Normalize to ConsulServiceInstance[]
      return data.map((item: any) => ({
        ID: item.Service.ID,
        Service: item.Service,
        Checks: item.Checks,
      }));
    } catch (error) {
      console.warn(
        `⚠️ Failed to get all service instances for ${serviceName}:`,
        (error as Error).message,
      );
      return [];
    }
  }

  /**
   * Build service URL from Consul instance
   */
  private buildServiceUrl(instance: any): string {
    const { Address, Port } = instance.Service;
    return `http://${Address}:${Port}`;
  }

  /**
   * Get all services from Consul catalog
   */
  async listServices(): Promise<Record<string, string[]>> {
    try {
      const response = await fetch(`${this.consulUrl}/v1/catalog/services`);

      if (!response.ok) {
        throw new Error(`List services failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.warn("⚠️ Failed to list services:", (error as Error).message);
      return {};
    }
  }

  /**
   * Get Consul configuration info for debugging
   */
  getConfig(): { consulUrl: string; host: string; port: number } {
    return {
      consulUrl: this.consulUrl,
      host: this.consulHost,
      port: this.consulPort,
    };
  }
}

// Export singleton instance
export const consulClient = new ConsulClient();
export default consulClient;
