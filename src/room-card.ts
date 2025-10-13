import { LitElement, html, TemplateResult, PropertyValues, CSSResultGroup, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  HomeAssistant,
  ActionConfig,
  hasAction,
  handleAction,
  forwardHaptic,
  LovelaceCardConfig,
  hasConfigOrEntityChanged,
} from 'custom-card-helpers';
import { HassEntity } from 'home-assistant-js-websocket';
import type { ActionHandlerEvent } from '../data/lovelace/action_handler';
import { actionHandler } from '../common/directives/action-handler-directive';

import type { RoomCardConfig, DeviceConfig } from './types';
import {
  CARD_VERSION,
  DEFAULT_CHIP_ON_COLOR,
  DEFAULT_CHIP_OFF_COLOR,
  DEFAULT_CHIP_UNAVAILABLE_COLOR,
  DEFAULT_ICON_ON_COLOR,
  DEFAULT_ICON_OFF_COLOR,
  DEFAULT_ICON_UNAVAILABLE_COLOR,
} from './const';
import './editor';

console.info(
  `%c  room-card \n%c  Version ${CARD_VERSION}    `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

// Register card in picker following HA standards
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'room-card',
  name: 'Room Card',
  description: 'A custom room card with circular slider control and device management',
  preview: true,
  documentationURL: 'https://github.com/liamtw22/room-card#readme',
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
      devices: [],
    };
  }

  // For masonry view layout
  public getCardSize(): number {
    return 3; // 1 unit ≈ 50px height
  }

  // For sections view layout (HA 2024.11+)
  public getGridOptions() {
    return {
      rows: 3,
      columns: 12, // Full width
      min_rows: 3,
      min_columns: 6, // Minimum half width
    };
  }

  public setConfig(config: RoomCardConfig): void {
    if (!config) {
      throw new Error('Invalid configuration');
    }

    if (!config.area) {
      throw new Error('You need to define an area');
    }

    // Validate device configurations
    if (config.devices) {
      config.devices.forEach((device, index) => {
        if (!device.entity) {
          throw new Error(`Device ${index + 1} is missing an entity`);
        }

        // Validate action configurations
        if (device.tap_action && !device.tap_action.action) {
          throw new Error(`Device ${index + 1}: tap_action must have an action property`);
        }
        if (device.hold_action && !device.hold_action.action) {
          throw new Error(`Device ${index + 1}: hold_action must have an action property`);
        }
        if (device.double_tap_action && !device.double_tap_action.action) {
          throw new Error(`Device ${index + 1}: double_tap_action must have an action property`);
        }
      });
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

    // Don't mutate config (it's frozen in HA 0.106+)
    this._config = {
      haptic_feedback: true,
      ...config,
      background:
        config.background !== undefined ? config.background : 'var(--ha-card-background)',
    };

    this.devices = this._config.devices || [];
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this._config) {
      return false;
    }

    // Collect all entities to monitor
    const entitiesToCheck = [
      this._config.display_entity_1,
      this._config.display_entity_2,
      ...this.devices.map((d) => d.entity),
      ...this.devices.map((d) => d.control_entity).filter(Boolean),
    ].filter(Boolean) as string[];

    return hasConfigOrEntityChanged(this, changedProps, false, entitiesToCheck);
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    this.updateCurrentDevice();
    this.updateSliderValue();
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (changedProperties.has('hass')) {
      // Check if any device states changed
      const oldHass = changedProperties.get('hass') as HomeAssistant | undefined;
      if (oldHass) {
        const stateChanged = this.devices.some((device) => {
          const oldState = oldHass.states[device.control_entity || device.entity];
          const newState = this.hass.states[device.control_entity || device.entity];
          return oldState?.state !== newState?.state;
        });

        if (stateChanged) {
          this.updateCurrentDevice();
          this.updateSliderValue();
        }
      }
    }
  }

  // Action handler for chips using HA standard pattern
  private _handleChipAction(ev: ActionHandlerEvent, device: DeviceConfig): void {
    if (!this.hass) return;

    // Set up action configuration with proper defaults
    const actionConfig: ActionConfig & { entity: string } = {
      entity: device.entity,
      tap_action: device.tap_action || { action: 'toggle' },
      hold_action: device.hold_action || { action: 'more-info' },
      double_tap_action: device.double_tap_action || { action: 'none' },
    };

    // Add haptic feedback configuration
    if (this._config.haptic_feedback) {
      if (actionConfig.tap_action && !actionConfig.tap_action.haptic) {
        actionConfig.tap_action.haptic = 'light';
      }
      if (actionConfig.hold_action && !actionConfig.hold_action.haptic) {
        actionConfig.hold_action.haptic = 'medium';
      }
      if (actionConfig.double_tap_action && !actionConfig.double_tap_action.haptic) {
        actionConfig.double_tap_action.haptic = 'success';
      }
    }

    // Use HA's handleAction helper
    handleAction(this, this.hass, actionConfig, ev.detail.action!);
  }

  // Action handler for main icon
  private _handleIconAction(ev: ActionHandlerEvent): void {
    if (!this.hass) return;

    const actionConfig: ActionConfig = {
      tap_action: this._config.icon_tap_action || { action: 'more-info', entity: this._config.area },
      hold_action: { action: 'none' },
      double_tap_action: { action: 'none' },
    };

    if (this._config.haptic_feedback && actionConfig.tap_action) {
      actionConfig.tap_action.haptic = 'light';
    }

    handleAction(this, this.hass, actionConfig, ev.detail.action!);
  }

  private handleCardClick(e: MouseEvent) {
    // Only navigate if clicking the card directly, not interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest('.icon-background') ||
      target.closest('.chip') ||
      target.closest('.slider-svg')
    ) {
      return;
    }

    if (this._config.area && !this.isDragging) {
      // Trigger haptic feedback
      if (this._config.haptic_feedback) {
        forwardHaptic('light');
      }

      const event = new Event('location-changed', {
        bubbles: true,
        composed: true,
      });
      window.history.pushState(null, '', `/config/areas/area/${this._config.area}`);
      window.dispatchEvent(event);
    }
  }

  private updateCurrentDevice() {
    let foundActive = false;
    for (let i = 0; i < this.devices.length; i++) {
      const device = this.devices[i];
      const entity = this.hass.states[device.control_entity || device.entity];
      if (entity && (entity.state === 'on' || entity.state === 'playing')) {
        this.currentDeviceIndex = i;
        foundActive = true;
        break;
      }
    }

    if (!foundActive) {
      this.currentDeviceIndex = -1;
    }
  }

  private updateSliderValue() {
    if (this.currentDeviceIndex === -1) {
      this.sliderValue = 0;
      return;
    }

    const device = this.devices[this.currentDeviceIndex];
    if (!device) return;

    const entity = this.hass.states[device.control_entity || device.entity];
    if (!entity) return;

    if (device.type === 'discrete' && device.modes) {
      const modeValue = this.getEntityValue(entity, device);
      const mode = device.modes.find((m) => m.value === modeValue);
      if (mode) {
        this.sliderValue = mode.percentage / 100;
      }
    } else {
      const value = this.getEntityValue(entity, device);
      const scale = device.scale || 255;
      this.sliderValue = Math.max(0, Math.min(1, value / scale));
    }
  }

  private getEntityValue(entity: HassEntity, device: DeviceConfig): number {
    const attribute = device.attribute || 'brightness';
    if (attribute === 'state') {
      return parseFloat(entity.state) || 0;
    }
    return parseFloat(entity.attributes[attribute]) || 0;
  }

  // Slider interaction handlers
  private handlePointerDown = (e: PointerEvent) => {
    if (this.currentDeviceIndex === -1) return;

    const target = e.target as SVGElement;
    if (target.classList.contains('slider-thumb-hit-area')) {
      this.isDragging = true;
      this.actionTaken = false;
      this.thumbTapped = true;
      (target as any).setPointerCapture(e.pointerId);

      if (this._config.haptic_feedback) {
        forwardHaptic('selection');
      }
    }
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (!this.isDragging || this.currentDeviceIndex === -1) return;

    this.actionTaken = true;
    const svg = (e.target as SVGElement).closest('svg');
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = e.clientX - rect.left - centerX;
    const y = e.clientY - rect.top - centerY;

    let angle = (Math.atan2(y, x) * 180) / Math.PI;
    angle = ((angle + 360) % 360) - 180;

    if (angle < this.startAngle) angle = this.startAngle;
    if (angle > this.endAngle) angle = this.endAngle;

    const newValue = (angle - this.startAngle) / this.totalAngle;
    this.sliderValue = Math.max(0, Math.min(1, newValue));

    this.setDeviceValue(this.sliderValue);
  };

  private handlePointerUp = (e: PointerEvent) => {
    if (!this.isDragging) return;

    this.isDragging = false;
    (e.target as any).releasePointerCapture(e.pointerId);

    if (this._config.haptic_feedback) {
      forwardHaptic('light');
    }

    if (this.thumbTapped && !this.actionTaken) {
      this.cycleDiscreteMode();
    }

    this.thumbTapped = false;
    this.actionTaken = false;
  };

  private setDeviceValue(value: number) {
    if (this.currentDeviceIndex === -1) return;

    const device = this.devices[this.currentDeviceIndex];
    if (!device) return;

    const entity = this.hass.states[device.control_entity || device.entity];
    if (!entity) return;

    if (device.type === 'discrete' && device.modes) {
      // Discrete mode handled by cycling
      return;
    }

    const scale = device.scale || 255;
    const actualValue = Math.round(value * scale);
    const domain = device.entity.split('.')[0];
    const attribute = device.attribute || 'brightness';

    if (domain === 'light') {
      this.hass.callService('light', 'turn_on', {
        entity_id: device.entity,
        brightness: actualValue,
      });
    } else if (domain === 'media_player') {
      this.hass.callService('media_player', 'volume_set', {
        entity_id: device.entity,
        volume_level: value,
      });
    } else if (domain === 'fan') {
      this.hass.callService('fan', 'set_percentage', {
        entity_id: device.entity,
        percentage: actualValue,
      });
    } else if (domain === 'cover') {
      this.hass.callService('cover', 'set_cover_position', {
        entity_id: device.entity,
        position: actualValue,
      });
    }
  }

  private cycleDiscreteMode() {
    if (this.currentDeviceIndex === -1) return;

    const device = this.devices[this.currentDeviceIndex];
    if (!device || device.type !== 'discrete' || !device.modes) return;

    const entity = this.hass.states[device.control_entity || device.entity];
    if (!entity) return;

    const currentValue = this.getEntityValue(entity, device);
    const currentModeIndex = device.modes.findIndex((m) => m.value === currentValue);
    const nextModeIndex = (currentModeIndex + 1) % device.modes.length;
    const nextMode = device.modes[nextModeIndex];

    const domain = device.entity.split('.')[0];
    if (domain === 'fan') {
      this.hass.callService('fan', 'set_preset_mode', {
        entity_id: device.entity,
        preset_mode: nextMode.label,
      });
    }

    this.sliderValue = nextMode.percentage / 100;

    if (this._config.haptic_feedback) {
      forwardHaptic('selection');
    }
  }

  // Color and style helpers
  private getBackgroundColor(): string {
    // ... (keep existing implementation)
    return 'var(--ha-card-background)';
  }

  private getChipColor(device: DeviceConfig, entity: string): string {
    if (!this.hass) return device.chip_unavailable_color || DEFAULT_CHIP_UNAVAILABLE_COLOR;

    const stateObj = this.hass.states[entity];

    if (!stateObj || stateObj.state === 'unavailable') {
      return device.chip_unavailable_color || DEFAULT_CHIP_UNAVAILABLE_COLOR;
    }

    if (stateObj.state !== 'on' && stateObj.state !== 'playing') {
      return device.chip_off_color || DEFAULT_CHIP_OFF_COLOR;
    }

    const onColor = device.chip_on_color;

    if (onColor === 'light-color' && entity.includes('light') && stateObj.attributes.rgb_color) {
      return `rgb(${stateObj.attributes.rgb_color.join(',')})`;
    }

    return onColor || DEFAULT_CHIP_ON_COLOR;
  }

  private getChipIconColor(device: DeviceConfig, entity: string): string {
    if (!this.hass) return device.icon_unavailable_color || DEFAULT_ICON_UNAVAILABLE_COLOR;

    const stateObj = this.hass.states[entity];

    if (!stateObj || stateObj.state === 'unavailable') {
      return device.icon_unavailable_color || DEFAULT_ICON_UNAVAILABLE_COLOR;
    }

    if (stateObj.state !== 'on' && stateObj.state !== 'playing') {
      return device.icon_off_color || DEFAULT_ICON_OFF_COLOR;
    }

    return device.icon_on_color || DEFAULT_ICON_ON_COLOR;
  }

  private getDisplayText(): string {
    if (!this.hass || !this._config) return '';

    const parts: string[] = [];

    // Display entity 1
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

    // Display entity 2
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

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    const roomName = this._config.name || this._config.area;
    const displayText = this.getDisplayText();
    const backgroundColor = this.getBackgroundColor();
    const iconColor = '#FFFFFF'; // Simplified
    const iconBackgroundColor = 'rgba(255, 255, 255, 0.2)';
    const roomNameColor = this._config.room_name_color || '#000000';
    const roomNameSize = this._config.room_name_size || '18px';
    const displayEntityColor = this._config.display_entity_color || '#666666';
    const displayEntitySize = this._config.display_entity_size || '14px';

    const hasActiveDevice = this.currentDeviceIndex !== -1;
    const currentDevice = hasActiveDevice ? this.devices[this.currentDeviceIndex] : null;
    const showSlider = currentDevice?.show_slider !== false;

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
        @click=${this.handleCardClick}
      >
        <div class="main-content">
          <div class="title-section">
            <div class="room-name" style="color: ${roomNameColor}; font-size: ${roomNameSize}">
              ${roomName}
            </div>
            ${displayText
              ? html`
                  <div
                    class="display-entities"
                    style="color: ${displayEntityColor}; font-size: ${displayEntitySize}"
                  >
                    ${displayText}
                  </div>
                `
              : ''}
          </div>

          <div class="icon-section">
            <div class="icon-container">
              <div
                class="icon-background"
                style="background-color: ${iconBackgroundColor};"
                @action=${this._handleIconAction}
                .actionHandler=${actionHandler({
                  hasHold: false,
                  hasDoubleClick: false,
                })}
                tabindex="0"
                role="button"
              >
                <ha-icon
                  icon="${this._config.icon || 'mdi:home'}"
                  style="color: ${iconColor}"
                ></ha-icon>
              </div>

              ${hasActiveDevice && currentDevice && showSlider
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
                        <!-- Slider SVG implementation -->
                      </svg>
                    </div>
                  `
                : ''}
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
                  const iconColor = this.getChipIconColor(device, controlEntity);

                  return html`
                    <div
                      class="chip ${isUnavailable ? 'unavailable' : ''} ${isOn ? 'on' : 'off'}"
                      style="background-color: ${chipColor};"
                      @action=${(ev: ActionHandlerEvent) => this._handleChipAction(ev, device)}
                      .actionHandler=${actionHandler({
                        hasHold: hasAction(device.hold_action),
                        hasDoubleClick: hasAction(device.double_tap_action),
                      })}
                      tabindex="${isUnavailable ? '-1' : '0'}"
                      role="button"
                      aria-label="${device.name || entity?.attributes.friendly_name || device.entity}"
                    >
                      <ha-icon icon="${device.icon}" style="color: ${iconColor};"></ha-icon>
                    </div>
                  `;
                })}
              </div>
            `,
          )}
        </div>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
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
          'title chips'
          'icon chips';
        grid-template-rows: min-content 1fr;
        grid-template-columns: 1fr min-content;
        position: relative;
        transition: background-color 0.3s ease;
        cursor: pointer;
        user-select: none;
        -webkit-user-select: none;
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

      .chip:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }

      .chip ha-icon {
        --mdc-icon-size: 25px;
      }

      .unavailable {
        cursor: not-allowed;
        opacity: 0.5;
      }

      /* Add more styles as needed */
    `;
  }
}

// Type declarations
declare global {
  interface HTMLElementTagNameMap {
    'room-card': RoomCard;
  }

  interface Window {
    customCards: Array<{
      type: string;
      name: string;
      description?: string;
      preview?: boolean;
      documentationURL?: string;
    }>;
  }
}
