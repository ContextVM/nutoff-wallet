/**
 * Standardized service lifecycle interface for consistent service management
 */
export interface ServiceLifecycle {
  /**
   * Initialize the service with required dependencies
   */
  initialize(...args: any[]): Promise<void>;

  /**
   * Start the service (for services that need explicit starting)
   */
  start?(): Promise<void>;

  /**
   * Stop the service (for services that need explicit stopping)
   */
  stop?(): Promise<void>;

  /**
   * Cleanup resources and prepare for shutdown
   */
  cleanup(): Promise<void>;

  /**
   * Check if service is ready for operations
   */
  isReady(): boolean;
}

/**
 * Service registry for managing service dependencies and lifecycle
 */
export class ServiceRegistry {
  private services: Map<string, ServiceLifecycle> = new Map();
  private initialized = false;

  /**
   * Register a service with the registry
   */
  register(name: string, service: ServiceLifecycle): void {
    if (this.services.has(name)) {
      throw new Error(`Service '${name}' is already registered`);
    }
    this.services.set(name, service);
  }

  /**
   * Get a service by name
   */
  get<T extends ServiceLifecycle>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not found in registry`);
    }
    return service as T;
  }

  /**
   * Initialize all registered services
   */
  async initializeAll(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.error("Initializing all services...");

    for (const [name, service] of this.services) {
      try {
        await service.initialize();
        console.error(`Service '${name}' initialized successfully`);
      } catch (error) {
        console.error(`Failed to initialize service '${name}':`, error);
        throw error;
      }
    }

    this.initialized = true;
    console.error("All services initialized successfully");
  }

  /**
   * Start all services that have start methods
   */
  async startAll(): Promise<void> {
    for (const [name, service] of this.services) {
      if (service.start) {
        try {
          await service.start();
          console.error(`Service '${name}' started successfully`);
        } catch (error) {
          console.error(`Failed to start service '${name}':`, error);
          throw error;
        }
      }
    }
  }

  /**
   * Stop all services that have stop methods
   */
  async stopAll(): Promise<void> {
    for (const [name, service] of this.services) {
      if (service.stop) {
        try {
          await service.stop();
          console.error(`Service '${name}' stopped successfully`);
        } catch (error) {
          console.error(`Failed to stop service '${name}':`, error);
        }
      }
    }
  }

  /**
   * Cleanup all services
   */
  async cleanupAll(): Promise<void> {
    for (const [name, service] of this.services) {
      try {
        await service.cleanup();
        console.error(`Service '${name}' cleaned up successfully`);
      } catch (error) {
        console.error(`Failed to cleanup service '${name}':`, error);
      }
    }
    this.initialized = false;
  }

  /**
   * Check if all services are ready
   */
  areAllReady(): boolean {
    for (const service of this.services.values()) {
      if (!service.isReady()) {
        return false;
      }
    }
    return true;
  }
}
