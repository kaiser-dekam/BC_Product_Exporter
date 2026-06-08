/* ====== HTML Generator: routes blocks through the active theme renderer ====== */
window.HTMLGenerator = {

  /** Signature embedded in HTML so we can detect & restore builder data */
  MARKER_START: '<!-- [MODULAR-DESC-BUILDER-DATA] ',
  MARKER_END: ' [/MODULAR-DESC-BUILDER-DATA] -->',

  generate(blocks) {
    if (!blocks || !blocks.length) return '';

    const renderer = this.getRenderer();
    const self = this;
    const innerHTML = blocks.map(b => self.renderBlock(b)).filter(Boolean).join('\n\n');

    let html;
    if (renderer && renderer.container) {
      html = renderer.container(innerHTML);
    } else {
      html = `<div style="font-family:system-ui,-apple-system,sans-serif;color:#333;background:#fff;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.06);max-width:1100px;margin:0 auto 18px;overflow:hidden;font-size:16px;padding:24px;">\n${innerHTML}\n</div>`;
    }

    // Apply color overrides via string replacement
    const themeId = (window.DesignSettings && window.DesignSettings.getActiveThemeId) ? window.DesignSettings.getActiveThemeId() : 'clean-modern';
    if (window.ThemeColors) {
      html = window.ThemeColors.applyOverrides(html, themeId);
    }

    // Embed block data + active theme + color overrides as an invisible comment.
    // This allows round-tripping: load product → restore builder state.
    const payload = {
      v: 2,
      theme: themeId,
      colorOverrides: window.ThemeColors ? window.ThemeColors.exportOverrides() : {},
      blocks: blocks
    };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    html += '\n' + this.MARKER_START + encoded + this.MARKER_END;

    return html;
  },

  /**
   * Attempt to extract builder data from an HTML description.
   * Returns { theme, blocks } or null if not a builder description.
   */
  extractBuilderData(html) {
    if (!html) return null;
    const startIdx = html.indexOf(this.MARKER_START);
    const endIdx = html.indexOf(this.MARKER_END);
    if (startIdx === -1 || endIdx === -1) return null;

    try {
      const encoded = html.substring(startIdx + this.MARKER_START.length, endIdx);
      const json = decodeURIComponent(escape(atob(encoded)));
      const payload = JSON.parse(json);
      if (payload && Array.isArray(payload.blocks)) {
        return {
          theme: payload.theme || 'clean-modern',
          blocks: payload.blocks,
          colorOverrides: payload.colorOverrides || {}
        };
      }
    } catch (e) {
      console.warn('Failed to parse builder data from description:', e);
    }
    return null;
  },

  getRenderer() {
    const ds = window.DesignSettings;
    if (!ds) return null;
    const id = ds.getActiveThemeId();
    return window.ThemeRenderers[id] || window.ThemeRenderers['clean-modern'] || null;
  },

  renderBlock(block) {
    const bt = BlockTypes[block.type];
    if (!bt) return '';

    const renderer = this.getRenderer();
    if (!renderer) return bt.renderHTML(block.data);

    const self = this;
    const blockRenderFn = (b) => self.renderBlock(b);

    // Route to theme renderer method
    switch (block.type) {
      case 'header': return renderer.header ? renderer.header(block.data) : bt.renderHTML(block.data);
      case 'text': return renderer.text ? renderer.text(block.data) : bt.renderHTML(block.data);
      case 'image': return renderer.image ? renderer.image(block.data) : bt.renderHTML(block.data);
      case 'video': return renderer.video ? renderer.video(block.data) : bt.renderHTML(block.data);
      case 'features': return renderer.features ? renderer.features(block.data) : bt.renderHTML(block.data);
      case 'comparison': return renderer.comparison ? renderer.comparison(block.data) : bt.renderHTML(block.data);
      case 'specs': return renderer.specs ? renderer.specs(block.data) : bt.renderHTML(block.data);
      case 'models': return renderer.models ? renderer.models(block.data) : bt.renderHTML(block.data);
      case 'divider': return renderer.divider ? renderer.divider(block.data) : bt.renderHTML(block.data);
      case 'cta': return renderer.cta ? renderer.cta(block.data) : bt.renderHTML(block.data);
      case 'rawhtml': return renderer.rawhtml ? renderer.rawhtml(block.data) : bt.renderHTML(block.data);
      case 'spacer': return renderer.spacer ? renderer.spacer(block.data) : bt.renderHTML(block.data);
      case 'twocol': return renderer.twocol ? renderer.twocol(block.data, blockRenderFn) : bt.renderHTML(block.data);
      case 'threecol': return renderer.threecol ? renderer.threecol(block.data, blockRenderFn) : bt.renderHTML(block.data);
      default: return bt.renderHTML(block.data);
    }
  }
};
