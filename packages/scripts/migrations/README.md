# Database Migration Guide

<!-- Last Updated: 2025-07-17 -->

## Overview

This directory contains database migration scripts for the Hotel Voice Bot. All migrations are designed to be additive and non-destructive to existing hotel/restaurant data.

## Migration Files

### 001_add_bot_tables.sql
Adds bot-related tables to support the voice bot functionality:
- `bot_messages` - Stores conversation messages
- `escalations` - Tracks escalations to human agents
- `faqs` - Manages frequently asked questions
- `conversation_sessions` - Tracks conversation sessions
- `bot_analytics` - Stores analytics data

## Running Migrations

### Production Environment
```bash
# Using Supabase CLI (recommended)
supabase db push --file [packages/scripts/migrations/001_add_bot_tables.sql](./001_add_bot_tables.sql)

# Or using psql
psql -h [HOST] -U [USER] -d [DATABASE] -f [packages/scripts/migrations/001_add_bot_tables.sql](./001_add_bot_tables.sql)
```

### Development Environment
```bash
# Run migration script
cd packages/integrations/src/supabase
./run-migrations.sh
```

## Migration Principles

1. **Additive Only**: Never modify or drop existing tables
2. **Safe References**: Reference existing tables safely with proper foreign keys
3. **Rollback Support**: All migrations should be reversible
4. **Test First**: Always test migrations in staging before production

## Verification

After running migrations, verify the installation:

```bash
# Check tables exist
psql -h [HOST] -U [USER] -d [DATABASE] -c "\dt public.bot_*"

# Check indexes
psql -h [HOST] -U [USER] -d [DATABASE] -c "\di public.idx_bot_*"

# Check RLS policies
psql -h [HOST] -U [USER] -d [DATABASE] -c "SELECT * FROM pg_policies WHERE tablename LIKE 'bot_%';"
```

## Rollback Procedures

If migration needs to be rolled back:

```bash
# Drop tables in reverse order
psql -h [HOST] -U [USER] -d [DATABASE] -c "
DROP TABLE IF EXISTS public.bot_analytics CASCADE;
DROP TABLE IF EXISTS public.escalations CASCADE;
DROP TABLE IF EXISTS public.bot_messages CASCADE;
DROP TABLE IF EXISTS public.conversation_sessions CASCADE;
DROP TABLE IF EXISTS public.faqs CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column();
"
```

## Known Issues/Caveats

*Document any known issues, edge cases, or operational caveats discovered during migration operations. For new issues, please create a [Known Issues ticket](../../.github/ISSUE_TEMPLATE/known_issues.md) and reference it here.*

<!-- Example:
### Issue: Migration Fails on Supabase Free Tier with Large FAQ Dataset
- **Severity**: Medium
- **Workaround**: Split FAQ inserts into smaller batches
- **Reference**: [Known Issue #202](https://github.com/your-org/hotel-voice-bot/issues/202)
-->

## Related Documentation

- [Deployment Runbook](../../docs/runbooks/deployment.md)
- [Database Schema Documentation](../../docs/database-schema.md)
- [Supabase Integration Guide](../integrations/src/supabase/README.md)
