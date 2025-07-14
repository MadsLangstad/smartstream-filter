/**
 * Inline paywall UI for content scripts
 * No dynamic imports, everything is self-contained
 */

import { DOMBuilder, createElement } from '../utils/safe-dom';

export class InlinePaywall {
  static async show(feature: string): Promise<boolean> {
    return new Promise((resolve) => {
      // Check if modal already exists
      if (document.getElementById('ssf-inline-paywall')) {
        return;
      }

      // Create modal content
      const modal = new DOMBuilder('div', { id: 'ssf-inline-paywall' })
        .addChild(
          new DOMBuilder('div', { className: 'ssf-ip-backdrop' })
            .addChild(this.createModalContent(feature, resolve))
            .build()
        )
        .build();

      // Add styles
      const style = this.createStyles();
      document.head.appendChild(style);
      document.body.appendChild(modal);
    });
  }

  private static createModalContent(feature: string, resolve: (value: boolean) => void): HTMLElement {
    const content = new DOMBuilder('div', { className: 'ssf-ip-content' });

    // Close button
    const closeBtn = new DOMBuilder('button', { className: 'ssf-ip-close' })
      .addChild('×')
      .addEventListener('click', () => this.close(false, resolve))
      .build();

    // Header
    const header = new DOMBuilder('div', { className: 'ssf-ip-header' })
      .addChild(
        new DOMBuilder('div', { className: 'ssf-ip-icon' })
          .addChild('⭐')
          .build()
      )
      .addChild(createElement('h2', {}, [`Unlock ${feature}`]))
      .addChild(createElement('p', {}, ['Choose the perfect plan for your needs']))
      .build();

    // Plans
    const plans = new DOMBuilder('div', { className: 'ssf-ip-plans' })
      .addChild(this.createPlan('basic', 'Basic', '$4.99', '/mo', [
        '✓ Advanced filters',
        '✓ Custom presets',
        '✓ Priority support'
      ], resolve))
      .addChild(this.createPlan('pro', 'Pro', '$9.99', '/mo', [
        '✓ Everything in Basic',
        '✓ Keyword filters',
        '✓ Channel filters',
        '✓ Analytics'
      ], resolve, true))
      .addChild(this.createPlan('lifetime', 'Lifetime', '$199', '', [
        '✓ Everything in Pro',
        '✓ Lifetime updates',
        '✓ Early access',
        '✓ Source code'
      ], resolve))
      .build();

    // Footer
    const footer = new DOMBuilder('div', { className: 'ssf-ip-footer' })
      .addChild(createElement('p', {}, ['🔒 Secure payment • 30-day money-back guarantee']))
      .build();

    // Backdrop click handler
    const backdrop = document.querySelector('.ssf-ip-backdrop') as HTMLElement;
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          this.close(false, resolve);
        }
      });
    }

    return content
      .addChild(closeBtn)
      .addChild(header)
      .addChild(plans)
      .addChild(footer)
      .build();
  }

  private static createPlan(
    id: string,
    name: string,
    price: string,
    period: string,
    features: string[],
    resolve: (value: boolean) => void,
    isPopular = false
  ): HTMLElement {
    const plan = new DOMBuilder('div', { 
      className: `ssf-ip-plan${isPopular ? ' ssf-ip-popular' : ''}` 
    });

    if (isPopular) {
      plan.addChild(
        createElement('div', { className: 'ssf-ip-badge' }, ['Most Popular'])
      );
    }

    plan.addChild(createElement('h3', {}, [name]));

    // Price
    const priceEl = new DOMBuilder('div', { className: 'ssf-ip-price' })
      .addChild(price);
    if (period) {
      priceEl.addChild(createElement('span', {}, [period]));
    }
    plan.addChild(priceEl.build());

    // Features list
    const featureList = createElement('ul', {});
    features.forEach(feature => {
      featureList.appendChild(createElement('li', {}, [feature]));
    });
    plan.addChild(featureList);

    // Select button
    const selectBtn = new DOMBuilder('button', { 
      className: 'ssf-ip-select',
      'data-plan': id
    })
      .addChild(id === 'lifetime' ? 'Get Lifetime' : `Select ${name}`)
      .addEventListener('click', async () => {
        await this.handlePlanSelection(id, resolve);
      })
      .build();

    plan.addChild(selectBtn);

    return plan.build();
  }

  private static async handlePlanSelection(plan: string, resolve: (value: boolean) => void): Promise<void> {
    // In demo mode, simulate purchase
    alert(`Demo: Would purchase ${plan} plan. In production, this opens Stripe checkout.`);
    
    // Update storage to simulate premium
    await chrome.storage.local.set({
      user: { email: 'demo@example.com' },
      license: {
        plan: plan,
        status: 'active',
        features: ['advanced_filters', 'keyword_filters', 'channel_filters'],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    });
    
    this.close(true, resolve);
    window.location.reload();
  }

  private static close(success: boolean, resolve: (value: boolean) => void): void {
    const modal = document.getElementById('ssf-inline-paywall');
    const style = document.getElementById('ssf-inline-paywall-styles');
    
    if (modal) modal.remove();
    if (style) style.remove();
    
    resolve(success);
  }

  private static createStyles(): HTMLElement {
    const style = createElement('style', { id: 'ssf-inline-paywall-styles' });
    style.textContent = `
      #ssf-inline-paywall {
        position: fixed;
        inset: 0;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .ssf-ip-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: ssf-fadeIn 0.3s ease;
      }
      
      @keyframes ssf-fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .ssf-ip-content {
        background: #1a1a1a;
        border-radius: 20px;
        max-width: 900px;
        width: 100%;
        padding: 40px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        position: relative;
        animation: ssf-slideIn 0.3s ease;
      }
      
      @keyframes ssf-slideIn {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      
      .ssf-ip-close {
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        font-size: 24px;
        color: #888;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .ssf-ip-close:hover {
        background: rgba(255, 255, 255, 0.2);
        color: #fff;
      }
      
      .ssf-ip-header {
        text-align: center;
        margin-bottom: 40px;
      }
      
      .ssf-ip-icon {
        width: 60px;
        height: 60px;
        margin: 0 auto 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 15px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 30px;
      }
      
      .ssf-ip-header h2 {
        font-size: 28px;
        margin: 0 0 10px;
        color: #fff;
      }
      
      .ssf-ip-header p {
        font-size: 16px;
        color: #888;
        margin: 0;
      }
      
      .ssf-ip-plans {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
      }
      
      .ssf-ip-plan {
        background: #2a2a2a;
        border: 2px solid #333;
        border-radius: 16px;
        padding: 30px;
        position: relative;
        transition: all 0.3s;
      }
      
      .ssf-ip-plan:hover {
        border-color: #555;
        transform: translateY(-4px);
      }
      
      .ssf-ip-popular {
        border-color: #667eea;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
      }
      
      .ssf-ip-badge {
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
      
      .ssf-ip-plan h3 {
        font-size: 20px;
        margin: 0 0 15px;
        color: #fff;
      }
      
      .ssf-ip-price {
        font-size: 32px;
        font-weight: 700;
        color: #fff;
        margin-bottom: 20px;
      }
      
      .ssf-ip-price span {
        font-size: 16px;
        color: #888;
        font-weight: 400;
      }
      
      .ssf-ip-plan ul {
        list-style: none;
        padding: 0;
        margin: 0 0 25px;
      }
      
      .ssf-ip-plan li {
        padding: 8px 0;
        color: #ccc;
        font-size: 14px;
      }
      
      .ssf-ip-select {
        width: 100%;
        padding: 12px;
        background: #667eea;
        border: none;
        border-radius: 10px;
        color: white;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .ssf-ip-select:hover {
        background: #764ba2;
        transform: translateY(-2px);
      }
      
      .ssf-ip-footer {
        text-align: center;
        color: #888;
        font-size: 14px;
      }
    `;
    return style;
  }
}