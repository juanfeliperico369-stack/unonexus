/* NEXUS CAOS — QR propio (sin librerías): codificador modo byte, nivel M, versiones 1–40 (algoritmo estándar ISO 18004).
 * QR.svg(texto) → '<svg …>'.  QRScan: lector con la cámara vía BarcodeDetector (Android/Chrome); si no existe, se pega el código. */
(function (raiz) {
  'use strict';
  const ECC = [ // [nivel][versión] — L, M
    [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28]
  ];
  const BLOQUES = [
    [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49]
  ];
  const FORMATO = [1, 0]; // bits de formato de L y M
  const bit = (x, i) => ((x >>> i) & 1) !== 0;
  function modulosCrudos(v) {
    let r = (16 * v + 128) * v + 64;
    if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; }
    return r;
  }
  const datosCW = (v, e) => Math.floor(modulosCrudos(v) / 8) - ECC[e][v] * BLOQUES[e][v];
  function rsMul(x, y) { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z; }
  function rsDivisor(g) {
    const r = new Array(g).fill(0); r[g - 1] = 1; let raiz2 = 1;
    for (let i = 0; i < g; i++) { for (let j = 0; j < r.length; j++) { r[j] = rsMul(r[j], raiz2); if (j + 1 < r.length) r[j] ^= r[j + 1]; } raiz2 = rsMul(raiz2, 2); }
    return r;
  }
  function rsResto(datos, div) {
    const r = div.map(() => 0);
    for (const b of datos) { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => { r[i] ^= rsMul(c, f); }); }
    return r;
  }
  function codificar(texto, e) {
    e = e == null ? 1 : e;
    const bytes = Array.from(new TextEncoder().encode(texto));
    let v = 1;
    for (; v <= 40; v++) { const cc = v < 10 ? 8 : 16; if (4 + cc + bytes.length * 8 <= datosCW(v, e) * 8) break; }
    if (v > 40) throw new Error('Texto demasiado largo para QR');
    const bits = [];
    const pon = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    pon(4, 4); pon(bytes.length, v < 10 ? 8 : 16); bytes.forEach(b => pon(b, 8));
    const cap = datosCW(v, e) * 8;
    pon(0, Math.min(4, cap - bits.length)); pon(0, (8 - bits.length % 8) % 8);
    for (let p = 0xEC; bits.length < cap; p ^= 0xEC ^ 0x11) pon(p, 8);
    const datos = []; for (let i = 0; i < bits.length; i += 8) { let b = 0; for (let k = 0; k < 8; k++) b = (b << 1) | bits[i + k]; datos.push(b); }
    // ECC + intercalado
    const nb = BLOQUES[e][v], el = ECC[e][v], crudos = Math.floor(modulosCrudos(v) / 8), cortos = nb - crudos % nb, lc = Math.floor(crudos / nb);
    const bl = [], div = rsDivisor(el);
    for (let i = 0, k = 0; i < nb; i++) {
      const d = datos.slice(k, k + lc - el + (i < cortos ? 0 : 1)); k += d.length;
      const ec = rsResto(d, div); if (i < cortos) d.push(0); bl.push(d.concat(ec));
    }
    const final = [];
    for (let i = 0; i < bl[0].length; i++) bl.forEach((b, j) => { if (i !== lc - el || j >= cortos) final.push(b[i]); });
    // matriz
    const n = v * 4 + 17, mod = [], fun = [];
    for (let y = 0; y < n; y++) { mod.push(new Array(n).fill(false)); fun.push(new Array(n).fill(false)); }
    const pf = (x, y, d) => { mod[y][x] = d; fun[y][x] = true; };
    for (let i = 0; i < n; i++) { pf(6, i, i % 2 === 0); pf(i, 6, i % 2 === 0); }
    const buscador = (x, y) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.max(Math.abs(dx), Math.abs(dy)), xx = x + dx, yy = y + dy; if (xx >= 0 && xx < n && yy >= 0 && yy < n) pf(xx, yy, d !== 2 && d !== 4); } };
    buscador(3, 3); buscador(n - 4, 3); buscador(3, n - 4);
    const al = [];
    if (v > 1) { const na = Math.floor(v / 7) + 2, paso = Math.floor((v * 8 + na * 3 + 5) / (na * 4 - 4)) * 2; al.push(6); for (let p = n - 7; al.length < na; p -= paso) al.splice(1, 0, p); }
    for (let i = 0; i < al.length; i++) for (let j = 0; j < al.length; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) pf(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
    const formato = m => {
      const d = FORMATO[e] << 3 | m; let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const b = (d << 10 | r) ^ 0x5412;
      for (let i = 0; i <= 5; i++) pf(8, i, bit(b, i));
      pf(8, 7, bit(b, 6)); pf(8, 8, bit(b, 7)); pf(7, 8, bit(b, 8));
      for (let i = 9; i < 15; i++) pf(14 - i, 8, bit(b, i));
      for (let i = 0; i < 8; i++) pf(n - 1 - i, 8, bit(b, i));
      for (let i = 8; i < 15; i++) pf(8, n - 15 + i, bit(b, i));
      pf(8, n - 8, true);
    };
    formato(0);
    if (v >= 7) {
      let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
      const b = v << 12 | r;
      for (let i = 0; i < 18; i++) { const c = bit(b, i), a = n - 11 + i % 3, bb = Math.floor(i / 3); pf(a, bb, c); pf(bb, a, c); }
    }
    let i = 0;
    for (let der = n - 1; der >= 1; der -= 2) {
      if (der === 6) der = 5;
      for (let vert = 0; vert < n; vert++) for (let j = 0; j < 2; j++) {
        const x = der - j, arriba = ((der + 1) & 2) === 0, y = arriba ? n - 1 - vert : vert;
        if (!fun[y][x] && i < final.length * 8) { mod[y][x] = bit(final[i >>> 3], 7 - (i & 7)); i++; }
      }
    }
    const MASC = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
      (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => x * y % 2 + x * y % 3 === 0,
      (x, y) => (x * y % 2 + x * y % 3) % 2 === 0, (x, y) => ((x + y) % 2 + x * y % 3) % 2 === 0];
    const aplicarM = m => { for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!fun[y][x] && MASC[m](x, y)) mod[y][x] = !mod[y][x]; };
    const castigo = () => {
      let p = 0, oscuros = 0;
      const lineas = [];
      for (let y = 0; y < n; y++) { let f = '', c = ''; for (let x = 0; x < n; x++) { f += mod[y][x] ? 1 : 0; c += mod[x][y] ? 1 : 0; if (mod[y][x]) oscuros++; } lineas.push(f, c); }
      for (const l of lineas) {
        const m = l.match(/0{5,}|1{5,}/g); if (m) m.forEach(s => { p += s.length - 2; });
        const q = ('0000' + l + '0000').match(/(?=10111010000|00001011101)/g); if (q) p += q.length * 40;
      }
      for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) { const c = mod[y][x]; if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) p += 3; }
      p += Math.floor(Math.abs(oscuros * 20 - n * n * 10) / (n * n)) * 10;
      return p;
    };
    let mejor = 0, mp = Infinity;
    for (let m = 0; m < 8; m++) { aplicarM(m); formato(m); const c = castigo(); if (c < mp) { mp = c; mejor = m; } aplicarM(m); }
    aplicarM(mejor); formato(mejor);
    return mod;
  }
  function svg(texto) {
    const m = codificar(texto, 1), n = m.length, q = 4;
    let d = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x]) d += 'M' + (x + q) + ' ' + (y + q) + 'h1v1h-1z';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + (n + 2 * q) + ' ' + (n + 2 * q) + '" shape-rendering="crispEdges" role="img" aria-label="Código QR"><rect width="100%" height="100%" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
  }
  raiz.QR = { codificar, svg };
  const QRScan = {
    st: null, t: 0,
    disponible: () => typeof raiz.BarcodeDetector !== 'undefined' && !!(raiz.navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    async iniciar(video, ok, mal) {
      try {
        const det = new raiz.BarcodeDetector({ formats: ['qr_code'] });
        const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        QRScan.st = st; video.srcObject = st; await video.play();
        const tick = async () => {
          if (!QRScan.st) return;
          try { const r = await det.detect(video); if (r.length && r[0].rawValue) { const v = r[0].rawValue; QRScan.parar(); ok(v); return; } } catch (e) {}
          QRScan.t = setTimeout(tick, 250);
        };
        tick();
      } catch (e) { mal(e && e.message ? e.message : String(e)); }
    },
    parar() { clearTimeout(QRScan.t); if (QRScan.st) { QRScan.st.getTracks().forEach(t => t.stop()); QRScan.st = null; } }
  };
  raiz.QRScan = QRScan;
  if (typeof module !== 'undefined' && module.exports) module.exports = raiz.QR;
})(typeof window !== 'undefined' ? window : globalThis);
