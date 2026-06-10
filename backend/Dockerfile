# Multi-stage Backend Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package configurations
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Prune dev dependencies for production
RUN npm prune --production

# Runtime Stage
FROM node:18-alpine AS runner

# Install openssl for Prisma engine on Alpine
RUN apk add --no-cache openssl

WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Create a non-root system user
RUN addgroup -g 1001 -S nodejs && adduser -S expressjs -u 1001 -G nodejs

# Copy built node_modules, prisma, and source code
COPY --from=builder --chown=expressjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=expressjs:nodejs /app/package*.json ./
COPY --from=builder --chown=expressjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=expressjs:nodejs /app/src ./src
COPY --from=builder --chown=expressjs:nodejs /app/clean-financials.js ./clean-financials.js

# Create uploads directory and set permissions
RUN mkdir -p /app/uploads && chown -R expressjs:nodejs /app/uploads

# Expose backend port
EXPOSE 3001

# Switch to non-root user
USER expressjs

# Healthcheck to verify the server status
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start script: run prisma db push to ensure DB is in sync and then start application
CMD ["sh", "-c", "npx prisma db push && npm start"]
