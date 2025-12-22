export const CARD_VERSION = '2.0.0';
export const CARD_NAME = 'Room Card';

// Use HA theme variables with fallbacks
export const DEFAULT_FONT_COLOR = 'var(--primary-text-color)';

// Default chip state colors - using HA theme variables
export const DEFAULT_CHIP_ON_COLOR = 'var(--paper-item-icon-active-color, #FDD835)';
export const DEFAULT_CHIP_OFF_COLOR = 'var(--secondary-background-color, rgba(0, 0, 0, 0.2))';
export const DEFAULT_CHIP_UNAVAILABLE_COLOR = 'var(--disabled-color, rgba(128, 128, 128, 0.5))';

// Default icon state colors
export const DEFAULT_ICON_ON_COLOR = 'var(--text-primary-color, white)';
export const DEFAULT_ICON_OFF_COLOR = 'var(--secondary-text-color, rgba(255, 255, 255, 0.6))';
export const DEFAULT_ICON_UNAVAILABLE_COLOR = 'var(--disabled-text-color, rgba(255, 255, 255, 0.4))';

// Home Assistant state colors mapped to domains - using HA theme variables
export const HA_DOMAIN_COLORS: { [key: string]: string } = {
  alarm_control_panel: 'var(--state-alarm_control_panel-armed_away-color, #F44336)',
  automation: 'var(--state-automation-on-color, #FFC107)',
  binary_sensor: 'var(--state-binary_sensor-on-color, #FFC107)',
  calendar: 'var(--state-calendar-on-color, #2196F3)',
  camera: 'var(--state-camera-streaming-color, #2196F3)',
  climate: 'var(--state-climate-auto-color, #4CAF50)',
  cover: 'var(--state-cover-open-color, #9C27B0)',
  fan: 'var(--state-fan-on-color, #00BCD4)',
  group: 'var(--state-group-on-color, #FFC107)',
  humidifier: 'var(--state-humidifier-on-color, #2196F3)',
  input_boolean: 'var(--state-input_boolean-on-color, #FFC107)',
  light: 'var(--state-light-on-color, #FFC107)',
  lock: 'var(--state-lock-locked-color, #4CAF50)',
  media_player: 'var(--state-media_player-playing-color, #3F51B5)',
  person: 'var(--state-person-home-color, #4CAF50)',
  remote: 'var(--state-remote-on-color, #2196F3)',
  script: 'var(--state-script-on-color, #FFC107)',
  sensor: 'var(--state-sensor-active-color, #4CAF50)',
  siren: 'var(--state-siren-on-color, #F44336)',
  sun: 'var(--state-sun-above_horizon-color, #FFC107)',
  switch: 'var(--state-switch-on-color, #FFC107)',
  vacuum: 'var(--state-vacuum-cleaning-color, #00BCD4)',
  water_heater: 'var(--state-water_heater-on-color, #FF9800)',
  weather: 'var(--state-weather-sunny-color, #FFC107)',
};

// Home Assistant standard icons mapped to domains
export const HA_DOMAIN_ICONS: { [key: string]: string } = {
  alarm_control_panel: 'mdi:shield',
  automation: 'mdi:robot',
  binary_sensor: 'mdi:checkbox-marked-circle',
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
  sensor: 'mdi:eye',
  siren: 'mdi:bullhorn',
  sun: 'mdi:weather-sunny',
  switch: 'mdi:toggle-switch',
  vacuum: 'mdi:robot-vacuum',
  water_heater: 'mdi:water-boiler',
  weather: 'mdi:weather-cloudy',
};
