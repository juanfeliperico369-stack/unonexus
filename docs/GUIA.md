# NEXUS CAOS — Guía de contexto (para humanos y para otra IA)

> Si eres una IA que continúa este proyecto: lee esta guía completa y luego `docs/BITACORA.md`.
> El usuario y creador firma como **OneZero** (créditos del juego: "Un juego de OneZero por Infinite Tree"). Quiere respuestas **cortas, en español**,
> trabajo quirúrgico, pocas capturas, y que **se respeten las reglas originales del documento** `NEXUS-CAOS-1.docx`.

## 1. Qué es
Videojuego de cartas **offline** en **un solo HTML** (`index.html`), con modo **LAN** sin internet.
Plataformas: web/PC, Android (navegador o empaquetado con Capacitor). Celulares modestos. Sin librerías externas.
Estética: la de la revista "EVOLUCIÓN MUSICAL" (PDF del usuario) + diseño de cartas del documento + estilo del juego de referencia del usuario ("INDUSTRY ART", del cual se reutilizan las fuentes embebidas "Titulos" y "Cuerpo").

## 1b. Visión del producto (del usuario, 2026-11-03)
- "Un juego rápido estilo piedra, papel o tijera desde un nivel elemental y cósmico. Rápido y adictivo." Cartas y estrategia, 2D, vista panorámica.
- **La suerte es el enganche**: seguir partida tras partida hasta 10 puntos o hasta que quede uno solo.
- Offline por ahora; **cada jugador es dueño de su partida y sus datos** (todo en el dispositivo; Ajustes → Exportar/Importar).
- **Edición normal**: todo desbloqueado, con anuncios (Play Store, página oficial, iOS). **Edición de pago**: 3 USD, sin anuncios, todo desbloqueado (Steam, Play Store, Epic, iOS, Microsoft Store, Amazon Games). Donaciones desde la página oficial. Futuro: cartas físicas.
- Distribución: Steam, Play Store, Epic, página oficial (el juego como página interactiva), descargas directas gratis (Windows, Mac, Linux), posible Facebook Games (como "Uno"). Lanzamiento escalonado.
- Referencias: piedra-papel-tijera, Uno, los 4 elementos, el Tao (el Caos: agujero negro y agujero blanco).
- En código: `node tools/build.js --edicion=pago` (sin anuncios) o `--edicion=normal` (por defecto). `window.NexusAnuncios.entrePartidas(np)` es el gancho (cada 4 partidas, solo edición normal); offline no hace nada y un envoltorio nativo (Capacitor + AdMob) debe reemplazarlo. `--salida=ruta` para generar varias ediciones.
- Empaquetado futuro: Android/iOS con Capacitor; PC/Steam con Electron o Tauri (cargar `index.html`); Facebook Instant Games acepta HTML5 (un solo archivo sirve de base).

## 2. Archivos
| Archivo | Para qué |
|---|---|
| `index.html` | **Entregable** generado. No editar a mano: se construye con `node tools/build.js`. |
| `src/motor.js` | Reglas puras (sin DOM). Estado serializable JSON. Fuente de verdad de las reglas. |
| `src/ia.js` | Bots: 1 Fácil (azar), 2 Normal (heurística), 3 Difícil (Monte Carlo con determinización). |
| `src/prueba.js` | **Bot de pruebas**: casos fijos de reglas + simulación masiva con invariantes, oráculo de puntaje, fuzz y guardar/cargar. Corre en Node y dentro del juego. |
| `src/arte.js` | Símbolos SVG, cartas (frente universal y 3 reversos), logo. |
| `src/sonido.js` | Sonidos sintetizados con WebAudio (sin archivos). |
| `src/red.js` | LAN: WebRTC DataChannel sin servidor + códigos comprimidos + QR. |
| `src/qr.js` | Generador de QR propio (sin librerías). |
| `src/ui.js` | Pantallas, mesa, controlador de turnos, guardado. |
| `src/estilo.css` | Estilos. `src/fuentes.css`: fuentes embebidas (base64, no abrir): Titulos y Cuerpo (del juego de referencia), **Maquina** = Courier Prime y **Revista** = Playfair Display itálica (ambas OFL-1.1, Fontsource). Embebidas para que celulares con fuente del sistema personalizada no cambien el diseño. |
| `src/plantilla.html` | Esqueleto HTML donde `build.js` inyecta CSS y JS. |
| `tools/build.js` | Construye `index.html`. |
| `tests/simular.js` | `node tests/simular.js [juegos] [semilla]` → bot de pruebas de reglas. |
| `tests/ui.js` | Prueba de interfaz con Playwright (Chromium preinstalado). |

## 3. Reglas implementadas (del documento) — tabla exacta
- **Mazo**: 50 cartas = 12 Fuego, 12 Tierra, 12 Agua, 12 Aire, 2 Caos (ids 0–47 elementos, 48–49 Caos). Sin Caos: 48.
- **Jugadores**: 2–12 (Combos 2–6). Cada uno recibe 3 cartas (Combos 6). **Sin tope en mano** (aclarado por el creador el 2026-11-10: al robar 1 o 2 se puede quedar con 4, 5…). Combos: tope 9.
- **Inicio**: la primera carta de la mesa sale del mazo. Dirección elegible (izq→der / der→izq / azar).
- **Quién vence a quién** (atacante → defensor, verbo):
  - Fuego → Aire (Arde), Agua (Evapora), Tierra (Incendia)
  - Tierra → Agua (Absorbe), Fuego (Apaga)
  - Agua → Fuego (Apaga), Tierra (Debilita)
  - Aire → Tierra (Seca), Fuego (Apaga)
  - Mismo elemento **no** vence. **Caos** vence a todo y da victoria inmediata.
- **Turno** (corregido en v1.4.0 según el creador): si tienes carta que se sobrepone, **debes** jugarla. Si estás **cerrado**, tomas **1 o 2 cartas** (a tu elección), aunque ya tengas 3; no se puede pasar sin robar. Tras robar, si alguna te sirve **debes jugarla**; si no, pasa el turno. Solo se pasa sin robar con el mazo vacío (o en Combos con 9). Ver §16.
- **Ganar partida**: quedarte con 0 cartas → +2. Con Caos → +5.
- **Castigos (clásico)**: 1 carta 0 · 2 cartas −1 · 3 cartas −2 · 4 → −3 · n → −(n−1).
- **Caos**: los demás pierden; quien tenga la **segunda Caos** se salva (0). Ajuste `castigoCaos`: `cartas` (sección PERDER: 1 carta −1, 2 cartas −2, 3 o más −3 — "pierden 3 los que quedaron con 4 carta"; por defecto) o `fijo` (sinopsis: −3 a todos).
- **Cierre por lógica** (Extra 2): si da una vuelta completa sin que nadie juegue ni robe, la partida se cierra sin ganador y se castiga por cartas.
- **Juego completo**: todos empiezan en 0; **10 puntos = campeón ("rey de reyes")**; **−5 o menos = descalificado**. Si queda uno solo, es campeón.
- **Extras**: el ganador inicia la siguiente partida (mantiene su racha); el que más perdió "reparte" (cosmético). Se cuentan partidas ganadas "para presumir".
- **Familiar y niños**: sin Caos, nadie se descalifica, marcador no baja de 0, solo pierde 1 quien quede con 3 cartas, ganador +2.
- **Combos**: 6 cartas, tope 9, sin Caos, castigo −n con n≥2 cartas (1 carta 0). Tabla literal:
  - Oxígeno maligno (Aire+Fuego) vence: Lodo, Aire, Tormenta
  - Lodo (Agua+Tierra) vence: Fogata máxima, Tierra, Fuego
  - Fogata máxima (Tierra+Fuego) vence: Aire, Tierra
  - Evaporación masiva (Agua+Fuego) vence: Vendaval
  - Vendaval (Aire+Tierra) vence: Fuego
  - Tormenta (Aire+Agua) vence: Vendaval
  - Las cartas sueltas se juegan con la lógica normal; una carta suelta no vence a un combo (el documento no lo dice).
- **Solitario** (releído con el usuario): mitades 25/25 (o 24/24 sin Caos). Mitad 1 = tu mazo **auxiliar** (de ahí sale la carta inicial y las cartas que robas cuando estás cerrado). Mitad 2 = sacas tus 3 cartas y el resto es el **mazo rival** (22, o 21 sin Caos). El mazo rival sale primero: voltea su carta; si se sobrepone a la mesa la pone, si es repetida (o no se sobrepone) la aparta y sigues tú. Tú juegas con las reglas normales (si estás cerrado robas del auxiliar o cedes). Gana quien **gaste primero sus 3 cartas** (3 cartas puestas en la mesa). Por eso la carta ganadora siempre es la **4ª, 5ª o 6ª de la mesa contando la inicial**, como dice el documento (el bot de pruebas lo verifica en cada solitario). Si sale una Caos, gana quien la tenga. Si el mazo rival se agotara sin ganador, gana quien gastó más (empate si igual).

## 4. Decisiones donde el documento no es explícito (registradas)
1. Caos no puede ser la carta inicial: vuelve al mazo (posición al azar) y se saca otra.
2. Con jugada disponible no se puede pasar ni robar.
3. Cuando el turno vuelve a quien puso la carta de la mesa: sale carta nueva (mesa limpia, decisión del creador).
4. No se rebaraja el descarte: si el mazo se agota, nadie roba y llega el cierre por lógica.
5. Tras un cierre, inicia el siguiente de quien inició la partida anterior.
6. **`mesaLimpia`**: si el turno vuelve a quien puso la carta de la mesa sin que nadie jugara, se saca una carta nueva del mazo y esa persona debe sobreponerse a ella. **Activa por defecto en TODOS los modos desde v1.4.0 (el creador eligió "sale carta nueva")**; antes solo en Combos (lo juega así en la vida real y se puede ganar). Sin ella, en simulación nadie gana en Combos. Con ella: partidas con ganador 99 % (2 jug), 88 % (3), 65 % (4), 44 % (5), 15 % (6 jugadores: el mazo de 11 se agota y llega el cierre). Se puede apagar en la configuración.
8. **Castigo Caos por defecto = `cartas`** (−1/−2/−3, sección PERDER) — CONFIRMADO por el usuario ("todo tal cual el documento"). `fijo` (−3, sinopsis) queda como opción.
7. Si todos quedan descalificados a la vez, el juego termina sin campeón.

## 5. Cómo construir y probar
```bash
node tools/build.js            # genera index.html
node tests/simular.js 1000 1   # bot de reglas: 1000 juegos, casos fijos, fuzz, guardar/cargar
node tests/ui.js               # interfaz en Chromium (360x740), sin errores de consola
```
Dentro del juego: Ajustes → **Bot de pruebas** (corre lo mismo en el dispositivo).

## 6. Datos personales
El documento incluye cédulas, teléfonos y fotos de documentos de identidad: **no se incluyen en el juego**. Créditos: **OneZero por Infinite Tree** (pedido del usuario).

## 7. Arquitectura de la interfaz (`src/ui.js`)
- `G` = sesión: `{ J (estado del motor; null en invitado LAN), vista (solo invitado), locales (asientos humanos de este dispositivo), viendo, cubierto (pasa-el-celular), ultimo (último evento), sel (selección en Combos), red, mapaRed {asiento: idPar} }`.
- `ciclo()` tras cada cambio: guarda, difunde vistas (anfitrión), pinta la mesa y programa al bot (`IA.elegir`) con demora según velocidad.
- `hacer(accion, asiento)` = única puerta para cambiar el estado (valida con `Motor.aplicar`). Los invitados mandan `{t:'accion'}` y el anfitrión llama `hacer`.
- La mesa se pinta completa desde `Motor.vista(J, asiento)` (no ve manos ajenas). Animación FLIP solo de la carta jugada.
- `VISTAS.*` devuelven HTML; `ACC.*` son los botones (`data-a`). Guardado en `localStorage` con prefijo `nexus.` (ajustes, stats, config, partida).

### Flujo "partida rápida"
- Resultados con barra "camino a la corona" (−5 … 10), avisos de suspenso (a X de la corona / a X de quedar fuera), descalificados, **racha** (partidas seguidas ganadas: `J.racha`).
- **Siguiente partida automática** (cuenta regresiva de 6 s, se puede pausar; Ajustes → desactivar).
- Rival con 1 carta: marco rojo y "¡ÚLTIMA!".

## 8. LAN (`src/red.js`, `src/qr.js`)
1. Anfitrión: Modo LAN → Crear sala → «+ Invitar» (un código/QR por invitado).
2. Invitado: Unirme → escanea (cámara, si hay `BarcodeDetector`) o pega el código → muestra su respuesta.
3. Anfitrión escanea/pega la respuesta → el invitado aparece en la sala → Empezar.
- Mensajes: invitado→anfitrión `hola{nombre}`, `accion{a}`, `chao`; anfitrión→invitado `vista{v,ev}`, `error{e}`, `chao`.
- `iceServers: []` → solo red local (sin STUN/TURN ni internet). Los navegadores ocultan la IP local con nombres mDNS (`*.local`); en algunas redes que bloquean multicast la conexión puede fallar → usar el punto de acceso de un celular.
- Si un invitado se va durante el juego, un bot Normal toma su asiento. Si se va el anfitrión, los invitados vuelven al menú.
- Hay un gancho previsto para Android nativo (NSD) si se empaqueta con Capacitor (como en el juego de referencia); no está implementado.

## 9. Pruebas (todas pasan al 2026-11-03)
- `node tests/simular.js 1500 11`: 31 casos de reglas + 1500 juegos (13 203 partidas, 209 014 acciones, 31 079 acciones inválidas rechazadas), 0 errores.
- `node tests/ui.js`: 360x740 táctil; juego clásico completo hasta campeón, Combos con 2 humanos, Solitario, Familiar, continuar, pantallas sin desbordamiento horizontal, bot interno, 0 errores de consola.
- `node tests/lan.js`: dos navegadores, conexión por código, juego completo sincronizado, desconexión → bot.
- QR validado con un decodificador externo (jsQR, solo para la prueba; no va en el juego).

## 10. Pendientes / ideas
- **La suerte es el enganche** (decisión del usuario): no reducir el azar; el juego sigue partida tras partida hasta que alguien llega a 10 o queda uno solo.
- Combos con 6 jugadores casi siempre termina en cierre (mazo de 11 cartas). Es fiel al documento; si el usuario lo pide, estudiarlo.
- Probar en celulares reales (cámara/QR, WebRTC en su Wi-Fi, rendimiento).
- Empaquetar Android con Capacitor: copiar `index.html` a `www/`, `npx cap add android`. Opcional: descubrimiento LAN nativo (NSD) para evitar códigos.
- Opcional: estadísticas del invitado LAN, reconexión, más idiomas.

## 11. Publicación web (GitHub Pages) — v1.2.0
- Enlace: **https://juanfeliperico369-stack.github.io/unonexus/** (repo público `unonexus`, rama **`gh-pages`**, raíz, con `.nojekyll`).
- `node tools/build.js --web` genera `dist/web/`: `index.html` (con manifest, apple-touch-icon como archivo, favicon, Open Graph con og:image/og:url absolutas), `manifest.webmanifest` (start_url "./", standalone, íconos 192/512 + maskable 512), `sw.js` (caché `nexus-caos-v<versión>-<edición>`; navegación red-primero con respaldo sin conexión; borra cachés viejas del juego), íconos y `compartir.png` 1200×630.
- Los íconos y la imagen para compartir salen de `node tools/iconos.js` (Playwright renderiza el arte SVG) → `web/` y `android/res/`.
- Publicar: copiar `dist/web/` a la rama `gh-pages` y empujar (GitHub activó Pages solo al recibir la rama). **Para una versión nueva, subir `VERSION` en `tools/build.js`** (cambia el nombre de caché y fuerza la actualización).
- Verificación: `node tests/pwa.js <url>` → carga, service worker activo y controlando, sin errores de instalabilidad (CDP `Page.getInstallabilityErrors`), manifest válido, etiquetas, íconos 200, abre y se juega sin conexión. Pasó en el enlace publicado el 2026-11-04.
- iPhone: abrir en Safari → Compartir → "Añadir a pantalla de inicio".

## 12. APK Android (sin Gradle) — v1.2.0
- Proyecto en `android/` (manifest, tema, íconos adaptativos, Java). Paquete `com.infinitetree.nexuscaos`, minSdk 24, targetSdk 35.
- `MainActivity`: WebView con `assets/index.html`; insets de borde a borde (Android 15); permiso de cámara para el QR; selector de archivos (Importar); botón atrás → `window.NexusAtras()`; al pausar guarda la partida.
- Puentes JS: `AndroidApp.exportar(nombre, json)` (guarda en Descargas) y **`AndroidBT`** (Bluetooth).
- Construir: `ANDROID_BT=<build-tools 35> ANDROID_JAR=<platform-35/android.jar> NEXUS_KS=<keystore> NEXUS_KS_PASS=<clave> bash tools/apk.sh` → `dist/NexusCaos-<versión>.apk` (firma v2+v3). Build-tools y plataforma se bajan de dl.google.com (`build-tools_r35.0.1_linux.zip`, `platform-35_r02.zip`).
- **Keystore**: NO está en el repo (es público). Se entregó al usuario en privado (`nexus-caos.jks`, alias `nexuscaos`). Sin él no se pueden publicar actualizaciones de la misma app.

## 13. Bluetooth
- Solo en la APK: Bluetooth clásico RFCOMM entre **celulares emparejados** (se emparejan en Ajustes del sistema). UUID `6e657875-732d-6361-6f73-4e5843303031`. El anfitrión abre sala (servidor, varias conexiones, hasta ~7); el invitado elige al anfitrión de su lista de emparejados. Una línea de JSON por mensaje.
- JS: `Red.btAbrirSala/btUnirse/btEmparejados/btEstado` en `src/red.js`; Java llama `BTNativo.evento(tipo, id, dato)`. Mismo protocolo que LAN (`hola`, `accion`, `vista`, `chao`), así que se pueden mezclar invitados Wi-Fi y Bluetooth.
- Navegador: los navegadores no permiten conectar dos teléfonos por Bluetooth (Web Bluetooth solo es cliente BLE). Alternativa mostrada: anclaje Bluetooth (compartir internet por Bluetooth) + modo Wi-Fi.
- Prueba: `node tests/bt.js` simula el puente nativo en dos páginas (sala, conexión, juego completo, puntos sincronizados). **El radio Bluetooth real no se pudo probar aquí** (sin dispositivos).
- Historial de juegos terminados en `localStorage` (`nexus.historial`, 100 máx.), se ve en Ajustes y se exporta con los datos.

## 14. Sugerencias
Ver `docs/SUGERENCIAS.md` (juego, reglas del libro físico, lanzamiento, anuncios, legal, técnico).

## 15. v1.3.0 — Extras (`src/extras.js`)
- Se engancha a `ui.js` por `window.NexusUI`: `on('evento'|'finPartida'|'finJuego'|'continuar')`, `VISTAS`, `ACC`, `EXTRA.inicio1/inicio2/frase/campeon`. El motor expone `puntuarPartida()` (puntaje puro, lo usan `finPartida` y el Anotador).
- **Reto del día**: semilla = fecha (FNV-1a de `nexus-caos-AAAA-MM-DD`), clásico, tú contra Ígnea, Marea y Céfiro (Normal), IA con azar sembrado. Reto #1 = 2026-11-04. Cuenta el primer juego terminado del día; después solo práctica. Resultado con cuadritos por partida (🟩 ganaste, 🌀 con Caos, 🟨 sin cambio, 🟥 perdiste, ⬛ Caos rival, 💀 fuera) para compartir por WhatsApp (`navigator.share`, `AndroidApp.compartir` o `wa.me`). Racha de días en `nexus.retoRacha`.
- **Anotador** de cartas físicas (`nexus.anotador`): modos Clásico, Familiar y Combos; ganador o cierre, con o sin Caos, cartas que le quedaron a cada uno y quién tiene la otra Caos. Calcula puntos, descalificados, campeón, quién reparte y quién inicia. Botón para deshacer la última partida.
- **Logros** (16, `nexus.logros`): no desbloquean nada (todo está desbloqueado por diseño).
- **Personalidades**: cada bot tiene un elemento y frases (Caos, última carta, gana, queda fuera) en globos sobre su ficha y en los resultados.
- Pruebas: `node tests/extras.js` (mismas barajas en dos dispositivos, reto completo, texto para compartir, anotador con Caos/descalificación/deshacer, logros, frases).

## 16. v1.4.0 — Reglas de robo corregidas (2026-11-10)
- El creador explicó cómo se juega en la vida real: se reparten 3, pero cuando estás cerrado tomas 1 o 2 aunque tengas 3 (puedes quedar con 4 o 5) y **debes jugar** si una carta te sirve. La versión anterior (con 3 cartas se pasaba) creaba el "error infinito" de cierres que él también vivió.
- Motor: `tope` = Infinity (Clásico/Familiar/Solitario), `capacidadRobo` = min(2, tope − mano, mazo), sin "ceder" voluntario, `mesaLimpia` por defecto en todos los modos, castigo Caos según cartas = −min(n, 3).
- Jugabilidad medida (bots Normal): Clásico con 2–8 jugadores → 0 % de cierres (antes ≈ 8 %), 6–7 partidas por juego, siempre hay campeón. El Caos decide 35–58 % de las partidas (al robar más, circulan más cartas). Combos: 16 % de cierres con 3 jugadores; con 6 jugadores, 88 % (el mazo de 11 se agota). Pendiente: preguntar si en Combos se rebaraja el descarte cuando se acaba el mazo.
- IA: Normal roba 2 si tiene 1 carta, si no 1; Difícil simula robar 1 o 2.
- Interfaz: mano de muchas cartas en dos filas; textos de reglas, pistas y tutorial actualizados; tabla de puntos con 4 o más cartas.
