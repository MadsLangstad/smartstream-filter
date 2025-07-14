/**
 * API type definitions for SmartStream Filter
 */

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
  };
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LicenseValidationResponse {
  valid: boolean;
  license: {
    plan: string;
    status: 'active' | 'expired' | 'cancelled';
    features: string[];
    validUntil: string;
    devices: number;
    maxDevices: number;
  };
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
  plan: string;
  amount: number;
  currency: string;
}

export interface DeviceRegistration {
  deviceId: string;
  name: string;
  registeredAt: string;
  lastSeen: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval?: 'month' | 'year';
  features: string[];
  popular?: boolean;
}