import { TemperatureColors } from '../types';
import { TEMPERATURE_RANGES, DEFAULT_TEMPERATURE_COLORS } from '../config';

export function getTemperatureColor(
  temperature: number | undefined, 
  colors: TemperatureColors = DEFAULT_TEMPERATURE_COLORS
): string {
  if (temperature === undefined) {
    return colors.comfortable;
  }

  for (const [range, { min, max }] of Object.entries(TEMPERATURE_RANGES)) {
    if (temperature >= min && temperature < max) {
      return colors[range as keyof TemperatureColors];
    }
  }

  return colors.comfortable;
}

export function interpolateColor(color1: string, color2: string, factor: number): string {
  // Simple color interpolation for smooth transitions
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return color1;
  
  const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * factor);
  const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * factor);
  const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * factor);
  
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}