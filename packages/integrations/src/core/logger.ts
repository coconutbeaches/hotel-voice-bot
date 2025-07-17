import winston from 'winston';
import { CircuitBreakerState, IntegrationError } from '@hotel-voice-bot/shared';

export interface LogContext {
  service: string;
  operation: string;
  correlationId?: string;
  guestId?: string;
  reservationId?: string;
  duration?: number;
  circuitBreakerState?: CircuitBreakerState;
  cached?: boolean;
  responseTime?: number;
  [key: string]: any;
}

export interface MetricData {
  name: string;
  value: number;
  tags: Record<string, string>;
  timestamp: Date;
}

class IntegrationLogger {
  private logger: winston.Logger;
  private metrics: MetricData[] = [];

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: 'hotel-voice-bot-integrations',
        environment: process.env.NODE_ENV || 'development',
      },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
        new winston.transports.File({
          filename: 'logs/integration-errors.log',
          level: 'error',
        }),
        new winston.transports.File({
          filename: 'logs/integration-combined.log',
        }),
      ],
    });

    // In production, you might want to add additional transports like:
    // - Elasticsearch/OpenSearch
    // - Datadog
    // - New Relic
    // - CloudWatch
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(message, context);
  }

  error(message: string, error?: Error | IntegrationError, context?: LogContext): void {
    this.logger.error(message, {
      error: error ? {
        message: error.message,
        stack: error.stack,
        ...(error as IntegrationError).details,
      } : undefined,
      ...context,
    });
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, context);
  }

  // API call logging
  logApiCall(
    service: string,
    operation: string,
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context?: Partial<LogContext>
  ): void {
    const logLevel = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';
    
    this.logger.log(logLevel, `API Call: ${service}.${operation}`, {
      service,
      operation,
      http: {
        method,
        url,
        statusCode,
        duration,
      },
      ...context,
    });

    // Record metrics
    this.recordMetric('api_call_duration', duration, {
      service,
      operation,
      method,
      status_code: statusCode.toString(),
    });

    this.recordMetric('api_call_count', 1, {
      service,
      operation,
      method,
      status_code: statusCode.toString(),
    });
  }

  // Circuit breaker logging
  logCircuitBreakerEvent(
    service: string,
    operation: string,
    event: 'open' | 'closed' | 'half-open' | 'failure' | 'success',
    state: CircuitBreakerState,
    context?: Partial<LogContext>
  ): void {
    const logLevel = event === 'open' ? 'warn' : event === 'failure' ? 'error' : 'info';
    
    this.logger.log(logLevel, `Circuit Breaker: ${event} - ${service}.${operation}`, {
      service,
      operation,
      circuitBreaker: {
        event,
        state: state.state,
        failureCount: state.failureCount,
        successCount: state.successCount,
        lastFailureTime: state.lastFailureTime,
        nextAttemptTime: state.nextAttemptTime,
      },
      ...context,
    });

    // Record metrics
    this.recordMetric('circuit_breaker_events', 1, {
      service,
      operation,
      event,
      state: state.state,
    });

    this.recordMetric('circuit_breaker_failure_count', state.failureCount, {
      service,
      operation,
    });
  }

  // Cache logging
  logCacheEvent(
    service: string,
    operation: string,
    event: 'hit' | 'miss' | 'set' | 'invalidate',
    key: string,
    context?: Partial<LogContext>
  ): void {
    this.logger.debug(`Cache: ${event} - ${service}.${operation}`, {
      service,
      operation,
      cache: {
        event,
        key,
      },
      ...context,
    });

    // Record metrics
    this.recordMetric('cache_events', 1, {
      service,
      operation,
      event,
    });
  }

  // Performance logging
  logPerformance(
    service: string,
    operation: string,
    duration: number,
    success: boolean,
    context?: Partial<LogContext>
  ): void {
    const logLevel = success ? 'info' : 'warn';
    
    this.logger.log(logLevel, `Performance: ${service}.${operation}`, {
      service,
      operation,
      performance: {
        duration,
        success,
      },
      ...context,
    });

    // Record metrics
    this.recordMetric('operation_duration', duration, {
      service,
      operation,
      success: success.toString(),
    });

    this.recordMetric('operation_count', 1, {
      service,
      operation,
      success: success.toString(),
    });
  }

  // Business event logging
  logBusinessEvent(
    event: string,
    data: Record<string, any>,
    context?: Partial<LogContext>
  ): void {
    this.logger.info(`Business Event: ${event}`, {
      event,
      data,
      ...context,
    });

    // Record metrics
    this.recordMetric('business_events', 1, {
      event,
      service: context?.service || 'unknown',
    });
  }

  // Metrics recording
  recordMetric(name: string, value: number, tags: Record<string, string>): void {
    this.metrics.push({
      name,
      value,
      tags,
      timestamp: new Date(),
    });

    // In production, you would send these metrics to your monitoring system
    // For now, we'll just log them periodically
    if (this.metrics.length > 100) {
      this.flushMetrics();
    }
  }

  // Flush metrics (in production, this would send to monitoring system)
  flushMetrics(): void {
    if (this.metrics.length === 0) return;

    this.logger.debug('Flushing metrics', {
      metricsCount: this.metrics.length,
      metrics: this.metrics,
    });

    // Clear metrics after flushing
    this.metrics = [];
  }

  // Health check logging
  logHealthCheck(
    service: string,
    healthy: boolean,
    checks: Record<string, { status: 'healthy' | 'unhealthy'; message?: string; duration?: number }>,
    context?: Partial<LogContext>
  ): void {
    const logLevel = healthy ? 'info' : 'error';
    
    this.logger.log(logLevel, `Health Check: ${service}`, {
      service,
      health: {
        healthy,
        checks,
      },
      ...context,
    });

    // Record metrics
    this.recordMetric('health_check', healthy ? 1 : 0, {
      service,
    });

    Object.entries(checks).forEach(([checkName, check]) => {
      this.recordMetric('health_check_detail', check.status === 'healthy' ? 1 : 0, {
        service,
        check: checkName,
      });

      if (check.duration) {
        this.recordMetric('health_check_duration', check.duration, {
          service,
          check: checkName,
        });
      }
    });
  }

  // Security event logging
  logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: Record<string, any>,
    context?: Partial<LogContext>
  ): void {
    const logLevel = severity === 'critical' ? 'error' : severity === 'high' ? 'warn' : 'info';
    
    this.logger.log(logLevel, `Security Event: ${event}`, {
      security: {
        event,
        severity,
        details,
      },
      ...context,
    });

    // Record metrics
    this.recordMetric('security_events', 1, {
      event,
      severity,
      service: context?.service || 'unknown',
    });
  }

  // Get logger instance for direct use
  getLogger(): winston.Logger {
    return this.logger;
  }

  // Get current metrics
  getMetrics(): MetricData[] {
    return [...this.metrics];
  }

  // Clean up resources
  close(): void {
    this.flushMetrics();
    this.logger.close();
  }
}

// Export singleton instance
export const integrationLogger = new IntegrationLogger();

// Export types for external use
export type { IntegrationLogger };

// Helper function to create correlation ID
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to extract correlation ID from headers
export function extractCorrelationId(headers: Record<string, any>): string | undefined {
  return headers['x-correlation-id'] || headers['correlation-id'];
}

// Flush metrics periodically
setInterval(() => {
  integrationLogger.flushMetrics();
}, 60000); // Flush every minute
