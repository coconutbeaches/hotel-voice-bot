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
