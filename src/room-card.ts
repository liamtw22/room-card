import { LitElement, html, css, TemplateResult, PropertyValues, CSSResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCard, hasAction, ActionHandlerEvent, handleAction } from 'custom-card-helpers';

// Import components to ensure they register themselves
import './components/circular-slider';
import './components/device-chip';
import './components/temperature-display';
import './room-card-editor';

// Import utilities and types
import { actionHandler } from './utils/action-handler';
import { RoomCardConfig, RoomData, ProcessedDevice, DeviceConfig } from './types';
import { DEFAULT_CONFIG, TEMPERATURE_RANGES, validateConfig } from './config';
import { HapticFeedback } from './utils/haptic-feedback';
import { getTemperatureColor } from './utils/color-utils';

@customElement('room-card')
export class RoomCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: RoomCardConfig;
  @state() private _roomData?: RoomData;

  public setConfig(config: RoomCardConfig): void {
    validateConfig(config);
    this._config = { ...DEFAULT_CONFIG, ...config };
    this._updateRoomData();
  }

  public getCardSize(): number {
    return 4;
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has('hass') && this._config) {
      this._updateRoomData();
    }
  }

  private _updateRoomData(): void {
    if (!this.hass || !this._config) return;

    const temperature = this._config.temperature_sensor 
      ? parseFloat(this.hass.states[this._config.temperature_sensor]?.state) 
      : undefined;
    
    const humidity = this._config.humidity_sensor
      ? parseFloat(this.hass.states[this._config.humidity_sensor]?.state)
      : undefined;

    const devices: ProcessedDevice[] = this._config.devices?.map(device => {
      const entity = this.hass.states[device.entity];
      return {
        ...device,
        current_value: this._getDeviceValue(entity, device),
        is_on: entity?.state !== 'off' && entity?.state !== 'unavailable',
        available: entity?.state !== 'unavailable'
      };
    }) || [];

    this._roomData = {
      temperature,
      humidity,
      temperature_unit: this._config.temperature_unit || 'F',
      devices,
      background_color: getTemperatureColor(temperature, this._config.background_colors)
    };
  }

  private _getDeviceValue(entity: any, device: DeviceConfig): number | string {
    if (!entity) return 0;
    
    switch (device.type) {
      case 'light':
        return entity.attributes?.brightness || 0;
      case 'speaker':
        return entity.attributes?.volume_level ? Math.round(entity.attributes.volume_level * 100) : 0;
      case 'purifier':
        return entity.attributes?.preset_mode || entity.state;
      default:
        return 0;
    }
  }

  private _handleDeviceControl(device: ProcessedDevice, value: number | string): void {
    if (this._config?.haptic_feedback) {
      HapticFeedback.light();
    }

    const serviceData: any = { entity_id: device.entity };

    switch (device.type) {
      case 'light':
        if (typeof value === 'number') {
          this.hass.callService('light', value > 0 ? 'turn_on' : 'turn_off', {
            ...serviceData,
            ...(value > 0 && { brightness: value })
          });
        }
        break;
      case 'speaker':
        if (typeof value === 'number') {
          this.hass.callService('media_player', 'volume_set', {
            ...serviceData,
            volume_level: value / 100
          });
        }
        break;
      case 'purifier':
        this.hass.callService('fan', 'set_preset_mode', {
          ...serviceData,
          preset_mode: value
        });
        break;
    }
  }

  private _handleDeviceToggle(device: ProcessedDevice): void {
    if (this._config?.haptic_feedback) {
      HapticFeedback.medium();
    }

    const domain = device.entity.split('.')[0];
    const service = device.is_on ? 'turn_off' : 'turn_on';
    
    this.hass.callService(domain, service, {
      entity_id: device.entity
    });
  }

  private _handleAction(ev: ActionHandlerEvent, device: ProcessedDevice): void {
    if (this.hass && this._config && device.tap_action) {
      handleAction(this, this.hass, device.tap_action, 'tap');
    }
  }

  protected render(): TemplateResult {
    if (!this._config || !this._roomData) {
      return html``;
    }

    return html`
      <ha-card style="background-color: ${this._roomData.background_color}">
        <div class="card-content">
          <div class="header">
            <h2 class="room-name">${this._config.name}</h2>
            ${this._renderSensors()}
          </div>
          
          <div class="devices-container">
            ${this._roomData.devices.map(device => this._renderDevice(device))}
          </div>
        </div>
      </ha-card>
    `;
  }

  private _renderSensors(): TemplateResult {
    if (!this._roomData) return html``;
    
    const { temperature, humidity, temperature_unit } = this._roomData;
    
    return html`
      <div class="sensors">
        ${this._config?.show_temperature && temperature !== undefined ? html`
          <div class="sensor temperature">
            <ha-icon icon="mdi:thermometer"></ha-icon>
            <span>${temperature.toFixed(1)}°${temperature_unit}</span>
          </div>
        ` : ''}
        ${this._config?.show_humidity && humidity !== undefined ? html`
          <div class="sensor humidity">  
            <ha-icon icon="mdi:water-percent"></ha-icon>
            <span>${humidity.toFixed(0)}%</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  private _renderDevice(device: ProcessedDevice): TemplateResult {
    return html`
      <div class="device ${device.is_on ? 'on' : 'off'} ${!device.available ? 'unavailable' : ''}">
        <circular-slider
          .device=${device}
          .value=${device.current_value}
          @value-changed=${(e: CustomEvent) => this._handleDeviceControl(device, e.detail.value)}
        ></circular-slider>
        
        <device-chip
          .device=${device}
          @device-toggle=${() => this._handleDeviceToggle(device)}
        ></device-chip>
      </div>
    `;
  }

  static get styles(): CSSResult {
    return css`
      ha-card {
        border-radius: 16px;
        transition: background-color 0.3s ease;
        overflow: hidden;
      }
      
      .card-content {
        padding: 16px;
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
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 16px;
      }
      
      .device {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.1);
        transition: all 0.2s ease;
      }
      
      .device.unavailable {
        opacity: 0.5;
        pointer-events: none;
      }
      
      .device:hover {
        background: rgba(255, 255, 255, 0.15);
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

// Register the card
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'room-card',
  name: 'Room Card',
  preview: false,
  description: 'Room card with temperature, humidity and device controls',
  documentationURL: 'https://github.com/yourusername/room-card'
});

// Declare global types for TypeScript
declare global {
  interface HTMLElementTagNameMap {
    'room-card': RoomCard;
    'room-card-editor': typeof import('./room-card-editor').RoomCardEditor;
  }
}
