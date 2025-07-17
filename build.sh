#!/bin/bash

# Custom build script for Fly.io deployment
set -e

echo "=== Starting custom build process ==="

# Install npm globally (fallback from pnpm)
npm install -g npm@latest

# Install dependencies using npm instead of pnpm
echo "=== Installing dependencies with npm ==="
npm install --legacy-peer-deps

# Build packages in correct order
echo "=== Building shared package ==="
cd packages/shared
npm run build
cd ../..

echo "=== Building integrations package ==="
cd packages/integrations
npm run build
cd ../..

echo "=== Building API package ==="
cd packages/api
npm run build
cd ../..

echo "=== Build completed successfully ==="
