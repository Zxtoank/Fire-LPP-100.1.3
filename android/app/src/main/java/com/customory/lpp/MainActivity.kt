
package com.customory.lpp

import android.app.Activity
import android.app.SearchManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast

class MainActivity : Activity() {

    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webview)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
        }

        webView.webViewClient = MyWebViewClient()
        webView.addJavascriptInterface(WebAppInterface(this), "AndroidBridge")

        val appUrl = getString(R.string.app_url)

        if (appUrl.contains("REPLACE_WITH_YOUR_LIVE_APP_URL")) {
            Toast.makeText(this, "Configuration needed: app_url in strings.xml is not set.", Toast.LENGTH_LONG).show()
            webView.loadData("<html><body><h1>Configuration Needed</h1><p>Please set your application's live URL in the strings.xml file.</p></body></html>", "text/html", "UTF-8")
        } else {
            webView.loadUrl(appUrl)
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    private class MyWebViewClient : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            val url = request.url.toString()

            if (url.contains("amazon.com")) {
                try {
                    // This intent forces the link to be treated as a web search,
                    // which ensures it opens in a browser instead of the Amazon app.
                    val intent = Intent(Intent.ACTION_WEB_SEARCH).apply {
                        putExtra(SearchManager.QUERY, url)
                    }
                    view.context.startActivity(intent)
                    return true
                } catch (e: Exception) {
                    // Fallback just in case
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                        view.context.startActivity(intent)
                        return true
                    } catch (ignored: Exception) {}
                }
            }
            // Let the WebView handle all other URLs.
            return false
        }
    }

    class WebAppInterface(private val context: Context) {
        @JavascriptInterface
        fun saveFile(base64Data: String, fileName: String, mimeType: String) {
            val resolver = context.contentResolver
            val contentValues = ContentValues().apply {
                put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
            }

            val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)

            uri?.let {
                try {
                    resolver.openOutputStream(it)?.use { outputStream ->
                        val data = Base64.decode(base64Data, Base64.DEFAULT)
                        outputStream.write(data)
                        Handler(Looper.getMainLooper()).post {
                            Toast.makeText(context, "Saved to Downloads: $fileName", Toast.LENGTH_LONG).show()
                        }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                    Handler(Looper.getMainLooper()).post {
                        Toast.makeText(context, "Error saving file.", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }
    }
}
