import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';

@customElement('room-card-test-editor')
export class RoomCardTestEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: any;
  @state() private _expandedSections = {
    basic: true,
    appearance: false,
    temperature: false,
    devices: false
  };

  private deviceDefaults: any = {
    light: { icon: 'mdi:lightbulb', color: '#FDD835', attribute: 'brightness' },
    switch: { icon: 'mdi:toggle-switch', color: '#4CAF50', attribute: 'state' },
    fan: { icon: 'mdi:fan', color: '#03A9F4', attribute: 'percentage' },
    media_player: { icon: 'mdi:speaker', color: '#9C27B0', attribute: 'volume_level' },
    climate: { icon: 'mdi:thermostat', color: '#FF9800', attribute: 'temperature' },
    cover: { icon: 'mdi:window-shutter', color: '#795548', attribute: 'position' },
    vacuum: { icon: 'mdi:robot-vacuum', color: '#607D8B', attribute: 'battery_level' },
    sensor: { icon: 'mdi:gauge', color: '#00BCD4', attribute: 'state' },
    camera: { icon: 'mdi:camera', color: '#FF5722', attribute: 'state' },
  };

  setConfig(config: any): void {
    this._config = {
      background: 'var(--ha-card-background)',
      ...config
    };
  }

  protected render() {
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

  private _getAreaName(areaId: string) {
    if (!this.hass || !areaId) return areaId;
    const area = this.hass.areas[areaId];
    return area?.name || areaId;
  }

  private _renderBasicSection() {
    const areaName = this._getAreaName(this._config.area);
    
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
            .value=${this._config.area}
            .label=${'Area'}
            .required=${true}
            @value-changed=${(e: CustomEvent) => this._valueChanged({
              target: { configValue: 'area' },
              detail: { value: e.detail.value }
            } as any)}
          ></ha-selector>
          
          <div class="info-row">
            <span class="info-label">Selected Area:</span>
            <span class="info-value">${areaName}</span>
          </div>

          <ha-textfield
            label="Display Name (Optional)"
            .value=${this._config.name || ''}
            .configValue=${'name'}
            @input=${this._valueChanged}
            helper="Leave empty to use the area name: ${areaName}"
          ></ha-textfield>

          <div class="subsection">
            <label>Room Name Styling</label>
            <ha-textfield
              label="Room Name Color"
              .value=${this._config.room_name_color || '#000000'}
              @input=${(e: any) => this._updateConfig({ room_name_color: e.target.value })}
              helper="CSS color (e.g., #000000, rgb(0,0,0))"
            ></ha-textfield>
            <ha-textfield
              label="Room Name Font Size"
              .value=${this._config.room_name_size || '14px'}
              @input=${(e: any) => this._updateConfig({ room_name_size: e.target.value })}
              helper="CSS size (e.g., 14px, 1.2rem)"
            ></ha-textfield>
          </div>

          <div class="subsection">
            <label>Temp/Humidity Styling</label>
            <ha-textfield
              label="Temp/Humidity Color"
              .value=${this._config.temp_humidity_color || '#353535'}
              @input=${(e: any) => this._updateConfig({ temp_humidity_color: e.target.value })}
              helper="CSS color (e.g., #353535, rgb(53,53,53))"
            ></ha-textfield>
            <ha-textfield
              label="Temp/Humidity Font Size"
              .value=${this._config.temp_humidity_size || '12px'}
              @input=${(e: any) => this._updateConfig({ temp_humidity_size: e.target.value })}
              helper="CSS size (e.g., 12px, 0.9rem)"
            ></ha-textfield>
          </div>

          <ha-formfield label="Haptic Feedback">
            <ha-switch
              .checked=${this._config.haptic_feedback !== false}
              .configValue=${'haptic_feedback'}
              @change=${this._valueChanged}
            ></ha-switch>
          </ha-formfield>
        </div>
      </ha-expansion-panel>
    `;
  }

  private _renderAppearanceSection() {
    let backgroundType = 'static';
    if (this._config.background && typeof this._config.background === 'object' && 'entity' in this._config.background) {
      backgroundType = 'entity';
    }

    const iconColorType = typeof this._config.icon_color === 'object' && this._config.icon_color?.entity ?
      'entity' : 'static';
    const iconBgColorType = typeof this._config.icon_background === 'object' && this._config.icon_background?.entity ?
      'entity' : 'static';

    return html`
      <ha-expansion-panel
        .header=${'Appearance'}
        .expanded=${this._expandedSections.appearance}
        @expanded-changed=${(e: any) => this._expandedSections.appearance = e.detail.expanded}
      >
        <div class="section-content">
          <ha-selector
            .hass=${this.hass}
            .selector=${{ icon: {} }}
            .value=${this._config.icon || 'mdi:home'}
            .label=${'Icon'}
            @value-changed=${(e: CustomEvent) => this._valueChanged({
              target: { configValue: 'icon' },
              detail: { value: e.detail.value }
            } as any)}
          ></ha-selector>

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
                label="Background Color"
                .value=${typeof this._config.background === 'string' ? this._config.background : 'var(--ha-card-background)'}
                @input=${(e: any) => {
                  this._updateConfig({ background: e.target.value });
                }}
                helper="CSS color or variable (e.g., #FFFFFF, var(--ha-card-background))"
                placeholder="var(--ha-card-background)"
              ></ha-textfield>
            ` : html`
              <ha-selector
                .hass=${this.hass}
                .selector=${{ entity: {} }}
                .value=${this._config.background?.entity || ''}
                .label=${'Entity'}
                @value-changed=${(e: CustomEvent) => {
                  const background = this._config.background || {};
                  this._updateConfig({
                    background: {
                      ...background,
                      entity: e.detail.value
                    }
                  });
                }}
              ></ha-selector>
              ${this._config.background?.entity ?
                this._renderColorRanges('background', this._config.background?.ranges || []) : ''}
            `}
          </div>

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
                .value=${this._config.icon_color || '#FFFFFF'}
                @input=${(e: any) => {
                  this._updateConfig({ icon_color: e.target.value });
                }}
                helper="Use CSS values like #FFFFFF, rgb(255,255,255), rgba(255,255,255,0.8)"
              ></ha-textfield>
            ` : html`
              <ha-selector
                .hass=${this.hass}
                .selector=${{ entity: {} }}
                .value=${this._config.icon_color?.entity || ''}
                .label=${'Entity'}
                @value-changed=${(e: CustomEvent) => {
                  const iconColor = this._config.icon_color || {};
                  this._updateConfig({
                    icon_color: {
                      ...iconColor,
                      entity: e.detail.value
                    }
                  });
                }}
              ></ha-selector>
              ${this._config.icon_color?.entity ?
                this._renderColorRanges('icon_color', this._config.icon_color?.ranges || []) : ''}
            `}
          </div>

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
                .value=${this._config.icon_background || 'rgba(255, 255, 255, 0.2)'}
                @input=${(e: any) => {
                  this._updateConfig({ icon_background: e.target.value });
                }}
                helper="Use CSS values like #333333, rgb(51,51,51), rgba(255,255,255,0.2)"
              ></ha-textfield>
            ` : html`
              <ha-selector
                .hass=${this.hass}
                .selector=${{ entity: {} }}
                .value=${this._config.icon_background?.entity || ''}
                .label=${'Entity'}
                @value-changed=${(e: CustomEvent) => {
                  const iconBg = this._config.icon_background || {};
                  this._updateConfig({
                    icon_background: {
                      ...iconBg,
                      entity: e.detail.value
                    }
                  });
                }}
              ></ha-selector>
              ${this._config.icon_background?.entity ?
                this._renderColorRanges('icon_background', this._config.icon_background?.ranges || []) : ''}
            `}
          </div>
        </div>
      </ha-expansion-panel>
    `;
  }

  private _renderColorRanges(configKey: string, ranges: any[]) {
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
          ${ranges.map((range: any, index: number) => html`
            <div class="range-item">
              <div class="range-inputs">
                ${range.state !== undefined ? html`
                  <ha-textfield
                    label="State"
                    .value=${range.state || ''}
                    @input=${(e: any) => this._updateColorRange(configKey, index, 'state', e.target.value)}
                  ></ha-textfield>
                ` : html`
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
                `}
                <ha-textfield
                  label="Color"
                  .value=${range.color || ''}
                  @input=${(e: any) => this._updateColorRange(configKey, index, 'color', e.target.value)}
                ></ha-textfield>
                <ha-icon-button
                  @click=${() => this._removeColorRange(configKey, index)}
                  .path=${'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z'}
                ></ha-icon-button>
              </div>
              <ha-button-menu>
                <ha-icon-button
                  slot="trigger"
                  .path=${'M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z'}
                ></ha-icon-button>
                <ha-list-item @click=${() => this._toggleRangeType(configKey, index)}>
                  ${range.state !== undefined ? 'Switch to Numeric Range' : 'Switch to State Match'}
                </ha-list-item>
              </ha-button-menu>
            </div>
          `)}
        </div>
      </div>
    `;
  }

  private _renderTemperatureSection() {
    return html`
      <ha-expansion-panel
        .header=${'Temperature & Humidity'}
        .expanded=${this._expandedSections.temperature}
        @expanded-changed=${(e: any) => this._expandedSections.temperature = e.detail.expanded}
      >
        <div class="section-content">
          <ha-selector
            .hass=${this.hass}
            .selector=${{ entity: { domain: 'sensor', device_class: 'temperature' } }}
            .value=${this._config.temperature_sensor}
            .label=${'Temperature Sensor'}
            @value-changed=${(e: CustomEvent) => this._valueChanged({
              target: { configValue: 'temperature_sensor' },
              detail: { value: e.detail.value }
            } as any)}
          ></ha-selector>

          <ha-selector
            .hass=${this.hass}
            .selector=${{ entity: { domain: 'sensor', device_class: 'humidity' } }}
            .value=${this._config.humidity_sensor}
            .label=${'Humidity Sensor'}
            @value-changed=${(e: CustomEvent) => this._valueChanged({
              target: { configValue: 'humidity_sensor' },
              detail: { value: e.detail.value }
            } as any)}
          ></ha-selector>

          <div class="switches">
            <ha-formfield label="Show Temperature">
              <ha-switch
                .checked=${this._config.show_temperature !== false}
                .configValue=${'show_temperature'}
                @change=${this._valueChanged}
              ></ha-switch>
            </ha-formfield>

            <ha-formfield label="Show Humidity">
              <ha-switch
                .checked=${this._config.show_humidity !== false}
                .configValue=${'show_humidity'}
                @change=${this._valueChanged}
              ></ha-switch>
            </ha-formfield>
          </div>

          <ha-select
            naturalMenuWidth
            fixedMenuPosition
            label="Temperature Unit"
            .value=${this._config.temperature_unit || 'F'}
            .configValue=${'temperature_unit'}
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

  private _renderDevicesSection() {
    const devices = this._config.devices || [];

    return html`
      <ha-expansion-panel
        .header=${'Devices'}
        .expanded=${this._expandedSections.devices}
        @expanded-changed=${(e: any) => this._expandedSections.devices = e.detail.expanded}
      >
        <div class="section-content">
          <div class="devices-header">
            <label>Device Controls</label>
            <ha-icon-button
              @click=${this._addDevice}
              .path=${'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z'}
            ></ha-icon-button>
          </div>

          <ha-textfield
            label="Chip Columns"
            type="number"
            min="1"
            max="4"
            .value=${this._config.chip_columns || 1}
            @input=${(e: any) => {
              const value = parseInt(e.target.value);
              if (value >= 1 && value <= 4) {
                this._updateConfig({ chip_columns: value });
              }
            }}
            helper="Number of columns for device chips (1-4)"
          ></ha-textfield>

          ${devices.map((device: any, index: number) => this._renderDeviceConfig(device, index))}
        </div>
      </ha-expansion-panel>
    `;
  }

  private _renderDeviceConfig(device: any, index: number) {
    const domain = device.entity ? device.entity.split('.')[0] : '';
    const isLightEntity = domain === 'light';
    const attributes = this._getEntityAttributes(device.entity);
    
    return html`
      <div class="device-config">
        <div class="device-header">
          <span>Device ${index + 1}</span>
          <ha-icon-button
            @click=${() => this._removeDevice(index)}
            .path=${'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z'}
          ></ha-icon-button>
        </div>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: {} }}
          .value=${device.entity}
          .label=${'Entity'}
          @value-changed=${(e: CustomEvent) => this._handleDeviceChange({
            target: { configValue: 'entity' },
            detail: { value: e.detail.value }
          } as any, index)}
        ></ha-selector>

        <ha-textfield
          label="Control Entity (Optional)"
          .value=${device.control_entity || ''}
          @input=${(e: any) => this._handleDeviceChange({
            target: { configValue: 'control_entity' },
            detail: { value: e.target.value }
          } as any, index)}
          helper="Leave empty to use the same entity for control"
        ></ha-textfield>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ icon: {} }}
          .value=${device.icon || ''}
          .label=${'Icon'}
          @value-changed=${(e: CustomEvent) => this._handleDeviceChange({
            target: { configValue: 'icon' },
            detail: { value: e.detail.value }
          } as any, index)}
        ></ha-selector>

        <ha-select
          naturalMenuWidth
          fixedMenuPosition
          label="Slider Control Attribute"
          .value=${device.attribute || (this.deviceDefaults[domain]?.attribute || 'brightness')}
          @selected=${(e: any) => this._handleDeviceChange({
            target: { configValue: 'attribute' },
            detail: { value: e.target.value }
          } as any, index)}
          @closed=${(e: Event) => e.stopPropagation()}
        >
          ${attributes.map((attr: string) => html`
            <ha-list-item value="${attr}">${this._formatAttributeName(attr)}</ha-list-item>
          `)}
        </ha-select>

        <ha-textfield
          label="Scale Factor"
          type="number"
          .value=${device.scale || (domain === 'light' ? 2.55 : 1)}
          @input=${(e: any) => this._handleDeviceChange({
            target: { configValue: 'scale' },
            detail: { value: parseFloat(e.target.value) }
          } as any, index)}
          helper="Multiplier for slider values (e.g., 2.55 for brightness 0-255, 1 for 0-100)"
        ></ha-textfield>

        <ha-select
          naturalMenuWidth
          fixedMenuPosition
          label="Control Type"
          .value=${device.type || 'continuous'}
          @selected=${(e: any) => this._handleDeviceChange({
            target: { configValue: 'type' },
            detail: { value: e.target.value }
          } as any, index)}
          @closed=${(e: Event) => e.stopPropagation()}
        >
          <ha-list-item value="continuous">Continuous Slider</ha-list-item>
          <ha-list-item value="discrete">Discrete Modes</ha-list-item>
        </ha-select>

        ${device.type === 'discrete' ? this._renderDeviceModes(device, index) : ''}

        <div class="device-toggles">
          <ha-formfield label="Show Chip">
            <ha-switch
              .checked=${device.show_chip !== false}
              @change=${(e: any) => this._handleDeviceChange({
                target: { configValue: 'show_chip' },
                detail: { value: e.target.checked }
              } as any, index)}
            ></ha-switch>
          </ha-formfield>

          <ha-formfield label="Show Slider">
            <ha-switch
              .checked=${device.show_slider !== false}
              @change=${(e: any) => this._handleDeviceChange({
                target: { configValue: 'show_slider' },
                detail: { value: e.target.checked }
              } as any, index)}
            ></ha-switch>
          </ha-formfield>
        </div>

        <ha-textfield
          label="Chip Column"
          type="number"
          min="1"
          max="${this._config.chip_columns || 1}"
          .value=${device.chip_column || 1}
          @input=${(e: any) => {
            const value = parseInt(e.target.value);
            const maxColumns = this._config.chip_columns || 1;
            if (value >= 1 && value <= maxColumns) {
              this._handleDeviceChange({
                target: { configValue: 'chip_column' },
                detail: { value: value }
              } as any, index);
            }
          }}
          helper="Which column to place this chip in (1-${this._config.chip_columns || 1})"
        ></ha-textfield>

        <div class="device-colors">
          <label>Device Colors</label>
          
          <ha-textfield
            label="Icon Color (hex, rgb, rgba)"
            .value=${device.icon_color || '#FFFFFF'}
            @input=${(e: any) => this._handleDeviceChange({
              target: { configValue: 'icon_color' },
              detail: { value: e.target.value }
            } as any, index)}
          ></ha-textfield>

          <ha-textfield
            label="On Color (hex, rgb, rgba)"
            .value=${device.color_on || (isLightEntity ? 'light-color' : '#FDD835')}
            @input=${(e: any) => this._handleDeviceChange({
              target: { configValue: 'color_on' },
              detail: { value: e.target.value }
            } as any, index)}
            helper="${isLightEntity ? 'Use "light-color" to match light RGB' : 'Color when device is on'}"
          ></ha-textfield>

          <ha-textfield
            label="Off Color (hex, rgb, rgba)"
            .value=${device.color_off || 'rgba(0, 0, 0, 0.2)'}
            @input=${(e: any) => this._handleDeviceChange({
              target: { configValue: 'color_off' },
              detail: { value: e.target.value }
            } as any, index)}
          ></ha-textfield>

          <ha-textfield
            label="Unavailable Color (hex, rgb, rgba)"
            .value=${device.color_unavailable || 'rgba(128, 128, 128, 0.5)'}
            @input=${(e: any) => this._handleDeviceChange({
              target: { configValue: 'color_unavailable' },
              detail: { value: e.target.value }
            } as any, index)}
          ></ha-textfield>
        </div>
      </div>
    `;
  }

  private _renderDeviceModes(device: any, deviceIndex: number) {
    const modes = device.modes || [];

    return html`
      <div class="modes-section">
        <div class="modes-header">
          <label>Discrete Modes</label>
          <ha-icon-button
            @click=${() => this._addMode(deviceIndex)}
            .path=${'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z'}
          ></ha-icon-button>
        </div>
        <div class="modes-list">
          ${modes.map((mode: any, modeIndex: number) => html`
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
                @input=${(e: any) => this._updateMode(deviceIndex, modeIndex, 'value', parseInt(e.target.value))}
              ></ha-textfield>
              <ha-textfield
                label="Percentage"
                type="number"
                .value=${mode.percentage}
                @input=${(e: any) => this._updateMode(deviceIndex, modeIndex, 'percentage', parseInt(e.target.value))}
              ></ha-textfield>
              <ha-icon-button
                @click=${() => this._removeMode(deviceIndex, modeIndex)}
                .path=${'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z'}
              ></ha-icon-button>
            </div>
          `)}
        </div>
      </div>
    `;
  }

  private _handleBackgroundTypeChange(type: string) {
    if (!this._config) return;

    const currentBackground = this._config.background;

    if (type === 'static') {
      let newColor;

      if (typeof currentBackground === 'string') {
        return;
      } else if (typeof currentBackground === 'object' && currentBackground.ranges && currentBackground.ranges.length > 0) {
        newColor = currentBackground.ranges[0]?.color || 'var(--ha-card-background)';
      } else {
        newColor = 'var(--ha-card-background)';
      }

      this._updateConfig({
        background: newColor
      });
    } else if (type === 'entity') {
      if (typeof currentBackground === 'object' && currentBackground.entity !== undefined) {
        return;
      }

      const newEntityConfig: any = {
        entity: '',
        ranges: []
      };

      if (typeof currentBackground === 'string' && currentBackground) {
        newEntityConfig.ranges = [
          {
            state: 'on',
            color: currentBackground
          },
          {
            state: 'off',
            color: 'var(--state-inactive-color)'
          }
        ];
      }

      this._updateConfig({
        background: newEntityConfig
      });
    }
  }

  private _handleIconColorTypeChange(type: string) {
    if (type === 'static') {
      this._updateConfig({ icon_color: '#FFFFFF' });
    } else {
      this._updateConfig({ icon_color: { entity: '', ranges: [] } });
    }
  }

  private _handleIconBgTypeChange(type: string) {
    if (type === 'static') {
      this._updateConfig({ icon_background: 'rgba(255, 255, 255, 0.2)' });
    } else {
      this._updateConfig({ icon_background: { entity: '', ranges: [] } });
    }
  }

  private _addColorRange(configKey: string) {
    const config = this._config[configKey];
    const newRange = { min: 0, max: 100, color: '#FFFFFF' };
    const ranges = [...(config.ranges || []), newRange];
    this._updateConfig({
      [configKey]: { ...config, ranges }
    });
  }

  private _updateColorRange(configKey: string, index: number, field: string, value: any) {
    const config = this._config[configKey];
    const ranges = [...(config.ranges || [])];
    ranges[index] = { ...ranges[index], [field]: value };
    this._updateConfig({
      [configKey]: { ...config, ranges }
    });
  }

  private _removeColorRange(configKey: string, index: number) {
    const config = this._config[configKey];
    const ranges = [...(config.ranges || [])];
    ranges.splice(index, 1);
    this._updateConfig({
      [configKey]: { ...config, ranges }
    });
  }

  private _toggleRangeType(configKey: string, index: number) {
    const config = this._config[configKey];
    const ranges = [...(config.ranges || [])];
    const range = ranges[index];

    if (range.state !== undefined) {
      delete range.state;
      range.min = 0;
      range.max = 100;
    } else {
      delete range.min;
      delete range.max;
      range.state = 'on';
    }

    ranges[index] = range;
    this._updateConfig({
      [configKey]: { ...config, ranges }
    });
  }

  private _addDevice() {
    const devices = [...(this._config.devices || [])];
    devices.push({
      entity: '',
      icon: 'mdi:lightbulb',
      attribute: 'brightness',
      scale: 2.55,
      type: 'continuous',
      show_chip: true,
      show_slider: true,
      chip_column: 1,
      color_on: '#FDD835',
      color_off: 'rgba(0, 0, 0, 0.2)',
      color_unavailable: 'rgba(128, 128, 128, 0.5)',
      icon_color: '#FFFFFF'
    });
    this._updateConfig({ devices });
  }

  private _removeDevice(index: number) {
    const devices = [...(this._config.devices || [])];
    devices.splice(index, 1);
    this._updateConfig({ devices });
  }

  private _addMode(deviceIndex: number) {
    const devices = [...(this._config.devices || [])];
    const modes = [...(devices[deviceIndex].modes || [])];
    modes.push({
      label: `Mode ${modes.length + 1}`,
      value: modes.length,
      percentage: modes.length * 33
    });
    devices[deviceIndex] = { ...devices[deviceIndex], modes };
    this._updateConfig({ devices });
  }

  private _updateMode(deviceIndex: number, modeIndex: number, field: string, value: any) {
    const devices = [...(this._config.devices || [])];
    const modes = [...(devices[deviceIndex].modes || [])];
    modes[modeIndex] = { ...modes[modeIndex], [field]: value };
    devices[deviceIndex] = { ...devices[deviceIndex], modes };
    this._updateConfig({ devices });
  }

  private _removeMode(deviceIndex: number, modeIndex: number) {
    const devices = [...(this._config.devices || [])];
    const modes = [...(devices[deviceIndex].modes || [])];
    modes.splice(modeIndex, 1);
    devices[deviceIndex] = { ...devices[deviceIndex], modes };
    this._updateConfig({ devices });
  }

  private _formatAttributeName(attr: string): string {
    return attr.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  private _getEntityAttributes(entity: string): string[] {
    if (!entity || !this.hass) return ['state'];

    const domain = entity.split('.')[0];

    const domainAttributes: { [key: string]: string[] } = {
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

  private _valueChanged(ev: any) {
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.target || ev.currentTarget;
    const configValue = target.configValue;

    if (configValue) {
      const newConfig = { ...this._config };
      const value = target.checked !== undefined ? target.checked : ev.detail?.value ?? target.value;
      newConfig[configValue] = value;
      this._updateConfig(newConfig);
    }
  }

  private _updateConfig(config: any) {
    this._config = { ...this._config, ...config };
    const event = new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  private _handleDeviceChange(ev: any, index: number) {
    const devices = [...(this._config.devices || [])];
    const target = ev.target || ev.currentTarget;
    const configValue = target.configValue;
    const value = target.checked !== undefined ? target.checked : ev.detail?.value ?? target.value;

    if (configValue === 'entity' && value) {
      const domain = value.split('.')[0];
      const defaults = this.deviceDefaults[domain];

      if (defaults && !devices[index].icon) {
        devices[index] = {
          ...devices[index],
          entity: value,
          icon: defaults.icon,
          attribute: defaults.attribute,
          scale: domain === 'light' ? 2.55 : 1,
          color_on: defaults.color
        };
      } else {
        devices[index] = { ...devices[index], [configValue]: value };
      }
    } else {
      devices[index] = { ...devices[index], [configValue]: value };
    }

    this._updateConfig({ devices });
  }

  static get styles() {
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

      .subsection {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px;
        background: var(--card-background-color);
        border-radius: 4px;
      }

      .subsection label {
        font-weight: 500;
        font-size: 14px;
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
        margin-bottom: 8px;
      }

      .devices-header label,
      .modes-header label,
      .ranges-header label {
        font-weight: 500;
        font-size: 1.1em;
      }

      .device-config {
        padding: 12px;
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .device-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-weight: 500;
        margin-bottom: 8px;
      }

      .modes-section,
      .color-ranges {
        padding: 12px;
        background: var(--secondary-background-color);
        border-radius: 8px;
      }

      .modes-list,
      .ranges-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .mode-item,
      .range-item {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .range-inputs {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
      }

      .mode-item ha-textfield,
      .range-item ha-textfield {
        flex: 1;
      }

      .color-config-section {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 12px;
        background: var(--secondary-background-color);
        border-radius: 8px;
      }

      .color-config-section label {
        font-weight: 500;
        margin-bottom: 4px;
      }

      .device-colors {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px;
        background: var(--secondary-background-color);
        border-radius: 8px;
      }

      .device-colors label {
        font-weight: 500;
        margin-bottom: 4px;
      }

      ha-expansion-panel {
        margin-top: 8px;
      }

      ha-icon-button {
        color: var(--primary-color);
      }

      ha-icon-button[slot="trigger"] {
        color: var(--secondary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'room-card-test-editor': RoomCardTestEditor;
  }
}