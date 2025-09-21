import { LitElement, html, css, TemplateResult, CSSResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardEditor, fireEvent } from 'custom-card-helpers';

export interface RoomCardConfig {
  type: 'custom:room-card';
  area: string;
  name?: string;
  icon?: string;
  icon_color?: string | { entity: string; attribute?: string };
  icon_background_color?: string | { entity: string; attribute?: string };
  background_type?: 'temperature' | 'solid' | 'entity';
  background_color?: string;
  background_entity?: string;
  background_state_colors?: Record<string, string>;
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
  control_entity?: string;
  attribute?: string;
  icon?: string;
  color?: string | 'light-color';
  scale?: number;
  type?: 'continuous' | 'discrete';
  modes?: DeviceMode[];
  show_slider?: boolean;
  show_chip?: boolean;
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

// Common MDI icons for rooms
const COMMON_MDI_ICONS = [
  'mdi:home', 'mdi:sofa', 'mdi:bed', 'mdi:silverware-fork-knife', 
  'mdi:toilet', 'mdi:shower', 'mdi:desk', 'mdi:garage',
  'mdi:lightbulb', 'mdi:speaker', 'mdi:air-purifier', 'mdi:fan',
  'mdi:thermometer', 'mdi:water-percent', 'mdi:television',
  'mdi:alpha-l-box', 'mdi:door', 'mdi:window-open', 'mdi:flower'
];

// Common entity attributes
const ENTITY_ATTRIBUTES = {
  light: ['brightness', 'rgb_color', 'color_temp', 'effect'],
  media_player: ['volume_level', 'media_position', 'media_duration'],
  fan: ['percentage', 'preset_mode', 'speed'],
  climate: ['temperature', 'target_temp_high', 'target_temp_low', 'humidity'],
  cover: ['position', 'tilt_position'],
  vacuum: ['battery_level', 'fan_speed']
};

@customElement('room-card-editor')
export class RoomCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: RoomCardConfig;
  @state() private _iconSearch = '';
  @state() private _deviceIconSearch: Record<number, string> = {};

  public setConfig(config: RoomCardConfig): void {
    this._config = { ...config };
    // Initialize background_type if not set
    if (!this._config.background_type) {
      this._config.background_type = this._config.temperature_sensor ? 'temperature' : 'solid';
    }
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
      control_entity: '',
      attribute: 'brightness',
      icon: 'mdi:lightbulb',
      color: '#FDD835',
      scale: 255,
      type: 'continuous',
      show_slider: true,
      show_chip: true
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
    
    const areas = new Set<string>();
    
    Object.values(this.hass.areas || {}).forEach((area: any) => {
      if (area.name) {
        areas.add(area.name);
      }
    });

    Object.values(this.hass.entities || {}).forEach((entity: any) => {
      if (entity.area_id && this.hass.areas?.[entity.area_id]) {
        areas.add(this.hass.areas[entity.area_id].name);
      }
    });

    return Array.from(areas).sort();
  }

  private _getEntityAttributes(entity: string): string[] {
    if (!this.hass || !entity) return [];
    
    const domain = entity.split('.')[0];
    const defaultAttrs = ENTITY_ATTRIBUTES[domain as keyof typeof ENTITY_ATTRIBUTES] || [];
    
    const stateObj = this.hass.states[entity];
    if (stateObj?.attributes) {
      const customAttrs = Object.keys(stateObj.attributes).filter(
        attr => !['friendly_name', 'icon', 'entity_id'].includes(attr)
      );
      return [...new Set([...defaultAttrs, ...customAttrs])];
    }
    
    return defaultAttrs;
  }

  private _getFilteredIcons(search: string): string[] {
    if (!search) return COMMON_MDI_ICONS;
    const searchLower = search.toLowerCase();
    return COMMON_MDI_ICONS.filter(icon => 
      icon.toLowerCase().includes(searchLower)
    );
  }

  private _renderBackgroundConfig(): TemplateResult {
    const entities = Object.keys(this.hass.states).sort();
    
    return html`
      <ha-select
        naturalMenuWidth
        fixedMenuPosition
        label="Background Type"
        .configPath=${'background_type'}
        .value=${this._config!.background_type || 'temperature'}
        @selected=${this._valueChanged}
        @closed=${(e: Event) => e.stopPropagation()}
      >
        <ha-list-item value="temperature">Temperature-based</ha-list-item>
        <ha-list-item value="solid">Solid Color</ha-list-item>
        <ha-list-item value="entity">Entity State</ha-list-item>
      </ha-select>

      ${this._config!.background_type === 'solid' ? html`
        <ha-textfield
          label="Background Color"
          .value=${this._config!.background_color || '#353535'}
          .configPath=${'background_color'}
          @input=${this._valueChanged}
          helper="Hex color code (e.g., #353535)"
        ></ha-textfield>
      ` : ''}

      ${this._config!.background_type === 'entity' ? html`
        <ha-entity-picker
          .hass=${this.hass}
          .value=${this._config!.background_entity || ''}
          .configPath=${'background_entity'}
          @value-changed=${this._valueChanged}
          allow-custom-entity
          label="Background Entity"
        ></ha-entity-picker>
        
        <div class="state-colors">
          <label>State Colors (JSON format)</label>
          <ha-textfield
            label="State to Color Mapping"
            .value=${JSON.stringify(this._config!.background_state_colors || { "on": "#FDD835", "off": "#353535" })}
            @input=${(e: any) => {
              try {
                const colors = JSON.parse(e.target.value);
                this._valueChanged({ target: { configPath: 'background_state_colors', value: colors }});
              } catch (err) {
                // Invalid JSON, ignore
              }
            }}
            helper='{"on": "#FDD835", "off": "#353535", "home": "#4CAF50"}'
          ></ha-textfield>
        </div>
      ` : ''}
    `;
  }

  private _renderIconConfig(): TemplateResult {
    const filteredIcons = this._getFilteredIcons(this._iconSearch);
    
    return html`
      <div class="icon-picker">
        <ha-textfield
          label="Icon"
          .value=${this._config!.icon || ''}
          .configPath=${'icon'}
          @input=${(e: any) => {
            this._iconSearch = e.target.value;
            this._valueChanged(e);
          }}
          helper="MDI icon name (e.g., mdi:home)"
        ></ha-textfield>
        
        ${this._iconSearch && filteredIcons.length > 0 ? html`
          <div class="icon-suggestions">
            ${filteredIcons.slice(0, 5).map(icon => html`
              <div class="icon-suggestion" @click=${() => {
                this._config = { ...this._config!, icon };
                this._iconSearch = '';
                fireEvent(this, 'config-changed', { config: this._config });
              }}>
                <ha-icon icon="${icon}"></ha-icon>
                <span>${icon}</span>
              </div>
            `)}
          </div>
        ` : ''}
      </div>

      <ha-select
        naturalMenuWidth
        fixedMenuPosition
        label="Icon Color Type"
        .value=${typeof this._config!.icon_color === 'object' ? 'entity' : 'solid'}
        @selected=${(e: any) => {
          if (e.target.value === 'solid') {
            this._config = { ...this._config!, icon_color: '#FFFFFF' };
          } else {
            this._config = { ...this._config!, icon_color: { entity: '' } };
          }
          fireEvent(this, 'config-changed', { config: this._config });
        }}
        @closed=${(e: Event) => e.stopPropagation()}
      >
        <ha-list-item value="solid">Solid Color</ha-list-item>
        <ha-list-item value="entity">Entity-based</ha-list-item>
      </ha-select>

      ${typeof this._config!.icon_color === 'string' ? html`
        <ha-textfield
          label="Icon Color"
          .value=${this._config!.icon_color || '#FFFFFF'}
          .configPath=${'icon_color'}
          @input=${this._valueChanged}
          helper="Hex color code"
        ></ha-textfield>
      ` : html`
        <ha-entity-picker
          .hass=${this.hass}
          .value=${(this._config!.icon_color as any)?.entity || ''}
          @value-changed=${(e: any) => {
            this._config = { 
              ...this._config!, 
              icon_color: { 
                ...(this._config!.icon_color as any),
                entity: e.detail.value 
              }
            };
            fireEvent(this, 'config-changed', { config: this._config });
          }}
          allow-custom-entity
          label="Icon Color Entity"
        ></ha-entity-picker>
      `}

      <ha-select
        naturalMenuWidth
        fixedMenuPosition
        label="Icon Background Type"
        .value=${typeof this._config!.icon_background_color === 'object' ? 'entity' : 'solid'}
        @selected=${(e: any) => {
          if (e.target.value === 'solid') {
            this._config = { ...this._config!, icon_background_color: 'rgba(255, 255, 255, 0.2)' };
          } else {
            this._config = { ...this._config!, icon_background_color: { entity: '' } };
          }
          fireEvent(this, 'config-changed', { config: this._config });
        }}
        @closed=${(e: Event) => e.stopPropagation()}
      >
        <ha-list-item value="solid">Solid Color</ha-list-item>
        <ha-list-item value="entity">Entity-based</ha-list-item>
      </ha-select>

      ${typeof this._config!.icon_background_color === 'string' ? html`
        <ha-textfield
          label="Icon Background Color"
          .value=${this._config!.icon_background_color || 'rgba(255, 255, 255, 0.2)'}
          .configPath=${'icon_background_color'}
          @input=${this._valueChanged}
          helper="Hex or rgba color"
        ></ha-textfield>
      ` : html`
        <ha-entity-picker
          .hass=${this.hass}
          .value=${(this._config!.icon_background_color as any)?.entity || ''}
          @value-changed=${(e: any) => {
            this._config = { 
              ...this._config!, 
              icon_background_color: { 
                ...(this._config!.icon_background_color as any),
                entity: e.detail.value 
              }
            };
            fireEvent(this, 'config-changed', { config: this._config });
          }}
          allow-custom-entity
          label="Icon Background Entity"
        ></ha-entity-picker>
      `}
    `;
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
        <ha-combo-box
          label="Area (Required)"
          .value=${this._config.area || ''}
          .configPath=${'area'}
          .items=${areas.map(area => ({ value: area, label: area }))}
          item-value-path="value"
          item-label-path="label"
          @value-changed=${this._valueChanged}
          allow-custom-value
        ></ha-combo-box>

        <ha-textfield
          label="Display Name (Optional)"
          .value=${this._config.name || ''}
          .configPath=${'name'}
          @input=${this._valueChanged}
          helper="Leave empty to use the area name"
        ></ha-textfield>

        ${this._renderIconConfig()}
        ${this._renderBackgroundConfig()}

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

        ${this._config.devices?.map((device, index) => {
          const filteredDeviceIcons = this._getFilteredIcons(this._deviceIconSearch[index] || '');
          const entityAttrs = this._getEntityAttributes(device.entity);
          
          return html`
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
              label="Display Entity"
            ></ha-entity-picker>

            <ha-entity-picker
              .hass=${this.hass}
              .value=${device.control_entity || device.entity}
              .field=${'control_entity'}
              @value-changed=${(e: any) => this._deviceValueChanged(e, index)}
              allow-custom-entity
              label="Control Entity (Optional)"
              helper="Leave empty to use display entity"
            ></ha-entity-picker>

            <ha-select
              naturalMenuWidth
              fixedMenuPosition
              label="Attribute"
              .value=${device.attribute || 'brightness'}
              .field=${'attribute'}
              @selected=${(e: any) => this._deviceValueChanged(e, index)}
              @closed=${(e: Event) => e.stopPropagation()}
            >
              ${entityAttrs.map(attr => html`
                <ha-list-item value=${attr}>${attr}</ha-list-item>
              `)}
            </ha-select>

            <div class="icon-picker">
              <ha-textfield
                label="Icon"
                .value=${device.icon || ''}
                .field=${'icon'}
                @input=${(e: any) => {
                  this._deviceIconSearch = { ...this._deviceIconSearch, [index]: e.target.value };
                  this._deviceValueChanged(e, index);
                }}
                helper="MDI icon name"
              ></ha-textfield>
              
              ${this._deviceIconSearch[index] && filteredDeviceIcons.length > 0 ? html`
                <div class="icon-suggestions">
                  ${filteredDeviceIcons.slice(0, 5).map(icon => html`
                    <div class="icon-suggestion" @click=${() => {
                      const devices = [...this._config!.devices!];
                      devices[index] = { ...devices[index], icon };
                      this._config = { ...this._config!, devices };
                      this._deviceIconSearch = { ...this._deviceIconSearch, [index]: '' };
                      fireEvent(this, 'config-changed', { config: this._config });
                    }}>
                      <ha-icon icon="${icon}"></ha-icon>
                      <span>${icon}</span>
                    </div>
                  `)}
                </div>
              ` : ''}
            </div>

            <ha-select
              naturalMenuWidth
              fixedMenuPosition
              label="Color"
              .value=${device.color === 'light-color' ? 'light-color' : 'custom'}
              @selected=${(e: any) => {
                const value = e.target.value === 'light-color' ? 'light-color' : '#FDD835';
                this._deviceValueChanged({ target: { field: 'color', value }}, index);
              }}
              @closed=${(e: Event) => e.stopPropagation()}
            >
              <ha-list-item value="custom">Custom Color</ha-list-item>
              ${device.entity.startsWith('light.') ? html`
                <ha-list-item value="light-color">Use Light Color</ha-list-item>
              ` : ''}
            </ha-select>

            ${device.color !== 'light-color' ? html`
              <ha-textfield
                label="Custom Color"
                .value=${device.color || '#FDD835'}
                .field=${'color'}
                @input=${(e: any) => this._deviceValueChanged(e, index)}
                helper="Hex color code (e.g., #FDD835)"
              ></ha-textfield>
            ` : ''}

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

            <div class="device-toggles">
              <ha-formfield label="Show Slider">
                <ha-switch
                  .checked=${device.show_slider !== false}
                  @change=${(e: any) => {
                    this._deviceValueChanged({ 
                      target: { field: 'show_slider', checked: e.target.checked }
                    }, index);
                  }}
                ></ha-switch>
              </ha-formfield>

              <ha-formfield label="Show Chip">
                <ha-switch
                  .checked=${device.show_chip !== false}
                  @change=${(e: any) => {
                    this._deviceValueChanged({ 
                      target: { field: 'show_chip', checked: e.target.checked }
                    }, index);
                  }}
                ></ha-switch>
              </ha-formfield>
            </div>

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
        `}) || ''}
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
      ha-entity-picker,
      ha-combo-box {
        width: 100%;
      }

      .switches,
      .device-toggles {
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

      .modes-section,
      .state-colors {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .modes-section label,
      .state-colors label {
        font-size: 0.9em;
        font-weight: 500;
        color: var(--secondary-text-color);
      }

      .icon-picker {
        position: relative;
      }

      .icon-suggestions {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--card-background-color);
        border: 1px solid var(--divider-color);
        border-radius: 4px;
        margin-top: 4px;
        z-index: 10;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }

      .icon-suggestion {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        cursor: pointer;
        transition: background 0.2s;
      }

      .icon-suggestion:hover {
        background: var(--secondary-background-color);
      }

      .icon-suggestion ha-icon {
        --mdc-icon-size: 20px;
      }

      .icon-suggestion span {
        font-size: 0.9em;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'room-card-editor': RoomCardEditor;
  }
}