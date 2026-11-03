/* NEXUS CAOS — Sonidos sintetizados con WebAudio (sin archivos) + vibración. */
(function (raiz) {
  'use strict';
  let ctx = null, ruido = null;
  const S = { activo: true, vibrar: true };
  function ac() {
    if (!S.activo) return null;
    try {
      if (!ctx) { const A = raiz.AudioContext || raiz.webkitAudioContext; if (!A) return null; ctx = new A(); }
      if (ctx.state === 'suspended') ctx.resume();
      if (!ruido) {
        ruido = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
        const d = ruido.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      return ctx;
    } catch (e) { return null; }
  }
  function tono(f, dur, tipo, vol, cuando, f2) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + (cuando || 0), o = c.createOscillator(), g = c.createGain();
    o.type = tipo || 'sine'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function chss(dur, vol, frec, cuando) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + (cuando || 0), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = ruido; f.type = 'bandpass'; f.frequency.value = frec || 2500; f.Q.value = 0.8;
    g.gain.setValueAtTime(vol || 0.2, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(c.destination); s.start(t); s.stop(t + dur + 0.02);
  }
  function vib(p) { if (S.vibrar && raiz.navigator && navigator.vibrate) try { navigator.vibrate(p); } catch (e) {} }
  const ELEM = { fuego: [330, 'sawtooth'], agua: [392, 'sine'], tierra: [196, 'triangle'], aire: [523, 'sine'] };
  Object.assign(S, {
    toque() { tono(880, 0.05, 'square', 0.04); },
    carta(e) { chss(0.12, 0.25, 3000); const x = ELEM[e]; if (x) tono(x[0], 0.18, x[1], 0.07, 0.03); vib(15); },
    robar() { chss(0.09, 0.18, 1800); chss(0.09, 0.14, 2200, 0.08); },
    pasar() { tono(260, 0.12, 'triangle', 0.06, 0, 200); },
    error() { tono(140, 0.18, 'square', 0.06); vib([30, 40, 30]); },
    turno() { tono(660, 0.08, 'sine', 0.06); tono(990, 0.1, 'sine', 0.05, 0.07); },
    caos() { tono(55, 1.2, 'sawtooth', 0.18, 0, 30); chss(1.0, 0.3, 400); tono(1760, 0.5, 'sine', 0.05, 0.3, 220); vib([60, 40, 120, 40, 200]); },
    ganar() { [523, 659, 784, 1046].forEach((f, k) => tono(f, 0.22, 'triangle', 0.09, k * 0.1)); vib([40, 30, 40]); },
    perder() { [392, 330, 262].forEach((f, k) => tono(f, 0.25, 'triangle', 0.07, k * 0.12)); },
    corona() { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, k) => tono(f, 0.26, 'square', 0.05, k * 0.11)); vib([80, 50, 80, 50, 200]); }
  });
  raiz.Sonido = S;
})(typeof window !== 'undefined' ? window : globalThis);
