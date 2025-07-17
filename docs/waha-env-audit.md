# WAHA Environment Variables Audit

## WAHA Environment Variables Inventory

| Variable Name      | File Path                                                                                          | Line Snippet                                                                | Runtime Required | Service/Endpoint Use | Sensitivity |
|--------------------|-----------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------|------------------|----------------------|-------------|
| WAHA_API_URL       | packages/api/src/services/whatsapp/wahaClient.ts                                                    | baseURL: process.env.WAHA_API_URL || 'http://localhost:3000',               | Yes              | WAHA Client Init     | Low         |
| WAHA_WEBHOOK_TOKEN | packages/api/src/services/whatsapp/wahaClient.ts                                                    | this.webhookToken = process.env.WAHA_WEBHOOK_TOKEN!;                        | Yes              | Webhook Verification | High        |
| WAHA_SESSION_NAME  | packages/api/src/services/whatsapp/wahaClient.ts                                                    | this.sessionName = process.env.WAHA_SESSION_NAME || 'default';              | No (default)     | Session Management   | Low         |
| WAHA_WEBHOOK_URL   | packages/api/src/services/whatsapp/wahaClient.ts                                                    | url: process.env.WAHA_WEBHOOK_URL,                                          | No               | Configuration        | Low         |
| WAHA_URL           | packages/api/src/routes/whatsapp.ts                                                                 | const response = await axios.get(`${process.env.WAHA_URL}/api/files/${mediaId}`); | Yes              | Media Retrieval      | Low         |
| WAHA_TOKEN         | packages/api/src/routes/whatsapp.ts                                                                 | 'Authorization': `Bearer ${process.env.WAHA_TOKEN}`                         | Yes              | Authorization        | High        |
| WAHA_API_URL       | tests/e2e/cypress.config.ts                                                                        | WAHA_API_URL: 'http://localhost:3001'                                       | Test Only        | Testing              | Low         |
| WAHA_API_URL       | packages/api/src/services/whatsapp/__tests__/wahaClient.test.ts                                     | const baseUrl = process.env.WAHA_API_URL || 'http://localhost:3000';        | Test Only        | Testing              | Low         |
| WAHA_API_URL, WAHA_TOKEN, WAHA_WEBHOOK_TOKEN | scripts/setup-mvp.sh                                                                      | echo "- WAHA_API_URL, WAHA_TOKEN, WAHA_WEBHOOK_TOKEN"                     | Script Only      | Documentation        | N/A         |
| WAHA_API_KEY       | README.md                                                                                           | - `WAHA_API_KEY` - WAHA API key                                             | No*              | N/A                  | High        |
| WAHA_API_KEY       | docs/MVP_DEPLOYMENT.md                                                                              | WAHA_API_KEY=your-api-key-if-needed                                         | No*              | N/A                  | High        |
| WAHA_API_KEY       | docs/SECRETS_FLY.md                                                                                 | fly secrets set WAHA_API_KEY=your-waha-api-key                              | No*              | N/A                  | High        |
| WAHA_API_KEY       | packages/api/docs/WAHA_INTEGRATION.md                                                               | WAHA_API_KEY=your-api-key-if-needed                                         | No*              | N/A                  | High        |

## Observations

1. All WAHA environment variables mentioned in the `.env.example` file are used in the codebase as expected.
2. The variable `WAHA_API_KEY` is noted in several documentation files but does not appear to be actively used in the code files I reviewed.

## Runtime Criticality Analysis

### Required at Runtime (Code throws without it)
- **WAHA_API_URL**: Required for WAHA client initialization. Has default fallback to 'http://localhost:3000' but service depends on correct URL.
- **WAHA_WEBHOOK_TOKEN**: Critical - constructor throws error if missing (line 42 in wahaClient.ts: `throw new Error('Missing WAHA_WEBHOOK_TOKEN configuration')`).
- **WAHA_URL**: Required for media file retrieval functionality in webhook processing.
- **WAHA_TOKEN**: Required for Authorization header in media download requests.

### Optional at Runtime (Has defaults or not enforced)
- **WAHA_SESSION_NAME**: Has default value 'default' if not provided.
- **WAHA_WEBHOOK_URL**: Used in configuration but not validated at startup.
- **WAHA_API_KEY**: Not used in active code, only in documentation.

## Security Sensitivity Levels

### High Sensitivity (Critical for rotation)
- **WAHA_WEBHOOK_TOKEN**: Used for webhook verification - compromised token allows malicious webhook requests.
- **WAHA_TOKEN**: Bearer token for API authorization - compromised token allows unauthorized API access.
- **WAHA_API_KEY**: While not used in code, documented as API key with high security implications.

### Low Sensitivity (Safe for rotation)
- **WAHA_API_URL**: Service endpoint URL, typically not secret.
- **WAHA_SESSION_NAME**: Session identifier, not a secret.
- **WAHA_WEBHOOK_URL**: Webhook endpoint URL, typically not secret.
- **WAHA_URL**: Service endpoint URL, typically not secret.

## Service/Endpoint Usage

1. **WAHA Client Initialization**: WAHA_API_URL
2. **Webhook Verification**: WAHA_WEBHOOK_TOKEN (critical security function)
3. **Session Management**: WAHA_SESSION_NAME
4. **Media Retrieval**: WAHA_URL, WAHA_TOKEN (for downloading voice messages)
5. **Configuration**: WAHA_WEBHOOK_URL (webhook setup)

*Note: WAHA_API_KEY marked as "No*" because it's documented but not implemented in the codebase.

