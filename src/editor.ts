import { LitElement, html, css, TemplateResult, CSSResultGroup, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardEditor, fireEvent } from 'custom-card-helpers';
import type { RoomCardConfig, DeviceConfig, SliderModeConfig } from './types';
import {
  DEFAULT_CHIP_ON_COLOR,
  DEFAULT_CHIP_OFF_COLOR,
  DEFAULT_ICON_ON_COLOR,
  DEFAULT_ICON_OFF_COLOR,
  HA_DOMAIN_COLORS,
  HA_DOMAIN_ICONS,
  DEFAULT_DEVICE_ATTRIBUTES,
} from './const';

// Action selector schema for ha-form
const ACTION_SCHEMA = { 'ui-action': {} };

@customElement('room-card-editor')
export class RoomCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: RoomCardConfig;
  @state() private _expandedSections: Record<string, boolean> = {
    basic: true,
    appearance: false,
    actions: false,
    devices: false,
  };
  @state() private _expandedDevices: Record<number, boolean> = {};
  @state() private _expandedDeviceSections: Record<string, boolean> = {};

  public setConfig(config: RoomCardConfig): void {
    this._config = {
      background: 'var(--ha-card-background)',
      haptic_feedback: true,
      ...config,
    };
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <div class="card-config">
        ${this._renderBasicSection()}
        ${this._renderAppearanceSection()}
        ${this._renderActionsSection()}
        ${this._renderDevicesSection()}
      </div>
    `;
  }

  // ========== BASIC SETTINGS ==========
  private _renderBasicSection(): TemplateResult {
    return html`
      <ha-expansion-panel
        outlined
        .header=${'Basic Settings'}
        .expanded=${this._expandedSections.basic}
        @expanded-changed=${(e: CustomEvent) => (this._expandedSections.basic = e.detail.expanded)}
      >
        <div class="section-content">
          <ha-selector
            .hass=${this.hass}
            .selector=${{ area: {} }}
            .value=${this._config!.area || ''}
            .label=${'Area'}
            @value-changed=${(e: CustomEvent) => this._valueChanged('area', e.detail.value)}
          ></ha-selector>

          <ha-textfield
            .label=${'Name (optional override)'}
            .value=${this._config!.name || ''}
            @input=${(e: InputEvent) => this._valueChanged('name', (e.target as HTMLInputElement).value)}
          ></ha-textfield>

          <ha-icon-picker
            .hass=${this.hass}
            .value=${this._config!.icon || 'mdi:home'}
            .label=${'Icon'}
            @value-changed=${(e: CustomEvent) => this._valueChanged('icon', e.detail.value)}
          ></ha-icon-picker>

          <div class="side-by-side">
            <ha-selector
              .hass=${this.hass}
              .selector=${{ entity: { domain: 'sensor' } }}
              .value=${this._config!.display_entity_1 || ''}
              .label=${'Display Entity 1'}
              @value-changed=${(e: CustomEvent) => this._valueChanged('display_entity_1', e.detail.value)}
            ></ha-selector>

            <ha-textfield
              .label=${'Unit 1'}
              .value=${this._config!.display_entity_1_unit || ''}
              @input=${(e: InputEvent) => this._valueChanged('display_entity_1_unit', (e.target as HTMLInputElement).value)}
            ></ha-textfield>
          </div>

          <div class="side-by-side">
            <ha-selector
              .hass=${this.hass}
              .selector=${{ entity: { domain: 'sensor' } }}
              .value=${this._config!.display_entity_2 || ''}
              .label=${'Display Entity 2'}
              @value-changed=${(e: CustomEvent) => this._valueChanged('display_entity_2', e.detail.value)}
            ></ha-selector>

            <ha-textfield
              .label=${'Unit 2'}
              .value=${this._config!.display_entity_2_unit || ''}
              @input=${(e: InputEvent) => this._valueChanged('display_entity_2_unit', (e.target as HTMLInputElement).value)}
            ></ha-textfield>
          </div>

          <ha-formfield .label=${'Haptic Feedback'}>
            <ha-switch
              .checked=${this._config!.haptic_feedback !== false}
              @change=${(e: Event) => this._valueChanged('haptic_feedback', (e.target as HTMLInputElement).checked)}
            ></ha-switch>
          </ha-formfield>

          <ha-selector
            .hass=${this.hass}
            .selector=${{ number: { min: 1, max: 3, mode: 'box' } }}
            .value=${this._config!.chip_columns || 1}
            .label=${'Chip Columns'}
            @value-changed=${(e: CustomEvent) => this._valueChanged('chip_columns', e.detail.value)}
          ></ha-selector>
        </div>
      </ha-expansion-panel>
    `;
  }

  // ========== APPEARANCE SETTINGS ==========
  private _renderAppearanceSection(): TemplateResult {
    const background = this._config!.background;
    const isEntityBackground = typeof background === 'object';

    return html`
      <ha-expansion-panel
        outlined
        .header=${'Appearance'}
        .expanded=${this._expandedSections.appearance}
        @expanded-changed=${(e: CustomEvent) => (this._expandedSections.appearance = e.detail.expanded)}
      >
        <div class="section-content">
          <div class="subsection-header">Background</div>
          
          <ha-formfield .label=${'Use entity-based background'}>
            <ha-switch
              .checked=${isEntityBackground}
              @change=${(e: Event) => this._toggleEntityBasedBackground((e.target as HTMLInputElement).checked)}
            ></ha-switch>
          </ha-formfield>

          ${isEntityBackground
            ? this._renderEntityColorConfig('background', background as any)
            : html`
                <ha-textfield
                  .label=${'Background Color'}
                  .value=${(background as string) || 'var(--ha-card-background)'}
                  @input=${(e: InputEvent) => this._valueChanged('background', (e.target as HTMLInputElement).value)}
                ></ha-textfield>
              `}

          <div class="subsection-header">Icon Colors</div>

          <ha-textfield
            .label=${'Icon Color'}
            .value=${typeof this._config!.icon_color === 'string' ? this._config!.icon_color : ''}
            @input=${(e: InputEvent) => this._valueChanged('icon_color', (e.target as HTMLInputElement).value)}
          ></ha-textfield>

          <ha-textfield
            .label=${'Icon Background Color'}
            .value=${typeof this._config!.icon_background === 'string' ? this._config!.icon_background : ''}
            @input=${(e: InputEvent) => this._valueChanged('icon_background', (e.target as HTMLInputElement).value)}
          ></ha-textfield>

          <div class="subsection-header">Text Styling</div>

          <div class="side-by-side">
            <ha-textfield
              .label=${'Room Name Color'}
              .value=${this._config!.room_name_color || ''}
              @input=${(e: InputEvent) => this._valueChanged('room_name_color', (e.target as HTMLInputElement).value)}
            ></ha-textfield>

            <ha-textfield
              .label=${'Room Name Size'}
              .value=${this._config!.room_name_size || ''}
              placeholder="1rem"
              @input=${(e: InputEvent) => this._valueChanged('room_name_size', (e.target as HTMLInputElement).value)}
            ></ha-textfield>
          </div>

          <div class="side-by-side">
            <ha-textfield
              .label=${'Display Entity Color'}
              .value=${this._config!.display_entity_color || ''}
              @input=${(e: InputEvent) => this._valueChanged('display_entity_color', (e.target as HTMLInputElement).value)}
            ></ha-textfield>

            <ha-textfield
              .label=${'Display Entity Size'}
              .value=${this._config!.display_entity_size || ''}
              placeholder="0.875rem"
              @input=${(e: InputEvent) => this._valueChanged('display_entity_size', (e.target as HTMLInputElement).value)}
            ></ha-textfield>
          </div>
        </div>
      </ha-expansion-panel>
    `;
  }

  private _renderEntityColorConfig(key: string, config: any): TemplateResult {
    const ranges = config?.ranges || [];

    return html`
      <div class="entity-color-config">
        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: {} }}
          .value=${config?.entity || ''}
          .label=${'Entity for color'}
          @value-changed=${(e: CustomEvent) => this._updateEntityColorConfig(key, 'entity', e.detail.value)}
        ></ha-selector>

        <div class="ranges-section">
          <div class="ranges-header">
            <span>Color Ranges</span>
            <ha-icon-button
              .label=${'Add range'}
              @click=${() => this._addColorRange(key)}
            >
              <ha-icon icon="mdi:plus"></ha-icon>
            </ha-icon-button>
          </div>

          ${ranges.map((range: any, index: number) => html`
            <div class="range-item">
              <ha-textfield
                .label=${'Min'}
                type="number"
                .value=${range.min ?? ''}
                @input=${(e: InputEvent) => this._updateColorRange(key, index, 'min', parseFloat((e.target as HTMLInputElement).value))}
              ></ha-textfield>
              <ha-textfield
                .label=${'Max'}
                type="number"
                .value=${range.max ?? ''}
                @input=${(e: InputEvent) => this._updateColorRange(key, index, 'max', parseFloat((e.target as HTMLInputElement).value))}
              ></ha-textfield>
              <ha-textfield
                .label=${'Color'}
                .value=${range.color || ''}
                @input=${(e: InputEvent) => this._updateColorRange(key, index, 'color', (e.target as HTMLInputElement).value)}
              ></ha-textfield>
              <ha-icon-button
                .label=${'Remove'}
                @click=${() => this._removeColorRange(key, index)}
              >
                <ha-icon icon="mdi:delete"></ha-icon>
              </ha-icon-button>
            </div>
          `)}
        </div>
      </div>
    `;
  }

  // ========== CONSOLIDATED ACTIONS SECTION ==========
  private _renderActionsSection(): TemplateResult {
    return html`
      <ha-expansion-panel
        outlined
        .header=${'Actions'}
        .expanded=${this._expandedSections.actions}
        @expanded-changed=${(e: CustomEvent) => (this._expandedSections.actions = e.detail.expanded)}
      >
        <div class="section-content">
          <!-- Card Actions -->
          <div class="action-group">
            <div class="action-group-header">Card Actions</div>
            <p class="helper-text">Actions when tapping the card background.</p>
            
            <div class="action-row">
              <ha-selector
                .hass=${this.hass}
                .selector=${ACTION_SCHEMA}
                .value=${this._config!.tap_action || { action: 'more-info' }}
                .label=${'Tap'}
                @value-changed=${(e: CustomEvent) => this._valueChanged('tap_action', e.detail.value)}
              ></ha-selector>

              <ha-selector
                .hass=${this.hass}
                .selector=${ACTION_SCHEMA}
                .value=${this._config!.hold_action || { action: 'none' }}
                .label=${'Hold'}
                @value-changed=${(e: CustomEvent) => this._valueChanged('hold_action', e.detail.value)}
              ></ha-selector>

              <ha-selector
                .hass=${this.hass}
                .selector=${ACTION_SCHEMA}
                .value=${this._config!.double_tap_action || { action: 'none' }}
                .label=${'Double Tap'}
                @value-changed=${(e: CustomEvent) => this._valueChanged('double_tap_action', e.detail.value)}
              ></ha-selector>
            </div>
          </div>

          <!-- Title Actions -->
          <div class="action-group">
            <div class="action-group-header">Title Actions</div>
            <p class="helper-text">Actions when tapping the title/stats area. Default: navigate to area.</p>
            
            <div class="action-row">
              <ha-selector
                .hass=${this.hass}
                .selector=${ACTION_SCHEMA}
                .value=${this._config!.title_tap_action || { action: 'navigate' }}
                .label=${'Tap'}
                @value-changed=${(e: CustomEvent) => this._valueChanged('title_tap_action', e.detail.value)}
              ></ha-selector>

              <ha-selector
                .hass=${this.hass}
                .selector=${ACTION_SCHEMA}
                .value=${this._config!.title_hold_action || { action: 'none' }}
                .label=${'Hold'}
                @value-changed=${(e: CustomEvent) => this._valueChanged('title_hold_action', e.detail.value)}
              ></ha-selector>

              <ha-selector
                .hass=${this.hass}
                .selector=${ACTION_SCHEMA}
                .value=${this._config!.title_double_tap_action || { action: 'none' }}
                .label=${'Double Tap'}
                @value-changed=${(e: CustomEvent) => this._valueChanged('title_double_tap_action', e.detail.value)}
              ></ha-selector>
            </div>
          </div>

          <!-- Icon Actions -->
          <div class="action-group">
            <div class="action-group-header">Icon Actions</div>
            <p class="helper-text">Actions when tapping the main icon. Default: cycle through active devices.</p>
            
            <div class="action-row">
              <ha-selector
                .hass=${this.hass}
                .selector=${ACTION_SCHEMA}
                .value=${this._config!.icon_tap_action || { action: 'none' }}
                .label=${'Tap'}
                @value-changed=${(e: CustomEvent) => this._valueChanged('icon_tap_action', e.detail.value)}
              ></ha-selector>

              <ha-selector
                .hass=${this.hass}
                .selector=${ACTION_SCHEMA}
                .value=${this._config!.icon_hold_action || { action: 'none' }}
                .label=${'Hold'}
                @value-changed=${(e: CustomEvent) => this._valueChanged('icon_hold_action', e.detail.value)}
              ></ha-selector>

              <ha-selector
                .hass=${this.hass}
                .selector=${ACTION_SCHEMA}
                .value=${this._config!.icon_double_tap_action || { action: 'none' }}
                .label=${'Double Tap'}
                @value-changed=${(e: CustomEvent) => this._valueChanged('icon_double_tap_action', e.detail.value)}
              ></ha-selector>
            </div>
          </div>
        </div>
      </ha-expansion-panel>
    `;
  }

  // ========== DEVICES SECTION ==========
  private _renderDevicesSection(): TemplateResult {
    const devices = this._config!.devices || [];

    return html`
      <ha-expansion-panel
        outlined
        .header=${'Devices (' + devices.length + ')'}
        .expanded=${this._expandedSections.devices}
        @expanded-changed=${(e: CustomEvent) => (this._expandedSections.devices = e.detail.expanded)}
      >
        <div class="section-content">
          ${devices.map((device, index) => this._renderDeviceConfig(device, index))}
          
          <ha-button @click=${this._addDevice}>
            <ha-icon icon="mdi:plus" slot="icon"></ha-icon>
            Add Device
          </ha-button>
        </div>
      </ha-expansion-panel>
    `;
  }

  private _renderDeviceConfig(device: DeviceConfig, index: number): TemplateResult {
    const domain = device.entity?.split('.')[0] || '';
    const entityState = device.entity ? this.hass.states[device.entity] : undefined;
    const friendlyName = entityState?.attributes?.friendly_name || device.name || device.entity || 'New Device';
    const isActionBased = device.slider_control_type === 'action';

    // Get available attributes for the entity
    const availableAttributes = entityState 
      ? ['state', ...Object.keys(entityState.attributes || {})]
      : ['state', 'brightness', 'volume_level', 'percentage', 'position', 'temperature'];

    return html`
      <ha-expansion-panel
        outlined
        .header=${friendlyName}
        .expanded=${this._expandedDevices[index] || false}
        @expanded-changed=${(e: CustomEvent) => (this._expandedDevices[index] = e.detail.expanded)}
      >
        <ha-icon-button slot="icons" @click=${(e: Event) => { e.stopPropagation(); this._removeDevice(index); }}>
          <ha-icon icon="mdi:delete"></ha-icon>
        </ha-icon-button>

        <div class="device-config">
          <!-- Basic Settings -->
          <ha-selector
            .hass=${this.hass}
            .selector=${{ entity: {} }}
            .value=${device.entity || ''}
            .label=${'Entity'}
            .required=${true}
            @value-changed=${(e: CustomEvent) => this._updateDevice(index, 'entity', e.detail.value)}
          ></ha-selector>

          <ha-selector
            .hass=${this.hass}
            .selector=${{ entity: {} }}
            .value=${device.control_entity || ''}
            .label=${'Control Entity (optional)'}
            @value-changed=${(e: CustomEvent) => this._updateDevice(index, 'control_entity', e.detail.value)}
          ></ha-selector>

          <div class="side-by-side">
            <ha-icon-picker
              .hass=${this.hass}
              .value=${device.icon || HA_DOMAIN_ICONS[domain] || 'mdi:help-circle'}
              .label=${'Icon'}
              @value-changed=${(e: CustomEvent) => this._updateDevice(index, 'icon', e.detail.value)}
            ></ha-icon-picker>

            <ha-selector
              .hass=${this.hass}
              .selector=${{ number: { min: 1, max: 3, mode: 'box' } }}
              .value=${device.chip_column || 1}
              .label=${'Chip Column'}
              @value-changed=${(e: CustomEvent) => this._updateDevice(index, 'chip_column', e.detail.value)}
            ></ha-selector>
          </div>

          <div class="side-by-side">
            <ha-formfield .label=${'Show Chip'}>
              <ha-switch
                .checked=${device.show_chip !== false}
                @change=${(e: Event) => this._updateDevice(index, 'show_chip', (e.target as HTMLInputElement).checked)}
              ></ha-switch>
            </ha-formfield>

            <ha-formfield .label=${'Show Slider'}>
              <ha-switch
                .checked=${device.show_slider !== false}
                @change=${(e: Event) => this._updateDevice(index, 'show_slider', (e.target as HTMLInputElement).checked)}
              ></ha-switch>
            </ha-formfield>
          </div>

          <!-- Slider Configuration -->
          <ha-expansion-panel 
            outlined 
            .header=${'Slider Configuration'}
            .expanded=${this._expandedDeviceSections[`${index}-slider`] || false}
            @expanded-changed=${(e: CustomEvent) => (this._expandedDeviceSections[`${index}-slider`] = e.detail.expanded)}
          >
            <div class="slider-config">
              <ha-selector
                .hass=${this.hass}
                .selector=${{ select: { options: [
                  { value: 'attribute', label: 'Attribute-based (continuous)' },
                  { value: 'action', label: 'Action-based (discrete modes)' }
                ]}}}
                .value=${device.slider_control_type || 'attribute'}
                .label=${'Slider Control Type'}
                @value-changed=${(e: CustomEvent) => this._updateDevice(index, 'slider_control_type', e.detail.value)}
              ></ha-selector>

              ${!isActionBased ? html`
                <!-- Attribute-based slider config -->
                <ha-selector
                  .hass=${this.hass}
                  .selector=${{ select: { 
                    options: availableAttributes.map(attr => ({ value: attr, label: attr })),
                    custom_value: true
                  }}}
                  .value=${device.attribute || 'brightness'}
                  .label=${'Attribute'}
                  @value-changed=${(e: CustomEvent) => this._updateDevice(index, 'attribute', e.detail.value)}
                ></ha-selector>

                <ha-textfield
                  .label=${'Scale Factor'}
                  type="number"
                  step="0.01"
                  .value=${device.scale?.toString() || '1'}
                  @input=${(e: InputEvent) => this._updateDevice(index, 'scale', parseFloat((e.target as HTMLInputElement).value) || 1)}
                ></ha-textfield>
                <p class="helper-text">Scale factor converts 0-100% to attribute value. E.g., brightness uses 2.55 (0-255).</p>
              ` : html`
                <!-- Action-based slider config -->
                <p class="helper-text">Configure discrete positions on the slider. Each position triggers an action when selected.</p>
                
                <div class="slider-modes">
                  <div class="modes-header">
                    <span>Slider Modes</span>
                    <ha-icon-button
                      .label=${'Add mode'}
                      @click=${() => this._addSliderMode(index)}
                    >
                      <ha-icon icon="mdi:plus"></ha-icon>
                    </ha-icon-button>
                  </div>

                  ${(device.slider_modes || []).map((mode, modeIndex) => html`
                    <div class="slider-mode-item">
                      <div class="mode-header">
                        <span>Mode ${modeIndex + 1}: ${mode.label || `${mode.position}%`}</span>
                        <ha-icon-button
                          .label=${'Remove mode'}
                          @click=${() => this._removeSliderMode(index, modeIndex)}
                        >
                          <ha-icon icon="mdi:delete"></ha-icon>
                        </ha-icon-button>
                      </div>

                      <div class="mode-config">
                        <div class="side-by-side">
                          <ha-textfield
                            .label=${'Position (%)'}
                            type="number"
                            min="0"
                            max="100"
                            .value=${mode.position?.toString() || '0'}
                            @input=${(e: InputEvent) => this._updateSliderMode(index, modeIndex, 'position', parseInt((e.target as HTMLInputElement).value) || 0)}
                          ></ha-textfield>

                          <ha-textfield
                            .label=${'Label'}
                            .value=${mode.label || ''}
                            @input=${(e: InputEvent) => this._updateSliderMode(index, modeIndex, 'label', (e.target as HTMLInputElement).value)}
                          ></ha-textfield>
                        </div>

                        <ha-selector
                          .hass=${this.hass}
                          .selector=${ACTION_SCHEMA}
                          .value=${mode.action || { action: 'none' }}
                          .label=${'Action'}
                          @value-changed=${(e: CustomEvent) => this._updateSliderMode(index, modeIndex, 'action', e.detail.value)}
                        ></ha-selector>
                      </div>
                    </div>
                  `)}

                  ${(!device.slider_modes || device.slider_modes.length === 0) ? html`
                    <p class="helper-text empty-modes">No modes configured. Click + to add slider positions.</p>
                  ` : nothing}
                </div>
              `}
            </div>
          </ha-expansion-panel>

          <!-- Device Colors -->
          <ha-expansion-panel 
            outlined 
            .header=${'Colors'}
            .expanded=${this._expandedDeviceSections[`${index}-colors`] || false}
            @expanded-changed=${(e: CustomEvent) => (this._expandedDeviceSections[`${index}-colors`] = e.detail.expanded)}
          >
            <div class="color-grid">
              <ha-textfield
                .label=${'Chip On Color'}
                .value=${device.chip_on_color || ''}
                placeholder="${HA_DOMAIN_COLORS[domain] || DEFAULT_CHIP_ON_COLOR}"
                @input=${(e: InputEvent) => this._updateDevice(index, 'chip_on_color', (e.target as HTMLInputElement).value)}
              ></ha-textfield>

              <ha-textfield
                .label=${'Chip Off Color'}
                .value=${device.chip_off_color || ''}
                placeholder="${DEFAULT_CHIP_OFF_COLOR}"
                @input=${(e: InputEvent) => this._updateDevice(index, 'chip_off_color', (e.target as HTMLInputElement).value)}
              ></ha-textfield>

              <ha-textfield
                .label=${'Icon On Color'}
                .value=${device.icon_on_color || ''}
                placeholder="${DEFAULT_ICON_ON_COLOR}"
                @input=${(e: InputEvent) => this._updateDevice(index, 'icon_on_color', (e.target as HTMLInputElement).value)}
              ></ha-textfield>

              <ha-textfield
                .label=${'Icon Off Color'}
                .value=${device.icon_off_color || ''}
                placeholder="${DEFAULT_ICON_OFF_COLOR}"
                @input=${(e: InputEvent) => this._updateDevice(index, 'icon_off_color', (e.target as HTMLInputElement).value)}
              ></ha-textfield>
            </div>
          </ha-expansion-panel>

          <!-- Chip Actions -->
          <ha-expansion-panel 
            outlined 
            .header=${'Chip Actions'}
            .expanded=${this._expandedDeviceSections[`${index}-actions`] || false}
            @expanded-changed=${(e: CustomEvent) => (this._expandedDeviceSections[`${index}-actions`] = e.detail.expanded)}
          >
            <div class="actions-config">
              <p class="helper-text">Chip tap/hold actions. Default: tap toggles, hold opens more-info.</p>
              
              <div class="action-row">
                <ha-selector
                  .hass=${this.hass}
                  .selector=${ACTION_SCHEMA}
                  .value=${device.tap_action || { action: 'toggle' }}
                  .label=${'Tap'}
                  @value-changed=${(e: CustomEvent) => this._updateDevice(index, 'tap_action', e.detail.value)}
                ></ha-selector>

                <ha-selector
                  .hass=${this.hass}
                  .selector=${ACTION_SCHEMA}
                  .value=${device.hold_action || { action: 'more-info' }}
                  .label=${'Hold'}
                  @value-changed=${(e: CustomEvent) => this._updateDevice(index, 'hold_action', e.detail.value)}
                ></ha-selector>

                <ha-selector
                  .hass=${this.hass}
                  .selector=${ACTION_SCHEMA}
                  .value=${device.double_tap_action || { action: 'none' }}
                  .label=${'Double Tap'}
                  @value-changed=${(e: CustomEvent) => this._updateDevice(index, 'double_tap_action', e.detail.value)}
                ></ha-selector>
              </div>
            </div>
          </ha-expansion-panel>
        </div>
      </ha-expansion-panel>
    `;
  }

  // ========== HELPER METHODS ==========

  private _valueChanged(key: string, value: any): void {
    if (!this._config) return;

    const newConfig = { ...this._config, [key]: value };
    
    // Clean up empty values
    if (value === '' || value === undefined) {
      delete (newConfig as any)[key];
    }

    this._config = newConfig;
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _toggleEntityBasedBackground(useEntity: boolean): void {
    if (useEntity) {
      this._valueChanged('background', { entity: '', ranges: [] });
    } else {
      this._valueChanged('background', 'var(--ha-card-background)');
    }
  }

  private _updateEntityColorConfig(key: string, prop: string, value: any): void {
    const current = (this._config as any)?.[key] || { entity: '', ranges: [] };
    this._valueChanged(key, { ...current, [prop]: value });
  }

  private _addColorRange(key: string): void {
    const current = (this._config as any)?.[key] || { entity: '', ranges: [] };
    const ranges = [...(current.ranges || []), { min: 0, max: 100, color: '#ffffff' }];
    this._valueChanged(key, { ...current, ranges });
  }

  private _updateColorRange(key: string, index: number, prop: string, value: any): void {
    const current = (this._config as any)?.[key] || { entity: '', ranges: [] };
    const ranges = [...current.ranges];
    ranges[index] = { ...ranges[index], [prop]: value };
    this._valueChanged(key, { ...current, ranges });
  }

  private _removeColorRange(key: string, index: number): void {
    const current = (this._config as any)?.[key] || { entity: '', ranges: [] };
    const ranges = current.ranges.filter((_: any, i: number) => i !== index);
    this._valueChanged(key, { ...current, ranges });
  }

  private _addDevice(): void {
    const devices = [...(this._config!.devices || []), { entity: '' }];
    this._valueChanged('devices', devices);
    this._expandedDevices[devices.length - 1] = true;
  }

  private _removeDevice(index: number): void {
    const devices = (this._config!.devices || []).filter((_, i) => i !== index);
    this._valueChanged('devices', devices);
    delete this._expandedDevices[index];
  }

  private _updateDevice(index: number, key: string, value: any): void {
    const devices = [...(this._config!.devices || [])];
    
    // When entity changes, auto-populate defaults
    if (key === 'entity' && value) {
      const domain = value.split('.')[0];
      const defaults = DEFAULT_DEVICE_ATTRIBUTES[domain] || { attribute: 'state', scale: 1 };
      
      devices[index] = {
        ...devices[index],
        entity: value,
        icon: devices[index].icon || HA_DOMAIN_ICONS[domain] || 'mdi:help-circle',
        attribute: defaults.attribute,
        scale: defaults.scale,
        chip_on_color: devices[index].chip_on_color || HA_DOMAIN_COLORS[domain],
      };
    } else {
      devices[index] = { ...devices[index], [key]: value };
    }

    this._valueChanged('devices', devices);
  }

  private _addSliderMode(deviceIndex: number): void {
    const devices = [...(this._config!.devices || [])];
    const device = devices[deviceIndex];
    const modes = device.slider_modes || [];
    
    // Calculate next position (evenly distributed)
    const existingPositions = modes.map(m => m.position);
    let newPosition = 0;
    if (modes.length === 0) {
      newPosition = 0;
    } else if (modes.length === 1) {
      newPosition = 100;
    } else {
      // Find a gap
      for (let i = 0; i <= 100; i += 25) {
        if (!existingPositions.includes(i)) {
          newPosition = i;
          break;
        }
      }
    }

    devices[deviceIndex] = {
      ...device,
      slider_modes: [...modes, { position: newPosition, label: '', action: { action: 'none' } }]
    };
    
    this._valueChanged('devices', devices);
  }

  private _removeSliderMode(deviceIndex: number, modeIndex: number): void {
    const devices = [...(this._config!.devices || [])];
    const device = devices[deviceIndex];
    const modes = (device.slider_modes || []).filter((_, i) => i !== modeIndex);
    
    devices[deviceIndex] = { ...device, slider_modes: modes };
    this._valueChanged('devices', devices);
  }

  private _updateSliderMode(deviceIndex: number, modeIndex: number, key: string, value: any): void {
    const devices = [...(this._config!.devices || [])];
    const device = devices[deviceIndex];
    const modes = [...(device.slider_modes || [])];
    
    modes[modeIndex] = { ...modes[modeIndex], [key]: value };
    devices[deviceIndex] = { ...device, slider_modes: modes };
    
    this._valueChanged('devices', devices);
  }

  // ========== STYLES ==========
  static get styles(): CSSResultGroup {
    return css`
      .card-config {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      ha-expansion-panel {
        margin-bottom: 4px;
      }

      .section-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 16px;
      }

      .device-config {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 12px;
      }

      .side-by-side {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }

      .subsection-header {
        font-weight: 500;
        font-size: 14px;
        color: var(--primary-text-color);
        margin-top: 8px;
        margin-bottom: -8px;
      }

      .helper-text {
        font-size: 12px;
        color: var(--secondary-text-color);
        margin: 0;
        padding: 0;
      }

      .empty-modes {
        font-style: italic;
        padding: 8px;
        text-align: center;
      }

      .entity-color-config {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 12px;
        background: var(--secondary-background-color);
        border-radius: 8px;
      }

      .ranges-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .ranges-header,
      .modes-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 500;
      }

      .range-item {
        display: grid;
        grid-template-columns: 1fr 1fr 2fr auto;
        gap: 8px;
        align-items: center;
      }

      .color-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        padding: 12px;
      }

      .actions-config,
      .slider-config {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 12px;
      }

      /* Action groups in consolidated section */
      .action-group {
        padding: 12px;
        background: var(--secondary-background-color);
        border-radius: 8px;
        margin-bottom: 8px;
      }

      .action-group:last-child {
        margin-bottom: 0;
      }

      .action-group-header {
        font-weight: 500;
        font-size: 14px;
        margin-bottom: 4px;
      }

      .action-row {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 12px;
        margin-top: 8px;
      }

      /* Slider modes */
      .slider-modes {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .slider-mode-item {
        padding: 12px;
        background: var(--secondary-background-color);
        border-radius: 8px;
        border: 1px solid var(--divider-color);
      }

      .mode-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 500;
        margin-bottom: 8px;
      }

      .mode-config {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      ha-formfield {
        display: flex;
        align-items: center;
      }

      ha-button {
        margin-top: 8px;
      }

      ha-icon-button {
        color: var(--secondary-text-color);
      }

      ha-icon-button:hover {
        color: var(--primary-color);
      }

      /* Responsive styles */
      @media (max-width: 600px) {
        .action-row {
          grid-template-columns: 1fr;
        }

        .side-by-side {
          grid-template-columns: 1fr;
        }

        .range-item {
          grid-template-columns: 1fr 1fr;
        }

        .range-item ha-textfield:nth-child(3) {
          grid-column: span 2;
        }

        .color-grid {
          grid-template-columns: 1fr;
        }
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'room-card-editor': RoomCardEditor;
  }
}
