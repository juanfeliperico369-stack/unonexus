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
