import {
  LitElement,
  html,
  css,
  TemplateResult,
  PropertyValues,
  CSSResult
} from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  HomeAssistant,
  LovelaceCard,
  LovelaceCardConfig
} from 'custom-card-helpers';

// Import version from package.json
import { version } from '../package.json';

// Import editor
import './room-card-editor';

// Types
export interface RoomCardConfig extends LovelaceCardConfig {
  type: 'custom:room-card';
  area: string; // Required area instead of entity
  name?: string;
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
  attribute?: string;
  icon?: string;
  color?: string;
  scale?: number;
  type?: 'continuous' | 'discrete';
  modes?: DeviceMode[];
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

// Register the card
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'room-card',
  name: 'Room Card',
  preview: true,
  description: 'A custom room card with circular slider control'
});

console.info(
  `%c  ROOM-CARD  %c  Version ${version}  `,
  'color: white; font-weight: bold; background: #0288d1',
  'color: #0288d1; font-weight: bold; background: #e1f5fe'
);

@customElement('room-card')
export class RoomCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: RoomCardConfig;
  @state() private currentDeviceIndex = -1;
  @state() private isDragging = false;
  @state() private sliderValue = 0;
  @state() private devices: DeviceConfig[] = [];

  // Slider configuration
  private startAngle = -110;
  private endAngle = 30;
  private totalAngle = 140;
  private actionTaken = false;
  private thumbTapped = false;
  private _handleMove?: (e: PointerEvent) => void;
  private _handleUp?: (e: PointerEvent) => void;

  public setConfig(config: RoomCardConfig): void {
    if (!config.area) {
      throw new Error("You need to define an area");
    }
    
    this._config = config;
    this._initializeDevices();
  }

  private _initializeDevices(): void {
    if (!this._config) return;

    // Default devices configuration
    this.devices = this._config.devices || [
      {
        entity: `light.${this._config.area.toLowerCase().replace(/\s+/g, '_')}_lights`,
        attribute: "brightness",
        icon: "mdi:lightbulb",
        color: "#FDD835",
        scale: 255,
        type: "continuous"
      },
      {
        entity: `media_player.${this._config.area.toLowerCase().replace(/\s+/g, '_')}_speakers`,
        attribute: "volume_level",
        icon: "mdi:speaker",
        color: "#FF9800",
        scale: 1,
        type: "continuous"
      },
      {
        entity: `fan.${this._config.area.toLowerCase().replace(/\s+/g, '_')}_purifier`,
        attribute: "percentage",
        icon: "mdi:air-purifier",
        color: "#2196F3",
        scale: 100,
        type: "discrete",
        modes: [
          { value: 0, label: "Off", percentage: 0 },
          { value: 0.33, label: "Sleep", percentage: 33 },
          { value: 0.66, label: "Low", percentage: 66 },
          { value: 1, label: "High", percentage: 100 }
        ]
      }
    ];
  }

  protected shouldUpdate(changedProperties: PropertyValues): boolean {
    if (changedProperties.has('hass') || changedProperties.has('_config')) {
      this.updateCurrentDevice();
      this.updateSliderValue();
      return true;
    }
    return false;
  }

  private updateCurrentDevice(): void {
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

  private updateSliderValue(): void {
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
    if (!this.hass || !this._config) return "#353535";

    // Handle different background types
    if (this._config.background_type === 'solid') {
      return this._config.background_color || '#353535';
    } else if (this._config.background_type === 'entity' && this._config.background_entity) {
      const entity = this.hass.states[this._config.background_entity];
      if (entity && this._config.background_state_colors) {
        return this._config.background_state_colors[entity.state] || '#353535';
      }
      return '#353535';
    }
    
    // Default to temperature-based background
    if (!this._config.temperature_sensor) return "#353535";
    
    const tempEntity = this.hass.states[this._config.temperature_sensor];
    if (!tempEntity) return "#353535";

    const temp = parseFloat(tempEntity.state);
    const unit = this._config.temperature_unit || 'F';
    
    // Convert to Fahrenheit if needed for consistent ranges
    const tempF = unit === 'C' ? (temp * 9/5) + 32 : temp;
    
    if (tempF < 61) return this._config.background_colors?.cold || "#CEB2F5";
    else if (tempF < 64) return this._config.background_colors?.cool || "#a3d9f5";
    else if (tempF < 72) return this._config.background_colors?.comfortable || "#cde3db";
    else if (tempF < 75) return this._config.background_colors?.warm || "#fbd9a0";
    else if (tempF < 81) return this._config.background_colors?.hot || "#f4a8a3";
    else return "#df7b74";
  }

  private getIconColor(): string {
    if (!this.hass || !this._config) return "white";
    
    const iconColor = this._config.icon_color;
    if (!iconColor) return "white";
    
    if (typeof iconColor === 'string') {
      return iconColor;
    } else if (iconColor.entity) {
      const entity = this.hass.states[iconColor.entity];
      if (entity) {
        if (entity.state === 'on') return 'white';
        if (entity.state === 'off') return '#7A7A7F';
        if (iconColor.attribute && entity.attributes[iconColor.attribute]) {
          return entity.attributes[iconColor.attribute];
        }
      }
    }
    return "white";
  }

  private getIconBackgroundColor(): string {
    if (!this.hass || !this._config) return "rgba(255, 255, 255, 0.2)";
    
    const iconBgColor = this._config.icon_background_color;
    if (!iconBgColor) return "rgba(255, 255, 255, 0.2)";
    
    if (typeof iconBgColor === 'string') {
      return iconBgColor;
    } else if (iconBgColor.entity) {
      const entity = this.hass.states[iconBgColor.entity];
      if (entity) {
        if (entity.state === 'on') return 'rgba(255, 255, 255, 0.2)';
        if (entity.state === 'off') return 'rgba(122, 122, 127, 0.2)';
        if (iconBgColor.attribute && entity.attributes[iconBgColor.attribute]) {
          return entity.attributes[iconBgColor.attribute];
        }
      }
    }
    return "rgba(255, 255, 255, 0.2)";
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

  private handleIconClick(): void {
    if (!this.hass) return;

    const startIndex = this.currentDeviceIndex;
    let nextIndex = (startIndex + 1) % this.devices.length;
    let found = false;
    
    for (let i = 0; i < this.devices.length; i++) {
      const device = this.devices[nextIndex];
      const entity = this.hass.states[device.entity];
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

  private handleChipClick(index: number): void {
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

  private getChipColor(entity: string): string {
    if (!this.hass) return "#353535";
    
    const stateObj = this.hass.states[entity];
    if (!stateObj || (stateObj.state !== "on" && stateObj.state !== "playing")) {
      return "#353535";
    }

    // Special handling for lights with RGB
    if (entity.includes('light') && stateObj.attributes.rgb_color) {
      return `rgb(${stateObj.attributes.rgb_color.join(",")})`;
    }

    // Return device color
    const deviceIndex = this.devices.findIndex(d => d.entity === entity);
    return deviceIndex >= 0 && this.devices[deviceIndex].color ? 
      this.devices[deviceIndex].color : "#353535";
  }

  private vibrate(): void {
    if (this._config?.haptic_feedback !== false && "vibrate" in navigator) {
      navigator.vibrate(50);
    }
  }

  // Circular slider methods
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
    let normalizedAngle = this.normalizeAngle(angle);
    let normalizedStart = this.normalizeAngle(this.startAngle);
    
    let angleFromStart = normalizedAngle - normalizedStart;
    if (angleFromStart < 0) angleFromStart += 360;
    
    if (angleFromStart > this.totalAngle) {
      let distToStart = Math.min(angleFromStart, 360 - angleFromStart);
      let distToEnd = Math.min(Math.abs(angleFromStart - this.totalAngle), 360 - Math.abs(angleFromStart - this.totalAngle));
      return distToStart < distToEnd ? 0 : 1;
    }
    
    return angleFromStart / this.totalAngle;
  }

  private valueToAngle(value: number): number {
    return this.startAngle + (value * this.totalAngle);
  }

  private pointToAngle(x: number, y: number, centerX: number, centerY: number): number {
    let angle = Math.atan2(y - centerY, x - centerX);
    return this.radiansToDegrees(angle);
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

  private handlePointerDown(e: PointerEvent): void {
    const svg = e.currentTarget as SVGElement;
    if (!svg) return;
    
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
        this.vibrate();
      }
    } else {
      const valueDiff = Math.abs(newValue - this.sliderValue);
      if (valueDiff < 0.005 && newValue !== 0 && newValue !== 1) {
        return;
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
    this.thumbTapped = false;
    
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
        this.hass.callService("fan", "turn_off", {
          entity_id: controlEntity
        });
      } else {
        this.hass.callService("fan", "set_percentage", {
          entity_id: controlEntity,
          percentage: selectedMode.percentage
        });
      }
    } else {
      const actualValue = Math.round(value * (currentDevice.scale || 100));

      if (currentDevice.attribute === "brightness") {
        if (actualValue === 0) {
          this.hass.callService("light", "turn_off", {
            entity_id: controlEntity
          });
        } else {
          this.hass.callService("light", "turn_on", {
            entity_id: controlEntity,
            brightness: actualValue,
          });
        }
      } else if (currentDevice.attribute === "volume_level") {
        if (value === 0) {
          this.hass.callService("media_player", "volume_mute", {
            entity_id: controlEntity,
            is_volume_muted: true
          });
        } else {
          this.hass.callService("media_player", "volume_set", {
            entity_id: controlEntity,
            volume_level: value,
          });
        }
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
    const tempHumidity = this.getTempHumidity();
    const roomName = this._config.name || this._config.area;
    
    const hasActiveDevice = this.currentDeviceIndex !== -1;
    const currentDevice = hasActiveDevice ? this.devices[this.currentDeviceIndex] : null;
    const deviceEntity = currentDevice ? this.hass.states[currentDevice.control_entity || currentDevice.entity] : null;
    const isDeviceOn = deviceEntity && (deviceEntity.state === "on" || deviceEntity.state === "playing");
    const showSlider = currentDevice?.show_slider !== false;

    // Calculate positions
    const centerX = 75;
    const centerY = 75;
    const radius = 56;
    
    // Calculate thumb position
    const thumbAngle = this.valueToAngle(this.sliderValue);
    const thumbAngleRad = this.degreesToRadians(thumbAngle);
    const thumbX = centerX + radius * Math.cos(thumbAngleRad);
    const thumbY = centerY + radius * Math.sin(thumbAngleRad);
    
    // Calculate arc endpoints
    const startAngleRad = this.degreesToRadians(this.startAngle);
    const endAngleRad = this.degreesToRadians(this.endAngle);
    const startX = centerX + radius * Math.cos(startAngleRad);
    const startY = centerY + radius * Math.sin(startAngleRad);
    const endX = centerX + radius * Math.cos(endAngleRad);
    const endY = centerY + radius * Math.sin(endAngleRad);
    
    // Calculate the current angle for the progress arc
    const progressAngle = this.sliderValue * this.totalAngle;
    const largeArcFlag = progressAngle > 180 ? 1 : 0;

    // Get slider color
    let sliderColor = '#2196F3';
    if (currentDevice) {
      if (currentDevice.color === 'light-color' && deviceEntity?.attributes?.rgb_color) {
        sliderColor = `rgb(${deviceEntity.attributes.rgb_color.join(",")})`;
      } else if (currentDevice.color && currentDevice.color !== 'light-color') {
        sliderColor = currentDevice.color;
      }
    }

    return html`
      <div class="card-container" style="background-color: ${backgroundColor}">
        <div class="title-section">
          <div class="room-name">${roomName}</div>
          ${tempHumidity ? html`<div class="temp-humidity">${tempHumidity}</div>` : ''}
        </div>

        <div class="icon-section">
          <div class="icon-container" @click=${this.handleIconClick}>
            <div class="icon-background" style="background-color: ${iconBackgroundColor}">
              <ha-icon icon="${this._config.icon || 'mdi:home'}" style="color: ${iconColor}"></ha-icon>
            </div>
            
            ${isDeviceOn && hasActiveDevice && currentDevice && showSlider ? html`
            <div class="slider-container">
              <svg class="slider-svg" width="150" height="150" viewBox="0 0 150 150"
                @pointerdown=${this.handlePointerDown}
                @pointermove=${this.handlePointerMove}
                @pointerup=${this.handlePointerUp}
                @pointercancel=${this.handlePointerUp}>
                <!-- Track arc -->
                <path
                  class="slider-track"
                  d="M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}"
                />
                <!-- Progress arc -->
                <path
                  class="slider-progress"
                  style="stroke: ${sliderColor}"
                  d="M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${thumbX} ${thumbY}"
                />
                <!-- Thumb -->
                <circle
                  class="slider-thumb ${this.isDragging ? 'dragging' : ''}"
                  style="fill: ${sliderColor}"
                  cx="${thumbX}"
                  cy="${thumbY}"
                  r="16"
                />
                <!-- Icon on thumb -->
                <foreignObject x="${thumbX - 10}" y="${thumbY - 10}" width="20" height="20" class="slider-thumb-icon">
                  <div xmlns="http://www.w3.org/1999/xhtml" style="display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; pointer-events: none;">
                    <ha-icon icon="${currentDevice.icon}" style="--mdc-icon-size: 18px; color: white;"></ha-icon>
                  </div>
                </foreignObject>
              </svg>
            </div>
            ` : ''}
          </div>
        </div>

        <div class="chips-section">
          ${this.devices.map((device, index) => {
            if (device.show_chip === false) return '';
            
            const entity = this.hass.states[device.entity];
            const controlEntity = this.hass.states[device.control_entity || device.entity];
            const isOn = controlEntity && (controlEntity.state === "on" || controlEntity.state === "playing");
            const chipColor = this.getChipColor(device, isOn);
            
            return html`
              <div
                class="chip ${!entity ? 'unavailable' : ''}"
                style="background-color: ${chipColor}; color: ${isOn ? 'white' : '#DBDBDB'}"
                @click=${() => this.handleChipClick(index)}
              >
                <ha-icon icon="${device.icon}"></ha-icon>
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  disconnectedCallback(): void {
    if (this._handleMove) {
      document.removeEventListener('pointermove', this._handleMove);
    }
    if (this._handleUp) {
      document.removeEventListener('pointerup', this._handleUp);
      document.removeEventListener('pointercancel', this._handleUp);
    }
    super.disconnectedCallback();
  }

  public getCardSize(): number {
    return 2;
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
        height: 182px;
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
        font-weight: 500;
        color: #000000;
        margin-top: 5px;
      }

      .temp-humidity {
        font-size: 12px;
        color: #353535;
        font-weight: 400;
      }

      .icon-section {
        grid-area: icon;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        position: relative;
        padding-top: 37px;
        overflow: hidden;
      }

      .icon-container {
        position: relative;
        width: 110px;
        height: 110px;
        margin-left: -10px;
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
        flex-direction: column;
        gap: 6px;
        margin-right: 8px;
        margin-top: 8px;
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

  static getConfigElement() {
    return document.createElement('room-card-editor');
  }

  static getStubConfig(): RoomCardConfig {
    return {
      type: 'custom:room-card',
      area: 'Living Room',
      name: 'Living Room',
      temperature_sensor: '',
      humidity_sensor: '',
      show_temperature: true,
      show_humidity: true,
      temperature_unit: 'F',
      haptic_feedback: true,
      devices: []
    };
  }
}

// Declare global types
declare global {
  interface Window {
    customCards: Array<object>;
  }
  interface HTMLElementTagNameMap {
    'room-card': RoomCard;
  }
}