#!/bin/bash

# Build TypeScript and bundle with Vite
npm run build

# Copy static files to dist
cp manifest.json dist/
cp popup.html dist/

# Create temporary icons if they don't exist
if [ ! -f "dist/icons/icon-16.png" ]; then
  mkdir -p dist/icons
  # Create placeholder icons
  echo "Creating placeholder icons..."
  for size in 16 48 128; do
    convert -size ${size}x${size} xc:#1f2937 -font Arial -pointsize $((size*6/10)) -fill white -gravity center -annotate +0+0 "🎚️" dist/icons/icon-${size}.png 2>/dev/null || \
    echo "Note: Install ImageMagick to generate icons automatically"
  done
fi

echo "Build complete! Load the 'dist' folder as an unpacked extension."