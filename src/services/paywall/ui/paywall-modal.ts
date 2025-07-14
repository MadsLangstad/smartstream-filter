/**
 * Beautiful Paywall Modal UI
 * Smooth, modern design with great UX
 */

import type { PlanDetails } from '../paywall-manager';

export interface PaywallModalOptions {
  feature: string;
  plans: PlanDetails[];
  currentPlan: string;
}

export interface PaywallModalResult {
  action: 'upgrade' | 'cancel';
  planId?: string;
}

export async function showPaywallModal(options: PaywallModalOptions): Promise<PaywallModalResult> {
  return new Promise((resolve) => {
    const modal = createPaywallModal(options, resolve);
    document.body.appendChild(modal);
  });
}

function createPaywallModal(
  options: PaywallModalOptions,
  onClose: (result: PaywallModalResult) => void
): HTMLElement {
  const modal = document.createElement('div');
  modal.className = 'ssf-paywall-modal';
  
  // Add styles
  addPaywallStyles();
  
  modal.innerHTML = `
    <div class="ssf-modal-backdrop">
      <div class="ssf-modal-content">
        <button class="ssf-close-btn" aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        
        <div class="ssf-modal-header">
          <div class="ssf-feature-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h2>Unlock ${options.feature}</h2>
          <p>Choose the perfect plan for your needs</p>
        </div>
        
        <div class="ssf-plans-grid">
          ${options.plans.map(plan => createPlanCard(plan, options.currentPlan)).join('')}
        </div>
        
        <div class="ssf-modal-footer">
          <p class="ssf-guarantee">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M9 11l3 3L22 4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            30-day money-back guarantee
          </p>
          <p class="ssf-secure">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke-width="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4" stroke-width="2"/>
            </svg>
            Secure payment via Stripe
          </p>
        </div>
      </div>
    </div>
  `;
  
  // Add event listeners
  const closeBtn = modal.querySelector('.ssf-close-btn') as HTMLButtonElement;
  closeBtn.onclick = () => {
    modal.remove();
    onClose({ action: 'cancel' });
  };
  
  // Backdrop click
  const backdrop = modal.querySelector('.ssf-modal-backdrop') as HTMLElement;
  backdrop.onclick = (e) => {
    if (e.target === backdrop) {
      modal.remove();
      onClose({ action: 'cancel' });
    }
  };
  
  // Plan selection
  const planBtns = modal.querySelectorAll('.ssf-select-plan-btn') as NodeListOf<HTMLButtonElement>;
  planBtns.forEach(btn => {
    btn.onclick = () => {
      const planId = btn.dataset.planId!;
      modal.remove();
      onClose({ action: 'upgrade', planId });
    };
  });
  
  // Animate in
  requestAnimationFrame(() => {
    modal.classList.add('ssf-show');
  });
  
  return modal;
}

function createPlanCard(plan: PlanDetails, currentPlan: string): string {
  const isCurrentPlan = plan.id === currentPlan;
  const popularClass = plan.popular ? 'ssf-popular' : '';
  
  return `
    <div class="ssf-plan-card ${popularClass} ${isCurrentPlan ? 'ssf-current' : ''}">
      ${plan.popular ? '<div class="ssf-popular-badge">Most Popular</div>' : ''}
      ${plan.savings ? `<div class="ssf-savings-badge">${plan.savings}</div>` : ''}
      
      <h3>${plan.name}</h3>
      <div class="ssf-price">
        <span class="ssf-price-amount">${plan.price}</span>
        ${plan.interval ? `<span class="ssf-price-interval">/${plan.interval}</span>` : ''}
      </div>
      
      <ul class="ssf-features">
        ${plan.features.map(feature => `
          <li>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M20 6L9 17l-5-5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            ${feature}
          </li>
        `).join('')}
      </ul>
      
      <button 
        class="ssf-select-plan-btn ${isCurrentPlan ? 'ssf-disabled' : ''}" 
        data-plan-id="${plan.id}"
        ${isCurrentPlan ? 'disabled' : ''}
      >
        ${isCurrentPlan ? 'Current Plan' : 'Select Plan'}
      </button>
    </div>
  `;
}

function addPaywallStyles(): void {
  if (document.getElementById('ssf-paywall-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'ssf-paywall-styles';
  style.textContent = `
    .ssf-paywall-modal {
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
    
    .ssf-paywall-modal.ssf-show {
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
      max-width: 900px;
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
    
    .ssf-feature-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    
    .ssf-modal-header h2 {
      font-size: 32px;
      font-weight: 700;
      margin: 0 0 10px;
      color: #fff;
    }
    
    .ssf-modal-header p {
      font-size: 18px;
      color: #888;
      margin: 0;
    }
    
    .ssf-plans-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      padding: 0 40px 40px;
    }
    
    .ssf-plan-card {
      background: #2a2a2a;
      border: 2px solid #333;
      border-radius: 16px;
      padding: 30px 25px;
      position: relative;
      transition: all 0.3s;
    }
    
    .ssf-plan-card:hover {
      border-color: #555;
      transform: translateY(-4px);
      box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
    }
    
    .ssf-plan-card.ssf-popular {
      border-color: #667eea;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
    }
    
    .ssf-plan-card.ssf-current {
      opacity: 0.7;
    }
    
    .ssf-popular-badge {
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 4px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .ssf-savings-badge {
      position: absolute;
      top: 15px;
      right: 15px;
      background: #22c55e;
      color: white;
      padding: 4px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .ssf-plan-card h3 {
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 15px;
      color: #fff;
    }
    
    .ssf-price {
      margin-bottom: 25px;
    }
    
    .ssf-price-amount {
      font-size: 36px;
      font-weight: 700;
      color: #fff;
    }
    
    .ssf-price-interval {
      font-size: 18px;
      color: #888;
    }
    
    .ssf-features {
      list-style: none;
      padding: 0;
      margin: 0 0 30px;
    }
    
    .ssf-features li {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      color: #ccc;
      font-size: 14px;
    }
    
    .ssf-features svg {
      color: #22c55e;
      flex-shrink: 0;
    }
    
    .ssf-select-plan-btn {
      width: 100%;
      padding: 12px 24px;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      background: #667eea;
      color: white;
    }
    
    .ssf-select-plan-btn:hover:not(:disabled) {
      background: #764ba2;
      transform: translateY(-2px);
    }
    
    .ssf-select-plan-btn.ssf-disabled {
      background: #444;
      cursor: not-allowed;
      opacity: 0.5;
    }
    
    .ssf-modal-footer {
      padding: 20px 40px 30px;
      border-top: 1px solid #333;
      display: flex;
      justify-content: center;
      gap: 40px;
      flex-wrap: wrap;
    }
    
    .ssf-modal-footer p {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      color: #888;
      font-size: 14px;
    }
    
    .ssf-modal-footer svg {
      color: #22c55e;
    }
    
    @media (max-width: 768px) {
      .ssf-plans-grid {
        grid-template-columns: 1fr;
        padding: 0 20px 30px;
      }
      
      .ssf-modal-header {
        padding: 30px 20px 20px;
      }
      
      .ssf-modal-header h2 {
        font-size: 24px;
      }
      
      .ssf-modal-footer {
        padding: 15px 20px 20px;
        gap: 20px;
      }
    }
  `;
  
  document.head.appendChild(style);
}