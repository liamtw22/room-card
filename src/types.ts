import { ActionConfig, LovelaceCardConfig } from 'custom-card-helpers';

export interface RoomCardConfig extends LovelaceCardConfig {
  type: string;
  name?: string;
  temperature_sensor?: string;
  humidity_sensor?: string;
  show_temperature?: boolean;
  show_humidity?: boolean;
  temperature_unit?: 'C' | 'F';
  haptic_feedback?: boolean;
  devices?: DeviceConfig[];
  background_colors?: BackgroundColors;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

export interface DeviceConfig {
  entity: string;
  type: 'light' | 'speaker' | 'purifier' | 'fan' | 'switch';
  name?: string;
  icon?: string;
  control_type?: 'continuous' | 'discrete';
  min_value?: number;
  max_value?: number;
  modes?: string[];
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

export interface BackgroundColors {
  cold?: string;
  cool?: string;
  comfortable?: string;
  warm?: string;
  hot?: string;
}

export interface AreaRegistryEntry {
  area_id: string;
  name: string;
  picture?: string | null;
  icon?: string | null;
  aliases?: string[];
}