#!/usr/bin/env node

/**
 * Hotel Voice Bot Scripts CLI
 * 
 * This script provides command-line utilities for managing the Hotel Voice Bot.
 * 
 * Usage:
 *   npm run db:migrate    - Run database migrations
 *   npm run db:seed       - Seed database with sample data
 *   node dist/index.js    - Run the CLI directly
 * 
 * Environment Variables:
 *   DATABASE_URL         - PostgreSQL connection string for database operations
 *   SUPABASE_URL         - Supabase project URL
 *   SUPABASE_ANON_KEY    - Supabase anonymous key
 *   SUPABASE_SERVICE_KEY - Supabase service role key (for migrations)
 */

import { program } from 'commander';

program
  .name('hotel-voice-bot-scripts')
  .description('Utility scripts for hotel voice bot')
  .version('1.0.0');

program
  .command('db:migrate')
  .description('Run database migrations')
  .action(() => {
    console.log('Running database migrations...');
    // TODO: Implement database migrations
  });

program
  .command('db:seed')
  .description('Seed database with sample data')
  .action(() => {
    console.log('Seeding database...');
    // TODO: Implement database seeding
  });

program.parse();
