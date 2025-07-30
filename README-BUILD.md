# SmartStream Filter Build Guide

## Quick Start

```bash
# Development build
./build.sh

# Clean build (removes previous artifacts)
./build.sh --clean

# Production build (minified, creates ZIP)
./build.sh --production

# Show help
./build.sh --help
```

## Build Script Features

The `build.sh` script is a comprehensive build tool that handles all aspects of building the Chrome extension:

### Features:
- **Environment Detection**: Automatically loads `.env` file
- **Dependency Management**: Checks and installs npm packages if needed
- **Multiple Build Modes**: Development (with source maps) and Production (minified)
- **Asset Verification**: Ensures all required files are present
- **Manifest Validation**: Verifies all files referenced in manifest exist
- **API Configuration**: Validates API URL is properly configured
- **Distribution Package**: Creates ZIP file for Chrome Web Store (production mode)

### What it does:
1. Loads environment variables from `.env`
2. Runs TypeScript compilation
3. Runs Vite build for all modules
4. Copies static assets (HTML, icons, manifest)
5. Verifies all required files are present
6. Validates manifest integrity
7. Creates distribution ZIP (if production mode)

### Required Files:
- `manifest.json` - Chrome extension manifest
- `icons/ssf.png` - Extension icon
- `src/popup/popup.html` - Popup interface
- `src/onboarding/onboarding.html` - Onboarding page
- `src/onboarding/onboarding.js` - Onboarding logic

### Environment Variables:
- `VITE_API_URL` - API endpoint (default: `http://localhost:3001/api/v1`)

## Manual Build Steps

If you prefer to build manually:

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
export VITE_API_URL="http://localhost:3001/api/v1"

# 3. Run the build
npm run build

# 4. Verify the dist folder contains:
# - popup.html, popup.js
# - background.js
# - content-youtube.js
# - manifest.json
# - icons/ssf.png
# - onboarding.html, onboarding.js
```

## Troubleshooting

### Missing onboarding files
If you see "ERR_FILE_NOT_FOUND" for onboarding.html:
- Ensure `src/onboarding/onboarding.html` exists
- Run `./build.sh --clean` to rebuild from scratch

### API connection issues
- Check `.env` file has correct `VITE_API_URL`
- Verify server is running on the correct port
- Check console for CORS errors

### Extension won't load
- Ensure all files in manifest.json exist in dist/
- Check Chrome developer console for errors
- Try `./build.sh --clean` for a fresh build