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
const exclWrap = document.getElementById('exclWrap');
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
  const count = Math.floor((canvas.width * canvas.height) / 16000);
  for (let i = 0; i < count; i++) {
    ambientParticles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 1.6 + 0.6,
      speedX: (Math.random() - 0.5) * 0.25,
      speedY: (Math.random() - 0.5) * 0.25,
      alpha: Math.random() * 0.45 + 0.1
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
// TEXT MORPHING / SCRAMBLE UTILITY
// =========================================
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
// ENTRY ANIMATION TIMELINE (MATCHING REFERENCE VIDEO)
// =========================================
function runEntrySequence() {
  // Step 1: Center exclamation mark pops in (100ms)
  setTimeout(() => {
    exclWrap.classList.add('pop');
  }, 100);

  // Step 2: "ABH" pops on left, "SHEK" on right (850ms) -> "ABH ! SHEK"
  setTimeout(() => {
    prefixText.textContent = 'ABH';
    suffixText.textContent = 'SHEK';
    prefixText.classList.add('show');
    suffixText.classList.add('show');
  }, 850);

  // Step 3: "!" straightens into "I" (1700ms) -> "ABHISHEK"
  setTimeout(() => {
    exclWrap.classList.add('straight');
  }, 1700);

  // Step 4: Morph "ABHISHEK" -> "PORTFOLIO" (2600ms)
  setTimeout(() => {
    giantTitle.innerHTML = 'ABHISHEK';
    morphText('ABHISHEK', 'PORTFOLIO', 750, () => {
      // Step 5: "PORTFOLIO" glides down to bottom position (3450ms)
      setTimeout(() => {
        heroCenter.classList.add('in-position');

        // Step 6: Reveal navbar, footer, and trigger cosmic particle assembly (3900ms)
        setTimeout(() => {
          mainNavbar.classList.remove('intro-hidden');
          mainNavbar.classList.add('intro-visible');

          heroFooter.classList.remove('intro-hidden');
          heroFooter.classList.add('intro-visible');

          interactionHint.classList.remove('intro-hidden');
          interactionHint.classList.add('intro-visible');

          introComplete = true;

          // Thousands of pixels rush in from outer space to assemble Abhishek's portrait!
          startParticleAssembly = true;
          createParticles(true);
        }, 450);
      }, 150);
    });
  }, 2600);
}

// Handle both fresh load and cached load reliably
function initApp() {
  initAmbientParticles();
  animate();
  runEntrySequence();
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
