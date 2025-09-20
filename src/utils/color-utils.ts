// utils/color-utils.ts
import { TemperatureColors } from '../types';
import { 
  DEFAULT_TEMPERATURE_COLORS, 
  TEMPERATURE_RANGES
} from '../config';

export function getTemperatureColor(
  temperature: number | undefined,
  customColors?: TemperatureColors
): string {
  if (temperature === undefined) {
    return 'var(--card-background-color)';
  }

  const colors = customColors || DEFAULT_TEMPERATURE_COLORS;
  
  // Default to Fahrenheit ranges
  const ranges = TEMPERATURE_RANGES;

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
  // Simple color interpolation
  // This is a basic implementation - could be enhanced with proper color space conversion
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