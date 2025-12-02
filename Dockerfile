FROM node:18-slim

# 1. Install dependencies system yang dibutuhkan Chrome
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    xdg-utils \
    --no-install-recommends

# 2. Install Google Chrome Stable (LENGKAP, bukan chromium)
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# 3. Set environment variables untuk Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
ENV NODE_ENV=production
ENV CHROMIUM_PATH=/usr/bin/google-chrome-stable

WORKDIR /app

# 4. Copy package files
COPY package.json package-lock.json ./

# 5. Install Node.js dependencies dengan FLAG KHUSUS
RUN npm config set fund false \
    && npm config set audit false \
    && npm install --omit=dev --legacy-peer-deps --ignore-scripts

# 6. Copy aplikasi
COPY . .

# 7. Fix permissions dan setup
RUN mkdir -p /tmp/puppeteer \
    && chmod -R 777 /tmp/puppeteer \
    && useradd -m -u 1000 puppeteer \
    && chown -R puppeteer:puppeteer /app

USER puppeteer

EXPOSE 3000

CMD ["node", "server.js"]