/* ====== Product Picker Modal ====== */
window.ProductPicker = (function () {

  let modalEl = null;
  let resolvePromise = null;
  let selectedProducts = new Map(); // id → { name, url, sku, thumb }
  let searchTimeout = null;

  function ensureModal() {
    if (modalEl) return;

    modalEl = document.createElement('div');
    modalEl.className = 'product-picker-overlay hidden';
    modalEl.innerHTML = `
      <div class="product-picker-modal">
        <div class="product-picker-header">
          <h3>Select Products</h3>
          <button class="product-picker-close">&times;</button>
        </div>
        <div class="product-picker-search">
          <input type="text" class="product-picker-input" placeholder="Search products by name or SKU..." autocomplete="off">
        </div>
        <div class="product-picker-selected-bar hidden">
          <span class="product-picker-selected-count"></span>
          <button class="product-picker-clear-btn">Clear all</button>
        </div>
        <div class="product-picker-results">
          <div class="product-picker-empty">Search for products to add</div>
        </div>
        <div class="product-picker-footer">
          <button class="btn btn-secondary product-picker-cancel">Cancel</button>
          <button class="btn btn-primary product-picker-add" disabled>Add Selected</button>
        </div>
      </div>
    `;
    document.body.appendChild(modalEl);

    // Wire up events
    const closeBtn = modalEl.querySelector('.product-picker-close');
    const cancelBtn = modalEl.querySelector('.product-picker-cancel');
    const addBtn = modalEl.querySelector('.product-picker-add');
    const input = modalEl.querySelector('.product-picker-input');
    const clearBtn = modalEl.querySelector('.product-picker-clear-btn');

    closeBtn.onclick = () => close([]);
    cancelBtn.onclick = () => close([]);
    addBtn.onclick = () => close(Array.from(selectedProducts.values()));
    clearBtn.onclick = () => { selectedProducts.clear(); updateSelectedBar(); renderResults(); };

    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) close([]);
    });

    input.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      const q = input.value.trim();
      if (!q) {
        showEmpty('Search for products to add');
        return;
      }
      showEmpty('Searching...');
      searchTimeout = setTimeout(() => search(q), 350);
    });
  }

  async function search(keyword) {
    try {
      const json = await API.searchProducts(keyword, 30);
      const products = json.data || [];
      if (!products.length) {
        showEmpty('No products found');
        return;
      }
      renderResults(products);
    } catch (err) {
      showEmpty('Search failed: ' + err.message);
    }
  }

  function showEmpty(msg) {
    const results = modalEl.querySelector('.product-picker-results');
    results.innerHTML = `<div class="product-picker-empty">${msg}</div>`;
  }

  function renderResults(products) {
    const results = modalEl.querySelector('.product-picker-results');
    // If called without products, just re-render with checkmarks (used after clear)
    const items = results.querySelectorAll('.product-picker-item');
    if (!products && items.length) {
      items.forEach(item => {
        const id = parseInt(item.dataset.productId);
        const cb = item.querySelector('input[type="checkbox"]');
        cb.checked = selectedProducts.has(id);
        item.classList.toggle('selected', selectedProducts.has(id));
      });
      updateAddButton();
      return;
    }
    if (!products) return;

    results.innerHTML = '';
    products.forEach(p => {
      const thumb = p.images && p.images.length ? p.images[0].url_thumbnail : '';
      const url = p.custom_url ? p.custom_url.url : '';
      const isSelected = selectedProducts.has(p.id);

      const item = document.createElement('div');
      item.className = 'product-picker-item' + (isSelected ? ' selected' : '');
      item.dataset.productId = p.id;

      item.innerHTML = `
        <input type="checkbox" class="product-picker-cb" ${isSelected ? 'checked' : ''}>
        ${thumb ? `<img class="product-picker-thumb" src="${thumb}" alt="">` : '<div class="product-picker-thumb-placeholder"></div>'}
        <div class="product-picker-info">
          <div class="product-picker-name">${escapeHTML(p.name)}</div>
          <div class="product-picker-sku">${p.sku ? escapeHTML(p.sku) : ''}</div>
        </div>
      `;

      item.onclick = (e) => {
        if (e.target.tagName === 'INPUT') return; // let checkbox handle itself
        const cb = item.querySelector('input[type="checkbox"]');
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event('change'));
      };

      const cb = item.querySelector('input[type="checkbox"]');
      cb.addEventListener('change', () => {
        if (cb.checked) {
          selectedProducts.set(p.id, { name: p.name, url: url, sku: p.sku || '' });
          item.classList.add('selected');
        } else {
          selectedProducts.delete(p.id);
          item.classList.remove('selected');
        }
        updateAddButton();
        updateSelectedBar();
      });

      results.appendChild(item);
    });
  }

  function updateAddButton() {
    const btn = modalEl.querySelector('.product-picker-add');
    const count = selectedProducts.size;
    btn.disabled = count === 0;
    btn.textContent = count ? `Add ${count} Product${count > 1 ? 's' : ''}` : 'Add Selected';
  }

  function updateSelectedBar() {
    const bar = modalEl.querySelector('.product-picker-selected-bar');
    const count = selectedProducts.size;
    if (count === 0) {
      bar.classList.add('hidden');
    } else {
      bar.classList.remove('hidden');
      bar.querySelector('.product-picker-selected-count').textContent = `${count} product${count > 1 ? 's' : ''} selected`;
    }
    updateAddButton();
  }

  function close(result) {
    modalEl.classList.add('hidden');
    if (resolvePromise) {
      resolvePromise(result);
      resolvePromise = null;
    }
  }

  function escapeHTML(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  /**
   * Open the product picker modal.
   * Returns a promise that resolves to an array of { name, url, sku } objects.
   * Empty array if cancelled.
   */
  function open() {
    ensureModal();
    selectedProducts.clear();
    const input = modalEl.querySelector('.product-picker-input');
    input.value = '';
    showEmpty('Search for products to add');
    updateSelectedBar();
    updateAddButton();
    modalEl.classList.remove('hidden');
    setTimeout(() => input.focus(), 100);
    return new Promise((resolve) => { resolvePromise = resolve; });
  }

  return { open };
})();
