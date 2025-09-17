import { LitElement, html, css, TemplateResult, CSSResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { getTemperatureColor } from '../utils/color-utils';
import { TemperatureColors, TEMPERATURE_RANGES } from '../config';

export interface SensorData {
  temperature?: number;
  humidity?: number;
  temperature_unit: 'C' | 'F';
  temperature_trend?: 'rising' | 'falling' | 'stable';
  humidity_trend?: 'rising' | 'falling' | 'stable';
}

@customElement('temperature-display')
export class TemperatureDisplay extends LitElement {
  @property({ type: Object }) data?: SensorData;
  @property({ type: Boolean }) showTemperature = true;
  @property({ type: Boolean }) showHumidity = true;
  @property({ type: Boolean }) compact = false;
  @property({ type: Object }) temperatureColors?: TemperatureColors;

  private _getTemperatureIcon(): string {
    if (!this.data?.temperature) return 'mdi:thermometer';

    const temp = this._convertToCelsius(this.data.temperature, this.data.temperature_unit);
    
    if (temp < TEMPERATURE_RANGES.cold.max) return 'mdi:snowflake';
    if (temp < TEMPERATURE_RANGES.cool.max) return 'mdi:thermometer-low';
    if (temp < TEMPERATURE_RANGES.comfortable.max) return 'mdi:thermometer';
    if (temp < TEMPERATURE_RANGES.warm.max) return 'mdi:thermometer-high';
    return 'mdi:fire';
  }

  private _getHumidityIcon(): string {
    if (!this.data?.humidity) return 'mdi:water-percent';
    
    if (this.data.humidity < 30) return 'mdi:water-off';
    if (this.data.humidity < 60) return 'mdi:water-percent';
    return 'mdi:water';
  }

  private _getTrendIcon(trend?: 'rising' | 'falling' | 'stable'): string {
    switch (trend) {
      case 'rising': return 'mdi:trending-up';
      case 'falling': return 'mdi:trending-down';
      case 'stable': return 'mdi:trending-neutral';
      default: return '';
    }
  }

  private _convertToCelsius(temp: number, unit: 'C' | 'F'): number {
    return unit === 'F' ? (temp - 32) * 5/9 : temp;
  }

  private _formatTemperature(temp: number, unit: 'C' | 'F'): string {
    return `${temp.toFixed(1)}°${unit}`;
  }

  private _formatHumidity(humidity: number): string {
    return `${humidity.toFixed(0)}%`;
  }

  private _getHumidityColor(humidity?: number): string {
    if (!humidity) return 'var(--secondary-text-color)';
    
    if (humidity < 30) return '#FFA726'; // Orange - too dry
    if (humidity < 60) return '#66BB6A'; // Green - optimal
    return '#42A5F5'; // Blue - too humid
  }

  private _getHumidityStatus(humidity?: number): string {
    if (!humidity) return '';
    
    if (humidity < 30) return 'Dry';
    if (humidity < 60) return 'Optimal';
    return 'Humid';
  }

  private _getTemperatureStatus(): string {
    if (!this.data?.temperature) return '';

    const temp = this._convertToCelsius(this.data.temperature, this.data.temperature_unit);
    
    for (const [range] of Object.entries(TEMPERATURE_RANGES)) {
      const { min, max } = TEMPERATURE_RANGES[range as keyof typeof TEMPERATURE_RANGES];
      if (temp >= min && temp < max) {
        return range.charAt(0).toUpperCase() + range.slice(1);
      }
    }
    
    return '';
  }

  protected render(): TemplateResult {
    if (!this.data) {
      return html`<div class="no-data">No sensor data</div>`;
    }

    const temperatureColor = getTemperatureColor(
      this.data.temperature ? this._convertToCelsius(this.data.temperature, this.data.temperature_unit) : undefined,
      this.temperatureColors
    );

    const containerStyles = {
      '--temperature-color': temperatureColor,
      '--humidity-color': this._getHumidityColor(this.data.humidity)
    };

    if (this.compact) {
      return this._renderCompact(containerStyles);
    }

    return this._renderFull(containerStyles);
  }

  private _renderCompact(styles: any): TemplateResult {
    return html`
      <div class="sensor-display compact" style=${styleMap(styles)}>
        ${this.showTemperature && this.data?.temperature !== undefined ? html`
          <div class="sensor-item temperature">
            <ha-icon icon=${this._getTemperatureIcon()}></ha-icon>
            <span class="value">${this._formatTemperature(this.data.temperature, this.data.temperature_unit)}</span>
          </div>
        ` : ''}
        
        ${this.showHumidity && this.data?.humidity !== undefined ? html`
          <div class="sensor-item humidity">
            <ha-icon icon=${this._getHumidityIcon()}></ha-icon>
            <span class="value">${this._formatHumidity(this.data.humidity)}</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  private _renderFull(styles: any): TemplateResult {
    return html`
      <div class="sensor-display full" style=${styleMap(styles)}>
        ${this.showTemperature && this.data?.temperature !== undefined ? html`
          <div class="sensor-card temperature">
            <div class="sensor-header">
              <ha-icon icon=${this._getTemperatureIcon()}></ha-icon>
              <span class="sensor-label">Temperature</span>
              ${this.data.temperature_trend ? html`
                <ha-icon 
                  class="trend-icon" 
                  icon=${this._getTrendIcon(this.data.temperature_trend)}
                ></ha-icon>
              ` : ''}
            </div>
            <div class="sensor-value">
              ${this._formatTemperature(this.data.temperature, this.data.temperature_unit)}
            </div>
            <div class="sensor-status">${this._getTemperatureStatus()}</div>
          </div>
        ` : ''}
        
        ${this.showHumidity && this.data?.humidity !== undefined ? html`
          <div class="sensor-card humidity">
            <div class="sensor-header">
              <ha-icon icon=${this._getHumidityIcon()}></ha-icon>
              <span class="sensor-label">Humidity</span>
              ${this.data.humidity_trend ? html`
                <ha-icon 
                  class="trend-icon" 
                  icon=${this._getTrendIcon(this.data.humidity_trend)}
                ></ha-icon>
              ` : ''}
            </div>
            <div class="sensor-value">
              ${this._formatHumidity(this.data.humidity)}
            </div>
            <div class="sensor-status">${this._getHumidityStatus(this.data.humidity)}</div>
          </div>
        ` : ''}
      </div>
    `;
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
      }

      .sensor-display {
        display: flex;
        gap: 12px;
      }

      .sensor-display.compact {
        gap: 16px;
      }

      .sensor-display.full {
        flex-direction: column;
        gap: 12px;
      }

      .no-data {
        color: var(--secondary-text-color);
        font-size: 0.9em;
        font-style: italic;
        text-align: center;
        padding: 8px;
      }

      /* Compact view styles */
      .sensor-item {
        display: flex;
        align-items: center;
        gap: 4px;
        color: var(--secondary-text-color);
        font-size: 0.9em;
      }

      .sensor-item.temperature {
        color: var(--temperature-color, var(--secondary-text-color));
      }

      .sensor-item.humidity {
        color: var(--humidity-color, var(--secondary-text-color));
      }

      .sensor-item ha-icon {
        --mdc-icon-size: 18px;
      }

      .sensor-item .value {
        font-weight: 500;
      }

      /* Full view styles */
      .sensor-card {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 12px;
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
      }

      .sensor-card:hover {
        background: rgba(255, 255, 255, 0.15);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .sensor-card.temperature {
        background: linear-gradient(135deg, 
          color-mix(in srgb, var(--temperature-color) 20%, transparent),
          color-mix(in srgb, var(--temperature-color) 10%, transparent)
        );
      }

      .sensor-card.humidity {
        background: linear-gradient(135deg,
          color-mix(in srgb, var(--humidity-color) 20%, transparent),
          color-mix(in srgb, var(--humidity-color) 10%, transparent)
        );
      }

      .sensor-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        color: var(--secondary-text-color);
      }

      .sensor-header ha-icon {
        --mdc-icon-size: 20px;
      }

      .sensor-label {
        font-size: 0.85em;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        opacity: 0.8;
      }

      .trend-icon {
        margin-left: auto;
        --mdc-icon-size: 16px;
        opacity: 0.6;
      }

      .sensor-value {
        font-size: 1.5em;
        font-weight: 600;
        color: var(--primary-text-color);
        margin-bottom: 4px;
      }

      .sensor-status {
        font-size: 0.75em;
        font-weight: 500;
        color: var(--secondary-text-color);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        opacity: 0.7;
      }

      @media (max-width: 360px) {
        .sensor-display.compact {
          flex-direction: column;
          gap: 8px;
        }
      }
    `;
  }
}