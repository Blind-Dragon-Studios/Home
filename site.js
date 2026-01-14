(() => {
  const navToggle = document.querySelector('[data-nav-toggle]');
  if (!navToggle) return;

  const closeNav = () => {
    document.body.dataset.navOpen = 'false';
    navToggle.setAttribute('aria-expanded', 'false');
  };

  const openNav = () => {
    document.body.dataset.navOpen = 'true';
    navToggle.setAttribute('aria-expanded', 'true');
  };

  const isOpen = () => document.body.dataset.navOpen === 'true';

  // Initialize closed
  closeNav();

  navToggle.addEventListener('click', () => {
    if (isOpen()) closeNav();
    else openNav();
  });

  // Close on escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeNav();
  });

  // Close after clicking a nav link (mobile)
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    const isNavLink = target.closest('.nav-links a');
    if (isNavLink) closeNav();

    const clickedToggle = target.closest('[data-nav-toggle]');
    const clickedInsideMenu = target.closest('.nav-links');
    if (!clickedToggle && !clickedInsideMenu && isOpen()) closeNav();
  });
})();
