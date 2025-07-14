# Console Commands for SmartStream Filter

## Activate Premium Trial

Copy and paste this entire block into the Chrome DevTools console while on YouTube:

```javascript
// Activate 30-day premium trial
(async () => {
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);
  
  await chrome.storage.sync.set({
    userPlan: {
      type: 'premium',
      validUntil: validUntil.toISOString(),
      features: ['advanced_filters', 'custom_presets', 'analytics']
    }
  });
  
  alert('Premium trial activated for 30 days!');
  window.location.reload();
})();
```

## Check Premium Status

```javascript
// Check current premium status
(async () => {
  const result = await chrome.storage.sync.get(['userPlan']);
  console.log('Current plan:', result.userPlan);
  
  if (result.userPlan && result.userPlan.type === 'premium') {
    const validUntil = new Date(result.userPlan.validUntil);
    const daysLeft = Math.ceil((validUntil - new Date()) / (1000 * 60 * 60 * 24));
    console.log(`Premium active - ${daysLeft} days remaining`);
  } else {
    console.log('Free plan active');
  }
})();
```

## Deactivate Premium (Reset to Free)

```javascript
// Reset to free plan
(async () => {
  await chrome.storage.sync.remove(['userPlan']);
  alert('Reset to free plan');
  window.location.reload();
})();
```

## View Current Stats

```javascript
// Get current filtering stats
(async () => {
  const stats = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
  console.log('Current stats:', stats);
})();
```

## Alternative: Use Keyboard Shortcut

Instead of using console commands, you can simply press:
- **Windows/Linux**: `Ctrl + Shift + P`
- **Mac**: `Cmd + Shift + P`

This will activate a 30-day premium trial automatically.