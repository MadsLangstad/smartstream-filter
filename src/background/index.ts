import type { FilterSettings, MessageType } from '../types';

const DEFAULT_SETTINGS: FilterSettings = {
  minDuration: 5,
  maxDuration: 30,
  enabled: true
};

// PaywallManager is available but not used in background script currently
// const paywallManager = PaywallManager.getInstance();

/// <reference types="chrome"/>

chrome.runtime.onInstalled.addListener((details) => {
  chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  
  // Show onboarding on fresh install
  if (details.reason === 'install') {
    chrome.storage.local.get(['onboardingComplete'], (result) => {
      if (!result.onboardingComplete) {
        chrome.tabs.create({
          url: chrome.runtime.getURL('onboarding.html')
        });
      }
    });
  }
  
  // DEMO: Set up demo premium user
  chrome.storage.local.get(['authToken'], (result) => {
    if (!result.authToken) {
      // Set demo premium data
      chrome.storage.local.set({
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
      }, () => {
        console.log('Demo premium user initialized');
      });
    }
  });
});

// Listen for tab updates to detect Stripe payment success
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if this is a payment success redirect
    if (tab.url.includes('smartstream_success=true')) {
      console.log('Payment success detected in background:', tab.url);
      
      // Parse URL parameters
      const url = new URL(tab.url);
      const sessionId = url.searchParams.get('session_id');
      const plan = url.searchParams.get('plan');
      
      if (sessionId) {
        // Import and verify payment
        const { StripeService } = await import('../services/stripe/stripe-service');
        const stripeService = StripeService.getInstance();
        
        // Verify the payment
        const result = await stripeService.verifyPaymentSuccess(sessionId);
        
        if (result.success && result.data?.success) {
          console.log('Payment verified successfully:', result.data);
          
          // If we got auth token but no license key yet, webhook might still be processing
          if (result.data?.authToken && !result.data?.licenseKey) {
            console.log('Auth token received, but license key pending. Webhook might still be processing.');
            
            // Store what we have
            await chrome.storage.local.set({
              authToken: result.data.authToken,
              userEmail: result.data.email || ''
            });
            
            // Show message that payment is being processed
            chrome.tabs.sendMessage(tabId, {
              type: 'PAYMENT_PROCESSING',
              message: 'Payment received! Your license is being activated...'
            }, () => {
              if (chrome.runtime.lastError) {
                console.debug('Content script not ready:', chrome.runtime.lastError.message);
              }
            });
            
            // Set up a retry to check for license
            let retries = 0;
            const maxRetries = 10;
            const checkInterval = setInterval(async () => {
              retries++;
              
              const { PaywallManager } = await import('../services/paywall/paywall-manager');
              const paywallManager = PaywallManager.getInstance();
              
              // Force validation which will try to fetch license
              const isValid = await paywallManager.validateLicense();
              
              if (isValid || retries >= maxRetries) {
                clearInterval(checkInterval);
                
                if (isValid) {
                  console.log('License activated successfully!');
                  
                  // Send success message
                  chrome.tabs.sendMessage(tabId, {
                    type: 'PAYMENT_SUCCESS',
                    plan: plan,
                    licenseKey: 'activated'
                  }, () => {
                    if (chrome.runtime.lastError) {
                      console.debug('Content script not ready:', chrome.runtime.lastError.message);
                    }
                  });
                } else {
                  console.error('License activation timed out');
                }
                
                // Clean the URL
                if (tab.url) {
                  const cleanUrl = new URL(tab.url);
                  cleanUrl.searchParams.delete('smartstream_success');
                  cleanUrl.searchParams.delete('plan');
                  cleanUrl.searchParams.delete('session_id');
                  
                  chrome.tabs.update(tabId, { url: cleanUrl.toString() });
                }
              }
            }, 3000); // Check every 3 seconds
            
            return; // Exit early, we'll handle success in the interval
          }
          
          // Update license in PaywallManager
          const { PaywallManager } = await import('../services/paywall/paywall-manager');
          const paywallManager = PaywallManager.getInstance();
          
          // Set the license and auth info
          if (result.data?.licenseKey && result.data?.authToken) {
            await paywallManager.setLicenseInfo({
              licenseKey: result.data.licenseKey,
              authToken: result.data.authToken,
              email: result.data.email || ''
            });
            
            // Force license refresh
            await paywallManager.validateLicense();
            
            console.log('License updated successfully');
            
            // Send message to content script to refresh UI
            chrome.tabs.sendMessage(tabId, {
              type: 'PAYMENT_SUCCESS',
              plan: plan,
              licenseKey: result.data.licenseKey
            }, () => {
              if (chrome.runtime.lastError) {
                console.debug('Content script not ready:', chrome.runtime.lastError.message);
              }
            });
            
            // Clean the URL
            const cleanUrl = new URL(tab.url);
            cleanUrl.searchParams.delete('smartstream_success');
            cleanUrl.searchParams.delete('plan');
            cleanUrl.searchParams.delete('session_id');
            
            chrome.tabs.update(tabId, { url: cleanUrl.toString() });
          }
        } else {
          console.error('Payment verification failed:', result);
        }
      }
    }
  }
});

chrome.runtime.onMessage.addListener((message: MessageType, _sender, sendResponse): boolean | void => {
  switch (message.type) {
    case 'GET_SETTINGS':
      chrome.storage.local.get(['settings'], (result: { settings?: FilterSettings }) => {
        sendResponse(result.settings || DEFAULT_SETTINGS);
      });
      return true;

    case 'UPDATE_SETTINGS':
      chrome.storage.local.get(['settings'], (result: { settings?: FilterSettings }) => {
        const newSettings = { ...result.settings || DEFAULT_SETTINGS, ...message.settings };
        chrome.storage.local.set({ settings: newSettings }, () => {
          // Try to notify YouTube tabs, but don't worry if they can't receive
          chrome.tabs.query({ url: ['*://www.youtube.com/*', '*://youtube.com/*'] }, (tabs) => {
            tabs.forEach(tab => {
              if (tab.id) {
                chrome.tabs.sendMessage(
                  tab.id, 
                  { type: 'SETTINGS_UPDATED', settings: newSettings },
                  () => {
                    // Ignore errors - tab might not have content script loaded
                    if (chrome.runtime.lastError) {
                      // Expected when tab doesn't have our content script
                      console.debug('Tab not ready:', chrome.runtime.lastError.message);
                    }
                  }
                );
              }
            });
          });
          sendResponse(newSettings);
        });
      });
      return true;
      
    case 'SHOW_PAYWALL':
      // For now, just inject a script to show the paywall
      // In content scripts, we can't use dynamic imports, so we'll handle it differently
      if (_sender.tab?.id) {
        chrome.tabs.sendMessage(_sender.tab.id, {
          type: 'DISPLAY_PAYWALL',
          feature: message.feature
        });
      }
      sendResponse({ success: true });
      return true;
      
    case 'UPDATE_PREMIUM_FILTERS':
      // Broadcast premium filter updates to all YouTube tabs
      chrome.tabs.query({ url: ['*://www.youtube.com/*', '*://youtube.com/*'] }, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id) {
            chrome.tabs.sendMessage(
              tab.id, 
              { type: 'UPDATE_PREMIUM_FILTERS', filters: message.filters },
              () => {
                // Ignore errors
                if (chrome.runtime.lastError) {
                  console.debug('Tab not ready:', chrome.runtime.lastError.message);
                }
              }
            );
          }
        });
      });
      sendResponse({ success: true });
      return true;
  }
});
