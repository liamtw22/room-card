import { LitElement, html, css, TemplateResult, CSSResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { RoomCardConfig, DeviceConfig, DeviceMode } from './room-card';

@customElement('room-card-editor')
export class RoomCardEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config?: RoomCardConfig;
  @state() private _helpers?: any;
  @state() private _expandedSections = {
    basic: true,
    appearance: false,
    temperature: false,
    devices: false
  };

  public setConfig(config: RoomCardConfig): void {
    this._config = config;
    this._loadHelpers();
  }

  private async _loadHelpers(): Promise<void> {
    this._helpers = await (window as any).loadCardHelpers();
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <div class="card-config">
        ${this._renderBasicSection()}
        ${this._renderAppearanceSection()}
        ${this._renderTemperatureSection()}
        ${this._renderDevicesSection()}
      </div>
    `;
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
          <ha-selector
            .hass=${this.hass}
            .selector=${{ area: {} }}
            .value=${this._config!.area}
            .label=${'Area'}
            .required=${true}
            @value-changed=${(e: any) => this._valueChanged({
              target: { configValue: 'area' },
              detail: { value: e.detail.value }
            })}
          ></ha-selector>

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
    const iconColorType = typeof this._config!.icon_color === 'object' ? 
      'temperature' : (this._config!.icon_color === 'auto' ? 'auto' : 'custom');

    return html`
      <ha-expansion-panel
        .header=${'Appearance'}
        .expanded=${this._expandedSections.appearance}
        @expanded-changed=${(e: any) => this._expandedSections.appearance = e.detail.expanded}
      >
        <div class="section-content">
          <!-- Icon Selector using proper HA selector -->
          <ha-selector
            .hass=${this.hass}
            .selector=${{ icon: {} }}
            .value=${this._config!.icon || 'mdi:home'}
            .label=${'Icon'}
            @value-changed=${(e: any) => this._valueChanged({
              target: { configValue: 'icon' },
              detail: { value: e.detail.value }
            })}
          ></ha-selector>

          <ha-select
            naturalMenuWidth
            fixedMenuPosition
            label="Icon Color Type"
            .value=${iconColorType}
            @selected=${(e: any) => this._handleIconColorTypeChange(e.target.value)}
            @closed=${(e: Event) => e.stopPropagation()}
          >
            <ha-list-item value="auto">Automatic</ha-list-item>
            <ha-list-item value="custom">Custom Color</ha-list-item>
            <ha-list-item value="temperature">Temperature-based</ha-list-item>
          </ha-select>

          ${iconColorType === 'custom' ? html`
            <!-- RGB Color Selector using proper HA selector -->
            <ha-selector
              .hass=${this.hass}
              .selector=${{ color_rgb: {} }}
              .value=${this._parseColorToRGB(this._config!.icon_color as string)}
              .label=${'Icon Color'}
              @value-changed=${(e: any) => {
                const rgb = e.detail.value;
                const hex = this._rgbToHex(rgb);
                this._valueChanged({
                  target: { configValue: 'icon_color' },
                  detail: { value: hex }
                });
              }}
            ></ha-selector>
          ` : ''}

          ${iconColorType === 'temperature' ? html`
            <div class="state-colors">
              <label>Temperature-based Colors</label>
              ${['cold', 'cool', 'comfortable', 'warm', 'hot'].map(state => html`
                <ha-selector
                  .hass=${this.hass}
                  .selector=${{ color_rgb: {} }}
                  .value=${this._parseColorToRGB(
                    (this._config!.icon_color as any)?.[state] || this._getDefaultTemperatureColor(state)
                  )}
                  .label=${state.charAt(0).toUpperCase() + state.slice(1)}
                  @value-changed=${(e: any) => {
                    const rgb = e.detail.value;
                    const hex = this._rgbToHex(rgb);
                    const iconColor = typeof this._config!.icon_color === 'object' ? 
                      { ...this._config!.icon_color } : {};
                    iconColor[state] = hex;
                    this._updateConfig({ icon_color: iconColor });
                  }}
                ></ha-selector>
              `)}
            </div>
          ` : ''}
        </div>
      </ha-expansion-panel>
    `;
  }

  private _renderTemperatureSection(): TemplateResult {
    return html`
      <ha-expansion-panel
        .header=${'Temperature & Humidity'}
        .expanded=${this._expandedSections.temperature}
        @expanded-changed=${(e: any) => this._expandedSections.temperature = e.detail.expanded}
      >
        <div class="section-content">
          <ha-entity-picker
            .hass=${this.hass}
            .value=${this._config!.temperature_sensor || ''}
            .configValue=${'temperature_sensor'}
            @value-changed=${this._valueChanged}
            .includeDomains=${['sensor']}
            .includeDeviceClasses=${['temperature']}
            allow-custom-entity
            label="Temperature Sensor"
          ></ha-entity-picker>

          <ha-entity-picker
            .hass=${this.hass}
            .value=${this._config!.humidity_sensor || ''}
            .configValue=${'humidity_sensor'}
            @value-changed=${this._valueChanged}
            .includeDomains=${['sensor']}
            .includeDeviceClasses=${['humidity']}
            allow-custom-entity
            label="Humidity Sensor"
          ></ha-entity-picker>

          <div class="switches">
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
          </div>

          <ha-select
            naturalMenuWidth
            fixedMenuPosition
            label="Temperature Unit"
            .value=${this._config!.temperature_unit || 'F'}
            .configValue=${'temperature_unit'}
            @selected=${this._valueChanged}
            @closed=${(e: Event) => e.stopPropagation()}
          >
            <ha-list-item value="C">Celsius</ha-list-item>
            <ha-list-item value="F">Fahrenheit</ha-list-item>
          </ha-select>

          <div class="state-colors">
            <label>Background Colors by Temperature</label>
            ${['cold', 'cool', 'comfortable', 'warm', 'hot'].map(state => html`
              <ha-selector
                .hass=${this.hass}
                .selector=${{ color_rgb: {} }}
                .value=${this._parseColorToRGB(
                  this._config!.background_colors?.[state] || this._getDefaultBackgroundColor(state)
                )}
                .label=${state.charAt(0).toUpperCase() + state.slice(1)}
                @value-changed=${(e: any) => {
                  const rgb = e.detail.value;
                  const hex = this._rgbToHex(rgb);
                  const backgroundColors = { ...this._config!.background_colors };
                  backgroundColors[state] = hex;
                  this._updateConfig({ background_colors: backgroundColors });
                }}
              ></ha-selector>
            `)}
          </div>
        </div>
      </ha-expansion-panel>
    `;
  }

  private _renderDevicesSection(): TemplateResult {
    const devices = this._config!.devices || [];

    return html`
      <ha-expansion-panel
        .header=${'Devices'}
        .expanded=${this._expandedSections.devices}
        @expanded-changed=${(e: any) => this._expandedSections.devices = e.detail.expanded}
      >
        <div class="section-content">
          <div class="devices-header">
            <h3>Devices</h3>
            <ha-icon-button
              @click=${this._addDevice}
              .path=${'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z'}
            ></ha-icon-button>
          </div>

          ${devices.map((device, index) => this._renderDevice(device, index))}
        </div>
      </ha-expansion-panel>
    `;
  }

  private _renderDevice(device: DeviceConfig, index: number): TemplateResult {
    const entityAttrs = device.entity ? this._getEntityAttributes(device.entity) : [];
    const isLightEntity = device.entity?.startsWith('light.');

    return html`
      <ha-card outlined>
        <ha-expansion-panel
          .header=${device.entity || 'New Device'}
          .secondary=${device.attribute || 'brightness'}
        >
          <div class="device-config">
            <ha-icon-button-arrow-prev
              slot="icons"
              @click=${() => this._removeDevice(index)}
            ></ha-icon-button-arrow-prev>

            <!-- Device Selector using proper HA selector for the device entity -->
            <ha-selector
              .hass=${this.hass}
              .selector=${{ device: { 
                multiple: false,
                entity: [
                  { domain: 'light' },
                  { domain: 'switch' },
                  { domain: 'fan' },
                  { domain: 'climate' },
                  { domain: 'media_player' },
                  { domain: 'cover' }
                ]
              }}}
              .value=${this._getDeviceFromEntity(device.entity)}
              .label=${'Device'}
              @value-changed=${(e: any) => {
                // Get first entity from the device
                const deviceId = e.detail.value;
                if (deviceId && this.hass) {
                  const deviceEntities = Object.values(this.hass.entities)
                    .filter((entity: any) => entity.device_id === deviceId);
                  if (deviceEntities.length > 0) {
                    this._handleDeviceChange({
                      target: { configValue: 'entity' },
                      detail: { value: deviceEntities[0].entity_id }
                    }, index);
                  }
                }
              }}
            ></ha-selector>

            <!-- Or use entity picker as fallback -->
            <ha-entity-picker
              .hass=${this.hass}
              .value=${device.entity || ''}
              .configValue=${'entity'}
              @value-changed=${(e: any) => this._handleDeviceChange(e, index)}
              allow-custom-entity
              label="Entity (Alternative)"
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

            <!-- Icon Selector using proper HA selector -->
            <ha-selector
              .hass=${this.hass}
              .selector=${{ icon: {} }}
              .value=${device.icon || 'mdi:lightbulb'}
              .label=${'Icon'}
              @value-changed=${(e: any) => this._handleDeviceChange({
                target: { configValue: 'icon' },
                detail: { value: e.detail.value }
              }, index)}
            ></ha-selector>

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
              ${isLightEntity ? html`
                <ha-list-item value="light-color">Use Light Color</ha-list-item>
              ` : ''}
            </ha-select>

            ${device.color !== 'light-color' ? html`
              <!-- RGB Color Selector using proper HA selector -->
              <ha-selector
                .hass=${this.hass}
                .selector=${{ color_rgb: {} }}
                .value=${this._parseColorToRGB(device.color || '#FDD835')}
                .label=${'Custom Color'}
                @value-changed=${(e: any) => {
                  const rgb = e.detail.value;
                  const hex = this._rgbToHex(rgb);
                  this._handleDeviceChange({
                    target: { configValue: 'color' },
                    detail: { value: hex }
                  }, index);
                }}
              ></ha-selector>
            ` : ''}

            <ha-textfield
              label="Scale"
              type="number"
              .value=${device.scale || 1}
              .configValue=${'scale'}
              @input=${(e: any) => this._handleDeviceChange(e, index)}
              min="0.1"
              max="2"
              step="0.1"
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

            ${device.type === 'discrete' ? this._renderModes(device, index) : ''}
          </div>
        </ha-expansion-panel>
      </ha-card>
    `;
  }

  private _renderModes(device: DeviceConfig, deviceIndex: number): TemplateResult {
    const modes = device.modes || [];

    return html`
      <div class="modes-section">
        <label>Modes</label>
        <ha-icon-button
          @click=${() => this._addMode(deviceIndex)}
          .path=${'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z'}
        ></ha-icon-button>
        
        ${modes.map((mode, modeIndex) => html`
          <div class="mode-item">
            <ha-textfield
              label="Label"
              .value=${mode.label}
              @input=${(e: any) => this._updateMode(deviceIndex, modeIndex, 'label', e.target.value)}
            ></ha-textfield>
            
            <ha-textfield
              label="Value"
              type="number"
              .value=${mode.value}
              @input=${(e: any) => this._updateMode(deviceIndex, modeIndex, 'value', parseFloat(e.target.value))}
            ></ha-textfield>
            
            <ha-textfield
              label="Percentage"
              type="number"
              .value=${mode.percentage}
              @input=${(e: any) => this._updateMode(deviceIndex, modeIndex, 'percentage', parseFloat(e.target.value))}
              min="0"
              max="100"
            ></ha-textfield>
            
            <!-- Icon Selector using proper HA selector -->
            <ha-selector
              .hass=${this.hass}
              .selector=${{ icon: {} }}
              .value=${mode.icon}
              .label=${'Mode Icon'}
              @value-changed=${(e: any) => this._updateMode(deviceIndex, modeIndex, 'icon', e.detail.value)}
            ></ha-selector>
            
            <ha-icon-button
              @click=${() => this._removeMode(deviceIndex, modeIndex)}
              .path=${'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z'}
            ></ha-icon-button>
          </div>
        `)}
      </div>
    `;
  }

  // Helper methods
  private _parseColorToRGB(color: string | undefined): number[] {
    if (!color) return [255, 255, 255];
    
    // Handle hex color
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return [r, g, b];
    }
    
    // Handle rgb() format
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    }
    
    return [255, 255, 255];
  }

  private _rgbToHex(rgb: number[]): string {
    return '#' + rgb.map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  private _getDeviceFromEntity(entityId: string | undefined): string | undefined {
    if (!entityId || !this.hass) return undefined;
    
    const entity = this.hass.entities[entityId];
    return entity?.device_id;
  }

  private _getDefaultTemperatureColor(state: string): string {
    const defaults: Record<string, string> = {
      cold: '#3B82F6',
      cool: '#06B6D4',
      comfortable: '#10B981',
      warm: '#F59E0B',
      hot: '#EF4444'
    };
    return defaults[state] || '#10B981';
  }

  private _getDefaultBackgroundColor(state: string): string {
    const defaults: Record<string, string> = {
      cold: '#CEB2F5',
      cool: '#A3D9F5',
      comfortable: '#CDE3DB',
      warm: '#FBD9A0',
      hot: '#F4A8A3'
    };
    return defaults[state] || '#CDE3DB';
  }

  private _handleIconColorTypeChange(type: string): void {
    let iconColor: any;
    
    switch (type) {
      case 'auto':
        iconColor = 'auto';
        break;
      case 'custom':
        iconColor = '#FDD835';
        break;
      case 'temperature':
        iconColor = {
          cold: this._getDefaultTemperatureColor('cold'),
          cool: this._getDefaultTemperatureColor('cool'),
          comfortable: this._getDefaultTemperatureColor('comfortable'),
          warm: this._getDefaultTemperatureColor('warm'),
          hot: this._getDefaultTemperatureColor('hot')
        };
        break;
    }
    
    this._updateConfig({ icon_color: iconColor });
  }

  private _valueChanged(ev: any): void {
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.target;
    const configValue = target.configValue;

    if (configValue) {
      const newConfig = { ...this._config };
      const value = target.checked !== undefined ? target.checked : ev.detail?.value ?? target.value;
      
      newConfig[configValue] = value;
      this._updateConfig(newConfig);
    }
  }

  private _updateConfig(config: Partial<RoomCardConfig>): void {
    this._config = { ...this._config!, ...config };
    const event = new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  private _handleDeviceChange(ev: any, index: number): void {
    const devices = [...(this._config!.devices || [])];
    const target = ev.target || ev.currentTarget;
    const configValue = target.configValue;
    const value = target.checked !== undefined ? target.checked : ev.detail?.value ?? target.value;
    
    devices[index] = { ...devices[index], [configValue]: value };
    this._updateConfig({ devices });
  }

  private _addDevice(): void {
    const devices = [...(this._config!.devices || [])];
    devices.push({
      entity: '',
      attribute: 'brightness',
      icon: 'mdi:lightbulb',
      color: '#FDD835',
      scale: 1,
      type: 'continuous'
    });
    this._updateConfig({ devices });
  }

  private _removeDevice(index: number): void {
    const devices = [...(this._config!.devices || [])];
    devices.splice(index, 1);
    this._updateConfig({ devices });
  }

  private _addMode(deviceIndex: number): void {
    const devices = [...(this._config!.devices || [])];
    const modes = [...(devices[deviceIndex].modes || [])];
    modes.push({
      value: modes.length,
      label: `Mode ${modes.length + 1}`,
      percentage: (100 / (modes.length + 1)) * modes.length,
      icon: 'mdi:power'
    });
    devices[deviceIndex] = { ...devices[deviceIndex], modes };
    this._updateConfig({ devices });
  }

  private _updateMode(deviceIndex: number, modeIndex: number, field: string, value: any): void {
    const devices = [...(this._config!.devices || [])];
    const modes = [...(devices[deviceIndex].modes || [])];
    modes[modeIndex] = { ...modes[modeIndex], [field]: value };
    devices[deviceIndex] = { ...devices[deviceIndex], modes };
    this._updateConfig({ devices });
  }

  private _removeMode(deviceIndex: number, modeIndex: number): void {
    const devices = [...(this._config!.devices || [])];
    const modes = [...(devices[deviceIndex].modes || [])];
    modes.splice(modeIndex, 1);
    devices[deviceIndex] = { ...devices[deviceIndex], modes };
    this._updateConfig({ devices });
  }

  private _getAreas(): string[] {
    if (!this.hass) return [];
    return Object.values(this.hass.areas || {}).map((area: any) => area.name).sort();
  }

  private _getEntityAttributes(entity: string): string[] {
    if (!this.hass || !entity) return ['brightness', 'volume_level', 'percentage'];
    
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
    const stateObj = this.hass.states[entity];
    
    if (stateObj?.attributes) {
      const customAttrs = Object.keys(stateObj.attributes).filter(
        attr => !['friendly_name', 'icon', 'entity_id'].includes(attr)
      );
      return [...new Set([...defaultAttrs, ...customAttrs])];
    }
    
    return defaultAttrs.length > 0 ? defaultAttrs : ['brightness', 'volume_level', 'percentage'];
  }

  static get styles(): CSSResult {
    return css`
      .card-config {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .section-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 16px;
      }

      ha-formfield {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 0;
      }

      .switches,
      .device-toggles {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .devices-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .devices-header h3 {
        margin: 0;
      }

      .device-config {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px;
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

      .mode-item {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .mode-item ha-textfield {
        flex: 1;
      }

      ha-card {
        margin-bottom: 8px;
      }

      ha-expansion-panel {
        --ha-card-border-radius: 4px;
        --expansion-panel-content-padding: 0;
      }

      /* Ensure selectors display correctly */
      ha-selector {
        display: block;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'room-card-editor': RoomCardEditor;
  }
}