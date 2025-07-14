/**
 * Demo API for testing the paywall
 * In production, this would be a real backend service
 */

import { createLogger } from '../../utils/logger';
import type { APIResponse, AuthResponse, LicenseValidationResponse, CheckoutSession } from '../../types/api';

const logger = createLogger('DemoAPI');

interface DemoUser {
  id: string;
  email: string;
  name: string;
  password: string; // In production: hashed
  plan: string;
}

interface DemoLicense {
  id: string;
  userId: string;
  plan: string;
  status: 'active' | 'expired' | 'cancelled';
  features: string[];
  validUntil: string;
  deviceLimit: number;
  activatedDevices: string[];
}

// Demo user database
const demoUsers = new Map<string, DemoUser>([
  ['demo@example.com', {
    id: 'user-123',
    email: 'demo@example.com',
    name: 'Demo User',
    password: 'password', // In production: hashed
    plan: 'pro'
  }]
]);

// Demo licenses
const demoLicenses = new Map<string, DemoLicense>([
  ['user-123', {
    id: 'license-123',
    userId: 'user-123',
    plan: 'pro',
    status: 'active',
    features: ['advanced_filters', 'keyword_filters', 'channel_filters', 'analytics', 'api_access'],
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    deviceLimit: 5,
    activatedDevices: []
  }]
]);

interface LoginRequest {
  email: string;
  password: string;
}

interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

interface ValidateRequest {
  licenseId: string;
  deviceId?: string;
}

interface CheckoutRequest {
  planId: string;
  email: string;
}

/**
 * Mock API endpoints for demo
 * Replace these URLs in PaywallManager with actual backend
 */
export const demoAPI = {
  // Auth endpoints
  '/auth/login': async (data: LoginRequest): Promise<AuthResponse> => {
    const user = demoUsers.get(data.email);
    if (!user || user.password !== data.password) {
      throw new Error('Invalid credentials');
    }
    
    // License is retrieved separately by the paywall manager
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token: 'demo-token-' + Date.now(),
      refreshToken: 'demo-refresh-' + Date.now(),
      expiresIn: 3600
    };
  },
  
  '/auth/signup': async (data: SignupRequest): Promise<AuthResponse> => {
    if (demoUsers.has(data.email)) {
      throw new Error('Email already exists');
    }
    
    const userId = 'user-' + Date.now();
    const newUser: DemoUser = {
      id: userId,
      email: data.email,
      name: data.name,
      password: data.password,
      plan: 'free'
    };
    
    demoUsers.set(data.email, newUser);
    
    // Create a free license for new user
    const newLicense: DemoLicense = {
      id: 'license-' + Date.now(),
      userId,
      plan: 'free',
      status: 'active',
      features: [],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      deviceLimit: 1,
      activatedDevices: []
    };
    
    demoLicenses.set(userId, newLicense);
    
    return {
      user: {
        id: userId,
        email: data.email,
        name: data.name
      },
      token: 'demo-token-' + Date.now(),
      refreshToken: 'demo-refresh-' + Date.now(),
      expiresIn: 3600
    };
  },
  
  '/license/validate': async (data: ValidateRequest): Promise<LicenseValidationResponse> => {
    // In demo mode, always return valid
    const license = Array.from(demoLicenses.values()).find(l => l.id === data.licenseId);
    
    if (!license) {
      return {
        valid: false,
        license: {
          plan: 'free',
          status: 'expired',
          features: [],
          validUntil: new Date().toISOString(),
          devices: 0,
          maxDevices: 0
        }
      };
    }
    
    return {
      valid: new Date(license.validUntil) > new Date(),
      license: {
        plan: license.plan,
        status: license.status,
        features: license.features,
        validUntil: license.validUntil,
        devices: license.activatedDevices.length,
        maxDevices: license.deviceLimit
      }
    };
  },
  
  '/checkout/session': async (data: CheckoutRequest): Promise<CheckoutSession> => {
    // Return a demo checkout session
    const prices = {
      basic: 4.99,
      pro: 9.99,
      lifetime: 199
    };
    
    return {
      sessionId: 'demo-session-' + Date.now(),
      url: `https://smartstreamfilter.com/demo-checkout?plan=${data.planId}&session=${Date.now()}`,
      plan: data.planId,
      amount: prices[data.planId as keyof typeof prices] || 0,
      currency: 'USD'
    };
  }
};

// Helper class for simulating API calls
export class DemoAPI {
  static async authenticate(email: string, password: string): Promise<APIResponse<AuthResponse>> {
    try {
      const result = await demoAPI['/auth/login']({ email, password });
      return { success: true, data: result };
    } catch (error) {
      logger.error('Authentication failed:', error);
      return { 
        success: false, 
        error: { 
          code: 'AUTH_FAILED', 
          message: error instanceof Error ? error.message : 'Authentication failed' 
        } 
      };
    }
  }
  
  static async validateLicense(licenseId: string): Promise<APIResponse<LicenseValidationResponse>> {
    try {
      const result = await demoAPI['/license/validate']({ licenseId });
      return { success: true, data: result };
    } catch (error) {
      logger.error('License validation failed:', error);
      return { 
        success: false, 
        error: { 
          code: 'VALIDATION_FAILED', 
          message: 'License validation failed' 
        } 
      };
    }
  }
  
  static async createCheckout(plan: string, email: string): Promise<APIResponse<CheckoutSession>> {
    try {
      const result = await demoAPI['/checkout/session']({ planId: plan, email });
      return { success: true, data: result };
    } catch (error) {
      logger.error('Checkout creation failed:', error);
      return { 
        success: false, 
        error: { 
          code: 'CHECKOUT_FAILED', 
          message: 'Failed to create checkout session' 
        } 
      };
    }
  }
  
  static async refreshToken(_refreshToken: string): Promise<APIResponse<AuthResponse>> {
    // Simulate token refresh
    const newToken = 'demo-token-refreshed-' + Date.now();
    const newRefreshToken = 'demo-refresh-' + Date.now();
    
    return {
      success: true,
      data: {
        user: {
          id: 'user-123',
          email: 'demo@example.com',
          name: 'Demo User'
        },
        token: newToken,
        refreshToken: newRefreshToken,
        expiresIn: 3600
      }
    };
  }
}

/**
 * Demo mode instructions
 * 
 * To test the paywall in demo mode:
 * 
 * 1. Login with demo credentials:
 *    Email: demo@example.com
 *    Password: password
 * 
 * 2. Or create a new account (data stored in memory only)
 * 
 * 3. Use the console to activate premium:
 *    await chrome.storage.local.set({
 *      authToken: 'demo-token',
 *      user: { id: 'demo-user', email: 'demo@example.com' },
 *      license: { 
 *        plan: 'pro', 
 *        status: 'active',
 *        features: ['advanced_filters'],
 *        validUntil: new Date(Date.now() + 30*24*60*60*1000).toISOString()
 *      }
 *    });
 *    location.reload();
 */