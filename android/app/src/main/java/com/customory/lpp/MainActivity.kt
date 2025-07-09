package com.customory.lpp

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    // Modern Activity Result API for handling the file chooser result
    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        var results: Array<Uri>? = null
        // Handle the result from the file chooser
        if (result.resultCode == RESULT_OK) {
            result.data?.dataString?.let {
                results = arrayOf(Uri.parse(it))
            }
        }
        filePathCallback?.onReceiveValue(results)
        filePathCallback = null
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webview)
        // Enable necessary WebView settings
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.allowFileAccess = true

        // Set a WebChromeClient to handle file uploads
        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback = filePathCallback
                val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "image/*" // Only allow image selection
                }
                fileChooserLauncher.launch(intent)
                return true
            }
        }

        // Set a WebViewClient to handle URL loading and external links
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                val uri = Uri.parse(url)
                val host = uri.host
                // Check if the link is for an Amazon domain
                if (host != null && (host.endsWith("amazon.com") || host.contains(".amazon."))) {
                    // This is an external link, open it in the default browser
                    val intent = Intent(Intent.ACTION_VIEW, uri)
                    startActivity(intent)
                    return true // We've handled this URL, so the WebView shouldn't load it
                }
                // For all other links, let the WebView handle them
                return false
            }
        }

        // Load the main URL of the web app
        webView.loadUrl(getString(R.string.app_url))
    }

    // Handle the back button press to navigate WebView history
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
