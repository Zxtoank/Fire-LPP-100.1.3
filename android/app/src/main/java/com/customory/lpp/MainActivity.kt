package com.customory.lpp

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.ContentValues
import android.content.Intent
import android.content.pm.PackageManager
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
import androidx.core.content.ContextCompat
import java.io.File
import java.io.FileOutputStream
import java.io.IOException

// Standalone class for the JavaScript Interface for improved stability
class WebAppInterface(private val activity: MainActivity) {
    @JavascriptInterface
    fun saveFile(base64Data: String, fileName: String, mimeType: String) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // For Android 10 (API 29) and above, use MediaStore
            saveFileWithMediaStore(base64Data, fileName, mimeType)
        } else {
            // For older versions, check for permission and save to external storage
            if (ContextCompat.checkSelfPermission(activity, Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED) {
                saveFileLegacy(base64Data, fileName)
            } else {
                // Request permission. The user will have to tap download again.
                activity.requestStoragePermission()
            }
        }
    }

    private fun saveFileWithMediaStore(base64Data: String, fileName: String, mimeType: String) {
        val resolver = activity.contentResolver
        val contentValues = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
            put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
            put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
        }

        val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
        uri?.let {
            try {
                resolver.openOutputStream(it).use { outputStream ->
                    val decodedBytes = Base64.decode(base64Data, Base64.DEFAULT)
                    outputStream?.write(decodedBytes)
                }
                activity.runOnUiThread { Toast.makeText(activity, "File saved to Downloads", Toast.LENGTH_SHORT).show() }
            } catch (e: IOException) {
                e.printStackTrace()
                activity.runOnUiThread { Toast.makeText(activity, "Failed to save file", Toast.LENGTH_SHORT).show() }
            }
        }
    }

    private fun saveFileLegacy(base64Data: String, fileName: String) {
        val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
        if (!downloadsDir.exists()) {
            downloadsDir.mkdirs()
        }
        val file = File(downloadsDir, fileName)

        try {
            FileOutputStream(file).use { outputStream ->
                val decodedBytes = Base64.decode(base64Data, Base64.DEFAULT)
                outputStream.write(decodedBytes)
            }
            // Make the file visible in the gallery/downloads
            MediaScannerConnection.scanFile(activity, arrayOf(file.toString()), null, null)
            activity.runOnUiThread { Toast.makeText(activity, "File saved to Downloads", Toast.LENGTH_SHORT).show() }
        } catch (e: IOException) {
            e.printStackTrace()
            activity.runOnUiThread { Toast.makeText(activity, "Failed to save file", Toast.LENGTH_SHORT).show() }
        }
    }
}


class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private var uploadMessage: ValueCallback<Array<Uri>>? = null

    // Launcher for getting storage permission
    private val requestPermissionLauncher = registerForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted: Boolean ->
        if (isGranted) {
            Toast.makeText(this, "Permission granted. Please try saving again.", Toast.LENGTH_LONG).show()
        } else {
            Toast.makeText(this, "Permission denied. Cannot save file.", Toast.LENGTH_LONG).show()
        }
    }

    // Public method to be called from WebAppInterface
    fun requestStoragePermission() {
        requestPermissionLauncher.launch(Manifest.permission.WRITE_EXTERNAL_STORAGE)
    }

    private val fileChooserLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        var results: Array<Uri>? = null
        if (result.resultCode == Activity.RESULT_OK) {
            result.data?.dataString?.let {
                results = arrayOf(Uri.parse(it))
            }
        }
        uploadMessage?.onReceiveValue(results)
        uploadMessage = null
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webview)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.addJavascriptInterface(WebAppInterface(this), "AndroidBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                return false
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView,
                filePathCallback: ValueCallback<Array<Uri>>,
                fileChooserParams: FileChooserParams
            ): Boolean {
                uploadMessage?.onReceiveValue(null)
                uploadMessage = filePathCallback

                val intent = fileChooserParams.createIntent()
                try {
                    fileChooserLauncher.launch(intent)
                } catch (e: ActivityNotFoundException) {
                    uploadMessage = null
                    Toast.makeText(this@MainActivity, "Cannot open file chooser", Toast.LENGTH_LONG).show()
                    return false
                }
                return true
            }

            override fun onPermissionRequest(request: PermissionRequest) {
                 request.deny()
            }
        }

        val appUrl = getString(R.string.app_url)
        if (appUrl.contains("REPLACE_WITH_YOUR_LIVE_APP_URL")) {
           webView.loadUrl("file:///android_asset/config_warning.html")
        } else {
            webView.loadUrl(appUrl)
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
