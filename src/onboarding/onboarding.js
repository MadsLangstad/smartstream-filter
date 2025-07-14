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

  // Privacy/Terms links removed - not needed

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