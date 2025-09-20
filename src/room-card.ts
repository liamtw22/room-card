import {
  LitElement,
  html,
  css,
  TemplateResult,
  PropertyValues,
  CSSResult
} from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  HomeAssistant,
  LovelaceCard,
  ActionHandlerEvent,
  handleAction,
  hasAction
} from 'custom-card-helpers';

// Import version from package.json
import { version } from '../package.json';

// Import types
import { 
  RoomCardConfig, 
  RoomData, 
  ProcessedDevice, 
  DeviceConfig
} from './types';

// Import config and validation
import { 
  DEFAULT_CONFIG, 
  validateConfig,
  mergeDeviceConfig 
} from './config';

// Import utilities
import { actionHandler } from './utils/action-handler';
import { HapticFeedback } from './utils/haptic-feedback';
import { getTemperatureColor } from './utils/color-utils';

// Import editor
import './room-card-editor';

// Register the card
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'room-card',
  name: 'Room Card',
  preview: true,
  description: 'Room card with temperature, humidity and device controls',
  documentationURL: 'https://github.com/yourusername/room-card'
});

console.info(
  `%c  ROOM-CARD  %c  Version ${version}  `,
  'color: white; font-weight: bold; background: #0288d1',
  'color: #0288d1; font-weight: bold; background: #e1f5fe'
);

@customElement('room-card')
export class RoomCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: RoomCardConfig;
  @state() private _roomData?: RoomData;
  
  public setConfig(config: RoomCardConfig): void {
    try {
      validateConfig(config);
      this._config = { ...DEFAULT_CONFIG, ...config };
      this.requestUpdate();
    } catch (e) {
      throw new Error(`Room Card Configuration Error: ${e}`);
    }
  }

  public getCardSize(): number {
    return this._config?.devices ? Math.max(4, 3 + Math.ceil(this._config.devices.length / 3)) : 4;
  }

  protected shouldUpdate(changedProperties: PropertyValues): boolean {
    if (!this._config) {
      return false;
    }
    
    if (changedProperties.has('_config')) {
      return true;
    }
    
    if (changedProperties.has('hass')) {
      // Check if any relevant entities have changed
      const oldHass = changedProperties.get('hass') as HomeAssistant | undefined;
      if (!oldHass) return true;
      
      // Check temperature sensor
      if (this._config.temperature_sensor &&
          oldHass.states[this._config.temperature_sensor] !== this.hass.states[this._config.temperature_sensor]) {
        return true;
      }
      
      // Check humidity sensor
      if (this._config.humidity_sensor &&
          oldHass.states[this._config.humidity_sensor] !== this.hass.states[this._config.humidity_sensor]) {
        return true;
      }
      
      // Check devices
      if (this._config.devices) {
        for (const device of this._config.devices) {
          if (oldHass.states[device.entity] !== this.hass.states[device.entity]) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if ((changedProperties.has('hass') || changedProperties.has('_config')) && this._config) {
      this._updateRoomData();
    }
  }

  private _updateRoomData(): void {
    if (!this.hass || !this._config) return;

    const tempEntity = this._config.temperature_sensor 
      ? this.hass.states[this._config.temperature_sensor]
      : undefined;
    
    const humidityEntity = this._config.humidity_sensor
      ? this.hass.states[this._config.humidity_sensor]
      : undefined;

    const temperature = tempEntity?.state !== 'unavailable' 
      ? parseFloat(tempEntity?.state || '0') 
      : undefined;
    
    const humidity = humidityEntity?.state !== 'unavailable'
      ? parseFloat(humidityEntity?.state || '0')
      : undefined;

    const devices: ProcessedDevice[] = this._config.devices?.map(device => {
      const entity = this.hass.states[device.entity];
      const mergedConfig = mergeDeviceConfig(device, device.type);
      
      return {
        ...mergedConfig,
        current_value: this._getDeviceValue(entity, mergedConfig),
        is_on: entity?.state === 'on',
        available: entity?.state !== 'unavailable'
      };
    }) || [];

    this._roomData = {
      temperature,
      humidity,
      temperature_unit: this._config.temperature_unit || 'F',
      devices,
      background_color: getTemperatureColor(
        temperature, 
        this._config.background_colors
      )
    };
  }

  private _getDeviceValue(entity: any, device: DeviceConfig): number | string {
    if (!entity || entity.state === 'unavailable') return device.min_value || 0;
    
    switch (device.type) {
      case 'light':
        return entity.attributes?.brightness || 0;
        
      case 'speaker':
        const volume = entity.attributes?.volume_level;
        return volume !== undefined ? Math.round(volume * 100) : 0;
        
      case 'purifier':
      case 'fan':
        const presetMode = entity.attributes?.preset_mode || entity.attributes?.speed;
        if (device.modes && presetMode) {
          const index = device.modes.indexOf(presetMode);
          return index >= 0 ? index / (device.modes.length - 1) : 0;
        }
        return entity.state === 'on' ? 1 : 0;
        
      default:
        if (entity.attributes?.percentage !== undefined) {
          return entity.attributes.percentage;
        }
        return entity.state === 'on' ? 1 : 0;
    }
  }

  private async _handleDeviceControl(device: ProcessedDevice, value: number | string): Promise<void> {
    if (!this.hass || !device.available) return;

    const entity = this.hass.states[device.entity];
    if (!entity) return;

    // Haptic feedback
    if (this._config?.haptic_feedback) {
      HapticFeedback.vibrate(50);
    }

    try {
      switch (device.type) {
        case 'light':
          await this.hass.callService('light', 'turn_on', {
            entity_id: device.entity,
            brightness: Math.round(Number(value))
          });
          break;
          
        case 'speaker':
          await this.hass.callService('media_player', 'volume_set', {
            entity_id: device.entity,
            volume_level: Number(value) / 100
          });
          break;
          
        case 'purifier':
        case 'fan':
          if (device.modes && device.control_type === 'discrete') {
            const modeIndex = Math.round(Number(value) * (device.modes.length - 1));
            const mode = device.modes[modeIndex];
            
            if (modeIndex === 0 || mode === 'Off') {
              await this.hass.callService('fan', 'turn_off', {
                entity_id: device.entity
              });
            } else {
              await this.hass.callService('fan', 'set_preset_mode', {
                entity_id: device.entity,
                preset_mode: mode
              });
            }
          } else {
            await this.hass.callService('fan', 'set_percentage', {
              entity_id: device.entity,
              percentage: Math.round(Number(value))
            });
          }
          break;
          
        default:
          // Generic switch/toggle
          await this.hass.callService('homeassistant', Number(value) > 50 ? 'turn_on' : 'turn_off', {
            entity_id: device.entity
          });
      }
    } catch (e) {
      console.error('Error controlling device:', e);
    }
  }

  private async _handleDeviceToggle(device: ProcessedDevice): Promise<void> {
    if (!this.hass || !device.available) return;

    // Haptic feedback
    if (this._config?.haptic_feedback) {
      HapticFeedback.vibrate(50);
    }

    try {
      await this.hass.callService('homeassistant', 'toggle', {
        entity_id: device.entity
      });
    } catch (e) {
      console.error('Error toggling device:', e);
    }
  }

  private _handleAction(ev: ActionHandlerEvent, device: ProcessedDevice): void {
    if (this.hass && device.available && ev.detail.action) {
      let config;
      switch (ev.detail.action) {
        case 'tap':
          config = device.tap_action;
          break;
        case 'hold':
          config = device.hold_action;
          break;
        case 'double_tap':
          config = device.double_tap_action;
          break;
      }
      if (config) {
        handleAction(this, this.hass, config, ev.detail.action);
      }
    }
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this.hass) {
      return html``;
    }

    if (!this._roomData) {
      return html`
        <ha-card>
          <div class="card-content">
            <div class="warning">Loading...</div>
          </div>
        </ha-card>
      `;
    }

    return html`
      <ha-card style="background: ${this._roomData.background_color}">
        <div class="card-content">
          ${this._renderHeader()}
          ${this._roomData.devices.length > 0 ? this._renderDevices() : ''}
        </div>
      </ha-card>
    `;
  }

  private _renderHeader(): TemplateResult {
    return html`
      <div class="header">
        <h2 class="room-name">${this._config!.name}</h2>
        ${this._renderSensors()}
      </div>
    `;
  }

  private _renderSensors(): TemplateResult {
    const { temperature, humidity, temperature_unit } = this._roomData!;
    
    return html`
      <div class="sensors">
        ${this._config!.show_temperature !== false && temperature !== undefined ? html`
          <div class="sensor temperature">
            <ha-icon icon="mdi:thermometer"></ha-icon>
            <span>${temperature.toFixed(1)}°${temperature_unit}</span>
          </div>
        ` : ''}
        
        ${this._config!.show_humidity !== false && humidity !== undefined ? html`
          <div class="sensor humidity">
            <ha-icon icon="mdi:water-percent"></ha-icon>
            <span>${humidity.toFixed(0)}%</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  private _renderDevices(): TemplateResult {
    return html`
      <div class="devices-container">
        ${this._roomData!.devices.map(device => this._renderDevice(device))}
      </div>
    `;
  }

  private _renderDevice(device: ProcessedDevice): TemplateResult {
    const icon = device.icon || this._getDefaultIcon(device.type);
    const name = device.name || this._getEntityName(device.entity);
    
    return html`
      <div 
        class="device ${device.is_on ? 'on' : 'off'} ${!device.available ? 'unavailable' : ''}"
        @action=${(ev: ActionHandlerEvent) => this._handleAction(ev, device)}
        .actionHandler=${actionHandler({
          hasHold: hasAction(device.hold_action),
          hasDoubleClick: hasAction(device.double_tap_action)
        })}
      >
        <div class="device-icon">
          <ha-icon icon="${icon}"></ha-icon>
        </div>
        
        <div class="device-name">${name}</div>
        
        ${device.control_type === 'continuous' ? html`
          <div class="device-slider">
            <input
              type="range"
              min="${device.min_value || 0}"
              max="${device.max_value || 100}"
              step="${device.step || 1}"
              .value="${device.current_value}"
              ?disabled="${!device.available}"
              @change=${(e: Event) => this._handleDeviceControl(device, (e.target as HTMLInputElement).value)}
            />
          </div>
        ` : html`
          <div class="device-modes">
            ${device.modes?.map((mode, index) => html`
              <button
                class="mode-button ${device.current_value === index / (device.modes!.length - 1) ? 'active' : ''}"
                ?disabled="${!device.available}"
                @click=${() => this._handleDeviceControl(device, index / (device.modes!.length - 1))}
              >
                ${mode}
              </button>
            `)}
          </div>
        `}
        
        <button
          class="device-toggle"
          ?disabled="${!device.available}"
          @click=${() => this._handleDeviceToggle(device)}
        >
          <ha-icon icon="${device.is_on ? 'mdi:power' : 'mdi:power-off'}"></ha-icon>
        </button>
      </div>
    `;
  }

  private _getDefaultIcon(type: string): string {
    const icons: Record<string, string> = {
      light: 'mdi:lightbulb',
      speaker: 'mdi:speaker',
      purifier: 'mdi:air-purifier',
      fan: 'mdi:fan',
      climate: 'mdi:thermostat',
      switch: 'mdi:toggle-switch',
      cover: 'mdi:window-shutter',
      vacuum: 'mdi:robot-vacuum'
    };
    return icons[type] || 'mdi:device-unknown';
  }

  private _getEntityName(entityId: string): string {
    const entity = this.hass.states[entityId];
    return entity?.attributes?.friendly_name || entityId.split('.')[1] || 'Unknown';
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
      }

      ha-card {
        border-radius: 16px;
        transition: background-color 0.3s ease;
        overflow: hidden;
      }
      
      .card-content {
        padding: 16px;
      }
      
      .warning {
        text-align: center;
        padding: 16px;
        color: var(--warning-color);
      }
      
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }
      
      .room-name {
        margin: 0;
        font-size: 1.5em;
        font-weight: 500;
        color: var(--primary-text-color);
      }
      
      .sensors {
        display: flex;
        gap: 16px;
      }
      
      .sensor {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 0.9em;
        color: var(--secondary-text-color);
      }
      
      .sensor ha-icon {
        --mdc-icon-size: 18px;
      }
      
      .devices-container {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 16px;
      }
      
      .device {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 16px;
        border-radius: 12px;
        background: var(--card-background-color);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        transition: all 0.2s ease;
        cursor: pointer;
        position: relative;
      }
      
      .device.unavailable {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .device:not(.unavailable):hover {
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        transform: translateY(-2px);
      }
      
      .device-icon {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--primary-color);
        color: var(--text-primary-color);
        transition: all 0.2s ease;
      }
      
      .device.off .device-icon {
        background: var(--disabled-color, #9e9e9e);
      }
      
      .device-icon ha-icon {
        --mdc-icon-size: 24px;
      }
      
      .device-name {
        font-size: 0.9em;
        font-weight: 500;
        text-align: center;
        color: var(--primary-text-color);
      }
      
      .device-slider {
        width: 100%;
        padding: 8px 0;
      }
      
      .device-slider input[type="range"] {
        width: 100%;
        height: 4px;
        border-radius: 2px;
        background: var(--divider-color);
        outline: none;
        -webkit-appearance: none;
      }
      
      .device-slider input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--primary-color);
        cursor: pointer;
      }
      
      .device-slider input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--primary-color);
        cursor: pointer;
        border: none;
      }
      
      .device-slider input[type="range"]:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .device-modes {
        display: flex;
        flex-direction: column;
        gap: 4px;
        width: 100%;
      }
      
      .mode-button {
        padding: 6px 12px;
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        background: transparent;
        color: var(--primary-text-color);
        font-size: 0.8em;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
      }
      
      .mode-button:hover:not(:disabled) {
        background: var(--primary-color);
        color: var(--text-primary-color);
        border-color: var(--primary-color);
      }
      
      .mode-button.active {
        background: var(--primary-color);
        color: var(--text-primary-color);
        border-color: var(--primary-color);
      }
      
      .mode-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .device-toggle {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: none;
        background: transparent;
        color: var(--secondary-text-color);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      
      .device-toggle:hover:not(:disabled) {
        background: var(--divider-color);
      }
      
      .device-toggle ha-icon {
        --mdc-icon-size: 20px;
      }
      
      .device-toggle:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      @media (max-width: 600px) {
        .devices-container {
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
        }
        
        .device {
          padding: 12px 8px;
        }
      }
    `;
  }

  static getConfigElement() {
    return document.createElement('room-card-editor');
  }

  static getStubConfig(): RoomCardConfig {
    return {
      type: 'custom:room-card',
      name: 'Living Room',
      temperature_sensor: '',
      humidity_sensor: '',
      show_temperature: true,
      show_humidity: true,
      temperature_unit: 'F',
      haptic_feedback: true,
      devices: []
    };
  }
}

// Declare global types
declare global {
  interface Window {
    customCards: Array<object>;
  }
  interface HTMLElementTagNameMap {
    'room-card': RoomCard;
  }
}