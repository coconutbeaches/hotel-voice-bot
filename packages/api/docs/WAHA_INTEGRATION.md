# WAHA WhatsApp Integration Documentation

This document describes the WhatsApp integration using WAHA (WhatsApp HTTP API) for the hotel voice bot system.

## Overview

The integration provides:
- **Webhook Controller**: Handles incoming WhatsApp messages with token verification
- **Message Queue**: Manages outgoing messages with retry logic and rate limiting
- **Template Service**: Provides structured messaging for common hotel scenarios
- **Rate Limiting**: Prevents spam and adheres to WhatsApp's usage policies

## Setup Instructions

### 1. Install WAHA

```bash
# Using Docker
docker run -it --rm -p 3000:3000/tcp devlikeapro/waha

# Or using npm
npm install -g @devlikeapro/waha
waha
```

### 2. Environment Configuration

Add the following to your `.env` file:

```env
# WAHA Configuration
WAHA_API_URL=http://localhost:3000
WAHA_API_KEY=your-api-key-if-needed
WAHA_SESSION_NAME=default
WAHA_WEBHOOK_URL=https://your-domain.com/api/whatsapp/webhook
WAHA_WEBHOOK_TOKEN=your-secure-webhook-token
```

### 3. Database Setup

Run the SQL schema to create required tables:

```sql
-- Run the schema in packages/api/src/database/schema.sql
```

### 4. Start the Integration

```bash
# Start the API server
npm run dev

# The server will automatically initialize the WAHA session
```

## API Endpoints

### Webhook Verification (GET)
```
GET /api/whatsapp/webhook?token=your-webhook-token
```

### Webhook Processing (POST)
```
POST /api/whatsapp/webhook?token=your-webhook-token
```

## Architecture

### WAHA Client (`wahaClient.ts`)
- **Purpose**: Direct interface to WAHA API
- **Features**: 
  - Session management
  - Message sending (text, buttons, images, documents)
  - Media handling
  - Contact management

### Message Queue (`messageQueue.ts`)
- **Purpose**: Reliable message delivery with retry logic
- **Features**:
  - Priority-based queuing
  - Automatic retries with exponential backoff
  - Rate limiting (80 messages/hour per recipient)
  - Scheduled message delivery

### Template Service (`templateService.ts`)
- **Purpose**: Standardized messaging for common scenarios
- **Templates**:
  - Welcome messages for new guests
  - Service request confirmations
  - Status updates
  - Check-out reminders
  - Emergency notifications

### Webhook Controller (`whatsapp.ts`)
- **Purpose**: Handle incoming WhatsApp messages
- **Features**:
  - Token verification
  - Message parsing
  - Automatic acknowledgment

## Usage Examples

### Send a Text Message
```typescript
import { wahaClient } from './services/whatsapp/wahaClient';

await wahaClient.sendTextMessage('1234567890', 'Hello from hotel!');
```

### Send Message with Buttons
```typescript
await wahaClient.sendButtonsMessage(
  '1234567890',
  'How can we help you?',
  [
    { id: 'housekeeping', text: 'Housekeeping' },
    { id: 'room_service', text: 'Room Service' },
    { id: 'concierge', text: 'Concierge' }
  ]
);
```

### Queue a Message
```typescript
import { messageQueue } from './services/whatsapp/messageQueue';

await messageQueue.enqueueMessage(
  '1234567890',
  {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: '1234567890',
    type: 'text',
    text: { body: 'Your message here' }
  },
  'high' // priority
);
```

### Use Template Service
```typescript
import { templateService } from './services/whatsapp/templateService';

await templateService.sendWelcomeMessage(
  '1234567890',
  'John Doe',
  '101',
  '2024-01-15',
  '2024-01-17'
);
```

## Rate Limiting

The system implements rate limiting to prevent spam:
- **Limit**: 80 messages per hour per recipient
- **Window**: Rolling 1-hour window
- **Behavior**: Messages are automatically queued if rate limit is exceeded

## Error Handling

### Retry Logic
- **Max Retries**: 3 attempts
- **Backoff**: Exponential (2^attempt seconds)
- **Failure Handling**: Messages marked as failed after max retries

### Common Error Scenarios
1. **Session Not Ready**: Wait for QR code scan
2. **Network Errors**: Automatic retry
3. **Rate Limit Exceeded**: Automatic queuing
4. **Invalid Phone Number**: Immediate failure

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
# Set TEST_PHONE_NUMBER in .env
npm run test:integration
```

### Manual Testing
```bash
# Test WAHA integration
npm run test:waha
```

## Monitoring

### Queue Statistics
```typescript
const stats = await messageQueue.getQueueStats();
console.log(stats);
// Output: { pending: 5, processing: 2, completed: 100, failed: 1 }
```

### Session Status
```typescript
const status = await wahaClient.getSessionStatus();
console.log(status);
// Output: { name: 'default', status: 'WORKING', me: { id: '...', pushName: '...' } }
```

## Troubleshooting

### Common Issues

1. **Session Not Working**
   - Check WAHA server is running
   - Verify QR code was scanned
   - Restart session if needed

2. **Messages Not Sending**
   - Check rate limits
   - Verify phone number format
   - Check message queue status

3. **Webhook Not Receiving**
   - Verify webhook URL is accessible
   - Check token configuration
   - Ensure HTTPS for production

### Debug Commands

```bash
# Check session status
curl http://localhost:3000/api/sessions/default

# Get QR code
curl http://localhost:3000/api/sessions/default/qr

# Send test message
curl -X POST http://localhost:3000/api/sendText \
  -H "Content-Type: application/json" \
  -d '{"session": "default", "chatId": "1234567890@c.us", "text": "Test"}'
```

## Security Considerations

1. **Token Verification**: Always verify webhook tokens
2. **Rate Limiting**: Implement proper rate limiting
3. **Input Validation**: Validate all incoming webhook data
4. **HTTPS**: Use HTTPS in production
5. **Environment Variables**: Store sensitive data in environment variables

## Performance Optimization

1. **Message Batching**: Queue multiple messages for batch processing
2. **Database Indexing**: Proper indexing on message_queue table
3. **Connection Pooling**: Use connection pooling for database
4. **Caching**: Cache frequently accessed data

## Deployment

### Docker Setup
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables
```env
NODE_ENV=production
PORT=3000
WAHA_API_URL=http://waha:3000
WAHA_WEBHOOK_URL=https://your-domain.com/api/whatsapp/webhook
WAHA_WEBHOOK_TOKEN=your-secure-token
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Maintenance

### Regular Tasks
1. **Clean up old messages**: Run `cleanup_old_messages()` function
2. **Monitor queue health**: Check for stuck messages
3. **Update rate limits**: Adjust based on usage patterns
4. **Session maintenance**: Restart sessions if needed

### Monitoring Alerts
- High message failure rate
- Queue backlog growing
- Session disconnections
- Rate limit violations

This integration provides a robust, scalable solution for WhatsApp messaging in hotel operations while maintaining reliability and adherence to WhatsApp's policies.
