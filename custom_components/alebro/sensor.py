from __future__ import annotations

from typing import Any

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.util import dt as dt_util

from .const import (
    CONF_PRINTER_NAME,
    CONF_WEB_UI_URL,
    DOMAIN,
    SIGNAL_STATUS_UPDATE,
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    config = hass.data[DOMAIN]["entries"][entry.entry_id]
    async_add_entities([AlebroStatusSensor(entry.entry_id, config)])


class AlebroStatusSensor(SensorEntity):
    _attr_has_entity_name = True
    _attr_translation_key = "status"

    def __init__(self, entry_id: str, config: dict[str, Any]) -> None:
        self._entry_id = entry_id
        self._config = config
        self._attr_unique_id = f"{entry_id}_status"
        self._attr_native_value = None
        self._attr_icon = "mdi:printer"
        self._last_printed_text: str | None = None
        self._last_printed_at: str | None = None
        self._last_result: str | None = None

    @property
    def device_info(self) -> dict[str, Any]:
        return {
            "identifiers": {(DOMAIN, self._entry_id)},
            "name": self._config[CONF_PRINTER_NAME],
            "manufacturer": "Alebro",
            "model": "Label Printer",
            "sw_version": "1.0.0",
        }

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {
            "web_ui_url": self._config.get(CONF_WEB_UI_URL, ""),
            "printer_name": self._config[CONF_PRINTER_NAME],
            "last_printed_text": self._last_printed_text,
            "last_printed_at": self._last_printed_at,
            "last_result": self._last_result,
        }

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()

        @callback
        def update(data: dict[str, Any]) -> None:
            state = data.get("state")
            if state:
                self._attr_native_value = state
                self._attr_icon = "mdi:printer" if state == "printing" else "mdi:printer-check"

            if "last_result" in data:
                self._last_result = data["last_result"]
            if "last_printed_text" in data:
                self._last_printed_text = data["last_printed_text"]
                self._last_printed_at = dt_util.utcnow().isoformat()

            self.async_write_ha_state()

        self.async_on_remove(
            async_dispatcher_connect(
                self.hass, f"{SIGNAL_STATUS_UPDATE}_{self._entry_id}", update
            )
        )
