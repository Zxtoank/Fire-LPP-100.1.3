
package com.customory.lpp

import android.annotation.SuppressLint
import android.app.Activity
import android.content.ContentValues
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import java.io.File
import java.io.IOException

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var uploadMessage: ValueCallback<Array<Uri>>? = null

    // Store download details while asking for permission
    private var pendingFile: PendingFile? = null
    data class PendingFile(val base64Data: String, val fileName: String, val mimeType: String)

    companion object {
        private const val FILE_CHOOSER_RESULT_CODE = 1
        private const val STORAGE_PERMISSION_REQUEST_CODE = 2
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webview)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.allowFileAccess = true

        webView.addJavascriptInterface(WebAppInterface(this), "AndroidBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                if (url != null && (url.startsWith("http://") || url.startsWith("https://"))) {
                    if (url.contains("amazon.com")) {
                        // Open Amazon links in an external browser
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                        startActivity(intent)
                        return true
                    }
                    view?.loadUrl(url)
                    return false
                }
                return true
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
                    startActivityForResult(intent, FILE_CHOOSER_RESULT_CODE)
                } catch (e: Exception) {
                    uploadMessage = null
                    Toast.makeText(this@MainActivity, "Cannot open file chooser", Toast.LENGTH_LONG).show()
                    return false
                }
                return true
            }
        }

        val appUrl = getString(R.string.app_url)
        webView.loadUrl(appUrl)
    }
    
    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FILE_CHOOSER_RESULT_CODE) {
            if (resultCode == Activity.RESULT_OK) {
                if (data != null) {
                    val result = data.dataString
                    val clipData = data.clipData
                    var results: Array<Uri>? = null
                    if (clipData != null) {
                        results = Array(clipData.itemCount) { i -> clipData.getItemAt(i).uri }
                    } else if (result != null) {
                        results = arrayOf(Uri.parse(result))
                    }
                    uploadMessage?.onReceiveValue(results)
                    uploadMessage = null
                }
            } else {
                uploadMessage?.onReceiveValue(null)
                uploadMessage = null
            }
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    fun handleFileSaveRequest(base64Data: String, fileName: String, mimeType: String) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q && ContextCompat.checkSelfPermission(this, android.Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            // Permission not granted, store the file details and ask for permission.
            pendingFile = PendingFile(base64Data, fileName, mimeType)
            ActivityCompat.requestPermissions(this, arrayOf(android.Manifest.permission.WRITE_EXTERNAL_STORAGE), STORAGE_PERMISSION_REQUEST_CODE)
        } else {
            // Permission already granted or not needed (API 29+), proceed with save.
            saveFileToDownloads(base64Data, fileName, mimeType)
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == STORAGE_PERMISSION_REQUEST_CODE) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // Permission was granted. Save the pending file, if it exists.
                pendingFile?.let {
                    saveFileToDownloads(it.base64Data, it.fileName, it.mimeType)
                    pendingFile = null // Clear after use
                }
            } else {
                // Permission was denied. Inform the user.
                runOnUiThread {
                    Toast.makeText(this, "Storage permission is required to save files.", Toast.LENGTH_LONG).show()
                }
            }
        }
    }
    
    private fun saveFileToDownloads(base64Data: String, fileName: String, mimeType: String) {
        try {
            val resolver = contentResolver
            val contentValues = ContentValues().apply {
                put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                    put(MediaStore.MediaColumns.IS_PENDING, 1) // Set as pending
                } else {
                    @Suppress("DEPRECATION")
                    val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                    if (!downloadsDir.exists()) {
                        downloadsDir.mkdirs()
                    }
                    val file = File(downloadsDir, fileName)
                    put(MediaStore.MediaColumns.DATA, file.absolutePath)
                }
            }

            val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)

            if (uri != null) {
                resolver.openOutputStream(uri).use { outputStream ->
                    if (outputStream == null) throw IOException("Failed to get output stream.")
                    val decodedBytes = Base64.getDecoder().decode(base64Data)
                    outputStream.write(decodedBytes)
                }

                // For Q and above, mark the file as no longer pending so it's visible
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    contentValues.clear()
                    contentValues.put(MediaStore.MediaColumns.IS_PENDING, 0)
                    resolver.update(uri, contentValues, null, null)
                }

                runOnUiThread {
                    Toast.makeText(this, "Download complete: $fileName", Toast.LENGTH_LONG).show()
                }
            } else {
                throw IOException("Failed to create new MediaStore record.")
            }
        } catch (e: Exception) {
            e.printStackTrace()
            runOnUiThread {
                Toast.makeText(this, "Download failed: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }
}

class WebAppInterface(private val mContext: MainActivity) {
    @JavascriptInterface
    fun saveFile(base64Data: String, fileName: String, mimeType: String) {
        // Pass the request to the main activity's UI thread to handle permissions and saving
        mContext.runOnUiThread {
            mContext.handleFileSaveRequest(base64Data, fileName, mimeType)
        }
    }
}
