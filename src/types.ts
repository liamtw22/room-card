export interface RoomCardConfig {
  type: string;
  area: string;
  name?: string;
  icon?: string;
  background?: string | EntityColorConfig;
  icon_color?: string | EntityColorConfig;
  icon_background?: string | EntityColorConfig;
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