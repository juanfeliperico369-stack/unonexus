// Genera íconos (web y Android) e imagen para compartir a partir del arte SVG del juego. node tools/iconos.js
'use strict';
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..');
const WEB = path.join(R, 'web'), RES = path.join(R, 'android', 'res');
fs.mkdirSync(WEB, { recursive: true });
const PET = '#164a64';
const pagina = `<!doctype html><meta charset="utf-8"><style>${fs.readFileSync(path.join(R, 'src/fuentes.css'), 'utf8')}
body{margin:0;background:transparent}.i{position:absolute;left:0;top:0;display:grid;place-items:center;overflow:hidden}
.i svg.l{display:block}</style><body><script>${fs.readFileSync(path.join(R, 'src/arte.js'), 'utf8')}</script>`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await p.setContent(pagina);
  await p.evaluate(() => window.Arte.instalar());
  await p.evaluate(() => document.fonts.ready);
  // fondo: '' transparente; radio: esquinas; t: tamaño del logo relativo
  async function icono(archivo, tam, fondo, t, radio) {
    await p.evaluate(([tam, fondo, t, radio]) => {
      document.querySelectorAll('.i').forEach(x => x.remove());
      const d = document.createElement('div'); d.className = 'i';
      d.style.cssText += ';width:' + tam + 'px;height:' + tam + 'px;background:' + (fondo || 'transparent') + ';border-radius:' + (radio || 0) + 'px';
      d.innerHTML = '<svg class="l" viewBox="0 0 100 100" width="' + Math.round(tam * t) + '" height="' + Math.round(tam * t) + '">' + window.Arte.logoSVG() + '</svg>';
      document.body.appendChild(d);
    }, [tam, fondo, t, radio]);
    const el = await p.$('.i');
    await el.screenshot({ path: archivo, omitBackground: !fondo || radio > 0 });
  }
  await icono(path.join(WEB, 'icon-192.png'), 192, PET, 0.84, 40);
  await icono(path.join(WEB, 'icon-512.png'), 512, PET, 0.84, 108);
  await icono(path.join(WEB, 'icon-maskable-512.png'), 512, PET, 0.62, 0);
  await icono(path.join(WEB, 'apple-touch-icon.png'), 180, PET, 0.78, 0);
  await icono(path.join(WEB, 'favicon-32.png'), 32, '', 1, 0);
  // Android: íconos clásicos + adaptativo (frente transparente; el fondo es un color)
  const dens = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  for (const k in dens) {
    const dir = path.join(RES, 'mipmap-' + k); fs.mkdirSync(dir, { recursive: true });
    await icono(path.join(dir, 'ic_launcher.png'), dens[k], PET, 0.84, Math.round(dens[k] * 0.22));
    await icono(path.join(dir, 'ic_frente.png'), Math.round(dens[k] * 2.25), '', 0.5, 0);
  }
  // Imagen para compartir 1200x630 (Open Graph / WhatsApp)
  await p.evaluate(() => {
    document.querySelectorAll('.i').forEach(x => x.remove());
    const A = window.Arte, d = document.createElement('div');
    d.className = 'i'; d.id = 'og';
    d.style.cssText += ';width:1200px;height:630px;background:#efe9d6;display:block';
    const carta = (e, x, y, r) => '<div style="position:absolute;left:' + x + 'px;top:' + y + 'px;width:210px;height:300px;transform:rotate(' + r + 'deg);filter:drop-shadow(10px 12px 0 rgba(0,0,0,.35))"><svg viewBox="0 0 140 200" width="210" height="300">' + A.frente(e) + '</svg></div>';
    d.innerHTML =
      '<div style="position:absolute;left:0;right:0;top:0;height:56px;background:#164a64;color:#efe9d6;font:700 22px Maquina,monospace;letter-spacing:.3em;display:flex;align-items:center;padding-left:40px">NEXUS CAOS · EDICIÓN Nº 1</div>' +
      '<div style="position:absolute;left:46px;top:80px;font:700 214px/0.8 Titulos,Impact,sans-serif;color:#164a64">NEXUS<br><span style="color:#c42222">CAOS</span></div>' +
      '<div style="position:absolute;left:50px;top:440px;font:700 46px Titulos,Impact,sans-serif;color:#164a64">SOLO UN VERDADERO GANADOR</div>' +
      '<div style="position:absolute;left:50px;top:498px;font:italic 400 30px Revista,Georgia,serif;color:#1c1a17">Piedra, papel o tijera a nivel elemental y cósmico</div>' +
      '<svg style="position:absolute;left:820px;top:70px" width="300" height="300" viewBox="0 0 100 100">' + A.logoSVG() + '</svg>' +
      carta('fuego', 702, 268, -11) + carta('agua', 838, 246, 2) + carta('caos', 968, 272, 12) +
      '<div style="position:absolute;left:0;right:0;bottom:0;height:62px;background:#000;color:#e8c96a;font:700 21px Maquina,monospace;letter-spacing:.12em;display:flex;align-items:center;justify-content:center;white-space:nowrap">4 ELEMENTOS · 50 CARTAS · 2 A 12 JUGADORES · OFFLINE · ONEZERO</div>';
    document.body.appendChild(d);
  });
  await (await p.$('#og')).screenshot({ path: path.join(WEB, 'compartir.png') });
  await b.close();
  console.log('íconos listos en web/ y android/res/');
})().catch(e => { console.error(e); process.exit(1); });
