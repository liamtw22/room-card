import { LitElement, html, TemplateResult, PropertyValues, CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  HomeAssistant,
  hasConfigOrEntityChanged,
  LovelaceCardEditor,
  handleClick,
  ActionConfig,
  computeStateName,
} from 'custom-card-helpers';
import { HassEntity } from 'home-assistant-js-websocket';

import type { RoomCardConfig, DeviceConfig } from './types';
import { CARD_VERSION, DEFAULT_BACKGROUND_COLORS, TEMPERATURE_RANGES } from './const';
import { styles } from './styles';

console.info(
  `%c  ROOM-CARD \n%c  Version ${CARD_VERSION}    `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

// Register card in the card picker
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'room-card',
  name: 'Room Card',
  description: 'A beautiful room card with temperature, humidity, and device controls',
  preview: false,
  documentationURL: 'https://github.com/liamtw22/room-card',
});

@customElement('room-card')
export class RoomCard extends LitElement {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import('./editor');
    return document.createElement('room-card-editor') as LovelaceCardEditor;
  }

  public static getStubConfig(): Partial<RoomCardConfig> {
    return {
      name: 'Room',
      show_temperature: true,
      show_humidity: true,
      temperature_unit: 'F',
      haptic_feedback: true,
      devices: [],
    };
  }

  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config!: RoomCardConfig;
  @state() private _error?: string;

  public setConfig(config: RoomCardConfig): void {
    if (!config) {
      throw new Error('Invalid configuration');
    }

    this._config = {
      name: 'Room',
      show_temperature: true,
      show_humidity: true,
      temperature_unit: 'F',
      haptic_feedback: true,
      devices: [],
      background_colors: DEFAULT_BACKGROUND_COLORS,
      ...config,
    };
    this._error = undefined;
  }

  public getCardSize(): number {
    const deviceCount = this._config?.devices?.length || 0;
    return 3 + Math.ceil(deviceCount / 2);
  }

  public getGridOptions() {
    return {
      columns: 12,
      rows: 3,
      min_rows: 2,
      max_rows: 6,
    };
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this._config) {
      return false;
    }
    return hasConfigOrEntityChanged(this, changedProps, false);
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    if (this._error) {
      return this._showError(this._error);
    }

    const backgroundColor = this._getBackgroundColor();

    return html`
      <ha-card>
        ${this._config.name ? html`<div class="card-header">${this._config.name}</div>` : ''}
        <div class="card-content">
          <div class="temperature-humidity-container" style="background-color: ${backgroundColor}">
            ${this._renderTemperature()} ${this._renderHumidity()}
          </div>
          ${this._renderDevices()}
        </div>
      </ha-card>
    `;
  }

  private _renderTemperature(): TemplateResult {
    if (!this._config.show_temperature || !this._config.temperature_sensor) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.temperature_sensor];
    if (!stateObj) {
      return html``;
    }

    let temperature = parseFloat(stateObj.state);
    const unit = this._config.temperature_unit || 'F';
    
    // Convert if needed
    if (stateObj.attributes.unit_of_measurement === '°C' && unit === 'F') {
      temperature = (temperature * 9) / 5 + 32;
    } else if (stateObj.attributes.unit_of_measurement === '°F' && unit === 'C') {
      temperature = ((temperature - 32) * 5) / 9;
    }

    return html`
      <div class="temperature-section">
        <div class="temperature-value">${temperature.toFixed(1)}°${unit}</div>
        <div class="temperature-label">Temperature</div>
      </div>
    `;
  }

  private _renderHumidity(): TemplateResult {
    if (!this._config.show_humidity || !this._config.humidity_sensor) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.humidity_sensor];
    if (!stateObj) {
      return html``;
    }

    const humidity = parseFloat(stateObj.state);

    return html`
      <div class="humidity-section">
        <div class="humidity-value">${humidity.toFixed(0)}%</div>
        <div class="humidity-label">Humidity</div>
      </div>
    `;
  }

  private _renderDevices(): TemplateResult {
    if (!this._config.devices || this._config.devices.length === 0) {
      return html``;
    }

    return html`
      <div class="devices-container">
        ${this._config.devices.map((device) => this._renderDevice(device))}
      </div>
    `;
  }

  private _renderDevice(device: DeviceConfig): TemplateResult {
    const stateObj = this.hass.states[device.entity];
    if (!stateObj) {
      return html``;
    }

    const isOn = stateObj.state !== 'off' && stateObj.state !== 'unavailable';
    const name = device.name || computeStateName(stateObj);
    const icon = device.icon || this._getDeviceIcon(device.type, stateObj);

    return html`
      <div
        class="device-chip"
        @click=${(ev: MouseEvent) => this._handleDeviceClick(ev, device)}
      >
        <div class="device-info">
          <ha-icon class="device-icon ${isOn ? 'on' : ''}" .icon=${icon}></ha-icon>
          <div>
            <div class="device-name">${name}</div>
            <div class="device-state">${this._getDeviceState(stateObj, device)}</div>
          </div>
        </div>
        ${this._renderDeviceControl(device, stateObj)}
      </div>
    `;
  }

  private _renderDeviceControl(device: DeviceConfig, stateObj: HassEntity): TemplateResult {
    const controlType = device.control_type || this._getDefaultControlType(device.type);

    if (controlType === 'continuous') {
      return this._renderContinuousControl(device, stateObj);
    } else if (controlType === 'discrete' && device.modes) {
      return this._renderDiscreteControl(device, stateObj);
    }

    return html``;
  }

  private _renderContinuousControl(device: DeviceConfig, stateObj: HassEntity): TemplateResult {
    let value = 0;
    const max = device.max_value || 100;
    const min = device.min_value || 0;

    if (device.type === 'light' && stateObj.attributes.brightness !== undefined) {
      value = stateObj.attributes.brightness;
      max = 255;
    } else if (device.type === 'speaker' && stateObj.attributes.volume_level !== undefined) {
      value = stateObj.attributes.volume_level * 100;
      max = 100;
    }

    return html`
      <div class="slider-container" @click=${(e: Event) => e.stopPropagation()}>
        <input
          type="range"
          .value=${value.toString()}
          .min=${min.toString()}
          .max=${max.toString()}
          @input=${(ev: Event) => this._handleSliderChange(ev, device)}
          @change=${(ev: Event) => this._handleSliderChange(ev, device)}
        />
      </div>
    `;
  }

  private _renderDiscreteControl(device: DeviceConfig, stateObj: HassEntity): TemplateResult {
    if (!device.modes || device.modes.length === 0) {
      return html``;
    }

    const currentMode = this._getCurrentMode(device, stateObj);

    return html`
      <div class="mode-selector" @click=${(e: Event) => e.stopPropagation()}>
        ${device.modes.map(
          (mode) => html`
            <button
              class="mode-button ${currentMode === mode ? 'active' : ''}"
              @click=${() => this._handleModeChange(device, mode)}
            >
              ${mode}
            </button>
          `,
        )}
      </div>
    `;
  }

  private _handleDeviceClick(ev: MouseEvent, device: DeviceConfig): void {
    ev.stopPropagation();
    
    const actionConfig: ActionConfig = device.tap_action || {
      action: 'toggle',
    };

    try {
      handleClick(this, this.hass, { ...this._config, entity: device.entity }, actionConfig);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this._showErrorTemporarily(error.message);
    }
  }

  private _handleSliderChange(ev: Event, device: DeviceConfig): void {
    const target = ev.target as HTMLInputElement;
    const value = parseFloat(target.value);

    try {
      if (device.type === 'light') {
        this.hass.callService('light', 'turn_on', {
          entity_id: device.entity,
          brightness: Math.round(value),
        });
      } else if (device.type === 'speaker') {
        this.hass.callService('media_player', 'volume_set', {
          entity_id: device.entity,
          volume_level: value / 100,
        });
      }

      if (this._config.haptic_feedback) {
        this._hapticFeedback('light');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this._showErrorTemporarily(error.message);
    }
  }

  private _handleModeChange(device: DeviceConfig, mode: string): void {
    try {
      if (device.type === 'purifier' || device.type === 'fan') {
        if (mode === 'Off') {
          this.hass.callService('fan', 'turn_off', {
            entity_id: device.entity,
          });
        } else {
          this.hass.callService('fan', 'set_preset_mode', {
            entity_id: device.entity,
            preset_mode: mode,
          });
        }
      }

      if (this._config.haptic_feedback) {
        this._hapticFeedback('medium');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this._showErrorTemporarily(error.message);
    }
  }

  private _getBackgroundColor(): string {
    if (!this._config.temperature_sensor || !this._config.show_temperature) {
      return this._config.background_colors?.comfortable || DEFAULT_BACKGROUND_COLORS.comfortable;
    }

    const stateObj = this.hass.states[this._config.temperature_sensor];
    if (!stateObj) {
      return this._config.background_colors?.comfortable || DEFAULT_BACKGROUND_COLORS.comfortable;
    }

    let temperature = parseFloat(stateObj.state);
    
    // Convert to Celsius for comparison
    if (stateObj.attributes.unit_of_measurement === '°F') {
      temperature = ((temperature - 32) * 5) / 9;
    }

    const colors = { ...DEFAULT_BACKGROUND_COLORS, ...this._config.background_colors };

    if (temperature < TEMPERATURE_RANGES.cold.max) {
      return colors.cold;
    } else if (temperature < TEMPERATURE_RANGES.cool.max) {
      return colors.cool;
    } else if (temperature < TEMPERATURE_RANGES.comfortable.max) {
      return colors.comfortable;
    } else if (temperature < TEMPERATURE_RANGES.warm.max) {
      return colors.warm;
    } else {
      return colors.hot;
    }
  }

  private _getDeviceIcon(type: string, stateObj: HassEntity): string {
    const icons: Record<string, string> = {
      light: 'mdi:lightbulb',
      speaker: 'mdi:speaker',
      purifier: 'mdi:air-purifier',
      fan: 'mdi:fan',
      switch: 'mdi:power-plug',
    };

    return stateObj.attributes.icon || icons[type] || 'mdi:help-circle';
  }

  private _getDeviceState(stateObj: HassEntity, device: DeviceConfig): string {
    if (stateObj.state === 'unavailable') {
      return 'Unavailable';
    }

    if (stateObj.state === 'off') {
      return 'Off';
    }

    if (device.type === 'light' && stateObj.attributes.brightness !== undefined) {
      const percentage = Math.round((stateObj.attributes.brightness / 255) * 100);
      return `${percentage}%`;
    }

    if (device.type === 'speaker' && stateObj.attributes.volume_level !== undefined) {
      const percentage = Math.round(stateObj.attributes.volume_level * 100);
      return `${percentage}%`;
    }

    if ((device.type === 'purifier' || device.type === 'fan') && stateObj.attributes.preset_mode) {
      return stateObj.attributes.preset_mode;
    }

    return stateObj.state.charAt(0).toUpperCase() + stateObj.state.slice(1);
  }

  private _getDefaultControlType(type: string): string {
    return type === 'light' || type === 'speaker' ? 'continuous' : 'discrete';
  }

  private _getCurrentMode(device: DeviceConfig, stateObj: HassEntity): string {
    if (stateObj.state === 'off') {
      return 'Off';
    }

    if (stateObj.attributes.preset_mode) {
      return stateObj.attributes.preset_mode;
    }

    return device.modes?.[0] || 'Off';
  }

  private _hapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light'): void {
    if (!this._config.haptic_feedback) {
      return;
    }

    if ('vibrate' in navigator) {
      const patterns: Record<string, number> = {
        light: 10,
        medium: 20,
        heavy: 30,
      };
      navigator.vibrate(patterns[type]);
    }
  }

  private _showError(error: string): TemplateResult {
    return html`
      <ha-card>
        <div class="warning">${error}</div>
      </ha-card>
    `;
  }

  private _showErrorTemporarily(error: string): void {
    this._error = error;
    setTimeout(() => {
      this._error = undefined;
    }, 3000);
  }

  static get styles(): CSSResultGroup {
    return styles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'room-card': RoomCard;
  }
}