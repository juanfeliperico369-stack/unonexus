# NEXUS CAOS — Sugerencias (2026-11-04)

Ordenadas por impacto. Respetan lo decidido: reglas del documento, la suerte como enganche y todo desbloqueado en ambas ediciones.

## Juego (crecimiento y retención)
1. **Reto del día con semilla**: el mismo mazo para todos cada día (sin internet: la semilla sale de la fecha) y un resultado para compartir por WhatsApp, estilo Wordle ("Nexus Caos #42 · campeón en 5 partidas · 2 Caos"). Viraliza gratis.
2. **Marcador para cartas físicas**: modo "anotador" que reemplaza la "hoja para anotar puntajes" (regla 1 del documento). Lleva puntos, −5 y 10, y dice quién reparte y quién inicia. Une el juego digital con la venta de las cartas físicas.
3. **Logros e insignias** (sin desbloquear nada): "Caos a la primera", "Racha ×5", "Salvado por la segunda Caos", "Rey de reyes con 12 jugadores". Dan metas sin tocar la suerte.
4. **Torneo o liga local**: varios juegos seguidos con una tabla de temporada entre amigos (por LAN, Bluetooth o en el mismo celular).
5. **Bots con personalidad**: nombres y frases por elemento (Ígnea agresiva, Marea paciente) para darle carácter a las partidas contra la máquina.
6. **Música original corta** por elemento y un tema "cósmico" para el Caos; ya hay efectos de sonido.
7. **Idiomas**: inglés y portugués primero (Steam y Brasil). Los textos ya están centralizados en `ui.js`.

## Reglas del libro físico (corregir antes de imprimir)
- Unificar el castigo Caos (la sinopsis dice −3 a todos; la sección PERDER dice −1/−2/−3) y el error "los que quedaron con 4 carta".
- Escribir la "mesa limpia" en Combos, porque sin ella el juego se cierra siempre.
- Explicar qué pasa cuando el turno vuelve a quien puso la carta.
- Combos con 5–6 jugadores: el mazo de 11 se agota rápido y casi siempre termina en cierre. Probar en mesa si conviene 5 cartas por jugador con 6 jugadores, o rebarajar el descarte.

## Lanzamiento escalonado
1. **Web (ya está)**: compartir el enlace, medir con amigos y ajustar.
2. **Play Store**: pide AAB (compilar con Capacitor + Gradle), cuenta de desarrollador (pago único de 25 USD), política de privacidad y ficha con capturas.
3. **PC gratis**: itch.io (sin costo) con versión web y descarga (Electron o Tauri).
4. **Steam**: Steam Direct (100 USD por juego) con la edición de pago de 3 USD.
5. **Microsoft Store**: la PWA se empaqueta con PWABuilder.
6. **iOS en App Store**: necesita Mac y la cuenta de Apple (99 USD/año). Mientras tanto, la PWA en iPhone es gratis.
7. **Facebook Instant Games**: acepta HTML5, así que el archivo único sirve de base.

## Anuncios y dinero
- El documento dice "de 5 años a todas las edades". Si en Play Store se marca para niños, aplica la política de **Familias**: solo SDK de anuncios certificados, sin anuncios personalizados y con consentimiento de los padres. Decidir el público antes de poner AdMob.
- Anuncios solo entre partidas (el gancho `NexusAnuncios.entrePartidas` ya existe) y nunca en medio de un turno.
- Donaciones en la página oficial (Ko-fi o PayPal) y un enlace "Compra las cartas físicas" cuando existan.

## Protección legal (consultar con un abogado)
- Las reglas de un juego casi nunca se pueden patentar. Lo que sí se protege:
  - **Derechos de autor** (Colombia: DNDA, registro gratuito) del reglamento, el arte de las cartas, el logo y el software.
  - **Marca "Nexus Caos"** (Colombia: SIC). Clases sugeridas: 9 (software y juegos descargables), 28 (juegos y naipes) y 41 (entretenimiento).
- No circular el documento con cédulas, teléfonos ni fotos de documentos de identidad.

## Técnico
- Probar en celulares reales: APK, Bluetooth, QR con cámara y Wi-Fi LAN (mDNS) en distintas redes.
- Para tiendas: migrar la APK a Capacitor con Gradle (AAB firmado con la misma llave).
- Copia de seguridad opcional en la nube (Google Drive o iCloud) sin cuentas propias, para mantener que "cada jugador es dueño de sus datos".
- Multijugador en línea más adelante: hoy es solo local. En línea haría falta un servidor (o WebRTC con servidor de señalización y TURN).
