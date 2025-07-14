# Testing Premium Trial Activation

## Keyboard Shortcut Method

1. **Reload the extension** in Chrome:
   - Go to `chrome://extensions/`
   - Find SmartStream Filter
   - Click the refresh icon

2. **Navigate to YouTube**:
   - Go to https://youtube.com
   - Wait for the SmartStream controls to appear in the header

3. **Activate Premium Trial**:
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
   - You should see an alert: "Premium trial activated for 30 days!"
   - The page will automatically reload

4. **Verify Premium Features**:
   - After reload, look for the ⭐ icon next to the SmartStream controls
   - Click the "⚙️ Advanced" button - it should now show the advanced filters UI instead of the paywall

## Console Method (Alternative)

If you prefer using the console:

1. Open Developer Tools (F12)
2. Go to the Console tab
3. Run this code:
```javascript
// First, make SimplePaywall available globally
window.SimplePaywall = (() => {
  class SimplePaywall {
    static instance;
    
    static getInstance() {
      if (!SimplePaywall.instance) {
        SimplePaywall.instance = new SimplePaywall();
      }
      return SimplePaywall.instance;
    }
    
    async activatePremiumTrial(days = 30) {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + days);
      
      await chrome.storage.sync.set({
        userPlan: {
          type: 'premium',
          validUntil: validUntil.toISOString(),
          features: ['advanced_filters', 'custom_presets', 'analytics']
        }
      });
      
      alert(`Premium trial activated for ${days} days!`);
      window.location.reload();
    }
  }
  return SimplePaywall;
})();

// Then activate the trial
const paywall = window.SimplePaywall.getInstance();
await paywall.activatePremiumTrial(30);
```

## Deactivate Premium (Reset)

To deactivate premium and test the paywall again:

```javascript
await chrome.storage.sync.remove(['userPlan']);
window.location.reload();
```