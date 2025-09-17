import { LitElement, html, css, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';
import { RoomCardConfig, DeviceConfig } from './types';
import { DEVICE_ICONS } from './config';

@customElement('room-card-editor')
export class RoomCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: RoomCardConfig;

  public setConfig(config: RoomCardConfig): void {
    this._config = { ...config };
  }

  get _name(): string {
    return this._config?.name || '';
  }

  get _temperature_sensor(): string {
    return this._config?.temperature_sensor || '';
  }

  get _humidity_sensor(): string {
    return this._config?.humidity_sensor || '';
  }

  get _show_temperature(): boolean {
    return this._config?.show_temperature !== false;
  }

  get _show_humidity(): boolean {
    return this._config?.show_humidity !== false;
  }

  get _haptic_feedback(): boolean {
    return this._config?.haptic_feedback !== false;
  }

  private _valueChanged(ev: CustomEvent): void {
    if (!this._config || !this.hass) return;
    
    const target = ev.target as any;
    const configPath = target.configPath;
    const value = target.checked !== undefined ? target.checked : target.value;

    if (configPath) {
      const newConfig = { ...this._config };
      this._setConfigValue(newConfig, configPath, value);
      this._config = newConfig;
      this._configChanged();
    }
  }

  private _setConfigValue(config: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = config;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  }

  private _configChanged(): void {
    const event = new Event('config-changed', {
      bubbles: true,
      composed: true,
    });
    (event as any).detail = { config: this._config };
    this.dispatchEvent(event);
  }

  private _addDevice(): void {
    if (!this._config) return;
    
    const devices = [...(this._config.devices || [])];
    devices.push({
      entity: '',
      name: '',
      type: 'light',
      control_type: 'continuous'
    } as DeviceConfig);
    
    this._config = { ...this._config, devices };
    this._configChanged();
  }

  private _removeDevice(index: number): void {
    if (!this._config || !this._config.devices) return;
    
    const devices = [...this._config.devices];
    devices.splice(index, 1);
    
    this._config = { ...this._config, devices };
    this._configChanged();
  }

  private _deviceChanged(index: number, field: string, value: any): void {
    if (!this._config || !this._config.devices) return;
    
    const devices = [...this._config.devices];
    devices[index] = { ...devices[index], [field]: value };
    
    this._config = { ...this._config, devices };
    this._configChanged();
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <div class="card-config">
        <div class="option">
          <ha-textfield
            label="Room Name"
            .value=${this._name}
            .configPath=${'name'}
            @input=${this._valueChanged}
          ></ha-textfield>
        </div>

        <div class="option">
          <ha-entity-picker
            label="Temperature Sensor"
            .hass=${this.hass}
            .value=${this._temperature_sensor}
            .configPath=${'temperature_sensor'}
            @value-changed=${this._valueChanged}
            include-domains='["sensor"]'
          ></ha-entity-picker>
        </div>

        <div class="option">
          <ha-entity-picker
            label="Humidity Sensor" 
            .hass=${this.hass}
            .value=${this._humidity_sensor}
            .configPath=${'humidity_sensor'}
            @value-changed=${this._valueChanged}
            include-domains='["sensor"]'
          ></ha-entity-picker>
        </div>

        <div class="option">
          <ha-formfield label="Show Temperature">
            <ha-switch
              .checked=${this._show_temperature}
              .configPath=${'show_temperature'}
              @change=${this._valueChanged}
            ></ha-switch>
          </ha-formfield>
        </div>

        <div class="option">
          <ha-formfield label="Show Humidity">
            <ha-switch
              .checked=${this._show_humidity}
              .configPath=${'show_humidity'}
              @change=${this._valueChanged}
            ></ha-switch>
          </ha-formfield>
        </div>

        <div class="option">
          <ha-formfield label="Haptic Feedback">
            <ha-switch
              .checked=${this._haptic_feedback}
              .configPath=${'haptic_feedback'}
              @change=${this._valueChanged}
            ></ha-switch>
          </ha-formfield>
        </div>

        <div class="devices-section">
          <div class="section-header">
            <h3>Devices</h3>
            <ha-button @click=${this._addDevice}>Add Device</ha-button>
          </div>
          
          ${(this._config.devices || []).map((device, index) => html`
            <div class="device-config">
              <div class="device-header">
                <span>Device ${index + 1}</span>
                <ha-button @click=${() => this._removeDevice(index)}>Remove</ha-button>
              </div>
              
              <div class="device-fields">
                <ha-entity-picker
                  label="Entity"
                  .hass=${this.hass}
                  .value=${device.entity}
                  @value-changed=${(ev: CustomEvent) => 
                    this._deviceChanged(index, 'entity', ev.detail.value)}
                ></ha-entity-picker>
                
                <ha-textfield
                  label="Name"
                  .value=${device.name || ''}
                  @input=${(ev: CustomEvent) =>
                    this._deviceChanged(index, 'name', (ev.target as any).value)}
                ></ha-textfield>
                
                <ha-select
                  label="Type"
                  .value=${device.type}
                  @closed=${(ev: CustomEvent) =>
                    this._deviceChanged(index, 'type', (ev.target as any).value)}
                >
                  <ha-list-item value="light">Light</ha-list-item>
                  <ha-list-item value="speaker">Speaker</ha-list-item>
                  <ha-list-item value="purifier">Air Purifier</ha-list-item>
                </ha-select>
              </div>
            </div>
          `)}
        </div>
      </div>
    `;
  }

  static get styles() {
    return css`
      .card-config {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      
      .option {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .devices-section {
        border-top: 1px solid var(--divider-color);
        padding-top: 16px;
      }
      
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      
      .device-config {
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
      }
      
      .device-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      
      .device-fields {
        display: grid;
        gap: 16px;
        grid-template-columns: 1fr 1fr 1fr;
      }
      
      @media (max-width: 600px) {
        .device-fields {
          grid-template-columns: 1fr;
        }
      }
    `;
  }
}