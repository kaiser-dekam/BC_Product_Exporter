/* ====== Canvas: drop zone, block ordering, drag-and-drop ====== */
window.CanvasManager = (function() {
  let blocks = []; // Array of { id, type, data }
  let canvasEl;
  let dropZoneReady = false;

  function init() {
    canvasEl = document.getElementById('canvas');
    setupDropZone();
  }

  function getBlocks() { return blocks; }

  function setupDropZone() {
    if (dropZoneReady) return;
    dropZoneReady = true;

    canvasEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      canvasEl.classList.add('drag-over');
      showDropIndicator(e);
    });

    canvasEl.addEventListener('dragleave', (e) => {
      if (!canvasEl.contains(e.relatedTarget)) {
        canvasEl.classList.remove('drag-over');
        removeDropIndicator();
      }
    });

    canvasEl.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      canvasEl.classList.remove('drag-over');
      removeDropIndicator();

      const blockType = e.dataTransfer.getData('text/plain');
      const draggedId = e.dataTransfer.getData('application/x-block-id');

      if (draggedId) {
        // Reorder existing block
        const fromIdx = blocks.findIndex(b => b.id === draggedId);
        if (fromIdx === -1) return;
        const toIdx = getDropIndex(e);
        const [moved] = blocks.splice(fromIdx, 1);
        const adjustedIdx = toIdx > fromIdx ? toIdx - 1 : toIdx;
        blocks.splice(adjustedIdx, 0, moved);
        render();
      } else if (blockType === '__custom__') {
        // Custom block from sidebar
        const cbId = e.dataTransfer.getData('application/x-custom-block-id');
        if (!cbId || !window.CustomBlocks) return;
        const all = CustomBlocks.getAll();
        const cb = all.find(c => c.id === cbId);
        if (!cb) return;
        const cloned = JSON.parse(JSON.stringify(cb.blocks));
        CustomBlocks.assignFreshIds(cloned);
        const idx = getDropIndex(e);
        blocks.splice(idx, 0, ...cloned);
        render();
      } else if (blockType && BlockTypes[blockType]) {
        // New block from toolbar
        const newBlock = {
          id: generateId(),
          type: blockType,
          data: BlockTypes[blockType].defaultData()
        };
        const idx = getDropIndex(e);
        blocks.splice(idx, 0, newBlock);
        render();
      }
    });
  }

  function getDropIndex(e) {
    const blockEls = canvasEl.querySelectorAll(':scope > .canvas-block');
    for (let i = 0; i < blockEls.length; i++) {
      const rect = blockEls[i].getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) return i;
    }
    return blocks.length;
  }

  function showDropIndicator(e) {
    removeDropIndicator();
    const indicator = document.createElement('div');
    indicator.className = 'drop-indicator';
    const idx = getDropIndex(e);
    const blockEls = canvasEl.querySelectorAll(':scope > .canvas-block');
    if (idx < blockEls.length) {
      canvasEl.insertBefore(indicator, blockEls[idx]);
    } else {
      canvasEl.appendChild(indicator);
    }
  }

  function removeDropIndicator() {
    canvasEl.querySelectorAll('.drop-indicator').forEach(el => el.remove());
  }

  function render() {
    canvasEl.innerHTML = '';

    if (blocks.length === 0) {
      canvasEl.innerHTML = '<div class="canvas-placeholder">Drag blocks from the toolbar to start building</div>';
      return;
    }

    blocks.forEach((block, i) => {
      const el = renderCanvasBlock(
        block,
        (newData, opts) => {
          blocks[i].data = newData;
          // Re-render for structural changes (block added/removed from column)
          // but NOT for content edits (typing in a text field)
          if (opts && opts.structural) {
            render();
          }
        },
        () => {
          blocks.splice(i, 1);
          render();
        },
        false
      );

      // Drag is now handled by the block's drag handle (see blocks.js renderCanvasBlock)

      canvasEl.appendChild(el);
    });
  }

  function loadBlocks(newBlocks) {
    blocks = newBlocks;
    if (!canvasEl) {
      canvasEl = document.getElementById('canvas');
      if (canvasEl) setupDropZone();
    }
    render();
  }

  // Init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { getBlocks, render, loadBlocks };
})();
