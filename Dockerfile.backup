# Build stage
FROM node:18-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files for workspace setup
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/integrations/package.json ./packages/integrations/
COPY packages/scripts/package.json ./packages/scripts/

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY . .

# Build the application (builds shared, integrations, then api)
RUN pnpm run build

# Production stage
FROM node:18-alpine AS production

# Install pnpm and curl
RUN npm install -g pnpm && apk add --no-cache curl

# Create app directory
WORKDIR /app

# Copy workspace configuration files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy all package.json files to maintain workspace structure
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/integrations/package.json ./packages/integrations/
COPY packages/scripts/package.json ./packages/scripts/

# Install ALL dependencies (including workspace deps) to ensure proper linking
# This creates the workspace symlinks needed for @hotel-voice-bot/integrations imports
RUN pnpm install --no-frozen-lockfile --ignore-scripts

# Copy built application from builder stage - include all packages
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist/
COPY --from=builder /app/packages/api/dist ./packages/api/dist/
COPY --from=builder /app/packages/integrations/dist ./packages/integrations/dist/
COPY --from=builder /app/packages/scripts/dist ./packages/scripts/dist/

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Health check - updated for best practices
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application using pnpm filter to run the API package
CMD ["pnpm", "--filter", "@hotel-voice-bot/api", "run", "start"]
