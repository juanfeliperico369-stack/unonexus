// Prueba de interfaz con Playwright: node tests/ui.js [carpetaCapturas]
// Juega partidas reales tocando la pantalla (360x740), prueba modos, pasa-el-celular y el bot de pruebas interno.
'use strict';
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
const OUT = process.argv[2] || '';
const fallos = [];
const ok = (c, m) => { if (!c) { fallos.push(m); console.log('  ✗', m); } else console.log('  ✓', m); };

async function jugarTurnos(p, max) {
  // Toca lo que haya: carta resaltada, lanzar, robar, ceder/pasar, destapar, siguiente partida.
  for (let k = 0; k < max; k++) {
    const hecho = await p.evaluate(() => {
      const q = s => document.querySelector(s);
      const clic = el => { el.click(); return true; };
      if (q('[data-a="campeon"]')) return 'campeon';
      if (q('[data-a="siguiente"]')) return clic(q('[data-a="siguiente"]')) && 'sig';
      if (q('[data-a="cerrar"]') && q('#capa') && !q('#capa [data-a="siguiente"]')) return clic(q('[data-a="cerrar"]')) && 'cerrar';
      if (q('[data-a="destapar"]')) return clic(q('[data-a="destapar"]')) && 'destapar';
      const okc = document.querySelectorAll('.mano .c.ok');
      if (okc.length) {
        const combo = document.querySelector('.mano.muchas');
        clic(okc[Math.floor(Math.random() * okc.length)]);
        if (combo || q('[data-a="lanzar"]')) { const l = q('[data-a="lanzar"]'); if (l && !l.disabled) return clic(l) && 'lanzar'; const o2 = document.querySelectorAll('.mano .c.ok:not(.sel)'); if (o2.length) { clic(o2[0]); const l2 = q('[data-a="lanzar"]'); if (l2 && !l2.disabled) return clic(l2) && 'combo'; } return 'sel'; }
        return 'carta';
      }
      const r = q('[data-a="robar"]'); if (r) return clic(r) && 'robar';
      const ps = q('[data-a="pasar"]'); if (ps) return clic(ps) && 'pasar';
      return '';
    });
    if (hecho === 'campeon') return 'campeon';
    await p.waitForTimeout(hecho ? 60 : 120);
  }
  return 'max';
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', e => errores.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errores.push('console: ' + m.text()); });
  await p.addInitScript(() => { try { localStorage.setItem('nexus.ajustes', JSON.stringify({ velocidad: 'rapida', quieto: true, sonido: false, tutorial: false, reverso: 'alta', toqueRapido: true })); } catch (e) {} });
  await p.goto(URL);
  console.log('Inicio');
  ok(await p.isVisible('text=SOLO UN VERDADERO GANADOR'), 'Portada visible');
  const ancho = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(ancho <= 360, 'Sin desbordamiento horizontal en portada (' + ancho + 'px)');
  if (OUT) await p.screenshot({ path: path.join(OUT, 'ui-inicio.png') });
  console.log('Jugar ya (clásico vs 3 bots)');
  await p.click('[data-a="rapida"]');
  ok(await p.isVisible('text=¡A jugar!'), 'Tutorial al primer juego');
  await p.click('text=¡A jugar!');
  ok(await p.isVisible('.mesa'), 'Mesa visible');
  await p.waitForTimeout(500);
  if (OUT) await p.screenshot({ path: path.join(OUT, 'ui-mesa.png') });
  const anchoM = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(anchoM <= 360, 'Sin desbordamiento en mesa (' + anchoM + 'px)');
  const r1 = await jugarTurnos(p, 1500);
  ok(r1 === 'campeon', 'Juego clásico completo hasta el campeón (' + r1 + ')');
  if (r1 === 'campeon') {
    await p.click('[data-a="campeon"]');
    ok(await p.isVisible('.corona'), 'Pantalla de campeón');
    if (OUT) await p.screenshot({ path: path.join(OUT, 'ui-campeon.png') });
    await p.click('#capa [data-a="salir"]');
  }
  console.log('Nueva partida: Combos con 2 humanos (pasa el celular)');
  await p.click('[data-a="nueva"]');
  await p.click('[data-a="modo"][data-v="combos"]');
  await p.selectOption('select[data-c="tipo"][data-i="1"]', 'humano');
  await p.click('[data-a="empezar"]');
  ok(await p.isVisible('.cubre') || await p.isVisible('.mesa'), 'Mesa de Combos con cubierta para pasar el celular');
  const r2 = await jugarTurnos(p, 900);
  ok(r2 === 'campeon' || r2 === 'max', 'Combos jugable con 2 humanos (' + r2 + ')');
  await p.evaluate(() => window.NexusUI.ACC.salir());
  console.log('Solitario y Familiar');
  for (const modo of ['solitario', 'familiar']) {
    await p.click('[data-a="nueva"]');
    await p.click('[data-a="modo"][data-v="' + modo + '"]');
    await p.click('[data-a="empezar"]');
    const r = await jugarTurnos(p, 200);
    const v = await p.evaluate(() => window.NexusUI.vistaActual());
    ok(v && v.np >= 1, modo + ': ' + v.np + ' partidas jugadas (' + r + ')');
    await p.evaluate(() => window.NexusUI.ACC.salir());
  }
  console.log('Guardar y continuar');
  await p.click('[data-a="rapida"]');
  await p.waitForTimeout(300);
  await p.evaluate(() => window.NexusUI.ACC.salir());
  ok(await p.isVisible('[data-a="continuar"]'), 'Botón continuar tras salir');
  await p.click('[data-a="continuar"]');
  ok(await p.isVisible('.mesa'), 'Partida continuada');
  await p.evaluate(() => window.NexusUI.ACC.salir());
  console.log('Pantallas');
  for (const s of ['reglas', 'ajustes', 'lan']) {
    await p.click('[data-a="' + s + '"]');
    const w = await p.evaluate(() => document.documentElement.scrollWidth);
    ok(w <= 360, s + ' sin desbordamiento (' + w + 'px)');
    if (OUT && s === 'reglas') await p.screenshot({ path: path.join(OUT, 'ui-reglas.png'), fullPage: true });
    await p.click('[data-a="' + (s === 'lan' ? 'lanSalir' : 'inicio') + '"]');
  }
  console.log('Bot de pruebas interno');
  await p.click('[data-a="ajustes"]');
  await p.click('[data-a="autoprueba"]');
  await p.waitForFunction(() => window.__autoprueba, null, { timeout: 120000 });
  const ap = await p.evaluate(() => ({ ok: window.__autoprueba.ok, j: window.__autoprueba.r.juegos, e: window.__autoprueba.r.errores.concat(window.__autoprueba.r.fallosCasos, window.__autoprueba.errUI).slice(0, 5), ms: window.__autoprueba.r.ms }));
  ok(ap.ok, 'Bot de pruebas interno: ' + ap.j + ' juegos en ' + ap.ms + ' ms ' + ap.e.join(' | '));
  ok(!errores.length, 'Sin errores de consola (' + errores.length + ') ' + errores.slice(0, 5).join(' | '));
  await b.close();
  console.log(fallos.length ? 'FALLÓ ✘ (' + fallos.length + ')' : 'OK ✔');
  process.exit(fallos.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
