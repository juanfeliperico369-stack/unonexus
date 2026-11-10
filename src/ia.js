/* NEXUS CAOS — IA de bots. Solo usa información visible: su mano, la mesa jugada y cuántas cartas tiene cada rival.
 * Niveles: 1 Fácil (al azar) · 2 Normal (heurística) · 3 Difícil (heurística + cuenta cartas). */
(function (raiz) {
  'use strict';
  const M = raiz.Motor || (typeof require !== 'undefined' ? require('./motor.js') : null);

  // Cartas desconocidas para el jugador i (nivel 3 cuenta las vistas en mesa y las propias).
  function desconocidas(J, i, nivel) {
    const pool = { fuego: 12, tierra: 12, agua: 12, aire: 12, caos: J.cfg.caos ? 2 : 0 };
    if (nivel >= 3) {
      const resta = e => { if (pool[e] > 0) pool[e]--; };
      J.p.mesa.forEach(m => {
        if (m.k === 'carta') resta(m.e);
        else if (m.k === 'caos') resta('caos');
        else if (m.k === 'combo') M.COMBOS[m.c].e.forEach(resta);
      });
      J.jug[i].mano.forEach(c => resta(c.e));
      if (J.p.rival) J.p.rival.apartadas.forEach(c => resta(c.e));
    }
    pool.total = pool.fuego + pool.tierra + pool.agua + pool.aire + pool.caos || 1;
    return pool;
  }
  // Probabilidad de que UNA carta desconocida venza a la jugada (aprox. combos por pares).
  function probVence(J, jg, pool, h) {
    const f = e => pool[e] / pool.total;
    let q = f('caos');
    if (jg.k === 'carta') {
      for (const a of M.ELEM) if (M.VENCE[a][jg.e]) q += f(a);
      if (M.MODOS[J.modo].combos) for (const c in M.COMBOS) if (M.COMBOS[c].vence.indexOf(jg.e) >= 0) q += f(M.COMBOS[c].e[0]) * f(M.COMBOS[c].e[1]) * h;
    } else if (jg.k === 'combo') {
      for (const c in M.COMBOS) if (M.COMBOS[c].vence.indexOf(jg.c) >= 0) q += f(M.COMBOS[c].e[0]) * f(M.COMBOS[c].e[1]) * h;
    }
    return Math.min(0.99, q);
  }
  function puntuar(J, i, a, nivel) {
    const yo = J.jug[i], cartas = a.ids.map(id => yo.mano.find(c => c.id === id));
    const jg = M.formarJugada(J, cartas);
    if (jg.k === 'caos') return 1000;
    const resto = yo.mano.length - cartas.length;
    if (resto === 0) return 900;
    const pool = desconocidas(J, i, nivel);
    const sig = M.siguiente(J, i), hs = Math.max(1, J.jug[sig].mano.length);
    const bloqueo = Math.pow(1 - probVence(J, jg, pool, hs), hs);
    let amenaza = 0;
    J.jug.forEach((j, k) => { if (k !== i && !j.fuera && j.mano.length <= 1) amenaza++; });
    if (J.jug[sig].mano.length <= 1) amenaza += 1;
    // Conservar Fuego (vence a los otros 3) y conservar variedad para no quedar cerrado.
    const quedan = yo.mano.filter(c => a.ids.indexOf(c.id) < 0);
    const tipos = new Set(quedan.map(c => c.e)).size;
    const flex = quedan.reduce((s, c) => s + (c.e === 'fuego' ? 1.3 : c.e === 'caos' ? 3 : 1), 0);
    return bloqueo * (2 + amenaza * 1.5) + (cartas.length - 1) * 1.6 + flex * 0.15 + tipos * 0.2;
  }
  // Difícil: Monte Carlo con "determinización": reparte al azar las cartas que no ve (manos rivales + mazo)
  // respetando cuántas tiene cada uno, juega el resto de la partida con la heurística Normal y mide su puntaje.
  function simulada(J, i, r) {
    const K = JSON.parse(JSON.stringify(J));
    K.rs = (r() * 4294967296) >>> 0;
    const ocultas = [];
    K.jug.forEach((j, k) => { if (k !== i) ocultas.push(...j.mano); });
    ocultas.push(...K.p.mazo);
    if (K.p.rival) ocultas.push(...K.p.rival.mazo);
    for (let x = ocultas.length - 1; x > 0; x--) { const y = Math.floor(r() * (x + 1)); const t = ocultas[x]; ocultas[x] = ocultas[y]; ocultas[y] = t; }
    K.jug.forEach((j, k) => { if (k !== i) j.mano = ocultas.splice(0, j.mano.length); });
    if (K.p.rival) K.p.rival.mazo = ocultas.splice(0, K.p.rival.mazo.length);
    K.p.mazo = ocultas;
    K.jug.forEach(j => { if (j.nivel > 2) j.nivel = 2; });
    return K;
  }
  function valorFinal(K, i, antes) {
    const f = K.p.fin; if (!f) return 0;
    return (K.jug[i].puntos - antes) + (f.ganador === i ? 1 : 0);
  }
  function prng(seed) {
    let x = seed >>> 0;
    return () => { x = (x + 0x6D2B79F5) | 0; let t = Math.imul(x ^ (x >>> 15), x | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  // Números aleatorios comunes: cada iteración usa la MISMA mano simulada y la misma semilla para todas las opciones.
  function elegirMC(J, cands, r, iter) {
    const i = J.p.turno, antes = J.jug[i].puntos, suma = cands.map(() => 0);
    for (let it = 0; it < iter; it++) {
      const base = JSON.stringify(simulada(J, i, r)), sem = (r() * 4294967296) >>> 0;
      for (let c = 0; c < cands.length; c++) {
        const K = JSON.parse(base), rr = prng(sem);
        M.aplicar(K, cands[c]);
        let pasos = 0;
        while (K.p.fase !== 'fin' && pasos++ < 400) { const a = elegir(K, rr); if (!a || !M.aplicar(K, a).ok) break; }
        suma[c] += valorFinal(K, i, antes);
      }
    }
    let m = 0;
    for (let c = 1; c < cands.length; c++) if (suma[c] > suma[m]) m = c;
    return cands[m];
  }
  function elegir(J, rng) {
    const r = rng || Math.random;
    const acc = M.acciones(J);
    if (acc.length <= 1) return acc[0] || null;
    const i = J.p.turno, nivel = J.jug[i].nivel || 2;
    const jugadas = acc.filter(a => a.t === 'jugar');
    if (jugadas.length) {
      if (nivel <= 1) return jugadas[Math.floor(r() * jugadas.length)];
      if (nivel >= 3) {
        const inmediata = jugadas.find(a => { const c = J.jug[i].mano.find(x => x.id === a.ids[0]); return (c && c.e === 'caos') || J.jug[i].mano.length === a.ids.length; });
        if (inmediata) return inmediata;
        const cands = acc.length > 1 && J.p.fase === 'robado' ? acc : jugadas;
        if (cands.length > 1) return elegirMC(J, cands, r, IA.iteraciones);
      }
      let mejor = jugadas[0], ms = -Infinity;
      for (const a of jugadas) {
        const s = puntuar(J, i, a, nivel) + r() * (nivel >= 3 ? 0.01 : 0.25);
        if (s > ms) { ms = s; mejor = a; }
      }
      return mejor;
    }
    const robos = acc.filter(a => a.t === 'robar');
    if (robos.length) {
      if (nivel <= 1 || robos.length === 1) return robos[Math.floor(r() * robos.length)];
      if (nivel >= 3) return elegirMC(J, robos, r, IA.iteraciones); // Difícil: simula robar 1 o 2
      return robos[IA.roboNormal(J, i)]; // Normal: heurística
    }
    return acc.find(a => a.t === 'pasar') || acc[0];
  }
  // Normal: con 1 carta en mano roba 2 (más opciones para salir); si no, roba 1 (menos castigo si pierde).
  function roboNormal(J, i) { return J.jug[i].mano.length <= 1 ? 1 : 0; }
  const IA = { elegir, puntuar, desconocidas, roboNormal, iteraciones: 24 };
  raiz.IA = IA;
  if (typeof module !== 'undefined' && module.exports) module.exports = IA;
})(typeof window !== 'undefined' ? window : globalThis);
