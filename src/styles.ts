import { css } from 'lit';

export const styles = css`
  :host {
    display: block;
  }

  ha-card {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .card-header {
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 24px;
    font-weight: 500;
    color: var(--primary-text-color);
  }

  .card-content {
    padding: 16px;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .warning {
    display: block;
    color: var(--error-color);
    background-color: var(--error-state-color);
    padding: 16px;
    border-radius: 4px;
  }

  .temperature-humidity-container {
    display: flex;
    gap: 16px;
    padding: 16px;
    border-radius: 12px;
    transition: background-color 0.3s ease;
  }

  .temperature-section,
  .humidity-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .temperature-value,
  .humidity-value {
    font-size: 32px;
    font-weight: 600;
    color: var(--primary-text-color);
  }

  .temperature-label,
  .humidity-label {
    font-size: 14px;
    color: var(--secondary-text-color);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .devices-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .device-chip {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background-color: var(--card-background-color);
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.2s ease;
    border: 1px solid var(--divider-color);
  }

  .device-chip:hover {
    background-color: var(--secondary-background-color);
  }

  .device-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .device-icon {
    color: var(--state-icon-color);
  }

  .device-icon.on {
    color: var(--state-icon-active-color);
  }

  .device-name {
    font-size: 16px;
    color: var(--primary-text-color);
  }

  .device-state {
    font-size: 14px;
    color: var(--secondary-text-color);
  }

  .slider-container {
    width: 200px;
  }

  input[type="range"] {
    width: 100%;
    height: 4px;
    border-radius: 2px;
    background: var(--divider-color);
    outline: none;
    -webkit-appearance: none;
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--primary-color);
    cursor: pointer;
  }

  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--primary-color);
    cursor: pointer;
    border: none;
  }

  .mode-selector {
    display: flex;
    gap: 8px;
  }

  .mode-button {
    padding: 6px 12px;
    border: 1px solid var(--divider-color);
    border-radius: 4px;
    background-color: var(--card-background-color);
    color: var(--primary-text-color);
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
  }

  .mode-button:hover {
    background-color: var(--secondary-background-color);
  }

  .mode-button.active {
    background-color: var(--primary-color);
    color: var(--text-primary-color);
    border-color: var(--primary-color);
  }

  @media (max-width: 600px) {
    .temperature-value,
    .humidity-value {
      font-size: 28px;
    }

    .device-chip {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }

    .slider-container {
      width: 100%;
    }
  }
`;