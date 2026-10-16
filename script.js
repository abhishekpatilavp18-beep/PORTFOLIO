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

// Ambient drifting dust/stars on pure black background
function initAmbientParticles() {
  ambientParticles = [];
  // Richer starry field with ~250 ambient floating particles
  const count = Math.floor((canvas.width * canvas.height) / 4500);
  for (let i = 0; i < count; i++) {
    ambientParticles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 1.6 + 0.6,
      speedX: (Math.random() - 0.5) * 0.25,
      speedY: (Math.random() - 0.5) * 0.25,
      alpha: Math.random() * 0.45 + 0.12
    });
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

  // Big size covering more space prominently
  const targetHeight = Math.min(canvas.height * 1.16, 960);
  const aspect = portraitImg.width / portraitImg.height;
  const targetWidth = targetHeight * aspect;

  offscreen.width = targetWidth;
  offscreen.height = targetHeight;
  offCtx.drawImage(portraitImg, 0, 0, targetWidth, targetHeight);

  const imgData = offCtx.getImageData(0, 0, targetWidth, targetHeight).data;

  // Align exactly in the middle horizontally, with face centered vertically
  const startX = (canvas.width - targetWidth) / 2;
  const startY = 52;

  const step = 4.2;
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
});

// Render Loop
function animate() {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 1. Ambient space dust
  for (let i = 0; i < ambientParticles.length; i++) {
    const star = ambientParticles[i];
    if (introComplete) {
      star.x += star.speedX;
      star.y += star.speedY;

      if (star.x < 0) star.x = canvas.width;
      if (star.x > canvas.width) star.x = 0;
      if (star.y < 0) star.y = canvas.height;
      if (star.y > canvas.height) star.y = 0;
    }

    ctx.fillStyle = `rgba(140, 180, 255, ${star.alpha})`;
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }

  // 2. Draw portrait pixels if assembly has triggered
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
function runEntrySequence() {
  // Step 1: The DOT falls from the top with gravity, bounces on the floor, and casts shadow (150ms)
  setTimeout(() => {
    iDot.classList.add('drop-bounce');
    iFloorShadow.classList.add('active-shadow');
  }, 150);

  // Step 2: The body BAR falls from the top right after, lands and spring-bounces (450ms)
  setTimeout(() => {
    iBar.classList.add('drop-bounce');
  }, 450);

  // Step 3: "i" is completely settled & FIXED in center.
  // "ABH" on the left scramble-morphs in gracefully (1400ms, duration: 850ms)
  setTimeout(() => {
    scrambleReveal(prefixText, 'ABH', 850, () => {
      // Step 4: "SHEK" on the right scramble-morphs in gracefully (duration: 900ms)
      setTimeout(() => {
        scrambleReveal(suffixText, 'SHEK', 900, () => {
          // Step 5: Both sides assembled! Fuse "i" cleanly into uppercase "I"
          setTimeout(() => {
            iLetterWrap.classList.add('dock-impact');
            iLetterWrap.classList.add('fused');
            setTimeout(() => {
              iLetterWrap.classList.remove('dock-impact');
            }, 300);

            // DWELL TIME: 1.8 full seconds so visitors can read "ABHISHEK" clearly!
            setTimeout(() => {
              giantTitle.innerHTML = 'ABHISHEK';
              morphText('ABHISHEK', 'PORTFOLIO', 900, () => {
                // Step 7: "PORTFOLIO" glides smoothly down to bottom position
                setTimeout(() => {
                  heroCenter.classList.add('in-position');

                  // Step 8: Reveal navbar, footer, and trigger cosmic particle assembly
                  setTimeout(() => {
                    mainNavbar.classList.remove('intro-hidden');
                    mainNavbar.classList.add('intro-visible');

                    heroFooter.classList.remove('intro-hidden');
                    heroFooter.classList.add('intro-visible');

                    introComplete = true;

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
  }, 1400);
}

// Handle both fresh load and cached load reliably
function initApp() {
  initAmbientParticles();
  animate();
  runEntrySequence();
  initNavObserver();
  initAsciiGlitchRipple();
}

// Update active navbar link on scroll
function initNavObserver() {
  const sections = document.querySelectorAll('main[id], section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

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
  }, { passive: true });
}

/* =========================================
   ASCII GLITCH RIPPLE (Vengeance UI)
   Interactive wave distortion for About Me content
   ========================================= */
function initAsciiGlitchRipple() {
  const el = document.getElementById('bioText');
  const card = document.getElementById('bioCard');
  if (!el || !card) return;

  const origHtml = el.innerHTML;

  // Extract character data while preserving <span class="highlight"> markup
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

  // Wave ripple constants from Vengeance UI
  const WAVE_THRESH = 3;
  const CHAR_MULT = 3;
  const ANIM_STEP = 40;
  const WAVE_BUF = 5;
  const dur = 1000;
  const chars = '.,·-─~+:;=*π""┐┌┘┴┬╗╔╝╚╬╠╣╩╦║░▒▓█▄▀▌▐■!?&#$@0123456789*';
  const preserveSpaces = true;
  const spread = 1.1;

  let isAnim = false;
  let cursorPos = 0;
  let waves = [];
  let animId = null;
  let isHover = false;
  let autoTriggered = false;

  function updateCursorPos(e) {
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
          if (found) return;
        }
      } catch (err) {}
    }

    const rect = el.getBoundingClientRect();
    const relY = Math.max(0, Math.min(0.999, (e.clientY - rect.top) / rect.height));
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const lines = 4;
    const currentLine = Math.floor(relY * lines);
    const frac = (currentLine + relX) / lines;
    cursorPos = Math.max(0, Math.min(Math.floor(frac * totalLen), totalLen - 1));
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
        // keep spaces intact
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
    el.innerHTML = origHtml;
    el.classList.remove('as');
    isAnim = false;
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

  function startWave(customStartPos) {
    const startPos = (typeof customStartPos === 'number') ? customStartPos : cursorPos;
    waves.push({
      startPos: startPos,
      startTime: Date.now(),
      id: Math.random()
    });

    if (!isAnim) start();
  }

  // Interactive mouse handlers on the bio card
  card.addEventListener('mouseenter', (e) => {
    isHover = true;
    updateCursorPos(e);
    startWave();
  });

  card.addEventListener('mousemove', (e) => {
    if (!isHover) return;
    const old = cursorPos;
    updateCursorPos(e);
    if (Math.abs(cursorPos - old) >= 3) {
      startWave();
    }
  });

  card.addEventListener('mouseleave', () => {
    isHover = false;
  });

  card.addEventListener('click', (e) => {
    updateCursorPos(e);
    startWave();
  });

  // Auto-ripple once when About section scrolls into viewport
  const aboutObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !autoTriggered) {
        autoTriggered = true;
        setTimeout(() => {
          startWave(0);
        }, 350);
      }
    });
  }, { threshold: 0.3 });

  const aboutSec = document.getElementById('about');
  if (aboutSec) aboutObserver.observe(aboutSec);
}

if (portraitImg.complete && portraitImg.naturalWidth > 0) {
  imgLoaded = true;
  initApp();
} else {
  portraitImg.onload = () => {
    imgLoaded = true;
    initApp();
  };
}
