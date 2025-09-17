import { LitElement, html, css, TemplateResult, CSSResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { classMap } from 'lit/directives/class-map.js';
import { ProcessedDevice } from '../types';
import { HapticFeedback } from '../utils/haptic-feedback';
import { DEVICE_ICONS } from '../config';

@customElement('device-chip')
export class DeviceChip extends LitElement {
  @property({ type: Object }) device!: ProcessedDevice;
  @property({ type: Boolean }) active = false;
  @property({ type: Boolean }) disabled = false;
  @state() private _isPressed = false;

  private _handleClick(e: Event): void {
    e.stopPropagation();
    
    if (this.disabled || !this.device.available) {
      return;
    }

    HapticFeedback.light();
    
    const event = new CustomEvent('device-toggle', {
      detail: {
        entity: this.device.entity,
        currentState: this.device.is_on
      },
      bubbles: true,
      composed: true
    });
    
    this.dispatchEvent(event);
  }

  private _handlePointerDown(): void {
    if (!this.disabled && this.device.available) {
      this._isPressed = true;
      HapticFeedback.light();
    }
  }

  private _handlePointerUp(): void {
    this._isPressed = false;
  }

  private _handlePointerLeave(): void {
    this._isPressed = false;
  }

  private _getIcon(): string {
    if (this.device.icon) {
      return this.device.icon;
    }
    return DEVICE_ICONS[this.device.type] || 'mdi:help-circle';
  }

  private _getChipColor(): string {
    if (!this.device.available) {
      return '#353535';
    }

    if (!this.device.is_on) {
      return 'rgba(122, 122, 127, 0.3)';
    }

    // Device-specific colors when on
    switch (this.device.type) {
      case 'light':
        // Check if the light has RGB color
        const entity = (this as any).hass?.states[this.device.entity];
        if (entity?.attributes?.rgb_color) {
          const [r, g, b] = entity.attributes.rgb_color;
          return `rgb(${r}, ${g}, ${b})`;
        }
        return '#FDD835';
      case 'speaker':
        return '#FF9800';
      case 'purifier':
        return '#2196F3';
      default:
        return '#4CAF50';
    }
  }

  private _getIconColor(): string {
    if (!this.device.available) {
      return '#999999';
    }
    return this.device.is_on ? '#FFFFFF' : '#DBDBDB';
  }

  protected render(): TemplateResult {
    const classes = {
      chip: true,
      active: this.device.is_on,
      unavailable: !this.device.available,
      pressed: this._isPressed,
      disabled: this.disabled
    };

    const styles = {
      backgroundColor: this._getChipColor(),
      color: this._getIconColor(),
      transform: this._isPressed ? 'scale(0.95)' : 'scale(1)',
      opacity: this.device.available ? '1' : '0.5'
    };

    return html`
      <button
        class=${classMap(classes)}
        style=${styleMap(styles)}
        @click=${this._handleClick}
        @pointerdown=${this._handlePointerDown}
        @pointerup=${this._handlePointerUp}
        @pointerleave=${this._handlePointerLeave}
        @pointercancel=${this._handlePointerUp}
        ?disabled=${this.disabled || !this.device.available}
        aria-label=${this.device.name || this.device.entity}
        aria-pressed=${this.device.is_on ? 'true' : 'false'}
      >
        <ha-icon icon=${this._getIcon()}></ha-icon>
        ${this.device.current_value && this.device.is_on ? html`
          <span class="chip-value">${this._formatValue()}</span>
        ` : ''}
      </button>
    `;
  }

  private _formatValue(): string {
    const value = this.device.current_value;
    
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number') {
      switch (this.device.type) {
        case 'light':
          return `${Math.round((value / 255) * 100)}%`;
        case 'speaker':
          return `${value}%`;
        case 'purifier':
          return `${value}%`;
        default:
          return `${value}`;
      }
    }

    return '';
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: inline-block;
      }

      .chip {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 2px;
        width: 44px;
        height: 44px;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        background-color: rgba(122, 122, 127, 0.3);
        color: #DBDBDB;
        padding: 0;
        outline: none;
        font-family: inherit;
        -webkit-tap-highlight-color: transparent;
        user-select: none;
      }

      .chip:focus-visible {
        box-shadow: 0 0 0 2px var(--primary-color);
      }

      .chip:not(.unavailable):not(.disabled):hover {
        transform: scale(1.05);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }

      .chip:not(.unavailable):not(.disabled):active {
        transform: scale(0.95);
      }

      .chip.pressed {
        transform: scale(0.95);
      }

      .chip.unavailable,
      .chip.disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }

      .chip.active {
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
      }

      ha-icon {
        --mdc-icon-size: 24px;
        pointer-events: none;
      }

      .chip-value {
        position: absolute;
        bottom: -18px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 10px;
        font-weight: 500;
        white-space: nowrap;
        color: var(--secondary-text-color);
        background: var(--card-background-color);
        padding: 2px 6px;
        border-radius: 10px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
      }

      @media (prefers-reduced-motion: reduce) {
        .chip {
          transition: none;
        }
      }

      @media (hover: none) {
        .chip:not(.unavailable):not(.disabled):hover {
          transform: scale(1);
          box-shadow: none;
        }
      }
    `;
  }
}