# WAHA Health Check Runbook

This runbook provides step-by-step instructions for verifying the health and functionality of the WAHA (WhatsApp HTTP API) integration in the deployment environment.

## Prerequisites

Ensure you have the following environment variables set:
- `WAHA_API_URL`: The base URL of your WAHA API instance
- `WAHA_SESSION_NAME`: The name of your WhatsApp session

## Health Check Steps

### 1. WAHA API Ping

Check if the WAHA API is responding to basic health checks.

```sh
curl -s $WAHA_API_URL/health | jq .
```

**Expected Response:**
```json
{
  "status": "ok"
}
```

**Troubleshooting:**
- If no response: Check if WAHA service is running and accessible
- If different response: Review WAHA logs for startup errors

### 2. Session Status

Verify the WhatsApp session status and pairing state.

```sh
curl -s -X GET "$WAHA_API_URL/api/sessions/$WAHA_SESSION_NAME"
```

**Expected Response (Working Session):**
```json
{
  "name": "your-session-name",
  "status": "WORKING",
  "config": {
    "webhooks": [
      {
        "url": "https://your-webhook-endpoint.com/webhook",
        "events": ["message"]
      }
    ]
  }
}
```

**Expected Response (Not Paired):**
```json
{
  "name": "your-session-name",
  "status": "SCAN_QR_CODE",
  "qr": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "config": {
    "webhooks": [
      {
        "url": "https://your-webhook-endpoint.com/webhook",
        "events": ["message"]
      }
    ]
  }
}
```

**Troubleshooting:**
- If `status` is `SCAN_QR_CODE`: Use the QR code to pair with WhatsApp
- If `status` is `FAILED`: Restart the session or check authentication

### 3. Send Test Text Message

Send a test message to verify the sending functionality.

```sh
curl -s -X POST "$WAHA_API_URL/api/sendText" \
  -H "Content-Type: application/json" \
  -d '{
    "session": "'$WAHA_SESSION_NAME'",
    "chatId": "1234567890@c.us",
    "text": "Health check test message"
  }' | jq .
```

**Expected Response:**
```json
{
  "id": "3EB0C0F6B2C7A0D4E5F6A7B8C9D0E1F2",
  "timestamp": 1640995200,
  "fromMe": true,
  "body": "Health check test message",
  "to": "1234567890@c.us"
}
```

**Troubleshooting:**
- HTTP 400: Check request format and session name
- HTTP 401: Verify API authentication
- HTTP 500: Check WAHA service logs

### 4. Receive Webhook Echo

Monitor the application logs to ensure webhook events are received and processed.

```sh
fly logs -a hotelbot
```

**Expected Log Entry:**
```
2024-01-01T12:00:00.000Z app[worker.1]: INFO Received webhook: message event
2024-01-01T12:00:00.001Z app[worker.1]: INFO Processing message: Health check test message
2024-01-01T12:00:00.002Z app[worker.1]: INFO Message processed successfully
```

**Troubleshooting:**
- No webhook received: Check webhook URL configuration in WAHA session
- Processing errors: Review application error logs for webhook handler issues
- Network issues: Verify firewall and routing configuration

### 5. Voice Message Round-Trip (Optional)

Test voice message handling by sending a small OGG voice note from WhatsApp.

1. Send a voice message to the bot's WhatsApp number
2. Monitor logs for voice message processing:

```sh
fly logs -a hotelbot | grep -i voice
```

**Expected Log Entry:**
```
2024-01-01T12:00:00.000Z app[worker.1]: INFO Received voice message webhook
2024-01-01T12:00:00.001Z app[worker.1]: INFO Processing voice message: duration=3s, size=15KB
2024-01-01T12:00:00.002Z app[worker.1]: INFO Voice message processed, sending response
```

3. Verify the bot responds appropriately (text or voice response)

**Troubleshooting:**
- Voice messages not received: Check webhook configuration for voice message events
- Processing failures: Review voice message handler implementation
- No response sent: Check response logic and API calls

## Alert Criteria

### Critical Alerts (Page Immediately)

1. **API Health Check Failures**
   - 3 consecutive failures of the `/health` endpoint
   - Response time > 10 seconds

2. **Session Status Issues**
   - Session status changes to `FAILED` or `STOPPED`
   - Session requires re-pairing (`SCAN_QR_CODE`) during operational hours

3. **Webhook Silence**
   - No webhook events received for > 5 minutes during expected activity periods
   - Webhook endpoint returning non-2xx responses for > 2 minutes

### Warning Alerts (Monitor)

1. **Message Send Failures**
   - Send API returning non-2xx responses for > 10% of requests in 5-minute window
   - Message queue backlog growing consistently

2. **Performance Degradation**
   - API response times > 5 seconds for > 50% of requests
   - Memory/CPU usage exceeding 80% for > 10 minutes

### Monitoring Commands

Set up automated monitoring using these commands:

```sh
# Health check monitoring
curl -s $WAHA_API_URL/health | jq -r '.status' | grep -q "ok" || echo "ALERT: Health check failed"

# Session status monitoring
curl -s -X GET "$WAHA_API_URL/api/sessions/$WAHA_SESSION_NAME" | jq -r '.status' | grep -q "WORKING" || echo "ALERT: Session not working"

# Webhook test
curl -s -X POST "$WAHA_API_URL/api/sendText" \
  -H "Content-Type: application/json" \
  -d '{"session": "'$WAHA_SESSION_NAME'", "chatId": "test@c.us", "text": "monitor test"}' \
  | jq -r '.id' | grep -q "^[A-Z0-9]" || echo "ALERT: Send test failed"
```

## Recovery Actions

### Session Recovery
```sh
# Restart session
curl -s -X POST "$WAHA_API_URL/api/sessions/$WAHA_SESSION_NAME/restart"

# Stop and start session
curl -s -X DELETE "$WAHA_API_URL/api/sessions/$WAHA_SESSION_NAME"
curl -s -X POST "$WAHA_API_URL/api/sessions/start" \
  -H "Content-Type: application/json" \
  -d '{"name": "'$WAHA_SESSION_NAME'", "config": {...}}'
```

### Application Recovery
```sh
# Restart application
fly restart -a hotelbot

# Scale up/down to force restart
fly scale count 0 -a hotelbot
fly scale count 1 -a hotelbot
```

## Fallback Mode Behavior (No WAHA)

If WAHA_API_URL is unreachable or invalid:
- App logs `[WAHA] Continuing without WAHA integration`
- Server continues to run and respond to /health
- WhatsApp features will return stubbed data or no-ops
- This is **expected behavior** in staging, testing, or partial prod rollout

⚠️ WAHA should be reconnected when ready via proper WAHA_API_URL and secrets

## Additional Resources

- [WAHA API Documentation](https://waha.devlike.pro/)
- [Fly.io Monitoring](https://fly.io/docs/monitoring/)
- [Application logs](https://fly.io/apps/hotelbot/monitoring)
