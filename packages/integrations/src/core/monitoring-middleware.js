import { integrationLogger, generateCorrelationId } from './logger.js';
export class MonitoringMiddleware {
    config;
    activeOperations = new Map();
    constructor(config) {
        this.config = config;
    }
    startOperation(service, operation, context = {}, correlationId) {
        const opId = correlationId || generateCorrelationId();
        const metrics = {
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
    endOperation(operationId, success, result, error, additionalContext) {
        const metrics = this.activeOperations.get(operationId);
        if (!metrics) {
            integrationLogger.warn('Attempted to end operation with unknown ID', {
                operationId,
            });
            return;
        }
        const duration = Date.now() - metrics.startTime;
        const logContext = {
            service: metrics.service,
            operation: metrics.operation,
            correlationId: metrics.correlationId,
            duration,
            ...metrics.context,
            ...additionalContext,
        };
        if (this.config.enableLogging) {
            integrationLogger.logPerformance(metrics.service, metrics.operation, duration, success, logContext);
            if (duration > this.config.slowQueryThreshold) {
                integrationLogger.warn(`Slow operation detected: ${metrics.service}.${metrics.operation}`, {
                    ...logContext,
                    slowOperation: true,
                    threshold: this.config.slowQueryThreshold,
                });
            }
        }
        if (!success && error && this.config.enableLogging) {
            integrationLogger.error(`Operation failed: ${metrics.service}.${metrics.operation}`, error, logContext);
        }
        if (success && this.config.enableLogging) {
            integrationLogger.info(`Operation completed: ${metrics.service}.${metrics.operation}`, {
                ...logContext,
                result: result ? { type: typeof result, keys: Object.keys(result) } : undefined,
            });
        }
        this.activeOperations.delete(operationId);
    }
    monitorCircuitBreakerEvent(service, operation, event, state, correlationId) {
        if (this.config.enableLogging) {
            integrationLogger.logCircuitBreakerEvent(service, operation, event, state, { correlationId });
        }
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
    monitorCacheEvent(service, operation, event, key, correlationId) {
        if (this.config.enableLogging) {
            integrationLogger.logCacheEvent(service, operation, event, key, { correlationId });
        }
    }
    monitorApiCall(service, operation, method, url, statusCode, duration, correlationId, requestSize, responseSize) {
        if (this.config.enableLogging) {
            integrationLogger.logApiCall(service, operation, method, url, statusCode, duration, {
                correlationId,
                requestSize,
                responseSize,
            });
        }
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
    monitorBusinessEvent(event, data, service, correlationId) {
        if (this.config.enableLogging) {
            integrationLogger.logBusinessEvent(event, data, {
                service,
                correlationId,
            });
        }
    }
    monitorSecurityEvent(event, severity, details, service, correlationId) {
        if (this.config.enableLogging) {
            integrationLogger.logSecurityEvent(event, severity, details, {
                service,
                correlationId,
            });
        }
    }
    getActiveOperations() {
        return Array.from(this.activeOperations.values());
    }
    getActiveOperationCount() {
        return this.activeOperations.size;
    }
    getHangingOperations(timeoutMs = 300000) {
        const now = Date.now();
        return Array.from(this.activeOperations.values()).filter(op => now - op.startTime > timeoutMs);
    }
    cleanupHangingOperations(timeoutMs = 300000) {
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
    getHealthStatus() {
        const hangingOps = this.getHangingOperations();
        return {
            healthy: hangingOps.length === 0,
            activeOperations: this.getActiveOperationCount(),
            hangingOperations: hangingOps.length,
            lastCleanup: new Date(),
        };
    }
}
export const defaultMonitoringConfig = {
    enableMetrics: true,
    enableTracing: true,
    enableLogging: true,
    slowQueryThreshold: 5000,
    correlationIdHeader: 'x-correlation-id',
};
export const monitoringMiddleware = new MonitoringMiddleware(defaultMonitoringConfig);
export function monitored(service, operation, fn, context) {
    return (async (...args) => {
        const operationId = monitoringMiddleware.startOperation(service, operation, context);
        try {
            const result = await fn(...args);
            monitoringMiddleware.endOperation(operationId, true, result);
            return result;
        }
        catch (error) {
            monitoringMiddleware.endOperation(operationId, false, undefined, error);
            throw error;
        }
    });
}
setInterval(() => {
    monitoringMiddleware.cleanupHangingOperations();
}, 60000);
