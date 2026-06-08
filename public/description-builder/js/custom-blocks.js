/* ====== Custom Blocks: save, load, and manage user-created block presets ====== */
window.CustomBlocks = (function() {
  const STORAGE_KEY = 'custom-blocks';

  function getAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch { return []; }
  }

  function saveAll(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function add(name, blocks) {
    const items = getAll();
    items.push({
      id: '_cb' + Math.random().toString(36).substr(2, 9),
      name: name,
      blocks: blocks
    });
    saveAll(items);
    renderSection();
  }

  function remove(id) {
    const items = getAll().filter(cb => cb.id !== id);
    saveAll(items);
    renderSection();
  }

  function rename(id, newName) {
    const items = getAll();
    const item = items.find(cb => cb.id === id);
    if (item) { item.name = newName; saveAll(items); renderSection(); }
  }

  /** Deep-clone a block and all nested blocks, assigning fresh IDs */
  function cloneBlockDeep(block) {
    const clone = JSON.parse(JSON.stringify(block));
    assignFreshIds([clone]);
    return clone;
  }

  function assignFreshIds(blocks) {
    blocks.forEach(b => {
      b.id = '_' + Math.random().toString(36).substr(2, 9);
      if (b.data) {
        ['left', 'right', 'col1', 'col2', 'col3'].forEach(key => {
          if (Array.isArray(b.data[key])) assignFreshIds(b.data[key]);
        });
      }
    });
  }

  /** Build a summary icon string from the block */
  function getBlockIcon(block) {
    const bt = BlockTypes[block.type];
    return bt ? bt.icon : '?';
  }

  /** Build a summary label from the saved blocks */
  function getSummary(customBlock) {
    const types = customBlock.blocks.map(b => {
      const bt = BlockTypes[b.type];
      return bt ? bt.label : b.type;
    });
    if (types.length <= 2) return types.join(' + ');
    return types[0] + ' + ' + (types.length - 1) + ' more';
  }

  // ====== Sidebar Rendering ======

  function renderSection() {
    const toolbar = document.getElementById('toolbar');
    // Remove existing custom blocks section
    const existing = toolbar.querySelector('.custom-blocks-section');
    if (existing) existing.remove();

    const items = getAll();
    if (!items.length) return;

    const section = document.createElement('div');
    section.className = 'custom-blocks-section';

    const label = document.createElement('div');
    label.className = 'toolbar-label';
    label.textContent = 'Custom Blocks';
    section.appendChild(label);

    items.forEach(cb => {
      const card = document.createElement('div');
      card.className = 'tool-card custom-block-card';
      card.draggable = true;

      const icon = document.createElement('span');
      icon.className = 'tool-icon custom-block-icon';
      icon.textContent = cb.blocks.length === 1 ? getBlockIcon(cb.blocks[0]) : '\u2630';
      card.appendChild(icon);

      const info = document.createElement('div');
      info.className = 'custom-block-info';

      const nameEl = document.createElement('span');
      nameEl.className = 'custom-block-name';
      nameEl.textContent = cb.name;
      nameEl.title = 'Double-click to rename';
      nameEl.draggable = false;
      nameEl.addEventListener('dragstart', (e) => { e.preventDefault(); e.stopPropagation(); });
      nameEl.addEventListener('mousedown', (e) => { e.stopPropagation(); });
      nameEl.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        card.draggable = false;
        nameEl.contentEditable = true;
        nameEl.focus();
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(nameEl);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);

        function commit() {
          nameEl.contentEditable = false;
          card.draggable = true;
          const newName = nameEl.textContent.trim();
          if (newName && newName !== cb.name) {
            rename(cb.id, newName);
          } else {
            nameEl.textContent = cb.name;
          }
        }
        nameEl.addEventListener('blur', commit, { once: true });
        nameEl.addEventListener('keydown', (ke) => {
          if (ke.key === 'Enter') { ke.preventDefault(); nameEl.blur(); }
          if (ke.key === 'Escape') { nameEl.textContent = cb.name; nameEl.blur(); }
        });
      });
      info.appendChild(nameEl);

      const summary = document.createElement('span');
      summary.className = 'custom-block-summary';
      summary.textContent = getSummary(cb);
      info.appendChild(summary);

      card.appendChild(info);

      // Delete button
      const delBtn = document.createElement('button');
      delBtn.className = 'custom-block-delete';
      delBtn.textContent = '\u00d7';
      delBtn.title = 'Delete custom block';
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const yes = await showConfirm(`Delete "${cb.name}"?`);
        if (yes) remove(cb.id);
      });
      card.appendChild(delBtn);

      // Drag to canvas
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', '__custom__');
        e.dataTransfer.setData('application/x-custom-block-id', cb.id);
        e.dataTransfer.effectAllowed = 'copy';
        card.style.opacity = '0.5';
      });
      card.addEventListener('dragend', () => { card.style.opacity = '1'; });

      section.appendChild(card);
    });

    toolbar.appendChild(section);
  }

  // ====== Save Dialog ======

  function showDialog(message, defaultValue) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'cb-dialog-overlay';

      const dialog = document.createElement('div');
      dialog.className = 'cb-dialog';

      const label = document.createElement('div');
      label.className = 'cb-dialog-label';
      label.textContent = message;
      dialog.appendChild(label);

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'cb-dialog-input';
      input.value = defaultValue || '';
      dialog.appendChild(input);

      const buttons = document.createElement('div');
      buttons.className = 'cb-dialog-buttons';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-secondary cb-dialog-btn';
      cancelBtn.textContent = 'Cancel';

      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn btn-primary cb-dialog-btn';
      saveBtn.textContent = 'Save';

      buttons.appendChild(cancelBtn);
      buttons.appendChild(saveBtn);
      dialog.appendChild(buttons);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      input.focus();
      input.select();

      function close(value) {
        overlay.remove();
        resolve(value);
      }

      cancelBtn.addEventListener('click', () => close(null));
      saveBtn.addEventListener('click', () => close(input.value.trim()));
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') close(input.value.trim());
        if (e.key === 'Escape') close(null);
      });
    });
  }

  function showConfirm(message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'cb-dialog-overlay';

      const dialog = document.createElement('div');
      dialog.className = 'cb-dialog';

      const label = document.createElement('div');
      label.className = 'cb-dialog-label';
      label.textContent = message;
      dialog.appendChild(label);

      const buttons = document.createElement('div');
      buttons.className = 'cb-dialog-buttons';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-secondary cb-dialog-btn';
      cancelBtn.textContent = 'Cancel';

      const okBtn = document.createElement('button');
      okBtn.className = 'btn cb-dialog-btn';
      okBtn.style.cssText = 'background:#ef4444;color:#fff;';
      okBtn.textContent = 'Delete';

      buttons.appendChild(cancelBtn);
      buttons.appendChild(okBtn);
      dialog.appendChild(buttons);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      okBtn.focus();

      function close(value) { overlay.remove(); resolve(value); }
      cancelBtn.addEventListener('click', () => close(false));
      okBtn.addEventListener('click', () => close(true));
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
    });
  }

  async function promptSave(block) {
    const bt = BlockTypes[block.type];
    const defaultName = bt ? bt.label : block.type;
    const name = await showDialog('Save as custom block:', defaultName);
    if (!name) return;
    const clone = JSON.parse(JSON.stringify(block));
    delete clone.id;
    add(name, [clone]);
  }

  // ====== Init ======
  function init() {
    renderSection();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { getAll, add, remove, rename, promptSave, cloneBlockDeep, assignFreshIds, renderSection };
})();
