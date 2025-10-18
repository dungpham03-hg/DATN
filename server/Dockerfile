# Multi-stage build for Node.js backend - Optimized for VPS
FROM node:18-alpine AS dependencies

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Install system dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install dependencies with optimizations
RUN npm ci --only=production --silent --no-audit --no-fund && \
    npm cache clean --force

# Production stage
FROM node:18-alpine AS production

# Install dumb-init and security updates
RUN apk add --no-cache dumb-init && \
    apk upgrade --no-cache

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S appuser && \
    adduser -S appuser -u 1001 -G appuser

# Copy dependencies from previous stage
COPY --from=dependencies --chown=appuser:appuser /app/node_modules ./node_modules

# Copy source code with proper ownership
COPY --chown=appuser:appuser . .

# Create uploads directory with proper permissions
RUN mkdir -p uploads/archives uploads/avatars uploads/meetings uploads/protocols && \
    chown -R appuser:appuser uploads && \
    chmod -R 755 uploads

# Set environment variables for production
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 5000

# Enhanced health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/api/auth/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "index.js"]
