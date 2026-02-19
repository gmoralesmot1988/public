(() => {
  const OPEN = 'data-modal';
  const ROOT = 'data-modal-root';
  const TARGET = 'data-modal-target';

  const D365_LOADER_URLS = [
    'https://cxppusa1formui01cdnsa01-endpoint.azureedge.net/usa/FormLoader/FormLoader.bundle.js',
    'https://cxppusa1formui01cdnsa01-endpoint.azureedge.net/global/FormLoader/FormLoader.bundle.js',
  ];

  const normalize = (v) => {
    if (!v) return null;
    if (v.startsWith('#') || v.startsWith('.')) return v;
    return `#${v}`;
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const waitFor = async (fn, timeoutMs = 8000, stepMs = 50) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const v = fn();
      if (v) return v;
      await sleep(stepMs);
    }
    throw new Error('timeout');
  };

  const loadScriptOnce = (src) =>
    new Promise((resolve, reject) => {
      const existing = [...document.scripts].find((s) => s.src === src);
      if (existing) return resolve();

      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(s);
    });

  // Solo bloquea requests de tracking puro; permite los de inicialización del FormLoader
  const isBlockableDynamicsRequest = (url) => {
    if (!url || typeof url !== 'string') return false;

    const isDynamicsDomain =
      url.includes('svc.dynamics.com') || url.includes('.dynamics.com');
    if (!isDynamicsDomain) return false;

    const isTrackingOnly =
      url.includes('trackwebsitevisited') || url.includes('/t/c/');
    return isTrackingOnly;
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

  const ensureDynamicsLoader = async () => {
    if (window.d365mktforms?.createForm || window.MsCrmMkt?.MsCrmFormLoader?.load) return;

    const hasLoaderScript = [...document.scripts].some((s) =>
      /FormLoader\.bundle\.js/i.test(s.src)
    );
    if (hasLoaderScript) {
      await waitFor(() => window.d365mktforms?.createForm || window.MsCrmMkt?.MsCrmFormLoader?.load);
      return;
    }

    let lastErr = null;
    for (const url of D365_LOADER_URLS) {
      try {
        await loadScriptOnce(url);
        await waitFor(() => window.d365mktforms?.createForm || window.MsCrmMkt?.MsCrmFormLoader?.load);
        return;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('Dynamics loader not available');
  };

  const renderDynamicsFormsIn = async (root) => {
    if (!root) return;

    const placeholders = root.querySelectorAll(
      '[data-form-id][data-form-api-url][data-cached-form-url]'
    );
    if (!placeholders.length) return;

    await ensureDynamicsLoader();

    placeholders.forEach((node) => {
      if (node.dataset.d365Rendered === 'true') return;

      // Usar los atributos exactamente como vienen del HTML — no modificar
      const formId = node.getAttribute('data-form-id');
      const apiUrl = node.getAttribute('data-form-api-url');
      const cachedUrl = node.getAttribute('data-cached-form-url');

      node.innerHTML = '';

      if (window.d365mktforms?.createForm) {
        try {
          const el = window.d365mktforms.createForm(formId, apiUrl, cachedUrl);
          node.appendChild(el);
          node.dataset.d365Rendered = 'true';
          return;
        } catch (err) {
          console.warn('[Modal][Dynamics] createForm error:', err);
        }
      }

      if (window.MsCrmMkt?.MsCrmFormLoader?.load) {
        try {
          window.MsCrmMkt.MsCrmFormLoader.load();
          node.dataset.d365Rendered = 'true';
        } catch (err) {
          console.warn('[Modal][Dynamics] MsCrmFormLoader.load error:', err);
        }
      }
    });
  };

  const openModal = (root) => {
    if (!root) return;
    root.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      setTimeout(() => {
        renderDynamicsFormsIn(root).catch((e) => {
          console.warn('[Modal][Dynamics] No se pudo renderizar:', e);
        });
      }, 50);
    });
  };

  const closeModal = (root) => {
    if (!root) return;
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';

    // Resetear flag para que al re-abrir el formulario se monte de nuevo
    root.querySelectorAll('[data-d365-rendered]').forEach((node) => {
      delete node.dataset.d365Rendered;
    });
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
