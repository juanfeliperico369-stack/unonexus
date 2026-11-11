/* NEXUS CAOS — Arte vectorial (SVG) basado en los bocetos del documento.
 * Frente "universal": negro alternativo #3D3939, símbolos en trazo con su color (sin rellenar) y subrayado negro.
 * Reversos: gama baja (negro + plata), media (plata, símbolos en cuadrado), alta (dorado con relieve, losango invertido).
 * Uso: Arte.instalar() una vez (crea el sprite <svg> oculto); luego Arte.carta('fuego'), Arte.reverso('alta'), Arte.logo(). */
(function (raiz) {
  'use strict';
  const COLOR = { fuego: '#C42222', agua: '#257CA2', tierra: '#308936', aire: '#A7B7BB', caos: '#FFFFFF' };
  const NOMBRE = { fuego: 'FUEGO', agua: 'AGUA', tierra: 'TIERRA', aire: 'AIRE', caos: 'CAOS' };
  // Espiral de Aire (calculada)
  function espiral(cx, cy, vueltas, rmax) {
    let d = '';
    const pasos = 70;
    for (let k = 0; k <= pasos; k++) {
      const t = k / pasos, a = t * vueltas * Math.PI * 2, r = 2 + t * rmax;
      d += (k ? ' L' : 'M') + (cx + r * Math.cos(a)).toFixed(1) + ' ' + (cy + r * Math.sin(a)).toFixed(1);
    }
    return d;
  }
  // Trazos en viewBox 0 0 100 100. "s" = símbolo (en círculo), "d" = dibujo (esquinas).
  const TRAZO = {
    fuego_s: '<circle cx="50" cy="50" r="42"/><path d="M40 80 C26 70 28 54 38 44 C36 54 40 58 44 56 C38 44 44 30 54 20 C54 34 66 40 66 54 C70 50 70 44 68 40 C78 52 76 70 62 80"/><path d="M50 80 C44 74 44 66 50 60 C52 66 56 68 58 64 C62 70 58 78 50 80"/>',
    fuego_d: '<path d="M50 94 C26 94 14 74 24 54 C28 62 34 64 36 60 C28 44 38 24 52 8 C52 28 64 32 66 48 C70 44 72 38 70 30 C86 46 88 70 76 84 C70 90 60 94 50 94 Z"/><path d="M50 94 C40 88 40 78 48 70 C50 76 54 78 56 74 C62 82 58 92 50 94"/>',
    agua_s: '<circle cx="50" cy="50" r="42"/><path d="M14 36 Q22 26 30 36 T46 36 T62 36 T78 36 T90 34"/><path d="M10 54 Q18 44 26 54 T42 54 T58 54 T74 54 T90 52"/><path d="M14 72 Q22 62 30 72 T46 72 T62 72 T78 72 T86 70"/>',
    agua_d: '<path d="M52 8 C50 26 64 38 64 54 C64 64 58 70 50 70 C42 70 36 64 36 56 C36 42 52 30 52 8 Z"/><path d="M12 64 C14 86 86 90 90 64"/><path d="M22 70 C30 82 70 84 80 70"/><path d="M32 74 C40 80 60 80 68 74"/>',
    tierra_s: '<circle cx="50" cy="50" r="42"/><path d="M50 10 V92"/><path d="M50 30 C40 26 30 30 22 40"/><path d="M50 30 C60 26 70 30 78 40"/><path d="M50 54 C38 50 24 56 14 66"/><path d="M50 54 C62 50 76 56 86 66"/><path d="M50 74 C42 74 34 80 30 88"/><path d="M50 74 C58 74 66 80 70 88"/>',
    tierra_d: '<path d="M34 92 C16 62 28 28 68 8 C84 42 78 76 42 90 Z"/><path d="M42 82 C46 66 54 50 62 36"/>',
    aire_s: '<circle cx="50" cy="50" r="42"/><path d="' + espiral(50, 50, 2.6, 30) + '"/>',
    aire_d: '<path d="M6 28 H58 C78 28 86 48 74 58 C64 66 50 58 56 48"/><path d="M6 44 H50"/><path d="M12 62 H48 C62 62 70 76 60 86 C52 92 42 84 46 76"/>',
    caos_s: '<ellipse cx="50" cy="50" rx="44" ry="26" transform="rotate(-35 50 50)"/><ellipse cx="50" cy="50" rx="40" ry="30" transform="rotate(-35 50 50)"/>'
  };
  function grupo(id, color, ancho) {
    // subrayado negro debajo + trazo del color encima (resalta sin rellenar)
    return '<g fill="none" stroke-linecap="round" stroke-linejoin="round">' +
      '<g stroke="#000" stroke-width="' + (ancho + 3.5) + '" opacity=".85">' + TRAZO[id] + '</g>' +
      '<g stroke="' + color + '" stroke-width="' + ancho + '">' + TRAZO[id] + '</g></g>';
  }
  function hoyos() { // agujero negro y agujero blanco del Caos
    return '<circle cx="34" cy="36" r="15" fill="#000" stroke="#fff" stroke-width="3"/><circle cx="34" cy="36" r="6" fill="#3D3939"/>' +
      '<circle cx="66" cy="64" r="15" fill="#fff" stroke="#000" stroke-width="3"/><circle cx="66" cy="64" r="6" fill="#fff" stroke="#000" stroke-width="2"/>';
  }
  const PALABRAS = ['CAOS', 'CHAOS', 'KAOS', 'ХАОС', 'ΧΆΟΣ', 'HAOS', 'KÁOSZ', 'KAAOS', 'CHAOSAS', 'HAOSS', 'ĤAOSO', 'XAOS', 'KAOSI', 'CAOSU', 'KHAOS', 'CHAOSU'];
  function lineas(color, sombra, n) {
    let s = '';
    for (let k = 0; k < n; k++) {
      const y = 22 + k * 17.5, ws = [];
      for (let w = 0; w < 4; w++) ws.push(PALABRAS[(k * 4 + w * 3 + k) % PALABRAS.length]);
      const t = ws.join('  ');
      if (sombra) s += '<text x="70.6" y="' + (y + 0.8) + '" fill="' + sombra + '">' + t + '</text>';
      s += '<text x="70" y="' + y + '" fill="' + color + '">' + t + '</text>';
    }
    return '<g clip-path="url(#nx-clip)" font-family="Titulos,Impact,Arial Narrow,sans-serif" font-size="9.5" text-anchor="middle" letter-spacing=".6">' + s + '</g>';
  }
  function mini(e, x, y, t, color, ancho) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + t / 100 + ')">' + grupoColor(e + '_s', color, ancho) + '</g>';
  }
  function grupoColor(id, color, ancho) {
    return '<g fill="none" stroke="' + color + '" stroke-width="' + ancho + '" stroke-linecap="round" stroke-linejoin="round">' + TRAZO[id] + '</g>';
  }
  function marco(fondo, borde, tinte) {
    return '<rect x="1.5" y="1.5" width="137" height="197" rx="11" fill="' + fondo + '" stroke="#000" stroke-width="3"/>' +
      (tinte ? '<rect x="3" y="3" width="134" height="194" rx="10" fill="url(#nx-t-' + tinte + ')"/>' : '') +
      '<rect x="7" y="7" width="126" height="186" rx="8" fill="none" stroke="' + borde + '" stroke-width="1.2" opacity=".7"/>';
  }
  function frente(e) {
    const c = COLOR[e];
    let s = marco('#3D3939', c, e);
    if (e === 'caos') {
      s += '<g opacity=".55" fill="#fff">' + [[20, 30], [112, 22], [30, 170], [116, 160], [70, 24], [24, 100], [118, 96], [64, 178]].map(p => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="1.3"/>').join('') + '</g>';
      s += '<g transform="translate(22 46) scale(.96)">' + grupo('caos_s', '#fff', 3.2) + hoyos() + '</g>';
    } else {
      const d = e + '_d';
      s += '<g transform="translate(12 12) scale(.24)">' + grupo(d, c, 6) + '</g>';
      s += '<g transform="translate(104 12) scale(.24)">' + grupo(d, c, 6) + '</g>';
      s += '<g transform="translate(36 188) scale(.24) rotate(180)">' + grupo(d, c, 6) + '</g>';
      s += '<g transform="translate(128 188) scale(.24) rotate(180)">' + grupo(d, c, 6) + '</g>';
      s += '<g transform="translate(30 52) scale(.8)">' + grupo(e + '_s', c, 4.5) + '</g>';
    }
    s += '<text x="70" y="152" text-anchor="middle" font-family="Titulos,Impact,Arial Narrow,sans-serif" font-size="15" letter-spacing="3" fill="' + c + '" stroke="#000" stroke-width=".6" paint-order="stroke">' + NOMBRE[e] + '</text>';
    return s;
  }
  function reversoSVG(g) {
    let s;
    if (g === 'alta') {
      s = marco('#BFAF5B', '#C8BC7A') + lineas('#C8BC7A', '#9c8d3f', 10);
      const R = '#BFB893', sh = '#8f8236';
      [['fuego', 48, 30], ['agua', 18, 74], ['tierra', 78, 74], ['aire', 48, 118]].forEach(([e, x, y]) => { s += mini(e, x + 1.2, y + 1.2, 44, sh, 7) + mini(e, x, y, 44, R, 7); });
    } else if (g === 'media') {
      s = marco('#CBC7C7', '#A8A2A2') + lineas('#C0C0C0', null, 10);
      [['fuego', 22, 46], ['agua', 76, 46], ['tierra', 22, 100], ['aire', 76, 100]].forEach(([e, x, y]) => { s += mini(e, x, y, 42, '#A8A2A2', 8); });
    } else {
      s = marco('#3D3939', '#C0C0C0');
      s += '<g font-family="Titulos,Impact,Arial Narrow,sans-serif" font-size="24" text-anchor="middle" letter-spacing="6" fill="#C0C0C0"><text x="72" y="34">CAOS</text><text x="72" y="186" transform="rotate(180 70 178)">CAOS</text></g>';
      [['fuego', 44], ['agua', 76], ['tierra', 108], ['aire', 140]].forEach(([e, y], k) => { s += mini(e, 56, y - 4, 28, '#A7B7BB', 9); });
    }
    return s;
  }
  // Logo (boceto del documento): todo queda DENTRO del círculo (recorte de seguridad nx-clip-logo).
  function logoSVG() {
    let s = '<circle cx="50" cy="50" r="47" fill="#efe9d6"/>';
    let pts = '';
    for (let k = 0; k < 64; k++) { const a = k * 2.399, r = 6 + 35 * Math.sqrt((k + 0.5) / 64); pts += '<circle cx="' + (50 + r * Math.cos(a)).toFixed(1) + '" cy="' + (50 + r * Math.sin(a)).toFixed(1) + '" r=".8"/>'; }
    s += '<g clip-path="url(#nx-clip-logo)"><g fill="#000" opacity=".5">' + pts + '</g>';
    s += '<g transform="translate(21 19) scale(.29)">' + grupoColor('aire_d', '#000', 7) + '</g>';
    s += '<g transform="translate(19 52) scale(.28)">' + grupoColor('tierra_d', '#000', 7) + '</g>';
    s += '<g transform="translate(56 53) scale(.28)">' + grupoColor('fuego_d', '#000', 7) + '</g>';
    s += '<g transform="translate(41 68) scale(.2)">' + grupoColor('agua_d', '#000', 9) + '</g>';
    s += '<circle cx="62" cy="36" r="11.5" fill="#000"/><circle cx="40" cy="56" r="8" fill="#fff" stroke="#000" stroke-width="2"/></g>';
    s += '<circle cx="50" cy="50" r="46" fill="none" stroke="#000" stroke-width="3"/><circle cx="50" cy="50" r="42.5" fill="none" stroke="#000" stroke-width=".8" opacity=".6"/>';
    return s;
  }
  // Símbolos alquímicos clásicos de los 4 elementos + Tao (☯) para la interfaz (no para las cartas).
  const ALQ = {
    fuego: '<path d="M50 12 L90 84 H10 Z"/>',
    agua: '<path d="M10 16 H90 L50 88 Z"/>',
    aire: '<path d="M50 12 L90 84 H10 Z"/><path d="M22 60 H78"/>',
    tierra: '<path d="M10 16 H90 L50 88 Z"/><path d="M22 40 H78"/>'
  };
  const TAO = '<circle cx="50" cy="50" r="44" fill="#fff" stroke="#000" stroke-width="5"/><path d="M50 6 A44 44 0 0 1 50 94 A22 22 0 0 1 50 50 A22 22 0 0 0 50 6 Z" fill="#000"/><circle cx="50" cy="28" r="7" fill="#fff"/><circle cx="50" cy="72" r="7" fill="#000"/>';
  let instalado = false;
  function instalar() {
    if (instalado || typeof document === 'undefined') return;
    instalado = true;
    const ns = 'http://www.w3.org/2000/svg';
    // Brillo suave del color del elemento en el centro y viñeta oscura en los bordes (frente "universal" #3D3939)
    let defs = ['fuego', 'agua', 'tierra', 'aire', 'caos'].map(e => '<radialGradient id="nx-t-' + e + '" cx="50%" cy="42%" r="68%">' +
      '<stop offset="0" stop-color="' + COLOR[e] + '" stop-opacity="' + (e === 'caos' ? '.16' : '.24') + '"/><stop offset=".55" stop-color="' + COLOR[e] + '" stop-opacity=".05"/>' +
      '<stop offset="1" stop-color="#000" stop-opacity=".42"/></radialGradient>').join('');
    defs += '<clipPath id="nx-clip"><rect x="7" y="7" width="126" height="186" rx="8"/></clipPath><clipPath id="nx-clip-logo"><circle cx="50" cy="50" r="42"/></clipPath>';
    ['fuego', 'agua', 'tierra', 'aire'].forEach(e => { defs += '<symbol id="nx-a-' + e + '" viewBox="0 0 100 100"><g fill="none" stroke="' + COLOR[e] + '" stroke-width="9" stroke-linejoin="round" stroke-linecap="round">' + ALQ[e] + '</g></symbol>'; });
    defs += '<symbol id="nx-a-tao" viewBox="0 0 100 100">' + TAO + '</symbol>';
    ['fuego', 'agua', 'tierra', 'aire', 'caos'].forEach(e => { defs += '<symbol id="nx-c-' + e + '" viewBox="0 0 140 200">' + frente(e) + '</symbol>'; });
    ['baja', 'media', 'alta'].forEach(g => { defs += '<symbol id="nx-r-' + g + '" viewBox="0 0 140 200">' + reversoSVG(g) + '</symbol>'; });
    ['fuego', 'agua', 'tierra', 'aire'].forEach(e => { defs += '<symbol id="nx-s-' + e + '" viewBox="0 0 100 100">' + grupo(e + '_s', COLOR[e], 6) + '</symbol>'; });
    defs += '<symbol id="nx-s-caos" viewBox="0 0 100 100">' + grupo('caos_s', '#fff', 4) + hoyos() + '</symbol>';
    defs += '<symbol id="nx-logo" viewBox="0 0 100 100">' + logoSVG() + '</symbol>';
    const div = document.createElement('div');
    div.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    div.setAttribute('aria-hidden', 'true');
    div.innerHTML = '<svg xmlns="' + ns + '" width="0" height="0"><defs>' + defs + '</defs></svg>';
    document.body.prepend(div);
  }
  const usar = (id, vb, cls, titulo) => '<svg class="' + (cls || '') + '" viewBox="' + vb + '"' + (titulo ? ' role="img" aria-label="' + titulo + '"' : ' aria-hidden="true"') + '><use href="#' + id + '"/></svg>';
  const Arte = {
    COLOR, NOMBRE, instalar, frente, reversoSVG, logoSVG,
    carta: (e, cls) => usar('nx-c-' + e, '0 0 140 200', 'carta-svg ' + (cls || ''), NOMBRE[e]),
    reverso: (g, cls) => usar('nx-r-' + (g || 'baja'), '0 0 140 200', 'carta-svg ' + (cls || ''), 'Reverso'),
    simbolo: (e, cls) => usar('nx-s-' + e, '0 0 100 100', 'sim ' + (cls || ''), NOMBRE[e]),
    logo: cls => usar('nx-logo', '0 0 100 100', 'logo ' + (cls || ''), 'Logo Nexus Caos'),
    alq: (e, cls) => usar('nx-a-' + e, '0 0 100 100', 'alq ' + (e === 'tao' ? 'tao ' : '') + (cls || ''), e === 'tao' ? 'Tao' : NOMBRE[e]),
    alqs: () => '<div class="alqs" aria-hidden="true">' + ['fuego', 'agua', 'aire', 'tierra'].map(e => usar('nx-a-' + e, '0 0 100 100', 'alq')).join('') + usar('nx-a-tao', '0 0 100 100', 'alq tao') + '</div>'
  };
  raiz.Arte = Arte;
  if (typeof module !== 'undefined' && module.exports) module.exports = Arte;
})(typeof window !== 'undefined' ? window : globalThis);
