#!/bin/bash

# Supabase Migration Runner
# This script runs all SQL migrations in the migrations directory

set -e

MIGRATIONS_DIR="./migrations"
DB_URL=${SUPABASE_DB_URL:-"postgresql://postgres:postgres@localhost:54322/postgres"}

echo "Running Supabase migrations..."
echo "Database URL: $DB_URL"
echo "Migrations directory: $MIGRATIONS_DIR"

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo "Error: Migrations directory not found at $MIGRATIONS_DIR"
    exit 1
fi

# Run each migration file in order
for migration_file in "$MIGRATIONS_DIR"/*.sql; do
    if [ -f "$migration_file" ]; then
        echo "Running migration: $(basename "$migration_file")"
        
        # Check if supabase CLI is available
        if command -v supabase &> /dev/null; then
            supabase db push --db-url "$DB_URL" --file "$migration_file"
        else
            # Fallback to psql if supabase CLI is not available
            echo "Supabase CLI not found, using psql..."
            if command -v psql &> /dev/null; then
                psql "$DB_URL" -f "$migration_file"
            else
                echo "Error: Neither supabase CLI nor psql found. Please install one of them."
                exit 1
            fi
        fi
        
        echo "Migration $(basename "$migration_file") completed successfully"
    fi
done

echo "All migrations completed successfully!"
