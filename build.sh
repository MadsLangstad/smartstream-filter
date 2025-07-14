#!/bin/bash

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_error() { echo -e "${RED}✗ ERROR: $1${NC}"; }
print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ WARNING: $1${NC}"; }
print_info() { echo -e "$1"; }

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

print_info "Building SmartStream Filter extension..."

# Clean previous build artifacts (optional)
if [ "$1" == "--clean" ]; then
    print_info "Cleaning previous build..."
    rm -rf dist
fi

# Run npm build and check if it succeeded
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
print_info "\nCopying manifest..."
if [ -f "manifest.json" ]; then
    cp manifest.json dist/
    print_success "Manifest copied"
else
    print_error "manifest.json not found!"
    exit 1
fi

# Verify manifest integrity
print_info "\nVerifying manifest references..."
if ! grep -q '"default_popup": "popup.html"' dist/manifest.json; then
    print_warning "manifest.json doesn't reference popup.html as default_popup"
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

# Onboarding files (optional)
if [ -f "src/onboarding/onboarding.html" ]; then
    cp src/onboarding/onboarding.html dist/onboarding.html
    print_success "Onboarding HTML copied"
fi

if [ -f "src/onboarding/onboarding.js" ]; then
    cp src/onboarding/onboarding.js dist/onboarding.js
    print_success "Onboarding JS copied"
fi

# Legal documents removed - not needed for extension functionality

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

# Check for source maps in development
if [ "$NODE_ENV" == "development" ]; then
    if ls dist/*.js.map >/dev/null 2>&1; then
        print_success "✓ Source maps: generated"
    else
        print_warning "Source maps not found (development mode)"
    fi
fi

print_info "\nTo install the extension:"
print_info "1. Open Chrome and navigate to chrome://extensions/"
print_info "2. Enable 'Developer mode'"
print_info "3. Click 'Load unpacked' and select: $(pwd)/dist"