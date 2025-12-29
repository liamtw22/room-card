import { LitElement, html, TemplateResult, PropertyValues, CSSResultGroup, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, forwardHaptic, stateIcon, hasAction, handleAction } from 'custom-card-helpers';
import { HassEntity } from 'home-assistant-js-websocket';

import type { RoomCardConfig, DeviceConfig, ActionHandlerEvent, EntityColorConfig } from './types';
import { actionHandler } from './action-handler-directive';
import {
  CARD_VERSION,
  DEFAULT_FONT_COLOR,
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
} from './const';
import './editor';

console.info(
  `%c  room-card \n%c  Version ${CARD_VERSION}    `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'room-card',
  name: 'Room Card',
  description: 'A custom room card with circular slider control',
  preview: true,
});

@customElement('room-card')
export class RoomCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config!: RoomCardConfig;
  @state() private currentDeviceIndex = -1;
  @state() private isDragging = false;
  @state() private sliderValue = 0;
  @state() private devices: DeviceConfig[] = [];

  private startAngle = -110;
  private endAngle = 30;
  private totalAngle = 140;
  private actionTaken = false;
  private thumbTapped = false;
  
  // Debounce timer for slider updates
  private debounceTimer?: number;

  public static getConfigElement() {
    return document.createElement('room-card-editor');
  }

  // Standard HA method for Sections view grid sizing
  public static getGridOptions() {
    return {
      columns: 2,
      rows: 3,
      min_columns: 1,
      min_rows: 2,
    };
  }

  // Standard HA method for Masonry view sizing
  public getCardSize(): number {
    return 3;
  }

  // Instance method for dynamic grid options based on config
  public getGridOptions() {
    return {
      columns: this._config?.layout_options?.grid_columns || 2,
      rows: this._config?.layout_options?.grid_rows || 3,
      min_columns: this._config?.layout_options?.grid_min_columns || 1,
      min_rows: this._config?.layout_options?.grid_min_rows || 2,
    };
  }

  public static getStubConfig(): Partial<RoomCardConfig> {
    return {
      area: '',
      name: '',
      background: DEFAULT_CARD_BACKGROUND,
      icon: '',
      display_entity_1: '',
      display_entity_2: '',
      haptic_feedback: true,
      devices: [],
      card_tap_action: { action: 'none' },
      card_hold_action: { action: 'none' },
      title_tap_action: { action: 'none' },
      title_hold_action: { action: 'none' },
      slider_debounce: DEFAULT_SLIDER_DEBOUNCE,
      layout_options: {
        grid_columns: 2,
        grid_rows: 3,
        grid_min_columns: 1,
        grid_min_rows: 2,
      },
    };
  }

  public setConfig(config: RoomCardConfig): void {
    if (!config.area) {
      throw new Error("You need to define an area");
    }

    this._config = {
      ...config,
      background: config.background !== undefined ? config.background : DEFAULT_CARD_BACKGROUND,
      slider_debounce: config.slider_debounce !== undefined ? config.slider_debounce : DEFAULT_SLIDER_DEBOUNCE,
    };
    this.devices = config.devices || [];
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this._config) {
      return false;
    }

    if (changedProps.has('_config')) {
      return true;
    }

    if (changedProps.has('currentDeviceIndex') || changedProps.has('isDragging') || changedProps.has('sliderValue')) {
      return true;
    }

    const oldHass = changedProps.get('hass') as HomeAssistant | undefined;
    if (!oldHass) {
      return true;
    }

    // Check for theme or language changes (HA standard practice)
    if (oldHass.themes !== this.hass.themes || oldHass.language !== this.hass.language) {
      return true;
    }

    // Check display entities
    if (this._config.display_entity_1) {
      const oldState = oldHass.states[this._config.display_entity_1];
      const newState = this.hass.states[this._config.display_entity_1];
      if (oldState !== newState) return true;
    }
    if (this._config.display_entity_2) {
      const oldState = oldHass.states[this._config.display_entity_2];
      const newState = this.hass.states[this._config.display_entity_2];
      if (oldState !== newState) return true;
    }

    // Check device entities
    for (const device of this.devices) {
      const entityId = device.control_entity || device.entity;
      const oldState = oldHass.states[entityId];
      const newState = this.hass.states[entityId];
      if (oldState !== newState) return true;
    }

    // Check color config entities
    if (typeof this._config.background === 'object' && this._config.background?.entity) {
      const oldState = oldHass.states[this._config.background.entity];
      const newState = this.hass.states[this._config.background.entity];
      if (oldState !== newState) return true;
    }
    if (typeof this._config.icon_color === 'object' && this._config.icon_color?.entity) {
      const oldState = oldHass.states[this._config.icon_color.entity];
      const newState = this.hass.states[this._config.icon_color.entity];
      if (oldState !== newState) return true;
    }
    if (typeof this._config.icon_background === 'object' && this._config.icon_background?.entity) {
      const oldState = oldHass.states[this._config.icon_background.entity];
      const newState = this.hass.states[this._config.icon_background.entity];
      if (oldState !== newState) return true;
    }
    // Check font color entities
    if (typeof this._config.room_name_color === 'object' && this._config.room_name_color?.entity) {
      const oldState = oldHass.states[this._config.room_name_color.entity];
      const newState = this.hass.states[this._config.room_name_color.entity];
      if (oldState !== newState) return true;
    }
    if (typeof this._config.display_entity_color === 'object' && this._config.display_entity_color?.entity) {
      const oldState = oldHass.states[this._config.display_entity_color.entity];
      const newState = this.hass.states[this._config.display_entity_color.entity];
      if (oldState !== newState) return true;
    }

    return false;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (this.currentDeviceIndex !== -1 && this.devices[this.currentDeviceIndex]) {
      const device = this.devices[this.currentDeviceIndex];
      const controlEntity = device.control_entity || device.entity;
      const entity = this.hass.states[controlEntity];

      if (entity && !this.isDragging) {
        const newValue = this.getEntityValue(entity, device);
        if (Math.abs(newValue - this.sliderValue) > 0.01) {
          this.sliderValue = newValue;
        }
      }
    }
  }

  private getEntityValue(entity: HassEntity, device: DeviceConfig): number {
    if (device.type === "discrete" && device.modes && device.modes.length > 0) {
      const modes = device.modes;
      const domain = device.entity.split('.')[0];

      if (domain === "fan" || domain === "climate") {
        const currentPreset = entity.attributes.preset_mode;
        const modeIndex = modes.findIndex(m => m.label === currentPreset);
        // Return position as fraction (0 to 1) based on mode index
        if (modeIndex !== -1) {
          return modeIndex / (modes.length - 1);
        }
      }
      return 0;
    }

    const attribute = device.attribute || "brightness";
    let value: number;

    if (attribute === "state") {
      value = entity.state === "on" ? 1 : 0;
    } else {
      value = entity.attributes[attribute] ?? 0;
    }

    const scale = device.scale || (attribute === "brightness" ? 255 : 100);
    return value / scale;
  }

  private getAreaName(): string {
    if (this._config.name) {
      return this._config.name;
    }

    const areas = (this.hass as any).areas;
    if (areas && this._config.area) {
      const area = areas[this._config.area];
      return area?.name || this._config.area;
    }

    return this._config.area || '';
  }

  // Get the area's icon if available
  private getAreaIcon(): string {
    if (this._config.icon) {
      return this._config.icon;
    }

    const areas = (this.hass as any).areas;
    if (areas && this._config.area) {
      const area = areas[this._config.area];
      if (area?.icon) {
        return area.icon;
      }
    }

    return 'mdi:home';
  }

  private getDisplayText(): string {
    const parts: string[] = [];

    if (this._config.display_entity_1) {
      const entity = this.hass.states[this._config.display_entity_1];
      if (entity) {
        const attr = this._config.display_entity_1_attribute || 'state';
        const value = attr === 'state' ? entity.state : entity.attributes[attr];
        const unit = this._config.display_entity_1_unit || '';
        if (value !== undefined && value !== null && value !== 'unavailable') {
          parts.push(`${value}${unit}`);
        }
      }
    }

    if (this._config.display_entity_2) {
      const entity = this.hass.states[this._config.display_entity_2];
      if (entity) {
        const attr = this._config.display_entity_2_attribute || 'state';
        const value = attr === 'state' ? entity.state : entity.attributes[attr];
        const unit = this._config.display_entity_2_unit || '';
        if (value !== undefined && value !== null && value !== 'unavailable') {
          parts.push(`${value}${unit}`);
        }
      }
    }

    return parts.join(' / ');
  }

  // ===== ACTION HANDLERS =====

  private handleCardAction(ev: ActionHandlerEvent) {
    if (!ev.detail?.action) return;
    
    // Ignore if interacting with child elements
    const target = ev.target as HTMLElement;
    if (target.closest('.chip') || target.closest('.icon-background') || target.closest('.title-section') || target.closest('.slider-svg')) {
      return;
    }

    if (this._config.haptic_feedback !== false) {
      forwardHaptic('light');
    }

    const actionConfig = ev.detail.action === 'hold' 
      ? this._config.card_hold_action 
      : this._config.card_tap_action;

    if (actionConfig && hasAction(actionConfig)) {
      handleAction(this, this.hass, { ...this._config, tap_action: actionConfig, hold_action: actionConfig }, ev.detail.action);
    }
  }

  private handleTitleAction(ev: ActionHandlerEvent) {
    ev.stopPropagation();
    if (!ev.detail?.action) return;

    if (this._config.haptic_feedback !== false) {
      forwardHaptic('light');
    }

    const actionConfig = ev.detail.action === 'hold'
      ? this._config.title_hold_action
      : this._config.title_tap_action;

    if (actionConfig && hasAction(actionConfig)) {
      handleAction(this, this.hass, { ...this._config, tap_action: actionConfig, hold_action: actionConfig }, ev.detail.action);
    }
  }

  private handleIconAction(ev: ActionHandlerEvent) {
    ev.stopPropagation();
    if (!ev.detail?.action) return;

    if (this._config.haptic_feedback !== false) {
      forwardHaptic('light');
    }

    // Icon tap always rotates through active device sliders
    if (ev.detail.action === 'tap') {
      this.rotateActiveDeviceSlider();
    }
  }

  private rotateActiveDeviceSlider() {
    // Get indices of active (on) devices that have show_slider enabled
    const activeDeviceIndices: number[] = [];
    
    this.devices.forEach((device, index) => {
      if (device.show_slider === false) return;
      
      const controlEntity = device.control_entity || device.entity;
      const entity = this.hass.states[controlEntity];
      
      if (entity && (entity.state === "on" || entity.state === "playing")) {
        activeDeviceIndices.push(index);
      }
    });

    if (activeDeviceIndices.length === 0) {
      // No active devices, hide slider
      this.currentDeviceIndex = -1;
      return;
    }

    // Find current position in active devices list
    const currentPosition = activeDeviceIndices.indexOf(this.currentDeviceIndex);
    
    let nextIndex: number;
    if (currentPosition === -1) {
      // No slider shown, show first active device
      nextIndex = activeDeviceIndices[0];
    } else if (currentPosition === activeDeviceIndices.length - 1) {
      // At last active device, hide slider (cycle complete)
      this.currentDeviceIndex = -1;
      return;
    } else {
      // Move to next active device
      nextIndex = activeDeviceIndices[currentPosition + 1];
    }

    // Set the new device and update slider value
    this.currentDeviceIndex = nextIndex;
    const device = this.devices[nextIndex];
    const controlEntity = device.control_entity || device.entity;
    const entity = this.hass.states[controlEntity];
    if (entity) {
      this.sliderValue = this.getEntityValue(entity, device);
    }
  }

  private handleChipAction(ev: ActionHandlerEvent, deviceIndex: number) {
    ev.stopPropagation();
    if (!ev.detail?.action) return;

    const device = this.devices[deviceIndex];
    const controlEntity = device.control_entity || device.entity;
    const entity = this.hass.states[controlEntity];

    if (!entity || entity.state === 'unavailable') {
      return;
    }

    if (this._config.haptic_feedback !== false) {
      forwardHaptic('light');
    }

    const actionType = ev.detail.action;
    let actionConfig = device.tap_action;

    if (actionType === 'hold') {
      actionConfig = device.hold_action;
    } else if (actionType === 'double_tap') {
      actionConfig = device.double_tap_action;
    }

    // If custom action is configured, use it
    if (actionConfig && hasAction(actionConfig)) {
      // For toggle action, actually toggle the device
      if (actionConfig.action === 'toggle') {
        const domain = controlEntity.split('.')[0];
        this.hass.callService(domain, 'toggle', {
          entity_id: controlEntity,
        });
        return;
      }
      
      const entityConfig = {
        entity: controlEntity,
        tap_action: actionConfig,
        hold_action: actionConfig,
      };
      handleAction(this, this.hass, entityConfig, actionType);
      return;
    }

    // Default behavior for tap: toggle device
    if (actionType === 'tap') {
      const domain = controlEntity.split('.')[0];
      this.hass.callService(domain, 'toggle', {
        entity_id: controlEntity,
      });
      
      // If turning on and slider is available, show it
      const isOn = entity.state === "on" || entity.state === "playing";
      if (!isOn && device.show_slider !== false) {
        // Device is being turned on, show slider after a short delay
        setTimeout(() => {
          this.currentDeviceIndex = deviceIndex;
          const updatedEntity = this.hass.states[controlEntity];
          if (updatedEntity) {
            this.sliderValue = this.getEntityValue(updatedEntity, device);
          }
        }, 300);
      } else if (isOn && this.currentDeviceIndex === deviceIndex) {
        // Device is being turned off and its slider is showing, hide it
        this.currentDeviceIndex = -1;
      }
    } else if (actionType === 'hold') {
      // Default hold: show more-info dialog
      const entityConfig = {
        entity: controlEntity,
        tap_action: { action: 'more-info' as const },
        hold_action: { action: 'more-info' as const },
      };
      handleAction(this, this.hass, entityConfig, 'tap');
    }
  }

  // Helper to resolve entity-based color config
  private resolveEntityColor(colorConfig: string | EntityColorConfig | undefined, defaultColor: string): string {
    if (!colorConfig) return defaultColor;
    
    if (typeof colorConfig === 'string') {
      return colorConfig;
    }
    
    if (typeof colorConfig === 'object' && colorConfig.entity) {
      const entity = this.hass.states[colorConfig.entity];
      if (!entity) return defaultColor;
      
      if (colorConfig.ranges && colorConfig.ranges.length > 0) {
        const value = parseFloat(entity.state);
        
        if (!isNaN(value)) {
          for (const range of colorConfig.ranges) {
            if (range.min !== undefined && range.max !== undefined &&
                value >= range.min && value <= range.max) {
              return range.color;
            }
          }
        }
        
        for (const range of colorConfig.ranges) {
          if (range.state && entity.state === range.state) {
            return range.color;
          }
        }
      }
      
      return defaultColor;
    }
    
    return defaultColor;
  }

  private getChipColor(device: DeviceConfig, entityId: string): string {
    const entity = this.hass.states[entityId];

    if (!entity || entity.state === 'unavailable') {
      return device.chip_unavailable_color || DEFAULT_CHIP_UNAVAILABLE_COLOR;
    }

    // Check for entity-based chip color
    if (device.chip_color) {
      return this.resolveEntityColor(device.chip_color, DEFAULT_CHIP_ON_COLOR);
    }

    // Legacy behavior
    const isOn = entity.state === "on" || entity.state === "playing";

    if (isOn) {
      return device.chip_on_color || DEFAULT_CHIP_ON_COLOR;
    } else {
      return device.chip_off_color || DEFAULT_CHIP_OFF_COLOR;
    }
  }

  private getChipIconColor(device: DeviceConfig, entityId: string): string {
    const entity = this.hass.states[entityId];

    if (!entity || entity.state === 'unavailable') {
      return device.icon_unavailable_color || DEFAULT_ICON_UNAVAILABLE_COLOR;
    }

    // Check for entity-based chip icon color
    if (device.chip_icon_color) {
      return this.resolveEntityColor(device.chip_icon_color, DEFAULT_ICON_ON_COLOR);
    }

    // Legacy behavior
    const isOn = entity.state === "on" || entity.state === "playing";

    if (isOn) {
      return device.icon_on_color || DEFAULT_ICON_ON_COLOR;
    } else {
      return device.icon_off_color || DEFAULT_ICON_OFF_COLOR;
    }
  }

  // Get device icon - use configured icon, or fall back to HA's stateIcon for dynamic resolution
  private getDeviceIcon(device: DeviceConfig): string {
    if (device.icon) {
      return device.icon;
    }
    
    // Use HA's stateIcon helper for dynamic icon based on entity state
    const entityId = device.control_entity || device.entity;
    const entity = this.hass.states[entityId];
    
    if (entity) {
      return stateIcon(entity) || 'mdi:help-circle';
    }
    
    return 'mdi:help-circle';
  }

  private getSliderColor(device: DeviceConfig, entity: HassEntity | undefined): string {
    if (!entity || entity.state === 'unavailable') {
      return device.chip_unavailable_color || DEFAULT_CHIP_UNAVAILABLE_COLOR;
    }
    
    // Check for entity-based chip color for slider
    if (device.chip_color) {
      return this.resolveEntityColor(device.chip_color, DEFAULT_CHIP_ON_COLOR);
    }
    
    return device.chip_on_color || DEFAULT_CHIP_ON_COLOR;
  }

  private degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private calculateAngle(x: number, y: number, rect: DOMRect): number {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = x - centerX;
    const deltaY = y - centerY;
    return Math.atan2(deltaY, deltaX) * (180 / Math.PI);
  }

  private angleToValue(angle: number): number {
    let normalizedAngle = angle;
    if (normalizedAngle < -180) normalizedAngle += 360;
    if (normalizedAngle > 180) normalizedAngle -= 360;

    let angleFromStart = normalizedAngle - this.startAngle;

    if (angleFromStart < -180) angleFromStart += 360;
    if (angleFromStart > 180) angleFromStart -= 360;

    if (angleFromStart < 0) {
      return 0;
    }
    if (angleFromStart > this.totalAngle) {
      return angleFromStart > this.totalAngle + 30 ? 0 : 1;
    }

    return angleFromStart / this.totalAngle;
  }

  private valueToAngle(value: number): number {
    return this.startAngle + (value * this.totalAngle);
  }

  private handlePointerDown(e: PointerEvent) {
    e.preventDefault();
    e.stopPropagation();

    const svg = e.currentTarget as SVGElement;
    if (!svg) return;

    svg.setPointerCapture(e.pointerId);

    const rect = svg.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const thumbAngle = this.valueToAngle(this.sliderValue);
    const thumbAngleRad = this.degreesToRadians(thumbAngle);

    const svgRadius = 56;
    const scale = rect.width / 150;
    const actualRadius = svgRadius * scale;

    const thumbX = centerX + actualRadius * Math.cos(thumbAngleRad);
    const thumbY = centerY + actualRadius * Math.sin(thumbAngleRad);

    const distanceToThumb = Math.sqrt(
      (e.clientX - thumbX) ** 2 + (e.clientY - thumbY) ** 2
    );

    if (distanceToThumb <= 30) {
      this.thumbTapped = true;
    } else {
      this.thumbTapped = false;
    }

    this.isDragging = true;
    this.actionTaken = true;

    if (this._config.haptic_feedback !== false) {
      forwardHaptic('light');
    }

    if (!this.thumbTapped) {
      this.handlePointerMove(e);
    }
  }

  private updateVisualOnly() {
    const progressEl = this.shadowRoot?.querySelector('.slider-progress');
    const thumbEl = this.shadowRoot?.querySelector('.slider-thumb');
    const thumbHitArea = this.shadowRoot?.querySelector('.slider-thumb-hit-area');
    const thumbIcon = this.shadowRoot?.querySelector('.slider-thumb-icon');

    if (!progressEl || !thumbEl) return;

    const radius = 56;
    const centerX = 75;
    const centerY = 75;

    const thumbAngle = this.valueToAngle(this.sliderValue);
    const thumbAngleRad = this.degreesToRadians(thumbAngle);
    const thumbX = centerX + radius * Math.cos(thumbAngleRad);
    const thumbY = centerY + radius * Math.sin(thumbAngleRad);

    const startAngleRad = this.degreesToRadians(this.startAngle);
    const startX = centerX + radius * Math.cos(startAngleRad);
    const startY = centerY + radius * Math.sin(startAngleRad);

    const progressAngle = this.sliderValue * this.totalAngle;
    const largeArcFlag = progressAngle > 180 ? 1 : 0;

    progressEl.setAttribute('d', `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${thumbX} ${thumbY}`);
    thumbEl.setAttribute('cx', String(thumbX));
    thumbEl.setAttribute('cy', String(thumbY));

    if (thumbHitArea) {
      thumbHitArea.setAttribute('cx', String(thumbX));
      thumbHitArea.setAttribute('cy', String(thumbY));
    }

    if (thumbIcon) {
      thumbIcon.setAttribute('x', String(thumbX - 10));
      thumbIcon.setAttribute('y', String(thumbY - 10));
    }
  }

  private handlePointerMove(e: PointerEvent) {
    if (!this.isDragging) return;

    const svg = e.currentTarget as SVGElement;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const angle = this.calculateAngle(e.clientX, e.clientY, rect);
    const newValue = this.angleToValue(angle);

    this.sliderValue = Math.max(0, Math.min(1, newValue));
    this.updateVisualOnly();
    
    // Debounced update during drag
    this.debouncedUpdateDeviceValue();
  }

  private handlePointerUp(e: PointerEvent) {
    if (!this.isDragging) return;

    const svg = e.currentTarget as SVGElement;
    if (svg) {
      svg.releasePointerCapture(e.pointerId);
    }

    this.isDragging = false;
    
    // Clear any pending debounce and do final update
    if (this.debounceTimer) {
      window.clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
    this.updateDeviceValue();
  }

  private debouncedUpdateDeviceValue() {
    if (this.debounceTimer) {
      window.clearTimeout(this.debounceTimer);
    }
    
    const debounceTime = this._config.slider_debounce ?? DEFAULT_SLIDER_DEBOUNCE;
    this.debounceTimer = window.setTimeout(() => {
      this.updateDeviceValue();
    }, debounceTime);
  }

  private async updateDeviceValue() {
    if (this.currentDeviceIndex === -1) return;

    const currentDevice = this.devices[this.currentDeviceIndex];
    if (!currentDevice) return;

    const controlEntity = currentDevice.control_entity || currentDevice.entity;
    const value = this.sliderValue;
    const domain = controlEntity.split('.')[0];

    try {
      if (currentDevice.type === "discrete" && currentDevice.modes && currentDevice.modes.length > 0) {
        const modes = currentDevice.modes;
        // Find closest mode based on slider position (0-1 mapped to mode indices)
        const targetIndex = Math.round(value * (modes.length - 1));
        const selectedMode = modes[Math.min(targetIndex, modes.length - 1)];

        // Execute mode-specific action if configured
        if (selectedMode.action && hasAction(selectedMode.action)) {
          handleAction(this, this.hass, { entity: controlEntity, tap_action: selectedMode.action }, 'tap');
        } else if (domain === "fan" || domain === "climate") {
          await this.hass.callService(domain, "set_preset_mode", {
            entity_id: controlEntity,
            preset_mode: selectedMode.label,
          });
        }
      } else {
        const actualValue = Math.round(value * (currentDevice.scale || 255));
        if (domain === "light") {
          await this.hass.callService(domain, "turn_on", {
            entity_id: controlEntity,
            brightness: actualValue,
          });
        } else if (domain === "media_player") {
          await this.hass.callService(domain, "volume_set", {
            entity_id: controlEntity,
            volume_level: value,
          });
        } else if (domain === "fan") {
          await this.hass.callService(domain, "set_percentage", {
            entity_id: controlEntity,
            percentage: actualValue,
          });
        } else if (domain === "cover") {
          await this.hass.callService(domain, "set_cover_position", {
            entity_id: controlEntity,
            position: actualValue,
          });
        }
      }
      
      if (this._config.haptic_feedback !== false && !this.isDragging) {
        forwardHaptic('success');
      }
    } catch (error) {
      console.error('Failed to update device:', error);
    }
  }

  private getBackgroundColor(): string {
    if (!this.hass || !this._config) return DEFAULT_CARD_BACKGROUND;
    return this.resolveEntityColor(this._config.background, DEFAULT_CARD_BACKGROUND);
  }

  private getIconColor(): string {
    if (!this.hass || !this._config) return DEFAULT_ICON_COLOR;
    return this.resolveEntityColor(this._config.icon_color, DEFAULT_ICON_COLOR);
  }

  private getIconBackgroundColor(): string {
    if (!this.hass || !this._config) return DEFAULT_ICON_BACKGROUND_COLOR;
    return this.resolveEntityColor(this._config.icon_background, DEFAULT_ICON_BACKGROUND_COLOR);
  }

  private getRoomNameColor(): string {
    if (!this.hass || !this._config) return DEFAULT_FONT_COLOR;
    return this.resolveEntityColor(this._config.room_name_color, DEFAULT_FONT_COLOR);
  }

  private getDisplayEntityColor(): string {
    if (!this.hass || !this._config) return DEFAULT_FONT_COLOR;
    return this.resolveEntityColor(this._config.display_entity_color, DEFAULT_FONT_COLOR);
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    const backgroundColor = this.getBackgroundColor();
    const iconColor = this.getIconColor();
    const iconBackgroundColor = this.getIconBackgroundColor();
    const displayText = this.getDisplayText();
    const roomName = this.getAreaName();

    const roomNameColor = this.getRoomNameColor();
    const roomNameSize = this._config.room_name_size || DEFAULT_TITLE_SIZE;
    const displayEntityColor = this.getDisplayEntityColor();
    const displayEntitySize = this._config.display_entity_size || DEFAULT_SUBTITLE_SIZE;

    // Sizing options (rem-based)
    const iconSize = this._config.icon_size || DEFAULT_ICON_SIZE;
    const iconBgSize = this._config.icon_background_size || DEFAULT_ICON_BACKGROUND_SIZE;
    const sliderSize = this._config.slider_size || DEFAULT_SLIDER_SIZE;
    const chipSize = this._config.chip_size || DEFAULT_CHIP_SIZE;
    const chipIconSize = this._config.chip_icon_size || DEFAULT_CHIP_ICON_SIZE;
    const chipGap = this._config.chip_gap || DEFAULT_CHIP_GAP;

    const hasActiveDevice = this.currentDeviceIndex !== -1;
    const currentDevice = hasActiveDevice ? this.devices[this.currentDeviceIndex] : null;
    const deviceEntity = currentDevice ? this.hass.states[currentDevice.control_entity || currentDevice.entity] : null;
    const isDeviceOn = deviceEntity && (deviceEntity.state === "on" || deviceEntity.state === "playing");
    const showSlider = currentDevice?.show_slider !== false;

    const centerX = 75;
    const centerY = 75;
    const radius = 56;

    const thumbAngle = this.valueToAngle(this.sliderValue);
    const thumbAngleRad = this.degreesToRadians(thumbAngle);
    const thumbX = centerX + radius * Math.cos(thumbAngleRad);
    const thumbY = centerY + radius * Math.sin(thumbAngleRad);

    const startAngleRad = this.degreesToRadians(this.startAngle);
    const endAngleRad = this.degreesToRadians(this.endAngle);
    const startX = centerX + radius * Math.cos(startAngleRad);
    const startY = centerY + radius * Math.sin(startAngleRad);
    const endX = centerX + radius * Math.cos(endAngleRad);
    const endY = centerY + radius * Math.sin(endAngleRad);

    const progressAngle = this.sliderValue * this.totalAngle;
    const largeArcFlag = progressAngle > 180 ? 1 : 0;

    let sliderColor = DEFAULT_CHIP_ON_COLOR;
    if (currentDevice) {
      sliderColor = this.getSliderColor(currentDevice, deviceEntity || undefined);
    }

    const chipColumns = this._config.chip_columns || 1;
    const deviceColumns: DeviceConfig[][] = [];
    const visibleDevices = this.devices.filter(d => d.show_chip !== false);

    for (let i = 0; i < chipColumns; i++) {
      deviceColumns[i] = [];
    }

    visibleDevices.forEach((device) => {
      const columnIndex = (device.chip_column || 1) - 1;
      if (columnIndex >= 0 && columnIndex < chipColumns) {
        deviceColumns[columnIndex].push(device);
      } else {
        deviceColumns[0].push(device);
      }
    });

    // Get area icon
    const cardIcon = this.getAreaIcon();

    return html`
      <ha-card>
        <div
          class="card-container"
          style="
            background-color: ${backgroundColor};
            --room-card-icon-size: ${iconSize};
            --room-card-icon-bg-size: ${iconBgSize};
            --room-card-slider-size: ${sliderSize};
            --room-card-chip-size: ${chipSize};
            --room-card-chip-icon-size: ${chipIconSize};
            --room-card-chip-gap: ${chipGap};
          "
          @action=${this.handleCardAction}
          .actionHandler=${actionHandler({
            hasHold: hasAction(this._config.card_hold_action),
            hasDoubleClick: false,
          })}
        >
        <div class="main-content">
          <div
            class="title-section"
            @action=${this.handleTitleAction}
            .actionHandler=${actionHandler({
              hasHold: hasAction(this._config.title_hold_action),
              hasDoubleClick: false,
            })}
          >
            <div class="room-name" style="color: ${roomNameColor}; font-size: ${roomNameSize}">
              ${roomName}
            </div>
            ${displayText ? html`
              <div class="display-entities" style="color: ${displayEntityColor}; font-size: ${displayEntitySize}">
                ${displayText}
              </div>
            ` : ''}
          </div>

          <div class="icon-section">
            <div class="icon-container">
              ${isDeviceOn && hasActiveDevice && currentDevice && showSlider ?
              html`
              <div class="slider-container">
                <svg class="slider-svg" viewBox="0 0 150 150"
                  @pointerdown=${this.handlePointerDown}
                  @pointermove=${this.handlePointerMove}
                  @pointerup=${this.handlePointerUp}
                  @pointercancel=${this.handlePointerUp}>
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
                  <circle
                    class="slider-thumb-hit-area"
                    cx="${thumbX}"
                    cy="${thumbY}"
                    r="25"
                  />
                  <foreignObject x="${thumbX - 10}" y="${thumbY - 10}" width="20" height="20" class="slider-thumb-icon">
                    <div xmlns="http://www.w3.org/1999/xhtml" style="display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; pointer-events: none;">
                      <ha-icon icon="${this.getDeviceIcon(currentDevice)}" style="--mdc-icon-size: 18px; color: ${currentDevice.icon_on_color || DEFAULT_ICON_ON_COLOR};"></ha-icon>
                    </div>
                  </foreignObject>
                </svg>
              </div>
              ` : ''}

              <div class="icon-background"
                   style="background-color: ${iconBackgroundColor};"
                   @action=${this.handleIconAction}
                   .actionHandler=${actionHandler({
                     hasHold: hasAction(this._config.icon_hold_action),
                     hasDoubleClick: false,
                   })}>
                <ha-icon icon="${cardIcon}" style="color: ${iconColor}"></ha-icon>
              </div>
            </div>
          </div>
        </div>

        <div class="chips-section">
          ${deviceColumns.map((column) => html`
            <div class="chips-column">
              ${column.map((device) => {
                const deviceIndex = this.devices.indexOf(device);
                const controlEntity = device.control_entity || device.entity;
                const entity = this.hass.states[controlEntity];
                const isOn = entity && (entity.state === "on" || entity.state === "playing");
                const isUnavailable = !entity || entity.state === 'unavailable';
                const chipColor = this.getChipColor(device, controlEntity);
                const chipIconColor = this.getChipIconColor(device, controlEntity);

                return html`
                  <div
                    class="chip ${isUnavailable ? 'unavailable' : ''} ${isOn ? 'on' : 'off'}"
                    style="background-color: ${chipColor};"
                    @action=${(ev: ActionHandlerEvent) => this.handleChipAction(ev, deviceIndex)}
                    .actionHandler=${actionHandler({
                      hasHold: hasAction(device.hold_action),
                      hasDoubleClick: hasAction(device.double_tap_action),
                    })}
                  >
                    <ha-icon icon="${this.getDeviceIcon(device)}" style="color: ${chipIconColor};"></ha-icon>
                  </div>
                `;
              })}
            </div>
          `)}
        </div>
      </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
        :host {
          display: block;
          height: 100%;
          width: 100%;
          min-height: var(--room-card-min-height, 120px);
          container-type: inline-size;
          container-name: room-card;
          overflow: hidden;
          font-size: var(--ha-card-header-font-size, 14px);
        }

        ha-card {
          height: 100%;
          width: 100%;
          min-height: inherit;
          background: transparent;
          box-shadow: none;
          border: none;
          overflow: hidden;
        }

        .card-container {
          height: 100%;
          width: 100%;
          min-height: inherit;
          border-radius: var(--ha-card-border-radius, 1.5rem);
          display: grid;
          grid-template-areas:
            "title chips"
            "icon chips";
          grid-template-rows: auto 1fr;
          grid-template-columns: 1fr auto;
          position: relative;
          transition: background-color 0.3s ease;
          cursor: pointer;
          user-select: none;
          -webkit-user-select: none;
          overflow: hidden;
          box-sizing: border-box;
        }

        .main-content {
          grid-column: 1;
          grid-row: 1 / -1;
          display: contents;
        }

        .title-section {
          grid-area: title;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 0.75rem 0.5rem 0.5rem 0.75rem;
          min-width: 0;
          overflow: hidden;
          cursor: pointer;
        }

        .room-name {
          font-weight: 500;
          font-size: var(--paper-font-subhead_-_font-size, 1rem);
          line-height: var(--paper-font-subhead_-_line-height, 1.3);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        @container room-card (min-width: 200px) {
          .room-name {
            white-space: normal;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            word-break: break-word;
          }
        }

        .display-entities {
          font-size: var(--paper-font-caption_-_font-size, 0.875rem);
          font-weight: 400;
          margin-top: 0.125rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
          opacity: 0.8;
        }

        .icon-section {
          grid-area: icon;
          display: flex;
          align-items: flex-end;
          justify-content: flex-start;
          position: relative;
          overflow: visible;
          padding: 0 0 0.25rem 0;
        }

        .icon-container {
          position: relative;
          width: var(--room-card-icon-bg-size, 5.5rem);
          height: var(--room-card-icon-bg-size, 5.5rem);
          margin-left: -0.75rem;
          margin-bottom: -0.75rem;
          flex-shrink: 0;
        }

        .icon-background {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          z-index: 2;
        }

        .icon-background ha-icon {
          --mdc-icon-size: var(--room-card-icon-size, 3.5rem);
          transition: all 0.3s ease;
        }

        .slider-container {
          position: absolute;
          width: var(--room-card-slider-size, 7.5rem);
          height: var(--room-card-slider-size, 7.5rem);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 1;
        }

        .slider-svg {
          width: 100%;
          height: 100%;
          touch-action: none;
          -webkit-tap-highlight-color: transparent;
          pointer-events: none;
          overflow: visible;
        }

        .slider-track {
          fill: none;
          stroke: var(--divider-color, rgb(186, 186, 186));
          stroke-width: 10;
          stroke-linecap: round;
          pointer-events: stroke;
          cursor: pointer;
        }

        .slider-progress {
          fill: none;
          stroke-width: 12;
          stroke-linecap: round;
          transition: stroke 0.2s ease;
          pointer-events: stroke;
          cursor: pointer;
        }

        .slider-thumb {
          transition: r 0.2s ease, filter 0.2s ease;
          pointer-events: none;
        }

        .slider-thumb-hit-area {
          fill: transparent;
          cursor: grab;
          pointer-events: auto;
        }

        .slider-thumb-hit-area:active {
          cursor: grabbing;
        }

        .slider-thumb-icon {
          pointer-events: none;
        }

        .chips-section {
          grid-area: chips;
          display: flex;
          flex-direction: row;
          gap: var(--room-card-chip-gap, 0.5rem);
          padding: 0.625rem 0.625rem 0.625rem 0.25rem;
          align-items: flex-start;
        }

        .chips-column {
          display: flex;
          flex-direction: column;
          gap: var(--room-card-chip-gap, 0.5rem);
        }

        .chip {
          display: flex;
          align-items: center;
          justify-content: center;
          height: var(--room-card-chip-size, 2.5rem);
          width: var(--room-card-chip-size, 2.5rem);
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          flex-shrink: 0;
        }

        .chip ha-icon {
          --mdc-icon-size: var(--room-card-chip-icon-size, 1.5rem);
        }

        .unavailable {
          cursor: not-allowed;
          opacity: var(--state-unavailable-color, 0.6);
        }

        .unavailable:active {
          transform: none;
        }

        @container room-card (max-width: 160px) {
          .title-section {
            padding: 0.5rem 0.375rem 0.375rem 0.5rem;
          }

          .room-name {
            font-size: 0.875rem;
          }
          
          .display-entities {
            font-size: 0.75rem;
          }

          .icon-container {
            width: calc(var(--room-card-icon-bg-size, 5.5rem) * 0.8);
            height: calc(var(--room-card-icon-bg-size, 5.5rem) * 0.8);
            margin-left: -0.5rem;
            margin-bottom: -0.5rem;
          }

          .icon-background ha-icon {
            --mdc-icon-size: calc(var(--room-card-icon-size, 3.5rem) * 0.8);
          }

          .slider-container {
            width: calc(var(--room-card-slider-size, 7.5rem) * 0.8);
            height: calc(var(--room-card-slider-size, 7.5rem) * 0.8);
          }

          .chip {
            height: calc(var(--room-card-chip-size, 2.5rem) * 0.9);
            width: calc(var(--room-card-chip-size, 2.5rem) * 0.9);
          }

          .chip ha-icon {
            --mdc-icon-size: calc(var(--room-card-chip-icon-size, 1.5rem) * 0.85);
          }

          .chips-section {
            gap: calc(var(--room-card-chip-gap, 0.5rem) * 0.75);
            padding: 0.5rem 0.5rem 0.5rem 0.25rem;
          }

          .chips-column {
            gap: calc(var(--room-card-chip-gap, 0.5rem) * 0.75);
          }
        }

        @container room-card (max-width: 120px) {
          .display-entities {
            display: none;
          }

          .room-name {
            font-size: 0.75rem;
          }

          .icon-container {
            width: calc(var(--room-card-icon-bg-size, 5.5rem) * 0.65);
            height: calc(var(--room-card-icon-bg-size, 5.5rem) * 0.65);
          }

          .icon-background ha-icon {
            --mdc-icon-size: calc(var(--room-card-icon-size, 3.5rem) * 0.6);
          }

          .chip {
            height: calc(var(--room-card-chip-size, 2.5rem) * 0.8);
            width: calc(var(--room-card-chip-size, 2.5rem) * 0.8);
          }

          .chip ha-icon {
            --mdc-icon-size: calc(var(--room-card-chip-icon-size, 1.5rem) * 0.75);
          }
        }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'room-card': RoomCard;
  }
}
