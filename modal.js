(() => {
  const OPEN = 'data-modal';
  const ROOT = 'data-modal-root';
  const TARGET = 'data-modal-target';

  const normalize = (v) => {
    if (!v) return null;
    if (v.startsWith('#') || v.startsWith('.')) return v;
    return `#${v}`;
  };

  const renderFormInModal = (root) => {
    const p = root.querySelector(
      '[data-form-id][data-form-api-url][data-cached-form-url]'
    );
    if (!p) return;

    p.innerHTML = '';

    if (!window.d365mktforms?.createForm) {
      console.warn('[Modal] d365mktforms no disponible');
      return;
    }

    try {
      const el = window.d365mktforms.createForm(
        p.getAttribute('data-form-id'),
        p.getAttribute('data-form-api-url'),
        p.getAttribute('data-cached-form-url')
      );
      if (el) p.appendChild(el);
      console.log('[Modal] Form montado correctamente');
    } catch (err) {
      console.warn('[Modal] createForm error:', err);
    }
  };

  const openModal = (root) => {
    if (!root) return;
    root.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      setTimeout(() => renderFormInModal(root), 100);
    });
  };

  const closeModal = (root) => {
    if (!root) return;
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';

    const p = root.querySelector('[data-form-id][data-form-api-url][data-cached-form-url]');
    if (p) p.innerHTML = '';
  };

  document.addEventListener('click', (e) => {
    const opener = e.target.closest(`[${OPEN}="open"]`);
    if (opener) {
      e.preventDefault();
      const sel = normalize(opener.getAttribute(TARGET));
      const root = sel
        ? document.querySelector(sel)
        : document.querySelector(`[${ROOT}]`);
      openModal(root);
      return;
    }

    const closer = e.target.closest(`[${OPEN}="close"]`);
    if (closer) {
      e.preventDefault();
      closeModal(closer.closest(`[${ROOT}]`));
      return;
    }

    const root = e.target.closest(`[${ROOT}]`);
    if (root) {
      const panel = root.querySelector('.modal_wrapper');
      if (panel && !panel.contains(e.target)) closeModal(root);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const openRoot = document.querySelector(`[${ROOT}].is-open`);
    if (openRoot) closeModal(openRoot);
  });
})();
