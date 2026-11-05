package com.infinitetree.nexuscaos;

import android.app.Activity;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.webkit.JavascriptInterface;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/** Puente "AndroidApp": exportar datos del jugador a la carpeta Descargas. */
public class Puente {
    final Activity act;
    Puente(Activity a) { act = a; }

    @JavascriptInterface
    public String exportar(String nombre, String contenido) throws Exception {
        byte[] datos = contenido.getBytes(StandardCharsets.UTF_8);
        if (Build.VERSION.SDK_INT >= 29) {
            ContentValues v = new ContentValues();
            v.put(MediaStore.Downloads.DISPLAY_NAME, nombre);
            v.put(MediaStore.Downloads.MIME_TYPE, "application/json");
            Uri u = act.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
            if (u == null) throw new Exception("sin acceso a Descargas");
            try (OutputStream o = act.getContentResolver().openOutputStream(u)) { o.write(datos); }
            return "Descargas/" + nombre;
        }
        File d = act.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (d == null) d = act.getFilesDir();
        File f = new File(d, nombre);
        try (FileOutputStream o = new FileOutputStream(f)) { o.write(datos); }
        return f.getAbsolutePath();
    }

    @JavascriptInterface
    public void compartir(String texto) {
        act.runOnUiThread(() -> {
            android.content.Intent i = new android.content.Intent(android.content.Intent.ACTION_SEND);
            i.setType("text/plain");
            i.putExtra(android.content.Intent.EXTRA_TEXT, texto);
            act.startActivity(android.content.Intent.createChooser(i, "Compartir resultado"));
        });
    }

    @JavascriptInterface
    public String version() { return BuildConfigNexus.VERSION; }
}
