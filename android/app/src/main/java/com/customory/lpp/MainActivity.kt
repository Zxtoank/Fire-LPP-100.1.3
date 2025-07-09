
package com.customory.lpp

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.util.Log
import android.webkit.*
import android.widget.Toast
import androidx.activity.addCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import java.io.File
import java.io.FileOutputStream
import java.io.IOException


class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    private val fileChooserLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val results: Array<Uri>? = when {
                result.data?.dataString != null -> arrayOf(Uri.parse(result.data?.dataString))
                result.data?.clipData != null -> {
                    val clipData = result.data!!.clipData!!
                    Array(clipData.itemCount) { i -> clipData.getItemAt(i).uri }
                }
                else -> null
            }
            filePathCallback?.onReceiveValue(results)
        } else {
            filePathCallback?.onReceiveValue(null)
        }
        filePathCallback = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webview)
        val appUrl = getString(R.string.app_url)

        if (appUrl.contains("REPLACE_WITH_YOUR_LIVE_APP_URL")) {
             Toast.makeText(this, "ERROR: Please set your app_url in strings.xml", Toast.LENGTH_LONG).show()
             return
        }

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            setSupportMultipleWindows(true)
            javaScriptCanOpenWindowsAutomatically = true
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url.toString()
                return if (url.contains("amazon.com")) {
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        startActivity(intent)
                    } catch (e: ActivityNotFoundException) {
                        Toast.makeText(this@MainActivity, "No browser found to open link", Toast.LENGTH_SHORT).show()
                    }
                    true // Indicate we've handled the URL
                } else {
                    false // Let the WebView handle the URL
                }
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
                } catch (e: ActivityNotFoundException) {
                    Toast.makeText(this@MainActivity, "Cannot open file chooser", Toast.LENGTH_LONG).show()
                    return false
                }
                return true
            }
        }
        
        webView.addJavascriptInterface(WebAppInterface(this), "AndroidBridge")
        webView.loadUrl(appUrl)

        onBackPressedDispatcher.addCallback(this) {
            if (webView.canGoBack()) {
                webView.goBack()
            } else {
                finish()
            }
        }
    }

    class WebAppInterface(private val context: Context) {
        @JavascriptInterface
        fun saveFile(base64Data: String, fileName: String, mimeType: String) {
            try {
                val fileContents = Base64.decode(base64Data, Base64.DEFAULT)
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    // Modern method for Android 10+
                    val resolver = context.contentResolver
                    val contentValues = ContentValues().apply {
                        put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                        put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                        put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                    }
                    val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
                    uri?.let {
                        resolver.openOutputStream(it).use { outputStream ->
                            outputStream?.write(fileContents)
                        }
                    } ?: throw IOException("Failed to create new MediaStore record.")
                } else {
                    // Legacy method for Android 9 and below
                    @Suppress("DEPRECATION")
                    val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                    val file = File(downloadsDir, fileName)
                    FileOutputStream(file).use {
                        it.write(fileContents)
                    }
                    // Notify the media scanner about the new file so that it is immediately available to the user.
                    MediaScannerConnection.scanFile(context, arrayOf(file.toString()), null, null)
                }

                (context as? Activity)?.runOnUiThread {
                    Toast.makeText(context, "Download complete: $fileName", Toast.LENGTH_LONG).show()
                }

            } catch (e: Exception) {
                Log.e("WebAppInterface", "File save error", e)
                (context as? Activity)?.runOnUiThread {
                    Toast.makeText(context, "Download failed.", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
}
