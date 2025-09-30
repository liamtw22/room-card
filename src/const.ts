export const CARD_VERSION = '1.0.0';
export const CARD_NAME = 'Room Card';

export const DEFAULT_BACKGROUND_COLORS = {
  cold: '#CEB2F5',
  cool: '#A3D9F5',
  comfortable: '#CDE3DB',
  warm: '#FBD9A0',
  hot: '#F4A8A3',
};

export const TEMPERATURE_RANGES = {
  cold: { max: 16 },      // < 16°C / 61°F
  cool: { min: 16, max: 18 }, // 16-18°C / 61-64°F
  comfortable: { min: 18, max: 24 }, // 18-24°C / 64-75°F
  warm: { min: 24, max: 27 }, // 24-27°C / 75-81°F
  hot: { min: 27 },       // > 27°C / 81°F
};

export const DEVICE_TYPES = ['light', 'speaker', 'purifier', 'fan', 'switch'];
export const CONTROL_TYPES = ['continuous', 'discrete'];