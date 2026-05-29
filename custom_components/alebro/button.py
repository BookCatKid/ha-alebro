from __future__ import annotations

from typing import Any

from homeassistant.components.button import ButtonEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import CONF_PRINTER_NAME, CONF_WEB_UI_URL, DOMAIN, EVENT_WEB_UI_OPEN


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    config = hass.data[DOMAIN]["entries"][entry.entry_id]
    async_add_entities(
        [
            AlebroWebUIButton(entry.entry_id, config),
            AlebroTestPrintButton(entry.entry_id, config, hass),
        ]
    )


class AlebroWebUIButton(ButtonEntity):
    _attr_has_entity_name = True
    _attr_translation_key = "open_web_ui"
    _attr_icon = "mdi:open-in-new"

    def __init__(self, entry_id: str, config: dict[str, Any]) -> None:
        self._entry_id = entry_id
        self._config = config
        self._attr_unique_id = f"{entry_id}_web_ui"

    @property
    def device_info(self) -> dict[str, Any]:
        return {
            "identifiers": {(DOMAIN, self._entry_id)},
            "name": self._config[CONF_PRINTER_NAME],
        }

    async def async_press(self) -> None:
        self.hass.bus.async_fire(
            EVENT_WEB_UI_OPEN,
            {
                "entry_id": self._entry_id,
                "url": self._config.get(CONF_WEB_UI_URL, ""),
                "printer": self._config[CONF_PRINTER_NAME],
            },
        )


class AlebroTestPrintButton(ButtonEntity):
    _attr_has_entity_name = True
    _attr_translation_key = "print_test"
    _attr_icon = "mdi:printer"

    def __init__(
        self, entry_id: str, config: dict[str, Any], hass: HomeAssistant
    ) -> None:
        self._entry_id = entry_id
        self._config = config
        self._hass = hass
        self._attr_unique_id = f"{entry_id}_test"

    @property
    def device_info(self) -> dict[str, Any]:
        return {
            "identifiers": {(DOMAIN, self._entry_id)},
            "name": self._config[CONF_PRINTER_NAME],
        }

    async def async_press(self) -> None:
        await self._hass.services.async_call(
            DOMAIN,
            "print_label",
            {
                "text": "Hello from Alebro!",
                "template": "default",
                "font_size": 36,
                "bold": True,
                "quantity": 1,
            },
            blocking=True,
        )
