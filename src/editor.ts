import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import {
  DEFAULT_CHIP_ON_COLOR,
  DEFAULT_CHIP_OFF_COLOR,
  DEFAULT_CHIP_UNAVAILABLE_COLOR,
  DEFAULT_ICON_ON_COLOR,
  DEFAULT_ICON_OFF_COLOR,
  DEFAULT_ICON_UNAVAILABLE_COLOR,
  DEFAULT_CARD_BACKGROUND,
  DEFAULT_ICON_COLOR,
  DEFAULT_ICON_BACKGROUND_COLOR,
  DEFAULT_TITLE_SIZE,
  DEFAULT_SUBTITLE_SIZE,
  HA_DOMAIN_COLORS,
  HA_DOMAIN_ICONS,
} from './const';

@customElement('room-card-editor')
export class RoomCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: any;
  @state() private _expandedSections = {
    basic: true,
    appearance: false,
    actions: false,
    devices: false,
  };
  @state() private _expandedDevices: { [key: number]: boolean } = {};

  setConfig(config: any): void {
    this._config = {
      background: DEFAULT_CARD_BACKGROUND,
      haptic_feedback: true,
      card_tap_action: { action: 'none' },
      card_hold_action: { action: 'none' },
      title_tap_action: { action: 'none' },
      title_hold_action: { action: 'none' },
      icon_tap_action: { action: 'none' },
      icon_hold_action: { action: 'none' },
      ...config,
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
        ${this._renderActionsSection()}
        ${this._renderDevicesSection()}
      </div>
    `;
  }

  private _renderBasicSection() {
    return html`
      <ha-expansion-panel
        .header=${'Basic Settings'}
        .expanded=${this._expandedSections.basic}
        @expanded-changed=${(e: any) => (this._expandedSections.basic = e.detail.expanded)}
      >
        <div class="section-content">
          <ha-selector
            .hass=${this.hass}
            .selector=${{ area: {} }}
            .value=${this._config.area || ''}
            .label=${'Area'}
            @value-changed=${(e: CustomEvent) =>
              this._valueChanged({
                target: { configValue: 'area' },
                detail: { value: e.detail.value },
              } as any)}
          ></ha-selector>

          <ha-textfield
            label="Room Name (override)"
            .value=${this._config.name || ''}
            .configValue=${'name'}
            @input=${this._valueChanged}
            helper="Leave empty to use area name"
          ></ha-textfield>

          <ha-icon-picker
            .hass=${this.hass}
            .value=${this._config.icon || 'mdi:home'}
            .label=${'Icon'}
            @value-changed=${(e: CustomEvent) =>
              this._valueChanged({
                target: { configValue: 'icon' },
                detail: { value: e.detail.value },
              } as any)}
          ></ha-icon-picker>

          <div class="subsection">
            <label>Subtitle Entities</label>

            <ha-selector
              .hass=${this.hass}
              .selector=${{ entity: {} }}
              .value=${this._config.display_entity_1 || ''}
              .label=${'Entity 1'}
              @value-changed=${(e: CustomEvent) =>
                this._updateConfig({ display_entity_1: e.detail.value })}
            ></ha-selector>

            <ha-textfield
              label="Entity 1 Attribute"
              .value=${this._config.display_entity_1_attribute || ''}
              @input=${(e: any) =>
                this._updateConfig({ display_entity_1_attribute: e.target.value })}
              helper="Attribute name or leave empty for entity state"
            ></ha-textfield>

            <ha-textfield
              label="Entity 1 Unit"
              .value=${this._config.display_entity_1_unit || ''}
              @input=${(e: any) => this._updateConfig({ display_entity_1_unit: e.target.value })}
              helper="Unit to display (e.g., °F, °C, %)"
            ></ha-textfield>

            <ha-selector
              .hass=${this.hass}
              .selector=${{ entity: {} }}
              .value=${this._config.display_entity_2 || ''}
              .label=${'Entity 2'}
              @value-changed=${(e: CustomEvent) =>
                this._updateConfig({ display_entity_2: e.detail.value })}
            ></ha-selector>

            <ha-textfield
              label="Entity 2 Attribute"
              .value=${this._config.display_entity_2_attribute || ''}
              @input=${(e: any) =>
                this._updateConfig({ display_entity_2_attribute: e.target.value })}
              helper="Attribute name or leave empty for entity state"
            ></ha-textfield>

            <ha-textfield
              label="Entity 2 Unit"
              .value=${this._config.display_entity_2_unit || ''}
              @input=${(e: any) => this._updateConfig({ display_entity_2_unit: e.target.value })}
              helper="Unit to display (e.g., °F, °C, %)"
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
    let backgroundType: string = 'static';
    if (
      this._config.background &&
      typeof this._config.background === 'object' &&
      'entity' in this._config.background
    ) {
      backgroundType = 'entity';
    }

    const iconColorType =
      typeof this._config.icon_color === 'object' && this._config.icon_color?.entity
        ? 'entity'
        : 'static';

    const iconBgColorType =
      typeof this._config.icon_background === 'object' && this._config.icon_background?.entity
        ? 'entity'
        : 'static';

    return html`
      <ha-expansion-panel
        .header=${'Appearance'}
        .expanded=${this._expandedSections.appearance}
        @expanded-changed=${(e: any) => (this._expandedSections.appearance = e.detail.expanded)}
      >
        <div class="section-content">
          <div class="subsection">
            <label>Typography</label>

            <ha-textfield
              label="Room Name Color"
              .value=${this._config.room_name_color || 'var(--primary-text-color)'}
              @input=${(e: any) => this._updateConfig({ room_name_color: e.target.value })}
              helper="CSS color"
            ></ha-textfield>

            <ha-textfield
              label="Room Name Font Size"
              .value=${this._config.room_name_size || DEFAULT_TITLE_SIZE}
              @input=${(e: any) => this._updateConfig({ room_name_size: e.target.value })}
              helper="CSS size (e.g., 14px, 0.875rem, clamp(...))"
            ></ha-textfield>

            <ha-textfield
              label="Subtitle Color"
              .value=${this._config.display_entity_color || 'var(--primary-text-color)'}
              @input=${(e: any) => this._updateConfig({ display_entity_color: e.target.value })}
              helper="CSS color"
            ></ha-textfield>

            <ha-textfield
              label="Subtitle Font Size"
              .value=${this._config.display_entity_size || DEFAULT_SUBTITLE_SIZE}
              @input=${(e: any) => this._updateConfig({ display_entity_size: e.target.value })}
              helper="CSS size (e.g., 12px, 0.75rem)"
            ></ha-textfield>
          </div>

          <div class="color-config-section">
            <label>Background Color</label>
            <ha-selector
              .hass=${this.hass}
              .selector=${{
                select: {
                  options: [
                    { value: 'static', label: 'Static Color' },
                    { value: 'entity', label: 'Entity-based' },
                  ],
                },
              }}
              .value=${backgroundType}
              @value-changed=${(e: CustomEvent) => {
                if (e.detail.value === 'static') {
                  this._updateConfig({ background: DEFAULT_CARD_BACKGROUND });
                } else {
                  this._updateConfig({ background: { entity: '', ranges: [] } });
                }
              }}
            ></ha-selector>

            ${backgroundType === 'static'
              ? html`
                  <ha-textfield
                    label="Background Color (hex, rgb, rgba)"
                    .value=${typeof this._config.background === 'string'
                      ? this._config.background
                      : DEFAULT_CARD_BACKGROUND}
                    @input=${(e: any) => {
                      this._updateConfig({ background: e.target.value });
                    }}
                    helper="Use CSS values"
                  ></ha-textfield>
                `
              : html`
                  <ha-selector
                    .hass=${this.hass}
                    .selector=${{ entity: {} }}
                    .value=${this._config.background?.entity || ''}
                    .label=${'Entity'}
                    @value-changed=${(e: CustomEvent) => {
                      const bg =
                        typeof this._config.background === 'object' ? this._config.background : {};
                      this._updateConfig({
                        background: {
                          ...bg,
                          entity: e.detail.value,
                        },
                      });
                    }}
                  ></ha-selector>
                  ${this._config.background?.entity
                    ? this._renderColorRanges('background', this._config.background?.ranges || [])
                    : ''}
                `}
          </div>

          <div class="color-config-section">
            <label>Icon Color</label>
            <ha-selector
              .hass=${this.hass}
              .selector=${{
                select: {
                  options: [
                    { value: 'static', label: 'Static Color' },
                    { value: 'entity', label: 'Entity-based' },
                  ],
                },
              }}
              .value=${iconColorType}
              @value-changed=${(e: CustomEvent) => {
                if (e.detail.value === 'static') {
                  this._updateConfig({ icon_color: DEFAULT_ICON_COLOR });
                } else {
                  this._updateConfig({ icon_color: { entity: '', ranges: [] } });
                }
              }}
            ></ha-selector>

            ${iconColorType === 'static'
              ? html`
                  <ha-textfield
                    label="Icon Color (hex, rgb, rgba)"
                    .value=${typeof this._config.icon_color === 'string'
                      ? this._config.icon_color
                      : DEFAULT_ICON_COLOR}
                    @input=${(e: any) => {
                      this._updateConfig({ icon_color: e.target.value });
                    }}
                    helper="Use CSS values"
                  ></ha-textfield>
                `
              : html`
                  <ha-selector
                    .hass=${this.hass}
                    .selector=${{ entity: {} }}
                    .value=${this._config.icon_color?.entity || ''}
                    .label=${'Entity'}
                    @value-changed=${(e: CustomEvent) => {
                      const iconColor =
                        typeof this._config.icon_color === 'object' ? this._config.icon_color : {};
                      this._updateConfig({
                        icon_color: {
                          ...iconColor,
                          entity: e.detail.value,
                        },
                      });
                    }}
                  ></ha-selector>
                  ${this._config.icon_color?.entity
                    ? this._renderColorRanges('icon_color', this._config.icon_color?.ranges || [])
                    : ''}
                `}
          </div>

          <div class="color-config-section">
            <label>Icon Background Color</label>
            <ha-selector
              .hass=${this.hass}
              .selector=${{
                select: {
                  options: [
                    { value: 'static', label: 'Static Color' },
                    { value: 'entity', label: 'Entity-based' },
                  ],
                },
              }}
              .value=${iconBgColorType}
              @value-changed=${(e: CustomEvent) => {
                if (e.detail.value === 'static') {
                  this._updateConfig({ icon_background: DEFAULT_ICON_BACKGROUND_COLOR });
                } else {
                  this._updateConfig({ icon_background: { entity: '', ranges: [] } });
                }
              }}
            ></ha-selector>

            ${iconBgColorType === 'static'
              ? html`
                  <ha-textfield
                    label="Icon Background Color (hex, rgb, rgba)"
                    .value=${typeof this._config.icon_background === 'string'
                      ? this._config.icon_background
                      : DEFAULT_ICON_BACKGROUND_COLOR}
                    @input=${(e: any) => {
                      this._updateConfig({ icon_background: e.target.value });
                    }}
                    helper="Use CSS values"
                  ></ha-textfield>
                `
              : html`
                  <ha-selector
                    .hass=${this.hass}
                    .selector=${{ entity: {} }}
                    .value=${this._config.icon_background?.entity || ''}
                    .label=${'Entity'}
                    @value-changed=${(e: CustomEvent) => {
                      const iconBg =
                        typeof this._config.icon_background === 'object'
                          ? this._config.icon_background
                          : {};
                      this._updateConfig({
                        icon_background: {
                          ...iconBg,
                          entity: e.detail.value,
                        },
                      });
                    }}
                  ></ha-selector>
                  ${this._config.icon_background?.entity
                    ? this._renderColorRanges(
                        'icon_background',
                        this._config.icon_background?.ranges || [],
                      )
                    : ''}
                `}
          </div>
        </div>
      </ha-expansion-panel>
    `;
  }

  private _renderActionsSection() {
    return html`
      <ha-expansion-panel
        .header=${'Actions'}
        .expanded=${this._expandedSections.actions}
        @expanded-changed=${(e: any) => (this._expandedSections.actions = e.detail.expanded)}
      >
        <div class="section-content">
          <div class="subsection">
            <label>Card Actions</label>
            <p class="helper-text">Actions for tapping/holding the card background</p>
            
            <ha-selector
              .hass=${this.hass}
              .selector=${{ ui_action: {} }}
              .value=${this._config.card_tap_action || { action: 'none' }}
              .label=${'Tap Action'}
              @value-changed=${(e: CustomEvent) =>
                this._updateConfig({ card_tap_action: e.detail.value })}
            ></ha-selector>

            <ha-selector
              .hass=${this.hass}
              .selector=${{ ui_action: {} }}
              .value=${this._config.card_hold_action || { action: 'none' }}
              .label=${'Hold Action'}
              @value-changed=${(e: CustomEvent) =>
                this._updateConfig({ card_hold_action: e.detail.value })}
            ></ha-selector>
          </div>

          <div class="subsection">
            <label>Title Section Actions</label>
            <p class="helper-text">Actions for tapping/holding the room name and subtitle</p>
            
            <ha-selector
              .hass=${this.hass}
              .selector=${{ ui_action: {} }}
              .value=${this._config.title_tap_action || { action: 'none' }}
              .label=${'Tap Action'}
              @value-changed=${(e: CustomEvent) =>
                this._updateConfig({ title_tap_action: e.detail.value })}
            ></ha-selector>

            <ha-selector
              .hass=${this.hass}
              .selector=${{ ui_action: {} }}
              .value=${this._config.title_hold_action || { action: 'none' }}
              .label=${'Hold Action'}
              @value-changed=${(e: CustomEvent) =>
                this._updateConfig({ title_hold_action: e.detail.value })}
            ></ha-selector>
          </div>

          <div class="subsection">
            <label>Icon Actions</label>
            <p class="helper-text">Actions for tapping/holding the main icon</p>
            
            <ha-selector
              .hass=${this.hass}
              .selector=${{ ui_action: {} }}
              .value=${this._config.icon_tap_action || { action: 'none' }}
              .label=${'Tap Action'}
              @value-changed=${(e: CustomEvent) =>
                this._updateConfig({ icon_tap_action: e.detail.value })}
            ></ha-selector>

            <ha-selector
              .hass=${this.hass}
              .selector=${{ ui_action: {} }}
              .value=${this._config.icon_hold_action || { action: 'none' }}
              .label=${'Hold Action'}
              @value-changed=${(e: CustomEvent) =>
                this._updateConfig({ icon_hold_action: e.detail.value })}
            ></ha-selector>
          </div>
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
        @expanded-changed=${(e: any) => (this._expandedSections.devices = e.detail.expanded)}
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
    const isLight = domain === 'light';
    const hasEntity = device.entity && device.entity.length > 0;
    const isExpanded = this._expandedDevices[index] !== false;

    return html`
      <ha-expansion-panel
        .header=${`Device ${index + 1}${device.entity ? `: ${device.entity}` : ''}`}
        .expanded=${isExpanded}
        @expanded-changed=${(e: any) => (this._expandedDevices[index] = e.detail.expanded)}
      >
        <ha-icon-button
          slot="icons"
          @click=${(e: Event) => {
            e.stopPropagation();
            this._removeDevice(index);
          }}
          .path=${'M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z'}
        ></ha-icon-button>

        <div class="device-config">
          <ha-selector
            .hass=${this.hass}
            .selector=${{ entity: {} }}
            .value=${device.entity || ''}
            .label=${'Entity'}
            @value-changed=${(e: CustomEvent) =>
              this._deviceValueChanged(index, {
                target: { configValue: 'entity' },
                detail: { value: e.detail.value },
              } as any)}
          ></ha-selector>

          ${hasEntity
            ? html`
                <ha-selector
                  .hass=${this.hass}
                  .selector=${{ entity: {} }}
                  .value=${device.control_entity || ''}
                  .label=${'Control Entity (optional)'}
                  @value-changed=${(e: CustomEvent) =>
                    this._deviceValueChanged(index, {
                      target: { configValue: 'control_entity' },
                      detail: { value: e.detail.value },
                    } as any)}
                ></ha-selector>

                <ha-icon-picker
                  .hass=${this.hass}
                  .value=${device.icon || ''}
                  .label=${'Icon'}
                  @value-changed=${(e: CustomEvent) =>
                    this._deviceValueChanged(index, {
                      target: { configValue: 'icon' },
                      detail: { value: e.detail.value },
                    } as any)}
                ></ha-icon-picker>

                <ha-selector
                  .hass=${this.hass}
                  .selector=${{
                    select: {
                      options: [
                        { value: 'continuous', label: 'Continuous (slider)' },
                        { value: 'discrete', label: 'Discrete (modes)' },
                      ],
                    },
                  }}
                  .value=${device.type || 'continuous'}
                  .label=${'Control Type'}
                  @value-changed=${(e: CustomEvent) =>
                    this._deviceValueChanged(index, {
                      target: { configValue: 'type' },
                      detail: { value: e.detail.value },
                    } as any)}
                ></ha-selector>

                ${device.type === 'discrete' ? this._renderModesConfig(device, index) : ''}

                <ha-textfield
                  label="Attribute"
                  .value=${device.attribute || ''}
                  @input=${(e: any) =>
                    this._deviceValueChanged(index, {
                      target: { configValue: 'attribute', value: e.target.value },
                    } as any)}
                  helper="Entity attribute to control (e.g., brightness, volume_level)"
                ></ha-textfield>

                <ha-textfield
                  label="Scale"
                  type="number"
                  .value=${device.scale || (isLight ? 255 : 100)}
                  @input=${(e: any) =>
                    this._deviceValueChanged(index, {
                      target: { configValue: 'scale', value: parseFloat(e.target.value) },
                    } as any)}
                  helper="Max value for attribute (e.g., 255 for brightness)"
                ></ha-textfield>

                <ha-textfield
                  label="Chip Column"
                  type="number"
                  min="1"
                  max="4"
                  .value=${device.chip_column || 1}
                  @input=${(e: any) => {
                    const value = parseInt(e.target.value);
                    if (value >= 1 && value <= 4) {
                      this._deviceValueChanged(index, {
                        target: { configValue: 'chip_column', value },
                      } as any);
                    }
                  }}
                  helper="Which column this chip appears in"
                ></ha-textfield>

                <div class="device-toggles">
                  <ha-formfield label="Show Chip">
                    <ha-switch
                      .checked=${device.show_chip !== false}
                      @change=${(e: any) =>
                        this._deviceValueChanged(index, {
                          target: { configValue: 'show_chip', value: e.target.checked },
                        } as any)}
                    ></ha-switch>
                  </ha-formfield>

                  <ha-formfield label="Show Slider">
                    <ha-switch
                      .checked=${device.show_slider !== false}
                      @change=${(e: any) =>
                        this._deviceValueChanged(index, {
                          target: { configValue: 'show_slider', value: e.target.checked },
                        } as any)}
                    ></ha-switch>
                  </ha-formfield>
                </div>

                <div class="subsection">
                  <label>Chip Actions</label>
                  <p class="helper-text">Actions for this device chip</p>

                  <ha-selector
                    .hass=${this.hass}
                    .selector=${{ ui_action: {} }}
                    .value=${device.tap_action || { action: 'toggle' }}
                    .label=${'Tap Action'}
                    @value-changed=${(e: CustomEvent) =>
                      this._deviceValueChanged(index, {
                        target: { configValue: 'tap_action', value: e.detail.value },
                      } as any)}
                  ></ha-selector>

                  <ha-selector
                    .hass=${this.hass}
                    .selector=${{ ui_action: {} }}
                    .value=${device.hold_action || { action: 'more-info' }}
                    .label=${'Hold Action'}
                    @value-changed=${(e: CustomEvent) =>
                      this._deviceValueChanged(index, {
                        target: { configValue: 'hold_action', value: e.detail.value },
                      } as any)}
                  ></ha-selector>
                </div>

                <div class="device-colors">
                  <label>Chip Colors</label>
                  <ha-textfield
                    label="Chip On Color"
                    .value=${device.chip_on_color || DEFAULT_CHIP_ON_COLOR}
                    @input=${(e: any) =>
                      this._deviceValueChanged(index, {
                        target: { configValue: 'chip_on_color', value: e.target.value },
                      } as any)}
                  ></ha-textfield>
                  <ha-textfield
                    label="Chip Off Color"
                    .value=${device.chip_off_color || DEFAULT_CHIP_OFF_COLOR}
                    @input=${(e: any) =>
                      this._deviceValueChanged(index, {
                        target: { configValue: 'chip_off_color', value: e.target.value },
                      } as any)}
                  ></ha-textfield>
                  <ha-textfield
                    label="Chip Unavailable Color"
                    .value=${device.chip_unavailable_color || DEFAULT_CHIP_UNAVAILABLE_COLOR}
                    @input=${(e: any) =>
                      this._deviceValueChanged(index, {
                        target: { configValue: 'chip_unavailable_color', value: e.target.value },
                      } as any)}
                  ></ha-textfield>
                </div>

                <div class="device-colors">
                  <label>Icon Colors</label>
                  <ha-textfield
                    label="Icon On Color"
                    .value=${device.icon_on_color || DEFAULT_ICON_ON_COLOR}
                    @input=${(e: any) =>
                      this._deviceValueChanged(index, {
                        target: { configValue: 'icon_on_color', value: e.target.value },
                      } as any)}
                  ></ha-textfield>
                  <ha-textfield
                    label="Icon Off Color"
                    .value=${device.icon_off_color || DEFAULT_ICON_OFF_COLOR}
                    @input=${(e: any) =>
                      this._deviceValueChanged(index, {
                        target: { configValue: 'icon_off_color', value: e.target.value },
                      } as any)}
                  ></ha-textfield>
                  <ha-textfield
                    label="Icon Unavailable Color"
                    .value=${device.icon_unavailable_color || DEFAULT_ICON_UNAVAILABLE_COLOR}
                    @input=${(e: any) =>
                      this._deviceValueChanged(index, {
                        target: { configValue: 'icon_unavailable_color', value: e.target.value },
                      } as any)}
                  ></ha-textfield>
                </div>
              `
            : ''}
        </div>
      </ha-expansion-panel>
    `;
  }

  private _renderModesConfig(device: any, deviceIndex: number) {
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
          ${modes.map(
            (mode: any, modeIndex: number) => html`
              <div class="mode-item">
                <div class="mode-inputs">
                  <ha-textfield
                    label="Label"
                    .value=${mode.label || ''}
                    @input=${(e: any) =>
                      this._updateMode(deviceIndex, modeIndex, 'label', e.target.value)}
                  ></ha-textfield>
                  <ha-textfield
                    label="Value (0-1)"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    .value=${mode.value || 0}
                    @input=${(e: any) =>
                      this._updateMode(deviceIndex, modeIndex, 'value', parseFloat(e.target.value))}
                  ></ha-textfield>
                </div>
                <div class="mode-action">
                  <ha-selector
                    .hass=${this.hass}
                    .selector=${{ ui_action: {} }}
                    .value=${mode.action || { action: 'none' }}
                    .label=${'Mode Action'}
                    @value-changed=${(e: CustomEvent) =>
                      this._updateMode(deviceIndex, modeIndex, 'action', e.detail.value)}
                  ></ha-selector>
                </div>
                <ha-icon-button
                  @click=${() => this._removeMode(deviceIndex, modeIndex)}
                  .path=${'M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z'}
                ></ha-icon-button>
              </div>
            `,
          )}
        </div>
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
          ${ranges.map(
            (range: any, index: number) => html`
              <div class="range-item">
                ${range.state !== undefined
                  ? html`
                      <ha-textfield
                        label="State"
                        .value=${range.state || ''}
                        @input=${(e: any) =>
                          this._updateColorRange(configKey, index, 'state', e.target.value)}
                      ></ha-textfield>
                    `
                  : html`
                      <div class="range-inputs">
                        <ha-textfield
                          label="Min"
                          type="number"
                          .value=${range.min ?? 0}
                          @input=${(e: any) =>
                            this._updateColorRange(
                              configKey,
                              index,
                              'min',
                              parseFloat(e.target.value),
                            )}
                        ></ha-textfield>
                        <ha-textfield
                          label="Max"
                          type="number"
                          .value=${range.max ?? 100}
                          @input=${(e: any) =>
                            this._updateColorRange(
                              configKey,
                              index,
                              'max',
                              parseFloat(e.target.value),
                            )}
                        ></ha-textfield>
                      </div>
                    `}
                <ha-textfield
                  label="Color"
                  .value=${range.color || '#FFFFFF'}
                  @input=${(e: any) =>
                    this._updateColorRange(configKey, index, 'color', e.target.value)}
                ></ha-textfield>
                <ha-icon-button
                  @click=${() => this._toggleRangeType(configKey, index)}
                  .path=${range.state !== undefined
                    ? 'M3,17V19H9V17H3M3,5V7H13V5H3M13,21V19H21V17H13V15H11V21H13M7,9V11H3V13H7V15H9V9H7M21,13V11H11V13H21M15,9H17V7H21V5H17V3H15V9Z'
                    : 'M9,9V15H7V9H9M5,5V19H3V5H5M21,5V19H11V5H21M19,7H13V17H19V7Z'}
                  title=${range.state !== undefined
                    ? 'Switch to numeric range'
                    : 'Switch to state match'}
                ></ha-icon-button>
                <ha-icon-button
                  @click=${() => this._removeColorRange(configKey, index)}
                  .path=${'M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z'}
                ></ha-icon-button>
              </div>
            `,
          )}
        </div>
      </div>
    `;
  }

  private _updateConfig(updates: any) {
    this._config = { ...this._config, ...updates };
    this._fireConfigChanged();
  }

  private _fireConfigChanged() {
    const event = new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  private _valueChanged(ev: any) {
    if (!this._config) return;

    const target = ev.target;
    const configValue = target.configValue;
    const value = ev.detail?.value ?? (target.checked !== undefined ? target.checked : target.value);

    if (configValue) {
      this._updateConfig({ [configValue]: value });
    }
  }

  private _addDevice() {
    const devices = [...(this._config.devices || [])];
    devices.push({
      entity: '',
      icon: 'mdi:lightbulb',
      type: 'continuous',
      attribute: 'brightness',
      scale: 255,
      show_chip: true,
      show_slider: true,
      chip_column: 1,
      tap_action: { action: 'toggle' },
      hold_action: { action: 'more-info' },
    });
    this._updateConfig({ devices });
  }

  private _removeDevice(index: number) {
    const devices = [...(this._config.devices || [])];
    devices.splice(index, 1);
    this._updateConfig({ devices });
  }

  private _deviceValueChanged(index: number, ev: any) {
    const devices = [...(this._config.devices || [])];
    const target = ev.target;
    const configValue = target.configValue;
    const value = ev.detail?.value ?? (target.checked !== undefined ? target.checked : target.value);

    if (configValue === 'entity' && value) {
      const domain = value.split('.')[0];
      const defaultIcon = HA_DOMAIN_ICONS[domain];
      const defaultColor = HA_DOMAIN_COLORS[domain] || DEFAULT_CHIP_ON_COLOR;

      let defaultAttribute = 'state';
      let defaultScale = 1;

      if (domain === 'light') {
        defaultAttribute = 'brightness';
        defaultScale = 2.55;
      } else if (domain === 'media_player') {
        defaultAttribute = 'volume_level';
      } else if (domain === 'fan') {
        defaultAttribute = 'percentage';
      } else if (domain === 'climate') {
        defaultAttribute = 'temperature';
      } else if (domain === 'cover') {
        defaultAttribute = 'position';
      } else if (domain === 'vacuum') {
        defaultAttribute = 'battery_level';
      }

      devices[index] = {
        ...devices[index],
        entity: value,
        icon: defaultIcon || devices[index].icon || 'mdi:lightbulb',
        attribute: defaultAttribute,
        scale: defaultScale,
        chip_on_color: defaultColor,
      };
    } else {
      devices[index] = {
        ...devices[index],
        [configValue]: value,
      };
    }

    this._updateConfig({ devices });
  }

  private _addMode(deviceIndex: number) {
    const devices = [...(this._config.devices || [])];
    const modes = [...(devices[deviceIndex].modes || [])];
    modes.push({
      label: `Mode ${modes.length + 1}`,
      value: modes.length / Math.max(modes.length, 1),
      percentage: modes.length * 33,
      action: { action: 'none' },
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

  private _addColorRange(configKey: string) {
    const config = this._config[configKey];
    const ranges = [...(config.ranges || [])];
    ranges.push({ min: 0, max: 100, color: '#FFFFFF' });

    this._updateConfig({
      [configKey]: { ...config, ranges },
    });
  }

  private _updateColorRange(configKey: string, index: number, field: string, value: any) {
    const config = this._config[configKey];
    const ranges = [...(config.ranges || [])];
    ranges[index] = { ...ranges[index], [field]: value };

    this._updateConfig({
      [configKey]: { ...config, ranges },
    });
  }

  private _removeColorRange(configKey: string, index: number) {
    const config = this._config[configKey];
    const ranges = [...(config.ranges || [])];
    ranges.splice(index, 1);

    this._updateConfig({
      [configKey]: { ...config, ranges },
    });
  }

  private _toggleRangeType(configKey: string, index: number) {
    const config = this._config[configKey];
    const ranges = [...(config.ranges || [])];
    const range = { ...ranges[index] };

    if (range.state !== undefined) {
      const newRange: any = { min: 0, max: 100, color: range.color };
      ranges[index] = newRange;
    } else {
      const newRange: any = { state: '', color: range.color };
      ranges[index] = newRange;
    }

    this._updateConfig({
      [configKey]: { ...config, ranges },
    });
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
        border-radius: 8px;
      }

      .subsection label {
        font-weight: 500;
        font-size: 14px;
      }

      .helper-text {
        font-size: 12px;
        color: var(--secondary-text-color);
        margin: 0 0 8px 0;
      }

      ha-formfield {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 0;
      }

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
        display: flex;
        flex-direction: column;
        gap: 12px;
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
        gap: 12px;
      }

      .mode-item {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px;
        background: var(--card-background-color);
        border-radius: 8px;
        position: relative;
      }

      .mode-item > ha-icon-button {
        position: absolute;
        top: 4px;
        right: 4px;
      }

      .mode-inputs {
        display: flex;
        gap: 8px;
      }

      .mode-inputs ha-textfield {
        flex: 1;
      }

      .mode-action {
        margin-top: 8px;
      }

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
        margin-top: 8px;
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
        margin-top: 8px;
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

      ha-icon-button[slot='icons'] {
        color: var(--secondary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'room-card-editor': RoomCardEditor;
  }
}
