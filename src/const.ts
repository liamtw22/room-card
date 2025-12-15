export const CARD_VERSION = '2.0.0';
export const CARD_NAME = 'Room Card';

// Use HA CSS variables for theming consistency
export const DEFAULT_BACKGROUND_COLOR = 'var(--ha-card-background, var(--card-background-color, white))';
export const DEFAULT_FONT_COLOR = 'var(--primary-text-color)';
export const DEFAULT_SECONDARY_TEXT_COLOR = 'var(--secondary-text-color)';
export const DEFAULT_DISPLAY_ENTITY_COLOR = 'var(--primary-text-color)';

// Default chip state colors using HA variables
export const DEFAULT_CHIP_ON_COLOR = 'var(--state-light-active-color, #FDD835)';
export const DEFAULT_CHIP_OFF_COLOR = 'var(--disabled-color, rgba(0, 0, 0, 0.2))';
export const DEFAULT_CHIP_UNAVAILABLE_COLOR = 'rgba(var(--rgb-primary-text-color), 0.3)';

// Default icon state colors
export const DEFAULT_ICON_ON_COLOR = 'var(--text-primary-color, white)';
export const DEFAULT_ICON_OFF_COLOR = 'rgba(var(--rgb-primary-text-color), 0.6)';
export const DEFAULT_ICON_UNAVAILABLE_COLOR = 'rgba(var(--rgb-primary-text-color), 0.4)';

// Slider colors
export const DEFAULT_SLIDER_TRACK_COLOR = 'var(--disabled-color, rgb(186, 186, 186))';
export const DEFAULT_SLIDER_PROGRESS_COLOR = 'var(--primary-color, #2196F3)';

// Device types
export const DEVICE_TYPES = ['light', 'speaker', 'purifier', 'fan', 'switch', 'media_player', 'climate', 'cover', 'vacuum', 'sensor', 'camera'] as const;
export const CONTROL_TYPES = ['continuous', 'discrete'] as const;

// Home Assistant state colors mapped to domains
export const HA_DOMAIN_COLORS: Record<string, string> = {
  alarm_control_panel: 'var(--state-alarm-armed-color, #F44336)',
  automation: 'var(--state-automation-color, #FFC107)',
  binary_sensor: 'var(--state-binary-sensor-color, #FFC107)',
  calendar: 'var(--state-calendar-color, #2196F3)',
  camera: 'var(--state-camera-color, #2196F3)',
  climate: 'var(--state-climate-auto-color, #4CAF50)',
  cover: 'var(--state-cover-color, #9C27B0)',
  fan: 'var(--state-fan-color, #00BCD4)',
  group: 'var(--state-group-color, #FFC107)',
  humidifier: 'var(--state-humidifier-color, #2196F3)',
  input_boolean: 'var(--state-input-boolean-color, #FFC107)',
  light: 'var(--state-light-active-color, #FFC107)',
  lock: 'var(--state-lock-locked-color, #4CAF50)',
  media_player: 'var(--state-media-player-color, #3F51B5)',
  person: 'var(--state-person-home-color, #4CAF50)',
  remote: 'var(--state-remote-color, #2196F3)',
  script: 'var(--state-script-color, #FFC107)',
  sensor: 'var(--state-sensor-battery-high-color, #4CAF50)',
  siren: 'var(--state-siren-color, #F44336)',
  sun: 'var(--state-sun-day-color, #FFC107)',
  switch: 'var(--state-switch-color, #4CAF50)',
  vacuum: 'var(--state-vacuum-color, #00BCD4)',
  water_heater: 'var(--state-water-heater-color, #FF9800)',
};

// Home Assistant domain icons
export const HA_DOMAIN_ICONS: Record<string, string> = {
  alarm_control_panel: 'mdi:shield',
  automation: 'mdi:robot',
  binary_sensor: 'mdi:checkbox-blank-circle',
  calendar: 'mdi:calendar',
  camera: 'mdi:camera',
  climate: 'mdi:thermostat',
  cover: 'mdi:window-shutter',
  fan: 'mdi:fan',
  group: 'mdi:google-circles-communities',
  humidifier: 'mdi:air-humidifier',
  input_boolean: 'mdi:toggle-switch',
  light: 'mdi:lightbulb',
  lock: 'mdi:lock',
  media_player: 'mdi:speaker',
  person: 'mdi:account',
  remote: 'mdi:remote',
  script: 'mdi:script-text',
  sensor: 'mdi:gauge',
  siren: 'mdi:bullhorn',
  sun: 'mdi:white-balance-sunny',
  switch: 'mdi:toggle-switch',
  vacuum: 'mdi:robot-vacuum',
  water_heater: 'mdi:water-boiler',
};

// Default device attributes based on domain
export const DEFAULT_DEVICE_ATTRIBUTES: Record<string, { attribute: string; scale: number }> = {
  light: { attribute: 'brightness', scale: 2.55 },
  media_player: { attribute: 'volume_level', scale: 1 },
  fan: { attribute: 'percentage', scale: 1 },
  climate: { attribute: 'temperature', scale: 1 },
  cover: { attribute: 'position', scale: 1 },
  vacuum: { attribute: 'battery_level', scale: 1 },
};
