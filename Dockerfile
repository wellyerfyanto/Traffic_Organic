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
    font-noto-emoji \
    curl \
    bash

# Set environment variables
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV CHROMIUM_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=production
ENV DISABLE_SETUID_SANDBOX=true
ENV NO_SANDBOX=true

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy ALL source files
COPY . .

# Create necessary directories
RUN mkdir -p bot public data

# VERIFICATION STEP: List files for debugging
RUN echo "=== FILE STRUCTURE AFTER COPY ===" && \
    ls -la && \
    echo "=== BOT DIRECTORY ===" && \
    ls -la bot/ 2>/dev/null || echo "Bot directory not found" && \
    echo "=== ROOT JS FILES ===" && \
    ls *.js 2>/dev/null || echo "No JS files in root"

# Set permissions
RUN chmod -R 755 . && \
    chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "--max-http-header-size=16384", "--trace-warnings", "server.js"]
