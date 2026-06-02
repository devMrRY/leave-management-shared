/**
 * Environment-specific service configuration
 * Automatically detects environment and loads appropriate defaults
 */
export type Environment = 'development' | 'docker' | 'production';
interface ServiceConfig {
    name: string;
    host: string;
    port: number;
}
interface EnvironmentConfig {
    environment: Environment;
    services: {
        userService: ServiceConfig;
        leaveService: ServiceConfig;
        mongo: ServiceConfig;
        gateway: ServiceConfig;
    };
}
/**
 * Detect current environment
 */
declare function detectEnvironment(): Environment;
export declare const config: EnvironmentConfig;
export { detectEnvironment };
