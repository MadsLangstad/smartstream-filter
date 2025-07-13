/**
 * MIT Licensed - Core slider UI component
 */

export interface SliderConfig {
  min: number;
  max: number;
  step: number;
  value: number;
  label: string;
  onChange: (value: number) => void;
}

export class SliderComponent {
  private container: HTMLElement;
  private slider: HTMLInputElement;
  private label: HTMLElement;
  private config: SliderConfig;

  constructor(config: SliderConfig) {
    this.config = config;
    this.container = this.createElement();
    this.slider = this.container.querySelector('input') as HTMLInputElement;
    this.label = this.container.querySelector('.slider-label') as HTMLElement;
    this.setupEventListeners();
  }

  private createElement(): HTMLElement {
    const div = document.createElement('div');
    div.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 8px;
    `;

    div.innerHTML = `
      <span class="slider-label" style="
        color: #fff;
        font-size: 13px;
        min-width: 35px;
        text-align: right;
      ">${this.formatValue(this.config.value)}</span>
      <input type="range" style="
        width: 60px;
        height: 20px;
        -webkit-appearance: none;
        background: transparent;
        cursor: pointer;
      " min="${this.config.min}" max="${this.config.max}" 
        step="${this.config.step}" value="${this.config.value}">
    `;

    // Add slider track and thumb styles
    const style = document.createElement('style');
    style.textContent = `
      input[type="range"]::-webkit-slider-track {
        width: 100%;
        height: 4px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 2px;
      }
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 12px;
        height: 12px;
        background: #fff;
        border-radius: 50%;
        cursor: pointer;
        margin-top: -4px;
      }
      input[type="range"]:hover::-webkit-slider-thumb {
        background: #ff0000;
      }
    `;
    
    if (!document.querySelector('#slider-styles')) {
      style.id = 'slider-styles';
      document.head.appendChild(style);
    }

    return div;
  }

  private setupEventListeners(): void {
    this.slider.addEventListener('input', () => {
      const value = parseInt(this.slider.value);
      this.label.textContent = this.formatValue(value);
      this.config.onChange(value);
    });
  }

  private formatValue(value: number): string {
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  getElement(): HTMLElement {
    return this.container;
  }

  getValue(): number {
    return parseInt(this.slider.value);
  }

  setValue(value: number): void {
    this.slider.value = value.toString();
    this.label.textContent = this.formatValue(value);
  }
}