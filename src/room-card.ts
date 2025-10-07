import { LitElement, html, TemplateResult, PropertyValues, CSSResultGroup, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
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

  public static getStubConfig(): Partial<RoomCardConfig> {
    return {
      area: '',
      name: '',
      background: 'var(--ha-card-background)',
      icon: 'mdi:home',
      display_entity_1: '',
      display_entity_2: '',
      haptic_feedback: true,
      devices: []
    };
  }

  public setConfig(config: RoomCardConfig): void {
    if (!config.area) {
      throw new Error("You need to define an area");
    }

    // Handle backwards compatibility
    if (config.temperature_sensor && !config.display_entity_1) {
      config.display_entity_1 = config.temperature_sensor;
      config.display_entity_1_attribute = 'state';
      config.display_entity_1_unit = config.temperature_unit === 'C' ? '°C' : '°F';
    }
    if (config.humidity_sensor && !config.display_entity_2) {
      config.display_entity_2 = config.humidity_sensor;
      config.display_entity_2_attribute = 'state';
      config.display_entity_2_unit = '%';
    }

    this._config = {
      ...config,
      background: config.background !== undefined ? config.background : 'var(--ha-card-background)'
    };
    this._initializeDevices();
  }

  private _initializeDevices() {
    if (!this._config) return;
    
    // Handle backwards compatibility for device colors
    this.devices = (this._config.devices || []).map(device => ({
      ...device,
      chip_on_color: device.chip_on_color || device.color_on || DEFAULT_CHIP_ON_COLOR,
      chip_off_color: device.chip_off_color || device.color_off || DEFAULT_CHIP_OFF_COLOR,
      chip_unavailable_color: device.chip_unavailable_color || device.color_unavailable || DEFAULT_CHIP_UNAVAILABLE_COLOR,
      icon_on_color: device.icon_on_color || device.icon_color || DEFAULT_ICON_ON_COLOR,
      icon_off_color: device.icon_off_color || DEFAULT_ICON_OFF_COLOR,
      icon_unavailable_color: device.icon_unavailable_color || DEFAULT_ICON_UNAVAILABLE_COLOR,
    }));
  }

  public getCardSize(): number {
    return 2;
  }

  protected shouldUpdate(changedProperties: PropertyValues): boolean {
    if (changedProperties.has('hass') || changedProperties.has('_config')) {
      this.updateCurrentDevice();
      this.updateSliderValue();
      return true;
    }
    return false;
  }

  private getAreaName(): string {
    if (!this.hass || !this._config) return this._config?.area || '';
    if (this._config.name) return this._config.name;
    // Check if areas exist on hass object
    const areas = (this.hass as any).areas;
    if (areas && this._config.area) {
      const area = areas[this._config.area];
      return area?.name || this._config.area;
    }
    return this._config.area;
  }

  private updateCurrentDevice() {
    if (!this.hass) return;

    if (this.currentDeviceIndex === -1) {
      for (let i = 0; i < this.devices.length; i++) {
        const entity = this.hass.states[this.devices[i].entity];
        if (entity && (entity.state === "on" || entity.state === "playing")) {
          this.currentDeviceIndex = i;
          return;
        }
      }
      this.currentDeviceIndex = -1;
    } else {
      const currentDevice = this.devices[this.currentDeviceIndex];
      const entity = this.hass.states[currentDevice.entity];
      if (!entity || (entity.state !== "on" && entity.state !== "playing")) {
        this.currentDeviceIndex = -1;
        this.updateCurrentDevice();
      }
    }
  }

  private updateSliderValue() {
    if (!this.hass || this.currentDeviceIndex === -1) {
      this.sliderValue = 0;
      return;
    }

    const currentDevice = this.devices[this.currentDeviceIndex];
    const entity = this.hass.states[currentDevice.entity];

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

    const iconBg = this._config.icon_background;
    if (!iconBg) return "rgba(255, 255, 255, 0.2)";

    if (typeof iconBg === 'string') {
      return iconBg;
    } else if (typeof iconBg === 'object' && iconBg.entity) {
      const entity = this.hass.states[iconBg.entity];
      if (entity && iconBg.ranges) {
        const value = parseFloat(entity.state);
        if (!isNaN(value)) {
          for (const range of iconBg.ranges) {
            if (range.min !== undefined && range.max !== undefined &&
                value >= range.min && value <= range.max) {
              return range.color;
            }
          }
        }
        
        for (const range of iconBg.ranges) {
          if (range.state && entity.state === range.state) {
            return range.color;
          }
        }
      }
    }

    return "rgba(255, 255, 255, 0.2)";
  }

  private getDisplayText(): string {
    if (!this.hass || !this._config) return "";

    const parts: string[] = [];

    // Entity 1
    if (this._config.display_entity_1) {
      const entity = this.hass.states[this._config.display_entity_1];
      if (entity && entity.state !== 'unavailable') {
        const attribute = this._config.display_entity_1_attribute || 'state';
        let value = attribute === 'state' ? entity.state : entity.attributes[attribute];
        
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

    // Entity 2
    if (this._config.display_entity_2) {
      const entity = this.hass.states[this._config.display_entity_2];
      if (entity && entity.state !== 'unavailable') {
        const attribute = this._config.display_entity_2_attribute || 'state';
        let value = attribute === 'state' ? entity.state : entity.attributes[attribute];
        
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

  private vibrate() {
    if (!this._config?.haptic_feedback) return;
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  }

  private handleIconClick() {
    if (!this.hass || this.isDragging) return;

    const startIndex = this.currentDeviceIndex;
    let nextIndex = (startIndex + 1) % this.devices.length;
    let found = false;

    for (let i = 0; i < this.devices.length; i++) {
      const device = this.devices[nextIndex];
      const entity = this.hass.states[device.control_entity || device.entity];

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
    this.vibrate();
    this.requestUpdate();
  }

  private handleChipClick(index: number) {
    if (!this.hass) return;

    const device = this.devices[index];
    const entity = this.hass.states[device.entity];
    if (!entity) return;

    const isOn = entity.state === "on" || entity.state === "playing";

    if (isOn) {
      const domain = device.entity.split('.')[0];
      this.hass.callService(domain, "turn_off", {
        entity_id: device.entity
      });

      if (this.currentDeviceIndex === index) {
        this.currentDeviceIndex = -1;
        setTimeout(() => {
          this.updateCurrentDevice();
          this.updateSliderValue();
          this.requestUpdate();
        }, 100);
      }
    } else {
      const domain = device.entity.split('.')[0];
      const service_data: any = { entity_id: device.entity };

      if (domain === "light") {
        service_data.brightness = 128;
      } else if (domain === "media_player") {
        service_data.volume_level = 0.3;
      } else if (domain === "fan") {
        service_data.percentage = 33;
      }

      this.hass.callService(domain, "turn_on", service_data);
      this.currentDeviceIndex = index;

      setTimeout(() => {
        this.updateSliderValue();
        this.requestUpdate();
      }, 100);
    }

    this.vibrate();
  }

  private getChipColor(device: DeviceConfig, entity: string): string {
    if (!this.hass) return device.chip_unavailable_color || DEFAULT_CHIP_UNAVAILABLE_COLOR;

    const stateObj = this.hass.states[entity];

    if (!stateObj || stateObj.state === 'unavailable') {
      return device.chip_unavailable_color || DEFAULT_CHIP_UNAVAILABLE_COLOR;
    }

    if (stateObj.state !== "on" && stateObj.state !== "playing") {
      return device.chip_off_color || DEFAULT_CHIP_OFF_COLOR;
    }

    const onColor = device.chip_on_color;

    if (onColor === 'light-color' && entity.includes('light') && stateObj.attributes.rgb_color) {
      return `rgb(${stateObj.attributes.rgb_color.join(",")})`;
    }

    return onColor || DEFAULT_CHIP_ON_COLOR;
  }

  private getChipIconColor(device: DeviceConfig, entity: string): string {
    if (!this.hass) return device.icon_unavailable_color || DEFAULT_ICON_UNAVAILABLE_COLOR;

    const stateObj = this.hass.states[entity];

    if (!stateObj || stateObj.state === 'unavailable') {
      return device.icon_unavailable_color || DEFAULT_ICON_UNAVAILABLE_COLOR;
    }

    if (stateObj.state !== "on" && stateObj.state !== "playing") {
      return device.icon_off_color || DEFAULT_ICON_OFF_COLOR;
    }

    return device.icon_on_color || DEFAULT_ICON_ON_COLOR;
  }

  private getSliderColor(device: DeviceConfig, entity: HassEntity | undefined | null): string {
    const onColor = device.chip_on_color || device.color_on;

    if (onColor === 'light-color' && entity?.attributes?.rgb_color) {
      return `rgb(${entity.attributes.rgb_color.join(",")})`;
    }

    return onColor || "#2196F3";
  }

  private degreesToRadians(degrees: number): number {
    return degrees * Math.PI / 180;
  }

  private radiansToDegrees(radians: number): number {
    return radians * 180 / Math.PI;
  }

  private normalizeAngle(angle: number): number {
    while (angle < 0) angle += 360;
    while (angle >= 360) angle -= 360;
    return angle;
  }

  private angleToValue(angle: number): number {
    const normalizedAngle = this.normalizeAngle(angle);
    const normalizedStart = this.normalizeAngle(this.startAngle);
    let angleFromStart = normalizedAngle - normalizedStart;

    if (angleFromStart < 0) angleFromStart += 360;

    if (angleFromStart > this.totalAngle) {
      const distToStart = Math.min(angleFromStart, 360 - angleFromStart);
      const distToEnd = Math.min(
        Math.abs(angleFromStart - this.totalAngle),
        360 - Math.abs(angleFromStart - this.totalAngle)
      );
      return distToStart < distToEnd ? 0 : 1;
    }

    return angleFromStart / this.totalAngle;
  }

  private valueToAngle(value: number): number {
    return this.startAngle + (value * this.totalAngle);
  }

  private handlePointerDown(e: PointerEvent) {
    e.preventDefault();
    const svg = e.currentTarget as SVGElement;
    if (!svg) return;

    svg.setPointerCapture(e.pointerId);

    const rect = svg.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = e.clientX - rect.left - centerX;
    const y = e.clientY - rect.top - centerY;

    const thumbAngle = this.valueToAngle(this.sliderValue);
    const thumbAngleRad = this.degreesToRadians(thumbAngle);
    const thumbX = 56 * Math.cos(thumbAngleRad);
    const thumbY = 56 * Math.sin(thumbAngleRad);

    const distanceToThumb = Math.sqrt((x - thumbX) ** 2 + (y - thumbY) ** 2);

    if (distanceToThumb <= 20) {
      this.thumbTapped = true;
    }

    this.isDragging = true;
    this.handlePointerMove(e);
  }

  private handlePointerMove(e: PointerEvent) {
    if (!this.isDragging) return;

    const svg = e.currentTarget as SVGElement;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = e.clientX - rect.left - centerX;
    const y = e.clientY - rect.top - centerY;

    let angle = this.radiansToDegrees(Math.atan2(y, x));
    let newValue = this.angleToValue(angle);

    if (!this.thumbTapped) {
      this.sliderValue = newValue;
      this.actionTaken = true;
      this.requestUpdate();
      return;
    }

    const currentDevice = this.devices[this.currentDeviceIndex];
    if (currentDevice?.type === "discrete" && currentDevice.modes) {
      const modes = currentDevice.modes;
      let closestMode = modes[0];
      let minDiff = Math.abs(newValue - modes[0].value);

      for (let i = 1; i < modes.length; i++) {
        const diff = Math.abs(newValue - modes[i].value);
        if (diff < minDiff) {
          minDiff = diff;
          closestMode = modes[i];
        }
      }

      if (Math.abs(newValue - this.sliderValue) > 0.01) {
        this.vibrate();
      }

      newValue = closestMode.value;
    } else {
      const valueDiff = Math.abs(newValue - this.sliderValue);
      if (valueDiff < 0.005 && newValue !== 0 && newValue !== 1) {
        return;
      }
    }

    this.actionTaken = true;
    this.sliderValue = newValue;
    this.requestUpdate();
  }

  private handlePointerUp(e: PointerEvent) {
    if (!this.isDragging) return;

    const svg = e.currentTarget as SVGElement;
    if (svg) {
      svg.releasePointerCapture(e.pointerId);
    }

    this.isDragging = false;
    this.thumbTapped = false;

    if (this.actionTaken) {
      this.updateDeviceValue(this.sliderValue);
      this.actionTaken = false;
    }

    this.requestUpdate();
  }

  private updateDeviceValue(value: number) {
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
      const attribute = currentDevice.attribute || 'brightness';

      if (attribute === "brightness") {
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
      } else if (attribute === "volume_level") {
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
      } else if (attribute === "temperature") {
        this.hass.callService(domain, "set_temperature", {
          entity_id: controlEntity,
          temperature: actualValue,
        });
      } else if (attribute === "percentage") {
        if (actualValue === 0) {
          this.hass.callService(domain, "turn_off", {
            entity_id: controlEntity
          });
        } else {
          this.hass.callService(domain, "set_percentage", {
            entity_id: controlEntity,
            percentage: actualValue,
          });
        }
      } else if (attribute === "position") {
        this.hass.callService(domain, "set_cover_position", {
          entity_id: controlEntity,
          position: actualValue,
        });
      }
    }
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

    // Use var(--primary-text-color) as default for all text
    const roomNameColor = this._config.room_name_color || DEFAULT_FONT_COLOR;
    const roomNameSize = this._config.room_name_size || '14px';
    const displayEntityColor = this._config.display_entity_color || this._config.temp_humidity_color || DEFAULT_FONT_COLOR;
    const displayEntitySize = this._config.display_entity_size || this._config.temp_humidity_size || '12px';

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
      <div class="card-container" style="background-color: ${backgroundColor}">
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
                  style="background-color: ${iconBackgroundColor}"
                  @click=${this.handleIconClick}>
                <ha-icon icon="${this._config.icon || 'mdi:home'}" style="color: ${iconColor}"></ha-icon>
              </div>
              
              ${isDeviceOn && hasActiveDevice && currentDevice && showSlider ? html`
              <div class="slider-container">
                <svg class="slider-svg" width="150" height="150" viewBox="0 0 150 150"
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

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
      }

      .card-container {
        height: 100%;
        border-radius: 22px;
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

      .title-section {
        grid-area: title;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        margin-left: 15px;
        padding-top: 5px;
      }

      .room-name {
        font-weight: 500;
        margin-top: 5px;
      }

      .display-entities {
        font-weight: 400;
      }

      /* For backwards compatibility */
      .temp-humidity {
        font-weight: 400;
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
        background-color: rgba(255, 255, 255, 0.2);
      }

      .icon-background ha-icon {
        --mdc-icon-size: 75px;
        color: white;
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
        stroke: rgb(187, 187, 187);
        stroke-width: 12;
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
      }

      .slider-thumb.dragging {
        r: 20;
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

      .chip:active {
        transform: scale(0.95);
      }

      .chip ha-icon {
        --mdc-icon-size: 25px;
      }

      .unavailable {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .unavailable:active {
        transform: none;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'room-card': RoomCard;
  }
}