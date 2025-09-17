import { css, CSSResult } from 'lit';

export const cardStyles: CSSResult = css`
  /* Card Container Styles */
  ha-card {
    border-radius: 22px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
    position: relative;
    background: var(--card-background-color);
  }

  .card-container {
    height: 182px;
    display: grid;
    grid-template-areas:
      "title chips"
      "icon chips";
    grid-template-rows: min-content 1fr;
    grid-template-columns: 1fr min-content;
    position: relative;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  /* Title Section */
  .title-section {
    grid-area: title;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    margin-left: 15px;
    padding-top: 12px;
    z-index: 2;
  }

  .room-name {
    font-size: 1.1em;
    font-weight: 500;
    color: var(--primary-text-color);
    margin: 0 0 4px 0;
    letter-spacing: 0.3px;
  }

  .room-name.active {
    color: #000000;
  }

  /* Icon Section */
  .icon-section {
    grid-area: icon;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    position: relative;
    padding-top: 10px;
    overflow: visible;
    z-index: 3;
  }

  .icon-container {
    position: relative;
    width: 110px;
    height: 110px;
    margin-left: -10px;
  }

  .icon-background {
    position: absolute;
    width: 110px;
    height: 110px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 1;
    background-color: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
  }

  .icon-background.active {
    background-color: rgba(255, 255, 255, 0.2);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }

  .icon-background:hover {
    transform: scale(1.05);
    background-color: rgba(255, 255, 255, 0.25);
  }

  .icon-background:active {
    transform: scale(0.98);
  }

  .icon-background ha-icon {
    --mdc-icon-size: 75px;
    color: rgba(255, 255, 255, 0.6);
    transition: all 0.3s ease;
  }

  .icon-background.active ha-icon {
    color: white;
  }

  /* Slider Container */
  .slider-container {
    position: absolute;
    width: 150px;
    height: 150px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 2;
  }

  /* Chips Section */
  .chips-section {
    grid-area: chips;
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-right: 12px;
    margin-top: 12px;
    z-index: 2;
    align-items: center;
  }

  /* Circular Slider Styles */
  .slider-svg {
    width: 100%;
    height: 100%;
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
  }

  .slider-svg.active {
    cursor: pointer;
    pointer-events: auto;
  }

  .slider-track {
    fill: none;
    stroke: rgba(187, 187, 187, 0.3);
    stroke-width: 10;
    pointer-events: stroke;
  }

  .slider-progress {
    fill: none;
    stroke-width: 10;
    stroke-linecap: round;
    transition: stroke 0.2s ease, d 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
  }

  .slider-thumb {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  }

  .slider-thumb:hover {
    r: 18;
    filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.3));
  }

  .slider-thumb.dragging {
    r: 20;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4));
  }

  .slider-thumb-icon {
    pointer-events: none;
  }

  .slider-thumb-hit-area {
    cursor: pointer;
    pointer-events: auto;
    fill: transparent;
  }

  /* State Modifiers */
  .unavailable {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .unavailable:active {
    transform: none;
  }

  /* Loading State */
  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--secondary-text-color);
  }

  .loading ha-circular-progress {
    --md-circular-progress-size: 48px;
  }

  /* Error State */
  .error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 16px;
    text-align: center;
  }

  .error ha-icon {
    --mdc-icon-size: 48px;
    color: var(--error-color);
    margin-bottom: 8px;
  }

  .error-message {
    color: var(--error-color);
    font-size: 0.9em;
    margin-top: 8px;
  }

  /* Animations */
  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.05);
      opacity: 0.8;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  .pulse {
    animation: pulse 2s infinite;
  }

  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* Responsive Design */
  @media (max-width: 400px) {
    .card-container {
      height: 160px;
    }

    .icon-container {
      width: 90px;
      height: 90px;
    }

    .icon-background {
      width: 90px;
      height: 90px;
    }

    .icon-background ha-icon {
      --mdc-icon-size: 60px;
    }

    .slider-container {
      width: 120px;
      height: 120px;
    }

    .chips-section {
      margin-right: 8px;
      gap: 6px;
    }
  }

  /* Dark Mode Adjustments */
  @media (prefers-color-scheme: dark) {
    .icon-background {
      background-color: rgba(0, 0, 0, 0.2);
    }

    .icon-background.active {
      background-color: rgba(0, 0, 0, 0.3);
    }

    .slider-track {
      stroke: rgba(255, 255, 255, 0.1);
    }
  }

  /* Reduced Motion */
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  /* Touch Device Optimizations */
  @media (hover: none) {
    .icon-background:hover {
      transform: scale(1);
      background-color: rgba(255, 255, 255, 0.2);
    }

    .slider-thumb:hover {
      r: 16;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
    }
  }
`;

export const deviceColors = {
  light: {
    default: '#FDD835',
    dimmed: '#F9A825',
    bright: '#FFEB3B',
  },
  speaker: {
    default: '#FF9800',
    muted: '#F57C00',
    loud: '#FFB74D',
  },
  purifier: {
    default: '#2196F3',
    low: '#64B5F6',
    high: '#1976D2',
  },
  fan: {
    default: '#4CAF50',
    low: '#81C784',
    high: '#388E3C',
  },
  climate: {
    cooling: '#42A5F5',
    heating: '#FF7043',
    idle: '#78909C',
  }
};

export const temperatureGradients = {
  cold: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
  cool: `linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)`,
  comfortable: `linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)`,
  warm: `linear-gradient(135deg, #f093fb 0%, #f5576c 100%)`,
  hot: `linear-gradient(135deg, #fa709a 0%, #fee140 100%)`,
};

export const getDeviceIconStyles = (deviceType: string, state: string): string => {
  const baseStyles = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
  `;

  const colorMap: Record<string, Record<string, string>> = {
    light: {
      on: deviceColors.light.default,
      off: '#9E9E9E',
      unavailable: '#616161'
    },
    speaker: {
      playing: deviceColors.speaker.default,
      paused: deviceColors.speaker.muted,
      idle: '#9E9E9E',
      off: '#9E9E9E',
      unavailable: '#616161'
    },
    purifier: {
      on: deviceColors.purifier.default,
      off: '#9E9E9E',
      unavailable: '#616161'
    },
    fan: {
      on: deviceColors.fan.default,
      off: '#9E9E9E',
      unavailable: '#616161'
    },
    climate: {
      cool: deviceColors.climate.cooling,
      heat: deviceColors.climate.heating,
      off: '#9E9E9E',
      idle: deviceColors.climate.idle,
      unavailable: '#616161'
    }
  };

  const color = colorMap[deviceType]?.[state] || '#9E9E9E';

  return `${baseStyles} color: ${color};`;
};

export const rippleEffect = css`
  .ripple {
    position: absolute;
    border-radius: 50%;
    transform: scale(0);
    animation: ripple 600ms linear;
    background-color: rgba(255, 255, 255, 0.3);
    pointer-events: none;
  }

  @keyframes ripple {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
`;