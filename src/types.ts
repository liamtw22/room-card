export interface RoomCardConfig {
  type: string;
  area: string;
  name?: string;
  icon?: string;
  background?: string | EntityColorConfig;
  icon_color?: string | EntityColorConfig;
  icon_background?: string | EntityColorConfig;
  
  // Changed from temperature_sensor and humidity_sensor to generic entity display
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