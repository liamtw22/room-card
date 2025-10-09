export const CARD_VERSION = '1.0.0';
export const CARD_NAME = 'Room Card';

export const DEFAULT_BACKGROUND_COLOR = '#CDE3DB';
export const DEFAULT_FONT_COLOR = 'var(--primary-text-color)';
export const DEFAULT_DISPLAY_ENTITY_COLOR = 'var(--primary-text-color)';

// Default chip state colors
export const DEFAULT_CHIP_ON_COLOR = '#FDD835';
export const DEFAULT_CHIP_OFF_COLOR = 'rgba(0, 0, 0, 0.2)';
export const DEFAULT_CHIP_UNAVAILABLE_COLOR = 'rgba(128, 128, 128, 0.5)';

// Default icon state colors
export const DEFAULT_ICON_ON_COLOR = 'white';
export const DEFAULT_ICON_OFF_COLOR = 'rgba(255, 255, 255, 0.6)';
export const DEFAULT_ICON_UNAVAILABLE_COLOR = 'rgba(255, 255, 255, 0.4)';

export const DEVICE_TYPES = ['light', 'speaker', 'purifier', 'fan', 'switch'];
export const CONTROL_TYPES = ['continuous', 'discrete'];

// Home Assistant state colors mapped to domains
export const HA_DOMAIN_COLORS: { [key: string]: string } = {
  'alarm_control_panel': 'var(--state-alarm-armed-color, #F44336)',
  'automation': 'var(--state-automation-color, #FFC107)',
  'binary_sensor': 'var(--state-binary-sensor-color, #FFC107)',
  'calendar': 'var(--state-calendar-color, #2196F3)',
  'camera': 'var(--state-camera-color, #2196F3)',
  'climate': 'var(--state-climate-auto-color, #4CAF50)',
  'cover': 'var(--state-cover-color, #9C27B0)',
  'fan': 'var(--state-fan-color, #00BCD4)',
  'group': 'var(--state-group-color, #FFC107)',
  'humidifier': 'var(--state-humidifier-color, #2196F3)',
  'input_boolean': 'var(--state-input-boolean-color, #FFC107)',
  'light': 'var(--state-light-color, #FFC107)',
  'lock': 'var(--state-lock-locked-color, #4CAF50)',
  'media_player': 'var(--state-media-player-color, #3F51B5)',
  'person': 'var(--state-person-home-color, #4CAF50)',
  'remote': 'var(--state-remote-color, #2196F3)',
  'script': 'var(--state-script-color, #FFC107)',
  'sensor': 'var(--state-sensor-battery-high-color, #4CAF50)',
  'siren': 'var(--state-siren-color, #F44336)',
  'sun': 'var(--state-sun-day-color, #FFC107)',
  'switch': 'var(--state-switch-color, #FFC107)',
  'timer': 'var(--state-timer-color, #FFC107)',
  'update': 'var(--state-update-color, #4CAF50)',
  'vacuum': 'var(--state-vacuum-color, #009688)',
};

// Domain to icon mapping
export const HA_DOMAIN_ICONS: { [key: string]: string } = {
  'alarm_control_panel': 'mdi:shield-home',
  'automation': 'mdi:robot',
  'binary_sensor': 'mdi:checkbox-marked-circle',
  'calendar': 'mdi:calendar',
  'camera': 'mdi:camera',
  'climate': 'mdi:thermostat',
  'cover': 'mdi:window-shutter',
  'fan': 'mdi:fan',
  'group': 'mdi:google-circles-communities',
  'humidifier': 'mdi:air-humidifier',
  'input_boolean': 'mdi:toggle-switch',
  'light': 'mdi:lightbulb',
  'lock': 'mdi:lock',
  'media_player': 'mdi:speaker',
  'person': 'mdi:account',
  'remote': 'mdi:remote',
  'script': 'mdi:script-text',
  'sensor': 'mdi:gauge',
  'siren': 'mdi:bullhorn',
  'sun': 'mdi:white-balance-sunny',
  'switch': 'mdi:toggle-switch',
  'timer': 'mdi:timer',
  'update': 'mdi:update',
  'vacuum': 'mdi:robot-vacuum',
};