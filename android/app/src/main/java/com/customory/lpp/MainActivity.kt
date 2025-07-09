package com.customory.lpp

import android.app.Activity
import android.content.ContentValues
import android.content.Intent
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.webkit.*
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val data: Intent? = result.data
            val uris = data?.dataString?.let { arrayOf(Uri.parse(it)) } ?: result.data?.clipData?.let { clipData ->
                Array(clipData.itemCount) { i -> clipData.getItemAt(i).uri }
            }
            fileUploadCallback?.onReceiveValue(uris)
        } else {
            fileUploadCallback?.onReceiveValue(null)
        }
        fileUploadCallback = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webview)
        setupWebView()
        
        val appUrl = getString(R.string.app_url)
        if (appUrl.contains("REPLACE_WITH_YOUR_LIVE_APP_URL")) {
            // This is a developer convenience. For local development, we load from the local dev server.
             webView.loadUrl("http://10.0.2.2:3000") // 10.0.2.2 is the special IP for localhost from the Android emulator
        } else {
            webView.loadUrl(appUrl)
        }
    }

    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            javaScriptCanOpenWindowsAutomatically = true
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url.toString()
                return if (url.startsWith("https://www.amazon.com")) {
                    // If it's an Amazon link, open it in an external browser
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    startActivity(intent)
                    true // Indicate that we've handled the URL
                } else {
                    // For all other links, let the WebView load them
                    false
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView,
                filePathCallback: ValueCallback<Array<Uri>>,
                fileChooserParams: FileChooserParams
            ): Boolean {
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = filePathCallback
                
                val intent = fileChooserParams.createIntent()
                try {
                    fileChooserLauncher.launch(intent)
                } catch (e: Exception) {
                    fileUploadCallback = null
                    return false
                }
                return true
            }
        }
        
        webView.addJavascriptInterface(WebAppInterface(this), "AndroidBridge")
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}

class WebAppInterface(private val context: Activity) {
    @JavascriptInterface
    fun saveFile(base64Data: String, fileName: String, mimeType: String) {
        try {
            // The data URL format is "data:<mimetype>;base64,<data>"
            // We need to strip the header to get just the Base64 part.
            val pureBase64 = base64Data.substring(base64Data.indexOf(",") + 1)
            val decodedBytes = Base64.decode(pureBase64, Base64.DEFAULT)

            val resolver = context.contentResolver
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // For Android 10 and above, use MediaStore API
                val contentValues = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                    put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                    put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                }

                val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
                if (uri != null) {
                    resolver.openOutputStream(uri).use { outputStream ->
                        if (outputStream == null) throw Exception("Failed to get output stream.")
                        outputStream.write(decodedBytes)
                    }
                    showToast("Download saved to Downloads folder")
                } else {
                    throw Exception("MediaStore insert failed.")
                }
            } else {
                // For older versions, use direct file access
                @Suppress("DEPRECATION")
                val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                if (!downloadsDir.exists()) {
                    downloadsDir.mkdirs()
                }
                val file = java.io.File(downloadsDir, fileName)
                file.outputStream().use { outputStream ->
                    outputStream.write(decodedBytes)
                }
                // Notify the media scanner to make the file visible
                MediaScannerConnection.scanFile(context, arrayOf(file.toString()), null, null)
                showToast("Download saved to Downloads folder")
            }
        } catch (e: Exception) {
            e.printStackTrace()
            showToast("Download failed: ${e.message}")
        }
    }
    
    private fun showToast(message: String) {
        context.runOnUiThread {
            Toast.makeText(context, message, Toast.LENGTH_LONG).show()
        }
    }
}
