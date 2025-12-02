#!/bin/bash
set -e

echo "🚀 Starting Railway build process..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install --omit=dev --legacy-peer-deps

# Install Puppeteer browser
echo "🌐 Installing Puppeteer browser..."
npx puppeteer browsers install chrome

# Verify installation
echo "✅ Build completed successfully!"
echo "📁 Node modules size: $(du -sh node_modules | cut -f1)"