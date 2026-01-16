@echo off
REM ActNow AI Assistant - Build Script for Windows

echo.
echo ========================================
echo   ActNow Chrome Extension Build
echo ========================================
echo.

REM Check if chrome-extension directory exists
if not exist "chrome-extension\" (
    echo [ERROR] chrome-extension directory not found!
    pause
    exit /b 1
)

cd chrome-extension

REM Validate manifest.json
echo [INFO] Validating manifest.json...
node -e "const manifest = JSON.parse(require('fs').readFileSync('manifest.json', 'utf8')); console.log('[OK] Manifest version:', manifest.version); console.log('[OK] Extension name:', manifest.name);" 2>nul

if errorlevel 1 (
    echo [ERROR] Invalid manifest.json or Node.js not installed!
    pause
    exit /b 1
)

REM Check required files
echo.
echo [INFO] Checking required files...

if exist "manifest.json" echo [OK] manifest.json
if not exist "manifest.json" (
    echo [ERROR] Missing: manifest.json
    pause
    exit /b 1
)

if exist "background.js" echo [OK] background.js
if not exist "background.js" (
    echo [ERROR] Missing: background.js
    pause
    exit /b 1
)

if exist "content\content.js" echo [OK] content\content.js
if not exist "content\content.js" (
    echo [ERROR] Missing: content\content.js
    pause
    exit /b 1
)

if exist "options\options.html" echo [OK] options\options.html
if not exist "options\options.html" (
    echo [ERROR] Missing: options\options.html
    pause
    exit /b 1
)

if exist "options\options.js" echo [OK] options\options.js
if not exist "options\options.js" (
    echo [ERROR] Missing: options\options.js
    pause
    exit /b 1
)

REM Check required utilities
echo.
echo [INFO] Checking utility files...

if exist "utils\constants.js" echo [OK] utils\constants.js
if not exist "utils\constants.js" echo [ERROR] Missing: utils\constants.js

if exist "utils\encryption.js" echo [OK] utils\encryption.js
if not exist "utils\encryption.js" echo [ERROR] Missing: utils\encryption.js

if exist "utils\storage-manager.js" echo [OK] utils\storage-manager.js
if not exist "utils\storage-manager.js" echo [ERROR] Missing: utils\storage-manager.js

if exist "utils\state-manager.js" echo [OK] utils\state-manager.js
if not exist "utils\state-manager.js" echo [ERROR] Missing: utils\state-manager.js

if exist "utils\api-manager.js" echo [OK] utils\api-manager.js
if not exist "utils\api-manager.js" echo [ERROR] Missing: utils\api-manager.js

if exist "utils\markdown-engine.js" echo [OK] utils\markdown-engine.js
if not exist "utils\markdown-engine.js" echo [ERROR] Missing: utils\markdown-engine.js

REM Check icons
echo.
echo [INFO] Checking icons...

if exist "icons\icon16.png" echo [OK] icons\icon16.png
if not exist "icons\icon16.png" echo [WARN] Missing: icons\icon16.png

if exist "icons\icon48.png" echo [OK] icons\icon48.png
if not exist "icons\icon48.png" echo [WARN] Missing: icons\icon48.png

if exist "icons\icon128.png" echo [OK] icons\icon128.png
if not exist "icons\icon128.png" echo [WARN] Missing: icons\icon128.png

cd ..

echo.
echo ========================================
echo   Build completed successfully!
echo ========================================
echo.
echo To load the extension:
echo   1. Open Chrome and go to chrome://extensions/
echo   2. Enable "Developer mode" (top right toggle)
echo   3. Click "Load unpacked" button
echo   4. Select the "chrome-extension" directory
echo.
echo To reload after changes:
echo   - Click the reload button on the extension card in chrome://extensions/
echo.
pause
