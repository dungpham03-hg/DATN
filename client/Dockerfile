# Multi-stage build cho React app - Optimized for VPS
FROM node:18-alpine as build

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Build arguments
ARG REACT_APP_API_BASE_URL
ARG REACT_APP_SOCKET_URL
ARG REACT_APP_GOOGLE_CLIENT_ID

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install dependencies with optimizations
RUN npm install --silent --no-audit --no-fund && \
    npm cache clean --force

# Copy source code
COPY . .

# Build with production optimizations
ENV NODE_ENV=production
ENV GENERATE_SOURCEMAP=false
ENV INLINE_RUNTIME_CHUNK=false
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
ENV REACT_APP_SOCKET_URL=$REACT_APP_SOCKET_URL
ENV REACT_APP_GOOGLE_CLIENT_ID=$REACT_APP_GOOGLE_CLIENT_ID
RUN npm run build

# Production stage - use smaller nginx image
FROM nginx:1.25-alpine

# Install security updates
RUN apk upgrade --no-cache

# Create non-root user for security
RUN addgroup -g 1001 -S appuser && \
    adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G appuser -g appuser appuser

# Copy built app with proper ownership
COPY --from=build --chown=appuser:appuser /app/build /usr/share/nginx/html

# Copy optimized nginx configuration
COPY --chown=appuser:appuser nginx.conf /etc/nginx/conf.d/default.conf

# Set proper permissions
RUN chmod -R 755 /usr/share/nginx/html && \
    chown -R appuser:appuser /var/cache/nginx && \
    chown -R appuser:appuser /var/log/nginx && \
    chown -R appuser:appuser /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R appuser:appuser /var/run/nginx.pid

# Switch to non-root user
USER appuser

# Use non-privileged port
EXPOSE 8080

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["nginx", "-g", "daemon off;"]
