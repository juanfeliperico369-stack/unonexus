# NEXUS CAOS — Guía de contexto (para humanos y para otra IA)

> Si eres una IA que continúa este proyecto: lee esta guía completa y luego `docs/BITACORA.md`.
> El usuario (Juan Felipe Rico Vieira, cocreador con Miguel Ángel Vásquez Muñoz) quiere respuestas **cortas, en español**,
> trabajo quirúrgico, pocas capturas, y que **se respeten las reglas originales del documento** `NEXUS-CAOS-1.docx`.

## 1. Qué es
Videojuego de cartas **offline** en **un solo HTML** (`index.html`), con modo **LAN** sin internet.
Plataformas: web/PC, Android (navegador o empaquetado con Capacitor). Celulares modestos. Sin librerías externas.
Estética: la de la revista "EVOLUCIÓN MUSICAL" (PDF del usuario) + diseño de cartas del documento + estilo del juego de referencia del usuario ("INDUSTRY ART", del cual se reutilizan las fuentes embebidas "Titulos" y "Cuerpo").

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
| `src/estilo.css` | Estilos. `src/fuentes.css`: fuentes embebidas (base64, no abrir). |
| `src/plantilla.html` | Esqueleto HTML donde `build.js` inyecta CSS y JS. |
| `tools/build.js` | Construye `index.html`. |
| `tests/simular.js` | `node tests/simular.js [juegos] [semilla]` → bot de pruebas de reglas. |
| `tests/ui.js` | Prueba de interfaz con Playwright (Chromium preinstalado). |

## 3. Reglas implementadas (del documento) — tabla exacta
- **Mazo**: 50 cartas = 12 Fuego, 12 Tierra, 12 Agua, 12 Aire, 2 Caos (ids 0–47 elementos, 48–49 Caos). Sin Caos: 48.
- **Jugadores**: 2–12 (Combos 2–6). Cada uno recibe 3 cartas (Combos 6). Tope en mano 3 (Combos 9).
- **Inicio**: la primera carta de la mesa sale del mazo. Dirección elegible (izq→der / der→izq / azar).
- **Quién vence a quién** (atacante → defensor, verbo):
  - Fuego → Aire (Arde), Agua (Evapora), Tierra (Incendia)
  - Tierra → Agua (Absorbe), Fuego (Apaga)
  - Agua → Fuego (Apaga), Tierra (Debilita)
  - Aire → Tierra (Seca), Fuego (Apaga)
  - Mismo elemento **no** vence. **Caos** vence a todo y da victoria inmediata.
- **Turno**: si tienes carta que se sobrepone, juegas. Si estás **cerrado**: con 3 cartas pasas; con 2 robas 1 (obligatorio); con 1 robas 1 o 2. Tras robar puedes jugar una carta válida o ceder turno (aunque te sirva: "es tu decisión").
- **Ganar partida**: quedarte con 0 cartas → +2. Con Caos → +5.
- **Castigos (clásico)**: 1 carta 0 · 2 cartas −1 · 3 cartas −2.
- **Caos**: los demás pierden; quien tenga la **segunda Caos** se salva (0). Ajuste `castigoCaos`: `cartas` (sección PERDER: −1/−2/−3 según cartas, por defecto) o `fijo` (sinopsis: −3 a todos).
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
- **Solitario**: mitades 25/25 (o 24/24 sin Caos). Mitad A = tu mazo (carta inicial y auxiliares). Mitad B = tus 3 cartas + mazo rival (22/21). El mazo rival sale primero: voltea; si se sobrepone, la pone; si no (repetida), se aparta y sigues tú. Gana quien **ponga primero 3 cartas**. Si el mazo rival se agota, gana quien haya puesto más (empate si igual).

## 4. Decisiones donde el documento no es explícito (registradas)
1. Caos no puede ser la carta inicial: vuelve al mazo (posición al azar) y se saca otra.
2. Con jugada disponible no se puede pasar ni robar (el documento solo permite ceder tras robar).
3. Cuando el turno vuelve a quien puso la carta de la mesa, también debe sobreponerse (lectura literal).
4. No se rebaraja el descarte: si el mazo se agota, nadie roba y llega el cierre por lógica.
5. Tras un cierre, inicia el siguiente de quien inició la partida anterior.
6. **Regla de la casa `mesaLimpia`** (NO está en el documento): si el turno vuelve a quien puso la carta de la mesa sin que nadie jugara, se saca una carta nueva del mazo. **Activa por defecto solo en Combos**, porque con la tabla literal ninguna simulación de Combos terminó con ganador (los combos invencibles cierran todas las partidas). Se puede apagar en la configuración. Pendiente: que el usuario confirme.
7. Si todos quedan descalificados a la vez, el juego termina sin campeón.

## 5. Cómo construir y probar
```bash
node tools/build.js            # genera index.html
node tests/simular.js 1000 1   # bot de reglas: 1000 juegos, casos fijos, fuzz, guardar/cargar
node tests/ui.js               # interfaz en Chromium (360x740), sin errores de consola
```
Dentro del juego: Ajustes → **Bot de pruebas** (corre lo mismo en el dispositivo).

## 6. Datos personales
El documento incluye cédulas, teléfonos y fotos de documentos de identidad: **no se incluyen en el juego**. Solo nombres en créditos.

## 7. Arquitectura de la interfaz (`src/ui.js`)
- `G` = sesión: `{ J (estado del motor; null en invitado LAN), vista (solo invitado), locales (asientos humanos de este dispositivo), viendo, cubierto (pasa-el-celular), ultimo (último evento), sel (selección en Combos), red, mapaRed {asiento: idPar} }`.
- `ciclo()` tras cada cambio: guarda, difunde vistas (anfitrión), pinta la mesa y programa al bot (`IA.elegir`) con demora según velocidad.
- `hacer(accion, asiento)` = única puerta para cambiar el estado (valida con `Motor.aplicar`). Los invitados mandan `{t:'accion'}` y el anfitrión llama `hacer`.
- La mesa se pinta completa desde `Motor.vista(J, asiento)` (no ve manos ajenas). Animación FLIP solo de la carta jugada.
- `VISTAS.*` devuelven HTML; `ACC.*` son los botones (`data-a`). Guardado en `localStorage` con prefijo `nexus.` (ajustes, stats, config, partida).

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
- Confirmar con el usuario: (a) `mesaLimpia` en Combos; (b) castigo Caos por defecto (`cartas` vs `fijo`); (c) en Solitario, ganar = poner 3 cartas.
- Probar en celulares reales (cámara/QR, WebRTC en su Wi-Fi, rendimiento).
- Empaquetar Android con Capacitor: copiar `index.html` a `www/`, `npx cap add android`. Opcional: descubrimiento LAN nativo (NSD) para evitar códigos.
- Opcional: estadísticas del invitado LAN, reconexión, más idiomas.
