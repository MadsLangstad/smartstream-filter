/**
 * Paywall modal component
 */

import { PaymentService } from './payment-service';

export interface PaywallConfig {
  feature?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

export class PaywallModal {
  private modal: HTMLElement | null = null;
  private paymentService = new PaymentService();

  constructor(private config: PaywallConfig = {}) {}

  async show(): Promise<void> {
    await this.paymentService.initialize();
    this.createModal();
    this.attachEventListeners();
    document.body.appendChild(this.modal!);
    
    // Animate in
    requestAnimationFrame(() => {
      this.modal!.classList.add('show');
    });
  }

  hide(): void {
    if (this.modal) {
      this.modal.classList.remove('show');
      setTimeout(() => {
        this.modal?.remove();
        this.modal = null;
      }, 300);
    }
  }

  private createModal(): void {
    this.modal = document.createElement('div');
    this.modal.className = 'smartstream-paywall-modal';
    this.modal.innerHTML = `
      <div class="paywall-backdrop"></div>
      <div class="paywall-content">
        <button class="paywall-close" aria-label="Close">×</button>
        
        <div class="paywall-header">
          <h2>🚀 Upgrade to Premium</h2>
          ${this.config.feature ? `<p class="feature-locked">To use <strong>${this.config.feature}</strong>, you need a premium subscription.</p>` : ''}
        </div>

        <div class="paywall-features">
          <h3>Unlock All Premium Features:</h3>
          <ul>
            <li>✨ <strong>Advanced Filters</strong> - Filter by keywords, channels, upload date</li>
            <li>📊 <strong>Usage Analytics</strong> - Track your viewing habits and time saved</li>
            <li>💾 <strong>Custom Presets</strong> - Save and switch between filter configurations</li>
            <li>🎵 <strong>Multi-Platform Support</strong> - Spotify, Netflix, and more (coming soon)</li>
            <li>📥 <strong>Export Data</strong> - Download your analytics and filter history</li>
            <li>🚫 <strong>No Ads</strong> - Clean, distraction-free experience</li>
            <li>⚡ <strong>Priority Support</strong> - Get help within 24 hours</li>
          </ul>
        </div>

        <div class="paywall-pricing">
          <div class="price-option" data-plan="monthly">
            <h4>Monthly</h4>
            <div class="price">$4.99<span>/month</span></div>
            <div class="savings">Cancel anytime</div>
          </div>
          
          <div class="price-option popular" data-plan="yearly">
            <div class="popular-badge">MOST POPULAR</div>
            <h4>Yearly</h4>
            <div class="price">$39.99<span>/year</span></div>
            <div class="savings">Save 33% ($20 off)</div>
          </div>
          
          <div class="price-option" data-plan="lifetime">
            <h4>Lifetime</h4>
            <div class="price">$99.99<span>once</span></div>
            <div class="savings">Best value!</div>
          </div>
        </div>

        <button class="paywall-subscribe" data-plan="yearly">
          Subscribe Now - $39.99/year
        </button>

        <div class="paywall-footer">
          <p>🔒 Secure payment via Stripe</p>
          <p>💳 Cancel anytime from your account</p>
          <div class="paywall-links">
            <a href="https://smartstreamfilter.com/privacy" target="_blank">Privacy Policy</a>
            <a href="https://smartstreamfilter.com/terms" target="_blank">Terms of Service</a>
          </div>
        </div>
      </div>
    `;

    this.injectStyles();
  }

  private attachEventListeners(): void {
    if (!this.modal) return;

    // Close button
    const closeBtn = this.modal.querySelector('.paywall-close');
    closeBtn?.addEventListener('click', () => {
      this.hide();
      this.config.onClose?.();
    });

    // Backdrop click
    const backdrop = this.modal.querySelector('.paywall-backdrop');
    backdrop?.addEventListener('click', () => {
      this.hide();
      this.config.onClose?.();
    });

    // Price options
    const priceOptions = this.modal.querySelectorAll('.price-option');
    priceOptions.forEach(option => {
      option.addEventListener('click', () => {
        // Update selection
        priceOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        
        // Update button
        const plan = option.getAttribute('data-plan');
        this.updateSubscribeButton(plan!);
      });
    });

    // Subscribe button
    const subscribeBtn = this.modal.querySelector('.paywall-subscribe');
    subscribeBtn?.addEventListener('click', async () => {
      await this.handleSubscribe();
    });

    // Select yearly by default
    const yearlyOption = this.modal.querySelector('.price-option[data-plan="yearly"]');
    yearlyOption?.classList.add('selected');
  }

  private updateSubscribeButton(plan: string): void {
    const button = this.modal?.querySelector('.paywall-subscribe') as HTMLButtonElement;
    if (!button) return;

    const prices = {
      monthly: '$4.99/month',
      yearly: '$39.99/year',
      lifetime: '$99.99 once'
    };

    button.textContent = `Subscribe Now - ${prices[plan as keyof typeof prices]}`;
    button.setAttribute('data-plan', plan);
  }

  private async handleSubscribe(): Promise<void> {
    const button = this.modal?.querySelector('.paywall-subscribe') as HTMLButtonElement;
    if (!button) return;

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Processing...';

    try {
      const checkoutUrl = await this.paymentService.createCheckout();
      
      // Open checkout in new tab
      window.open(checkoutUrl, '_blank');
      
      // Show waiting state
      button.textContent = 'Waiting for payment...';
      
      // Check for successful payment
      this.pollForPaymentSuccess();
      
    } catch (error) {
      console.error('[PaywallModal] Checkout failed:', error);
      button.textContent = 'Error - Please try again';
      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
      }, 3000);
    }
  }

  private async pollForPaymentSuccess(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes

    const checkInterval = setInterval(async () => {
      attempts++;
      
      const isPremium = await this.paymentService.checkSubscriptionStatus();
      
      if (isPremium) {
        clearInterval(checkInterval);
        this.handlePaymentSuccess();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        const button = this.modal?.querySelector('.paywall-subscribe') as HTMLButtonElement;
        if (button) {
          button.textContent = 'Subscribe Now';
          button.disabled = false;
        }
      }
    }, 5000); // Check every 5 seconds
  }

  private handlePaymentSuccess(): void {
    // Show success state
    const content = this.modal?.querySelector('.paywall-content');
    if (content) {
      content.innerHTML = `
        <div class="paywall-success">
          <div class="success-icon">✅</div>
          <h2>Welcome to Premium!</h2>
          <p>Your premium features are now active.</p>
          <button class="paywall-close-success">Start Using Premium Features</button>
        </div>
      `;
      
      const closeBtn = content.querySelector('.paywall-close-success');
      closeBtn?.addEventListener('click', () => {
        this.hide();
        this.config.onSuccess?.();
        // Reload to activate features
        window.location.reload();
      });
    }
  }

  private injectStyles(): void {
    if (document.getElementById('paywall-styles')) return;

    const style = document.createElement('style');
    style.id = 'paywall-styles';
    style.textContent = `
      .smartstream-paywall-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .smartstream-paywall-modal.show {
        opacity: 1;
      }

      .paywall-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(5px);
      }

      .paywall-content {
        position: relative;
        background: #1a1a1a;
        border-radius: 16px;
        padding: 32px;
        max-width: 600px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        transform: scale(0.9);
        transition: transform 0.3s ease;
      }

      .smartstream-paywall-modal.show .paywall-content {
        transform: scale(1);
      }

      .paywall-close {
        position: absolute;
        top: 16px;
        right: 16px;
        background: none;
        border: none;
        color: #666;
        font-size: 32px;
        cursor: pointer;
        padding: 0;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s;
      }

      .paywall-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }

      .paywall-header {
        text-align: center;
        margin-bottom: 32px;
      }

      .paywall-header h2 {
        color: #fff;
        font-size: 32px;
        margin: 0 0 16px 0;
        font-weight: 700;
      }

      .feature-locked {
        color: #aaa;
        font-size: 16px;
        margin: 0;
      }

      .feature-locked strong {
        color: #ffd700;
      }

      .paywall-features {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 24px;
        margin-bottom: 32px;
      }

      .paywall-features h3 {
        color: #fff;
        font-size: 18px;
        margin: 0 0 16px 0;
      }

      .paywall-features ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .paywall-features li {
        color: #ccc;
        padding: 8px 0;
        font-size: 14px;
      }

      .paywall-features li strong {
        color: #fff;
      }

      .paywall-pricing {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin-bottom: 24px;
      }

      .price-option {
        position: relative;
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid transparent;
        border-radius: 12px;
        padding: 20px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s;
      }

      .price-option:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 215, 0, 0.3);
      }

      .price-option.selected {
        background: rgba(255, 215, 0, 0.1);
        border-color: #ffd700;
      }

      .price-option.popular {
        border-color: #ffd700;
        transform: scale(1.05);
      }

      .popular-badge {
        position: absolute;
        top: -12px;
        left: 50%;
        transform: translateX(-50%);
        background: #ffd700;
        color: #000;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 700;
      }

      .price-option h4 {
        color: #fff;
        margin: 0 0 12px 0;
        font-size: 18px;
      }

      .price {
        color: #ffd700;
        font-size: 28px;
        font-weight: 700;
        margin-bottom: 8px;
      }

      .price span {
        font-size: 14px;
        color: #aaa;
        font-weight: 400;
      }

      .savings {
        color: #4CAF50;
        font-size: 14px;
      }

      .paywall-subscribe {
        width: 100%;
        background: #ffd700;
        color: #000;
        border: none;
        padding: 16px 32px;
        font-size: 18px;
        font-weight: 700;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s;
      }

      .paywall-subscribe:hover {
        background: #ffed4e;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);
      }

      .paywall-subscribe:disabled {
        background: #666;
        color: #999;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      .paywall-footer {
        text-align: center;
        margin-top: 24px;
      }

      .paywall-footer p {
        color: #666;
        font-size: 12px;
        margin: 4px 0;
      }

      .paywall-links {
        margin-top: 16px;
      }

      .paywall-links a {
        color: #666;
        font-size: 12px;
        margin: 0 8px;
        text-decoration: none;
      }

      .paywall-links a:hover {
        color: #ffd700;
        text-decoration: underline;
      }

      .paywall-success {
        text-align: center;
        padding: 48px 0;
      }

      .success-icon {
        font-size: 72px;
        margin-bottom: 24px;
      }

      .paywall-success h2 {
        color: #fff;
        font-size: 32px;
        margin: 0 0 16px 0;
      }

      .paywall-success p {
        color: #aaa;
        font-size: 18px;
        margin-bottom: 32px;
      }

      .paywall-close-success {
        background: #4CAF50;
        color: #fff;
        border: none;
        padding: 16px 32px;
        font-size: 16px;
        font-weight: 600;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s;
      }

      .paywall-close-success:hover {
        background: #45a049;
        transform: translateY(-2px);
      }

      @media (max-width: 768px) {
        .paywall-pricing {
          grid-template-columns: 1fr;
        }
        
        .price-option.popular {
          transform: none;
        }
      }
    `;
    document.head.appendChild(style);
  }
}