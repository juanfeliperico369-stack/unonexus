// Construye index.html (un solo archivo) desde src/. Uso: node tools/build.js
'use strict';
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..'), src = f => path.join(R, 'src', f);
const leer = f => fs.readFileSync(src(f), 'utf8');
const ORDEN = ['motor.js', 'ia.js', 'prueba.js', 'arte.js', 'sonido.js', 'qr.js', 'red.js', 'ui.js'];
const js = ORDEN.filter(f => fs.existsSync(src(f))).map(f => '/* ===== ' + f + ' ===== */\n' + leer(f)).join('\n');
if (/<\/script/i.test(js)) throw new Error('El JS contiene </script>');
const arg = (process.argv.find(x => x.startsWith('--edicion=')) || '').split('=')[1];
const edicion = arg === 'pago' ? 'pago' : 'normal';
const salida = process.argv.find(x => x.startsWith('--salida=')) ? process.argv.find(x => x.startsWith('--salida=')).split('=')[1] : path.join(R, 'index.html');
let html = leer('plantilla.html').replace('/*@edicion*/', edicion);
html = html.replace('/*@fuentes*/', () => leer('fuentes.css')).replace('/*@css*/', () => leer('estilo.css')).replace('/*@js*/', () => js);
fs.writeFileSync(salida, html);
console.log(path.basename(salida), 'edición ' + edicion, (html.length / 1024).toFixed(0) + ' KB', '·', ORDEN.filter(f => fs.existsSync(src(f))).join(', '));
