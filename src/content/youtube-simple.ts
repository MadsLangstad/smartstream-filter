console.log('[SmartStream] Content script loaded');

// Wait for YouTube to fully load
function waitForYouTube() {
  console.log('[SmartStream] Waiting for YouTube...');
  
  const checkInterval = setInterval(() => {
    const header = document.querySelector('ytd-masthead, #masthead-container');
    const pageManager = document.querySelector('ytd-app, #page-manager');
    
    if (header && pageManager) {
      console.log('[SmartStream] YouTube is ready!');
      clearInterval(checkInterval);
      initializeExtension();
    }
  }, 1000);
}

function initializeExtension() {
  console.log('[SmartStream] Initializing extension');
  
  // Add a simple test element
  const testDiv = document.createElement('div');
  testDiv.style.position = 'fixed';
  testDiv.style.top = '100px';
  testDiv.style.right = '20px';
  testDiv.style.padding = '10px';
  testDiv.style.background = 'red';
  testDiv.style.color = 'white';
  testDiv.style.zIndex = '9999';
  testDiv.textContent = 'SmartStream Active';
  document.body.appendChild(testDiv);
  
  console.log('[SmartStream] Test element added');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', waitForYouTube);
} else {
  waitForYouTube();
}