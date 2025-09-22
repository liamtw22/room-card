import { LitElement, html, css, TemplateResult, CSSResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
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

@customElement('room-card-editor')
export class RoomCardEditor extends LitElement implements LovelaceCardEditor {
  @state() private _hass?: HomeAssistant;
  @state() private _config?: RoomCardConfig;
  @state() private _expandedSections: Record<string, boolean> = {
    basic: true,
    appearance: false,
    sensors: false,
    devices: false
  };
  @state() private _expandedDevices: Record<number, boolean> = {};

  // Setter for hass object - required for Home Assistant to pass the hass object
  set hass(hass: HomeAssistant) {
    this._hass = hass;
  }

  public setConfig(config: RoomCardConfig): void {
    this._config = { ...config };
    // Initialize background_type if not set
    if (!this._config.background_type) {
      this._config.background_type = this._config.temperature_sensor ? 'temperature' : 'solid';
    }
    // Initialize expanded state for existing devices
    if (this._config.devices) {
      this._config.devices.forEach((_, index) => {
        this._expandedDevices[index] = this._expandedDevices[index] ?? false;
      });
    }
  }

  private _valueChanged(ev: any): void {
    if (!this._config || !this._hass) return;

    const target = ev.target;
    const configPath = target?.configPath || target?.configValue || ev.currentTarget?.configPath;
    
    let value;
    
    // Handle different types of events
    if (ev.detail?.value !== undefined) {
      value = ev.detail.value;
    } else if (target?.checked !== undefined) {
      value = target.checked;
    } else if (target?.value !== undefined) {
      value = target.value;
    }
    
    if (configPath && value !== undefined) {
      const newConfig = { ...this._config };
      this._setPath(newConfig, configPath, value);
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

  // Helper method for device property changes
  private _handleDeviceChange(ev: any, index: number): void {
    if (!this._config?.devices) return;

    const target = ev.target as any;
    const configValue = target.configValue || ev.currentTarget?.configValue;
    const value = ev.detail?.value !== undefined ? ev.detail.value : 
                  target.checked !== undefined ? target.checked : 
                  target.value;

    if (configValue && value !== undefined) {
      const devices = [...this._config.devices];
      devices[index] = { ...devices[index], [configValue]: value };
      this._config = { ...this._config, devices };
      fireEvent(this, 'config-changed', { config: this._config });
    }
  }

  private _addDevice(): void {
    if (!this._config) return;
    
    const devices = [...(this._config.devices || [])];
    const newIndex = devices.length;
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
    this._expandedDevices[newIndex] = true;
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _removeDevice(index: number): void {
    if (!this._config?.devices) return;
    
    const devices = [...this._config.devices];
    devices.splice(index, 1);
    
    // Update expanded states
    const newExpanded: Record<number, boolean> = {};
    Object.keys(this._expandedDevices).forEach(key => {
      const keyIndex = parseInt(key);
      if (keyIndex < index) {
        newExpanded[keyIndex] = this._expandedDevices[keyIndex];
      } else if (keyIndex > index) {
        newExpanded[keyIndex - 1] = this._expandedDevices[keyIndex];
      }
    });
    this._expandedDevices = newExpanded;
    
    this._config = { ...this._config, devices };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _getAreas(): string[] {
    if (!this._hass) return [];
    
    const areas = new Set<string>();
    
    Object.values(this._hass.areas || {}).forEach((area: any) => {
      if (area.name) {
        areas.add(area.name);
      }
    });

    Object.values(this._hass.entities || {}).forEach((entity: any) => {
      if (entity.area_id && this._hass!.areas?.[entity.area_id]) {
        areas.add(this._hass!.areas[entity.area_id].name);
      }
    });

    return Array.from(areas).sort();
  }

  private _getEntityAttributes(entity: string): string[] {
    if (!this._hass || !entity) return ['brightness', 'volume_level', 'percentage'];
    
    const domain = entity.split('.')[0];
    const domainAttributes: Record<string, string[]> = {
      light: ['brightness', 'rgb_color', 'color_temp', 'effect'],
      media_player: ['volume_level', 'media_position', 'media_duration'],
      fan: ['percentage', 'preset_mode', 'speed'],
      climate: ['temperature', 'target_temp_high', 'target_temp_low', 'humidity'],
      cover: ['position', 'tilt_position'],
      vacuum: ['battery_level', 'fan_speed']
    };
    
    const defaultAttrs = domainAttributes[domain] || [];
    const stateObj = this._hass.states[entity];
    
    if (stateObj?.attributes) {
      const customAttrs = Object.keys(stateObj.attributes).filter(
        attr => !['friendly_name', 'icon', 'entity_id'].includes(attr)
      );
      return [...new Set([...defaultAttrs, ...customAttrs])];
    }
    
    return defaultAttrs.length > 0 ? defaultAttrs : ['brightness', 'volume_level', 'percentage'];
  }

  private _renderBasicSection(): TemplateResult {
    const areas = this._getAreas();
    
    return html`
      <ha-expansion-panel
        .header=${'Basic Configuration'}
        .expanded=${this._expandedSections.basic}
        @expanded-changed=${(e: any) => this._expandedSections.basic = e.detail.expanded}
      >
        <div class="section-content">
          <ha-combo-box
            label="Area (Required)"
            .value=${this._config!.area || ''}
            .configValue=${'area'}
            .items=${areas.map(area => ({ value: area, label: area }))}
            item-value-path="value"
            item-label-path="label"
            @value-changed=${this._valueChanged}
            allow-custom-value
          ></ha-combo-box>

          <ha-textfield
            label="Display Name (Optional)"
            .value=${this._config!.name || ''}
            .configValue=${'name'}
            @input=${this._valueChanged}
            helper="Leave empty to use the area name"
          ></ha-textfield>

          <ha-formfield label="Haptic Feedback">
            <ha-switch
              .checked=${this._config!.haptic_feedback !== false}
              .configValue=${'haptic_feedback'}
              @change=${this._valueChanged}
            ></ha-switch>
          </ha-formfield>
        </div>
      </ha-expansion-panel>
    `;
  }

  private _renderAppearanceSection(): TemplateResult {
    return html`
      <ha-expansion-panel
        .header=${'Appearance'}
        .expanded=${this._expandedSections.appearance}
        @expanded-changed=${(e: any) => this._expandedSections.appearance = e.detail.expanded}
      >
        <div class="section-content">
          <ha-icon-picker
            label="Icon"
            .value=${this._config!.icon || 'mdi:home'}
            .configValue=${'icon'}
            @value-changed=${this._valueChanged}
          ></ha-icon-picker>

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
              .configValue=${'icon_color'}
              @input=${this._valueChanged}
              helper="Hex color code"
            ></ha-textfield>
          ` : html`
            <ha-entity-picker
              .hass=${this._hass}
              .value=${(this._config!.icon_color as any)?.entity || ''}
              .configValue=${'icon_color.entity'}
              @value-changed=${this._valueChanged}
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
              .configValue=${'icon_background_color'}
              @input=${this._valueChanged}
              helper="Hex or rgba color"
            ></ha-textfield>
          ` : html`
            <ha-entity-picker
              .hass=${this._hass}
              .value=${(this._config!.icon_background_color as any)?.entity || ''}
              .configValue=${'icon_background_color.entity'}
              @value-changed=${this._valueChanged}
              allow-custom-entity
              label="Icon Background Entity"
            ></ha-entity-picker>
          `}

          <ha-select
            naturalMenuWidth
            fixedMenuPosition
            label="Background Type"
            .configValue=${'background_type'}
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
              .configValue=${'background_color'}
              @input=${this._valueChanged}
              helper="Hex color code (e.g., #353535)"
            ></ha-textfield>
          ` : ''}

          ${this._config!.background_type === 'entity' ? html`
            <ha-entity-picker
              .hass=${this._hass}
              .value=${this._config!.background_entity || ''}
              .configValue=${'background_entity'}
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
                    this._valueChanged({ target: { configValue: 'background_state_colors', value: colors }});
                  } catch (err) {
                    // Invalid JSON, ignore
                  }
                }}
                helper='{"on": "#FDD835", "off": "#353535", "home": "#4CAF50"}'
              ></ha-textfield>
            </div>
          ` : ''}
        </div>
      </ha-expansion-panel>
    `;
  }

  private _renderSensorsSection(): TemplateResult {
    if (!this._hass) {
      return html`<div class="section-content">Loading sensors...</div>`;
    }

    return html`
      <ha-expansion-panel
        .header=${'Sensors'}
        .expanded=${this._expandedSections.sensors}
        @expanded-changed=${(e: any) => this._expandedSections.sensors = e.detail.expanded}
      >
        <div class="section-content">
          <ha-entity-picker
            .hass=${this._hass}
            .value=${this._config!.temperature_sensor || ''}
            .configValue=${'temperature_sensor'}
            @value-changed=${this._valueChanged}
            .includeDomains=${['sensor']}
            .includeDeviceClasses=${['temperature']}
            allow-custom-entity
            label="Temperature Sensor"
          ></ha-entity-picker>

          <ha-entity-picker
            .hass=${this._hass}
            .value=${this._config!.humidity_sensor || ''}
            .configValue=${'humidity_sensor'}
            @value-changed=${this._valueChanged}
            .includeDomains=${['sensor']}
            .includeDeviceClasses=${['humidity']}
            allow-custom-entity
            label="Humidity Sensor"
          ></ha-entity-picker>

          <ha-formfield label="Show Temperature">
            <ha-switch
              .checked=${this._config!.show_temperature !== false}
              .configValue=${'show_temperature'}
              @change=${this._valueChanged}
            ></ha-switch>
          </ha-formfield>

          <ha-formfield label="Show Humidity">
            <ha-switch
              .checked=${this._config!.show_humidity !== false}
              .configValue=${'show_humidity'}
              @change=${this._valueChanged}
            ></ha-switch>
          </ha-formfield>

          <ha-select
            naturalMenuWidth
            fixedMenuPosition
            label="Temperature Unit"
            .configValue=${'temperature_unit'}
            .value=${this._config!.temperature_unit || 'F'}
            @selected=${this._valueChanged}
            @closed=${(e: Event) => e.stopPropagation()}
          >
            <ha-list-item value="F">Fahrenheit</ha-list-item>
            <ha-list-item value="C">Celsius</ha-list-item>
          </ha-select>
        </div>
      </ha-expansion-panel>
    `;
  }

  private _renderDevicesSection(): TemplateResult {
    if (!this._hass) {
      return html`<div class="section-content">Loading devices...</div>`;
    }

    return html`
      <ha-expansion-panel
        .header=${'Devices'}
        .expanded=${this._expandedSections.devices}
        @expanded-changed=${(e: any) => this._expandedSections.devices = e.detail.expanded}
      >
        <div class="section-content">
          <div class="devices-header">
            <h3>Device Configuration</h3>
            <ha-icon-button
              .path=${'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z'}
              @click=${this._addDevice}
            ></ha-icon-button>
          </div>

          ${this._config!.devices?.map((device, index) => {
            const entityAttrs = this._getEntityAttributes(device.entity);
            
            return html`
              <ha-expansion-panel
                .header=${`Device ${index + 1}: ${device.entity || 'Not configured'}`}
                .expanded=${this._expandedDevices[index] || false}
                @expanded-changed=${(e: any) => this._expandedDevices[index] = e.detail.expanded}
                .secondary=${html`
                  <ha-icon-button
                    .path=${'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z'}
                    @click=${(e: Event) => {
                      e.stopPropagation();
                      this._removeDevice(index);
                    }}
                  ></ha-icon-button>
                `}
              >
                <div class="device-content">
                  <ha-entity-picker
                    .hass=${this._hass}
                    .value=${device.entity || ''}
                    .configValue=${'entity'}
                    @value-changed=${(e: any) => this._handleDeviceChange(e, index)}
                    allow-custom-entity
                    label="Display Entity"
                  ></ha-entity-picker>

                  <ha-entity-picker
                    .hass=${this._hass}
                    .value=${device.control_entity || ''}
                    .configValue=${'control_entity'}
                    @value-changed=${(e: any) => this._handleDeviceChange(e, index)}
                    allow-custom-entity
                    label="Control Entity (Optional)"
                    helper="Leave empty to use display entity"
                  ></ha-entity-picker>

                  <ha-select
                    naturalMenuWidth
                    fixedMenuPosition
                    label="Attribute"
                    .value=${device.attribute || 'brightness'}
                    .configValue=${'attribute'}
                    @selected=${(e: any) => this._handleDeviceChange(e, index)}
                    @closed=${(e: Event) => e.stopPropagation()}
                  >
                    ${entityAttrs.map(attr => html`
                      <ha-list-item value=${attr}>${attr}</ha-list-item>
                    `)}
                  </ha-select>

                  <ha-icon-picker
                    label="Icon"
                    .value=${device.icon || 'mdi:lightbulb'}
                    .configValue=${'icon'}
                    @value-changed=${(e: any) => this._handleDeviceChange(e, index)}
                  ></ha-icon-picker>

                  <ha-select
                    naturalMenuWidth
                    fixedMenuPosition
                    label="Color"
                    .value=${device.color === 'light-color' ? 'light-color' : 'custom'}
                    @selected=${(e: any) => {
                      const value = e.target.value === 'light-color' ? 'light-color' : '#FDD835';
                      this._handleDeviceChange({ 
                        target: { configValue: 'color' },
                        detail: { value }
                      }, index);
                    }}
                    @closed=${(e: Event) => e.stopPropagation()}
                  >
                    <ha-list-item value="custom">Custom Color</ha-list-item>
                    ${device.entity && device.entity.startsWith('light.') ? html`
                      <ha-list-item value="light-color">Use Light Color</ha-list-item>
                    ` : ''}
                  </ha-select>

                  ${device.color !== 'light-color' ? html`
                    <ha-textfield
                      label="Custom Color"
                      .value=${typeof device.color === 'string' ? device.color : '#FDD835'}
                      .configValue=${'color'}
                      @input=${(e: any) => this._handleDeviceChange(e, index)}
                      helper="Hex color code (e.g., #FDD835)"
                    ></ha-textfield>
                  ` : ''}

                  <ha-textfield
                    label="Scale"
                    type="number"
                    .value=${device.scale || 100}
                    .configValue=${'scale'}
                    @input=${(e: any) => this._handleDeviceChange(e, index)}
                    helper="Maximum value (255 for brightness, 1 for volume, 100 for percentage)"
                  ></ha-textfield>

                  <ha-select
                    naturalMenuWidth
                    fixedMenuPosition
                    label="Control Type"
                    .value=${device.type || 'continuous'}
                    .configValue=${'type'}
                    @selected=${(e: any) => this._handleDeviceChange(e, index)}
                    @closed=${(e: Event) => e.stopPropagation()}
                  >
                    <ha-list-item value="continuous">Continuous (Slider)</ha-list-item>
                    <ha-list-item value="discrete">Discrete (Modes)</ha-list-item>
                  </ha-select>

                  <div class="device-toggles">
                    <ha-formfield label="Show Slider">
                      <ha-switch
                        .checked=${device.show_slider !== false}
                        .configValue=${'show_slider'}
                        @change=${(e: any) => this._handleDeviceChange(e, index)}
                      ></ha-switch>
                    </ha-formfield>

                    <ha-formfield label="Show Chip">
                      <ha-switch
                        .checked=${device.show_chip !== false}
                        .configValue=${'show_chip'}
                        @change=${(e: any) => this._handleDeviceChange(e, index)}
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
                            this._handleDeviceChange({ 
                              target: { configValue: 'modes' },
                              detail: { value: modes }
                            }, index);
                          } catch (err) {
                            // Invalid JSON, ignore
                          }
                        }}
                        helper='[{"value":0,"label":"Off","percentage":0},{"value":0.5,"label":"Medium","percentage":50}]'
                      ></ha-textfield>
                    </div>
                  ` : ''}
                </div>
              </ha-expansion-panel>
            `;
          }) || ''}
        </div>
      </ha-expansion-panel>
    `;
  }

  protected render(): TemplateResult {
    if (!this._hass || !this._config) {
      return html`<div class="error">Unable to load editor</div>`;
    }

    return html`
      <div class="card-config">
        ${this._renderBasicSection()}
        ${this._renderAppearanceSection()}
        ${this._renderSensorsSection()}
        ${this._renderDevicesSection()}
      </div>
    `;
  }

  static get styles(): CSSResult {
    return css`
      .card-config {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .section-content,
      .device-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 16px;
      }

      .error {
        color: var(--error-color);
        padding: 16px;
        text-align: center;
      }

      ha-textfield,
      ha-select,
      ha-entity-picker,
      ha-combo-box,
      ha-icon-picker {
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
      }

      .devices-header h3 {
        margin: 0;
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

      ha-expansion-panel {
        --ha-card-border-radius: 4px;
        --expansion-panel-content-padding: 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'room-card-editor': RoomCardEditor;
  }
}