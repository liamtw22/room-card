import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from 'custom-card-helpers';
import { handleAction } from './handle-action';
import { hasAction } from './has-action';
import { fireEvent } from './fire-event';
import { computeStateDisplay } from './compute-state-display';
import { stateIcon } from './state-icon';
import { forwardHaptic } from './haptic';
import { toggleEntity } from './toggle-entity';
import { guard } from 'lit/directives/guard.js';
import { memoize } from './memoize';
import './ha-card';
import './hui-warning';
import './ha-state-icon';
import './ha-icon';

interface RoomCardConfig extends LovelaceCardConfig {
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

@customElement('room-card')
export class RoomCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config!: RoomCardConfig;
  @state() private currentDeviceIndex: number = -1;
  @state() private isDragging: boolean = false;
  @state() private sliderValue: number = 0;
  @state() private devices: DeviceConfig[] = [];
  @state() private _isLoading: boolean = true;
  @state() private _error?: string;

  // Slider configuration
  private readonly startAngle = -110;
  private readonly endAngle = 30;
  private readonly totalAngle = 140;
  private actionTaken = false;
  private _attachedListeners: Array<[string, EventListener]> = [];

  // Memoized functions
  private _getDeviceState = memoize((entityId: string, hass: HomeAssistant) => {
    return hass.states[entityId];
  });

  static getConfigElement() {
    return document.createElement('room-card-editor');
  }

  static getStubConfig(): RoomCardConfig {
    return {
      type: 'custom:room-card',
      area: '',
      name: '',
      background: 'var(--ha-card-background)',
      icon: 'mdi:home',
      temperature_sensor: '',
      humidity_sensor: '',
      show_temperature: true,
      show_humidity: true,
      temperature_unit: 'F',
      haptic_feedback: true,
      devices: [],
      chip_columns: 1,
      tap_action: { action: 'none' },
      hold_action: { action: 'none' },
      double_tap_action: { action: 'none' }
    };
  }

  setConfig(config: RoomCardConfig): void {
    if (!config.area) {
      throw new Error("You need to define an area");
    }
    
    this._config = {
      ...config,
      background: config.background !== undefined ? config.background : 'var(--ha-card-background)'
    };
    
    this._initializeDevices();
    this._isLoading = false;
  }

  connectedCallback() {
    super.connectedCallback();
    this._attachedListeners = [];
    
    // Add keyboard event listeners
    const keyListener = this._handleKeyDown.bind(this);
    this.addEventListener('keydown', keyListener);
    this._attachedListeners.push(['keydown', keyListener]);
  }

  disconnectedCallback() {
    // Clean up all listeners
    this._attachedListeners?.forEach(([event, listener]) => {
      this.removeEventListener(event, listener);
    });
    super.disconnectedCallback();
  }

  private _initializeDevices(): void {
    if (!this._config) return;
    this.devices = this._config.devices || [];
  }

  private _hasValidConfig(): { valid: boolean; error?: string } {
    if (!this._config?.area) {
      return { valid: false, error: "Area is required" };
    }
    
    // Validate entities exist
    for (const device of (this._config.devices || [])) {
      if (device.entity && !this.hass?.states[device.entity]) {
        console.warn(`Entity ${device.entity} not found`);
      }
    }
    
    return { valid: true };
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!changedProps.has('hass')) return true;
    
    const oldHass = changedProps.get('hass') as HomeAssistant | undefined;
    if (!oldHass) return true;
    
    // Only update if relevant entities changed
    const relevantEntities = [
      ...this.devices.map(d => d.entity),
      ...this.devices.map(d => d.control_entity).filter(Boolean),
      this._config?.temperature_sensor,
      this._config?.humidity_sensor,
      this._config?.background?.entity,
      this._config?.icon_color?.entity,
      this._config?.icon_background?.entity
    ].filter(Boolean);
    
    const hasChanged = relevantEntities.some(entityId => 
      oldHass.states[entityId!] !== this.hass.states[entityId!]
    );

    if (hasChanged) {
      this.updateCurrentDevice();
      this.updateSliderValue();
    }

    return hasChanged;
  }

  private updateCurrentDevice(): void {
    if (!this.hass) return;

    if (this.currentDeviceIndex === -1) {
      for (let i = 0; i < this.devices.length; i++) {
        const entity = this._getDeviceState(this.devices[i].entity, this.hass);
        if (entity && (entity.state === "on" || entity.state === "playing")) {
          this.currentDeviceIndex = i;
          return;
        }
      }
      this.currentDeviceIndex = -1;
    } else {
      const currentDevice = this.devices[this.currentDeviceIndex];
      const entity = this._getDeviceState(currentDevice.entity, this.hass);
      if (!entity || (entity.state !== "on" && entity.state !== "playing")) {
        this.currentDeviceIndex = -1;
        this.updateCurrentDevice();
      }
    }
  }

  private updateSliderValue(): void {
    if (!this.hass || this.currentDeviceIndex === -1) {
      this.sliderValue = 0;
      return;
    }

    const currentDevice = this.devices[this.currentDeviceIndex];
    const entity = this._getDeviceState(currentDevice.entity, this.hass);
    
    if (!entity || (entity.state !== "on" && entity.state !== "playing")) {
      this.sliderValue = 0;
      return;
    }

    if (currentDevice.type === "discrete" && currentDevice.modes) {
      const percentage = entity.attributes[currentDevice.attribute || 'percentage'] || 0;
      const modes = currentDevice.modes;
      
      let closestMode = modes[0];
      let minDiff = Math.abs(percentage - modes[0].percentage);
      
      for (let i = 1; i < modes.length; i++) {
        const diff = Math.abs(percentage - modes[i].percentage);
        if (diff < minDiff) {
          minDiff = diff;
          closestMode = modes[i];
        }
      }
      
      this.sliderValue = closestMode.value;
    } else {
      const value = entity.attributes[currentDevice.attribute || 'brightness'];
      if (value !== undefined && currentDevice.scale) {
        this.sliderValue = value / currentDevice.scale;
      }
    }
  }

  private getAreaName(): string {
    if (!this.hass || !this._config) return this._config?.area || '';
    
    if (this._config.name) return this._config.name;
    
    const area = this.hass.areas[this._config.area];
    return area?.name || this._config.area;
  }

  private getBackgroundColor(): string {
    if (!this.hass || !this._config) return "var(--ha-card-background)";
    
    const background = this._config.background;
    
    if (background === undefined || background === null) {
      return "var(--ha-card-background)";
    }
    
    if (background === '') {
      return "";
    }
    
    if (typeof background === 'string') {
      return background;
    } else if (background.entity) {
      const entity = this.hass.states[background.entity];
      if (!entity) return "var(--ha-card-background)";
      
      return this._getColorFromRanges(entity, background.ranges);
    }
    
    return "var(--ha-card-background)";
  }

  private _getColorFromRanges(entity: any, ranges?: Array<any>): string {
    if (!ranges || ranges.length === 0) {
      return this._getDefaultStateColor(entity);
    }

    const value = parseFloat(entity.state);
    
    if (!isNaN(value)) {
      for (const range of ranges) {
        if (range.min !== undefined && range.max !== undefined) {
          if (value >= range.min && value <= range.max) {
            return range.color;
          }
        }
      }
    }
    
    for (const range of ranges) {
      if (range.state && entity.state === range.state) {
        return range.color;
      }
    }
    
    return this._getDefaultStateColor(entity);
  }

  private _getDefaultStateColor(entity: any): string {
    const domain = entity.entity_id.split('.')[0];
    
    if (entity.state === 'unavailable' || entity.state === 'unknown') {
      return 'var(--state-unavailable-color, var(--disabled-text-color))';
    }
    
    if (['on', 'playing', 'open', 'unlocked', 'home', 'active'].includes(entity.state)) {
      return `var(--state-${domain}-active-color, var(--state-active-color, var(--primary-color)))`;
    }
    
    if (['off', 'paused', 'closed', 'locked', 'away', 'inactive', 'idle'].includes(entity.state)) {
      return 'var(--state-inactive-color, var(--secondary-text-color))';
    }
    
    return 'var(--ha-card-background, var(--card-background-color))';
  }

  private getIconColor(): string {
    if (!this.hass || !this._config) return "var(--primary-text-color)";
    
    const iconColor = this._config.icon_color;
    if (!iconColor) return "var(--primary-text-color)";
    
    if (typeof iconColor === 'string') {
      return iconColor;
    } else if (iconColor.entity) {
      const entity = this.hass.states[iconColor.entity];
      if (entity && iconColor.ranges) {
        return this._getColorFromRanges(entity, iconColor.ranges);
      }
    }
    
    return "var(--primary-text-color)";
  }

  private getIconBackgroundColor(): string {
    if (!this.hass || !this._config) return "rgba(var(--rgb-primary-text-color), 0.2)";
    
    const iconBg = this._config.icon_background;
    if (!iconBg) return "rgba(var(--rgb-primary-text-color), 0.2)";
    
    if (typeof iconBg === 'string') {
      return iconBg;
    } else if (iconBg.entity) {
      const entity = this.hass.states[iconBg.entity];
      if (entity && iconBg.ranges) {
        return this._getColorFromRanges(entity, iconBg.ranges);
      }
    }
    
    return "rgba(var(--rgb-primary-text-color), 0.2)";
  }

  private getTempHumidity(): string {
    if (!this.hass || !this._config) return "";
    
    const parts: string[] = [];
    
    if (this._config.show_temperature !== false && this._config.temperature_sensor) {
      const tempEntity = this.hass.states[this._config.temperature_sensor];
      if (tempEntity && tempEntity.state !== 'unavailable') {
        const temp = parseFloat(tempEntity.state).toFixed(1);
        const unit = this._config.temperature_unit || 'F';
        parts.push(`${temp}°${unit}`);
      }
    }
    
    if (this._config.show_humidity !== false && this._config.humidity_sensor) {
      const humEntity = this.hass.states[this._config.humidity_sensor];
      if (humEntity && humEntity.state !== 'unavailable') {
        const humidity = parseFloat(humEntity.state).toFixed(1);
        parts.push(`${humidity}%`);
      }
    }
    
    return parts.join(' / ');
  }

  private async _handleIconAction(ev: Event): Promise<void> {
    if (this.isDragging) return;
    
    const config = {
      entity: this._config.area,
      tap_action: this._config.tap_action || { action: 'none' },
      hold_action: this._config.hold_action || { action: 'none' },
      double_tap_action: this._config.double_tap_action || { action: 'none' }
    };
    
    if (hasAction(config.tap_action)) {
      await handleAction(this, this.hass, config, 'tap');
    } else {
      // Default behavior: switch active device
      this._switchActiveDevice();
    }
    
    forwardHaptic('light');
  }

  private _switchActiveDevice(): void {
    if (!this.hass) return;
    
    const startIndex = this.currentDeviceIndex;
    let nextIndex = (startIndex + 1) % this.devices.length;
    let found = false;
    
    for (let i = 0; i < this.devices.length; i++) {
      const device = this.devices[nextIndex];
      const entity = this._getDeviceState(device.control_entity || device.entity, this.hass);
      
      if (entity && (entity.state === "on" || entity.state === "playing")) {
        this.currentDeviceIndex = nextIndex;
        found = true;
        break;
      }
      
      nextIndex = (nextIndex + 1) % this.devices.length;
    }
    
    if (!found) {
      this.currentDeviceIndex = -1;
    }
    
    this.updateSliderValue();
    this.requestUpdate();
  }

  private async _handleChipClick(index: number): Promise<void> {
    if (!this.hass) return;
    
    const device = this.devices[index];
    const entity = this._getDeviceState(device.entity, this.hass);
    if (!entity) return;
    
    await toggleEntity(this.hass, device.entity);
    forwardHaptic('light');
    
    if (entity.state === "on" || entity.state === "playing") {
      if (this.currentDeviceIndex === index) {
        this.currentDeviceIndex = -1;
        setTimeout(() => {
          this.updateCurrentDevice();
          this.updateSliderValue();
          this.requestUpdate();
        }, 100);
      }
    } else {
      this.currentDeviceIndex = index;
      setTimeout(() => {
        this.updateSliderValue();
        this.requestUpdate();
      }, 100);
    }
  }

  private _showMoreInfo(entityId: string): void {
    fireEvent(this, "hass-more-info", { entityId });
  }

  private _handleKeyDown(e: KeyboardEvent): void {
    if (!this.hass || this.currentDeviceIndex === -1) return;
    
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        e.preventDefault();
        this.sliderValue = Math.min(1, this.sliderValue + 0.05);
        this.updateDeviceValue(this.sliderValue);
        break;
      case 'ArrowDown':
      case 'ArrowLeft':
        e.preventDefault();
        this.sliderValue = Math.max(0, this.sliderValue - 0.05);
        this.updateDeviceValue(this.sliderValue);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        this._handleIconAction(e);
        break;
    }
  }

  // Slider methods
  private handlePointerDown(e: PointerEvent): void {
    const svg = e.currentTarget as SVGElement;
    if (!svg || this.currentDeviceIndex === -1) return;
    
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = true;
    this.actionTaken = true;
    svg.setPointerCapture(e.pointerId);
    this.handlePointerMove(e);
  }

  private handlePointerMove(e: PointerEvent): void {
    if (!this.isDragging || !this.actionTaken) return;
    
    const svg = this.shadowRoot?.querySelector(".slider-svg") as SVGElement;
    if (!svg) return;
    
    const rect = svg.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const angle = this.pointToAngle(e.clientX, e.clientY, centerX, centerY);
    let newValue = this.angleToValue(angle);
    
    const currentDevice = this.devices[this.currentDeviceIndex];
    
    if (currentDevice && currentDevice.type === "discrete") {
      newValue = this.snapToNearestMode(newValue);
      if (Math.abs(newValue - this.sliderValue) > 0.01) {
        forwardHaptic('selection');
      }
    }
    
    this.sliderValue = newValue;
    this.requestUpdate();
  }

  private handlePointerUp(e: PointerEvent): void {
    if (!this.isDragging) return;
    
    const svg = e.currentTarget as SVGElement;
    if (svg) {
      svg.releasePointerCapture(e.pointerId);
    }
    
    this.isDragging = false;
    
    if (this.actionTaken) {
      this.updateDeviceValue(this.sliderValue);
      this.actionTaken = false;
    }
    
    this.requestUpdate();
  }

  private updateDeviceValue(value: number): void {
    if (!this.hass || this.currentDeviceIndex === -1) return;
    
    const currentDevice = this.devices[this.currentDeviceIndex];
    const controlEntity = currentDevice.control_entity || currentDevice.entity;
    const domain = controlEntity.split('.')[0];
    
    if (currentDevice.type === "discrete" && currentDevice.modes) {
      const modes = currentDevice.modes;
      let selectedMode = modes[0];
      
      for (const mode of modes) {
        if (Math.abs(value - mode.value) < 0.01) {
          selectedMode = mode;
          break;
        }
      }
      
      if (selectedMode.percentage === 0) {
        this.hass.callService(domain, "turn_off", {
          entity_id: controlEntity
        });
      } else {
        this.hass.callService(domain, "set_percentage", {
          entity_id: controlEntity,
          percentage: selectedMode.percentage
        });
      }
    } else {
      const actualValue = Math.round(value * (currentDevice.scale || 100));
      
      if (currentDevice.attribute === "brightness") {
        if (actualValue === 0) {
          this.hass.callService(domain, "turn_off", {
            entity_id: controlEntity
          });
        } else {
          this.hass.callService(domain, "turn_on", {
            entity_id: controlEntity,
            brightness: actualValue,
          });
        }
      } else if (currentDevice.attribute === "volume_level") {
        if (value === 0) {
          this.hass.callService(domain, "volume_mute", {
            entity_id: controlEntity,
            is_volume_muted: true
          });
        } else {
          this.hass.callService(domain, "volume_set", {
            entity_id: controlEntity,
            volume_level: value,
          });
        }
      }
    }
  }

  // Helper methods for slider calculations
  private angleToValue(angle: number): number {
    let normalizedAngle = this.normalizeAngle(angle);
    let normalizedStart = this.normalizeAngle(this.startAngle);
    let angleFromStart = normalizedAngle - normalizedStart;
    
    if (angleFromStart < 0) angleFromStart += 360;
    
    if (angleFromStart > this.totalAngle) {
      let distToStart = Math.min(angleFromStart, 360 - angleFromStart);
      let distToEnd = Math.min(
        Math.abs(angleFromStart - this.totalAngle), 
        360 - Math.abs(angleFromStart - this.totalAngle)
      );
      return distToStart < distToEnd ? 0 : 1;
    }
    
    const value = angleFromStart / this.totalAngle;
    return Math.max(0, Math.min(1, value));
  }

  private valueToAngle(value: number): number {
    return this.startAngle + (value * this.totalAngle);
  }

  private pointToAngle(x: number, y: number, centerX: number, centerY: number): number {
    const angle = Math.atan2(y - centerY, x - centerX);
    return angle * 180 / Math.PI;
  }

  private normalizeAngle(angle: number): number {
    while (angle < 0) angle += 360;
    while (angle >= 360) angle -= 360;
    return angle;
  }

  private snapToNearestMode(value: number): number {
    if (this.currentDeviceIndex === -1) return value;
    
    const currentDevice = this.devices[this.currentDeviceIndex];
    if (currentDevice.type !== "discrete" || !currentDevice.modes) return value;
    
    const modes = currentDevice.modes;
    let closestMode = modes[0];
    let minDiff = Math.abs(value - modes[0].value);
    
    for (let i = 1; i < modes.length; i++) {
      const diff = Math.abs(value - modes[i].value);
      if (diff < minDiff) {
        minDiff = diff;
        closestMode = modes[i];
      }
    }
    
    return closestMode.value;
  }

  private getChipColor(device: DeviceConfig, entityId: string): string {
    if (!this.hass) return device.color_unavailable || "var(--disabled-text-color)";
    
    const stateObj = this._getDeviceState(entityId, this.hass);
    
    if (!stateObj || stateObj.state === 'unavailable') {
      return device.color_unavailable || "var(--disabled-text-color)";
    }
    
    if (stateObj.state !== "on" && stateObj.state !== "playing") {
      return device.color_off || "var(--secondary-background-color)";
    }
    
    const onColor = device.color_on;
    
    if (onColor === 'light-color' && entityId.includes('light') && stateObj.attributes.rgb_color) {
      return `rgb(${stateObj.attributes.rgb_color.join(",")})`;
    }
    
    return onColor || "var(--primary-color)";
  }

  private getSliderColor(device: DeviceConfig, entity: any): string {
    const onColor = device.color_on;
    
    if (onColor === 'light-color' && entity?.attributes?.rgb_color) {
      return `rgb(${entity.attributes.rgb_color.join(",")})`;
    }
    
    return onColor || "var(--primary-color)";
  }

  protected render() {
    // Validation check
    const validation = this._hasValidConfig();
    if (!validation.valid) {
      return html`
        <hui-warning>
          ${validation.error}
        </hui-warning>
      `;
    }

    if (this._isLoading) {
      return html`
        <ha-card>
          <div class="skeleton-loader">
            <div class="skeleton-title"></div>
            <div class="skeleton-icon"></div>
            <div class="skeleton-chips"></div>
          </div>
        </ha-card>
      `;
    }

    if (!this._config || !this.hass) {
      return html`<hui-warning>Loading...</hui-warning>`;
    }

    const backgroundColor = this.getBackgroundColor();
    const iconColor = this.getIconColor();
    const iconBackgroundColor = this.getIconBackgroundColor();
    const tempHumidity = this.getTempHumidity();
    const roomName = this.getAreaName();

    const hasActiveDevice = this.currentDeviceIndex !== -1;
    const currentDevice = hasActiveDevice ? this.devices[this.currentDeviceIndex] : null;
    const deviceEntity = currentDevice ? 
      this._getDeviceState(currentDevice.control_entity || currentDevice.entity, this.hass) : null;
    const isDeviceOn = deviceEntity && (deviceEntity.state === "on" || deviceEntity.state === "playing");
    const showSlider = currentDevice?.show_slider !== false;

    // Calculate slider positions
    const centerX = 75;
    const centerY = 75;
    const radius = 56;
    
    const thumbAngle = this.valueToAngle(this.sliderValue);
    const thumbAngleRad = (thumbAngle * Math.PI) / 180;
    const thumbX = centerX + radius * Math.cos(thumbAngleRad);
    const thumbY = centerY + radius * Math.sin(thumbAngleRad);
    
    const startAngleRad = (this.startAngle * Math.PI) / 180;
    const endAngleRad = (this.endAngle * Math.PI) / 180;
    const startX = centerX + radius * Math.cos(startAngleRad);
    const startY = centerY + radius * Math.sin(startAngleRad);
    const endX = centerX + radius * Math.cos(endAngleRad);
    const endY = centerY + radius * Math.sin(endAngleRad);
    
    const progressAngle = this.sliderValue * this.totalAngle;
    const largeArcFlag = progressAngle > 180 ? 1 : 0;
    
    let sliderColor = 'var(--primary-color)';
    if (currentDevice) {
      sliderColor = this.getSliderColor(currentDevice, deviceEntity);
    }

    // Organize devices into columns
    const chipColumns = this._config.chip_columns || 1;
    const deviceColumns: DeviceConfig[][] = Array(chipColumns).fill(null).map(() => []);
    const visibleDevices = this.devices.filter(d => d.show_chip !== false);
    
    visibleDevices.forEach((device, index) => {
      const columnIndex = index % chipColumns;
      deviceColumns[columnIndex].push(device);
    });

    return html`
      <ha-card>
        <div 
          class="card-container" 
          style="background-color: ${backgroundColor}"
          role="region"
          aria-label="${roomName} controls"
          tabindex="0"
        >
          <div class="main-content">
            <div class="title-section">
              <div class="room-name">${roomName}</div>
              ${tempHumidity ? html`<div class="temp-humidity">${tempHumidity}</div>` : ''}
            </div>

            <div class="icon-section">
              <div class="icon-container">
                <div 
                  class="icon-background" 
                  style="background-color: ${iconBackgroundColor}"
                  @click=${this._handleIconAction}
                  @dblclick=${(e: Event) => handleAction(this, this.hass, this._config, 'double_tap')}
                  @contextmenu=${(e: Event) => {
                    e.preventDefault();
                    handleAction(this, this.hass, this._config, 'hold');
                  }}
                  role="button"
                  tabindex="0"
                  aria-label="Room icon"
                >
                  <ha-icon 
                    icon="${this._config.icon || 'mdi:home'}" 
                    style="color: ${iconColor}"
                  ></ha-icon>
                </div>
                
                ${isDeviceOn && hasActiveDevice && currentDevice && showSlider ? html`
                  <div 
                    class="slider-container"
                    role="slider"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow="${this.sliderValue * 100}"
                    aria-label="${currentDevice.entity} control"
                  >
                    <svg 
                      class="slider-svg" 
                      width="150" 
                      height="150" 
                      viewBox="0 0 150 150"
                      @pointerdown=${this.handlePointerDown}
                      @pointermove=${this.handlePointerMove}
                      @pointerup=${this.handlePointerUp}
                      @pointercancel=${this.handlePointerUp}
                    >
                      <path
                        class="slider-track"
                        d="M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}"
                      />
                      <path
                        class="slider-progress"
                        style="stroke: ${sliderColor}"
                        d="M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${thumbX} ${thumbY}"
                      />
                      <circle
                        class="slider-thumb ${this.isDragging ? 'dragging' : ''}"
                        style="fill: ${sliderColor}"
                        cx="${thumbX}"
                        cy="${thumbY}"
                        r="16"
                      />
                      <foreignObject 
                        x="${thumbX - 10}" 
                        y="${thumbY - 10}" 
                        width="20" 
                        height="20" 
                        class="slider-thumb-icon"
                      >
                        <div xmlns="http://www.w3.org/1999/xhtml" 
                          style="display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; pointer-events: none;"
                        >
                          <ha-icon 
                            icon="${currentDevice.icon}" 
                            style="--mdc-icon-size: 18px; color: ${currentDevice.icon_color || 'var(--text-primary-color)'}"
                          ></ha-icon>
                        </div>
                      </foreignObject>
                    </svg>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>

          <div class="chips-section">
            ${guard([this.devices, this.hass.states], () => 
              deviceColumns.map((column) => html`
                <div class="chips-column">
                  ${column.map((device) => {
                    const deviceIndex = this.devices.indexOf(device);
                    const controlEntity = device.control_entity || device.entity;
                    const entity = this._getDeviceState(controlEntity, this.hass);
                    const isOn = entity && (entity.state === "on" || entity.state === "playing");
                    const isUnavailable = !entity || entity.state === 'unavailable';
                    const chipColor = this.getChipColor(device, controlEntity);
                    const iconColor = device.icon_color || 
                      (isOn ? 'var(--text-primary-color)' : 'var(--secondary-text-color)');
                    
                    return html`
                      <div
                        class="chip ${isUnavailable ? 'unavailable' : ''} ${isOn ? 'on' : 'off'}"
                        style="background-color: ${chipColor}; color: ${iconColor}"
                        @click=${() => this._handleChipClick(deviceIndex)}
                        @dblclick=${() => this._showMoreInfo(controlEntity)}
                        role="button"
                        tabindex="0"
                        aria-label="${device.entity} ${isOn ? 'on' : 'off'}"
                        aria-pressed="${isOn}"
                      >
                        <ha-state-icon
                          .icon=${device.icon || stateIcon(entity)}
                          .state=${entity}
                        ></ha-state-icon>
                      </div>
                    `;
                  })}
                </div>
              `)
            )}
          </div>
        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }

      ha-card {
        height: 100%;
        overflow: hidden;
      }

      .card-container {
        height: 100%;
        border-radius: var(--ha-card-border-radius, 12px);
        display: grid;
        grid-template-areas:
          "title chips"
          "icon chips";
        grid-template-rows: min-content 1fr;
        grid-template-columns: 1fr min-content;
        position: relative;
        transition: background-color 0.3s ease;
        cursor: pointer;
        user-select: none;
        -webkit-user-select: none;
        overflow: hidden;
      }

      .card-container:focus {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }

      .card-container:focus:not(:focus-visible) {
        outline: none;
      }

      .skeleton-loader {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .skeleton-title,
      .skeleton-icon,
      .skeleton-chips {
        background: var(--secondary-background-color);
        border-radius: 4px;
        animation: skeleton-loading 1s ease-in-out infinite;
      }

      .skeleton-title {
        height: 20px;
        width: 60%;
      }

      .skeleton-icon {
        height: 80px;
        width: 80px;
        border-radius: 50%;
      }

      .skeleton-chips {
        height: 40px;
        width: 100%;
      }

      @keyframes skeleton-loading {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 1; }
      }

      .title-section {
        grid-area: title;
        font-size: 14px;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        margin-left: 15px;
        padding-top: 5px;
      }

      .room-name {
        font-weight: var(--paper-font-body1_-_font-weight);
        color: var(--primary-text-color);
        margin-top: 5px;
      }

      .temp-humidity {
        font-size: 12px;
        color: var(--secondary-text-color);
        font-weight: var(--paper-font-body1_-_font-weight);
      }

      .icon-section {
        grid-area: icon;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        position: relative;
        padding-top: 15px;
      }

      .icon-container {
        position: relative;
        width: 110px;
        height: 110px;
        margin-left: -10px;
        margin-bottom: -10px;
        cursor: pointer;
      }

      .icon-background {
        position: absolute;
        width: 110px;
        height: 110px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        z-index: 1;
        background-color: rgba(var(--rgb-primary-text-color), 0.2);
      }

      .icon-background:hover {
        transform: scale(1.05);
      }

      .icon-background:active {
        transform: scale(0.95);
      }

      .icon-background ha-icon {
        --mdc-icon-size: 75px;
        color: var(--text-primary-color);
        transition: all 0.3s ease;
      }

      .slider-container {
        position: absolute;
        width: 150px;
        height: 150px;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 2;
      }

      .slider-svg {
        width: 100%;
        height: 100%;
        touch-action: none;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }

      .slider-track {
        fill: none;
        stroke: var(--disabled-text-color);
        stroke-width: 12;
        opacity: 0.4;
        pointer-events: stroke;
      }

      .slider-progress {
        fill: none;
        stroke-width: 12;
        stroke-linecap: round;
        transition: d 0.3s ease;
        pointer-events: stroke;
      }

      .slider-thumb {
        transition: all 0.2s ease;
        cursor: pointer;
        pointer-events: auto;
        filter: drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.2));
      }

      .slider-thumb.dragging {
        r: 20;
        filter: drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.3));
      }

      .slider-thumb-icon {
        pointer-events: none;
      }

      .chips-section {
        grid-area: chips;
        display: flex;
        flex-direction: row;
        gap: 4px;
        margin-right: 8px;
        margin-top: 8px;
        margin-bottom: 8px;
      }
        
      .chips-column {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .chip {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 40px;
        width: 40px;
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
      }

      .chip:hover {
        transform: scale(1.1);
      }

      .chip:active {
        transform: scale(0.95);
      }

      .chip:focus {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }

      .chip:focus:not(:focus-visible) {
        outline: none;
      }

      .chip ha-icon,
      .chip ha-state-icon {
        --mdc-icon-size: 25px;
      }

      .chip.unavailable {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .chip.unavailable:hover,
      .chip.unavailable:active {
        transform: none;
      }
    `;
  }

  getCardSize(): number {
    return 2;
  }
}
