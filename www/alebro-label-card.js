(async () => {
  let LitElement, html, css;

  if (window.LitElement) {
    LitElement = window.LitElement;
    html = window.html;
    css = window.css;
  } else {
    try {
      const mod = await import("https://unpkg.com/lit@2.8.0/index.js?module");
      LitElement = mod.LitElement;
      html = mod.html;
      css = mod.css;
    } catch {
      const base = customElements.get("hui-view");
      LitElement = base && Object.getPrototypeOf(base);
      html = (s, ...v) => s.reduce((a, s, i) => a + s + (v[i] || ""), "");
      css = (s) => s.join ? s.join("") : s;
    }
  }

  if (!LitElement) {
    console.error("[Alebro] LitElement not found — card cannot render");
    return;
  }

  const FONTS = [
    { label: "Tiny", size: 12 },
    { label: "Small", size: 18 },
    { label: "Normal", size: 24 },
    { label: "Large", size: 36 },
    { label: "XL", size: 48 },
    { label: "XXL", size: 72 },
  ];

  const TEMPLATES = [
    { id: "default", label: "Default", icon: "label" },
    { id: "shipping", label: "Shipping", icon: "package-variant" },
    { id: "address", label: "Address", icon: "card-text" },
    { id: "barcode", label: "Barcode", icon: "barcode" },
    { id: "price", label: "Price Tag", icon: "currency-usd" },
    { id: "name", label: "Badge", icon: "badge-account" },
  ];

  class AlebroLabelCard extends LitElement {
    static get properties() {
      return {
        hass: { type: Object },
        config: { type: Object },
        _text: { type: String, state: true },
        _template: { type: String, state: true },
        _fontSize: { type: Number, state: true },
        _bold: { type: Boolean, state: true },
        _quantity: { type: Number, state: true },
        _printing: { type: Boolean, state: true },
      };
    }

    constructor() {
      super();
      this._text = "";
      this._template = "default";
      this._fontSize = 24;
      this._bold = false;
      this._quantity = 1;
      this._printing = false;
    }

    setConfig(config) {
      if (!config.entity && !config.sensor_entity) {
        throw new Error("You need to specify entity or sensor_entity");
      }
      this.config = {
        entity: config.entity,
        sensor_entity: config.sensor_entity,
        web_ui_url: config.web_ui_url || "",
        name: config.name || "Alebro Label Printer",
        show_preview: config.show_preview !== false,
        templates: config.templates || TEMPLATES,
      };
    }

    get _sensor() {
      return this.config?.sensor_entity && this.hass?.states[this.config.sensor_entity];
    }

    get _status() {
      const s = this._sensor;
      return s ? s.state : "offline";
    }

    get _statusClass() {
      const st = this._status;
      if (["ready", "ok", "done"].includes(st)) return "ready";
      if (["printing", "busy"].includes(st)) return "printing";
      if (["error", "fail", "fault"].includes(st)) return "error";
      return "offline";
    }

    get _statusLabel() {
      return { ready: "Ready", printing: "Printing", error: "Error", offline: "Offline" }[this._statusClass] || "Offline";
    }

    get _webUiUrl() {
      return this._sensor?.attributes?.web_ui_url || this.config?.web_ui_url || "";
    }

    get _lastPrinted() {
      return this._sensor?.attributes?.last_printed_text;
    }

    get _lastPrintedAt() {
      return this._sensor?.attributes?.last_printed_at;
    }

    _print() {
      if (this._printing || !this._text.trim()) return;
      this._printing = true;
      this.hass.callService("alebro", "print_label", {
        text: this._text,
        template: this._template,
        font_size: this._fontSize,
        bold: this._bold,
        quantity: Math.max(1, this._quantity || 1),
      }).then(() => {
        setTimeout(() => { this._printing = false; }, 2500);
      }, () => { this._printing = false; });
    }

    _openWeb() {
      const url = this._webUiUrl;
      if (url) window.open(url, "_blank");
    }

    _formatTime(iso) {
      if (!iso) return "";
      try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
      catch { return iso; }
    }

    render() {
      if (!this.config || !this.hass) return html``;

      const tpls = this.config.templates;
      return html`
        <ha-card>
          <div class="header">
            <div class="title-row">
              <ha-icon icon="mdi:printer"></ha-icon>
              <span>${this.config.name}</span>
            </div>
            <div class="badge ${this._statusClass}">
              <span class="dot"></span>${this._statusLabel}
            </div>
          </div>

          <div class="section">
            <div class="label">Template</div>
            <div class="grid">
              ${tpls.map(t => html`
                <button class="tpl-btn ${t.id === this._template ? "active" : ""}"
                        @click=${() => this._template = t.id}>
                  <ha-icon icon="mdi:${t.icon}"></ha-icon>
                  <span>${t.label}</span>
                </button>
              `)}
            </div>
          </div>

          <div class="section">
            <div class="label">Label Text</div>
            <input class="input" type="text" placeholder="Enter label text..."
                   .value=${this._text}
                   @input=${e => this._text = e.target.value}
                   @keydown=${e => e.key === "Enter" && this._print()}>
          </div>

          <div class="section">
            <div class="label">Formatting</div>
            <div class="row">
              <div class="ctrl-group">
                ${FONTS.map(f => html`
                  <button class="chip ${f.size === this._fontSize ? "active" : ""}"
                          @click=${() => this._fontSize = f.size}>${f.label}</button>
                `)}
              </div>
              <div class="ctrl-group">
                <button class="chip bold ${this._bold ? "active" : ""}"
                        @click=${() => this._bold = !this._bold}>B</button>
              </div>
              <div class="ctrl-group">
                <span class="dim">Qty</span>
                <input class="qty" type="number" min="1" max="100"
                       .value=${this._quantity}
                       @change=${e => this._quantity = Math.max(1, parseInt(e.target.value) || 1)}>
              </div>
            </div>
          </div>

          ${this.config.show_preview && this._text ? html`
            <div class="preview">
              <span style="font-size:${Math.min(this._fontSize, 60)}px;font-weight:${this._bold ? 700 : 400}">
                ${this._text}
              </span>
            </div>
          ` : ""}

          <div class="actions">
            <button class="print-btn ${this._printing ? "busy" : ""}"
                    ?disabled=${this._printing || !this._text.trim()}
                    @click=${this._print}>
              ${this._printing ? html`<span class="spinner"></span> Printing...` : html`<ha-icon icon="mdi:printer"></ha-icon> Print Label`}
            </button>
            ${this._webUiUrl ? html`
              <button class="web-btn" @click=${this._openWeb}>
                <ha-icon icon="mdi:open-in-new"></ha-icon> Open UI
              </button>
            ` : ""}
          </div>

          <div class="footer">
            ${this._lastPrinted ? html`<span>Last: ${this._lastPrinted}</span>` : html`<span class="dim">No prints yet</span>`}
            ${this._lastPrintedAt ? html`<span class="dim">${this._formatTime(this._lastPrintedAt)}</span>` : ""}
          </div>
        </ha-card>
      `;
    }

    static get styles() {
      return css`
        :host { --accent: var(--primary-color, #03a9f4); }
        ha-card { padding: 16px; font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif); }

        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--divider-color, #e0e0e0); }
        .title-row { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 600; color: var(--primary-text-color, #1c1c1e); }
        .title-row ha-icon { color: var(--accent); width: 22px; height: 22px; }

        .badge { display: flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 500; }
        .badge.ready { background: rgba(67,160,71,0.12); color: #43a047; }
        .badge.printing { background: rgba(251,140,0,0.12); color: #fb8c00; }
        .badge.error { background: rgba(229,57,53,0.12); color: #e53935; }
        .badge.offline { background: rgba(142,142,147,0.12); color: #8e8e93; }
        .dot { width: 7px; height: 7px; border-radius: 50%; }
        .ready .dot { background: #43a047; }
        .printing .dot { background: #fb8c00; animation: pulse 1s ease-in-out infinite; }
        .error .dot { background: #e53935; }
        .offline .dot { background: #8e8e93; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

        .section { margin-bottom: 12px; }
        .label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.7px; color: var(--secondary-text-color, #8e8e93); margin-bottom: 6px; }

        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
        .tpl-btn { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 8px 4px; border: 2px solid var(--divider-color, #e0e0e0); border-radius: 8px; cursor: pointer; background: transparent; color: var(--primary-text-color, #1c1c1e); font-size: 10px; transition: 0.15s; }
        .tpl-btn:hover { border-color: var(--accent); }
        .tpl-btn.active { border-color: var(--accent); background: rgba(3,169,244,0.08); }
        .tpl-btn ha-icon { color: var(--accent); width: 18px; height: 18px; }

        .input { width: 100%; padding: 9px 10px; border: 1.5px solid var(--divider-color, #e0e0e0); border-radius: 8px; font-size: 14px; background: transparent; color: var(--primary-text-color, #1c1c1e); box-sizing: border-box; outline: none; }
        .input:focus { border-color: var(--accent); }

        .row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .ctrl-group { display: flex; align-items: center; gap: 5px; }
        .chip { padding: 3px 10px; border: 1.5px solid var(--divider-color, #e0e0e0); border-radius: 5px; cursor: pointer; background: transparent; color: var(--primary-text-color, #1c1c1e); font-size: 11px; transition: 0.15s; }
        .chip:hover { border-color: var(--accent); }
        .chip.active { border-color: var(--accent); background: rgba(3,169,244,0.1); }
        .chip.bold { font-weight: 700; font-size: 13px; }
        .qty { width: 44px; padding: 3px 6px; border: 1.5px solid var(--divider-color, #e0e0e0); border-radius: 5px; font-size: 13px; text-align: center; background: transparent; color: var(--primary-text-color, #1c1c1e); outline: none; }
        .qty:focus { border-color: var(--accent); }
        .dim { color: var(--secondary-text-color, #8e8e93); font-size: 11px; }

        .preview { margin-top: 8px; padding: 14px; border: 1.5px dashed var(--divider-color, #e0e0e0); border-radius: 8px; text-align: center; min-height: 36px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.015); word-break: break-all; }

        .actions { display: flex; gap: 8px; margin-top: 8px; }
        .print-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; background: var(--accent); color: #fff; transition: 0.2s; }
        .print-btn:hover { filter: brightness(1.08); }
        .print-btn:disabled { opacity: 0.5; cursor: not-allowed; filter: none; }
        .print-btn.busy { background: #fb8c00; }
        .spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.5s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .web-btn { display: flex; align-items: center; gap: 4px; padding: 10px 14px; border: 1.5px solid var(--divider-color, #e0e0e0); border-radius: 8px; cursor: pointer; background: transparent; color: var(--primary-text-color, #1c1c1e); font-size: 12px; transition: 0.2s; white-space: nowrap; }
        .web-btn:hover { border-color: var(--accent); }

        .footer { display: flex; justify-content: space-between; margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--divider-color, #e0e0e0); font-size: 11px; color: var(--secondary-text-color, #8e8e93); }
      `;
    }

    getCardSize() { return 3; }
    static getConfigElement() { return document.createElement("alebro-label-card-editor"); }
    static getStubConfig() { return { entity: "", sensor_entity: "" }; }
  }

  customElements.define("alebro-label-card", AlebroLabelCard);

  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "alebro-label-card",
    name: "Alebro Label Card",
    description: "Design and print labels on your Alebro label printer",
    preview: true,
    documentationURL: "https://github.com/BookCatKid/ha-alebro",
  });
})();
