// Prueba LAN real: dos navegadores (anfitrión e invitado) se conectan por WebRTC con los códigos y juegan.
// node tests/lan.js [carpetaCapturas]
'use strict';
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
const OUT = process.argv[2] || '';
const fallos = [];
const ok = (c, m) => { if (!c) { fallos.push(m); console.log('  ✗', m); } else console.log('  ✓', m); };
async function pagina(b, nombre, errores) {
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  p.on('pageerror', e => errores.push(nombre + ' pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errores.push(nombre + ' console: ' + m.text()); });
  await p.addInitScript(n => { try { localStorage.setItem('nexus.ajustes', JSON.stringify({ velocidad: 'rapida', quieto: true, sonido: false, tutorial: true, nombre: n, toqueRapido: true })); } catch (e) {} }, nombre);
  await p.goto(URL);
  return p;
}
async function tocar(p) {
  return p.evaluate(() => {
    const q = s => document.querySelector(s);
    if (q('[data-a="campeon"]')) return 'campeon';
    if (q('[data-a="siguiente"]')) { q('[data-a="siguiente"]').click(); return 'sig'; }
    const c = document.querySelectorAll('.mano .c.ok'); if (c.length) { c[0].click(); return 'carta'; }
    const r = q('[data-a="robar"]'); if (r) { r.click(); return 'robar'; }
    const s = q('[data-a="pasar"]'); if (s) { s.click(); return 'pasar'; }
    return '';
  });
}
(async () => {
  const b = await chromium.launch();
  const errores = [];
  const H = await pagina(b, 'Ana', errores), I = await pagina(b, 'Beto', errores);
  console.log('Conexión por códigos');
  await H.click('[data-a="lan"]'); await H.click('[data-a="crearSala"]'); await H.click('[data-a="invitar"]');
  await H.waitForSelector('#micod', { timeout: 15000 });
  const oferta = await H.inputValue('#micod');
  ok(oferta.startsWith('NX1') || oferta.startsWith('NX0'), 'Código de invitación generado (' + oferta.length + ' caracteres)');
  ok(await H.isVisible('svg.qr'), 'QR de invitación visible');
  await I.click('[data-a="lan"]'); await I.click('[data-a="unirme"]');
  await I.fill('#sucod', oferta); await I.click('[data-a="responder"]');
  await I.waitForSelector('#micod', { timeout: 15000 });
  const resp = await I.inputValue('#micod');
  ok(resp.length > 20, 'Respuesta del invitado (' + resp.length + ' caracteres)');
  await H.fill('#sucod', resp); await H.click('[data-a="aceptar"]');
  await H.waitForFunction(() => document.body.textContent.includes('Beto'), null, { timeout: 15000 }).catch(() => {});
  ok(await H.evaluate(() => document.body.textContent.includes('Beto')), 'El anfitrión ve a Beto en la sala');
  ok(await I.evaluate(() => document.body.textContent.includes('Conectado')), 'El invitado está conectado');
  await H.click('[data-a="salaBot"]');
  if (OUT) await H.screenshot({ path: path.join(OUT, 'lan-sala.png') });
  await H.click('[data-a="salaEmpezar"]');
  await I.waitForSelector('.mesa', { timeout: 10000 }).catch(() => {});
  ok(await I.isVisible('.mesa'), 'La mesa aparece sola en el invitado');
  console.log('Jugar en red');
  let fin = false;
  for (let k = 0; k < 1500 && !fin; k++) {
    const a = await tocar(H), c = await tocar(I);
    if (a === 'campeon') fin = true;
    if (!a && !c) await H.waitForTimeout(80);
  }
  ok(fin, 'Juego en red completo hasta el campeón');
  const vh = await H.evaluate(() => { const v = window.NexusUI.vistaActual(); return { np: v.np, pts: v.jug.map(j => j.puntos).join(), mesa: JSON.stringify(v.mesa) }; });
  await I.waitForTimeout(400);
  const vi = await I.evaluate(() => { const v = window.NexusUI.vistaActual(); return { np: v.np, pts: v.jug.map(j => j.puntos).join(), mesa: JSON.stringify(v.mesa) }; });
  ok(vh.np === vi.np && vh.pts === vi.pts && vh.mesa === vi.mesa, 'Anfitrión e invitado sincronizados (partida ' + vh.np + ', puntos ' + vh.pts + ')');
  if (OUT) await I.screenshot({ path: path.join(OUT, 'lan-invitado.png') });
  console.log('Desconexión');
  await H.click('[data-a="campeon"]'); await H.click('#capa [data-a="revancha"]');
  await I.waitForTimeout(600);
  await I.close();
  await H.waitForFunction(() => window.NexusUI.G && window.NexusUI.G.J.jug[1].tipo === 'bot', null, { timeout: 15000 }).catch(() => {});
  const tipo = await H.evaluate(() => window.NexusUI.G && window.NexusUI.G.J.jug[1].tipo);
  ok(tipo === 'bot', 'Al irse el invitado, un bot ocupa su puesto (' + tipo + ')');
  ok(!errores.length, 'Sin errores de consola (' + errores.length + ') ' + errores.slice(0, 4).join(' | '));
  await b.close();
  console.log(fallos.length ? 'FALLÓ ✘ (' + fallos.length + ')' : 'OK ✔');
  process.exit(fallos.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
