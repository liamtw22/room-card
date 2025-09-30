# Room Card for Home Assistant

[![GitHub Release][releases-shield]][releases]
[![License][license-shield]](LICENSE)
[![hacs][hacsbadge]][hacs]

A beautiful, modern room card for Home Assistant that displays temperature, humidity, and provides interactive device controls with a clean, intuitive interface.

![Room Card Example](https://via.placeholder.com/800x400?text=Room+Card+Screenshot)

## Features

### ✨ Smart Room Monitoring
- 🌡️ Real-time temperature display with dynamic color backgrounds
- 💧 Humidity monitoring with visual indicators
- 🎨 Temperature-based dynamic theming
- 📊 Celsius and Fahrenheit support

### 🎮 Interactive Controls
- 🎛️ Continuous sliders for precise device control
- 💡 Light brightness control with RGB color support
- 🔊 Speaker volume management
- 🌀 Air purifier/fan mode selection
- 📱 Haptic feedback on mobile devices

### 🛠️ Developer Friendly
- 📝 Full TypeScript implementation
- 🎨 Visual editor for easy configuration
- 🔧 Modular component architecture
- 📦 HACS compatible
- 🎯 Follows Home Assistant standards

## Installation

### HACS (Recommended)

1. Make sure [HACS](https://hacs.xyz) is installed
2. Add this repository as a custom repository:
   - Navigate to HACS → Frontend
   - Click the 3 dots menu → Custom repositories
   - Add `https://github.com/liamtw22/room-card` with category `Lovelace`
3. Find and install "Room Card" in HACS
4. Restart Home Assistant
5. Add the card to your dashboard

### Manual Installation

1. Download `room-card.js` from the [latest release](https://github.com/liamtw22/room-card/releases)
2. Copy it to `/config/www/community/room-card/`
3. Add the resource in your Lovelace configuration:

```yaml
resources:
  - url: /hacsfiles/room-card/room-card.js
    type: module
```

## Configuration

### Visual Editor

The easiest way to configure the card is through the visual editor:

1. Add a new card to your dashboard
2. Search for "Room Card"
3. Configure using the UI

### YAML Configuration

#### Basic Example

```yaml
type: custom:room-card
name: Living Room
temperature_sensor: sensor.living_room_temperature
humidity_sensor: sensor.living_room_humidity
show_temperature: true
show_humidity: true
temperature_unit: F
haptic_feedback: true
```

#### Full Example with Devices

```yaml
type: custom:room-card
name: Living Room
temperature_sensor: sensor.living_room_temperature
humidity_sensor: sensor.living_room_humidity
show_temperature: true
show_humidity: true
temperature_unit: F
haptic_feedback: true
devices:
  - entity: light.living_room_lights
    type: light
    name: Main Lights
    icon: mdi:lightbulb
    control_type: continuous
  - entity: media_player.living_room_speaker
    type: speaker
    name: Speaker
    icon: mdi:speaker
    control_type: continuous
  - entity: fan.living_room_purifier
    type: purifier
    name: Air Purifier
    icon: mdi:air-purifier
    control_type: discrete
    modes:
      - Off
      - Sleep
      - Low
      - High
background_colors:
  cold: '#CEB2F5'
  cool: '#A3D9F5'
  comfortable: '#CDE3DB'
  warm: '#FBD9A0'
  hot: '#F4A8A3'
```

### Configuration Options

#### Main Options

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `type` | string | **Required** | Must be `custom:room-card` |
| `name` | string | `Room` | Display name for the room |
| `temperature_sensor` | string | - | Entity ID of temperature sensor |
| `humidity_sensor` | string | - | Entity ID of humidity sensor |
| `show_temperature` | boolean | `true` | Show/hide temperature display |
| `show_humidity` | boolean | `true` | Show/hide humidity display |
| `temperature_unit` | string | `F` | Temperature unit (`C` or `F`) |
| `haptic_feedback` | boolean | `true` | Enable vibration on mobile |
| `devices` | array | `[]` | List of devices to control |
| `background_colors` | object | See below | Temperature-based colors |

#### Device Options

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `entity` | string | **Required** | Entity ID of the device |
| `type` | string | **Required** | Device type: `light`, `speaker`, `purifier`, `fan`, `switch` |
| `name` | string | - | Display name (auto-detected if not provided) |
| `icon` | string | Auto | MDI icon name (auto-detected if not provided) |
| `control_type` | string | Auto | `continuous` or `discrete` |
| `min_value` | number | `0` | Minimum value (continuous control) |
| `max_value` | number | `255`/`100` | Maximum value (continuous control) |
| `modes` | array | - | List of modes (discrete control) |
| `tap_action` | object | `toggle` | Action on tap |
| `hold_action` | object | - | Action on hold |
| `double_tap_action` | object | - | Action on double tap |

#### Background Colors

Configure background colors for different temperature ranges:

| Range | Default Color | Temperature Range |
|-------|--------------|-------------------|
| `cold` | `#CEB2F5` | < 61°F (16°C) |
| `cool` | `#A3D9F5` | 61-64°F (16-18°C) |
| `comfortable` | `#CDE3DB` | 64-75°F (18-24°C) |
| `warm` | `#FBD9A0` | 75-81°F (24-27°C) |
| `hot` | `#F4A8A3` | > 81°F (27°C) |

## Supported Device Types

### Light
- Control: Brightness (0-255)
- Features: RGB color support, on/off toggle
- Service: `light.turn_on` / `light.turn_off`

### Speaker / Media Player
- Control: Volume (0-100%)
- Features: Mute support, play/pause states
- Service: `media_player.volume_set`

### Purifier / Fan
- Control: Mode selection
- Modes: Off, Sleep, Low, High (customizable)
- Service: `fan.set_preset_mode`

## Development

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/liamtw22/room-card.git
cd room-card

# Install dependencies
npm install

# Development mode with hot reload
npm run start

# Build for production
npm run build

# Lint code
npm run lint
```

The compiled card will be in `dist/room-card.js`

### Project Structure

```
room-card/
├── src/
│   ├── room-card.ts       # Main card component
│   ├── editor.ts          # Visual editor
│   ├── types.ts           # TypeScript definitions
│   ├── const.ts           # Configuration defaults
│   └── styles.ts          # CSS styles
├── dist/                  # Compiled output
├── .github/
│   └── workflows/         # CI/CD workflows
├── package.json
├── rollup.config.js
├── tsconfig.json
└── hacs.json
```

## Troubleshooting

### Card doesn't appear

- Ensure resource is added correctly in Lovelace
- Clear browser cache (Ctrl+F5)
- Check browser console for errors
- Restart Home Assistant

### Device control not working

- Verify all entity IDs exist in Home Assistant
- Check device entity is available (not `unavailable` state)
- Verify entity has required attributes (`brightness`, `volume_level`, etc.)
- Ensure device type matches entity domain

### Build errors

- Run `npm clean` then `npm install`
- Ensure Node.js version is 18 or higher
- Check all TypeScript files for syntax errors

## Contributing

Contributions are welcome! Please read the [contributing guidelines](CONTRIBUTING.md) before submitting a pull request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

- **Issues**: [GitHub Issues](https://github.com/liamtw22/room-card/issues)
- **Discussions**: [GitHub Discussions](https://github.com/liamtw22/room-card/discussions)
- **Community**: [Home Assistant Community Forum](https://community.home-assistant.io/)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits

- Icons from [Material Design Icons](https://materialdesignicons.com/)
- Built with [Lit](https://lit.dev/) and [TypeScript](https://www.typescriptlang.org/)
- Follows [Home Assistant Custom Card Standards](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/)

---

Made with ❤️ for the Home Assistant Community

[releases-shield]: https://img.shields.io/github/release/liamtw22/room-card.svg?style=for-the-badge
[releases]: https://github.com/liamtw22/room-card/releases
[license-shield]: https://img.shields.io/github/license/liamtw22/room-card.svg?style=for-the-badge
[hacs]: https://hacs.xyz
[hacsbadge]: https://img.shields.io/badge/HACS-Custom-orange.svg?style=for-the-badge