// Handle button clicks for onboarding page
document.addEventListener('DOMContentLoaded', () => {
  // Try it on YouTube button
  const tryButton = document.querySelector('.button');
  if (tryButton) {
    tryButton.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.storage.local.set({onboardingComplete: true}, () => {
        chrome.tabs.create({url: 'https://youtube.com'});
        window.close();
      });
    });
  }

  // Privacy Policy link
  const privacyLink = document.querySelector('a[href*="privacy"]');
  if (privacyLink) {
    privacyLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({url: chrome.runtime.getURL('PRIVACY_POLICY.md')});
    });
  }

  // Terms of Use link
  const termsLink = document.querySelector('a[href*="terms"]');
  if (termsLink) {
    termsLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({url: chrome.runtime.getURL('TERMS_OF_USE.md')});
    });
  }

  // Skip Tutorial link
  const skipLink = document.querySelector('a[href*="skip"]');
  if (skipLink) {
    skipLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.storage.local.set({onboardingComplete: true}, () => {
        window.close();
      });
    });
  }
});