import { HomeAssistant } from 'custom-card-helpers';
import { BackgroundConfig, TemperatureColors } from '../types';
import { 
  DEFAULT_TEMPERATURE_COLORS, 
  TEMPERATURE_RANGES_F,
  TEMPERATURE_RANGES_C
} from '../config';

export function getBackgroundColor(
  hass: HomeAssistant,
  background?: BackgroundConfig,
  temperature?: number,
  temperatureUnit?: string
): string {
  if (!background) {
    return 'var(--card-background-color)';
  }

  switch (background.type) {
    case 'solid':
      return background.color || 'var(--card-background-color)';
      
    case 'temperature':
      return getTemperatureColor(temperature, background.temperature_colors, temperatureUnit);
      
    case 'entity':
      if (!background.entity || !hass.states[background.entity]) {
        return 'var(--card-background-color)';
      }
      
      const entity = hass.states[background.entity];
      const state = entity.state;
      const numericValue = parseFloat(state);
      
      // Check custom ranges
      if (background.ranges) {
        // First check state-based ranges
        for (const range of background.ranges) {
          if (range.state && state === range.state) {
            return range.color;
          }
        }
        
        // Then check numeric ranges
        if (!isNaN(numericValue)) {
          for (const range of background.ranges) {
            if (range.min !== undefined || range.max !== undefined) {
              const min = range.min ?? -Infinity;
              const max = range.max ?? Infinity;
              if (numericValue >= min && numericValue < max) {
                return range.color;
              }
            }
          }
        }
      }
      
      // Default colors for common states
      if (state === 'on') return '#4CAF50';
      if (state === 'off') return '#757575';
      if (state === 'unavailable') return '#424242';
      
      return 'var(--card-background-color)';
      
    default:
      return 'var(--card-background-color)';
  }
}

export function getTemperatureColor(
  temperature: number | undefined,
  customColors?: TemperatureColors,
  unit?: string
): string {
  if (temperature === undefined) {
    return 'var(--card-background-color)';
  }

  const colors = customColors || DEFAULT_TEMPERATURE_COLORS;
  const ranges = unit === 'C' ? TEMPERATURE_RANGES_C : TEMPERATURE_RANGES_F;

  if (temperature < ranges.cool.min) return colors.cold;
  if (temperature < ranges.comfortable.min) return colors.cool;
  if (temperature < ranges.warm.min) return colors.comfortable;
  if (temperature < ranges.hot.min) return colors.warm;
  return colors.hot;
}

export function interpolateColor(
  color1: string,
  color2: string,
  factor: number
): string {
  const hex2rgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result 
      ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16)
        ]
      : [0, 0, 0];
  };

  const rgb2hex = (r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };

  const [r1, g1, b1] = hex2rgb(color1);
  const [r2, g2, b2] = hex2rgb(color2);

  const r = r1 + (r2 - r1) * factor;
  const g = g1 + (g2 - g1) * factor;
  const b = b1 + (b2 - b1) * factor;

  return rgb2hex(r, g, b);
}