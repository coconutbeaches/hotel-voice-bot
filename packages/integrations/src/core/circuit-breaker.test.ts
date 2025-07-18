import { CircuitBreakerConfig } from '@hotel-voice-bot/shared';

import { CircuitBreaker, CircuitBreakerManager } from './circuit-breaker.js';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;
  let config: CircuitBreakerConfig;

  beforeEach(() => {
    config = {
      failureThreshold: 3,
      recoveryTimeout: 1000,
      monitoringPeriod: 60000,
      halfOpenMaxCalls: 2,
      timeout: 5000,
    };
    circuitBreaker = new CircuitBreaker(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CLOSED state', () => {
    test('should execute function successfully when circuit is closed', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const result = await circuitBreaker.call(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(circuitBreaker.getState().state).toBe('CLOSED');
    });

    test('should handle failures without opening circuit if below threshold', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));
      
      // Two failures (below threshold of 3)
      await expect(circuitBreaker.call(mockFn)).rejects.toThrow('Test error');
      await expect(circuitBreaker.call(mockFn)).rejects.toThrow('Test error');
      
      expect(circuitBreaker.getState().state).toBe('CLOSED');
      expect(circuitBreaker.getState().failureCount).toBe(2);
    });

    test('should open circuit when failure threshold is reached', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));
      
      // Three failures (meets threshold)
      await expect(circuitBreaker.call(mockFn)).rejects.toThrow('Test error');
      await expect(circuitBreaker.call(mockFn)).rejects.toThrow('Test error');
      await expect(circuitBreaker.call(mockFn)).rejects.toThrow('Test error');
      
      expect(circuitBreaker.getState().state).toBe('OPEN');
      expect(circuitBreaker.getState().failureCount).toBe(3);
    });
  });

  describe('OPEN state', () => {
    beforeEach(async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));
      
      // Open the circuit
      await expect(circuitBreaker.call(mockFn)).rejects.toThrow('Test error');
      await expect(circuitBreaker.call(mockFn)).rejects.toThrow('Test error');
      await expect(circuitBreaker.call(mockFn)).rejects.toThrow('Test error');
    });

    test('should block calls when circuit is open', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      await expect(circuitBreaker.call(mockFn)).rejects.toThrow('Circuit breaker is OPEN');
      expect(mockFn).not.toHaveBeenCalled();
    });

    test('should transition to HALF_OPEN after recovery timeout', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      await circuitBreaker.call(mockFn);
      
      expect(circuitBreaker.getState().state).toBe('HALF_OPEN');
    });
  });

  describe('HALF_OPEN state', () => {
    beforeEach(async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));
      
      // Open the circuit
      await expect(circuitBreaker.call(mockFn)).rejects.toThrow('Test error');
      await expect(circuitBreaker.call(mockFn)).rejects.toThrow('Test error');
      await expect(circuitBreaker.call(mockFn)).rejects.toThrow('Test error');
      
      // Wait for recovery timeout to transition to HALF_OPEN
      await new Promise(resolve => setTimeout(resolve, 1100));
    });

    test('should close circuit after successful calls in HALF_OPEN', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      // Make successful calls equal to halfOpenMaxCalls
      await circuitBreaker.call(mockFn);
      await circuitBreaker.call(mockFn);
      
      expect(circuitBreaker.getState().state).toBe('CLOSED');
      expect(circuitBreaker.getState().failureCount).toBe(0);
    });

    test('should reopen circuit on failure in HALF_OPEN', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));
      
      await expect(circuitBreaker.call(mockFn)).rejects.toThrow('Test error');
      
      expect(circuitBreaker.getState().state).toBe('OPEN');
    });
  });

  describe('timeout handling', () => {
    test('should timeout long-running calls', async () => {
      const mockFn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 6000))
      );
      
      await expect(circuitBreaker.call(mockFn, 1000)).rejects.toThrow('Circuit breaker timeout');
    });
  });

  describe('metrics', () => {
    test('should track call metrics', async () => {
      const successFn = jest.fn().mockResolvedValue('success');
      const failureFn = jest.fn().mockRejectedValue(new Error('Test error'));
      
      await circuitBreaker.call(successFn);
      await expect(circuitBreaker.call(failureFn)).rejects.toThrow('Test error');
      
      const metrics = circuitBreaker.getMetrics();
      expect(metrics.totalCalls).toBe(2);
      expect(metrics.successCount).toBe(1);
      expect(metrics.failureCount).toBe(1);
      expect(metrics.failureRate).toBe(0.5);
      expect(metrics.successRate).toBe(0.5);
    });
  });

  describe('manual control', () => {
    test('should allow manual reset', () => {
      circuitBreaker.reset();
      
      const state = circuitBreaker.getState();
      expect(state.state).toBe('CLOSED');
      expect(state.failureCount).toBe(0);
      expect(state.successCount).toBe(0);
    });

    test('should allow manual force open', () => {
      circuitBreaker.forceOpen();
      
      expect(circuitBreaker.getState().state).toBe('OPEN');
    });

    test('should allow manual force close', () => {
      circuitBreaker.forceClose();
      
      expect(circuitBreaker.getState().state).toBe('CLOSED');
    });
  });
});

describe('CircuitBreakerManager', () => {
  let manager: CircuitBreakerManager;
  let defaultConfig: CircuitBreakerConfig;

  beforeEach(() => {
    defaultConfig = {
      failureThreshold: 3,
      recoveryTimeout: 1000,
      monitoringPeriod: 60000,
      halfOpenMaxCalls: 2,
      timeout: 5000,
    };
    manager = new CircuitBreakerManager(defaultConfig);
  });

  test('should create and return circuit breaker', () => {
    const cb = manager.getOrCreate('test-service');
    
    expect(cb).toBeInstanceOf(CircuitBreaker);
    expect(cb.getState().state).toBe('CLOSED');
  });

  test('should return existing circuit breaker', () => {
    const cb1 = manager.getOrCreate('test-service');
    const cb2 = manager.getOrCreate('test-service');
    
    expect(cb1).toBe(cb2);
  });

  test('should create circuit breaker with custom config', () => {
    const customConfig = { failureThreshold: 5 };
    const cb = manager.getOrCreate('test-service', customConfig);
    
    expect(cb).toBeInstanceOf(CircuitBreaker);
  });

  test('should reset specific circuit breaker', () => {
    const cb = manager.getOrCreate('test-service');
    cb.forceOpen();
    
    manager.reset('test-service');
    
    expect(cb.getState().state).toBe('CLOSED');
  });

  test('should reset all circuit breakers', () => {
    const cb1 = manager.getOrCreate('service1');
    const cb2 = manager.getOrCreate('service2');
    
    cb1.forceOpen();
    cb2.forceOpen();
    
    manager.resetAll();
    
    expect(cb1.getState().state).toBe('CLOSED');
    expect(cb2.getState().state).toBe('CLOSED');
  });

  test('should return status of all circuit breakers', () => {
    const cb1 = manager.getOrCreate('service1');
    const cb2 = manager.getOrCreate('service2');
    
    cb1.forceOpen();
    
    const status = manager.getStatus();
    
    expect(status.service1.state.state).toBe('OPEN');
    expect(status.service2.state.state).toBe('CLOSED');
  });
});
