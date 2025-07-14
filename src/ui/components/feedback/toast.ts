/**
 * Toast notifications for paywall events
 */

export function showSuccessToast(message: string): void {
  showToast(message, 'success');
}

export function showErrorToast(message: string): void {
  showToast(message, 'error');
}

export function showInfoToast(message: string): void {
  showToast(message, 'info');
}

export function showWarningToast(message: string): void {
  showToast(message, 'warning');
}

function showToast(message: string, type: 'success' | 'error' | 'info' | 'warning'): void {
  // Remove existing toasts
  document.querySelectorAll('.ssf-toast').forEach(t => t.remove());
  
  const toast = document.createElement('div');
  toast.className = `ssf-toast ssf-toast-${type}`;
  
  const icons = {
    success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M20 6L9 17l-5-5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="10" stroke-width="2"/>
      <path d="M15 9l-6 6M9 9l6 6" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
    info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="10" stroke-width="2"/>
      <path d="M12 16v-4M12 8h.01" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
    warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke-width="2"/>
      <line x1="12" y1="9" x2="12" y2="13" stroke-width="2"/>
      <line x1="12" y1="17" x2="12.01" y2="17" stroke-width="2"/>
    </svg>`
  };
  
  toast.innerHTML = `
    <div class="ssf-toast-icon">${icons[type]}</div>
    <div class="ssf-toast-message">${message}</div>
    <button class="ssf-toast-close">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
  `;
  
  // Add styles
  addToastStyles();
  
  document.body.appendChild(toast);
  
  // Close button
  const closeBtn = toast.querySelector('.ssf-toast-close') as HTMLButtonElement;
  closeBtn.onclick = () => removeToast(toast);
  
  // Animate in
  requestAnimationFrame(() => {
    toast.classList.add('ssf-toast-show');
  });
  
  // Auto remove after 5 seconds
  setTimeout(() => removeToast(toast), 5000);
}

function removeToast(toast: HTMLElement): void {
  toast.classList.remove('ssf-toast-show');
  setTimeout(() => toast.remove(), 300);
}

function addToastStyles(): void {
  if (document.getElementById('ssf-toast-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'ssf-toast-styles';
  style.textContent = `
    .ssf-toast {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #2a2a2a;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 400px;
      box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
      transform: translateX(120%);
      transition: transform 0.3s ease;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .ssf-toast-show {
      transform: translateX(0);
    }
    
    .ssf-toast-icon {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .ssf-toast-success {
      border: 1px solid rgba(34, 197, 94, 0.3);
      background: linear-gradient(135deg, 
        rgba(34, 197, 94, 0.1) 0%, 
        rgba(16, 185, 129, 0.1) 100%);
    }
    
    .ssf-toast-success .ssf-toast-icon {
      color: #22c55e;
    }
    
    .ssf-toast-error {
      border: 1px solid rgba(239, 68, 68, 0.3);
      background: linear-gradient(135deg, 
        rgba(239, 68, 68, 0.1) 0%, 
        rgba(220, 38, 38, 0.1) 100%);
    }
    
    .ssf-toast-error .ssf-toast-icon {
      color: #ef4444;
    }
    
    .ssf-toast-info {
      border: 1px solid rgba(59, 130, 246, 0.3);
      background: linear-gradient(135deg, 
        rgba(59, 130, 246, 0.1) 0%, 
        rgba(37, 99, 235, 0.1) 100%);
    }
    
    .ssf-toast-info .ssf-toast-icon {
      color: #3b82f6;
    }
    
    .ssf-toast-warning {
      border: 1px solid rgba(245, 158, 11, 0.3);
      background: linear-gradient(135deg, 
        rgba(245, 158, 11, 0.1) 0%, 
        rgba(217, 119, 6, 0.1) 100%);
    }
    
    .ssf-toast-warning .ssf-toast-icon {
      color: #f59e0b;
    }
    
    .ssf-toast-message {
      flex: 1;
      color: #fff;
      font-size: 14px;
      line-height: 1.4;
    }
    
    .ssf-toast-close {
      flex-shrink: 0;
      background: none;
      border: none;
      color: #666;
      cursor: pointer;
      padding: 4px;
      transition: color 0.2s;
    }
    
    .ssf-toast-close:hover {
      color: #fff;
    }
    
    @media (max-width: 600px) {
      .ssf-toast {
        right: 10px;
        left: 10px;
        max-width: none;
      }
    }
  `;
  
  document.head.appendChild(style);
}