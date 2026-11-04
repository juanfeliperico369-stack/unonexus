# Bitácora — NEXUS CAOS

Formato: fecha · etapa · qué cambió · qué se probó · qué falta.

## 2026-11-03 · Etapa 1: motor de reglas, IA y bot de pruebas
- Analizados: `NEXUS-CAOS-1.docx` (reglas, colores, bocetos de símbolos/cartas/reversos/logo), PDF "EVOLUCIÓN MUSICAL" (estética de revista), `index-13.html` (juego de referencia del usuario: fuentes embebidas y LAN por WebRTC con códigos).
- El usuario pidió **reglas originales del documento**, sin inventar. Decisiones en huecos: ver GUIA §4.
- Creado `src/motor.js` (reglas, 4 modos, puntaje, descalificación, campeón, cierre por lógica, vista por jugador, invariantes).
- Creado `src/ia.js` (3 niveles; Difícil = Monte Carlo con números aleatorios comunes).
- Creado `src/prueba.js` + `tests/simular.js`: 31 casos fijos + simulación con fuzz y guardar/cargar.
- Hallazgo: Combos literal → 0 ganadores en 600 juegos (todo termina en cierre). Se añadió regla de la casa `mesaLimpia` (activa por defecto solo en Combos, desactivable). **Preguntar al usuario.**
- Hallazgo: el Clásico es de mucha suerte (3 cartas, jugada obligatoria): azar 29.7 % vs Normal 32.0 % vs Difícil 32.1 % de partidas ganadas (3 jugadores). Es propio del diseño.
- Probado: `node tests/simular.js 1500 11` → 1500 juegos, 13203 partidas, 209 014 acciones, 31 079 acciones inválidas rechazadas, 0 errores.
- Falta: arte, interfaz, sonido, LAN, pruebas de interfaz.

## 2026-11-03 · Etapas 2–4: arte, interfaz, sonido y LAN
- `src/arte.js`: símbolos y cartas SVG desde los bocetos (frente #3D3939 con trazos de color + subrayado negro; 3 reversos baja/media/alta; logo).
- `src/estilo.css`: estética revista (crema, petróleo, rojo, mostaza, tiras de película, máquina de escribir) + mesa oscura con semitono.
- `src/ui.js`: Inicio, Nueva partida (modos, asientos humano/bot, dirección, castigo Caos, mesa limpia), Mesa, Fin de partida, Campeón, Reglas, Ajustes, LAN. Pasa-el-celular para varios humanos. Guardado/continuar. Tutorial al primer juego. Bot de pruebas interno.
- `src/sonido.js`: sonidos sintetizados (WebAudio) + vibración.
- `src/qr.js`: QR propio (validado con un decodificador externo: 12/12 tamaños) + lector con cámara (BarcodeDetector).
- `src/red.js`: LAN WebRTC sin servidor, código comprimido (~530 caracteres) por QR o copiar/pegar; anfitrión autoritativo; aviso "chao" al cerrar; si un invitado se va, lo reemplaza un bot.
- `tools/build.js` genera `index.html` (~210 KB, un solo archivo). `package.json` con scripts.
- Probado: `tests/ui.js` (360x740: juego clásico completo hasta campeón, Combos con 2 humanos, Solitario, Familiar, continuar, pantallas sin desbordamiento, bot interno 120 juegos, 0 errores de consola). `tests/lan.js` (2 navegadores conectados por código, juego completo sincronizado, desconexión → bot). OK.
- Falta: probar en celulares reales (cámara/QR y mDNS de WebRTC varían por red), empaquetado Capacitor.

## 2026-11-03 · Pulido 1 (pedido del usuario)
- Usuario: la suerte es el enganche, no tocarla; el juego sigue hasta 10 puntos o hasta que quede uno. Créditos: solo "OneZero".
- Solitario releído: mitad 1 = mazo auxiliar (inicial + robos); mitad 2 = tus 3 cartas + mazo rival; gana quien gaste primero sus 3 cartas → la ganadora siempre es la 4ª/5ª/6ª de la mesa (verificado por el bot en cada solitario). La mesa muestra "AUXILIAR", "MESA · Nª", "TÚ x/3 · MAZO y/3" y explica "repetida, se aparta · sigues tú".
- Nuevo: racha (motor `J.racha`), camino a la corona en resultados, avisos de suspenso, "¡ÚLTIMA!" en rivales con 1 carta, siguiente partida automática (6 s, pausable), sonido de barajar, estadísticas del invitado LAN.
- Probado: simulación 800 juegos (34 casos), UI y LAN: todo OK, 0 errores de consola.

## 2026-11-03 · Pulido 2 + visión de producto
- Registrada la visión del producto del usuario en GUIA §1b (ediciones normal/pago, tiendas, datos del jugador, referencias).
- Nuevo: frase "piedra, papel o tijera a nivel elemental y cósmico" en portada; Exportar/Importar datos (probado ida y vuelta); bandera de edición en build (`--edicion=pago|normal`) + gancho de anuncios vacío; versión 1.1 visible en Ajustes.
- Nuevo: animación de reparto/robo (cartas entran desde el mazo), contador del rival que roba salta, mano ordenada por elemento, destello "¡REY DE REYES!".
- Probado: UI y LAN OK, exportar/importar OK, 0 errores de consola.

## 2026-11-03 · Pulido 3 (captura del usuario en su Android)
- Logo: los dibujos se salían del círculo → recompuesto y recortado dentro del contorno.
- Su celular reemplazaba las fuentes de sistema (máquina de escribir e itálica salían manuscritas) → embebidas Courier Prime ("Maquina") y Playfair Display itálica ("Revista"), OFL. index.html ≈ 330 KB.
- Símbolos de la página que compartió: se usan los alquímicos de los elementos (🜂 🜄 🜁 🜃) y el Tao ☯, dibujados en SVG (portada, reglas, separadores) y ✦ en subtítulos.
- Créditos: "Un juego de OneZero por Infinite Tree".
- Confirmado por el usuario: Combos con mesa limpia activada; castigo Caos según cartas. Todo lo demás tal cual el documento.
- Botones: el título ya no se parte en dos líneas.
- Nuevo: Marcador en el menú de la mesa (camino a la corona de todos, cartas en mano, racha, quién está en turno). Indicador "pensando…" en el rival en turno.
- Probado: simulación 500 juegos (34 casos), UI y LAN OK, 0 errores de consola.

## 2026-11-04 · v1.2.0: Bluetooth, GitHub Pages (PWA) y APK
- Bluetooth: puente nativo RFCOMM en la APK (`PuenteBT.java`) + transporte en `red.js` + pantalla Multijugador (Wi-Fi y Bluetooth). En navegador se explica la alternativa por anclaje Bluetooth. Probado con puente simulado (`tests/bt.js`): OK.
- Web: build `--web` con manifest, service worker (`nexus-caos-v1.2.0-normal`), íconos 192/512/maskable, apple-touch-icon 180 sin transparencia, favicon, Open Graph + `compartir.png` 1200×630. Publicado en rama `gh-pages` → https://juanfeliperico369-stack.github.io/unonexus/
- Verificado en el enlace publicado (`tests/pwa.js`): carga, SW activo y controlando, 0 errores de instalabilidad, manifest válido, abre y se juega sin conexión, 0 errores de consola.
- APK `dist/NexusCaos-1.2.0.apk` (329 KB, firma v2+v3) construida sin Gradle (`tools/apk.sh`). Keystore entregado al usuario en privado, fuera del repo.
- Historial de juegos + exportar (incluye historial). Botón atrás de Android. Versión 1.2.
- Pruebas: reglas (34 casos + 400 juegos), UI, LAN, Bluetooth simulado, PWA publicada: todo OK.
- Falta: probar APK y Bluetooth en celulares reales.
