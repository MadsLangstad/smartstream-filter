/**
 * Reusable modal utility for SmartStream Filter
 * Provides consistent modal creation and management
 */

import { DOMBuilder, createElement } from './safe-dom';

export interface ModalOptions {
  id: string;
  className?: string;
  closeOnEscape?: boolean;
  closeOnBackdropClick?: boolean;
  onClose?: () => void;
}

export class Modal {
  private container: HTMLElement;
  private content: HTMLElement;
  private options: Required<ModalOptions>;
  
  constructor(options: ModalOptions) {
    this.options = {
      className: '',
      closeOnEscape: true,
      closeOnBackdropClick: true,
      onClose: () => {},
      ...options
    };
    
    this.container = this.createContainer();
    this.content = this.container.querySelector('.modal-content') as HTMLElement;
    this.setupEventListeners();
  }
  
  private createContainer(): HTMLElement {
    const modal = new DOMBuilder('div', {
      id: this.options.id,
      className: `modal-backdrop ${this.options.className}`.trim()
    })
      .setStyle({
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'none',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '999999'
      })
      .addChild(
        new DOMBuilder('div', { className: 'modal-content' })
          .setStyle({
            backgroundColor: 'white',
            borderRadius: '8px',
            maxWidth: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative'
          })
          .build()
      )
      .build();
    
    return modal;
  }
  
  private setupEventListeners(): void {
    // Close on backdrop click
    if (this.options.closeOnBackdropClick) {
      this.container.addEventListener('click', (e) => {
        if (e.target === this.container) {
          this.close();
        }
      });
    }
    
    // Close on escape key
    if (this.options.closeOnEscape) {
      this.handleEscape = this.handleEscape.bind(this);
      document.addEventListener('keydown', this.handleEscape);
    }
  }
  
  private handleEscape(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.isOpen()) {
      this.close();
    }
  }
  
  setContent(content: HTMLElement | HTMLElement[]): void {
    // Clear existing content
    this.content.innerHTML = '';
    
    if (Array.isArray(content)) {
      content.forEach(el => this.content.appendChild(el));
    } else {
      this.content.appendChild(content);
    }
  }
  
  open(): void {
    if (!document.body.contains(this.container)) {
      document.body.appendChild(this.container);
    }
    
    this.container.style.display = 'flex';
    
    // Trigger reflow for animation
    this.container.offsetHeight;
    
    // Add animation classes
    this.container.classList.add('modal-open');
    
    // Focus trap
    const focusableElements = this.content.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length > 0) {
      (focusableElements[0] as HTMLElement).focus();
    }
  }
  
  close(): void {
    this.container.classList.remove('modal-open');
    this.container.style.display = 'none';
    
    if (this.options.closeOnEscape) {
      document.removeEventListener('keydown', this.handleEscape);
    }
    
    this.options.onClose();
  }
  
  isOpen(): boolean {
    return this.container.style.display !== 'none';
  }
  
  destroy(): void {
    this.close();
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}

/**
 * Helper function to create a standard modal
 */
export function createModal(
  options: ModalOptions,
  content: HTMLElement | HTMLElement[]
): Modal {
  const modal = new Modal(options);
  modal.setContent(content);
  return modal;
}

/**
 * Helper to create modal header with close button
 */
export function createModalHeader(title: string, onClose: () => void): HTMLElement {
  return new DOMBuilder('div', { className: 'modal-header' })
    .setStyle({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px',
      borderBottom: '1px solid #e5e7eb'
    })
    .addChild(
      createElement('h2', { style: 'margin: 0; font-size: 20px; font-weight: 600;' }, [title])
    )
    .addChild(
      new DOMBuilder('button', { 
        className: 'modal-close',
        'aria-label': 'Close modal'
      })
        .setStyle({
          background: 'none',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          color: '#6b7280',
          padding: '4px'
        })
        .addChild('×')
        .addEventListener('click', onClose)
        .build()
    )
    .build();
}

/**
 * Helper to create modal body
 */
export function createModalBody(...children: (HTMLElement | string)[]): HTMLElement {
  return new DOMBuilder('div', { className: 'modal-body' })
    .setStyle({
      padding: '16px',
      maxHeight: '60vh',
      overflowY: 'auto'
    })
    .addChildren(...children)
    .build();
}

/**
 * Helper to create modal footer with buttons
 */
export function createModalFooter(...buttons: HTMLElement[]): HTMLElement {
  return new DOMBuilder('div', { className: 'modal-footer' })
    .setStyle({
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '8px',
      padding: '16px',
      borderTop: '1px solid #e5e7eb'
    })
    .addChildren(...buttons)
    .build();
}