// utils/action-handler.ts
import { ActionHandlerDetail, ActionHandlerOptions } from 'custom-card-helpers';

export const actionHandler = (options: ActionHandlerOptions = {}) => {
  const hasHold = options.hasHold ?? true;
  const hasDoubleClick = options.hasDoubleClick ?? true;
  const disabled = options.disabled ?? false;

  return {
    handlePointerDown(e: PointerEvent): void {
      if (disabled) return;
      
      const target = e.currentTarget as HTMLElement;
      const detail: Partial<ActionHandlerDetail> = {
        action: 'tap'
      };
      
      let timer: number | undefined;
      let clickCount = 0;
      
      const handleUp = (): void => {
        clearTimeout(timer);
        clickCount++;
        
        if (clickCount === 1) {
          timer = window.setTimeout(() => {
            if (clickCount === 1) {
              target.dispatchEvent(new CustomEvent('action', {
                detail: { ...detail, action: 'tap' },
                bubbles: true,
                composed: true
              }));
            } else if (clickCount === 2 && hasDoubleClick) {
              target.dispatchEvent(new CustomEvent('action', {
                detail: { ...detail, action: 'double_tap' },
                bubbles: true,
                composed: true
              }));
            }
            clickCount = 0;
          }, hasDoubleClick ? 250 : 0);
        }
        
        target.removeEventListener('pointerup', handleUp);
        target.removeEventListener('pointercancel', handleUp);
      };
      
      if (hasHold) {
        timer = window.setTimeout(() => {
          target.dispatchEvent(new CustomEvent('action', {
            detail: { ...detail, action: 'hold' },
            bubbles: true,
            composed: true
          }));
          clickCount = 0;
        }, 500);
      }
      
      target.addEventListener('pointerup', handleUp);
      target.addEventListener('pointercancel', handleUp);
    }
  };
};

// utils/haptic-feedback.ts
export class HapticFeedback {
  private static navigator = window.navigator as any;

  static vibrate(pattern: 'light' | 'medium' | 'heavy' | 'selection' | number | number[]): void {
    if (!this.navigator.vibrate) return;

    const patterns = {
      light: 50,
      medium: 100,
      heavy: 200,
      selection: 10
    };

    const vibrationPattern = typeof pattern === 'string' 
      ? patterns[pattern] || 50 
      : pattern;

    try {
      this.navigator.vibrate(vibrationPattern);
    } catch (e) {
      // Vibration API not supported or failed
    }
  }

  static canVibrate(): boolean {
    return 'vibrate' in this.navigator;
  }
}

// utils/color-utils.ts
import { TemperatureColors } from '../types';
import { 
  DEFAULT_TEMPERATURE_COLORS, 
  TEMPERATURE_RANGES, 
  TEMPERATURE_RANGES_CELSIUS 
} from '../config';

export function getTemperatureColor(
  temperature: number | undefined,
  customColors?: TemperatureColors,
  unit: string = 'F'
): string {
  if (temperature === undefined) {
    return 'var(--card-background-color)';
  }

  const colors = customColors || DEFAULT_TEMPERATURE_COLORS;
  const ranges = unit === 'C' ? TEMPERATURE_RANGES_CELSIUS : TEMPERATURE_RANGES;

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
