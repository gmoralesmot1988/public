(() => {
  const OPEN = 'data-modal';
  const ROOT = 'data-modal-root';
  const TARGET = 'data-modal-target';

  // Ajusta si tu snippet usa otra región:
  const D365_LOADER_URLS = [
    'https://cxppusa1formui01cdnsa01-endpoint.azureedge.net/usa/FormLoader/FormLoader.bundle.js',
    'https://cxppusa1formui01cdnsa01-endpoint.azureedge.net/global/FormLoader/FormLoader.bundle.js',
  ];

  const normalize = (v) => {
    if (!v) return null;
    if (v.startsWith('#') || v.startsWith('.')) return v;
    return `#${v}`;
  };

  const waitFor = (fn, timeoutMs = 8000, tickMs = 50) =>
    new Promise((resolve, reject) => {
      const start = Date.now();
      const t = setInterval(() => {
        try {
          const val = fn();
          if (val) {
            clearInterval(t);
            resolve(val);
          } else if (Date.now() - start > timeoutMs) {
            clearInterval(t);
            reject(new Error('timeout'));
          }
        } catch (e) {
          clearInterval(t);
          reject(e);
        }
      }, tickMs);
    });

  const loadScriptOnce = (src) =>
    new Promise((resolve, reject) => {
      // ya existe
      const existing = [...document.scripts].find((s) => s.src === src);
      if (existing) return resolve();

      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(s);
    });

  const ensureDynamicsLoader = async () => {
    // Si ya está listo, no hagas nada
    if (window.d365mktforms?.createForm || window.MsCrmMkt?.MsCrmFormLoader?.load) return;

    // Si ya hay algún script de FormLoader en la página, espera a que exponga el objeto
    const anyLoaderOnPage = [...document.scripts].some((s) => /FormLoader\.bundle\.js/i.test(s.src));
    if (anyLoaderOnPage) {
      await waitFor(() => window.d365mktforms?.createForm || window.MsCrmMkt?.MsCrmFormLoader?.load, 8000);
      return;
    }

    // Si no existe, inyéctalo (probando varias URLs)
    let lastErr = null;
    for (const url of D365_LOADER_URLS) {
      try {
        await loadScriptOnce(url);
        await waitFor(() => window.d365mktforms?.createForm || window.MsCrmMkt?.MsCrmFormLoader?.load, 8000);
        return;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('Dynamics loader not available');
  };

  const fixApiUrlIfNeeded = (node) => {
    // Mucha gente pone ".../landingpageforms" (base) pero Dynamics suele necesitar
    // ".../landingpageforms/forms/<FORM_ID>"
    const formId = node.getAttribute('data-form-id');
    const apiUrl = node.getAttribute('data-form-api-url') || '';

    if (!formId || !apiUrl) return;

    const looksLikeBase =
      /\/landingpageforms\/?$/i.test(apiUrl) || /\/landingpageforms\?/.test(apiUrl);

    if (looksLikeBase) {
      const next = apiUrl.replace(/\/landingpageforms\/?$/i, `/landingpageforms/forms/${formId}`);
      node.setAttribute('data-form-api-url', next);
      console.warn('[Modal][Dynamics] data-form-api-url parecía base. Lo ajusté a:', next);
    }
  };

  const renderDynamicsFormsIn = async (root) => {
    if (!root) return;
    const nodes = root.querySelectorAll('[data-form-id][data-form-api-url][data-cached-form-url]');
    if (!nodes.length) return;

    // Asegura loader
    await ensureDynamicsLoader();

    nodes.forEach((node) => {
      if (node.dataset.d365Rendered === 'true') return;

      fixApiUrlIfNeeded(node);

      const formId = node.getAttribute('data-form-id');
      const apiUrl = node.getAttribute('data-form-api-url');
      const cachedUrl = node.getAttribute('data-cached-form-url');

      // Limpia contenido previo (por si quedó algo a medias)
      node.innerHTML = '';

      // API moderna
      if (window.d365mktforms?.createForm) {
        try {
          const formEl = window.d365mktforms.createForm(formId, apiUrl, cachedUrl);
          node.appendChild(formEl);
          node.dataset.d365Rendered = 'true';
          return;
        } catch (err) {
          console.warn('[Modal][Dynamics] createForm error:', err);
        }
      }

      // Fallback viejo
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

    // Espera a que el modal sea visible y luego renderiza
    requestAnimationFrame(() => {
      setTimeout(() => {
        renderDynamicsFormsIn(root).catch((e) => {
          console.warn('[Modal][Dynamics] No se pudo renderizar el formulario:', e);
        });
      }, 0);
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
      const root = sel ? document.querySelector(sel) : document.querySelector(`[${ROOT}]`);
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
