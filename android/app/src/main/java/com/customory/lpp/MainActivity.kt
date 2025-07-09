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

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        var results: Array<Uri>? = null
        // Check if the result is a valid file selection
        if (result.resultCode == Activity.RESULT_OK) {
            val dataString = result.data?.dataString
            if (dataString != null) {
                results = arrayOf(Uri.parse(dataString))
            }
        }
        filePathCallback?.onReceiveValue(results)
        filePathCallback = null
    }

    @SuppressLint("SetJavaScriptEnabled", "AddJavascriptInterface")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webview)
        val webUrl = getString(R.string.app_url)

        if (webUrl.contains("REPLACE_WITH_YOUR_LIVE_APP_URL")) {
             Toast.makeText(this, "ERROR: App URL is not configured!", Toast.LENGTH_LONG).show()
             return // Stop loading if URL is not set
        }

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            setSupportZoom(true)
            builtInZoomControls = false
            displayZoomControls = false
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = true
            javaScriptCanOpenWindowsAutomatically = true
        }

        webView.addJavascriptInterface(WebAppInterface(this), "AndroidBridge")
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                if (url.startsWith("https://www.amazon.com")) {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    startActivity(intent)
                    return true
                }
                return false
            }
        }

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
                    Toast.makeText(this@MainActivity, "Cannot open file chooser", Toast.LENGTH_LONG).show()
                    return false
                }
                return true
            }
        }

        onBackPressedDispatcher.addCallback(this, object: OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
        })

        webView.loadUrl(webUrl)
    }

    inner class WebAppInterface(private val activity: Activity) {
        @JavascriptInterface
        fun saveFile(base64Data: String, fileName: String, mimeType: String) {
            activity.runOnUiThread {
                try {
                    val data = Base64.decode(base64Data, Base64.DEFAULT)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        val contentValues = ContentValues().apply {
                            put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                            put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                            put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                        }
                        val resolver = activity.contentResolver
                        val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
                        uri?.let {
                            resolver.openOutputStream(it).use { outputStream ->
                                outputStream?.write(data)
                            }
                            Toast.makeText(activity, "File saved to Downloads", Toast.LENGTH_SHORT).show()
                        } ?: throw IOException("Failed to create new MediaStore record.")
                    } else {
                        @Suppress("DEPRECATION")
                        val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                        val file = File(downloadsDir, fileName)
                        FileOutputStream(file).use { it.write(data) }
                        Toast.makeText(activity, "File saved to Downloads", Toast.LENGTH_SHORT).show()
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                    Toast.makeText(activity, "Error saving file: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }
}
