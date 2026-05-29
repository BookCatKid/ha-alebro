# Alebro Label Printer

A [Home Assistant](https://www.home-assistant.io/) integration for printing labels via MQTT. Works with the [alexa_mqtt_label_maker](https://github.com/BookCatKid/alexa_mqtt_label_maker) bridge to print from any label printer.

## Features

| Feature | Description |
|---------|-------------|
| Print Labels | Send label text via MQTT with template, font, bold, and quantity options |
| Status Sensor | Live printer status — Ready, Printing, Error, Offline |
| Web UI Button | Opens the Alebro label design web interface |
| Test Print | One-click test to verify your setup |
| Lovelace Card | Interactive card with template picker, text input, formatting, and live preview |
| Automation Ready | Exposes `alebro.print_label` and `alebro.cancel_print` services |
| Config Flow | UI-based setup with MQTT topic configuration |
| HACS Ready | Full HACS support with auto-discovery and validation |

## Installation

### HACS (one entry — done)

1. Open HACS → Integrations → Custom Repositories
2. Add `https://github.com/BookCatKid/ha-alebro` as type **Integration**
3. Click "Download" → Restart Home Assistant
4. Go to Settings → Devices & Services → Add "Alebro Label Printer"
5. **Settings → Dashboards → Resources → Add Resource:**
   - URL: `/alebro/alebro-label-card.js`
   - Type: JavaScript Module

That's it — the card JS is served directly by the integration.

### Manual

1. Copy `custom_components/alebro/` → `custom_components/`
2. Restart HA, add resource `/alebro/alebro-label-card.js`

## Setup

1. Go to Settings → Devices & Services → Add Integration
2. Search for "Alebro Label Printer"
3. Configure:
   - **Printer Name** — friendly name for your printer
   - **Web Interface URL** — URL of the Alebro web UI (e.g., `http://192.168.1.100:5858`)
   - **MQTT Print Topic** — topic to publish print jobs (default: `alebro/print`)
   - **MQTT Status Topic** — topic to subscribe for status (default: `alebro/status`)

Make sure your [alexa_mqtt_label_maker](https://github.com/BookCatKid/alexa_mqtt_label_maker) bridge is configured to listen on the same topics.

## Lovelace Card

Add the card to your dashboard:

**1. Add resource:** Settings → Dashboards → Resources → Add Resource → `/local/alebro-label-card.js` (type: JavaScript Module)

**2. Add resource:** Settings → Dashboards → Resources → Add Resource → `/alebro/alebro-label-card.js` (type: JavaScript Module)

**3. Add card:**
```yaml
type: custom:alebro-label-card
sensor_entity: sensor.alebro_status
web_ui_url: "http://192.168.1.100:5858"
```

## Services

### `alebro.print_label`
```yaml
service: alebro.print_label
data:
  text: "Hello World"
  template: "shipping"
  font_size: 36
  bold: true
  quantity: 3
```

### `alebro.cancel_print`
```yaml
service: alebro.cancel_print
```

## MQTT Protocol

The integration publishes to the configured **print topic**:
```json
{
  "text": "Label text here",
  "template": "default",
  "font_size": 24,
  "bold": false,
  "quantity": 1
}
```

And subscribes to the **status topic** for responses:
```json
{
  "status": "ok",
  "text": "Label text here",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Entities

- `sensor.alebro_status` — Printer state (ready / printing / error / offline) with attributes for `web_ui_url`, `last_printed_text`, `last_printed_at`
- `button.alebro_web_ui` — Press to fire `alebro_web_ui_open` event (for automations)
- `button.alebro_print_test` — One-click test label print

## Development

```bash
# Validate with hassfest
python3 -m script.hassfest --path custom_components/alebro

# Validate with HACS action
# See .github/workflows/validate.yaml
```

## License

MIT
