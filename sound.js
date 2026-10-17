/**
 * ===================================================================
 * ABHISHEK PATIL PORTFOLIO - BOOK SOUND ENGINE (Web Audio API)
 * Dedicated organic sound synthesis for 3D Projects Showcase
 * ===================================================================
 * Generates zero-dependency procedural audio for:
 * - Book Open: Hardcover creak and delicate fanned-page flutter
 * - Book Close: Crisp hardcover snap and subtle paper settle
 * - Carousel Slide: Smooth page swish / paper glide
 * - Page Rustle: Subtle tactile paper texture
 *
 * Silently auto-unlocks on first user interaction with no UI clutter.
 * ===================================================================
 */

(function () {
  'use strict';

  let audioCtx = null;
  let masterGain = null;
  let compressor = null;
  let whiteNoiseBuffer = null;
  let pinkNoiseBuffer = null;

  function initAudioContext() {
    if (audioCtx) {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      return audioCtx;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    try {
      audioCtx = new AudioContextClass();

      compressor = audioCtx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-16, audioCtx.currentTime);
      compressor.knee.setValueAtTime(24, audioCtx.currentTime);
      compressor.ratio.setValueAtTime(4, audioCtx.currentTime);
      compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
      compressor.release.setValueAtTime(0.15, audioCtx.currentTime);

      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.75, audioCtx.currentTime);

      compressor.connect(masterGain);
      masterGain.connect(audioCtx.destination);

      // 1-second white noise buffer
      const bufferSize = audioCtx.sampleRate;
      whiteNoiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const wOutput = whiteNoiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        wOutput[i] = Math.random() * 2 - 1;
      }

      // 1-second pink noise buffer (Paul Kellet's algorithm)
      pinkNoiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const pOutput = pinkNoiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        pOutput[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    } catch (err) {
      audioCtx = null;
    }

    return audioCtx;
  }

  // Silent auto-unlock on user gesture
  const unlockEvents = ['pointerdown', 'keydown', 'touchstart'];
  function unlockAudio() {
    initAudioContext();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    unlockEvents.forEach((evt) => window.removeEventListener(evt, unlockAudio));
  }
  unlockEvents.forEach((evt) => window.addEventListener(evt, unlockAudio, { passive: true }));

  function canPlay() {
    const ctx = initAudioContext();
    if (!ctx) return false;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    return true;
  }

  // =================================================================
  // PROJECTS: 3D BOOK SOUNDS
  // =================================================================
  const BookSounds = {
    // Realistic hardcover book open: cover swing creak + fanned paper flutter
    open() {
      if (!canPlay()) return;
      const t = audioCtx.currentTime;

      // 1. Cover spine creak / air displacement
      if (pinkNoiseBuffer) {
        const noise = audioCtx.createBufferSource();
        noise.buffer = pinkNoiseBuffer;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(450, t);
        filter.frequency.linearRampToValueAtTime(950, t + 0.18);
        filter.Q.setValueAtTime(1.8, t);

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.01, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(compressor);

        noise.start(t);
        noise.stop(t + 0.29);
      }

      // 2. Paper flutter (3 rapid micro-bursts of fanning pages)
      [0.08, 0.14, 0.21].forEach((delay, idx) => {
        if (!whiteNoiseBuffer) return;
        const pageNoise = audioCtx.createBufferSource();
        pageNoise.buffer = whiteNoiseBuffer;

        const pFilter = audioCtx.createBiquadFilter();
        pFilter.type = 'bandpass';
        pFilter.frequency.setValueAtTime(1800 + idx * 300, t + delay);
        pFilter.Q.setValueAtTime(2.2, t + delay);

        const pGain = audioCtx.createGain();
        pGain.gain.setValueAtTime(0.15 - idx * 0.02, t + delay);
        pGain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.07);

        pageNoise.connect(pFilter);
        pFilter.connect(pGain);
        pGain.connect(compressor);

        pageNoise.start(t + delay);
        pageNoise.stop(t + delay + 0.08);
      });
    },

    // Book close: crisp hardcover clap / thud + paper settle
    close() {
      if (!canPlay()) return;
      const t = audioCtx.currentTime;

      // 1. Air rush whoosh leading to snap
      if (pinkNoiseBuffer) {
        const air = audioCtx.createBufferSource();
        air.buffer = pinkNoiseBuffer;
        const airFilter = audioCtx.createBiquadFilter();
        airFilter.type = 'lowpass';
        airFilter.frequency.setValueAtTime(800, t);

        const airGain = audioCtx.createGain();
        airGain.gain.setValueAtTime(0.02, t);
        airGain.gain.linearRampToValueAtTime(0.24, t + 0.06);
        airGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        air.connect(airFilter);
        airFilter.connect(airGain);
        airGain.connect(compressor);

        air.start(t);
        air.stop(t + 0.12);
      }

      // 2. Hardcover impact thud
      const snapT = t + 0.05;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, snapT);
      osc.frequency.exponentialRampToValueAtTime(45, snapT + 0.1);

      gain.gain.setValueAtTime(0.45, snapT);
      gain.gain.exponentialRampToValueAtTime(0.001, snapT + 0.1);

      osc.connect(gain);
      gain.connect(compressor);
      osc.start(snapT);
      osc.stop(snapT + 0.11);

      // 3. Crisp paper edge slap
      if (whiteNoiseBuffer) {
        const slap = audioCtx.createBufferSource();
        slap.buffer = whiteNoiseBuffer;
        const sFilter = audioCtx.createBiquadFilter();
        sFilter.type = 'bandpass';
        sFilter.frequency.setValueAtTime(1200, snapT);
        sFilter.Q.setValueAtTime(2.0, snapT);

        const sGain = audioCtx.createGain();
        sGain.gain.setValueAtTime(0.32, snapT);
        sGain.gain.exponentialRampToValueAtTime(0.001, snapT + 0.04);

        slap.connect(sFilter);
        sFilter.connect(sGain);
        sGain.connect(compressor);
        slap.start(snapT);
        slap.stop(snapT + 0.045);
      }
    },

    // Carousel prev / next shift: smooth paper whoosh
    slide() {
      if (!canPlay()) return;
      const t = audioCtx.currentTime;

      if (!pinkNoiseBuffer) return;
      const noise = audioCtx.createBufferSource();
      noise.buffer = pinkNoiseBuffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, t);
      filter.frequency.exponentialRampToValueAtTime(650, t + 0.18);
      filter.Q.setValueAtTime(1.5, t);

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.02, t);
      gain.gain.linearRampToValueAtTime(0.26, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(compressor);

      noise.start(t);
      noise.stop(t + 0.21);
    },

    // Subtle paper page rustle
    rustle() {
      if (!canPlay()) return;
      const t = audioCtx.currentTime;

      if (!whiteNoiseBuffer) return;
      const noise = audioCtx.createBufferSource();
      noise.buffer = whiteNoiseBuffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200, t);
      filter.Q.setValueAtTime(3.0, t);

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(compressor);

      noise.start(t);
      noise.stop(t + 0.065);
    },
  };

  // Safe global SoundFX interface (only book sounds active)
  window.SoundFX = {
    book: BookSounds,
  };
})();
