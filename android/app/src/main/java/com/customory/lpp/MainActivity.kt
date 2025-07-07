package com.customory.lpp

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.addCallback

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webview)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.setLayerType(WebView.LAYER_TYPE_HARDWARE, null)

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                if (url != null) {
                    val uri = Uri.parse(url)
                    // Specifically check for Amazon links to ensure they open externally
                    if (uri.host?.contains("amazon.com") == true) {
                        val intent = Intent(Intent.ACTION_VIEW, uri).apply {
                            // This category ensures the intent is handled by a browser
                            addCategory(Intent.CATEGORY_BROWSABLE)
                            // This flag opens the browser in a new task, separate from our app
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK
                        }
                        try {
                           startActivity(intent)
                        } catch (e: android.content.ActivityNotFoundException) {
                            // Handle case where no web browser is installed
                            Toast.makeText(this@MainActivity, "No web browser found to open the link.",  Toast.LENGTH_LONG).show()
                        }
                        return true // We have handled the URL loading
                    }
                }
                // For all other URLs, return false to let the WebView handle it.
                return false
            }
        }
        
        // This Javascript bridge allows the web app to call native file-saving code.
        webView.addJavascriptInterface(WebAppInterface(this), "AndroidBridge")

        // Handle back button presses to navigate web history first
        onBackPressedDispatcher.addCallback(this) {
            if (webView.canGoBack()) {
                webView.goBack()
            } else {
                // If we can't go back in webview, let the dispatcher handle it (which finishes the activity)
                if (isEnabled) {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        }

        // Load the main app URL
        val appUrl = getString(R.string.app_url)
        if (appUrl.contains("REPLACE_WITH_YOUR_LIVE_APP_URL")) {
            val htmlData = """
                <html><body style='font-family: sans-serif; padding: 2rem;'>
                <h1>Configuration Needed</h1>
                <p>Please replace the placeholder URL in <code>android/app/src/main/res/values/strings.xml</code> with your web app's live URL.</p>
                </body></html>
            """
            webView.loadData(htmlData, "text/html", "UTF-8")
        } else {
            webView.loadUrl(appUrl)
        }
    }
}
