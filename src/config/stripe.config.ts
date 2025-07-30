/**
 * Stripe Configuration for SmartStream Filter
 * 
 * IMPORTANT: Replace these values with your actual Stripe keys and price IDs
 */

export const STRIPE_CONFIG = {
  // Stripe Publishable Key
  // Test key: starts with pk_test_
  // Live key: starts with pk_live_
  publishableKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_51234567890abcdefghijklmnopqrstuvwxyz',
  
  // API Base URL for your backend
  apiBaseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1',
  
  // Stripe Price IDs for your products
  // Create these in your Stripe Dashboard under Products
  priceIds: {
    // Use test price IDs for development
    // You need to create these in your Stripe Dashboard
    basic_monthly: import.meta.env.VITE_STRIPE_PRICE_ID_BASIC || 'price_test_basic',
    basic_yearly: import.meta.env.VITE_STRIPE_PRICE_ID_BASIC_YEARLY || 'price_test_basic_yearly',
    pro_monthly: import.meta.env.VITE_STRIPE_PRICE_ID_PRO || 'price_test_pro',
    pro_yearly: import.meta.env.VITE_STRIPE_PRICE_ID_PRO_YEARLY || 'price_test_pro_yearly',
    lifetime: import.meta.env.VITE_STRIPE_PRICE_ID_LIFETIME || 'price_test_lifetime'
  },
  
  // Webhook endpoint secret for validating Stripe webhooks
  webhookSecret: import.meta.env.VITE_STRIPE_WEBHOOK_SECRET || 'whsec_1234567890abcdefghijklmnopqrstuvwxyz',
  
  // Plan features and limits
  plans: {
    free: {
      name: 'Free',
      features: [],
      limits: {
        devices: 1,
        customPresets: 0
      }
    },
    basic: {
      name: 'Basic',
      features: ['advanced_filters', 'custom_presets', 'export_history', 'priority_support'],
      limits: {
        devices: 3,
        customPresets: 5
      }
    },
    pro: {
      name: 'Pro',
      features: [
        'advanced_filters',
        'custom_presets',
        'export_history',
        'priority_support',
        'keyword_filters',
        'channel_filters',
        'analytics',
        'api_access',
        'multi_device_sync'
      ],
      limits: {
        devices: 5,
        customPresets: -1 // Unlimited
      }
    },
    lifetime: {
      name: 'Lifetime',
      features: [
        'advanced_filters',
        'custom_presets',
        'export_history',
        'priority_support',
        'keyword_filters',
        'channel_filters',
        'analytics',
        'api_access',
        'multi_device_sync',
        'early_access',
        'source_code'
      ],
      limits: {
        devices: 10,
        customPresets: -1 // Unlimited
      }
    }
  }
};

/**
 * Stripe Setup Instructions:
 * 
 * 1. Create a Stripe account at https://stripe.com
 * 
 * 2. Get your API keys from the Stripe Dashboard:
 *    - Test keys: https://dashboard.stripe.com/test/apikeys
 *    - Live keys: https://dashboard.stripe.com/apikeys
 * 
 * 3. Create your products and prices:
 *    a. Go to https://dashboard.stripe.com/products
 *    b. Create products for each plan (Basic, Pro, Lifetime)
 *    c. Add prices for monthly/yearly subscriptions
 *    d. Copy the price IDs and update this config
 * 
 * 4. Set up webhooks:
 *    a. Go to https://dashboard.stripe.com/webhooks
 *    b. Add endpoint: https://api.smartstreamfilter.com/stripe/webhook
 *    c. Select events: checkout.session.completed, customer.subscription.*
 *    d. Copy the webhook secret and update this config
 * 
 * 5. Environment variables (for production):
 *    - STRIPE_PUBLISHABLE_KEY
 *    - STRIPE_SECRET_KEY (backend only)
 *    - STRIPE_WEBHOOK_SECRET
 *    - STRIPE_PRICE_BASIC_MONTHLY
 *    - STRIPE_PRICE_BASIC_YEARLY
 *    - STRIPE_PRICE_PRO_MONTHLY
 *    - STRIPE_PRICE_PRO_YEARLY
 *    - STRIPE_PRICE_LIFETIME
 */