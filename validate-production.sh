#!/bin/bash

# Production Container Validation Script for pnpm monorepo
# Run this inside the Fly.io production container via: fly ssh console

echo "=== VALIDATING PRODUCTION CONTAINER ==="
echo

# Check current directory
echo "Current directory: $(pwd)"
echo

# List entire /app directory structure
echo "=== DIRECTORY STRUCTURE ==="
ls -lR /app
echo

# Check root workspace files
echo "=== ROOT WORKSPACE FILES ==="
files_to_check=(
    "/app/pnpm-workspace.yaml"
    "/app/pnpm-lock.yaml"
    "/app/package.json"
)

for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        echo "✓ $file exists"
    else
        echo "✗ WARNING: $file is missing!"
    fi
done
echo

# Check package structure
echo "=== PACKAGE STRUCTURE ==="
packages=("api" "shared" "integrations")

for pkg in "${packages[@]}"; do
    echo "Checking package: $pkg"
    
    # Check package.json
    if [ -f "/app/packages/$pkg/package.json" ]; then
        echo "  ✓ /app/packages/$pkg/package.json exists"
    else
        echo "  ✗ WARNING: /app/packages/$pkg/package.json is missing!"
    fi
    
    # Check dist folder
    if [ -d "/app/packages/$pkg/dist" ]; then
        echo "  ✓ /app/packages/$pkg/dist/ exists"
        echo "    Contents: $(ls -la /app/packages/$pkg/dist/)"
    else
        echo "  ✗ WARNING: /app/packages/$pkg/dist/ is missing!"
    fi
    echo
done

# Check node_modules symlinks
echo "=== NODE_MODULES WORKSPACE SYMLINKS ==="
symlinks_to_check=(
    "/app/node_modules/@hotel-voice-bot/integrations"
    "/app/node_modules/@hotel-voice-bot/shared"
)

for symlink in "${symlinks_to_check[@]}"; do
    if [ -L "$symlink" ]; then
        echo "✓ $symlink is a symlink -> $(readlink $symlink)"
    elif [ -d "$symlink" ]; then
        echo "⚠ $symlink exists but is not a symlink (this may cause issues)"
    else
        echo "✗ WARNING: $symlink does not exist!"
    fi
done
echo

# Test pnpm workspace recognition
echo "=== PNPM WORKSPACE RECOGNITION ==="
if command -v pnpm &> /dev/null; then
    echo "pnpm version: $(pnpm --version)"
    echo "Workspace packages:"
    pnpm list --depth=0 --workspace-root 2>/dev/null || echo "Failed to list workspace packages"
else
    echo "✗ WARNING: pnpm not found!"
fi
echo

# Test the start command
echo "=== TESTING START COMMAND ==="
echo "Testing: pnpm --filter @hotel-voice-bot/api run start --dry-run"
pnpm --filter @hotel-voice-bot/api run start --dry-run 2>&1 || echo "Start command test failed"
echo

echo "=== VALIDATION COMPLETE ==="
