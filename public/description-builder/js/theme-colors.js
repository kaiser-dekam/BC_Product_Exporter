/* ====== Theme Color System ======
   Each theme defines a semantic color palette. Users can override individual colors.
   At render time, overrides are applied via string replacement in the generated HTML.
   ================================== */
window.ThemeColors = (function () {

  /* ── Default palettes per theme ── */
  const defaults = {
    'clean-modern': {
      primary:    '#6366f1',
      heading:    '#0f172a',
      text:       '#475569',
      textLight:  '#64748b',
      background: '#fff',
      surface:    '#f8fafc',
      border:     '#e2e8f0',
      accent:     '#6366f1',
      cta:        '#6366f1',
      ctaText:    '#fff'
    },
    'bold-commerce': {
      primary:    '#dc2626',
      heading:    '#0f172a',
      text:       '#334155',
      textLight:  '#475569',
      background: '#fff',
      surface:    '#f8fafc',
      border:     '#0f172a',
      accent:     '#dc2626',
      cta:        '#dc2626',
      ctaText:    '#fff'
    },
    'warm-editorial': {
      primary:    '#b45309',
      heading:    '#292524',
      text:       '#57534e',
      textLight:  '#78716c',
      background: '#fdfcfa',
      surface:    '#f5f5f4',
      border:     '#d6d3d1',
      accent:     '#b45309',
      cta:        '#b45309',
      ctaText:    '#fff'
    },
    'dark-premium': {
      primary:    '#22d3ee',
      heading:    '#fafafa',
      text:       '#a1a1aa',
      textLight:  '#71717a',
      background: '#18181b',
      surface:    '#27272a',
      border:     '#3f3f46',
      accent:     '#22d3ee',
      cta:        '#6366f1',
      ctaText:    '#fff'
    },
    'minimal-luxe': {
      primary:    '#0f172a',
      heading:    '#0f172a',
      text:       '#64748b',
      textLight:  '#94a3b8',
      background: '#fff',
      surface:    '#f8fafc',
      border:     '#e2e8f0',
      accent:     '#cbd5e1',
      cta:        '#0f172a',
      ctaText:    '#0f172a'
    },
    'vibrant-catalog': {
      primary:    '#6366f1',
      heading:    '#1e293b',
      text:       '#475569',
      textLight:  '#64748b',
      background: '#fff',
      surface:    '#fafbff',
      border:     '#e2e8f0',
      accent:     '#ec4899',
      cta:        '#6366f1',
      ctaText:    '#fff'
    }
  };

  /* ── Labels for the UI ── */
  const labels = {
    primary:    'Primary / Accent',
    heading:    'Heading Text',
    text:       'Body Text',
    textLight:  'Light Text',
    background: 'Background',
    surface:    'Surface / Cards',
    border:     'Borders',
    accent:     'Accent Highlights',
    cta:        'Button / CTA',
    ctaText:    'Button Text'
  };

  /* ── Current overrides (per theme) ── */
  let overrides = {}; // { 'clean-modern': { primary: '#ff0000' }, ... }

  function getDefaults(themeId) {
    return defaults[themeId] || defaults['clean-modern'];
  }

  function getResolved(themeId) {
    const def = { ...getDefaults(themeId) };
    const ov = overrides[themeId] || {};
    Object.keys(ov).forEach(k => { if (ov[k]) def[k] = ov[k]; });
    return def;
  }

  function getOverrides(themeId) {
    return overrides[themeId] || {};
  }

  function setOverride(themeId, colorKey, value) {
    if (!overrides[themeId]) overrides[themeId] = {};
    overrides[themeId][colorKey] = value;
  }

  function clearOverrides(themeId) {
    delete overrides[themeId];
  }

  function hasOverrides(themeId) {
    const ov = overrides[themeId];
    return ov && Object.keys(ov).length > 0;
  }

  /** Apply color overrides to rendered HTML via string replacement */
  function applyOverrides(html, themeId) {
    const def = getDefaults(themeId);
    const ov = overrides[themeId] || {};
    let result = html;
    Object.keys(ov).forEach(key => {
      if (ov[key] && def[key] && ov[key] !== def[key]) {
        // Replace all occurrences of the default color with the override
        // Use case-insensitive replacement to catch hex variants
        const escaped = def[key].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        result = result.replace(new RegExp(escaped, 'gi'), ov[key]);
      }
    });
    return result;
  }

  /** Get all overrides for serialization (saving with builder data) */
  function exportOverrides() {
    return JSON.parse(JSON.stringify(overrides));
  }

  /** Restore overrides from saved data */
  function importOverrides(data) {
    overrides = data && typeof data === 'object' ? JSON.parse(JSON.stringify(data)) : {};
  }

  return {
    defaults,
    labels,
    getDefaults,
    getResolved,
    getOverrides,
    setOverride,
    clearOverrides,
    hasOverrides,
    applyOverrides,
    exportOverrides,
    importOverrides
  };
})();
