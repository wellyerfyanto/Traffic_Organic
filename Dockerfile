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

# Set environment variables for Puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV CHROMIUM_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=production
ENV DISABLE_SETUID_SANDBOX=true
ENV NO_SANDBOX=true

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy ALL application files
COPY . .

# Create necessary directories if they don't exist
RUN mkdir -p bot public data

# Verify file structure
RUN echo "=== FILE STRUCTURE VERIFICATION ===" && \
    echo "Root files:" && ls -la && \
    echo "Bot directory:" && ls -la bot/ 2>/dev/null || echo "Bot directory is empty or doesn't exist" && \
    echo "Public directory:" && ls -la public/ 2>/dev/null || echo "Public directory is empty"

# Set permissions
RUN chmod -R 755 . && \
    chown -R node:node /app

# Create non-root user
USER node

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "--max-http-header-size=16384", "--trace-warnings", "server.js"]