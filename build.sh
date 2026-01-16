#!/bin/bash

# ActNow AI Assistant - Build Script

echo "🔨 Building ActNow Chrome Extension..."

# Check if chrome-extension directory exists
if [ ! -d "chrome-extension" ]; then
    echo "❌ chrome-extension directory not found!"
    exit 1
fi

cd chrome-extension

# Validate manifest.json
echo "📋 Validating manifest.json..."
node -e "const manifest = JSON.parse(require('fs').readFileSync('manifest.json', 'utf8')); console.log('✅ Manifest version:', manifest.version); console.log('✅ Extension name:', manifest.name);" 2>&1

if [ $? -ne 0 ]; then
    echo "❌ Invalid manifest.json!"
    exit 1
fi

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
echo "4. Select the 'chrome-extension' directory"
echo ""
echo "🔄 After making changes, click the reload button on the extension card"
