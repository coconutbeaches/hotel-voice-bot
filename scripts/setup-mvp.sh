#!/bin/bash

# Hotel Voice Bot MVP Setup Script
# This script sets up the complete voice-to-voice FAQ bot

set -e

echo "🚀 Setting up Hotel Voice Bot MVP..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please create one based on .env.example"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build packages
echo "🔨 Building packages..."
pnpm build

# Run database migrations
echo "🗄️ Running database migrations..."
if [ -f "packages/scripts/migrations/001_add_bot_tables.sql" ]; then
    echo "Note: Please run the SQL migrations manually in your Supabase dashboard"
    echo "Files to run:"
    echo "  - packages/scripts/migrations/001_add_bot_tables.sql"
    echo "  - packages/scripts/migrations/002_add_increment_function.sql"
fi

# Populate FAQs
echo "📝 Populating FAQ data..."
cd packages/scripts
npx tsx src/populate-faqs.ts
cd ../..

# Test FAQ matching
echo "🧪 Testing FAQ matching..."
cd packages/scripts
npx tsx src/test-faq-matching.ts
cd ../..

echo "✅ MVP setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Set up WAHA (WhatsApp HTTP API) server"
echo "2. Configure webhook URL in WAHA settings"
echo "3. Start the API server: pnpm dev"
echo "4. Test with WhatsApp messages"
echo ""
echo "🔧 Key environment variables to verify:"
echo "- SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
echo "- OPENAI_API_KEY"
echo "- WAHA_API_URL, WAHA_TOKEN, WAHA_WEBHOOK_TOKEN"
echo ""
echo "🎯 Your voice-to-voice FAQ bot is ready!"
