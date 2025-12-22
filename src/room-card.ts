import { LitElement, html, TemplateResult, PropertyValues, CSSResultGroup, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, forwardHaptic } from 'custom-card-helpers';
import { HassEntity } from 'home-assistant-js-websocket';

import type { RoomCardConfig, DeviceConfig } from './types';
import { CARD_VERSION, DEFAULT_FONT_COLOR, DEFAULT_CHIP_ON_COLOR, DEFAULT_CHIP_OFF_COLOR, DEFAULT_CHIP_UNAVAILABLE_COLOR, DEFAULT_ICON_ON_COLOR, DEFAULT_ICON_OFF_COLOR, DEFAULT_ICON_UNAVAILABLE_COLOR } from './const';
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

  public static getConfigElement() {
    return document.createElement('room-card-editor');
  }

  public static getLayoutOptions() {
    return {
      grid_columns: 3,
      grid_rows: 2,
      grid_min_columns: 3,
      grid_min_rows: 2,
    };
  }

  public static getStubConfig(): Partial<RoomCardConfig> {
    return {
      area: '',
      name: '',
      background: 'var(--ha-card-background)',
      icon: 'mdi:home',
      display_entity_1: '',
      display_entity_2: '',
      haptic_feedback: true,
      devices: [],
      // Layout requirements - minimum 3 wide x 2 tall
      layout_options: {
        grid_columns: 3,
        grid_rows: 2,
        grid_min_columns: 3,
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
      background: config.background !== undefined ? config.background : 'var(--ha-card-background)',
    };
    this.devices = config.devices || [];
  }

  public getLayoutOptions() {
    // Return layout options from config or defaults
    return this._config?.layout_options || {
      grid_columns: 3,
      grid_rows: 2,
      grid_min_columns: 3,
      grid_min_rows: 2,
    };
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
    if (device.type === "discrete" && device.modes) {
      const modes = device.modes;
      const domain = device.entity.split('.')[0];

      if (domain === "fan" || domain === "climate") {
        const currentPreset = entity.attributes.preset_mode;
        const mode = modes.find(m => m.label === currentPreset);
        return mode ? mode.value : 0;
      }
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

  private handleCardClick(e: Event) {
    if (this.actionTaken) {
      this.actionTaken = false;
      return;
    }

    const target = e.target as HTMLElement;
    if (target.closest('.chip') || target.closest('.icon-background') || target.closest('.slider-svg')) {
      return;
    }

    const areaId = this._config.area;
    if (areaId) {
      window.history.pushState(null, '', `/config/areas/area/${areaId}`);
      window.dispatchEvent(new CustomEvent('location-changed'));
    }
  }

  private handleIconClick(e: Event) {
    e.stopPropagation();
    this.actionTaken = true;

    if (this._config.haptic_feedback !== false) {
      forwardHaptic('light');
    }

    const areaId = this._config.area;
    if (areaId) {
      window.history.pushState(null, '', `/config/areas/area/${areaId}`);
      window.dispatchEvent(new CustomEvent('location-changed'));
    }
  }

  private handleChipClick(deviceIndex: number) {
    this.actionTaken = true;
    const device = this.devices[deviceIndex];
    const controlEntity = device.control_entity || device.entity;
    const entity = this.hass.states[controlEntity];

    if (!entity || entity.state === 'unavailable') {
      return;
    }

    if (this._config.haptic_feedback !== false) {
      forwardHaptic('light');
    }

    const isOn = entity.state === "on" || entity.state === "playing";

    if (this.currentDeviceIndex === deviceIndex && isOn) {
      this.currentDeviceIndex = -1;
    } else if (isOn) {
      this.currentDeviceIndex = deviceIndex;
      this.sliderValue = this.getEntityValue(entity, device);
    } else {
      const domain = controlEntity.split('.')[0];
      this.hass.callService(domain, 'turn_on', {
        entity_id: controlEntity,
      });
      this.currentDeviceIndex = deviceIndex;
    }
  }

  private getChipColor(device: DeviceConfig, entityId: string): string {
    const entity = this.hass.states[entityId];

    if (!entity || entity.state === 'unavailable') {
      return device.chip_unavailable_color || DEFAULT_CHIP_UNAVAILABLE_COLOR;
    }

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

    const isOn = entity.state === "on" || entity.state === "playing";

    if (isOn) {
      return device.icon_on_color || DEFAULT_ICON_ON_COLOR;
    } else {
      return device.icon_off_color || DEFAULT_ICON_OFF_COLOR;
    }
  }

  private getSliderColor(device: DeviceConfig, entity: HassEntity | undefined): string {
    if (!entity || entity.state === 'unavailable') {
      return device.chip_unavailable_color || DEFAULT_CHIP_UNAVAILABLE_COLOR;
    }
    return device.chip_on_color || '#2196F3';
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

    if (this._config.haptic_feedback !== false) {
      forwardHaptic('selection');
    }
  }

  private handlePointerUp(e: PointerEvent) {
    if (!this.isDragging) return;

    const svg = e.currentTarget as SVGElement;
    if (svg) {
      svg.releasePointerCapture(e.pointerId);
    }

    this.isDragging = false;
    this.updateDeviceValue();
  }

  private updateDeviceValue() {
    if (this.currentDeviceIndex === -1) return;

    const currentDevice = this.devices[this.currentDeviceIndex];
    if (!currentDevice) return;

    const controlEntity = currentDevice.control_entity || currentDevice.entity;
    const value = this.sliderValue;
    const domain = controlEntity.split('.')[0];

    if (currentDevice.type === "discrete" && currentDevice.modes) {
      const modes = currentDevice.modes;
      let selectedMode = modes[0];
      let minDiff = Math.abs(value - modes[0].value);

      for (let i = 1; i < modes.length; i++) {
        const diff = Math.abs(value - modes[i].value);
        if (diff < minDiff) {
          minDiff = diff;
          selectedMode = modes[i];
        }
      }

      if (domain === "fan" || domain === "climate") {
        this.hass.callService(domain, "set_preset_mode", {
          entity_id: controlEntity,
          preset_mode: selectedMode.label,
        });
      }
    } else {
      const actualValue = Math.round(value * (currentDevice.scale || 255));
      if (domain === "light") {
        this.hass.callService(domain, "turn_on", {
          entity_id: controlEntity,
          brightness: actualValue,
        });
      } else if (domain === "media_player") {
        this.hass.callService(domain, "volume_set", {
          entity_id: controlEntity,
          volume_level: value,
        });
      } else if (domain === "fan") {
        this.hass.callService(domain, "set_percentage", {
          entity_id: controlEntity,
          percentage: actualValue,
        });
      } else if (domain === "cover") {
        this.hass.callService(domain, "set_cover_position", {
          entity_id: controlEntity,
          position: actualValue,
        });
      }
    }
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
    } else if (typeof background === 'object' && background.entity) {
      const entity = this.hass.states[background.entity];
      if (!entity) return "var(--ha-card-background)";

      if (background.ranges && background.ranges.length > 0) {
        const value = parseFloat(entity.state);

        if (!isNaN(value)) {
          for (const range of background.ranges) {
            if (range.min !== undefined && range.max !== undefined &&
                value >= range.min && value <= range.max) {
              return range.color;
            }
          }
        }

        for (const range of background.ranges) {
          if (range.state && entity.state === range.state) {
            return range.color;
          }
        }
      }

      return "var(--ha-card-background)";
    }

    return "var(--ha-card-background)";
  }

  private getIconColor(): string {
    if (!this.hass || !this._config) return "#FFFFFF";

    const iconColor = this._config.icon_color;
    if (!iconColor) return "#FFFFFF";

    if (typeof iconColor === 'string') {
      return iconColor;
    } else if (typeof iconColor === 'object' && iconColor.entity) {
      const entity = this.hass.states[iconColor.entity];
      if (entity && iconColor.ranges) {
        const value = parseFloat(entity.state);
        if (!isNaN(value)) {
          for (const range of iconColor.ranges) {
            if (range.min !== undefined && range.max !== undefined &&
                value >= range.min && value <= range.max) {
              return range.color;
            }
          }
        }

        for (const range of iconColor.ranges) {
          if (range.state && entity.state === range.state) {
            return range.color;
          }
        }
      }
    }

    return "#FFFFFF";
  }

  private getIconBackgroundColor(): string {
    if (!this.hass || !this._config) return "rgba(255, 255, 255, 0.2)";

    const iconBackground = this._config.icon_background;
    if (!iconBackground) return "rgba(255, 255, 255, 0.2)";

    if (typeof iconBackground === 'string') {
      return iconBackground;
    } else if (typeof iconBackground === 'object' && iconBackground.entity) {
      const entity = this.hass.states[iconBackground.entity];
      if (entity && iconBackground.ranges) {
        const value = parseFloat(entity.state);
        if (!isNaN(value)) {
          for (const range of iconBackground.ranges) {
            if (range.min !== undefined && range.max !== undefined &&
                value >= range.min && value <= range.max) {
              return range.color;
            }
          }
        }

        for (const range of iconBackground.ranges) {
          if (range.state && entity.state === range.state) {
            return range.color;
          }
        }
      }
    }

    return "rgba(255, 255, 255, 0.2)";
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

    const roomNameColor = this._config.room_name_color || DEFAULT_FONT_COLOR;
    const roomNameSize = this._config.room_name_size || 'clamp(0.75rem, 3.5cqi, 1rem)';
    const displayEntityColor = this._config.display_entity_color || DEFAULT_FONT_COLOR;
    const displayEntitySize = this._config.display_entity_size || 'clamp(0.65rem, 3cqi, 0.85rem)';

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

    let sliderColor = '#2196F3';
    if (currentDevice) {
      sliderColor = this.getSliderColor(currentDevice, deviceEntity);
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

    return html`
      <div
        class="card-container"
        style="background-color: ${backgroundColor};"
        @click=${this.handleCardClick}
      >
        <div class="main-content">
          <div class="title-section">
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
              <div class="icon-background"
                   style="background-color: ${iconBackgroundColor};"
                   @click=${this.handleIconClick}>
                <ha-icon icon="${this._config.icon || 'mdi:home'}" style="color: ${iconColor}"></ha-icon>
              </div>

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
                      <ha-icon icon="${currentDevice.icon}" style="--mdc-icon-size: 18px; color: ${currentDevice.icon_on_color || DEFAULT_ICON_ON_COLOR};"></ha-icon>
                    </div>
                  </foreignObject>
                </svg>
              </div>
              ` : ''}
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
                const iconColor = this.getChipIconColor(device, controlEntity);

                return html`
                  <div
                    class="chip ${isUnavailable ? 'unavailable' : ''} ${isOn ? 'on' : 'off'}"
                    style="background-color: ${chipColor};"
                    @click=${() => this.handleChipClick(deviceIndex)}
                  >
                    <ha-icon icon="${device.icon}" style="color: ${iconColor};"></ha-icon>
                  </div>
                `;
              })}
            </div>
          `)}
        </div>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
        :host {
          display: block;
          /* Fill available space - no aspect-ratio constraint */
          height: 100%;
          width: 100%;
          /* Minimum size requirements */
          min-height: 140px;
          min-width: 120px;
          container-type: inline-size;
          container-name: room-card;
        }

        .card-container {
          height: 100%;
          width: 100%;
          border-radius: clamp(1rem, 4cqi, 1.5rem);
          display: grid;
          grid-template-areas:
            "title chips"
            "icon chips";
          /* Title takes minimum needed, icon section fills remaining space */
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
          padding: 0.75rem 0.5rem 0 0.75rem;
          min-width: 0;
          overflow: hidden;
        }

        .room-name {
          font-weight: 500;
          font-size: clamp(0.8rem, 3.5cqi, 1.1rem);
          line-height: 1.25;
          /* Single line by default, wrap only if needed */
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        /* Allow wrapping when there's enough width but name is long */
        @container room-card (min-width: 160px) {
          .room-name {
            white-space: normal;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            word-break: break-word;
          }
        }

        .display-entities {
          font-size: clamp(0.7rem, 2.5cqi, 0.85rem);
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
          /* Align icon to bottom left */
          align-items: flex-end;
          justify-content: flex-start;
          position: relative;
          padding-bottom: 0.5rem;
          overflow: visible;
        }

        .icon-container {
          position: relative;
          /* Fixed sizes with reasonable scaling */
          width: clamp(3.5rem, 30cqi, 6rem);
          height: clamp(3.5rem, 30cqi, 6rem);
          /* Offset to have icon peek out from corner */
          margin-left: -0.25rem;
          margin-bottom: -0.25rem;
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
          z-index: 1;
        }

        .icon-background ha-icon {
          --mdc-icon-size: clamp(2rem, 20cqi, 4rem);
          transition: all 0.3s ease;
        }

        .slider-container {
          position: absolute;
          /* Slider slightly larger than icon */
          width: clamp(4.5rem, 40cqi, 8rem);
          height: clamp(4.5rem, 40cqi, 8rem);
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
          stroke: rgb(186, 186, 186);
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
          gap: 0.375rem;
          padding: 0.5rem 0.5rem 0 0;
          align-items: flex-start;
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
          /* Minimum chip size of 2rem, scales up with container */
          height: clamp(2rem, 10cqi, 2.75rem);
          width: clamp(2rem, 10cqi, 2.75rem);
          min-height: 2rem;
          min-width: 2rem;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          flex-shrink: 0;
        }

        .chip ha-icon {
          /* Icon scales with chip but has minimum */
          --mdc-icon-size: clamp(1.125rem, 6cqi, 1.5rem);
        }

        .unavailable {
          cursor: not-allowed;
        }

        .unavailable:active {
          transform: none;
        }

        /* Hide display entities on very small cards */
        @container room-card (max-width: 140px) {
          .display-entities {
            display: none;
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
