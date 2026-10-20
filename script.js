// Ensure reload or fresh visit ALWAYS starts at Home (top 0, 0)
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

// If URL has a hash (like #about), remove it so the browser does not jump down on reload
if (window.location.hash && window.location.hash !== '#home') {
  history.replaceState(null, null, window.location.pathname);
}

const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

let particles = [];
let ambientParticles = [];
let imgLoaded = false;
let introComplete = false;
let startParticleAssembly = false;

const portraitImg = new Image();
portraitImg.src = 'portrait.png';

// DOM elements
const heroCenter = document.getElementById('heroCenter');
const giantTitle = document.getElementById('giantTitle');
const prefixText = document.getElementById('prefixText');
const iLetterWrap = document.getElementById('iLetterWrap');
const iDot = document.getElementById('iDot');
const iBar = document.getElementById('iBar');
const iFloorShadow = document.getElementById('iFloorShadow');
const suffixText = document.getElementById('suffixText');
const mainNavbar = document.getElementById('mainNavbar');
const heroFooter = document.getElementById('heroFooter');
const interactionHint = document.getElementById('interactionHint');

// Mouse tracking
const mouse = {
  x: null,
  y: null,
  radius: 135
};

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if (imgLoaded && startParticleAssembly) {
    createParticles(false);
  }
}
window.addEventListener('resize', resize);
resize();

// Floating Stardust & Cyber Particle beside Abhishek's Portrait
class FloatingAuraParticle {
  constructor(canvasWidth, canvasHeight, side) {
    this.reset(canvasWidth, canvasHeight, side, true);
  }

  reset(width, height, side, initial = false) {
    const portraitW = width * 0.44;
    const portraitLeft = (width - portraitW) / 2;
    const portraitRight = portraitLeft + portraitW;

    // Distribute particles prominently on the left and right flanks beside the portrait
    if (side === 'left') {
      this.x = Math.random() * (portraitLeft + 25);
    } else if (side === 'right') {
      this.x = portraitRight - 25 + Math.random() * (width - portraitRight + 25);
    } else {
      this.x = Math.random() * width;
    }

    this.y = initial ? Math.random() * height : height + 10 + Math.random() * 30;
    this.baseX = this.x;

    // Very very small pinpoint particles (0.4px to 1.2px)
    const r = Math.random();
    if (r > 0.85) {
      this.size = Math.random() * 0.3 + 1.0; // ~1.0 - 1.3px tiny pinpoint spark
    } else if (r > 0.45) {
      this.size = Math.random() * 0.3 + 0.7; // ~0.7 - 1.0px fine micro-dust
    } else {
      this.size = Math.random() * 0.3 + 0.4; // ~0.4 - 0.7px microscopic stardust
    }

    // Gentle upward float speed
    this.speedY = -(Math.random() * 0.38 + 0.12);

    // Subtle sinusoidal floating wave motion
    this.swaySpeed = Math.random() * 0.018 + 0.006;
    this.swayAmp = Math.random() * 18 + 6;
    this.angle = Math.random() * Math.PI * 2;

    // Twinkling pulse
    this.baseAlpha = Math.random() * 0.45 + 0.35;
    this.pulseSpeed = Math.random() * 0.03 + 0.01;
    this.pulsePhase = Math.random() * Math.PI * 2;

    // Luminous cyber palette matching theme
    const colors = [
      '56, 189, 248',   // Electric Cyan #38bdf8
      '147, 197, 253',  // Ice Blue #93c5fd
      '255, 255, 255',  // Starlight White
      '96, 165, 250',   // Sapphire Blue #60a5fa
      '192, 132, 252',  // Soft Violet
      '203, 213, 225'   // Silver slate
    ];
    this.colorRgb = colors[Math.floor(Math.random() * colors.length)];
  }

  update(width, height) {
    this.angle += this.swaySpeed;
    this.pulsePhase += this.pulseSpeed;

    this.y += this.speedY;
    this.x = this.baseX + Math.sin(this.angle) * this.swayAmp;

    // Gentle mouse repulsion/breeze when cursor moves beside him
    if (mouse.x !== null) {
      const dx = this.x - mouse.x;
      const dy = this.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const repelDist = 120;
      if (dist < repelDist && dist > 0) {
        const force = (repelDist - dist) / repelDist;
        this.baseX += (dx / dist) * force * 2.5;
        this.y += (dy / dist) * force * 1.5;
      }
    }

    // Re-spawn seamlessly at the bottom when floating past the top
    if (this.y < -15) {
      this.reset(width, height, this.x < width / 2 ? 'left' : 'right', false);
    }
    if (this.x < -20) this.baseX = width + 5;
    if (this.x > width + 20) this.baseX = -5;
  }

  draw(ctx) {
    const alpha = Math.max(0.12, Math.min(0.9, this.baseAlpha + Math.sin(this.pulsePhase) * 0.25));
    ctx.fillStyle = `rgba(${this.colorRgb}, ${alpha})`;
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }
}

// Rich floating cosmic particles in the space flanking Abhishek
function initAmbientParticles() {
  ambientParticles = [];
  const width = canvas.width || window.innerWidth;
  const height = canvas.height || window.innerHeight;

  // 1. Dense floating field on the LEFT flank beside Abhishek (~360 particles)
  for (let i = 0; i < 360; i++) {
    ambientParticles.push(new FloatingAuraParticle(width, height, 'left'));
  }

  // 2. Dense floating field on the RIGHT flank beside Abhishek (~360 particles)
  for (let i = 0; i < 360; i++) {
    ambientParticles.push(new FloatingAuraParticle(width, height, 'right'));
  }

  // 3. Wide ambient background cosmic field (~180 particles)
  for (let i = 0; i < 180; i++) {
    ambientParticles.push(new FloatingAuraParticle(width, height, 'full'));
  }
}

// Particle Class: Cyber Pixel Mosaic Tile
class PixelParticle {
  constructor(originX, originY, color, size, startScattered = true) {
    this.originX = originX;
    this.originY = originY;

    if (startScattered) {
      // Explode out into random cosmic space on page load
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * Math.max(canvas.width, canvas.height) * 0.95;
      this.x = originX + Math.cos(angle) * dist;
      this.y = originY + Math.sin(angle) * dist;
    } else {
      this.x = originX;
      this.y = originY;
    }

    this.vx = (Math.random() - 0.5) * 6;
    this.vy = (Math.random() - 0.5) * 6;
    this.color = color;
    this.size = size;

    // Smooth spring physics for assembling
    this.ease = 0.055 + Math.random() * 0.035;
    this.friction = 0.86;
  }

  update() {
    // Mouse repulsion
    if (mouse.x !== null) {
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < mouse.radius) {
        const force = (mouse.radius - dist) / mouse.radius;
        const angle = Math.atan2(dy, dx);
        const power = force * 15;
        this.vx -= Math.cos(angle) * power;
        this.vy -= Math.sin(angle) * power;
      }
    }

    // Spring attraction back toward portrait face position
    const homeDx = this.originX - this.x;
    const homeDy = this.originY - this.y;

    this.vx += homeDx * this.ease;
    this.vy += homeDy * this.ease;

    this.vx *= this.friction;
    this.vy *= this.friction;

    this.x += this.vx;
    this.y += this.vy;
  }

  draw() {
    ctx.fillStyle = this.color;
    const renderSize = Math.max(1, this.size - 0.7);
    ctx.fillRect(this.x, this.y, renderSize, renderSize);
  }
}

// Map sampled luminance to Hasibul Hasan's holographic cyber-mosaic palette
function getCyberMosaicColor(r, g, b, alpha, seed) {
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  const norm = luma / 255;
  const a = alpha / 255;

  const hash = Math.sin(seed * 9999.0) * 10000;
  const jitter = hash - Math.floor(hash);

  if (norm < 0.22) {
    const darkLuma = Math.floor(luma * 0.6);
    return `rgba(${10 + darkLuma}, ${14 + darkLuma}, ${24 + darkLuma * 2}, ${a * 0.95})`;
  } else if (norm < 0.48) {
    const baseR = Math.floor(40 + norm * 80 + (jitter - 0.5) * 20);
    const baseG = Math.floor(70 + norm * 100 + (jitter - 0.5) * 20);
    const baseB = Math.floor(140 + norm * 100);
    return `rgba(${baseR}, ${baseG}, ${baseB}, ${a})`;
  } else {
    if (jitter > 0.75) {
      const val = Math.min(255, Math.floor(220 + norm * 35));
      return `rgba(${val}, ${val}, ${val}, ${a})`;
    } else if (jitter > 0.45) {
      const cr = Math.floor(140 + norm * 60);
      const cg = Math.floor(190 + norm * 60);
      const cb = 255;
      return `rgba(${cr}, ${cg}, ${cb}, ${a})`;
    } else if (jitter > 0.2) {
      const lr = Math.floor(175 + norm * 70);
      const lg = Math.floor(180 + norm * 60);
      const lb = 255;
      return `rgba(${lr}, ${lg}, ${lb}, ${a})`;
    } else {
      const pr = Math.floor(200 + norm * 50);
      const pg = Math.floor(215 + norm * 40);
      const pb = Math.floor(240 + norm * 15);
      return `rgba(${pr}, ${pg}, ${pb}, ${a})`;
    }
  }
}

// Generate Particles from User's Portrait
function createParticles(assembleAnimation = true) {
  particles = [];

  const offscreen = document.createElement('canvas');
  const offCtx = offscreen.getContext('2d');

  // Portrait sizing: ensure face on mobile has the exact same prominent scale and crisp sharpness as desktop
  const isMobile = window.innerWidth <= 768;
  const aspect = (portraitImg.width && portraitImg.height) ? (portraitImg.width / portraitImg.height) : 0.45;
  const targetHeight = isMobile
    ? Math.max(canvas.height * 1.22, 980)
    : Math.min(canvas.height * 1.16, 960);
  const targetWidth = targetHeight * aspect;

  offscreen.width = targetWidth;
  offscreen.height = targetHeight;
  offCtx.drawImage(portraitImg, 0, 0, targetWidth, targetHeight);

  const imgData = offCtx.getImageData(0, 0, targetWidth, targetHeight).data;

  // Align exactly in the middle horizontally, with face centered vertically
  const startX = (canvas.width - targetWidth) / 2;
  const startY = isMobile ? 42 : 52;

  // Crisp fine particles on mobile so facial features (eyes, smile, contours) are razor sharp like desktop
  const step = isMobile ? 3.6 : 4.2;
  const pixelSize = step;

  let seed = 0;
  for (let y = 0; y < targetHeight; y += step) {
    for (let x = 0; x < targetWidth; x += step) {
      seed++;
      const sampleX = Math.min(targetWidth - 1, Math.floor(x));
      const sampleY = Math.min(targetHeight - 1, Math.floor(y));
      const idx = (sampleY * Math.floor(targetWidth) + sampleX) * 4;

      const r = imgData[idx];
      const g = imgData[idx + 1];
      const b = imgData[idx + 2];
      const a = imgData[idx + 3];

      if (a > 45) {
        const color = getCyberMosaicColor(r, g, b, a, seed);
        particles.push(
          new PixelParticle(
            startX + x,
            startY + y,
            color,
            pixelSize,
            assembleAnimation
          )
        );
      }
    }
  }
}

// Mouse movement
window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

window.addEventListener('mouseleave', () => {
  mouse.x = null;
  mouse.y = null;
});

// Click shockwave
window.addEventListener('click', (e) => {
  if (!startParticleAssembly) return;
  const clickX = e.clientX;
  const clickY = e.clientY;
  const blastRadius = 250;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const dx = clickX - p.x;
    const dy = clickY - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < blastRadius) {
      const angle = Math.atan2(dy, dx);
      const force = (blastRadius - dist) / blastRadius;
      p.vx -= Math.cos(angle) * force * 35;
      p.vy -= Math.sin(angle) * force * 35;
    }
  }

  // Also push ambient floating particles on click
  for (let i = 0; i < ambientParticles.length; i++) {
    const ap = ambientParticles[i];
    const dx = clickX - ap.x;
    const dy = clickY - ap.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < blastRadius && dist > 0) {
      const force = (blastRadius - dist) / blastRadius;
      ap.baseX += (dx / dist) * force * 18;
      ap.y += (dy / dist) * force * 12;
    }
  }
});

// Render Loop
function animate() {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 1. Floating particles beside Abhishek and across cosmic space
  for (let i = 0; i < ambientParticles.length; i++) {
    ambientParticles[i].update(canvas.width, canvas.height);
    ambientParticles[i].draw(ctx);
  }

  // 2. Draw portrait pixels if assembly has triggered (portrait unchanged)
  if (startParticleAssembly) {
    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();
    }
  }

  requestAnimationFrame(animate);
}

// =========================================
// SCRAMBLE / MORPH REVEAL UTILITY
// =========================================
function scrambleReveal(element, targetWord, duration, onComplete) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    const settledCount = Math.floor(progress * targetWord.length);

    let output = '';
    for (let i = 0; i < targetWord.length; i++) {
      if (i < settledCount) {
        output += targetWord[i];
      } else {
        output += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    element.textContent = output;

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      element.textContent = targetWord;
      if (onComplete) onComplete();
    }
  }
  requestAnimationFrame(step);
}

function morphText(fromText, toText, duration, onComplete) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const maxLen = Math.max(fromText.length, toText.length);
  const startTime = performance.now();

  function updateScramble(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(1, elapsed / duration);
    const settledCount = Math.floor(progress * toText.length);

    let result = '';
    for (let i = 0; i < maxLen; i++) {
      if (i < settledCount) {
        result += toText[i];
      } else if (i < toText.length) {
        result += chars[Math.floor(Math.random() * chars.length)];
      } else {
        if (progress < 0.6) {
          result += fromText[i] || '';
        }
      }
    }

    giantTitle.textContent = result;

    if (progress < 1) {
      requestAnimationFrame(updateScramble);
    } else {
      giantTitle.textContent = toText;
      if (onComplete) onComplete();
    }
  }

  requestAnimationFrame(updateScramble);
}

// =========================================
// ENTRY ANIMATION TIMELINE:
// 1. "i" falls first, bounces & stays FIXED
// 2. "ABH" scramble-animates on the left of "i"
// 3. "SHEK" scramble-animates on the right of "i"
// 4. Dwell time so visitors can clearly read "ABHISHEK"
// 5. "ABHISHEK" scramble-morphs into "PORTFOLIO"
// =========================================
let entryTimeouts = [];
function setEntryTimeout(fn, ms) {
  const t = setTimeout(fn, ms);
  entryTimeouts.push(t);
  return t;
}

function completeIntroInstantly() {
  if (introComplete) return;
  introComplete = true;

  entryTimeouts.forEach(clearTimeout);
  entryTimeouts = [];

  document.documentElement.classList.add('intro-finished');
  document.body.classList.add('intro-finished');

  if (iLetterWrap) {
    iLetterWrap.classList.add('fused');
    iLetterWrap.classList.remove('dock-impact');
  }
  if (prefixText) prefixText.textContent = '';
  if (suffixText) suffixText.textContent = '';
  if (giantTitle) {
    giantTitle.innerHTML = 'PORTFOLIO';
  }
  if (heroCenter) {
    heroCenter.classList.add('in-position');
  }
  if (mainNavbar) {
    mainNavbar.classList.remove('intro-hidden');
    mainNavbar.classList.add('intro-visible');
  }
  if (heroFooter) {
    heroFooter.classList.remove('intro-hidden');
    heroFooter.classList.add('intro-visible');
  }

  startParticleAssembly = true;
  createParticles(true);
}

// Intentional swipe or wheel scroll finishes intro so visitor is never locked
window.addEventListener('wheel', () => {
  if (!introComplete) completeIntroInstantly();
}, { passive: true, once: true });

let introTouchStartY = null;
window.addEventListener('touchstart', (e) => {
  if (e.touches && e.touches[0]) {
    introTouchStartY = e.touches[0].clientY;
  }
}, { passive: true });

window.addEventListener('touchmove', (e) => {
  if (!introComplete && introTouchStartY !== null && e.touches && e.touches[0]) {
    const diff = Math.abs(e.touches[0].clientY - introTouchStartY);
    if (diff > 50) {
      completeIntroInstantly();
    }
  }
}, { passive: true });

function runEntrySequence() {
  // Step 1: The DOT (ball) falls from the top with gravity, bounces on the floor, and settles (150ms)
  setEntryTimeout(() => {
    iDot.classList.add('drop-bounce');
    iFloorShadow.classList.add('active-shadow');
  }, 150);

  // Step 2: ONLY AFTER the ball has fallen and settled, the body BAR falls from the top, lands and spring-bounces (1150ms)
  setEntryTimeout(() => {
    iBar.classList.add('drop-bounce');
    iFloorShadow.classList.remove('active-shadow');
    void iFloorShadow.offsetWidth;
    iFloorShadow.classList.add('bar-shadow');
  }, 1150);

  // Step 3: Once both the ball and bar of "i" have fully landed and settled, "ABH" on the left scramble-morphs in (2200ms, duration: 850ms)
  setEntryTimeout(() => {
    scrambleReveal(prefixText, 'ABH', 850, () => {
      // Step 4: "SHEK" on the right scramble-morphs in gracefully (duration: 900ms)
      setEntryTimeout(() => {
        scrambleReveal(suffixText, 'SHEK', 900, () => {
          // Step 5: Both sides assembled! Fuse "i" cleanly into uppercase "I"
          setEntryTimeout(() => {
            iLetterWrap.classList.add('dock-impact');
            iLetterWrap.classList.add('fused');
            setEntryTimeout(() => {
              iLetterWrap.classList.remove('dock-impact');
            }, 300);

            // DWELL TIME: 1.8 full seconds so visitors can read "ABHISHEK" clearly!
            setEntryTimeout(() => {
              giantTitle.innerHTML = 'ABHISHEK';
              morphText('ABHISHEK', 'PORTFOLIO', 900, () => {
                // Step 7: "PORTFOLIO" glides smoothly down to bottom position
                setEntryTimeout(() => {
                  heroCenter.classList.add('in-position');

                  // Step 8: Reveal navbar, footer, and trigger cosmic particle assembly
                  setEntryTimeout(() => {
                    mainNavbar.classList.remove('intro-hidden');
                    mainNavbar.classList.add('intro-visible');

                    heroFooter.classList.remove('intro-hidden');
                    heroFooter.classList.add('intro-visible');

                    introComplete = true;
                    document.documentElement.classList.add('intro-finished');
                    document.body.classList.add('intro-finished');

                    // Thousands of pixels rush in from outer space to assemble Abhishek's portrait!
                    startParticleAssembly = true;
                    createParticles(true);
                  }, 500);
                }, 200);
              });
            }, 1800); // 1800ms comfortable reading pause for ABHISHEK
          }, 200);
        });
      }, 150);
    });
  }, 2200);
}

// Handle both fresh load and cached load reliably
function initApp() {
  initAmbientParticles();
  animate();
  runEntrySequence();
  initNavObserver();
  initMobileMenu();
  initAsciiGlitchRipple();
  initSolarSystem();
  initBooksShowcase();
  initWaveGridBackground();
  initSocialFlipButton();
  initBreakoutGame();
  initScrollReveal();
}

// Update active navbar link on scroll
function initNavObserver() {
  const sections = document.querySelectorAll('main[id], section[id]');
  const navLinks = document.querySelectorAll('.nav-link');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

  window.addEventListener('scroll', () => {
    let current = '';
    const scrollPos = window.pageYOffset + 250;

    sections.forEach((section) => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      if (scrollPos >= top && scrollPos < top + height) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach((link) => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });

    mobileNavLinks.forEach((link) => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  }, { passive: true });
}

// Mobile Hamburger Navigation Drawer
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobileMenuToggle');
  const drawer = document.getElementById('mobileNavDrawer');
  const closeBtn = document.getElementById('mobileDrawerClose');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link');

  if (!toggleBtn || !drawer) return;

  function toggleMenu(forceOpen) {
    const shouldOpen = forceOpen !== undefined ? forceOpen : !drawer.classList.contains('active');
    if (shouldOpen) {
      drawer.classList.add('active');
      toggleBtn.classList.add('active');
      drawer.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    } else {
      drawer.classList.remove('active');
      toggleBtn.classList.remove('active');
      drawer.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  let lastTap = 0;
  function onTogglePress(e) {
    if (e) {
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
    }
    const now = Date.now();
    if (now - lastTap < 280) return;
    lastTap = now;
    toggleMenu();
  }

  // Support both tap/touchend and click for immediate mobile response
  toggleBtn.addEventListener('touchend', onTogglePress, { passive: false });
  toggleBtn.addEventListener('click', onTogglePress);

  if (closeBtn) {
    const onClosePress = (e) => {
      if (e) {
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
      }
      toggleMenu(false);
    };
    closeBtn.addEventListener('touchend', onClosePress, { passive: false });
    closeBtn.addEventListener('click', onClosePress);
  }

  mobileLinks.forEach((link) => {
    const handleLinkClick = (e) => {
      toggleMenu(false);
      const targetId = link.getAttribute('href');
      if (targetId && targetId.startsWith('#')) {
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          if (e && e.cancelable) e.preventDefault();
          targetEl.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };
    link.addEventListener('click', handleLinkClick);
  });

  drawer.addEventListener('click', (e) => {
    if (e.target === drawer) {
      toggleMenu(false);
    }
  });
}

/* =========================================
   MILLION DOLLAR SCROLL REVEAL ENGINE
   High-performance IntersectionObserver with GPU acceleration,
   scroll progress bar, and interactive scroll prompt
   ========================================= */
function initScrollReveal() {
  const revealElements = document.querySelectorAll('[data-reveal]');
  const progressLine = document.getElementById('scrollProgressLine');

  // Scroll event for glowing Navbar Progress Bar
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;

        if (progressLine && scrollHeight > 0) {
          const pct = Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100));
          progressLine.style.width = `${pct}%`;
        }

        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  if (!revealElements.length) return;

  // Modern IntersectionObserver with comfortable entry margins
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -8% 0px',
    threshold: 0.05
  };

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        el.classList.add('is-revealed');
        observer.unobserve(el);

        // Clean up will-change after transition finishes
        setTimeout(() => {
          el.classList.add('reveal-done');
        }, 1300);
      }
    });
  }, observerOptions);

  revealElements.forEach((el) => {
    const rect = el.getBoundingClientRect();
    // If already in visible viewport upon load/reload, reveal immediately
    if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
      el.classList.add('is-revealed');
      setTimeout(() => el.classList.add('reveal-done'), 1300);
    } else {
      revealObserver.observe(el);
    }
  });
}

/* =========================================
   ASCII GLITCH RIPPLE (Vengeance UI Port)
   Dynamic visual line grouping:
   ONLY the exact single visual line under the cursor animates!
   ========================================= */
function initAsciiGlitchRipple() {
  const container = document.getElementById('bioText');
  if (!container) return;

  // Gentle, cinematic timing constants
  const WAVE_THRESH = 4;
  const CHAR_MULT = 2;
  const ANIM_STEP = 80;
  const WAVE_BUF = 4;
  const dur = 2400; // Calm and smooth ripple pace
  // Proportional-safe cyber characters (avoids double-width Unicode blocks that push layout)
  const chars = '.,·-~+:;=*!?&#$@0123456789|/\\<>[]{}^%_';
  const preserveSpaces = true;
  const spread = 1.8;

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Preserve original source HTML template
  const originalHtml = container.innerHTML;

  function buildVisualLines() {
    // Reset container style for true measurement
    container.style.height = '';
    container.style.minHeight = '';

    // 1. Break into word and whitespace tokens, tracking highlight status
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = originalHtml;

    const tokens = [];
    function extract(node, isHighlight) {
      if (node.nodeType === Node.TEXT_NODE) {
        const parts = node.textContent.split(/(\s+)/);
        parts.forEach((p) => {
          if (p.length > 0) {
            tokens.push({ text: p, isSpace: /^\s+$/.test(p), isHighlight });
          }
        });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const h = isHighlight || node.classList.contains('highlight');
        node.childNodes.forEach((child) => extract(child, h));
      }
    }
    tempDiv.childNodes.forEach((child) => extract(child, false));

    // 2. Render measurable spans to read rendered line wrapping on this specific screen
    container.innerHTML = '';
    const spanRefs = [];
    tokens.forEach((tok) => {
      const span = document.createElement('span');
      span.textContent = tok.text;
      span.style.display = 'inline';
      if (tok.isHighlight) span.className = 'highlight';
      container.appendChild(span);
      spanRefs.push({ span, tok });
    });

    // 3. Group words into lines by measuring their bounding top
    const lines = [];
    let currentLine = [];
    let currentTop = null;

    spanRefs.forEach(({ span, tok }) => {
      if (tok.isSpace) {
        if (currentLine.length > 0) currentLine.push(tok);
        return;
      }

      const rect = span.getBoundingClientRect();
      const top = Math.round(rect.top);

      if (currentTop === null || Math.abs(top - currentTop) > 6) {
        if (currentLine.length > 0) lines.push(currentLine);
        currentLine = [tok];
        currentTop = top;
      } else {
        currentLine.push(tok);
      }
    });

    if (currentLine.length > 0) lines.push(currentLine);

    // 4. Reconstruct DOM with strictly ONE container per physical visual line
    container.innerHTML = '';
    lines.forEach((lineTokens) => {
      const lineDiv = document.createElement('div');
      lineDiv.className = 'bio-line ascii-line';

      let html = '';
      let inHighlight = false;
      lineTokens.forEach((tok) => {
        if (tok.isHighlight && !inHighlight) {
          html += '<span class="highlight">';
          inHighlight = true;
        } else if (!tok.isHighlight && inHighlight) {
          html += '</span>';
          inHighlight = false;
        }
        html += escapeHtml(tok.text);
      });
      if (inHighlight) html += '</span>';

      lineDiv.innerHTML = html.trim();
      container.appendChild(lineDiv);
      setupLineRipple(lineDiv);
    });

    // 5. Freeze container height to prevent any layout shift during animation
    const measuredHeight = container.getBoundingClientRect().height;
    if (measuredHeight > 0) {
      container.style.height = `${Math.ceil(measuredHeight)}px`;
      container.style.minHeight = `${Math.ceil(measuredHeight)}px`;
    }
  }

  function setupLineRipple(el) {
    const origLineHtml = el.innerHTML;
    const charData = [];

    el.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const txt = node.textContent;
        for (let i = 0; i < txt.length; i++) {
          charData.push({ char: txt[i], isHighlight: false });
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const isHighlight = node.classList.contains('highlight');
        const txt = node.textContent;
        for (let i = 0; i < txt.length; i++) {
          charData.push({ char: txt[i], isHighlight: isHighlight });
        }
      }
    });

    const totalLen = charData.length;
    if (totalLen === 0) return;

    let isAnim = false;
    let cursorPos = 0;
    let waves = [];
    let animId = null;
    let isHover = false;
    let lastWaveTime = 0;

    function getCursorPos(e) {
      if (document.caretRangeFromPoint) {
        try {
          const range = document.caretRangeFromPoint(e.clientX, e.clientY);
          if (range && el.contains(range.startContainer)) {
            let offset = range.startOffset;
            let node = range.startContainer;
            let count = 0;
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
            let found = false;
            while (walker.nextNode()) {
              if (walker.currentNode === node) {
                cursorPos = Math.max(0, Math.min(count + offset, totalLen - 1));
                found = true;
                break;
              }
              count += walker.currentNode.textContent.length;
            }
            if (found) return cursorPos;
          }
        } catch (err) {}
      }

      const rect = el.getBoundingClientRect();
      const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      cursorPos = Math.max(0, Math.min(Math.floor(relX * totalLen), totalLen - 1));
      return cursorPos;
    }

    function calcWaveEffect(charIdx, t) {
      let shouldAnim = false;
      let resultChar = charData[charIdx].char;

      for (let i = 0; i < waves.length; i++) {
        const w = waves[i];
        const age = t - w.startTime;
        const prog = Math.min(age / dur, 1);
        const dist = Math.abs(charIdx - w.startPos);
        const maxDist = Math.max(w.startPos, totalLen - w.startPos - 1);
        const rad = (prog * (maxDist + WAVE_BUF)) / spread;

        if (dist <= rad) {
          shouldAnim = true;
          const intens = Math.max(0, rad - dist);

          if (intens <= WAVE_THRESH && intens > 0) {
            const index = (dist * CHAR_MULT + Math.floor(age / ANIM_STEP)) % chars.length;
            resultChar = chars[index];
          }
        }
      }

      return { shouldAnim, char: resultChar };
    }

    function genScrambledHtml(t) {
      let html = '';
      let inHighlight = false;

      for (let i = 0; i < totalLen; i++) {
        const item = charData[i];
        let ch = item.char;

        if (preserveSpaces && ch === ' ') {
          // Keep spaces untouched
        } else {
          const res = calcWaveEffect(i, t);
          if (res.shouldAnim) {
            ch = res.char;
          }
        }

        if (item.isHighlight && !inHighlight) {
          html += '<span class="highlight">';
          inHighlight = true;
        } else if (!item.isHighlight && inHighlight) {
          html += '</span>';
          inHighlight = false;
        }

        if (ch === '&') html += '&amp;';
        else if (ch === '<') html += '&lt;';
        else if (ch === '>') html += '&gt;';
        else if (ch === '"') html += '&quot;';
        else html += ch;
      }

      if (inHighlight) {
        html += '</span>';
      }

      return html;
    }

    function stop() {
      el.innerHTML = origLineHtml;
      el.classList.remove('as');
      isAnim = false;
      waves = [];
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    }

    function start() {
      if (isAnim) return;
      isAnim = true;
      el.classList.add('as');

      function animateWave() {
        const t = Date.now();
        waves = waves.filter((w) => t - w.startTime < dur);

        if (waves.length === 0) {
          stop();
          return;
        }

        el.innerHTML = genScrambledHtml(t);
        animId = requestAnimationFrame(animateWave);
      }

      animId = requestAnimationFrame(animateWave);
    }

    function startWave(pos) {
      const startPos = (typeof pos === 'number') ? pos : cursorPos;
      waves.push({
        startPos: startPos,
        startTime: Date.now(),
        id: Math.random()
      });
      lastWaveTime = Date.now();

      if (!isAnim) start();
    }

    // ONLY this exact single visual line triggers on hover
    el.addEventListener('mouseenter', (e) => {
      isHover = true;
      const pos = getCursorPos(e);
      startWave(pos);
    });

    el.addEventListener('mousemove', (e) => {
      if (!isHover) return;
      const oldPos = cursorPos;
      const pos = getCursorPos(e);
      const now = Date.now();
      if (now - lastWaveTime > 600 && Math.abs(pos - oldPos) >= 5) {
        startWave(pos);
      }
    });

    el.addEventListener('mouseleave', () => {
      isHover = false;
    });

    el.addEventListener('click', (e) => {
      const pos = getCursorPos(e);
      startWave(pos);
    });
  }

  buildVisualLines();

  // Re-calculate lines if user resizes window (debounced)
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      buildVisualLines();
    }, 250);
  });
}

/* =========================================
   SOLAR SYSTEM (VENGEANCE UI 3D ORBIT)
   Interactive 3D Technology Ecosystem Animation
   ========================================= */
function initSolarSystem() {
  const viewport = document.getElementById('solarViewport');
  const stage = document.getElementById('solarStage');
  const title = document.getElementById('staggeredTitle');

  // 1. Entrance for Section Title
  if (title && typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    gsap.from(title, {
      scrollTrigger: {
        trigger: '#skills',
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
      duration: 0.9,
      y: 25,
      opacity: 0,
      ease: 'power3.out',
    });
  }

  if (!viewport || !stage) return;

  // 2. Pause Orbit on Planet Hover
  const planetPills = viewport.querySelectorAll('.planet-pill');
  planetPills.forEach((pill) => {
    pill.addEventListener('mouseenter', () => {
      viewport.classList.add('is-paused');
    });
    pill.addEventListener('mouseleave', () => {
      viewport.classList.remove('is-paused');
    });
  });

  // 3. 3D Interactive Mouse & Touch Drag / Tilt
  const BASE_TILT_X = 66;
  const BASE_TILT_Z = -14;
  let currentTiltX = BASE_TILT_X;
  let currentTiltZ = BASE_TILT_Z;
  let targetTiltX = BASE_TILT_X;
  let targetTiltZ = BASE_TILT_Z;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let dragStartTiltX = BASE_TILT_X;
  let dragStartTiltZ = BASE_TILT_Z;
  let rafId = null;

  function updateTilt() {
    currentTiltX += (targetTiltX - currentTiltX) * 0.08;
    currentTiltZ += (targetTiltZ - currentTiltZ) * 0.08;
    stage.style.setProperty('--tilt-x', `${currentTiltX.toFixed(2)}deg`);
    stage.style.setProperty('--tilt-z', `${currentTiltZ.toFixed(2)}deg`);

    if (Math.abs(targetTiltX - currentTiltX) > 0.01 || Math.abs(targetTiltZ - currentTiltZ) > 0.01) {
      rafId = requestAnimationFrame(updateTilt);
    } else {
      rafId = null;
    }
  }

  function scheduleUpdate() {
    if (!rafId) {
      rafId = requestAnimationFrame(updateTilt);
    }
  }

  // Mouse Move subtle parallax tilt when hovering
  viewport.addEventListener('mousemove', (e) => {
    if (isDragging) return;
    const rect = viewport.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const ny = (e.clientY - rect.top) / rect.height - 0.5;

    targetTiltX = BASE_TILT_X - ny * 18;
    targetTiltZ = BASE_TILT_Z + nx * 24;
    scheduleUpdate();
  });

  viewport.addEventListener('mouseleave', () => {
    if (isDragging) return;
    targetTiltX = BASE_TILT_X;
    targetTiltZ = BASE_TILT_Z;
    scheduleUpdate();
  });

  // Pointer drag to dynamically rotate 3D angle
  viewport.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.planet-pill')) return;
    if (e.pointerType === 'touch') return; // Allow natural finger scrolling on touch devices
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    dragStartTiltX = targetTiltX;
    dragStartTiltZ = targetTiltZ;
    viewport.setPointerCapture(e.pointerId);
  });

  viewport.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    // Drag vertically tilts X, drag horizontally tilts Z
    targetTiltX = Math.max(35, Math.min(85, dragStartTiltX - dy * 0.22));
    targetTiltZ = dragStartTiltZ + dx * 0.28;
    scheduleUpdate();
  });

  const endDrag = (e) => {
    if (!isDragging) return;
    isDragging = false;
    try {
      viewport.releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);
}

/* =========================================
   PROJECTS: 3D BOOKS SHOWCASE (VENGEANCE UI)
   Three.js 3D Interactive Publication Showcase
   ========================================= */

function initBooksShowcase() {
  if (typeof THREE === 'undefined') {
    console.warn('Three.js not loaded for Books Showcase');
    return;
  }

  const root = document.getElementById('booksShowcase');
  const canvasEl = document.getElementById('booksCanvas');
  const openSlip = document.getElementById('openSlip');
  const closeBtn = document.getElementById('bookDetailClose');
  const detailPanel = document.getElementById('bookDetailPanel');
  const prevBtn = document.getElementById('bookPrevBtn');
  const nextBtn = document.getElementById('bookNextBtn');

  if (!root || !canvasEl) return;

  // Project publication metadata
  const PROJECTS = [
    {
      id: 'screen-tester',
      category: 'UTILITY · MONITOR DIAGNOSTIC',
      title: 'Screen Tester',
      tagline: 'Online Screen & Monitor Test',
      author: 'Abhishek · Full Stack',
      year: '2024',
      stars: 5,
      status: 'Live Production',
      desc: 'A web-based tool that allows users to test their screen for display issues, including dead pixels, color accuracy, refresh rate, brightness, contrast, and ghosting directly in the browser.',
      tech: ['HTML', 'CSS', 'JavaScript'],
      liveUrl: 'https://screen-tester.com',
      repoUrl: 'https://github.com/abhishekpatilavp18-beep',
      image: 'assets/projects/screen-tester.png',
      spineBg: '#0f172a',
      spineInk: '#38bdf8',
      accentColor: '#38bdf8',
      chapters: ['Display Resolution & DPI', 'Dead Pixel Matrix Test', 'Color Uniformity Check', 'Refresh Rate 60/120Hz', 'OLED Ghosting Analysis']
    },
    {
      id: 'keyboard-tester',
      category: 'HARDWARE · INPUT DIAGNOSTIC',
      title: 'Keyboard Tester',
      tagline: 'KeyCheck Interactive Diagnostic',
      author: 'Abhishek · Full Stack',
      year: '2024',
      stars: 5,
      status: 'Live Production',
      desc: 'An interactive web application that helps users test their keyboard keys and verify whether they are functioning correctly in real-time with auditory mechanical thock sound feedback.',
      tech: ['HTML', 'CSS', 'JavaScript'],
      liveUrl: 'https://keyboardtester1.com',
      repoUrl: 'https://github.com/abhishekpatilavp18-beep',
      image: 'assets/projects/keyboard-tester.png',
      spineBg: '#18181b',
      spineInk: '#ffffff',
      accentColor: '#ffffff',
      chapters: ['Full Keyboard Matrix', 'Multi-Key Rollover Test', 'Mechanical Thock Sounds', 'Layout Switching', 'Latency Diagnostics']
    },
    {
      id: 'lumina-scheduler',
      category: 'PRODUCTIVITY · SCHEDULING PLATFORM',
      title: 'Lumina Scheduler',
      tagline: 'Kite Smart Meeting Platform',
      author: 'Abhishek · Full Stack',
      year: '2024',
      stars: 5,
      status: 'Live Production',
      desc: 'A smart meeting scheduling platform that simplifies booking meetings by allowing users to share scheduling links and let guests choose suitable time slots with automated reminders.',
      tech: ['React.js', 'Node.js', 'Express.js', 'MongoDB'],
      liveUrl: 'https://meetingscheduler1.netlify.app',
      repoUrl: 'https://github.com/abhishekpatilavp18-beep',
      image: 'assets/projects/lumina-scheduler.png',
      spineBg: '#1e1b4b',
      spineInk: '#818cf8',
      accentColor: '#818cf8',
      chapters: ['Dynamic Booking Slots', 'Calendar Event Automation', 'MongoDB Timeslot Store', 'Express REST Service', 'Responsive Guest Portal']
    },
    {
      id: 'orca-marine',
      category: 'AI · OCEANIC INTELLIGENCE',
      title: 'ORCA Marine',
      tagline: 'Marine Intelligence Platform',
      author: 'Abhishek · AI & Systems',
      year: 'In Development',
      stars: 5,
      status: 'In Development',
      desc: 'Marine intelligence platform leveraging advanced agentic AI reasoning to synthesize complex meteorological, navigational, and operational marine data into clear, actionable insights.',
      tech: ['Next.js', 'AI Reasoning', 'Python', 'Marine Data'],
      liveUrl: 'https://github.com/abhishekpatilavp18-beep',
      repoUrl: 'https://github.com/abhishekpatilavp18-beep',
      image: 'assets/projects/orca-marine.png',
      spineBg: '#042f2e',
      spineInk: '#2dd4bf',
      accentColor: '#2dd4bf',
      chapters: ['Agentic Weather Reasoning', 'Navigational Route Engine', 'Sonar Telemetry Modeling', 'Vessel Fleet Assistant', 'Marine GIS Mapping']
    }
  ];

  const N = PROJECTS.length;
  const VISIBLE = Math.min(3, N);

  // Springs for 3D physics
  class Spring {
    constructor(v, k = 120, d = 14) {
      this.v = v;
      this.t = v;
      this.vel = 0;
      this.k = k;
      this.d = d;
    }
    set(v) {
      this.v = v;
      this.t = v;
      this.vel = 0;
      return this;
    }
    update(dt) {
      const a = this.k * (this.t - this.v) - this.d * this.vel;
      this.vel += a * dt;
      this.v += this.vel * dt;
      return this.v;
    }
  }

  function mkCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function rr(x, px, py, w, h, r) {
    x.beginPath();
    x.moveTo(px + r, py);
    x.arcTo(px + w, py, px + w, py + h, r);
    x.arcTo(px + w, py + h, px, py + h, r);
    x.arcTo(px, py + h, px, py, r);
    x.arcTo(px, py, px + w, py, r);
    x.closePath();
  }

  function drawSpaced(x, text, cx, y, ls) {
    const prev = x.textAlign;
    x.textAlign = 'left';
    const chars = [...text];
    let tot = 0;
    const ws = chars.map((ch) => {
      const w = x.measureText(ch).width;
      tot += w;
      return w;
    });
    tot += ls * (chars.length - 1);
    let px = cx - tot / 2;
    chars.forEach((ch, i) => {
      x.fillText(ch, px, y);
      px += ws[i] + ls;
    });
    x.textAlign = prev;
  }

  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lowPower = RM || window.matchMedia('(max-width: 900px)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: !lowPower, alpha: true });
  } catch (err) {
    console.warn('WebGL init failed for Books Showcase', err);
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  if (renderer.outputEncoding !== undefined) {
    renderer.outputEncoding = 3001; // sRGBEncoding
  }
  renderer.shadowMap.enabled = !lowPower;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  camera.position.set(0, 0.1, 9.6);

  // Lights
  const hemi = new THREE.HemisphereLight(0x8fa0d8, 0x050814, 0.55);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(3.5, 5, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x38bdf8, 0.35);
  fill.position.set(-4, 1, 4);
  scene.add(fill);

  const bookRoot = new THREE.Group();
  scene.add(bookRoot);

  function tex(c) {
    const t = new THREE.CanvasTexture(c);
    t.generateMipmaps = true;
    return t;
  }

  // Preload project screenshots
  const loadedImages = {};
  PROJECTS.forEach((proj) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = proj.image;
    img.onload = () => {
      loadedImages[proj.id] = img;
      // Repaint front cover with loaded screenshot
      const b = bookInstances.find((item) => item.cfg.id === proj.id);
      if (b && b.mFront) {
        const c = mkCanvas(1024, 1536);
        paintProjectFront(c.getContext('2d'), 1024, 1536, proj, img);
        b.mFront.map = tex(c);
        b.mFront.needsUpdate = true;
      }
    };
  });

  // Front Cover Painter
  function paintProjectFront(ctx, w, h, proj, img) {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0d1322');
    bgGrad.addColorStop(0.4, '#090d18');
    bgGrad.addColorStop(1, '#04060c');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle colored ambient glow
    const radial = ctx.createRadialGradient(w / 2, h * 0.3, 40, w / 2, h * 0.3, w * 0.7);
    radial.addColorStop(0, proj.accentColor + '30');
    radial.addColorStop(1, 'transparent');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, w, h);

    // Eyebrow tag
    ctx.fillStyle = proj.accentColor;
    ctx.font = '700 30px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(proj.category, 65, 105);

    // Main Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 74px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(proj.title, 65, 185);

    // Framed Browser Window
    const winX = 60;
    const winY = 230;
    const winW = w - 120;
    const winH = 760;
    const winR = 24;

    ctx.save();
    ctx.fillStyle = '#111726';
    rr(ctx, winX, winY, winW, winH, winR);
    ctx.fill();
    ctx.restore();

    // Browser header bar
    ctx.fillStyle = '#1a2338';
    ctx.beginPath();
    ctx.moveTo(winX + winR, winY);
    ctx.arcTo(winX + winW, winY, winX + winW, winY + 45, winR);
    ctx.lineTo(winX + winW, winY + 45);
    ctx.lineTo(winX, winY + 45);
    ctx.arcTo(winX, winY, winX + winR, winY, winR);
    ctx.closePath();
    ctx.fill();

    // 3 Dots
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.arc(winX + 24, winY + 22, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath(); ctx.arc(winX + 44, winY + 22, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#10b981';
    ctx.beginPath(); ctx.arc(winX + 64, winY + 22, 6, 0, Math.PI * 2); ctx.fill();

    // URL bar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    rr(ctx, winX + 88, winY + 10, winW - 176, 25, 12);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(proj.liveUrl.replace('https://', ''), winX + winW / 2, winY + 28);
    ctx.textAlign = 'left';

    // Screenshot image
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save();
      rr(ctx, winX, winY + 45, winW, winH - 45, 0);
      ctx.clip();
      ctx.drawImage(img, winX, winY + 45, winW, winH - 45);
      ctx.restore();
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(winX, winY + 45, winW, winH - 45);
      ctx.fillStyle = '#64748b';
      ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Project Preview Loading...', winX + winW / 2, winY + winH / 2);
      ctx.textAlign = 'left';
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 2;
    rr(ctx, winX, winY, winW, winH, winR);
    ctx.stroke();

    // Tagline below screenshot
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 38px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(proj.tagline, 65, 1050);

    // Tech stack badges
    let chipX = 65;
    const chipY = 1085;
    proj.tech.forEach((t) => {
      ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
      const tw = ctx.measureText(t).width;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      rr(ctx, chipX, chipY, tw + 32, 42, 21);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 1.5;
      rr(ctx, chipX, chipY, tw + 32, 42, 21);
      ctx.stroke();
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(t, chipX + 16, chipY + 29);
      chipX += tw + 44;
    });

    // Signature footer
    ctx.fillStyle = '#64748b';
    ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('ABHISHEK PATIL · PORTFOLIO EDITION', 65, 1420);
    ctx.textAlign = 'right';
    ctx.fillStyle = proj.accentColor;
    ctx.fillText(proj.status.toUpperCase(), w - 65, 1420);
    ctx.textAlign = 'left';

    // Book border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, w - 60, h - 60);
  }

  // Spine Painter
  function paintSpine(ctx, w, h, proj) {
    ctx.fillStyle = proj.spineBg;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = proj.spineInk;
    ctx.font = '800 42px "Plus Jakarta Sans", sans-serif';
    drawSpaced(ctx, proj.title.toUpperCase(), -h * 0.12, 14, 5);
    ctx.globalAlpha = 0.85;
    ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
    drawSpaced(ctx, proj.author.toUpperCase(), h * 0.32, 9, 3);
    ctx.globalAlpha = 1;
    ctx.restore();

    ctx.fillStyle = proj.spineInk;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(w / 2 - 25, 80, 50, 3);
    ctx.fillRect(w / 2 - 25, h - 85, 50, 3);
    ctx.globalAlpha = 1;
  }

  // Back Cover Painter
  function paintBack(ctx, w, h, proj) {
    ctx.fillStyle = proj.spineBg;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 48px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(proj.title, 80, 160);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.font = '400 26px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(proj.desc.slice(0, 75) + '...', 80, 230);

    // Barcode block
    ctx.fillStyle = '#ffffff';
    rr(ctx, w - 340, h - 240, 260, 140, 10);
    ctx.fill();
    ctx.fillStyle = '#111827';
    let bx = w - 320;
    while (bx < w - 100) {
      const bw = 2 + Math.random() * 5;
      if (Math.random() > 0.35) ctx.fillRect(bx, h - 220, bw, 80);
      bx += bw + 2 + Math.random() * 4;
    }
    ctx.font = '600 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('9 780123 456789', w - 210, h - 120);
    ctx.textAlign = 'left';
  }

  // Index Page (Inside book when opened)
  function makeIndexPageTex(proj) {
    const w = 1024, h = 1536;
    const c = mkCanvas(w, h);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#f4eedf';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'center';
    ctx.font = '800 76px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('PROJECT INDEX', w / 2, 190);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(200, 225, w - 400, 3);

    ctx.textAlign = 'left';
    ctx.font = '600 42px "Plus Jakarta Sans", sans-serif';
    let y = 330;
    const chapters = proj.chapters || ['Architecture Overview', 'Component Hierarchy', 'API Contracts', 'Deployment Pipeline'];
    chapters.forEach((chap, i) => {
      ctx.fillStyle = '#334155';
      ctx.fillText(`0${i + 1}. ${chap}`, 120, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#64748b';
      ctx.fillText(`p. ${12 + i * 14}`, w - 120, y);
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(120, y + 16, w - 240, 2);
      y += 110;
    });

    return tex(c);
  }

  // Geometry
  const W = 1.42, H = 2.14, T = 0.34, CT = 0.032, OV = 0.05;
  const PAGE_N = 8, BACK_PAGE_N = 4;
  const PW = W - 0.02, PH = H - 0.02;
  const BLOCK_D = 0.245, BLOCK_Z = -0.0205, PIVOT_Z = T / 2 + CT / 2, BPIVOT_Z = -(T / 2 + CT / 2), HINGE_OVERLAP = 0.05;

  const coverGeo = new THREE.BoxGeometry(W + OV, H + OV * 2, CT);
  const blockGeo = new THREE.BoxGeometry(W - 0.015, H, BLOCK_D);
  const pageGeo = new THREE.PlaneGeometry(PW, PH);
  const spineGeo = new THREE.BoxGeometry(0.028, H + OV * 2, T + CT * 2 + 0.006);
  const hitGeo = new THREE.BoxGeometry(1.8, 2.5, 1.15);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });

  function std(o) {
    return new THREE.MeshStandardMaterial(Object.assign({ metalness: 0.02 }, o));
  }

  const paperEdgeMat = std({ color: 0xeae0cc, roughness: 0.85 });
  const pageMats = [0xf5efde, 0xf0e9d6, 0xfaf4e5].map((c) => std({ color: c, roughness: 0.9, side: THREE.DoubleSide }));

  const bookInstances = [];
  const hitMeshes = [];

  PROJECTS.forEach((proj, index) => {
    const rootGrp = new THREE.Group();
    const floatGrp = new THREE.Group();
    rootGrp.add(floatGrp);
    bookRoot.add(rootGrp);

    const indexPageMat = std({ map: makeIndexPageTex(proj), roughness: 0.9, side: THREE.DoubleSide });

    // Front Cover canvas
    const frontCanvas = mkCanvas(1024, 1536);
    paintProjectFront(frontCanvas.getContext('2d'), 1024, 1536, proj, loadedImages[proj.id]);
    const mFront = std({ map: tex(frontCanvas), roughness: 0.45 });

    // Back Cover canvas
    const backCanvas = mkCanvas(1024, 1536);
    paintBack(backCanvas.getContext('2d'), 1024, 1536, proj);
    const mBack = std({ map: tex(backCanvas), roughness: 0.55 });

    // Spine canvas
    const spineCanvas = mkCanvas(220, 1536);
    paintSpine(spineCanvas.getContext('2d'), 220, 1536, proj);
    const mSpine = std({ map: tex(spineCanvas), roughness: 0.65 });

    const mEdge = std({ color: '#2a3447', roughness: 0.6 });

    // Back Pivot
    const backPivot = new THREE.Group();
    backPivot.position.set(-W / 2 - HINGE_OVERLAP, 0, BPIVOT_Z);
    const backMesh = new THREE.Mesh(coverGeo, [mEdge, mEdge, mEdge, mEdge, paperEdgeMat, mBack]);
    backMesh.position.x = (W + OV) / 2;
    backPivot.add(backMesh);
    floatGrp.add(backPivot);

    // Front Pivot
    const pivot = new THREE.Group();
    pivot.position.set(-W / 2 - HINGE_OVERLAP, 0, PIVOT_Z);
    const frontMesh = new THREE.Mesh(coverGeo, [mEdge, mEdge, mEdge, mEdge, mFront, paperEdgeMat]);
    frontMesh.position.x = (W + OV) / 2;
    pivot.add(frontMesh);
    floatGrp.add(pivot);

    // Spine
    const spine = new THREE.Mesh(spineGeo, mSpine);
    spine.position.set(-W / 2 - 0.013, 0, 0);
    floatGrp.add(spine);

    // Paper Block
    const block = new THREE.Mesh(blockGeo, [paperEdgeMat, paperEdgeMat, paperEdgeMat, paperEdgeMat, paperEdgeMat, paperEdgeMat]);
    block.position.set(-0.0075, 0, BLOCK_Z);
    floatGrp.add(block);

    // Pages inside
    const pages = [], pageF = [];
    for (let i = 0; i < PAGE_N; i++) {
      const pp = new THREE.Group();
      pp.position.set(-W / 2 + 0.01, 0, 0.166 - i * 0.005);
      const pm = new THREE.Mesh(pageGeo, i === 0 ? indexPageMat : pageMats[i % 3]);
      pm.position.x = PW / 2;
      pp.add(pm);
      floatGrp.add(pp);
      pages.push(pp);
      pageF.push(0.32 * Math.pow(1 - i / PAGE_N, 2.5));
    }

    // Hit box
    const hit = new THREE.Mesh(hitGeo, hitMat);
    floatGrp.add(hit);

    const springs = {
      px: new Spring(0, 18, 7),
      py: new Spring(0, 18, 7),
      pz: new Spring(0, 18, 7),
      rx: new Spring(0, 18, 7),
      ry: new Spring(0, 18, 7),
      rz: new Spring(0, 18, 7),
      sc: new Spring(1, 18, 7),
      tiltX: new Spring(0, 120, 13),
      tiltY: new Spring(0, 120, 13),
      lift: new Spring(0, 120, 13),
      cover: new Spring(0, 90, 12),
      coverB: new Spring(0, 90, 12),
    };

    const book = {
      cfg: proj,
      index,
      root: rootGrp,
      float: floatGrp,
      pivot,
      backPivot,
      mFront,
      spine,
      block,
      pages,
      pageF,
      hit,
      springs,
      phase: Math.random() * 6.28,
      slotScale: 1,
      scr: { x: 0, y: 0 },
      orbY: 0,
      orbYv: 0,
      orbPhase: 'idle',
      orbTarget: 0,
    };

    bookInstances.push(book);
  });

  const bookByHit = (m) => bookInstances.find((b) => b.hit === m);

  // Layout slots
  const dims = { w: 0, h: 0 };
  const SLOTS = { hero: [], detail: null, portrait: false };

  function computeSlots() {
    const a = dims.w / Math.max(1, dims.h);
    const portrait = a < 0.88;
    SLOTS.portrait = portrait;
    const fit = portrait ? clamp(a / 1.05, 0.45, 0.78) : clamp(a / 1.6, 0.65, 1);
    bookRoot.scale.setScalar(fit);
    bookRoot.position.y = -(1 - fit) * 0.25;

    SLOTS.hero = portrait
      ? [
        { p: [-1.35, -0.45, -0.1], r: [-0.04, 0.38, 0.17], s: 1.25 },
        { p: [0.15, -0.2, 0.65], r: [-0.05, -0.1, -0.03], s: 1.35 },
        { p: [1.6, -0.5, -0.3], r: [-0.04, -0.4, -0.16], s: 1.25 },
      ]
      : [
        { p: [-2.1, -0.45, -0.1], r: [-0.045, 0.4, 0.18], s: 1.25 },
        { p: [0.2, -0.28, 0.65], r: [-0.05, -0.1, -0.035], s: 1.36 },
        { p: [2.35, -0.52, -0.3], r: [-0.045, -0.42, -0.17], s: 1.25 },
      ];

    SLOTS.detail = portrait
      ? { p: [0, 0.45, 0.75], r: [-0.02, -0.4, 0.05], s: 0.85 }
      : { p: [-1.65, 0.0, 0.85], r: [0.02, -0.44, 0.08], s: 1.08 };
  }

  function setTargets(b, slot) {
    const s = b.springs;
    s.px.t = slot.p[0];
    s.py.t = slot.p[1];
    s.pz.t = slot.p[2];
    s.rx.t = slot.r[0];
    s.ry.t = slot.r[1];
    s.rz.t = slot.r[2];
    b.slotScale = slot.s;
  }

  let carouselStart = 0;
  function windowIndices(start, total, count) {
    const arr = [];
    for (let i = 0; i < count; i++) arr.push((start + i) % total);
    return arr;
  }
  let currentWindow = windowIndices(0, N, VISIBLE);
  let carouselBusy = false;

  function rebuildHitMeshes() {
    hitMeshes.length = 0;
    currentWindow.forEach((bi) => hitMeshes.push(bookInstances[bi].hit));
  }

  function applyMode() {
    if (state.mode === 'hero' || state.mode === 'closing') {
      currentWindow.forEach((bi, i) => {
        const slot = SLOTS.hero[i];
        if (slot) setTargets(bookInstances[bi], slot);
      });
    } else if (state.selected) {
      setTargets(state.selected, SLOTS.detail);
    }
  }

  function shiftCarousel(dir) {
    if (carouselBusy || state.mode !== 'hero' || N <= VISIBLE) return;
    if (window.SoundFX) SoundFX.book.slide();
    carouselBusy = true;
    const outgoing = currentWindow;
    carouselStart = (((carouselStart + dir) % N) + N) % N;
    const incoming = windowIndices(carouselStart, N, VISIBLE);

    const toHide = outgoing.filter((bi) => !incoming.includes(bi));
    toHide.forEach((bi) => {
      const oldIdx = outgoing.indexOf(bi);
      const slot = SLOTS.hero[oldIdx];
      const b = bookInstances[bi];
      if (slot) b.springs.px.t = slot.p[0] - dir * 6.5;
    });
    setTimeout(() => {
      toHide.forEach((bi) => { bookInstances[bi].root.visible = false; });
    }, 600);

    incoming.forEach((bi, i) => {
      const slot = SLOTS.hero[i];
      if (!slot) return;
      const b = bookInstances[bi];
      b.root.visible = true;
      if (!outgoing.includes(bi)) {
        b.springs.px.set(slot.p[0] + dir * 6.5);
        b.springs.py.set(slot.p[1]);
        b.springs.pz.set(slot.p[2]);
        b.springs.rx.set(slot.r[0]);
        b.springs.ry.set(slot.r[1]);
        b.springs.rz.set(slot.r[2]);
        b.springs.sc.set(slot.s * 0.9);
      }
      setTargets(b, slot);
    });

    currentWindow = incoming;
    rebuildHitMeshes();
    setTimeout(() => { carouselBusy = false; }, 650);
  }

  if (prevBtn) prevBtn.addEventListener('click', () => shiftCarousel(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => shiftCarousel(1));

  // State
  const state = {
    mode: 'hero',
    selected: null,
    hovered: null,
  };

  const camX = new Spring(0, 14, 7),
    camY = new Spring(0.1, 14, 7),
    camZ = new Spring(9.6, 14, 7);
  const lookX = new Spring(0, 14, 7),
    lookY = new Spring(0, 14, 7);

  function camTo(mode) {
    if (mode === 'detail') {
      camX.t = SLOTS.portrait ? 0 : -0.22;
      camZ.t = SLOTS.portrait ? 10.2 : 9.6;
      lookX.t = SLOTS.portrait ? 0 : -0.32;
      lookY.t = SLOTS.portrait ? 0 : 0.12;
    } else {
      camX.t = 0;
      camZ.t = 9.6;
      lookX.t = 0;
      lookY.t = 0;
    }
  }

  // Populate Detail Panel
  function updateDetailPanel(cfg) {
    if (!cfg) return;
    document.getElementById('detailCategory').textContent = cfg.category;
    document.getElementById('detailTitle').textContent = cfg.title;
    document.getElementById('detailDesc').textContent = cfg.desc;
    document.getElementById('detailStatus').textContent = cfg.status;
    document.getElementById('detailYear').textContent = cfg.year;

    // Tech chips
    const techBox = document.getElementById('detailTech');
    techBox.innerHTML = cfg.tech.map((t) => `<span class="tech-chip">${t}</span>`).join('');

    const liveBtn = document.getElementById('detailLiveBtn');
    const repoBtn = document.getElementById('detailRepoBtn');
    const repoText = document.getElementById('detailRepoText');
    const liveText = document.getElementById('detailLiveText');

    if (cfg.id === 'orca-marine') {
      liveBtn.style.display = 'none';
      repoBtn.href = cfg.repoUrl;
      repoText.textContent = 'View on GitHub';
    } else {
      liveBtn.style.display = 'inline-flex';
      liveBtn.href = cfg.liveUrl;
      liveText.textContent = 'Launch Live Demo';
      repoBtn.href = cfg.repoUrl;
      repoText.textContent = 'GitHub Repo';
    }
  }

  function open(book) {
    if (state.mode !== 'hero' || !book) return;
    if (window.SoundFX) SoundFX.book.open();
    state.mode = 'opening';
    state.selected = book;
    if (openSlip) openSlip.classList.remove('is-visible');
    root.classList.add('detail-open');
    updateDetailPanel(book.cfg);
    computeSlots();

    currentWindow.forEach((bi) => {
      const b = bookInstances[bi];
      if (b !== book) {
        b.springs.py.t = -5.0;
        setTimeout(() => { b.root.visible = false; }, 600);
      }
    });

    setTimeout(() => {
      book.orbY = 0;
      book.orbYv = 0;
      applyMode();
      camTo('detail');
    }, 400);

    setTimeout(() => {
      state.mode = 'detail';
    }, 900);
  }

  function close() {
    if (state.mode !== 'detail') return;
    if (window.SoundFX) SoundFX.book.close();
    state.mode = 'closing';
    root.classList.remove('detail-open');
    orbit.drag = false;

    applyMode();
    camTo('hero');

    currentWindow.forEach((bi, i) => {
      const bk = bookInstances[bi];
      bk.root.visible = true;
      const slot = SLOTS.hero[i];
      if (slot) setTargets(bk, slot);
    });

    setTimeout(() => {
      state.mode = 'hero';
      state.selected = null;
    }, 850);
  }

  if (closeBtn) closeBtn.addEventListener('click', close);

  // Raycasting & Pointer Tracking
  const ptr = {
    cx: 0, cy: 0, ndcX: 0, ndcY: 0,
    down: false, downX: 0, downY: 0, moved: 0, t0: 0,
  };
  const orbit = { drag: false, dx: 0, dy: 0 };
  const ray = new THREE.Raycaster();
  const tmpV = new THREE.Vector3();
  let dragBook = null, rayBook = null;

  function localXY(e) {
    const r = root.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function castRay() {
    ray.setFromCamera({ x: ptr.ndcX, y: ptr.ndcY }, camera);
    const hits = ray.intersectObjects(hitMeshes, false);
    if (hits.length) {
      rayBook = bookByHit(hits[0].object);
    } else {
      rayBook = null;
    }
  }

  canvasEl.addEventListener('pointermove', (e) => {
    const { x, y } = localXY(e);
    const dxN = (x - ptr.cx) / dims.w;
    const dyN = (y - ptr.cy) / dims.h;
    ptr.cx = x;
    ptr.cy = y;
    ptr.ndcX = (x / dims.w) * 2 - 1;
    ptr.ndcY = -(y / dims.h) * 2 + 1;

    if (ptr.down && orbit.drag) {
      orbit.dx += dxN;
      orbit.dy += dyN;
      ptr.moved += Math.abs(dxN * dims.w) + Math.abs(dyN * dims.h);
    }
  });

  canvasEl.addEventListener('pointerdown', (e) => {
    const { x, y } = localXY(e);
    ptr.cx = x; ptr.cy = y;
    ptr.downX = x; ptr.downY = y;
    ptr.down = true;
    ptr.moved = 0;
    ptr.t0 = performance.now();
    ptr.ndcX = (x / dims.w) * 2 - 1;
    ptr.ndcY = -(y / dims.h) * 2 + 1;
    castRay();

    if (state.mode === 'hero' && rayBook) {
      dragBook = rayBook;
    } else if (state.mode === 'detail' && rayBook === state.selected) {
      orbit.drag = true;
      orbit.dx = 0;
      orbit.dy = 0;
    }
  });

  window.addEventListener('pointerup', () => {
    orbit.drag = false;
    if (dragBook) {
      const wasDrag = ptr.moved > 16;
      if (!wasDrag && state.mode === 'hero' && performance.now() - ptr.t0 < 500) {
        open(dragBook);
      }
      dragBook = null;
    }
    ptr.down = false;
  });

  // Tick loop
  let lastT = performance.now();
  const DETAIL_OPEN_ANGLE = 0.88;

  function tickBook(b, dt, t) {
    const s = b.springs;
    const isHov = state.hovered === b;
    const inDetail = state.mode === 'detail' && state.selected === b;
    const orbitActive = state.selected === b && state.mode !== 'hero';

    if (orbitActive) {
      if (orbit.drag && inDetail) {
        const step = orbit.dx * 6.2;
        orbit.dx = 0;
        b.orbY += step;
      }
    }

    let coverBase = 0;
    if (inDetail) coverBase = DETAIL_OPEN_ANGLE;

    if (isHov && state.mode === 'hero') {
      const dxN = (ptr.cx - b.scr.x) / (dims.w * 0.25);
      const dyN = (b.scr.y - ptr.cy) / (dims.h * 0.3);
      s.tiltY.t = clamp(dxN * 0.28, -0.15, 0.15);
      s.tiltX.t = clamp(-dyN * 0.1, -0.09, 0.1);
      s.lift.t = 0.28;
    } else {
      s.tiltY.t = 0;
      s.tiltX.t = 0;
      s.lift.t = 0;
    }

    s.cover.t = coverBase;
    s.sc.t = b.slotScale * (isHov && state.mode === 'hero' ? 1.08 : 1);

    s.px.update(dt);
    s.py.update(dt);
    s.pz.update(dt);
    s.rx.update(dt);
    s.ry.update(dt);
    s.rz.update(dt);
    s.sc.update(dt);
    s.tiltX.update(dt);
    s.tiltY.update(dt);
    s.lift.update(dt);
    s.cover.update(dt);

    b.float.position.y = Math.sin(t * 0.7 + b.phase) * 0.035;

    b.root.position.set(s.px.v, s.py.v, s.pz.v + s.lift.v);
    b.root.rotation.set(s.rx.v + s.tiltX.v, s.ry.v + s.tiltY.v + b.orbY, s.rz.v);
    b.root.scale.setScalar(Math.max(s.sc.v, 0.001));

    const ang = Math.max(0, s.cover.v);
    b.pivot.rotation.y = -ang;
    b.pivot.position.z = PIVOT_Z + ang * 0.022;

    for (let i = 0; i < PAGE_N; i++) {
      b.pages[i].rotation.y = -ang * b.pageF[i];
    }
  }

  function screenPos(b) {
    b.root.getWorldPosition(tmpV).project(camera);
    b.scr.x = (tmpV.x * 0.5 + 0.5) * dims.w;
    b.scr.y = (-tmpV.y * 0.5 + 0.5) * dims.h;
  }

  function frameLoop(now) {
    requestAnimationFrame(frameLoop);
    const dt = Math.min((now - lastT) / 1000, 0.05);
    lastT = now;
    const t = now / 1000;

    castRay();
    let hov = null;
    if (state.mode === 'hero') hov = rayBook;
    state.hovered = hov;

    canvasEl.style.cursor = (state.mode === 'hero' && hov) ? 'pointer' : (state.mode === 'detail' ? 'grab' : 'default');

    bookInstances.forEach((b) => screenPos(b));
    bookInstances.forEach((b) => tickBook(b, dt, t));

    // Open slip cursor follower
    if (openSlip) {
      if (state.mode === 'hero' && state.hovered) {
        openSlip.style.left = `${ptr.cx}px`;
        openSlip.style.top = `${ptr.cy + 35}px`;
        openSlip.classList.add('is-visible');
      } else {
        openSlip.classList.remove('is-visible');
      }
    }

    camera.position.set(camX.update(dt), camY.update(dt), camZ.update(dt));
    camera.lookAt(lookX.update(dt), lookY.update(dt), 0);

    renderer.render(scene, camera);
  }

  function resize() {
    const r = root.getBoundingClientRect();
    dims.w = Math.max(1, Math.round(r.width));
    dims.h = Math.max(1, Math.round(r.height));
    renderer.setSize(dims.w, dims.h);
    camera.aspect = dims.w / dims.h;
    camera.updateProjectionMatrix();
    computeSlots();
    applyMode();
  }

  window.addEventListener('resize', resize);
  resize();

  currentWindow.forEach((bi, i) => {
    const b = bookInstances[bi];
    const slot = SLOTS.hero[i];
    if (slot) {
      b.springs.px.set(slot.p[0]);
      b.springs.py.set(slot.p[1] - 3.5);
      b.springs.pz.set(slot.p[2]);
      b.springs.rx.set(slot.r[0]);
      b.springs.ry.set(slot.r[1]);
      b.springs.rz.set(slot.r[2]);
      b.springs.sc.set(slot.s);
      b.slotScale = slot.s;
      setTimeout(() => setTargets(b, slot), 150 + i * 140);
    }
  });

  bookInstances.forEach((b, idx) => {
    if (!currentWindow.includes(idx)) b.root.visible = false;
  });
  rebuildHitMeshes();
  camTo('hero');

  requestAnimationFrame(frameLoop);
}

/* =========================================
   CONTACT SECTION: 3D WAVE GRID BACKGROUND
   Interactive 40×40 Grid of Instanced Cubes (Vengeance UI Port)
   ========================================= */
function initWaveGridBackground() {
  const container = document.getElementById('waveGridWrapper');
  const canvas = document.getElementById('waveGridCanvas');
  if (!container || !canvas) return;

  if (typeof THREE === 'undefined') {
    console.warn('Three.js not loaded for Wave Grid Background');
    return;
  }

  const MAX_TRAIL = 128;
  const gridSize = 40;
  const colorBase = '#ffffff';
  const colorHigh = '#0055ff';
  const waveAmplitude = 0.45;
  const waveSpeed = 6.0;
  const waveFrequency = 1.2;
  const waveWidth = 3.0;
  const waveMaxHeight = 0.45;
  const waveJitter = 0.2;
  const autoAnimate = true;

  const cubeWidth = 0.8;
  const cubeHeight = 3.0;
  const gap = 0.01;
  const bounds = gridSize * (cubeWidth + gap);

  // Sizing
  const getSize = () => ({
    width: container.clientWidth || window.innerWidth,
    height: container.clientHeight || window.innerHeight,
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2)
  });
  let size = getSize();

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(colorBase).multiplyScalar(0.5);

  // Camera & Mouse Orbit
  const alphaRange = Math.PI * 0.03;
  const betaRange = Math.PI * 0.05;
  const mouse = new THREE.Vector2(0, 0);
  const lerpedMouse = new THREE.Vector2(0, 0);

  const camera = new THREE.PerspectiveCamera(40, size.width / size.height, 0.1, 500);
  let cameraRadius = 12;

  const fitCamera = () => {
    const verticalHalfFov = THREE.MathUtils.degToRad(camera.fov) / 2;
    const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * camera.aspect);
    const halfBounds = bounds / 2;
    cameraRadius = Math.min(
      halfBounds / Math.tan(verticalHalfFov),
      halfBounds / Math.tan(horizontalHalfFov)
    ) * 0.9 + cubeHeight * 0.5;
  };

  const positionCamera = (mx, my) => {
    const alpha = my * alphaRange;
    const beta = mx * betaRange;
    camera.position.set(
      -cameraRadius * Math.cos(alpha) * Math.sin(beta),
      cameraRadius * Math.cos(alpha) * Math.cos(beta),
      cameraRadius * Math.sin(alpha)
    );
    camera.up.set(0, 0, -1);
    camera.lookAt(0, 0, 0);
  };

  fitCamera();
  positionCamera(0, 0);
  scene.add(camera);

  // Lighting
  const ambientLight = new THREE.AmbientLight('#ffffff', 0.5);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight('#ffffff', 3.8);
  keyLight.position.set(-20, 10, 6);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.radius = 4;
  keyLight.shadow.camera.near = 0.1;
  keyLight.shadow.camera.far = 60;
  keyLight.shadow.camera.left = -22;
  keyLight.shadow.camera.right = 22;
  keyLight.shadow.camera.top = 22;
  keyLight.shadow.camera.bottom = -22;
  keyLight.shadow.bias = 0.0001;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight('#ffffff', 1.0);
  fillLight.position.set(10, 5, -3);
  scene.add(fillLight);

  // Mouse Trail DataTexture
  const trailData = new Float32Array(MAX_TRAIL * 4);
  const trailTexture = new THREE.DataTexture(
    trailData,
    MAX_TRAIL,
    1,
    THREE.RGBAFormat,
    THREE.FloatType
  );
  trailTexture.minFilter = THREE.NearestFilter;
  trailTexture.magFilter = THREE.NearestFilter;
  trailTexture.generateMipmaps = false;
  trailTexture.needsUpdate = true;

  const trailUniforms = {
    uTrailTexture: { value: trailTexture },
    uTrailCount: { value: 0 },
    uFadeTime: { value: 2.0 },
    uWaveSpeed: { value: waveSpeed },
    uWaveFreq: { value: waveFrequency },
    uWaveWidth: { value: waveWidth },
    uAmplitude: { value: waveAmplitude },
    uJitter: { value: waveJitter },
    uMaxHeight: { value: waveMaxHeight }
  };

  const colorUniforms = {
    uColorBase: { value: new THREE.Color(colorBase) },
    uColorHigh: { value: new THREE.Color(colorHigh) }
  };

  const trail = [];
  let lastPoint = null;
  let timeSinceLastMove = 0;
  let randomPointTimer = 0;
  let placingRandom = true;
  const fadeTime = 2.0;
  const trailSpacing = 0.12;

  const rayPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(bounds, bounds),
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, visible: false })
  );
  rayPlane.rotation.x = -Math.PI / 2;
  rayPlane.updateMatrixWorld(true);

  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();

  const onPointerMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointerNDC.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    mouse.copy(pointerNDC);
    raycaster.setFromCamera(pointerNDC, camera);
    const hits = raycaster.intersectObject(rayPlane);
    if (hits.length === 0) return;
    const { x, z } = hits[0].point;

    let distDelta = 0;
    if (lastPoint) {
      const dx = x - lastPoint.x;
      const dz = z - lastPoint.z;
      distDelta = Math.sqrt(dx * dx + dz * dz);
      if (distDelta < trailSpacing) return;
    }
    if (trail.length >= MAX_TRAIL) trail.shift();
    trail.push({ x, z, age: 0, distDelta: distDelta || 0.8 });
    lastPoint = { x, z };
    timeSinceLastMove = 0;
    placingRandom = false;
    randomPointTimer = 0;
  };

  container.addEventListener('pointermove', onPointerMove, { passive: true });
  container.addEventListener('pointerleave', () => {
    mouse.set(0, 0);
    lastPoint = null;
  });

  const addRandomPoint = () => {
    const x = (Math.random() * 0.5 - 0.25) * bounds;
    const z = (Math.random() * 0.5 - 0.25) * bounds;
    const distDelta = 0.8 + Math.random() * 0.2;
    if (trail.length >= MAX_TRAIL) trail.shift();
    trail.push({ x, z, age: 0, distDelta });
  };

  // Pre-seed ripples
  for (let i = 0; i < 3; i++) {
    addRandomPoint();
  }

  // Vertex Shader displacement
  function overrideVertexShader(vertexShader) {
    return vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying float vHeight;
        attribute vec2 aOffset;
        uniform sampler2D uTrailTexture;
        uniform int       uTrailCount;
        uniform float     uWaveSpeed;
        uniform float     uWaveFreq;
        uniform float     uWaveWidth;
        uniform float     uFadeTime;
        uniform float     uAmplitude;
        uniform float     uJitter;
        uniform float     uMaxHeight;

        vec2 hash2( vec2 p ) {
          p = vec2( dot( p, vec2( 127.1, 311.7 ) ), dot( p, vec2( 269.5, 183.3 ) ) );
          return fract( sin( p ) * 43758.5453123 ) - 0.5;
        }`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>

        vHeight = 0.0;

        if ( position.y > 0.0 ) {
          vec2 jitter  = hash2( aOffset ) * uJitter;
          vec2 worldXZ = aOffset + jitter;
          float waveHeight  = 0.0;
          float totalWeight = 0.0;

          for ( int i = 0; i < 128; i++ ) {
            if ( i >= uTrailCount ) break;
            vec4 td = texture2D( uTrailTexture, vec2( ( float(i) + 0.5 ) / 128.0, 0.5 ) );
            float dist      = length( worldXZ - td.rg );
            float wavefront = uWaveSpeed * td.b;
            float relDist   = dist - wavefront;

            float window = exp( -( relDist * relDist ) / ( uWaveWidth * uWaveWidth ) );
            float fade   = exp( -td.b / uFadeTime );
            float atten  = 1.0 / ( 1.0 + dist * 0.1 );
            float weight = fade * window * atten * td.a;

            waveHeight  += weight * cos( uWaveFreq * relDist );
            totalWeight += weight;
          }

          waveHeight /= max( totalWeight, 1.0 );

          float displacement = clamp( waveHeight * uAmplitude, -uMaxHeight, uMaxHeight );
          transformed.y += displacement;
          vHeight = displacement;
        }`
      );
  }

  // Instanced Cubes Grid
  const count = gridSize * gridSize;
  const geometry = new THREE.BoxGeometry(cubeWidth, cubeHeight, cubeWidth);
  const offsetAttribute = new THREE.InstancedBufferAttribute(new Float32Array(count * 2), 2);
  geometry.setAttribute('aOffset', offsetAttribute);

  const material = new THREE.MeshPhongMaterial({ color: 0xffffff });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, trailUniforms, colorUniforms);
    shader.vertexShader = overrideVertexShader(shader.vertexShader);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying float vHeight;
        uniform vec3  uColorBase;
        uniform vec3  uColorHigh;
        uniform float uMaxHeight;`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float t = clamp( vHeight / uMaxHeight, 0.0, 1.0 );
        diffuseColor.rgb = mix( uColorBase, uColorHigh, t );`
      );
  };

  const depthMaterial = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking
  });
  depthMaterial.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, trailUniforms);
    shader.vertexShader = overrideVertexShader(shader.vertexShader);
  };

  const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
  instancedMesh.customDepthMaterial = depthMaterial;
  instancedMesh.castShadow = true;
  instancedMesh.receiveShadow = true;
  scene.add(instancedMesh);

  const dummy = new THREE.Object3D();
  const spacing = cubeWidth + gap;
  const offset = ((gridSize - 1) * spacing) / 2;
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const index = i * gridSize + j;
      const x = i * spacing - offset;
      const z = j * spacing - offset;
      dummy.position.set(x, 0, z);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(index, dummy.matrix);
      offsetAttribute.setXY(index, x, z);
    }
  }
  instancedMesh.instanceMatrix.needsUpdate = true;
  offsetAttribute.needsUpdate = true;

  // Renderer
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(new THREE.Color(colorBase).multiplyScalar(0.5));
  renderer.setSize(size.width, size.height);
  renderer.setPixelRatio(size.pixelRatio);

  // Intersection Observer for performance
  let isVisible = false;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      isVisible = entry.isIntersecting;
    });
  }, { rootMargin: '200px' });
  observer.observe(container);

  // Resize handler
  const onResize = () => {
    size = getSize();
    camera.aspect = size.width / size.height;
    camera.updateProjectionMatrix();
    fitCamera();
    positionCamera(lerpedMouse.x, lerpedMouse.y);
    renderer.setSize(size.width, size.height);
    renderer.setPixelRatio(size.pixelRatio);
  };
  window.addEventListener('resize', onResize);

  // Animation Loop
  const clock = new THREE.Clock();

  function animateWave() {
    requestAnimationFrame(animateWave);

    if (!isVisible) return;

    const delta = Math.min(clock.getDelta(), 0.1);

    const expiry = fadeTime * 4;
    for (let i = trail.length - 1; i >= 0; i--) {
      trail[i].age += delta;
      if (trail[i].age > expiry) trail.splice(i, 1);
    }

    timeSinceLastMove += delta;
    if (timeSinceLastMove >= 3.0 && !placingRandom && autoAnimate) {
      placingRandom = true;
      randomPointTimer = 0;
    }
    if (placingRandom && autoAnimate) {
      randomPointTimer += delta;
      if (randomPointTimer >= 1.5) {
        addRandomPoint();
        randomPointTimer = 0;
      }
    }

    const count = Math.min(trail.length, MAX_TRAIL);
    if (count > 0 || trailUniforms.uTrailCount.value > 0) {
      for (let i = 0; i < count; i++) {
        const ti = i * 4;
        trailData[ti] = trail[i].x;
        trailData[ti + 1] = trail[i].z;
        trailData[ti + 2] = trail[i].age;
        trailData[ti + 3] = trail[i].distDelta;
      }
      trailTexture.needsUpdate = true;
      trailUniforms.uTrailCount.value = count;
    }

    lerpedMouse.x += (mouse.x - lerpedMouse.x) * 0.04;
    lerpedMouse.y += (mouse.y - lerpedMouse.y) * 0.04;
    positionCamera(lerpedMouse.x, lerpedMouse.y);

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animateWave);
}

/* =========================================
   SOCIAL FLIP BUTTON INTERACTION
   Handles touch toggle and accessibility
   ========================================= */
function initSocialFlipButton() {
  const btn = document.getElementById('socialFlipButton');
  if (!btn) return;

  // Toggle flipped state on touch devices
  btn.addEventListener('touchstart', (e) => {
    // Only toggle if not clicking directly on a back-face link
    if (!e.target.closest('.social-flip-node')) {
      btn.classList.toggle('touch-active');
    }
  }, { passive: true });
}

/* =========================================
   BREAKOUT GAME: "HELLO WORLD" HEADLINE
   Interactive Pixel Brick Breaker
   ========================================= */
function initBreakoutGame() {
  const panel = document.getElementById('breakoutPanel');
  const canvas = document.getElementById('breakoutCanvas');
  const livesContainer = document.getElementById('breakoutLives');
  const statusText = document.getElementById('breakoutStatus');
  const actionBtn = document.getElementById('breakoutActionBtn');

  if (!panel || !canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const lines = ['HELLO', 'WORLD'];
  const startingLives = 3;
  const speedMultiplier = 1.0;

  const BRICK_EMPTY = 0;
  const BRICK_SOLID = 1;
  const BRICK_BROKEN = 2;
  const LETTER_W = 5;
  const LETTER_H = 7;
  const LETTER_SPACING = 1;
  const LINE_SPACING = 3;
  const REGROW_DELAY = 1.4;

  const PIXEL_FONT = {
    A: `.###./#...#/#...#/#####/#...#/#...#/#...#`,
    B: `####./#...#/#...#/####./#...#/#...#/####.`,
    C: `.####/#..../#..../#..../#..../#..../.####`,
    D: `####./#...#/#...#/#...#/#...#/#...#/####.`,
    E: `#####/#..../#..../####./#..../#..../#####`,
    F: `#####/#..../#..../####./#..../#..../#....`,
    G: `.###./#...#/#..../#..##/#...#/#...#/.###.`,
    H: `#...#/#...#/#...#/#####/#...#/#...#/#...#`,
    I: `#####/..#../..#../..#../..#../..#../#####`,
    J: `..###/...#./...#./...#./...#./#..#./.##..`,
    K: `#...#/#..#./#.#../##.../#.#../#..#./#...#`,
    L: `#..../#..../#..../#..../#..../#..../#####`,
    M: `#...#/##.##/#.#.#/#...#/#...#/#...#/#...#`,
    N: `#...#/##..#/#.#.#/#..##/#...#/#...#/#...#`,
    O: `.###./#...#/#...#/#...#/#...#/#...#/.###.`,
    P: `####./#...#/#...#/####./#..../#..../#....`,
    Q: `.###./#...#/#...#/#...#/#.#.#/#..#./.##.#`,
    R: `####./#...#/#...#/####./#.#../#..#./#...#`,
    S: `.####/#..../#..../.###./....#/....#/####.`,
    T: `#####/..#../..#../..#../..#../..#../..#..`,
    U: `#...#/#...#/#...#/#...#/#...#/#...#/.###.`,
    V: `#...#/#...#/#...#/#...#/#...#/.#.#./..#..`,
    W: `#...#/#...#/#...#/#...#/#.#.#/##.##/#...#`,
    X: `#...#/#...#/.#.#./..#../.#.#./#...#/#...#`,
    Y: `#...#/#...#/.#.#./..#../..#../..#../..#..`,
    Z: `#####/....#/...#./..#../.#.../#..../#####`,
    0: `.###./#...#/#..##/#.#.#/##..#/#...#/.###.`,
    1: `..#../.##../..#../..#../..#../..#../.###.`,
    2: `.###./#...#/....#/...#./..#../.#.../#####`,
    3: `#####/...#./..#../...#./....#/#...#/.###.`,
    4: `...#./..##./.#.#./#..#./#####/...#./...#.`,
    5: `#####/#..../####./....#/....#/#...#/.###.`,
    6: `..##./.#.../#..../####./#...#/#...#/.###.`,
    7: `#####/....#/...#./..#../.#.../.#.../.#...`,
    8: `.###./#...#/#...#/.###./#...#/#...#/.###.`,
    9: `.###./#...#/#...#/.####/....#/...#./.##..`,
    '.': `...../...../...../...../...../.##../.##..`,
    '!': `..#../..#../..#../..#../..#../...../..#..`
  };

  const clampVal = (val, min, max) => Math.min(max, Math.max(min, val));
  const measureLine = (str) => Math.max(0, str.length * 6 - 1);
  const measureGrid = (arr) => ({
    w: Math.max(1, ...arr.map(measureLine)),
    h: arr.length * LETTER_H + (arr.length - 1) * LINE_SPACING
  });

  function buildGrid(linesArr, cols, rows, yRatio) {
    const grid = new Uint8Array(cols * rows);
    const dims = measureGrid(linesArr);
    const startY = Math.max(0, Math.round(rows * yRatio - dims.h / 2));

    linesArr.forEach((line, lineIdx) => {
      const lineW = measureLine(line);
      const startX = Math.round((cols - lineW) / 2);
      const rowY = startY + lineIdx * 10;

      Array.from(line.toUpperCase()).forEach((char, charIdx) => {
        const glyph = PIXEL_FONT[char];
        if (!glyph) return;
        const colX = startX + charIdx * 6;
        glyph.split('/').forEach((glyphRow, rIdx) => {
          for (let cIdx = 0; cIdx < LETTER_W; cIdx++) {
            if (glyphRow[cIdx] !== '#') continue;
            const x = colX + cIdx;
            const y = rowY + rIdx;
            if (x >= 0 && x < cols && y >= 0 && y < rows) {
              grid[y * cols + x] = BRICK_SOLID;
            }
          }
        });
      });
    });

    return grid;
  }

  let state = null;
  let animId = 0;
  let isPanelVisible = false;
  let isDocVisible = true;

  function renderLayer() {
    if (!state) return;
    const { layerCtx, cell, gap, cols, rows, grid, ox, oy } = state;
    layerCtx.clearRect(0, 0, state.width, state.height);
    const brickSize = cell - gap;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const val = grid[r * cols + c];
        if (val !== BRICK_EMPTY) {
          layerCtx.fillStyle = val === BRICK_SOLID ? '#f2efe9' : 'rgba(242, 239, 233, 0.08)';
          layerCtx.fillRect(ox + c * cell, oy + r * cell, brickSize, brickSize);
        }
      }
    }
    state.layerDirty = false;
  }

  function renderFrame() {
    if (!state) return;
    if (state.layerDirty) renderLayer();

    ctx.clearRect(0, 0, state.width, state.height);
    ctx.drawImage(state.layer, 0, 0, state.width, state.height);

    // Only draw paddle and ball when actively playing!
    // Before pressing PLAY, the paddle bar is hidden so it never overlaps the PLAY button.
    if (state.phase !== 'playing') return;

    const { paddle, ball, radius } = state;
    ctx.fillStyle = state.accent;

    // Paddle Bar
    const px = paddle.x - paddle.w / 2;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(px, paddle.y, paddle.w, paddle.h, paddle.h / 2);
      ctx.fill();
    } else {
      ctx.fillRect(px, paddle.y, paddle.w, paddle.h);
    }

    // Ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const actionBar = document.getElementById('breakoutActionBar');

  function updateUI() {
    if (!state) return;
    const isPlaying = state.phase === 'playing';

    if (isPlaying) {
      panel.classList.add('is-playing');
      livesContainer.classList.add('active');
      if (actionBar) actionBar.classList.add('hidden');
    } else {
      panel.classList.remove('is-playing');
      livesContainer.classList.remove('active');
      if (actionBar) actionBar.classList.remove('hidden');
    }

    if (livesContainer) {
      const dots = livesContainer.querySelectorAll('.life-dot');
      dots.forEach((dot, idx) => {
        dot.className = `life-dot ${idx < state.lives ? 'alive' : ''}`;
      });
    }

    if (state.phase === 'over') {
      statusText.textContent = 'OUT OF BALLS';
      statusText.className = 'breakout-status-text show';
      actionBtn.textContent = 'AGAIN';
    } else if (state.phase === 'won') {
      statusText.textContent = 'CLEARED';
      statusText.className = 'breakout-status-text show won';
      actionBtn.textContent = 'AGAIN';
    } else {
      statusText.textContent = '';
      statusText.className = 'breakout-status-text';
      actionBtn.textContent = 'PLAY';
    }
  }

  function resetBoard(forcePlay = false) {
    const rect = panel.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    if (w < 40 || h < 40) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const dims = measureGrid(lines);
    const scale = Math.min(w * (w < 520 ? 0.94 : 0.88) / dims.w, h * 0.56 / dims.h);
    const cellSize = clampVal(Math.floor(scale), 4, 26);
    const cols = Math.floor(w / cellSize);
    const rows = Math.floor(h / cellSize);
    const grid = buildGrid(lines, cols, rows, clampVal(0.3 + (h / w) * 0.12, 0.3, 0.44));

    let standingCount = 0;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] === BRICK_SOLID) standingCount++;
    }

    const layer = document.createElement('canvas');
    layer.width = canvas.width;
    layer.height = canvas.height;
    const layerCtx = layer.getContext('2d');
    layerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const phase = forcePlay ? 'playing' : (state?.phase === 'playing' ? 'playing' : 'idle');

    state = {
      width: w,
      height: h,
      cell: cellSize,
      cols,
      rows,
      grid,
      standing: standingCount,
      ox: (w - cols * cellSize) / 2,
      oy: (h - rows * cellSize) / 2,
      gap: Math.max(1, Math.round(cellSize * 0.22)),
      accent: '#38bdf8',
      layer,
      layerCtx,
      layerDirty: true,
      radius: clampVal(cellSize * 0.5, 4, 9),
      paddle: {
        x: w / 2,
        w: clampVal(w * 0.24, 64, 180),
        h: clampVal(cellSize * 0.8, 6, 12),
        y: h - Math.max(34, cellSize * 3.0)
      },
      ball: { x: w / 2, y: 0, vx: 0, vy: 0 },
      baseSpeed: clampVal(h * 0.48, 180, 440) * speedMultiplier,
      serving: true,
      serveDelay: 0.6,
      lives: startingLives,
      phase,
      clock: 0,
      regrow: [],
      last: 0,
      acc: 0
    };

    updateUI();
    renderLayer();
    renderFrame();
  }

  function checkBrickCollisions() {
    const { ball, radius, cell, cols, rows, ox, oy, grid } = state;
    const cMin = Math.floor((ball.x - radius - ox) / cell);
    const cMax = Math.floor((ball.x + radius - ox) / cell);
    const rMin = Math.floor((ball.y - radius - oy) / cell);
    const rMax = Math.floor((ball.y + radius - oy) / cell);
    const hit = [];

    for (let r = Math.max(0, rMin); r <= Math.min(rows - 1, rMax); r++) {
      for (let c = Math.max(0, cMin); c <= Math.min(cols - 1, cMax); c++) {
        const idx = r * cols + c;
        if (grid[idx] === BRICK_SOLID) hit.push(idx);
      }
    }
    return hit;
  }

  function resolveAxis(axis, dt) {
    const { ball } = state;
    if (axis === 'x') {
      ball.x += ball.vx * dt;
    } else {
      ball.y += ball.vy * dt;
    }

    const hits = checkBrickCollisions();
    if (!hits.length) return;

    hits.forEach((idx) => {
      state.grid[idx] = BRICK_BROKEN;
      state.standing--;
    });

    state.layerDirty = true;
    if (axis === 'x') {
      ball.x -= ball.vx * dt;
      ball.vx = -ball.vx;
    } else {
      ball.y -= ball.vy * dt;
      ball.vy = -ball.vy;
    }
  }

  function resetServe() {
    state.serving = true;
    state.serveDelay = 0.8;
    state.ball.vx = 0;
    state.ball.vy = 0;
  }

  function setPhase(p) {
    if (!state) return;
    state.phase = p;
    updateUI();
  }

  function stepPhysics(dt) {
    const { ball, paddle, radius } = state;

    if (state.serving) {
      ball.x = paddle.x;
      ball.y = paddle.y - radius - 1;
      if (Number.isFinite(state.serveDelay)) {
        state.serveDelay -= dt;
        if (state.serveDelay <= 0) {
          state.serving = false;
          ball.vx = state.baseSpeed * 0.35 * (Math.random() < 0.5 ? -1 : 1);
          ball.vy = -state.baseSpeed;
        }
      }
      return;
    }

    resolveAxis('x', dt);
    resolveAxis('y', dt);

    if (ball.x - radius < 0) {
      ball.x = radius;
      ball.vx = Math.abs(ball.vx);
    }
    if (ball.x + radius > state.width) {
      ball.x = state.width - radius;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y - radius < 0) {
      ball.y = radius;
      ball.vy = Math.abs(ball.vy);
    }

    const inPaddleX = Math.abs(ball.x - paddle.x) <= paddle.w / 2 + radius;
    const inPaddleY = ball.vy > 0 && ball.y + radius >= paddle.y && ball.y - radius <= paddle.y + paddle.h;

    if (inPaddleX && inPaddleY) {
      const offset = clampVal((ball.x - paddle.x) / (paddle.w / 2), -1, 1) * 1.05;
      const curSpeed = Math.min(Math.hypot(ball.vx, ball.vy) * 1.01, state.baseSpeed * 1.45);
      ball.vx = Math.sin(offset) * curSpeed;
      ball.vy = -Math.cos(offset) * curSpeed;
      ball.y = paddle.y - radius - 0.5;
    }

    if (ball.y - radius > state.height) {
      state.lives--;
      updateUI();
      if (state.lives <= 0) {
        setPhase('over');
      } else {
        resetServe();
      }
    }

    if (state.standing === 0) {
      setPhase('won');
    }
  }

  const SUBSTEP = 1 / 120;
  function gameLoop(now) {
    animId = requestAnimationFrame(gameLoop);
    if (!state || (!isPanelVisible && !isDocVisible)) return;

    const delta = state.last ? Math.min((now - state.last) / 1000, 4 * SUBSTEP) : 0;
    state.last = now;

    if (state.phase === 'playing') {
      state.acc += delta;
      let iters = 0;
      while (state.acc >= SUBSTEP && iters < 4) {
        stepPhysics(SUBSTEP);
        state.acc -= SUBSTEP;
        iters++;
      }
      if (iters === 4) state.acc = 0;
    }

    renderFrame();
  }

  function launchGame() {
    if (!state) return;
    resetBoard(true);
    state.phase = 'playing';
    state.serving = false;
    state.serveDelay = Infinity;
    state.ball.x = state.paddle.x;
    state.ball.y = state.paddle.y - state.radius - 1;
    state.ball.vx = state.baseSpeed * 0.35 * (Math.random() < 0.5 ? -1 : 1);
    state.ball.vy = -state.baseSpeed;
    updateUI();
    renderFrame();
  }

  function movePaddleTo(x) {
    if (!state || state.phase !== 'playing') return;
    state.paddle.x = clampVal(x, state.paddle.w / 2, state.width - state.paddle.w / 2);
  }

  // Pointer movement only moves paddle when playing
  panel.addEventListener('pointermove', (e) => {
    if (!state || state.phase !== 'playing') return;
    const rect = panel.getBoundingClientRect();
    movePaddleTo(e.clientX - rect.left);
  }, { passive: true });

  // Clicking the Play / Again button explicitly launches the game
  actionBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    launchGame();
  });

  panel.addEventListener('keydown', (e) => {
    const step = (state?.cell ?? 8) * 4;
    if (e.key === 'ArrowLeft') {
      if (state && state.phase === 'playing') {
        state.paddle.x = clampVal(state.paddle.x - step, state.paddle.w / 2, state.width - state.paddle.w / 2);
      }
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      if (state && state.phase === 'playing') {
        state.paddle.x = clampVal(state.paddle.x + step, state.paddle.w / 2, state.width - state.paddle.w / 2);
      }
      e.preventDefault();
    } else if (e.key === ' ' || e.key === 'Enter') {
      if (state && state.phase !== 'playing') {
        launchGame();
        e.preventDefault();
      }
    }
  });

  const resizeObserver = new ResizeObserver(() => {
    resetBoard();
  });
  resizeObserver.observe(panel);

  const intersectionObserver = new IntersectionObserver(([entry]) => {
    isPanelVisible = entry.isIntersecting;
  }, { threshold: 0.05 });
  intersectionObserver.observe(panel);

  document.addEventListener('visibilitychange', () => {
    isDocVisible = document.visibilityState === 'visible';
  });

  resetBoard();
  animId = requestAnimationFrame(gameLoop);
}

let appInitialized = false;
function safeInitApp() {
  if (appInitialized) return;
  appInitialized = true;
  initApp();
}

if (portraitImg.complete && portraitImg.naturalWidth > 0) {
  imgLoaded = true;
  safeInitApp();
} else {
  portraitImg.onload = () => {
    imgLoaded = true;
    safeInitApp();
  };
  portraitImg.onerror = () => {
    imgLoaded = false;
    safeInitApp();
  };
  // Fallback safety: ensures portfolio always initializes within 1200ms even on slow networks
  setTimeout(() => {
    safeInitApp();
  }, 1200);
}
