/* ====== Toolbar: renders draggable block cards ====== */
(function() {
  const categories = [
    { key: 'text', label: 'Text' },
    { key: 'media', label: 'Media' },
    { key: 'content', label: 'Content' },
    { key: 'layout', label: 'Layout' },
  ];

  function renderToolbar() {
    const toolbar = document.getElementById('toolbar');
    toolbar.innerHTML = '';

    categories.forEach(cat => {
      const blocks = Object.values(BlockTypes).filter(b => b.category === cat.key);
      if (!blocks.length) return;

      const label = document.createElement('div');
      label.className = 'toolbar-label';
      label.textContent = cat.label;
      toolbar.appendChild(label);

      blocks.forEach(block => {
        const card = document.createElement('div');
        card.className = 'tool-card';
        card.draggable = true;

        const icon = document.createElement('span');
        icon.className = 'tool-icon';
        icon.textContent = block.icon;
        card.appendChild(icon);

        const name = document.createElement('span');
        name.textContent = block.label;
        card.appendChild(name);

        card.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', block.type);
          e.dataTransfer.effectAllowed = 'copy';
          card.style.opacity = '0.5';
        });
        card.addEventListener('dragend', () => {
          card.style.opacity = '1';
        });

        toolbar.appendChild(card);
      });
    });
  }

  // Init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderToolbar);
  } else {
    renderToolbar();
  }
})();
