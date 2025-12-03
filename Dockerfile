FROM node:18-alpine

WORKDIR /app

# Install dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji

# Set environment variables for Puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV CHROMIUM_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=production

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (gunakan npm install, bukan npm ci)
RUN npm install --omit=dev

# Copy application files
COPY . .

# Create bot directory structure jika belum ada
RUN mkdir -p bot public

# Move bot files to bot directory jika belum terstruktur
RUN mv trafficGenerator.js bot/ 2>/dev/null || true
RUN mv proxyHandler.js bot/ 2>/dev/null || true
RUN mv keywordAnalyzer.js bot/ 2>/dev/null || true
RUN mv botHandler.js bot/ 2>/dev/null || true

# Set permissions
RUN chmod -R 755 .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S botuser -u 1001
USER botuser

# Expose port
EXPOSE 3000

# Start application dengan flag untuk mengurangi warnings
CMD ["node", "--max-http-header-size=16384", "--trace-warnings", "server.js"]