# README

## Overview
This project involves a voice bot integrated with hotel systems. The stack includes Docker Compose for local development, and specific configuration for permissions and integrations.

## Local Development

### Prerequisites
- Docker & Docker Compose installed
- Node.js and npm (if not running only with Docker)

### Steps
1. Start all core services with:
   ```sh
   docker compose up
   ```
2. (Optional) Start individual services as needed using Docker Compose.
3. Local endpoints and environment config can be modified in `.env` files.

## Testing
- To run tests (replace with your test script if not `npm test`):
  ```sh
  npm test
  ```
- Test results and coverage reports are output to `/tests` directory.

## Common Failure Modes & Troubleshooting
- **Containers won’t start**: Ensure Docker is running and ports are free.
- **API not reachable**: Verify `.env` configuration and Docker network settings.
- **Database connection errors**: Confirm DB container is healthy (`docker compose ps`), and credentials in `.env` are correct.
- **Third-party API issues**: Rate-limits or network firewalls may block requests—check integration keys, IP allowlists, and inspect logs.

## Open Issues & Future Work
- **Browser incompatibilities**: Some features may not work on all browsers—test with Chrome and Firefox for best support.
- **Mobile permission UX**: Improve the UX for acquiring microphone/input permissions on mobile browsers.
- **Rate-limits**: Add better handling and user feedback for limited API quotas.
- **Cost monitoring**: Implement cost tracking for third-party API usage, with alerts for approaching spend limits.

---
See `docs/WAHA_INTEGRATION.md` for integration-specific instructions.
