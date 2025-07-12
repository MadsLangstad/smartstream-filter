import { FilterSettings, MessageType, StorageData } from '../types';

const DEFAULT_SETTINGS: FilterSettings = {
  minDuration: 5,
  maxDuration: 30,
  enabled: true
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
});

chrome.runtime.onMessage.addListener((message: MessageType, sender, sendResponse) => {
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