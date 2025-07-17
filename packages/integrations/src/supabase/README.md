# Supabase Migrations Guide

This guide describes how to run SQL migrations for the Supabase project in the Hotel Voice Bot. The migrations define and maintain the database schema and policies, facilitating seamless integration with version 2.0 of the voice bot and the Dine Merge Mobile Order app.

### Running Migrations Locally

To run migrations locally, use the provided shell script:

1. **Ensure Supabase CLI is installed**:
   - Follow the [Supabase CLI installation guide](https://supabase.com/docs/guides/cli) to set up the CLI locally.

2. **Set the Database URL**:
   - Ensure your database URL is set either in your environment variables or directly in the script.

3. **Run the script**:
   ```sh
   cd packages/integrations/src/supabase
   ./run-migrations.sh
   ```

This script will execute all SQL files in the `migrations` directory, applying them to your local database.

### CI/CD Integration

Migrations are automatically handled in CI using GitHub Actions:

- **Triggers**:
  - Push to `main` or `develop` branches
  - Pull requests to `main`

- **Actions**:
  1. Checkout the code.
  2. Setup Supabase CLI and Node.js.
  3. Install dependencies.
  4. Run migrations on `develop` and `main` branches pointing to respective staging or production environments using secrets.
  5. Tests are executed post-migration to ensure integrity and functionality.

- **Secrets Required**:
  - `SUPABASE_DB_URL_STAGING`: URL for the staging database.
  - `SUPABASE_DB_URL_PRODUCTION`: URL for the production database.
  - `SUPABASE_ACCESS_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` for authentication and authorization.

**Note**: Ensure these secrets are properly configured in your GitHub repository settings.

This setup helps in maintaining a consistent and synchronized database schema across environments, facilitating error-free deployments and seamless operations in conjunction with the Dine Merge Mobile Order application.
