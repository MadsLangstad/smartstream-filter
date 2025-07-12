export const injectStyles = () => {
  if (!document.head) {
    // Wait for head to be available
    const observer = new MutationObserver((_mutations, obs) => {
      if (document.head) {
        obs.disconnect();
        injectStyles();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return;
  }
  
  const style = document.createElement('style');
  style.textContent = `
    .smartstream-controls {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-right: 16px;
      padding: 8px 16px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      backdrop-filter: blur(10px);
    }

    html[dark] .smartstream-controls,
    [dark] .smartstream-controls,
    ytd-app[dark] .smartstream-controls {
      background: rgba(255, 255, 255, 0.1);
    }

    .smartstream-toggle {
      display: flex;
      align-items: center;
    }

    .smartstream-switch {
      position: relative;
      display: inline-block;
      width: 36px;
      height: 20px;
    }

    .smartstream-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .smartstream-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: .3s;
      border-radius: 20px;
    }

    .smartstream-slider:before {
      position: absolute;
      content: "";
      height: 14px;
      width: 14px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .3s;
      border-radius: 50%;
    }

    input:checked + .smartstream-slider {
      background-color: #ff0000;
    }

    input:checked + .smartstream-slider:before {
      transform: translateX(16px);
    }

    .smartstream-duration-controls {
      display: flex;
      gap: 16px;
      align-items: center;
      font-size: 13px;
    }

    .smartstream-duration-controls label {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--yt-spec-text-primary);
    }

    .smartstream-duration-controls input[type="range"] {
      width: 80px;
      height: 4px;
      -webkit-appearance: none;
      appearance: none;
      background: rgba(255, 255, 255, 0.3);
      outline: none;
      border-radius: 2px;
    }

    .smartstream-duration-controls input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 12px;
      height: 12px;
      background: #ff0000;
      cursor: pointer;
      border-radius: 50%;
    }

    .smartstream-duration-controls input[type="range"]::-moz-range-thumb {
      width: 12px;
      height: 12px;
      background: #ff0000;
      cursor: pointer;
      border-radius: 50%;
      border: none;
    }

    #smartstream-min-value,
    #smartstream-max-value {
      min-width: 40px;
      text-align: right;
      font-weight: 500;
    }

    @media (max-width: 1024px) {
      .smartstream-controls {
        display: none;
      }
    }
  `;
  document.head.appendChild(style);
};