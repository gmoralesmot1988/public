(() => {
  const OPEN = 'data-modal';
  const ROOT = 'data-modal-root';
  const TARGET = 'data-modal-target';

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

  const renderFormInModal = (root) => {
    const placeholder = root.querySelector(
      '[data-form-id][data-form-api-url][data-cached-form-url]'
    );
    if (!placeholder) return;

    const formId = placeholder.getAttribute('data-form-id');
    const apiUrl = placeholder.getAttribute('data-form-api-url');
    const cachedUrl = placeholder.getAttribute('data-cached-form-url');

    // Limpiar contenido previo
    placeholder.innerHTML = '';

    if (window.d365mktforms?.createForm) {
      try {
        console.debug('[Modal] Usando d365mktforms.createForm existente');
        const el = window.d365mktforms.createForm(formId, apiUrl, cachedUrl);
        if (el) placeholder.appendChild(el);
      } catch (err) {
        console.warn('[Modal] createForm error:', err);
      }
      return;
    }

    // Fallback: esperar hasta 5s y reintentar
    console.debug('[Modal] d365mktforms no disponible, esperando...');
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (window.d365mktforms?.createForm) {
        clearInterval(interval);
        try {
          const el = window.d365mktforms.createForm(formId, apiUrl, cachedUrl);
          if (el) placeholder.appendChild(el);
        } catch (err) {
          console.warn('[Modal] createForm error (retry):', err);
        }
      } else if (attempts >= 100) {
        clearInterval(interval);
        console.warn('[Modal] d365mktforms no disponible tras 5s');
      }
    }, 50);
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

    // Limpiar el form al cerrar para que al re-abrir se monte fresco
    const placeholder = root.querySelector(
      '[data-form-id][data-form-api-url][data-cached-form-url]'
    );
    if (placeholder) placeholder.innerHTML = '';
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
