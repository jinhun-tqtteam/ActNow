#!/bin/bash

# ActNow AI Assistant - Build / validation script (Unix)

set -e

echo "🔨 Building ActNow Chrome Extension..."

# Run from the repository root (the folder containing manifest.json)
if [ ! -f "manifest.json" ]; then
    echo "❌ manifest.json not found. Run this script from the repository root."
    exit 1
fi

# Validate manifest.json
echo "📋 Validating manifest.json..."
node -e "const manifest = JSON.parse(require('fs').readFileSync('manifest.json', 'utf8')); console.log('✅ Manifest version:', manifest.version); console.log('✅ Extension name:', manifest.name);"

# Check required files
echo "🔍 Checking required files..."
required_files=("manifest.json" "background.js" "content/content.js" "options/options.html" "options/options.js")

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ Missing: $file"
        exit 1
    fi
done

# Check required utilities
echo "🔍 Checking utility files..."
utility_files=("utils/constants.js" "utils/encryption.js" "utils/storage-manager.js" "utils/state-manager.js" "utils/api-manager.js" "utils/markdown-engine.js")

for file in "${utility_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ Missing: $file"
        exit 1
    fi
done

# Check icons
echo "🔍 Checking icons..."
icon_files=("icons/icon16.png" "icons/icon48.png" "icons/icon128.png")

for file in "${icon_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "⚠️  Missing: $file (extension will work but without icons)"
    fi
done

echo ""
echo "✅ Build completed successfully!"
echo ""
echo "📦 To load the extension:"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable 'Developer mode' (top right)"
echo "3. Click 'Load unpacked'"
echo "4. Select the repository root directory (this folder)"
echo ""
echo "🔄 After making changes, click the reload button on the extension card"
