package com.infinitetree.nexuscaos;

import android.Manifest;
import android.app.Activity;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothServerSocket;
import android.bluetooth.BluetoothSocket;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Puente "AndroidBT": multijugador por Bluetooth clásico (RFCOMM) entre celulares emparejados.
 * El anfitrión abre una sala (servidor, varias conexiones); cada invitado se conecta a él.
 * Mensajes = una línea de JSON por mensaje. Eventos hacia JS: BTNativo.evento(tipo, id, dato).
 */
public class PuenteBT {
    static final UUID ID = UUID.fromString("6e657875-732d-6361-6f73-4e5843303031");
    final Activity act;
    final WebView web;
    final BluetoothAdapter ad;
    final Map<String, Conexion> cons = new ConcurrentHashMap<>();
    volatile BluetoothServerSocket servidor;
    int n = 0;

    PuenteBT(Activity a, WebView w) {
        act = a; web = w;
        BluetoothManager m = (BluetoothManager) a.getSystemService(Context.BLUETOOTH_SERVICE);
        ad = m != null ? m.getAdapter() : null;
    }

    boolean permiso() {
        return Build.VERSION.SDK_INT < 31 || act.checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED;
    }

    @JavascriptInterface public String estado() {
        if (ad == null) return "no";
        if (!permiso()) return "sin-permiso";
        return ad.isEnabled() ? "ok" : "apagado";
    }

    @JavascriptInterface public void pedirPermiso() {
        if (Build.VERSION.SDK_INT >= 31) act.runOnUiThread(() -> act.requestPermissions(new String[]{Manifest.permission.BLUETOOTH_CONNECT}, 11));
    }

    @JavascriptInterface public void activar() {
        if (!permiso()) { pedirPermiso(); return; }
        act.runOnUiThread(() -> { try { act.startActivity(new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE)); } catch (Exception e) { evento("error", "", "No se pudo activar el Bluetooth"); } });
    }

    @JavascriptInterface public String emparejados() {
        JSONArray a = new JSONArray();
        if (!"ok".equals(estado())) return a.toString();
        try {
            for (BluetoothDevice d : ad.getBondedDevices()) {
                JSONObject o = new JSONObject();
                o.put("nombre", d.getName() == null ? "" : d.getName());
                o.put("mac", d.getAddress());
                a.put(o);
            }
        } catch (Exception e) { /* sin permiso */ }
        return a.toString();
    }

    @JavascriptInterface public void abrirSala() {
        cerrarServidor();
        new Thread(() -> {
            try {
                servidor = ad.listenUsingInsecureRfcommWithServiceRecord("NexusCaos", ID);
                evento("sala", "", "abierta");
                while (servidor != null) {
                    BluetoothSocket s = servidor.accept();
                    iniciar("b" + (++n), s);
                }
            } catch (Exception e) {
                evento("sala", "", "cerrada");
            }
        }, "nexus-bt-sala").start();
    }

    @JavascriptInterface public void unirse(final String mac) {
        new Thread(() -> {
            try {
                BluetoothDevice d = ad.getRemoteDevice(mac);
                try { ad.cancelDiscovery(); } catch (Exception ignorado) { }
                BluetoothSocket s = d.createInsecureRfcommSocketToServiceRecord(ID);
                s.connect();
                iniciar("h0", s);
            } catch (Exception e) {
                evento("error", "h0", "No se pudo conectar por Bluetooth. ¿El anfitrión abrió la sala?");
                evento("desconectado", "h0", "");
            }
        }, "nexus-bt-unirse").start();
    }

    void iniciar(String id, BluetoothSocket s) throws IOException {
        Conexion c = new Conexion(id, s);
        cons.put(id, c);
        evento("conectado", id, "");
        c.start();
    }

    @JavascriptInterface public void enviar(String id, String texto) {
        Conexion c = cons.get(id);
        if (c != null) c.enviar(texto);
    }

    @JavascriptInterface public void cerrar(String id) {
        Conexion c = cons.remove(id);
        if (c != null) {
            try { c.s.close(); } catch (IOException e) { }
            evento("desconectado", id, "");
        }
    }

    @JavascriptInterface public void salir() {
        for (String id : new ArrayList<>(cons.keySet())) cerrar(id);
        cerrarServidor();
    }

    void cerrarServidor() {
        BluetoothServerSocket sv = servidor;
        servidor = null;
        if (sv != null) try { sv.close(); } catch (IOException e) { }
    }

    void evento(String tipo, String id, String dato) {
        final String js = "window.BTNativo&&BTNativo.evento(" + JSONObject.quote(tipo) + "," + JSONObject.quote(id) + "," + JSONObject.quote(dato) + ")";
        act.runOnUiThread(() -> web.evaluateJavascript(js, null));
    }

    class Conexion extends Thread {
        final String id;
        final BluetoothSocket s;
        final OutputStream out;

        Conexion(String id, BluetoothSocket s) throws IOException {
            super("nexus-bt-" + id);
            this.id = id; this.s = s; this.out = s.getOutputStream();
        }

        @Override public void run() {
            try (BufferedReader r = new BufferedReader(new InputStreamReader(s.getInputStream(), StandardCharsets.UTF_8))) {
                String l;
                while ((l = r.readLine()) != null) evento("mensaje", id, l);
            } catch (IOException e) {
                // conexión cerrada
            } finally {
                cerrar(id);
            }
        }

        synchronized void enviar(String t) {
            try {
                out.write((t.replace('\n', ' ') + "\n").getBytes(StandardCharsets.UTF_8));
                out.flush();
            } catch (IOException e) {
                cerrar(id);
            }
        }
    }
}
