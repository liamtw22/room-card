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

    const schema = [
      {
        name: 'name',
        label: 'Name',
        selector: { text: {} },
      },
      {
        name: 'temperature_sensor',
        label: 'Temperature Sensor',
        selector: {
          entity: {
            domain: 'sensor',
            device_class: 'temperature',
          },
        },
      },
      {
        name: 'humidity_sensor',
        label: 'Humidity Sensor',
        selector: {
          entity: {
            domain: 'sensor',
            device_class: 'humidity',
          },
        },
      },
      {
        name: 'show_temperature',
        label: 'Show Temperature',
        selector: { boolean: {} },
      },
      {
        name: 'show_humidity',
        label: 'Show Humidity',
        selector: { boolean: {} },
      },
      {
        name: 'temperature_unit',
        label: 'Temperature Unit',
        selector: {
          select: {
            options: [
              { value: 'C', label: 'Celsius (°C)' },
              { value: 'F', label: 'Fahrenheit (°F)' },
            ],
          },
        },
      },
      {
        name: 'haptic_feedback',
        label: 'Haptic Feedback',
        selector: { boolean: {} },
      },
    ];

    const data = {
      name: this._config.name || '',
      temperature_sensor: this._config.temperature_sensor || '',
      humidity_sensor: this._config.humidity_sensor || '',
      show_temperature: this._config.show_temperature !== false,
      show_humidity: this._config.show_humidity !== false,
      temperature_unit: this._config.temperature_unit || 'F',
      haptic_feedback: this._config.haptic_feedback !== false,
    };

    return html`
      <div class="card-config">
        <ha-form
          .hass=${this.hass}
          .data=${data}
          .schema=${schema}
          .computeLabel=${this._computeLabel}
          @value-changed=${this._valueChanged}
        ></ha-form>

        <div class="devices-section">
          <h3>Devices</h3>
          ${this._config.devices?.map((device, index) => this._renderDeviceConfig(device, index)) || ''}
          <button class="add-device-button" @click=${this._addDevice}>
            <ha-icon icon="mdi:plus"></ha-icon>
            Add Device
          </button>
        </div>

        <div class="background-colors-section">
          <h3>Background Colors</h3>
          ${this._renderColorPickers()}
        </div>
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
          @value-changed=${(ev: CustomEvent) => this._deviceEntityChanged(ev, index)}
          allow-custom-entity
        ></ha-entity-picker>

        <ha-textfield
          .label=${'Name (optional)'}
          .value=${device.name || ''}
          @input=${(ev: Event) => this._devicePropertyChanged(ev, index, 'name')}
        ></ha-textfield>

        <ha-select
          .label=${'Type'}
          .value=${device.type || 'light'}
          @selected=${(ev: CustomEvent) => this._deviceTypeChanged(ev, index)}
        >
          ${DEVICE_TYPES.map(
            (type) => html` <mwc-list-item .value=${type}>${type}</mwc-list-item> `,
          )}
        </ha-select>

        <ha-textfield
          .label=${'Icon (optional)'}
          .value=${device.icon || ''}
          @input=${(ev: Event) => this._devicePropertyChanged(ev, index, 'icon')}
        ></ha-textfield>

        <ha-select
          .label=${'Control Type'}
          .value=${device.control_type || 'continuous'}
          @selected=${(ev: CustomEvent) => this._deviceControlTypeChanged(ev, index)}
        >
          <mwc-list-item value="continuous">Continuous (Slider)</mwc-list-item>
          <mwc-list-item value="discrete">Discrete (Buttons)</mwc-list-item>
        </ha-select>

        ${device.control_type === 'discrete'
          ? html`
              <ha-textfield
                .label=${'Modes (comma separated)'}
                .value=${device.modes?.join(', ') || ''}
                @input=${(ev: Event) => this._deviceModesChanged(ev, index)}
              ></ha-textfield>
            `
          : ''}
      </div>
    `;
  }

  private _renderColorPickers(): TemplateResult {
    const colors = this._config.background_colors || {};
    const colorLabels = {
      cold: 'Cold (< 61°F / 16°C)',
      cool: 'Cool (61-64°F / 16-18°C)',
      comfortable: 'Comfortable (64-75°F / 18-24°C)',
      warm: 'Warm (75-81°F / 24-27°C)',
      hot: 'Hot (> 81°F / 27°C)',
    };

    return html`
      ${Object.entries(colorLabels).map(
        ([key, label]) => html`
          <div class="color-picker">
            <label>${label}</label>
            <input
              type="color"
              .value=${colors[key as keyof typeof colors] || '#CDE3DB'}
              @input=${(ev: Event) => this._colorChanged(ev, key)}
            />
          </div>
        `,
      )}
    `;
  }

  private _computeLabel = (schema: any): string => {
    return schema.label || schema.name;
  };

  private _valueChanged(ev: CustomEvent): void {
    const newConfig = {
      ...this._config,
      ...ev.detail.value,
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

    const newConfig = {
      ...this._config,
      devices,
    };

    this._config = newConfig;
    fireEvent(this, 'config-changed', { config: newConfig });
  }

  private _removeDevice(index: number): void {
    const devices = [...(this._config.devices || [])];
    devices.splice(index, 1);

    const newConfig = {
      ...this._config,
      devices,
    };

    this._config = newConfig;
    fireEvent(this, 'config-changed', { config: newConfig });
  }

  private _deviceEntityChanged(ev: CustomEvent, index: number): void {
    const devices = [...(this._config.devices || [])];
    devices[index] = {
      ...devices[index],
      entity: ev.detail.value,
    };

    const newConfig = {
      ...this._config,
      devices,
    };

    this._config = newConfig;
    fireEvent(this, 'config-changed', { config: newConfig });
  }

  private _deviceTypeChanged(ev: CustomEvent, index: number): void {
    const devices = [...(this._config.devices || [])];
    devices[index] = {
      ...devices[index],
      type: ev.detail.value,
    };

    const newConfig = {
      ...this._config,
      devices,
    };

    this._config = newConfig;
    fireEvent(this, 'config-changed', { config: newConfig });
  }

  private _deviceControlTypeChanged(ev: CustomEvent, index: number): void {
    const devices = [...(this._config.devices || [])];
    devices[index] = {
      ...devices[index],
      control_type: ev.detail.value,
    };

    const newConfig = {
      ...this._config,
      devices,
    };

    this._config = newConfig;
    fireEvent(this, 'config-changed', { config: newConfig });
  }

  private _devicePropertyChanged(ev: Event, index: number, property: string): void {
    const target = ev.target as HTMLInputElement;
    const devices = [...(this._config.devices || [])];
    devices[index] = {
      ...devices[index],
      [property]: target.value,
    };

    const newConfig = {
      ...this._config,
      devices,
    };

    this._config = newConfig;
    fireEvent(this, 'config-changed', { config: newConfig });
  }

  private _deviceModesChanged(ev: Event, index: number): void {
    const target = ev.target as HTMLInputElement;
    const modes = target.value.split(',').map((m) => m.trim());
    const devices = [...(this._config.devices || [])];
    devices[index] = {
      ...devices[index],
      modes,
    };

    const newConfig = {
      ...this._config,
      devices,
    };

    this._config = newConfig;
    fireEvent(this, 'config-changed', { config: newConfig });
  }

  private _colorChanged(ev: Event, colorKey: string): void {
    const target = ev.target as HTMLInputElement;
    const newConfig = {
      ...this._config,
      background_colors: {
        ...this._config.background_colors,
        [colorKey]: target.value,
      },
    };

    this._config = newConfig;
    fireEvent(this, 'config-changed', { config: newConfig });
  }

  static get styles(): CSSResultGroup {
    return css`
      .card-config {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .devices-section,
      .background-colors-section {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
        color: var(--primary-text-color);
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

      .color-picker {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 0;
      }

      .color-picker label {
        font-size: 14px;
        color: var(--primary-text-color);
      }

      .color-picker input[type='color'] {
        width: 60px;
        height: 40px;
        border: 1px solid var(--divider-color);
        border-radius: 4px;
        cursor: pointer;
      }

      ha-entity-picker,
      ha-textfield,
      ha-select {
        width: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'room-card-editor': RoomCardEditor;
  }
}