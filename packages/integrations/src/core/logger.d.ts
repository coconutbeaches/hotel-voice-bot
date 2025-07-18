import { CircuitBreakerState, IntegrationError } from '@hotel-voice-bot/shared';
import winston from 'winston';
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
declare class IntegrationLogger {
    private logger;
    private metrics;
    constructor();
    info(message: string, context?: LogContext): void;
    error(message: string, error?: Error | IntegrationError, context?: LogContext): void;
    warn(message: string, context?: LogContext): void;
    debug(message: string, context?: LogContext): void;
    logApiCall(service: string, operation: string, method: string, url: string, statusCode: number, duration: number, context?: Partial<LogContext>): void;
    logCircuitBreakerEvent(service: string, operation: string, event: 'open' | 'closed' | 'half-open' | 'failure' | 'success', state: CircuitBreakerState, context?: Partial<LogContext>): void;
    logCacheEvent(service: string, operation: string, event: 'hit' | 'miss' | 'set' | 'invalidate', key: string, context?: Partial<LogContext>): void;
    logPerformance(service: string, operation: string, duration: number, success: boolean, context?: Partial<LogContext>): void;
    logBusinessEvent(event: string, data: Record<string, any>, context?: Partial<LogContext>): void;
    recordMetric(name: string, value: number, tags: Record<string, string>): void;
    flushMetrics(): void;
    logHealthCheck(service: string, healthy: boolean, checks: Record<string, {
        status: 'healthy' | 'unhealthy';
        message?: string;
        duration?: number;
    }>, context?: Partial<LogContext>): void;
    logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', details: Record<string, any>, context?: Partial<LogContext>): void;
    getLogger(): winston.Logger;
    getMetrics(): MetricData[];
    close(): void;
}
export declare const integrationLogger: IntegrationLogger;
export type { IntegrationLogger };
export declare function generateCorrelationId(): string;
export declare function extractCorrelationId(headers: Record<string, any>): string | undefined;
