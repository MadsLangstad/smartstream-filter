import type { FilterSettings, MessageType } from '../types';

const DEFAULT_SETTINGS: FilterSettings = {
  minDuration: 5,
  maxDuration: 30,
  enabled: true
};

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