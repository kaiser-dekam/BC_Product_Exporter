/* ====== Design Settings: theme picker & color customization panel ====== */
window.DesignSettings = (function () {

  let activeThemeId = 'clean-modern';
  let panelEl = null;
  let onChangeCallbacks = [];

  function getActiveThemeId() { return activeThemeId; }

  function setTheme(id) {
    if (!window.ThemeRenderers[id]) return;
    activeThemeId = id;
    renderPanel();
    fireChange();
  }

  function onChange(cb) { onChangeCallbacks.push(cb); }
  function fireChange() { onChangeCallbacks.forEach(cb => cb(activeThemeId)); }

  /* ---------- Render Panel ---------- */
  function renderPanel() {
    if (!panelEl) return;
    panelEl.innerHTML = '';

    const renderers = window.ThemeRenderers;
    if (!renderers) return;

    // ── Theme Picker Section ──
    const title = document.createElement('div');
    title.className = 'design-panel-title';
    title.textContent = 'Design Theme';
    panelEl.appendChild(title);

    const subtitle = document.createElement('div');
    subtitle.className = 'design-panel-subtitle';
    subtitle.textContent = 'Each theme changes both the HTML structure and styling of your output.';
    panelEl.appendChild(subtitle);

    // Theme cards
    const grid = document.createElement('div');
    grid.className = 'theme-card-list';

    Object.keys(renderers).forEach(id => {
      const theme = renderers[id];
      const card = document.createElement('div');
      card.className = 'theme-card' + (activeThemeId === id ? ' active' : '');
      card.onclick = () => setTheme(id);

      // Swatch
      const swatch = document.createElement('div');
      swatch.className = 'theme-swatch';
      swatch.style.background = theme.thumbnail || '#e5e7eb';

      if (activeThemeId === id) {
        const check = document.createElement('div');
        check.className = 'theme-check';
        check.innerHTML = '&#10003;';
        swatch.appendChild(check);
      }

      card.appendChild(swatch);

      // Info
      const info = document.createElement('div');
      info.className = 'theme-card-info';

      const name = document.createElement('div');
      name.className = 'theme-card-name';
      name.textContent = theme.name;
      info.appendChild(name);

      const desc = document.createElement('div');
      desc.className = 'theme-card-desc';
      desc.textContent = theme.description;
      info.appendChild(desc);

      card.appendChild(info);
      grid.appendChild(card);
    });

    panelEl.appendChild(grid);

    // ── Color Editor Section ──
    if (window.ThemeColors) {
      renderColorEditor();
    }

    // Live preview hint
    const hint = document.createElement('div');
    hint.className = 'design-panel-hint';
    hint.innerHTML = 'Click <strong>Preview</strong> to see how your theme and color changes render.';
    panelEl.appendChild(hint);
  }

  /* ---------- Color Editor ---------- */
  function renderColorEditor() {
    const TC = window.ThemeColors;
    const resolved = TC.getResolved(activeThemeId);
    const defaults = TC.getDefaults(activeThemeId);
    const labels = TC.labels;
    const hasOv = TC.hasOverrides(activeThemeId);

    // Section divider
    const divider = document.createElement('div');
    divider.className = 'color-editor-divider';
    panelEl.appendChild(divider);

    // Header row
    const headerRow = document.createElement('div');
    headerRow.className = 'color-editor-header';

    const colorTitle = document.createElement('div');
    colorTitle.className = 'design-panel-title';
    colorTitle.textContent = 'Colors';
    headerRow.appendChild(colorTitle);

    if (hasOv) {
      const resetBtn = document.createElement('button');
      resetBtn.className = 'color-reset-btn';
      resetBtn.textContent = 'Reset to defaults';
      resetBtn.onclick = () => {
        TC.clearOverrides(activeThemeId);
        renderPanel();
        fireChange();
      };
      headerRow.appendChild(resetBtn);
    }

    panelEl.appendChild(headerRow);

    const colorSubtitle = document.createElement('div');
    colorSubtitle.className = 'design-panel-subtitle';
    colorSubtitle.textContent = 'Customize the color palette for this theme.';
    panelEl.appendChild(colorSubtitle);

    // ── Brand Presets ──
    const brandPresets = [
      { name: 'ES Attachments', color: '#00bf00' },
      { name: 'Tomahawk / ProTilt', color: '#ed852c' }
    ];

    const brandRow = document.createElement('div');
    brandRow.className = 'brand-presets';

    brandPresets.forEach(brand => {
      const btn = document.createElement('button');
      btn.className = 'brand-preset-btn';
      btn.innerHTML = `<span class="brand-preset-swatch" style="background:${brand.color}"></span>${brand.name}`;
      btn.onclick = () => {
        TC.setOverride(activeThemeId, 'primary', brand.color);
        TC.setOverride(activeThemeId, 'accent', brand.color);
        TC.setOverride(activeThemeId, 'cta', brand.color);
        renderPanel();
        fireChange();
      };
      brandRow.appendChild(btn);
    });

    panelEl.appendChild(brandRow);

    // Color rows
    const colorGrid = document.createElement('div');
    colorGrid.className = 'color-editor-grid';

    Object.keys(labels).forEach(key => {
      const row = document.createElement('div');
      row.className = 'color-editor-row';

      const label = document.createElement('label');
      label.className = 'color-editor-label';
      label.textContent = labels[key];

      const controls = document.createElement('div');
      controls.className = 'color-editor-controls';

      // Color picker (native)
      const picker = document.createElement('input');
      picker.type = 'color';
      picker.className = 'color-picker';
      picker.value = resolved[key] || '#000000';
      picker.title = `Default: ${defaults[key]}`;

      // Hex input
      const hexInput = document.createElement('input');
      hexInput.type = 'text';
      hexInput.className = 'color-hex-input';
      hexInput.value = resolved[key] || '';
      hexInput.placeholder = defaults[key];
      hexInput.maxLength = 7;

      // Show override indicator
      const isOverridden = resolved[key] !== defaults[key];
      if (isOverridden) {
        row.classList.add('overridden');
      }

      // Sync picker → hex
      picker.addEventListener('input', () => {
        hexInput.value = picker.value;
        TC.setOverride(activeThemeId, key, picker.value);
        updateOverrideIndicator(row, picker.value !== defaults[key]);
      });

      // Sync hex → picker
      hexInput.addEventListener('input', () => {
        let val = hexInput.value.trim();
        if (val && !val.startsWith('#')) val = '#' + val;
        if (/^#[0-9a-fA-F]{6}$/.test(val)) {
          picker.value = val;
          TC.setOverride(activeThemeId, key, val);
          updateOverrideIndicator(row, val !== defaults[key]);
        }
      });
      hexInput.addEventListener('blur', () => {
        let val = hexInput.value.trim();
        if (val && !val.startsWith('#')) val = '#' + val;
        if (/^#[0-9a-fA-F]{6}$/.test(val)) {
          hexInput.value = val;
        } else if (!val) {
          // Clear override, revert to default
          TC.setOverride(activeThemeId, key, '');
          picker.value = defaults[key];
          hexInput.value = defaults[key];
          updateOverrideIndicator(row, false);
        }
      });

      controls.appendChild(picker);
      controls.appendChild(hexInput);

      row.appendChild(label);
      row.appendChild(controls);
      colorGrid.appendChild(row);
    });

    panelEl.appendChild(colorGrid);
  }

  function updateOverrideIndicator(row, isOverridden) {
    row.classList.toggle('overridden', isOverridden);
  }

  function init(containerEl) {
    panelEl = containerEl;
    renderPanel();
  }

  return { init, getActiveThemeId, setTheme, onChange };
})();
