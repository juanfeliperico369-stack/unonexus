/* NEXUS CAOS — Motor de reglas (sin interfaz, sin DOM).
 * Fuente de verdad de las reglas del documento "NEXUS CAOS" (ver docs/GUIA.md §Reglas).
 * Estado 100% serializable a JSON (sirve para guardar partida y para LAN).
 * API: crearJuego, nuevaPartida, acciones, esValida, aplicar, vista, verificar, cima, siguiente, formarJugada, vence. */
(function (raiz) {
  'use strict';
  const ELEM = ['fuego', 'tierra', 'agua', 'aire'];
  const NOMBRE = { fuego: 'Fuego', tierra: 'Tierra', agua: 'Agua', aire: 'Aire', caos: 'Caos' };
  // REGLAS DE ORDEN (documento): atacante -> { defensor: verbo }. Mismo elemento NO vence.
  const VENCE = {
    fuego: { aire: 'Arde', agua: 'Evapora', tierra: 'Incendia' },
    tierra: { agua: 'Absorbe', fuego: 'Apaga' },
    agua: { fuego: 'Apaga', tierra: 'Debilita' },
    aire: { tierra: 'Seca', fuego: 'Apaga' }
  };
  // MODO COMBOS (documento, tabla literal). "vence" mezcla ids de combo y elementos sueltos.
  const COMBOS = {
    oxigeno: { n: 'Oxígeno maligno', e: ['aire', 'fuego'], vence: ['lodo', 'aire', 'tormenta'] },
    lodo: { n: 'Lodo', e: ['agua', 'tierra'], vence: ['fogata', 'tierra', 'fuego'] },
    fogata: { n: 'Fogata máxima', e: ['tierra', 'fuego'], vence: ['aire', 'tierra'] },
    evaporacion: { n: 'Evaporación masiva', e: ['agua', 'fuego'], vence: ['vendaval'] },
    vendaval: { n: 'Vendaval', e: ['aire', 'tierra'], vence: ['fuego'] },
    tormenta: { n: 'Tormenta', e: ['aire', 'agua'], vence: ['vendaval'] }
  };
  const COMBO_DE = {};
  for (const k in COMBOS) COMBO_DE[COMBOS[k].e.slice().sort().join('+')] = k;

  // mano: cartas al repartir · tope: máximo en mano · desc: descalifica en -5 · piso: marcador no baja de 0
  const MODOS = {
    clasico: { n: 'Clásico', min: 2, max: 12, mano: 3, tope: 3, caos: true, combos: false, desc: true, piso: false },
    familiar: { n: 'Familiar y niños', min: 2, max: 12, mano: 3, tope: 3, caos: false, combos: false, desc: false, piso: true },
    combos: { n: 'Combos', min: 2, max: 6, mano: 6, tope: 9, caos: false, combos: true, desc: true, piso: false },
    solitario: { n: 'Solitario', min: 1, max: 1, mano: 3, tope: 3, caos: true, combos: false, desc: false, piso: false }
  };
  const META = 10, DESCALIFICA = -5;

  // ---------- azar reproducible (mulberry32, estado en J.rs) ----------
  function rnd(J) {
    let t = (J.rs = (J.rs + 0x6D2B79F5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function barajar(J, a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd(J) * (i + 1)); const x = a[i]; a[i] = a[j]; a[j] = x; }
    return a;
  }
  function crearMazo(conCaos) {
    const m = []; let id = 0;
    for (const e of ELEM) for (let i = 0; i < 12; i++) m.push({ id: id++, e });
    if (conCaos) { m.push({ id: 48, e: 'caos' }); m.push({ id: 49, e: 'caos' }); }
    return m;
  }

  // ---------- utilidades ----------
  function activos(J) { const r = []; J.jug.forEach((j, i) => { if (!j.fuera) r.push(i); }); return r; }
  function siguiente(J, i) {
    const n = J.jug.length;
    for (let k = 1; k <= n; k++) { const x = (((i + J.cfg.dir * k) % n) + n) % n; if (!J.jug[x].fuera) return x; }
    return i;
  }
  function cima(p) { return p.mesa[p.mesa.length - 1]; }
  function tope(J) { return MODOS[J.modo].tope; }

  // Convierte cartas elegidas en una jugada (o null si no es jugada posible en este modo).
  function formarJugada(J, cartas) {
    if (!cartas || !cartas.length || cartas.some(c => !c)) return null;
    if (cartas.length === 1) return cartas[0].e === 'caos' ? { k: 'caos' } : { k: 'carta', e: cartas[0].e };
    if (cartas.length === 2 && MODOS[J.modo].combos) {
      const a = cartas[0].e, b = cartas[1].e;
      if (a === b || a === 'caos' || b === 'caos') return null;
      const c = COMBO_DE[[a, b].sort().join('+')];
      return c ? { k: 'combo', c } : null;
    }
    return null;
  }
  // ¿La jugada j se sobrepone a la carta/combo de la mesa?
  function vence(j, top) {
    if (!j || !top) return false;
    if (j.k === 'caos') return true; // Caos vence a todo: victoria inmediata
    if (j.k === 'carta') return top.k === 'carta' && !!VENCE[j.e][top.e];
    const lista = COMBOS[j.c].vence;
    return top.k === 'combo' ? lista.indexOf(top.c) >= 0 : lista.indexOf(top.e) >= 0;
  }
  function verbo(j, top) {
    if (j.k === 'caos') return 'Caos total';
    if (j.k === 'carta') return VENCE[j.e][top.e] || '';
    return 'Vence';
  }
  // Jugadas válidas sin repetir tipo (una por elemento / combo). Devuelve acciones {t:'jugar', ids}.
  function jugadasValidas(J, mano, top) {
    const r = [], visto = {};
    for (const c of mano) {
      if (visto[c.e]) continue; visto[c.e] = 1;
      const j = formarJugada(J, [c]);
      if (j && vence(j, top)) r.push({ t: 'jugar', ids: [c.id] });
    }
    if (MODOS[J.modo].combos) {
      const vc = {};
      for (let x = 0; x < mano.length; x++) for (let y = x + 1; y < mano.length; y++) {
        const j = formarJugada(J, [mano[x], mano[y]]);
        if (!j || vc[j.c]) continue; vc[j.c] = 1;
        if (vence(j, top)) r.push({ t: 'jugar', ids: [mano[x].id, mano[y].id] });
      }
    }
    return r;
  }
  function capacidadRobo(J, j) { return Math.max(0, Math.min(tope(J) - j.mano.length, J.p.mazo.length)); }

  // ---------- creación ----------
  function crearJuego(cfg) {
    cfg = cfg || {};
    const modo = MODOS[cfg.modo] ? cfg.modo : 'clasico', M = MODOS[modo];
    const lista = Array.isArray(cfg.jugadores) ? cfg.jugadores : [];
    const nuevo = (j, i) => ({
      nombre: String((j && j.nombre) || ('Jugador ' + (i + 1))).slice(0, 16),
      tipo: (j && ['humano', 'bot', 'red', 'mazo'].indexOf(j.tipo) >= 0) ? j.tipo : 'bot',
      nivel: Math.max(1, Math.min(3, (j && j.nivel) | 0 || 2)),
      puntos: 0, ganadas: 0, fuera: false, mano: []
    });
    let jug;
    if (modo === 'solitario') {
      jug = [nuevo(lista[0] || { nombre: 'Tú', tipo: 'humano' }, 0), nuevo({ nombre: 'El Mazo', tipo: 'mazo' }, 1)];
      if (jug[0].tipo === 'mazo') jug[0].tipo = 'bot';
    } else {
      jug = lista.slice(0, M.max).map(nuevo).map(j => { if (j.tipo === 'mazo') j.tipo = 'bot'; return j; });
      if (jug.length < M.min) throw new Error('Se necesitan al menos ' + M.min + ' jugadores');
    }
    const J = {
      v: 1, modo,
      cfg: {
        castigoCaos: cfg.castigoCaos === 'fijo' ? 'fijo' : 'cartas',
        dir: cfg.dir === -1 ? -1 : 1,
        // Regla de la casa (NO está en el documento): si todos pasan y el turno vuelve a quien puso la carta
        // de la mesa, se saca una carta nueva del mazo. Por defecto solo en Combos (sin ella nadie gana en Combos).
        mesaLimpia: cfg.mesaLimpia != null ? !!cfg.mesaLimpia : modo === 'combos',
        caos: modo === 'solitario' ? cfg.caos !== false : M.caos
      },
      rs: (cfg.semilla >>> 0) || ((Math.random() * 4294967296) >>> 0),
      jug, np: 0, inicia: -1, campeon: -1, terminado: false, p: null
    };
    if (cfg.dir === 0) J.cfg.dir = rnd(J) < 0.5 ? 1 : -1; // dirección al azar
    nuevaPartida(J);
    return J;
  }

  // La partida "siempre se da iniciado por una carta sacada del mazo". Caos no puede abrir:
  // vuelve al mazo en posición al azar (nunca arriba) y se saca otra.
  function voltearInicial(J, mazo) {
    let c = mazo.pop(), g = 0;
    while (c.e === 'caos' && g++ < 50) { mazo.splice(Math.floor(rnd(J) * mazo.length), 0, c); c = mazo.pop(); }
    return { k: 'carta', e: c.e, ids: [c.id], por: -1 };
  }

  function nuevaPartida(J) {
    if (J.terminado) throw new Error('El juego ya terminó');
    const M = MODOS[J.modo];
    J.np++;
    J.jug.forEach(j => { j.mano = []; });
    const p = J.p = { mazo: [], mesa: [], turno: 0, fase: 'turno', quietos: 0, robo: 0, fin: null, rival: null, puestasJ: 0, n: 0 };
    if (J.modo === 'solitario') {
      // Solitario: 2 mitades. A = tu mazo (carta inicial y auxiliares). B = tus 3 cartas + el mazo rival (21/22).
      const todo = barajar(J, crearMazo(J.cfg.caos)), mitad = todo.length / 2;
      const A = todo.slice(0, mitad), B = todo.slice(mitad);
      J.jug[0].mano = B.splice(B.length - 3, 3);
      p.mazo = A;
      p.mesa.push(voltearInicial(J, p.mazo));
      p.rival = { mazo: B, puestas: 0, apartadas: [] };
      p.turno = 1; // "El mazo de 21 sale primero"
      return J;
    }
    const act = activos(J);
    p.mazo = barajar(J, crearMazo(J.cfg.caos));
    if (J.inicia < 0) J.inicia = act[Math.floor(rnd(J) * act.length)];
    else if (J.jug[J.inicia].fuera) J.inicia = siguiente(J, J.inicia);
    const orden = []; let x = J.inicia;
    for (let k = 0; k < act.length; k++) { orden.push(x); x = siguiente(J, x); }
    for (let r = 0; r < M.mano; r++) for (const i of orden) J.jug[i].mano.push(p.mazo.pop());
    p.mesa.push(voltearInicial(J, p.mazo));
    p.turno = J.inicia;
    return J;
  }

  // ---------- acciones ----------
  // Acciones canónicas del jugador en turno (una por tipo de jugada).
  function acciones(J) {
    const p = J.p;
    if (!p || p.fase === 'fin') return [];
    const j = J.jug[p.turno];
    if (j.tipo === 'mazo') return [{ t: 'voltear' }];
    const jug = jugadasValidas(J, j.mano, cima(p));
    if (p.fase === 'robado') return jug.concat([{ t: 'pasar' }]); // tras robar: jugar o ceder turno (es tu decisión)
    if (jug.length) return jug;
    const cab = capacidadRobo(J, j); // cerrado: con 2 roba 1; con 1 roba 1 o 2; con 3 pasa (tope 3)
    if (cab > 0) { const r = []; for (let n = 1; n <= cab; n++) r.push({ t: 'robar', n }); return r; }
    return [{ t: 'pasar' }];
  }
  // Valida cualquier acción (acepta cualquier carta del tipo válido, no solo la canónica).
  function esValida(J, a, quien) {
    const p = J.p;
    if (!p || p.fase === 'fin') return 'La partida terminó';
    if (quien != null && quien !== p.turno) return 'No es tu turno';
    if (!a || typeof a !== 'object') return 'Acción vacía';
    const j = J.jug[p.turno];
    if (j.tipo === 'mazo') return a.t === 'voltear' ? '' : 'El mazo solo voltea';
    if (a.t === 'voltear') return 'Solo el mazo voltea';
    const jugs = jugadasValidas(J, j.mano, cima(p));
    if (a.t === 'jugar') {
      const ids = Array.isArray(a.ids) ? a.ids : [];
      if (ids.length < 1 || ids.length > 2 || new Set(ids).size !== ids.length) return 'Cartas inválidas';
      const cartas = ids.map(id => j.mano.find(c => c.id === id));
      if (cartas.some(c => !c)) return 'Esa carta no está en tu mano';
      const jg = formarJugada(J, cartas);
      if (!jg) return 'Esa combinación no existe';
      if (!vence(jg, cima(p))) return 'No se sobrepone a la mesa';
      return '';
    }
    if (a.t === 'robar') {
      if (p.fase !== 'turno') return 'Ya robaste este turno';
      if (jugs.length) return 'Tienes jugada: no estás cerrado';
      const n = a.n | 0, cab = capacidadRobo(J, j);
      if (cab < 1) return 'No puedes robar';
      if (n < 1 || n > cab) return 'Cantidad inválida';
      return '';
    }
    if (a.t === 'pasar') {
      if (p.fase === 'robado') return '';
      if (jugs.length) return 'Tienes jugada: no puedes pasar';
      if (capacidadRobo(J, j) > 0) return 'Estás cerrado: debes robar';
      return '';
    }
    return 'Acción desconocida';
  }

  // Aplica una acción. Devuelve {ok, ev} o {ok:false, error}. Nunca lanza por acciones inválidas.
  function aplicar(J, a, quien) {
    const err = esValida(J, a, quien);
    if (err) return { ok: false, error: err };
    const p = J.p, i = p.turno, j = J.jug[i];
    p.n++;
    if (a.t === 'voltear') return voltearRival(J);
    if (a.t === 'jugar') {
      const top = cima(p), cartas = a.ids.map(id => j.mano.find(c => c.id === id));
      const jg = formarJugada(J, cartas);
      jg.ids = a.ids.slice(); jg.por = i; jg.verbo = verbo(jg, top);
      j.mano = j.mano.filter(c => a.ids.indexOf(c.id) < 0);
      p.mesa.push(jg); p.quietos = 0;
      if (J.modo === 'solitario') p.puestasJ++;
      const ev = { t: 'jugar', p: i, jugada: jg, sobre: top };
      if (jg.k === 'caos') finPartida(J, 'caos', i);
      else if (!j.mano.length || (J.modo === 'solitario' && p.puestasJ >= 3)) finPartida(J, 'normal', i);
      else avanzar(J);
      return { ok: true, ev };
    }
    if (a.t === 'robar') {
      const n = a.n | 0;
      for (let k = 0; k < n; k++) j.mano.push(p.mazo.pop());
      p.robo = n; p.fase = 'robado'; p.quietos = 0;
      return { ok: true, ev: { t: 'robar', p: i, n } };
    }
    // pasar
    const robo = p.robo;
    if (!robo) p.quietos++;
    const ev = { t: 'pasar', p: i, robo };
    // "El juego se cierra por lógica": una vuelta completa sin jugar ni robar.
    if (J.modo !== 'solitario' && p.quietos >= activos(J).length) finPartida(J, 'cierre', -1);
    else {
      avanzar(J);
      const top = cima(p);
      if (J.cfg.mesaLimpia && J.modo !== 'solitario' && top.por === p.turno && p.mazo.length) {
        p.mesa.push(voltearInicial(J, p.mazo)); p.quietos = 0; ev.limpia = cima(p).e;
      }
    }
    return { ok: true, ev };
  }

  // Solitario: el mazo rival voltea su carta. Si se sobrepone, la pone; si no (repetida/no vence), se aparta.
  function voltearRival(J) {
    const p = J.p, R = p.rival;
    if (!R.mazo.length) {
      const g = p.puestasJ > R.puestas ? 0 : R.puestas > p.puestasJ ? 1 : -1;
      finPartida(J, 'agotado', g);
      return { ok: true, ev: { t: 'agotado', p: 1 } };
    }
    const c = R.mazo.pop(), top = cima(p);
    const jg = c.e === 'caos' ? { k: 'caos' } : { k: 'carta', e: c.e };
    if (vence(jg, top)) {
      jg.ids = [c.id]; jg.por = 1; jg.verbo = verbo(jg, top);
      p.mesa.push(jg); R.puestas++;
      if (jg.k === 'caos') finPartida(J, 'caos', 1);
      else if (R.puestas >= 3) finPartida(J, 'normal', 1);
      else avanzar(J);
      return { ok: true, ev: { t: 'jugar', p: 1, jugada: jg, sobre: top } };
    }
    R.apartadas.push(c);
    avanzar(J);
    return { ok: true, ev: { t: 'apartar', p: 1, carta: { id: c.id, e: c.e }, sobre: top } };
  }

  function avanzar(J) { const p = J.p; p.turno = siguiente(J, p.turno); p.fase = 'turno'; p.robo = 0; }

  // Castigo por cartas en mano al terminar (sin Caos). Ver tabla en docs/GUIA.md.
  function castigo(modo, n) {
    if (modo === 'familiar') return n >= 3 ? -1 : 0;
    if (modo === 'combos') return n >= 2 ? -n : 0;
    return n >= 2 ? -(n - 1) : 0; // clásico: 1→0, 2→-1, 3→-2
  }

  function finPartida(J, tipo, g) {
    const p = J.p, M = MODOS[J.modo];
    const delta = J.jug.map(() => 0), manos = J.jug.map(j => j.mano.length);
    const cartas = J.jug.map(j => j.mano.map(c => c.e));
    p.fase = 'fin';
    if (J.modo === 'solitario') {
      if (g >= 0) J.jug[g].ganadas++;
      p.fin = { tipo, ganador: g, delta, manos, cartas, fuera: [], reparte: -1 };
      return;
    }
    J.jug.forEach((j, i) => {
      if (j.fuera) return;
      const n = j.mano.length;
      if (i === g) { delta[i] = tipo === 'caos' ? 5 : 2; return; }
      if (tipo === 'caos') {
        // Se salva quien tenga la segunda carta Caos (no gana ni pierde).
        if (j.mano.some(c => c.e === 'caos')) delta[i] = 0;
        else delta[i] = J.cfg.castigoCaos === 'fijo' ? -3 : -n;
        return;
      }
      delta[i] = castigo(J.modo, n);
    });
    J.jug.forEach((j, i) => {
      if (j.fuera) return;
      j.puntos += delta[i];
      if (M.piso && j.puntos < 0) { delta[i] -= j.puntos; j.puntos = 0; }
    });
    if (g >= 0) J.jug[g].ganadas++;
    // reparte: el que más perdió (cosmético, regla Extra 1)
    let reparte = -1, peor = 1;
    J.jug.forEach((j, i) => { if (!j.fuera && delta[i] < peor) { peor = delta[i]; reparte = i; } });
    const fuera = [];
    if (M.desc) J.jug.forEach((j, i) => { if (!j.fuera && j.puntos <= DESCALIFICA) { j.fuera = true; fuera.push(i); } });
    let campeon = -1;
    J.jug.forEach((j, i) => { if (!j.fuera && j.puntos >= META) campeon = i; });
    const act = activos(J);
    if (campeon < 0 && act.length === 1) campeon = act[0];
    if (campeon >= 0 || act.length <= 1) { J.terminado = true; J.campeon = campeon; }
    // Inicia la próxima: el ganador (mantiene su racha). Sin ganador: el siguiente de quien inició.
    if (!J.terminado) J.inicia = (g >= 0 && !J.jug[g].fuera) ? g : siguiente(J, J.inicia);
    if (reparte >= 0 && J.jug[reparte].fuera) reparte = -1;
    p.fin = { tipo, ganador: g, delta, manos, cartas, fuera, reparte };
  }

  // ---------- vista (lo que un jugador puede ver) ----------
  function vista(J, yo) {
    const p = J.p, R = p.rival;
    return {
      modo: J.modo, np: J.np, dir: J.cfg.dir, castigoCaos: J.cfg.castigoCaos, mesaLimpia: J.cfg.mesaLimpia, yo,
      jug: J.jug.map(j => ({ nombre: j.nombre, tipo: j.tipo, nivel: j.nivel, puntos: j.puntos, ganadas: j.ganadas, fuera: j.fuera, n: j.mano.length })),
      mano: (yo >= 0 && J.jug[yo]) ? J.jug[yo].mano.map(c => ({ id: c.id, e: c.e })) : [],
      mesa: p.mesa.slice(-8).map(m => JSON.parse(JSON.stringify(m))),
      mazo: p.mazo.length, turno: p.turno, fase: p.fase, robo: p.robo, quietos: p.quietos,
      rival: R ? { mazo: R.mazo.length, puestas: R.puestas, apartadas: R.apartadas.length } : null,
      puestasJ: p.puestasJ,
      fin: p.fin ? JSON.parse(JSON.stringify(p.fin)) : null,
      terminado: J.terminado, campeon: J.campeon, inicia: J.inicia,
      acciones: (p.turno === yo) ? acciones(J) : []
    };
  }

  // ---------- verificación de invariantes (la usa el bot de pruebas) ----------
  function verificar(J) {
    const e = [], p = J.p, M = MODOS[J.modo];
    if (!p) return ['Sin partida'];
    const ids = [];
    J.jug.forEach(j => j.mano.forEach(c => ids.push(c.id)));
    p.mazo.forEach(c => ids.push(c.id));
    p.mesa.forEach(m => (m.ids || []).forEach(id => ids.push(id)));
    if (p.rival) { p.rival.mazo.forEach(c => ids.push(c.id)); p.rival.apartadas.forEach(c => ids.push(c.id)); }
    const total = J.cfg.caos ? 50 : 48;
    if (ids.length !== total) e.push('Cartas totales ' + ids.length + ' ≠ ' + total);
    if (new Set(ids).size !== ids.length) e.push('Carta duplicada');
    J.jug.forEach((j, i) => {
      if (j.mano.length > M.tope) e.push(j.nombre + ' supera el tope: ' + j.mano.length);
      if (j.fuera && p.fase !== 'fin' && j.mano.length) e.push(j.nombre + ' está fuera y tiene cartas');
      if (M.piso && j.puntos < 0) e.push(j.nombre + ' bajo 0 en Familiar');
      if (!M.caos && J.modo !== 'solitario' && j.mano.some(c => c.e === 'caos')) e.push('Caos en modo sin Caos');
      if (!Number.isFinite(j.puntos)) e.push('Puntos no numéricos');
      if (i === p.turno && j.fuera && p.fase !== 'fin') e.push('Turno de un descalificado');
    });
    const top = cima(p);
    if (!top) e.push('Mesa vacía');
    else if (top.k === 'caos' && p.fase !== 'fin') e.push('Caos en mesa sin fin');
    if (p.fase !== 'fin' && !acciones(J).length) e.push('Sin acciones posibles');
    if (p.fase === 'fin' && !p.fin) e.push('Fin sin resultado');
    return e;
  }

  const Motor = {
    ELEM, NOMBRE, VENCE, COMBOS, COMBO_DE, MODOS, META, DESCALIFICA,
    crearJuego, nuevaPartida, acciones, esValida, aplicar, vista, verificar,
    cima, siguiente, activos, formarJugada, vence, jugadasValidas, castigo, crearMazo, rnd
  };
  raiz.Motor = Motor;
  if (typeof module !== 'undefined' && module.exports) module.exports = Motor;
})(typeof window !== 'undefined' ? window : globalThis);
