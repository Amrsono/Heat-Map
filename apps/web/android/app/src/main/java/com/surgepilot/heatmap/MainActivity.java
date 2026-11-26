package com.surgepilot.heatmap;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.GeolocationPermissions;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        configureEdgeToEdgeAndSystemBars();
        configureResponsiveWebView();
    }

    private void configureEdgeToEdgeAndSystemBars() {
        Window window = getWindow();
        if (window != null) {
            window.setStatusBarColor(Color.parseColor("#090d16"));
            window.setNavigationBarColor(Color.parseColor("#090d16"));
            WindowCompat.setDecorFitsSystemWindows(window, false);

            View decorView = window.getDecorView();
            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, decorView);
            if (controller != null) {
                controller.setAppearanceLightStatusBars(false);
                controller.setAppearanceLightNavigationBars(false);
            }
        }

        View rootView = findViewById(android.R.id.content);
        if (rootView != null) {
            rootView.setBackgroundColor(Color.parseColor("#090d16"));
            ViewCompat.setOnApplyWindowInsetsListener(rootView, (view, windowInsets) -> {
                Insets bars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
                );
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return WindowInsetsCompat.CONSUMED;
            });
        }
    }

    private void configureResponsiveWebView() {
        if (this.bridge == null || this.bridge.getWebView() == null) {
            return;
        }

        WebView webView = this.bridge.getWebView();
        webView.setBackgroundColor(Color.parseColor("#090d16"));

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setTextZoom(100);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        // Preserve Capacitor's BridgeWebChromeClient (alerts, file upload, dialogs) while auto-granting geolocation
        webView.setWebChromeClient(new BridgeWebChromeClient(this.bridge) {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, true);
            }
        });
    }
}
