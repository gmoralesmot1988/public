(() => {
  const SELECTORS = {
    contactBtn: '.contact-button-wp .contact-button',
    wpPanel: '.whatsapp-wrapper',
  };

  function initWhatsappWidget() {
    // Evita inicializar 2 veces si Slater reinyecta scripts
    if (window.__wpWidgetInited) return;
    window.__wpWidgetInited = true;

    if (typeof gsap === "undefined") {
      console.warn("[WP Widget] GSAP no está cargado. Revisa el <script> de GSAP.");
      return;
    }

    const contactBtn = document.querySelector(SELECTORS.contactBtn);
    const wpPanel = document.querySelector(SELECTORS.wpPanel);

    if (!contactBtn || !wpPanel) {
      console.warn("[WP Widget] No encontré elementos:", {
        contactBtn: !!contactBtn,
        wpPanel: !!wpPanel
      });
      return;
    }

    console.log("💬 Scholaris WhatsApp Widget Ready");

    // Estado inicial (oculto pero animable)
    gsap.set(wpPanel, {
      autoAlpha: 0,
      x: 40,
      scale: 0.96,
      pointerEvents: "none"
    });

    const tlWp = gsap.timeline({
      paused: true,
      defaults: { ease: "power3.out" },
      onReverseComplete: () => gsap.set(wpPanel, { pointerEvents: "none" })
    });

    tlWp.to(wpPanel, {
      autoAlpha: 1,
      x: 0,
      scale: 1,
      duration: 0.45,
      pointerEvents: "auto"
    });

    let isOpen = false;

    function openPanel() {
      tlWp.play();
      isOpen = true;
    }

    function closePanel() {
      tlWp.reverse();
      isOpen = false;
    }

    function togglePanel() {
      isOpen ? closePanel() : openPanel();
    }

    // Click botón flotante
    contactBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation(); // evita que el listener global lo cierre en el mismo click
      togglePanel();
    });

    // Cerrar al hacer click fuera
    document.addEventListener('click', (e) => {
      if (!isOpen) return;
      if (!wpPanel.contains(e.target) && !contactBtn.contains(e.target)) closePanel();
    });

    // Cerrar con ESC
    document.addEventListener('keyup', (e) => {
      if (e.key === "Escape" && isOpen) closePanel();
    });
  }

  // DOM ready “universal”
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWhatsappWidget);
  } else {
    initWhatsappWidget();
  }
})();
