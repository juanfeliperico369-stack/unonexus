/* NEXUS CAOS — Extras (v1.3): personalidades de los bots, Reto del día, Anotador de cartas físicas y Logros.
 * Se engancha a ui.js por window.NexusUI (on/disparar, VISTAS, ACC, EXTRA). No cambia las reglas. */
(function () {
  'use strict';
  const U = window.NexusUI, M = window.Motor, A = window.Arte, LS = U.LS, esc = U.esc;
  const $ = s => document.querySelector(s);
  const ELEM = M.ELEM;

  // ======================================================================
  // PERSONALIDADES: cada bot tiene un elemento y frases propias
  // ======================================================================
  const ELEM_DE = { 'Ígnea': 'fuego', 'Brasa': 'fuego', 'Lava': 'fuego', 'Marea': 'agua', 'Ola': 'agua', 'Céfiro': 'aire', 'Ráfaga': 'aire', 'Bruma': 'aire', 'Niebla': 'aire', 'Raíz': 'tierra', 'Roca': 'tierra', 'Musgo': 'tierra' };
  const FRASES = {
    fuego: { gana: ['¡Todo arde!', 'Ceniza para todos.', 'Nadie apaga esta llama.'], caos: ['¡Que arda el universo!'], ultima: ['Una chispa me queda…', 'Casi en llamas.'], fuera: ['Me apagaron…'] },
    agua: { gana: ['La marea siempre vuelve.', 'Fluir es ganar.', 'Gota a gota.'], caos: ['¡Diluvio cósmico!'], ultima: ['Una gota más…', 'Ya casi desemboco.'], fuera: ['Me evaporé.'] },
    aire: { gana: ['Ni me viste pasar.', 'Ligero como el viento.', 'Soplo y listo.'], caos: ['¡Tormenta del caos!'], ultima: ['Un soplo y termino.', 'Me lleva el viento…'], fuera: ['Me disipé…'] },
    tierra: { gana: ['Firme como roca.', 'Paciencia de montaña.', 'Echo raíces en la cima.'], caos: ['¡Terremoto!'], ultima: ['Una piedra me falta.', 'Firme hasta el final.'], fuera: ['Me desmoroné.'] }
  };
  const elementoDe = (nombre, i) => ELEM_DE[nombre] || ELEM[i % 4];
  const al = l => l[Math.floor(Math.random() * l.length)];
  function globo(i, t) {
    const G = U.G; if (!G) return;
    G.globos = G.globos || {}; G.globos[i] = { t, hasta: Date.now() + 2600 };
    clearTimeout(G.tGlobo); G.tGlobo = setTimeout(() => U.pintarMesaSegura(), 2700);
  }
  U.on('evento', (ev, v) => {
    if (!ev || ev.t !== 'jugar' || !v.jug[ev.p] || v.jug[ev.p].tipo !== 'bot') return;
    const j = v.jug[ev.p], e = elementoDe(j.nombre, ev.p);
    if (ev.jugada.k === 'caos') globo(ev.p, al(FRASES[e].caos));
    else if (j.n === 1 && v.fase !== 'fin' && Math.random() < 0.6) globo(ev.p, al(FRASES[e].ultima));
  });
  U.EXTRA.frase = v => {
    const f = v.fin; if (!f) return '';
    const g = f.ganador >= 0 ? v.jug[f.ganador] : null;
    let h = '';
    if (g && g.tipo === 'bot') h += '<p class="ital">«' + esc(al(FRASES[elementoDe(g.nombre, f.ganador)].gana)) + '» — ' + esc(g.nombre) + '</p>';
    (f.fuera || []).forEach(i => { const j = v.jug[i]; if (j.tipo === 'bot') h += '<p class="ital">«' + esc(al(FRASES[elementoDe(j.nombre, i)].fuera)) + '» — ' + esc(j.nombre) + '</p>'; });
    return h;
  };

  // ======================================================================
  // LOGROS (no desbloquean nada: todo está desbloqueado; son metas)
  // ======================================================================
  const LOGROS = [
    ['primera', 'Primera llama', 'Gana tu primera partida.', 'fuego'],
    ['caos', 'Caos total', 'Gana una partida con una carta Caos.', 'tao'],
    ['salvado', 'Salvado por el caos', 'Sálvate con la segunda carta Caos.', 'tao'],
    ['racha3', 'Racha ×3', 'Gana 3 partidas seguidas.', 'fuego'],
    ['racha5', 'Racha ×5', 'Gana 5 partidas seguidas.', 'fuego'],
    ['cuatro', 'Cuatro elementos', 'Gana una partida en la que jugaste los 4 elementos.', 'aire'],
    ['rey', 'Rey de reyes', 'Gana un juego completo.', 'tierra'],
    ['impecable', 'Impecable', 'Sé campeón sin bajar nunca de 0.', 'agua'],
    ['remontada', 'Remontada cósmica', 'Sé campeón después de haber estado en −3 o menos.', 'agua'],
    ['mesaGrande', 'Mesa grande', 'Sé campeón en una mesa de 8 o más jugadores.', 'tierra'],
    ['combo', 'Alquimista', 'Gana una partida en modo Combos.', 'fuego'],
    ['solitario', 'Contra el mazo', 'Vence al mazo en Solitario.', 'aire'],
    ['red', 'En red', 'Termina una partida por LAN o Bluetooth.', 'agua'],
    ['reto', 'Reto cumplido', 'Termina un Reto del día.', 'tierra'],
    ['constancia', 'Constancia', 'Juega el Reto del día 3 días seguidos.', 'aire'],
    ['anotador', 'Anotador oficial', 'Anota una partida jugada con las cartas físicas.', 'agua']
  ];
  const tengo = () => LS.get('logros', {});
  const cola = [];
  function logro(id) {
    const t = tengo(); if (t[id]) return;
    const L = LOGROS.find(x => x[0] === id); if (!L) return;
    t[id] = new Date().toISOString(); LS.set('logros', t);
    cola.push(L); if (cola.length === 1) mostrarLogro();
  }
  function mostrarLogro() {
    const L = cola[0]; if (!L) return;
    const d = document.createElement('div');
    d.className = 'logro-toast'; d.setAttribute('role', 'status');
    d.innerHTML = A.alq(L[3]) + '<div><small>Logro desbloqueado</small><b>' + esc(L[1]) + '</b></div>';
    document.body.appendChild(d); U.SND.turno();
    setTimeout(() => { d.remove(); cola.shift(); mostrarLogro(); }, 2800);
  }
  U.VISTAS.logros = () => {
    const t = tengo(), n = LOGROS.filter(x => t[x[0]]).length;
    return '<div class="pag">' + U.franja('Logros', n + ' de ' + LOGROS.length) + '<div class="cuerpo"><h2 class="tit">TUS <span class="rojo">LOGROS</span></h2>' +
      '<p class="ital">Metas para presumir. No desbloquean nada: en Nexus Caos todo está disponible desde el principio.</p><div class="logros">' +
      LOGROS.map(L => '<div class="logro' + (t[L[0]] ? ' si' : '') + '">' + A.alq(L[3]) + '<div><b>' + esc(L[1]) + '</b><span>' + esc(L[2]) + '</span>' +
        (t[L[0]] ? '<small>' + esc(String(t[L[0]]).slice(0, 10)) + '</small>' : '') + '</div></div>').join('') +
      '</div><button class="btn" data-a="inicio">Volver</button></div></div>';
  };
  U.ACC.logros = () => U.ir('logros');
  U.on('finPartida', d => {
    const v = d.v, f = v.fin; if (!f) return;
    const loc = d.locales, gano = loc.indexOf(f.ganador) >= 0;
    if (v.modo === 'solitario') { if (f.ganador === 0) logro('solitario'); return; }
    if (gano) {
      logro('primera');
      if (f.tipo === 'caos') logro('caos');
      if (f.racha >= 3) logro('racha3');
      if (f.racha >= 5) logro('racha5');
      if (v.modo === 'combos') logro('combo');
      if (ELEM.every(e => d.jugados[e])) logro('cuatro');
    }
    if (f.tipo === 'caos' && !gano && loc.some(i => (f.cartas[i] || []).indexOf('caos') >= 0)) logro('salvado');
    if (d.red) logro('red');
    if (d.G) { const m = Math.min.apply(null, loc.map(i => v.jug[i].puntos)); d.G.minPts = Math.min(d.G.minPts == null ? 0 : d.G.minPts, m); }
    if (d.G && d.G.reto) retoPartida(d);
  });
  U.on('finJuego', d => {
    const v = d.v;
    if (d.locales.indexOf(v.campeon) >= 0) {
      logro('rey');
      if (v.jug.length >= 8) logro('mesaGrande');
      const mn = d.G ? d.G.minPts : null;
      if (mn != null && mn >= 0) logro('impecable');
      if (mn != null && mn <= -3) logro('remontada');
    }
    if (d.G && d.G.reto) retoFin(d);
  });

  // ======================================================================
  // RETO DEL DÍA: mismas barajas para todos ese día (semilla = fecha), resultado para compartir
  // ======================================================================
  const INICIO = Date.UTC(2026, 10, 4); // Reto #1 = 2026-11-04
  const BOTS = ['Ígnea', 'Marea', 'Céfiro'];
  const fecha = (dd) => { const d = dd || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const ayer = () => { const d = new Date(); d.setDate(d.getDate() - 1); return fecha(d); };
  const numero = f => Math.floor((Date.UTC(+f.slice(0, 4), +f.slice(5, 7) - 1, +f.slice(8, 10)) - INICIO) / 86400000) + 1;
  function semilla(t) { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function prng(seed) {
    let x = seed >>> 0;
    return () => { x = (x + 0x6D2B79F5) | 0; let t = Math.imul(x ^ (x >>> 15), x | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function estado() {
    const f = fecha(); let r = LS.get('reto', null);
    if (!r || r.fecha !== f) r = { fecha: f, num: numero(f), hist: [], resultado: null, intentos: 0 };
    return r;
  }
  function jugarReto(practica) {
    const r = estado(), s = semilla('nexus-caos-' + r.fecha);
    if (!practica && !r.resultado) { r.intentos++; r.hist = []; LS.set('reto', r); }
    U.iniciar({ modo: 'clasico', jugadores: [{ nombre: U.AJ.nombre, tipo: 'humano' }].concat(BOTS.map(n => ({ nombre: n, tipo: 'bot', nivel: 2 }))), dir: 1, castigoCaos: 'cartas', semilla: s },
      null, { reto: (practica || r.resultado) ? null : r.fecha, rngIA: prng(s ^ 0x5bd1e995) });
  }
  U.on('continuar', G => { if (G.reto) { if (G.reto !== fecha()) G.reto = null; else G.rngIA = prng(semilla('nexus-caos-' + G.reto) ^ G.J.np); } });
  function retoPartida(d) {
    const r = estado(); if (d.G.reto !== r.fecha || r.resultado) return;
    const f = d.v.fin, yo = 0, dl = f.delta[yo];
    r.hist.push(f.ganador === yo ? (f.tipo === 'caos' ? '🌀' : '🟩') : (f.fuera.indexOf(yo) >= 0 ? '💀' : f.tipo === 'caos' ? '⬛' : dl < 0 ? '🟥' : '🟨'));
    LS.set('reto', r);
  }
  function retoFin(d) {
    const r = estado(); if (d.G.reto !== r.fecha || r.resultado) return;
    const v = d.v, yo = v.jug[0];
    const orden = v.jug.map((j, i) => ({ i, p: j.fuera ? -99 + j.puntos : j.puntos })).sort((a, b) => b.p - a.p);
    r.resultado = { campeon: v.campeon === 0, puntos: yo.puntos, partidas: v.np, fuera: yo.fuera, puesto: orden.findIndex(o => o.i === 0) + 1, ganador: v.campeon >= 0 ? v.jug[v.campeon].nombre : null };
    LS.set('reto', r);
    const R = LS.get('retoRacha', { ultima: null, dias: 0, mejor: 0 });
    if (R.ultima !== r.fecha) { R.dias = R.ultima === ayer() ? R.dias + 1 : 1; R.ultima = r.fecha; R.mejor = Math.max(R.mejor || 0, R.dias); LS.set('retoRacha', R); }
    logro('reto'); if (R.dias >= 3) logro('constancia');
  }
  function textoReto(r) {
    const x = r.resultado, R = LS.get('retoRacha', { dias: 0 });
    const linea = x.campeon ? '👑 Campeón en ' + x.partidas + ' partidas · ' + x.puntos + ' pts'
      : x.fuera ? '💀 Descalificado en la partida ' + x.partidas
      : (x.puesto === 2 ? '🥈' : x.puesto === 3 ? '🥉' : '✦') + ' ' + x.puesto + '.º lugar · ' + x.puntos + (Math.abs(x.puntos) === 1 ? ' pt' : ' pts') + ' · ganó ' + (x.ganador || 'nadie');
    return 'NEXUS CAOS · Reto #' + r.num + ' ✦\n' + linea + '\n' + r.hist.join('') + (R.dias > 1 ? '\nRacha: ' + R.dias + ' días 🔥' : '') + '\n' + U.URL_JUEGO;
  }
  function compartir(t) {
    if (window.AndroidApp && window.AndroidApp.compartir) { try { window.AndroidApp.compartir(t); return; } catch (e) {} }
    if (navigator.share) { navigator.share({ title: 'Nexus Caos', text: t }).catch(() => {}); return; }
    window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank', 'noopener');
  }
  function copiar(t) {
    const ok = () => U.aviso('Resultado copiado');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, () => U.aviso('No se pudo copiar'));
    else { const x = document.createElement('textarea'); x.value = t; document.body.appendChild(x); x.select(); try { document.execCommand('copy'); ok(); } catch (e) {} x.remove(); }
  }
  function resultadoHTML(r) {
    return '<div class="caja reto-res"><pre>' + esc(textoReto(r)) + '</pre></div>' +
      '<div class="fila-btn"><button class="btn rj" data-a="retoCompartir">Compartir</button><button class="btn" data-a="retoCopiar">Copiar</button></div>';
  }
  U.VISTAS.reto = () => {
    const r = estado(), R = LS.get('retoRacha', { dias: 0, mejor: 0, ultima: null });
    const racha = R.ultima === r.fecha || R.ultima === ayer() ? R.dias : 0;
    const guard = LS.get('partida', null), enCurso = guard && guard.reto === r.fecha && !r.resultado;
    const fin = new Date(); fin.setHours(24, 0, 0, 0);
    const faltan = Math.max(0, fin - new Date()), hh = Math.floor(faltan / 3600000), mm = Math.floor(faltan % 3600000 / 60000);
    let h = '<div class="pag">' + U.franja('Reto del día', '#' + r.num) + '<div class="cuerpo"><h2 class="tit">RETO DEL <span class="rojo">DÍA</span></h2>' +
      '<p class="ital">Hoy todos juegan con las mismas barajas: tú contra Ígnea, Marea y Céfiro en modo clásico. Llega a 10 antes que nadie y comparte tu resultado.</p>' +
      '<div class="pelicula">Reto #' + r.num + ' · ' + r.fecha + ' · racha ' + racha + ' día' + (racha === 1 ? '' : 's') + ' · mejor ' + (R.mejor || 0) + '</div>';
    if (r.resultado) h += '<h3 class="tit">Tu resultado</h3>' + resultadoHTML(r) + '<p class="maq">Próximo reto en ' + hh + ' h ' + mm + ' min</p><button class="btn" data-a="retoPractica">Practicar <small>no cuenta</small></button>';
    else if (enCurso) h += '<button class="btn ms" data-a="continuar">Continuar reto</button>';
    else h += '<button class="btn ms" data-a="retoJugar">Jugar el reto</button><p class="nota">Cuenta el primer juego que termines hoy.</p>';
    h += '<p class="nota">🟩 ganaste · 🌀 ganaste con Caos · 🟨 sin cambio · 🟥 perdiste puntos · ⬛ Caos de un rival · 💀 quedaste fuera</p>';
    return h + '<button class="btn" data-a="inicio">Volver</button></div></div>';
  };
  U.EXTRA.campeon = v => {
    const G = U.G, r = estado();
    if (!G || !G.reto || G.reto !== r.fecha || !r.resultado) return '';
    return '<h3 class="tit">Reto #' + r.num + '</h3>' + resultadoHTML(r);
  };
  Object.assign(U.ACC, {
    reto: () => U.ir('reto'),
    retoJugar: () => jugarReto(false),
    retoPractica: () => jugarReto(true),
    retoCompartir: () => compartir(textoReto(estado())),
    retoCopiar: () => copiar(textoReto(estado()))
  });

  // ======================================================================
  // ANOTADOR para las cartas físicas (reemplaza la "hoja para anotar puntajes" del documento)
  // ======================================================================
  let NUEVO = { modo: 'clasico', castigo: 'cartas', nombres: ['Jugador 1', 'Jugador 2', 'Jugador 3', 'Jugador 4'] };
  let FORM = null; // partida que se está anotando
  const leer = () => LS.get('anotador', null);
  function recalcular(T) {
    T.jug.forEach(j => { j.puntos = 0; j.ganadas = 0; j.fuera = false; });
    T.terminado = false; T.campeon = -1; T.reparte = -1; T.inicia = -1;
    T.hist.forEach(h => {
      const R = M.puntuarPartida(T.modo, T.castigo, h.tipo, h.g, T.jug.map((j, i) => ({ puntos: j.puntos, fuera: j.fuera, n: h.n[i] || 0, caos: !!h.caos[i] })));
      h.delta = R.delta;
      T.jug.forEach((j, i) => { j.puntos = R.puntos[i]; });
      R.fuera.forEach(i => { T.jug[i].fuera = true; });
      if (h.g >= 0) T.jug[h.g].ganadas++;
      T.reparte = R.reparte; T.inicia = h.g >= 0 && !T.jug[h.g].fuera ? h.g : -1;
      if (R.terminado) { T.terminado = true; T.campeon = R.campeon; }
    });
    return T;
  }
  U.VISTAS.anotador = () => {
    const T = leer();
    let h = '<div class="pag">' + U.franja('Anotador', 'Cartas físicas') + '<div class="cuerpo"><h2 class="tit">LA HOJA DE <span class="rojo">PUNTAJES</span></h2>';
    if (!T) {
      const MD = M.MODOS[NUEVO.modo];
      h += '<p class="ital">¿Juegan con las cartas de verdad? Anota aquí cada partida: el juego calcula los puntos, quién queda fuera, quién reparte y quién inicia.</p>' +
        '<span class="campo">Modo</span>' + [['clasico', 'Clásico'], ['familiar', 'Familiar'], ['combos', 'Combos']].map(([k, n]) => '<button class="chip' + (NUEVO.modo === k ? ' on' : '') + '" data-a="anModo" data-v="' + k + '">' + n + '</button>').join('') +
        (NUEVO.modo === 'clasico' ? '<span class="campo">Castigo con Caos</span>' + [['cartas', 'Según cartas'], ['fijo', '−3 a todos']].map(([k, n]) => '<button class="chip' + (NUEVO.castigo === k ? ' on' : '') + '" data-a="anCastigo" data-v="' + k + '">' + n + '</button>').join('') : '') +
        '<span class="campo">Jugadores (' + NUEVO.nombres.length + ' de 2–' + MD.max + ')</span>' +
        NUEVO.nombres.map((n, i) => '<div class="asiento" style="grid-template-columns:1fr auto"><input data-c="anNombre" data-i="' + i + '" value="' + esc(n) + '" maxlength="16" aria-label="Nombre">' +
          '<button class="mini-btn" data-a="anQuitar" data-i="' + i + '"' + (NUEVO.nombres.length <= 2 ? ' disabled' : '') + '>✕</button></div>').join('') +
        '<button class="btn" data-a="anMas"' + (NUEVO.nombres.length >= MD.max ? ' disabled' : '') + '>+ Jugador</button>' +
        '<button class="btn rj" data-a="anEmpezar">Empezar a anotar</button>';
    } else {
      const MD = M.MODOS[T.modo], min = MD.desc ? M.DESCALIFICA : 0;
      if (T.terminado) h += '<div class="caja roja" style="text-align:center"><span class="maq">Fin del juego</span><div class="corona" style="font-size:2.6rem">REY DE REYES</div><b class="fd" style="font-size:1.6rem">' + (T.campeon >= 0 ? esc(T.jug[T.campeon].nombre) : 'Sin campeón') + '</b></div>';
      h += '<p class="maq">' + MD.n + (T.modo === 'clasico' ? ' · Caos ' + (T.castigo === 'fijo' ? '−3' : 'según cartas') : '') + ' · partida ' + (T.hist.length + (T.terminado ? 0 : 1)) + '</p>';
      h += '<table class="res"><tr><th>Jugador</th><th style="text-align:right">Total</th></tr>' + T.jug.map((j, i) => {
        const pos = Math.max(0, Math.min(100, (j.puntos - min) / (M.META - min) * 100));
        return '<tr class="' + (j.fuera ? 'fuera' : '') + (i === T.campeon ? ' gana' : '') + '"><td>' + esc(j.nombre) + ' <small>★' + j.ganadas + (j.fuera ? ' · FUERA' : '') + '</small><div class="camino' + (MD.desc ? '' : ' sin-desc') + '"><i style="left:' + pos.toFixed(1) + '%"></i></div></td><td class="tot">' + j.puntos + '</td></tr>';
      }).join('') + '</table>';
      if (!T.terminado && T.hist.length) h += '<p class="maq">Reparte: ' + (T.reparte >= 0 ? esc(T.jug[T.reparte].nombre) : '—') + ' · Inicia: ' + (T.inicia >= 0 ? esc(T.jug[T.inicia].nombre) : 'el siguiente') + '</p>';
      if (!T.terminado) h += '<button class="btn rj" data-a="anAnotar">Anotar partida</button>';
      if (T.hist.length) {
        h += '<h3 class="tit">Partidas</h3><table class="res">' + T.hist.slice().reverse().slice(0, 8).map((x, k) => {
          const num = T.hist.length - k, gn = x.g >= 0 ? T.jug[x.g].nombre : null;
          return '<tr><td>' + num + '</td><td>' + (x.g < 0 ? 'Cierre por lógica' : (x.tipo === 'caos' ? 'Caos de ' : 'Ganó ') + esc(gn)) + '</td><td class="d">' + x.delta.map(d => d > 0 ? '+' + d : d).join(' ') + '</td></tr>';
        }).join('') + '</table><button class="btn" data-a="anDeshacer">Deshacer la última</button>';
      }
      h += '<div class="fila-btn"><button class="btn" data-a="anReiniciar">Nuevo juego</button><button class="btn" data-a="anOtros">Otros jugadores</button></div>';
    }
    return h + '<button class="btn" data-a="inicio">Volver</button></div></div>';
  };
  function formHTML() {
    const T = leer(), MD = M.MODOS[T.modo], act = T.jug.map((j, i) => i).filter(i => !T.jug[i].fuera);
    let h = '<div class="cuerpo"><h2 class="tit">ANOTAR <span class="rojo">PARTIDA</span></h2><span class="campo">¿Cómo terminó?</span>' +
      act.map(i => '<button class="chip' + (FORM.g === i ? ' on' : '') + '" data-a="anG" data-v="' + i + '">Ganó ' + esc(T.jug[i].nombre) + '</button>').join('') +
      '<button class="chip' + (FORM.g === -1 ? ' on' : '') + '" data-a="anG" data-v="-1">Cierre (nadie)</button>';
    if (FORM.g != null && FORM.g >= 0 && MD.caos) h += '<span class="campo">¿Con carta Caos?</span><button class="chip' + (!FORM.caos ? ' on' : '') + '" data-a="anCaos" data-v="0">No</button><button class="chip' + (FORM.caos ? ' on' : '') + '" data-a="anCaos" data-v="1">Sí, con Caos (+5)</button>';
    if (FORM.g != null) {
      h += '<span class="campo">Cartas que le quedaron a cada uno</span>';
      act.filter(i => i !== FORM.g).forEach(i => {
        h += '<div class="anota"><b>' + esc(T.jug[i].nombre) + '</b><div>';
        for (let n = 1; n <= (Number.isFinite(MD.tope) ? MD.tope : 8); n++) h += '<button class="chip' + (FORM.n[i] === n ? ' on' : '') + '" data-a="anN" data-i="' + i + '" data-v="' + n + '">' + n + '</button>';
        if (FORM.caos) h += '<button class="chip' + (FORM.otra === i ? ' on' : '') + '" data-a="anOtra" data-i="' + i + '">Tiene la otra Caos</button>';
        h += '</div></div>';
      });
    }
    const listo = FORM.g != null && act.filter(i => i !== FORM.g).every(i => FORM.n[i] >= 1);
    if (listo) {
      const R = M.puntuarPartida(T.modo, T.castigo, FORM.caos ? 'caos' : 'normal', FORM.g, T.jug.map((j, i) => ({ puntos: j.puntos, fuera: j.fuera, n: FORM.n[i] || 0, caos: FORM.otra === i })));
      h += '<div class="pelicula">' + act.map(i => esc(T.jug[i].nombre) + ' ' + (R.delta[i] > 0 ? '+' : '') + R.delta[i]).join(' · ') + '</div>';
    }
    return h + '<button class="btn rj" data-a="anGuardar"' + (listo ? '' : ' disabled') + '>Guardar partida</button><button class="btn" data-a="cerrar">Cancelar</button></div>';
  }
  Object.assign(U.ACC, {
    anotador: () => U.ir('anotador'),
    anModo: b => { NUEVO.modo = b.dataset.v; const mx = M.MODOS[NUEVO.modo].max; if (NUEVO.nombres.length > mx) NUEVO.nombres.length = mx; U.pintar(); },
    anCastigo: b => { NUEVO.castigo = b.dataset.v; U.pintar(); },
    anMas: () => { NUEVO.nombres.push('Jugador ' + (NUEVO.nombres.length + 1)); U.pintar(); },
    anQuitar: b => { NUEVO.nombres.splice(+b.dataset.i, 1); U.pintar(); },
    anEmpezar: () => {
      const nombres = NUEVO.nombres.map((n, i) => String(n || '').trim().slice(0, 16) || 'Jugador ' + (i + 1));
      LS.set('anotador', recalcular({ modo: NUEVO.modo, castigo: NUEVO.modo === 'clasico' ? NUEVO.castigo : 'cartas', jug: nombres.map(n => ({ nombre: n, puntos: 0, ganadas: 0, fuera: false })), hist: [] }));
      U.pintar();
    },
    anAnotar: () => { FORM = { g: null, caos: false, n: {}, otra: -1 }; U.capa(formHTML()); },
    anG: b => { FORM.g = +b.dataset.v; if (FORM.g < 0) FORM.caos = false; delete FORM.n[FORM.g]; if (FORM.otra === FORM.g) FORM.otra = -1; U.capa(formHTML()); },
    anCaos: b => { FORM.caos = b.dataset.v === '1'; if (!FORM.caos) FORM.otra = -1; U.capa(formHTML()); },
    anN: b => { FORM.n[+b.dataset.i] = +b.dataset.v; U.capa(formHTML()); },
    anOtra: b => { const i = +b.dataset.i; FORM.otra = FORM.otra === i ? -1 : i; U.capa(formHTML()); },
    anGuardar: () => {
      const T = leer(); if (!T || T.terminado || FORM.g == null) return;
      const n = T.jug.map((j, i) => i === FORM.g || j.fuera ? 0 : (FORM.n[i] || 0)), caos = T.jug.map((j, i) => FORM.otra === i);
      T.hist.push({ tipo: FORM.caos ? 'caos' : (FORM.g < 0 ? 'cierre' : 'normal'), g: FORM.g, n, caos });
      recalcular(T); LS.set('anotador', T);
      U.cerrarCapa(); logro('anotador');
      if (T.terminado) { U.SND.corona(); U.aviso('¡' + (T.campeon >= 0 ? T.jug[T.campeon].nombre : 'Nadie') + ' es el rey de reyes!'); } else U.aviso('Partida anotada');
      U.pintar();
    },
    anDeshacer: () => { const T = leer(); if (!T || !T.hist.length) return; T.hist.pop(); LS.set('anotador', recalcular(T)); U.pintar(); },
    anReiniciar: () => { const T = leer(); if (!T || !confirm('¿Empezar un juego nuevo con los mismos jugadores?')) return; T.hist = []; LS.set('anotador', recalcular(T)); U.pintar(); },
    anOtros: () => { const T = leer(); if (T) NUEVO = { modo: T.modo, castigo: T.castigo, nombres: T.jug.map(j => j.nombre) }; LS.del('anotador'); U.pintar(); }
  });
  document.addEventListener('change', e => { const t = e.target; if (t.dataset && t.dataset.c === 'anNombre') NUEVO.nombres[+t.dataset.i] = t.value.slice(0, 16); });

  // ======================================================================
  // INICIO: botones nuevos
  // ======================================================================
  U.EXTRA.inicio1 = () => {
    const r = estado();
    return '<button class="btn ms" data-a="reto">Reto del día #' + r.num + ' <small>' + (r.resultado ? '✓ ' + (r.resultado.campeon ? 'campeón' : r.resultado.puesto + '.º lugar') : 'mismo mazo para todos') + '</small></button>';
  };
  U.EXTRA.inicio2 = () => {
    const n = Object.keys(tengo()).length;
    return '<div class="fila-btn"><button class="btn" data-a="anotador">Anotador</button><button class="btn" data-a="logros">Logros ' + n + '/' + LOGROS.length + '</button></div>';
  };
  window.NexusExtras = { LOGROS, logro, textoReto, estadoReto: estado, numeroReto: numero, semillaReto: semilla, recalcular };
})();
