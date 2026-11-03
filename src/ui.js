/* NEXUS CAOS — Interfaz: pantallas, mesa, controlador de turnos (local, pasa-el-celular y LAN), guardado.
 * Depende de: Motor, IA, Arte, Sonido, Pruebas, Red (opcional), QR (opcional). */
(function () {
  'use strict';
  const M = window.Motor, IA = window.IA, A = window.Arte, SND = window.Sonido;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LS = {
    get(k, d) { try { const v = localStorage.getItem('nexus.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('nexus.' + k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem('nexus.' + k); } catch (e) {} }
  };
  const AJ = Object.assign({ sonido: true, vibrar: true, velocidad: 'normal', reverso: 'baja', quieto: false, nombre: 'Tú', tutorial: false, auto: true }, LS.get('ajustes', {}));
  const ST = Object.assign({ partidas: 0, ganadas: 0, coronas: 0, caos: 0, soloG: 0, soloP: 0 }, LS.get('stats', {}));
  const guardaAJ = () => { LS.set('ajustes', AJ); SND.activo = AJ.sonido; SND.vibrar = AJ.vibrar; document.body.classList.toggle('quieto', !!AJ.quieto); };
  const guardaST = () => LS.set('stats', ST);
  const NOM = e => (M.NOMBRE[e] || '').toUpperCase();
  const NIVEL = ['', 'Fácil', 'Normal', 'Difícil'];
  const DEMORA = { lenta: 1250, normal: 760, rapida: 380 };
  const ELEM = M.ELEM;
  const TEXTO_SOLO = 'Tú contra el mazo. Se parte la baraja en dos mitades de 25 (24 sin Caos). Mitad 1: tu mazo auxiliar, de ahí sale la carta inicial y las que robas. Mitad 2: sacas tus 3 cartas y el resto es el mazo rival (22, o 21 sin Caos). El mazo rival sale primero: voltea su carta; si se sobrepone a la mesa la pone, si es repetida (o no se sobrepone) la aparta y sigues tú. Gana quien gaste primero sus 3 cartas: la carta ganadora siempre es la 4ª, 5ª o 6ª de la mesa, contando la inicial.';

  // ---------- estado ----------
  let pantalla = 'inicio';
  let G = null; // sesión de juego: { J, locales, viendo, cubierto, ultimo, sel, timer, red, asientoRed, vista, contado }
  let NP = Object.assign({ modo: 'clasico', asientos: null, dir: 1, castigoCaos: 'cartas', mesaLimpia: null, caos: true }, LS.get('config', {}));
  if (!Array.isArray(NP.asientos) || !NP.asientos.length) NP.asientos = [{ nombre: AJ.nombre, tipo: 'humano', nivel: 2 }, { nombre: 'Ígnea', tipo: 'bot', nivel: 2 }, { nombre: 'Marea', tipo: 'bot', nivel: 2 }, { nombre: 'Céfiro', tipo: 'bot', nivel: 2 }];
  const NOMBRES_BOT = ['Ígnea', 'Marea', 'Céfiro', 'Raíz', 'Brasa', 'Bruma', 'Roca', 'Ola', 'Ráfaga', 'Lava', 'Musgo', 'Niebla'];

  // ---------- utilidades de UI ----------
  function aviso(t) {
    const a = $('#aviso'); if (!a) return;
    a.textContent = t; a.classList.add('on');
    clearTimeout(aviso.t); aviso.t = setTimeout(() => a.classList.remove('on'), 2200);
  }
  function capa(html, cls) {
    cerrarCapa();
    const d = document.createElement('div');
    d.className = 'capa'; d.id = 'capa';
    d.innerHTML = '<div class="hoja ' + (cls || '') + '">' + html + '</div>';
    document.body.appendChild(d);
    return d;
  }
  function cerrarCapa() { const c = $('#capa'); if (c) c.remove(); if (window.QRScan) window.QRScan.parar(); }
  function franja(izq, der) { return '<div class="franja"><span>' + izq + '</span><span class="der">' + der + '</span></div>'; }
  function ir(p) { pantalla = p; cerrarCapa(); pintar(); window.scrollTo(0, 0); }
  function pintar() {
    const app = $('#app');
    const f = VISTAS[pantalla] || VISTAS.inicio;
    try { app.innerHTML = f(); } catch (e) { console.error(e); app.innerHTML = '<div class="pag cuerpo"><h2 class="tit">Error</h2><p>' + esc(e.message) + '</p><button class="btn" data-a="inicio">Inicio</button></div>'; }
  }
  function quienVence(top, modo) {
    const r = [];
    if (top.k === 'carta') {
      ELEM.forEach(a => { if (M.VENCE[a][top.e]) r.push(NOM(a)); });
      if (M.MODOS[modo].combos) for (const c in M.COMBOS) if (M.COMBOS[c].vence.indexOf(top.e) >= 0) r.push(M.COMBOS[c].n);
    } else if (top.k === 'combo') {
      for (const c in M.COMBOS) if (M.COMBOS[c].vence.indexOf(top.c) >= 0) r.push(M.COMBOS[c].n);
    }
    return r;
  }
  const elemsJugada = m => m.k === 'combo' ? M.COMBOS[m.c].e : [m.k === 'caos' ? 'caos' : m.e];
  const nombreJugada = m => m.k === 'combo' ? M.COMBOS[m.c].n.toUpperCase() + ' (' + M.COMBOS[m.c].e.map(NOM).join('+') + ')' : NOM(m.k === 'caos' ? 'caos' : m.e);

  // ---------- tabla "quién vence a quién" ----------
  function tablaVence() {
    return '<div class="vence">' + ELEM.map(e => {
      const v = Object.keys(M.VENCE[e]);
      return '<div style="--c:' + A.COLOR[e] + '">' + A.simbolo(e) + '<b>' + NOM(e) + '</b><div>' +
        v.map(x => A.simbolo(x, 'mini-s')).join('') + '<br><span>' + v.map(x => M.VENCE[e][x] + ' ' + M.NOMBRE[x]).join(' · ') + '</span></div></div>';
    }).join('') + '<div style="--c:#fff">' + A.simbolo('caos') + '<b>CAOS</b><div><span>Vence a todo. Victoria inmediata: +5. Final total, nada puede detenerlo.</span></div></div></div>';
  }

  // ======================================================================
  // VISTAS
  // ======================================================================
  const VISTAS = {};
  VISTAS.inicio = () => {
    const hay = !!LS.get('partida', null);
    return '<div class="pag portada">' + franja('Nexus Caos · Edición Nº 1', 'Cartas elementales') +
      '<div class="cuerpo"><div class="cabeza"><h1>NEXUS<b>CAOS</b></h1>' + A.logo() + '</div>' +
      '<p class="lema">SOLO UN VERDADERO GANADOR</p><p class="ital">Fuego, Tierra, Agua y Aire en un caos del azar: una carta se sobrepone a la otra. ¿Serás el rey de reyes?</p>' +
      '<div class="pelicula">4 elementos · 50 cartas · 2 a 12 jugadores · gana quien llegue a 10 · −5 queda fuera</div>' +
      (hay ? '<button class="btn ms" data-a="continuar">Continuar partida <small>guardada</small></button>' : '') +
      '<button class="btn rj" data-a="rapida">Jugar ya <small>tú + 3 bots</small></button>' +
      '<button class="btn pt" data-a="nueva">Nueva partida <small>modos y jugadores</small></button>' +
      '<button class="btn ng" data-a="lan">Modo LAN <small>Wi-Fi sin internet</small></button>' +
      '<div class="fila-btn"><button class="btn" data-a="reglas">Reglas</button><button class="btn" data-a="ajustes">Ajustes</button></div>' +
      '<p class="maq" style="margin-top:14px">Récord · ' + ST.ganadas + ' partidas ganadas · ' + ST.coronas + ' coronas · ' + ST.caos + ' caos</p>' +
      '<p class="nota creditos">Un juego de <b>OneZero</b></p>' +
      '</div><span class="pagnum">PAG 01</span></div>';
  };

  VISTAS.nueva = () => {
    const MD = M.MODOS[NP.modo];
    ajustarAsientos();
    const modos = [['clasico', 'Clásico'], ['familiar', 'Familiar'], ['combos', 'Combos'], ['solitario', 'Solitario']];
    const desc = {
      clasico: '3 cartas, con Caos. Gana +2 (Caos +5). Llega a 10 y eres campeón; en −5 quedas descalificado.',
      familiar: 'Para niños: sin Caos, nadie queda fuera, el marcador no baja de 0 y solo pierde 1 quien quede con 3 cartas.',
      combos: '2 a 6 jugadores, 6 cartas (tope 9), sin Caos. Combina dos elementos: Lodo, Vendaval, Tormenta, Fogata máxima, Oxígeno maligno y Evaporación masiva.',
      solitario: TEXTO_SOLO
    };
    let h = '<div class="pag">' + franja('Nueva partida', 'PAG 02') + '<div class="cuerpo">' +
      '<h2 class="tit">ELIGE TU <span class="rojo">CAOS</span></h2><span class="campo">Modo</span>' +
      modos.map(([k, n]) => '<button class="chip' + (NP.modo === k ? ' on' : '') + '" data-a="modo" data-v="' + k + '">' + n + '</button>').join('') +
      '<p class="nota">' + desc[NP.modo] + '</p>';
    if (NP.modo !== 'solitario') {
      h += '<span class="campo">Jugadores (' + NP.asientos.length + ' de ' + MD.min + '–' + MD.max + ')</span>';
      h += NP.asientos.map((s, i) => '<div class="asiento"><input data-c="nombre" data-i="' + i + '" value="' + esc(s.nombre) + '" maxlength="16" aria-label="Nombre">' +
        '<select data-c="tipo" data-i="' + i + '" aria-label="Tipo"><option value="humano"' + (s.tipo === 'humano' ? ' selected' : '') + '>Humano</option><option value="bot"' + (s.tipo === 'bot' ? ' selected' : '') + '>Bot</option></select>' +
        '<select data-c="nivel" data-i="' + i + '" aria-label="Nivel"' + (s.tipo === 'bot' ? '' : ' disabled') + '>' + [1, 2, 3].map(n => '<option value="' + n + '"' + (s.nivel === n ? ' selected' : '') + '>' + NIVEL[n] + '</option>').join('') + '</select>' +
        '<button class="mini-btn" data-a="quitar" data-i="' + i + '" aria-label="Quitar"' + (NP.asientos.length <= MD.min ? ' disabled' : '') + '>✕</button></div>').join('');
      h += '<div class="fila-btn"><button class="btn" data-a="mas" data-v="bot"' + (NP.asientos.length >= MD.max ? ' disabled' : '') + '>+ Bot</button><button class="btn" data-a="mas" data-v="humano"' + (NP.asientos.length >= MD.max ? ' disabled' : '') + '>+ Humano</button></div>';
      h += '<p class="nota">Varios humanos en un mismo dispositivo: se pasan el celular en cada turno.</p>';
      h += '<span class="campo">Dirección</span>' + [[1, 'Izq → Der'], [-1, 'Der → Izq'], [0, 'Al azar']].map(([v, n]) => '<button class="chip' + (NP.dir === v ? ' on' : '') + '" data-a="dir" data-v="' + v + '">' + n + '</button>').join('');
      if (NP.modo === 'clasico') h += '<span class="campo">Castigo cuando ganan con Caos</span>' +
        [['cartas', 'Según cartas (−1/−2/−3)'], ['fijo', '−3 a todos']].map(([v, n]) => '<button class="chip' + (NP.castigoCaos === v ? ' on' : '') + '" data-a="castigo" data-v="' + v + '">' + n + '</button>').join('') +
        '<p class="nota">El documento trae las dos versiones (reglas y sinopsis). Quien tenga la otra Caos se salva.</p>';
      const ml = NP.mesaLimpia == null ? NP.modo === 'combos' : NP.mesaLimpia;
      h += '<label class="tg">Mesa limpia (regla de la casa, no está en el documento)<input type="checkbox" data-c="mesaLimpia"' + (ml ? ' checked' : '') + '></label>' +
        '<p class="nota">Si todos pasan y el turno vuelve a quien puso la carta, sale una nueva del mazo. Recomendada en Combos.</p>';
    } else {
      h += '<label class="tg">Jugar con las 2 cartas Caos (25/25)<input type="checkbox" data-c="caos"' + (NP.caos ? ' checked' : '') + '></label>' +
        '<p class="maq">Récord solitario · tú ' + ST.soloG + ' — mazo ' + ST.soloP + '</p>';
    }
    h += '<button class="btn rj" data-a="empezar">Empezar <small>' + MD.n + '</small></button><button class="btn" data-a="inicio">Volver</button></div></div>';
    return h;
  };
  function ajustarAsientos() {
    const MD = M.MODOS[NP.modo];
    if (NP.modo === 'solitario') return;
    while (NP.asientos.length < MD.min) NP.asientos.push(nuevoBot());
    if (NP.asientos.length > MD.max) NP.asientos.length = MD.max;
  }
  function nuevoBot() {
    const usados = NP.asientos.map(s => s.nombre);
    return { nombre: NOMBRES_BOT.find(n => usados.indexOf(n) < 0) || ('Bot ' + (NP.asientos.length + 1)), tipo: 'bot', nivel: 2 };
  }

  VISTAS.reglas = () => '<div class="pag">' + franja('Reglas del caos', 'PAG 03') + '<div class="cuerpo">' +
    '<h2 class="tit">CÓMO SE <span class="rojo">JUEGA</span></h2>' +
    '<p class="ital">Gana la partida quien se quede sin cartas antes que cualquier otro. Gana el juego quien llegue a 10 puntos.</p>' +
    '<h3 class="tit">Quién vence a quién</h3>' + tablaVence() + '<p class="nota">El mismo elemento no se sobrepone a sí mismo.</p>' +
    '<h3 class="tit">Tu turno</h3><div class="pelicula">La partida abre con una carta del mazo · Lanza una carta que se sobreponga a la de la mesa · Si estás cerrado: con 3 cartas pasas; con 2 robas 1; con 1 robas 1 o 2 · Tras robar puedes jugar o ceder el turno · Tope: 3 cartas en mano</div>' +
    '<h3 class="tit">Puntos</h3><table class="res"><tr><th>Al terminar</th><th>Normal</th><th>Con Caos</th></tr>' +
    '<tr><td>Ganador (0 cartas)</td><td class="d mas">+2</td><td class="d mas">+5</td></tr><tr><td>1 carta</td><td class="d">0</td><td class="d menos">−1*</td></tr>' +
    '<tr><td>2 cartas</td><td class="d menos">−1</td><td class="d menos">−2*</td></tr><tr><td>3 cartas</td><td class="d menos">−2</td><td class="d menos">−3*</td></tr>' +
    '<tr><td>Tiene la otra Caos</td><td class="d">—</td><td class="d">0</td></tr></table>' +
    '<p class="nota">* O −3 a todos, según el ajuste. Se resta aunque tengas 0: en −5 quedas descalificado; con 10 eres el campeón, el rey de reyes.</p>' +
    '<h3 class="tit">Cierre por lógica</h3><p>Si da una vuelta completa sin que nadie pueda jugar ni robar, la partida se cierra sin ganador: 1 carta no pierde, 2 cartas −1, 3 cartas −2.</p>' +
    '<h3 class="tit">Modos</h3><p><b>Clásico</b>: el original. <b>Familiar y niños</b>: sin Caos, nadie queda fuera, no baja de 0, solo pierde 1 quien quede con 3. ' +
    '<b>Combos</b> (2–6): 6 cartas, tope 9; con n cartas al final pierdes n (1 carta no pierde).</p><p><b>Solitario</b>: ' + TEXTO_SOLO + '</p>' +
    '<div class="caja"><b class="fd">COMBOS</b><br>' + Object.keys(M.COMBOS).map(k => '<b>' + M.COMBOS[k].n + '</b> (' + M.COMBOS[k].e.map(x => M.NOMBRE[x]).join(' + ') + ') vence a ' + M.COMBOS[k].vence.map(v => M.COMBOS[v] ? M.COMBOS[v].n : M.NOMBRE[v]).join(', ')).join('<br>') + '</div>' +
    '<h3 class="tit">Extras</h3><p>El ganador tira primero la siguiente partida para mantener su racha; el que pierde reparte. Las partidas ganadas se cuentan para presumir.</p>' +
    '<button class="btn" data-a="inicio">Volver</button></div><span class="pagnum">PAG 03</span></div>';

  VISTAS.ajustes = () => '<div class="pag">' + franja('Ajustes', 'PAG 04') + '<div class="cuerpo"><h2 class="tit">AJUSTES</h2>' +
    '<span class="campo">Tu nombre</span><div class="asiento" style="grid-template-columns:1fr"><input data-c="minombre" value="' + esc(AJ.nombre) + '" maxlength="16"></div>' +
    '<label class="tg">Sonido<input type="checkbox" data-c="sonido"' + (AJ.sonido ? ' checked' : '') + '></label>' +
    '<label class="tg">Vibración<input type="checkbox" data-c="vibrar"' + (AJ.vibrar ? ' checked' : '') + '></label>' +
    '<label class="tg">Reducir animaciones<input type="checkbox" data-c="quieto"' + (AJ.quieto ? ' checked' : '') + '></label>' +
    '<label class="tg">Siguiente partida automática<input type="checkbox" data-c="auto"' + (AJ.auto ? ' checked' : '') + '></label>' +
    '<span class="campo">Velocidad de los bots</span>' + [['lenta', 'Lenta'], ['normal', 'Normal'], ['rapida', 'Rápida']].map(([v, n]) => '<button class="chip' + (AJ.velocidad === v ? ' on' : '') + '" data-a="vel" data-v="' + v + '">' + n + '</button>').join('') +
    '<span class="campo">Reverso de las cartas</span><div style="display:flex;gap:10px">' + [['baja', 'Gama baja'], ['media', 'Gama media'], ['alta', 'Gama alta']].map(([v, n]) =>
      '<button class="chip' + (AJ.reverso === v ? ' on' : '') + '" data-a="reverso" data-v="' + v + '" style="flex-direction:column;padding:6px">' + A.reverso(v, '') .replace('class="carta-svg ', 'style="width:56px;height:80px" class="carta-svg ') + n + '</button>').join('') + '</div>' +
    '<h3 class="tit">Bot de pruebas</h3><p class="nota">Simula partidas en este dispositivo y revisa reglas, puntajes y pantallas buscando errores.</p>' +
    '<button class="btn ms" data-a="autoprueba">Ejecutar bot de pruebas</button>' +
    '<button class="btn" data-a="borrar">Borrar datos guardados</button><button class="btn" data-a="inicio">Volver</button></div></div>';

  // ======================================================================
  // JUEGO (controlador)
  // ======================================================================
  function iniciar(cfg, red, extra) {
    if (G) clearTimeout(G.timer);
    const J = M.crearJuego(cfg);
    const locales = []; J.jug.forEach((j, i) => { if (j.tipo === 'humano') locales.push(i); });
    G = Object.assign({ J, locales, viendo: locales.length ? locales[0] : 0, cubierto: false, ultimo: null, sel: [], timer: 0, red: red || null, contado: 0, cfg, mapaRed: {} }, extra || {});
    G.cubierto = locales.length > 1 && J.jug[J.p.turno].tipo === 'humano';
    if (G.cubierto) G.viendo = J.p.turno;
    pantalla = 'mesa';
    cerrarCapa();
    if (!AJ.tutorial) { AJ.tutorial = true; guardaAJ(); ciclo(); tutorial(); return; }
    ciclo();
  }
  function tutorial() {
    capa('<div class="cuerpo"><h2 class="tit">ANTES DE <span class="rojo">EMPEZAR</span></h2>' + tablaVence() +
      '<p class="ital">Toca una carta resaltada para lanzarla. Si no tienes ninguna, estás cerrado: roba o pasa. Quédate sin cartas para ganar.</p>' +
      '<button class="btn rj" data-a="cerrar">¡A jugar!</button></div>');
  }
  function vistaActual() { return G.J ? M.vista(G.J, G.viendo) : G.vista; }
  function demora() { return DEMORA[AJ.velocidad] || 760; }
  function guardar() {
    if (!G || !G.J || G.red) return;
    if (G.J.terminado && G.J.p.fase === 'fin') LS.del('partida');
    else LS.set('partida', { J: G.J, locales: G.locales, viendo: G.viendo, cfg: G.cfg });
  }
  function ciclo() {
    if (!G) return;
    clearTimeout(G.timer);
    if (!G.J) { pintarMesaSegura(); return; }
    const J = G.J, p = J.p;
    guardar();
    if (G.red && window.Red) difundirVistas();
    if (p.fase === 'fin') {
      pintarMesaSegura();
      contarStats();
      G.timer = setTimeout(mostrarFin, AJ.quieto ? 300 : 1100);
      return;
    }
    const t = J.jug[p.turno];
    if (t.tipo === 'humano') {
      if (G.locales.length > 1 && G.viendo !== p.turno) { G.viendo = p.turno; G.cubierto = true; }
      pintarMesaSegura();
      if (!G.cubierto) SND.turno();
    } else {
      pintarMesaSegura();
      if (t.tipo === 'bot' || t.tipo === 'mazo') G.timer = setTimeout(() => { if (!G || G.J !== J) return; const a = IA.elegir(J); if (a) hacer(a, p.turno); }, demora());
    }
  }
  function pintarMesaSegura() {
    if (pantalla !== 'mesa') return;
    try { $('#app').innerHTML = mesaHTML(vistaActual()); } catch (e) { console.error(e); aviso('Error al pintar: ' + e.message); }
  }
  function rectDe(sel) { const el = document.querySelector(sel); return el ? el.getBoundingClientRect() : null; }
  // Aplica una acción (local o anfitrión). quien = asiento que actúa.
  function hacer(a, quien, rectOrigen) {
    if (!G || !G.J) return { ok: false };
    const origen = rectOrigen || rectDe('.rival[data-j="' + quien + '"]') || rectDe('.yo');
    const r = M.aplicar(G.J, a, quien);
    if (!r.ok) {
      const t = G.J.jug[quien];
      if (t && t.tipo === 'humano') { aviso(r.error); SND.error(); }
      return r;
    }
    G.ultimo = r.ev; G.sel = [];
    efectos(r.ev);
    ciclo();
    animar(r.ev, r.ev.t === 'jugar' ? origen : null);
    return r;
  }
  function efectos(ev) {
    if (!ev) return;
    if (ev.t === 'jugar') {
      if (ev.jugada.k === 'caos') {
        SND.caos();
        if (!AJ.quieto) {
          const f = document.createElement('div'); f.className = 'flash caos'; f.innerHTML = '<div class="grande">¡CAOS!</div>';
          document.body.appendChild(f); setTimeout(() => f.remove(), 1700);
        }
      } else SND.carta(elemsJugada(ev.jugada)[0]);
    } else if (ev.t === 'robar') SND.robar();
    else if (ev.t === 'pasar' || ev.t === 'apartar') SND.pasar();
  }
  function animar(ev, origen) {
    if (AJ.quieto || !origen) return;
    const el = document.querySelector('.pila .arriba'); if (!el) return;
    const d = el.getBoundingClientRect(); if (!d.width) return;
    const dx = origen.left + origen.width / 2 - (d.left + d.width / 2), dy = origen.top + origen.height / 2 - (d.top + d.height / 2);
    const s = Math.max(0.25, Math.min(1.2, origen.width / d.width));
    el.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')';
    el.getBoundingClientRect();
    el.classList.add('vuela');
    requestAnimationFrame(() => { el.style.transform = ''; });
  }
  // Acción del jugador de este dispositivo
  function jugadorActua(a, rect) {
    if (!G) return;
    const v = vistaActual();
    if (v.turno !== v.yo || v.fase === 'fin') { aviso('No es tu turno'); return; }
    if (G.J) hacer(a, v.yo, rect);
    else if (window.Red) { G.rectPend = rect; window.Red.enviar({ t: 'accion', a }); }
  }
  function contarStats() {
    const J = G.J; if (!J || G.contado === J.np || !J.p.fin) return;
    G.contado = J.np;
    const f = J.p.fin, loc = G.red ? [G.asientoLocal || 0] : G.locales;
    if (!loc.length) return;
    if (J.modo === 'solitario') { if (f.ganador === 0) ST.soloG++; else if (f.ganador === 1) ST.soloP++; guardaST(); return; }
    ST.partidas++;
    if (loc.indexOf(f.ganador) >= 0) { ST.ganadas++; if (f.tipo === 'caos') ST.caos++; }
    if (J.terminado && loc.indexOf(J.campeon) >= 0) ST.coronas++;
    guardaST();
  }

  // ---------- texto del cartel ----------
  function textoEvento(ev, v) {
    const n = i => i >= 0 && v.jug[i] ? esc(v.jug[i].nombre).toUpperCase() : 'MESA';
    if (!ev) {
      const top = v.mesa[v.mesa.length - 1];
      return 'PARTIDA ' + v.np + ' · LA MESA ABRE CON <b>' + nombreJugada(top) + '</b> · INICIA ' + n(v.turno);
    }
    if (ev.t === 'jugar') {
      const j = ev.jugada;
      if (j.k === 'caos') return n(ev.p) + ' LANZA <b>CAOS</b>: ¡FINAL TOTAL!';
      if (j.k === 'combo') return n(ev.p) + ': <b>' + nombreJugada(j) + '</b> VENCE A ' + nombreJugada(ev.sobre);
      return n(ev.p) + ': <b>' + NOM(j.e) + '</b> ' + (j.verbo || '').toUpperCase() + ' ' + nombreJugada(ev.sobre);
    }
    if (ev.t === 'robar') return n(ev.p) + ' ESTÁ CERRADO Y ROBA ' + ev.n;
    if (ev.t === 'pasar') return (ev.robo ? n(ev.p) + ' CEDE EL TURNO' : n(ev.p) + ' PASA (CERRADO)') + (ev.limpia ? ' · MESA LIMPIA: SALE <b>' + NOM(ev.limpia) + '</b>' : '');
    if (ev.t === 'apartar') return 'EL MAZO SACA ' + NOM(ev.carta.e) + (ev.sobre && ev.sobre.e === ev.carta.e ? ': REPETIDA' : ': NO SE SOBREPONE A ' + nombreJugada(ev.sobre)) + ', SE APARTA · <b>SIGUES TÚ</b>';
    if (ev.t === 'agotado') return 'EL MAZO SE AGOTÓ';
    return '';
  }

  // ---------- mesa ----------
  function mesaHTML(v) {
    const MD = M.MODOS[v.modo], yo = v.yo, top = v.mesa[v.mesa.length - 1], miTurno = v.turno === yo && v.fase !== 'fin';
    const rev = AJ.reverso;
    // rivales en orden de juego a partir de mí
    const orden = []; const n = v.jug.length;
    for (let k = 1; k < n; k++) orden.push((((yo + v.dir * k) % n) + n) % n);
    const rivales = orden.map(i => {
      const j = v.jug[i], esMazo = j.tipo === 'mazo';
      const cnt = esMazo ? v.rival.mazo : j.n;
      const fan = Array.from({ length: Math.min(esMazo ? 3 : cnt, MD.tope) }, () => A.reverso(rev)).join('');
      const racha = v.racha && v.racha.j === i && v.racha.n >= 2 ? ' · RACHA ×' + v.racha.n : '';
      const est = esMazo ? 'PUESTAS ' + v.rival.puestas + '/3 · APARTADAS ' + v.rival.apartadas : (j.fuera ? 'FUERA' : '★' + j.ganadas + racha + (j.tipo === 'bot' ? ' · ' + NIVEL[j.nivel] : j.tipo === 'red' ? ' · LAN' : ''));
      const ultima = !esMazo && !j.fuera && j.n === 1 && v.fase !== 'fin';
      return '<div class="rival' + (v.turno === i && v.fase !== 'fin' ? ' turno' : '') + (j.fuera ? ' fuera' : '') + (ultima ? ' ultima' : '') + '" data-j="' + i + '">' + (ultima ? '<span class="aviso1">¡ÚLTIMA!</span>' : '') + '<span class="n">' + cnt + '</span><div class="abanico">' + fan + '</div>' +
        '<div class="nm">' + esc(j.nombre) + '</div>' + (esMazo ? '' : '<div class="pt' + (j.puntos < 0 ? ' neg' : '') + '">' + j.puntos + '</div>') + '<div class="est">' + est + '</div></div>';
    }).join('');
    // historia (jugadas anteriores)
    const hist = v.mesa.slice(0, -1).slice(-6).map(m => elemsJugada(m).map(e => A.carta(e)).join('')).join('');
    // pila
    const prev = v.mesa.length > 1 ? v.mesa[v.mesa.length - 2] : null;
    let pila = prev ? A.carta(elemsJugada(prev)[0], 'debajo') : '';
    const te = elemsJugada(top);
    pila += te.length === 2 ? A.carta(te[0], 'arriba') + A.carta(te[1], 'combo2') : A.carta(te[0], 'arriba');
    const mazoN = v.mazo, solo = v.modo === 'solitario';
    const mazo = (mazoN ? Array.from({ length: Math.min(3, mazoN) }, () => A.reverso(rev)).join('') : '<div class="vacio"></div>') + '<span class="cnt">' + (solo ? 'AUXILIAR ' : 'MAZO ') + mazoN + '</span>';
    // mano
    const jugables = {}, combos = [];
    (v.acciones || []).forEach(a => {
      if (a.t !== 'jugar') return;
      const es = a.ids.map(id => (v.mano.find(c => c.id === id) || {}).e);
      if (es.length === 1) jugables[es[0]] = 1; else combos.push(es.slice().sort().join('+'));
    });
    const cubierta = G && G.cubierto;
    const mano = cubierta ? v.mano.map(() => '<div class="c">' + A.reverso(rev) + '</div>').join('') : v.mano.map(c => {
      const ok = miTurno && (jugables[c.e] || combos.some(k => k.split('+').indexOf(c.e) >= 0));
      const sel = G && G.sel.indexOf(c.id) >= 0;
      return '<button class="c ' + (miTurno ? (ok ? 'ok' : 'no') : '') + (sel ? ' sel' : '') + '" data-a="carta" data-id="' + c.id + '" aria-label="' + M.NOMBRE[c.e] + '">' + A.carta(c.e) + '</button>';
    }).join('');
    // acciones
    let acc = '', pista = '';
    const nt = v.jug[v.turno];
    if (v.fase === 'fin') { pista = 'Fin de la partida'; }
    else if (miTurno && !cubierta) {
      const robos = v.acciones.filter(a => a.t === 'robar'), pasa = v.acciones.find(a => a.t === 'pasar'), hayJ = v.acciones.some(a => a.t === 'jugar');
      robos.forEach(a => { acc += '<button class="btn ms" data-a="robar" data-n="' + a.n + '">Robar ' + a.n + '</button>'; });
      if (MD.combos && G.sel.length) acc += '<button class="btn rj" data-a="lanzar"' + (seleccionValida(v) ? '' : ' disabled') + '>Lanzar ' + (seleccionValida(v) ? esc(seleccionValida(v)) : '') + '</button>';
      if (pasa) acc += '<button class="btn" data-a="pasar">' + (v.fase === 'robado' ? 'Ceder turno' : 'Pasar') + '</button>';
      if (v.fase === 'robado') pista = hayJ ? 'Juega una carta resaltada o cede el turno.' : 'No te sirvió: cede el turno.';
      else if (hayJ) pista = (v.mano.some(c => c.e === 'caos') ? '¡Tienes CAOS! ' : '') + 'Para vencer a ' + nombreJugada(top) + ': ' + quienVence(top, v.modo).join(', ') + (MD.combos ? '. Toca 1 o 2 cartas y lanza.' : '.');
      else if (robos.length) pista = 'Estás cerrado: roba ' + (robos.length > 1 ? '1 a ' + robos.length + ' cartas.' : '1 carta.');
      else pista = 'Estás cerrado' + (v.mazo ? ' con el tope de cartas' : ' y el mazo está vacío') + ': pasa.';
    } else if (nt) pista = 'Turno de ' + esc(nt.nombre) + '…';
    const yoJ = v.jug[yo] || { nombre: '', puntos: 0, ganadas: 0 };
    const info = v.modo === 'solitario' ? 'TÚ ' + v.puestasJ + '/3 · MAZO ' + v.rival.puestas + '/3' : yoJ.puntos + ' PTS';
    const miRacha = v.racha && v.racha.j === yo && v.racha.n >= 2 ? ' · RACHA ×' + v.racha.n : '';
    const dirTxt = v.dir === 1 ? '↻' : '↺';
    const muchas = v.mano.length > 3;
    return '<div class="mesa">' +
      '<div class="msup"><button data-a="menuMesa" aria-label="Menú">☰</button><span class="t">PARTIDA ' + v.np + ' · ' + MD.n + (v.modo === 'solitario' ? '' : ' · META 10') + (G && G.red ? ' · LAN' : '') + '</span><span aria-label="Dirección">' + dirTxt + '</span></div>' +
      '<div class="rivales">' + rivales + '</div>' +
      '<div class="centro"><div class="historia">' + hist + '</div><div class="tablero"><div class="mazo">' + mazo + '</div><div class="pila">' + pila + '<span class="cnt">' + (solo ? 'MESA · ' + v.mesaN + 'ª' : 'MESA') + '</span></div></div>' +
      '<div class="cartel">' + textoEvento(G ? G.ultimo : null, v) + '</div><div class="pista">' + pista + '</div></div>' +
      '<div class="abajo"><div class="yo' + (miTurno ? ' turno' : '') + '"><span>' + esc(yoJ.nombre) + (v.modo === 'solitario' ? '' : ' · ★' + yoJ.ganadas + miRacha) + (miTurno ? ' · TU TURNO' : '') + '</span><span class="pts">' + info + '</span></div>' +
      '<div class="mano' + (muchas ? ' muchas' : '') + (miTurno ? '' : ' espera') + '" style="--n:' + v.mano.length + '">' + mano + '</div>' +
      '<div class="acc">' + acc + '</div></div></div>' +
      (cubierta ? '<div class="cubre">' + A.logo() + '<p class="maq">Pasa el dispositivo a</p><h2>' + esc(yoJ.nombre) + '</h2><button class="btn ms" style="max-width:320px" data-a="destapar">Soy ' + esc(yoJ.nombre) + ': ver mis cartas</button></div>' : '');
  }
  function seleccionValida(v) {
    const cartas = G.sel.map(id => v.mano.find(c => c.id === id)).filter(Boolean);
    if (!cartas.length) return '';
    const a = v.acciones.find(x => x.t === 'jugar' && x.ids.length === cartas.length && x.ids.map(id => (v.mano.find(c => c.id === id) || {}).e).sort().join('+') === cartas.map(c => c.e).sort().join('+'));
    if (!a) return '';
    if (cartas.length === 1) return NOM(cartas[0].e);
    const k = M.COMBO_DE[cartas.map(c => c.e).sort().join('+')];
    return k ? M.COMBOS[k].n : '';
  }

  // ---------- fin de partida / campeón ----------
  function mostrarFin() {
    if (!G || pantalla !== 'mesa') return;
    const v = vistaActual(); if (!v || !v.fin) return;
    const f = v.fin, gn = f.ganador >= 0 ? v.jug[f.ganador] : null, MD = M.MODOS[v.modo];
    let tit;
    if (v.modo === 'solitario') tit = f.ganador === 0 ? '¡GANASTE!' : f.ganador === 1 ? 'GANA EL MAZO' : 'EMPATE';
    else if (f.tipo === 'caos') tit = '¡CAOS! ' + esc(gn.nombre).toUpperCase() + ' +5';
    else if (f.tipo === 'cierre') tit = 'CIERRE POR LÓGICA';
    else tit = 'GANA ' + esc(gn.nombre).toUpperCase();
    const localGana = G.J ? (G.red ? f.ganador === 0 : G.locales.indexOf(f.ganador) >= 0) : f.ganador === v.yo;
    if (localGana) SND.ganar(); else SND.perder();
    let h = '<div class="franja"><span>Partida ' + v.np + '</span><span class="der">' + MD.n + '</span></div><div class="cuerpo">';
    h += '<h2 class="tit">' + tit + '</h2>';
    if (f.racha >= 2 && gn) h += '<p class="maq rojo">Racha ×' + f.racha + ': ' + esc(gn.nombre) + ' gana ' + f.racha + ' partidas seguidas</p>';
    if (f.tipo === 'cierre') h += '<p class="nota">Nadie pudo jugar ni robar en una vuelta completa: no hay ganador y se castiga por cartas.</p>';
    if (v.modo === 'solitario') {
      const mazoP = v.rival ? v.rival.puestas : 0;
      h += '<p class="ital">' + (f.tipo === 'caos' ? 'Una carta Caos decidió la batalla.' : f.tipo === 'agotado' ? 'El mazo rival se agotó: gana quien gastó más cartas.' : (f.ganador === 0 ? 'Gastaste tus 3 cartas primero' : 'El mazo gastó sus 3 cartas primero') + ', con la ' + f.mesaN + 'ª carta de la mesa.') + '</p>';
      h += '<div class="pelicula">Tú ' + v.puestasJ + '/3 · Mazo ' + mazoP + '/3 · Apartadas ' + (v.rival ? v.rival.apartadas : 0) + '</div>';
      h += '<p class="maq">Marcador · Tú ' + v.jug[0].ganadas + ' — Mazo ' + v.jug[1].ganadas + '</p>';
    } else {
      const min = MD.desc ? M.DESCALIFICA : 0, rango = M.META - min;
      h += '<table class="res"><tr><th>Jugador</th><th>Mano</th><th style="text-align:right">±</th><th style="text-align:right">Total</th></tr>';
      v.jug.forEach((j, i) => {
        const d = f.delta[i], recien = f.fuera.indexOf(i) >= 0;
        if (j.fuera && !recien) return;
        const pos = Math.max(0, Math.min(100, (j.puntos - min) / rango * 100));
        h += '<tr class="' + (i === f.ganador ? 'gana' : '') + (recien ? ' fuera' : '') + '"><td>' + esc(j.nombre) + (recien ? ' · FUERA' : '') + ' <small>★' + j.ganadas + '</small>' +
          '<div class="camino' + (MD.desc ? '' : ' sin-desc') + '"><i style="left:' + pos.toFixed(1) + '%"></i></div></td><td><span class="mini-c">' + f.cartas[i].map(e => A.carta(e)).join('') + '</span></td>' +
          '<td class="d ' + (d > 0 ? 'mas' : d < 0 ? 'menos' : '') + '">' + (d > 0 ? '+' : '') + d + '</td><td class="tot">' + j.puntos + '</td></tr>';
      });
      h += '</table>';
      // Suspenso: quién está cerca de la corona o de quedar fuera
      const notas = [];
      f.fuera.forEach(i => notas.push('<b>' + esc(v.jug[i].nombre) + '</b> queda descalificado (' + v.jug[i].puntos + ')'));
      if (!v.terminado) v.jug.forEach(j => {
        if (j.fuera) return;
        if (j.puntos >= M.META - 3) notas.push('<b>' + esc(j.nombre) + '</b> está a ' + (M.META - j.puntos) + ' de la corona');
        else if (MD.desc && j.puntos <= M.DESCALIFICA + 2) notas.push('<b>' + esc(j.nombre) + '</b> está a ' + (j.puntos - M.DESCALIFICA) + ' de quedar fuera');
      });
      if (notas.length) h += '<div class="caja roja">' + notas.join('<br>') + '</div>';
      const rp = f.reparte >= 0 ? v.jug[f.reparte].nombre : '—', ini = v.inicia >= 0 && v.jug[v.inicia] ? v.jug[v.inicia].nombre : '—';
      if (!v.terminado) h += '<p class="maq">Reparte: ' + esc(rp) + ' · Inicia: ' + esc(ini) + '</p>';
    }
    const manda = !!G.J;
    if (v.terminado) h += '<button class="btn rj" data-a="campeon">Ver campeón</button>';
    else if (manda) h += '<button class="btn rj" data-a="siguiente" id="btnSig">Siguiente partida</button>' + (AJ.auto ? '<button class="btn" data-a="pausaAuto" id="btnPausa">Pausar</button>' : '');
    else h += '<p class="nota">Esperando al anfitrión…</p>';
    h += '<button class="btn" data-a="salir">Salir</button></div>';
    capa(h);
    // Partida rápida: avanza sola tras una cuenta regresiva (se puede pausar)
    if (manda && !v.terminado && AJ.auto) {
      let t = 6;
      const tick = () => {
        const b = $('#btnSig'); if (!b || !G || G.np0 !== v.np) return;
        if (--t <= 0) { ACC.siguiente(); return; }
        b.textContent = 'Siguiente partida (' + t + ')';
        G.auto = setTimeout(tick, 1000);
      };
      G.np0 = v.np; clearTimeout(G.auto); G.auto = setTimeout(tick, 10);
    }
  }
  function mostrarCampeon() {
    const v = vistaActual();
    const c = v.campeon >= 0 ? v.jug[v.campeon] : null;
    SND.corona();
    const orden = v.jug.map((j, i) => ({ j, i })).sort((a, b) => b.j.puntos - a.j.puntos);
    let h = '<div class="franja"><span>Fin del juego</span><span class="der">' + v.np + ' partidas</span></div><div class="cuerpo" style="text-align:center">' + A.logo() .replace('class="logo', 'style="width:110px;height:110px" class="logo') +
      '<p class="maq">El verdadero ganador</p><div class="corona">' + (c ? 'REY DE REYES' : 'SIN CAMPEÓN') + '</div><h2 class="tit">' + (c ? esc(c.nombre) : 'Todos fuera') + '</h2>' +
      '<table class="res">' + orden.map(o => '<tr class="' + (o.i === v.campeon ? 'gana' : '') + (o.j.fuera ? ' fuera' : '') + '"><td>' + esc(o.j.nombre) + '</td><td>★' + o.j.ganadas + '</td><td class="tot">' + o.j.puntos + '</td></tr>').join('') + '</table>';
    if (G.J) h += '<button class="btn rj" data-a="revancha">Revancha</button>';
    h += '<button class="btn" data-a="salir">Inicio</button></div>';
    capa(h);
  }
  function menuMesa() {
    const v = vistaActual();
    capa('<div class="franja"><span>Pausa</span><span class="der">' + M.MODOS[v.modo].n + '</span></div><div class="cuerpo"><h2 class="tit">MENÚ</h2>' +
      '<button class="btn ms" data-a="cerrar">Seguir jugando</button>' +
      '<button class="btn" data-a="verVence">Quién vence a quién</button>' +
      '<label class="tg">Sonido<input type="checkbox" data-c="sonido"' + (AJ.sonido ? ' checked' : '') + '></label>' +
      '<span class="campo">Velocidad de los bots</span>' + [['lenta', 'Lenta'], ['normal', 'Normal'], ['rapida', 'Rápida']].map(([x, n]) => '<button class="chip' + (AJ.velocidad === x ? ' on' : '') + '" data-a="vel" data-v="' + x + '">' + n + '</button>').join('') +
      '<button class="btn rj" data-a="salir">' + (G && G.red ? 'Salir de la sala' : 'Guardar y salir') + '</button></div>');
  }
  function salir() {
    if (G) clearTimeout(G.timer);
    if (G && G.red && window.Red) window.Red.salir();
    if (G && G.J && G.J.terminado) LS.del('partida');
    G = null; ir('inicio');
  }

  // ======================================================================
  // BOT DE PRUEBAS (dentro del juego)
  // ======================================================================
  function autoprueba() {
    capa('<div class="cuerpo"><h2 class="tit">BOT DE PRUEBAS</h2><div class="pelicula" id="ap">Probando reglas, puntajes y pantallas…</div></div>');
    setTimeout(() => {
      const it = IA.iteraciones; IA.iteraciones = 6;
      const r = window.Pruebas.ejecutar({ juegos: 120, semilla: (Date.now() % 100000) + 1 });
      IA.iteraciones = it;
      // pantallas
      const errUI = [];
      const guardaP = pantalla, guardaG = G;
      ['inicio', 'nueva', 'reglas', 'ajustes', 'lan'].forEach(p => { try { const h = VISTAS[p](); if (!h || h.length < 100) errUI.push('Pantalla vacía: ' + p); } catch (e) { errUI.push(p + ': ' + e.message); } });
      ['clasico', 'familiar', 'combos', 'solitario'].forEach(modo => {
        try {
          const MD = M.MODOS[modo], js = [{ nombre: 'Yo', tipo: 'humano' }];
          for (let i = 1; i < Math.min(MD.max, 5); i++) js.push({ nombre: 'B' + i, tipo: 'bot', nivel: 1 });
          G = { J: M.crearJuego({ modo, jugadores: js, semilla: 99 }), locales: [0], viendo: 0, sel: [], ultimo: null };
          for (let k = 0; k < 60 && G.J.p.fase !== 'fin'; k++) {
            const h = mesaHTML(vistaActual()); if (h.indexOf('class="mesa"') < 0) errUI.push('Mesa mal: ' + modo);
            const a = IA.elegir(G.J); const res = M.aplicar(G.J, a); G.ultimo = res.ev;
            if (res.ok) textoEvento(res.ev, vistaActual());
          }
        } catch (e) { errUI.push('Mesa ' + modo + ': ' + e.message); }
      });
      G = guardaG; pantalla = guardaP;
      const ok = r.ok && !errUI.length;
      const lista = r.fallosCasos.concat(r.errores, errUI);
      const el = $('#ap'); if (!el) return;
      el.parentNode.innerHTML = '<h2 class="tit">' + (ok ? 'TODO <span class="rojo">OK</span>' : 'ERRORES') + '</h2>' +
        '<div class="pelicula">' + r.casos + ' casos de reglas · ' + r.juegos + ' juegos · ' + r.partidas + ' partidas · ' + r.acciones + ' acciones · ' + r.fuzz + ' acciones inválidas probadas · pantallas: ' + (errUI.length ? errUI.length + ' fallos' : 'ok') + ' · ' + r.ms + ' ms</div>' +
        (lista.length ? '<div class="caja roja">' + lista.slice(0, 15).map(esc).join('<br>') + '</div>' : '<p class="nota">Sin errores. Fines: ' + esc(JSON.stringify(r.fines)) + '</p>') +
        '<button class="btn" data-a="cerrar">Cerrar</button>';
      window.__autoprueba = { ok, r, errUI };
    }, 60);
  }

  // ======================================================================
  // LAN (interfaz; transporte en red.js)
  // ======================================================================
  let SALA = null; // { rol, asientos:[{nombre,tipo,nivel,par}], modo }
  VISTAS.lan = () => {
    const R = window.Red, disp = R && R.disponible();
    let h = '<div class="pag">' + franja('Modo LAN', 'Sin internet') + '<div class="cuerpo"><h2 class="tit">JUGAR EN LA <span class="rojo">MISMA WI-FI</span></h2>' +
      '<p class="ital">Todos conectados a la misma red Wi-Fi (o al punto de acceso de un celular). No necesita internet ni servidor.</p>';
    if (!disp) return h + '<div class="caja roja">Este navegador no permite conexiones directas (WebRTC). Prueba con Chrome, Edge o Firefox actualizados.</div><button class="btn" data-a="inicio">Volver</button></div></div>';
    if (!SALA) {
      h += '<button class="btn rj" data-a="crearSala">Crear sala <small>soy el anfitrión</small></button>' +
        '<button class="btn pt" data-a="unirme">Unirme <small>tengo un código</small></button>' +
        '<div class="pelicula">1 · El anfitrión crea la sala e invita · 2 · El invitado escanea o pega el código · 3 · El invitado muestra su respuesta · 4 · El anfitrión la escanea o pega · ¡Listo!</div>';
    } else if (SALA.rol === 'anfitrion') {
      const MD = M.MODOS[SALA.modo];
      h += '<span class="campo">Modo</span>' + [['clasico', 'Clásico'], ['familiar', 'Familiar'], ['combos', 'Combos']].map(([k, n]) => '<button class="chip' + (SALA.modo === k ? ' on' : '') + '" data-a="salaModo" data-v="' + k + '">' + n + '</button>').join('');
      h += '<span class="campo">Asientos (' + SALA.asientos.length + ' de ' + MD.min + '–' + MD.max + ')</span>';
      h += SALA.asientos.map((s, i) => '<div class="asiento" style="grid-template-columns:1fr auto"><span><b>' + esc(s.nombre) + '</b> <small class="maq">' + (i === 0 ? 'anfitrión' : s.tipo === 'red' ? (R.estado(s.par) || 'conectado') : 'bot ' + NIVEL[s.nivel]) + '</small></span>' +
        (i === 0 ? '<span></span>' : '<button class="mini-btn" data-a="salaQuitar" data-i="' + i + '">✕</button>') + '</div>').join('');
      h += '<div class="fila-btn"><button class="btn ms" data-a="invitar"' + (SALA.asientos.length >= MD.max ? ' disabled' : '') + '>+ Invitar</button><button class="btn" data-a="salaBot"' + (SALA.asientos.length >= MD.max ? ' disabled' : '') + '>+ Bot</button></div>';
      h += '<button class="btn rj" data-a="salaEmpezar"' + (SALA.asientos.length < MD.min ? ' disabled' : '') + '>Empezar</button>';
    } else {
      h += '<div class="pelicula">' + esc(SALA.estado || 'Conectando…') + '</div><p class="nota">Cuando el anfitrión empiece, la mesa aparecerá sola.</p>';
    }
    return h + '<button class="btn" data-a="lanSalir">' + (SALA ? 'Salir de la sala' : 'Volver') + '</button></div></div>';
  };
  function codigoHTML(cod, titulo, texto) {
    const qr = window.QR ? window.QR.svg(cod) : '';
    return '<h2 class="tit">' + titulo + '</h2><p class="nota">' + texto + '</p>' + (qr ? qr.replace('<svg', '<svg class="qr"') : '') +
      '<textarea class="codigo" readonly id="micod">' + esc(cod) + '</textarea><button class="btn" data-a="copiar">Copiar código</button>';
  }
  function lectorHTML(boton) {
    const cam = window.QRScan && window.QRScan.disponible();
    return (cam ? '<button class="btn ms" data-a="escanear">Escanear con la cámara</button><video class="cam oculto" id="cam" playsinline muted></video>' : '') +
      '<span class="campo">O pega el código</span><textarea class="codigo" id="sucod" placeholder="Pega aquí el código"></textarea><button class="btn rj" data-a="' + boton + '">Conectar</button>';
  }
  function difundirVistas() {
    const R = window.Red; if (!R || !G || !G.J) return;
    G.J.jug.forEach((j, i) => { if (j.tipo === 'red' && G.mapaRed && G.mapaRed[i]) R.enviarA(G.mapaRed[i], { t: 'vista', v: M.vista(G.J, i), ev: G.ultimo }); });
  }
  function redEventos() {
    const R = window.Red; if (!R || R._ui) return; R._ui = true;
    R.on('conectado', id => {
      if (R.rol === 'anfitrion') { if (pantalla === 'lan') { cerrarCapa(); pintar(); } }
      else { if (SALA) SALA.estado = 'Conectado. Esperando a que el anfitrión empiece…'; cerrarCapa(); if (pantalla === 'lan') pintar(); R.enviar({ t: 'hola', nombre: AJ.nombre }); }
    });
    R.on('mensaje', (id, o) => {
      if (!o || typeof o !== 'object') return;
      if (R.rol === 'anfitrion') {
        if (o.t === 'hola' && SALA) {
          const s = SALA.asientos.find(x => x.par === id);
          if (s) s.nombre = String(o.nombre || 'Invitado').slice(0, 16);
          else if (SALA.asientos.length < M.MODOS[SALA.modo].max) SALA.asientos.push({ nombre: String(o.nombre || 'Invitado').slice(0, 16), tipo: 'red', par: id });
          if (pantalla === 'lan') pintar();
        } else if (o.t === 'accion' && G && G.J) {
          const i = +Object.keys(G.mapaRed).find(k => G.mapaRed[k] === id);
          if (i >= 0) { const r = hacer(o.a, i); if (!r.ok) R.enviarA(id, { t: 'error', e: r.error }); }
        }
      } else {
        if (o.t === 'vista') {
          if (!G || G.J) { G = { J: null, vista: null, locales: [], viendo: 0, sel: [], ultimo: null, red: 'invitado' }; pantalla = 'mesa'; cerrarCapa(); }
          const antes = G.vista;
          G.vista = o.v; G.ultimo = o.ev; G.viendo = o.v.yo; G.sel = [];
          const nuevo = !antes || antes.np !== o.v.np || JSON.stringify(antes.mesa) !== JSON.stringify(o.v.mesa) || antes.turno !== o.v.turno || antes.fase !== o.v.fase;
          if (nuevo && o.ev && (!antes || antes.fase !== 'fin' || o.v.fase !== 'fin')) efectos(o.ev);
          const origen = o.ev && o.ev.t === 'jugar' ? (o.ev.p === o.v.yo ? G.rectPend : rectDe('.rival[data-j="' + o.ev.p + '"]')) : null;
          if (antes && antes.np !== o.v.np) cerrarCapa();
          pintarMesaSegura();
          if (nuevo) animar(o.ev, origen);
          if (o.v.turno === o.v.yo && o.v.fase !== 'fin' && nuevo) SND.turno();
          if (o.v.fase === 'fin' && (!antes || antes.fase !== 'fin' || antes.np !== o.v.np)) {
            setTimeout(mostrarFin, 1000);
            const f = o.v.fin; ST.partidas++;
            if (f.ganador === o.v.yo) { ST.ganadas++; if (f.tipo === 'caos') ST.caos++; }
            if (o.v.terminado && o.v.campeon === o.v.yo) ST.coronas++;
            guardaST();
          }
          if (o.v.terminado && o.v.fase === 'fin') { /* el campeón se ve desde el resumen */ }
        } else if (o.t === 'error') { aviso(o.e); SND.error(); }
        else if (o.t === 'sala' && SALA) { SALA.estado = o.texto; if (pantalla === 'lan') pintar(); }
      }
    });
    R.on('desconectado', id => {
      if (R.rol === 'anfitrion') {
        if (SALA) SALA.asientos = SALA.asientos.filter(s => s.par !== id || (G && G.J));
        if (G && G.J && G.mapaRed) {
          for (const k in G.mapaRed) if (G.mapaRed[k] === id) { G.J.jug[k].tipo = 'bot'; G.J.jug[k].nivel = 2; delete G.mapaRed[k]; aviso(G.J.jug[k].nombre + ' se desconectó: lo reemplaza un bot'); ciclo(); }
        } else if (pantalla === 'lan') pintar();
      } else {
        aviso('Se perdió la conexión con el anfitrión'); SALA = null;
        if (G && !G.J) { G = null; ir('lan'); }
      }
    });
  }

  // ======================================================================
  // ACCIONES (delegación de eventos)
  // ======================================================================
  const ACC = {
    inicio: () => ir('inicio'),
    nueva: () => ir('nueva'),
    reglas: () => ir('reglas'),
    ajustes: () => ir('ajustes'),
    lan: () => { redEventos(); ir('lan'); },
    cerrar: () => cerrarCapa(),
    rapida: () => iniciar({ modo: 'clasico', jugadores: [{ nombre: AJ.nombre, tipo: 'humano' }, { nombre: 'Ígnea', tipo: 'bot', nivel: 2 }, { nombre: 'Marea', tipo: 'bot', nivel: 2 }, { nombre: 'Céfiro', tipo: 'bot', nivel: 2 }], dir: 0 }),
    continuar: () => {
      const s = LS.get('partida', null); if (!s || !s.J) { aviso('No hay partida guardada'); return; }
      G = { J: s.J, locales: s.locales || [0], viendo: s.viendo || 0, cubierto: false, ultimo: null, sel: [], timer: 0, red: null, contado: s.J.p.fase === 'fin' ? s.J.np : 0, cfg: s.cfg };
      G.cubierto = G.locales.length > 1 && G.J.jug[G.J.p.turno].tipo === 'humano';
      if (G.cubierto) G.viendo = G.J.p.turno;
      pantalla = 'mesa'; ciclo();
    },
    modo: b => { NP.modo = b.dataset.v; NP.mesaLimpia = null; LS.set('config', NP); pintar(); },
    dir: b => { NP.dir = +b.dataset.v; LS.set('config', NP); pintar(); },
    castigo: b => { NP.castigoCaos = b.dataset.v; LS.set('config', NP); pintar(); },
    mas: b => { if (b.dataset.v === 'bot') NP.asientos.push(nuevoBot()); else NP.asientos.push({ nombre: 'Jugador ' + (NP.asientos.length + 1), tipo: 'humano', nivel: 2 }); LS.set('config', NP); pintar(); },
    quitar: b => { NP.asientos.splice(+b.dataset.i, 1); LS.set('config', NP); pintar(); },
    empezar: () => {
      LS.set('config', NP);
      const ml = NP.mesaLimpia == null ? NP.modo === 'combos' : NP.mesaLimpia;
      const jug = NP.modo === 'solitario' ? [{ nombre: AJ.nombre, tipo: 'humano' }] : NP.asientos.map(s => ({ nombre: s.nombre || 'Jugador', tipo: s.tipo, nivel: s.nivel }));
      try { iniciar({ modo: NP.modo, jugadores: jug, dir: NP.dir, castigoCaos: NP.castigoCaos, mesaLimpia: ml, caos: NP.caos }); } catch (e) { aviso(e.message); }
    },
    carta: b => {
      if (!G || G.cubierto) return;
      const v = vistaActual(), id = +b.dataset.id, c = v.mano.find(x => x.id === id);
      if (!c) return;
      if (v.turno !== v.yo || v.fase === 'fin') { aviso('Espera tu turno'); return; }
      const MD = M.MODOS[v.modo];
      if (MD.combos) {
        const k = G.sel.indexOf(id);
        if (k >= 0) G.sel.splice(k, 1); else { if (G.sel.length >= 2) G.sel.shift(); G.sel.push(id); }
        SND.toque(); pintarMesaSegura(); return;
      }
      const ok = v.acciones.some(a => a.t === 'jugar' && a.ids.length === 1 && (v.mano.find(x => x.id === a.ids[0]) || {}).e === c.e);
      if (!ok) { const top = v.mesa[v.mesa.length - 1]; aviso(NOM(c.e) + ' no vence a ' + nombreJugada(top)); SND.error(); return; }
      jugadorActua({ t: 'jugar', ids: [id] }, b.getBoundingClientRect());
    },
    lanzar: () => {
      const v = vistaActual();
      if (!seleccionValida(v)) { aviso('Esa jugada no vence a la mesa'); SND.error(); return; }
      const el = document.querySelector('.mano .c.sel');
      jugadorActua({ t: 'jugar', ids: G.sel.slice() }, el ? el.getBoundingClientRect() : null);
    },
    robar: b => jugadorActua({ t: 'robar', n: +b.dataset.n }),
    pasar: () => jugadorActua({ t: 'pasar' }),
    destapar: () => { G.cubierto = false; SND.turno(); pintarMesaSegura(); },
    menuMesa: () => menuMesa(),
    verVence: () => capa('<div class="cuerpo"><h2 class="tit">QUIÉN VENCE</h2>' + tablaVence() + '<button class="btn" data-a="cerrar">Volver</button></div>'),
    pausaAuto: () => { if (G) { clearTimeout(G.auto); G.np0 = -1; } const b = $('#btnSig'); if (b) b.textContent = 'Siguiente partida'; const pz = $('#btnPausa'); if (pz) pz.remove(); },
    siguiente: () => {
      if (!G || !G.J || G.J.p.fase !== 'fin' || G.J.terminado) return;
      clearTimeout(G.auto); G.np0 = -1;
      cerrarCapa(); M.nuevaPartida(G.J); G.ultimo = null; G.sel = [];
      SND.robar(); setTimeout(() => SND.robar(), 120);
      if (G.locales.length > 1 && G.J.jug[G.J.p.turno].tipo === 'humano') { G.viendo = G.J.p.turno; G.cubierto = true; }
      ciclo();
    },
    campeon: () => mostrarCampeon(),
    revancha: () => {
      if (!G || !G.J) return;
      const cfg = Object.assign({}, G.cfg, { jugadores: G.J.jug.map(j => ({ nombre: j.nombre, tipo: j.tipo, nivel: j.nivel })), semilla: 0 });
      if (G.red) iniciar(cfg, 'anfitrion', { mapaRed: G.mapaRed, asientoLocal: 0 }); else iniciar(cfg);
    },
    salir: () => salir(),
    vel: b => { AJ.velocidad = b.dataset.v; guardaAJ(); if (pantalla === 'ajustes') pintar(); else menuMesa(); },
    reverso: b => { AJ.reverso = b.dataset.v; guardaAJ(); pintar(); },
    autoprueba: () => autoprueba(),
    borrar: () => { if (!confirm('¿Borrar partida guardada, ajustes y récord?')) return; ['partida', 'ajustes', 'stats', 'config'].forEach(LS.del); location.reload(); },
    // LAN
    crearSala: () => { window.Red.anfitrion(); SALA = { rol: 'anfitrion', modo: 'clasico', asientos: [{ nombre: AJ.nombre, tipo: 'humano' }] }; pintar(); },
    unirme: () => { SALA = { rol: 'invitado', estado: 'Escanea o pega el código del anfitrión' }; pintar(); capa('<div class="cuerpo"><h2 class="tit">UNIRME</h2><p class="nota">Pide al anfitrión que toque «+ Invitar» y te muestre su código.</p>' + lectorHTML('responder') + '<button class="btn" data-a="cerrar">Cancelar</button></div>'); },
    invitar: async () => {
      capa('<div class="cuerpo"><h2 class="tit">INVITAR</h2><div class="pelicula">Preparando código…</div></div>');
      try {
        const cod = await window.Red.invitar();
        capa('<div class="cuerpo">' + codigoHTML(cod, 'INVITAR', 'Paso 1: el invitado escanea o pega este código.') + '<h3 class="tit">Paso 2: su respuesta</h3>' + lectorHTML('aceptar') + '<button class="btn" data-a="cerrar">Cerrar</button></div>');
      } catch (e) { capa('<div class="cuerpo"><div class="caja roja">' + esc(e.message) + '</div><button class="btn" data-a="cerrar">Cerrar</button></div>'); }
    },
    responder: async (b, cod) => {
      const txt = cod || ($('#sucod') || {}).value || '';
      if (!txt.trim()) { aviso('Pega o escanea el código'); return; }
      try {
        const resp = await window.Red.unirse(txt.trim());
        SALA.estado = 'Esperando a que el anfitrión lea tu respuesta…';
        capa('<div class="cuerpo">' + codigoHTML(resp, 'TU RESPUESTA', 'Muéstrale este código al anfitrión para que lo escanee o pegue.') + '<button class="btn" data-a="cerrar">Listo</button></div>');
        pintar();
      } catch (e) { aviso('Código inválido: ' + e.message); SND.error(); }
    },
    aceptar: async (b, cod) => {
      const txt = cod || ($('#sucod') || {}).value || '';
      if (!txt.trim()) { aviso('Pega o escanea la respuesta'); return; }
      try { await window.Red.aceptar(txt.trim()); aviso('Conectando…'); } catch (e) { aviso('Respuesta inválida: ' + e.message); SND.error(); }
    },
    escanear: b => {
      const v = $('#cam'); if (!v || !window.QRScan) return;
      v.classList.remove('oculto'); b.disabled = true;
      const accion = document.querySelector('#capa [data-a="responder"]') ? 'responder' : 'aceptar';
      window.QRScan.iniciar(v, txt => { v.classList.add('oculto'); ACC[accion](null, txt); }, e => { aviso('Cámara: ' + e); b.disabled = false; });
    },
    copiar: () => {
      const t = $('#micod'); if (!t) return;
      t.select();
      const ok = () => aviso('Código copiado');
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t.value).then(ok, () => { try { document.execCommand('copy'); ok(); } catch (e) {} });
      else { try { document.execCommand('copy'); ok(); } catch (e) {} }
    },
    salaModo: b => { SALA.modo = b.dataset.v; const MD = M.MODOS[SALA.modo]; if (SALA.asientos.length > MD.max) SALA.asientos.length = MD.max; pintar(); },
    salaBot: () => { const us = SALA.asientos.map(s => s.nombre); SALA.asientos.push({ nombre: NOMBRES_BOT.find(n => us.indexOf(n) < 0) || 'Bot', tipo: 'bot', nivel: 2 }); pintar(); },
    salaQuitar: b => { const s = SALA.asientos[+b.dataset.i]; if (s && s.par) window.Red.cerrar(s.par); SALA.asientos.splice(+b.dataset.i, 1); pintar(); },
    salaEmpezar: () => {
      const mapa = {};
      const jug = SALA.asientos.map((s, i) => { if (s.tipo === 'red') mapa[i] = s.par; return { nombre: s.nombre, tipo: s.tipo, nivel: s.nivel || 2 }; });
      try { iniciar({ modo: SALA.modo, jugadores: jug, dir: 0 }, 'anfitrion', { mapaRed: mapa, asientoLocal: 0 }); } catch (e) { aviso(e.message); }
    },
    lanSalir: () => { if (window.Red) window.Red.salir(); SALA = null; ir('inicio'); }
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-a]');
    if (b && !b.disabled && ACC[b.dataset.a]) { e.preventDefault(); try { ACC[b.dataset.a](b, null); } catch (er) { console.error(er); aviso('Error: ' + er.message); } return; }
    if (e.target.id === 'capa' && !document.querySelector('#capa [data-a="siguiente"],#capa [data-a="campeon"],#capa [data-a="revancha"]')) cerrarCapa();
  });
  document.addEventListener('change', e => {
    const t = e.target, c = t.dataset && t.dataset.c; if (!c) return;
    const i = +t.dataset.i;
    if (c === 'nombre') { NP.asientos[i].nombre = t.value.slice(0, 16) || 'Jugador'; LS.set('config', NP); }
    else if (c === 'tipo') { NP.asientos[i].tipo = t.value; LS.set('config', NP); pintar(); }
    else if (c === 'nivel') { NP.asientos[i].nivel = +t.value; LS.set('config', NP); }
    else if (c === 'mesaLimpia') { NP.mesaLimpia = t.checked; LS.set('config', NP); }
    else if (c === 'caos') { NP.caos = t.checked; LS.set('config', NP); }
    else if (c === 'minombre') { AJ.nombre = t.value.slice(0, 16) || 'Tú'; if (NP.asientos[0] && NP.asientos[0].tipo === 'humano') NP.asientos[0].nombre = AJ.nombre; guardaAJ(); LS.set('config', NP); }
    else if (c === 'sonido' || c === 'vibrar' || c === 'quieto' || c === 'auto') { AJ[c] = t.checked; guardaAJ(); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarCapa(); });
  window.addEventListener('pagehide', guardar);

  // ---------- arranque ----------
  function arrancar() {
    A.instalar();
    guardaAJ();
    if (!$('#aviso')) { const a = document.createElement('div'); a.id = 'aviso'; a.setAttribute('role', 'status'); document.body.appendChild(a); }
    pintar();
  }
  window.NexusUI = { ir, iniciar, vistaActual, get G() { return G; }, ACC, autoprueba, VISTAS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar); else arrancar();
})();
