import { LovelaceCardConfig, ActionConfig } from 'custom-card-helpers';

export interface RoomCardConfig extends LovelaceCardConfig {
  type: 'custom:room-card';
  name: string;
  temperature_sensor?: string;
  humidity_sensor?: string;
  devices?: DeviceConfig[];
  background_colors?: TemperatureColors;
  haptic_feedback?: boolean;
  show_temperature?: boolean;
  show_humidity?: boolean;
  temperature_unit?: 'C' | 'F';
}

export interface DeviceConfig {
  entity: string;
  name?: string;
  icon?: string;
  type: 'light' | 'speaker' | 'purifier' | 'fan' | 'climate' | 'switch' | 'cover' | 'vacuum';
  control_type?: 'continuous' | 'discrete';
  min_value?: number;
  max_value?: number;
  step?: number;
  modes?: string[];
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

export interface TemperatureColors {
  cold: string;
  cool: string;
  comfortable: string;
  warm: string;
  hot: string;
}

export interface ProcessedDevice extends DeviceConfig {
  current_value: number | string;
  is_on: boolean;
  available: boolean;
}

export interface RoomData {
  temperature?: number;
  humidity?: number;
  temperature_unit: string;
  devices: ProcessedDevice[];
  background_color: string;
}
