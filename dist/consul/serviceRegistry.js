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
    async register(name, id, port) {
        const url = `http://${name}:${port}`;
        const serviceId = `${name}-${id}`;
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
                    allInstances.get(serviceId).source = "consul";
                    this.services.set(name, allInstances);
                    console.log(`✓ Service registered with Consul: ${name}:${port}`);
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
        console.log(`-------degister checking consul avalability----`, this.isConsulAvailable(), serviceId);
        if (this.isConsulAvailable()) {
            try {
                await consulClient_1.consulClient.deregisterService(serviceId);
                let allInstances = this.services.get(name);
                if (allInstances) {
                    allInstances.delete(serviceId);
                }
                console.log(`✓ Service deregistered from Consul: ${name}`);
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
        console.log(`---${this.isConsulAvailable()}-----`);
        const serviceInstances = this.services.get(name);
        const allInstances = [...(serviceInstances?.values() || [])];
        const instance = allInstances[Math.floor(Math.random() * allInstances.length)];
        if (instance) {
            return instance.url;
        }
        if (this.isConsulAvailable()) {
            try {
                const result = await consulClient_1.consulClient.discoverService(name);
                console.log(`-------discovery response-------`, result?.url);
                if (result) {
                    return result.url;
                }
            }
            catch (error) {
                console.warn(`⚠️ Consul discovery failed for ${name}:`, error.message);
                return null;
            }
        }
        return null;
    }
    /**
     * Get all registered services
     */
    getAll() {
        const response = [];
        console.log(`-------services object---------`, JSON.stringify(this.services.values()));
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
        console.log(`------refreshAll------`, this.isConsulAvailable());
        if (!this.isConsulAvailable()) {
            this.initializeConsul();
            return;
        }
        try {
            // 1. Get all service names from Consul
            const allServices = await consulClient_1.consulClient.listServices();
            console.log(`---------allServices-------`, JSON.stringify(allServices));
            const serviceNames = Object.keys(allServices);
            // 2. For each service, get all instances (with health)
            for (const name of serviceNames) {
                if (name === "consul")
                    continue;
                const instances = await consulClient_1.consulClient.getAllServiceInstances(name);
                let serviceInstances = this.services.get(name);
                console.log(`------all instances-----`, JSON.stringify({ instances }));
                for (const instance of instances) {
                    const isHealthy = !instance.Checks ||
                        instance.Checks.every((check) => check.Status === "passing");
                    const key = instance.Service.ID;
                    console.log(`${key}: isHealth: ${isHealthy}, health: ${JSON.stringify(instance.Checks)}`);
                    if (isHealthy) {
                        if (!serviceInstances) {
                            serviceInstances = new Map();
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
                        console.log(`----deregister service----`, key);
                        if (serviceInstances?.has(key)) {
                            serviceInstances.delete(key);
                        }
                    }
                }
                if (serviceInstances)
                    this.services.set(name, serviceInstances);
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
