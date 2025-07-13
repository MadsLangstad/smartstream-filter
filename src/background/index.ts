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
  }
});

export {};