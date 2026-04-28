#!/bin/bash

# Alien Orbit Assault - Build Script for itch.io
# This script bundles the game into a single zip file for deployment.

# Exit on error
set -e

echo "🚀 Starting build process..."

# 1. Clean up previous builds
echo "🧹 Cleaning up old build artifacts..."
rm -rf dist
rm -f alienpi-release.zip

# 2. Create dist directory structure
echo "📂 Creating dist directory..."
mkdir -p dist

# 3. Bundle JavaScript with esbuild
# We bundle game.js as the entry point. It will include all imports from src/.
# --bundle: combine all files
# --minify: shrink the code for production
# --format=esm: keep it as an ES module to match index.html
# --outfile: where to put the result
echo "📦 Bundling JavaScript..."
npx esbuild game.js --bundle --minify --format=esm --outfile=dist/game.js

# 4. Copy HTML and Assets
echo "📄 Copying index.html..."
cp index.html dist/index.html

echo "🖼️ Copying assets..."
# We use cp -R to copy the public directory and its contents
cp -R public dist/

# 5. Create release zip
# We enter the dist directory to ensure index.html is at the root of the zip
echo "🗜️ Creating release zip..."
(cd dist && zip -r ../alienpi-release.zip .)

echo "✅ Build complete! Release package: alienpi-release.zip"
echo "📊 Build stats:"
du -sh alienpi-release.zip
