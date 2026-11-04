package com.infinitetree.nexuscaos;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/** NEXUS CAOS — contenedor Android: WebView con el juego (assets/index.html) + puentes nativos (Bluetooth y archivos). */
public class MainActivity extends Activity {
    static final int REQ_ARCHIVO = 7, REQ_CAMARA = 8;
    WebView web;
    PuenteBT bt;
    ValueCallback<Uri[]> archivoCb;
    PermissionRequest pendiente;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#efe9d6"));
        setContentView(web);
        if (Build.VERSION.SDK_INT >= 30) {
            // Android 15 dibuja de borde a borde: dejamos espacio para las barras del sistema.
            web.setOnApplyWindowInsetsListener((View v, WindowInsets in) -> {
                android.graphics.Insets s = in.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                v.setPadding(s.left, s.top, s.right, s.bottom);
                return WindowInsets.CONSUMED;
            });
        }
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setTextZoom(100);
        bt = new PuenteBT(this, web);
        web.addJavascriptInterface(bt, "AndroidBT");
        web.addJavascriptInterface(new Puente(this), "AndroidApp");
        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest r) {
                runOnUiThread(() -> {
                    if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) r.grant(r.getResources());
                    else { pendiente = r; requestPermissions(new String[]{Manifest.permission.CAMERA}, REQ_CAMARA); }
                });
            }
            @Override
            public boolean onShowFileChooser(WebView w, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (archivoCb != null) archivoCb.onReceiveValue(null);
                archivoCb = cb;
                try { startActivityForResult(p.createIntent(), REQ_ARCHIVO); } catch (Exception e) { archivoCb = null; return false; }
                return true;
            }
        });
        if (b != null) web.restoreState(b); else web.loadUrl("file:///android_asset/index.html");
    }

    @Override
    protected void onSaveInstanceState(Bundle b) { super.onSaveInstanceState(b); web.saveState(b); }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req == REQ_ARCHIVO && archivoCb != null) {
            archivoCb.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(res, data));
            archivoCb = null;
        }
        super.onActivityResult(req, res, data);
    }

    @Override
    public void onRequestPermissionsResult(int req, String[] perms, int[] res) {
        if (req == REQ_CAMARA && pendiente != null) {
            if (res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED) pendiente.grant(pendiente.getResources());
            else pendiente.deny();
            pendiente = null;
        }
        super.onRequestPermissionsResult(req, perms, res);
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.NexusAtras ? NexusAtras() : false", v -> { if (!"true".equals(v)) finish(); });
    }

    @Override
    protected void onPause() {
        web.evaluateJavascript("window.dispatchEvent(new Event('pagehide'))", null);
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        bt.salir();
        web.destroy();
        super.onDestroy();
    }
}
