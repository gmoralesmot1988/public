(() => {
  const OPEN = 'data-modal';
  const ROOT = 'data-modal-root';
  const TARGET = 'data-modal-target';

  const FORMLOADER_SRC =
    'https://cxppusa1formui01cdnsa01-endpoint.azureedge.net/usa/FormLoader/FormLoader.bundle.js';

  const normalize = (v) => {
    if (!v) return null;
    if (v.startsWith('#') || v.startsWith('.')) return v;
    return `#${v}`;
  };

  // Solo bloquea requests de tracking puro de Dynamics
  const isBlockableDynamicsRequest = (url) => {
    if (!url || typeof url !== 'string') return false;
    const isDynamicsDomain =
      url.includes('svc.dynamics.com') || url.includes('.dynamics.com');
    if (!isDynamicsDomain) return false;
    return url.includes('trackwebsitevisited') || url.includes('/t/c/');
  };

  if (!window.__modalFetchIntercepted) {
    window.__modalFetchIntercepted = true;
    const _origFetch = window.fetch;
    window.fetch = function (...args) {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
      if (isBlockableDynamicsRequest(url)) {
        console.debug('[Modal] Fetch bloqueado (tracking):', url);
        return Promise.reject(new Error('Request bloqueado: tracking no permitido'));
      }
      return _origFetch.apply(this, args);
    };
  }

  const reloadFormLoader = () => {
    // Limpiar estado previo del FormLoader para que re-escanee el DOM
    try {
      if (window.d365mktforms) delete window.d365mktforms;
      if (window.MsCrmMkt) delete window.MsCrmMkt;
    } catch (e) {}

    // Eliminar script anterior
    const old = document.getElementById('d365-modal-loader');
    if (old) old.remove();

    // Reinyectar script — al cargarse escanea el DOM y encuentra el placeholder
    const s = document.createElement('script');
    s.id = 'd365-modal-loader';
    s.src = FORMLOADER_SRC;
    s.async = true;
    document.head.appendChild(s);
  };

  const openModal = (root) => {
    if (!root) return;
    root.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';

    // Esperar a que el modal sea visible en el DOM antes de cargar el form
    requestAnimationFrame(() => {
      setTimeout(() => {
        const hasForm = root.querySelector(
          '[data-form-id][data-form-api-url][data-cached-form-url]'
        );
        if (hasForm) {
          // Limpiar contenido previo del placeholder para evitar duplicados
          hasForm.innerHTML = '';
          reloadFormLoader();
        }
      }, 100);
    });
  };

  const closeModal = (root) => {
    if (!root) return;
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
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
