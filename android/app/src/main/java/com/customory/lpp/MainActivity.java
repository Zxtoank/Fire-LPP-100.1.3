
package com.customory.lpp;

import android.app.Activity;
import android.app.SearchManager;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import java.io.OutputStream;


public class MainActivity extends Activity {

    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);

        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);

        webView.setWebViewClient(new MyWebViewClient());
        webView.addJavascriptInterface(new WebAppInterface(this), "AndroidBridge");

        String appUrl = getString(R.string.app_url);

        if (appUrl.contains("REPLACE_WITH_YOUR_LIVE_APP_URL")) {
            Toast.makeText(this, "Configuration needed: app_url in strings.xml is not set.", Toast.LENGTH_LONG).show();
            webView.loadData("<html><body><h1>Configuration Needed</h1><p>Please set your application's live URL in the strings.xml file.</p></body></html>", "text/html", "UTF-8");
        } else {
            webView.loadUrl(appUrl);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    private static class MyWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            String url = request.getUrl().toString();

            if (url != null && url.contains("amazon.com")) {
                try {
                    // This intent forces the link to be treated as a web search,
                    // which ensures it opens in a browser instead of the Amazon app.
                    Intent intent = new Intent(Intent.ACTION_WEB_SEARCH);
                    intent.putExtra(SearchManager.QUERY, url);
                    view.getContext().startActivity(intent);
                    return true; 
                } catch (Exception e) {
                    // Fallback just in case
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        view.getContext().startActivity(intent);
                        return true;
                    } catch (Exception ignored) {}
                }
            }
            // Let the WebView handle all other URLs.
            return false;
        }
    }
    
    public static class WebAppInterface {
        Context mContext;

        WebAppInterface(Context c) {
            mContext = c;
        }

        @JavascriptInterface
        public void saveFile(String base64Data, String fileName, String mimeType) {
            ContentResolver resolver = mContext.getContentResolver();
            ContentValues contentValues = new ContentValues();
            contentValues.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
            contentValues.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
            contentValues.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);

            Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues);

            if (uri != null) {
                try (OutputStream outputStream = resolver.openOutputStream(uri)) {
                    if (outputStream != null) {
                        byte[] data = Base64.decode(base64Data, Base64.DEFAULT);
                        outputStream.write(data);
                        new Handler(Looper.getMainLooper()).post(() ->
                            Toast.makeText(mContext, "Saved to Downloads: " + fileName, Toast.LENGTH_LONG).show()
                        );
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                    new Handler(Looper.getMainLooper()).post(() ->
                        Toast.makeText(mContext, "Error saving file.", Toast.LENGTH_SHORT).show()
                    );
                }
            }
        }
    }
}
