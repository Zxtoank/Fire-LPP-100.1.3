package com.customory.lpp

import android.annotation.SuppressLint
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.ContentValues
import android.content.Context
import android.content.Intent
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
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import java.io.File
import java.io.FileOutputStream
import java.io.IOException

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private val FILE_CHOOSER_RESULT_CODE = 1

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webview)
        val webUrl = getString(R.string.app_url)

        if (webUrl.contains("REPLACE_WITH_YOUR_LIVE_APP_URL")) {
            Toast.makeText(this, "ERROR: Please set your website URL in strings.xml", Toast.LENGTH_LONG).show()
            return
        }

        setupWebView()
        webView.loadUrl(webUrl)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
        })
    }

    @SuppressLint("SetJavaScriptEnabled", "JavascriptInterface")
    private fun setupWebView() {
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.allowFileAccess = true
        webView.settings.allowContentAccess = true
        webView.settings.databaseEnabled = true
        webView.settings.setSupportMultipleWindows(false)
        webView.settings.javaScriptCanOpenWindowsAutomatically = false
        webView.settings.setHardwareAccelerationEnabled(true)
        
        webView.addJavascriptInterface(WebAppInterface(this), "AndroidBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean {
                val uri = Uri.parse(url)
                if (uri.host != null && (uri.host!!.endsWith("amazon.com") || uri.host!!.endsWith("amzn.to"))) {
                     try {
                        val intent = Intent(Intent.ACTION_VIEW, uri)
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        startActivity(intent)
                        return true
                    } catch (e: ActivityNotFoundException) {
                        return false
                    }
                }
                return false
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = filePathCallback

                val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "image/*"
                }

                try {
                    startActivityForResult(intent, FILE_CHOOSER_RESULT_CODE)
                } catch (e: ActivityNotFoundException) {
                    fileUploadCallback = null
                    Toast.makeText(this@MainActivity, "Cannot open file chooser", Toast.LENGTH_LONG).show()
                    return false
                }
                return true
            }
        }
    }
    
    @Deprecated("This method has been deprecated in favor of using the Activity Result API")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == FILE_CHOOSER_RESULT_CODE) {
            if (fileUploadCallback == null) {
                super.onActivityResult(requestCode, resultCode, data)
                return
            }

            val results: Array<Uri>? = if (resultCode == Activity.RESULT_OK) {
                data?.dataString?.let { arrayOf(Uri.parse(it)) }
            } else {
                null
            }

            fileUploadCallback?.onReceiveValue(results)
            fileUploadCallback = null
        } else {
            super.onActivityResult(requestCode, resultCode, data)
        }
    }

    private class WebAppInterface(private val context: Context) {
        @JavascriptInterface
        fun saveFile(base64Data: String, fileName: String, mimeType: String) {
            try {
                val fileData = Base64.decode(base64Data, Base64.DEFAULT)

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    val resolver = context.contentResolver
                    val contentValues = ContentValues().apply {
                        put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                        put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                        put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                    }
                    val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
                    uri?.let {
                        resolver.openOutputStream(it).use { outputStream ->
                            outputStream?.write(fileData)
                        }
                        showToast("File saved to Downloads folder.")
                    } ?: throw IOException("Failed to create new MediaStore record.")
                } else {
                    @Suppress("DEPRECATION")
                    val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                    if (!downloadsDir.exists()) {
                        downloadsDir.mkdirs()
                    }
                    val file = File(downloadsDir, fileName)
                    FileOutputStream(file).use {
                        it.write(fileData)
                    }
                    showToast("File saved to Downloads folder.")
                }
            } catch (e: Exception) {
                e.printStackTrace()
                showToast("Error saving file: ${e.message}")
            }
        }

        private fun showToast(message: String) {
            (context as? Activity)?.runOnUiThread {
                Toast.makeText(context, message, Toast.LENGTH_LONG).show()
            }
        }
    }
}
