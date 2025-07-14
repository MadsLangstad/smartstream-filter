/**
 * Account Management Modal
 * For premium users to manage their subscription
 */

import type { User, License } from '../../../services/paywall/paywall-manager';
import { StripeService } from '../../../services/stripe/stripe-service';
import { showSuccessToast, showErrorToast } from '../feedback/toast';

export interface AccountModalOptions {
  user: User;
  license: License;
}

export async function showAccountModal(options: AccountModalOptions): Promise<void> {
  const modal = createAccountModal(options);
  document.body.appendChild(modal);
}

function createAccountModal(options: AccountModalOptions): HTMLElement {
  const modal = document.createElement('div');
  modal.className = 'ssf-account-modal';
  
  // Add styles
  addAccountStyles();
  
  const planName = options.license.plan.charAt(0).toUpperCase() + options.license.plan.slice(1);
  const validUntil = options.license.validUntil ? new Date(options.license.validUntil).toLocaleDateString() : 'N/A';
  const isLifetime = options.license.plan === 'lifetime';
  
  modal.innerHTML = `
    <div class="ssf-modal-backdrop">
      <div class="ssf-modal-content">
        <button class="ssf-close-btn" aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        
        <div class="ssf-modal-header">
          <div class="ssf-user-avatar">
            ${options.user.avatar ? 
              `<img src="${options.user.avatar}" alt="Avatar">` :
              `<div class="ssf-avatar-placeholder">${options.user.email?.[0]?.toUpperCase() || 'U'}</div>`
            }
          </div>
          <h2>Account Settings</h2>
          <p>${options.user.email}</p>
        </div>
        
        <div class="ssf-account-info">
          <div class="ssf-info-section">
            <h3>Subscription</h3>
            <div class="ssf-plan-badge ssf-plan-${options.license.plan}">
              ${planName} Plan
            </div>
            ${!isLifetime ? `<p class="ssf-valid-until">Valid until: ${validUntil}</p>` : ''}
          </div>
          
          <div class="ssf-info-section">
            <h3>Features</h3>
            <ul class="ssf-feature-list">
              ${options.license.features.map(feature => `
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M20 6L9 17l-5-5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  ${formatFeatureName(feature)}
                </li>
              `).join('')}
            </ul>
          </div>
          
          <div class="ssf-info-section">
            <h3>Devices</h3>
            <p>${options.license.devices} / 3 devices activated</p>
            <div class="ssf-device-bar">
              <div class="ssf-device-fill" style="width: ${(options.license.devices / 3) * 100}%"></div>
            </div>
          </div>
        </div>
        
        <div class="ssf-modal-actions">
          ${!isLifetime ? `
            <button class="ssf-action-btn ssf-manage-btn" id="manage-subscription">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Manage Subscription
            </button>
          ` : ''}
          
          <button class="ssf-action-btn ssf-logout-btn" id="logout">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Add event listeners
  setupEventListeners(modal, options);
  
  // Animate in
  requestAnimationFrame(() => {
    modal.classList.add('ssf-show');
  });
  
  return modal;
}

function setupEventListeners(modal: HTMLElement, options: AccountModalOptions): void {
  // Close button
  const closeBtn = modal.querySelector('.ssf-close-btn') as HTMLButtonElement;
  closeBtn.onclick = () => closeModal(modal);
  
  // Backdrop click
  const backdrop = modal.querySelector('.ssf-modal-backdrop') as HTMLElement;
  backdrop.onclick = (e) => {
    if (e.target === backdrop) {
      closeModal(modal);
    }
  };
  
  // Manage subscription button
  const manageBtn = modal.querySelector('#manage-subscription') as HTMLButtonElement | null;
  if (manageBtn) {
    manageBtn.onclick = async () => {
      manageBtn.disabled = true;
      manageBtn.innerHTML = 'Opening portal...';
      
      try {
        const stripeService = StripeService.getInstance();
        
        // For demo mode
        if (options.user.id.startsWith('demo-')) {
          showSuccessToast('Demo mode: Subscription management would open here');
          closeModal(modal);
          return;
        }
        
        // Create portal session - no need for customer ID, server will use auth token
        const result = await stripeService.createPortalSession();
        
        if (result.success && result.data) {
          // Open portal in new tab
          await chrome.tabs.create({ url: result.data.url });
          closeModal(modal);
        } else {
          throw new Error(result.error?.message || 'Failed to open customer portal');
        }
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : 'Failed to open portal');
        manageBtn.disabled = false;
        manageBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Manage Subscription
        `;
      }
    };
  }
  
  // Logout button
  const logoutBtn = modal.querySelector('#logout') as HTMLButtonElement;
  logoutBtn.onclick = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      const { PaywallManager } = await import('../../../services/paywall/paywall-manager');
      await PaywallManager.getInstance().logout();
    }
  };
}

function closeModal(modal: HTMLElement): void {
  modal.classList.remove('ssf-show');
  setTimeout(() => modal.remove(), 300);
}

function formatFeatureName(feature: string): string {
  const featureNames: Record<string, string> = {
    'advanced_filters': 'Advanced Filters',
    'custom_presets': 'Custom Presets',
    'export_history': 'Export History',
    'priority_support': 'Priority Support',
    'keyword_filters': 'Keyword Filters',
    'channel_filters': 'Channel Filters',
    'analytics': 'Analytics Dashboard',
    'api_access': 'API Access',
    'multi_device_sync': 'Multi-Device Sync',
    'early_access': 'Early Access Features',
    'source_code': 'Source Code Access'
  };
  
  return featureNames[feature] || feature;
}

function addAccountStyles(): void {
  if (document.getElementById('ssf-account-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'ssf-account-styles';
  style.textContent = `
    .ssf-account-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    
    .ssf-account-modal.ssf-show {
      opacity: 1;
    }
    
    .ssf-modal-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    
    .ssf-modal-content {
      background: #1a1a1a;
      border-radius: 20px;
      max-width: 500px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      position: relative;
      transform: translateY(20px);
      transition: transform 0.3s ease;
    }
    
    .ssf-show .ssf-modal-content {
      transform: translateY(0);
    }
    
    .ssf-close-btn {
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      color: #888;
    }
    
    .ssf-close-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
    }
    
    .ssf-modal-header {
      text-align: center;
      padding: 40px 20px 30px;
    }
    
    .ssf-user-avatar {
      width: 80px;
      height: 80px;
      margin: 0 auto 20px;
      border-radius: 50%;
      overflow: hidden;
      border: 3px solid #333;
    }
    
    .ssf-user-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .ssf-avatar-placeholder {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      font-weight: 600;
      color: white;
    }
    
    .ssf-modal-header h2 {
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 10px;
      color: #fff;
    }
    
    .ssf-modal-header p {
      font-size: 16px;
      color: #888;
      margin: 0;
    }
    
    .ssf-account-info {
      padding: 0 40px 30px;
    }
    
    .ssf-info-section {
      margin-bottom: 30px;
    }
    
    .ssf-info-section h3 {
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      color: #666;
      margin: 0 0 15px;
      letter-spacing: 0.5px;
    }
    
    .ssf-plan-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      color: white;
    }
    
    .ssf-plan-basic {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    
    .ssf-plan-pro {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }
    
    .ssf-plan-lifetime {
      background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
    }
    
    .ssf-valid-until {
      margin: 10px 0 0;
      color: #888;
      font-size: 14px;
    }
    
    .ssf-feature-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
    }
    
    .ssf-feature-list li {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #ccc;
      font-size: 14px;
    }
    
    .ssf-feature-list svg {
      color: #22c55e;
      flex-shrink: 0;
    }
    
    .ssf-device-bar {
      background: #333;
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 10px;
    }
    
    .ssf-device-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      transition: width 0.3s ease;
    }
    
    .ssf-modal-actions {
      padding: 20px 40px 30px;
      border-top: 1px solid #333;
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
    }
    
    .ssf-action-btn {
      flex: 1;
      min-width: 200px;
      padding: 12px 24px;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    
    .ssf-manage-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .ssf-manage-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px -10px rgba(102, 126, 234, 0.5);
    }
    
    .ssf-manage-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    
    .ssf-logout-btn {
      background: #333;
      color: #ccc;
    }
    
    .ssf-logout-btn:hover {
      background: #444;
      color: #fff;
    }
    
    @media (max-width: 640px) {
      .ssf-account-info {
        padding: 0 20px 20px;
      }
      
      .ssf-modal-actions {
        padding: 15px 20px 20px;
      }
      
      .ssf-action-btn {
        min-width: auto;
      }
    }
  `;
  
  document.head.appendChild(style);
}