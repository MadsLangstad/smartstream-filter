#!/bin/bash

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_error() { echo -e "${RED}✗ ERROR: $1${NC}"; }
print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ WARNING: $1${NC}"; }
print_info() { echo -e "$1"; }
print_step() { echo -e "${BLUE}→ $1${NC}"; }

# Function to get file size (cross-platform)
get_file_size() {
    if command -v stat >/dev/null 2>&1; then
        # Try GNU stat first, then BSD stat
        stat -c%s "$1" 2>/dev/null || stat -f%z "$1" 2>/dev/null || echo "0"
    else
        # Fallback to wc
        wc -c < "$1" 2>/dev/null || echo "0"
    fi
}

print_info "${GREEN}🚀 Building SmartStream Filter extension...${NC}"
print_info "========================================="

# Function to show usage
show_usage() {
    print_info "Usage: $0 [options]"
    print_info ""
    print_info "Options:"
    print_info "  --clean       Remove previous build artifacts before building"
    print_info "  --production  Build in production mode (minified, no source maps, creates ZIP)"
    print_info "  --help        Show this help message"
    print_info ""
    print_info "Environment variables:"
    print_info "  VITE_API_URL  API endpoint URL (default: http://localhost:3001/api/v1)"
    exit 0
}

# Parse command line arguments
CLEAN_BUILD=false
PRODUCTION=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --clean)
            CLEAN_BUILD=true
            shift
            ;;
        --production)
            PRODUCTION=true
            shift
            ;;
        --help|-h)
            show_usage
            ;;
        *)
            print_warning "Unknown option: $1"
            show_usage
            ;;
    esac
done

# Clean previous build artifacts if requested
if [ "$CLEAN_BUILD" = true ]; then
    print_step "Cleaning previous build artifacts..."
    rm -rf dist
    rm -rf node_modules/.cache
    print_success "Clean complete"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_step "Installing dependencies..."
    npm install
fi

# Set environment for production if needed
if [ "$PRODUCTION" = true ]; then
    export NODE_ENV=production
    print_info "Building in PRODUCTION mode"
else
    export NODE_ENV=development
    print_info "Building in DEVELOPMENT mode"
fi

# Load environment variables from .env file if it exists
if [ -f ".env" ]; then
    print_step "Loading environment variables from .env"
    # Load .env file while preserving quotes and handling special characters
    set -a
    source .env
    set +a
    print_success "Environment variables loaded"
else
    print_warning "No .env file found, using default values"
fi

# Ensure VITE_API_URL is set
if [ -z "$VITE_API_URL" ]; then
    export VITE_API_URL="http://localhost:3001/api/v1"
    print_warning "VITE_API_URL not set, using default: $VITE_API_URL"
else
    print_info "Using API URL: $VITE_API_URL"
fi

# Run npm build and check if it succeeded
print_step "Running TypeScript and Vite build..."
if ! npm run build; then
    print_error "Build failed!"
    exit 1
fi

print_success "Vite build completed"

# Verify critical JavaScript outputs from Vite
REQUIRED_JS_FILES=(
    "dist/popup.js"
    "dist/background.js"
    "dist/content-youtube.js"
)

print_info "\nVerifying JavaScript bundles..."
for js_file in "${REQUIRED_JS_FILES[@]}"; do
    if [ -f "$js_file" ]; then
        size=$(get_file_size "$js_file")
        print_success "$(basename "$js_file") (${size} bytes)"
    else
        print_error "Missing required file: $js_file"
        exit 1
    fi
done

# Copy manifest.json
print_step "Copying manifest..."
if [ -f "manifest.json" ]; then
    cp manifest.json dist/
    print_success "Manifest copied"
else
    print_error "manifest.json not found!"
    exit 1
fi

# Verify manifest integrity
print_step "Verifying manifest references..."
if ! grep -q '"default_popup": "popup.html"' dist/manifest.json; then
    print_warning "manifest.json doesn't reference popup.html as default_popup"
fi

# Verify all files referenced in manifest exist
print_step "Verifying manifest file references..."
MANIFEST_MISSING=0

# Check background script
if grep -q '"service_worker": "background.js"' dist/manifest.json && [ ! -f "dist/background.js" ]; then
    print_error "background.js referenced in manifest but not found"
    MANIFEST_MISSING=1
fi

# Check content scripts
if grep -q '"js": \["content-youtube.js"\]' dist/manifest.json && [ ! -f "dist/content-youtube.js" ]; then
    print_error "content-youtube.js referenced in manifest but not found"
    MANIFEST_MISSING=1
fi

if [ $MANIFEST_MISSING -eq 0 ]; then
    print_success "All manifest references verified"
fi

# Create icons directory
mkdir -p dist/icons

# Copy extension icon
print_info "\nCopying extension icon..."
if [ -f "icons/ssf.png" ]; then
    cp -f icons/ssf.png dist/icons/ssf.png
    if [ -f "dist/icons/ssf.png" ]; then
        icon_size=$(get_file_size "dist/icons/ssf.png")
        print_success "Icon copied (${icon_size} bytes)"
    else
        print_error "Failed to copy icon!"
        exit 1
    fi
else
    print_error "icons/ssf.png not found!"
    print_info "Please ensure the icon file exists at: $(pwd)/icons/ssf.png"
    exit 1
fi

# Verify HTML files (copied by npm build)
print_info "\nVerifying HTML files..."

# Popup HTML
if [ -f "dist/popup.html" ]; then
    print_success "Popup HTML verified"
else
    print_error "No popup.html found! Extension will not work properly."
    exit 1
fi

# Onboarding files (required for Chrome extension)
print_step "Copying onboarding files..."
ONBOARDING_ERROR=0

if [ -f "src/onboarding/onboarding.html" ]; then
    cp src/onboarding/onboarding.html dist/onboarding.html
    print_success "Onboarding HTML copied"
else
    print_error "Onboarding HTML not found at src/onboarding/onboarding.html"
    ONBOARDING_ERROR=1
fi

if [ -f "src/onboarding/onboarding.js" ]; then
    cp src/onboarding/onboarding.js dist/onboarding.js
    print_success "Onboarding JS copied"
else
    print_error "Onboarding JS not found at src/onboarding/onboarding.js"
    ONBOARDING_ERROR=1
fi

# Check if onboarding is referenced in the extension
if grep -q "onboarding.html" dist/*.js 2>/dev/null; then
    if [ $ONBOARDING_ERROR -eq 1 ]; then
        print_error "Extension references onboarding files but they are missing!"
        print_info "Please ensure onboarding files exist in src/onboarding/"
        exit 1
    fi
else
    print_info "Onboarding files not referenced in extension"
fi

# Legal documents removed - not needed for extension functionality

# Copy additional static assets
print_step "Copying additional assets..."

# Copy any CSS files that might be needed
if [ -d "src/styles" ]; then
    mkdir -p dist/styles
    cp -r src/styles/*.css dist/styles/ 2>/dev/null || true
fi

# Ensure stripe.config.js is present (if built separately)
if [ ! -f "dist/stripe.config.js" ] && [ -f "src/config/stripe.config.js" ]; then
    print_warning "stripe.config.js not found in dist, copying from src"
    cp src/config/stripe.config.js dist/
fi

# Create ZIP for distribution if in production mode
if [ "$PRODUCTION" = true ]; then
    print_step "Creating distribution ZIP..."
    cd dist
    zip -r ../smartstream-filter-extension.zip * -x "*.map" -x ".DS_Store"
    cd ..
    print_success "Distribution ZIP created: smartstream-filter-extension.zip"
fi

# Final verification
print_info "\n${GREEN}Build complete!${NC}"
print_info "Extension ready in: $(pwd)/dist"
print_info "\nBuild artifacts:"
ls -la dist/*.js dist/*.html dist/manifest.json dist/icons/ssf.png 2>/dev/null

# Generate build report
print_info "\nBuild Summary:"
print_success "✓ JavaScript bundles: ${#REQUIRED_JS_FILES[@]} files"
print_success "✓ Manifest: verified"
print_success "✓ Extension icon: verified"
print_success "✓ Popup HTML: verified"

# Check for critical configurations
if [ -f "dist/stripe.config.js" ]; then
    print_success "✓ Stripe configuration: present"
else
    print_warning "⚠ Stripe configuration not found (may be bundled)"
fi

# Check for source maps in development
if [ "$NODE_ENV" == "development" ]; then
    if ls dist/*.js.map >/dev/null 2>&1; then
        print_success "✓ Source maps: generated"
    else
        print_warning "Source maps not found (development mode)"
    fi
fi

# Verify API configuration
if grep -q "$VITE_API_URL" dist/*.js 2>/dev/null; then
    print_success "✓ API URL configured: $VITE_API_URL"
else
    print_warning "API URL not found in build output"
fi

print_info "\nTo install the extension:"
print_info "1. Open Chrome and navigate to chrome://extensions/"
print_info "2. Enable 'Developer mode'"
print_info "3. Click 'Load unpacked' and select: $(pwd)/dist"

if [ "$PRODUCTION" = true ]; then
    print_info "\nFor distribution:"
    print_info "- ZIP file created: smartstream-filter-extension.zip"
    print_info "- Upload this file to Chrome Web Store"
fi