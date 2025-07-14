/**
 * Quick Backend Setup for Testing Stripe Integration
 * 
 * This is a minimal Express server to test the Stripe integration
 * Run with: node quick-backend-setup.js
 */

const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');

// Initialize Stripe with your secret key
// IMPORTANT: Replace with your actual secret key from Stripe Dashboard
const stripe = new Stripe('sk_test_YOUR_SECRET_KEY_HERE');

const app = express();
app.use(cors());
app.use(express.json());

// Create checkout session endpoint
app.post('/api/v1/stripe/checkout-session', async (req, res) => {
  try {
    const { priceId, mode, successUrl, cancelUrl, customerEmail, metadata } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: mode || 'subscription',
      success_url: successUrl || 'https://youtube.com?smartstream_success=true',
      cancel_url: cancelUrl || 'https://youtube.com',
      customer_email: customerEmail,
      metadata: metadata || {},
      allow_promotion_codes: true,
    });

    res.json({
      sessionId: session.id,
      url: session.url,
      amount: session.amount_total,
      currency: session.currency,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify session endpoint
app.get('/api/v1/stripe/verify-session/:sessionId', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    
    res.json({
      paid: session.payment_status === 'paid',
      customerId: session.customer,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// License validation endpoint (mock)
app.post('/api/v1/license/validate', async (req, res) => {
  // This is a mock endpoint - in production, check your database
  res.json({
    valid: true,
    license: {
      id: 'license-123',
      userId: 'user-123',
      plan: 'pro',
      status: 'active',
      features: ['advanced_filters', 'keyword_filters', 'channel_filters'],
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      deviceLimit: 5,
      activatedDevices: []
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('\nMake sure to:');
  console.log('1. Install dependencies: npm install express cors stripe');
  console.log('2. Replace sk_test_YOUR_SECRET_KEY_HERE with your actual Stripe secret key');
  console.log('3. Update extension config to use http://localhost:3000 as API URL');
});

/**
 * To test with this backend:
 * 
 * 1. Install dependencies:
 *    npm install express cors stripe
 * 
 * 2. Get your Stripe secret key from:
 *    https://dashboard.stripe.com/test/apikeys
 * 
 * 3. Update the secret key in this file
 * 
 * 4. Run the server:
 *    node quick-backend-setup.js
 * 
 * 5. Update your extension's .env file:
 *    VITE_API_URL=http://localhost:3000
 * 
 * 6. Rebuild the extension:
 *    npm run build
 * 
 * 7. Reload the extension in Chrome
 * 
 * 8. To exit demo mode, change the auth token in Chrome DevTools:
 *    chrome.storage.local.set({authToken: 'real-token-123'})
 */