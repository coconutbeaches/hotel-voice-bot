
# Hotel Voice Bot
<!-- Last Updated: 2025-07-17 -->

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

- [ ] **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hotel-voice-bot
   ```

- [ ] **Install dependencies**
   ```bash
   pnpm install
   ```

- [ ] **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

- [ ] **Start development server**
   ```bash
   pnpm run dev
   ```

- [ ] **Access the application**
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

### Core Configuration

- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000)
- `LOG_LEVEL` - Logging level (debug/info/warn/error)

### Database Configuration

- `DATABASE_URL` - PostgreSQL connection string
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for admin operations)

### OpenAI Configuration

- `OPENAI_API_KEY` - OpenAI API key for LLM processing
- `OPENAI_MODEL` - Model to use (default: gpt-4-turbo-preview)

### WhatsApp Configuration (WAHA)

- `WAHA_API_URL` - WAHA API endpoint
- `WAHA_API_KEY` - WAHA API key
- `WAHA_SESSION_NAME` - WhatsApp session name
- `WAHA_WEBHOOK_URL` - Public webhook URL for receiving messages
- `WAHA_WEBHOOK_TOKEN` - Token for webhook verification

### AWS Configuration

- `AWS_REGION` - AWS region
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key

### Security

- `JWT_SECRET` - JWT signing secret
- `ENCRYPTION_KEY` - Encryption key for sensitive data

### External Services

- `HOTEL_MANAGEMENT_API_URL` - Hotel PMS API endpoint
- `HOTEL_MANAGEMENT_API_KEY` - Hotel PMS API key

See `.env.example` for the complete environment configuration template.

> **⚠️ Important**: Always update `.env.example` when adding, removing, or changing environment variables. This ensures proper onboarding for new developers and deployment consistency.

## API Documentation

API documentation is automatically generated using OpenAPI 3.0 specification and available at:
- Development: http://localhost:3000/api-docs
- Production: https://your-domain.com/api-docs

## Runbooks

Operational runbooks are available in the `/docs/runbooks/` directory:
- [Deployment Runbook](docs/runbooks/deployment.md)
- [Rollback Runbook](docs/runbooks/rollback.md)
- [Hot-patch Runbook](docs/runbooks/hot-patch.md)
- [Monitoring and Alerting](docs/runbooks/monitoring.md)

## Conversation Design Guide

For marketing and customer service teams to update conversation prompts and FAQs:
- [Conversation Design Guide](docs/conversation-design-guide.md)

## Database Schema

### Bot-specific Tables (Additive)

The following tables are added to support the voice bot without modifying existing hotel/restaurant data:

#### bot_messages
Stores all bot conversation messages with guest users.

#### escalations
Tracks when conversations are escalated to human agents.

#### faqs
Manages frequently asked questions in multiple languages.

**Important**: All schema changes are additive and reference existing tables safely.

## System Architecture

### Core Components

- **API Server** (`@hotel-voice-bot/api`) - Express.js server with WhatsApp integration
- **Integrations** (`@hotel-voice-bot/integrations`) - External service integrations
- **Shared Types** (`@hotel-voice-bot/shared`) - Common types and utilities
- **Scripts** (`@hotel-voice-bot/scripts`) - Database and utility scripts

### Data Flow

1. WhatsApp message received via WAHA webhook
2. Message processed by NLP controller
3. Intent classification and entity extraction
4. Response generation via OpenAI
5. Response sent back through WhatsApp
6. All interactions logged to Supabase

## Contributing

- [ ] Fork the repository
- [ ] Create a feature branch
- [ ] Make your changes
- [ ] Add tests for your changes
- [ ] Ensure all tests pass
- [ ] Submit a pull request

### Development Principles

- **Additive Migrations**: Never modify or drop existing tables
- **Comprehensive Logging**: Log all messages and escalations
- **Modular Design**: Keep conversation handling modular for future expansion
- **FAQ Management**: Keep FAQ answers easily updateable (not hardcoded)
- **No Conflicts**: Never break existing restaurant/hotel app flows
- **Operational Maturity**: Follow structured operational processes ([Operational Maturity Process](docs/process/operational-maturity.md))

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

## Training and Onboarding

For team training materials and onboarding documentation, see:
- [Training Materials](docs/training/)
- [Post-launch Review Template](docs/post-launch-review-template.md)
