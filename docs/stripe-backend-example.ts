/**
 * Example Stripe Backend Implementation for SmartStream Filter
 * 
 * This is an example of how to implement the backend API endpoints
 * required for Stripe integration. Use your preferred backend framework.
 */

import Stripe from 'stripe';
import { Request, Response } from 'express';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Webhook secret from Stripe Dashboard
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/**
 * Create Checkout Session
 * POST /api/v1/stripe/checkout-session
 */
export async function createCheckoutSession(req: Request, res: Response) {
  try {
    const { priceId, mode, successUrl, cancelUrl, customerEmail, metadata, clientReferenceId } = req.body;

    // Get or create customer
    let customer: Stripe.Customer | undefined;
    if (customerEmail) {
      const customers = await stripe.customers.list({
        email: customerEmail,
        limit: 1,
      });
      
      if (customers.data.length > 0) {
        customer = customers.data[0];
      } else {
        customer = await stripe.customers.create({
          email: customerEmail,
          metadata: {
            extensionId: metadata.extensionId,
          },
        });
      }
    }

    // Create session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: mode || 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer: customer?.id,
      customer_email: !customer ? customerEmail : undefined,
      client_reference_id: clientReferenceId,
      metadata,
      subscription_data: mode === 'subscription' ? {
        metadata,
      } : undefined,
      allow_promotion_codes: true,
    });

    res.json({
      sessionId: session.id,
      url: session.url,
      amount: session.amount_total,
      currency: session.currency,
    });
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}

/**
 * Handle Stripe Webhook
 * POST /api/v1/stripe/webhook
 */
export async function handleWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature']!;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutComplete(session);
      break;
    }
    
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdate(subscription);
      break;
    }
    
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionCanceled(subscription);
      break;
    }
    
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaymentSucceeded(invoice);
      break;
    }
    
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaymentFailed(invoice);
      break;
    }
  }

  res.json({ received: true });
}

/**
 * Verify Session
 * GET /api/v1/stripe/verify-session/:sessionId
 */
export async function verifySession(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription'],
    });
    
    res.json({
      paid: session.payment_status === 'paid',
      customerId: session.customer,
      subscriptionId: session.subscription,
    });
  } catch (error) {
    console.error('Session verification error:', error);
    res.status(500).json({ error: 'Failed to verify session' });
  }
}

/**
 * Create Portal Session
 * POST /api/v1/stripe/portal-session
 */
export async function createPortalSession(req: Request, res: Response) {
  try {
    const { customerId, returnUrl } = req.body;
    
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    
    res.json({ url: session.url });
  } catch (error) {
    console.error('Portal session error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
}

// Helper functions

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  // Extract metadata
  const userId = session.client_reference_id;
  const planId = session.metadata?.planId;
  
  if (!userId || !planId) {
    console.error('Missing userId or planId in session metadata');
    return;
  }
  
  // Create or update license in your database
  const license = {
    id: `license_${Date.now()}`,
    userId,
    customerId: session.customer as string,
    subscriptionId: session.subscription as string,
    plan: planId,
    status: 'active',
    features: getPlanFeatures(planId),
    validUntil: session.mode === 'payment' 
      ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString() // 100 years for lifetime
      : undefined, // Will be set by subscription
    deviceLimit: getPlanDeviceLimit(planId),
    activatedDevices: [],
  };
  
  // Save to database
  await saveLicense(license);
  
  // Send confirmation email
  if (session.customer_email) {
    await sendPurchaseConfirmationEmail(session.customer_email, planId);
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0].price.id;
  const planId = getPlanFromPriceId(priceId);
  
  // Update license in database
  await updateLicenseByCustomerId(customerId, {
    subscriptionId: subscription.id,
    plan: planId,
    status: subscription.status === 'active' ? 'active' : 'expired',
    validUntil: new Date(subscription.current_period_end * 1000).toISOString(),
  });
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  // Update license status
  await updateLicenseByCustomerId(customerId, {
    status: 'cancelled',
    validUntil: new Date(subscription.current_period_end * 1000).toISOString(),
  });
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  // Extend subscription period
  const customerId = invoice.customer as string;
  const subscription = invoice.subscription as string;
  
  // License will be updated by subscription.updated event
  console.log(`Payment successful for customer ${customerId}`);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // Handle failed payment
  const customerId = invoice.customer as string;
  
  // Send payment failed email
  if (invoice.customer_email) {
    await sendPaymentFailedEmail(invoice.customer_email);
  }
  
  // You might want to set a grace period before suspending the license
}

// Utility functions

function getPlanFeatures(planId: string): string[] {
  const features: Record<string, string[]> = {
    basic: ['advanced_filters', 'custom_presets', 'export_history', 'priority_support'],
    pro: [
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
    lifetime: [
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
  };
  
  return features[planId] || [];
}

function getPlanDeviceLimit(planId: string): number {
  const limits: Record<string, number> = {
    basic: 3,
    pro: 5,
    lifetime: 10,
  };
  
  return limits[planId] || 1;
}

function getPlanFromPriceId(priceId: string): string {
  // Map your Stripe price IDs to plan names
  const priceMap: Record<string, string> = {
    'price_basic_monthly': 'basic',
    'price_basic_yearly': 'basic',
    'price_pro_monthly': 'pro',
    'price_pro_yearly': 'pro',
    'price_lifetime': 'lifetime',
  };
  
  return priceMap[priceId] || 'free';
}

// Database functions (implement these based on your database)

async function saveLicense(license: any): Promise<void> {
  // Save to your database
  console.log('Saving license:', license);
}

async function updateLicenseByCustomerId(customerId: string, updates: any): Promise<void> {
  // Update in your database
  console.log('Updating license for customer:', customerId, updates);
}

// Email functions (implement these based on your email service)

async function sendPurchaseConfirmationEmail(email: string, planId: string): Promise<void> {
  // Send email using your email service
  console.log(`Sending purchase confirmation to ${email} for ${planId} plan`);
}

async function sendPaymentFailedEmail(email: string): Promise<void> {
  // Send email using your email service
  console.log(`Sending payment failed notification to ${email}`);
}

/**
 * License Validation Endpoint
 * POST /api/v1/license/validate
 */
export async function validateLicense(req: Request, res: Response) {
  try {
    const { licenseId, deviceId, extensionId } = req.body;
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!authToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Verify auth token and get user
    const user = await verifyAuthToken(authToken);
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Get license from database
    const license = await getLicenseById(licenseId);
    if (!license || license.userId !== user.id) {
      return res.status(404).json({ error: 'License not found' });
    }
    
    // Check if license is valid
    const isValid = license.status === 'active' && 
                   new Date(license.validUntil) > new Date();
    
    // Check device limit
    if (deviceId && !license.activatedDevices.includes(deviceId)) {
      if (license.activatedDevices.length >= license.deviceLimit) {
        return res.status(403).json({ 
          error: 'Device limit reached',
          valid: false,
          license: {
            plan: license.plan,
            status: license.status,
            features: license.features,
            validUntil: license.validUntil,
            devices: license.activatedDevices.length,
            maxDevices: license.deviceLimit,
          }
        });
      }
      
      // Activate device
      await activateDevice(licenseId, deviceId);
    }
    
    res.json({
      valid: isValid,
      license: {
        id: license.id,
        userId: license.userId,
        plan: license.plan,
        status: license.status,
        features: license.features,
        validUntil: license.validUntil,
        deviceLimit: license.deviceLimit,
        activatedDevices: license.activatedDevices,
      }
    });
  } catch (error) {
    console.error('License validation error:', error);
    res.status(500).json({ error: 'Failed to validate license' });
  }
}

// Placeholder functions

async function verifyAuthToken(token: string): Promise<any> {
  // Implement JWT verification or session lookup
  return { id: 'user_123', email: 'user@example.com' };
}

async function getLicenseById(licenseId: string): Promise<any> {
  // Get from database
  return null;
}

async function activateDevice(licenseId: string, deviceId: string): Promise<void> {
  // Add device to license in database
}