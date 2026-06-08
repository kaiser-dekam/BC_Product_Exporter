/* ====== Theme Renderers ======
   Each theme defines its own HTML structure for every block type.
   Same data, completely different markup & layout.
   ============================== */
window.ThemeRenderers = {};

/* ─── Helper shared across all themes ─── */
const _e = (s) => { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; };
const _a = (s) => (s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function _embed(url) {
  if (!url) return '';
  let m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  m = url.match(/vimeo\.com\/(\d+)/);
  if (m) return `https://player.vimeo.com/video/${m[1]}`;
  return '';
}


/* ================================================================
   1. CLEAN MODERN
   Airy, card-based, soft shadows, pill buttons, rounded everything
   ================================================================ */
ThemeRenderers['clean-modern'] = {
  name: 'Clean Modern',
  description: 'Airy cards, soft shadows, rounded corners, and clean typography',
  thumbnail: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',

  container(inner) {
    return `<div style="font-family:'Inter',system-ui,-apple-system,sans-serif;font-size:16px;line-height:1.65;color:#334155;background:#fff;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.06);max-width:1100px;margin:0 auto 18px;overflow:hidden;padding:32px 36px;">\n${inner}\n</div>`;
  },

  header(data) {
    const tag = data.level || 'h2';
    const sizes = { h1: '2rem', h2: '1.45rem', h3: '1.15rem', h4: '1rem' };
    return `<${tag} style="color:#0f172a;font-weight:700;font-size:${sizes[tag]};margin:0 0 16px;letter-spacing:-.01em;">${_e(data.text)}</${tag}>`;
  },

  text(data) {
    return `<div style="line-height:1.65;margin-bottom:18px;color:#475569;">${data.html || ''}</div>`;
  },

  image(data) {
    if (!data.src) return '';
    return `<div style="text-align:center;margin:20px 0;"><img src="${_a(data.src)}" alt="${_a(data.alt)}" style="max-width:${_a(data.width)};height:auto;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.06);"></div>`;
  },

  video(data) {
    const url = _embed(data.url);
    if (!url) return '';
    return `<div style="margin:20px 0;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08);"><div style="position:relative;padding-bottom:56.25%;height:0;"><iframe src="${_a(url)}" style="position:absolute;inset:0;width:100%;height:100%;border:0;" allowfullscreen></iframe></div></div>`;
  },

  features(data) {
    if (!data.items.length) return '';
    const cards = data.items.map(f =>
      `<li style="background:#fff;border:1px solid #e2e8f0;border-top:3px solid #6366f1;border-radius:12px;padding:18px;box-shadow:0 2px 8px rgba(0,0,0,.04);">
        ${f.title ? `<strong style="color:#0f172a;display:block;margin-bottom:6px;font-size:.95rem;">${_e(f.title)}</strong>` : ''}
        <span style="color:#64748b;font-size:.88rem;line-height:1.5;">${_e(f.text)}</span>
      </li>`
    ).join('\n');
    return `<ul style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin:20px 0;padding:0;list-style:none;">\n${cards}\n</ul>`;
  },

  comparison(data) {
    const ths = data.columns.map(c => `<th style="padding:14px 16px;background:#f8fafc;border-bottom:2px solid #e2e8f0;text-align:left;font-weight:600;color:#0f172a;font-size:.88rem;">${_e(c)}</th>`).join('');
    const trs = data.rows.map(row =>
      `<tr>${row.map(cell => `<td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;color:#475569;font-size:.88rem;">${_e(cell)}</td>`).join('')}</tr>`
    ).join('\n');
    return `<div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin:20px 0;box-shadow:0 2px 8px rgba(0,0,0,.04);"><table style="width:100%;border-collapse:collapse;"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`;
  },

  specs(data) {
    const trs = data.rows.map(r =>
      `<tr><th style="width:44%;padding:13px 16px;border-bottom:1px solid #f1f5f9;color:#334155;font-weight:600;text-align:left;font-size:.88rem;">${_e(r.label)}</th><td style="padding:13px 16px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:.88rem;">${_e(r.value)}</td></tr>`
    ).join('\n');
    return `<div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin:20px 0;box-shadow:0 2px 8px rgba(0,0,0,.04);">${data.title ? `<div style="background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:14px 16px;font-weight:700;color:#0f172a;font-size:.92rem;">${_e(data.title)}</div>` : ''}<table style="width:100%;border-collapse:collapse;"><tbody>${trs}</tbody></table></div>`;
  },

  models(data) {
    const pills = data.items.map(m => {
      const style = `display:inline-flex;align-items:center;padding:8px 18px;font-size:.85rem;font-weight:600;border:1px solid #e2e8f0;border-radius:999px;background:#fff;color:#334155;text-decoration:none;box-shadow:0 1px 4px rgba(0,0,0,.04);transition:box-shadow .15s;`;
      return m.url ? `<a href="${_a(m.url)}" style="${style}">${_e(m.label)}</a>` : `<span style="${style}">${_e(m.label)}</span>`;
    }).join('\n');
    return `<div style="margin:20px 0;">${data.title ? `<h4 style="color:#0f172a;font-weight:700;font-size:1rem;margin:0 0 12px;">${_e(data.title)}</h4>` : ''}<div style="display:flex;flex-wrap:wrap;gap:10px;">${pills}</div></div>`;
  },

  divider(data) {
    if (data.style === 'space') return `<div style="height:${parseInt(data.height) || 24}px;"></div>`;
    if (data.style === 'dotted') return `<hr style="border:none;border-top:2px dotted #e2e8f0;margin:20px 0;">`;
    return `<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">`;
  },

  cta(data) {
    const colors = { green: 'background:#6366f1;color:#fff;', dark: 'background:#0f172a;color:#fff;', gray: 'background:#64748b;color:#fff;' };
    return `<div style="margin:24px 0;text-align:center;"><a href="${_a(data.url)}" style="display:inline-flex;align-items:center;padding:14px 28px;border:none;border-radius:999px;text-decoration:none;font-weight:700;font-size:.95rem;box-shadow:0 4px 14px rgba(99,102,241,.25);${colors[data.style] || colors.green}">${_e(data.text)}</a></div>`;
  },

  rawhtml(data) {
    return data.code || '';
  },

  spacer(data) {
    const h = parseInt(data.height) || 40;
    return `<div style="height:${h}px;"></div>`;
  },

  twocol(data, renderBlock) {
    const rc = (blocks) => (blocks || []).map(b => renderBlock(b)).filter(Boolean).join('\n');
    return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:28px;margin:20px 0;">\n<div>${rc(data.left)}</div>\n<div>${rc(data.right)}</div>\n</div>`;
  },

  threecol(data, renderBlock) {
    const rc = (blocks) => (blocks || []).map(b => renderBlock(b)).filter(Boolean).join('\n');
    return `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin:20px 0;">\n<div>${rc(data.col1)}</div>\n<div>${rc(data.col2)}</div>\n<div>${rc(data.col3)}</div>\n</div>`;
  }
};


/* ================================================================
   2. BOLD COMMERCE
   High-contrast sections, numbered features, heavy borders,
   full-width color banners, uppercase headings
   ================================================================ */
ThemeRenderers['bold-commerce'] = {
  name: 'Bold Commerce',
  description: 'High-contrast sections with bold typography, numbered features, and strong visual hierarchy',
  thumbnail: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',

  container(inner) {
    return `<div style="font-family:'Inter',system-ui,-apple-system,sans-serif;font-size:16px;line-height:1.6;color:#1e293b;background:#fff;border:3px solid #0f172a;max-width:1100px;margin:0 auto 18px;overflow:hidden;">\n${inner}\n</div>`;
  },

  header(data) {
    const tag = data.level || 'h2';
    const sizes = { h1: '2.2rem', h2: '1.5rem', h3: '1.2rem', h4: '1rem' };
    if (tag === 'h1') {
      return `<div style="background:#0f172a;padding:28px 36px;margin:0 0 0;"><${tag} style="color:#fff;font-weight:900;font-size:${sizes[tag]};text-transform:uppercase;letter-spacing:.04em;margin:0;">${_e(data.text)}</${tag}></div>`;
    }
    return `<${tag} style="color:#0f172a;font-weight:900;font-size:${sizes[tag]};text-transform:uppercase;letter-spacing:.03em;margin:0 0 14px;padding:0 36px;border-left:5px solid #dc2626;">${_e(data.text)}</${tag}>`;
  },

  text(data) {
    return `<div style="line-height:1.6;margin:0 0 18px;padding:0 36px;color:#334155;font-size:.95rem;">${data.html || ''}</div>`;
  },

  image(data) {
    if (!data.src) return '';
    return `<div style="margin:0;"><img src="${_a(data.src)}" alt="${_a(data.alt)}" style="width:100%;height:auto;display:block;"></div>`;
  },

  video(data) {
    const url = _embed(data.url);
    if (!url) return '';
    return `<div style="margin:0;border-top:3px solid #0f172a;border-bottom:3px solid #0f172a;"><div style="position:relative;padding-bottom:56.25%;height:0;"><iframe src="${_a(url)}" style="position:absolute;inset:0;width:100%;height:100%;border:0;" allowfullscreen></iframe></div></div>`;
  },

  features(data) {
    if (!data.items.length) return '';
    const items = data.items.map((f, i) =>
      `<div style="display:flex;gap:16px;align-items:flex-start;padding:18px 36px;${i % 2 === 0 ? 'background:#f8fafc;' : 'background:#fff;'}border-bottom:1px solid #e2e8f0;">
        <div style="width:36px;height:36px;flex-shrink:0;background:#dc2626;color:#fff;font-weight:900;font-size:1rem;display:flex;align-items:center;justify-content:center;">${String(i + 1).padStart(2, '0')}</div>
        <div>
          ${f.title ? `<strong style="color:#0f172a;display:block;margin-bottom:4px;font-size:.95rem;text-transform:uppercase;letter-spacing:.02em;">${_e(f.title)}</strong>` : ''}
          <span style="color:#475569;font-size:.88rem;">${_e(f.text)}</span>
        </div>
      </div>`
    ).join('\n');
    return `<div style="margin:0;border-top:3px solid #0f172a;">\n${items}\n</div>`;
  },

  comparison(data) {
    const ths = data.columns.map(c => `<th style="padding:14px 18px;background:#0f172a;color:#fff;text-align:left;font-weight:700;font-size:.85rem;text-transform:uppercase;letter-spacing:.03em;">${_e(c)}</th>`).join('');
    const trs = data.rows.map((row, ri) =>
      `<tr style="${ri % 2 === 1 ? 'background:#f8fafc;' : ''}">${row.map((cell, ci) => `<td style="padding:12px 18px;border-bottom:1px solid #e2e8f0;color:${ci === 0 ? '#0f172a;font-weight:600' : '#475569'};font-size:.88rem;">${_e(cell)}</td>`).join('')}</tr>`
    ).join('\n');
    return `<div style="margin:24px 36px;border:2px solid #0f172a;overflow:hidden;"><table style="width:100%;border-collapse:collapse;"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`;
  },

  specs(data) {
    const trs = data.rows.map((r, i) =>
      `<tr style="${i % 2 === 1 ? 'background:#f8fafc;' : ''}"><th style="width:40%;padding:12px 18px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-weight:700;text-align:left;font-size:.85rem;text-transform:uppercase;letter-spacing:.02em;">${_e(r.label)}</th><td style="padding:12px 18px;border-bottom:1px solid #e2e8f0;color:#475569;font-size:.88rem;">${_e(r.value)}</td></tr>`
    ).join('\n');
    return `<div style="margin:24px 36px;border:2px solid #0f172a;overflow:hidden;">${data.title ? `<div style="background:#0f172a;padding:14px 18px;font-weight:700;color:#fff;font-size:.88rem;text-transform:uppercase;letter-spacing:.04em;">${_e(data.title)}</div>` : ''}<table style="width:100%;border-collapse:collapse;"><tbody>${trs}</tbody></table></div>`;
  },

  models(data) {
    const btns = data.items.map(m => {
      const style = `display:inline-flex;align-items:center;padding:10px 20px;font-size:.85rem;font-weight:700;text-transform:uppercase;letter-spacing:.03em;border:2px solid #0f172a;background:#fff;color:#0f172a;text-decoration:none;`;
      return m.url ? `<a href="${_a(m.url)}" style="${style}">${_e(m.label)}</a>` : `<span style="${style}">${_e(m.label)}</span>`;
    }).join('\n');
    return `<div style="margin:20px 36px;">${data.title ? `<h4 style="color:#0f172a;font-weight:900;font-size:.95rem;text-transform:uppercase;letter-spacing:.03em;margin:0 0 12px;">${_e(data.title)}</h4>` : ''}<div style="display:flex;flex-wrap:wrap;gap:8px;">${btns}</div></div>`;
  },

  divider(data) {
    if (data.style === 'space') return `<div style="height:${parseInt(data.height) || 24}px;"></div>`;
    return `<hr style="border:none;border-top:3px solid #0f172a;margin:0;">`;
  },

  cta(data) {
    const colors = { green: 'background:#dc2626;color:#fff;', dark: 'background:#0f172a;color:#fff;', gray: 'background:#475569;color:#fff;' };
    return `<div style="padding:24px 36px;text-align:center;"><a href="${_a(data.url)}" style="display:inline-flex;align-items:center;padding:14px 32px;text-decoration:none;font-weight:900;font-size:1rem;text-transform:uppercase;letter-spacing:.04em;${colors[data.style] || colors.green}">${_e(data.text)}</a></div>`;
  },

  rawhtml(data) {
    return `<div style="padding:0 36px;">${data.code || ''}</div>`;
  },

  spacer(data) {
    const h = parseInt(data.height) || 40;
    return `<div style="height:${h}px;"></div>`;
  },

  twocol(data, renderBlock) {
    const rc = (blocks) => (blocks || []).map(b => renderBlock(b)).filter(Boolean).join('\n');
    return `<div style="display:grid;grid-template-columns:1fr 1fr;margin:0;">\n<div>${rc(data.left)}</div>\n<div style="border-left:2px solid #0f172a;">${rc(data.right)}</div>\n</div>`;
  },

  threecol(data, renderBlock) {
    const rc = (blocks) => (blocks || []).map(b => renderBlock(b)).filter(Boolean).join('\n');
    return `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;margin:0;">\n<div>${rc(data.col1)}</div>\n<div style="border-left:2px solid #0f172a;">${rc(data.col2)}</div>\n<div style="border-left:2px solid #0f172a;">${rc(data.col3)}</div>\n</div>`;
  }
};


/* ================================================================
   3. WARM EDITORIAL
   Serif fonts, warm earth tones, magazine pull-quote style,
   accent underlines, organic shapes
   ================================================================ */
ThemeRenderers['warm-editorial'] = {
  name: 'Warm Editorial',
  description: 'Magazine-style serif typography, warm earth tones, and an organic editorial feel',
  thumbnail: 'linear-gradient(135deg, #fef3c7 0%, #d6d3d1 100%)',

  container(inner) {
    return `<div style="font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.75;color:#44403c;background:#fdfcfa;border:1px solid #d6d3d1;border-radius:4px;box-shadow:0 4px 20px rgba(120,80,30,.06);max-width:1100px;margin:0 auto 18px;overflow:hidden;padding:36px 40px;">\n${inner}\n</div>`;
  },

  header(data) {
    const tag = data.level || 'h2';
    const sizes = { h1: '2.4rem', h2: '1.6rem', h3: '1.2rem', h4: '1.05rem' };
    if (tag === 'h1') {
      return `<${tag} style="color:#292524;font-weight:700;font-size:${sizes[tag]};margin:0 0 8px;font-style:italic;letter-spacing:-.01em;">${_e(data.text)}</${tag}><div style="width:60px;height:3px;background:#b45309;border-radius:2px;margin-bottom:20px;"></div>`;
    }
    return `<${tag} style="color:#292524;font-weight:700;font-size:${sizes[tag]};margin:0 0 14px;letter-spacing:-.01em;">${_e(data.text)}</${tag}>`;
  },

  text(data) {
    return `<div style="line-height:1.75;margin-bottom:20px;color:#57534e;font-size:1.02rem;">${data.html || ''}</div>`;
  },

  image(data) {
    if (!data.src) return '';
    return `<figure style="margin:24px 0;text-align:center;"><img src="${_a(data.src)}" alt="${_a(data.alt)}" style="max-width:${_a(data.width)};height:auto;border-radius:6px;box-shadow:0 4px 20px rgba(120,80,30,.1);">${data.alt ? `<figcaption style="margin-top:10px;font-size:.82rem;color:#a8a29e;font-style:italic;">${_e(data.alt)}</figcaption>` : ''}</figure>`;
  },

  video(data) {
    const url = _embed(data.url);
    if (!url) return '';
    return `<div style="margin:24px 0;border-radius:6px;overflow:hidden;border:1px solid #d6d3d1;"><div style="position:relative;padding-bottom:56.25%;height:0;"><iframe src="${_a(url)}" style="position:absolute;inset:0;width:100%;height:100%;border:0;" allowfullscreen></iframe></div></div>`;
  },

  features(data) {
    if (!data.items.length) return '';
    const items = data.items.map(f =>
      `<div style="padding:16px 0 16px 24px;border-left:3px solid #b45309;">
        ${f.title ? `<strong style="color:#292524;display:block;margin-bottom:4px;font-size:1rem;">${_e(f.title)}</strong>` : ''}
        <span style="color:#78716c;font-size:.92rem;line-height:1.6;">${_e(f.text)}</span>
      </div>`
    ).join('\n');
    return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:24px 0;">\n${items}\n</div>`;
  },

  comparison(data) {
    const ths = data.columns.map(c => `<th style="padding:14px 16px;background:#f5f5f4;border-bottom:2px solid #d6d3d1;text-align:left;font-weight:700;color:#292524;font-size:.88rem;">${_e(c)}</th>`).join('');
    const trs = data.rows.map(row =>
      `<tr>${row.map(cell => `<td style="padding:12px 16px;border-bottom:1px solid #e7e5e4;color:#57534e;font-size:.9rem;">${_e(cell)}</td>`).join('')}</tr>`
    ).join('\n');
    return `<div style="border:1px solid #d6d3d1;border-radius:6px;overflow:hidden;margin:24px 0;"><table style="width:100%;border-collapse:collapse;"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`;
  },

  specs(data) {
    const trs = data.rows.map(r =>
      `<tr><th style="width:44%;padding:13px 16px;border-bottom:1px solid #e7e5e4;color:#292524;font-weight:600;text-align:left;font-size:.9rem;">${_e(r.label)}</th><td style="padding:13px 16px;border-bottom:1px solid #e7e5e4;color:#78716c;font-size:.9rem;">${_e(r.value)}</td></tr>`
    ).join('\n');
    return `<div style="border:1px solid #d6d3d1;border-radius:6px;overflow:hidden;margin:24px 0;">${data.title ? `<div style="background:linear-gradient(180deg,#f5f5f4,#ece9e4);border-bottom:1px solid #d6d3d1;padding:14px 16px;font-weight:700;color:#292524;font-size:.92rem;">${_e(data.title)}</div>` : ''}<table style="width:100%;border-collapse:collapse;"><tbody>${trs}</tbody></table></div>`;
  },

  models(data) {
    const pills = data.items.map(m => {
      const style = `display:inline-flex;align-items:center;padding:8px 18px;font-size:.88rem;font-weight:600;border:1px solid #d6d3d1;border-radius:6px;background:#fdfcfa;color:#44403c;text-decoration:none;font-family:Georgia,serif;`;
      return m.url ? `<a href="${_a(m.url)}" style="${style}">${_e(m.label)}</a>` : `<span style="${style}">${_e(m.label)}</span>`;
    }).join('\n');
    return `<div style="margin:24px 0;">${data.title ? `<h4 style="color:#292524;font-weight:700;font-size:1rem;margin:0 0 12px;">${_e(data.title)}</h4>` : ''}<div style="display:flex;flex-wrap:wrap;gap:10px;">${pills}</div></div>`;
  },

  divider(data) {
    if (data.style === 'space') return `<div style="height:${parseInt(data.height) || 24}px;"></div>`;
    if (data.style === 'dotted') return `<div style="text-align:center;margin:28px 0;color:#d6d3d1;letter-spacing:8px;font-size:.8rem;">&#x2022; &#x2022; &#x2022;</div>`;
    return `<div style="margin:28px auto;width:60px;height:3px;background:#d6d3d1;border-radius:2px;"></div>`;
  },

  cta(data) {
    const colors = { green: 'background:#b45309;color:#fff;', dark: 'background:#292524;color:#fdfcfa;', gray: 'background:#78716c;color:#fff;' };
    return `<div style="margin:28px 0;text-align:center;"><a href="${_a(data.url)}" style="display:inline-flex;align-items:center;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:.95rem;font-family:Georgia,serif;box-shadow:0 3px 12px rgba(180,83,9,.15);${colors[data.style] || colors.green}">${_e(data.text)}</a></div>`;
  },

  rawhtml(data) {
    return data.code || '';
  },

  spacer(data) {
    const h = parseInt(data.height) || 40;
    return `<div style="height:${h}px;"></div>`;
  },

  twocol(data, renderBlock) {
    const rc = (blocks) => (blocks || []).map(b => renderBlock(b)).filter(Boolean).join('\n');
    return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin:24px 0;">\n<div>${rc(data.left)}</div>\n<div>${rc(data.right)}</div>\n</div>`;
  },

  threecol(data, renderBlock) {
    const rc = (blocks) => (blocks || []).map(b => renderBlock(b)).filter(Boolean).join('\n');
    return `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:28px;margin:24px 0;">\n<div>${rc(data.col1)}</div>\n<div>${rc(data.col2)}</div>\n<div>${rc(data.col3)}</div>\n</div>`;
  }
};


/* ================================================================
   4. DARK PREMIUM
   Dark backgrounds, glowing accents, gradient highlights,
   glass-morphism cards, neon CTA
   ================================================================ */
ThemeRenderers['dark-premium'] = {
  name: 'Dark Premium',
  description: 'Dark mode design with glowing accents, glass-style cards, and a premium tech feel',
  thumbnail: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)',

  container(inner) {
    return `<div style="font-family:'Inter',system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.6;color:#d4d4d8;background:#18181b;border:1px solid #3f3f46;border-radius:12px;box-shadow:0 0 40px rgba(0,0,0,.3);max-width:1100px;margin:0 auto 18px;overflow:hidden;padding:36px;">\n${inner}\n</div>`;
  },

  header(data) {
    const tag = data.level || 'h2';
    const sizes = { h1: '2.2rem', h2: '1.4rem', h3: '1.12rem', h4: '.95rem' };
    if (tag === 'h1') {
      return `<${tag} style="color:#fafafa;font-weight:700;font-size:${sizes[tag]};margin:0 0 6px;letter-spacing:-.02em;">${_e(data.text)}</${tag}><div style="width:50px;height:2px;background:linear-gradient(90deg,#22d3ee,#6366f1);border-radius:2px;margin-bottom:20px;"></div>`;
    }
    return `<${tag} style="color:#e4e4e7;font-weight:600;font-size:${sizes[tag]};margin:0 0 14px;">${_e(data.text)}</${tag}>`;
  },

  text(data) {
    return `<div style="line-height:1.65;margin-bottom:18px;color:#a1a1aa;">${data.html || ''}</div>`;
  },

  image(data) {
    if (!data.src) return '';
    return `<div style="text-align:center;margin:24px 0;"><img src="${_a(data.src)}" alt="${_a(data.alt)}" style="max-width:${_a(data.width)};height:auto;border-radius:10px;border:1px solid #3f3f46;box-shadow:0 0 20px rgba(34,211,238,.06);"></div>`;
  },

  video(data) {
    const url = _embed(data.url);
    if (!url) return '';
    return `<div style="margin:24px 0;border-radius:10px;overflow:hidden;border:1px solid #3f3f46;box-shadow:0 0 20px rgba(34,211,238,.06);"><div style="position:relative;padding-bottom:56.25%;height:0;"><iframe src="${_a(url)}" style="position:absolute;inset:0;width:100%;height:100%;border:0;" allowfullscreen></iframe></div></div>`;
  },

  features(data) {
    if (!data.items.length) return '';
    const cards = data.items.map(f =>
      `<li style="background:rgba(39,39,42,.8);border:1px solid #3f3f46;border-radius:10px;padding:18px;box-shadow:0 0 12px rgba(34,211,238,.04);backdrop-filter:blur(8px);">
        ${f.title ? `<strong style="color:#22d3ee;display:block;margin-bottom:6px;font-size:.9rem;">${_e(f.title)}</strong>` : ''}
        <span style="color:#a1a1aa;font-size:.85rem;line-height:1.5;">${_e(f.text)}</span>
      </li>`
    ).join('\n');
    return `<ul style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin:22px 0;padding:0;list-style:none;">\n${cards}\n</ul>`;
  },

  comparison(data) {
    const ths = data.columns.map(c => `<th style="padding:14px 16px;background:#27272a;border-bottom:1px solid #3f3f46;text-align:left;font-weight:600;color:#e4e4e7;font-size:.85rem;">${_e(c)}</th>`).join('');
    const trs = data.rows.map((row, ri) =>
      `<tr style="${ri % 2 === 1 ? 'background:rgba(39,39,42,.5);' : ''}">${row.map(cell => `<td style="padding:12px 16px;border-bottom:1px solid #3f3f46;color:#a1a1aa;font-size:.85rem;">${_e(cell)}</td>`).join('')}</tr>`
    ).join('\n');
    return `<div style="border:1px solid #3f3f46;border-radius:10px;overflow:hidden;margin:22px 0;"><table style="width:100%;border-collapse:collapse;"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`;
  },

  specs(data) {
    const trs = data.rows.map((r, i) =>
      `<tr style="${i % 2 === 1 ? 'background:rgba(39,39,42,.5);' : ''}"><th style="width:44%;padding:12px 16px;border-bottom:1px solid #3f3f46;color:#e4e4e7;font-weight:600;text-align:left;font-size:.85rem;">${_e(r.label)}</th><td style="padding:12px 16px;border-bottom:1px solid #3f3f46;color:#a1a1aa;font-size:.85rem;">${_e(r.value)}</td></tr>`
    ).join('\n');
    return `<div style="border:1px solid #3f3f46;border-radius:10px;overflow:hidden;margin:22px 0;">${data.title ? `<div style="background:#27272a;border-bottom:1px solid #3f3f46;padding:14px 16px;font-weight:600;color:#e4e4e7;font-size:.88rem;">${_e(data.title)}</div>` : ''}<table style="width:100%;border-collapse:collapse;"><tbody>${trs}</tbody></table></div>`;
  },

  models(data) {
    const pills = data.items.map(m => {
      const style = `display:inline-flex;align-items:center;padding:8px 16px;font-size:.84rem;font-weight:600;border:1px solid #3f3f46;border-radius:999px;background:rgba(39,39,42,.6);color:#d4d4d8;text-decoration:none;`;
      return m.url ? `<a href="${_a(m.url)}" style="${style}">${_e(m.label)}</a>` : `<span style="${style}">${_e(m.label)}</span>`;
    }).join('\n');
    return `<div style="margin:22px 0;">${data.title ? `<h4 style="color:#e4e4e7;font-weight:600;font-size:.95rem;margin:0 0 12px;">${_e(data.title)}</h4>` : ''}<div style="display:flex;flex-wrap:wrap;gap:8px;">${pills}</div></div>`;
  },

  divider(data) {
    if (data.style === 'space') return `<div style="height:${parseInt(data.height) || 24}px;"></div>`;
    return `<div style="margin:24px 0;height:1px;background:linear-gradient(90deg,transparent,#3f3f46,transparent);"></div>`;
  },

  cta(data) {
    return `<div style="margin:28px 0;text-align:center;"><a href="${_a(data.url)}" style="display:inline-flex;align-items:center;padding:14px 28px;border:none;border-radius:999px;text-decoration:none;font-weight:700;font-size:.95rem;background:linear-gradient(135deg,#22d3ee,#6366f1);color:#fff;box-shadow:0 0 20px rgba(34,211,238,.25);">${_e(data.text)}</a></div>`;
  },

  rawhtml(data) {
    return `<div style="color:#e2e8f0;">${data.code || ''}</div>`;
  },

  spacer(data) {
    const h = parseInt(data.height) || 40;
    return `<div style="height:${h}px;"></div>`;
  },

  twocol(data, renderBlock) {
    const rc = (blocks) => (blocks || []).map(b => renderBlock(b)).filter(Boolean).join('\n');
    return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:22px 0;">\n<div>${rc(data.left)}</div>\n<div>${rc(data.right)}</div>\n</div>`;
  },

  threecol(data, renderBlock) {
    const rc = (blocks) => (blocks || []).map(b => renderBlock(b)).filter(Boolean).join('\n');
    return `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin:22px 0;">\n<div>${rc(data.col1)}</div>\n<div>${rc(data.col2)}</div>\n<div>${rc(data.col3)}</div>\n</div>`;
  }
};


/* ================================================================
   5. MINIMAL LUXE
   Ultra-clean, borderless, generous whitespace, thin accent lines,
   light weight type, centered layout
   ================================================================ */
ThemeRenderers['minimal-luxe'] = {
  name: 'Minimal Luxe',
  description: 'Ultra-clean, borderless layout with generous whitespace, thin lines, and centered elegance',
  thumbnail: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',

  container(inner) {
    return `<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.7;color:#475569;background:#fff;max-width:860px;margin:0 auto 18px;padding:48px 32px;">\n${inner}\n</div>`;
  },

  header(data) {
    const tag = data.level || 'h2';
    const sizes = { h1: '2.4rem', h2: '1.5rem', h3: '1.15rem', h4: '.95rem' };
    if (tag === 'h1') {
      return `<div style="text-align:center;margin:0 0 32px;"><${tag} style="color:#0f172a;font-weight:300;font-size:${sizes[tag]};margin:0 0 12px;letter-spacing:-.02em;">${_e(data.text)}</${tag}><div style="width:40px;height:1px;background:#cbd5e1;margin:0 auto;"></div></div>`;
    }
    return `<${tag} style="color:#0f172a;font-weight:400;font-size:${sizes[tag]};margin:0 0 16px;letter-spacing:-.01em;">${_e(data.text)}</${tag}>`;
  },

  text(data) {
    return `<div style="line-height:1.8;margin-bottom:24px;color:#64748b;font-weight:300;">${data.html || ''}</div>`;
  },

  image(data) {
    if (!data.src) return '';
    return `<div style="margin:32px 0;text-align:center;"><img src="${_a(data.src)}" alt="${_a(data.alt)}" style="max-width:${_a(data.width)};height:auto;"></div>`;
  },

  video(data) {
    const url = _embed(data.url);
    if (!url) return '';
    return `<div style="margin:32px 0;"><div style="position:relative;padding-bottom:56.25%;height:0;"><iframe src="${_a(url)}" style="position:absolute;inset:0;width:100%;height:100%;border:0;" allowfullscreen></iframe></div></div>`;
  },

  features(data) {
    if (!data.items.length) return '';
    const items = data.items.map(f =>
      `<div style="padding:20px 0;border-bottom:1px solid #f1f5f9;">
        ${f.title ? `<div style="color:#0f172a;font-weight:500;margin-bottom:4px;font-size:.92rem;">${_e(f.title)}</div>` : ''}
        <div style="color:#94a3b8;font-size:.88rem;font-weight:300;line-height:1.6;">${_e(f.text)}</div>
      </div>`
    ).join('\n');
    return `<div style="margin:28px 0;border-top:1px solid #f1f5f9;">\n${items}\n</div>`;
  },

  comparison(data) {
    const ths = data.columns.map(c => `<th style="padding:16px 20px;border-bottom:1px solid #e2e8f0;text-align:left;font-weight:500;color:#0f172a;font-size:.85rem;">${_e(c)}</th>`).join('');
    const trs = data.rows.map(row =>
      `<tr>${row.map(cell => `<td style="padding:14px 20px;border-bottom:1px solid #f8fafc;color:#64748b;font-size:.88rem;font-weight:300;">${_e(cell)}</td>`).join('')}</tr>`
    ).join('\n');
    return `<div style="margin:28px 0;"><table style="width:100%;border-collapse:collapse;"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`;
  },

  specs(data) {
    const trs = data.rows.map(r =>
      `<tr><th style="width:40%;padding:14px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-weight:500;text-align:left;font-size:.88rem;">${_e(r.label)}</th><td style="padding:14px 0;border-bottom:1px solid #f1f5f9;color:#94a3b8;text-align:right;font-size:.88rem;font-weight:300;">${_e(r.value)}</td></tr>`
    ).join('\n');
    return `<div style="margin:28px 0;">${data.title ? `<div style="font-weight:500;color:#0f172a;font-size:.95rem;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #e2e8f0;">${_e(data.title)}</div>` : ''}<table style="width:100%;border-collapse:collapse;"><tbody>${trs}</tbody></table></div>`;
  },

  models(data) {
    const pills = data.items.map(m => {
      const style = `display:inline-flex;align-items:center;padding:8px 20px;font-size:.85rem;font-weight:400;border:1px solid #e2e8f0;border-radius:4px;background:#fff;color:#475569;text-decoration:none;`;
      return m.url ? `<a href="${_a(m.url)}" style="${style}">${_e(m.label)}</a>` : `<span style="${style}">${_e(m.label)}</span>`;
    }).join('\n');
    return `<div style="margin:28px 0;">${data.title ? `<div style="color:#0f172a;font-weight:400;font-size:.95rem;margin-bottom:14px;">${_e(data.title)}</div>` : ''}<div style="display:flex;flex-wrap:wrap;gap:8px;">${pills}</div></div>`;
  },

  divider(data) {
    if (data.style === 'space') return `<div style="height:${parseInt(data.height) || 32}px;"></div>`;
    return `<div style="margin:32px auto;width:40px;height:1px;background:#cbd5e1;"></div>`;
  },

  cta(data) {
    return `<div style="margin:32px 0;text-align:center;"><a href="${_a(data.url)}" style="display:inline-flex;align-items:center;padding:14px 36px;border:1px solid #0f172a;border-radius:4px;text-decoration:none;font-weight:400;font-size:.9rem;color:#0f172a;letter-spacing:.02em;">${_e(data.text)}</a></div>`;
  },

  rawhtml(data) {
    return data.code || '';
  },

  spacer(data) {
    const h = parseInt(data.height) || 40;
    return `<div style="height:${h}px;"></div>`;
  },

  twocol(data, renderBlock) {
    const rc = (blocks) => (blocks || []).map(b => renderBlock(b)).filter(Boolean).join('\n');
    return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:48px;margin:32px 0;">\n<div>${rc(data.left)}</div>\n<div>${rc(data.right)}</div>\n</div>`;
  },

  threecol(data, renderBlock) {
    const rc = (blocks) => (blocks || []).map(b => renderBlock(b)).filter(Boolean).join('\n');
    return `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:40px;margin:32px 0;">\n<div>${rc(data.col1)}</div>\n<div>${rc(data.col2)}</div>\n<div>${rc(data.col3)}</div>\n</div>`;
  }
};


/* ================================================================
   6. VIBRANT CATALOG
   Bright gradients, colorful category badges, icon-style features,
   rounded cards with colored accents, playful feel
   ================================================================ */
ThemeRenderers['vibrant-catalog'] = {
  name: 'Vibrant Catalog',
  description: 'Bright, colorful layout with gradient headers, badge-style labels, and playful energy',
  thumbnail: 'linear-gradient(135deg, #ec4899 0%, #f59e0b 100%)',

  container(inner) {
    return `<div style="font-family:'Inter',system-ui,-apple-system,sans-serif;font-size:16px;line-height:1.6;color:#334155;background:#fff;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,.08);max-width:1100px;margin:0 auto 18px;overflow:hidden;">\n${inner}\n</div>`;
  },

  header(data) {
    const tag = data.level || 'h2';
    const sizes = { h1: '2rem', h2: '1.4rem', h3: '1.1rem', h4: '.95rem' };
    if (tag === 'h1') {
      return `<div style="background:linear-gradient(135deg,#6366f1,#ec4899);padding:32px 36px;"><${tag} style="color:#fff;font-weight:800;font-size:${sizes[tag]};margin:0;letter-spacing:-.01em;">${_e(data.text)}</${tag}></div>`;
    }
    return `<${tag} style="color:#1e293b;font-weight:700;font-size:${sizes[tag]};margin:0 0 14px;padding:0 32px;"><span style="background:linear-gradient(135deg,#6366f1,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">${_e(data.text)}</span></${tag}>`;
  },

  text(data) {
    return `<div style="line-height:1.65;margin:0 0 18px;padding:0 32px;color:#475569;">${data.html || ''}</div>`;
  },

  image(data) {
    if (!data.src) return '';
    return `<div style="margin:0;"><img src="${_a(data.src)}" alt="${_a(data.alt)}" style="width:100%;height:auto;display:block;"></div>`;
  },

  video(data) {
    const url = _embed(data.url);
    if (!url) return '';
    return `<div style="margin:20px 32px;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.1);"><div style="position:relative;padding-bottom:56.25%;height:0;"><iframe src="${_a(url)}" style="position:absolute;inset:0;width:100%;height:100%;border:0;" allowfullscreen></iframe></div></div>`;
  },

  features(data) {
    if (!data.items.length) return '';
    const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
    const cards = data.items.map((f, i) => {
      const c = colors[i % colors.length];
      return `<li style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;position:relative;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.04);">
        <div style="position:absolute;top:0;left:0;right:0;height:4px;background:${c};"></div>
        <div style="width:36px;height:36px;border-radius:10px;background:${c}15;display:flex;align-items:center;justify-content:center;margin-bottom:10px;"><span style="font-weight:800;color:${c};font-size:.85rem;">${String(i + 1).padStart(2, '0')}</span></div>
        ${f.title ? `<strong style="color:#1e293b;display:block;margin-bottom:4px;font-size:.92rem;">${_e(f.title)}</strong>` : ''}
        <span style="color:#64748b;font-size:.85rem;line-height:1.5;">${_e(f.text)}</span>
      </li>`;
    }).join('\n');
    return `<ul style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin:20px 32px;padding:0;list-style:none;">\n${cards}\n</ul>`;
  },

  comparison(data) {
    const ths = data.columns.map((c, i) => `<th style="padding:14px 16px;background:${i === 0 ? '#f8fafc' : 'linear-gradient(135deg,#6366f1,#ec4899)'};color:${i === 0 ? '#334155' : '#fff'};border-bottom:1px solid #e2e8f0;text-align:left;font-weight:600;font-size:.85rem;">${_e(c)}</th>`).join('');
    const trs = data.rows.map((row, ri) =>
      `<tr style="${ri % 2 === 1 ? 'background:#fafbff;' : ''}">${row.map(cell => `<td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;color:#475569;font-size:.88rem;">${_e(cell)}</td>`).join('')}</tr>`
    ).join('\n');
    return `<div style="margin:20px 32px;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.04);"><table style="width:100%;border-collapse:collapse;"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`;
  },

  specs(data) {
    const trs = data.rows.map((r, i) =>
      `<tr style="${i % 2 === 1 ? 'background:#fafbff;' : ''}"><th style="width:44%;padding:12px 16px;border-bottom:1px solid #f1f5f9;color:#334155;font-weight:600;text-align:left;font-size:.88rem;">${_e(r.label)}</th><td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:.88rem;">${_e(r.value)}</td></tr>`
    ).join('\n');
    return `<div style="margin:20px 32px;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">${data.title ? `<div style="background:linear-gradient(135deg,#6366f1,#ec4899);padding:14px 16px;font-weight:700;color:#fff;font-size:.9rem;">${_e(data.title)}</div>` : ''}<table style="width:100%;border-collapse:collapse;"><tbody>${trs}</tbody></table></div>`;
  },

  models(data) {
    const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981'];
    const pills = data.items.map((m, i) => {
      const c = colors[i % colors.length];
      const style = `display:inline-flex;align-items:center;padding:8px 18px;font-size:.85rem;font-weight:600;border:2px solid ${c};border-radius:999px;background:#fff;color:${c};text-decoration:none;`;
      return m.url ? `<a href="${_a(m.url)}" style="${style}">${_e(m.label)}</a>` : `<span style="${style}">${_e(m.label)}</span>`;
    }).join('\n');
    return `<div style="margin:20px 32px;">${data.title ? `<h4 style="color:#1e293b;font-weight:700;font-size:1rem;margin:0 0 12px;">${_e(data.title)}</h4>` : ''}<div style="display:flex;flex-wrap:wrap;gap:10px;">${pills}</div></div>`;
  },

  divider(data) {
    if (data.style === 'space') return `<div style="height:${parseInt(data.height) || 24}px;"></div>`;
    return `<div style="margin:24px 32px;height:3px;border-radius:2px;background:linear-gradient(90deg,#6366f1,#ec4899,#f59e0b);opacity:.3;"></div>`;
  },

  cta(data) {
    return `<div style="padding:24px 32px;text-align:center;"><a href="${_a(data.url)}" style="display:inline-flex;align-items:center;padding:14px 32px;border:none;border-radius:999px;text-decoration:none;font-weight:700;font-size:.95rem;background:linear-gradient(135deg,#6366f1,#ec4899);color:#fff;box-shadow:0 4px 16px rgba(99,102,241,.3);">${_e(data.text)}</a></div>`;
  },

  rawhtml(data) {
    return `<div style="padding:0 32px;">${data.code || ''}</div>`;
  },

  spacer(data) {
    const h = parseInt(data.height) || 40;
    return `<div style="height:${h}px;"></div>`;
  },

  twocol(data, renderBlock) {
    const rc = (blocks) => (blocks || []).map(b => renderBlock(b)).filter(Boolean).join('\n');
    return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:0 32px;margin:20px 0;">\n<div>${rc(data.left)}</div>\n<div>${rc(data.right)}</div>\n</div>`;
  },

  threecol(data, renderBlock) {
    const rc = (blocks) => (blocks || []).map(b => renderBlock(b)).filter(Boolean).join('\n');
    return `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;padding:0 32px;margin:20px 0;">\n<div>${rc(data.col1)}</div>\n<div>${rc(data.col2)}</div>\n<div>${rc(data.col3)}</div>\n</div>`;
  }
};
