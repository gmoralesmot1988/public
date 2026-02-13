(() => {
  const OPEN = 'data-modal';
  const ROOT = 'data-modal-root';
  const TARGET = 'data-modal-target';

  const normalize = (v) => {
    if (!v) return null;
    if (v.startsWith('#') || v.startsWith('.')) return v;
    return `#${v}`;
  };

  const openModal = (root) => {
    if (!root) return;
    root.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    
    // Re-trigger Dynamics FormLoader para contenedores que ahora son visibles
    if (typeof window.MsCrmMkt !== 'undefined' && window.MsCrmMkt.MsCrmFormLoader) {
      setTimeout(() => {
        try {
          window.MsCrmMkt.MsCrmFormLoader.load();
        } catch (err) {
          console.warn('[Modal] FormLoader.load() error:', err);
        }
      }, 50);
    }
  };

  const closeModal = (root) => {
    if (!root) return;
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
  };

  document.addEventListener('click', (e) => {
    // OPEN
    const opener = e.target.closest(`[${OPEN}="open"]`);
    if (opener) {
      e.preventDefault();
      const sel = normalize(opener.getAttribute(TARGET));
      const root = sel ? document.querySelector(sel) : document.querySelector(`[${ROOT}]`);
      openModal(root);
      return;
    }

    // CLOSE button/icon
    const closer = e.target.closest(`[${OPEN}="close"]`);
    if (closer) {
      e.preventDefault();
      closeModal(closer.closest(`[${ROOT}]`));
      return;
    }

    // CLOSE on click outside panel (click on overlay/root)
    const root = e.target.closest(`[${ROOT}]`);
    if (root) {
      const panel = root.querySelector('.modal_wrapper');
      if (panel && !panel.contains(e.target)) {
        closeModal(root);
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const openRoot = document.querySelector(`[${ROOT}].is-open`);
    if (openRoot) closeModal(openRoot);
  });
})();
