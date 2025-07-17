# WAHA Deployment Runbook

## Setting Fly.io Secrets

Use the following command to set the required secrets for the WAHA deployment:

```sh
fly secrets set \
  WAHA_API_URL=https://waha.prod.example.com \
  WAHA_URL=https://waha.prod.example.com \
  WAHA_TOKEN=***REDACTED*** \
  WAHA_API_KEY=***REDACTED*** \
  WAHA_SESSION_NAME=hotel \
  WAHA_WEBHOOK_URL=https://hotelbot.fly.dev/api/whatsapp/webhook \
  WAHA_WEBHOOK_TOKEN=***REDACTED***
```

**Note:** Fly will automatically restart the VM after setting secrets. This ensures that the new environment variables are properly loaded into the running application.
