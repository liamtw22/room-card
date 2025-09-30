import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardEditor, fireEvent } from 'custom-card-helpers';
import './ha-form';
import './ha-expansion-panel';
import './ha-selector';
import './ha-entity-picker';
import './ha-area-picker';
import './ha-icon-picker';
import './hui-entity-editor';
import './ha-formfield';
import './ha-switch';
import './ha-textfield';
import './ha-select';
import './ha-list-item';
import './ha-icon-button';
import './ha-button-menu';

interface RoomCardConfig {
  type: string;
  area: string;
  name?: string;
  background?: string | { entity: string; ranges?: Array<any> };
  icon?: string;
  icon_color?: string | { entity: string; ranges?: Array<any> };
  icon_background?: string | { entity: string; ranges?: Array<any> };
  temperature_sensor?: string;
  humidity_sensor?: string;
  show_temperature?: boolean;
  show_humidity?: boolean;
  temperature_unit?: 'F' | 'C';
  haptic_feedback?: boolean;
  devices?: Array<DeviceConfig>;
  chip_columns?: number;
  tap_action?: any;
  hold_action?: any;
  double_tap_action?: any;
}

interface DeviceConfig {
  entity: string;
  control_entity?: string;
  icon?: string;
  attribute?: string;
  scale?: number;
  type?: 'continuous' | 'discrete';
  modes?: Array<{ label: string; value: number; percentage: number }>;
  show_chip?: boolean;
  show_slider?: boolean;
  color_on?: string;
  color_off?: string;
  color_unavailable?: string;
  icon_color?: string;
}

const SCHEMA = [
  {
    name: 'area',
    selector: { area: {} },
    required: true
  },
  {
    name: 'name',
    selector: { text: {} }
  },
  {
    type: 'expandable',
    title: 'Appearance',
    schema: [
      {
        name: 'icon',
        selector: { icon: {} },
        default: 'mdi:home'
      },
      {
        name: 'chip_columns',
        selector: { 
          number: { 
            min: 1, 
            max: 4, 
            mode: 'slider' 
          } 
        },
        default: 1
      }
    ]
  },
  {
    type: 'expandable',
    title: 'Temperature & Humidity',
    schema: [
      {
        name: 'temperature_sensor',
        selector: { 
          entity: { 
            domain: 'sensor',
            device_class: 'temperature'
          } 
        }
      },
      {
        name: 'humidity_sensor',
        selector: { 
          entity: { 
            domain: 'sensor',
            device_class: 'humidity'
          } 
        }
      },
      {
        name: 'show_temperature',
        selector: { boolean: {} },
        default: true
      },
      {
        name: 'show_humidity',
        selector: { boolean: {} },
        default: true
      },
      {
        name: 'temperature_unit',
        selector: { 
          select: {
            options: [
              { value: 'F', label: 'Fahrenheit' },
              { value: 'C', label: 'Celsius' }
            ]
          }
        },
        default: 'F'
      }
    ]
  },
  {
    type: 'expandable',
    title: 'Actions',
    schema: [
      {
        name: 'tap_action',
        selector: { 
          action: {}
        }
      },
      {
        name: 'hold_action',
        selector: { 
          action: {}
        }
      },
      {
        name: 'double_tap_action',
        selector: { 
          action: {}
        }
      }
    ]
  },
  {
    name: 'haptic_feedback',
    selector: { boolean: {} },
    default: true
  }
];

const DEVICE_DEFAULTS: Record<string, any> = {
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

@customElement('room-card-editor')
export class RoomCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config?: RoomCardConfig;
  @state() private _helpers?: any;
  @state() private _expandedSections = {
    basic: true,
    appearance: false,
    temperature: false,
    devices: false,
    actions: false,
    advanced: false
  };
  @state() private _errors: Record<string, string> = {};

  static get configSchema() {
    return {
      type: 'object',
      properties: {
        area: { type: 'string', required: true },
        name: { type: 'string' },
        background: { 
          oneOf: [
            { type: 'string' },
            {
              type: 'object',
              properties: {
                entity: { type: 'string' },
                ranges: { type: 'array' }
              }
            }
          ]
        },
        icon: { type: 'string' },
        icon_color: { 
          oneOf: [
            { type: 'string' },
            { type: 'object' }
          ]
        },
        icon_background: { 
          oneOf: [
            { type: 'string' },
            { type: 'object' }
          ]
        },
        temperature_sensor: { type: 'string' },
        humidity_sensor: { type: 'string' },
        show_temperature: { type: 'boolean' },
        show_humidity: { type: 'boolean' },
        temperature_unit: { type: 'string', enum: ['F', 'C'] },
        haptic_feedback: { type: 'boolean' },
        devices: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              entity: { type: 'string', required: true },
              control_entity: { type: 'string' },
              icon: { type: 'string' },
              attribute: { type: 'string' },
              scale: { type: 'number' },
              type: { type: 'string', enum: ['continuous', 'discrete'] },
              modes: { type: 'array' },
              show_chip: { type: 'boolean' },
              show_slider: { type: 'boolean' },
              color_on: { type: 'string' },
              color_off: { type: 'string' },
              color_unavailable: { type: 'string' },
              icon_color: { type: 'string' }
            }
          }
        },
        chip_columns: { type: 'number', minimum: 1, maximum: 4 },
        tap_action: { type: 'object' },
        hold_action: { type: 'object' },
        double_tap_action: { type: 'object' }
      }
    };
  }

  public setConfig(config: RoomCardConfig): void {
    this._config = {
      ...config,
      background: config.background !== undefined ? config.background : 'var(--ha-card-background)'
    };
    
    this._validateConfig();
  }

  private _validateConfig(): void {
    this._errors = {};
    
    if (!this._config?.area) {
      this._errors.area = 'Area is required';
    }
    
    if (this._config?.devices) {
      this._config.devices.forEach((device, index) => {
        if (!device.entity) {
          this._errors[`device_${index}`] = 'Entity is required for device';
        }
      });
    }
  }

  private _getAreaName(areaId?: string): string {
    if (!this.hass || !areaId) return areaId || '';
    const area = this.hass.areas[areaId];
    return area?.name || areaId;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <div class="card-config">
        ${this._errors.area ? html`
          <hui-warning>
            ${this._errors.area}
          </hui-warning>
        ` : ''}
        
        <ha-form
          .hass=${this.hass}
          .data=${this._config}
          .schema=${SCHEMA}
          @value-changed=${this._handleFormChange}
        ></ha-form>

        ${this._renderAdvancedSection()}
        ${this._renderDevicesSection()}
      </div>
    `;
  }

  private _renderAdvancedSection() {
    return html`
      <ha-expansion-panel
        .header=${'Advanced Settings'}
        .expanded=${this._expandedSections.advanced}
        @expanded-changed=${(e: any) => this._expandedSections.advanced = e.detail.expanded}
      >
        <div class="section-content">
          ${this._renderBackgroundConfig()}
          ${this._renderIconColorConfig()}
          ${this._renderIconBackgroundConfig()}
        </div>
      </ha-expansion-panel>
    `;
  }

  private _renderBackgroundConfig() {
    let backgroundType = 'static';
    if (this._config?.background && typeof this._config.background === 'object' && 'entity' in this._config.background) {
      backgroundType = 'entity';
    }

    return html`
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
          <ha-selector
            .hass=${this.hass}
            .selector=${{ color_rgb: {} }}
            .value=${typeof this._config?.background === 'string' ? this._config.background : 'var(--ha-card-background)'}
            .label=${'Background Color'}
            @value-changed=${(e: any) => {
              this._updateConfig({ background: e.detail.value });
            }}
          ></ha-selector>
        ` : html`
          <ha-entity-picker
            .hass=${this.hass}
            .value=${(this._config?.background as any)?.entity || ''}
            .label=${'Entity'}
            @value-changed=${(e: any) => {
              const background = this._config?.background as any || {};
              this._updateConfig({
                background: {
                  ...background,
                  entity: e.detail.value
                }
              });
            }}
          ></ha-entity-picker>
          ${(this._config?.background as any)?.entity ? 
            this._renderColorRanges('background', (this._config?.background as any)?.ranges || []) : ''}
        `}
      </div>
    `;
  }

  private _renderIconColorConfig() {
    const iconColorType = typeof this._config?.icon_color === 'object' && (this._config?.icon_color as any)?.entity ?
      'entity' : 'static';

    return html`
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
          <ha-selector
            .hass=${this.hass}
            .selector=${{ color_rgb: {} }}
            .value=${this._config?.icon_color || '#FFFFFF'}
            .label=${'Icon Color'}
            @value-changed=${(e: any) => {
              this._updateConfig({ icon_color: e.detail.value });
            }}
          ></ha-selector>
        ` : html`
          <ha-entity-picker
            .hass=${this.hass}
            .value=${(this._config?.icon_color as any)?.entity || ''}
            .label=${'Entity'}
            @value-changed=${(e: any) => {
              const iconColor = this._config?.icon_color as any || {};
              this._updateConfig({
                icon_color: {
                  ...iconColor,
                  entity: e.detail.value
                }
              });
            }}
          ></ha-entity-picker>
          ${(this._config?.icon_color as any)?.entity ?
            this._renderColorRanges('icon_color', (this._config?.icon_color as any)?.ranges || []) : ''}
        `}
      </div>
    `;
  }

  private _renderIconBackgroundConfig() {
    const iconBgColorType = typeof this._config?.icon_background === 'object' && (this._config?.icon_background as any)?.entity ?
      'entity' : 'static';

    return html`
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
          <ha-selector
            .hass=${this.hass}
            .selector=${{ color_rgb: {} }}
            .value=${this._config?.icon_background || 'rgba(255, 255, 255, 0.2)'}
            .label=${'Icon Background Color'}
            @value-changed=${(e: any) => {
              this._updateConfig({ icon_background: e.detail.value });
            }}
          ></ha-selector>
        ` : html`
          <ha-entity-picker
            .hass=${this.hass}
            .value=${(this._config?.icon_background as any)?.entity || ''}
            .label=${'Entity'}
            @value-changed=${(e: any) => {
              const iconBg = this._config?.icon_background as any || {};
              this._updateConfig({
                icon_background: {
                  ...iconBg,
                  entity: e.detail.value
                }
              });
            }}
          ></ha-entity-picker>
          ${(this._config?.icon_background as any)?.entity ?
            this._renderColorRanges('icon_background', (this._config?.icon_background as any)?.ranges || []) : ''}
        `}
      </div>
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
          ${ranges.map((range, index) => html`
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
                <ha-selector
                  .hass=${this.hass}
                  .selector=${{ color_rgb: {} }}
                  .value=${range.color || ''}
                  .label=${'Color'}
                  @value-changed=${(e: any) => this._updateColorRange(configKey, index, 'color', e.detail.value)}
                ></ha-selector>
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

  private _renderDevicesSection() {
    const devices = this._config?.devices || [];
    
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

          ${devices.map((device, index) => this._renderDeviceConfig(device, index))}
        </div>
      </ha-expansion-panel>
    `;
  }

  private _renderDeviceConfig(device: DeviceConfig, index: number) {
    const domain = device.entity ? device.entity.split('.')[0] : '';
    const attributes = this._getEntityAttributes(device.entity);
    
    return html`
      <div class="device-config">
        ${this._errors[`device_${index}`] ? html`
          <hui-warning>
            ${this._errors[`device_${index}`]}
          </hui-warning>
        ` : ''}
        
        <div class="device-header">
          <span>Device ${index + 1}</span>
          <ha-icon-button
            @click=${() => this._removeDevice(index)}
            .path=${'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z'}
          ></ha-icon-button>
        </div>

        <ha-entity-picker
          .hass=${this.hass}
          .value=${device.entity}
          .label=${'Entity'}
          @value-changed=${(e: any) => this._handleDeviceChange({
            target: { configValue: 'entity' },
            detail: { value: e.detail.value }
          }, index)}
        ></ha-entity-picker>

        <ha-entity-picker
          .hass=${this.hass}
          .value=${device.control_entity || ''}
          .label=${'Control Entity (Optional)'}
          .allowCustomEntity=${true}
          @value-changed=${(e: any) => this._handleDeviceChange({
            target: { configValue: 'control_entity' },
            detail: { value: e.detail.value }
          }, index)}
        ></ha-entity-picker>

        <ha-icon-picker
          .hass=${this.hass}
          .value=${device.icon || ''}
          .label=${'Icon'}
          @value-changed=${(e: any) => this._handleDeviceChange({
            target: { configValue: 'icon' },
            detail: { value: e.detail.value }
          }, index)}
        ></ha-icon-picker>

        <ha-select
          naturalMenuWidth
          fixedMenuPosition
          label="Attribute"
          .value=${device.attribute || (DEVICE_DEFAULTS[domain]?.attribute || 'brightness')}
          @selected=${(e: any) => this._handleDeviceChange({
            target: { configValue: 'attribute' },
            detail: { value: e.target.value }
          }, index)}
          @closed=${(e: Event) => e.stopPropagation()}
        >
          ${attributes.map(attr => html`
            <ha-list-item value="${attr}">${this._formatAttributeName(attr)}</ha-list-item>
          `)}
        </ha-select>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ 
            number: { 
              min: 0.1, 
              max: 255,
              step: 0.1,
              mode: 'box'
            } 
          }}
          .value=${device.scale || (domain === 'light' ? 2.55 : 1)}
          .label=${'Scale Factor'}
          @value-changed=${(e: any) => this._handleDeviceChange({
            target: { configValue: 'scale' },
            detail: { value: e.detail.value }
          }, index)}
        ></ha-selector>

        <ha-select
          naturalMenuWidth
          fixedMenuPosition
          label="Control Type"
          .value=${device.type || 'continuous'}
          @selected=${(e: any) => this._handleDeviceChange({
            target: { configValue: 'type' },
            detail: { value: e.target.value }
          }, index)}
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

        <div class="device-colors">
          <label>Device Colors</label>
          
          <ha-selector
            .hass=${this.hass}
            .selector=${{ color_rgb: {} }}
            .value=${device.icon_color || '#FFFFFF'}
            .label=${'Icon Color'}
            @value-changed=${(e: any) => this._handleDeviceChange({
              target: { configValue: 'icon_color' },
              detail: { value: e.detail.value }
            }, index)}
          ></ha-selector>

          <ha-selector
            .hass=${this.hass}
            .selector=${{ color_rgb: {} }}
            .value=${device.color_on || (domain === 'light' ? 'light-color' : '#FDD835')}
            .label=${'On Color'}
            @value-changed=${(e: any) => this._handleDeviceChange({
              target: { configValue: 'color_on' },
              detail: { value: e.detail.value }
            }, index)}
          ></ha-selector>
          ${domain === 'light' ? html`
            <span class="helper-text">Use "light-color" to match light RGB</span>
          ` : ''}

          <ha-selector
            .hass=${this.hass}
            .selector=${{ color_rgb: {} }}
            .value=${device.color_off || 'rgba(0, 0, 0, 0.2)'}
            .label=${'Off Color'}
            @value-changed=${(e: any) => this._handleDeviceChange({
              target: { configValue: 'color_off' },
              detail: { value: e.detail.value }
            }, index)}
          ></ha-selector>

          <ha-selector
            .hass=${this.hass}
            .selector=${{ color_rgb: {} }}
            .value=${device.color_unavailable || 'rgba(128, 128, 128, 0.5)'}
            .label=${'Unavailable Color'}
            @value-changed=${(e: any) => this._handleDeviceChange({
              target: { configValue: 'color_unavailable' },
              detail: { value: e.detail.value }
            }, index)}
          ></ha-selector>
        </div>
      </div>
    `;
  }

  private _renderDeviceModes(device: DeviceConfig, deviceIndex: number) {
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
          ${modes.map((mode, modeIndex) => html`
            <div class="mode-item">
              <ha-textfield
                label="Label"
                .value=${mode.label}
                @input=${(e: any) => this._updateMode(deviceIndex, modeIndex, 'label', e.target.value)}
              ></ha-textfield>
              <ha-selector
                .hass=${this.hass}
                .selector=${{ 
                  number: { 
                    min: 0,
                    max: 100,
                    mode: 'slider'
                  } 
                }}
                .value=${mode.value}
                .label=${'Value'}
                @value-changed=${(e: any) => this._updateMode(deviceIndex, modeIndex, 'value', e.detail.value)}
              ></ha-selector>
              <ha-selector
                .hass=${this.hass}
                .selector=${{ 
                  number: { 
                    min: 0,
                    max: 100,
                    mode: 'slider'
                  } 
                }}
                .value=${mode.percentage}
                .label=${'Percentage'}
                @value-changed=${(e: any) => this._updateMode(deviceIndex, modeIndex, 'percentage', e.detail.value)}
              ></ha-selector>
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

  private _handleFormChange(ev: CustomEvent): void {
    if (!this._config) return;
    this._updateConfig(ev.detail.value);
  }

  private _handleBackgroundTypeChange(type: string): void {
    if (!this._config) return;
    
    const currentBackground = this._config.background;
    
    if (type === 'static') {
      let newColor = 'var(--ha-card-background)';
      
      if (typeof currentBackground === 'string') {
        return;
      } else if (typeof currentBackground === 'object' && (currentBackground as any).ranges?.length > 0) {
        newColor = (currentBackground as any).ranges[0]?.color || 'var(--ha-card-background)';
      }
      
      this._updateConfig({ background: newColor });
    } else if (type === 'entity') {
      if (typeof currentBackground === 'object' && (currentBackground as any).entity !== undefined) {
        return;
      }
      
      const newEntityConfig = {
        entity: '',
        ranges: []
      };
      
      if (typeof currentBackground === 'string' && currentBackground) {
        newEntityConfig.ranges = [
          { state: 'on', color: currentBackground },
          { state: 'off', color: 'var(--state-inactive-color)' }
        ];
      }
      
      this._updateConfig({ background: newEntityConfig });
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

  private _addColorRange(configKey: string): void {
    const config = (this._config as any)[configKey];
    const newRange = { min: 0, max: 100, color: '#FFFFFF' };
    const ranges = [...(config.ranges || []), newRange];
    this._updateConfig({
      [configKey]: { ...config, ranges }
    });
  }

  private _updateColorRange(configKey: string, index: number, field: string, value: any): void {
    const config = (this._config as any)[configKey];
    const ranges = [...(config.ranges || [])];
    ranges[index] = { ...ranges[index], [field]: value };
    this._updateConfig({
      [configKey]: { ...config, ranges }
    });
  }

  private _removeColorRange(configKey: string, index: number): void {
    const config = (this._config as any)[configKey];
    const ranges = [...(config.ranges || [])];
    ranges.splice(index, 1);
    this._updateConfig({
      [configKey]: { ...config, ranges }
    });
  }

  private _toggleRangeType(configKey: string, index: number): void {
    const config = (this._config as any)[configKey];
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

  private _addDevice(): void {
    const devices = [...(this._config?.devices || [])];
    devices.push({
      entity: '',
      icon: 'mdi:lightbulb',
      attribute: 'brightness',
      scale: 2.55,
      type: 'continuous',
      show_chip: true,
      show_slider: true,
      color_on: '#FDD835',
      color_off: 'rgba(0, 0, 0, 0.2)',
      color_unavailable: 'rgba(128, 128, 128, 0.5)',
      icon_color: '#FFFFFF'
    });
    this._updateConfig({ devices });
  }

  private _removeDevice(index: number): void {
    const devices = [...(this._config?.devices || [])];
    devices.splice(index, 1);
    this._updateConfig({ devices });
  }

  private _addMode(deviceIndex: number): void {
    const devices = [...(this._config?.devices || [])];
    const modes = [...(devices[deviceIndex].modes || [])];
    modes.push({
      label: `Mode ${modes.length + 1}`,
      value: modes.length,
      percentage: modes.length * 33
    });
    devices[deviceIndex] = { ...devices[deviceIndex], modes };
    this._updateConfig({ devices });
  }

  private _updateMode(deviceIndex: number, modeIndex: number, field: string, value: any): void {
    const devices = [...(this._config?.devices || [])];
    const modes = [...(devices[deviceIndex].modes || [])];
    modes[modeIndex] = { ...modes[modeIndex], [field]: value };
    devices[deviceIndex] = { ...devices[deviceIndex], modes };
    this._updateConfig({ devices });
  }

  private _removeMode(deviceIndex: number, modeIndex: number): void {
    const devices = [...(this._config?.devices || [])];
    const modes = [...(devices[deviceIndex].modes || [])];
    modes.splice(modeIndex, 1);
    devices[deviceIndex] = { ...devices[deviceIndex], modes };
    this._updateConfig({ devices });
  }

  private _formatAttributeName(attr: string): string {
    return attr.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  private _getEntityAttributes(entity: string): string[] {
    if (!entity || !this.hass) return ['state'];
    
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
      const customAttrs = Object.keys(stateObj.attributes).filter(attr => 
        !['friendly_name', 'icon', 'entity_id', 'supported_features', 'device_class'].includes(attr)
      );
      return [...new Set([...defaultAttrs, ...customAttrs])];
    }
    
    return defaultAttrs;
  }

  private _handleDeviceChange(ev: any, index: number): void {
    const devices = [...(this._config?.devices || [])];
    const target = ev.target || ev.currentTarget;
    const configValue = target.configValue;
    const value = target.checked !== undefined ? target.checked : ev.detail?.value ?? target.value;
    
    if (configValue === 'entity' && value) {
      const domain = value.split('.')[0];
      const defaults = DEVICE_DEFAULTS[domain];
      
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
    this._validateConfig();
  }

  private _updateConfig(config: Partial<RoomCardConfig>): void {
    this._config = { ...this._config!, ...config };
    this._validateConfig();
    
    const event = new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
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

      .helper-text {
        font-size: 12px;
        color: var(--secondary-text-color);
        margin-top: -8px;
        margin-bottom: 8px;
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
        background: var(--card-background-color);
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
      .mode-item ha-selector,
      .range-item ha-textfield,
      .range-item ha-selector {
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

      hui-warning {
        display: block;
        margin-bottom: 8px;
      }
    `;
  }
}
