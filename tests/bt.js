// Prueba del modo Bluetooth (lógica JS) con un puente nativo simulado: dos páginas cuyo "AndroidBT"
// se conecta a través de Node imitando a la app Android (RFCOMM). node tests/bt.js
'use strict';
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
const fallos = [];
const ok = (c, m) => { if (!c) { fallos.push(m); console.log('  ✗', m); } else console.log('  ✓', m); };
const SIMULADO = n => {
  window.AndroidBT = {
    estado: () => 'ok', pedirPermiso() {}, activar() {},
    emparejados: () => JSON.stringify([{ nombre: 'Celular de Ana', mac: 'AA:BB' }]),
    abrirSala: () => { window.__bt('abrir'); }, unirse: mac => { window.__bt('unirse', mac); },
    enviar: (id, t) => { window.__bt('enviar', id, t); }, cerrar: id => { window.__bt('cerrar', id); }, salir: () => { window.__bt('salir'); }
  };
  try { localStorage.setItem('nexus.ajustes', JSON.stringify({ velocidad: 'rapida', quieto: true, sonido: false, tutorial: true, nombre: n })); } catch (e) {}
};
(async () => {
  const b = await chromium.launch();
  const errores = [];
  const pag = async nombre => {
    const ctx = await b.newContext({ viewport: { width: 360, height: 740 } });
    const p = await ctx.newPage();
    p.on('pageerror', e => errores.push(nombre + ': ' + e.message));
    p.on('console', m => { if (m.type() === 'error') errores.push(nombre + ': ' + m.text()); });
    await p.addInitScript(SIMULADO, nombre);
    return p;
  };
  const H = await pag('Ana'), I = await pag('Beto');
  let abierta = false, cola = Promise.resolve();
  const ev = (p, t, id, d) => { cola = cola.then(() => p.evaluate(([t, id, d]) => window.BTNativo.evento(t, id, d), [t, id, d]).catch(() => {})); };
  await H.exposeFunction('__bt', (op, a, c) => {
    if (op === 'abrir') { abierta = true; ev(H, 'sala', '', 'abierta'); }
    else if (op === 'enviar') ev(I, 'mensaje', 'h0', c);
    else if (op === 'cerrar' || op === 'salir') ev(I, 'desconectado', 'h0', '');
  });
  await I.exposeFunction('__bt', (op, a, c) => {
    if (op === 'unirse') { if (abierta) { ev(H, 'conectado', 'b1', ''); ev(I, 'conectado', 'h0', ''); } else ev(I, 'desconectado', 'h0', ''); }
    else if (op === 'enviar') ev(H, 'mensaje', 'b1', c);
    else if (op === 'cerrar' || op === 'salir') ev(H, 'desconectado', 'b1', '');
  });
  await H.goto(URL); await I.goto(URL);
  await H.click('[data-a="lan"]');
  ok(await H.isVisible('[data-a="crearSalaBT"]'), 'Con la app Android aparece "Crear sala Bluetooth"');
  await H.click('[data-a="crearSalaBT"]');
  await H.waitForTimeout(300);
  ok(await H.evaluate(() => document.body.textContent.includes('sala abierta')), 'Sala Bluetooth abierta');
  await I.click('[data-a="lan"]'); await I.click('[data-a="unirmeBT"]');
  ok(await I.isVisible('text=Celular de Ana'), 'El invitado ve los celulares emparejados');
  await I.click('[data-a="btUnir"]');
  await H.waitForFunction(() => document.body.textContent.includes('Beto'), null, { timeout: 8000 }).catch(() => {});
  ok(await H.evaluate(() => document.body.textContent.includes('Beto')), 'El anfitrión ve a Beto conectado por Bluetooth');
  await H.click('[data-a="salaBot"]'); await H.click('[data-a="salaEmpezar"]');
  await I.waitForSelector('.mesa', { timeout: 8000 }).catch(() => {});
  ok(await I.isVisible('.mesa'), 'La mesa aparece en el invitado');
  const tocar = p => p.evaluate(() => {
    const q = s => document.querySelector(s);
    if (q('[data-a="campeon"]')) return 'campeon';
    if (q('[data-a="siguiente"]')) { q('[data-a="siguiente"]').click(); return 'sig'; }
    const c = document.querySelectorAll('.mano .c.ok'); if (c.length) { c[0].click(); return 'c'; }
    const r = q('[data-a="robar"]'); if (r) { r.click(); return 'r'; }
    const s = q('[data-a="pasar"]'); if (s) { s.click(); return 'p'; }
    return '';
  });
  let fin = false;
  for (let k = 0; k < 1500 && !fin; k++) { const a = await tocar(H); await tocar(I); if (a === 'campeon') fin = true; else await H.waitForTimeout(30); }
  ok(fin, 'Juego por Bluetooth completo hasta el campeón');
  await I.waitForTimeout(500);
  const vh = await H.evaluate(() => JSON.stringify(window.NexusUI.vistaActual().jug.map(j => j.puntos)));
  const vi = await I.evaluate(() => JSON.stringify(window.NexusUI.vistaActual().jug.map(j => j.puntos)));
  ok(vh === vi, 'Puntos sincronizados ' + vh);
  ok(!errores.length, 'Sin errores de consola ' + errores.slice(0, 3).join(' | '));
  await b.close();
  console.log(fallos.length ? 'FALLÓ ✘ (' + fallos.length + ')' : 'OK ✔');
  process.exit(fallos.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
