import { RoomCardConfig, DeviceConfig, TemperatureColors } from './types';

export const DEFAULT_TEMPERATURE_COLORS: TemperatureColors = {
  cold: '#CEB2F5',      // Light purple
  cool: '#A3D9F5',      // Light blue
  comfortable: '#CDE3DB', // Light green
  warm: '#FBD9A0',      // Light orange
  hot: '#F4A8A3'        // Light red
};

export const DEFAULT_CONFIG: Partial<RoomCardConfig> = {
  show_temperature: true,
  show_humidity: true,
  temperature_unit: 'F',
  haptic_feedback: true,
  background_colors: DEFAULT_TEMPERATURE_COLORS,
  devices: []
};

export const DEVICE_ICONS: Record<string, string> = {
  light: 'mdi:lightbulb',
  speaker: 'mdi:speaker',
  purifier: 'mdi:air-purifier',
  fan: 'mdi:fan',
  climate: 'mdi:thermostat',
  switch: 'mdi:toggle-switch',
  cover: 'mdi:window-shutter',
  vacuum: 'mdi:robot-vacuum'
};

export const TEMPERATURE_RANGES = {
  cold: { min: -Infinity, max: 61 },      // Below 61°F
  cool: { min: 61, max: 64 },             // 61-64°F
  comfortable: { min: 64, max: 75 },      // 64-75°F
  warm: { min: 75, max: 81 },             // 75-81°F
  hot: { min: 81, max: Infinity }         // Above 81°F
};

export const TEMPERATURE_RANGES_CELSIUS = {
  cold: { min: -Infinity, max: 16 },      // Below 16°C
  cool: { min: 16, max: 18 },             // 16-18°C
  comfortable: { min: 18, max: 24 },      // 18-24°C
  warm: { min: 24, max: 27 },             // 24-27°C
  hot: { min: 27, max: Infinity }         // Above 27°C
};

export interface DevicePreset {
  value: number;
  label: string;
  percentage: number;
  icon?: string;
}

export const PURIFIER_PRESETS: DevicePreset[] = [
  { value: 0, label: 'Off', percentage: 0, icon: 'mdi:power-off' },
  { value: 0.33, label: 'Sleep', percentage: 33, icon: 'mdi:power-sleep' },
  { value: 0.66, label: 'Low', percentage: 66, icon: 'mdi:fan-speed-1' },
  { value: 1, label: 'High', percentage: 100, icon: 'mdi:fan-speed-3' }
];

export const FAN_PRESETS: DevicePreset[] = [
  { value: 0, label: 'Off', percentage: 0 },
  { value: 0.25, label: 'Low', percentage: 25 },
  { value: 0.5, label: 'Medium', percentage: 50 },
  { value: 0.75, label: 'High', percentage: 75 },
  { value: 1, label: 'Max', percentage: 100 }
];

export function validateConfig(config: RoomCardConfig): void {
  if (!config) {
    throw new Error('No configuration provided');
  }

  if (!config.type || config.type !== 'custom:room-card') {
    throw new Error('Invalid card type. Must be "custom:room-card"');
  }

  if (!config.name) {
    throw new Error('Room name is required');
  }
  
  if (config.temperature_unit && !['C', 'F'].includes(config.temperature_unit)) {
    throw new Error(`Invalid temperature unit: ${config.temperature_unit}. Use 'C' or 'F'`);
  }
  
  if (config.devices) {
    config.devices.forEach((device, index) => {
      validateDeviceConfig(device, index);
    });
  }
  
  if (config.background_colors) {
    validateTemperatureColors(config.background_colors);
  }
}

function validateDeviceConfig(device: DeviceConfig, index: number): void {
  if (!device.entity) {
    throw new Error(`Device at index ${index} must have an entity`);
  }
  
  const validTypes = ['light', 'speaker', 'purifier', 'fan', 'climate', 'switch', 'cover', 'vacuum'];
  if (!device.type || !validTypes.includes(device.type)) {
    throw new Error(`Device at index ${index} has invalid type: ${device.type || 'undefined'}`);
  }
  
  if (device.control_type && !['continuous', 'discrete'].includes(device.control_type)) {
    throw new Error(`Device at index ${index} has invalid control_type: ${device.control_type}`);
  }
  
  if (device.min_value !== undefined && device.max_value !== undefined) {
    if (device.min_value >= device.max_value) {
      throw new Error(`Device at index ${index}: min_value must be less than max_value`);
    }
  }
  
  if (device.step !== undefined && device.step <= 0) {
    throw new Error(`Device at index ${index}: step must be positive`);
  }
}

function validateTemperatureColors(colors: TemperatureColors): void {
  const requiredKeys: (keyof TemperatureColors)[] = ['cold', 'cool', 'comfortable', 'warm', 'hot'];
  const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
  const rgbColorRegex = /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/;
  const rgbaColorRegex = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/;
  
  for (const key of requiredKeys) {
    const color = colors[key];
    if (!color) {
      throw new Error(`Temperature color for '${key}' is required`);
    }
    
    // Allow CSS variables
    if (color.startsWith('var(')) {
      continue;
    }
    
    if (!hexColorRegex.test(color) && 
        !rgbColorRegex.test(color) && 
        !rgbaColorRegex.test(color)) {
      throw new Error(`Invalid color format for '${key}': ${color}`);
    }
  }
}

export function getDeviceDefaults(type: string): Partial<DeviceConfig> {
  switch (type) {
    case 'light':
      return {
        icon: DEVICE_ICONS.light,
        control_type: 'continuous',
        min_value: 0,
        max_value: 255,
        step: 1
      };
      
    case 'speaker':
      return {
        icon: DEVICE_ICONS.speaker,
        control_type: 'continuous',
        min_value: 0,
        max_value: 100,
        step: 1
      };
      
    case 'purifier':
      return {
        icon: DEVICE_ICONS.purifier,
        control_type: 'discrete',
        modes: PURIFIER_PRESETS.map(p => p.label)
      };
      
    case 'fan':
      return {
        icon: DEVICE_ICONS.fan,
        control_type: 'discrete',
        modes: FAN_PRESETS.map(p => p.label)
      };
      
    case 'climate':
      return {
        icon: DEVICE_ICONS.climate,
        control_type: 'continuous',
        min_value: 60,
        max_value: 90,
        step: 1
      };
      
    case 'switch':
      return {
        icon: DEVICE_ICONS.switch,
        control_type: 'discrete',
        modes: ['Off', 'On']
      };
      
    case 'cover':
      return {
        icon: DEVICE_ICONS.cover,
        control_type: 'continuous',
        min_value: 0,
        max_value: 100,
        step: 1
      };
      
    case 'vacuum':
      return {
        icon: DEVICE_ICONS.vacuum,
        control_type: 'discrete',
        modes: ['Off', 'Clean', 'Return']
      };
      
    default:
      return {
        icon: 'mdi:device-unknown',
        control_type: 'continuous',
        min_value: 0,
        max_value: 100,
        step: 1
      };
  }
}

export function mergeDeviceConfig(
  userConfig: Partial<DeviceConfig>,
  type: string
): DeviceConfig {
  const defaults = getDeviceDefaults(type);
  const merged = { ...defaults, ...userConfig, type } as DeviceConfig;
  
  // Ensure required fields
  if (!merged.entity) {
    throw new Error('Device entity is required');
  }
  
  return merged;
}