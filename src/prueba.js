/* NEXUS CAOS — Bot de pruebas. Corre en Node (tests/simular.js) y dentro del juego (Ajustes → Bot de pruebas).
 * 1) Casos fijos de reglas del documento. 2) Simulación masiva con invariantes, oráculo de puntaje,
 *    acciones inválidas al azar (fuzz) y guardar/cargar (JSON) a mitad de partida. */
(function (raiz) {
  'use strict';
  const M = raiz.Motor || require('./motor.js');
  const IA = raiz.IA || require('./ia.js');

  function prng(seed) {
    let s = seed >>> 0;
    return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const C = (id, e) => ({ id, e });

  // Oráculo independiente: puntaje esperado según el documento (no reutiliza el motor).
  function deltaEsperado(modo, tipo, g, i, cartas, castigoCaos) {
    const n = cartas.length;
    if (i === g) return tipo === 'caos' ? 5 : 2;
    if (modo === 'familiar') return n >= 3 ? -1 : 0;
    if (modo === 'combos') return n >= 2 ? -n : 0;
    if (tipo === 'caos') {
      if (cartas.indexOf('caos') >= 0) return 0;
      return castigoCaos === 'fijo' ? -3 : -Math.min(n, 3);
    }
    return n >= 2 ? -(n - 1) : 0;
  }

  // ---------- 1) casos fijos ----------
  function escenario(modo, manos, mesaE, mazoE, extra) {
    const jug = manos.map((m, i) => ({ nombre: 'J' + (i + 1), tipo: 'bot' }));
    const J = M.crearJuego(Object.assign({ modo, jugadores: modo === 'solitario' ? [jug[0]] : jug, semilla: 7 }, extra || {}));
    let id = 0;
    J.jug.forEach((j, i) => { j.mano = (manos[i] || []).map(e => C(id++, e)); });
    J.p.mesa = [{ k: 'carta', e: mesaE, ids: [id++], por: -1 }];
    J.p.mazo = (mazoE || []).map(e => C(id++, e));
    J.p.turno = 0; J.p.fase = 'turno';
    return J;
  }
  function casos() {
    const f = [];
    let total = 0;
    const ok = (c, msg) => { total++; if (!c) f.push(msg); };
    const V = (a, b) => M.vence({ k: 'carta', e: a }, { k: 'carta', e: b });
    // Reglas de orden
    ok(V('fuego', 'aire') && V('fuego', 'agua') && V('fuego', 'tierra'), 'Fuego debe vencer a Aire, Agua y Tierra');
    ok(V('tierra', 'agua') && V('tierra', 'fuego') && !V('tierra', 'aire'), 'Tierra vence a Agua y Fuego, no a Aire');
    ok(V('agua', 'fuego') && V('agua', 'tierra') && !V('agua', 'aire'), 'Agua vence a Fuego y Tierra, no a Aire');
    ok(V('aire', 'tierra') && V('aire', 'fuego') && !V('aire', 'agua'), 'Aire vence a Tierra y Fuego, no a Agua');
    ok(!V('fuego', 'fuego') && !V('agua', 'agua') && !V('aire', 'aire') && !V('tierra', 'tierra'), 'Mismo elemento no vence');
    ok(M.vence({ k: 'caos' }, { k: 'carta', e: 'aire' }), 'Caos vence a todo');
    // Combos (tabla literal)
    const K = (a, b) => M.vence({ k: 'combo', c: a }, typeof b === 'string' && M.COMBOS[b] ? { k: 'combo', c: b } : { k: 'carta', e: b });
    ok(K('oxigeno', 'lodo') && K('oxigeno', 'aire') && K('oxigeno', 'tormenta'), 'Oxígeno maligno: vence Lodo, Aire y Tormenta');
    ok(K('lodo', 'fogata') && K('lodo', 'tierra') && K('lodo', 'fuego'), 'Lodo: vence Fogata, Tierra, Fuego');
    ok(K('fogata', 'aire') && K('fogata', 'tierra'), 'Fogata: vence Aire y Tierra');
    ok(K('evaporacion', 'vendaval') && K('tormenta', 'vendaval') && K('vendaval', 'fuego'), 'Vendaval: lo vencen Evaporación y Tormenta; vence Fuego');
    ok(!M.vence({ k: 'carta', e: 'fuego' }, { k: 'combo', c: 'lodo' }), 'Carta suelta no vence combo');
    // Cerrado (reglas aclaradas por el creador): robas 1 o 2 aunque tengas 3; tras robar, si una carta sirve DEBES jugarla
    let J = escenario('clasico', [['agua', 'agua', 'tierra'], ['fuego']], 'aire', ['agua', 'tierra', 'fuego']);
    ok(JSON.stringify(M.acciones(J)) === '[{"t":"robar","n":1},{"t":"robar","n":2}]', 'Cerrado con 3 cartas: roba 1 o 2');
    ok(M.esValida(J, { t: 'pasar' }) !== '', 'Cerrado con 3 no puede pasar sin robar');
    M.aplicar(J, { t: 'robar', n: 2 });
    ok(J.jug[0].mano.length === 5 && J.p.fase === 'robado', 'Con 3 y robando 2 queda con 5');
    ok(M.acciones(J).every(a => a.t === 'jugar') && M.esValida(J, { t: 'pasar' }) !== '', 'Tras robar, si una carta sirve debe jugarla (no puede pasar)');
    J = escenario('clasico', [['agua', 'tierra'], ['fuego']], 'aire', ['agua', 'tierra', 'agua']);
    M.aplicar(J, { t: 'robar', n: 1 });
    ok(JSON.stringify(M.acciones(J)) === '[{"t":"pasar"}]', 'Tras robar sin carta útil: pasa el turno');
    J = escenario('clasico', [['agua'], ['fuego']], 'aire', []);
    ok(JSON.stringify(M.acciones(J)) === '[{"t":"pasar"}]', 'Cerrado con mazo vacío: pasa');
    J = escenario('clasico', [['agua'], ['fuego']], 'aire', ['agua', 'tierra', 'fuego']);
    M.aplicar(J, { t: 'robar', n: 2 });
    ok(M.esValida(J, { t: 'robar', n: 1 }) !== '', 'No se roba dos veces');
    // Con jugada no se puede pasar
    J = escenario('clasico', [['fuego', 'agua', 'agua'], ['agua']], 'aire', ['tierra']);
    ok(M.esValida(J, { t: 'pasar' }) !== '' && M.esValida(J, { t: 'robar', n: 1 }) !== '', 'Con jugada no puede pasar ni robar');
    // Ganar normal: +2, 1 carta 0, 2 cartas -1, 3 cartas -2
    J = escenario('clasico', [['fuego'], ['agua'], ['agua', 'agua'], ['agua', 'agua', 'agua']], 'aire', ['tierra']);
    M.aplicar(J, { t: 'jugar', ids: [0] });
    ok(J.p.fin && J.p.fin.tipo === 'normal' && J.jug.map(j => j.puntos).join() === '2,0,-1,-2', 'Puntaje normal 2/0/-1/-2');
    ok(J.inicia === 0, 'El ganador inicia la siguiente');
    ok(J.racha.j === 0 && J.racha.n === 1 && J.p.fin.mesaN === 2, 'Racha y conteo de cartas en mesa');
    // Caos: +5, quien tiene la otra Caos se salva, resto por cartas
    J = escenario('clasico', [['caos', 'agua'], ['caos', 'agua'], ['agua'], ['agua', 'agua', 'agua']], 'aire', ['tierra']);
    M.aplicar(J, { t: 'jugar', ids: [0] });
    ok(J.jug.map(j => j.puntos).join() === '5,0,-1,-3', 'Caos según cartas: 5/0/-1/-3');
    J = escenario('clasico', [['caos', 'agua'], ['agua'], ['agua', 'tierra']], 'aire', ['tierra'], { castigoCaos: 'fijo' });
    M.aplicar(J, { t: 'jugar', ids: [0] });
    ok(J.jug.map(j => j.puntos).join() === '5,-3,-3', 'Caos fijo: todos -3');
    // Cierre por lógica: nadie puede jugar ni robar → empate con castigo por cartas
    J = escenario('clasico', [['agua', 'agua', 'tierra'], ['agua', 'tierra', 'tierra']], 'aire', []);
    M.aplicar(J, { t: 'pasar' }); M.aplicar(J, { t: 'pasar' });
    ok(J.p.fin && J.p.fin.tipo === 'cierre' && J.jug.map(j => j.puntos).join() === '-2,-2', 'Cierre por lógica: -2/-2');
    // Descalificación en -5 y campeón en 10
    J = escenario('clasico', [['fuego'], ['agua', 'agua', 'agua'], ['agua']], 'aire', []);
    J.jug[1].puntos = -3; J.jug[0].puntos = 8;
    M.aplicar(J, { t: 'jugar', ids: [0] });
    ok(J.jug[1].fuera && J.terminado && J.campeon === 0, 'Descalifica en -5 y corona en 10');
    // Familiar: piso 0, solo 3 cartas pierde 1
    J = escenario('familiar', [['fuego'], ['agua', 'agua', 'agua'], ['agua', 'agua']], 'aire', []);
    M.aplicar(J, { t: 'jugar', ids: [0] });
    ok(J.jug.map(j => j.puntos).join() === '2,0,0', 'Familiar: piso 0');
    ok(!M.crearMazo(false).some(c => c.e === 'caos') && M.crearMazo(true).length === 50, 'Mazo 48 sin Caos / 50 con Caos');
    // Combos: combo vence, castigo -n
    J = escenario('combos', [['agua', 'tierra'], ['fuego', 'fuego', 'agua']], 'fuego', []);
    ok(M.esValida(J, { t: 'jugar', ids: [0, 1] }) === '', 'Lodo se juega sobre Fuego');
    M.aplicar(J, { t: 'jugar', ids: [0, 1] });
    ok(J.jug.map(j => j.puntos).join() === '2,-3', 'Combos: ganador +2, 3 cartas -3');
    // Solitario: el mazo sale primero; repetida se aparta
    J = M.crearJuego({ modo: 'solitario', jugadores: [{ nombre: 'T', tipo: 'humano' }], semilla: 3 });
    ok(J.p.turno === 1 && M.acciones(J)[0].t === 'voltear', 'Solitario: el mazo sale primero');
    ok(J.p.rival.mazo.length === 22 && M.verificar(J).length === 0, 'Solitario con Caos: mazo rival de 22');
    J = M.crearJuego({ modo: 'solitario', jugadores: [{ nombre: 'T', tipo: 'humano' }], semilla: 3, caos: false });
    ok(J.p.rival.mazo.length === 21, 'Solitario sin Caos: mazo rival de 21');
    // Acción inválida no altera el estado
    J = escenario('clasico', [['agua', 'tierra', 'fuego'], ['fuego']], 'aire', ['tierra']);
    const antes = JSON.stringify(J);
    M.aplicar(J, { t: 'jugar', ids: [0] }); M.aplicar(J, { t: 'jugar', ids: [99] }); M.aplicar(J, { t: 'xx' }); M.aplicar(J, null);
    ok(JSON.stringify(J) === antes, 'Acciones inválidas no cambian nada');
    casos.total = total;
    return f;
  }

  // ---------- 2) simulación masiva ----------
  const MODOS_SIM = ['clasico', 'clasico', 'familiar', 'combos', 'solitario'];
  function unJuego(sem, opt, est) {
    const r = prng(sem);
    const modo = opt.modo || MODOS_SIM[Math.floor(r() * MODOS_SIM.length)], MD = M.MODOS[modo];
    const n = modo === 'solitario' ? 1 : MD.min + Math.floor(r() * (MD.max - MD.min + 1));
    const jugadores = [];
    for (let i = 0; i < n; i++) jugadores.push({ nombre: 'B' + i, tipo: 'bot', nivel: 1 + Math.floor(r() * 3) });
    const J0 = M.crearJuego({ modo, jugadores, semilla: (sem * 2654435761) >>> 0, castigoCaos: r() < 0.5 ? 'fijo' : 'cartas', dir: r() < 0.5 ? 1 : -1, caos: r() < 0.7 });
    let J = J0;
    const fallo = msg => { est.errores.push('semilla ' + sem + ' [' + modo + ' ' + n + 'j] partida ' + J.np + ': ' + msg); return false; };
    const azar = r() < 0.25; // a veces juega al azar puro para explorar
    for (let partida = 0; partida < 300; partida++) {
      let pasos = 0;
      while (J.p.fase !== 'fin') {
        if (++pasos > 3000) return fallo('bucle: partida no termina');
        const v = M.verificar(J); if (v.length) return fallo(v.join('; '));
        const acc = M.acciones(J);
        for (const a of acc) { const e = M.esValida(J, a); if (e) return fallo('acción canónica inválida: ' + e); }
        if (opt.fuzz && r() < 0.15) {
          const yo = J.jug[J.p.turno], ids = yo.mano.map(c => c.id);
          const raro = [{ t: 'jugar', ids: [Math.floor(r() * 60)] }, { t: 'robar', n: Math.floor(r() * 5) - 1 }, { t: 'pasar' }, { t: 'jugar', ids: ids.slice(0, 2) }, { t: 'voltear' }, { t: 'jugar', ids: [ids[0], ids[0]] }][Math.floor(r() * 6)];
          const foto = JSON.stringify(J), res = M.aplicar(J, raro);
          if (!res.ok && JSON.stringify(J) !== foto) return fallo('acción inválida alteró el estado');
          est.fuzz++;
          if (res.ok) { est.acciones++; continue; }
        }
        if (opt.guardar && r() < 0.02) J = JSON.parse(JSON.stringify(J)); // guardar/cargar
        const a = azar ? acc[Math.floor(r() * acc.length)] : IA.elegir(J, r);
        const antes = J.jug.map(j => j.puntos);
        const res = M.aplicar(J, a);
        if (!res.ok) return fallo('IA eligió inválida: ' + res.error + ' ' + JSON.stringify(a));
        est.acciones++;
        if (J.p.fase === 'fin') {
          const fin = J.p.fin;
          est.fines[fin.tipo] = (est.fines[fin.tipo] || 0) + 1;
          if (modo !== 'solitario') {
            for (let i = 0; i < J.jug.length; i++) {
              if (antes[i] === undefined) continue;
              const jug = J.jug[i];
              const eraFuera = jug.fuera && fin.fuera.indexOf(i) < 0;
              if (eraFuera) continue;
              let d = deltaEsperado(modo, fin.tipo, fin.ganador, i, fin.cartas[i], J.cfg.castigoCaos);
              if (M.MODOS[modo].piso) d = Math.max(0, antes[i] + d) - antes[i];
              if (fin.delta[i] !== d || jug.puntos - antes[i] !== d) return fallo('puntaje ' + jug.nombre + ' esperado ' + d + ' obtuvo ' + fin.delta[i] + ' (' + fin.tipo + ', cartas ' + fin.cartas[i] + ')');
              if (M.MODOS[modo].desc && jug.puntos <= -5 && !jug.fuera) return fallo('no descalificó en ' + jug.puntos);
            }
            if (fin.ganador >= 0) est.porNivel[J.jug[fin.ganador].nivel]++;
          } else if (fin.tipo === 'normal' && (fin.mesaN < 4 || fin.mesaN > 6)) return fallo('solitario: la carta ganadora debe ser la 4ª, 5ª o 6ª de la mesa (fue ' + fin.mesaN + 'ª)');
          else if (fin.ganador >= 0) est.solo[fin.ganador]++;
          else est.solo[2]++;
        }
      }
      est.partidas++;
      if (J.terminado) break;
      if (modo === 'solitario' && partida >= 5) break;
      M.nuevaPartida(J);
    }
    if (modo !== 'solitario' && !J.terminado) return fallo('el juego no terminó en 300 partidas');
    est.juegos++;
    est.modos[modo] = (est.modos[modo] || 0) + 1;
    return true;
  }

  function ejecutar(opt) {
    opt = Object.assign({ juegos: 200, semilla: 1, fuzz: true, guardar: true }, opt || {});
    const t0 = Date.now();
    const est = { casos: 0, fallosCasos: [], juegos: 0, partidas: 0, acciones: 0, fuzz: 0, fines: {}, modos: {}, porNivel: [0, 0, 0, 0], solo: [0, 0, 0], errores: [] };
    try { est.fallosCasos = casos(); } catch (e) { est.fallosCasos = ['Excepción en casos: ' + e.message]; }
    est.casos = casos.total || 0;
    for (let k = 0; k < opt.juegos; k++) {
      try { unJuego(opt.semilla + k, opt, est); } catch (e) { est.errores.push('semilla ' + (opt.semilla + k) + ': excepción ' + e.message); }
      if (est.errores.length > 20) break;
    }
    est.ms = Date.now() - t0;
    est.ok = !est.errores.length && !est.fallosCasos.length;
    return est;
  }
  const Pruebas = { ejecutar, casos, deltaEsperado };
  raiz.Pruebas = Pruebas;
  if (typeof module !== 'undefined' && module.exports) module.exports = Pruebas;
})(typeof window !== 'undefined' ? window : globalThis);
