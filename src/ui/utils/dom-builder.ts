/**
 * Safe DOM manipulation utilities
 * Provides secure alternatives to innerHTML
 */

/**
 * Create element with safe HTML structure
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes?: Record<string, string>,
  children?: (HTMLElement | string)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  
  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key.startsWith('data-')) {
        element.setAttribute(key, value);
      } else if (key === 'style') {
        // Parse and apply safe styles
        const styles = value.split(';').filter(s => s.trim());
        styles.forEach(style => {
          const [prop, val] = style.split(':').map(s => s.trim());
          if (prop && val) {
            (element.style as any)[prop] = val;
          }
        });
      } else {
        element.setAttribute(key, value);
      }
    });
  }
  
  if (children) {
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else {
        element.appendChild(child);
      }
    });
  }
  
  return element;
}

/**
 * Build complex DOM structures safely
 */
export class DOMBuilder {
  private element: HTMLElement;
  
  constructor(tag: keyof HTMLElementTagNameMap, attributes?: Record<string, string>) {
    this.element = createElement(tag, attributes);
  }
  
  addClass(...classes: string[]): this {
    this.element.classList.add(...classes);
    return this;
  }
  
  setStyle(styles: Partial<CSSStyleDeclaration>): this {
    Object.assign(this.element.style, styles);
    return this;
  }
  
  setAttribute(name: string, value: string): this {
    this.element.setAttribute(name, value);
    return this;
  }
  
  addChild(child: HTMLElement | string): this {
    if (typeof child === 'string') {
      this.element.appendChild(document.createTextNode(child));
    } else {
      this.element.appendChild(child);
    }
    return this;
  }
  
  addChildren(...children: (HTMLElement | string)[]): this {
    children.forEach(child => this.addChild(child));
    return this;
  }
  
  addEventListener<K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): this {
    this.element.addEventListener(type, listener as EventListener, options);
    return this;
  }
  
  build(): HTMLElement {
    return this.element;
  }
}
