import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';

@customElement('room-card-editor')
export class RoomCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: any;

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

  private _renderBasicSection() {
    const areas = Object.values(this.hass.areas || {});
    const selectedArea = areas.find((a: any) => a.area_id === this._config.area);
    
    return html`
      <div class="section">
        <div class="section-header">Basic Configuration</div>
        
        <ha-selector
          .hass=${this.hass}
          .selector=${{ area: {} }}
          .value=${this._config.area || ''}
          .label=${'Area'}
          @value-changed=${(e: CustomEvent) => this._valueChanged('area', e.detail.value)}
        ></ha-selector>

        ${selectedArea ? html`
          <div class="info-text">Selected: ${selectedArea.name}</div>
        ` : ''}

        <ha-textfield
          label="Display Name (Optional)"
          .value=${this._config.name || ''}
          @input=${(e: any) => this._valueChanged('name', e.target.value)}
          helper="Leave empty to use area name"
        ></ha-textfield>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ icon: {} }}
          .value=${this._config.icon || 'mdi:home'}
          .label=${'Icon'}
          @value-changed=${(e: CustomEvent) => this._valueChanged('icon', e.detail.value)}
        ></ha-selector>

        <ha-formfield label="Haptic Feedback">
          <ha-switch
            .checked=${this._config.haptic_feedback !== false}
            @change=${(e: any) => this._valueChanged('haptic_feedback', e.target.checked)}
          ></ha-switch>
        </ha-formfield>
      </div>
    `;
  }

  private _renderAppearanceSection() {
    const bgType = typeof this._config.background === 'object' ? 'entity' : 'static';
    const iconColorType = typeof this._config.icon_color === 'object' ? 'entity' : 'static';
    const iconBgType = typeof this._config.icon_background === 'object' ? 'entity' : 'static';

    return html`
      <div class="section">
        <div class="section-header">Appearance</div>

        <!-- Background Configuration -->
        <div class="subsection">
          <label>Card Background</label>
          <ha-select
            .label=${'Background Type'}
            .value=${bgType}
            @selected=${(e: any) => this._handleBackgroundTypeChange(e.target.value)}
            @closed=${(e: Event) => e.stopPropagation()}
          >
            <ha-list-item value="static">Static Color</ha-list-item>
            <ha-list-item value="entity">Entity Based</ha-list-item>
          </ha-select>

          ${bgType === 'static' ? html`
            <ha-textfield
              label="Color"
              .value=${typeof this._config.background === 'string' ? this._config.background : ''}
              @input=${(e: any) => this._valueChanged('background', e.target.value)}
              helper="CSS color or variable (e.g., #FFFFFF, var(--ha-card-background))"
            ></ha-textfield>
          ` : this._renderEntityColorConfig('background', this._config.background)}
        </div>

        <!-- Icon Color Configuration -->
        <div class="subsection">
          <label>Icon Color</label>
          <ha-select
            .label=${'Icon Color Type'}
            .value=${iconColorType}
            @selected=${(e: any) => this._handleIconColorTypeChange(e.target.value)}
            @closed=${(e: Event) => e.stopPropagation()}
          >
            <ha-list-item value="static">Static Color</ha-list-item>
            <ha-list-item value="entity">Entity Based</ha-list-item>
          </ha-select>

          ${iconColorType === 'static' ? html`
            <ha-textfield
              label="Color"
              .value=${this._config.icon_color || '#FFFFFF'}
              @input=${(e: any) => this._valueChanged('icon_color', e.target.value)}
            ></ha-textfield>
          ` : this._renderEntityColorConfig('icon_color', this._config.icon_color)}
        </div>

        <!-- Icon Background Configuration -->
        <div class="subsection">
          <label>Icon Background</label>
          <ha-select
            .label=${'Icon Background Type'}
            .value=${iconBgType}
            @selected=${(e: any) => this._handleIconBgTypeChange(e.target.value)}
            @closed=${(e: Event) => e.stopPropagation()}
          >
            <ha-list-item value="static">Static Color</ha-list-item>
            <ha-list-item value="entity">Entity Based</ha-list-item>
          </ha-select>

          ${iconBgType === 'static' ? html`
            <ha-textfield
              label="Color"
              .value=${this._config.icon_background || 'rgba(255, 255, 255, 0.2)'}
              @input=${(e: any) => this._valueChanged('icon_background', e.target.value)}
            ></ha-textfield>
          ` : this._renderEntityColorConfig('icon_background', this._config.icon_background)}
        </div>
      </div>
    `;
  }

  private _renderEntityColorConfig(key: string, config: any) {
    const ranges = config?.ranges || [];
    
    return html`
      <ha-selector
        .hass=${this.hass}
        .selector=${{ entity: {} }}
        .value=${config?.entity || ''}
        .label=${'Entity'}
        @value-changed=${(e: CustomEvent) => {
          this._updateEntityConfig(key, 'entity', e.detail.value);
        }}
      ></ha-selector>

      ${config?.entity ? html`
        <div class="ranges-container">
          <div class="ranges-header">
            <span>Color Ranges</span>
            <ha-icon-button
              @click=${() => this._addRange(key)}
            >
              <ha-icon icon="mdi:plus"></ha-icon>
            </ha-icon-button>
          </div>

          ${ranges.map((range: any, index: number) => html`
            <div class="range-item">
              ${range.state !== undefined ? html`
                <ha-textfield
                  label="State"
                  .value=${range.state}
                  @input=${(e: any) => this._updateRange(key, index, 'state', e.target.value)}
                ></ha-textfield>
              ` : html`
                <ha-textfield
                  label="Min"
                  type="number"
                  .value=${range.min}
                  @input=${(e: any) => this._updateRange(key, index, 'min', parseFloat(e.target.value))}
                ></ha-textfield>
                <ha-textfield
                  label="Max"
                  type="number"
                  .value=${range.max}
                  @input=${(e: any) => this._updateRange(key, index, 'max', parseFloat(e.target.value))}
                ></ha-textfield>
              `}
              <ha-textfield
                label="Color"
                .value=${range.color}
                @input=${(e: any) => this._updateRange(key, index, 'color', e.target.value)}
              ></ha-textfield>
              <ha-icon-button
                @click=${() => this._removeRange(key, index)}
              >
                <ha-icon icon="mdi:delete"></ha-icon>
              </ha-icon-button>
              <ha-icon-button
                @click=${() => this._toggleRangeType(key, index)}
                title="Toggle between state and numeric range"
              >
                <ha-icon icon="mdi:swap-horizontal"></ha-icon>
              </ha-icon-button>
            </div>
          `)}
        </div>
      ` : ''}
    `;
  }

  private _renderTemperatureSection() {
    return html`
      <div class="section">
        <div class="section-header">Temperature & Humidity</div>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: 'sensor', device_class: 'temperature' } }}
          .value=${this._config.temperature_sensor || ''}
          .label=${'Temperature Sensor'}
          @value-changed=${(e: CustomEvent) => this._valueChanged('temperature_sensor', e.detail.value)}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: 'sensor', device_class: 'humidity' } }}
          .value=${this._config.humidity_sensor || ''}
          .label=${'Humidity Sensor'}
          @value-changed=${(e: CustomEvent) => this._valueChanged('humidity_sensor', e.detail.value)}
        ></ha-selector>

        <ha-formfield label="Show Temperature">
          <ha-switch
            .checked=${this._config.show_temperature !== false}
            @change=${(e: any) => this._valueChanged('show_temperature', e.target.checked)}
          ></ha-switch>
        </ha-formfield>

        <ha-formfield label="Show Humidity">
          <ha-switch
            .checked=${this._config.show_humidity !== false}
            @change=${(e: any) => this._valueChanged('show_humidity', e.target.checked)}
          ></ha-switch>
        </ha-formfield>

        <ha-select
          .label=${'Temperature Unit'}
          .value=${this._config.temperature_unit || 'F'}
          @selected=${(e: any) => this._valueChanged('temperature_unit', e.target.value)}
          @closed=${(e: Event) => e.stopPropagation()}
        >
          <ha-list-item value="F">Fahrenheit</ha-list-item>
          <ha-list-item value="C">Celsius</ha-list-item>
        </ha-select>
      </div>
    `;
  }

  private _renderDevicesSection() {
    const devices = this._config.devices || [];

    return html`
      <div class="section">
        <div class="section-header">
          <span>Devices</span>
          <ha-icon-button @click=${this._addDevice}>
            <ha-icon icon="mdi:plus"></ha-icon>
          </ha-icon-button>
        </div>

        <ha-textfield
          label="Chip Columns"
          type="number"
          min="1"
          max="4"
          .value=${this._config.chip_columns || 1}
          @input=${(e: any) => this._valueChanged('chip_columns', parseInt(e.target.value))}
        ></ha-textfield>

        ${devices.map((device: any, index: number) => this._renderDeviceConfig(device, index))}
      </div>
    `;
  }

  private _renderDeviceConfig(device: any, index: number) {
    return html`
      <div class="device-config">
        <div class="device-header">
          <span>Device ${index + 1}</span>
          <ha-icon-button @click=${() => this._removeDevice(index)}>
            <ha-icon icon="mdi:delete"></ha-icon>
          </ha-icon-button>
        </div>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: {} }}
          .value=${device.entity || ''}
          .label=${'Entity'}
          @value-changed=${(e: CustomEvent) => this._updateDevice(index, 'entity', e.detail.value)}
        ></ha-selector>

        <ha-selector
          .hass=${this.hass}
          .selector=${{ icon: {} }}
          .value=${device.icon || ''}
          .label=${'Icon'}
          @value-changed=${(e: CustomEvent) => this._updateDevice(index, 'icon', e.detail.value)}
        ></ha-selector>

        <div class="color-row">
          <ha-textfield
            label="On Color"
            .value=${device.color_on || '#FDD835'}
            @input=${(e: any) => this._updateDevice(index, 'color_on', e.target.value)}
          ></ha-textfield>
          <ha-textfield
            label="Off Color"
            .value=${device.color_off || 'rgba(0, 0, 0, 0.2)'}
            @input=${(e: any) => this._updateDevice(index, 'color_off', e.target.value)}
          ></ha-textfield>
        </div>

        <div class="color-row">
          <ha-textfield
            label="Inactive Color"
            .value=${device.color_unavailable || 'rgba(128, 128, 128, 0.5)'}
            @input=${(e: any) => this._updateDevice(index, 'color_unavailable', e.target.value)}
          ></ha-textfield>
          <ha-textfield
            label="Icon Color"
            .value=${device.icon_color || '#FFFFFF'}
            @input=${(e: any) => this._updateDevice(index, 'icon_color', e.target.value)}
          ></ha-textfield>
        </div>

        <ha-formfield label="Show Chip">
          <ha-switch
            .checked=${device.show_chip !== false}
            @change=${(e: any) => this._updateDevice(index, 'show_chip', e.target.checked)}
          ></ha-switch>
        </ha-formfield>

        <ha-formfield label="Show Slider">
          <ha-switch
            .checked=${device.show_slider !== false}
            @change=${(e: any) => this._updateDevice(index, 'show_slider', e.target.checked)}
          ></ha-switch>
        </ha-formfield>
      </div>
    `;
  }

  private _valueChanged(key: string, value: any) {
    if (!this._config) return;
    
    this._config = { ...this._config, [key]: value };
    this._fireEvent();
  }

  private _handleBackgroundTypeChange(type: string) {
    if (type === 'static') {
      this._valueChanged('background', 'var(--ha-card-background)');
    } else {
      this._valueChanged('background', { entity: '', ranges: [] });
    }
  }

  private _handleIconColorTypeChange(type: string) {
    if (type === 'static') {
      this._valueChanged('icon_color', '#FFFFFF');
    } else {
      this._valueChanged('icon_color', { entity: '', ranges: [] });
    }
  }

  private _handleIconBgTypeChange(type: string) {
    if (type === 'static') {
      this._valueChanged('icon_background', 'rgba(255, 255, 255, 0.2)');
    } else {
      this._valueChanged('icon_background', { entity: '', ranges: [] });
    }
  }

  private _updateEntityConfig(key: string, field: string, value: any) {
    const current = this._config[key] || {};
    this._valueChanged(key, { ...current, [field]: value });
  }

  private _addRange(key: string) {
    const current = this._config[key] || {};
    const ranges = [...(current.ranges || []), { min: 0, max: 100, color: '#FFFFFF' }];
    this._valueChanged(key, { ...current, ranges });
  }

  private _updateRange(key: string, index: number, field: string, value: any) {
    const current = this._config[key] || {};
    const ranges = [...(current.ranges || [])];
    ranges[index] = { ...ranges[index], [field]: value };
    this._valueChanged(key, { ...current, ranges });
  }

  private _removeRange(key: string, index: number) {
    const current = this._config[key] || {};
    const ranges = [...(current.ranges || [])];
    ranges.splice(index, 1);
    this._valueChanged(key, { ...current, ranges });
  }

  private _toggleRangeType(key: string, index: number) {
    const current = this._config[key] || {};
    const ranges = [...(current.ranges || [])];
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
    this._valueChanged(key, { ...current, ranges });
  }

  private _addDevice() {
    const devices = [...(this._config.devices || [])];
    devices.push({
      entity: '',
      icon: 'mdi:lightbulb',
      show_chip: true,
      show_slider: true,
      color_on: '#FDD835',
      color_off: 'rgba(0, 0, 0, 0.2)',
      color_unavailable: 'rgba(128, 128, 128, 0.5)',
      icon_color: '#FFFFFF'
    });
    this._valueChanged('devices', devices);
  }

  private _removeDevice(index: number) {
    const devices = [...(this._config.devices || [])];
    devices.splice(index, 1);
    this._valueChanged('devices', devices);
  }

  private _updateDevice(index: number, field: string, value: any) {
    const devices = [...(this._config.devices || [])];
    devices[index] = { ...devices[index], [field]: value };
    this._valueChanged('devices', devices);
  }

  private _fireEvent() {
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
        gap: 16px;
      }

      .section {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px;
        background: var(--secondary-background-color);
        border-radius: 8px;
      }

      .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-weight: 500;
        font-size: 16px;
        margin-bottom: 8px;
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

      .info-text {
        font-size: 12px;
        color: var(--secondary-text-color);
        font-style: italic;
      }

      .ranges-container {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 8px;
      }

      .ranges-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-weight: 500;
      }

      .range-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        background: var(--secondary-background-color);
        border-radius: 4px;
      }

      .range-item ha-textfield {
        flex: 1;
      }

      .device-config {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 12px;
        background: var(--card-background-color);
        border-radius: 4px;
        border: 1px solid var(--divider-color);
      }

      .device-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-weight: 500;
      }

      .color-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      ha-formfield {
        display: flex;
        align-items: center;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'room-card-editor': RoomCardEditor;
  }
}