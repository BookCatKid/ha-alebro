import { LitElement, html, css } from "https://unpkg.com/lit-element@2.0.1/lit-element.js?module";

class AlebroLabelCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      _text: { type: String },
      _fontSize: { type: Number },
      _bold: { type: Boolean },
      _quantity: { type: Number },
      _printing: { type: Boolean },
    };
  }

  constructor() {
    super();
    this._text = "";
    this._fontSize = 24;
    this._bold = false;
    this._quantity = 1;
    this._printing = false;
  }

  setConfig(config) {
    if (!config.sensor_entity) {
      throw new Error("You need to specify sensor_entity");
    }
    this.config = {
      sensor_entity: config.sensor_entity,
      web_ui_url: config.web_ui_url || "",
      name: config.name || "Label Printer",
      show_preview: config.show_preview !== false,
    };
  }

  get _sensor() {
    return this.hass?.states[this.config?.sensor_entity];
  }

  get _state() {
    const s = this._sensor;
    return s ? s.state : "offline";
  }

  get _isOffline() {
    return this._state === "offline" || this._state === "error";
  }

  get _webUiUrl() {
    return this._sensor?.attributes?.web_ui_url || this.config?.web_ui_url;
  }

  get _lastPrinted() {
    return this._sensor?.attributes?.last_printed_text;
  }

  _print() {
    if (this._printing || !this._text.trim()) return;
    this._printing = true;
    this.hass.callService("alebro", "print_label", {
      text: this._text,
      font_size: this._fontSize,
      bold: this._bold,
      quantity: Math.max(1, this._quantity || 1),
    }).then(() => {
      setTimeout(() => { this._printing = false; this._text = ""; }, 2000);
    }, () => { this._printing = false; });
  }

  _openWeb() {
    const url = this._webUiUrl;
    if (url) {
      window.open(url, "_blank", "noopener");
    }
  }

  render() {
    if (!this.config || !this.hass) return html``;

    const offline = this._isOffline;
    const status = this._state;

    return html`
      <ha-card>
        <div class="top">
          <div class="name">
            <ha-icon icon="mdi:printer"></ha-icon>
            ${this.config.name}
          </div>
          <div class="status ${status}">
            <span class="dot"></span>
            ${status === "ready" ? "Ready" : status === "printing" ? "Printing" : status === "error" ? "Error" : "Offline"}
          </div>
        </div>

        ${offline ? html`
          <div class="error-box">
            <ha-icon icon="mdi:alert-circle"></ha-icon>
            Printer is ${status === "error" ? "reporting an error" : "offline"}. Check the printer connection.
          </div>
        ` : html`
          <div class="section">
            <input class="input" type="text" placeholder="Enter label text..."
                   .value=${this._text}
                   @input=${e => this._text = e.target.value}
                   @keydown=${e => e.key === "Enter" && this._print()}>
          </div>

          <div class="row">
            <select class="select" @change=${e => this._fontSize = parseInt(e.target.value)}>
              <option value="18" .selected=${this._fontSize === 18}>Small</option>
              <option value="24" .selected=${this._fontSize === 24}>Normal</option>
              <option value="36" .selected=${this._fontSize === 36}>Large</option>
              <option value="48" .selected=${this._fontSize === 48}>XL</option>
              <option value="72" .selected=${this._fontSize === 72}>XXL</option>
            </select>
            <button class="bold-btn ${this._bold ? "on" : ""}" @click=${() => this._bold = !this._bold}>B</button>
            <label class="qty-label">× <input class="qty" type="number" min="1" max="100"
                 .value=${this._quantity}
                 @change=${e => this._quantity = Math.max(1, parseInt(e.target.value) || 1)}></label>
          </div>

          ${this.config.show_preview && this._text ? html`
            <div class="preview" style="font-size:${Math.min(this._fontSize, 60)}px;font-weight:${this._bold ? 700 : 400}">
              ${this._text}
            </div>
          ` : ""}

          <div class="actions">
            <button class="print ${this._printing ? "busy" : ""}"
                    ?disabled=${this._printing || !this._text.trim()}
                    @click=${this._print}>
              ${this._printing ? "Printing..." : "Print Label"}
            </button>
          </div>
        `}

        ${this._webUiUrl ? html`
          <button class="webui" @click=${this._openWeb}>
            <ha-icon icon="mdi:open-in-new"></ha-icon> Open Web UI
          </button>
        ` : ""}

        <div class="foot">
          ${this._lastPrinted ? html`Last: ${this._lastPrinted}` : "No prints yet"}
        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      ha-card { padding: 16px; font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif); }

      .top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--divider-color, #e0e0e0); }
      .name { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 600; color: var(--primary-text-color, #1c1c1e); }
      .name ha-icon { color: var(--primary-color, #03a9f4); width: 22px; height: 22px; }
      .status { display: flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 500; }
      .status.ready { background: rgba(67,160,71,0.12); color: #43a047; }
      .status.printing { background: rgba(251,140,0,0.12); color: #fb8c00; }
      .status.error { background: rgba(229,57,53,0.12); color: #e53935; }
      .status.offline { background: rgba(142,142,147,0.12); color: #8e8e93; }
      .dot { width: 7px; height: 7px; border-radius: 50%; }
      .ready .dot { background: #43a047; }
      .printing .dot { background: #fb8c00; animation: pulse 1s ease-in-out infinite; }
      .error .dot { background: #e53935; }
      .offline .dot { background: #8e8e93; }
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

      .error-box { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: rgba(229,57,53,0.08); border-radius: 8px; color: #e53935; font-size: 13px; margin-bottom: 10px; }
      .error-box ha-icon { color: #e53935; width: 20px; height: 20px; flex-shrink: 0; }

      .section { margin-bottom: 10px; }
      .input { width: 100%; padding: 10px 12px; border: 1.5px solid var(--divider-color, #e0e0e0); border-radius: 8px; font-size: 14px; background: transparent; color: var(--primary-text-color, #1c1c1e); box-sizing: border-box; outline: none; }
      .input:focus { border-color: var(--primary-color, #03a9f4); }

      .row { display: flex; gap: 8px; align-items: center; margin-bottom: 10px; }
      .select { padding: 5px 8px; border: 1.5px solid var(--divider-color, #e0e0e0); border-radius: 6px; font-size: 12px; background: transparent; color: var(--primary-text-color, #1c1c1e); outline: none; }
      .bold-btn { width: 32px; height: 28px; border: 1.5px solid var(--divider-color, #e0e0e0); border-radius: 6px; font-weight: 700; font-size: 14px; cursor: pointer; background: transparent; color: var(--primary-text-color, #1c1c1e); }
      .bold-btn.on { border-color: var(--primary-color, #03a9f4); background: rgba(3,169,244,0.1); }
      .qty-label { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--secondary-text-color, #8e8e93); }
      .qty { width: 40px; padding: 4px; border: 1.5px solid var(--divider-color, #e0e0e0); border-radius: 6px; font-size: 12px; text-align: center; background: transparent; color: var(--primary-text-color, #1c1c1e); outline: none; }
      .qty:focus { border-color: var(--primary-color, #03a9f4); }

      .preview { padding: 12px; border: 1.5px dashed var(--divider-color, #e0e0e0); border-radius: 8px; text-align: center; margin-bottom: 10px; word-break: break-all; background: rgba(0,0,0,0.015); }

      .actions { margin-bottom: 10px; }
      .print { width: 100%; padding: 11px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; background: var(--primary-color, #03a9f4); color: #fff; transition: 0.2s; }
      .print:hover { filter: brightness(1.08); }
      .print:disabled { opacity: 0.5; cursor: not-allowed; filter: none; }
      .print.busy { background: #fb8c00; }

      .webui { width: 100%; padding: 9px; border: 1.5px solid var(--divider-color, #e0e0e0); border-radius: 8px; cursor: pointer; background: transparent; color: var(--primary-text-color, #1c1c1e); font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 10px; }
      .webui:hover { border-color: var(--primary-color, #03a9f4); }

      .foot { padding-top: 8px; border-top: 1px solid var(--divider-color, #e0e0e0); font-size: 11px; color: var(--secondary-text-color, #8e8e93); }
    `;
  }

  getCardSize() { return 3; }
  static getStubConfig() { return { sensor_entity: "" }; }
}

customElements.define("alebro-label-card", AlebroLabelCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "alebro-label-card",
  name: "Alebro Label Card",
  description: "Print labels on your Alebro printer",
  preview: true,
});
