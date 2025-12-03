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

# Install ALL dependencies
RUN npm install --production

# Copy application files
COPY . .

# Create necessary directories
RUN mkdir -p bot public data

# Move files to correct directories
RUN if [ -f "proxyHandler.js" ]; then mv proxyHandler.js bot/; fi
RUN if [ -f "botHandler.js" ]; then mv botHandler.js bot/; fi
RUN if [ -f "keywordAnalyzer.js" ]; then mv keywordAnalyzer.js bot/; fi
RUN if [ -f "trafficGenerator.js" ]; then mv trafficGenerator.js bot/; fi

RUN if [ -f "index.html" ]; then mv index.html public/; fi
RUN if [ -f "style.css" ]; then mv style.css public/; fi
RUN if [ -f "script.js" ]; then mv script.js public/; fi
RUN if [ -f "monitoring.html" ]; then mv monitoring.html public/; fi

# Fix file names
RUN if [ -f "Dockerfile.txt" ]; then mv Dockerfile.txt Dockerfile; fi
RUN if [ -f "railway.toml.txt" ]; then mv railway.toml.txt railway.toml; fi

# Set permissions
RUN chmod -R 755 . && \
    chown -R node:node /app

# Create non-root user
USER node

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "--max-http-header-size=16384", "--trace-warnings", "server.js"]