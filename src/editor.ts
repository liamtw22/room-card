import { LitElement, html, TemplateResult, CSSResultGroup, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, fireEvent, LovelaceCardEditor } from 'custom-card-helpers';
import type { RoomCardConfig, AreaRegistryEntry } from './types';
import { DEVICE_TYPES } from './const';

@customElement('room-card-editor')
export class RoomCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config!: RoomCardConfig;
  @state() private _areas: AreaRegistryEntry[] = [];

  public setConfig(config: RoomCardConfig): void {
    this._config = config;
  }

  protected firstUpdated(): void {
    this._fetchAreas();
  }

  private async _fetchAreas(): Promise<void> {
    if (!this.hass) {
      return;
    }

    try {
      this._areas = await this.hass.callWS<AreaRegistryEntry[]>({
        type: 'config/area_registry/list',
      });
    } catch (err) {
      console.error('Error fetching areas:', err);
      this._areas = [];
    }
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <div class="card-config">
        <h3 class="section-header">Basic Configuration</h3>
        
        ${this._renderAreaSelector()}
        ${this._renderDisplayName()}
        ${this._renderIcon()}
        ${this._renderHapticFeedback()}
        
        <h3 class="section-header">Appearance</h3>
        
        ${this._renderBackgroundOptions()}
        
        <h3 class="section-header">Temperature & Humidity</h3>
        
        ${this._renderTemperatureHumidity()}
        
        <h3 class="section-header">Devices</h3>
        
        ${this._renderDevices()}
      </div>
    `;
  }

  private _renderAreaSelector(): TemplateResult {
    const areaOptions = this._areas.map(area => ({
      value: area.area_id,
      label: area.name,
    }));

    return html`
      <div class="config-row">
        <label>Area</label>
        <ha-select
          .label=${'Area'}
          .value=${this._config.area || ''}
          @selected=${this._areaChanged}
          @closed=${(e: Event) => e.stopPropagation()}
        >
          <mwc-list-item value="">None</mwc-list-item>
          ${areaOptions.map(
            option => html`<mwc-list-item .value=${option.value}>${option.label}</mwc-list-item>`
          )}
        </ha-select>
        ${this._config.area ? html`<div class="selected-area">Selected Area: ${this._getAreaName()}</div>` : ''}
      </div>
    `;
  }

  private _renderDisplayName(): TemplateResult {
    return html`
      <div class="config-row">
        <ha-textfield
          .label=${'Display Name (Optional)'}
          .value=${this._config.name || ''}
          @input=${(e: Event) => this._valueChanged('name', (e.target as HTMLInputElement).value)}
        ></ha-textfield>
      </div>
    `;
  }

  private _renderIcon(): TemplateResult {
    return html`
      <div class="config-row">
        <ha-textfield
          .label=${'Icon (Optional)'}
          .value=${this._config.icon || ''}
          .placeholder=${'mdi:home'}
          @input=${(e: Event) => this._valueChanged('icon', (e.target as HTMLInputElement).value)}
        ></ha-textfield>
      </div>
    `;
  }

  private _renderHapticFeedback(): TemplateResult {
    return html`
      <div class="config-row">
        <ha-formfield .label=${'Haptic Feedback'}>
          <ha-switch
            .checked=${this._config.haptic_feedback !== false}
            @change=${(e: Event) => this._valueChanged('haptic_feedback', (e.target as HTMLInputElement).checked)}
          ></ha-switch>
        </ha-formfield>
      </div>
    `;
  }

  private _renderBackgroundOptions(): TemplateResult {
    const bgType = this._config.background_type || 'solid';
    
    return html`
      <div class="config-section">
        <div class="config-row">
          <label>Background Type</label>
          <ha-select
            .label=${'Background Type'}
            .value=${bgType}
            @selected=${(e: CustomEvent) => this._valueChanged('background_type', e.detail.value)}
            @closed=${(e: Event) => e.stopPropagation()}
          >
            <mwc-list-item value="solid">Static Color</mwc-list-item>
            <mwc-list-item value="entity">Entity</mwc-list-item>
          </ha-select>
        </div>

        ${bgType === 'solid' ? this._renderSolidColorOptions() : this._renderEntityBackgroundOptions()}
      </div>
    `;
  }

  private _renderSolidColorOptions(): TemplateResult {
    return html`
      <div class="config-row">
        <label>Background Color</label>
        <input
          type="color"
          class="color-input"
          .value=${this._config.background_color || '#CDE3DB'}
          @input=${(e: Event) => this._valueChanged('background_color', (e.target as HTMLInputElement).value)}
        />
        <span class="color-value">${this._config.background_color || '#CDE3DB'}</span>
      </div>
    `;
  }

  private _renderEntityBackgroundOptions(): TemplateResult {
    return html`
      <div class="config-row">
        <ha-entity-picker
          .hass=${this.hass}
          .value=${this._config.background_entity || ''}
          .label=${'Background Entity'}
          @value-changed=${(e: CustomEvent) => this._valueChanged('background_entity', e.detail.value)}
          allow-custom-entity
        ></ha-entity-picker>
      </div>
      <div class="config-row">
        <ha-textfield
          .label=${'Entity Attribute (Optional)'}
          .value=${this._config.background_entity_attribute || ''}
          .placeholder=${'Leave empty to use state'}
          @input=${(e: Event) => this._valueChanged('background_entity_attribute', (e.target as HTMLInputElement).value)}
        ></ha-textfield>
      </div>
    `;
  }

  private _renderTemperatureHumidity(): TemplateResult {
    return html`
      <div class="config-section">
        <div class="config-row">
          <ha-entity-picker
            .hass=${this.hass}
            .value=${this._config.temperature_sensor || ''}
            .label=${'Temperature Sensor'}
            @value-changed=${(e: CustomEvent) => this._valueChanged('temperature_sensor', e.detail.value)}
            allow-custom-entity
          ></ha-entity-picker>
        </div>

        <div class="config-row">
          <ha-entity-picker
            .hass=${this.hass}
            .value=${this._config.humidity_sensor || ''}
            .label=${'Humidity Sensor'}
            @value-changed=${(e: CustomEvent) => this._valueChanged('humidity_sensor', e.detail.value)}
            allow-custom-entity
          ></ha-entity-picker>
        </div>

        <div class="config-row">
          <ha-formfield .label=${'Show Temperature'}>
            <ha-switch
              .checked=${this._config.show_temperature !== false}
              @change=${(e: Event) => this._valueChanged('show_temperature', (e.target as HTMLInputElement).checked)}
            ></ha-switch>
          </ha-formfield>
        </div>

        <div class="config-row">
          <ha-formfield .label=${'Show Humidity'}>
            <ha-switch
              .checked=${this._config.show_humidity !== false}
              @change=${(e: Event) => this._valueChanged('show_humidity', (e.target as HTMLInputElement).checked)}
            ></ha-switch>
          </ha-formfield>
        </div>

        <div class="config-row">
          <label>Temperature Unit</label>
          <ha-select
            .label=${'Temperature Unit'}
            .value=${this._config.temperature_unit || 'F'}
            @selected=${(e: CustomEvent) => this._valueChanged('temperature_unit', e.detail.value)}
            @closed=${(e: Event) => e.stopPropagation()}
          >
            <mwc-list-item value="C">Celsius</mwc-list-item>
            <mwc-list-item value="F">Fahrenheit</mwc-list-item>
          </ha-select>
        </div>
      </div>
    `;
  }

  private _renderDevices(): TemplateResult {
    return html`
      <div class="devices-section">
        ${this._config.devices?.map((device, index) => this._renderDeviceConfig(device, index)) || ''}
        <button class="add-device-button" @click=${this._addDevice}>
          <ha-icon icon="mdi:plus"></ha-icon>
          Add Device
        </button>
      </div>
    `;
  }

  private _renderDeviceConfig(device: any, index: number): TemplateResult {
    return html`
      <div class="device-config">
        <div class="device-config-header">
          <span>Device ${index + 1}</span>
          <ha-icon-button
            .label=${'Remove device'}
            @click=${() => this._removeDevice(index)}
          >
            <ha-icon icon="mdi:delete"></ha-icon>
          </ha-icon-button>
        </div>

        <ha-entity-picker
          .hass=${this.hass}
          .value=${device.entity || ''}
          .label=${'Entity'}
          @value-changed=${(e: CustomEvent) => this._devicePropertyChanged(index, 'entity', e.detail.value)}
          allow-custom-entity
        ></ha-entity-picker>

        <ha-textfield
          .label=${'Name (optional)'}
          .value=${device.name || ''}
          @input=${(e: Event) => this._devicePropertyChanged(index, 'name', (e.target as HTMLInputElement).value)}
        ></ha-textfield>

        <ha-select
          .label=${'Type'}
          .value=${device.type || 'light'}
          @selected=${(e: CustomEvent) => this._devicePropertyChanged(index, 'type', e.detail.value)}
          @closed=${(e: Event) => e.stopPropagation()}
        >
          ${DEVICE_TYPES.map(type => html`<mwc-list-item .value=${type}>${type}</mwc-list-item>`)}
        </ha-select>

        <ha-textfield
          .label=${'Icon (optional)'}
          .value=${device.icon || ''}
          @input=${(e: Event) => this._devicePropertyChanged(index, 'icon', (e.target as HTMLInputElement).value)}
        ></ha-textfield>

        <ha-select
          .label=${'Control Type'}
          .value=${device.control_type || 'continuous'}
          @selected=${(e: CustomEvent) => this._devicePropertyChanged(index, 'control_type', e.detail.value)}
          @closed=${(e: Event) => e.stopPropagation()}
        >
          <mwc-list-item value="continuous">Continuous (Slider)</mwc-list-item>
          <mwc-list-item value="discrete">Discrete (Buttons)</mwc-list-item>
        </ha-select>

        ${device.control_type === 'discrete' ? html`
          <ha-textfield
            .label=${'Modes (comma separated)'}
            .value=${device.modes?.join(', ') || ''}
            @input=${(e: Event) => this._deviceModesChanged(index, (e.target as HTMLInputElement).value)}
          ></ha-textfield>
        ` : ''}
      </div>
    `;
  }

  private _getAreaName(): string {
    if (!this._config.area) return '';
    const area = this._areas.find(a => a.area_id === this._config.area);
    return area ? area.name : this._config.area;
  }

  private _areaChanged(e: CustomEvent): void {
    this._valueChanged('area', e.detail.value);
  }

  private _valueChanged(key: string, value: any): void {
    if (!this._config) return;
    
    const newConfig = {
      ...this._config,
      [key]: value,
    };

    this._config = newConfig;
    fireEvent(this, 'config-changed', { config: newConfig });
  }

  private _addDevice(): void {
    const devices = [...(this._config.devices || [])];
    devices.push({
      entity: '',
      type: 'light',
      control_type: 'continuous',
    });

    this._valueChanged('devices', devices);
  }

  private _removeDevice(index: number): void {
    const devices = [...(this._config.devices || [])];
    devices.splice(index, 1);
    this._valueChanged('devices', devices);
  }

  private _devicePropertyChanged(index: number, property: string, value: any): void {
    const devices = [...(this._config.devices || [])];
    devices[index] = {
      ...devices[index],
      [property]: value,
    };
    this._valueChanged('devices', devices);
  }

  private _deviceModesChanged(index: number, value: string): void {
    const modes = value.split(',').map(m => m.trim()).filter(m => m);
    this._devicePropertyChanged(index, 'modes', modes);
  }

  static get styles(): CSSResultGroup {
    return css`
      .card-config {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .section-header {
        margin: 16px 0 8px 0;
        font-size: 16px;
        font-weight: 500;
        color: var(--primary-text-color);
        border-bottom: 1px solid var(--divider-color);
        padding-bottom: 8px;
      }

      .section-header:first-child {
        margin-top: 0;
      }

      .config-section {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .config-row {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .config-row label {
        font-size: 14px;
        font-weight: 500;
        color: var(--secondary-text-color);
      }

      .selected-area {
        font-size: 12px;
        color: var(--secondary-text-color);
        font-style: italic;
        margin-top: -4px;
      }

      .color-input {
        width: 60px;
        height: 40px;
        border: 1px solid var(--divider-color);
        border-radius: 4px;
        cursor: pointer;
      }

      .color-value {
        font-size: 14px;
        color: var(--secondary-text-color);
        font-family: monospace;
      }

      .devices-section {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .device-config {
        padding: 16px;
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        background-color: var(--card-background-color);
      }

      .device-config-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .device-config-header span {
        font-weight: 500;
        color: var(--primary-text-color);
      }

      .add-device-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 16px;
        border: 2px dashed var(--divider-color);
        border-radius: 8px;
        background-color: transparent;
        color: var(--primary-color);
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
      }

      .add-device-button:hover {
        border-color: var(--primary-color);
        background-color: var(--primary-color);
        color: var(--text-primary-color);
      }

      ha-entity-picker,
      ha-textfield,
      ha-select {
        width: 100%;
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