import type { FilterSettings, MessageType } from '../types';
import { PaymentService } from '../features/premium/payment-service';

const DEFAULT_SETTINGS: FilterSettings = {
  minDuration: 5,
  maxDuration: 30,
  enabled: true
};

const paymentService = new PaymentService();

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
  
  // Check subscription status on install/update
  paymentService.checkSubscriptionStatus();
});

// Check subscription status daily
chrome.alarms.create('checkSubscription', { periodInMinutes: 60 * 24 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkSubscription') {
    paymentService.checkSubscriptionStatus();
  }
});

chrome.runtime.onMessage.addListener((message: MessageType, _sender, sendResponse) => {
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
          chrome.tabs.query({ url: ['*://www.youtube.com/*', '*://youtube.com/*'] }, (tabs) => {
            tabs.forEach(tab => {
              if (tab.id) {
                chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED', settings: newSettings });
              }
            });
          });
          sendResponse(newSettings);
        });
      });
      return true;

    case 'CHECK_PREMIUM':
      paymentService.checkSubscriptionStatus().then((isPremium) => {
        sendResponse({ isPremium });
      });
      return true;

    case 'OPEN_CHECKOUT':
      paymentService.createCheckout(message.email).then((url) => {
        chrome.tabs.create({ url });
        sendResponse({ success: true });
      }).catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
      return true;

    case 'PREMIUM_ACTIVATED':
      // Notify all tabs about premium activation
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'PREMIUM_STATUS_CHANGED', isPremium: true });
          }
        });
      });
      break;

    case 'PREMIUM_DEACTIVATED':
      // Notify all tabs about premium deactivation
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'PREMIUM_STATUS_CHANGED', isPremium: false });
          }
        });
      });
      break;
  }
});

// Handle web navigation to detect successful payment
chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.url.includes('smartstreamfilter.com/success')) {
    // Extract session ID from URL
    const url = new URL(details.url);
    const sessionId = url.searchParams.get('session_id');
    
    if (sessionId) {
      await paymentService.handlePaymentSuccess(sessionId);
      
      // Close the success tab and show thank you
      chrome.tabs.remove(details.tabId);
      
      // Create a notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/ssf.png',
        title: 'Welcome to SmartStream Premium!',
        message: 'Your premium features are now active. Enjoy!'
      });
    }
  }
}, {
  url: [{ hostContains: 'smartstreamfilter.com' }]
});

export {};