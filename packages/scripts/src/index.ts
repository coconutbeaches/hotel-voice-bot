#!/usr/bin/env node
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
