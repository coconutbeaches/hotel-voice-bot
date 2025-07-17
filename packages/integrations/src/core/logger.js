import winston from 'winston';
class IntegrationLogger {
    logger;
    metrics = [];
    constructor() {
        this.logger = winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json()),
            defaultMeta: {
                service: 'hotel-voice-bot-integrations',
                environment: process.env.NODE_ENV || 'development',
            },
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
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
    }
    info(message, context) {
        this.logger.info(message, context);
    }
    error(message, error, context) {
        this.logger.error(message, {
            error: error ? {
                message: error.message,
                stack: error.stack,
                ...error.details,
            } : undefined,
            ...context,
        });
    }
    warn(message, context) {
        this.logger.warn(message, context);
    }
    debug(message, context) {
        this.logger.debug(message, context);
    }
    logApiCall(service, operation, method, url, statusCode, duration, context) {
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
    logCircuitBreakerEvent(service, operation, event, state, context) {
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
    logCacheEvent(service, operation, event, key, context) {
        this.logger.debug(`Cache: ${event} - ${service}.${operation}`, {
            service,
            operation,
            cache: {
                event,
                key,
            },
            ...context,
        });
        this.recordMetric('cache_events', 1, {
            service,
            operation,
            event,
        });
    }
    logPerformance(service, operation, duration, success, context) {
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
    logBusinessEvent(event, data, context) {
        this.logger.info(`Business Event: ${event}`, {
            event,
            data,
            ...context,
        });
        this.recordMetric('business_events', 1, {
            event,
            service: context?.service || 'unknown',
        });
    }
    recordMetric(name, value, tags) {
        this.metrics.push({
            name,
            value,
            tags,
            timestamp: new Date(),
        });
        if (this.metrics.length > 100) {
            this.flushMetrics();
        }
    }
    flushMetrics() {
        if (this.metrics.length === 0)
            return;
        this.logger.debug('Flushing metrics', {
            metricsCount: this.metrics.length,
            metrics: this.metrics,
        });
        this.metrics = [];
    }
    logHealthCheck(service, healthy, checks, context) {
        const logLevel = healthy ? 'info' : 'error';
        this.logger.log(logLevel, `Health Check: ${service}`, {
            service,
            health: {
                healthy,
                checks,
            },
            ...context,
        });
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
    logSecurityEvent(event, severity, details, context) {
        const logLevel = severity === 'critical' ? 'error' : severity === 'high' ? 'warn' : 'info';
        this.logger.log(logLevel, `Security Event: ${event}`, {
            security: {
                event,
                severity,
                details,
            },
            ...context,
        });
        this.recordMetric('security_events', 1, {
            event,
            severity,
            service: context?.service || 'unknown',
        });
    }
    getLogger() {
        return this.logger;
    }
    getMetrics() {
        return [...this.metrics];
    }
    close() {
        this.flushMetrics();
        this.logger.close();
    }
}
export const integrationLogger = new IntegrationLogger();
export function generateCorrelationId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
export function extractCorrelationId(headers) {
    return headers['x-correlation-id'] || headers['correlation-id'];
}
setInterval(() => {
    integrationLogger.flushMetrics();
}, 60000);
