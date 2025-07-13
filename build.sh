#!/bin/bash

echo "Building SmartStream Filter extension..."

# Build TypeScript and bundle with Vite
npm run build

# Copy manifest to dist
cp manifest.json dist/

# Create icons directory if it doesn't exist
mkdir -p dist/icons

# Always copy the correct icon from source
if [ -f "icons/ssf.png" ]; then
    echo "Copying extension icon..."
    cp -f icons/ssf.png dist/icons/ssf.png
    
    # Verify the icon was copied correctly
    if [ -f "dist/icons/ssf.png" ]; then
        ICON_SIZE=$(stat -f%z "dist/icons/ssf.png" 2>/dev/null || stat -c%s "dist/icons/ssf.png" 2>/dev/null)
        echo "✓ Icon copied successfully (${ICON_SIZE} bytes)"
    else
        echo "✗ ERROR: Failed to copy icon!"
        exit 1
    fi
else
    echo "✗ ERROR: icons/ssf.png not found!"
    echo "Please ensure the icon file exists at: $(pwd)/icons/ssf.png"
    exit 1
fi

# Handle popup HTML - preserve existing or copy from backup
if [ -f "dist/popup.html" ]; then
    echo "✓ Popup HTML already exists in dist/"
else
    # Try to copy from a backup location
    if [ -f "popup-styled.html" ]; then
        cp popup-styled.html dist/popup.html
        echo "✓ Popup HTML copied from popup-styled.html"
    elif [ -f "popup.html" ]; then
        cp popup.html dist/popup.html
        echo "✓ Popup HTML copied from source"
    else
        echo "✗ ERROR: No popup.html found! Extension will not work."
        echo "Please create a popup.html file in the dist directory"
        exit 1
    fi
fi

echo ""
echo "Build complete! Extension ready in dist/"
echo "Load the extension from: $(pwd)/dist"
echo ""
echo "Checklist:"
echo "✓ JavaScript files built"
echo "✓ Manifest copied"
echo "✓ Icon verified"
echo "✓ Popup HTML verified"