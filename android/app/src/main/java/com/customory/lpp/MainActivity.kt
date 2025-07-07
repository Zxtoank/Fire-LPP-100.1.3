package com.customory.lpp

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    // Activity result launcher for the file chooser
    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        var results: Array<Uri>? = null
        if (result.resultCode == Activity.RESULT_OK) {
            val data: Intent? = result.data
            // Check if multiple files were selected
            if (data?.clipData != null) {
                results = Array(data.clipData!!.itemCount) { i ->
                    data.clipData!!.getItemAt(i).uri
                }
            } else if (data?.data != null) {
                // Single file selected
                results = arrayOf(data.data!!)
            }
        }
        filePathCallback?.onReceiveValue(results)
        filePathCallback = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webview)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.allowFileAccess = true // Allow file access for uploads

        // Handle navigation and external links
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url.toString()
                if (url.contains("amazon.com")) {
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        startActivity(intent)
                        return true // Indicates we've handled this URL
                    } catch (e: Exception) {
                        // Handle case where a browser isn't available
                        return false
                    }
                }
                return false // Let the WebView handle all other URLs
            }
        }

        // Handle file uploads
        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView,
                filePathCallback: ValueCallback<Array<Uri>>,
                fileChooserParams: FileChooserParams
            ): Boolean {
                this@MainActivity.filePathCallback = filePathCallback
                val intent = fileChooserParams.createIntent()
                try {
                    fileChooserLauncher.launch(intent)
                } catch (e: Exception) {
                    this@MainActivity.filePathCallback = null
                    return false
                }
                return true
            }
        }
        
        // Handle back button presses
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    // If there's no web history, allow the system to handle the back press
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        // Check if the URL is set. If not, show an error message inside the WebView.
        val appUrl = getString(R.string.app_url)
        if (appUrl.contains("REPLACE_WITH_YOUR_LIVE_APP_URL")) {
            val errorHtml = """
                <html><body style='font-family: sans-serif; text-align: center; padding: 40px; color: #333;'>
                <h2>Configuration Required</h2>
                <p>The application is not yet configured. Please update your website URL in:</p>
                <p style='font-family: monospace; background-color: #f0f0f0; padding: 10px; border-radius: 5px; display: inline-block;'>app/src/main/res/values/strings.xml</p>
                </body></html>
            """.trimIndent()
            webView.loadData(errorHtml, "text/html", "UTF-8")
        } else {
            webView.loadUrl(appUrl)
        }
    }
}
