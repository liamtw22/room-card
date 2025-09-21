import { LitElement, html, css, TemplateResult, CSSResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardEditor, fireEvent } from 'custom-card-helpers';

export interface RoomCardConfig {
  type: 'custom:room-card';
  area: string; // Required area instead of entity
  name?: string;
  icon?: string;
  temperature_sensor?: string;
  humidity_sensor?: string;
  devices?: DeviceConfig[];
  background_colors?: TemperatureColors;
  haptic_feedback?: boolean;
  show_temperature?: boolean;
  show_humidity?: boolean;
  temperature_unit?: 'C' | 'F';
}

export interface DeviceConfig {
  entity: string;
  attribute?: string;
  icon?: string;
  color?: string;
  scale?: number;
  type?: 'continuous' | 'discrete';
  modes?: DeviceMode[];
}

export interface DeviceMode {
  value: number;
  label: string;
  percentage: number;
  icon?: string;
}

export interface TemperatureColors {
  cold: string;
  cool: string;
  comfortable: string;
  warm: string;
  hot: string;
}

@customElement('room-card-editor')
export class RoomCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: RoomCardConfig;

  public setConfig(config: RoomCardConfig): void {
    this._config = { ...config };
  }

  private _valueChanged(ev: any): void {
    if (!this._config || !this.hass) return;

    const target = ev.target;
    let value = target.value;
    
    if (target.checked !== undefined) {
      value = target.checked;
    }
    
    if (target.configPath) {
      const newConfig = { ...this._config };
      this._setPath(newConfig, target.configPath, value);
      this._config = newConfig;
      fireEvent(this, 'config-changed', { config: this._config });
    }
  }

  private _setPath(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  private _addDevice(): void {
    if (!this._config) return;
    
    const devices = [...(this._config.devices || [])];
    devices.push({
      entity: '',
      attribute: 'brightness',
      icon: 'mdi:lightbulb',
      color: '#FDD835',
      scale: 255,
      type: 'continuous'
    });
    
    this._config = { ...this._config, devices };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _removeDevice(index: number): void {
    if (!this._config?.devices) return;
    
    const devices = [...this._config.devices];
    devices.splice(index, 1);
    
    this._config = { ...this._config, devices };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _deviceValueChanged(ev: any, index: number): void {
    if (!this._config?.devices) return;
    
    const target = ev.target;
    const field = target.field;
    let value = target.value;
    
    if (target.checked !== undefined) {
      value = target.checked;
    }
    
    const devices = [...this._config.devices];
    devices[index] = { ...devices[index], [field]: value };
    
    this._config = { ...this._config, devices };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _getAreas(): string[] {
    if (!this.hass) return [];
    
    // Get all unique areas from entities
    const areas = new Set<string>();
    
    Object.values(this.hass.areas || {}).forEach((area: any) => {
      if (area.name) {
        areas.add(area.name);
      }
    });

    // Also check entities for area_id references
    Object.values(this.hass.entities || {}).forEach((entity: any) => {
      if (entity.area_id && this.hass.areas?.[entity.area_id]) {
        areas.add(this.hass.areas[entity.area_id].name);
      }
    });

    return Array.from(areas).sort();
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html`<div class="error">Unable to load editor</div>`;
    }

    const entities = Object.keys(this.hass.states).sort();
    const areas = this._getAreas();
    
    const temperatureSensors = entities.filter(e => 
      e.includes('temperature') || 
      e.includes('temp') || 
      this.hass.states[e].attributes.device_class === 'temperature'
    );
    
    const humiditySensors = entities.filter(e => 
      e.includes('humidity') || 
      this.hass.states[e].attributes.device_class === 'humidity'
    );

    return html`
      <div class="card-config">
        <ha-textfield
          label="Area (Required)"
          .value=${this._config.area || ''}
          .configPath=${'area'}
          @input=${this._valueChanged}
          helper="The area this room card represents"
        ></ha-textfield>

        ${areas.length > 0 ? html`
          <ha-select
            naturalMenuWidth
            fixedMenuPosition
            label="Or select from available areas"
            .configPath=${'area'}
            .value=${this._config.area || ''}
            @selected=${this._valueChanged}
            @closed=${(e: Event) => e.stopPropagation()}
          >
            <ha-list-item value="">Select an area</ha-list-item>
            ${areas.map(area => html`
              <ha-list-item value=${area}>${area}</ha-list-item>
            `)}
          </ha-select>
        ` : ''}

        <ha-textfield
          label="Display Name (Optional)"
          .value=${this._config.name || ''}
          .configPath=${'name'}
          @input=${this._valueChanged}
          helper="Leave empty to use the area name"
        ></ha-textfield>

        <ha-textfield
          label="Icon (Optional)"
          .value=${this._config.icon || ''}
          .configPath=${'icon'}
          @input=${this._valueChanged}
          helper="MDI icon name (e.g., mdi:home)"
        ></ha-textfield>

        <ha-select
          naturalMenuWidth
          fixedMenuPosition
          label="Temperature Sensor"
          .configPath=${'temperature_sensor'}
          .value=${this._config.temperature_sensor || ''}
          @selected=${this._valueChanged}
          @closed=${(e: Event) => e.stopPropagation()}
        >
          <ha-list-item value="">None</ha-list-item>
          ${temperatureSensors.map(entity => html`
            <ha-list-item value=${entity}>
              ${this.hass.states[entity].attributes.friendly_name || entity}
            </ha-list-item>
          `)}
        </ha-select>

        <ha-select
          naturalMenuWidth
          fixedMenuPosition
          label="Humidity Sensor"
          .configPath=${'humidity_sensor'}
          .value=${this._config.humidity_sensor || ''}
          @selected=${this._valueChanged}
          @closed=${(e: Event) => e.stopPropagation()}
        >
          <ha-list-item value="">None</ha-list-item>
          ${humiditySensors.map(entity => html`
            <ha-list-item value=${entity}>
              ${this.hass.states[entity].attributes.friendly_name || entity}
            </ha-list-item>
          `)}
        </ha-select>

        <div class="switches">
          <ha-formfield label="Show Temperature">
            <ha-switch
              .checked=${this._config.show_temperature !== false}
              .configPath=${'show_temperature'}
              @change=${this._valueChanged}
            ></ha-switch>
          </ha-formfield>

          <ha-formfield label="Show Humidity">
            <ha-switch
              .checked=${this._config.show_humidity !== false}
              .configPath=${'show_humidity'}
              @change=${this._valueChanged}
            ></ha-switch>
          </ha-formfield>

          <ha-formfield label="Haptic Feedback">
            <ha-switch
              .checked=${this._config.haptic_feedback !== false}
              .configPath=${'haptic_feedback'}
              @change=${this._valueChanged}
            ></ha-switch>
          </ha-formfield>
        </div>

        <ha-select
          naturalMenuWidth
          fixedMenuPosition
          label="Temperature Unit"
          .configPath=${'temperature_unit'}
          .value=${this._config.temperature_unit || 'F'}
          @selected=${this._valueChanged}
          @closed=${(e: Event) => e.stopPropagation()}
        >
          <ha-list-item value="F">Fahrenheit</ha-list-item>
          <ha-list-item value="C">Celsius</ha-list-item>
        </ha-select>

        <div class="devices-header">
          <h3>Devices</h3>
          <ha-icon-button
            .path=${'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z'}
            @click=${this._addDevice}
          ></ha-icon-button>
        </div>

        ${this._config.devices?.map((device, index) => html`
          <div class="device-config">
            <div class="device-header">
              <span>Device ${index + 1}</span>
              <ha-icon-button
                .path=${'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z'}
                @click=${() => this._removeDevice(index)}
              ></ha-icon-button>
            </div>

            <ha-entity-picker
              .hass=${this.hass}
              .value=${device.entity}
              .field=${'entity'}
              @value-changed=${(e: any) => this._deviceValueChanged(e, index)}
              allow-custom-entity
            ></ha-entity-picker>

            <ha-textfield
              label="Attribute"
              .value=${device.attribute || ''}
              .field=${'attribute'}
              @input=${(e: any) => this._deviceValueChanged(e, index)}
              helper="e.g., brightness, volume_level, percentage"
            ></ha-textfield>

            <ha-textfield
              label="Icon"
              .value=${device.icon || ''}
              .field=${'icon'}
              @input=${(e: any) => this._deviceValueChanged(e, index)}
              helper="MDI icon name"
            ></ha-textfield>

            <ha-textfield
              label="Color"
              .value=${device.color || ''}
              .field=${'color'}
              @input=${(e: any) => this._deviceValueChanged(e, index)}
              helper="Hex color code (e.g., #FDD835)"
            ></ha-textfield>

            <ha-textfield
              label="Scale"
              type="number"
              .value=${device.scale || 100}
              .field=${'scale'}
              @input=${(e: any) => this._deviceValueChanged(e, index)}
              helper="Maximum value (255 for brightness, 1 for volume, 100 for percentage)"
            ></ha-textfield>

            <ha-select
              naturalMenuWidth
              fixedMenuPosition
              label="Control Type"
              .value=${device.type || 'continuous'}
              .field=${'type'}
              @selected=${(e: any) => this._deviceValueChanged(e, index)}
              @closed=${(e: Event) => e.stopPropagation()}
            >
              <ha-list-item value="continuous">Continuous (Slider)</ha-list-item>
              <ha-list-item value="discrete">Discrete (Modes)</ha-list-item>
            </ha-select>

            ${device.type === 'discrete' ? html`
              <div class="modes-section">
                <label>Discrete Modes (JSON format)</label>
                <ha-textfield
                  label="Modes JSON"
                  .value=${JSON.stringify(device.modes || [])}
                  @input=${(e: any) => {
                    try {
                      const modes = JSON.parse(e.target.value);
                      this._deviceValueChanged({ target: { field: 'modes', value: modes }}, index);
                    } catch (err) {
                      // Invalid JSON, ignore
                    }
                  }}
                  helper='[{"value":0,"label":"Off","percentage":0},{"value":0.5,"label":"Medium","percentage":50}]'
                ></ha-textfield>
              </div>
            ` : ''}
          </div>
        `) || ''}
      </div>
    `;
  }

  static get styles(): CSSResult {
    return css`
      .card-config {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 8px;
      }

      .error {
        color: var(--error-color);
        padding: 16px;
        text-align: center;
      }

      ha-textfield,
      ha-select,
      ha-entity-picker {
        width: 100%;
      }

      .switches {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      ha-formfield {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 0;
      }

      .devices-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 16px;
      }

      .devices-header h3 {
        margin: 0;
      }

      .device-config {
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .device-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-weight: 500;
      }

      .modes-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .modes-section label {
        font-size: 0.9em;
        font-weight: 500;
        color: var(--secondary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'room-card-editor': RoomCardEditor;
  }
}