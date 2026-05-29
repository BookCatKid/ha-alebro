# Alebro Label Printer

Seamlessly print labels from Home Assistant. Connect your label printer via MQTT and print anything — from shipping labels to organization tags — directly from your dashboard or automations.

## Features

- **One-click printing** — gorgeous Lovelace card with live preview
- **6 templates** — Default, Shipping, Address, Barcode, Price Tag, Name Badge
- **Automation-ready** — `alebro.print_label` and `alebro.cancel_print` services
- **Live status sensor** — Ready / Printing / Error / Offline with attributes
- **Web UI button** — one press opens the Alebro design interface
- **Test print button** — verify your setup with a single click
- **Custom Lovelace card** — template picker, font size, bold, quantity, live preview
- **Full HACS support** — config flow, translations, auto-discovery

## Requirements

- Home Assistant 2024.6+
- MQTT broker configured in HA
- [alexa_mqtt_label_maker](https://github.com/BookCatKid/alexa_mqtt_label_maker) bridge
