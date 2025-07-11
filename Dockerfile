# Multi-stage Docker build for X-Ray Dashboard

# Stage 1: Build stage (if needed for future frontend build process)
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production

# Stage 2: Production stage
FROM node:18-alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy server files and dependencies
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY server/ ./server/
COPY xray-dashboard/ ./xray-dashboard/

# Create data and uploads directories
RUN mkdir -p server/data server/uploads && \
    chown -R nodejs:nodejs /app

# Set user
USER nodejs

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start the application
CMD ["node", "server/server.js"]