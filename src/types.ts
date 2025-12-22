import { LovelaceCardConfig, ActionConfig } from 'custom-card-helpers';

export interface RoomCardConfig extends LovelaceCardConfig {
  area: string;
  name?: string;
  icon?: string;
  background?: string | EntityColorConfig;
  icon_color?: string | EntityColorConfig;
  icon_background?: string | EntityColorConfig;

  // Icon tap behavior configuration
  icon_tap_action?: ActionConfig;

  // Display entities for subtitle
  display_entity_1?: string;
  display_entity_2?: string;
  display_entity_1_attribute?: string;
  display_entity_2_attribute?: string;
  display_entity_1_unit?: string;
  display_entity_2_unit?: string;

  haptic_feedback?: boolean;
  devices?: DeviceConfig[];
  chip_columns?: number;

  // Font customization
  room_name_color?: string;
  room_name_size?: string;
  display_entity_color?: string;
  display_entity_size?: string;
}

export interface DeviceConfig {
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

  // Action configuration
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;

  // Chip state colors
  chip_on_color?: string;
  chip_off_color?: string;
  chip_unavailable_color?: string;

  // Icon state colors
  icon_on_color?: string;
  icon_off_color?: string;
  icon_unavailable_color?: string;

  chip_column?: number;
}

export interface ModeConfig {
  label: string;
  value: number;
  percentage: number;
}

export interface EntityColorConfig {
  entity: string;
  ranges?: ColorRange[];
}

export interface ColorRange {
  min?: number;
  max?: number;
  state?: string;
  color: string;
}
