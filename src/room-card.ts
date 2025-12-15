import { LitElement, html, TemplateResult, PropertyValues, CSSResultGroup, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  HomeAssistant,
  hasAction,
  handleAction,
  ActionHandlerEvent,
  forwardHaptic,
  LovelaceCardEditor,
} from 'custom-card-helpers';
import { HassEntity } from 'home-assistant-js-websocket';
import { actionHandler } from './action-handler-directive';
import type { RoomCardConfig, DeviceConfig, EntityColorConfig } from './types';
import {
  CARD_VERSION,
  DEFAULT_CHIP_ON_COLOR,
  DEFAULT_CHIP_OFF_COLOR,
  DEFAULT_CHIP_UNAVAILABLE_COLOR,
  DEFAULT_ICON_ON_COLOR,
  DEFAULT_ICON_OFF_COLOR,
  DEFAULT_ICON_UNAVAILABLE_COLOR,
  DEFAULT_SLIDER_TRACK_COLOR,
  DEFAULT_SLIDER_PROGRESS_COLOR,
  HA_DOMAIN_COLORS,
  HA_DOMAIN_ICONS,
  DEFAULT_DEVICE_ATTRIBUTES,
} from './const';
import './editor';

// Console info - standard HA pattern
console.info(
  `%c  ROOM-CARD \n%c  Version ${CARD_VERSION}    `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray'
);

// Register card for picker - standard HA pattern
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'room-card',
  name: 'Room Card',
  description: 'A custom room card with circular slider control',
  preview: true,
  documentationURL: 'https://github.com/liamtw22/room-card',
});

@customElement('room-card')
export class RoomCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config!: RoomCardConfig;
  @state() private currentDeviceIndex = -1;
  @state() private isDragging = false;
  @state() private sliderValue = 0;
  @state() private devices: DeviceConfig[] = [];

  // Slider geometry
  private readonly startAngle = -110;
  private readonly endAngle = 30;
  private readonly totalAngle = 140;
  private actionTaken = false;
  private thumbTapped = false;

  // ========== STATIC METHODS (HA Standard) ==========

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await customElements.whenDefined('room-card-editor');
    return document.createElement('room-card-editor') as LovelaceCardEditor;
  }

  // Standard: Pre-fill with valid entity when card is added
  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): Partial<RoomCardConfig> {
    const lightOrSwitch = entities.find(
      (eid) => eid.startsWith('light.') || eid.startsWith('switch.')
    );
    const tempSensor = entities.find(
      (eid) => eid.startsWith('sensor.') && eid.includes('temperature')
    );

    return {
      area: '',
      name: 'Room',
      background: 'var(--ha-card-background)',
      icon: 'mdi:home',
      display_entity_1: tempSensor || '',
      display_entity_1_unit: '°F',
      haptic_feedback: true,
      devices: lightOrSwitch
        ? [
            {
              entity: lightOrSwitch,
              icon: HA_DOMAIN_ICONS[lightOrSwitch.split('.')[0]] || 'mdi:lightbulb',
            },
          ]
        : [],
    };
  }

  // ========== CONFIGURATION ==========

  public setConfig(config: RoomCardConfig): void {
    if (!config.area && !config.name) {
      throw new Error('You need to define an area or name');
    }

    // Handle backwards compatibility
    const processedConfig = { ...config };
    
    if (config.temperature_sensor && !config.display_entity_1) {
      processedConfig.display_entity_1 = config.temperature_sensor;
      processedConfig.display_entity_1_attribute = 'state';
      processedConfig.display_entity_1_unit = config.temperature_unit === 'C' ? '°C' : '°F';
    }
    if (config.humidity_sensor && !config.display_entity_2) {
      processedConfig.display_entity_2 = config.humidity_sensor;
      processedConfig.display_entity_2_attribute = 'state';
      processedConfig.display_entity_2_unit = '%';
    }

    this._config = {
      ...processedConfig,
      background: processedConfig.background ?? 'var(--ha-card-background)',
      haptic_feedback: processedConfig.haptic_feedback ?? true,
    };

    this._initializeDevices();
  }

  private _initializeDevices(): void {
    if (!this._config) return;

    this.devices = (this._config.devices || []).map((device) => {
      const domain = device.entity?.split('.')[0] || '';
      const defaults = DEFAULT_DEVICE_ATTRIBUTES[domain] || { attribute: 'state', scale: 1 };

      return {
        ...device,
        // Apply domain-based defaults if not specified
        icon: device.icon || HA_DOMAIN_ICONS[domain] || 'mdi:help-circle',
        attribute: device.attribute || defaults.attribute,
        scale: device.scale ?? defaults.scale,
        // Handle backwards compatibility for device colors
        chip_on_color: device.chip_on_color || device.color_on || HA_DOMAIN_COLORS[domain] || DEFAULT_CHIP_ON_COLOR,
        chip_off_color: device.chip_off_color || device.color_off || DEFAULT_CHIP_OFF_COLOR,
        chip_unavailable_color: device.chip_unavailable_color || device.color_unavailable || DEFAULT_CHIP_UNAVAILABLE_COLOR,
        icon_on_color: device.icon_on_color || device.icon_color || DEFAULT_ICON_ON_COLOR,
        icon_off_color: device.icon_off_color || DEFAULT_ICON_OFF_COLOR,
        icon_unavailable_color: device.icon_unavailable_color || DEFAULT_ICON_UNAVAILABLE_COLOR,
      };
    });
  }

  // ========== SIZING (HA Standard) ==========

  public getCardSize(): number {
    return 3;
  }

  // Standard: Support for Sections view resizing
  public getGridOptions() {
    return {
      columns: 6,
      rows: 3,
      min_columns: 3,
      min_rows: 2,
    };
  }

  // ========== LIFECYCLE & PERFORMANCE ==========

  // Standard: Optimize re-renders - only update when relevant entities change
  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.has('_config')) {
      return true;
    }

    if (changedProps.has('hass')) {
      const oldHass = changedProps.get('hass') as HomeAssistant | undefined;
      if (!oldHass || !this.hass || !this._config) {
        return true;
      }

      // Collect all entities this card depends on
      const entitiesToCheck: string[] = [];

      if (this._config.display_entity_1) {
        entitiesToCheck.push(this._config.display_entity_1);
      }
      if (this._config.display_entity_2) {
        entitiesToCheck.push(this._config.display_entity_2);
      }

      // Device entities
      this.devices.forEach((device) => {
        if (device.entity) entitiesToCheck.push(device.entity);
        if (device.control_entity) entitiesToCheck.push(device.control_entity);
      });

      // Dynamic color entities
      if (typeof this._config.background === 'object' && this._config.background?.entity) {
        entitiesToCheck.push(this._config.background.entity);
      }
      if (typeof this._config.icon_color === 'object' && this._config.icon_color?.entity) {
        entitiesToCheck.push(this._config.icon_color.entity);
      }
      if (typeof this._config.icon_background === 'object' && this._config.icon_background?.entity) {
        entitiesToCheck.push(this._config.icon_background.entity);
      }

      // Only update if relevant entities changed
      for (const entityId of entitiesToCheck) {
        if (oldHass.states[entityId] !== this.hass.states[entityId]) {
          this.updateCurrentDevice();
          this.updateSliderValue();
          return true;
        }
      }

      return false;
    }

    return true;
  }

  // ========== ACTION HANDLING (Tile Card Standard) ==========

  private _handleAction(ev: ActionHandlerEvent, actionConfig: any): void {
    if (!this.hass || !actionConfig || !ev.detail?.action) return;

    // Standard: Forward haptic feedback
    if (this._config.haptic_feedback) {
      forwardHaptic('light');
    }

    handleAction(this, this.hass, actionConfig, ev.detail.action);
  }

  private _handleCardAction(ev: ActionHandlerEvent): void {
    // Don't trigger card action if clicking on interactive elements
    const target = ev.target as HTMLElement;
    if (
      target.closest('.icon-background') ||
      target.closest('.chip') ||
      target.closest('.slider-svg') ||
      target.closest('.title-section')
    ) {
      return;
    }

    const config = {
      tap_action: this._config.tap_action || { action: 'more-info' },
      hold_action: this._config.hold_action,
      double_tap_action: this._config.double_tap_action,
    };

    this._handleAction(ev, config);
  }

  private _handleTitleAction(ev: ActionHandlerEvent): void {
    ev.stopPropagation();
    
    const config = {
      tap_action: this._config.title_tap_action || {
        action: 'navigate',
        navigation_path: this._config.area ? `/config/areas/area/${this._config.area}` : undefined,
      },
      hold_action: this._config.title_hold_action,
      double_tap_action: this._config.title_double_tap_action,
    };

    this._handleAction(ev, config);
  }

  private _handleIconAction(ev: ActionHandlerEvent): void {
    ev.stopPropagation();

    // Default: cycle through active devices
    if (!this._config.icon_tap_action && !this._config.icon_hold_action) {
      if (ev.detail?.action === 'tap') {
        this.handleIconClick();
        return;
      }
    }

    const config = {
      tap_action: this._config.icon_tap_action || { action: 'none' },
      hold_action: this._config.icon_hold_action,
      double_tap_action: this._config.icon_double_tap_action,
    };

    this._handleAction(ev, config);
  }

  private _handleChipAction(ev: ActionHandlerEvent, device: DeviceConfig, index: number): void {
    ev.stopPropagation();

    // Default: toggle the device
    if (!device.tap_action && !device.hold_action) {
      if (ev.detail?.action === 'tap') {
        this.handleChipClick(index);
        return;
      }
    }

    const config = {
      entity: device.entity,
      tap_action: device.tap_action || { action: 'toggle' },
      hold_action: device.hold_action || { action: 'more-info' },
      double_tap_action: device.double_tap_action,
    };

    this._handleAction(ev, config);
  }

  // ========== HELPER METHODS ==========

  private getAreaName(): string {
    if (!this.hass || !this._config) return this._config?.area || '';
    if (this._config.name) return this._config.name;

    const areas = (this.hass as any).areas;
    if (areas && this._config.area) {
      const area = areas[this._config.area];
      return area?.name || this._config.area;
    }
    return this._config.area || '';
  }

  private updateCurrentDevice(): void {
    if (!this.hass) return;

    if (this.currentDeviceIndex === -1) {
      // Find first active device
      for (let i = 0; i < this.devices.length; i++) {
        const device = this.devices[i];
        const entity = this.hass.states[device.control_entity || device.entity];
        if (entity && (entity.state === 'on' || entity.state === 'playing')) {
          this.currentDeviceIndex = i;
          break;
        }
      }
    }
  }

  private updateSliderValue(): void {
    if (!this.hass || this.currentDeviceIndex === -1) return;

    const device = this.devices[this.currentDeviceIndex];
    if (!device) return;

    const controlEntity = device.control_entity || device.entity;
    const entity = this.hass.states[controlEntity];
    if (!entity) return;

    const attribute = device.attribute || 'brightness';
    const scale = device.scale || 1;

    let value: number;
    if (attribute === 'state') {
      value = entity.state === 'on' || entity.state === 'playing' ? 100 : 0;
    } else {
      const attrValue = entity.attributes[attribute];
      value = attrValue !== undefined ? Number(attrValue) / scale : 0;
    }

    this.sliderValue = Math.max(0, Math.min(1, value / 100));
  }

  private handleIconClick(): void {
    if (!this.hass || this.isDragging) return;

    if (this._config.haptic_feedback) {
      forwardHaptic('light');
    }

    const startIndex = this.currentDeviceIndex;
    let nextIndex = (startIndex + 1) % this.devices.length;
    let found = false;

    for (let i = 0; i < this.devices.length; i++) {
      const device = this.devices[nextIndex];
      const entity = this.hass.states[device.control_entity || device.entity];

      if (entity && (entity.state === 'on' || entity.state === 'playing')) {
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

  private handleChipClick(index: number): void {
    if (!this.hass) return;

    if (this._config.haptic_feedback) {
      forwardHaptic('light');
    }

    const device = this.devices[index];
    const entity = this.hass.states[device.entity];
    if (!entity) return;

    const isOn = entity.state === 'on' || entity.state === 'playing';
    const domain = device.entity.split('.')[0];

    this.hass.callService(domain, isOn ? 'turn_off' : 'turn_on', {
      entity_id: device.entity,
    });

    if (isOn && this.currentDeviceIndex === index) {
      this.currentDeviceIndex = -1;
      setTimeout(() => {
        this.updateCurrentDevice();
        this.updateSliderValue();
        this.requestUpdate();
      }, 100);
    } else if (!isOn) {
      this.currentDeviceIndex = index;
      setTimeout(() => {
        this.updateSliderValue();
        this.requestUpdate();
      }, 100);
    }
  }

  // ========== COLOR HELPERS ==========

  private getBackgroundColor(): string {
    if (!this.hass || !this._config) return 'var(--ha-card-background)';

    const background = this._config.background;

    if (background === undefined || background === null) {
      return 'var(--ha-card-background)';
    }

    if (background === '') {
      return '';
    }

    if (typeof background === 'string') {
      return background;
    }

    return this._getEntityBasedColor(background as EntityColorConfig, 'var(--ha-card-background)');
  }

  private _getEntityBasedColor(config: EntityColorConfig, fallback: string): string {
    if (!config.entity) return fallback;

    const entity = this.hass.states[config.entity];
    if (!entity) return fallback;

    if (config.ranges && config.ranges.length > 0) {
      const attrValue = config.attribute ? entity.attributes[config.attribute] : entity.state;
      const value = parseFloat(String(attrValue));

      if (!isNaN(value)) {
        for (const range of config.ranges) {
          if (range.min !== undefined && range.max !== undefined && value >= range.min && value <= range.max) {
            return range.color;
          }
        }
      }

      // Check state-based ranges
      for (const range of config.ranges) {
        if (range.state && entity.state === range.state) {
          return range.color;
        }
      }
    }

    return fallback;
  }

  private getIconColor(): string {
    if (!this.hass || !this._config) return 'var(--primary-text-color)';

    const iconColor = this._config.icon_color;
    if (!iconColor) return 'var(--primary-text-color)';

    if (typeof iconColor === 'string') {
      return iconColor;
    }

    return this._getEntityBasedColor(iconColor as EntityColorConfig, 'var(--primary-text-color)');
  }

  private getIconBackgroundColor(): string {
    if (!this.hass || !this._config) return 'rgba(var(--rgb-primary-text-color), 0.1)';

    const iconBg = this._config.icon_background;
    if (!iconBg) return 'rgba(var(--rgb-primary-text-color), 0.1)';

    if (typeof iconBg === 'string') {
      return iconBg;
    }

    return this._getEntityBasedColor(iconBg as EntityColorConfig, 'rgba(var(--rgb-primary-text-color), 0.1)');
  }

  private getChipColor(device: DeviceConfig, entityId: string): string {
    const entity = this.hass?.states[entityId];
    if (!entity || entity.state === 'unavailable') {
      return device.chip_unavailable_color || DEFAULT_CHIP_UNAVAILABLE_COLOR;
    }

    const isOn = entity.state === 'on' || entity.state === 'playing';
    return isOn ? (device.chip_on_color || DEFAULT_CHIP_ON_COLOR) : (device.chip_off_color || DEFAULT_CHIP_OFF_COLOR);
  }

  private getChipIconColor(device: DeviceConfig, entityId: string): string {
    const entity = this.hass?.states[entityId];
    if (!entity || entity.state === 'unavailable') {
      return device.icon_unavailable_color || DEFAULT_ICON_UNAVAILABLE_COLOR;
    }

    const isOn = entity.state === 'on' || entity.state === 'playing';
    return isOn ? (device.icon_on_color || DEFAULT_ICON_ON_COLOR) : (device.icon_off_color || DEFAULT_ICON_OFF_COLOR);
  }

  private getSliderColor(device: DeviceConfig, entity: HassEntity | undefined): string {
    if (!entity) return DEFAULT_SLIDER_PROGRESS_COLOR;
    
    // Use domain color if available
    const domain = device.entity.split('.')[0];
    return HA_DOMAIN_COLORS[domain] || device.chip_on_color || DEFAULT_SLIDER_PROGRESS_COLOR;
  }

  // ========== DISPLAY HELPERS ==========

  private getDisplayText(): string {
    if (!this.hass || !this._config) return '';

    const parts: string[] = [];

    // Display entity 1
    if (this._config.display_entity_1) {
      const entity = this.hass.states[this._config.display_entity_1];
      if (entity) {
        const attribute = this._config.display_entity_1_attribute || 'state';
        let value: string | number = attribute === 'state' ? entity.state : entity.attributes[attribute];

        if (value !== undefined) {
          const numValue = parseFloat(String(value));
          if (!isNaN(numValue)) {
            value = numValue.toFixed(1);
          }
          const unit = this._config.display_entity_1_unit || '';
          parts.push(`${value}${unit}`);
        }
      }
    }

    // Display entity 2
    if (this._config.display_entity_2) {
      const entity = this.hass.states[this._config.display_entity_2];
      if (entity) {
        const attribute = this._config.display_entity_2_attribute || 'state';
        let value: string | number = attribute === 'state' ? entity.state : entity.attributes[attribute];

        if (value !== undefined) {
          const numValue = parseFloat(String(value));
          if (!isNaN(numValue)) {
            value = numValue.toFixed(1);
          }
          const unit = this._config.display_entity_2_unit || '';
          parts.push(`${value}${unit}`);
        }
      }
    }

    return parts.join(' / ');
  }

  // ========== SLIDER METHODS ==========

  private degreesToRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  private angleToValue(angleDegrees: number): number {
    let angleFromStart = angleDegrees - this.startAngle;
    if (angleFromStart < 0) angleFromStart += 360;
    if (angleFromStart > this.totalAngle + 30) {
      return angleFromStart > 180 ? 0 : 1;
    }
    return Math.max(0, Math.min(1, angleFromStart / this.totalAngle));
  }

  private valueToAngle(value: number): number {
    return this.startAngle + value * this.totalAngle;
  }

  private handlePointerDown(e: PointerEvent): void {
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

    const distanceToThumb = Math.sqrt((e.clientX - thumbX) ** 2 + (e.clientY - thumbY) ** 2);

    this.thumbTapped = distanceToThumb <= 30;
    this.isDragging = true;
    this.actionTaken = true;

    if (!this.thumbTapped) {
      this.handlePointerMove(e);
    }
  }

  private handlePointerMove(e: PointerEvent): void {
    if (!this.isDragging) return;

    const svg = e.currentTarget as SVGElement;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const angleRad = Math.atan2(dy, dx);
    const angleDeg = (angleRad * 180) / Math.PI;

    this.sliderValue = this.angleToValue(angleDeg);
    this.updateVisualOnly();
  }

  private handlePointerUp(e: PointerEvent): void {
    if (!this.isDragging) return;

    const svg = e.currentTarget as SVGElement;
    if (svg) {
      svg.releasePointerCapture(e.pointerId);
    }

    this.isDragging = false;

    if (this._config.haptic_feedback) {
      forwardHaptic('light');
    }

    // Update the actual device
    this.updateDeviceFromSlider();

    setTimeout(() => {
      this.actionTaken = false;
    }, 100);
  }

  private updateVisualOnly(): void {
    const progressEl = this.shadowRoot?.querySelector('.slider-progress') as SVGPathElement;
    const thumbEl = this.shadowRoot?.querySelector('.slider-thumb') as SVGCircleElement;
    const thumbHitArea = this.shadowRoot?.querySelector('.slider-thumb-hit-area') as SVGCircleElement;
    const thumbIcon = this.shadowRoot?.querySelector('.slider-thumb-icon') as SVGForeignObjectElement;

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

  private updateDeviceFromSlider(): void {
    if (!this.hass || this.currentDeviceIndex === -1) return;

    const device = this.devices[this.currentDeviceIndex];
    if (!device) return;

    const controlEntity = device.control_entity || device.entity;
    const entity = this.hass.states[controlEntity];
    if (!entity) return;

    // Check if using action-based slider control
    if (device.slider_control_type === 'action' && device.slider_modes && device.slider_modes.length > 0) {
      this.handleActionBasedSlider(device);
      return;
    }

    // Standard attribute-based control
    const domain = controlEntity.split('.')[0];
    const attribute = device.attribute || 'brightness';
    const scale = device.scale || 1;
    const newValue = Math.round(this.sliderValue * 100 * scale);

    // Build service call based on domain and attribute
    if (domain === 'light') {
      this.hass.callService('light', 'turn_on', {
        entity_id: controlEntity,
        [attribute]: Math.max(1, newValue),
      });
    } else if (domain === 'media_player') {
      this.hass.callService('media_player', 'volume_set', {
        entity_id: controlEntity,
        volume_level: this.sliderValue,
      });
    } else if (domain === 'fan') {
      this.hass.callService('fan', 'set_percentage', {
        entity_id: controlEntity,
        percentage: Math.round(this.sliderValue * 100),
      });
    } else if (domain === 'cover') {
      this.hass.callService('cover', 'set_cover_position', {
        entity_id: controlEntity,
        position: Math.round(this.sliderValue * 100),
      });
    }
  }

  private handleActionBasedSlider(device: DeviceConfig): void {
    if (!device.slider_modes || device.slider_modes.length === 0) return;

    const sliderPercent = this.sliderValue * 100;

    // Find the closest mode based on slider position
    let closestMode = device.slider_modes[0];
    let closestDistance = Math.abs(sliderPercent - closestMode.position);

    for (const mode of device.slider_modes) {
      const distance = Math.abs(sliderPercent - mode.position);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestMode = mode;
      }
    }

    // Snap slider to the closest mode position
    this.sliderValue = closestMode.position / 100;
    this.updateVisualOnly();

    // Execute the action if defined
    if (closestMode.action && this.hass) {
      handleAction(this, this.hass, { tap_action: closestMode.action }, 'tap');
    }
  }

  // ========== RENDER ==========

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    const roomName = this.getAreaName();
    const backgroundColor = this.getBackgroundColor();
    const iconColor = this.getIconColor();
    const iconBackgroundColor = this.getIconBackgroundColor();
    const displayText = this.getDisplayText();

    const roomNameColor = this._config.room_name_color || 'var(--primary-text-color)';
    const roomNameSize = this._config.room_name_size || '1.125rem';
    const displayEntityColor = this._config.display_entity_color || 'var(--secondary-text-color)';
    const displayEntitySize = this._config.display_entity_size || '0.875rem';

    // Slider calculations
    const hasActiveDevice = this.currentDeviceIndex !== -1;
    const currentDevice = hasActiveDevice ? this.devices[this.currentDeviceIndex] : null;
    const deviceEntity = currentDevice ? this.hass.states[currentDevice.control_entity || currentDevice.entity] : null;
    const isDeviceOn = deviceEntity && (deviceEntity.state === 'on' || deviceEntity.state === 'playing');
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

    let sliderColor = DEFAULT_SLIDER_PROGRESS_COLOR;
    if (currentDevice) {
      sliderColor = this.getSliderColor(currentDevice, deviceEntity || undefined);
    }

    // Chip columns
    const chipColumns = this._config.chip_columns || 1;
    const deviceColumns: DeviceConfig[][] = [];
    const visibleDevices = this.devices.filter((d) => d.show_chip !== false);

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

    return html`
      <div
        class="card-container"
        style="background-color: ${backgroundColor};"
        @action=${this._handleCardAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config.hold_action),
          hasDoubleClick: hasAction(this._config.double_tap_action),
        })}
      >
        <div class="main-content">
          <div
            class="title-section"
            @action=${this._handleTitleAction}
            .actionHandler=${actionHandler({
              hasHold: hasAction(this._config.title_hold_action),
              hasDoubleClick: hasAction(this._config.title_double_tap_action),
            })}
          >
            <div class="room-name" style="color: ${roomNameColor}; font-size: ${roomNameSize}">
              ${roomName}
            </div>
            ${displayText
              ? html`
                  <div class="display-entities" style="color: ${displayEntityColor}; font-size: ${displayEntitySize}">
                    ${displayText}
                  </div>
                `
              : nothing}
          </div>

          <div class="icon-section">
            <div class="icon-container">
              <div
                class="icon-background"
                style="background-color: ${iconBackgroundColor};"
                role="button"
                tabindex="0"
                @action=${this._handleIconAction}
                .actionHandler=${actionHandler({
                  hasHold: hasAction(this._config.icon_hold_action),
                  hasDoubleClick: hasAction(this._config.icon_double_tap_action),
                })}
              >
                <ha-icon icon="${this._config.icon || 'mdi:home'}" style="color: ${iconColor}"></ha-icon>
              </div>

              ${isDeviceOn && hasActiveDevice && currentDevice && showSlider
                ? html`
                    <div class="slider-container">
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
                        <circle class="slider-thumb-hit-area" cx="${thumbX}" cy="${thumbY}" r="25" />
                        <foreignObject
                          x="${thumbX - 10}"
                          y="${thumbY - 10}"
                          width="20"
                          height="20"
                          class="slider-thumb-icon"
                        >
                          <div
                            xmlns="http://www.w3.org/1999/xhtml"
                            style="display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; pointer-events: none;"
                          >
                            <ha-icon
                              icon="${currentDevice.icon}"
                              style="--mdc-icon-size: 18px; color: ${currentDevice.icon_on_color || DEFAULT_ICON_ON_COLOR};"
                            ></ha-icon>
                          </div>
                        </foreignObject>
                      </svg>
                    </div>
                  `
                : nothing}
            </div>
          </div>
        </div>

        <div class="chips-section">
          ${deviceColumns.map(
            (column) => html`
              <div class="chips-column">
                ${column.map((device) => {
                  const deviceIndex = this.devices.indexOf(device);
                  const controlEntity = device.control_entity || device.entity;
                  const entity = this.hass.states[controlEntity];
                  const isOn = entity && (entity.state === 'on' || entity.state === 'playing');
                  const isUnavailable = !entity || entity.state === 'unavailable';
                  const chipColor = this.getChipColor(device, controlEntity);
                  const chipIconColor = this.getChipIconColor(device, controlEntity);

                  return html`
                    <div
                      class="chip ${isUnavailable ? 'unavailable' : ''} ${isOn ? 'on' : 'off'}"
                      style="background-color: ${chipColor};"
                      role="button"
                      tabindex="0"
                      @action=${(ev: ActionHandlerEvent) => this._handleChipAction(ev, device, deviceIndex)}
                      .actionHandler=${actionHandler({
                        hasHold: hasAction(device.hold_action),
                        hasDoubleClick: hasAction(device.double_tap_action),
                      })}
                    >
                      <ha-icon icon="${device.icon}" style="color: ${chipIconColor};"></ha-icon>
                    </div>
                  `;
                })}
              </div>
            `
          )}
        </div>
      </div>
    `;
  }

  // ========== STYLES ==========
  // Using CSS variables for HA theme integration
  // Using rem/em for responsive scaling (fixes iOS zoom issues)
  // Using min-width: 0 on flex children (fixes iOS overflow issues)

  static get styles(): CSSResultGroup {
    return css`
      /* Standard: box-sizing for all elements */
      :host {
        display: block;
        box-sizing: border-box;
      }

      *,
      *:before,
      *:after {
        box-sizing: inherit;
      }

      /* Main container - using CSS Grid for flexible layout */
      .card-container {
        height: 100%;
        min-height: 10rem;
        border-radius: var(--ha-card-border-radius, 1.375rem);
        display: grid;
        grid-template-areas:
          'title chips'
          'icon chips';
        grid-template-rows: min-content 1fr;
        grid-template-columns: 1fr min-content;
        position: relative;
        transition: background-color 0.3s ease;
        cursor: pointer;
        user-select: none;
        -webkit-user-select: none;
        overflow: hidden;
      }

      .main-content {
        grid-column: 1;
        grid-row: 1 / -1;
        display: contents;
      }

      /* Title section - responsive font sizes */
      .title-section {
        grid-area: title;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        padding: 0.9375rem 0 0 0.9375rem;
        min-width: 0; /* Critical for iOS flex overflow */
        cursor: pointer;
      }

      .room-name {
        font-weight: 500;
        font-size: 1rem;
        line-height: 1.3;
        word-wrap: break-word;
        overflow-wrap: break-word;
        max-width: calc(100% - 3rem);
      }

      .display-entities {
        font-weight: 400;
        margin-top: 0.125rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }

      /* Icon section */
      .icon-section {
        grid-area: icon;
        display: flex;
        align-items: flex-end;
        justify-content: flex-start;
        position: relative;
        padding-bottom: 0.5rem;
        overflow: visible;
        min-width: 0;
      }

      .icon-container {
        position: relative;
        width: 6.875rem;
        height: 6.875rem;
        margin-left: -0.625rem;
        margin-bottom: -0.75rem;
        flex-shrink: 0;
      }

      .icon-background {
        position: absolute;
        width: 6.875rem;
        height: 6.875rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
        z-index: 1;
      }

      .icon-background:focus {
        outline: none;
      }

      .icon-background:focus-visible {
        box-shadow: 0 0 0 2px var(--primary-color);
      }

      .icon-background ha-icon {
        --mdc-icon-size: 4.6875rem;
        transition: all 0.3s ease;
      }

      /* Slider */
      .slider-container {
        position: absolute;
        width: 9.375rem;
        height: 9.375rem;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        z-index: 2;
      }

      .slider-svg {
        width: 100%;
        height: 100%;
        touch-action: none;
        -webkit-tap-highlight-color: transparent;
        pointer-events: auto;
        cursor: pointer;
      }

      .slider-track {
        fill: none;
        stroke: var(--disabled-color, rgb(186, 186, 186));
        stroke-width: 10;
        stroke-linecap: round;
        pointer-events: stroke;
      }

      .slider-progress {
        fill: none;
        stroke-width: 12;
        stroke-linecap: round;
        transition: stroke 0.2s ease;
        pointer-events: stroke;
      }

      .slider-thumb {
        transition: r 0.2s ease, filter 0.2s ease;
        cursor: grab;
        pointer-events: none;
      }

      .slider-thumb.dragging {
        cursor: grabbing;
        filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.3));
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

      /* Chips section */
      .chips-section {
        grid-area: chips;
        display: flex;
        flex-direction: row;
        gap: 0.375rem;
        padding: 0.5rem 0.5rem 0.5rem 0;
        min-width: 0;
      }

      .chips-column {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
      }

      .chip {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 2.5rem;
        width: 2.5rem;
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
        flex-shrink: 0;
      }

      /* Larger chips on mobile/touch devices */
      @media (max-width: 600px), (hover: none) and (pointer: coarse) {
        .chip {
          height: 2.875rem;
          width: 2.875rem;
        }

        .chip ha-icon {
          --mdc-icon-size: 1.75rem;
        }
      }

      .chip:focus {
        outline: none;
      }

      .chip:focus-visible {
        box-shadow: 0 0 0 2px var(--primary-color);
      }

      .chip:active {
        transform: scale(0.95);
      }

      .chip ha-icon {
        --mdc-icon-size: 1.5625rem;
      }

      .chip.unavailable {
        cursor: not-allowed;
        opacity: 0.6;
      }

      .chip.unavailable:active {
        transform: none;
      }

      /* Ripple effect for interactive elements */
      .icon-background::after,
      .chip::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: currentColor;
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      .icon-background:active::after,
      .chip:active::after {
        opacity: 0.1;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'room-card': RoomCard;
  }
}
