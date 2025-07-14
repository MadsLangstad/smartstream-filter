/**
 * Script to switch from demo mode to production mode
 * Run this in Chrome DevTools console while on YouTube
 */

// Switch to production mode
async function switchToProduction() {
  // Clear demo token
  await chrome.storage.local.remove(['authToken', 'user', 'license']);
  
  console.log('✅ Demo mode disabled');
  console.log('🔄 Please reload the page');
  console.log('📝 You will need to sign up/login to use premium features');
}

// Switch back to demo mode
async function switchToDemo() {
  await chrome.storage.local.set({
    authToken: 'demo-token-premium',
    user: {
      id: 'demo-user-1',
      email: 'demo@example.com',
      name: 'Demo User'
    },
    license: {
      id: 'demo-license-1',
      userId: 'demo-user-1',
      plan: 'pro',
      status: 'active',
      features: ['advanced_filters', 'keyword_filters', 'channel_filters', 'analytics'],
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      deviceLimit: 5,
      activatedDevices: ['demo-device-1']
    }
  });
  
  console.log('✅ Demo mode enabled');
  console.log('🔄 Please reload the page');
}

// Check current mode
async function checkMode() {
  const data = await chrome.storage.local.get(['authToken']);
  const isDemo = data.authToken?.startsWith('demo-token');
  
  console.log('Current mode:', isDemo ? 'DEMO' : 'PRODUCTION');
  console.log('Auth token:', data.authToken || 'Not set');
  
  if (isDemo) {
    console.log('\nTo switch to production mode, run: switchToProduction()');
  } else {
    console.log('\nTo switch to demo mode, run: switchToDemo()');
  }
}

// Run check on load
checkMode();