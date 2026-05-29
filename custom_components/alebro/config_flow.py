from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.data_entry_flow import FlowResult

from .const import (
    CONF_PRINT_TOPIC,
    CONF_PRINTER_NAME,
    CONF_RESP_TOPIC,
    CONF_WEB_UI_URL,
    DEFAULT_PRINT_TOPIC,
    DEFAULT_RESP_TOPIC,
    DOMAIN,
)

STEP_USER_DATA_SCHEMA = vol.Schema(
    {
        vol.Required(CONF_PRINTER_NAME, default="Alebro Label Printer"): str,
        vol.Optional(
            CONF_WEB_UI_URL, default="", description="URL of the Alebro web interface"
        ): str,
        vol.Optional(CONF_PRINT_TOPIC, default=DEFAULT_PRINT_TOPIC): str,
        vol.Optional(CONF_RESP_TOPIC, default=DEFAULT_RESP_TOPIC): str,
    }
)


class AlebroConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 2

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        if user_input is None:
            return self.async_show_form(
                step_id="user",
                data_schema=STEP_USER_DATA_SCHEMA,
                description_placeholders={
                    "print_topic": DEFAULT_PRINT_TOPIC,
                    "resp_topic": DEFAULT_RESP_TOPIC,
                },
            )

        await self.async_set_unique_id(
            user_input.get(CONF_PRINTER_NAME, "alebro").lower().replace(" ", "_")
        )
        self._abort_if_unique_id_configured()

        return self.async_create_entry(
            title=user_input[CONF_PRINTER_NAME],
            data=user_input,
        )

    async def async_step_import(self, import_data: dict[str, Any]) -> FlowResult:
        return await self.async_step_user(import_data)
