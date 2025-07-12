#!/bin/bash

# Build the extension
npm run build

# Copy manifest
cp manifest.json dist/

# Rename the built popup HTML file
mv dist/popup.html dist/popup-built.html 2>/dev/null || true

# Create a simpler popup.html that references the built CSS
cat > dist/popup.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SmartStream Filter</title>
    <link rel="stylesheet" href="popup.css">
  </head>
  <body class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white w-[340px] h-[420px] overflow-hidden">
    <div class="flex flex-col h-full">
      <!-- Header -->
      <div class="bg-gradient-to-r from-red-600 to-red-700 text-white p-5">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
              </svg>
            </div>
            <div>
              <h1 class="text-lg font-semibold">SmartStream Filter</h1>
              <p class="text-xs text-white/80">YouTube Enhancement Tool</p>
            </div>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="filter-enabled" class="sr-only peer" checked>
            <div class="w-11 h-6 bg-white/30 backdrop-blur peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white/20"></div>
          </label>
        </div>
      </div>
      
      <!-- Main Content -->
      <div class="flex-1 p-5 space-y-6">
        <!-- Duration Filter Section -->
        <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-4">
          <div class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Duration Filter
          </div>
          
          <div class="space-y-4">
            <div>
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm text-gray-600 dark:text-gray-400">Minimum Duration</span>
                <span id="min-value" class="text-sm font-medium px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">5m</span>
              </div>
              <input type="range" id="min-duration" min="0" max="240" value="5" 
                     class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider">
            </div>
            
            <div>
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm text-gray-600 dark:text-gray-400">Maximum Duration</span>
                <span id="max-value" class="text-sm font-medium px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">30m</span>
              </div>
              <input type="range" id="max-duration" min="0" max="240" value="30" 
                     class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider">
            </div>
          </div>
        </div>
        
        <!-- Stats Section -->
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">--</div>
            <div class="text-xs text-gray-600 dark:text-gray-400">Videos Filtered</div>
          </div>
          <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <div class="text-2xl font-bold text-green-600 dark:text-green-400">--</div>
            <div class="text-xs text-gray-600 dark:text-gray-400">Time Saved</div>
          </div>
        </div>
        
        <!-- Premium Teaser -->
        <div class="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
              </svg>
              <span class="text-sm font-medium text-purple-700 dark:text-purple-300">Premium Features</span>
            </div>
            <span class="text-xs text-purple-600 dark:text-purple-400 font-medium">Coming Soon</span>
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="px-5 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>v1.0.0</span>
          <span>Real-time sync enabled</span>
        </div>
      </div>
    </div>
    <script type="module" src="popup.js"></script>
  </body>
</html>
EOF

echo "Build complete! Extension ready in dist/"