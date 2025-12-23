import { LovelaceCardConfig, ActionConfig } from 'custom-card-helpers';

export interface RoomCardConfig extends LovelaceCardConfig {
  area: string;
  name?: string;
  icon?: string;
  background?: string | EntityColorConfig;
  icon_color?: string | EntityColorConfig;
  icon_background?: string | EntityColorConfig;

  // Icon tap behavior - either rotate through active device sliders or use standard action
  icon_tap_behavior?: 'slider_rotation' | 'action';
  
  // Tap/hold action configurations for card areas
  card_tap_action?: ActionConfig;
  card_hold_action?: ActionConfig;
  title_tap_action?: ActionConfig;
  title_hold_action?: ActionConfig;
  icon_tap_action?: ActionConfig;
  icon_hold_action?: ActionConfig;

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

  // Typography customization (rem values)
  room_name_color?: string;
  room_name_size?: string;
  display_entity_color?: string;
  display_entity_size?: string;

  // Sizing customization (rem values)
  icon_size?: string;
  icon_background_size?: string;
  slider_size?: string;
  chip_size?: string;
  chip_icon_size?: string;
  chip_gap?: string;

  // Layout options for Home Assistant sections view
  layout_options?: {
    grid_columns?: number;
    grid_rows?: number;
    grid_min_columns?: number;
    grid_min_rows?: number;
    grid_max_columns?: number;
    grid_max_rows?: number;
  };
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

  // Chip tap/hold action configuration
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
  // Action to perform when this mode is selected
  action?: ActionConfig;
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

// Action handler event type
export interface ActionHandlerEvent extends Event {
  detail?: {
    action: string;
  };
}
