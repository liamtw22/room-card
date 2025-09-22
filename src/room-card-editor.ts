import { LitElement, html, css, TemplateResult, CSSResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardEditor, fireEvent } from 'custom-card-helpers';

export interface RoomCardConfig {
  type: 'custom:room-card';
  area: string;
  name?: string;
  icon?: string;
  icon_color?: string | { entity: string; attribute?: string };
  icon_background_color?: string | { entity: string; attribute?: string };
  background_type?: 'temperature' | 'solid' | 'entity';
  background_color?: string;
  background_entity?: string;
  background_state_colors?: Record<string, string>;
  temperature_sensor?: string;
  humidity_sensor?: string;
  devices?: DeviceConfig[];
  background_colors?: TemperatureColors;
  haptic_feedback?: boolean;
  show_temperature?: boolean;
  show_humidity?: boolean;
  temperature_unit?: 'C' | 'F';
}

export interface DeviceConfig {
  entity: string;
  control_entity?: string;
  attribute?: string;
  icon?: string;
  color?: string | 'light-color';
  scale?: number;
  type?: 'continuous' | 'discrete';
  modes?: DeviceMode[];
  show_slider?: boolean;
  show_chip?: boolean;
}

export interface DeviceMode {
  value: number;
  label: string;
  percentage: number;
  icon?: string;
}

export interface TemperatureColors {
  cold: string;
  cool: string;
  comfortable: string;
  warm: string;
  hot: string;
}

// Common MDI icons for rooms
const COMMON_MDI_ICONS = [
  'mdi:home', 'mdi:sofa', 'mdi:bed', 'mdi:silverware-fork-knife', 
  'mdi:toilet', 'mdi:shower', 'mdi:desk', 'mdi:garage',
  'mdi:lightbulb', 'mdi:lightbulb-outline', 'mdi:speaker', 'mdi:air-purifier', 
  'mdi:fan', 'mdi:ceiling-fan', 'mdi:thermometer', 'mdi:water-percent', 
  'mdi:television', 'mdi:alpha-l-box', 'mdi:door', 'mdi:window-open', 
  'mdi:flower', 'mdi:power', 'mdi:power-off', 'mdi:toggle-switch',
  'mdi:kitchen', 'mdi:bedroom', 'mdi:bathroom', 'mdi:living-room',
  'mdi:stairs', 'mdi:balcony', 'mdi:pool', 'mdi:tree',
  'mdi:car', 'mdi:washing-machine', 'mdi:dishwasher', 'mdi:microwave',
  'mdi:coffee-maker', 'mdi:kettle', 'mdi:fridge', 'mdi:stove',
  'mdi:lamp', 'mdi:floor-lamp', 'mdi:wall-sconce', 'mdi:chandelier',
  'mdi:blinds', 'mdi:curtains', 'mdi:roller-shade', 'mdi:window-shutter',
  'mdi:music', 'mdi:music-note', 'mdi:volume-high', 'mdi:volume-medium',
  'mdi:play', 'mdi:pause', 'mdi:stop', 'mdi:skip-next',
  'mdi:air-conditioner', 'mdi:radiator', 'mdi:fireplace', 'mdi:weather-sunny',
  'mdi:robot-vacuum', 'mdi:vacuum', 'mdi:broom', 'mdi:spray-bottle'
];

// Common entity attributes
const ENTITY_ATTRIBUTES = {
  light: ['brightness', 'rgb_color', 'color_temp', 'effect'],
  media_player: ['volume_level', 'media_position', 'media_duration'],
  fan: ['percentage', 'preset_mode', 'speed'],
  climate: ['temperature', 'target_temp_high', 'target_temp_low', 'humidity'],
  cover: ['position', 'tilt_position'],
  vacuum: ['battery_level', 'fan_speed']
};

@customElement('room-card-editor')
export class RoomCardEditor extends LitElement implements LovelaceCardEditor {
  @state() private _hass?: HomeAssistant;
  @state() private _config?: RoomCardConfig;
  @state() private _iconSearch = '';
  @state() private _deviceIconSearch: Record<number, string> = {};
  @state() private _iconFocused = false;
  @state() private _deviceIconFocused: Record<number, boolean> = {};
  @state() private _expandedSections: Record<string, boolean> = {
    basic: true,
    appearance: false,
    sensors: false,
    devices: false
  };
  @state() private _expandedDevices: Record<number, boolean> = {};

  // Debug method - can be called from browser console
  debugInfo() {
    const info = {
      hasHass: !!this._hass,
      hasConfig: !!this._config,
      hassStatesCount: this._hass?.states ? Object.keys(this._hass.states).length : 0,
      hassAreasCount: this._hass?.areas ? Object.keys(this._hass.areas).length : 0,
      sampleEntities: this._hass?.states ? Object.keys(this._hass.states).slice(0, 10) : [],
      sampleAreas: this._hass?.areas ? Object.values(this._hass.areas).slice(0, 5).map((a: any) => a.name) : [],
      config: this._config,
      elementInfo: {
        shadowRoot: !!this.shadowRoot,
        entityPickersCount: this.shadowRoot?.querySelectorAll('ha-entity-picker').length || 0
      }
    };
    console.log('🟦 Debug Info:', info);
    return info;
  }

  // Lifecycle methods for debugging
  connectedCallback() {
    super.connectedCallback();
    console.log('🟣 RoomCardEditor: connectedCallback', {
      hasHass: !!this._hass,
      hasConfig: !!this._config,
      timestamp: new Date().toISOString()
    });
    
    // Make debug method accessible from console
    (window as any).roomCardEditorDebug = () => this.debugInfo();
    console.log('💡 TIP: You can run "roomCardEditorDebug()" in the console to inspect the editor state');
  }

  firstUpdated() {
    console.log('🟣 RoomCardEditor: firstUpdated', {
      hasHass: !!this._hass,
      hasConfig: !!this._config,
      timestamp: new Date().toISOString()
    });
  }

  updated(changedProperties: Map<string, any>) {
    console.log('🟣 RoomCardEditor: updated', {
      hasHass: !!this._hass,
      hasConfig: !!this._config,
      changedProps: Array.from(changedProperties.keys()),
      timestamp: new Date().toISOString()
    });
  }

  // Lifecycle methods for debugging
  connectedCallback() {
    super.connectedCallback();
    console.log('🟣 RoomCardEditor: connectedCallback', {
      hasHass: !!this._hass,
      hasConfig: !!this._config,
      timestamp: new Date().toISOString()
    });
  }

  firstUpdated() {
    console.log('🟣 RoomCardEditor: firstUpdated', {
      hasHass: !!this._hass,
      hasConfig: !!this._config,
      timestamp: new Date().toISOString()
    });
  }

  updated(changedProperties: Map<string, any>) {
    console.log('🟣 RoomCardEditor: updated', {
      hasHass: !!this._hass,
      hasConfig: !!this._config,
      changedProps: Array.from(changedProperties.keys()),
      timestamp: new Date().toISOString()
    });
  }

  // Setter for hass object - required for Home Assistant to pass the hass object
  set hass(hass: HomeAssistant) {
    console.log('🔵 RoomCardEditor: hass setter called', {
      hasHass: !!hass,
      hasStates: !!(hass?.states),
      statesCount: hass?.states ? Object.keys(hass.states).length : 0,
      hasAreas: !!(hass?.areas),
      areasCount: hass?.areas ? Object.keys(hass.areas).length : 0,
      timestamp: new Date().toISOString()
    });
    
    this._hass = hass;
    
    // Log a sample of entities to verify they exist
    if (hass?.states) {
      const entityIds = Object.keys(hass.states).slice(0, 5);
      console.log('🔵 Sample entities:', entityIds);
    }
    
    // Trigger a re-render when hass is set
    this.requestUpdate();
  }

  public setConfig(config: RoomCardConfig): void {
    console.log('🟢 RoomCardEditor: setConfig called', {
      config,
      hasHass: !!this._hass,
      timestamp: new Date().toISOString()
    });
    
    this._config = { ...config };
    // Initialize background_type if not set
    if (!this._config.background_type) {
      this._config.background_type = this._config.temperature_sensor ? 'temperature' : 'solid';
    }
    // Initialize expanded state for existing devices
    if (this._config.devices) {
      this._config.devices.forEach((_, index) => {
        this._expandedDevices[index] = this._expandedDevices[index] ?? false;
      });
    }
  }

  private _toggleSection(section: string): void {
    this._expandedSections = {
      ...this._expandedSections,
      [section]: !this._expandedSections[section]
    };
  }

  private _toggleDevice(index: number): void {
    this._expandedDevices = {
      ...this._expandedDevices,
      [index]: !this._expandedDevices[index]
    };
  }

  private _valueChanged(ev: any): void {
    if (!this._config || !this._hass) return;

    const target = ev.target;
    const configPath = target?.configPath || ev.currentTarget?.configPath;
    
    let value;
    
    // Handle different types of events
    if (ev.detail?.value !== undefined) {
      value = ev.detail.value;
    } else if (target?.checked !== undefined) {
      value = target.checked;
    } else if (target?.value !== undefined) {
      value = target.value;
    }
    
    if (configPath && value !== undefined) {
      const newConfig = { ...this._config };
      this._setPath(newConfig, configPath, value);
      this._config = newConfig;
      fireEvent(this, 'config-changed', { config: this._config });
    }
  }

  private _setPath(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  private _addDevice(): void {
    if (!this._config) return;
    
    const devices = [...(this._config.devices || [])];
    const newIndex = devices.length;
    devices.push({
      entity: '',
      control_entity: '',
      attribute: 'brightness',
      icon: 'mdi:lightbulb',
      color: '#FDD835',
      scale: 255,
      type: 'continuous',
      show_slider: true,
      show_chip: true
    });
    
    this._config = { ...this._config, devices };
    this._expandedDevices[newIndex] = true; // Expand newly added device
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _removeDevice(index: number): void {
    if (!this._config?.devices) return;
    
    const devices = [...this._config.devices];
    devices.splice(index, 1);
    
    // Update expanded states
    const newExpanded: Record<number, boolean> = {};
    Object.keys(this._expandedDevices).forEach(key => {
      const keyIndex = parseInt(key);
      if (keyIndex < index) {
        newExpanded[keyIndex] = this._expandedDevices[keyIndex];
      } else if (keyIndex > index) {
        newExpanded[keyIndex - 1] = this._expandedDevices[keyIndex];
      }
    });
    this._expandedDevices = newExpanded;
    
    this._config = { ...this._config, devices };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _getAreas(): string[] {
    if (!this._hass) return [];
    
    const areas = new Set<string>();
    
    Object.values(this._hass.areas || {}).forEach((area: any) => {
      if (area.name) {
        areas.add(area.name);
      }
    });

    Object.values(this._hass.entities || {}).forEach((entity: any) => {
      if (entity.area_id && this._hass!.areas?.[entity.area_id]) {
        areas.add(this._hass!.areas[entity.area_id].name);
      }
    });

    return Array.from(areas).sort();
  }

  private _getEntityAttributes(entity: string): string[] {
    if (!this._hass || !entity) return [];
    
    const domain = entity.split('.')[0];
    const defaultAttrs = ENTITY_ATTRIBUTES[domain as keyof typeof ENTITY_ATTRIBUTES] || [];
    
    const stateObj = this._hass.states[entity];
    if (stateObj?.attributes) {
      const customAttrs = Object.keys(stateObj.attributes).filter(
        attr => !['friendly_name', 'icon', 'entity_id'].includes(attr)
      );
      return [...new Set([...defaultAttrs, ...customAttrs])];
    }
    
    return defaultAttrs;
  }

  private _getFilteredIcons(search: string): string[] {
    if (!search) return COMMON_MDI_ICONS;
    const searchLower = search.toLowerCase();
    return COMMON_MDI_ICONS.filter(icon => 
      icon.toLowerCase().includes(searchLower)
    );
  }

  private _renderBasicSection(): TemplateResult {
    const areas = this._getAreas();
    
    return html`
      <ha-expansion-panel
        .header=${'Basic Configuration'}
        .expanded=${this._expandedSections.basic}
        @expanded-changed=${(e: any) => this._expandedSections.basic = e.detail.expanded}
      >
        <div class="section-content">
          <ha-combo-box
            label="Area (Required)"
            .value=${this._config!.area || ''}
            .configPath=${'area'}
            .items=${areas.map(area => ({ value: area, label: area }))}
            item-value-path="value"
            item-label-path="label"
            @value-changed=${this._valueChanged}
            allow-custom-value
          ></ha-combo-box>

          <ha-textfield
            label="Display Name (Optional)"
            .value=${this._config!.name || ''}
            .configPath=${'name'}
            @input=${this._valueChanged}
            helper="Leave empty to use the area name"
          ></ha-textfield>

          <ha-formfield label="Haptic Feedback">
            <ha-switch
              .checked=${this._config!.haptic_feedback !== false}
              .configPath=${'haptic_feedback'}
              @change=${this._valueChanged}
            ></ha-switch>
          </ha-formfield>
        </div>
      </ha-expansion-panel>
    `;
  }

  private _renderAppearanceSection(): TemplateResult {
    const filteredIcons = this._getFilteredIcons(this._iconSearch);
    
    return html`
      <ha-expansion-panel
        .header=${'Appearance'}
        .expanded=${this._expandedSections.appearance}
        @expanded-changed=${(e: any) => this._expandedSections.appearance = e.detail.expanded}
      >
        <div class="section-content">
          <div class="icon-picker">
            <ha-textfield
              label="Icon"
              .value=${this._config!.icon || ''}
              .configPath=${'icon'}
              @input=${(e: any) => {
                this._iconSearch = e.target.value;
                this._valueChanged(e);
              }}
              @focus=${() => {
                this._iconFocused = true;
                this._iconSearch = this._config!.icon || '';
              }}
              @blur=${() => {
                setTimeout(() => {
                  this._iconFocused = false;
                  this._iconSearch = '';
                }, 200);
              }}
              helper="MDI icon name (e.g., mdi:home)"
            ></ha-textfield>
            
            ${this._iconFocused && filteredIcons.length > 0 ? html`
              <div class="icon-suggestions">
                ${filteredIcons.slice(0, 8).map(icon => html`
                  <div class="icon-suggestion" @click=${() => {
                    this._config = { ...this._config!, icon };
                    this._iconSearch = '';
                    this._iconFocused = false;
                    fireEvent(this, 'config-changed', { config: this._config });
                  }}>
                    <ha-icon icon="${icon}"></ha-icon>
                    <span>${icon}</span>
                  </div>
                `)}
              </div>
            ` : ''}
          </div>

          <ha-select
            naturalMenuWidth
            fixedMenuPosition
            label="Icon Color Type"
            .value=${typeof this._config!.icon_color === 'object' ? 'entity' : 'solid'}
            @selected=${(e: any) => {
              if (e.target.value === 'solid') {
                this._config = { ...this._config!, icon_color: '#FFFFFF' };
              } else {
                this._config = { ...this._config!, icon_color: { entity: '' } };
              }
              fireEvent(this, 'config-changed', { config: this._config });
            }}
            @closed=${(e: Event) => e.stopPropagation()}
          >
            <ha-list-item value="solid">Solid Color</ha-list-item>
            <ha-list-item value="entity">Entity-based</ha-list-item>
          </ha-select>

          ${typeof this._config!.icon_color === 'string' ? html`
            <ha-textfield
              label="Icon Color"
              .value=${this._config!.icon_color || '#FFFFFF'}
              .configPath=${'icon_color'}
              @input=${this._valueChanged}
              helper="Hex color code"
            ></ha-textfield>
          ` : html`
            <ha-entity-picker
              .hass=${this._hass}
              .value=${(this._config!.icon_color as any)?.entity || ''}
              .configPath=${'icon_color.entity'}
              @value-changed=${this._valueChanged}
              allow-custom-entity
              label="Icon Color Entity"
            ></ha-entity-picker>
          `}

          <ha-select
            naturalMenuWidth
            fixedMenuPosition
            label="Icon Background Type"
            .value=${typeof this._config!.icon_background_color === 'object' ? 'entity' : 'solid'}
            @selected=${(e: any) => {
              if (e.target.value === 'solid') {
                this._config = { ...this._config!, icon_background_color: 'rgba(255, 255, 255, 0.2)' };
              } else {
                this._config = { ...this._config!, icon_background_color: { entity: '' } };
              }
              fireEvent(this, 'config-changed', { config: this._config });
            }}
            @closed=${(e: Event) => e.stopPropagation()}
          >
            <ha-list-item value="solid">Solid Color</ha-list-item>
            <ha-list-item value="entity">Entity-based</ha-list-item>
          </ha-select>

          ${typeof this._config!.icon_background_color === 'string' ? html`
            <ha-textfield
              label="Icon Background Color"
              .value=${this._config!.icon_background_color || 'rgba(255, 255, 255, 0.2)'}
              .configPath=${'icon_background_color'}
              @input=${this._valueChanged}
              helper="Hex or rgba color"
            ></ha-textfield>
          ` : html`
            <ha-entity-picker
              .hass=${this._hass}
              .value=${(this._config!.icon_background_color as any)?.entity || ''}
              .configPath=${'icon_background_color.entity'}
              @value-changed=${this._valueChanged}
              allow-custom-entity
              label="Icon Background Entity"
            ></ha-entity-picker>
          `}

          <ha-select
            naturalMenuWidth
            fixedMenuPosition
            label="Background Type"
            .configPath=${'background_type'}
            .value=${this._config!.background_type || 'temperature'}
            @selected=${this._valueChanged}
            @closed=${(e: Event) => e.stopPropagation()}
          >
            <ha-list-item value="temperature">Temperature-based</ha-list-item>
            <ha-list-item value="solid">Solid Color</ha-list-item>
            <ha-list-item value="entity">Entity State</ha-list-item>
          </ha-select>

          ${this._config!.background_type === 'solid' ? html`
            <ha-textfield
              label="Background Color"
              .value=${this._config!.background_color || '#353535'}
              .configPath=${'background_color'}
              @input=${this._valueChanged}
              helper="Hex color code (e.g., #353535)"
            ></ha-textfield>
          ` : ''}

          ${this._config!.background_type === 'entity' ? html`
            <ha-entity-picker
              .hass=${this._hass}
              .value=${this._config!.background_entity || ''}
              .configPath=${'background_entity'}
              @value-changed=${this._valueChanged}
              allow-custom-entity
              label="Background Entity"
            ></ha-entity-picker>
            
            <div class="state-colors">
              <label>State Colors (JSON format)</label>
              <ha-textfield
                label="State to Color Mapping"
                .value=${JSON.stringify(this._config!.background_state_colors || { "on": "#FDD835", "off": "#353535" })}
                @input=${(e: any) => {
                  try {
                    const colors = JSON.parse(e.target.value);
                    this._valueChanged({ target: { configPath: 'background_state_colors', value: colors }});
                  } catch (err) {
                    // Invalid JSON, ignore
                  }
                }}
                helper='{"on": "#FDD835", "off": "#353535", "home": "#4CAF50"}'
              ></ha-textfield>
            </div>
          ` : ''}
        </div>
      </ha-expansion-panel>
    `;
  }

  private _renderSensorsSection(): TemplateResult {
    console.log('🟡 Rendering sensors section', {
      hasHass: !!this._hass,
      hasStates: !!this._hass?.states,
      statesCount: this._hass?.states ? Object.keys(this._hass.states).length : 0
    });

    if (!this._hass) {
      console.warn('⚠️ No hass object in _renderSensorsSection');
      return html`<div class="section-content">Loading sensors...</div>`;
    }

    const entities = Object.keys(this._hass.states).sort();
    console.log('🟡 Found entities for sensors:', entities.length);
    
    const temperatureSensors = entities.filter(e => 
      e.includes('temperature') || 
      e.includes('temp') || 
      this._hass!.states[e].attributes.device_class === 'temperature'
    );
    const humiditySensors = entities.filter(e => 
      e.includes('humidity') || 
      this._hass!.states[e].attributes.device_class === 'humidity'
    );

    console.log('🟡 Temperature sensors found:', temperatureSensors.length, temperatureSensors.slice(0, 3));
    console.log('🟡 Humidity sensors found:', humiditySensors.length, humiditySensors.slice(0, 3));

    return html`
      <ha-expansion-panel
        .header=${'Sensors'}
        .expanded=${this._expandedSections.sensors}
        @expanded-changed=${(e: any) => this._expandedSections.sensors = e.detail.expanded}
      >
        <div class="section-content">
          <ha-entity-picker
            .hass=${this._hass}
            .value=${this._config!.temperature_sensor || ''}
            .configPath=${'temperature_sensor'}
            @value-changed=${this._valueChanged}
            .includeDomains=${['sensor']}
            .includeDeviceClasses=${['temperature']}
            allow-custom-entity
            label="Temperature Sensor"
          ></ha-entity-picker>

          <ha-entity-picker
            .hass=${this._hass}
            .value=${this._config!.humidity_sensor || ''}
            .configPath=${'humidity_sensor'}
            @value-changed=${this._valueChanged}
            .includeDomains=${['sensor']}
            .includeDeviceClasses=${['humidity']}
            allow-custom-entity
            label="Humidity Sensor"
          ></ha-entity-picker>

          <ha-formfield label="Show Temperature">
            <ha-switch
              .checked=${this._config!.show_temperature !== false}
              .configPath=${'show_temperature'}
              @change=${this._valueChanged}
            ></ha-switch>
          </ha-formfield>

          <ha-formfield label="Show Humidity">
            <ha-switch
              .checked=${this._config!.show_humidity !== false}
              .configPath=${'show_humidity'}
              @change=${this._valueChanged}
            ></ha-switch>
          </ha-formfield>

          <ha-select
            naturalMenuWidth
            fixedMenuPosition
            label="Temperature Unit"
            .configPath=${'temperature_unit'}
            .value=${this._config!.temperature_unit || 'F'}
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

  private _renderDevicesSection(): TemplateResult {
    if (!this._hass) {
      return html`<div class="section-content">Loading devices...</div>`;
    }

    return html`
      <ha-expansion-panel
        .header=${'Devices'}
        .expanded=${this._expandedSections.devices}
        @expanded-changed=${(e: any) => this._expandedSections.devices = e.detail.expanded}
      >
        <div class="section-content">
          <div class="devices-header">
            <h3>Device Configuration</h3>
            <ha-icon-button
              .path=${'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z'}
              @click=${this._addDevice}
            ></ha-icon-button>
          </div>

          ${this._config!.devices?.map((device, index) => {
            const entityAttrs = this._getEntityAttributes(device.entity);
            
            return html`
              <ha-expansion-panel
                .header=${`Device ${index + 1}: ${device.entity || 'Not configured'}`}
                .expanded=${this._expandedDevices[index] || false}
                @expanded-changed=${(e: any) => this._expandedDevices[index] = e.detail.expanded}
                .secondary=${html`
                  <ha-icon-button
                    .path=${'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z'}
                    @click=${(e: Event) => {
                      e.stopPropagation();
                      this._removeDevice(index);
                    }}
                  ></ha-icon-button>
                `}
              >
                <div class="device-content">
                  <ha-entity-picker
                    .hass=${this._hass}
                    .value=${device.entity || ''}
                    @value-changed=${(e: any) => {
                      const devices = [...this._config!.devices!];
                      devices[index] = { ...devices[index], entity: e.detail.value };
                      this._config = { ...this._config!, devices };
                      fireEvent(this, 'config-changed', { config: this._config });
                    }}
                    allow-custom-entity
                    label="Display Entity"
                  ></ha-entity-picker>

                  <ha-entity-picker
                    .hass=${this._hass}
                    .value=${device.control_entity || ''}
                    @value-changed=${(e: any) => {
                      const devices = [...this._config!.devices!];
                      devices[index] = { ...devices[index], control_entity: e.detail.value };
                      this._config = { ...this._config!, devices };
                      fireEvent(this, 'config-changed', { config: this._config });
                    }}
                    allow-custom-entity
                    label="Control Entity (Optional)"
                    helper="Leave empty to use display entity"
                  ></ha-entity-picker>

                  <ha-select
                    naturalMenuWidth
                    fixedMenuPosition
                    label="Attribute"
                    .value=${device.attribute || 'brightness'}
                    @selected=${(e: any) => {
                      const devices = [...this._config!.devices!];
                      devices[index] = { ...devices[index], attribute: e.detail.value };
                      this._config = { ...this._config!, devices };
                      fireEvent(this, 'config-changed', { config: this._config });
                    }}
                    @closed=${(e: Event) => e.stopPropagation()}
                  >
                    ${entityAttrs.length > 0 ? entityAttrs.map(attr => html`
                      <ha-list-item value=${attr}>${attr}</ha-list-item>
                    `) : html`
                      <ha-list-item value="brightness">brightness</ha-list-item>
                      <ha-list-item value="volume_level">volume_level</ha-list-item>
                      <ha-list-item value="percentage">percentage</ha-list-item>
                    `}
                  </ha-select>

                  <div class="icon-picker">
                    <ha-textfield
                      label="Icon"
                      .value=${device.icon || ''}
                      @input=${(e: any) => {
                        const devices = [...this._config!.devices!];
                        devices[index] = { ...devices[index], icon: e.target.value };
                        this._config = { ...this._config!, devices };
                        this._deviceIconSearch = { ...this._deviceIconSearch, [index]: e.target.value };
                        fireEvent(this, 'config-changed', { config: this._config });
                      }}
                      @focus=${() => {
                        this._deviceIconFocused = { ...this._deviceIconFocused, [index]: true };
                        if (!this._deviceIconSearch[index]) {
                          this._deviceIconSearch = { ...this._deviceIconSearch, [index]: device.icon || '' };
                        }
                      }}
                      @blur=${() => {
                        setTimeout(() => {
                          this._deviceIconFocused = { ...this._deviceIconFocused, [index]: false };
                        }, 200);
                      }}
                      helper="MDI icon name"
                    ></ha-textfield>
                    
                    ${this._deviceIconFocused[index] ? html`
                      <div class="icon-suggestions">
                        ${this._getFilteredIcons(this._deviceIconSearch[index] || device.icon || '').slice(0, 8).map(icon => html`
                          <div class="icon-suggestion" @click=${() => {
                            const devices = [...this._config!.devices!];
                            devices[index] = { ...devices[index], icon };
                            this._config = { ...this._config!, devices };
                            this._deviceIconSearch = { ...this._deviceIconSearch, [index]: '' };
                            this._deviceIconFocused = { ...this._deviceIconFocused, [index]: false };
                            fireEvent(this, 'config-changed', { config: this._config });
                          }}>
                            <ha-icon icon="${icon}"></ha-icon>
                            <span>${icon}</span>
                          </div>
                        `)}
                      </div>
                    ` : ''}
                  </div>

                  <ha-select
                    naturalMenuWidth
                    fixedMenuPosition
                    label="Color"
                    .value=${device.color === 'light-color' ? 'light-color' : 'custom'}
                    @selected=${(e: any) => {
                      const value = e.target.value === 'light-color' ? 'light-color' : '#FDD835';
                      const devices = [...this._config!.devices!];
                      devices[index] = { ...devices[index], color: value };
                      this._config = { ...this._config!, devices };
                      fireEvent(this, 'config-changed', { config: this._config });
                    }}
                    @closed=${(e: Event) => e.stopPropagation()}
                  >
                    <ha-list-item value="custom">Custom Color</ha-list-item>
                    ${device.entity && device.entity.startsWith('light.') ? html`
                      <ha-list-item value="light-color">Use Light Color</ha-list-item>
                    ` : ''}
                  </ha-select>

                  ${device.color !== 'light-color' ? html`
                    <ha-textfield
                      label="Custom Color"
                      .value=${typeof device.color === 'string' ? device.color : '#FDD835'}
                      @input=${(e: any) => {
                        const devices = [...this._config!.devices!];
                        devices[index] = { ...devices[index], color: e.target.value };
                        this._config = { ...this._config!, devices };
                        fireEvent(this, 'config-changed', { config: this._config });
                      }}
                      helper="Hex color code (e.g., #FDD835)"
                    ></ha-textfield>
                  ` : ''}

                  <ha-textfield
                    label="Scale"
                    type="number"
                    .value=${device.scale || 100}
                    @input=${(e: any) => {
                      const devices = [...this._config!.devices!];
                      devices[index] = { ...devices[index], scale: parseInt(e.target.value) || 100 };
                      this._config = { ...this._config!, devices };
                      fireEvent(this, 'config-changed', { config: this._config });
                    }}
                    helper="Maximum value (255 for brightness, 1 for volume, 100 for percentage)"
                  ></ha-textfield>

                  <ha-select
                    naturalMenuWidth
                    fixedMenuPosition
                    label="Control Type"
                    .value=${device.type || 'continuous'}
                    @selected=${(e: any) => {
                      const devices = [...this._config!.devices!];
                      devices[index] = { ...devices[index], type: e.detail.value };
                      this._config = { ...this._config!, devices };
                      fireEvent(this, 'config-changed', { config: this._config });
                    }}
                    @closed=${(e: Event) => e.stopPropagation()}
                  >
                    <ha-list-item value="continuous">Continuous (Slider)</ha-list-item>
                    <ha-list-item value="discrete">Discrete (Modes)</ha-list-item>
                  </ha-select>

                  <div class="device-toggles">
                    <ha-formfield label="Show Slider">
                      <ha-switch
                        .checked=${device.show_slider !== false}
                        @change=${(e: any) => {
                          const devices = [...this._config!.devices!];
                          devices[index] = { ...devices[index], show_slider: e.target.checked };
                          this._config = { ...this._config!, devices };
                          fireEvent(this, 'config-changed', { config: this._config });
                        }}
                      ></ha-switch>
                    </ha-formfield>

                    <ha-formfield label="Show Chip">
                      <ha-switch
                        .checked=${device.show_chip !== false}
                        @change=${(e: any) => {
                          const devices = [...this._config!.devices!];
                          devices[index] = { ...devices[index], show_chip: e.target.checked };
                          this._config = { ...this._config!, devices };
                          fireEvent(this, 'config-changed', { config: this._config });
                        }}
                      ></ha-switch>
                    </ha-formfield>
                  </div>

                  ${device.type === 'discrete' ? html`
                    <div class="modes-section">
                      <label>Discrete Modes (JSON format)</label>
                      <ha-textfield
                        label="Modes JSON"
                        .value=${JSON.stringify(device.modes || [])}
                        @input=${(e: any) => {
                          try {
                            const modes = JSON.parse(e.target.value);
                            const devices = [...this._config!.devices!];
                            devices[index] = { ...devices[index], modes };
                            this._config = { ...this._config!, devices };
                            fireEvent(this, 'config-changed', { config: this._config });
                          } catch (err) {
                            // Invalid JSON, ignore
                          }
                        }}
                        helper='[{"value":0,"label":"Off","percentage":0},{"value":0.5,"label":"Medium","percentage":50}]'
                      ></ha-textfield>
                    </div>
                  ` : ''}
                </div>
              </ha-expansion-panel>
            `;
          }) || ''}
        </div>
      </ha-expansion-panel>
    `;
  }

  protected render(): TemplateResult {
    console.log('🔴 RoomCardEditor: main render called', {
      hasHass: !!this._hass,
      hasConfig: !!this._config,
      hassStatesCount: this._hass?.states ? Object.keys(this._hass.states).length : 0,
      timestamp: new Date().toISOString()
    });

    if (!this._hass || !this._config) {
      console.error('❌ RoomCardEditor: Missing requirements', {
        hass: !!this._hass,
        config: !!this._config
      });
      return html`<div class="error">Unable to load editor (hass: ${!!this._hass}, config: ${!!this._config})</div>`;
    }

    // Debug: Check if ha-entity-picker is available
    setTimeout(() => {
      const entityPickers = this.shadowRoot?.querySelectorAll('ha-entity-picker');
      console.log('🔍 Found entity pickers in DOM:', entityPickers?.length || 0);
      entityPickers?.forEach((picker: any, index: number) => {
        console.log(`🔍 Entity Picker ${index}:`, {
          hasHass: !!picker.hass,
          value: picker.value,
          label: picker.label,
          includeDomains: picker.includeDomains,
          element: picker
        });
      });
    }, 100);

    return html`
      <div class="card-config">
        ${this._renderBasicSection()}
        ${this._renderAppearanceSection()}
        ${this._renderSensorsSection()}
        ${this._renderDevicesSection()}
      </div>
    `;
  }

  static get styles(): CSSResult {
    return css`
      .card-config {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .section-content,
      .device-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 16px;
      }

      .error {
        color: var(--error-color);
        padding: 16px;
        text-align: center;
      }

      ha-textfield,
      ha-select,
      ha-entity-picker,
      ha-combo-box {
        width: 100%;
      }

      .switches,
      .device-toggles {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      ha-formfield {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 0;
      }

      .devices-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .devices-header h3 {
        margin: 0;
      }

      .modes-section,
      .state-colors {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .modes-section label,
      .state-colors label {
        font-size: 0.9em;
        font-weight: 500;
        color: var(--secondary-text-color);
      }

      .icon-picker {
        position: relative;
      }

      .icon-suggestions {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--card-background-color);
        border: 1px solid var(--divider-color);
        border-radius: 4px;
        margin-top: 4px;
        z-index: 10;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        max-height: 300px;
        overflow-y: auto;
      }

      .icon-suggestion {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        cursor: pointer;
        transition: background 0.2s;
      }

      .icon-suggestion:hover {
        background: var(--secondary-background-color);
      }

      .icon-suggestion ha-icon {
        --mdc-icon-size: 20px;
      }

      .icon-suggestion span {
        font-size: 0.9em;
      }

      ha-expansion-panel {
        --ha-card-border-radius: 4px;
        --expansion-panel-content-padding: 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'room-card-editor': RoomCardEditor;
  }
}