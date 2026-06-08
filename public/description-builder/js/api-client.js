/**
 * API Client — Master_Product_Manager integration
 *
 * Routes every request through /api/description-builder/* on the host Next.js
 * app, attaching the Supabase Bearer token that the parent page stashes in
 * localStorage under `mpm_token`.
 */
(function () {
  const API_BASE = '/api/description-builder';

  function getToken() {
    try { return localStorage.getItem('mpm_token') || ''; }
    catch { return ''; }
  }

  async function apiFetch(path, opts = {}) {
    const headers = Object.assign({}, opts.headers || {});
    const token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const res = await fetch(API_BASE + path, Object.assign({}, opts, { headers }));
    return res;
  }

  window.API = {
    isElectron: false,

    // ====== Store Switching (single store driven by MPM profile) ======
    async getStores() {
      const res = await apiFetch('/stores');
      return res.json();
    },
    async switchStore(_index) {
      return { index: 0, name: 'Default Store' };
    },
    async getActiveStore() {
      const res = await apiFetch('/stores/active');
      return res.json();
    },

    // ====== BigCommerce API ======
    async searchProducts(keyword, limit) {
      const res = await apiFetch(`/products?keyword=${encodeURIComponent(keyword || '')}&limit=${limit || 20}`);
      return res.json();
    },

    async getProductLibrary(page, limit, keyword) {
      let url = `/products/library?page=${page}&limit=${limit}`;
      if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;
      const res = await apiFetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      return json;
    },

    async getCsvPreview(_keyword) {
      throw new Error('CSV preview not available in this build');
    },

    async saveDescription(productId, description) {
      const res = await apiFetch(`/products/${productId}/description`, {
        method: 'PUT',
        body: JSON.stringify({ description }),
      });
      const json = await res.json();
      return { ok: res.ok, data: json };
    },

    // ====== Drafts ======
    async listDrafts() {
      const res = await apiFetch('/drafts');
      return res.json();
    },
    async getDraft(productId) {
      const res = await apiFetch(`/drafts/${productId}`);
      if (res.status === 404) return null;
      return res.json();
    },
    async saveDraft(productId, payload) {
      const res = await apiFetch(`/drafts/${productId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save draft');
      return json;
    },
    async deleteDraft(productId) {
      const res = await apiFetch(`/drafts/${productId}`, { method: 'DELETE' });
      return res.json();
    },
    async publishDraft(productId) {
      const res = await apiFetch(`/drafts/${productId}/publish`, { method: 'POST' });
      const json = await res.json();
      return { ok: res.ok, data: json };
    },
  };
})();
