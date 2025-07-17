# Fail-Safe Deployment Checklist for pnpm Monorepo

## Pre-Deployment Checks

### 1. Package.json Validation
- [ ] All packages have `"main": "dist/index.js"`
- [ ] All packages have `"type": "module"`
- [ ] Workspace dependencies use `"workspace:*"` format
- [ ] Root package.json has correct build order in scripts

### 2. Workspace Configuration
- [ ] `pnpm-workspace.yaml` lists all packages
- [ ] `pnpm-lock.yaml` is up to date (run `pnpm install` if needed)
- [ ] No conflicting dependencies between packages

### 3. Build Process
- [ ] `pnpm run build` succeeds locally
- [ ] All `dist/` folders are created and contain built JS files
- [ ] No circular dependencies between packages

## Common Module Resolution Issues & Fixes

### Issue 1: ERR_MODULE_NOT_FOUND for workspace packages
**Cause**: Missing workspace symlinks in node_modules
**Fix**: Ensure `pnpm install --frozen-lockfile --ignore-scripts` (not `--prod`) in production

### Issue 2: Import paths not resolving
**Cause**: Incorrect "main" field or missing "exports" field
**Fix**: Update package.json with correct entry points

### Issue 3: Subpath imports failing (e.g., @hotel-voice-bot/integrations/openai)
**Cause**: Missing "exports" field in package.json
**Fix**: Add exports field to enable subpath imports

### Issue 4: TypeScript compilation errors in production
**Cause**: Missing type declarations or incorrect tsconfig
**Fix**: Use `--skipLibCheck` in build scripts for lenient compilation

## Docker-Specific Checks

### 1. Layer Caching
- [ ] Dependencies are installed before source code is copied
- [ ] Build artifacts are properly copied from builder stage
- [ ] No unnecessary files in final image

### 2. File Permissions
- [ ] App directory is owned by non-root user
- [ ] Node_modules permissions are correct for symlinks

### 3. Environment Variables
- [ ] All required env vars are set in fly.toml
- [ ] No hardcoded secrets in code

## Runtime Validation Steps

### 1. Container Structure
```bash
# Run in production container
ls -la /app/node_modules/@hotel-voice-bot/
# Should show symlinks to ../../../packages/
```

### 2. Module Resolution Test
```bash
# Test import resolution
node -e "console.log(require.resolve('@hotel-voice-bot/integrations'))"
```

### 3. Health Check
```bash
# Test health endpoint
curl -f http://localhost:3000/api/health
```

## Emergency Fixes

### If workspace symlinks are missing:
```bash
cd /app && pnpm install --frozen-lockfile --ignore-scripts
```

### If imports still fail:
```bash
# Check actual file structure
find /app/packages -name "*.js" | head -10
# Verify package.json main fields
find /app/packages -name "package.json" -exec grep -l "main" {} \;
```

### If health check fails:
```bash
# Check if process is running
ps aux | grep node
# Check logs
pnpm --filter @hotel-voice-bot/api run start 2>&1 | head -50
```

## Final Deployment Command
```bash
# Build and deploy
pnpm run build && fly deploy --wait-timeout=300
```

## Post-Deployment Validation
1. [ ] App starts successfully (no restart loops)
2. [ ] Health check passes
3. [ ] All API endpoints respond correctly
4. [ ] No module resolution errors in logs
