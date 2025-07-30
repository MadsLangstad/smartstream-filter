import { createLogger } from '../../../utils/logger';

const logger = createLogger('EmailPrompt');

interface EmailPromptResult {
  email: string;
  remember?: boolean;
}

/**
 * Show an email prompt modal for checkout
 */
export async function showEmailPrompt(): Promise<EmailPromptResult | null> {
  return new Promise((resolve) => {
    // Create modal elements
    const modal = document.createElement('div');
    modal.className = 'ssf-modal ssf-email-prompt-modal';
    
    modal.innerHTML = `
      <div class="ssf-modal-overlay"></div>
      <div class="ssf-modal-content">
        <div class="ssf-modal-header">
          <h2>Enter Your Email</h2>
          <button class="ssf-modal-close" aria-label="Close">&times;</button>
        </div>
        
        <div class="ssf-modal-body">
          <p class="ssf-email-prompt-description">
            Please enter your email address to continue with the checkout process.
            This will be used for your account and license delivery.
          </p>
          
          <div class="ssf-form-group">
            <label for="ssf-email-input">Email Address</label>
            <input 
              type="email" 
              id="ssf-email-input" 
              class="ssf-input"
              placeholder="your@email.com"
              required
              autocomplete="email"
            />
            <span class="ssf-error-message" style="display: none;">Please enter a valid email address</span>
          </div>
          
          <div class="ssf-form-group ssf-checkbox-group">
            <label>
              <input type="checkbox" id="ssf-remember-email" checked />
              <span>Remember my email for future purchases</span>
            </label>
          </div>
        </div>
        
        <div class="ssf-modal-footer">
          <button class="ssf-button ssf-button-secondary ssf-cancel-button">Cancel</button>
          <button class="ssf-button ssf-button-primary ssf-continue-button" disabled>Continue to Checkout</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Get elements
    const closeBtn = modal.querySelector('.ssf-modal-close') as HTMLButtonElement;
    const cancelBtn = modal.querySelector('.ssf-cancel-button') as HTMLButtonElement;
    const continueBtn = modal.querySelector('.ssf-continue-button') as HTMLButtonElement;
    const emailInput = modal.querySelector('#ssf-email-input') as HTMLInputElement;
    const rememberCheckbox = modal.querySelector('#ssf-remember-email') as HTMLInputElement;
    const errorMessage = modal.querySelector('.ssf-error-message') as HTMLElement;
    const overlay = modal.querySelector('.ssf-modal-overlay') as HTMLElement;
    
    // Cleanup function
    const cleanup = () => {
      modal.remove();
    };
    
    // Validate email
    const validateEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };
    
    // Handle input
    emailInput.addEventListener('input', () => {
      const email = emailInput.value.trim();
      const isValid = validateEmail(email);
      
      continueBtn.disabled = !isValid;
      
      if (email && !isValid) {
        errorMessage.style.display = 'block';
      } else {
        errorMessage.style.display = 'none';
      }
    });
    
    // Handle submit
    const handleSubmit = () => {
      const email = emailInput.value.trim();
      
      if (validateEmail(email)) {
        logger.info('Email provided for checkout:', email);
        cleanup();
        resolve({
          email,
          remember: rememberCheckbox.checked
        });
      }
    };
    
    // Event listeners
    closeBtn.addEventListener('click', () => {
      cleanup();
      resolve(null);
    });
    
    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve(null);
    });
    
    overlay.addEventListener('click', () => {
      cleanup();
      resolve(null);
    });
    
    continueBtn.addEventListener('click', handleSubmit);
    
    emailInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !continueBtn.disabled) {
        handleSubmit();
      }
    });
    
    // Focus email input
    setTimeout(() => emailInput.focus(), 100);
    
    // Add styles if not already present
    if (!document.querySelector('#ssf-email-prompt-styles')) {
      const style = document.createElement('style');
      style.id = 'ssf-email-prompt-styles';
      style.textContent = `
        .ssf-email-prompt-modal .ssf-modal-content {
          max-width: 420px;
        }
        
        .ssf-email-prompt-description {
          color: var(--yt-spec-text-secondary);
          margin-bottom: 20px;
          line-height: 1.4;
        }
        
        .ssf-form-group {
          margin-bottom: 16px;
        }
        
        .ssf-form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: var(--yt-spec-text-primary);
        }
        
        .ssf-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--yt-spec-10-percent-layer);
          border-radius: 4px;
          background: var(--yt-spec-base-background);
          color: var(--yt-spec-text-primary);
          font-size: 14px;
          transition: border-color 0.2s;
        }
        
        .ssf-input:focus {
          outline: none;
          border-color: #2563eb;
        }
        
        .ssf-input:invalid:not(:focus) {
          border-color: #dc2626;
        }
        
        .ssf-error-message {
          display: block;
          color: #dc2626;
          font-size: 12px;
          margin-top: 4px;
        }
        
        .ssf-checkbox-group label {
          display: flex;
          align-items: center;
          cursor: pointer;
          font-weight: normal;
        }
        
        .ssf-checkbox-group input[type="checkbox"] {
          margin-right: 8px;
          cursor: pointer;
        }
        
        .ssf-modal-footer {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
      `;
      document.head.appendChild(style);
    }
  });
}