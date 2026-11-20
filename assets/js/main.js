/* Blind Dragon Studios — site interactions */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- nav ---------- */
  const nav = $('#nav');
  const toggle = $('#nav-toggle');
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open);
  });
  $$('#nav-links a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }));

  // active section highlight
  const links = $$('.nav-links > a[href^="#"]');
  const sectionObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(l => l.classList.toggle('is-active', l.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['featured', 'games', 'itch', 'studio'].forEach(id => { const el = document.getElementById(id); if (el) sectionObs.observe(el); });

  /* ---------- hero carousel ---------- */
  const hero = $('.hero');
  const slides = $$('.hero-slide');
  const panels = $$('.hero-panel');
  const rail = $$('.rail-item');
  let current = 0, timer = null;
  const DURATION = 7000;

  function show(i) {
    current = (i + slides.length) % slides.length;
    slides.forEach((s, n) => s.classList.toggle('is-active', n === current));
    panels.forEach((p, n) => {
      const on = n === current;
      p.classList.toggle('is-active', on);
      p.setAttribute('aria-hidden', String(!on));
      $$('a', p).forEach(a => on ? a.removeAttribute('tabindex') : a.setAttribute('tabindex', '-1'));
    });
    rail.forEach((r, n) => {
      const on = n === current;
      r.classList.toggle('is-active', on);
      r.setAttribute('aria-selected', String(on));
      // restart the progress bar animation
      const bar = $('.bar', r); bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = '';
    });
  }
  function start() { if (reduceMotion) return; stop(); timer = setInterval(() => show(current + 1), DURATION); }
  function stop() { clearInterval(timer); }
  rail.forEach((r, n) => r.addEventListener('click', () => { show(n); start(); }));
  hero.addEventListener('mouseenter', () => { hero.classList.add('is-paused'); stop(); });
  hero.addEventListener('mouseleave', () => { hero.classList.remove('is-paused'); start(); });
  document.addEventListener('keydown', e => {
    if (window.scrollY > window.innerHeight * .6) return;
    if (e.key === 'ArrowRight') { show(current + 1); start(); }
    if (e.key === 'ArrowLeft') { show(current - 1); start(); }
  });
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  show(0); start();

  /* ---------- ember particles ---------- */
  const canvas = $('#embers');
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext('2d');
    let w, h, dpr, parts = [], running = true;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const spawn = (init) => ({
      x: Math.random() * w,
      y: init ? Math.random() * h : h + 10,
      r: Math.random() * 1.8 + .4,
      vy: -(Math.random() * .6 + .25),
      vx: (Math.random() - .5) * .25,
      life: 0,
      max: 260 + Math.random() * 360,
      hue: 18 + Math.random() * 26,
      wob: Math.random() * Math.PI * 2,
    });
    resize();
    const COUNT = Math.round(Math.min(90, w / 16));
    for (let i = 0; i < COUNT; i++) parts.push(spawn(true));
    window.addEventListener('resize', resize);
    new IntersectionObserver(([e]) => { running = e.isIntersecting; if (running) requestAnimationFrame(tick); }).observe(canvas);
    function tick() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.life++; p.wob += .03;
        p.x += p.vx + Math.sin(p.wob) * .25;
        p.y += p.vy;
        const t = p.life / p.max;
        const a = t < .1 ? t * 10 : 1 - (t - .1) / .9;
        if (t >= 1 || p.y < -10) { parts[i] = spawn(false); continue; }
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
        g.addColorStop(0, `hsla(${p.hue},100%,70%,${a * .9})`);
        g.addColorStop(1, `hsla(${p.hue},100%,50%,0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---------- reveal on scroll ---------- */
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); revealObs.unobserve(e.target); } });
  }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => revealObs.observe(el));

  // stagger library cards
  $$('#library .card').forEach((c, i) => c.style.setProperty('--d', `${(i % 3) * .07}s`));

  /* ---------- count-up stats ---------- */
  const countObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target, end = +el.dataset.count;
      countObs.unobserve(el);
      if (reduceMotion) return;
      const t0 = performance.now(), dur = 1400;
      const step = now => {
        const k = Math.min(1, (now - t0) / dur), eased = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(end * eased);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: .6 });
  $$('[data-count]').forEach(el => countObs.observe(el));

  /* ---------- card tilt + glow ---------- */
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fine && !reduceMotion) {
    $$('.card').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', `${x * 100}%`);
        card.style.setProperty('--my', `${y * 100}%`);
        card.style.transform = `perspective(900px) rotateX(${(.5 - y) * 6}deg) rotateY(${(x - .5) * 7}deg) translateY(-4px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  /* ---------- library filters ---------- */
  const cards = $$('#library .card');
  const filters = $$('.filter');
  filters.forEach(f => {
    const key = f.dataset.filter;
    const n = key === 'all' ? cards.length : cards.filter(c => c.dataset.tags.split(' ').includes(key)).length;
    $('.count', f).textContent = n;
    f.addEventListener('click', () => {
      filters.forEach(x => x.setAttribute('aria-pressed', String(x === f)));
      cards.forEach((c, i) => {
        const match = key === 'all' || c.dataset.tags.split(' ').includes(key);
        c.classList.toggle('is-hidden', !match);
        if (match && !reduceMotion) {
          c.animate([{ opacity: 0, transform: 'translateY(14px) scale(.98)' }, { opacity: 1, transform: 'none' }],
            { duration: 450, delay: (i % 6) * 40, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
        }
      });
    });
  });

  /* ---------- dev-update countdown (5th of each month, 18:00 CET) ---------- */
  const cdDate = $('#cd-date');
  const units = { d: $('[data-u="d"]'), h: $('[data-u="h"]'), m: $('[data-u="m"]'), s: $('[data-u="s"]') };
  function nextUpdate(now = new Date()) {
    let t = new Date(now.getFullYear(), now.getMonth(), 5, 18, 0, 0);
    if (now >= t) t = new Date(now.getFullYear(), now.getMonth() + 1, 5, 18, 0, 0);
    return t;
  }
  let target = nextUpdate();
  cdDate.textContent = target.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const pad = n => String(n).padStart(2, '0');
  function tickCd() {
    let diff = target - new Date();
    if (diff <= 0) { target = nextUpdate(); diff = target - new Date(); }
    const s = Math.floor(diff / 1000);
    units.d.textContent = pad(Math.floor(s / 86400));
    units.h.textContent = pad(Math.floor(s % 86400 / 3600));
    units.m.textContent = pad(Math.floor(s % 3600 / 60));
    units.s.textContent = pad(s % 60);
  }
  tickCd(); setInterval(tickCd, 1000);

  $('#year').textContent = new Date().getFullYear();
})();
