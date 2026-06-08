/* ====== App: product search, preview, save ====== */
(function() {
  let selectedProductId = null;
  let selectedProductName = '';
  let searchTimeout = null;

  const searchInput = document.getElementById('product-search');
  const dropdown = document.getElementById('product-dropdown');
  const selectedLabel = document.getElementById('selected-product');
  const btnPreview = document.getElementById('btn-preview');
  const btnCopy = document.getElementById('btn-copy');
  const btnSave = document.getElementById('btn-save');
  const btnSaveDraft = document.getElementById('btn-save-draft');
  const draftBanner = document.getElementById('draft-banner');
  const draftBannerText = document.getElementById('draft-banner-text');
  const btnPublishDraft = document.getElementById('btn-publish-draft');
  const btnDiscardDraft = document.getElementById('btn-discard-draft');
  let editingDraft = false;
  let selectedProductSku = '';
  const previewPanel = document.getElementById('preview-panel');
  const previewIframe = document.getElementById('preview-iframe');
  const btnClosePreview = document.getElementById('btn-close-preview');
  const btnDesign = document.getElementById('btn-design');
  const designSidebar = document.getElementById('design-sidebar');
  const currentDescPanel = document.getElementById('current-desc-panel');
  const currentDescToggle = document.getElementById('current-desc-toggle');
  const currentDescIframe = document.getElementById('current-desc-iframe');

  // ====== Current Description Panel ======
  currentDescToggle.addEventListener('click', () => {
    currentDescPanel.classList.toggle('collapsed');
  });

  function showCurrentDescPanel(descHtml) {
    currentDescIframe.srcdoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:16px;background:#fff;font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:#1f2937;}</style></head><body>${descHtml}</body></html>`;
    currentDescPanel.classList.remove('hidden');
  }

  // ====== Design Panel ======
  DesignSettings.init(designSidebar);

  btnDesign.addEventListener('click', () => {
    const isOpen = designSidebar.classList.toggle('open');
    btnDesign.classList.toggle('active', isOpen);
  });

  // ====== Restore Persisted Product Selection ======
  // (survives navigating to Templates/Products and back)
  const savedProduct = sessionStorage.getItem('active-product');
  if (savedProduct && !sessionStorage.getItem('edit-product')) {
    try {
      const sp = JSON.parse(savedProduct);
      selectedProductId = sp.id;
      selectedProductName = sp.name;
      selectedLabel.textContent = sp.name;
      btnSave.disabled = false;
      // Restore current description reference panel if it was showing
      if (sp.currentDesc) {
        showCurrentDescPanel(sp.currentDesc);
      }
    } catch (e) { /* ignore */ }
  }

  function showDraftBanner(updatedAt) {
    editingDraft = true;
    const when = updatedAt ? new Date(updatedAt).toLocaleString() : '';
    draftBannerText.textContent = `Editing draft${when ? ` — saved ${when}` : ''}`;
    draftBanner.classList.remove('hidden');
  }
  function hideDraftBanner() {
    editingDraft = false;
    draftBanner.classList.add('hidden');
  }

  function loadDescriptionIntoBuilder(description) {
    const builderData = HTMLGenerator.extractBuilderData(description);
    if (builderData) {
      if (builderData.colorOverrides && window.ThemeColors) {
        window.ThemeColors.importOverrides(builderData.colorOverrides);
      }
      if (builderData.theme && window.DesignSettings && window.DesignSettings.setTheme) {
        window.DesignSettings.setTheme(builderData.theme);
      }
      CanvasManager.loadBlocks(builderData.blocks);
      return true;
    }
    return false;
  }

  // ====== Load Product from Library ======
  const editProduct = sessionStorage.getItem('edit-product');
  if (editProduct) {
    try {
      const product = JSON.parse(editProduct);
      sessionStorage.removeItem('edit-product');
      selectedProductId = product.id;
      selectedProductName = product.name;
      selectedProductSku = product.sku || '';
      selectedLabel.textContent = product.name + (product.sku ? ` (${product.sku})` : '');
      btnSave.disabled = false;
      btnSaveDraft.disabled = false;

      // If a draft exists, prefer it over the live description.
      (async () => {
        let draft = null;
        try { draft = await API.getDraft(product.id); } catch (e) {}
        if (draft && typeof draft.description === 'string') {
          if (loadDescriptionIntoBuilder(draft.description)) {
            sessionStorage.setItem('active-product', JSON.stringify({ id: product.id, name: product.name }));
            showDraftBanner(draft.updatedAt);
            // Still show the live description as reference if it was set
            if (product.description) showCurrentDescPanel(product.description);
            toast(`Loaded draft for ${product.name}`, 'success');
            return;
          }
          // Draft exists but isn't builder-data: still load HTML and show banner
          sessionStorage.setItem('active-product', JSON.stringify({ id: product.id, name: product.name, currentDesc: product.description || '' }));
          if (product.description) showCurrentDescPanel(product.description);
          showDraftBanner(draft.updatedAt);
          toast(`Loaded draft for ${product.name} (raw HTML)`, 'success');
          return;
        }
        // No draft: existing flow.
        loadFromLiveDescription(product);
      })();
    } catch (e) {
      console.error('Failed to load product:', e);
      sessionStorage.removeItem('edit-product');
    }
  }

  function loadFromLiveDescription(product) {
    try {
      // Try to restore builder state from description
      if (product.description) {
        const builderData = HTMLGenerator.extractBuilderData(product.description);
        if (builderData) {
          sessionStorage.setItem('active-product', JSON.stringify({ id: product.id, name: product.name }));
          // Restore color overrides first (before theme switch triggers re-render)
          if (builderData.colorOverrides && window.ThemeColors) {
            window.ThemeColors.importOverrides(builderData.colorOverrides);
          }
          // Restore theme
          if (builderData.theme && window.DesignSettings && window.DesignSettings.setTheme) {
            window.DesignSettings.setTheme(builderData.theme);
          }
          // Restore blocks
          CanvasManager.loadBlocks(builderData.blocks);
          toast(`Editing: ${product.name} — builder state restored!`, 'success');
        } else {
          // Persist description so the reference panel survives navigation
          sessionStorage.setItem('active-product', JSON.stringify({ id: product.id, name: product.name, currentDesc: product.description }));
          showCurrentDescPanel(product.description);
          toast(`Editing: ${product.name} (description was not created with this builder)`, 'success');
        }
      } else {
        sessionStorage.setItem('active-product', JSON.stringify({ id: product.id, name: product.name }));
        toast(`Editing: ${product.name}`, 'success');
      }
    } catch (e) {
      console.error('Failed to load product:', e);
      sessionStorage.removeItem('edit-product');
    }
  }

  // ====== Load Pending Template ======
  const pendingTemplate = sessionStorage.getItem('pending-template');
  if (pendingTemplate) {
    try {
      const blocks = JSON.parse(pendingTemplate);
      sessionStorage.removeItem('pending-template');
      CanvasManager.loadBlocks(blocks);
      toast('Template loaded! Customize it and select a product to save.', 'success');
    } catch (e) {
      console.error('Failed to load template:', e);
      sessionStorage.removeItem('pending-template');
    }
  }

  // ====== Product Search ======
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const q = searchInput.value.trim();
    if (!q) { dropdown.classList.add('hidden'); return; }
    searchTimeout = setTimeout(() => searchProducts(q), 400);
  });

  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim() && dropdown.children.length) {
      dropdown.classList.remove('hidden');
    }
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && e.target !== searchInput) {
      dropdown.classList.add('hidden');
    }
  });

  async function searchProducts(keyword) {
    try {
      const json = await API.searchProducts(keyword, 20);
      const products = json.data || [];
      renderDropdown(products);
    } catch (err) {
      console.error('Search failed:', err);
    }
  }

  function renderDropdown(products) {
    dropdown.innerHTML = '';
    if (!products.length) {
      dropdown.innerHTML = '<div class="dropdown-item" style="color:#9ca3af;">No products found</div>';
      dropdown.classList.remove('hidden');
      return;
    }

    products.forEach(p => {
      const item = document.createElement('div');
      item.className = 'dropdown-item';

      const thumb = p.images && p.images.length ? p.images[0].url_thumbnail : '';
      if (thumb) {
        const img = document.createElement('img');
        img.src = thumb;
        img.alt = p.name;
        item.appendChild(img);
      }

      const name = document.createElement('span');
      name.textContent = p.name;
      item.appendChild(name);

      item.onclick = () => selectProduct(p);
      dropdown.appendChild(item);
    });

    dropdown.classList.remove('hidden');
  }

  function selectProduct(product) {
    selectedProductId = product.id;
    selectedProductName = product.name;
    selectedProductSku = product.sku || '';
    selectedLabel.textContent = product.name;
    searchInput.value = '';
    dropdown.classList.add('hidden');
    btnSave.disabled = false;
    btnSaveDraft.disabled = false;
    hideDraftBanner();
    // Persist selection so it survives page navigations (e.g. Templates → Builder)
    sessionStorage.setItem('active-product', JSON.stringify({ id: product.id, name: product.name }));
    toast(`Loaded: ${product.name}`, 'success');
  }

  // ====== Preview ======
  btnPreview.addEventListener('click', () => {
    const html = HTMLGenerator.generate(CanvasManager.getBlocks());
    if (!html) { toast('Canvas is empty', 'error'); return; }
    previewIframe.srcdoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:16px;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;}</style></head><body>${html}</body></html>`;
    previewPanel.classList.remove('hidden');
  });

  btnClosePreview.addEventListener('click', () => {
    previewPanel.classList.add('hidden');
  });

  // ====== Copy HTML ======
  btnCopy.addEventListener('click', async () => {
    const html = HTMLGenerator.generate(CanvasManager.getBlocks());
    if (!html) { toast('Canvas is empty', 'error'); return; }
    try {
      await navigator.clipboard.writeText(html);
      toast('HTML copied to clipboard!', 'success');
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = html;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      toast('HTML copied!', 'success');
    }
  });

  // ====== Save to BigCommerce ======
  btnSave.addEventListener('click', async () => {
    if (!selectedProductId) { toast('No product selected', 'error'); return; }
    const html = HTMLGenerator.generate(CanvasManager.getBlocks());
    if (!html) { toast('Canvas is empty', 'error'); return; }

    btnSave.disabled = true;
    btnSave.textContent = 'Saving...';

    try {
      const result = await API.saveDescription(selectedProductId, html);
      if (result.ok) {
        // If a draft existed for this product, clear it now that live matches.
        try { await API.deleteDraft(selectedProductId); } catch (e) {}
        hideDraftBanner();
        toast(`Saved to "${selectedProductName}"!`, 'success');
      } else {
        const json = result.data || {};
        toast(`Save failed: ${json.title || json.error || 'Unknown error'}`, 'error');
      }
    } catch (err) {
      toast(`Save failed: ${err.message}`, 'error');
    } finally {
      btnSave.disabled = false;
      btnSave.textContent = 'Save to BigCommerce';
    }
  });

  // ====== Drafts ======
  btnSaveDraft.addEventListener('click', async () => {
    if (!selectedProductId) { toast('No product selected', 'error'); return; }
    const html = HTMLGenerator.generate(CanvasManager.getBlocks());
    if (!html) { toast('Canvas is empty', 'error'); return; }
    btnSaveDraft.disabled = true;
    const original = btnSaveDraft.textContent;
    btnSaveDraft.textContent = 'Saving...';
    try {
      await API.saveDraft(selectedProductId, {
        description: html,
        name: selectedProductName,
        sku: selectedProductSku,
      });
      showDraftBanner(new Date().toISOString());
      toast(`Draft saved for "${selectedProductName}"`, 'success');
    } catch (err) {
      toast(`Save draft failed: ${err.message}`, 'error');
    } finally {
      btnSaveDraft.disabled = false;
      btnSaveDraft.textContent = original;
    }
  });

  btnPublishDraft.addEventListener('click', async () => {
    if (!selectedProductId) return;
    if (!confirm(`Publish draft to BigCommerce for "${selectedProductName}"? This overwrites the live description.`)) return;
    btnPublishDraft.disabled = true;
    btnPublishDraft.textContent = 'Publishing...';
    try {
      const result = await API.publishDraft(selectedProductId);
      if (result.ok) {
        hideDraftBanner();
        toast(`Published "${selectedProductName}" to BigCommerce`, 'success');
      } else {
        const msg = (result.data && (result.data.title || result.data.error)) || result.error || 'Unknown error';
        toast(`Publish failed: ${msg}`, 'error');
      }
    } catch (err) {
      toast(`Publish failed: ${err.message}`, 'error');
    } finally {
      btnPublishDraft.disabled = false;
      btnPublishDraft.textContent = 'Publish Draft';
    }
  });

  btnDiscardDraft.addEventListener('click', async () => {
    if (!selectedProductId) return;
    if (!confirm(`Discard the draft for "${selectedProductName}"? This cannot be undone.`)) return;
    try {
      await API.deleteDraft(selectedProductId);
      hideDraftBanner();
      toast('Draft discarded', 'success');
    } catch (err) {
      toast(`Discard failed: ${err.message}`, 'error');
    }
  });

  // ====== Toast ======
  function toast(message, type) {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
})();
