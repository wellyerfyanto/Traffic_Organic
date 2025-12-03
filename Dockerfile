FROM node:18-alpine

# Install Chromium for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji \
    && rm -rf /var/cache/apk/*

# Set environment variables for Puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production \
    PORT=3000

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Create necessary directories
RUN mkdir -p bot public data

# Move bot files if they exist in root
RUN if [ -f "proxyHandler.js" ]; then mv proxyHandler.js bot/; fi && \
    if [ -f "trafficGenerator.js" ]; then mv trafficGenerator.js bot/; fi && \
    if [ -f "keywordAnalyzer.js" ]; then mv keywordAnalyzer.js bot/; fi && \
    if [ -f "botHandler.js" ]; then mv botHandler.js bot/; fi

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S botuser -u 1001

# Change ownership
RUN chown -R botuser:nodejs /app

# Switch to non-root user
USER botuser

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
