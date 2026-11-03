// Bot de pruebas en Node: node tests/simular.js [juegos] [semilla]
'use strict';
const path = require('path');
const Motor = require(path.join(__dirname, '../src/motor.js'));
global.Motor = Motor;
global.IA = require(path.join(__dirname, '../src/ia.js'));
const Pruebas = require(path.join(__dirname, '../src/prueba.js'));
const juegos = +process.argv[2] || 1000, semilla = +process.argv[3] || 1;
const r = Pruebas.ejecutar({ juegos, semilla, fuzz: true, guardar: true });
console.log('Casos de reglas:', r.casos, 'fallos:', r.fallosCasos.length);
r.fallosCasos.forEach(f => console.log('  ✗', f));
console.log(`Juegos ${r.juegos}/${juegos} · partidas ${r.partidas} · acciones ${r.acciones} · fuzz ${r.fuzz} · ${r.ms} ms`);
console.log('Modos', JSON.stringify(r.modos), '· Fines', JSON.stringify(r.fines));
console.log('Victorias por nivel IA [_,fácil,normal,difícil]', JSON.stringify(r.porNivel), '· Solitario [tú,mazo,empate]', JSON.stringify(r.solo));
r.errores.slice(0, 10).forEach(e => console.log('  ✗', e));
console.log(r.ok ? 'OK ✔' : 'FALLÓ ✘');
process.exit(r.ok ? 0 : 1);
