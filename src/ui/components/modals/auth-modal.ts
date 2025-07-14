/**
 * Beautiful Authentication Modal
 * Smooth login/signup flow with great UX
 */

import type { User, License } from '../../../services/paywall/paywall-manager';
import { config, isDemo } from '../../../config/environment';
import { DemoAPI } from '../../../services/paywall/demo-api';
import type { AuthResponse } from '../../../types/api';

export interface AuthModalResult {
  success: boolean;
  token?: string;
  user?: User;
  license?: License;
  email?: string;
}

export async function showAuthModal(): Promise<AuthModalResult> {
  return new Promise((resolve) => {
    const modal = createAuthModal(resolve);
    document.body.appendChild(modal);
  });
}

function createAuthModal(onClose: (result: AuthModalResult) => void): HTMLElement {
  const modal = document.createElement('div');
  modal.className = 'ssf-auth-modal';
  
  // Add styles
  addAuthStyles();
  
  modal.innerHTML = `
    <div class="ssf-auth-backdrop">
      <div class="ssf-auth-content">
        <button class="ssf-auth-close" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        
        <div class="ssf-auth-header">
          <div class="ssf-auth-logo">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" stroke-width="1.5"/>
            </svg>
          </div>
          <h2>Welcome to SmartStream</h2>
          <p>Sign in to unlock premium features</p>
        </div>
        
        <div class="ssf-auth-tabs">
          <button class="ssf-tab ssf-active" data-tab="login">Sign In</button>
          <button class="ssf-tab" data-tab="signup">Sign Up</button>
        </div>
        
        <form class="ssf-auth-form" id="login-form">
          <div class="ssf-form-group">
            <label for="login-email">Email</label>
            <input 
              type="email" 
              id="login-email" 
              placeholder="you@example.com"
              required
              autocomplete="email"
            />
          </div>
          
          <div class="ssf-form-group">
            <label for="login-password">
              Password
              <a href="#" class="ssf-forgot-link">Forgot?</a>
            </label>
            <input 
              type="password" 
              id="login-password" 
              placeholder="••••••••"
              required
              autocomplete="current-password"
            />
          </div>
          
          <button type="submit" class="ssf-auth-submit">
            <span class="ssf-btn-text">Sign In</span>
            <span class="ssf-btn-loading" style="display: none;">
              <svg class="ssf-spinner" width="20" height="20" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" stroke-dasharray="60" stroke-dashoffset="15"/>
              </svg>
            </span>
          </button>
        </form>
        
        <form class="ssf-auth-form" id="signup-form" style="display: none;">
          <div class="ssf-form-group">
            <label for="signup-name">Name</label>
            <input 
              type="text" 
              id="signup-name" 
              placeholder="John Doe"
              required
              autocomplete="name"
            />
          </div>
          
          <div class="ssf-form-group">
            <label for="signup-email">Email</label>
            <input 
              type="email" 
              id="signup-email" 
              placeholder="you@example.com"
              required
              autocomplete="email"
            />
          </div>
          
          <div class="ssf-form-group">
            <label for="signup-password">Password</label>
            <input 
              type="password" 
              id="signup-password" 
              placeholder="Min 8 characters"
              required
              autocomplete="new-password"
              minlength="8"
            />
            <div class="ssf-password-strength">
              <div class="ssf-strength-bar"></div>
            </div>
          </div>
          
          <button type="submit" class="ssf-auth-submit">
            <span class="ssf-btn-text">Create Account</span>
            <span class="ssf-btn-loading" style="display: none;">
              <svg class="ssf-spinner" width="20" height="20" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" stroke-dasharray="60" stroke-dashoffset="15"/>
              </svg>
            </span>
          </button>
        </form>
        
        <div class="ssf-auth-divider">
          <span>or continue with</span>
        </div>
        
        <div class="ssf-social-buttons">
          <button class="ssf-social-btn" data-provider="google">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </button>
          
          <button class="ssf-social-btn" data-provider="github">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </button>
        </div>
        
        <p class="ssf-auth-terms">
          By continuing, you agree to our <a href="/terms" target="_blank">Terms</a> and <a href="/privacy" target="_blank">Privacy Policy</a>
        </p>
      </div>
    </div>
  `;
  
  // Setup event handlers
  setupAuthHandlers(modal, onClose);
  
  // Animate in
  requestAnimationFrame(() => {
    modal.classList.add('ssf-show');
  });
  
  return modal;
}

function setupAuthHandlers(modal: HTMLElement, onClose: (result: AuthModalResult) => void): void {
  const API_BASE = config.api.baseUrl;
  
  // Close button
  const closeBtn = modal.querySelector('.ssf-auth-close') as HTMLButtonElement;
  closeBtn.onclick = () => {
    modal.classList.remove('ssf-show');
    setTimeout(() => {
      modal.remove();
      onClose({ success: false });
    }, 300);
  };
  
  // Tab switching
  const tabs = modal.querySelectorAll('.ssf-tab') as NodeListOf<HTMLButtonElement>;
  const loginForm = modal.querySelector('#login-form') as HTMLFormElement;
  const signupForm = modal.querySelector('#signup-form') as HTMLFormElement;
  
  tabs.forEach(tab => {
    tab.onclick = () => {
      tabs.forEach(t => t.classList.remove('ssf-active'));
      tab.classList.add('ssf-active');
      
      if (tab.dataset['tab'] === 'login') {
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
      } else {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
      }
    };
  });
  
  // Password strength indicator
  const passwordInput = modal.querySelector('#signup-password') as HTMLInputElement;
  const strengthBar = modal.querySelector('.ssf-strength-bar') as HTMLElement;
  
  passwordInput.oninput = () => {
    const strength = calculatePasswordStrength(passwordInput.value);
    strengthBar.style.width = `${strength}%`;
    strengthBar.style.background = strength < 33 ? '#ef4444' : strength < 66 ? '#f59e0b' : '#22c55e';
  };
  
  // Form submission
  async function handleSubmit(form: HTMLFormElement, endpoint: string): Promise<void> {
    const submitBtn = form.querySelector('.ssf-auth-submit') as HTMLButtonElement;
    const btnText = submitBtn.querySelector('.ssf-btn-text') as HTMLElement;
    const btnLoading = submitBtn.querySelector('.ssf-btn-loading') as HTMLElement;
    
    // Show loading
    btnText.style.display = 'none';
    btnLoading.style.display = 'block';
    submitBtn.disabled = true;
    
    try {
      const formData = new FormData(form);
      const data = Object.fromEntries(formData);
      
      let authResponse: AuthResponse;
      let licenseData: any = null;
      
      if (isDemo) {
        // Use Demo API in demo mode
        if (endpoint === '/auth/login') {
          const response = await DemoAPI.authenticate(
            data['login-email'] as string,
            data['login-password'] as string
          );
          
          if (!response.success || !response.data) {
            throw new Error(response.error?.message || 'Authentication failed');
          }
          
          authResponse = response.data;
          
          // Store demo license data
          licenseData = {
            plan: 'pro',
            status: 'active',
            features: ['advanced_filters', 'keyword_filters', 'channel_filters'],
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          };
        } else {
          // For signup, create a simple response
          authResponse = {
            token: 'demo-token-' + Date.now(),
            refreshToken: 'demo-refresh-' + Date.now(),
            expiresIn: 3600,
            user: {
              id: 'user-' + Date.now(),
              email: data['signup-email'] as string,
              name: data['signup-name'] as string
            }
          };
          
          licenseData = {
            plan: 'free',
            status: 'active',
            features: [],
            validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          };
        }
        
        // Add artificial delay for realism
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        // Production API
        const response = await fetch(`${API_BASE}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Authentication failed');
        }
        
        const result = await response.json();
        authResponse = result;
        licenseData = result.license;
      }
      
      // Store authentication data
      await chrome.storage.local.set({
        [config.auth.tokenKey]: authResponse.token,
        [config.auth.refreshTokenKey]: authResponse.refreshToken,
        [config.auth.userKey]: authResponse.user,
        [config.auth.licenseKey]: licenseData
      });
      
      // Success animation
      submitBtn.style.background = '#22c55e';
      btnLoading.style.display = 'none';
      btnText.textContent = '✓ Success!';
      btnText.style.display = 'block';
      
      setTimeout(() => {
        modal.classList.remove('ssf-show');
        setTimeout(() => {
          modal.remove();
          onClose({
            success: true,
            token: authResponse.token,
            user: authResponse.user,
            license: licenseData
          });
        }, 300);
      }, 1000);
      
    } catch (error) {
      // Error handling
      btnText.style.display = 'block';
      btnLoading.style.display = 'none';
      submitBtn.disabled = false;
      
      // Show error message
      showError(form, error instanceof Error ? error.message : 'Something went wrong');
    }
  }
  
  loginForm.onsubmit = (e) => {
    e.preventDefault();
    handleSubmit(loginForm, '/auth/login');
  };
  
  signupForm.onsubmit = (e) => {
    e.preventDefault();
    handleSubmit(signupForm, '/auth/signup');
  };
  
  // Social login
  const socialBtns = modal.querySelectorAll('.ssf-social-btn') as NodeListOf<HTMLButtonElement>;
  socialBtns.forEach(btn => {
    btn.onclick = async () => {
      // For demo, simulate social login
      btn.disabled = true;
      btn.style.opacity = '0.5';
      
      // In production, this would open OAuth flow
      setTimeout(() => {
        modal.remove();
        onClose({
          success: true,
          token: 'demo-token',
          user: {
            id: 'demo-user',
            email: 'demo@example.com',
            name: 'Demo User'
          },
          license: {
            licenseKey: 'demo-license',
            email: 'demo@example.com',
            productId: 'demo',
            plan: 'pro',
            status: 'active',
            features: ['advanced_filters', 'analytics'],
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            devices: 1
          },
          email: 'demo@example.com'
        });
      }, 1500);
    };
  });
}

function calculatePasswordStrength(password: string): number {
  let strength = 0;
  
  if (password.length >= 8) strength += 25;
  if (password.length >= 12) strength += 25;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
  if (/\d/.test(password)) strength += 12.5;
  if (/[^a-zA-Z\d]/.test(password)) strength += 12.5;
  
  return strength;
}

function showError(form: HTMLFormElement, message: string): void {
  // Remove existing error
  const existingError = form.querySelector('.ssf-error');
  if (existingError) existingError.remove();
  
  const error = document.createElement('div');
  error.className = 'ssf-error';
  error.textContent = message;
  
  form.insertBefore(error, form.querySelector('.ssf-auth-submit'));
  
  setTimeout(() => error.remove(), 5000);
}

function addAuthStyles(): void {
  if (document.getElementById('ssf-auth-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'ssf-auth-styles';
  style.textContent = `
    .ssf-auth-modal {
      position: fixed;
      inset: 0;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    
    .ssf-auth-modal.ssf-show {
      opacity: 1;
    }
    
    .ssf-auth-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    
    .ssf-auth-content {
      background: #1a1a1a;
      border-radius: 20px;
      width: 100%;
      max-width: 440px;
      padding: 40px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      position: relative;
      transform: scale(0.95);
      transition: transform 0.3s ease;
    }
    
    .ssf-show .ssf-auth-content {
      transform: scale(1);
    }
    
    .ssf-auth-close {
      position: absolute;
      top: 20px;
      right: 20px;
      background: none;
      border: none;
      color: #666;
      cursor: pointer;
      padding: 8px;
      transition: color 0.2s;
    }
    
    .ssf-auth-close:hover {
      color: #fff;
    }
    
    .ssf-auth-header {
      text-align: center;
      margin-bottom: 30px;
    }
    
    .ssf-auth-logo {
      width: 64px;
      height: 64px;
      margin: 0 auto 20px;
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    
    .ssf-auth-header h2 {
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 8px;
      color: #fff;
    }
    
    .ssf-auth-header p {
      font-size: 16px;
      color: #888;
      margin: 0;
    }
    
    .ssf-auth-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
      background: #2a2a2a;
      padding: 4px;
      border-radius: 12px;
    }
    
    .ssf-tab {
      flex: 1;
      padding: 10px;
      border: none;
      background: none;
      color: #888;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border-radius: 8px;
      transition: all 0.2s;
    }
    
    .ssf-tab.ssf-active {
      background: #3a3a3a;
      color: #fff;
    }
    
    .ssf-form-group {
      margin-bottom: 20px;
    }
    
    .ssf-form-group label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
      font-weight: 500;
      color: #ccc;
      margin-bottom: 8px;
    }
    
    .ssf-forgot-link {
      font-size: 12px;
      color: #667eea;
      text-decoration: none;
    }
    
    .ssf-forgot-link:hover {
      text-decoration: underline;
    }
    
    .ssf-form-group input {
      width: 100%;
      padding: 12px 16px;
      background: #2a2a2a;
      border: 1px solid #3a3a3a;
      border-radius: 10px;
      color: #fff;
      font-size: 16px;
      transition: all 0.2s;
    }
    
    .ssf-form-group input:focus {
      outline: none;
      border-color: #667eea;
      background: #333;
    }
    
    .ssf-form-group input::placeholder {
      color: #666;
    }
    
    .ssf-password-strength {
      height: 4px;
      background: #2a2a2a;
      border-radius: 2px;
      margin-top: 8px;
      overflow: hidden;
    }
    
    .ssf-strength-bar {
      height: 100%;
      width: 0;
      transition: all 0.3s;
      border-radius: 2px;
    }
    
    .ssf-auth-submit {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      border: none;
      border-radius: 10px;
      color: white;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 48px;
    }
    
    .ssf-auth-submit:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px -10px rgba(220, 38, 38, 0.5);
    }
    
    .ssf-auth-submit:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    
    .ssf-spinner {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .ssf-error {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #ef4444;
      padding: 12px;
      border-radius: 8px;
      font-size: 14px;
      margin-bottom: 16px;
    }
    
    .ssf-auth-divider {
      text-align: center;
      margin: 24px 0;
      position: relative;
      color: #666;
      font-size: 14px;
    }
    
    .ssf-auth-divider::before,
    .ssf-auth-divider::after {
      content: '';
      position: absolute;
      top: 50%;
      width: calc(50% - 60px);
      height: 1px;
      background: #3a3a3a;
    }
    
    .ssf-auth-divider::before { left: 0; }
    .ssf-auth-divider::after { right: 0; }
    
    .ssf-social-buttons {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
    }
    
    .ssf-social-btn {
      flex: 1;
      padding: 10px;
      background: #2a2a2a;
      border: 1px solid #3a3a3a;
      border-radius: 10px;
      color: #ccc;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    
    .ssf-social-btn:hover {
      background: #333;
      border-color: #444;
      color: #fff;
    }
    
    .ssf-auth-terms {
      text-align: center;
      font-size: 12px;
      color: #666;
      margin: 0;
    }
    
    .ssf-auth-terms a {
      color: #667eea;
      text-decoration: none;
    }
    
    .ssf-auth-terms a:hover {
      text-decoration: underline;
    }
  `;
  
  document.head.appendChild(style);
}