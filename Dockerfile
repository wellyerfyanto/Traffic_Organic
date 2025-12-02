# Gunakan image Node.js dengan Alpine
FROM node:18-alpine

# Install dependencies untuk Puppeteer dan Chrome
RUN apk update && apk add --no-cache \
    curl \
    bash \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-ttf \
    chromium \
    chromium-chromedriver \
    && rm -rf /var/cache/apk/*

# Set environment variables untuk Puppeteer
ENV NODE_ENV=production \
    PORT=3000 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    CHROMIUM_PATH=/usr/bin/chromium-browser

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production --legacy-peer-deps

# Copy app source
COPY . .

# Copy public folder
COPY public ./public

# Gunakan user node yang sudah ada
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:${PORT}/health', (r) => {if(r.statusCode!==200)throw new Error('Status '+r.statusCode)}).on('error', ()=>{throw new Error('Health check failed')})"

# Start application
CMD ["node", "server.js"]
