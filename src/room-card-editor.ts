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

  // Default icons and colors for different device types
  private deviceDefaults: Record<string, { icon: string; color: string; attribute: string }> = {
    light: { icon: 'mdi:lightbulb', color: '#FDD835', attribute: 'brightness' },
    switch: { icon: 'mdi:toggle-switch', color: '#4CAF50', attribute: 'state' },
    fan: { icon: 'mdi:fan', color: '#03A9F4', attribute: 'percentage' },
    media_player: { icon: 'mdi:speaker', color: '#9C27B0', attribute: 'volume_level' },
    climate: { icon: 'mdi:thermostat', color: '#FF9800', attribute: 'temperature' },
    cover: { icon: 'mdi:window-shutter', color: '#795548', attribute: 'position' },
    vacuum: { icon: 'mdi:robot-vacuum', color: '#607D8B', attribute: 'battery_level' },
    sensor: { icon: 'mdi:gauge', color: '#00BCD4', attribute: 'state' },
    camera: { icon: 'mdi:camera', color: '#FF5722', attribute: 'state' },
    remote: { icon: 'mdi:remote', color: '#3F51B5', attribute: 'state' },
    button: { icon: 'mdi:button-cursor', color: '#673AB7', attribute: 'state' },
    humidifier: { icon: 'mdi:air-humidifier', color: '#00ACC1', attribute: 'humidity' },
    valve: { icon: 'mdi:valve', color: '#8BC34A', attribute: 'state' },
    water_heater: { icon: 'mdi:water-boiler', color: '#F44336', attribute: 'temperature' }
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

  private _getAreaName(areaId: string): string {
    if (!this.hass || !areaId) return areaId;
    const area = this.hass.areas[areaId];
    return area?.name || areaId;
  }

  private _renderBasicSection(): TemplateResult {
    const areaName = this._getAreaName(this._config!.area);
    
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
          
          <div class="info-row">
            <span class="info-label">Selected Area:</span>
            <span class="info-value">${areaName}</span>
          </div>

          <ha-textfield
            label="Display Name (Optional)"
            .value=${this._config!.name || ''}
            .configValue=${'name'}
            @input=${this._valueChanged}
            helper="Leave empty to use the area name: ${areaName}"
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
    const backgroundType = typeof this._config!.background === 'object' && this._config!.background?.entity ? 
      'entity' : 'static';
    const iconColorType = typeof this._config!.icon_color === 'object' && this._config!.icon_color?.entity ? 
      'entity' : 'static';
    const iconBgColorType = typeof this._config!.icon_background === 'object' && this._config!.icon_background?.entity ? 
      'entity' : 'static';

    return html`
      <ha-expansion-panel
        .header=${'Appearance'}
        .expanded=${this._expandedSections.appearance}
        @expanded-changed=${(e: any) => this._expandedSections.appearance = e.detail.expanded}
      >
        <div class="section-content">
          <!-- Icon Selector -->
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

          <!-- Card Background Configuration -->
          <div class="color-config-section">
            <label>Card Background</label>
            <ha-select
              naturalMenuWidth
              fixedMenuPosition
              label="Background Type"
              .value=${backgroundType}
              @selected=${(e: any) => this._handleBackgroundTypeChange(e.target.value)}
              @closed=${(e: Event) => e.stopPropagation()}
            >
              <ha-list-item value="static">Static Color</ha-list-item>
              <ha-list-item value="entity">Entity Based</ha-list-item>
            </ha-select>

            ${backgroundType === 'static' ? html`
              <ha-textfield
                label="Background Color (hex, rgb, rgba)"
                .value=${this._config!.background || 'var(--primary-background-color)'}
                @input=${(e: any) => {
                  this._updateConfig({ background: e.target.value });
                }}
                helper="Use CSS values like #FFFFFF, rgb(255,255,255), rgba(255,255,255,0.5), or var(--primary-background-color)"
              ></ha-textfield>
            ` : html`
              <ha-selector
                .hass=${this.hass}
                .selector=${{ entity: {} }}
                .value=${(this._config!.background as any)?.entity || ''}
                .label=${'Entity'}
                @value-changed=${(e: any) => {
                  const background = this._config!.background as any || {};
                  this._updateConfig({ 
                    background: { 
                      ...background,
                      entity: e.detail.value 
                    }
                  });
                }}
              ></ha-selector>
              ${(this._config!.background as any)?.entity ? 
                this._renderColorRanges('background', (this._config!.background as any)?.ranges || []) : ''}
            `}
          </div>

          <!-- Icon Color Configuration -->
          <div class="color-config-section">
            <label>Icon Color</label>
            <ha-select
              naturalMenuWidth
              fixedMenuPosition
              label="Icon Color Type"
              .value=${iconColorType}
              @selected=${(e: any) => this._handleIconColorTypeChange(e.target.value)}
              @closed=${(e: Event) => e.stopPropagation()}
            >
              <ha-list-item value="static">Static Color</ha-list-item>
              <ha-list-item value="entity">Entity Based</ha-list-item>
            </ha-select>

            ${iconColorType === 'static' ? html`
              <ha-textfield
                label="Icon Color (hex, rgb, rgba)"
                .value=${this._config!.icon_color || '#FFFFFF'}
                @input=${(e: any) => {
                  this._updateConfig({ icon_color: e.target.value });
                }}
                helper="Use CSS values like #FFFFFF, rgb(255,255,255), rgba(255,255,255,0.8)"
              ></ha-textfield>
            ` : html`
              <ha-selector
                .hass=${this.hass}
                .selector=${{ entity: {} }}
                .value=${(this._config!.icon_color as any)?.entity || ''}
                .label=${'Entity'}
                @value-changed=${(e: any) => {
                  const iconColor = this._config!.icon_color as any || {};
                  this._updateConfig({ 
                    icon_color: { 
                      ...iconColor,
                      entity: e.detail.value 
                    }
                  });
                }}
              ></ha-selector>
              ${(this._config!.icon_color as any)?.entity ? 
                this._renderColorRanges('icon_color', (this._config!.icon_color as any)?.ranges || []) : ''}
            `}
          </div>

          <!-- Icon Background Configuration -->
          <div class="color-config-section">
            <label>Icon Background</label>
            <ha-select
              naturalMenuWidth
              fixedMenuPosition
              label="Icon Background Type"
              .value=${iconBgColorType}
              @selected=${(e: any) => this._handleIconBgTypeChange(e.target.value)}
              @closed=${(e: Event) => e.stopPropagation()}
            >
              <ha-list-item value="static">Static Color</ha-list-item>
              <ha-list-item value="entity">Entity Based</ha-list-item>
            </ha-select>

            ${iconBgColorType === 'static' ? html`
              <ha-textfield
                label="Icon Background Color (hex, rgb, rgba)"
                .value=${this._config!.icon_background || 'rgba(255, 255, 255, 0.2)'}
                @input=${(e: any) => {
                  this._updateConfig({ icon_background: e.target.value });
                }}
                helper="Use CSS values like #333333, rgb(51,51,51), rgba(255,255,255,0.2)"
              ></ha-textfield>
            ` : html`
              <ha-selector
                .hass=${this.hass}
                .selector=${{ entity: {} }}
                .value=${(this._config!.icon_background as any)?.entity || ''}
                .label=${'Entity'}
                @value-changed=${(e: any) => {
                  const iconBg = this._config!.icon_background as any || {};
                  this._updateConfig({ 
                    icon_background: { 
                      ...iconBg,
                      entity: e.detail.value 
                    }
                  });
                }}
              ></ha-selector>
              ${(this._config!.icon_background as any)?.entity ? 
                this._renderColorRanges('icon_background', (this._config!.icon_background as any)?.ranges || []) : ''}
            `}
          </div>
        </div>
      </ha-expansion-panel>
    `;
  }

  private _renderColorRanges(configKey: string, ranges: any[]): TemplateResult {
    return html`
      <div class="color-ranges">
        <div class="ranges-header">
          <label>Color Ranges</label>
          <ha-icon-button
            @click=${() => this._addColorRange(configKey)}
            .path=${'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z'}
          ></ha-icon-button>
        </div>
        <div class="ranges-list">
          ${ranges.map((range, index) => html`
            <div class="range-item">
              <div class="range-inputs">
                <ha-textfield
                  label="Min"
                  type="number"
                  .value=${range.min !== undefined ? range.min : ''}
                  @input=${(e: any) => this._updateColorRange(configKey, index, 'min', parseFloat(e.target.value))}
                ></ha-textfield>
                <ha-textfield
                  label="Max"
                  type="number"
                  .value=${range.max !== undefined ? range.max : ''}
                  @input=${(e: any) => this._updateColorRange(configKey, index, 'max', parseFloat(e.target.value))}
                ></ha-textfield>
                <ha-textfield
                  label="Color (hex, rgb, rgba)"
                  .value=${range.color || ''}
                  @input=${(e: any) => this._updateColorRange(configKey, index, 'color', e.target.value)}
                ></ha-textfield>
                <ha-icon-button
                  @click=${() => this._removeColorRange(configKey, index)}
                  .path=${'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z'}
                ></ha-icon-button>
              </div>
            </div>
          `)}
        </div>
      </div>
    `;
  }

  private _addColorRange(configKey: string): void {
    const configValue = this._config![configKey] as any || {};
    const ranges = [...(configValue.ranges || [])];
    ranges.push({ min: 0, max: 100, color: '#808080' });
    this._updateConfig({
      [configKey]: {
        ...configValue,
        ranges
      }
    });
  }

  private _updateColorRange(configKey: string, index: number, field: string, value: any): void {
    const configValue = this._config![configKey] as any || {};
    const ranges = [...(configValue.ranges || [])];
    ranges[index] = { ...ranges[index], [field]: value };
    this._updateConfig({
      [configKey]: {
        ...configValue,
        ranges
      }
    });
  }

  private _removeColorRange(configKey: string, index: number): void {
    const configValue = this._config![configKey] as any || {};
    const ranges = [...(configValue.ranges || [])];
    ranges.splice(index, 1);
    this._updateConfig({
      [configKey]: {
        ...configValue,
        ranges
      }
    });
  }

  private _renderTemperatureSection(): TemplateResult {
    return html`
      <ha-expansion-panel
        .header=${'Temperature & Humidity'}
        .expanded=${this._expandedSections.temperature}
        @expanded-changed=${(e: any) => this._expandedSections.temperature = e.detail.expanded}
      >
        <div class="section-content">
          <ha-selector
            .hass=${this.hass}
            .selector=${{ 
              entity: {
                filter: {
                  domain: 'sensor',
                  device_class: 'temperature'
                }
              }
            }}
            .value=${this._config!.temperature_sensor || ''}
            .label=${'Temperature Sensor'}
            @value-changed=${(e: any) => this._valueChanged({
              target: { configValue: 'temperature_sensor' },
              detail: { value: e.detail.value }
            })}
          ></ha-selector>

          <ha-selector
            .hass=${this.hass}
            .selector=${{ 
              entity: {
                filter: {
                  domain: 'sensor',
                  device_class: 'humidity'
                }
              }
            }}
            .value=${this._config!.humidity_sensor || ''}
            .label=${'Humidity Sensor'}
            @value-changed=${(e: any) => this._valueChanged({
              target: { configValue: 'humidity_sensor' },
              detail: { value: e.detail.value }
            })}
          ></ha-selector>

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

          <ha-textfield
            label="Number of Chip Columns"
            type="number"
            .value=${this._config!.chip_columns || 1}
            .configValue=${'chip_columns'}
            @input=${this._valueChanged}
            min="1"
            max="4"
            helper="Number of columns for device chips (1-4)"
          ></ha-textfield>

          ${devices.map((device, index) => this._renderDevice(device, index))}
        </div>
      </ha-expansion-panel>
    `;
  }

  private _renderDevice(device: DeviceConfig, index: number): TemplateResult {
    const entityAttrs = device.entity ? this._getEntityAttributes(device.entity) : [];
    const isLightEntity = device.entity?.startsWith('light.');
    const friendlyName = this._getFriendlyName(device.entity);

    return html`
      <ha-card outlined>
        <ha-expansion-panel
          .header=${friendlyName || 'New Device'}
          .secondary=${device.attribute || 'brightness'}
        >
          <div class="device-config">
            <ha-icon-button-arrow-prev
              slot="icons"
              @click=${() => this._removeDevice(index)}
            ></ha-icon-button-arrow-prev>

            <ha-selector
              .hass=${this.hass}
              .selector=${{ 
                entity: {
                  multiple: false,
                  filter: [
                    { domain: 'light' },
                    { domain: 'switch' },
                    { domain: 'fan' },
                    { domain: 'media_player' },
                    { domain: 'climate' },
                    { domain: 'cover' },
                    { domain: 'vacuum' },
                    { domain: 'sensor' },
                    { domain: 'camera' },
                    { domain: 'remote' },
                    { domain: 'button' },
                    { domain: 'humidifier' },
                    { domain: 'valve' },
                    { domain: 'water_heater' },
                    { domain: 'group' }
                  ]
                }
              }}
              .value=${device.entity || ''}
              .label=${'Entity'}
              @value-changed=${(e: any) => this._handleDeviceChange({
                target: { configValue: 'entity' },
                detail: { value: e.detail.value }
              }, index)}
            ></ha-selector>

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

            <!-- Display Options -->
            <div class="display-options">
              <ha-formfield label="Show Chip">
                <ha-switch
                  .checked=${device.show_chip !== false}
                  @change=${(e: any) => this._handleDeviceChange({
                    target: { configValue: 'show_chip' },
                    detail: { value: e.target.checked }
                  }, index)}
                ></ha-switch>
              </ha-formfield>

              <ha-formfield label="Show Slider">
                <ha-switch
                  .checked=${device.show_slider !== false}
                  @change=${(e: any) => this._handleDeviceChange({
                    target: { configValue: 'show_slider' },
                    detail: { value: e.target.checked }
                  }, index)}
                ></ha-switch>
              </ha-formfield>
            </div>

            <!-- Color Configuration -->
            <div class="device-colors">
              <label>Device Colors</label>
              
              <ha-textfield
                label="Icon Color (hex, rgb, rgba)"
                .value=${device.icon_color || '#FFFFFF'}
                @input=${(e: any) => this._handleDeviceChange({
                  target: { configValue: 'icon_color' },
                  detail: { value: e.target.value }
                }, index)}
              ></ha-textfield>

              <ha-textfield
                label="On Color (hex, rgb, rgba)"
                .value=${device.color_on || (isLightEntity ? 'light-color' : '#FDD835')}
                @input=${(e: any) => this._handleDeviceChange({
                  target: { configValue: 'color_on' },
                  detail: { value: e.target.value }
                }, index)}
                helper="${isLightEntity ? 'Use "light-color" to match light RGB' : ''}"
              ></ha-textfield>

              <ha-textfield
                label="Off Color (hex, rgb, rgba)"
                .value=${device.color_off || 'rgba(0, 0, 0, 0.2)'}
                @input=${(e: any) => this._handleDeviceChange({
                  target: { configValue: 'color_off' },
                  detail: { value: e.target.value }
                }, index)}
              ></ha-textfield>

              <ha-textfield
                label="Unavailable Color (hex, rgb, rgba)"
                .value=${device.color_unavailable || 'rgba(128, 128, 128, 0.5)'}
                @input=${(e: any) => this._handleDeviceChange({
                  target: { configValue: 'color_unavailable' },
                  detail: { value: e.target.value }
                }, index)}
              ></ha-textfield>
            </div>

            <ha-textfield
              label="Scale"
              type="number"
              .value=${device.scale || 1}
              .configValue=${'scale'}
              @input=${(e: any) => this._handleDeviceChange(e, index)}
              min="0.1"
              max="255"
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
        <div class="modes-header">
          <label>Modes</label>
          <ha-icon-button
            @click=${() => this._addMode(deviceIndex)}
            .path=${'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z'}
          ></ha-icon-button>
        </div>
        
        ${modes.map((mode, modeIndex) => html`
          <div class="mode-item">
            <div class="mode-row">
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
              
              <ha-icon-button
                @click=${() => this._removeMode(deviceIndex, modeIndex)}
                .path=${'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z'}
              ></ha-icon-button>
            </div>
            
            <div class="mode-icon-row">
              <ha-selector
                .hass=${this.hass}
                .selector=${{ icon: {} }}
                .value=${mode.icon}
                .label=${'Mode Icon'}
                @value-changed=${(e: any) => this._updateMode(deviceIndex, modeIndex, 'icon', e.detail.value)}
              ></ha-selector>
            </div>
          </div>
        `)}
      </div>
    `;
  }

  // Helper methods
  private _getFriendlyName(entityId: string | undefined): string {
    if (!entityId || !this.hass) return '';
    const state = this.hass.states[entityId];
    return state?.attributes?.friendly_name || entityId.split('.')[1].replace(/_/g, ' ');
  }

  private _handleBackgroundTypeChange(type: string): void {
    if (type === 'static') {
      this._updateConfig({ background: 'var(--primary-background-color)' });
    } else {
      this._updateConfig({ background: { entity: '', ranges: [] } });
    }
  }

  private _handleIconColorTypeChange(type: string): void {
    if (type === 'static') {
      this._updateConfig({ icon_color: '#FFFFFF' });
    } else {
      this._updateConfig({ icon_color: { entity: '', ranges: [] } });
    }
  }

  private _handleIconBgTypeChange(type: string): void {
    if (type === 'static') {
      this._updateConfig({ icon_background: 'rgba(255, 255, 255, 0.2)' });
    } else {
      this._updateConfig({ icon_background: { entity: '', ranges: [] } });
    }
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
    
    // If entity changed, auto-detect defaults
    if (configValue === 'entity' && value) {
      const domain = value.split('.')[0];
      const defaults = this.deviceDefaults[domain];
      if (defaults && !devices[index].icon) {
        devices[index] = { 
          ...devices[index], 
          entity: value,
          icon: defaults.icon,
          attribute: defaults.attribute,
          scale: domain === 'light' ? 255 : 1
        };
      } else {
        devices[index] = { ...devices[index], [configValue]: value };
      }
    } else {
      devices[index] = { ...devices[index], [configValue]: value };
    }
    
    this._updateConfig({ devices });
  }

  private _addDevice(): void {
    const devices = [...(this._config!.devices || [])];
    const nextIndex = devices.length;
    
    // Cycle through different default types
    const deviceTypes = Object.keys(this.deviceDefaults);
    const typeIndex = nextIndex % deviceTypes.length;
    const deviceType = deviceTypes[typeIndex];
    const defaults = this.deviceDefaults[deviceType];
    
    devices.push({
      entity: '',
      attribute: defaults.attribute,
      icon: defaults.icon,
      scale: deviceType === 'light' ? 255 : 1,
      type: 'continuous',
      show_chip: true,
      show_slider: true
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

  private _getEntityAttributes(entity: string): string[] {
    if (!this.hass || !entity) return ['brightness', 'volume_level', 'percentage', 'state'];
    
    const domain = entity.split('.')[0];
    const domainAttributes: Record<string, string[]> = {
      light: ['brightness', 'rgb_color', 'color_temp', 'effect', 'white_value', 'brightness_pct'],
      media_player: ['volume_level', 'media_position', 'media_duration', 'source', 'sound_mode'],
      fan: ['percentage', 'preset_mode', 'speed', 'oscillating', 'direction'],
      climate: ['temperature', 'target_temp_high', 'target_temp_low', 'humidity', 'fan_mode', 'swing_mode'],
      cover: ['position', 'tilt_position', 'current_position'],
      vacuum: ['battery_level', 'fan_speed', 'status'],
      humidifier: ['humidity', 'mode', 'target_humidity'],
      water_heater: ['temperature', 'target_temp_high', 'target_temp_low', 'operation_mode'],
      sensor: ['state'],
      switch: ['state'],
      camera: ['state'],
      remote: ['state'],
      button: ['state'],
      valve: ['state', 'current_position']
    };
    
    const defaultAttrs = domainAttributes[domain] || ['state'];
    const stateObj = this.hass.states[entity];
    
    if (stateObj?.attributes) {
      const customAttrs = Object.keys(stateObj.attributes).filter(
        attr => !['friendly_name', 'icon', 'entity_id', 'supported_features', 'device_class'].includes(attr)
      );
      return [...new Set([...defaultAttrs, ...customAttrs])];
    }
    
    return defaultAttrs;
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

      .info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px;
        background: var(--secondary-background-color);
        border-radius: 4px;
      }

      .info-label {
        font-weight: 500;
        color: var(--secondary-text-color);
      }

      .info-value {
        font-weight: 600;
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

      .devices-header,
      .modes-header,
      .ranges-header {
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

      .color-config-section {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 12px;
        border: 1px solid var(--divider-color);
        border-radius: 4px;
      }

      .color-config-section > label {
        font-weight: 500;
        margin-bottom: 4px;
      }

      .color-ranges,
      .device-colors {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 8px;
      }

      .color-ranges label,
      .device-colors label {
        font-size: 0.9em;
        font-weight: 500;
        color: var(--secondary-text-color);
      }

      .ranges-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .range-item {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 8px;
        border: 1px solid var(--divider-color);
        border-radius: 4px;
      }

      .range-inputs {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .range-inputs ha-textfield {
        flex: 1;
      }

      .display-options {
        display: flex;
        gap: 16px;
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

      .mode-item {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 8px;
        border: 1px solid var(--divider-color);
        border-radius: 4px;
      }

      .mode-row {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .mode-row ha-textfield {
        flex: 1;
      }

      .mode-icon-row {
        display: flex;
        width: 100%;
      }

      .mode-icon-row ha-selector {
        flex: 1;
      }

      ha-card {
        margin-bottom: 8px;
      }

      ha-expansion-panel {
        --ha-card-border-radius: 4px;
        --expansion-panel-content-padding: 0;
      }

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