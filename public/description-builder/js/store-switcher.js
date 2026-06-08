/**
 * Store Switcher — populates the store-select dropdown and handles switching.
 * Expects a <select id="store-select"> element in the page.
 * Must be loaded AFTER api-client.js.
 */
(function() {
  const select = document.getElementById('store-select');
  if (!select) return;

  async function init() {
    try {
      const data = await API.getStores();
      select.innerHTML = '';
      (data.stores || []).forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.index;
        opt.textContent = s.name;
        if (s.index === data.active) opt.selected = true;
        select.appendChild(opt);
      });
      // Persist so other pages can read which store is active
      sessionStorage.setItem('active-store', data.active);
    } catch (err) {
      console.error('Failed to load stores:', err);
    }
  }

  select.addEventListener('change', async () => {
    const index = parseInt(select.value, 10);
    try {
      const result = await API.switchStore(index);
      sessionStorage.setItem('active-store', result.index);
      // Toast notification (works on any page that has a toast function, or create one)
      showToast(`Switched to ${result.name}`, 'success');
    } catch (err) {
      console.error('Failed to switch store:', err);
      showToast('Failed to switch store', 'error');
    }
  });

  function showToast(message, type) {
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  init();
})();
