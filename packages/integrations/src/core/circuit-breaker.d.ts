import { CircuitBreakerState, CircuitBreakerConfig } from '@hotel-voice-bot/shared';
import { EventEmitter } from 'events';
export declare class CircuitBreaker extends EventEmitter {
    private state;
    private config;
    private nextAttemptTime;
    private metrics;
    constructor(config: CircuitBreakerConfig);
    call<T>(fn: () => Promise<T>, timeout?: number): Promise<T>;
    private onSuccess;
    private onFailure;
    private openCircuit;
    getState(): CircuitBreakerState;
    getMetrics(): {
        uptime: number;
        failureRate: number;
        successRate: number;
        averageResponseTime: number;
        totalCalls: number;
        successCount: number;
        failureCount: number;
        lastResetTime: number;
    };
    reset(): void;
    forceOpen(): void;
    forceClose(): void;
}
export declare class CircuitBreakerManager {
    private circuitBreakers;
    private defaultConfig;
    constructor(defaultConfig: CircuitBreakerConfig);
    getOrCreate(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker;
    getAll(): Map<string, CircuitBreaker>;
    reset(name: string): void;
    resetAll(): void;
    getStatus(): Record<string, any>;
}
