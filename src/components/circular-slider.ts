import { LitElement, html, css, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ProcessedDevice } from '../types';

@customElement('circular-slider')
export class CircularSlider extends LitElement {
  @property({ type: Object }) device!: ProcessedDevice;
  @property({ type: Number }) value: number | string = 0;
  @state() private _dragging = false;

  private _handlePointerDown(e: PointerEvent): void {
    this._dragging = true;
    this.setPointerCapture(e.pointerId);
    this._updateValueFromPointer(e);
  }

  private _handlePointerMove(e: PointerEvent): void {
    if (!this._dragging) return;
    this._updateValueFromPointer(e);
  }

  private _handlePointerUp(e: PointerEvent): void {
    this._dragging = false;
    this.releasePointerCapture(e.pointerId);
  }

  private _updateValueFromPointer(e: PointerEvent): void {
    const rect = this.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = e.clientX - rect.left - centerX;
    const y = e.clientY - rect.top - centerY;
    
    let angle = Math.atan2(y, x) * 180 / Math.PI;
    angle = (angle + 360) % 360;
    
    // Convert angle to value based on device type
    let newValue: number | string;
    
    if (this.device.type === 'purifier' && this.device.modes) {
      const modeIndex = Math.floor((angle / 360) * this.device.modes.length);
      newValue = this.device.modes[modeIndex];
    } else {
      const min = this.device.min_value || 0;
      const max = this.device.max_value || 100;
      newValue = Math.round((angle / 360) * (max - min) + min);
    }
    
    this._dispatchValueChanged(newValue);
  }

  private _dispatchValueChanged(value: number | string): void {
    const event = new CustomEvent('value-changed', {
      detail: { value },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  protected render(): TemplateResult {
    const isDiscrete = this.device.control_type === 'discrete';
    const displayValue = isDiscrete ? this.value : `${this.value}%`;
    
    return html`
      <div class="slider-container"
           @pointerdown=${this._handlePointerDown}
           @pointermove=${this._handlePointerMove}
           @pointerup=${this._handlePointerUp}
           @pointercancel=${this._handlePointerUp}>
        <svg class="slider-svg" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" 
                  class="slider-track"></circle>
          <circle cx="50" cy="50" r="40" 
                  class="slider-fill"
                  style="--fill-percent: ${this._getFillPercent()}"></circle>
        </svg>
        <div class="slider-value">${displayValue}</div>
      </div>
    `;
  }

  private _getFillPercent(): number {
    if (this.device.type === 'purifier' && this.device.modes) {
      const index = this.device.modes.indexOf(this.value as string);
      return (index / this.device.modes.length) * 100;
    }
    
    const min = this.device.min_value || 0;
    const max = this.device.max_value || 100;
    return ((Number(this.value) - min) / (max - min)) * 100;
  }

  static get styles() {
    return css`
      .slider-container {
        position: relative;
        width: 80px;
        height: 80px;
        cursor: pointer;
        touch-action: none;
      }
      
      .slider-svg {
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
      }
      
      .slider-track {
        fill: none;
        stroke: rgba(255, 255, 255, 0.2);
        stroke-width: 8;
      }
      
      .slider-fill {
        fill: none;
        stroke: var(--accent-color);
        stroke-width: 8;
        stroke-linecap: round;
        stroke-dasharray: 251.2;
        stroke-dashoffset: calc(251.2 - (251.2 * var(--fill-percent) / 100));
        transition: stroke-dashoffset 0.2s ease;
      }
      
      .slider-value {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 12px;
        font-weight: 500;
        color: var(--primary-text-color);
      }
    `;
  }
}