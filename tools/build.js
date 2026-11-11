// Construye el juego desde src/.
//   node tools/build.js                      → index.html (un solo archivo, funciona con doble clic)
//   node tools/build.js --web                → dist/web/ (GitHub Pages: PWA con manifest, service worker e íconos)
//   node tools/build.js --android            → dist/android/index.html (para la APK)
//   --edicion=normal|pago  · --salida=ruta
'use strict';
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..'), src = f => path.join(R, 'src', f);
const leer = f => fs.readFileSync(src(f), 'utf8');
const VERSION = '2.0.0';
const URL_WEB = 'https://juanfeliperico369-stack.github.io/unonexus/';
const ORDEN = ['motor.js', 'ia.js', 'prueba.js', 'arte.js', 'sonido.js', 'qr.js', 'red.js', 'ui.js', 'extras.js'];
const opt = k => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=').slice(1).join('=') : null; };
const web = process.argv.includes('--web'), android = process.argv.includes('--android');
const edicion = opt('edicion') === 'pago' ? 'pago' : 'normal';
const js = ORDEN.map(f => '/* ===== ' + f + ' ===== */\n' + leer(f)).join('\n');
if (/<\/script/i.test(js)) throw new Error('El JS contiene </script>');
const ICONO_DATA = '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Ccircle cx=\'50\' cy=\'50\' r=\'46\' fill=\'%23efe9d6\' stroke=\'%23000\' stroke-width=\'6\'/%3E%3Ccircle cx=\'62\' cy=\'38\' r=\'16\' fill=\'%23000\'/%3E%3Ccircle cx=\'38\' cy=\'60\' r=\'11\' fill=\'%23fff\' stroke=\'%23000\' stroke-width=\'4\'/%3E%3C/svg%3E">';
const DESC = 'Piedra, papel o tijera a nivel elemental y cósmico. Juego de cartas rápido y adictivo: Fuego, Tierra, Agua, Aire y Caos. Gratis, sin internet.';
const HEAD_WEB = [
  '<link rel="manifest" href="manifest.webmanifest">',
  '<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">',
  '<meta property="og:type" content="website">',
  '<meta property="og:site_name" content="Nexus Caos">',
  '<meta property="og:title" content="NEXUS CAOS · Solo un verdadero ganador">',
  '<meta property="og:description" content="' + DESC + '">',
  '<meta property="og:url" content="' + URL_WEB + '">',
  '<meta property="og:image" content="' + URL_WEB + 'compartir.png">',
  '<meta property="og:image:type" content="image/png">',
  '<meta property="og:image:width" content="1200">',
  '<meta property="og:image:height" content="630">',
  '<meta property="og:image:alt" content="Nexus Caos: cartas de Fuego, Agua y Caos">',
  '<meta property="og:locale" content="es_CO">',
  '<meta name="twitter:card" content="summary_large_image">',
  '<meta name="twitter:image" content="' + URL_WEB + 'compartir.png">',
  '<script>if("serviceWorker" in navigator&&(location.protocol==="https:"||location.hostname==="localhost"))addEventListener("load",function(){navigator.serviceWorker.register("./sw.js").catch(function(){})});</script>'
].join('\n');
let html = leer('plantilla.html').replace('/*@edicion*/', edicion)
  .replace('<!--@icono-->', web ? '<link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png">' : ICONO_DATA)
  .replace('<!--@web-->', web ? HEAD_WEB : '')
  .replace('/*@fuentes*/', () => leer('fuentes.css')).replace('/*@css*/', () => leer('estilo.css')).replace('/*@js*/', () => js);
let salida = opt('salida');
if (web) {
  const D = salida || path.join(R, 'dist', 'web');
  fs.mkdirSync(D, { recursive: true });
  fs.writeFileSync(path.join(D, 'index.html'), html);
  fs.writeFileSync(path.join(D, '.nojekyll'), '');
  const ICONOS = ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon-32.png', 'compartir.png'];
  ICONOS.forEach(f => fs.copyFileSync(path.join(R, 'web', f), path.join(D, f)));
  fs.writeFileSync(path.join(D, 'manifest.webmanifest'), JSON.stringify({
    id: './', name: 'NEXUS CAOS', short_name: 'Nexus Caos', description: DESC, lang: 'es', dir: 'ltr',
    start_url: './', scope: './', display: 'standalone', orientation: 'any',
    background_color: '#efe9d6', theme_color: '#164a64', categories: ['games', 'entertainment'],
    icons: [
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  }, null, 2));
  const CACHE = 'nexus-caos-v' + VERSION + '-' + edicion;
  fs.writeFileSync(path.join(D, 'sw.js'), fs.readFileSync(path.join(R, 'web', 'sw.plantilla.js'), 'utf8')
    .replace('@CACHE@', CACHE).replace('@ARCHIVOS@', JSON.stringify(['./', './index.html', './manifest.webmanifest'].concat(ICONOS.filter(f => f !== 'compartir.png').map(f => './' + f)))));
  console.log('dist web →', D, '·', (html.length / 1024).toFixed(0) + ' KB · caché', CACHE);
} else {
  if (!salida) salida = android ? path.join(R, 'dist', 'android', 'index.html') : path.join(R, 'index.html');
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  fs.writeFileSync(salida, html);
  console.log(path.relative(R, salida), 'edición ' + edicion, (html.length / 1024).toFixed(0) + ' KB');
}
