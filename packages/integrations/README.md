# Hotel Voice Bot Integrations

## Overview

The integrations package provides a domain-driven integration layer for the Hotel Voice Bot system. It includes comprehensive services for hotel Property Management Systems (PMS), room service/ordering APIs, and payment gateways, all with built-in caching and circuit-breaker patterns.

## Architecture

The integration layer follows domain-driven design principles with the following core components:

- **Core Services**: Circuit breaker, caching, and monitoring middleware
- **PMS Service**: Hotel property management system integration
- **Room Service API**: Food and beverage ordering system
- **Payment Gateway**: Upsell and payment processing
- **Monitoring**: Comprehensive logging and metrics collection

## Features

### 🔄 Circuit Breaker Pattern
- Automatic failure detection and recovery
- Configurable failure thresholds and recovery timeouts
- Half-open state for testing recovery
- Comprehensive metrics and monitoring

### 🗄️ Caching Layer
- LRU cache implementation
- Configurable TTL and cache sizes
- Cache invalidation strategies
- Hit/miss metrics tracking

### 📊 Monitoring & Logging
- Structured logging with Winston
- Performance metrics collection
- Business event tracking
- Security event monitoring
- Correlation ID support for request tracing

### 🏨 PMS Integration
- Room availability checking
- Booking creation and management
- Guest folio operations
- Guest profile management
- Real-time data synchronization

## Installation

```bash
npm install @hotel-voice-bot/integrations
```

## Quick Start

### Basic Setup

```typescript
import { PMSService, PMSConfig } from '@hotel-voice-bot/integrations';
import { cacheManager } from '@hotel-voice-bot/integrations/core/cache-manager';

const config: PMSConfig = {
  baseUrl: 'https://your-pms-api.com',
  apiKey: 'your-api-key',
  timeout: 5000,
  retryAttempts: 3,
  circuitBreaker: {
    failureThreshold: 3,
    recoveryTimeout: 30000,
    monitoringPeriod: 60000,
    halfOpenMaxCalls: 2,
    timeout: 5000,
  },
};

const pmsService = new PMSService(config, cacheManager);
```

### Making API Calls

```typescript
// Check room availability
const availability = await pmsService.getAvailability(
  'Suite',
  '2025-08-01',
  '2025-08-02'
);

if (availability.success) {
  console.log('Available rooms:', availability.data);
} else {
  console.error('Error:', availability.error);
}

// Create a reservation
const reservation = await pmsService.createReservation(
  {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890',
  },
  {
    roomId: 'room-101',
    checkInDate: '2025-08-01',
    checkOutDate: '2025-08-07',
    totalAmount: 1200,
    currency: 'USD',
    roomType: 'Suite',
    rateCode: 'STANDARD',
    adults: 2,
    children: 0,
    specialRequests: ['Late checkout'],
  }
);
```

## Configuration

### Environment Variables

```bash
# PMS Configuration
PMS_BASE_URL=https://your-pms-api.com
PMS_API_KEY=your-pms-api-key
PMS_TIMEOUT=5000

# Circuit Breaker Configuration
CIRCUIT_BREAKER_FAILURE_THRESHOLD=3
CIRCUIT_BREAKER_RECOVERY_TIMEOUT=30000
CIRCUIT_BREAKER_HALF_OPEN_MAX_CALLS=2

# Cache Configuration
CACHE_TTL=3600
CACHE_MAX_SIZE=1000

# Logging Configuration
LOG_LEVEL=info
LOG_TO_FILE=true
LOG_TO_CONSOLE=true
```

### Circuit Breaker Configuration

```typescript
interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures to trigger open state
  recoveryTimeout: number;       // Time to wait before retrying (ms)
  monitoringPeriod: number;      // Monitoring window (ms)
  halfOpenMaxCalls: number;      // Max calls in half-open state
  timeout: number;               // Request timeout (ms)
}
```

### Cache Configuration

```typescript
interface CacheConfig {
  ttl: number;                   // Time to live in seconds
  maxSize: number;               // Maximum cache size
  enableMetrics: boolean;        // Enable cache metrics
}
```

## API Reference

### PMSService

#### Methods

##### `getAvailability(roomType, startDate, endDate, useCache?)`
Check room availability for specified dates.

**Parameters:**
- `roomType` (string): Type of room to check
- `startDate` (string): Check-in date (YYYY-MM-DD)
- `endDate` (string): Check-out date (YYYY-MM-DD)
- `useCache` (boolean): Whether to use cache (default: true)

**Returns:** `Promise<IntegrationResponse<PMSAvailability[]>>`

##### `createReservation(guestData, reservationData)`
Create a new reservation.

**Parameters:**
- `guestData` (Partial<PMSGuest>): Guest information
- `reservationData` (Omit<PMSReservation, 'id' | 'confirmationNumber'>): Reservation details

**Returns:** `Promise<IntegrationResponse<PMSReservation>>`

##### `getGuestFolio(guestId)`
Retrieve guest folio information.

**Parameters:**
- `guestId` (string): Guest identifier

**Returns:** `Promise<IntegrationResponse<GuestFolio>>`

##### `addChargeToFolio(guestId, charge)`
Add a charge to guest folio.

**Parameters:**
- `guestId` (string): Guest identifier
- `charge` (object): Charge details

**Returns:** `Promise<IntegrationResponse<GuestFolio>>`

### CircuitBreaker

#### Methods

##### `call(fn, timeout?)`
Execute a function with circuit breaker protection.

**Parameters:**
- `fn` (Function): Async function to execute
- `timeout` (number): Optional timeout override

**Returns:** `Promise<T>`

##### `getState()`
Get current circuit breaker state.

**Returns:** `CircuitBreakerState`

##### `getMetrics()`
Get circuit breaker metrics.

**Returns:** Metrics object with success/failure rates

### CacheManager

#### Methods

##### `get<T>(key)`
Retrieve cached value.

**Parameters:**
- `key` (string): Cache key

**Returns:** `T | null`

##### `set<T>(key, value, ttl?)`
Store value in cache.

**Parameters:**
- `key` (string): Cache key
- `value` (T): Value to cache
- `ttl` (number): Optional TTL override

##### `del(key)`
Delete cached value.

**Parameters:**
- `key` (string): Cache key

## Monitoring & Logging

### Logging Levels

- `error`: Error conditions
- `warn`: Warning conditions
- `info`: Informational messages
- `debug`: Debug information

### Log Structure

```json
{
  "level": "info",
  "message": "API Call: pmsService.getAvailability",
  "timestamp": "2025-07-16T18:30:00.000Z",
  "service": "pmsService",
  "operation": "getAvailability",
  "correlationId": "req-123-456",
  "http": {
    "method": "GET",
    "url": "/availability",
    "statusCode": 200,
    "duration": 150
  },
  "circuitBreakerState": {
    "state": "CLOSED",
    "failureCount": 0,
    "successCount": 5
  }
}
```

### Metrics Collection

The system automatically collects metrics for:

- API call duration and success rates
- Circuit breaker state changes
- Cache hit/miss ratios
- Business events
- Security events

### Health Checks

```typescript
// Check service health
const health = await pmsService.healthCheck();

// Check circuit breaker status
const status = pmsService.getServiceStatus();
```

## Error Handling

All integration methods return a standardized response format:

```typescript
interface IntegrationResponse<T> {
  success: boolean;
  data?: T;
  error?: IntegrationError;
  cached?: boolean;
  responseTime?: number;
  circuitBreakerState?: CircuitBreakerState;
}

interface IntegrationError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  timestamp: string;
}
```

### Error Types

- **Network Errors**: Connection timeouts, DNS failures
- **API Errors**: 4xx/5xx HTTP responses
- **Circuit Breaker Errors**: Service unavailable due to failures
- **Cache Errors**: Cache operations failures
- **Validation Errors**: Invalid input parameters

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Structure

```
src/
├── core/
│   ├── circuit-breaker.test.ts
│   ├── cache-manager.test.ts
│   └── monitoring-middleware.test.ts
├── pms/
│   └── pms-service.test.ts
└── payment/
    └── payment-service.test.ts
```

### Mock Testing

The test suite includes comprehensive mocks for:

- HTTP clients (axios)
- External APIs
- Cache layers
- Circuit breakers
- Monitoring systems

## Performance Considerations

### Caching Strategy

- **Availability**: 5-minute TTL (frequently changing)
- **Reservations**: 10-minute TTL (moderate changes)
- **Guest Profiles**: 30-minute TTL (infrequent changes)
- **Folio**: 1-minute TTL (frequent changes)

### Circuit Breaker Tuning

- **Failure Threshold**: 3-5 failures
- **Recovery Timeout**: 30-60 seconds
- **Half-Open Max Calls**: 2-5 calls

### Memory Management

- LRU cache with configurable size limits
- Automatic cleanup of hanging operations
- Periodic metric flushing

## Security

### API Keys

- Store API keys in environment variables
- Use secrets management in production
- Rotate keys regularly

### Data Protection

- All sensitive data is encrypted in transit
- PII data is not logged
- Correlation IDs for request tracing

### Rate Limiting

- Implement rate limiting at the API gateway level
- Circuit breaker provides protection against cascading failures
- Monitor API usage patterns

## Troubleshooting

### Common Issues

1. **Circuit Breaker Open**
   - Check external service health
   - Review error logs for root cause
   - Manually close circuit if needed

2. **Cache Miss High**
   - Increase cache TTL
   - Check cache invalidation logic
   - Monitor cache hit rates

3. **Slow Response Times**
   - Check network latency
   - Review API endpoint performance
   - Optimize cache strategies

### Debug Logging

Enable debug logging for detailed information:

```bash
LOG_LEVEL=debug npm start
```

### Monitoring Dashboards

Create dashboards for:
- API response times
- Circuit breaker states
- Cache hit rates
- Error rates by service

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

### Code Style

- Use TypeScript for type safety
- Follow ESLint configuration
- Write comprehensive tests
- Document public APIs

## License

ISC License - see LICENSE file for details.
