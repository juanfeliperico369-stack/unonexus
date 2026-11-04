// Comprueba la PWA publicada (o local): carga, service worker activo, abre sin conexión y sin errores de instalabilidad.
// node tests/pwa.js https://juanfeliperico369-stack.github.io/unonexus/
'use strict';
const { chromium } = require('playwright');
const URL = process.argv[2] || 'http://localhost:8765/';
const fallos = [];
const ok = (c, m) => { if (!c) { fallos.push(m); console.log('  ✗', m); } else console.log('  ✓', m); };
(async () => {
  // Desde la nube de pruebas el navegador sale por el proxy del entorno (si existe).
  const prox = /^https:/.test(URL) && (process.env.HTTPS_PROXY || process.env.https_proxy);
  const b = await chromium.launch(prox ? { proxy: { server: prox } } : {});
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', e => errores.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });
  const r = await p.goto(URL, { waitUntil: 'load' });
  ok(r && r.status() === 200, 'Carga ' + URL + ' (HTTP ' + (r && r.status()) + ')');
  ok(await p.isVisible('text=SOLO UN VERDADERO GANADOR'), 'Se ve la portada del juego');
  const sw = await p.evaluate(async () => {
    const reg = await Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(() => r(null), 15000))]);
    if (!reg) return null;
    const w = reg.active; if (w && w.state !== 'activated') await new Promise(r => { w.addEventListener('statechange', () => w.state === 'activated' && r()); setTimeout(r, 5000); });
    return { estado: reg.active && reg.active.state, alcance: reg.scope, cachés: await caches.keys() };
  });
  ok(sw && sw.estado === 'activated', 'Service worker activo: ' + JSON.stringify(sw));
  await p.reload({ waitUntil: 'load' });
  ok(await p.evaluate(() => !!navigator.serviceWorker.controller), 'La página queda controlada por el service worker');
  const cdp = await ctx.newCDPSession(p);
  const inst = await cdp.send('Page.getInstallabilityErrors');
  ok(inst.installabilityErrors.length === 0, 'Chrome: sin errores de instalabilidad ' + JSON.stringify(inst.installabilityErrors));
  const man = await cdp.send('Page.getAppManifest');
  ok(man.errors.length === 0 && /Nexus Caos/.test(man.data || ''), 'Manifest válido (' + man.url + ') ' + JSON.stringify(man.errors));
  const tags = await p.evaluate(() => ({ og: document.querySelector('meta[property="og:image"]').content, url: document.querySelector('meta[property="og:url"]').content, apple: document.querySelector('link[rel="apple-touch-icon"]').getAttribute('href'), cap: !!document.querySelector('meta[name="apple-mobile-web-app-capable"]'), vp: document.querySelector('meta[name="viewport"]').content }));
  ok(/^https:\/\//.test(tags.og) && /^https:\/\//.test(tags.url) && tags.apple === 'apple-touch-icon.png' && tags.cap && /viewport-fit=cover/.test(tags.vp), 'Etiquetas iPhone y Open Graph ' + JSON.stringify(tags));
  for (const f of ['apple-touch-icon.png', 'compartir.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png']) {
    const rr = await p.request.get(new globalThis.URL(f, URL).href);
    ok(rr.status() === 200, f + ' HTTP ' + rr.status());
  }
  await ctx.setOffline(true);
  await p.reload({ waitUntil: 'load' }).catch(e => errores.push('offline: ' + e.message));
  ok(await p.isVisible('text=SOLO UN VERDADERO GANADOR'), 'Abre sin conexión');
  await p.click('[data-a="rapida"]');
  ok(await p.isVisible('.mesa'), 'Se puede jugar sin conexión');
  await ctx.setOffline(false);
  const errs = errores.filter(e => !/Failed to load resource|net::ERR_INTERNET_DISCONNECTED/.test(e));
  ok(!errs.length, 'Sin errores de consola ' + errs.slice(0, 3).join(' | '));
  await b.close();
  console.log(fallos.length ? 'FALLÓ ✘ (' + fallos.length + ')' : 'OK ✔');
  process.exit(fallos.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
