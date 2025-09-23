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
              <ha-list-item value="entity">Entity State</ha-list-item>
            </ha-select>

            ${backgroundType === 'static' ? html`
              <ha-selector
                .hass=${this.hass}
                .selector=${{ color_rgb: {} }}
                .value=${this._parseColorToRGB((this._config!.background as string) || '#1a1a1a')}
                .label=${'Background Color'}
                @value-changed=${(e: any) => {
                  const rgb = e.detail.value;
                  const hex = this._rgbToHex(rgb);
                  this._updateConfig({ background: hex });
                }}
              ></ha-selector>
            ` : html`
              <ha-selector
                .hass=${this.hass}
                .selector=${{ entity: {} }}
                .value=${(this._config!.background as any)?.entity || ''}
                .label=${'Background Entity'}
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
                this._renderStateColors('background', (this._config!.background as any)?.states || {}) : ''}
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
              <ha-list-item value="entity">Entity State</ha-list-item>
            </ha-select>

            ${iconColorType === 'static' ? html`
              <ha-selector
                .hass=${this.hass}
                .selector=${{ color_rgb: {} }}
                .value=${this._parseColorToRGB((this._config!.icon_color as string) || '#FFFFFF')}
                .label=${'Icon Color'}
                @value-changed=${(e: any) => {
                  const rgb = e.detail.value;
                  const hex = this._rgbToHex(rgb);
                  this._updateConfig({ icon_color: hex });
                }}
              ></ha-selector>
            ` : html`
              <ha-selector
                .hass=${this.hass}
                .selector=${{ entity: {} }}
                .value=${(this._config!.icon_color as any)?.entity || ''}
                .label=${'Icon Color Entity'}
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
                this._renderStateColors('icon_color', (this._config!.icon_color as any)?.states || {}) : ''}
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
              <ha-list-item value="entity">Entity State</ha-list-item>
            </ha-select>

            ${iconBgColorType === 'static' ? html`
              <ha-selector
                .hass=${this.hass}
                .selector=${{ color_rgb: {} }}
                .value=${this._parseColorToRGB((this._config!.icon_background as string) || '#333333')}
                .label=${'Icon Background Color'}
                @value-changed=${(e: any) => {
                  const rgb = e.detail.value;
                  const hex = this._rgbToHex(rgb);
                  this._updateConfig({ icon_background: hex });
                }}
              ></ha-selector>
            ` : html`
              <ha-selector
                .hass=${this.hass}
                .selector=${{ entity: {} }}
                .value=${(this._config!.icon_background as any)?.entity || ''}
                .label=${'Icon Background Entity'}
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
                this._renderStateColors('icon_background', (this._config!.icon_background as any)?.states || {}) : ''}
            `}
          </div>
        </div>
      </ha-expansion-panel>
    `;
  }

  private _renderStateColors(configKey: string, states: Record<string, string>): TemplateResult {
    const entity = (this._config![configKey] as any)?.entity;
    const entityStates = this._getEntityStates(entity);

    return html`
      <div class="state-colors">
        <label>State Colors</label>
        <div class="state-list">
          ${entityStates.map(state => html`
            <div class="state-item">
              <span class="state-label">${state}</span>
              <ha-selector
                .hass=${this.hass}
                .selector=${{ color_rgb: {} }}
                .value=${this._parseColorToRGB(states[state] || '#808080')}
                @value-changed=${(e: any) => {
                  const rgb = e.detail.value;
                  const hex = this._rgbToHex(rgb);
                  const configValue = this._config![configKey] as any || {};
                  const newStates = { ...configValue.states };
                  newStates[state] = hex;
                  this._updateConfig({ 
                    [configKey]: {
                      ...configValue,
                      states: newStates
                    }
                  });
                }}
              ></ha-selector>
            </div>
          `)}
          <div class="add-state">
            <ha-textfield
              label="Add Custom State"
              id="${configKey}-new-state"
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === 'Enter') {
                  this._addCustomState(configKey);
                }
              }}
            ></ha-textfield>
            <ha-icon-button
              @click=${() => this._addCustomState(configKey)}
              .path=${'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z'}
            ></ha-icon-button>
          </div>
        </div>
      </div>
    `;
  }

  private _addCustomState(configKey: string): void {
    const input = this.shadowRoot?.getElementById(`${configKey}-new-state`) as any;
    if (input && input.value) {
      const state = input.value.trim();
      if (state) {
        const configValue = this._config![configKey] as any || {};
        const states = { ...configValue.states };
        states[state] = '#808080';
        this._updateConfig({ 
          [configKey]: {
            ...configValue,
            states
          }
        });
        input.value = '';
      }
    }
  }

  private _getEntityStates(entityId: string): string[] {
    if (!entityId || !this.hass) return ['on', 'off'];
    
    const domain = entityId.split('.')[0];
    const commonStates = ['on', 'off', 'unavailable', 'unknown'];
    
    // Add domain-specific states
    const domainStates: Record<string, string[]> = {
      light: ['on', 'off'],
      switch: ['on', 'off'],
      fan: ['on', 'off'],
      cover: ['open', 'closed', 'opening', 'closing'],
      lock: ['locked', 'unlocked'],
      climate: ['heat', 'cool', 'auto', 'off', 'dry', 'fan_only'],
      media_player: ['playing', 'paused', 'idle', 'off'],
      vacuum: ['cleaning', 'docked', 'idle', 'paused', 'returning'],
      alarm_control_panel: ['disarmed', 'armed_home', 'armed_away', 'armed_night', 'triggered']
    };
    
    return domainStates[domain] || commonStates;
  }

  private _renderTemperatureSection(): TemplateResult {
    const tempRanges = this._config!.temperature_ranges || {
      cold: { min: -50, max: 45 },
      cool: { min: 45, max: 65 },
      comfortable: { min: 65, max: 78 },
      warm: { min: 78, max: 85 },
      hot: { min: 85, max: 150 }
    };

    const useTempBackground = this._config!.use_temperature_background !== false;

    return html`
      <ha-expansion-panel
        .header=${'Temperature & Humidity'}
        .expanded=${this._expandedSections.temperature}
        @expanded-changed=${(e: any) => this._expandedSections.temperature = e.detail.expanded}
      >
        <div class="section-content">
          <!-- Temperature Sensor using proper entity selector -->
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

          <!-- Humidity Sensor using proper entity selector -->
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

            <ha-formfield label="Use Temperature-based Background">
              <ha-switch
                .checked=${useTempBackground}
                .configValue=${'use_temperature_background'}
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

          ${useTempBackground ? html`
            <div class="temperature-colors-section">
              <label>Temperature-based Background Colors & Ranges</label>
              ${['cold', 'cool', 'comfortable', 'warm', 'hot'].map(state => html`
                <div class="temp-range-item">
                  <div class="temp-range-header">
                    <span>${state.charAt(0).toUpperCase() + state.slice(1)}</span>
                  </div>
                  <div class="temp-range-controls">
                    <ha-selector
                      .hass=${this.hass}
                      .selector=${{ color_rgb: {} }}
                      .value=${this._parseColorToRGB(
                        this._config!.background_colors?.[state] || this._getDefaultBackgroundColor(state)
                      )}
                      @value-changed=${(e: any) => {
                        const rgb = e.detail.value;
                        const hex = this._rgbToHex(rgb);
                        const backgroundColors = { ...this._config!.background_colors };
                        backgroundColors[state] = hex;
                        this._updateConfig({ background_colors: backgroundColors });
                      }}
                    ></ha-selector>
                    <div class="temp-inputs">
                      <ha-textfield
                        label="Min °${this._config!.temperature_unit || 'F'}"
                        type="number"
                        .value=${tempRanges[state].min}
                        @input=${(e: any) => this._updateTempRange(state, 'min', parseFloat(e.target.value))}
                      ></ha-textfield>
                      <ha-textfield
                        label="Max °${this._config!.temperature_unit || 'F'}"
                        type="number"
                        .value=${tempRanges[state].max}
                        @input=${(e: any) => this._updateTempRange(state, 'max', parseFloat(e.target.value))}
                      ></ha-textfield>
                    </div>
                  </div>
                </div>
              `)}
            </div>
          ` : ''}
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

            <!-- Enhanced Entity Selector using proper ha-selector -->
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

            <ha-select
              naturalMenuWidth
              fixedMenuPosition
              label="Color"
              .value=${device.color === 'light-color' ? 'light-color' : 'custom'}
              @selected=${(e: any) => {
                const value = e.target.value === 'light-color' ? 'light-color' : device.color || '#FDD835';
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

  private _updateTempRange(state: string, type: 'min' | 'max', value: number): void {
    const ranges = { ...this._config!.temperature_ranges } || {};
    if (!ranges[state]) {
      ranges[state] = { min: 0, max: 100 };
    }
    ranges[state][type] = value;
    this._updateConfig({ temperature_ranges: ranges });
  }

  private _handleBackgroundTypeChange(type: string): void {
    if (type === 'static') {
      this._updateConfig({ background: '#1a1a1a' });
    } else {
      this._updateConfig({ background: { entity: '', states: {} } });
    }
  }

  private _handleIconColorTypeChange(type: string): void {
    if (type === 'static') {
      this._updateConfig({ icon_color: '#FFFFFF' });
    } else {
      this._updateConfig({ icon_color: { entity: '', states: {} } });
    }
  }

  private _handleIconBgTypeChange(type: string): void {
    if (type === 'static') {
      this._updateConfig({ icon_background: '#333333' });
    } else {
      this._updateConfig({ icon_background: { entity: '', states: {} } });
    }
  }

  private _parseColorToRGB(color: string | undefined): number[] {
    if (!color) return [255, 255, 255];
    
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return [r, g, b];
    }
    
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
          color: defaults.color,
          attribute: defaults.attribute
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
      color: defaults.color,
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
      .modes-header {
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

      .state-colors {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 8px;
      }

      .state-colors label {
        font-size: 0.9em;
        font-weight: 500;
        color: var(--secondary-text-color);
      }

      .state-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .state-item {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .state-label {
        min-width: 80px;
        text-transform: capitalize;
      }

      .add-state {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid var(--divider-color);
      }

      .add-state ha-textfield {
        flex: 1;
      }

      .modes-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .modes-section label,
      .temperature-colors-section label {
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

      .temperature-colors-section {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .temp-range-item {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px;
        border: 1px solid var(--divider-color);
        border-radius: 4px;
      }

      .temp-range-header {
        font-weight: 500;
      }

      .temp-range-controls {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .temp-inputs {
        display: flex;
        gap: 8px;
      }

      .temp-inputs ha-textfield {
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