import { ActionConfig } from 'custom-card-helpers';

// Action types following Home Assistant Tile card standard
export interface ActionableConfig {
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

// Entity-based color configuration
export interface EntityColorConfig {
  entity: string;
  attribute?: string;
  ranges?: ColorRange[];
}

export interface ColorRange {
  min?: number;
  max?: number;
  state?: string;
  color: string;
}

// Mode configuration for discrete device controls
export interface ModeConfig {
  label: string;
  value: number;
  percentage: number;
}

// Device configuration with action support
export interface DeviceConfig extends ActionableConfig {
  entity: string;
  control_entity?: string;
  name?: string;
  icon?: string;
  type?: 'continuous' | 'discrete';
  attribute?: string;
  scale?: number;
  modes?: ModeConfig[];
  show_chip?: boolean;
  show_slider?: boolean;
  chip_column?: number;

  // Chip state colors
  chip_on_color?: string;
  chip_off_color?: string;
  chip_unavailable_color?: string;

  // Icon state colors
  icon_on_color?: string;
  icon_off_color?: string;
  icon_unavailable_color?: string;

  // Deprecated but kept for backwards compatibility
  color_on?: string;
  color_off?: string;
  color_unavailable?: string;
  icon_color?: string;
}

// Main card configuration
export interface RoomCardConfig extends ActionableConfig {
  type: string;
  area: string;
  name?: string;
  icon?: string;
  background?: string | EntityColorConfig;
  icon_color?: string | EntityColorConfig;
  icon_background?: string | EntityColorConfig;

  // Icon action configuration (separate from card actions)
  icon_tap_action?: ActionConfig;
  icon_hold_action?: ActionConfig;
  icon_double_tap_action?: ActionConfig;

  // Title/header action configuration
  title_tap_action?: ActionConfig;
  title_hold_action?: ActionConfig;
  title_double_tap_action?: ActionConfig;

  // Slider action configuration
  slider_tap_action?: ActionConfig;
  slider_hold_action?: ActionConfig;
  slider_double_tap_action?: ActionConfig;

  // Entity display configuration
  display_entity_1?: string;
  display_entity_2?: string;
  display_entity_1_attribute?: string;
  display_entity_2_attribute?: string;
  display_entity_1_unit?: string;
  display_entity_2_unit?: string;

  // Deprecated but kept for backwards compatibility
  temperature_sensor?: string;
  humidity_sensor?: string;
  show_temperature?: boolean;
  show_humidity?: boolean;
  temperature_unit?: 'F' | 'C';

  haptic_feedback?: boolean;
  devices?: DeviceConfig[];
  chip_columns?: number;

  // Font customization
  room_name_color?: string;
  room_name_size?: string;
  display_entity_color?: string;
  display_entity_size?: string;

  // Deprecated but kept for backwards compatibility
  temp_humidity_color?: string;
  temp_humidity_size?: string;
}

// Card info for Home Assistant card picker
export interface CardInfo {
  type: string;
  name: string;
  description: string;
  preview?: boolean;
  documentationURL?: string;
}
