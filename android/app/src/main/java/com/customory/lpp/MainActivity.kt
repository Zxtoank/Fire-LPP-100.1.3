package com.customory.lpp

import android.annotation.SuppressLint
import android.app.Activity
import android.content.ContentValues
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.webkit.*
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import java.io.File
import java.io.FileOutputStream
import java.io.IOException

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    // This is the new, correct, and safe way to handle Activity results for file selection.
    private val fileChooserLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        var results: Array<Uri>? = null
        if (result.resultCode == Activity.RESULT_OK) {
            val data: Intent? = result.data
            val clipData = data?.clipData
            if (clipData != null) {
                // Handle multiple files safely
                val uriList = mutableListOf<Uri>()
                for (i in 0 until clipData.itemCount) {
                    clipData.getItemAt(i)?.uri?.let { uri ->
                        uriList.add(uri)
                    }
                }
                if (uriList.isNotEmpty()) {
                    results = uriList.toTypedArray()
                }
            } else if (data?.data != null) {
                // Handle single file safely
                results = arrayOf(data.data!!)
            }
        }
        
        // Always call onReceiveValue, even with null, to avoid hanging the WebView.
        filePathCallback?.onReceiveValue(results)
        filePathCallback = null
    }

    // WebAppInterface for handling downloads from the WebView
    inner class WebAppInterface {
        @JavascriptInterface
        fun saveFile(base64Data: String, fileName: String, mimeType: String) {
            runOnUiThread {
                try {
                    val data = Base64.decode(base64Data, Base64.DEFAULT)
                    saveFileToDownloads(data, fileName, mimeType)
                    Toast.makeText(this@MainActivity, "Download started: $fileName", Toast.LENGTH_SHORT).show()
                } catch (e: Exception) {
                    e.printStackTrace()
                    Toast.makeText(this@MainActivity, "Failed to save file: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }
    
    // Saves the file using modern MediaStore for Android Q+ or legacy methods for older versions.
    private fun saveFileToDownloads(data: ByteArray, fileName: String, mimeType: String) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val contentValues = ContentValues().apply {
                put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
            }
            val resolver = contentResolver
            val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
            uri?.let {
                resolver.openOutputStream(it)?.use { outputStream ->
                    outputStream.write(data)
                }
            }
        } else {
            @Suppress("DEPRECATION")
            val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            if (!downloadsDir.exists()) {
                downloadsDir.mkdirs()
            }
            val file = File(downloadsDir, fileName)
            try {
                FileOutputStream(file).use { it.write(data) }
            } catch (e: IOException) {
                e.printStackTrace()
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled", "AddJavascriptInterface")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webview)

        // Check if the URL is configured
        val appUrl = getString(R.string.app_url)
        if (appUrl.contains("REPLACE_WITH_YOUR_LIVE_APP_URL")) {
            Toast.makeText(this, "ERROR: App URL is not configured!", Toast.LENGTH_LONG).show()
            // You might want to display an error message in the WebView as well
            webView.loadData("<html><body><h1>Configuration Error</h1><p>The application URL is not set. Please configure it in the project resources.</p></body></html>", "text/html", "UTF-8")
            return
        }

        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.allowFileAccess = true
        // Register the interface for JavaScript to call
        webView.addJavascriptInterface(WebAppInterface(), "AndroidBridge")

        // Use the modern OnBackPressedDispatcher
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
        })
        
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                if (url.contains("amazon.com")) {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    // This flag ensures the browser opens as a new task
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    startActivity(intent)
                    return true // Indicates we've handled the URL
                }
                return false // Let the WebView handle all other URLs
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback = filePathCallback
                val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "image/*"
                    if (fileChooserParams?.acceptTypes?.contains("image/*") == true) {
                        putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                    }
                }
                try {
                    fileChooserLauncher.launch(intent)
                } catch (e: Exception) {
                    Toast.makeText(this@MainActivity, "Cannot open file chooser", Toast.LENGTH_LONG).show()
                    this@MainActivity.filePathCallback?.onReceiveValue(null) // Reset callback on error
                    this@MainActivity.filePathCallback = null
                    return false
                }
                return true
            }
        }

        webView.loadUrl(appUrl)
    }
}
