# Hotel Voice Bot MVP Deployment Guide

This guide will help you deploy your voice-to-voice FAQ bot from zero to working prototype.

## Prerequisites

- Node.js 18+ and pnpm
- Supabase account and project
- OpenAI API key
- WAHA (WhatsApp HTTP API) server setup

## 1. Environment Setup

Create a `.env` file in the project root:

```bash
# Copy from .env.example
cp .env.example .env
```

Update the following required variables:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key

# WAHA Configuration
WAHA_API_URL=http://localhost:3000
WAHA_URL=http://localhost:3000
WAHA_TOKEN=your-waha-token
WAHA_WEBHOOK_TOKEN=your-secure-webhook-token
WAHA_WEBHOOK_URL=https://your-domain.com/api/whatsapp/webhook
```

## 2. Database Setup

### Run SQL Migrations

In your Supabase dashboard, run these SQL files in order:

1. `packages/scripts/migrations/001_add_bot_tables.sql`
2. `packages/scripts/migrations/002_add_increment_function.sql`

### Populate FAQ Data

```bash
cd packages/scripts
npx tsx src/populate-faqs.ts
```

## 3. Quick Setup Script

Run the complete setup:

```bash
./scripts/setup-mvp.sh
```

This script will:
- Install dependencies
- Build packages
- Populate FAQ data
- Test FAQ matching
- Verify setup

## 4. Start the API Server

```bash
# Development mode
pnpm dev

# Or specifically the API
pnpm --filter @hotel-voice-bot/api dev
```

The server will start on `http://localhost:3000`

## 5. WAHA Setup

1. Set up WAHA server (see WAHA documentation)
2. Configure webhook URL to point to your API: `https://your-domain.com/api/whatsapp/webhook`
3. Verify webhook token matches `WAHA_WEBHOOK_TOKEN`

## 6. Testing the MVP

### Test FAQ Matching

```bash
cd packages/scripts
npx tsx src/test-faq-matching.ts
```

### Test WhatsApp Integration

1. Send a text message to your WhatsApp number
2. Send a voice message to your WhatsApp number
3. Check logs for processing

### Sample Test Messages

- "What time is check-in?" → Should match check-in FAQ
- "Do you have wifi?" → Should match WiFi FAQ
- "Is breakfast included?" → Should match breakfast FAQ

## 7. Monitoring and Debugging

### Check Logs

The API server logs all processing steps:
- Message receipt
- Voice transcription
- FAQ matching
- Response generation

### Database Monitoring

Check these tables in Supabase:
- `faqs` - Your FAQ data
- `bot_messages` - All message logs
- `conversation_sessions` - Session tracking

### Common Issues

1. **Environment Variables**: Ensure all required vars are set
2. **WAHA Connection**: Check WAHA server is running and accessible
3. **OpenAI API**: Verify API key and quota
4. **Supabase**: Check RLS policies and service role permissions

## 8. Production Deployment

### API Server

Deploy to your preferred platform (Railway, Render, etc.):

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

### Environment Variables

Set all production environment variables:
- Update WAHA_WEBHOOK_URL to production domain
- Use production Supabase credentials
- Ensure OpenAI API key is production-ready

### Security

- Use HTTPS for all webhooks
- Keep webhook tokens secret
- Enable Supabase RLS policies
- Monitor API usage and costs

## 9. Scaling Considerations

### Performance

- FAQ matching uses semantic search via OpenAI
- Voice processing uses Whisper API
- Database queries are optimized with indexes

### Cost Management

- Monitor OpenAI API usage
- Implement rate limiting if needed
- Cache frequently accessed FAQs

### Multi-language Support

- Add FAQs in multiple languages
- Update language detection logic
- Configure OpenAI models for different languages

## 10. Feature Extensions

Your MVP is ready for these enhancements:

- **Advanced NLP**: More sophisticated intent recognition
- **Multi-modal**: Support for images, documents
- **Escalation**: Human agent handoff
- **Analytics**: Usage tracking and reporting
- **Hotel Integration**: PMS system connections

## Support

For issues:
1. Check the logs first
2. Verify all environment variables
3. Test individual components (FAQ matching, voice processing)
4. Review the API documentation at `/api/docs`

Your voice-to-voice FAQ bot is now ready for production use! 🎉
