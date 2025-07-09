package com.customory.lpp

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
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
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import java.io.File
import java.io.FileOutputStream

class MainActivity : AppCompatActivity() {

    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private val FILE_CHOOSER_RESULT_CODE = 1
    private var pendingFileData: PendingFile? = null

    private data class PendingFile(val base64Data: String, val fileName: String, val mimeType: String)

    companion object {
        private const val STORAGE_PERMISSION_CODE = 101
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val webView: WebView = findViewById(R.id.webview)
        with(webView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        }

        webView.addJavascriptInterface(WebAppInterface(this), "AndroidBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                if (request != null && request.isForMainFrame) {
                    val appUrl = getString(R.string.app_url)
                    if (appUrl.contains("REPLACE_WITH_YOUR_LIVE_APP_URL")) {
                         val htmlData = """
                            <html>
                                <body style='font-family: sans-serif; text-align: center; padding: 2rem; color: #333;'>
                                    <h1>Configuration Needed</h1>
                                    <p>The application's URL is not set.</p>
                                    <p style='padding: 0 1rem;'>Please replace <code>REPLACE_WITH_YOUR_LIVE_APP_URL</code> in <code>android/app/src/main/res/values/strings.xml</code> with your website's live URL.</p>
                                </body>
                            </html>
                        """.trimIndent()
                        view?.loadData(htmlData, "text/html", "UTF-8")
                    } else {
                        super.onReceivedError(view, request, error)
                    }
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback = filePathCallback
                val intent = fileChooserParams?.createIntent()
                try {
                    startActivityForResult(intent, FILE_CHOOSER_RESULT_CODE)
                } catch (e: Exception) {
                    this@MainActivity.filePathCallback = null
                    return false
                }
                return true
            }
        }
        val appUrl = getString(R.string.app_url)
        webView.loadUrl(appUrl)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FILE_CHOOSER_RESULT_CODE) {
            val results = if (resultCode == Activity.RESULT_OK) {
                WebChromeClient.FileChooserParams.parseResult(resultCode, data)
            } else {
                null
            }
            filePathCallback?.onReceiveValue(results)
            filePathCallback = null
        }
    }

    override fun onBackPressed() {
        val webView: WebView = findViewById(R.id.webview)
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    private fun checkAndRequestStoragePermission(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            return true // No permission needed for MediaStore
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED) {
            return true
        }
        ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.WRITE_EXTERNAL_STORAGE), STORAGE_PERMISSION_CODE)
        return false
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == STORAGE_PERMISSION_CODE) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                pendingFileData?.let {
                    saveFileToDevice(it.base64Data, it.fileName, it.mimeType)
                    pendingFileData = null
                }
            } else {
                Toast.makeText(this, "Storage permission denied. Cannot save file.", Toast.LENGTH_LONG).show()
                pendingFileData = null
            }
        }
    }

    private fun saveFileToDevice(base64Data: String, fileName: String, mimeType: String) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val resolver = contentResolver
                val contentValues = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                    put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                    put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                }
                val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
                uri?.let {
                    resolver.openOutputStream(it).use { outputStream ->
                        val decodedBytes = Base64.decode(base64Data, Base64.DEFAULT)
                        outputStream?.write(decodedBytes)
                    }
                }
            } else {
                @Suppress("DEPRECATION")
                val downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                if (!downloadDir.exists()) {
                    downloadDir.mkdirs()
                }
                val file = File(downloadDir, fileName)
                FileOutputStream(file).use { outputStream ->
                    val decodedBytes = Base64.decode(base64Data, Base64.DEFAULT)
                    outputStream.write(decodedBytes)
                }
                MediaScannerConnection.scanFile(this, arrayOf(file.toString()), null, null)
            }
            runOnUiThread {
                Toast.makeText(this, "Download complete: $fileName", Toast.LENGTH_LONG).show()
            }
        } catch (e: Exception) {
            e.printStackTrace()
            runOnUiThread {
                Toast.makeText(this, "Download failed: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    inner class WebAppInterface(private val activity: Activity) {
        @JavascriptInterface
        fun saveFile(base64Data: String, fileName: String, mimeType: String) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                if (checkAndRequestStoragePermission()) {
                    saveFileToDevice(base64Data, fileName, mimeType)
                } else {
                    // Request is pending, store data to process after permission result
                    pendingFileData = PendingFile(base64Data, fileName, mimeType)
                }
            } else {
                 saveFileToDevice(base64Data, fileName, mimeType)
            }
        }
    }
}
