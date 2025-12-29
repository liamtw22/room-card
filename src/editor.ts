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
  DEFAULT_ICON_SIZE,
  DEFAULT_ICON_BACKGROUND_SIZE,
  DEFAULT_SLIDER_SIZE,
  DEFAULT_CHIP_SIZE,
  DEFAULT_CHIP_ICON_SIZE,
  DEFAULT_CHIP_GAP,
  DEFAULT_SLIDER_DEBOUNCE,
  DEFAULT_FONT_COLOR,
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
  @state() private _draggedDeviceIndex: number | null = null;
  @state() private _dragOverDeviceIndex: number | null = null;

  setConfig(config: any): void {
    this._config = {
      background: DEFAULT_CARD_BACKGROUND,
      haptic_feedback: true,
      card_tap_action: { action: 'none' },
      card_hold_action: { action: 'none' },
      title_tap_action: { action: 'none' },
      title_hold_action: { action: 'none' },
      slider_debounce: DEFAULT_SLIDER_DEBOUNCE,
      ...config,
    };
  }

  // Get area icon for auto-population
  private _getAreaIcon(): string {
    if (!this.hass || !this._config?.area) return 'mdi:home';
    
    const areas = (this.hass as any).areas;
    if (areas && this._config.area) {
      const area = areas[this._config.area];
      if (area?.icon) {
        return area.icon;
      }
    }
    return 'mdi:home';
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
    // Get the area icon for display
    const areaIcon = this._getAreaIcon();
    const currentIcon = this._config.icon || areaIcon;

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
            @value-changed=${(e: CustomEvent) => {
              this._updateConfig({ area: e.detail.value });
              // Auto-update icon when area changes if icon is not manually set
              if (!this._config.icon) {
                this.requestUpdate();
              }
            }}
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
            .value=${currentIcon}
            .label=${'Icon'}
            @value-changed=${(e: CustomEvent) =>
              this._valueChanged({
                target: { configValue: 'icon' },
                detail: { value: e.detail.value },
              } as any)}
          ></ha-icon-picker>
          <p class="helper-text">Auto-populated from area icon. Edit to override.</p>

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

          <ha-textfield
            label="Slider Debounce (ms)"
            type="number"
            min="0"
            max="1000"
            .value=${this._config.slider_debounce ?? DEFAULT_SLIDER_DEBOUNCE}
            @input=${(e: any) => {
              const value = parseInt(e.target.value);
              if (!isNaN(value) && value >= 0) {
                this._updateConfig({ slider_debounce: value });
              }
            }}
            helper="Delay before sending slider updates (default: 200ms)"
          ></ha-textfield>
        </div>
      </ha-expansion-panel>
    `;
  }

  private _renderAppearanceSection() {
    // Determine color type for each section
    const backgroundType = this._getColorType(this._config.background);
    const iconColorType = this._getColorType(this._config.icon_color);
    const iconBgColorType = this._getColorType(this._config.icon_background);
    const roomNameColorType = this._getColorType(this._config.room_name_color);
    const displayEntityColorType = this._getColorType(this._config.display_entity_color);

    return html`
      <ha-expansion-panel
        .header=${'Appearance'}
        .expanded=${this._expandedSections.appearance}
        @expanded-changed=${(e: any) => (this._expandedSections.appearance = e.detail.expanded)}
      >
        <div class="section-content">
          <div class="subsection">
            <label>Font Color</label>

            ${this._renderColorConfig('room_name_color', 'Room Name Color', roomNameColorType, DEFAULT_FONT_COLOR)}
            ${this._renderColorConfig('display_entity_color', 'Subtitle Color', displayEntityColorType, DEFAULT_FONT_COLOR)}
          </div>

          <div class="subsection">
            <label>Background Color</label>
            ${this._renderColorConfig('background', 'Background', backgroundType, DEFAULT_CARD_BACKGROUND)}
          </div>

          <div class="subsection">
            <label>Icon Color</label>
            ${this._renderColorConfig('icon_color', 'Icon', iconColorType, DEFAULT_ICON_COLOR)}
          </div>

          <div class="subsection">
            <label>Icon Background Color</label>
            ${this._renderColorConfig('icon_background', 'Icon Background', iconBgColorType, DEFAULT_ICON_BACKGROUND_COLOR)}
          </div>

          <div class="subsection">
            <label>Element Sizing</label>
            <p class="helper-text">All sizes use rem units for accessibility scaling</p>

            <ha-textfield
              label="Room Name Font Size"
              .value=${this._config.room_name_size || DEFAULT_TITLE_SIZE}
              @input=${(e: any) => this._updateConfig({ room_name_size: e.target.value })}
              helper="Font size for room name (e.g., 1rem)"
            ></ha-textfield>

            <ha-textfield
              label="Subtitle Font Size"
              .value=${this._config.display_entity_size || DEFAULT_SUBTITLE_SIZE}
              @input=${(e: any) => this._updateConfig({ display_entity_size: e.target.value })}
              helper="Font size for subtitle (e.g., 0.875rem)"
            ></ha-textfield>

            <ha-textfield
              label="Icon Size"
              .value=${this._config.icon_size || DEFAULT_ICON_SIZE}
              @input=${(e: any) => this._updateConfig({ icon_size: e.target.value })}
              helper="Size of the main icon (e.g., 4.5rem)"
            ></ha-textfield>

            <ha-textfield
              label="Icon Background Size"
              .value=${this._config.icon_background_size || DEFAULT_ICON_BACKGROUND_SIZE}
              @input=${(e: any) => this._updateConfig({ icon_background_size: e.target.value })}
              helper="Size of the icon background circle (e.g., 7rem)"
            ></ha-textfield>

            <ha-textfield
              label="Slider Size"
              .value=${this._config.slider_size || DEFAULT_SLIDER_SIZE}
              @input=${(e: any) => this._updateConfig({ slider_size: e.target.value })}
              helper="Size of the circular slider (e.g., 9.5rem)"
            ></ha-textfield>

            <ha-textfield
              label="Chip Size"
              .value=${this._config.chip_size || DEFAULT_CHIP_SIZE}
              @input=${(e: any) => this._updateConfig({ chip_size: e.target.value })}
              helper="Size of device chips (e.g., 2.75rem)"
            ></ha-textfield>

            <ha-textfield
              label="Chip Icon Size"
              .value=${this._config.chip_icon_size || DEFAULT_CHIP_ICON_SIZE}
              @input=${(e: any) => this._updateConfig({ chip_icon_size: e.target.value })}
              helper="Size of icons inside chips (e.g., 1.75rem)"
            ></ha-textfield>

            <ha-textfield
              label="Chip Gap"
              .value=${this._config.chip_gap || DEFAULT_CHIP_GAP}
              @input=${(e: any) => this._updateConfig({ chip_gap: e.target.value })}
              helper="Gap between chips (e.g., 0.3rem)"
            ></ha-textfield>
          </div>
        </div>
      </ha-expansion-panel>
    `;
  }

  private _getColorType(colorConfig: any): string {
    if (colorConfig && typeof colorConfig === 'object' && 'entity' in colorConfig) {
      return 'entity';
    }
    return 'static';
  }

  private _renderColorConfig(configKey: string, label: string, colorType: string, defaultColor: string) {
    const currentValue = this._config[configKey];
    
    return html`
      <div class="color-config-item">
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
          .value=${colorType}
          .label=${'Color Type'}
          @value-changed=${(e: CustomEvent) => {
            if (e.detail.value === 'static') {
              this._updateConfig({ [configKey]: defaultColor });
            } else {
              this._updateConfig({ [configKey]: { entity: '', ranges: [] } });
            }
          }}
        ></ha-selector>

        ${colorType === 'static'
          ? html`
              <ha-textfield
                label="${label} (CSS color)"
                .value=${typeof currentValue === 'string' ? currentValue : defaultColor}
                @input=${(e: any) => {
                  this._updateConfig({ [configKey]: e.target.value });
                }}
                helper="Use CSS values (hex, rgb, rgba, var(...))"
              ></ha-textfield>
            `
          : html`
              <ha-selector
                .hass=${this.hass}
                .selector=${{ entity: {} }}
                .value=${currentValue?.entity || ''}
                .label=${'Entity'}
                @value-changed=${(e: CustomEvent) => {
                  const config = typeof currentValue === 'object' ? currentValue : {};
                  this._updateConfig({
                    [configKey]: {
                      ...config,
                      entity: e.detail.value,
                    },
                  });
                }}
              ></ha-selector>
              ${currentValue?.entity
                ? this._renderColorRanges(configKey, currentValue?.ranges || [])
                : ''}
            `}
      </div>
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
            <label>Icon Behavior</label>
            <p class="helper-text">Tapping the main icon rotates through active device sliders</p>
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
          <p class="helper-text">Drag devices to reorder them in the card</p>

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

          <div class="devices-list">
            ${devices.map((device: any, index: number) => this._renderDeviceConfig(device, index))}
          </div>
        </div>
      </ha-expansion-panel>
    `;
  }

  private _renderDeviceConfig(device: any, index: number) {
    const domain = device.entity ? device.entity.split('.')[0] : '';
    const isLight = domain === 'light';
    const hasEntity = device.entity && device.entity.length > 0;
    const isExpanded = this._expandedDevices[index] !== false;
    const isDiscrete = device.type === 'discrete';
    const isDragging = this._draggedDeviceIndex === index;
    const isDragOver = this._dragOverDeviceIndex === index;

    // Get color types for chip colors
    const chipColorType = this._getColorType(device.chip_color);
    const chipIconColorType = this._getColorType(device.chip_icon_color);

    return html`
      <div
        class="device-item ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}"
        draggable="true"
        @dragstart=${(e: DragEvent) => this._handleDragStart(e, index)}
        @dragend=${this._handleDragEnd}
        @dragover=${(e: DragEvent) => this._handleDragOver(e, index)}
        @dragleave=${this._handleDragLeave}
        @drop=${(e: DragEvent) => this._handleDrop(e, index)}
      >
        <ha-expansion-panel
          .header=${`Device ${index + 1}${device.entity ? `: ${device.entity}` : ''}`}
          .expanded=${isExpanded}
          @expanded-changed=${(e: any) => (this._expandedDevices[index] = e.detail.expanded)}
        >
          <div slot="icons" class="device-header-icons">
            <ha-icon-button
              class="drag-handle"
              .path=${'M9,3H11V5H9V3M13,3H15V5H13V3M9,7H11V9H9V7M13,7H15V9H13V7M9,11H11V13H9V11M13,11H15V13H13V11M9,15H11V17H9V15M13,15H15V17H13V15M9,19H11V21H9V19M13,19H15V21H13V19Z'}
              title="Drag to reorder"
            ></ha-icon-button>
            <ha-icon-button
              @click=${(e: Event) => {
                e.stopPropagation();
                this._removeDevice(index);
              }}
              .path=${'M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z'}
            ></ha-icon-button>
          </div>

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

                  ${isDiscrete ? this._renderModesConfig(device, index) : ''}

                  <ha-textfield
                    label="Attribute"
                    .value=${device.attribute || ''}
                    @input=${(e: any) =>
                      this._deviceValueChanged(index, {
                        target: { configValue: 'attribute', value: e.target.value },
                      } as any)}
                    helper="${isDiscrete ? 'Attribute to read mode from (e.g., preset_mode)' : 'Entity attribute to control (e.g., brightness, volume_level)'}"
                  ></ha-textfield>

                  ${!isDiscrete ? html`
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
                  ` : ''}

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

                  <div class="subsection">
                    <label>Chip Color</label>
                    ${this._renderDeviceColorConfig(index, 'chip_color', 'Chip Color', chipColorType, DEFAULT_CHIP_ON_COLOR)}
                  </div>

                  <div class="subsection">
                    <label>Chip Icon Color</label>
                    ${this._renderDeviceColorConfig(index, 'chip_icon_color', 'Icon Color', chipIconColorType, DEFAULT_ICON_ON_COLOR)}
                  </div>
                `
              : ''}
          </div>
        </ha-expansion-panel>
      </div>
    `;
  }

  private _renderDeviceColorConfig(deviceIndex: number, configKey: string, label: string, colorType: string, defaultColor: string) {
    const device = this._config.devices?.[deviceIndex] || {};
    const currentValue = device[configKey];
    
    return html`
      <div class="color-config-item">
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
          .value=${colorType}
          .label=${'Color Type'}
          @value-changed=${(e: CustomEvent) => {
            if (e.detail.value === 'static') {
              this._deviceValueChanged(deviceIndex, {
                target: { configValue: configKey, value: defaultColor },
              } as any);
            } else {
              this._deviceValueChanged(deviceIndex, {
                target: { configValue: configKey, value: { entity: '', ranges: [] } },
              } as any);
            }
          }}
        ></ha-selector>

        ${colorType === 'static'
          ? html`
              <ha-textfield
                label="${label} (CSS color)"
                .value=${typeof currentValue === 'string' ? currentValue : defaultColor}
                @input=${(e: any) => {
                  this._deviceValueChanged(deviceIndex, {
                    target: { configValue: configKey, value: e.target.value },
                  } as any);
                }}
                helper="Use CSS values (hex, rgb, rgba, var(...))"
              ></ha-textfield>
            `
          : html`
              <ha-selector
                .hass=${this.hass}
                .selector=${{ entity: {} }}
                .value=${currentValue?.entity || ''}
                .label=${'Entity'}
                @value-changed=${(e: CustomEvent) => {
                  const config = typeof currentValue === 'object' ? currentValue : {};
                  this._deviceValueChanged(deviceIndex, {
                    target: {
                      configValue: configKey,
                      value: {
                        ...config,
                        entity: e.detail.value,
                      },
                    },
                  } as any);
                }}
              ></ha-selector>
              ${currentValue?.entity
                ? this._renderDeviceColorRanges(deviceIndex, configKey, currentValue?.ranges || [])
                : ''}
            `}
      </div>
    `;
  }

  private _renderDeviceColorRanges(deviceIndex: number, configKey: string, ranges: any[]) {
    return html`
      <div class="color-ranges">
        <div class="ranges-header">
          <label>Color Ranges</label>
          <ha-icon-button
            @click=${() => this._addDeviceColorRange(deviceIndex, configKey)}
            .path=${'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z'}
          ></ha-icon-button>
        </div>
        <div class="ranges-list">
          ${ranges.map(
            (range: any, rangeIndex: number) => html`
              <div class="range-item">
                ${range.state !== undefined
                  ? html`
                      <ha-textfield
                        label="State"
                        .value=${range.state || ''}
                        @input=${(e: any) =>
                          this._updateDeviceColorRange(deviceIndex, configKey, rangeIndex, 'state', e.target.value)}
                      ></ha-textfield>
                    `
                  : html`
                      <div class="range-inputs">
                        <ha-textfield
                          label="Min"
                          type="number"
                          .value=${range.min ?? 0}
                          @input=${(e: any) =>
                            this._updateDeviceColorRange(
                              deviceIndex,
                              configKey,
                              rangeIndex,
                              'min',
                              parseFloat(e.target.value),
                            )}
                        ></ha-textfield>
                        <ha-textfield
                          label="Max"
                          type="number"
                          .value=${range.max ?? 100}
                          @input=${(e: any) =>
                            this._updateDeviceColorRange(
                              deviceIndex,
                              configKey,
                              rangeIndex,
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
                    this._updateDeviceColorRange(deviceIndex, configKey, rangeIndex, 'color', e.target.value)}
                ></ha-textfield>
                <ha-icon-button
                  @click=${() => this._toggleDeviceRangeType(deviceIndex, configKey, rangeIndex)}
                  .path=${range.state !== undefined
                    ? 'M3,17V19H9V17H3M3,5V7H13V5H3M13,21V19H21V17H13V15H11V21H13M7,9V11H3V13H7V15H9V9H7M21,13V11H11V13H21M15,9H17V7H21V5H17V3H15V9Z'
                    : 'M9,9V15H7V9H9M5,5V19H3V5H5M21,5V19H11V5H21M19,7H13V17H19V7Z'}
                  title=${range.state !== undefined
                    ? 'Switch to numeric range'
                    : 'Switch to state match'}
                ></ha-icon-button>
                <ha-icon-button
                  @click=${() => this._removeDeviceColorRange(deviceIndex, configKey, rangeIndex)}
                  .path=${'M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z'}
                ></ha-icon-button>
              </div>
            `,
          )}
        </div>
      </div>
    `;
  }

  private _addDeviceColorRange(deviceIndex: number, configKey: string) {
    const devices = [...(this._config.devices || [])];
    const device = devices[deviceIndex];
    const colorConfig = device[configKey] || { entity: '', ranges: [] };
    const ranges = [...(colorConfig.ranges || [])];
    ranges.push({ min: 0, max: 100, color: '#FFFFFF' });

    devices[deviceIndex] = {
      ...device,
      [configKey]: { ...colorConfig, ranges },
    };
    this._updateConfig({ devices });
  }

  private _updateDeviceColorRange(deviceIndex: number, configKey: string, rangeIndex: number, field: string, value: any) {
    const devices = [...(this._config.devices || [])];
    const device = devices[deviceIndex];
    const colorConfig = device[configKey] || { entity: '', ranges: [] };
    const ranges = [...(colorConfig.ranges || [])];
    ranges[rangeIndex] = { ...ranges[rangeIndex], [field]: value };

    devices[deviceIndex] = {
      ...device,
      [configKey]: { ...colorConfig, ranges },
    };
    this._updateConfig({ devices });
  }

  private _removeDeviceColorRange(deviceIndex: number, configKey: string, rangeIndex: number) {
    const devices = [...(this._config.devices || [])];
    const device = devices[deviceIndex];
    const colorConfig = device[configKey] || { entity: '', ranges: [] };
    const ranges = [...(colorConfig.ranges || [])];
    ranges.splice(rangeIndex, 1);

    devices[deviceIndex] = {
      ...device,
      [configKey]: { ...colorConfig, ranges },
    };
    this._updateConfig({ devices });
  }

  private _toggleDeviceRangeType(deviceIndex: number, configKey: string, rangeIndex: number) {
    const devices = [...(this._config.devices || [])];
    const device = devices[deviceIndex];
    const colorConfig = device[configKey] || { entity: '', ranges: [] };
    const ranges = [...(colorConfig.ranges || [])];
    const range = { ...ranges[rangeIndex] };

    if (range.state !== undefined) {
      const newRange: any = { min: 0, max: 100, color: range.color };
      ranges[rangeIndex] = newRange;
    } else {
      const newRange: any = { state: '', color: range.color };
      ranges[rangeIndex] = newRange;
    }

    devices[deviceIndex] = {
      ...device,
      [configKey]: { ...colorConfig, ranges },
    };
    this._updateConfig({ devices });
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
        <p class="helper-text">Modes are evenly distributed on the slider. Position is based on order.</p>
        <div class="modes-list">
          ${modes.map(
            (mode: any, modeIndex: number) => html`
              <div class="mode-item">
                <ha-textfield
                  label="Mode ${modeIndex + 1} Label"
                  .value=${mode.label || ''}
                  @input=${(e: any) =>
                    this._updateMode(deviceIndex, modeIndex, 'label', e.target.value)}
                ></ha-textfield>
                <div class="mode-action">
                  <ha-selector
                    .hass=${this.hass}
                    .selector=${{ ui_action: {} }}
                    .value=${mode.action || { action: 'none' }}
                    .label=${'Action when selected'}
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

  // Drag and drop handlers
  private _handleDragStart(e: DragEvent, index: number) {
    this._draggedDeviceIndex = index;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    }
  }

  private _handleDragEnd() {
    this._draggedDeviceIndex = null;
    this._dragOverDeviceIndex = null;
  }

  private _handleDragOver(e: DragEvent, index: number) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    if (this._draggedDeviceIndex !== index) {
      this._dragOverDeviceIndex = index;
    }
  }

  private _handleDragLeave() {
    this._dragOverDeviceIndex = null;
  }

  private _handleDrop(e: DragEvent, targetIndex: number) {
    e.preventDefault();
    
    if (this._draggedDeviceIndex === null || this._draggedDeviceIndex === targetIndex) {
      this._draggedDeviceIndex = null;
      this._dragOverDeviceIndex = null;
      return;
    }

    const devices = [...(this._config.devices || [])];
    const [draggedDevice] = devices.splice(this._draggedDeviceIndex, 1);
    devices.splice(targetIndex, 0, draggedDevice);

    this._updateConfig({ devices });
    this._draggedDeviceIndex = null;
    this._dragOverDeviceIndex = null;
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
        defaultScale = 255;
      } else if (domain === 'media_player') {
        defaultAttribute = 'volume_level';
        defaultScale = 1;
      } else if (domain === 'fan') {
        defaultAttribute = 'percentage';
        defaultScale = 100;
      } else if (domain === 'climate') {
        defaultAttribute = 'temperature';
        defaultScale = 100;
      } else if (domain === 'cover') {
        defaultAttribute = 'position';
        defaultScale = 100;
      } else if (domain === 'vacuum') {
        defaultAttribute = 'battery_level';
        defaultScale = 100;
      }

      devices[index] = {
        ...devices[index],
        entity: value,
        icon: defaultIcon || devices[index].icon || 'mdi:lightbulb',
        attribute: defaultAttribute,
        scale: defaultScale,
        chip_color: defaultColor,
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

      .devices-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .device-item {
        transition: transform 0.2s ease, opacity 0.2s ease;
      }

      .device-item.dragging {
        opacity: 0.5;
      }

      .device-item.drag-over {
        border-top: 2px solid var(--primary-color);
      }

      .device-header-icons {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .drag-handle {
        cursor: grab;
      }

      .drag-handle:active {
        cursor: grabbing;
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

      .color-config-item {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 12px;
        background: var(--secondary-background-color);
        border-radius: 8px;
        margin-top: 8px;
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
