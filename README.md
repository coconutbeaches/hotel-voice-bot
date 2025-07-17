# Hotel Voice Bot Integrations

## Overview

This module manages integrations for the Hotel Voice Bot, including interfacing with external PMS and APIs for room service and payments.

## Features
- PMS Integration: Availability, Booking Creation, Guest Folio
- Room Service/Order API Integration
- Payment Gateway for Upsells
- Caching Mechanisms
- Circuit-Breaker Pattern
- Monitoring and Logging

## Configuration

### Environment Variables
- `SUPABASE_URL`: URL for Supabase instance
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `OPENAI_API_KEY`: API key for OpenAI

### PMS Configuration
- `baseUrl`: Base URL for PMS API
- `apiKey`: API key for accessing PMS
- `timeout`: Request timeout in ms
- `retryAttempts`: Number of retry attempts for failed requests

### Circuit Breaker Configuration
- `failureThreshold`: Number of failures to trigger open state
- `recoveryTimeout`: Time to wait before retrying in half-open state

## Usage

### PMS Service
```typescript
import { PMSService, PMSConfig } from './src/pms/pms-service.js';
import { cacheManager } from './src/core/cache-manager.js';

const config: PMSConfig = {
  baseUrl: 'https://example.com/api',
  apiKey: 'your-api-key',
  timeout: 5000,
  retryAttempts: 3,
  circuitBreaker: {
    failureThreshold: 3,
    recoveryTimeout: 3000,
    monitoringPeriod: 60000,
    halfOpenMaxCalls: 2,
    timeout: 1000,
  },
};

const pmsService = new PMSService(config, cacheManager);

pmsService.getAvailability('Suite', '2025-08-01', '2025-08-02')
  .then(response => console.log('Availability:', response))
  .catch(error => console.error('Error fetching availability:', error));
```

### Monitoring and Logging

Logging and monitoring are extensively used in all integration calls via the `IntegrationLogger` and `MonitoringMiddleware`. Logs include details about API calls, circuit breaker states, cache hits/misses, and performance metrics.

#### Logging API Calls
```typescript
integrationLogger.logApiCall(
  'pmsService',
  'getAvailability',
  'GET',
  '/availability',
  200,
  150,
);
```

This logs API calls, capturing HTTP method, endpoint, response status code, and duration.

#### Monitoring

- **API Metrics**: Collects duration and status for each API call.
- **Circuit Breaker**: Logs state transitions and tracks failure counts.
- **Cache Events**: Logs cache hits, misses, and invalidations.

```
logging:
  level: info # Logging level
  console: true # Log to console
  files: # File-based logging paths
    - integration-errors.log
    - integration-combined.log
metrics:
  enabled: true
  flushPeriod: 60s
```

### Running Tests

Tests are implemented using Jest for unit testing of core functionalities and integration with external services. Mocking is used where appropriate to mimic external dependencies.

To execute tests, run:
```bash
npm test
```

## Contribution

Please contribute by forking the repository and making a Pull Request. Ensure all new code paths are covered by tests.

# Hotel Voice Bot

AI-powered hotel voice bot with WhatsApp integration built with Node.js, TypeScript, and OpenAI.

## Architecture

This is a mono-repo using PNPM workspaces with the following packages:

- `@hotel-voice-bot/api` - Main API server with Express and WhatsApp integration
- `@hotel-voice-bot/integrations` - Third-party integrations (Supabase, external APIs)
- `@hotel-voice-bot/scripts` - Utility scripts for database operations
- `@hotel-voice-bot/shared` - Shared types, constants, and utilities

## Prerequisites

- Node.js 18.x or higher
- PNPM 8.x or higher
- Docker (for containerization)
- PostgreSQL (for database)

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hotel-voice-bot
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development server**
   ```bash
   pnpm run dev
   ```

5. **Access the application**
   - API: http://localhost:3000
   - API Documentation: http://localhost:3000/api-docs
   - Health Check: http://localhost:3000/api/health

## Development

### Available Scripts

- `pnpm run dev` - Start development servers for all packages
- `pnpm run build` - Build all packages
- `pnpm run test` - Run tests for all packages
- `pnpm run lint` - Run ESLint on all packages
- `pnpm run lint:fix` - Fix ESLint issues
- `pnpm run format` - Format code with Prettier
- `pnpm run typecheck` - Run TypeScript type checking
- `pnpm run clean` - Clean build artifacts

### Package-specific Scripts

```bash
# Run scripts for specific packages
pnpm --filter @hotel-voice-bot/api run dev
pnpm --filter @hotel-voice-bot/integrations run test
```

## Testing

Run all tests:
```bash
pnpm run test
```

Run tests with coverage:
```bash
pnpm run test -- --coverage
```

Run tests for specific package:
```bash
pnpm --filter @hotel-voice-bot/api run test
```

## Deployment

### Docker

Build and run with Docker:
```bash
docker build -t hotel-voice-bot .
docker run -p 3000:3000 hotel-voice-bot
```

### Fly.io

Deploy to Fly.io:
```bash
fly deploy
```

### AWS ECS

The project includes GitHub Actions for automated deployment to AWS ECS. Configure the following secrets in your GitHub repository:

- `AWS_ROLE_TO_ASSUME` - IAM role ARN for OIDC
- `AWS_REGION` - AWS region
- `ECS_CLUSTER` - ECS cluster name
- `ECS_SERVICE` - ECS service name

## Environment Variables

See `.env.example` for required environment variables.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for your changes
5. Ensure all tests pass
6. Submit a pull request

### Commit Convention

This project uses conventional commits:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Test changes
- `chore:` - Maintenance tasks

## License

ISC License

## Support

For support, please open an issue in the GitHub repository.
