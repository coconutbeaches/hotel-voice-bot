import { CircuitBreakerState } from '@hotel-voice-bot/shared';
export interface MonitoringConfig {
    enableMetrics: boolean;
    enableTracing: boolean;
    enableLogging: boolean;
    slowQueryThreshold: number;
    correlationIdHeader: string;
}
export interface OperationMetrics {
    startTime: number;
    correlationId: string;
    service: string;
    operation: string;
    context: Record<string, any>;
}
export declare class MonitoringMiddleware {
    private config;
    private activeOperations;
    constructor(config: MonitoringConfig);
    startOperation(service: string, operation: string, context?: Record<string, any>, correlationId?: string): string;
    endOperation(operationId: string, success: boolean, result?: any, error?: Error, additionalContext?: Record<string, any>): void;
    monitorCircuitBreakerEvent(service: string, operation: string, event: 'open' | 'closed' | 'half-open' | 'failure' | 'success', state: CircuitBreakerState, correlationId?: string): void;
    monitorCacheEvent(service: string, operation: string, event: 'hit' | 'miss' | 'set' | 'invalidate', key: string, correlationId?: string): void;
    monitorApiCall(service: string, operation: string, method: string, url: string, statusCode: number, duration: number, correlationId?: string, requestSize?: number, responseSize?: number): void;
    monitorBusinessEvent(event: string, data: Record<string, any>, service: string, correlationId?: string): void;
    monitorSecurityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', details: Record<string, any>, service: string, correlationId?: string): void;
    getActiveOperations(): OperationMetrics[];
    getActiveOperationCount(): number;
    getHangingOperations(timeoutMs?: number): OperationMetrics[];
    cleanupHangingOperations(timeoutMs?: number): void;
    getHealthStatus(): {
        healthy: boolean;
        activeOperations: number;
        hangingOperations: number;
        lastCleanup: Date;
    };
}
export declare const defaultMonitoringConfig: MonitoringConfig;
export declare const monitoringMiddleware: MonitoringMiddleware;
export declare function monitored<T extends (...args: any[]) => Promise<any>>(service: string, operation: string, fn: T, context?: Record<string, any>): T;
