package com.handheld.reader;

import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Screen-awake bridge for the reader's "Screen Off Timer" setting.
        // The web layer requests a Screen Wake Lock when available and calls
        // this flag as a fallback on WebViews that do not expose it.
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().addJavascriptInterface(new ScreenAwakeBridge(), "NativeScreen");
        }
    }

    public class ScreenAwakeBridge {
        @JavascriptInterface
        public void setKeepScreenOn(final boolean enabled) {
            runOnUiThread(() -> {
                if (enabled) {
                    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                } else {
                    getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                }
            });
        }
    }
}
