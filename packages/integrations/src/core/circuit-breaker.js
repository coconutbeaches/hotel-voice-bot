import { EventEmitter } from 'events';
export class CircuitBreaker extends EventEmitter {
    state;
    config;
    nextAttemptTime = 0;
    metrics;
    constructor(config) {
        super();
        this.config = config;
        this.state = {
            state: 'CLOSED',
            failureCount: 0,
            successCount: 0,
        };
        this.metrics = {
            totalCalls: 0,
            successCount: 0,
            failureCount: 0,
            lastResetTime: Date.now(),
        };
    }
    async call(fn, timeout) {
        const callTimeout = timeout || this.config.timeout;
        if (this.state.state === 'OPEN') {
            if (Date.now() < this.nextAttemptTime) {
                throw new Error('Circuit breaker is OPEN - calls are blocked');
            }
            this.state.state = 'HALF_OPEN';
            this.state.successCount = 0;
            this.emit('half-open');
        }
        if (this.state.state === 'HALF_OPEN' && this.state.successCount >= this.config.halfOpenMaxCalls) {
            this.state.state = 'CLOSED';
            this.state.failureCount = 0;
            this.emit('closed');
        }
        this.metrics.totalCalls++;
        const startTime = Date.now();
        try {
            const result = await Promise.race([
                fn(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Circuit breaker timeout')), callTimeout))
            ]);
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure(error);
            throw error;
        }
        finally {
            const duration = Date.now() - startTime;
            this.emit('call-completed', { duration, success: this.state.state !== 'OPEN' });
        }
    }
    onSuccess() {
        this.metrics.successCount++;
        this.state.successCount++;
        if (this.state.state === 'HALF_OPEN') {
            if (this.state.successCount >= this.config.halfOpenMaxCalls) {
                this.state.state = 'CLOSED';
                this.state.failureCount = 0;
                this.emit('closed');
            }
        }
        else if (this.state.state === 'CLOSED') {
            this.state.failureCount = 0;
        }
    }
    onFailure(error) {
        this.metrics.failureCount++;
        this.state.failureCount++;
        this.state.lastFailureTime = Date.now();
        if (this.state.state === 'HALF_OPEN') {
            this.openCircuit();
        }
        else if (this.state.state === 'CLOSED' && this.state.failureCount >= this.config.failureThreshold) {
            this.openCircuit();
        }
        this.emit('failure', error);
    }
    openCircuit() {
        this.state.state = 'OPEN';
        this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
        this.emit('open', { nextAttemptTime: this.nextAttemptTime });
    }
    getState() {
        return {
            ...this.state,
            nextAttemptTime: this.nextAttemptTime,
        };
    }
    getMetrics() {
        const now = Date.now();
        const uptime = now - this.metrics.lastResetTime;
        return {
            ...this.metrics,
            uptime,
            failureRate: this.metrics.totalCalls > 0 ? this.metrics.failureCount / this.metrics.totalCalls : 0,
            successRate: this.metrics.totalCalls > 0 ? this.metrics.successCount / this.metrics.totalCalls : 0,
            averageResponseTime: uptime / this.metrics.totalCalls,
        };
    }
    reset() {
        this.state = {
            state: 'CLOSED',
            failureCount: 0,
            successCount: 0,
        };
        this.nextAttemptTime = 0;
        this.metrics = {
            totalCalls: 0,
            successCount: 0,
            failureCount: 0,
            lastResetTime: Date.now(),
        };
        this.emit('reset');
    }
    forceOpen() {
        this.state.state = 'OPEN';
        this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
        this.emit('force-open');
    }
    forceClose() {
        this.state.state = 'CLOSED';
        this.state.failureCount = 0;
        this.nextAttemptTime = 0;
        this.emit('force-close');
    }
}
export class CircuitBreakerManager {
    circuitBreakers = new Map();
    defaultConfig;
    constructor(defaultConfig) {
        this.defaultConfig = defaultConfig;
    }
    getOrCreate(name, config) {
        if (!this.circuitBreakers.has(name)) {
            const finalConfig = { ...this.defaultConfig, ...config };
            const circuitBreaker = new CircuitBreaker(finalConfig);
            circuitBreaker.on('open', () => {
                console.warn(`Circuit breaker '${name}' opened`);
            });
            circuitBreaker.on('half-open', () => {
                console.info(`Circuit breaker '${name}' half-open`);
            });
            circuitBreaker.on('closed', () => {
                console.info(`Circuit breaker '${name}' closed`);
            });
            this.circuitBreakers.set(name, circuitBreaker);
        }
        return this.circuitBreakers.get(name);
    }
    getAll() {
        return this.circuitBreakers;
    }
    reset(name) {
        const circuitBreaker = this.circuitBreakers.get(name);
        if (circuitBreaker) {
            circuitBreaker.reset();
        }
    }
    resetAll() {
        this.circuitBreakers.forEach(cb => cb.reset());
    }
    getStatus() {
        const status = {};
        this.circuitBreakers.forEach((circuitBreaker, name) => {
            status[name] = {
                state: circuitBreaker.getState(),
                metrics: circuitBreaker.getMetrics(),
            };
        });
        return status;
    }
}
