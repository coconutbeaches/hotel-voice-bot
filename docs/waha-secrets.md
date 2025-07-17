# WAHA Production Secrets Documentation

## Overview

This document lists all WAHA (WhatsApp HTTP API) environment variables required for production deployment, their purposes, and production defaults.

## Required Production Variables

| Variable | Purpose | Production Default | Security Level | Code Usage |
|----------|---------|-------------------|----------------|-------------|
| `WAHA_API_URL` | Public HTTP API endpoint for WAHA service | `https://waha-hotel.fly.dev` | Low | Required - wahaClient.ts initialization |
| `WAHA_URL` | Internal file-download base URL | `http://waha:3000` | Low | Required - media retrieval in whatsapp.ts |
| `WAHA_TOKEN` | Bearer token for file downloads | `supersecrethotelkey` | High | Required - Authorization header |
| `WAHA_SESSION_NAME` | WhatsApp session identifier | `hotel` | Low | Optional - defaults to 'default' |
| `WAHA_WEBHOOK_URL` | Public HTTPS URL for webhook endpoint | `https://hotel-voice-bot.fly.dev/api/whatsapp/webhook` | Low | Optional - webhook configuration |
| `WAHA_WEBHOOK_TOKEN` | Shared secret for webhook validation | `secure-webhook-token-123` | High | Required - webhook verification |

## Unused Variables

| Variable | Status | Reason |
|----------|--------|--------|
| `WAHA_API_KEY` | **OMITTED** | Documented but not used in codebase |

## Deployment Command

```bash
fly secrets set \
  WAHA_API_URL=https://waha-hotel.fly.dev \
  WAHA_URL=http://waha:3000 \
  WAHA_TOKEN=supersecrethotelkey \
  WAHA_SESSION_NAME=hotel \
  WAHA_WEBHOOK_URL=https://hotel-voice-bot.fly.dev/api/whatsapp/webhook \
  WAHA_WEBHOOK_TOKEN=secure-webhook-token-123
```

## Security Considerations

### High Security (Rotate every 90 days)

- `WAHA_TOKEN`: Controls file download authorization
- `WAHA_WEBHOOK_TOKEN`: Validates incoming webhooks

### Low Security (Rotate every 180 days)

- `WAHA_API_URL`: Public service endpoint
- `WAHA_URL`: Internal service endpoint  
- `WAHA_SESSION_NAME`: Session identifier
- `WAHA_WEBHOOK_URL`: Public webhook endpoint

## Code References

- **wahaClient.ts**: Uses `WAHA_API_URL`, `WAHA_SESSION_NAME`, `WAHA_WEBHOOK_TOKEN`
- **whatsapp.ts**: Uses `WAHA_URL`, `WAHA_TOKEN`
- **webhook configuration**: Uses `WAHA_WEBHOOK_URL`

## Validation

All variables are runtime-validated except:

- `WAHA_SESSION_NAME`: Has default fallback
- `WAHA_WEBHOOK_URL`: Optional for webhook setup

## Related Documentation

- [WAHA Environment Audit](./waha-env-audit.md)
- [Fly.io Secrets Management](./SECRETS_FLY.md)
- [WAHA Integration Guide](../packages/api/docs/WAHA_INTEGRATION.md)
