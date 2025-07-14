// Dev Helper for SmartStream Filter
// Quick utilities for development testing

function showStatus(message, type = 'info') {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = 'status ' + type;
    status.style.display = 'block';
    
    if (type === 'success') {
        setTimeout(() => {
            status.textContent += '\n\n✅ Reload YouTube to see changes!';
        }, 500);
    }
}

async function setTestAuth() {
    try {
        await chrome.storage.local.set({
            authToken: 'test-token-' + Date.now(),
            licenseKey: null,
            userEmail: 'test@example.com'
        });
        showStatus('Test auth token set! This will bypass demo mode.', 'success');
    } catch (error) {
        showStatus('Error: ' + error.message, 'error');
    }
}

async function setPremiumUser() {
    const licenseKey = 'test-license-' + Date.now();
    const authToken = 'premium-token-' + Date.now(); // Not starting with "demo-token"
    try {
        await chrome.storage.local.set({
            authToken: authToken,
            licenseKey: licenseKey,
            userEmail: 'premium@example.com',
            license: {
                licenseKey: licenseKey,
                email: 'premium@example.com',
                productId: 'price_1RkpDm2cQP8jviMw0QFfs7SJ', // Real Pro price ID
                plan: 'pro',
                status: 'active',
                features: ['advanced_filters', 'keyword_filters', 'channel_filters', 'analytics', 'custom_presets'],
                devices: 1
            },
            user: {
                id: licenseKey,
                email: 'premium@example.com',
                name: 'Premium User'
            }
        });
        showStatus('Premium Pro user set! You now have access to all Pro features.', 'success');
    } catch (error) {
        showStatus('Error: ' + error.message, 'error');
    }
}

async function setLifetimeUser() {
    const licenseKey = 'lifetime-license-' + Date.now();
    try {
        await chrome.storage.local.set({
            authToken: 'lifetime-token-' + Date.now(),
            licenseKey: licenseKey,
            userEmail: 'lifetime@example.com',
            license: {
                licenseKey: licenseKey,
                email: 'lifetime@example.com',
                productId: 'price_lifetime',
                plan: 'lifetime',
                status: 'active',
                features: ['advanced_filters', 'keyword_filters', 'channel_filters', 'analytics', 'custom_presets', 'source_code', 'early_access'],
                devices: 1
            }
        });
        showStatus('Lifetime user set! You have access to all features.', 'success');
    } catch (error) {
        showStatus('Error: ' + error.message, 'error');
    }
}

async function setCustomAuth() {
    const email = document.getElementById('email').value;
    if (!email) {
        showStatus('Please enter an email address', 'error');
        return;
    }
    
    try {
        await chrome.storage.local.set({
            authToken: 'custom-token-' + Date.now(),
            licenseKey: null,
            userEmail: email
        });
        showStatus(`Custom auth set for ${email}!`, 'success');
    } catch (error) {
        showStatus('Error: ' + error.message, 'error');
    }
}

async function clearAllData() {
    if (confirm('This will clear all extension data. Are you sure?')) {
        try {
            await chrome.storage.local.clear();
            await chrome.storage.sync.clear();
            showStatus('All data cleared! Extension is now in fresh state.', 'success');
        } catch (error) {
            showStatus('Error: ' + error.message, 'error');
        }
    }
}

async function viewStorage() {
    try {
        const localData = await chrome.storage.local.get();
        const syncData = await chrome.storage.sync.get();
        
        const storageView = document.getElementById('storage-view');
        storageView.textContent = JSON.stringify({
            local: localData,
            sync: syncData
        }, null, 2);
        storageView.style.display = 'block';
        
        showStatus('Storage data loaded', 'info');
    } catch (error) {
        showStatus('Error: ' + error.message, 'error');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Attach event listeners
    document.getElementById('btn-test-auth').addEventListener('click', setTestAuth);
    document.getElementById('btn-premium').addEventListener('click', setPremiumUser);
    document.getElementById('btn-lifetime').addEventListener('click', setLifetimeUser);
    document.getElementById('btn-clear').addEventListener('click', clearAllData);
    document.getElementById('btn-custom').addEventListener('click', setCustomAuth);
    document.getElementById('btn-view').addEventListener('click', viewStorage);
    
    // Check if we have access to chrome.storage
    if (typeof chrome === 'undefined' || !chrome.storage) {
        showStatus('⚠️ This page must be opened as an extension page. Open it from chrome-extension://[extension-id]/dev-helper.html', 'error');
    } else {
        showStatus('✅ Dev Helper ready! Choose an action above.', 'info');
    }
});