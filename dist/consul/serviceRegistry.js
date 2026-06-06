"use strict";
/**
 * Centralized Service Registry for microservices discovery
 * Integrates with Consul for distributed service discovery with fallback to environment variables
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceRegistry = void 0;
const consulClient_1 = require("./consulClient");
class ServiceRegistry {
    constructor() {
        this.services = new Map();
        this.consulAvailable = false;
        this.initializeConsul();
    }
    /**
     * Initialize Consul connection
     */
    async initializeConsul() {
        try {
            this.consulAvailable = await consulClient_1.consulClient.isAvailable();
            if (this.consulAvailable) {
                console.log("✓ Connected to Consul service discovery");
            }
            else {
                console.warn("⚠️ Consul service discovery unavailable - using fallback mode");
            }
        }
        catch (error) {
            console.warn("⚠️ Failed to initialize Consul:", error.message);
            this.consulAvailable = false;
        }
    }
    /**
     * Register a service (with Consul if available, fallback to memory)
     */
    async register(name, host, port) {
        const url = `http://${host}:${port}`;
        const serviceId = `${name}-${host}`;
        const healthCheckUrl = `http://${name}:${port}/health`;
        // Always store in memory for quick access
        let allInstances = this.services.get(name);
        if (!allInstances) {
            allInstances = new Map();
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
                const registered = await consulClient_1.consulClient.registerService({
                    ID: serviceId,
                    Name: name,
                    Address: host,
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
                    allInstances.get(serviceId).source = "consul";
                    this.services.set(name, allInstances);
                    console.log(`✓ Service registered with Consul: ${name} at ${host}:${port}`);
                    console.log(`${serviceId} heath check url ${healthCheckUrl}`);
                    break;
                }
            }
            catch (error) {
                console.warn(`⚠️ Consul registration failed for ${name}, using memory storage:`, error.message);
                await new Promise((resolve) => setTimeout(resolve, 5000));
            }
        }
    }
    /**
     * Deregister a service from Consul
     */
    async deregister(name, serviceId) {
        if (this.consulAvailable) {
            try {
                await consulClient_1.consulClient.deregisterService(serviceId);
                console.log(`✓ Service deregistered from Consul: ${name}`);
                let allInstances = this.services.get(name);
                if (allInstances) {
                    allInstances.delete(serviceId);
                }
            }
            catch (error) {
                console.error(`✗ Failed to deregister from Consul:`, error.message);
            }
        }
    }
    /**
     * Discover a service URL by name (check Consul first, then memory, then env vars)
     */
    async discover(name) {
        // Try Consul first if available
        if (this.consulAvailable) {
            try {
                const result = await consulClient_1.consulClient.discoverService(name);
                if (result) {
                    const key = result.instances[0]?.Service.ID;
                    // Update memory cache
                    let allInstances = this.services.get(name);
                    if (!allInstances) {
                        allInstances = new Map();
                    }
                    allInstances.delete(key);
                    allInstances.set(key, {
                        name,
                        url: result.url,
                        port: result.instances[0].Service.Port || 0,
                        healthy: true,
                        lastHealthCheck: new Date(),
                        source: "consul",
                    });
                    // this.services.set(name, allInstances);
                    return result.url;
                }
            }
            catch (error) {
                console.warn(`⚠️ Consul discovery failed for ${name}:`, error.message);
            }
        }
        // Fall back to memory
        const allInstancesMap = this.services.get(name);
        if (allInstancesMap) {
            const allInstances = [...allInstancesMap.values()];
            const service = allInstances[Math.floor(Math.random() * allInstances.length)];
            return service.url;
        }
        console.warn(`⚠ Service not found: ${name}`);
        return null;
    }
    /**
     * Get all registered services
     */
    getAll() {
        const response = [];
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
    isRegistered(name) {
        const serviceMap = this.services.get(name);
        const servicesInstances = [...(serviceMap?.values() || [])];
        return servicesInstances.length > 0;
    }
    /**
     * Check Consul availability
     */
    isConsulAvailable() {
        return this.consulAvailable;
    }
    /**
     * Get discovery info for debugging
     */
    getDiscoveryInfo() {
        return {
            consul: {
                available: this.consulAvailable,
                config: this.consulAvailable ? consulClient_1.consulClient.getConfig() : null,
            },
            services: this.getAll(),
        };
    }
    /**
     * Refresh all services: keep healthy, remove/deregister unhealthy
     */
    async refreshAll() {
        if (!this.consulAvailable)
            return;
        try {
            // 1. Get all service names from Consul
            const allServices = await consulClient_1.consulClient.listServices();
            const serviceNames = Object.keys(allServices);
            // 2. For each service, get all instances (with health)
            for (const name of serviceNames) {
                if (name === "consul")
                    continue;
                const instances = await consulClient_1.consulClient.getAllServiceInstances(name);
                const serviceInstances = this.services.get(name);
                for (const instance of instances) {
                    const isHealthy = !instance.Checks ||
                        instance.Checks.every((check) => check.Status === "passing");
                    const key = instance.Service.ID;
                    console.log(`${key}: health: ${JSON.stringify(instance.Checks)}`);
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
                    else {
                        const serviceInstances = this.services.get(name);
                        if (serviceInstances?.has(key)) {
                            serviceInstances.delete(key);
                        }
                        // Try to deregister this unhealthy instance (by instance ID if available)
                        try {
                            await this.deregister(name, key);
                        }
                        catch (err) {
                            console.warn(`Failed to deregister unhealthy instance ${key}:`, err.message);
                        }
                    }
                }
                if (serviceInstances) {
                    this.services.set(name, serviceInstances);
                }
            }
        }
        catch (err) {
            console.error("Error refreshing services from Consul:", err.message);
        }
    }
}
// Export singleton instance
exports.serviceRegistry = new ServiceRegistry();
exports.default = exports.serviceRegistry;
