FROM node:18-alpine

# Install Chromium dan dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji \
    && rm -rf /var/cache/apk/*

# Set environment variables
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production \
    PORT=3000

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app dengan fix untuk proxyHandler.js
COPY . .

# Run fix script sebelum start
RUN echo "🔧 Applying Railway fixes..." && \
    # Fix proxyHandler.js
    sed -i "s/new File(/\/\* File removed for Node.js \*\/ null \&\& (/g" bot/proxyHandler.js && \
    sed -i "s/File\./fs\./g" bot/proxyHandler.js && \
    sed -i "s/require('fs')\.promises/require('fs').promises/g" bot/proxyHandler.js && \
    # Ensure proper fetch
    echo "const fetch = global.fetch || require('node-fetch');" > bot/fetch-polyfill.js && \
    # Create directories
    mkdir -p bot public data

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S railway -u 1001

# Change ownership
RUN chown -R railway:nodejs /app

# Switch to non-root user
USER railway

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
