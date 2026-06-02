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
function detectEnvironment(): Environment {
  const env = process.env.NODE_ENV || 'development';
  const dockerized = process.env.DOCKER_ENV === 'true';

  if (dockerized) {
    return 'docker';
  }

  if (env === 'production') {
    return 'production';
  }

  return 'development';
}

/**
 * Get configuration for current environment
 */
function getConfig(): EnvironmentConfig {
  const environment = detectEnvironment();

  const configs: Record<Environment, EnvironmentConfig> = {
    development: {
      environment: 'development',
      services: {
        userService: { name: 'user-service', host: 'http://localhost', port: 3000 },
        leaveService: { name: 'leave-service', host: 'http://localhost', port: 4000 },
        mongo: { name: 'mongo', host: 'mongodb://localhost', port: 27017 },
        gateway: { name: 'api-gateway', host: 'http://localhost', port: 5000 }
      }
    },
    docker: {
      environment: 'docker',
      services: {
        // In Docker, use service names as hostnames (Docker DNS)
        userService: { name: 'user-service', host: 'user-service', port: 3000 },
        leaveService: { name: 'leave-service', host: 'leave-service', port: 4000 },
        mongo: { name: 'mongo', host: 'mongodb://mongo', port: 27017 },
        gateway: { name: 'api-gateway', host: 'api-gateway', port: 5000 }
      }
    },
    production: {
      environment: 'production',
      services: {
        // In production, use environment variables or cloud DNS
        userService: {
          name: 'user-service',
          host: process.env.USER_SERVICE_HOST || 'http://user-service',
          port: parseInt(process.env.USER_SERVICE_PORT || '3000', 10)
        },
        leaveService: {
          name: 'leave-service',
          host: process.env.LEAVE_SERVICE_HOST || 'http://leave-service',
          port: parseInt(process.env.LEAVE_SERVICE_PORT || '4000', 10)
        },
        mongo: {
          name: 'mongo',
          host: process.env.MONGO_HOST || 'mongodb://mongo',
          port: parseInt(process.env.MONGO_PORT || '27017', 10)
        },
        gateway: {
          name: 'api-gateway',
          host: process.env.GATEWAY_HOST || 'http://api-gateway',
          port: parseInt(process.env.GATEWAY_PORT || '5000', 10)
        }
      }
    }
  };

  return configs[environment];
}

export const config = getConfig();
export { detectEnvironment };
