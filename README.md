# Room Card for Home Assistant

[![GitHub Release][releases-shield]][releases]
[![GitHub Activity][commits-shield]][commits]
[![License][license-shield]](LICENSE)
[![hacs][hacsbadge]][hacs]

A beautiful room card for Home Assistant that displays temperature, humidity, and provides interactive device controls with a modern, intuitive interface.

![Room Card Preview](https://github.com/yourusername/room-card/raw/main/images/preview.png)

## Features

✨ **Smart Room Monitoring**
- 🌡️ Real-time temperature display with dynamic color backgrounds
- 💧 Humidity monitoring with visual indicators
- 🎨 Temperature-based dynamic theming

🎮 **Interactive Controls**
- 🎛️ Circular slider for precise device control
- 💡 Light brightness control with RGB color support
- 🔊 Speaker volume management
- 🌀 Air purifier mode selection
- 📱 Haptic feedback on mobile devices

🛠️ **Developer Friendly**
- 📝 Full TypeScript implementation
- 🎨 Visual editor for easy configuration
- 🔧 Modular component architecture
- 📦 HACS compatible

## Installation

### HACS (Recommended)

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=yourusername&repository=room-card&category=frontend)

1. Make sure [HACS](https://hacs.xyz) is installed
2. Add this repository as a custom repository:
   - Navigate to HACS → Frontend
   - Click the 3 dots menu → Custom repositories
   - Add `https://github.com/yourusername/room-card` with category `Lovelace`
3. Find and install "Room Card" in HACS
4. Restart Home Assistant
5. Add the card to your dashboard

### Manual Installation

1. Download `room-card.js` from the [latest release](https://github.com/yourusername/room-card/releases)
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

## Options

### Main Configuration

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `type` | string | **Required** | Must be `custom:room-card` |
| `name` | string | **Required** | Display name for the room |
| `temperature_sensor` | string | - | Entity ID of temperature sensor |
| `humidity_sensor` | string | - | Entity ID of humidity sensor |
| `show_temperature` | boolean | `true` | Show/hide temperature display |
| `show_humidity` | boolean | `true` | Show/hide humidity display |
| `temperature_unit` | string | `F` | Temperature unit (`C` or `F`) |
| `haptic_feedback` | boolean | `true` | Enable vibration on mobile |
| `devices` | array | `[]` | List of devices to control |
| `background_colors` | object | See below | Temperature-based colors |

### Device Configuration

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `entity` | string | **Required** | Entity ID of the device |
| `type` | string | **Required** | Device type: `light`, `speaker`, `purifier` |
| `name` | string | - | Display name |
| `icon` | string | Auto | MDI icon name |
| `control_type` | string | Auto | `continuous` or `discrete` |
| `min_value` | number | 0 | Minimum value (continuous) |
| `max_value` | number | 255/100 | Maximum value (continuous) |
| `modes` | array | - | List of modes (discrete) |

### Temperature Colors

Configure background colors for different temperature ranges:

| Range | Default Color | Temperature Range |
|-------|---------------|-------------------|
| `cold` | `#CEB2F5` | < 61°F (16°C) |
| `cool` | `#A3D9F5` | 61-64°F (16-18°C) |
| `comfortable` | `#CDE3DB` | 64-75°F (18-24°C) |
| `warm` | `#FBD9A0` | 75-81°F (24-27°C) |
| `hot` | `#F4A8A3` | > 81°F (27°C) |

## Examples

### Basic Configuration
```yaml
type: custom:room-card
name: Bedroom
temperature_sensor: sensor.bedroom_temp
humidity_sensor: sensor.bedroom_humidity
```

### Multiple Devices
```yaml
type: custom:room-card
name: Living Room
temperature_sensor: sensor.living_room_temperature
humidity_sensor: sensor.living_room_humidity
devices:
  - entity: light.ceiling
    type: light
    name: Ceiling Light
    
  - entity: light.lamp
    type: light
    name: Table Lamp
    
  - entity: media_player.tv
    type: speaker
    name: TV Audio
    
  - entity: fan.air_purifier
    type: purifier
    name: Air Purifier
```

### Custom Temperature Colors
```yaml
type: custom:room-card
name: Office
temperature_sensor: sensor.office_temperature
background_colors:
  cold: '#B3E5FC'      # Light cyan
  cool: '#C8E6C9'      # Light green
  comfortable: '#FFF9C4' # Light yellow
  warm: '#FFE0B2'      # Light orange
  hot: '#FFCDD2'       # Light red
```

### Template Support
The card supports Home Assistant's JavaScript template syntax:

```yaml
type: custom:room-card
name: "[[[return states['sensor.room_presence'].state === 'on' ? 'Living Room (Occupied)' : 'Living Room']]]"
temperature_sensor: sensor.living_room_temperature
```

## Device Types

### Light
- **Control**: Brightness (0-255)
- **Features**: RGB color support, on/off toggle
- **Service**: `light.turn_on` / `light.turn_off`

### Speaker
- **Control**: Volume (0-100%)
- **Features**: Mute support, play/pause states
- **Service**: `media_player.volume_set`

### Air Purifier
- **Control**: Mode selection
- **Modes**: Off, Sleep, Low, High
- **Service**: `fan.set_preset_mode`

## Actions

All devices support custom tap, hold, and double-tap actions:

```yaml
devices:
  - entity: light.living_room
    type: light
    tap_action:
      action: toggle
    hold_action:
      action: more-info
    double_tap_action:
      action: call-service
      service: light.turn_on
      service_data:
        brightness_pct: 100
        color_name: warm_white
```

## Building from Source

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Development

```bash
# Clone the repository
git clone https://github.com/yourusername/room-card.git
cd room-card

# Install dependencies
npm install

# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Clean build files
npm run clean
```

The compiled card will be in `dist/room-card.js`

## Project Structure

```
room-card/
├── src/
│   ├── room-card.ts           # Main card component
│   ├── room-card-editor.ts    # Visual editor
│   ├── types.ts               # TypeScript definitions
│   ├── config.ts              # Configuration defaults
│   ├── components/
│   │   ├── circular-slider.ts
│   │   ├── device-chip.ts
│   │   └── temperature-display.ts
│   └── utils/
│       ├── action-handler.ts
│       ├── haptic-feedback.ts
│       ├── color-utils.ts
│       └── template-engine.ts
├── dist/                      # Compiled output
├── package.json
├── rollup.config.js
└── tsconfig.json
```

## Troubleshooting

### Card not appearing
- Ensure resource is added correctly in Lovelace
- Clear browser cache (Ctrl+F5)
- Check browser console for errors
- Verify all entity IDs exist in Home Assistant

### Slider not working
- Check device entity is available (not `unavailable` state)
- Verify entity has required attributes (`brightness`, `volume_level`, etc.)
- Ensure device type matches entity domain

### Visual editor not showing
- Clear browser cache
- Update to latest version
- Check for JavaScript errors in console

### Build errors
- Run `npm clean` then `npm install`
- Ensure Node.js version is 18 or higher
- Check all TypeScript files for syntax errors

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting a pull request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/room-card/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/room-card/discussions)
- **Community**: [Home Assistant Community Forum](https://community.home-assistant.io/)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits
- Icons from [Material Design Icons](https://materialdesignicons.com/)
- Built with [Lit](https://lit.dev/) and [TypeScript](https://www.typescriptlang.org/)

## Acknowledgments

Special thanks to the Home Assistant community for their continuous support and feedback.

---

**Made with ❤️ for the Home Assistant Community**

[commits-shield]: https://img.shields.io/github/commit-activity/y/yourusername/room-card.svg?style=for-the-badge
[commits]: https://github.com/yourusername/room-card/commits/main
[hacsbadge]: https://img.shields.io/badge/HACS-Custom-orange.svg?style=for-the-badge
[hacs]: https://github.com/hacs/integration
[license-shield]: https://img.shields.io/github/license/yourusername/room-card.svg?style=for-the-badge
[releases-shield]: https://img.shields.io/github/release/yourusername/room-card.svg?style=for-the-badge
[releases]: https://github.com/yourusername/room-card/releases
