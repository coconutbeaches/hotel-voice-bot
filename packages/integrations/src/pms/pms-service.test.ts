import { PMSService, PMSConfig } from './pms-service.js';
import { cacheManager } from '../core/cache-manager.js';
import { monitoringMiddleware } from '../core/monitoring-middleware.js';
import { CircuitBreakerConfig } from '@hotel-voice-bot/shared';

// Mock Dependencies
jest.mock('axios', () => {
  return {
    create: jest.fn(() => ({
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
    })),
  };
});

jest.mock('../core/cache-manager.js', () => ({
  cacheManager: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

jest.mock('../core/monitoring-middleware.js', () => ({
  monitoringMiddleware: {
    startOperation: jest.fn(),
    endOperation: jest.fn(),
    monitorCircuitBreakerEvent: jest.fn(),
    monitorCacheEvent: jest.fn(),
    monitorApiCall: jest.fn(),
    monitorBusinessEvent: jest.fn(),
    monitorSecurityEvent: jest.fn(),
    getActiveOperations: jest.fn(),
    getActiveOperationCount: jest.fn(),
    getHangingOperations: jest.fn(),
    cleanupHangingOperations: jest.fn(),
    getHealthStatus: jest.fn(),
  },
}));

// Configuration
const circuitBreakerConfig: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeout: 10000,
  monitoringPeriod: 60000,
  halfOpenMaxCalls: 5,
  timeout: 2000,
};

const pmsConfig: PMSConfig = {
  baseUrl: 'http://localhost:8080/api',
  apiKey: 'test-api-key',
  timeout: 5000,
  retryAttempts: 3,
  circuitBreaker: circuitBreakerConfig,
};

// Test Suite
describe('PMSService', () => {
  let pmsService: PMSService;

  beforeEach(() => {
    pmsService = new PMSService(pmsConfig, cacheManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should fetch availability and cache it', async () => {
    const mockAvailability = [
      { roomType: 'Suite', date: '2025-08-01', available: 5, rate: 200, currency: 'USD', restrictions: [] },
    ];
    const axios = require('axios');
    axios.create().get.mockResolvedValueOnce({ data: mockAvailability });

    // Call service
    const result = await pmsService.getAvailability('Suite', '2025-08-01', '2025-08-02');

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockAvailability);
    expect(cacheManager.set).toHaveBeenCalledWith(
      'availability:Suite:2025-08-01:2025-08-02',
      mockAvailability,
      300
    );
  });

  test('should create a reservation and invalidate cache', async () => {
    const mockReservation = {
      id: 'res-123',
      confirmationNumber: 'CONF123',
      guestId: 'guest-123',
      roomId: 'room-001',
      checkInDate: '2025-08-01',
      checkOutDate: '2025-08-07',
      status: 'confirmed',
      totalAmount: 1200,
    };
    const axios = require('axios');
    axios.create().post.mockResolvedValueOnce({ data: mockReservation });

    // Call service
    const result = await pmsService.createReservation(
      { firstName: 'John', lastName: 'Doe' },
      { roomId: 'room-001', checkInDate: '2025-08-01', checkOutDate: '2025-08-07', totalAmount: 1200, roomType: 'Suite', rateCode: 'RC', adults: 2, children: 0, specialRequests: [] }
    );

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockReservation);
    expect(cacheManager.del).toHaveBeenCalledWith('availability:room-001:2025-08-01:2025-08-07');
  });

  test('should handle error during reservation creation', async () => {
    const error = {
      response: {
        status: 500,
        data: { message: 'Internal server error' },
      },
    };
    const axios = require('axios');
    axios.create().post.mockRejectedValueOnce(error);

    // Call service
    const result = await pmsService.createReservation(
      { firstName: 'Jane', lastName: 'Doe' },
      { roomId: 'room-002', checkInDate: '2025-08-01', checkOutDate: '2025-08-07', totalAmount: 1500, roomType: 'Deluxe', rateCode: 'RC', adults: 2, children: 1, specialRequests: [] }
    );

    // Assert
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('500');
    expect(result.error?.message).toBe('Internal server error');
  });
});

