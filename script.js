/* ============================================
   BLIND DRAGON STUDIOS - SHARED JAVASCRIPT
   Three.js Background, Animations, Navigation
============================================ */

// ============================================
// LENIS SMOOTH SCROLL
// ============================================
let lenis;

function initLenis() {
    lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        mouseMultiplier: 1,
        smoothTouch: false,
        touchMultiplier: 2,
        infinite: false,
    });

    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);
}

// ============================================
// THREE.JS ATMOSPHERIC BACKGROUND
// ============================================
let scene, camera, renderer, particles, particlesMaterial;
let rings = [];
let mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
let time = 0;
let animationId;

function initThreeJS() {
    const canvas = document.getElementById('three-canvas');
    if (!canvas) return;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x050505, 1);

    // Fog for depth
    scene.fog = new THREE.Fog(0x050505, 1, 18);

    // Create particle geometry
    const particlesGeometry = new THREE.BufferGeometry();
    const particleCount = 2000;

    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const goldColor = new THREE.Color(0xD4AF37);
    const whiteColor = new THREE.Color(0xF5F5F0);

    for (let i = 0; i < particleCount; i++) {
        const radius = Math.random() * 12 + 3;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi) - 8;

        const mixRatio = Math.random();
        const particleColor = mixRatio > 0.75 ? goldColor : whiteColor;
        colors[i * 3] = particleColor.r;
        colors[i * 3 + 1] = particleColor.g;
        colors[i * 3 + 2] = particleColor.b;

        sizes[i] = Math.random() * 2.5 + 0.5;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particlesGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Custom shader material
    particlesMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uMouse: { value: new THREE.Vector2(0, 0) },
            uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
            uIntensity: { value: 1.0 }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 color;
            varying vec3 vColor;
            uniform float uTime;
            uniform vec2 uMouse;
            uniform float uPixelRatio;
            uniform float uIntensity;
            
            void main() {
                vColor = color;
                
                vec3 pos = position;
                
                // Simplified floating animation
                pos.y += sin(uTime * 0.3 + position.x * 0.2) * 0.1 * uIntensity;
                pos.x += cos(uTime * 0.2 + position.y * 0.2) * 0.1 * uIntensity;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                
                gl_PointSize = size * uPixelRatio * (200.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            
            void main() {
                float distanceToCenter = length(gl_PointCoord - vec2(0.5));
                float alpha = 1.0 - smoothstep(0.3, 0.5, distanceToCenter);
                alpha *= 0.5;
                
                gl_FragColor = vec4(vColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);

    // Sonar rings (reduced count for performance)
    const ringGeometry = new THREE.RingGeometry(0.5, 0.52, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xD4AF37,
        transparent: true,
        opacity: 0.06,
        side: THREE.DoubleSide
    });

    for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(ringGeometry, ringMaterial.clone());
        ring.position.z = -8 - i * 3;
        ring.scale.set(1 + i * 0.8, 1 + i * 0.8, 1);
        ring.material.opacity = 0.06 - i * 0.015;
        rings.push(ring);
        scene.add(ring);
    }

    camera.position.z = 5;

    // Mouse tracking
    document.addEventListener('mousemove', (e) => {
        mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // Start animation
    animateThreeJS();
}

function animateThreeJS() {
    animationId = requestAnimationFrame(animateThreeJS);

    time += 0.005;

    // Smooth mouse
    mouse.x += (mouse.targetX - mouse.x) * 0.04;
    mouse.y += (mouse.targetY - mouse.y) * 0.04;

    // Update uniforms
    if (particlesMaterial) {
        particlesMaterial.uniforms.uTime.value = time;
        particlesMaterial.uniforms.uMouse.value.set(mouse.x, mouse.y);
    }

    // Rotate particles
    if (particles) {
        particles.rotation.y = time * 0.03;
        particles.rotation.x = Math.sin(time * 0.08) * 0.08;
    }

    // Camera movement
    camera.position.x += (mouse.x * 0.4 - camera.position.x) * 0.015;
    camera.position.y += (mouse.y * 0.25 - camera.position.y) * 0.015;
    camera.lookAt(scene.position);

    // Animate rings (simplified for performance)
    rings.forEach((ring, i) => {
        ring.rotation.z = time * 0.05 * (i % 2 === 0 ? 1 : -1);
    });

    renderer.render(scene, camera);
}

// ============================================
// CUSTOM CURSOR
// ============================================
let cursor, cursorGlow;
let cursorX = 0, cursorY = 0;
let cursorGlowX = 0, cursorGlowY = 0;

function initCursor() {
    cursor = document.querySelector('.cursor');
    cursorGlow = document.querySelector('.cursor-glow');

    if (!cursor) return;

    document.addEventListener('mousemove', (e) => {
        cursorX = e.clientX;
        cursorY = e.clientY;
    });

    updateCursor();

    // Hover effects
    const hoverElements = document.querySelectorAll('a, button, .card, .bento-cell, .nav-link');
    hoverElements.forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });
}

function updateCursor() {
    if (!cursor) return;

    cursor.style.left = cursorX + 'px';
    cursor.style.top = cursorY + 'px';

    cursorGlowX += (cursorX - cursorGlowX) * 0.08;
    cursorGlowY += (cursorY - cursorGlowY) * 0.08;

    if (cursorGlow) {
        cursorGlow.style.left = cursorGlowX + 'px';
        cursorGlow.style.top = cursorGlowY + 'px';
    }

    requestAnimationFrame(updateCursor);
}

// ============================================
// MAGNETIC BUTTONS
// ============================================
function initMagneticButtons() {
    const magneticBtns = document.querySelectorAll('.btn-magnetic');

    magneticBtns.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            gsap.to(btn, {
                x: x * 0.25,
                y: y * 0.25,
                duration: 0.3,
                ease: 'power2.out'
            });
        });

        btn.addEventListener('mouseleave', () => {
            gsap.to(btn, {
                x: 0,
                y: 0,
                duration: 0.5,
                ease: 'elastic.out(1, 0.5)'
            });
        });
    });
}

// ============================================
// PAGE TRANSITIONS
// ============================================
function initPageTransitions() {
    const links = document.querySelectorAll('a[href$=".html"]');
    const transition = document.querySelector('.page-transition');

    if (!transition) return;

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            
            // Skip if it's an external link or same page
            if (href.startsWith('http') || href.startsWith('#')) return;

            e.preventDefault();

            gsap.to(transition, {
                y: 0,
                duration: 0.6,
                ease: 'power4.inOut',
                onComplete: () => {
                    window.location.href = href;
                }
            });
        });
    });

    // Animate out on page load
    gsap.to(transition, {
        y: '-100%',
        duration: 0.6,
        ease: 'power4.inOut',
        delay: 0.1
    });
}

// ============================================
// PRELOADER
// ============================================
function initPreloader(callback) {
    const preloader = document.querySelector('.preloader');
    const preloaderLogo = document.querySelector('.preloader-logo');
    const preloaderText = document.querySelector('.preloader-text');
    const preloaderBarFill = document.querySelector('.preloader-bar-fill');

    if (!preloader) {
        if (callback) callback();
        return;
    }

    const loadingTexts = [
        'Descending...',
        'Awakening...',
        'Unearthing...',
        'Enter...'
    ];

    const tl = gsap.timeline({
        onComplete: () => {
            if (callback) callback();
        }
    });

    tl
        .to(preloaderLogo, { opacity: 1, duration: 0.5 })
        .to(preloaderText, { opacity: 1, duration: 0.4 }, '-=0.2')
        .to(preloaderBarFill, { width: '25%', duration: 0.8, ease: 'power2.inOut' })
        .to(preloaderText, {
            opacity: 0,
            duration: 0.2,
            onComplete: () => { if (preloaderText) preloaderText.textContent = loadingTexts[1]; }
        })
        .to(preloaderText, { opacity: 1, duration: 0.2 })
        .to(preloaderBarFill, { width: '50%', duration: 0.6, ease: 'power2.inOut' })
        .to(preloaderText, {
            opacity: 0,
            duration: 0.2,
            onComplete: () => { if (preloaderText) preloaderText.textContent = loadingTexts[2]; }
        })
        .to(preloaderText, { opacity: 1, duration: 0.2 })
        .to(preloaderBarFill, { width: '80%', duration: 0.5, ease: 'power2.inOut' })
        .to(preloaderText, {
            opacity: 0,
            duration: 0.2,
            onComplete: () => { if (preloaderText) preloaderText.textContent = loadingTexts[3]; }
        })
        .to(preloaderText, { opacity: 1, duration: 0.2 })
        .to(preloaderBarFill, { width: '100%', duration: 0.3, ease: 'power2.inOut' })
        .to([preloaderText, preloaderLogo], { opacity: 0, duration: 0.4 }, '+=0.3')
        .to(preloader, {
            yPercent: -100,
            duration: 1,
            ease: 'power4.inOut'
        })
        .set(preloader, { display: 'none' });
}

// ============================================
// SCROLL ANIMATIONS
// ============================================
function initScrollAnimations() {
    gsap.registerPlugin(ScrollTrigger);

    // Basic reveals
    gsap.utils.toArray('.reveal').forEach(elem => {
        gsap.fromTo(elem,
            { opacity: 0, y: 50 },
            {
                opacity: 1,
                y: 0,
                duration: 1,
                ease: 'power4.out',
                scrollTrigger: {
                    trigger: elem,
                    start: 'top 85%',
                    toggleActions: 'play none none reverse'
                }
            }
        );
    });

    gsap.utils.toArray('.reveal-left').forEach(elem => {
        gsap.fromTo(elem,
            { opacity: 0, x: -50 },
            {
                opacity: 1,
                x: 0,
                duration: 1,
                ease: 'power4.out',
                scrollTrigger: {
                    trigger: elem,
                    start: 'top 85%',
                    toggleActions: 'play none none reverse'
                }
            }
        );
    });

    gsap.utils.toArray('.reveal-right').forEach(elem => {
        gsap.fromTo(elem,
            { opacity: 0, x: 50 },
            {
                opacity: 1,
                x: 0,
                duration: 1,
                ease: 'power4.out',
                scrollTrigger: {
                    trigger: elem,
                    start: 'top 85%',
                    toggleActions: 'play none none reverse'
                }
            }
        );
    });

    gsap.utils.toArray('.reveal-scale').forEach(elem => {
        gsap.fromTo(elem,
            { opacity: 0, scale: 0.95 },
            {
                opacity: 1,
                scale: 1,
                duration: 1,
                ease: 'power4.out',
                scrollTrigger: {
                    trigger: elem,
                    start: 'top 85%',
                    toggleActions: 'play none none reverse'
                }
            }
        );
    });

    gsap.utils.toArray('.reveal-fade').forEach(elem => {
        gsap.fromTo(elem,
            { opacity: 0 },
            {
                opacity: 1,
                duration: 1.2,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: elem,
                    start: 'top 85%',
                    toggleActions: 'play none none reverse'
                }
            }
        );
    });

    // Parallax for headings
    gsap.utils.toArray('.parallax-text').forEach(elem => {
        gsap.to(elem, {
            yPercent: -25,
            ease: 'none',
            scrollTrigger: {
                trigger: elem,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1.5
            }
        });
    });

    // Stagger animations for cards
    const cardGroups = document.querySelectorAll('.cards-stagger');
    cardGroups.forEach(group => {
        const cards = group.querySelectorAll('.card');
        gsap.fromTo(cards,
            { opacity: 0, y: 60 },
            {
                opacity: 1,
                y: 0,
                duration: 0.8,
                stagger: 0.15,
                ease: 'power4.out',
                scrollTrigger: {
                    trigger: group,
                    start: 'top 80%',
                    toggleActions: 'play none none reverse'
                }
            }
        );
    });
}

// ============================================
// HERO ANIMATIONS
// ============================================
function initHeroAnimations() {
    const heroEyebrow = document.querySelector('.hero-eyebrow');
    const heroTitle = document.querySelector('.hero-title');
    const heroBanner = document.querySelector('.hero-banner');
    const heroSubtitle = document.querySelector('.hero-subtitle');
    const heroCta = document.querySelector('.hero-cta');
    const scrollIndicator = document.querySelector('.scroll-indicator');

    const tl = gsap.timeline({ delay: 0.2 });

    if (heroEyebrow) {
        tl.to(heroEyebrow, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' });
    }

    if (heroBanner) {
        tl.to(heroBanner, { opacity: 1, scale: 1, duration: 1.2, ease: 'power4.out' }, '-=0.4');
    }

    if (heroTitle) {
        const spans = heroTitle.querySelectorAll('span');
        if (spans.length) {
            tl.to(spans, { opacity: 1, y: 0, duration: 1, stagger: 0.15, ease: 'power4.out' }, '-=0.8');
        } else {
            tl.to(heroTitle, { opacity: 1, y: 0, duration: 1, ease: 'power4.out' }, '-=0.8');
        }
    }

    if (heroSubtitle) {
        tl.to(heroSubtitle, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.5');
    }

    if (heroCta) {
        tl.to(heroCta, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, '-=0.3');
    }

    if (scrollIndicator) {
        tl.to(scrollIndicator, { opacity: 1, duration: 0.8 }, '-=0.2');

        // Scroll line animation
        gsap.to('.scroll-line', {
            scaleY: 0.5,
            transformOrigin: 'top',
            repeat: -1,
            yoyo: true,
            duration: 1.5,
            ease: 'power2.inOut'
        });
    }

    // Hero parallax on scroll
    if (heroBanner) {
        gsap.to(heroBanner, {
            yPercent: -20,
            scale: 0.95,
            opacity: 0.5,
            ease: 'none',
            scrollTrigger: {
                trigger: '.hero',
                start: 'top top',
                end: 'bottom top',
                scrub: 1
            }
        });
    }

    if (heroTitle) {
        gsap.to(heroTitle, {
            yPercent: -30,
            opacity: 0.3,
            ease: 'none',
            scrollTrigger: {
                trigger: '.hero',
                start: 'top top',
                end: 'bottom top',
                scrub: 1
            }
        });
    }
}

// ============================================
// MOBILE NAVIGATION
// ============================================
function initMobileNav() {
    const toggle = document.querySelector('.nav-toggle');
    const mobileNav = document.querySelector('.nav-mobile');

    if (!toggle || !mobileNav) return;

    toggle.addEventListener('click', () => {
        mobileNav.classList.toggle('active');
        toggle.classList.toggle('active');
    });

    // Close on link click
    const mobileLinks = mobileNav.querySelectorAll('.nav-link');
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileNav.classList.remove('active');
            toggle.classList.remove('active');
        });
    });
}

// ============================================
// WINDOW RESIZE
// ============================================
function initResizeHandler() {
    window.addEventListener('resize', () => {
        if (camera && renderer) {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            if (particlesMaterial) {
                particlesMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
            }
        }

        ScrollTrigger.refresh();
    });
}

// ============================================
// VISIBILITY CHANGE (Performance)
// ============================================
function initVisibilityHandler() {
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            gsap.ticker.sleep();
        } else {
            gsap.ticker.wake();
        }
    });
}

// ============================================
// MAIN INITIALIZATION
// ============================================
function initApp(skipPreloader = false) {
    initLenis();
    initThreeJS();
    initCursor();
    initMobileNav();
    initResizeHandler();
    initVisibilityHandler();

    if (skipPreloader) {
        initScrollAnimations();
        initHeroAnimations();
        initMagneticButtons();
        initPageTransitions();
    } else {
        initPreloader(() => {
            initScrollAnimations();
            initHeroAnimations();
            initMagneticButtons();
            initPageTransitions();
        });
    }
}

// Check if this is the first page load
const isFirstLoad = !sessionStorage.getItem('visited');
if (!isFirstLoad) {
    // Skip preloader on subsequent page loads
    document.addEventListener('DOMContentLoaded', () => initApp(true));
} else {
    sessionStorage.setItem('visited', 'true');
    document.addEventListener('DOMContentLoaded', () => initApp(false));
}
