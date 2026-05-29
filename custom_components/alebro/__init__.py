import json
import logging

from homeassistant.components.mqtt import async_subscribe, async_publish
from homeassistant.const import Platform
from homeassistant.helpers.dispatcher import async_dispatcher_send

from .const import (
    CONF_PRINT_TOPIC,
    CONF_PRINTER_NAME,
    CONF_RESP_TOPIC,
    CONF_WEB_UI_URL,
    DEFAULT_PRINT_TOPIC,
    DEFAULT_RESP_TOPIC,
    DOMAIN,
    SERVICE_CANCEL_PRINT,
    SERVICE_PRINT_LABEL,
    SIGNAL_STATUS_UPDATE,
    STATE_ERROR,
    STATE_OFFLINE,
    STATE_PRINTING,
    STATE_READY,
)

_LOGGER = logging.getLogger(__name__)

PLATFORMS = [Platform.SENSOR, Platform.BUTTON]
SERVICES_REGISTERED_KEY = f"{DOMAIN}_services"


async def async_setup_entry(hass, entry):
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN].setdefault("entries", {})
    hass.data[DOMAIN].setdefault("unsubs", {})

    config = {
        CONF_PRINT_TOPIC: entry.data.get(CONF_PRINT_TOPIC, DEFAULT_PRINT_TOPIC),
        CONF_RESP_TOPIC: entry.data.get(CONF_RESP_TOPIC, DEFAULT_RESP_TOPIC),
        CONF_WEB_UI_URL: entry.data.get(CONF_WEB_UI_URL, ""),
        CONF_PRINTER_NAME: entry.data.get(CONF_PRINTER_NAME, entry.title),
    }
    hass.data[DOMAIN]["entries"][entry.entry_id] = config

    async def async_status_message(msg):
        payload = msg.payload
        try:
            if isinstance(payload, (bytes, bytearray)):
                payload = payload.decode("utf-8")
            data = json.loads(payload)
        except (json.JSONDecodeError, UnicodeDecodeError, AttributeError):
            data = {"status": str(payload)}

        raw = data.get("status", "").lower()
        if raw in ("printing", "busy"):
            state = STATE_PRINTING
        elif raw in ("ok", "ready", "done"):
            state = STATE_READY
        elif raw.startswith("error") or raw in ("fail", "fault"):
            state = STATE_ERROR
        else:
            state = STATE_READY

        dispatcher_data = {
            "state": state,
            "last_result": data.get("status"),
            "last_printed_text": data.get("text"),
            "last_printed_at": data.get("timestamp"),
        }
        hass.data[DOMAIN]["entries"][entry.entry_id].update(dispatcher_data)
        async_dispatcher_send(
            hass, f"{SIGNAL_STATUS_UPDATE}_{entry.entry_id}", dispatcher_data
        )

    unsub = await async_subscribe(
        hass, config[CONF_RESP_TOPIC], async_status_message
    )
    hass.data[DOMAIN]["unsubs"][entry.entry_id] = unsub

    async def async_handle_print_label(call):
        text = call.data.get("text", "")
        if not text:
            _LOGGER.error("Print label called without text")
            return

        for eid, cfg in hass.data[DOMAIN]["entries"].items():
            payload = {
                "text": text,
                "template": call.data.get("template", "default"),
                "font_size": call.data.get("font_size", 24),
                "bold": call.data.get("bold", False),
                "quantity": call.data.get("quantity", 1),
            }
            if image := call.data.get("image"):
                payload["image"] = image

            await async_publish(
                hass, cfg[CONF_PRINT_TOPIC], json.dumps(payload)
            )
            async_dispatcher_send(
                hass, f"{SIGNAL_STATUS_UPDATE}_{eid}", {"state": STATE_PRINTING}
            )

    async def async_handle_cancel_print(call):
        for eid, cfg in hass.data[DOMAIN]["entries"].items():
            await async_publish(
                hass, cfg[CONF_PRINT_TOPIC], json.dumps({"command": "cancel"}),
            )

    if not hass.data.get(SERVICES_REGISTERED_KEY):
        hass.data[SERVICES_REGISTERED_KEY] = True
        hass.services.async_register(
            DOMAIN, SERVICE_PRINT_LABEL, async_handle_print_label
        )
        hass.services.async_register(
            DOMAIN, SERVICE_CANCEL_PRINT, async_handle_cancel_print
        )

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    return True


async def async_unload_entry(hass, entry):
    unsub = hass.data[DOMAIN]["unsubs"].pop(entry.entry_id, None)
    if unsub:
        unsub()

    hass.data[DOMAIN]["entries"].pop(entry.entry_id, None)

    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)

    if not hass.data[DOMAIN]["entries"]:
        hass.services.async_remove(DOMAIN, SERVICE_PRINT_LABEL)
        hass.services.async_remove(DOMAIN, SERVICE_CANCEL_PRINT)
        hass.data.pop(SERVICES_REGISTERED_KEY, None)

    return unload_ok


async def async_migrate_entry(hass, entry):
    _LOGGER.debug("Migrating Alebro config from v%s", entry.version)
    if entry.version == 1:
        entry.version = 2
        hass.config_entries.async_update_entry(entry, data={**entry.data})
    return True
