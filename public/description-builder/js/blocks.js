/* ====== Block Type Definitions ====== */
window.BlockTypes = {

  header: {
    type: 'header',
    label: 'Header',
    icon: 'H',
    category: 'text',
    defaultData: () => ({ level: 'h2', text: 'Heading' }),

    renderEditor(data, onChange) {
      const wrap = document.createElement('div');
      const row = document.createElement('div');
      row.className = 'block-row';
      const sel = document.createElement('select');
      sel.className = 'block-select';
      ['h1','h2','h3','h4'].forEach(h => {
        const o = document.createElement('option');
        o.value = h; o.textContent = h.toUpperCase();
        if (data.level === h) o.selected = true;
        sel.appendChild(o);
      });
      sel.onchange = () => onChange({ ...data, level: sel.value });
      row.appendChild(sel);
      wrap.appendChild(row);

      const el = document.createElement('div');
      el.contentEditable = true;
      el.dataset.placeholder = 'Enter heading text...';
      el.style.fontSize = data.level === 'h1' ? '1.8rem' : data.level === 'h2' ? '1.4rem' : data.level === 'h3' ? '1.15rem' : '1rem';
      el.style.fontWeight = '700';
      el.style.marginTop = '8px';
      el.textContent = data.text;
      el.oninput = () => onChange({ ...data, text: el.textContent });
      wrap.appendChild(el);
      return wrap;
    },

    renderHTML(data) {
      const tag = data.level || 'h2';
      return `<${tag}>${escHTML(data.text)}</${tag}>`;
    }
  },

  text: {
    type: 'text',
    label: 'Text Block',
    icon: 'T',
    category: 'text',
    defaultData: () => ({ html: '' }),

    renderEditor(data, onChange) {
      const wrap = document.createElement('div');
      // Mini toolbar for formatting
      const bar = document.createElement('div');
      bar.style.cssText = 'display:flex;gap:4px;margin-bottom:6px;';
      ['bold','italic'].forEach(cmd => {
        const btn = document.createElement('button');
        btn.textContent = cmd === 'bold' ? 'B' : 'I';
        btn.style.cssText = `font-weight:${cmd==='bold'?'700':'400'};font-style:${cmd==='italic'?'italic':'normal'};padding:2px 8px;border:1px solid #d1d5db;border-radius:4px;background:#fff;cursor:pointer;font-size:.82rem;`;
        btn.onmousedown = (e) => { e.preventDefault(); document.execCommand(cmd); };
        bar.appendChild(btn);
      });
      const linkBtn = document.createElement('button');
      linkBtn.textContent = 'Link';
      linkBtn.style.cssText = 'padding:2px 8px;border:1px solid #d1d5db;border-radius:4px;background:#fff;cursor:pointer;font-size:.82rem;';
      linkBtn.onmousedown = (e) => {
        e.preventDefault();
        const url = prompt('Enter URL:');
        if (url) document.execCommand('createLink', false, url);
      };
      bar.appendChild(linkBtn);
      wrap.appendChild(bar);

      const el = document.createElement('div');
      el.contentEditable = true;
      el.dataset.placeholder = 'Enter text content...';
      el.style.cssText = 'line-height:1.6;min-height:60px;';
      el.innerHTML = data.html;
      el.oninput = () => onChange({ ...data, html: el.innerHTML });
      wrap.appendChild(el);
      return wrap;
    },

    renderHTML(data) {
      return `<div style="line-height:1.65;margin-bottom:16px;">${data.html || ''}</div>`;
    }
  },

  image: {
    type: 'image',
    label: 'Image',
    icon: '🖼',
    category: 'media',
    defaultData: () => ({ src: '', alt: '', width: '100%' }),

    renderEditor(data, onChange) {
      const wrap = document.createElement('div');
      const mkInput = (label, key, placeholder) => {
        const row = document.createElement('div');
        row.className = 'block-row';
        const lbl = document.createElement('label');
        lbl.textContent = label;
        const inp = document.createElement('input');
        inp.className = 'block-input';
        inp.placeholder = placeholder;
        inp.value = data[key] || '';
        inp.oninput = () => onChange({ ...data, [key]: inp.value });
        row.appendChild(lbl);
        row.appendChild(inp);
        wrap.appendChild(row);
      };
      mkInput('URL', 'src', 'https://example.com/image.jpg');
      mkInput('Alt', 'alt', 'Image description');
      mkInput('Width', 'width', '100%');

      if (data.src) {
        const preview = document.createElement('img');
        preview.src = data.src;
        preview.alt = data.alt || '';
        preview.style.cssText = 'max-width:100%;max-height:200px;margin-top:10px;border-radius:6px;border:1px solid #e5e7eb;';
        preview.onerror = () => preview.style.display = 'none';
        wrap.appendChild(preview);
      }
      return wrap;
    },

    renderHTML(data) {
      if (!data.src) return '';
      return `<div style="text-align:center;margin:16px 0;"><img src="${escAttr(data.src)}" alt="${escAttr(data.alt)}" style="max-width:${escAttr(data.width)};height:auto;border-radius:8px;"></div>`;
    }
  },

  video: {
    type: 'video',
    label: 'Video',
    icon: '▶',
    category: 'media',
    defaultData: () => ({ url: '' }),

    renderEditor(data, onChange) {
      const wrap = document.createElement('div');
      const inp = document.createElement('input');
      inp.className = 'block-input';
      inp.placeholder = 'YouTube or Vimeo URL';
      inp.value = data.url || '';
      inp.oninput = () => onChange({ ...data, url: inp.value });
      wrap.appendChild(inp);

      const embedUrl = getEmbedUrl(data.url);
      if (embedUrl) {
        const preview = document.createElement('div');
        preview.style.cssText = 'position:relative;padding-bottom:56.25%;height:0;margin-top:10px;border-radius:8px;overflow:hidden;';
        preview.innerHTML = `<iframe src="${embedUrl}" style="position:absolute;inset:0;width:100%;height:100%;border:0;" allowfullscreen></iframe>`;
        wrap.appendChild(preview);
      }
      return wrap;
    },

    renderHTML(data) {
      const embedUrl = getEmbedUrl(data.url);
      if (!embedUrl) return '';
      return `<div class="video-block" style="margin:20px 0;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;"><div style="position:relative;padding-bottom:56.25%;height:0;"><iframe src="${escAttr(embedUrl)}" style="position:absolute;inset:0;width:100%;height:100%;border:0;" allowfullscreen></iframe></div></div>`;
    }
  },

  features: {
    type: 'features',
    label: 'Feature Cards',
    icon: '★',
    category: 'content',
    defaultData: () => ({ items: [{ title: 'Feature', text: 'Description' }] }),

    renderEditor(data, onChange) {
      const wrap = document.createElement('div');
      const renderItems = () => {
        wrap.innerHTML = '';
        data.items.forEach((item, i) => {
          const row = document.createElement('div');
          row.className = 'feature-item';
          row.innerHTML = `
            <div class="feature-item-fields">
              <input class="block-input" placeholder="Title" value="${escAttr(item.title || '')}">
              <input class="block-input" placeholder="Description" value="${escAttr(item.text || '')}">
            </div>
          `;
          const rmBtn = document.createElement('button');
          rmBtn.className = 'remove-item-btn';
          rmBtn.textContent = '×';
          rmBtn.onclick = () => {
            data.items.splice(i, 1);
            onChange({ ...data });
            renderItems();
          };
          row.appendChild(rmBtn);

          const inputs = row.querySelectorAll('input');
          inputs[0].oninput = () => { data.items[i].title = inputs[0].value; onChange({ ...data }); };
          inputs[1].oninput = () => { data.items[i].text = inputs[1].value; onChange({ ...data }); };
          wrap.appendChild(row);
        });

        const addBtn = document.createElement('button');
        addBtn.className = 'add-item-btn';
        addBtn.textContent = '+ Add Feature';
        addBtn.onclick = () => {
          data.items.push({ title: '', text: '' });
          onChange({ ...data });
          renderItems();
        };
        wrap.appendChild(addBtn);
      };
      renderItems();
      return wrap;
    },

    renderHTML(data) {
      if (!data.items.length) return '';
      const cards = data.items.map(f =>
        `<li style="background:#fff;border:1px solid #e5e7eb;border-top:3px solid #00bf00;border-radius:12px;padding:14px;box-shadow:0 2px 8px rgba(0,0,0,.04);">${f.title ? `<strong style="color:#0b1220;display:block;margin-bottom:4px;">${escHTML(f.title)}</strong>` : ''}${escHTML(f.text)}</li>`
      ).join('\n');
      return `<ul style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:16px 0;padding:0;list-style:none;">\n${cards}\n</ul>`;
    }
  },

  comparison: {
    type: 'comparison',
    label: 'Comparison Chart',
    icon: '⊞',
    category: 'content',
    defaultData: () => ({
      columns: ['Feature', 'Model A', 'Model B'],
      rows: [['Capacity', '100 lbs', '200 lbs']]
    }),

    renderEditor(data, onChange) {
      const wrap = document.createElement('div');
      wrap.className = 'chart-editor';

      const renderTable = () => {
        wrap.innerHTML = '';
        const table = document.createElement('table');
        // Header row
        const thead = document.createElement('thead');
        const hRow = document.createElement('tr');
        data.columns.forEach((col, ci) => {
          const th = document.createElement('th');
          const inp = document.createElement('input');
          inp.value = col;
          inp.style.cssText = 'font-weight:600;background:transparent;border:none;width:100%;font-size:.84rem;';
          inp.oninput = () => { data.columns[ci] = inp.value; onChange({ ...data }); };
          th.appendChild(inp);
          hRow.appendChild(th);
        });
        // Delete column header
        const thAct = document.createElement('th');
        thAct.style.width = '30px';
        hRow.appendChild(thAct);
        thead.appendChild(hRow);
        table.appendChild(thead);

        // Body rows
        const tbody = document.createElement('tbody');
        data.rows.forEach((row, ri) => {
          const tr = document.createElement('tr');
          row.forEach((cell, ci) => {
            const td = document.createElement('td');
            const inp = document.createElement('input');
            inp.value = cell;
            inp.oninput = () => { data.rows[ri][ci] = inp.value; onChange({ ...data }); };
            td.appendChild(inp);
            tr.appendChild(td);
          });
          const tdAct = document.createElement('td');
          const rmBtn = document.createElement('button');
          rmBtn.className = 'remove-item-btn';
          rmBtn.textContent = '×';
          rmBtn.onclick = () => { data.rows.splice(ri, 1); onChange({ ...data }); renderTable(); };
          tdAct.appendChild(rmBtn);
          tr.appendChild(tdAct);
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        wrap.appendChild(table);

        // Action buttons
        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex;gap:8px;margin-top:8px;';
        const addRowBtn = document.createElement('button');
        addRowBtn.className = 'add-item-btn';
        addRowBtn.textContent = '+ Row';
        addRowBtn.onclick = () => {
          data.rows.push(data.columns.map(() => ''));
          onChange({ ...data });
          renderTable();
        };
        const addColBtn = document.createElement('button');
        addColBtn.className = 'add-item-btn';
        addColBtn.textContent = '+ Column';
        addColBtn.onclick = () => {
          data.columns.push('Column');
          data.rows.forEach(r => r.push(''));
          onChange({ ...data });
          renderTable();
        };
        const rmColBtn = document.createElement('button');
        rmColBtn.className = 'add-item-btn';
        rmColBtn.textContent = '- Column';
        rmColBtn.onclick = () => {
          if (data.columns.length <= 2) return;
          data.columns.pop();
          data.rows.forEach(r => r.pop());
          onChange({ ...data });
          renderTable();
        };
        actions.append(addRowBtn, addColBtn, rmColBtn);
        wrap.appendChild(actions);
      };
      renderTable();
      return wrap;
    },

    renderHTML(data) {
      const ths = data.columns.map(c => `<th style="padding:12px 14px;border-bottom:1px solid #e5e7eb;text-align:left;font-weight:600;background:#f8f8f8;">${escHTML(c)}</th>`).join('');
      const trs = data.rows.map(row =>
        `<tr>${row.map(cell => `<td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;text-align:left;">${escHTML(cell)}</td>`).join('')}</tr>`
      ).join('\n');
      return `<div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin:16px 0;box-shadow:0 2px 8px rgba(0,0,0,.04);"><table style="width:100%;border-collapse:collapse;"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`;
    }
  },

  models: {
    type: 'models',
    label: 'Model / Options',
    icon: '◉',
    category: 'content',
    defaultData: () => ({ title: 'Available Models', items: [{ label: 'Model A', url: '' }] }),

    renderEditor(data, onChange) {
      const wrap = document.createElement('div');

      const renderItems = () => {
        wrap.innerHTML = '';
        const titleInp = document.createElement('input');
        titleInp.className = 'block-input';
        titleInp.placeholder = 'Section title';
        titleInp.value = data.title || '';
        titleInp.oninput = () => { data.title = titleInp.value; onChange({ ...data }); };
        wrap.appendChild(titleInp);

        data.items.forEach((item, i) => {
          const row = document.createElement('div');
          row.className = 'model-item';
          row.innerHTML = `
            <input class="block-input" placeholder="Label" value="${escAttr(item.label || '')}" style="flex:1;">
            <input class="block-input" placeholder="URL (optional)" value="${escAttr(item.url || '')}" style="flex:1.5;">
          `;
          const rmBtn = document.createElement('button');
          rmBtn.className = 'remove-item-btn';
          rmBtn.textContent = '×';
          rmBtn.onclick = () => { data.items.splice(i, 1); onChange({ ...data }); renderItems(); };
          row.appendChild(rmBtn);
          const inputs = row.querySelectorAll('input');
          inputs[0].oninput = () => { data.items[i].label = inputs[0].value; onChange({ ...data }); };
          inputs[1].oninput = () => { data.items[i].url = inputs[1].value; onChange({ ...data }); };
          wrap.appendChild(row);
        });

        // Button row: Browse Products + Add Model
        const btnRow = document.createElement('div');
        btnRow.className = 'model-btn-row';

        const browseBtn = document.createElement('button');
        browseBtn.className = 'browse-products-btn';
        browseBtn.innerHTML = '&#128269; Browse Products';
        browseBtn.onclick = async () => {
          if (!window.ProductPicker) return;
          const selected = await window.ProductPicker.open();
          if (selected && selected.length) {
            // Remove the default empty item if it's the only one and untouched
            if (data.items.length === 1 && !data.items[0].label && !data.items[0].url) {
              data.items = [];
            }
            selected.forEach(p => {
              data.items.push({ label: p.name, url: p.url || '' });
            });
            onChange({ ...data });
            renderItems();
          }
        };
        btnRow.appendChild(browseBtn);

        const addBtn = document.createElement('button');
        addBtn.className = 'add-item-btn';
        addBtn.textContent = '+ Add Model';
        addBtn.onclick = () => { data.items.push({ label: '', url: '' }); onChange({ ...data }); renderItems(); };
        btnRow.appendChild(addBtn);

        wrap.appendChild(btnRow);
      };
      renderItems();
      return wrap;
    },

    renderHTML(data) {
      const btns = data.items.map(m => {
        if (m.url) {
          return `<a href="${escAttr(m.url)}" style="display:inline-flex;align-items:center;justify-content:center;padding:8px 14px;font-size:.85rem;font-weight:600;border:1px solid #e5e7eb;border-radius:999px;background:#fff;color:#0b1220;text-decoration:none;box-shadow:0 2px 6px rgba(0,0,0,.04);">${escHTML(m.label)}</a>`;
        }
        return `<span style="display:inline-flex;align-items:center;justify-content:center;padding:8px 14px;font-size:.85rem;font-weight:600;border:1px solid #e5e7eb;border-radius:999px;background:#fff;color:#0b1220;box-shadow:0 2px 6px rgba(0,0,0,.04);">${escHTML(m.label)}</span>`;
      }).join('\n');
      return `<div style="margin:16px 0;">${data.title ? `<h4 style="margin:0 0 10px;font-size:1rem;color:#0b1220;">${escHTML(data.title)}</h4>` : ''}<div style="display:flex;flex-wrap:wrap;gap:8px;">${btns}</div></div>`;
    }
  },

  specs: {
    type: 'specs',
    label: 'Specs Table',
    icon: '☰',
    category: 'content',
    defaultData: () => ({ title: 'Specifications', rows: [{ label: 'Weight', value: '' }] }),

    renderEditor(data, onChange) {
      const wrap = document.createElement('div');

      const renderItems = () => {
        wrap.innerHTML = '';
        const titleInp = document.createElement('input');
        titleInp.className = 'block-input';
        titleInp.placeholder = 'Section title';
        titleInp.value = data.title || '';
        titleInp.oninput = () => { data.title = titleInp.value; onChange({ ...data }); };
        wrap.appendChild(titleInp);

        data.rows.forEach((row, i) => {
          const el = document.createElement('div');
          el.className = 'model-item';
          el.innerHTML = `
            <input class="block-input" placeholder="Label" value="${escAttr(row.label || '')}" style="flex:1;">
            <input class="block-input" placeholder="Value" value="${escAttr(row.value || '')}" style="flex:1.5;">
          `;
          const rmBtn = document.createElement('button');
          rmBtn.className = 'remove-item-btn';
          rmBtn.textContent = '×';
          rmBtn.onclick = () => { data.rows.splice(i, 1); onChange({ ...data }); renderItems(); };
          el.appendChild(rmBtn);
          const inputs = el.querySelectorAll('input');
          inputs[0].oninput = () => { data.rows[i].label = inputs[0].value; onChange({ ...data }); };
          inputs[1].oninput = () => { data.rows[i].value = inputs[1].value; onChange({ ...data }); };
          wrap.appendChild(el);
        });

        const addBtn = document.createElement('button');
        addBtn.className = 'add-item-btn';
        addBtn.textContent = '+ Add Spec';
        addBtn.onclick = () => { data.rows.push({ label: '', value: '' }); onChange({ ...data }); renderItems(); };
        wrap.appendChild(addBtn);
      };
      renderItems();
      return wrap;
    },

    renderHTML(data) {
      const trs = data.rows.map(r =>
        `<tr><th style="width:44%;padding:12px 14px;border-bottom:1px solid #e5e7eb;color:#333;font-weight:600;text-align:left;">${escHTML(r.label)}</th><td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;text-align:left;">${escHTML(r.value)}</td></tr>`
      ).join('\n');
      return `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;box-shadow:0 2px 10px rgba(0,0,0,.04);overflow:hidden;margin:16px 0;">${data.title ? `<div style="background:linear-gradient(180deg,#F2F2F2,#E8E8E8);border-bottom:1px solid #e5e7eb;padding:12px 16px;font-weight:600;color:#1a1a1a;">${escHTML(data.title)}</div>` : ''}<table style="width:100%;border-collapse:collapse;"><tbody>${trs}</tbody></table></div>`;
    }
  },

  divider: {
    type: 'divider',
    label: 'Divider',
    icon: '—',
    category: 'layout',
    defaultData: () => ({ style: 'line', height: 24 }),

    renderEditor(data, onChange) {
      const wrap = document.createElement('div');
      const row = document.createElement('div');
      row.className = 'block-row';
      const sel = document.createElement('select');
      sel.className = 'block-select';
      ['line','space','dotted'].forEach(s => {
        const o = document.createElement('option');
        o.value = s; o.textContent = s.charAt(0).toUpperCase() + s.slice(1);
        if (data.style === s) o.selected = true;
        sel.appendChild(o);
      });
      sel.onchange = () => onChange({ ...data, style: sel.value });
      row.appendChild(sel);
      wrap.appendChild(row);

      const hr = document.createElement('hr');
      hr.style.cssText = `margin:12px 0;border:none;border-top:${data.style === 'dotted' ? '2px dotted #d1d5db' : data.style === 'line' ? '1px solid #e5e7eb' : 'none'};height:${data.style === 'space' ? data.height + 'px' : 'auto'};`;
      wrap.appendChild(hr);
      return wrap;
    },

    renderHTML(data) {
      if (data.style === 'space') return `<div style="height:${parseInt(data.height) || 24}px;"></div>`;
      if (data.style === 'dotted') return `<hr style="border:none;border-top:2px dotted #d1d5db;margin:16px 0;">`;
      return `<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">`;
    }
  },

  twocol: {
    type: 'twocol',
    label: '2 Columns',
    icon: '▐▌',
    category: 'layout',
    defaultData: () => ({ left: [], right: [] }),
    isLayout: true,

    renderEditor(data, onChange) {
      const wrap = document.createElement('div');
      wrap.className = 'column-layout cols-2';

      ['left', 'right'].forEach(side => {
        const zone = document.createElement('div');
        zone.className = 'column-drop-zone';
        zone.dataset.columnSide = side;

        if (!data[side] || data[side].length === 0) {
          zone.innerHTML = '<div class="column-placeholder">Drop blocks here</div>';
        } else {
          data[side].forEach((block, i) => {
            const blockEl = renderCanvasBlock(block, (newData) => {
              data[side][i].data = newData;
              onChange({ ...data }); // content edit — no structural flag
            }, () => {
              data[side].splice(i, 1);
              onChange({ ...data }, { structural: true });
            }, true);
            zone.appendChild(blockEl);
          }
          );
        }

        // Drop handling for columns
        zone.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.stopPropagation();
          zone.classList.add('drag-over');
        });
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
        zone.addEventListener('drop', (e) => {
          e.preventDefault();
          e.stopPropagation();
          zone.classList.remove('drag-over');
          const blockType = e.dataTransfer.getData('text/plain');
          if (blockType && BlockTypes[blockType] && !BlockTypes[blockType].isLayout) {
            const newBlock = {
              id: generateId(),
              type: blockType,
              data: BlockTypes[blockType].defaultData()
            };
            data[side].push(newBlock);
            onChange({ ...data }, { structural: true });
          }
        });

        wrap.appendChild(zone);
      });
      return wrap;
    },

    renderHTML(data) {
      const renderCol = (blocks) => blocks.map(b => BlockTypes[b.type] ? BlockTypes[b.type].renderHTML(b.data) : '').join('\n');
      return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:16px 0;">\n<div>${renderCol(data.left || [])}</div>\n<div>${renderCol(data.right || [])}</div>\n</div>`;
    }
  },

  threecol: {
    type: 'threecol',
    label: '3 Columns',
    icon: '▍▍▍',
    category: 'layout',
    defaultData: () => ({ col1: [], col2: [], col3: [] }),
    isLayout: true,

    renderEditor(data, onChange) {
      const wrap = document.createElement('div');
      wrap.className = 'column-layout cols-3';

      ['col1', 'col2', 'col3'].forEach(col => {
        const zone = document.createElement('div');
        zone.className = 'column-drop-zone';
        zone.dataset.columnSide = col;

        if (!data[col] || data[col].length === 0) {
          zone.innerHTML = '<div class="column-placeholder">Drop blocks here</div>';
        } else {
          data[col].forEach((block, i) => {
            const blockEl = renderCanvasBlock(block, (newData) => {
              data[col][i].data = newData;
              onChange({ ...data }); // content edit — no structural flag
            }, () => {
              data[col].splice(i, 1);
              onChange({ ...data }, { structural: true });
            }, true);
            zone.appendChild(blockEl);
          });
        }

        zone.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.stopPropagation();
          zone.classList.add('drag-over');
        });
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
        zone.addEventListener('drop', (e) => {
          e.preventDefault();
          e.stopPropagation();
          zone.classList.remove('drag-over');
          const blockType = e.dataTransfer.getData('text/plain');
          if (blockType && BlockTypes[blockType] && !BlockTypes[blockType].isLayout) {
            const newBlock = {
              id: generateId(),
              type: blockType,
              data: BlockTypes[blockType].defaultData()
            };
            data[col].push(newBlock);
            onChange({ ...data }, { structural: true });
          }
        });

        wrap.appendChild(zone);
      });
      return wrap;
    },

    renderHTML(data) {
      const renderCol = (blocks) => blocks.map(b => BlockTypes[b.type] ? BlockTypes[b.type].renderHTML(b.data) : '').join('\n');
      return `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin:16px 0;">\n<div>${renderCol(data.col1 || [])}</div>\n<div>${renderCol(data.col2 || [])}</div>\n<div>${renderCol(data.col3 || [])}</div>\n</div>`;
    }
  },

  rawhtml: {
    type: 'rawhtml',
    label: 'HTML',
    icon: '</>',
    category: 'content',
    defaultData: () => ({ code: '' }),

    renderEditor(data, onChange) {
      const wrap = document.createElement('div');

      const hint = document.createElement('div');
      hint.style.cssText = 'font-size:.75rem;color:#6b7280;margin-bottom:6px;';
      hint.textContent = 'Paste or write raw HTML. It will be inserted as-is into the output.';
      wrap.appendChild(hint);

      const textarea = document.createElement('textarea');
      textarea.className = 'block-input';
      textarea.placeholder = '<div>Your custom HTML here...</div>';
      textarea.value = data.code || '';
      textarea.style.cssText = 'width:100%;min-height:120px;font-family:"SF Mono",Monaco,Consolas,monospace;font-size:.82rem;line-height:1.5;resize:vertical;white-space:pre;tab-size:2;background:#1e1e2e;color:#cdd6f4;border:1px solid #45475a;border-radius:8px;padding:12px;';
      textarea.spellcheck = false;
      textarea.oninput = () => onChange({ ...data, code: textarea.value });
      wrap.appendChild(textarea);

      // Live preview toggle
      const previewToggle = document.createElement('button');
      previewToggle.className = 'add-item-btn';
      previewToggle.textContent = '👁 Preview';
      previewToggle.style.marginTop = '8px';
      const previewBox = document.createElement('div');
      previewBox.style.cssText = 'display:none;margin-top:8px;padding:12px;border:1px dashed #d1d5db;border-radius:8px;background:#fafafa;';
      previewToggle.onclick = () => {
        if (previewBox.style.display === 'none') {
          previewBox.style.display = 'block';
          previewBox.innerHTML = data.code || '<em style="color:#999;">No HTML yet</em>';
          previewToggle.textContent = '✕ Hide Preview';
        } else {
          previewBox.style.display = 'none';
          previewToggle.textContent = '👁 Preview';
        }
      };
      wrap.appendChild(previewToggle);
      wrap.appendChild(previewBox);
      return wrap;
    },

    renderHTML(data) {
      return data.code || '';
    }
  },

  spacer: {
    type: 'spacer',
    label: 'Spacer',
    icon: '↕',
    category: 'layout',
    defaultData: () => ({ height: 40 }),

    renderEditor(data, onChange) {
      const wrap = document.createElement('div');

      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:12px;';

      const label = document.createElement('span');
      label.style.cssText = 'font-size:.82rem;color:#6b7280;white-space:nowrap;';
      label.textContent = 'Height:';
      row.appendChild(label);

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '8';
      slider.max = '120';
      slider.value = data.height || 40;
      slider.style.cssText = 'flex:1;accent-color:#00bf00;';

      const valLabel = document.createElement('span');
      valLabel.style.cssText = 'font-size:.82rem;color:#374151;font-weight:600;min-width:40px;text-align:right;';
      valLabel.textContent = `${data.height || 40}px`;

      slider.oninput = () => {
        const h = parseInt(slider.value);
        valLabel.textContent = `${h}px`;
        preview.style.height = h + 'px';
        onChange({ ...data, height: h });
      };
      row.appendChild(slider);
      row.appendChild(valLabel);
      wrap.appendChild(row);

      // Quick presets
      const presets = document.createElement('div');
      presets.style.cssText = 'display:flex;gap:6px;margin-top:8px;';
      [{ label: 'S', val: 16 }, { label: 'M', val: 40 }, { label: 'L', val: 64 }, { label: 'XL', val: 100 }].forEach(p => {
        const btn = document.createElement('button');
        btn.textContent = p.label;
        btn.style.cssText = 'padding:3px 12px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer;font-size:.75rem;font-weight:600;color:#374151;';
        btn.onclick = () => {
          slider.value = p.val;
          valLabel.textContent = `${p.val}px`;
          preview.style.height = p.val + 'px';
          onChange({ ...data, height: p.val });
        };
        presets.appendChild(btn);
      });
      wrap.appendChild(presets);

      // Visual preview of the spacer
      const preview = document.createElement('div');
      preview.style.cssText = `margin-top:10px;height:${data.height || 40}px;background:repeating-linear-gradient(45deg,#f3f4f6,#f3f4f6 4px,#e5e7eb 4px,#e5e7eb 8px);border-radius:6px;border:1px dashed #d1d5db;position:relative;`;
      const tag = document.createElement('span');
      tag.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:.7rem;color:#9ca3af;background:#fff;padding:1px 6px;border-radius:4px;';
      tag.textContent = 'spacer';
      preview.appendChild(tag);
      wrap.appendChild(preview);

      return wrap;
    },

    renderHTML(data) {
      const h = parseInt(data.height) || 40;
      return `<div style="height:${h}px;"></div>`;
    }
  },

  cta: {
    type: 'cta',
    label: 'CTA Button',
    icon: '▶',
    category: 'content',
    defaultData: () => ({ text: 'Contact Us', url: '', style: 'green' }),

    renderEditor(data, onChange) {
      const wrap = document.createElement('div');
      const mkRow = (label, key, placeholder) => {
        const row = document.createElement('div');
        row.className = 'block-row';
        const lbl = document.createElement('label');
        lbl.textContent = label;
        const inp = document.createElement('input');
        inp.className = 'block-input';
        inp.placeholder = placeholder;
        inp.value = data[key] || '';
        inp.oninput = () => onChange({ ...data, [key]: inp.value });
        row.appendChild(lbl);
        row.appendChild(inp);
        wrap.appendChild(row);
      };
      mkRow('Text', 'text', 'Button text');
      mkRow('URL', 'url', 'https://...');

      const row = document.createElement('div');
      row.className = 'block-row';
      const lbl = document.createElement('label');
      lbl.textContent = 'Style';
      const sel = document.createElement('select');
      sel.className = 'block-select';
      [['green','Green'],['dark','Dark'],['gray','Gray']].forEach(([v,t]) => {
        const o = document.createElement('option');
        o.value = v; o.textContent = t;
        if (data.style === v) o.selected = true;
        sel.appendChild(o);
      });
      sel.onchange = () => onChange({ ...data, style: sel.value });
      row.appendChild(lbl);
      row.appendChild(sel);
      wrap.appendChild(row);
      return wrap;
    },

    renderHTML(data) {
      const colors = { green: 'background:#00bf00;color:#0b1220;', dark: 'background:#1a1a1a;color:#fff;', gray: 'background:#4b5563;color:#fff;' };
      return `<div style="margin:16px 0;text-align:center;"><a href="${escAttr(data.url)}" style="display:inline-flex;align-items:center;justify-content:center;padding:12px 20px;border:1px solid rgba(0,0,0,.06);border-radius:999px;text-decoration:none;font-weight:700;box-shadow:0 4px 14px rgba(0,0,0,.08);${colors[data.style] || colors.green}">${escHTML(data.text)}</a></div>`;
    }
  }
};

/* ====== Helpers ====== */
function escHTML(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
function escAttr(s) { return (s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function generateId() { return '_' + Math.random().toString(36).substr(2, 9); }

function getEmbedUrl(url) {
  if (!url) return '';
  let m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  m = url.match(/vimeo\.com\/(\d+)/);
  if (m) return `https://player.vimeo.com/video/${m[1]}`;
  return '';
}

// Used by column blocks to render nested blocks
function renderCanvasBlock(block, onDataChange, onDelete, isNested) {
  const container = document.createElement('div');
  container.className = 'canvas-block';
  if (!isNested) {
    // Don't set draggable on the container — it steals focus from inputs/textareas.
    // Instead, make only the drag handle initiate the drag.
    container.dataset.blockId = block.id;
  }

  const label = document.createElement('span');
  label.className = 'block-type-label';
  label.textContent = BlockTypes[block.type]?.label || block.type;
  container.appendChild(label);

  if (!isNested) {
    const handle = document.createElement('div');
    handle.className = 'block-handle';
    handle.innerHTML = '⋮⋮';
    handle.draggable = true;
    handle.addEventListener('dragstart', (e) => {
      // Propagate drag data up so the canvas drop handler sees it
      e.dataTransfer.setData('application/x-block-id', block.id);
      e.dataTransfer.setData('text/plain', block.type);
      e.dataTransfer.effectAllowed = 'move';
      container.classList.add('dragging');
    });
    handle.addEventListener('dragend', () => {
      container.classList.remove('dragging');
    });
    container.appendChild(handle);
  }

  if (!isNested) {
    const saveBtn = document.createElement('button');
    saveBtn.className = 'block-save';
    saveBtn.innerHTML = '&#128427;';
    saveBtn.title = 'Save as custom block';
    saveBtn.onclick = (e) => {
      e.stopPropagation();
      if (window.CustomBlocks) CustomBlocks.promptSave(block);
    };
    container.appendChild(saveBtn);
  }

  const delBtn = document.createElement('button');
  delBtn.className = 'block-delete';
  delBtn.textContent = '×';
  delBtn.onclick = onDelete;
  container.appendChild(delBtn);

  const content = document.createElement('div');
  content.className = 'block-content';
  const bt = BlockTypes[block.type];
  if (bt) {
    const onChangeHandler = (newData) => {
      block.data = newData;
      if (onDataChange) onDataChange(newData);
    };
    content.appendChild(bt.renderEditor(block.data, onChangeHandler));
  }
  container.appendChild(content);
  return container;
}
