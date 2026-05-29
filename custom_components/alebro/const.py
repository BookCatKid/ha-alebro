DOMAIN = "alebro"

CONF_WEB_UI_URL = "web_ui_url"
CONF_PRINT_TOPIC = "print_topic"
CONF_RESP_TOPIC = "resp_topic"
CONF_PRINTER_NAME = "printer_name"

DEFAULT_PRINT_TOPIC = "alebro/print"
DEFAULT_RESP_TOPIC = "alebro/status"

STATE_READY = "ready"
STATE_PRINTING = "printing"
STATE_ERROR = "error"
STATE_OFFLINE = "offline"

SERVICE_PRINT_LABEL = "print_label"
SERVICE_CANCEL_PRINT = "cancel_print"

EVENT_WEB_UI_OPEN = "alebro_web_ui_open"

SIGNAL_STATUS_UPDATE = f"{DOMAIN}_status_update"
