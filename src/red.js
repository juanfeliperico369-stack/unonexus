/* NEXUS CAOS — LAN sin servidor ni internet: WebRTC DataChannel con señalización manual (QR o código).
 * Topología estrella: el anfitrión corre el motor (autoritativo) y envía a cada invitado su "vista"; los invitados envían acciones.
 * Código = "NX1" + base64url(deflate-raw(JSON{sdp,…})) (o "NX0" sin compresión). iceServers vacío: solo red local. */
(function (raiz) {
  'use strict';
  const Red = { rol: null, pares: {}, n: 0, _h: {} };
  Red.disponible = () => typeof raiz.RTCPeerConnection !== 'undefined';
  Red.on = (ev, fn) => { (Red._h[ev] = Red._h[ev] || []).push(fn); };
  const emitir = (ev, ...a) => (Red._h[ev] || []).forEach(f => { try { f(...a); } catch (e) { console.error(e); } });
  const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const ub64 = t => { t = t.replace(/-/g, '+').replace(/_/g, '/'); while (t.length % 4) t += '='; const s = atob(t), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
  // Quita líneas del SDP que no hacen falta en una red local (achica el QR).
  const limpiarSDP = sdp => sdp.split(/\r?\n/).filter(l => l && !/^a=(extmap|msid-semantic|ice-options|max-message-size)/.test(l) && !/typ (srflx|relay)/.test(l) && !/ tcp /.test(l)).join('\r\n') + '\r\n';
  async function comprimir(o) {
    const s = JSON.stringify(o);
    try {
      const cs = new Blob([s]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      return 'NX1' + b64(new Uint8Array(await new Response(cs).arrayBuffer()));
    } catch (e) { return 'NX0' + b64(new TextEncoder().encode(s)); }
  }
  async function abrir(c) {
    c = String(c || '').replace(/\s+/g, '');
    if (c.startsWith('NX1')) { const ds = new Blob([ub64(c.slice(3))]).stream().pipeThrough(new DecompressionStream('deflate-raw')); return JSON.parse(await new Response(ds).text()); }
    if (c.startsWith('NX0')) return JSON.parse(new TextDecoder().decode(ub64(c.slice(3))));
    throw new Error('no es un código de Nexus Caos');
  }
  function esperarICE(pc) {
    return new Promise(res => {
      if (pc.iceGatheringState === 'complete') return res();
      const t = setTimeout(res, 3000);
      pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } });
    });
  }
  function vigilar(id, pc) {
    pc.addEventListener('connectionstatechange', () => {
      const P = Red.pares[id]; if (!P) return;
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed' || pc.connectionState === 'disconnected') caer(id);
    });
  }
  function caer(id) {
    const P = Red.pares[id]; if (!P || P.estado === 'cerrado') return;
    const estaba = P.estado === 'conectado';
    P.estado = 'cerrado';
    if (P.bt) { try { raiz.AndroidBT.cerrar(P.nid); } catch (e) {} }
    else { try { P.dc && P.dc.close(); P.pc.close(); } catch (e) {} }
    delete Red.pares[id];
    if (estaba) emitir('desconectado', id);
  }
  function canal(id, dc) {
    const P = Red.pares[id]; if (!P) return;
    P.dc = dc;
    dc.onopen = () => { P.estado = 'conectado'; emitir('conectado', id); };
    dc.onclose = () => caer(id);
    dc.onmessage = e => { let o; try { o = JSON.parse(e.data); } catch (er) { return; } if (o && o.t === 'chao') { caer(id); return; } emitir('mensaje', id, o); };
  }
  Red.anfitrion = () => { Red.salir(); Red.rol = 'anfitrion'; };
  // Anfitrión: crea una invitación (un código por invitado).
  Red.invitar = async () => {
    if (Red.rol !== 'anfitrion') Red.anfitrion();
    const id = 'p' + (++Red.n), pc = new raiz.RTCPeerConnection({ iceServers: [] });
    Red.pares[id] = { pc, estado: 'invitado' };
    vigilar(id, pc);
    canal(id, pc.createDataChannel('nexus', { ordered: true }));
    await pc.setLocalDescription(await pc.createOffer());
    await esperarICE(pc);
    return comprimir({ n: 'nexus', id, sdp: limpiarSDP(pc.localDescription.sdp) });
  };
  // Anfitrión: lee la respuesta del invitado.
  Red.aceptar = async cod => {
    const o = await abrir(cod);
    if (o.n !== 'nexus' || o.r !== 'resp') throw new Error('no es una respuesta de invitado');
    const P = Red.pares[o.id];
    if (!P) throw new Error('esa respuesta es de otra invitación');
    await P.pc.setRemoteDescription({ type: 'answer', sdp: o.sdp });
  };
  // Invitado: lee la invitación y devuelve su respuesta.
  Red.unirse = async cod => {
    const o = await abrir(cod);
    if (o.n !== 'nexus' || o.r) throw new Error('no es una invitación de anfitrión');
    Red.salir(); Red.rol = 'invitado';
    const id = 'h', pc = new raiz.RTCPeerConnection({ iceServers: [] });
    Red.pares[id] = { pc, estado: 'uniendo' };
    vigilar(id, pc);
    pc.ondatachannel = ev => canal(id, ev.channel);
    await pc.setRemoteDescription({ type: 'offer', sdp: o.sdp });
    await pc.setLocalDescription(await pc.createAnswer());
    await esperarICE(pc);
    return comprimir({ n: 'nexus', r: 'resp', id: o.id, sdp: limpiarSDP(pc.localDescription.sdp) });
  };
  const mandar = (P, msg) => {
    if (P && P.bt && P.estado === 'conectado') { try { raiz.AndroidBT.enviar(P.nid, JSON.stringify(msg)); return true; } catch (e) { return false; } }
    if (P && P.dc && P.dc.readyState === 'open') { try { P.dc.send(JSON.stringify(msg)); return true; } catch (e) {} }
    return false;
  };
  Red.enviar = msg => mandar(Red.pares.h, msg);
  Red.enviarA = (id, msg) => mandar(Red.pares[id], msg);
  Red.estado = id => (Red.pares[id] || {}).estado || 'desconectado';
  Red.cerrar = id => caer(id);
  Red.salir = () => {
    Object.keys(Red.pares).forEach(id => {
      const P = Red.pares[id];
      if (P) { P.estado = 'cerrado'; try { if (P.bt) raiz.AndroidBT.cerrar(P.nid); else { P.dc && P.dc.close(); P.pc.close(); } } catch (e) {} }
      delete Red.pares[id];
    });
    if (Red.btSala) { Red.btSala = false; try { raiz.AndroidBT.salir(); } catch (e) {} }
    Red.rol = null;
  };
  // ---------- Bluetooth (solo en la app Android: puente nativo AndroidBT con RFCOMM, celulares emparejados) ----------
  // Los navegadores no permiten que dos teléfonos se conecten entre sí por Bluetooth (Web Bluetooth solo es cliente BLE).
  Red.btDisponible = () => !!raiz.AndroidBT;
  Red.btEstado = () => { try { return raiz.AndroidBT.estado(); } catch (e) { return 'no'; } }; // ok | apagado | sin-permiso | no
  Red.btPedirPermiso = () => { try { raiz.AndroidBT.pedirPermiso(); } catch (e) {} };
  Red.btActivar = () => { try { raiz.AndroidBT.activar(); } catch (e) {} };
  Red.btEmparejados = () => { try { return JSON.parse(raiz.AndroidBT.emparejados() || '[]'); } catch (e) { return []; } };
  Red.btAbrirSala = () => { if (Red.rol !== 'anfitrion') Red.anfitrion(); Red.btSala = true; raiz.AndroidBT.abrirSala(); };
  Red.btUnirse = mac => { Red.salir(); Red.rol = 'invitado'; Red.pares.h = { bt: true, nid: '', estado: 'uniendo' }; raiz.AndroidBT.unirse(mac); };
  // Eventos que manda Java: BTNativo.evento(tipo, idNativo, dato)
  raiz.BTNativo = {
    evento(tipo, nid, dato) {
      const id = Red.rol === 'invitado' ? 'h' : nid;
      if (tipo === 'conectado') { Red.pares[id] = Object.assign(Red.pares[id] || {}, { bt: true, nid, estado: 'conectado' }); emitir('conectado', id); }
      else if (tipo === 'mensaje') { let o; try { o = JSON.parse(dato); } catch (e) { return; } if (o && o.t === 'chao') { caer(id); return; } emitir('mensaje', id, o); }
      else if (tipo === 'desconectado') { const P = Red.pares[id]; if (P && P.estado === 'uniendo') { delete Red.pares[id]; emitir('error', id, 'No se pudo conectar por Bluetooth'); } else caer(id); }
      else if (tipo === 'error') emitir('error', id, dato);
      else if (tipo === 'sala') emitir('btsala', id, dato);
    }
  };
  // Avisar al otro lado al cerrar la pestaña/app (si no, WebRTC tarda varios segundos en notarlo).
  if (raiz.addEventListener) raiz.addEventListener('pagehide', () => { Object.keys(Red.pares).forEach(id => mandar(Red.pares[id], { t: 'chao' })); });
  Red._abrir = abrir; Red._comprimir = comprimir;
  raiz.Red = Red;
})(typeof window !== 'undefined' ? window : globalThis);
