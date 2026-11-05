// Prueba de v1.3: Reto del día (mismas barajas y resultado para compartir), Anotador de cartas físicas, Logros.
// node tests/extras.js
'use strict';
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
const fallos = [];
const ok = (c, m) => { if (!c) { fallos.push(m); console.log('  ✗', m); } else console.log('  ✓', m); };
const AJ = () => { try { localStorage.setItem('nexus.ajustes', JSON.stringify({ velocidad: 'rapida', quieto: true, sonido: false, tutorial: true, auto: false })); } catch (e) {} };
async function jugar(p, max) {
  for (let k = 0; k < max; k++) {
    const r = await p.evaluate(() => {
      const q = s => document.querySelector(s);
      if (q('[data-a="campeon"]')) return 'campeon';
      if (q('[data-a="siguiente"]')) { q('[data-a="siguiente"]').click(); return 's'; }
      const c = document.querySelectorAll('.mano .c.ok'); if (c.length) { c[0].click(); return 'c'; }
      const r = q('[data-a="robar"]'); if (r) { r.click(); return 'r'; }
      const s = q('[data-a="pasar"]'); if (s) { s.click(); return 'p'; }
      return '';
    });
    if (r === 'campeon') return true;
    await p.waitForTimeout(r ? 40 : 90);
  }
  return false;
}
(async () => {
  const b = await chromium.launch();
  const errores = [];
  const nueva = async () => {
    const ctx = await b.newContext({ viewport: { width: 360, height: 740 } });
    const p = await ctx.newPage();
    p.on('pageerror', e => errores.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });
    await p.addInitScript(AJ);
    await p.goto(URL);
    return { ctx, p };
  };
  const { ctx, p } = await nueva();
  console.log('Inicio');
  ok(await p.isVisible('[data-a="reto"]') && await p.isVisible('[data-a="anotador"]') && await p.isVisible('[data-a="logros"]'), 'Botones de Reto, Anotador y Logros');
  ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 360, 'Portada sin desbordamiento');
  console.log('Reto del día');
  await p.click('[data-a="reto"]');
  ok(await p.isVisible('text=RETO DEL'), 'Pantalla del reto');
  await p.click('[data-a="retoJugar"]');
  const mano1 = await p.evaluate(() => { const v = window.NexusUI.vistaActual(); return JSON.stringify([v.mesa, v.mano.map(c => c.e).sort(), v.turno]); });
  const otro = await nueva();
  await otro.p.click('[data-a="reto"]'); await otro.p.click('[data-a="retoJugar"]');
  const mano2 = await otro.p.evaluate(() => { const v = window.NexusUI.vistaActual(); return JSON.stringify([v.mesa, v.mano.map(c => c.e).sort(), v.turno]); });
  ok(mano1 === mano2, 'Mismas barajas para todos hoy (misma mesa, mano y turno inicial)');
  await otro.ctx.close();
  ok(await jugar(p, 2000), 'Reto jugado hasta el final');
  await p.click('[data-a="campeon"]');
  const reto = await p.evaluate(() => JSON.parse(localStorage.getItem('nexus.reto')));
  ok(reto && reto.resultado && reto.hist.length === reto.resultado.partidas, 'Resultado guardado: ' + (reto && JSON.stringify(reto.resultado)) + ' ' + (reto && reto.hist.join('')));
  const texto = await p.evaluate(() => window.NexusExtras.textoReto(window.NexusExtras.estadoReto()));
  ok(/NEXUS CAOS · Reto #\d+/.test(texto) && texto.includes('https://juanfeliperico369-stack.github.io/unonexus/'), 'Texto para compartir:\n' + texto);
  ok(await p.isVisible('#capa [data-a="retoCompartir"]'), 'Botón Compartir en la pantalla de campeón');
  await p.evaluate(() => { window.__abierto = ''; window.__compartido = ''; window.open = u => { window.__abierto = u; return null; }; if (navigator.share) navigator.share = d => { window.__compartido = d.text; return Promise.resolve(); }; });
  await p.click('#capa [data-a="retoCompartir"]');
  const comp = await p.evaluate(() => window.__abierto || window.__compartido);
  ok(/wa\.me\/\?text=NEXUS%20CAOS|^NEXUS CAOS/.test(comp), 'Compartir abre WhatsApp (wa.me) o el menú de compartir: ' + comp.slice(0, 60));
  const logros = await p.evaluate(() => JSON.parse(localStorage.getItem('nexus.logros') || '{}'));
  ok(!!logros.reto, 'Logro «Reto cumplido» desbloqueado');
  await p.evaluate(() => window.NexusUI.ACC.salir());
  await p.click('[data-a="reto"]');
  ok(await p.isVisible('text=Próximo reto en'), 'El reto queda hecho por hoy (cuenta regresiva)');
  await p.click('[data-a="inicio"]');
  console.log('Anotador');
  await p.click('[data-a="anotador"]');
  await p.click('[data-a="anQuitar"][data-i="3"]');
  await p.click('[data-a="anEmpezar"]');
  await p.click('[data-a="anAnotar"]');
  await p.click('[data-a="anG"][data-v="0"]');
  await p.click('[data-a="anN"][data-i="1"][data-v="2"]');
  await p.click('[data-a="anN"][data-i="2"][data-v="3"]');
  await p.click('[data-a="anGuardar"]');
  let T = await p.evaluate(() => JSON.parse(localStorage.getItem('nexus.anotador')));
  ok(T.jug.map(j => j.puntos).join() === '2,-1,-2', 'Partida normal: +2 / −1 / −2 (' + T.jug.map(j => j.puntos) + ')');
  await p.click('[data-a="anAnotar"]');
  await p.click('[data-a="anG"][data-v="1"]');
  await p.click('[data-a="anCaos"][data-v="1"]');
  await p.click('[data-a="anN"][data-i="0"][data-v="1"]');
  await p.click('[data-a="anN"][data-i="2"][data-v="3"]');
  await p.click('[data-a="anOtra"][data-i="0"]');
  await p.click('[data-a="anGuardar"]');
  T = await p.evaluate(() => JSON.parse(localStorage.getItem('nexus.anotador')));
  ok(T.jug.map(j => j.puntos).join() === '2,4,-5' && T.jug[2].fuera, 'Caos: +5, se salva quien tiene la otra Caos, −3 y queda fuera en −5 (' + T.jug.map(j => j.puntos) + ')');
  await p.click('[data-a="anDeshacer"]');
  T = await p.evaluate(() => JSON.parse(localStorage.getItem('nexus.anotador')));
  ok(T.jug.map(j => j.puntos).join() === '2,-1,-2' && !T.jug[2].fuera, 'Deshacer la última partida');
  ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 360, 'Anotador sin desbordamiento');
  await p.click('[data-a="inicio"]');
  console.log('Logros');
  await p.click('[data-a="logros"]');
  const n = await p.evaluate(() => document.querySelectorAll('.logro.si').length);
  ok(n >= 2, 'Pantalla de logros (' + n + ' desbloqueados)');
  console.log('Frases de los bots');
  const fr = await p.evaluate(() => window.NexusUI.EXTRA.frase({ jug: [{ nombre: 'Ígnea', tipo: 'bot' }, { nombre: 'Marea', tipo: 'bot' }], fin: { ganador: 0, fuera: [1] } }));
  ok(/Ígnea/.test(fr) && /Marea/.test(fr), 'Frase del ganador y del eliminado: ' + fr.replace(/<[^>]+>/g, ' '));
  ok(!errores.length, 'Sin errores de consola ' + errores.slice(0, 3).join(' | '));
  await b.close();
  console.log(fallos.length ? 'FALLÓ ✘ (' + fallos.length + ')' : 'OK ✔');
  process.exit(fallos.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
