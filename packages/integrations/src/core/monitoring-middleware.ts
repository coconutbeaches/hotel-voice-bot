import { integrationLogger, generateCorrelationId, LogContext } from './logger.js';
import { CircuitBreakerState } from '@hotel-voice-bot/shared';

export interface MonitoringConfig {
  enableMetrics: boolean;
  enableTracing: boolean;
  enableLogging: boolean;
  slowQueryThreshold: number; // in milliseconds
  correlationIdHeader: string;
}

export interface OperationMetrics {
  startTime: number;
  correlationId: string;
  service: string;
  operation: string;
  context: Record<string, any>;
}

export class MonitoringMiddleware {
  private config: MonitoringConfig;
  private activeOperations: Map<string, OperationMetrics> = new Map();

  constructor(config: MonitoringConfig) {
    this.config = config;
  }

  // Start monitoring an operation
  startOperation(
    service: string,
    operation: string,
    context: Record<string, any> = {},
    correlationId?: string
  ): string {
    const opId = correlationId || generateCorrelationId();
    
    const metrics: OperationMetrics = {
      startTime: Date.now(),
      correlationId: opId,
      service,
      operation,
      context,
    };

    this.activeOperations.set(opId, metrics);

    if (this.config.enableLogging) {
      integrationLogger.debug(`Starting operation: ${service}.${operation}`, {
        service,
        operation,
        correlationId: opId,
        ...context,
      });
    }

    return opId;
  }

  // End monitoring an operation
  endOperation(
    operationId: string,
    success: boolean,
    result?: any,
    error?: Error,
    additionalContext?: Record<string, any>
  ): void {
    const metrics = this.activeOperations.get(operationId);
    if (!metrics) {
      integrationLogger.warn('Attempted to end operation with unknown ID', {
        operationId,
      });
      return;
    }

    const duration = Date.now() - metrics.startTime;
    const logContext: LogContext = {
      service: metrics.service,
      operation: metrics.operation,
      correlationId: metrics.correlationId,
      duration,
      ...metrics.context,
      ...additionalContext,
    };

    // Log performance
    if (this.config.enableLogging) {
      integrationLogger.logPerformance(
        metrics.service,
        metrics.operation,
        duration,
        success,
        logContext
      );

      // Log slow queries
      if (duration > this.config.slowQueryThreshold) {
        integrationLogger.warn(`Slow operation detected: ${metrics.service}.${metrics.operation}`, {
          ...logContext,
          slowOperation: true,
          threshold: this.config.slowQueryThreshold,
        });
      }
    }

    // Log error if operation failed
    if (!success && error && this.config.enableLogging) {
      integrationLogger.error(
        `Operation failed: ${metrics.service}.${metrics.operation}`,
        error,
        logContext
      );
    }

    // Log success
    if (success && this.config.enableLogging) {
      integrationLogger.info(`Operation completed: ${metrics.service}.${metrics.operation}`, {
        ...logContext,
        result: result ? { type: typeof result, keys: Object.keys(result) } : undefined,
      });
    }

    // Clean up
    this.activeOperations.delete(operationId);
  }

  // Monitor circuit breaker events
  monitorCircuitBreakerEvent(
    service: string,
    operation: string,
    event: 'open' | 'closed' | 'half-open' | 'failure' | 'success',
    state: CircuitBreakerState,
    correlationId?: string
  ): void {
    if (this.config.enableLogging) {
      integrationLogger.logCircuitBreakerEvent(
        service,
        operation,
        event,
        state,
        { correlationId }
      );
    }

    // Log critical events
    if (event === 'open') {
      integrationLogger.error(`Circuit breaker opened for ${service}.${operation}`, undefined, {
        service,
        operation,
        correlationId,
        circuitBreakerState: state,
        severity: 'high',
      });
    }
  }

  // Monitor cache events
  monitorCacheEvent(
    service: string,
    operation: string,
    event: 'hit' | 'miss' | 'set' | 'invalidate',
    key: string,
    correlationId?: string
  ): void {
    if (this.config.enableLogging) {
      integrationLogger.logCacheEvent(
        service,
        operation,
        event,
        key,
        { correlationId }
      );
    }
  }

  // Monitor API calls
  monitorApiCall(
    service: string,
    operation: string,
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    correlationId?: string,
    requestSize?: number,
    responseSize?: number
  ): void {
    if (this.config.enableLogging) {
      integrationLogger.logApiCall(
        service,
        operation,
        method,
        url,
        statusCode,
        duration,
        {
          correlationId,
          requestSize,
          responseSize,
        }
      );
    }

    // Log API errors
    if (statusCode >= 400) {
      integrationLogger.error(`API call failed: ${method} ${url}`, undefined, {
        service,
        operation,
        correlationId,
        http: {
          method,
          url,
          statusCode,
          duration,
        },
      });
    }
  }

  // Monitor business events
  monitorBusinessEvent(
    event: string,
    data: Record<string, any>,
    service: string,
    correlationId?: string
  ): void {
    if (this.config.enableLogging) {
      integrationLogger.logBusinessEvent(event, data, {
        service,
        correlationId,
      });
    }
  }

  // Monitor security events
  monitorSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: Record<string, any>,
    service: string,
    correlationId?: string
  ): void {
    if (this.config.enableLogging) {
      integrationLogger.logSecurityEvent(event, severity, details, {
        service,
        correlationId,
      });
    }
  }

  // Get current operation metrics
  getActiveOperations(): OperationMetrics[] {
    return Array.from(this.activeOperations.values());
  }

  // Get operation count
  getActiveOperationCount(): number {
    return this.activeOperations.size;
  }

  // Check for hanging operations
  getHangingOperations(timeoutMs: number = 300000): OperationMetrics[] {
    const now = Date.now();
    return Array.from(this.activeOperations.values()).filter(
      op => now - op.startTime > timeoutMs
    );
  }

  // Clean up hanging operations
  cleanupHangingOperations(timeoutMs: number = 300000): void {
    const hanging = this.getHangingOperations(timeoutMs);
    
    hanging.forEach(op => {
      integrationLogger.warn(`Cleaning up hanging operation: ${op.service}.${op.operation}`, {
        service: op.service,
        operation: op.operation,
        correlationId: op.correlationId,
        duration: Date.now() - op.startTime,
        timeout: timeoutMs,
      });
      
      this.activeOperations.delete(op.correlationId);
    });
  }

  // Health check
  getHealthStatus(): {
    healthy: boolean;
    activeOperations: number;
    hangingOperations: number;
    lastCleanup: Date;
  } {
    const hangingOps = this.getHangingOperations();
    
    return {
      healthy: hangingOps.length === 0,
      activeOperations: this.getActiveOperationCount(),
      hangingOperations: hangingOps.length,
      lastCleanup: new Date(),
    };
  }
}

// Default configuration
export const defaultMonitoringConfig: MonitoringConfig = {
  enableMetrics: true,
  enableTracing: true,
  enableLogging: true,
  slowQueryThreshold: 5000, // 5 seconds
  correlationIdHeader: 'x-correlation-id',
};

// Export singleton instance
export const monitoringMiddleware = new MonitoringMiddleware(defaultMonitoringConfig);

// Helper function to create monitored wrapper
export function monitored<T extends (...args: any[]) => Promise<any>>(
  service: string,
  operation: string,
  fn: T,
  context?: Record<string, any>
): T {
  return (async (...args: Parameters<T>) => {
    const operationId = monitoringMiddleware.startOperation(service, operation, context);
    
    try {
      const result = await fn(...args);
      monitoringMiddleware.endOperation(operationId, true, result);
      return result;
    } catch (error) {
      monitoringMiddleware.endOperation(operationId, false, undefined, error as Error);
      throw error;
    }
  }) as T;
}

// Cleanup hanging operations periodically
setInterval(() => {
  monitoringMiddleware.cleanupHangingOperations();
}, 60000); // Every minute
