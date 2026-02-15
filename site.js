/* ============================================================
   Blind Dragon Studios – Site Interactions
   ============================================================ */

(() => {
  'use strict';

  /* ─── Mobile nav toggle ─── */
  const navToggle = document.querySelector('[data-nav-toggle]');

  const closeNav = () => {
    document.body.dataset.navOpen = 'false';
    if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
  };

  const openNav = () => {
    document.body.dataset.navOpen = 'true';
    if (navToggle) navToggle.setAttribute('aria-expanded', 'true');
  };

  const isNavOpen = () => document.body.dataset.navOpen === 'true';

  closeNav();

  if (navToggle) {
    navToggle.addEventListener('click', () => {
      if (isNavOpen()) closeNav();
      else openNav();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeNav();
      closePopup();
    }
  });

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    const isLink = target.closest('.nav-links a');
    if (isLink) closeNav();

    const clickedToggle = target.closest('[data-nav-toggle]');
    const clickedMenu = target.closest('.nav-links');
    if (!clickedToggle && !clickedMenu && isNavOpen()) closeNav();
  });

  /* ─── Navbar scroll effect ─── */
  const nav = document.querySelector('.site-nav');
  let lastScrollY = 0;

  const handleNavScroll = () => {
    const y = window.scrollY;
    if (nav) {
      if (y > 60) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    }
    lastScrollY = y;
  };

  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll();

  /* ─── Scroll Reveal (IntersectionObserver) ─── */
  const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');

  if ('IntersectionObserver' in window && revealElements.length) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    revealElements.forEach((el) => revealObserver.observe(el));
  } else {
    // Fallback: show everything immediately
    revealElements.forEach((el) => el.classList.add('revealed'));
  }

  /* ─── Discord popup ─── */
  const POPUP_KEY = 'bds_popup_dismissed';
  const POPUP_COOLDOWN = 3 * 24 * 60 * 60 * 1000; // 3 days in ms

  const popup = document.getElementById('discord-popup');

  const shouldShowPopup = () => {
    const dismissed = localStorage.getItem(POPUP_KEY);
    if (!dismissed) return true;
    const elapsed = Date.now() - parseInt(dismissed, 10);
    return elapsed > POPUP_COOLDOWN;
  };

  const openPopup = () => {
    if (popup) {
      popup.classList.add('active');
      document.body.style.overflow = 'hidden';
      // Focus first interactive element inside popup
      const firstBtn = popup.querySelector('a.btn, button');
      if (firstBtn) firstBtn.focus();
    }
  };

  const closePopup = () => {
    if (popup) {
      popup.classList.remove('active');
      document.body.style.overflow = '';
    }
  };

  const dismissPopup = () => {
    localStorage.setItem(POPUP_KEY, Date.now().toString());
    closePopup();
  };

  // Show popup after a 4-second delay on first visit
  if (popup && shouldShowPopup()) {
    setTimeout(() => {
      openPopup();
    }, 4000);
  }

  // Close buttons inside popup
  document.querySelectorAll('[data-popup-close]').forEach((btn) => {
    btn.addEventListener('click', dismissPopup);
  });

  // Close popup on overlay click (but not modal click)
  if (popup) {
    popup.addEventListener('click', (e) => {
      if (e.target === popup) dismissPopup();
    });
  }

  /* ─── Smooth parallax for hero art on mouse move ─── */
  const heroArt = document.querySelector('.hero-art');
  const heroSection = document.querySelector('.hero');

  if (heroArt && heroSection) {
    const matchesReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!matchesReducedMotion) {
      heroSection.addEventListener('mousemove', (e) => {
        const rect = heroSection.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;

        requestAnimationFrame(() => {
          heroArt.style.transform = `perspective(800px) rotateY(${x * 3}deg) rotateX(${-y * 3}deg)`;
        });
      });

      heroSection.addEventListener('mouseleave', () => {
        requestAnimationFrame(() => {
          heroArt.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg)';
          heroArt.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
          setTimeout(() => {
            heroArt.style.transition = '';
          }, 600);
        });
      });
    }
  }

  /* ─── Tilt effect on cards (subtle) ─── */
  const interactiveCards = document.querySelectorAll('.card, .value-card, .project-card');
  const matchesReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!matchesReducedMotion) {
    interactiveCards.forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;

        requestAnimationFrame(() => {
          card.style.transform = `perspective(600px) rotateY(${x * 4}deg) rotateX(${-y * 4}deg) translateY(-4px)`;
        });
      });

      card.addEventListener('mouseleave', () => {
        requestAnimationFrame(() => {
          card.style.transform = '';
          card.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.4s ease, box-shadow 0.4s ease';
          setTimeout(() => {
            card.style.transition = '';
          }, 500);
        });
      });
    });
  }

  /* ─── Active nav link highlighter (SPA feel) ─── */
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a:not(.btn)').forEach((link) => {
    const href = link.getAttribute('href');
    if (href === currentPage) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });

})();
