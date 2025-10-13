import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, ActionConfig } from 'custom-card-helpers';
import {
  DEFAULT_CHIP_ON_COLOR,
  DEFAULT_CHIP_OFF_COLOR,
  DEFAULT_CHIP_UNAVAILABLE_COLOR,
  DEFAULT_ICON_ON_COLOR,
  DEFAULT_ICON_OFF_COLOR,
  DEFAULT_ICON_UNAVAILABLE_COLOR,
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
    icon_action: false,
    devices: false,
  };
  @state() private _expandedDevices: { [key: number]: boolean } = {};

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
      haptic_feedback: true,
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
        ${this._renderIconActionSection()}
        ${this._renderAppearanceSection()} 
        ${this._renderDevicesSection()}
      </div>
    `;
  }

  // ========== BASIC SETTINGS SECTION ==========
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
            label="Room Name (Optional)"
            .value=${this._config.name || ''}
            .configValue=${'name'}
            @input=${this._valueChanged}
            helper="Leave empty to use area name"
          ></ha-textfield>

          <ha-selector
            .hass=${this.hass}
            .selector=${{ icon: {} }}
            .value=${this._config.icon || 'mdi:home'}
            .label=${'Icon'}
            @value-changed=${(e: CustomEvent) =>
              this._valueChanged({
                target: { configValue: 'icon' },
                detail: { value: e.detail.value },
              } as any)}
          ></ha-selector>

          <div class="subsection">
            <label>Room Name Styling</label>
            <ha-textfield
              label="Room Name Color"
              .value=${this._config.room_name_color || 'var(--primary-text-color)'}
              @input=${(e: any) => this._updateConfig({ room_name_color: e.target.value })}
              helper="CSS color (e.g., #000000, rgb(0,0,0), var(--primary-text-color))"
            ></ha-textfield>
            <ha-textfield
              label="Room Name Font Size"
              .value=${this._config.room_name_size || '14px'}
              @input=${(e: any) => this._updateConfig({ room_name_size: e.target.value })}
              helper="CSS size (e.g., 14px, 1.2rem)"
            ></ha-textfield>
          </div>

          <div class="subsection">
            <label>Subtitle Entities</label>
            <ha-selector
              .hass=${this.hass}
              .selector=${{ entity: {} }}
              .value=${this._config.display_entity_1 || ''}
              .label=${'Entity 1'}
              @value-changed=${(e: CustomEvent) =>
                this._valueChanged({
                  target: { configValue: 'display_entity_1' },
                  detail: { value: e.detail.value },
                } as any)}
            ></ha-selector>

            <ha-textfield
              label="Entity 1 Attribute (leave empty for state)"
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
                this._valueChanged({
                  target: { configValue: 'display_entity_2' },
                  detail: { value: e.detail.value },
                } as any)}
            ></ha-selector>

            <ha-textfield
              label="Entity 2 Attribute (leave empty for state)"
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

            <ha-textfield
              label="Subtitle Entities Color"
              .value=${this._config.display_entity_color || 'var(--primary-text-color)'}
              @input=${(e: any) => this._updateConfig({ display_entity_color: e.target.value })}
              helper="CSS color"
            ></ha-textfield>

            <ha-textfield
              label="Subtitle Entities Font Size"
              .value=${this._config.display_entity_size || '12px'}
              @input=${(e: any) => this._updateConfig({ display_entity_size: e.target.value })}
              helper="CSS size (e.g., 12px)"
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

  // ========== ICON ACTION SECTION (NEW) ==========
  private _renderIconActionSection() {
    return html`
      <ha-expansion-panel
        .header=${'Icon Tap Action'}
        .expanded=${this._expandedSections.icon_action}
        @expanded-changed=${(e: any) => (this._expandedSections.icon_action = e.detail.expanded)}
      >
        <div class="section-content">
          <div class="info-message">
            Configure what happens when you tap the main room icon in the bottom left corner.
          </div>

          <ha-selector
            .hass=${this.hass}
            .selector=${{ action: {} }}
            .value=${this._config.icon_tap_action || { action: 'more-info' }}
            .label=${'Icon Tap Action'}
            @value-changed=${(e: CustomEvent) =>
              this._updateConfig({ icon_tap_action: e.detail.value })}
          ></ha-selector>

          <div class="helper-text">
            Available actions: more-info, toggle, navigate, url, call-service, assist, none
          </div>
        </div>
      </ha-expansion-panel>
    `;
  }

  // ========== APPEARANCE SECTION ==========
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
          <!-- Background Color Configuration -->
          <div class="color-config-section">
            <label>Card Background</label>
            <ha-formfield label="Use Entity-Based Color">
              <ha-switch
                .checked=${backgroundType === 'entity'}
                @change=${(e: any) => {
                  if (e.target.checked) {
                    this._updateConfig({ background: { entity: '', ranges: [] } });
                  } else {
                    this._updateConfig({ background: 'var(--ha-card-background)' });
                  }
                }}
              ></ha-switch>
            </ha-formfield>

            ${backgroundType === 'static'
              ? html`
                  <ha-textfield
                    label="Background Color (hex, rgb, rgba)"
                    .value=${typeof this._config.background === 'string'
                      ? this._config.background
                      : 'var(--ha-card-background)'}
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
                        typeof this._config.background === 'object'
                          ? this._config.background
                          : {};
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

          <!-- Icon Color Configuration -->
          <div class="color-config-section">
            <label>Icon Color</label>
            <ha-formfield label="Use Entity-Based Color">
              <ha-switch
                .checked=${iconColorType === 'entity'}
                @change=${(e: any) => {
                  if (e.target.checked) {
                    this._updateConfig({ icon_color: { entity: '', ranges: [] } });
                  } else {
                    this._updateConfig({ icon_color: '#FFFFFF' });
                  }
                }}
              ></ha-switch>
            </ha-formfield>

            ${iconColorType === 'static'
              ? html`
                  <ha-textfield
                    label="Icon Color (hex, rgb, rgba)"
                    .value=${typeof this._config.icon_color === 'string'
                      ? this._config.icon_color
                      : '#FFFFFF'}
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

          <!-- Icon Background Color Configuration -->
          <div class="color-config-section">
            <label>Icon Background Color</label>
            <ha-formfield label="Use Entity-Based Color">
              <ha-switch
                .checked=${iconBgColorType === 'entity'}
                @change=${(e: any) => {
                  if (e.target.checked) {
                    this._updateConfig({ icon_background: { entity: '', ranges: [] } });
                  } else {
                    this._updateConfig({ icon_background: 'rgba(255, 255, 255, 0.2)' });
                  }
                }}
              ></ha-switch>
            </ha-formfield>

            ${iconBgColorType === 'static'
              ? html`
                  <ha-textfield
                    label="Icon Background Color (hex, rgb, rgba)"
                    .value=${typeof this._config.icon_background === 'string'
                      ? this._config.icon_background
                      : 'rgba(255, 255, 255, 0.2)'}
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

  // ========== DEVICES SECTION ==========
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
        .header=${`Device ${index + 1}${device.entity ? ` (${device.entity})` : ''}`}
        .expanded=${isExpanded}
        @expanded-changed=${(e: any) => {
          this._expandedDevices[index] = e.detail.expanded;
          this.requestUpdate();
        }}
      >
        <div class="device-content">
          <div class="device-header">
            <ha-icon-button
              @click=${() => this._removeDevice(index)}
              .path=${'M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z'}
              title="Remove device"
            ></ha-icon-button>
          </div>

          ${hasEntity
            ? html`
                <ha-selector
                  .hass=${this.hass}
                  .selector=${{ entity: {} }}
                  .value=${device.entity || ''}
                  .label=${'Entity'}
                  @value-changed=${(e: CustomEvent) =>
                    this._handleDeviceChange(
                      {
                        target: { configValue: 'entity' },
                        detail: { value: e.detail.value },
                      } as any,
                      index,
                    )}
                ></ha-selector>

                <ha-selector
                  .hass=${this.hass}
                  .selector=${{ entity: {} }}
                  .value=${device.control_entity || ''}
                  .label=${'Control Entity (optional)'}
                  @value-changed=${(e: CustomEvent) =>
                    this._handleDeviceChange(
                      {
                        target: { configValue: 'control_entity' },
                        detail: { value: e.detail.value },
                      } as any,
                      index,
                    )}
                ></ha-selector>

                <ha-selector
                  .hass=${this.hass}
                  .selector=${{ icon: {} }}
                  .value=${device.icon || ''}
                  .label=${'Icon'}
                  @value-changed=${(e: CustomEvent) =>
                    this._handleDeviceChange(
                      {
                        target: { configValue: 'icon' },
                        detail: { value: e.detail.value },
                      } as any,
                      index,
                    )}
                ></ha-selector>

                <ha-select
                  label="Device Type"
                  .value=${device.type || 'continuous'}
                  @selected=${(e: any) =>
                    this._handleDeviceChange(
                      {
                        target: { configValue: 'type' },
                        detail: { value: e.target.value },
                      } as any,
                      index,
                    )}
                >
                  <mwc-list-item value="continuous">Continuous (Slider)</mwc-list-item>
                  <mwc-list-item value="discrete">Discrete (Modes)</mwc-list-item>
                </ha-select>

                ${device.type === 'continuous'
                  ? html`
                      <ha-select
                        label="Attribute"
                        .value=${device.attribute || 'brightness'}
                        @selected=${(e: any) =>
                          this._handleDeviceChange(
                            {
                              target: { configValue: 'attribute' },
                              detail: { value: e.target.value },
                            } as any,
                            index,
                          )}
                      >
                        ${this._getEntityAttributes(device.entity).map(
                          (attr) => html`
                            <mwc-list-item value="${attr}">
                              ${this._formatAttributeName(attr)}
                            </mwc-list-item>
                          `,
                        )}
                      </ha-select>

                      <ha-textfield
                        label="Scale"
                        type="number"
                        .value=${device.scale || 255}
                        @input=${(e: any) =>
                          this._handleDeviceChange(
                            {
                              target: { configValue: 'scale' },
                              detail: { value: parseFloat(e.target.value) },
                            } as any,
                            index,
                          )}
                        helper="Maximum value for the attribute (e.g., 255 for brightness, 100 for percentage)"
                      ></ha-textfield>
                    `
                  : ''}

                ${device.type === 'discrete' ? this._renderDeviceModes(device, index) : ''}

                <!-- ========== CHIP ACTIONS SECTION (NEW) ========== -->
                ${this._renderChipActions(device, index)}

                <div class="device-toggles">
                  <ha-formfield label="Show Chip">
                    <ha-switch
                      .checked=${device.show_chip !== false}
                      @change=${(e: any) =>
                        this._handleDeviceChange(
                          {
                            target: { configValue: 'show_chip' },
                            detail: { value: e.target.checked },
                          } as any,
                          index,
                        )}
                    ></ha-switch>
                  </ha-formfield>

                  <ha-formfield label="Show Slider">
                    <ha-switch
                      .checked=${device.show_slider !== false}
                      @change=${(e: any) =>
                        this._handleDeviceChange(
                          {
                            target: { configValue: 'show_slider' },
                            detail: { value: e.target.checked },
                          } as any,
                          index,
                        )}
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
                      this._handleDeviceChange(
                        {
                          target: { configValue: 'chip_column' },
                          detail: { value },
                        } as any,
                        index,
                      );
                    }
                  }}
                  helper="Which column to place this chip in"
                ></ha-textfield>

                <div class="device-colors">
                  <label>Chip State Colors</label>

                  <ha-textfield
                    label="Chip On Color"
                    .value=${device.chip_on_color ||
                    device.color_on ||
                    (isLight ? 'light-color' : DEFAULT_CHIP_ON_COLOR)}
                    @input=${(e: any) =>
                      this._handleDeviceChange(
                        {
                          target: { configValue: 'chip_on_color' },
                          detail: { value: e.target.value },
                        } as any,
                        index,
                      )}
                    helper="${isLight
                      ? 'Use "light-color" to match light RGB'
                      : 'Chip background when on'}"
                  ></ha-textfield>

                  <ha-textfield
                    label="Chip Off Color"
                    .value=${device.chip_off_color || device.color_off || DEFAULT_CHIP_OFF_COLOR}
                    @input=${(e: any) =>
                      this._handleDeviceChange(
                        {
                          target: { configValue: 'chip_off_color' },
                          detail: { value: e.target.value },
                        } as any,
                        index,
                      )}
                    helper="Chip background when off"
                  ></ha-textfield>

                  <ha-textfield
                    label="Chip Unavailable Color"
                    .value=${device.chip_unavailable_color ||
                    device.color_unavailable ||
                    DEFAULT_CHIP_UNAVAILABLE_COLOR}
                    @input=${(e: any) =>
                      this._handleDeviceChange(
                        {
                          target: { configValue: 'chip_unavailable_color' },
                          detail: { value: e.target.value },
                        } as any,
                        index,
                      )}
                    helper="Chip background when unavailable"
                  ></ha-textfield>
                </div>

                <div class="device-colors">
                  <label>Icon State Colors</label>

                  <ha-textfield
                    label="Icon On Color"
                    .value=${device.icon_on_color || device.icon_color || DEFAULT_ICON_ON_COLOR}
                    @input=${(e: any) =>
                      this._handleDeviceChange(
                        {
                          target: { configValue: 'icon_on_color' },
                          detail: { value: e.target.value },
                        } as any,
                        index,
                      )}
                    helper="Icon color when on"
                  ></ha-textfield>

                  <ha-textfield
                    label="Icon Off Color"
                    .value=${device.icon_off_color || DEFAULT_ICON_OFF_COLOR}
                    @input=${(e: any) =>
                      this._handleDeviceChange(
                        {
                          target: { configValue: 'icon_off_color' },
                          detail: { value: e.target.value },
                        } as any,
                        index,
                      )}
                    helper="Icon color when off"
                  ></ha-textfield>

                  <ha-textfield
                    label="Icon Unavailable Color"
                    .value=${device.icon_unavailable_color || DEFAULT_ICON_UNAVAILABLE_COLOR}
                    @input=${(e: any) =>
                      this._handleDeviceChange(
                        {
                          target: { configValue: 'icon_unavailable_color' },
                          detail: { value: e.target.value },
                        } as any,
                        index,
                      )}
                    helper="Icon color when unavailable"
                  ></ha-textfield>
                </div>
              `
            : html`
                <ha-selector
                  .hass=${this.hass}
                  .selector=${{ entity: {} }}
                  .value=${device.entity || ''}
                  .label=${'Entity'}
                  @value-changed=${(e: CustomEvent) =>
                    this._handleDeviceChange(
                      {
                        target: { configValue: 'entity' },
                        detail: { value: e.detail.value },
                      } as any,
                      index,
                    )}
                ></ha-selector>

                <div class="info-message">Select an entity to configure device settings</div>
              `}
        </div>
      </ha-expansion-panel>
    `;
  }

  // ========== CHIP ACTIONS RENDERING (NEW) ==========
  private _renderChipActions(device: any, deviceIndex: number) {
    return html`
      <div class="chip-actions-section">
        <label class="section-label">Chip Interactions</label>
        <div class="info-message">
          Configure what happens when you tap, hold, or double-tap this device chip
        </div>

        <!-- Tap Action -->
        <ha-selector
          .hass=${this.hass}
          .selector=${{ action: {} }}
          .value=${device.tap_action || { action: 'toggle' }}
          .label=${'Tap Action'}
          @value-changed=${(e: CustomEvent) => {
            const devices = [...(this._config.devices || [])];
            devices[deviceIndex] = {
              ...devices[deviceIndex],
              tap_action: e.detail.value,
            };
            this._updateConfig({ devices });
          }}
        ></ha-selector>

        <!-- Hold Action -->
        <ha-selector
          .hass=${this.hass}
          .selector=${{ action: {} }}
          .value=${device.hold_action || { action: 'more-info' }}
          .label=${'Hold Action'}
          @value-changed=${(e: CustomEvent) => {
            const devices = [...(this._config.devices || [])];
            devices[deviceIndex] = {
              ...devices[deviceIndex],
              hold_action: e.detail.value,
            };
            this._updateConfig({ devices });
          }}
        ></ha-selector>

        <!-- Double Tap Action -->
        <ha-selector
          .hass=${this.hass}
          .selector=${{ action: {} }}
          .value=${device.double_tap_action || { action: 'none' }}
          .label=${'Double Tap Action'}
          @value-changed=${(e: CustomEvent) => {
            const devices = [...(this._config.devices || [])];
            devices[deviceIndex] = {
              ...devices[deviceIndex],
              double_tap_action: e.detail.value,
            };
            this._updateConfig({ devices });
          }}
        ></ha-selector>
      </div>
    `;
  }

  // ========== DEVICE MODES (DISCRETE DEVICES) ==========
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
          ${modes.map(
            (mode: any, modeIndex: number) => html`
              <div class="mode-item">
                <ha-textfield
                  label="Label"
                  .value=${mode.label || ''}
                  @input=${(e: any) => this._updateMode(deviceIndex, modeIndex, 'label', e.target.value)}
                ></ha-textfield>

                <ha-textfield
                  label="Value"
                  type="number"
                  .value=${mode.value || 0}
                  @input=${(e: any) =>
                    this._updateMode(deviceIndex, modeIndex, 'value', parseFloat(e.target.value))}
                ></ha-textfield>

                <ha-textfield
                  label="Percentage"
                  type="number"
                  min="0"
                  max="100"
                  .value=${mode.percentage || 0}
                  @input=${(e: any) =>
                    this._updateMode(
                      deviceIndex,
                      modeIndex,
                      'percentage',
                      parseFloat(e.target.value),
                    )}
                ></ha-textfield>

                <ha-icon-button
                  @click=${() => this._removeMode(deviceIndex, modeIndex)}
                  .path=${'M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z'}
                  title="Remove mode"
                ></ha-icon-button>
              </div>
            `,
          )}
        </div>
      </div>
    `;
  }

  // ========== COLOR RANGES RENDERING ==========
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
                <div class="range-inputs">
                  ${range.state !== undefined
                    ? html`
                        <ha-textfield
                          label="State"
                          .value=${range.state}
                          @input=${(e: any) =>
                            this._updateColorRange(configKey, index, 'state', e.target.value)}
                        ></ha-textfield>
                      `
                    : html`
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
                      `}
                  <ha-textfield
                    label="Color"
                    .value=${range.color}
                    @input=${(e: any) =>
                      this._updateColorRange(configKey, index, 'color', e.target.value)}
                  ></ha-textfield>
                </div>
                <ha-icon-button
                  @click=${() => this._removeColorRange(configKey, index)}
                  .path=${'M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z'}
                ></ha-icon-button>
                <ha-icon-button
                  @click=${() => this._toggleRangeType(configKey, index)}
                  .path=${'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M11,17H13V11H11V17M12,9A1,1 0 0,1 11,8A1,1 0 0,1 12,7A1,1 0 0,1 13,8A1,1 0 0,1 12,9Z'}
                  title="Toggle between numeric range and state-based"
                ></ha-icon-button>
              </div>
            `,
          )}
        </div>
      </div>
    `;
  }

  // ========== HELPER METHODS ==========
  private _getEntityAttributes(entity: string): string[] {
    if (!entity || !this.hass) return ['state'];

    const domain = entity.split('.')[0];
    const defaultAttrs = ['state'];

    const stateObj = this.hass.states[entity];
    if (stateObj && stateObj.attributes) {
      const customAttrs = Object.keys(stateObj.attributes).filter(
        (attr) =>
          !['friendly_name', 'icon', 'entity_id', 'supported_features', 'device_class'].includes(
            attr,
          ),
      );
      return [...new Set([...defaultAttrs, ...customAttrs])];
    }

    return defaultAttrs;
  }

  private _formatAttributeName(attr: string): string {
    return attr
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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

    // Reorder properties for cleaner YAML output
    const orderedConfig: any = {};

    // Define the desired property order
    const propertyOrder = [
      'type',
      'area',
      'name',
      'icon',
      'display_entity_1',
      'display_entity_1_attribute',
      'display_entity_1_unit',
      'display_entity_2',
      'display_entity_2_attribute',
      'display_entity_2_unit',
      'room_name_color',
      'room_name_size',
      'display_entity_color',
      'display_entity_size',
      'haptic_feedback',
      'icon_tap_action',
      'background',
      'icon_color',
      'icon_background',
      'chip_columns',
      'devices',
    ];

    // Add properties in the defined order
    propertyOrder.forEach((key) => {
      if (this._config[key] !== undefined) {
        orderedConfig[key] = this._config[key];
      }
    });

    // Add any remaining properties that weren't in the order list
    Object.keys(this._config).forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(orderedConfig, key)) {
        orderedConfig[key] = this._config[key];
      }
    });

    const event = new CustomEvent('config-changed', {
      detail: { config: orderedConfig },
      bubbles: true,
      composed: true,
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
      const defaults = this.deviceDefaults[domain] || this.deviceDefaults.sensor;

      // Preserve existing configurations
      devices[index] = {
        ...devices[index],
        entity: value,
        icon: devices[index].icon || defaults.icon,
        chip_on_color: devices[index].chip_on_color || defaults.color,
        attribute: devices[index].attribute || defaults.attribute,
      };
    } else {
      devices[index] = {
        ...devices[index],
        [configValue]: value,
      };
    }

    this._updateConfig({ devices });
  }

  private _addDevice() {
    const devices = [...(this._config.devices || [])];
    devices.push({
      entity: '',
      icon: '',
      attribute: 'brightness',
      scale: 1,
      type: 'continuous',
      show_chip: true,
      show_slider: true,
      chip_column: 1,
      chip_on_color: DEFAULT_CHIP_ON_COLOR,
      chip_off_color: DEFAULT_CHIP_OFF_COLOR,
      chip_unavailable_color: DEFAULT_CHIP_UNAVAILABLE_COLOR,
      icon_on_color: DEFAULT_ICON_ON_COLOR,
      icon_off_color: DEFAULT_ICON_OFF_COLOR,
      icon_unavailable_color: DEFAULT_ICON_UNAVAILABLE_COLOR,
      tap_action: { action: 'toggle' },
      hold_action: { action: 'more-info' },
      double_tap_action: { action: 'none' },
    });
    this._updateConfig({ devices });
    this._expandedDevices = { ...this._expandedDevices, [devices.length - 1]: true };
    this.requestUpdate();
  }

  private _removeDevice(index: number) {
    const devices = [...(this._config.devices || [])];
    devices.splice(index, 1);
    this._updateConfig({ devices });
    const newExpanded = { ...this._expandedDevices };
    delete newExpanded[index];
    this._expandedDevices = newExpanded;
    this.requestUpdate();
  }

  private _addMode(deviceIndex: number) {
    const devices = [...(this._config.devices || [])];
    const modes = [...(devices[deviceIndex].modes || [])];
    modes.push({
      label: `Mode ${modes.length + 1}`,
      value: modes.length,
      percentage: modes.length * 33,
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
      const newRange: any = { color: range.color, min: 0, max: 100 };
      ranges[index] = newRange;
    } else {
      const newRange: any = { color: range.color, state: 'on' };
      ranges[index] = newRange;
    }

    this._updateConfig({
      [configKey]: { ...config, ranges },
    });
  }

  // ========== STYLES ==========
  static get styles() {
    return css`
      .card-config {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .section-content {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px;
      }

      .subsection {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px;
        background: var(--secondary-background-color);
        border-radius: 8px;
        margin-top: 8px;
      }

      .subsection > label {
        font-weight: 500;
        margin-bottom: 4px;
      }

      .devices-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }

      .devices-header label {
        font-weight: 500;
        font-size: 14px;
      }

      .device-content {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 12px;
      }

      .device-header {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 8px;
      }

      .device-toggles {
        display: flex;
        gap: 16px;
        margin-top: 8px;
      }

      .modes-section,
      .color-ranges,
      .chip-actions-section {
        padding: 12px;
        background: var(--secondary-background-color);
        border-radius: 8px;
        margin-top: 12px;
      }

      .modes-header,
      .ranges-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
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

      .chip-actions-section {
        margin-top: 12px;
      }

      .section-label {
        font-weight: 500;
        font-size: 14px;
        margin-bottom: 8px;
        display: block;
      }

      .info-message {
        padding: 8px 12px;
        background: var(--info-color, #2196f3);
        color: white;
        border-radius: 4px;
        font-size: 12px;
        margin-bottom: 8px;
      }

      .helper-text {
        font-size: 12px;
        color: var(--secondary-text-color);
        margin-top: 4px;
      }

      ha-expansion-panel {
        margin-top: 8px;
      }

      ha-icon-button {
        color: var(--primary-color);
      }

      ha-icon-button[slot='trigger'] {
        color: var(--secondary-text-color);
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
