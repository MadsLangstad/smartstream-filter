# Stripe Integration Setup Guide

This guide will help you set up Stripe payments for SmartStream Filter.

## Prerequisites

- Stripe account (create one at [stripe.com](https://stripe.com))
- Backend server for handling webhooks and API calls
- SSL certificate (required for production)

## Setup Steps

### 1. Get Your Stripe Keys

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers → API keys**
3. Copy your keys:
   - **Test mode**: `pk_test_...` (publishable) and `sk_test_...` (secret)
   - **Live mode**: `pk_live_...` (publishable) and `sk_live_...` (secret)

### 2. Create Products and Prices

1. Go to **Products** in your Stripe Dashboard
2. Create three products:

#### Basic Plan
- **Name**: SmartStream Filter Basic
- **Description**: Essential video filtering features
- **Pricing**:
  - Monthly: $4.99/month
  - Yearly: $49.99/year (save $10)

#### Pro Plan
- **Name**: SmartStream Filter Pro
- **Description**: Advanced features and unlimited customization
- **Pricing**:
  - Monthly: $9.99/month
  - Yearly: $99.99/year (save $20)

#### Lifetime Plan
- **Name**: SmartStream Filter Lifetime
- **Description**: One-time purchase, lifetime access
- **Pricing**: $199 (one-time)

3. Copy the price IDs (format: `price_...`) for each plan

### 3. Update Configuration

1. Open `/src/config/stripe.config.ts`
2. Replace the placeholder values:

```typescript
export const STRIPE_CONFIG = {
  publishableKey: 'pk_test_YOUR_ACTUAL_KEY_HERE',
  priceIds: {
    basic_monthly: 'price_YOUR_BASIC_MONTHLY_ID',
    basic_yearly: 'price_YOUR_BASIC_YEARLY_ID',
    pro_monthly: 'price_YOUR_PRO_MONTHLY_ID',
    pro_yearly: 'price_YOUR_PRO_YEARLY_ID',
    lifetime: 'price_YOUR_LIFETIME_ID'
  }
};
```

### 4. Set Up Your Backend

1. Implement the API endpoints shown in `/docs/stripe-backend-example.ts`
2. Required endpoints:
   - `POST /api/v1/stripe/checkout-session` - Create checkout sessions
   - `POST /api/v1/stripe/webhook` - Handle Stripe webhooks
   - `GET /api/v1/stripe/verify-session/:sessionId` - Verify payment success
   - `POST /api/v1/stripe/portal-session` - Customer portal for subscription management
   - `POST /api/v1/license/validate` - License validation

### 5. Configure Webhooks

1. In Stripe Dashboard, go to **Developers → Webhooks**
2. Add endpoint: `https://your-api.com/api/v1/stripe/webhook`
3. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook signing secret

### 6. Environment Variables

Set these environment variables in your backend:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Price IDs
STRIPE_PRICE_BASIC_MONTHLY=price_...
STRIPE_PRICE_BASIC_YEARLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_LIFETIME=price_...

# API
API_BASE_URL=https://api.smartstreamfilter.com/v1
```

### 7. Database Schema

Create tables for storing licenses:

```sql
-- Users table
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Licenses table
CREATE TABLE licenses (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  customer_id VARCHAR(255),
  subscription_id VARCHAR(255),
  plan VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  features JSON,
  valid_until TIMESTAMP,
  device_limit INT DEFAULT 1,
  activated_devices JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Auth tokens table
CREATE TABLE auth_tokens (
  token VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Testing

### Test Mode

1. Use test cards: https://stripe.com/docs/testing
2. Common test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - 3D Secure: `4000 0000 0000 3220`

### Test Webhooks Locally

Use Stripe CLI for local webhook testing:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to your account
stripe login

# Forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/v1/stripe/webhook

# Trigger test events
stripe trigger checkout.session.completed
```

## Production Checklist

- [ ] Replace test keys with live keys
- [ ] Update webhook endpoint to production URL
- [ ] Enable HTTPS on all endpoints
- [ ] Set up proper error logging
- [ ] Configure webhook retry handling
- [ ] Set up monitoring for failed payments
- [ ] Create customer support documentation
- [ ] Test the complete flow end-to-end
- [ ] Set up backup payment processing

## Security Best Practices

1. **Never expose secret keys**: Only use publishable keys in frontend code
2. **Verify webhooks**: Always verify webhook signatures
3. **Use HTTPS**: Required for PCI compliance
4. **Validate licenses**: Always validate on the server side
5. **Rate limiting**: Implement rate limiting on API endpoints
6. **Audit logging**: Log all payment-related events

## Support

- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com
- API Reference: https://stripe.com/docs/api