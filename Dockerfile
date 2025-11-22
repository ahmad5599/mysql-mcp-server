# Multi-stage build for production
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Production stage
FROM node:20-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S mcp && \
    adduser -S -u 1001 -G mcp mcp

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application files
COPY package*.json ./
COPY server.js ./
COPY src ./src

# Set ownership
RUN chown -R mcp:mcp /app

# Switch to non-root user
USER mcp

# Environment variables with secure defaults
ENV NODE_ENV=production \
    MYSQL_MCP_READ_ONLY=true \
    MYSQL_MCP_LOGGERS=stderr,mcp \
    MYSQL_MCP_MAX_ROWS=100

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "process.exit(0)"

# Expose port for HTTP mode (optional)
EXPOSE 3000

# Run as non-root
CMD ["node", "server.js"]