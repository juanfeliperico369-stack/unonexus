// Construye index.html (un solo archivo) desde src/. Uso: node tools/build.js
'use strict';
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..'), src = f => path.join(R, 'src', f);
const leer = f => fs.readFileSync(src(f), 'utf8');
const ORDEN = ['motor.js', 'ia.js', 'prueba.js', 'arte.js', 'sonido.js', 'qr.js', 'red.js', 'ui.js'];
const js = ORDEN.filter(f => fs.existsSync(src(f))).map(f => '/* ===== ' + f + ' ===== */\n' + leer(f)).join('\n');
if (/<\/script/i.test(js)) throw new Error('El JS contiene </script>');
let html = leer('plantilla.html');
html = html.replace('/*@fuentes*/', () => leer('fuentes.css')).replace('/*@css*/', () => leer('estilo.css')).replace('/*@js*/', () => js);
fs.writeFileSync(path.join(R, 'index.html'), html);
console.log('index.html', (html.length / 1024).toFixed(0) + ' KB', '·', ORDEN.filter(f => fs.existsSync(src(f))).join(', '));
