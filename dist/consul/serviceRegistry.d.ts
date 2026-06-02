/**
 * Centralized Service Registry for microservices discovery
 * Integrates with Consul for distributed service discovery with fallback to environment variables
 */
interface ServiceEntry {
    name: string;
    url: string;
    port: number;
    healthy?: boolean;
    lastHealthCheck?: Date;
    source?: 'consul' | 'env' | 'memory';
}
declare class ServiceRegistry {
    private services;
    private consulAvailable;
    constructor();
    /**
     * Initialize Consul connection
     */
    private initializeConsul;
    /**
     * Register a service (with Consul if available, fallback to memory)
     */
    register(name: string, host: string, port: number): Promise<void>;
    /**
     * Deregister a service from Consul
     */
    deregister(id: string): Promise<void>;
    /**
     * Discover a service URL by name (check Consul first, then memory, then env vars)
     */
    discover(name: string): Promise<string | null>;
    /**
     * Get all registered services
     */
    getAll(): ServiceEntry[];
    /**
     * Check if a service is registered
     */
    isRegistered(name: string): boolean;
    /**
     * Update service health status
     */
    setHealthStatus(name: string, healthy: boolean): void;
    /**
     * Get service health status
     */
    getHealthStatus(name: string): boolean | null;
    /**
     * List all services with their status
     */
    status(): string;
    /**
     * Check Consul availability
     */
    isConsulAvailable(): boolean;
    /**
     * Get discovery info for debugging
     */
    getDiscoveryInfo(): {
        consul: {
            available: boolean;
            config: any;
        };
        services: ServiceEntry[];
    };
    /**
     * Refresh all services: keep healthy, remove/deregister unhealthy
     */
    refreshAll(): Promise<void>;
}
export declare const serviceRegistry: ServiceRegistry;
export default serviceRegistry;
