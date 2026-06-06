"use strict";
/**
 * Consul Service Discovery Client
 * Communicates with Consul HTTP API for service registration, discovery, and health checks
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.consulClient = void 0;
class ConsulClient {
    constructor() {
        this.consulHost = process.env.CONSUL_HOST || "consul";
        this.consulPort = parseInt(process.env.CONSUL_PORT || "8500", 10);
        this.consulUrl = `http://${this.consulHost}:${this.consulPort}`;
    }
    /**
     * Check if Consul is available
     */
    async isAvailable() {
        try {
            const response = await fetch(`${this.consulUrl}/v1/agent/self`, {
                timeout: 2000,
            });
            return response.ok;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Register a service with Consul
     */
    async registerService(config) {
        try {
            const response = await fetch(`${this.consulUrl}/v1/agent/service/register`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config),
            });
            if (!response.ok) {
                throw new Error(`Registration failed: ${response.statusText}`);
            }
            console.log(`✓ Registered with Consul: ${config.Name} (${config.Address}:${config.Port})`);
            return true;
        }
        catch (error) {
            console.error("✗ Consul registration failed:", error.message);
            return false;
        }
    }
    /**
     * Deregister a service from Consul
     */
    async deregisterService(serviceId) {
        try {
            const response = await fetch(`${this.consulUrl}/v1/agent/service/deregister/${serviceId}`, {
                method: "PUT",
            });
            if (!response.ok) {
                throw new Error(`Deregistration failed: ${response.statusText}`);
            }
            console.log(`✓ Deregistered from Consul: ${serviceId}`);
            return true;
        }
        catch (error) {
            console.error("✗ Consul deregistration failed:", error.message);
            return false;
        }
    }
    /**
     * Discover a service and get its URL
     */
    async discoverService(serviceName) {
        try {
            const response = await fetch(`${this.consulUrl}/v1/health/service/${serviceName}?passing=true`);
            if (!response.ok) {
                throw new Error(`Discovery failed: ${response.statusText}`);
            }
            const healthyInstances = await response.json();
            if (healthyInstances.length === 0) {
                console.warn(`⚠️ No healthy instances for service: ${serviceName}`);
                return null;
            }
            // Use first healthy instance (in production, implement load balancing)
            const instance = healthyInstances[Math.floor(Math.random() * healthyInstances.length)];
            const url = this.buildServiceUrl(instance);
            return { url, instances: [instance] };
        }
        catch (error) {
            console.warn(`⚠️ Service discovery failed for ${serviceName}:`, error.message);
            return null;
        }
    }
    /**
     * Get all service instances (with health) for a service
     */
    async getAllServiceInstances(serviceName) {
        try {
            const response = await fetch(`${this.consulUrl}/v1/health/service/${serviceName}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch all service instances: ${response.statusText}`);
            }
            // Consul returns array of objects with .Service and .Checks
            const data = await response.json();
            // Normalize to ConsulServiceInstance[]
            return data.map((item) => ({
                ID: item.Service.ID,
                Service: item.Service,
                Checks: item.Checks,
            }));
        }
        catch (error) {
            console.warn(`⚠️ Failed to get all service instances for ${serviceName}:`, error.message);
            return [];
        }
    }
    /**
     * Build service URL from Consul instance
     */
    buildServiceUrl(instance) {
        const { Address, Port } = instance.Service;
        return `http://${Address}:${Port}`;
    }
    /**
     * Get all services from Consul catalog
     */
    async listServices() {
        try {
            const response = await fetch(`${this.consulUrl}/v1/catalog/services`);
            if (!response.ok) {
                throw new Error(`List services failed: ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            console.warn("⚠️ Failed to list services:", error.message);
            return {};
        }
    }
    /**
     * Get Consul configuration info for debugging
     */
    getConfig() {
        return {
            consulUrl: this.consulUrl,
            host: this.consulHost,
            port: this.consulPort,
        };
    }
}
// Export singleton instance
exports.consulClient = new ConsulClient();
exports.default = exports.consulClient;
