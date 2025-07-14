/**
 * Upgrade Modal for existing users
 * Shows when user tries to access higher-tier features
 */

export interface UpgradeModalOptions {
  feature: string;
  currentPlan: string;
  requiredPlan: string;
}

export interface UpgradeModalResult {
  upgrade: boolean;
  planId?: string;
}

export async function showUpgradeModal(options: UpgradeModalOptions): Promise<UpgradeModalResult> {
  return new Promise((resolve) => {
    const modal = createUpgradeModal(options, resolve);
    document.body.appendChild(modal);
  });
}

function createUpgradeModal(
  options: UpgradeModalOptions,
  onClose: (result: UpgradeModalResult) => void
): HTMLElement {
  const modal = document.createElement('div');
  modal.className = 'ssf-upgrade-modal';
  
  const planDetails = {
    basic: { name: 'Basic', price: '$4.99/mo', color: '#3b82f6' },
    pro: { name: 'Pro', price: '$9.99/mo', color: '#8b5cf6' },
    lifetime: { name: 'Lifetime', price: '$199', color: '#f59e0b' }
  };
  
  const required = planDetails[options.requiredPlan as keyof typeof planDetails];
  
  modal.innerHTML = `
    <div class="ssf-upgrade-backdrop">
      <div class="ssf-upgrade-content">
        <div class="ssf-upgrade-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 15l-2 5l9-11h-6l2-5l-9 11h6z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        
        <h3>Upgrade to ${required.name}</h3>
        <p>The <strong>${options.feature}</strong> feature requires the ${required.name} plan</p>
        
        <div class="ssf-upgrade-comparison">
          <div class="ssf-current-plan">
            <span class="ssf-plan-label">Your Plan</span>
            <span class="ssf-plan-name">${planDetails[options.currentPlan as keyof typeof planDetails].name}</span>
          </div>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="ssf-arrow">
            <path d="M5 12h14m-7-7l7 7-7 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <div class="ssf-required-plan" style="--plan-color: ${required.color}">
            <span class="ssf-plan-label">Required</span>
            <span class="ssf-plan-name">${required.name}</span>
          </div>
        </div>
        
        <div class="ssf-upgrade-benefits">
          <h4>With ${required.name} you'll also get:</h4>
          <ul>
            ${getUpgradeBenefits(options.requiredPlan).map(benefit => 
              `<li>${benefit}</li>`
            ).join('')}
          </ul>
        </div>
        
        <div class="ssf-upgrade-actions">
          <button class="ssf-cancel-btn">Maybe Later</button>
          <button class="ssf-upgrade-btn" style="--btn-color: ${required.color}">
            Upgrade to ${required.name} - ${required.price}
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Add styles
  addUpgradeStyles();
  
  // Event handlers
  const cancelBtn = modal.querySelector('.ssf-cancel-btn') as HTMLButtonElement;
  const upgradeBtn = modal.querySelector('.ssf-upgrade-btn') as HTMLButtonElement;
  const backdrop = modal.querySelector('.ssf-upgrade-backdrop') as HTMLElement;
  
  const close = (upgrade: boolean, planId?: string) => {
    modal.classList.add('ssf-closing');
    setTimeout(() => {
      modal.remove();
      onClose({ upgrade, planId });
    }, 300);
  };
  
  cancelBtn.onclick = () => close(false);
  upgradeBtn.onclick = () => close(true, options.requiredPlan);
  backdrop.onclick = (e) => {
    if (e.target === backdrop) close(false);
  };
  
  // Animate in
  requestAnimationFrame(() => {
    modal.classList.add('ssf-show');
  });
  
  return modal;
}

function getUpgradeBenefits(plan: string): string[] {
  const benefits: Record<string, string[]> = {
    basic: [
      'Custom duration presets',
      'Export your filter history',
      'Priority email support'
    ],
    pro: [
      'Filter by keywords in titles',
      'Block specific channels',
      'Detailed analytics dashboard',
      'Sync across all devices',
      'API access for developers'
    ],
    lifetime: [
      'All Pro features forever',
      'Free lifetime updates',
      'Early access to new features',
      'Access to source code',
      'Personal support channel'
    ]
  };
  
  return benefits[plan] || [];
}

function addUpgradeStyles(): void {
  if (document.getElementById('ssf-upgrade-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'ssf-upgrade-styles';
  style.textContent = `
    .ssf-upgrade-modal {
      position: fixed;
      inset: 0;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .ssf-upgrade-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    
    .ssf-show .ssf-upgrade-backdrop {
      opacity: 1;
    }
    
    .ssf-upgrade-content {
      background: #1a1a1a;
      border-radius: 20px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      transform: scale(0.9);
      opacity: 0;
      transition: all 0.3s ease;
    }
    
    .ssf-show .ssf-upgrade-content {
      transform: scale(1);
      opacity: 1;
    }
    
    .ssf-closing .ssf-upgrade-content {
      transform: scale(0.9);
      opacity: 0;
    }
    
    .ssf-upgrade-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 20px;
      background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    
    .ssf-upgrade-modal h3 {
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 12px;
      color: #fff;
    }
    
    .ssf-upgrade-modal p {
      font-size: 16px;
      color: #aaa;
      margin: 0 0 30px;
      line-height: 1.5;
    }
    
    .ssf-upgrade-modal strong {
      color: #fff;
    }
    
    .ssf-upgrade-comparison {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .ssf-current-plan,
    .ssf-required-plan {
      padding: 16px 24px;
      border-radius: 12px;
      background: #2a2a2a;
      border: 2px solid #333;
    }
    
    .ssf-required-plan {
      border-color: var(--plan-color);
      background: linear-gradient(135deg, 
        rgba(139, 92, 246, 0.1) 0%, 
        rgba(99, 102, 241, 0.1) 100%);
    }
    
    .ssf-plan-label {
      display: block;
      font-size: 12px;
      color: #888;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .ssf-plan-name {
      display: block;
      font-size: 18px;
      font-weight: 600;
      color: #fff;
    }
    
    .ssf-arrow {
      color: #666;
    }
    
    .ssf-upgrade-benefits {
      background: #2a2a2a;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 30px;
      text-align: left;
    }
    
    .ssf-upgrade-benefits h4 {
      font-size: 14px;
      font-weight: 600;
      color: #ccc;
      margin: 0 0 12px;
    }
    
    .ssf-upgrade-benefits ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    
    .ssf-upgrade-benefits li {
      padding: 8px 0;
      padding-left: 24px;
      position: relative;
      color: #aaa;
      font-size: 14px;
    }
    
    .ssf-upgrade-benefits li::before {
      content: '✓';
      position: absolute;
      left: 0;
      color: #22c55e;
      font-weight: 600;
    }
    
    .ssf-upgrade-actions {
      display: flex;
      gap: 12px;
    }
    
    .ssf-cancel-btn,
    .ssf-upgrade-btn {
      flex: 1;
      padding: 14px 24px;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .ssf-cancel-btn {
      background: #2a2a2a;
      color: #aaa;
    }
    
    .ssf-cancel-btn:hover {
      background: #333;
      color: #fff;
    }
    
    .ssf-upgrade-btn {
      background: var(--btn-color);
      color: white;
    }
    
    .ssf-upgrade-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px -10px var(--btn-color);
    }
    
    @media (max-width: 600px) {
      .ssf-upgrade-content {
        padding: 30px 20px;
      }
      
      .ssf-upgrade-comparison {
        flex-direction: column;
        gap: 12px;
      }
      
      .ssf-arrow {
        transform: rotate(90deg);
      }
      
      .ssf-upgrade-actions {
        flex-direction: column;
      }
    }
  `;
  
  document.head.appendChild(style);
}