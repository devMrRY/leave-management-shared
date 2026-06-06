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
declare class ConsulClient {
    private consulUrl;
    private consulHost;
    private consulPort;
    constructor();
    /**
     * Check if Consul is available
     */
    isAvailable(): Promise<boolean>;
    /**
     * Register a service with Consul
     */
    registerService(config: ConsulServiceConfig): Promise<boolean>;
    /**
     * Deregister a service from Consul
     */
    deregisterService(serviceId: string): Promise<boolean>;
    /**
     * Discover a service and get its URL
     */
    discoverService(serviceName: string): Promise<ServiceDiscoveryResult | null>;
    /**
     * Get all service instances (with health) for a service
     */
    getAllServiceInstances(serviceName: string): Promise<ConsulServiceInstance[]>;
    /**
     * Build service URL from Consul instance
     */
    private buildServiceUrl;
    /**
     * Get all services from Consul catalog
     */
    listServices(): Promise<Record<string, string[]>>;
    /**
     * Get Consul configuration info for debugging
     */
    getConfig(): {
        consulUrl: string;
        host: string;
        port: number;
    };
}
export declare const consulClient: ConsulClient;
export default consulClient;
