
package com.customory.lpp

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.util.Base64
import android.util.Log
import android.webkit.*
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import com.customory.lpp.ui.theme.LppTheme
import java.io.File
import java.io.FileOutputStream

class MainActivity : ComponentActivity() {

    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    private val fileChooserLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == Activity.RESULT_OK && result.data != null) {
            val data = result.data?.data
            data?.let {
                filePathCallback?.onReceiveValue(arrayOf(it))
            } ?: filePathCallback?.onReceiveValue(null)
        } else {
            filePathCallback?.onReceiveValue(null)
        }
        filePathCallback = null
    }

    // JavaScriptBridge class added inside MainActivity
    inner class JavaScriptBridge(private val context: Context) {

        @JavascriptInterface
        fun saveFile(base64Data: String, fileName: String, mimeType: String) {
            try {
                val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                if (!downloadsDir.exists()) {
                    downloadsDir.mkdirs()
                }

                val file = File(downloadsDir, fileName)
                val data = Base64.decode(base64Data, Base64.DEFAULT)
                val fos = FileOutputStream(file)
                fos.write(data)
                fos.flush()
                fos.close()

                MediaScannerConnection.scanFile(context, arrayOf(file.absolutePath), null, null)

                runOnUiThread {
                    Toast.makeText(context, "Download complete: $fileName", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Log.e("WebViewDownload", "Error saving file: ${e.message}")
                runOnUiThread {
                    Toast.makeText(context, "Download failed.", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            LppTheme {
                WebPageViewer(
                    url = "https://locket.customory.com/",
                    onShowFileChooser = { filePath, fileChooserIntent ->
                        filePathCallback = filePath
                        fileChooserLauncher.launch(fileChooserIntent)
                    },
                    bridge = JavaScriptBridge(this) // Pass the bridge instance
                )
            }
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun WebPageViewer(
    url: String,
    onShowFileChooser: (ValueCallback<Array<Uri>>, Intent) -> Unit,
    bridge: Any
) {
    AndroidView(
        factory = { context ->
            WebView(context).apply {
                // Keep all navigation inside the WebView. This is simpler now
                // that we don't need a browser redirect for Google Sign-In.
                webViewClient = WebViewClient()

                // Set Download Listener to prevent default browser download
                setDownloadListener { downloadUrl, _, _, _, _ ->
                    Log.d("WebViewDownload", "Download intercepted for URL: $downloadUrl. Handled by bridge.")
                }

                // Handle file uploads
                webChromeClient = object : WebChromeClient() {
                    override fun onShowFileChooser(
                        webView: WebView?,
                        filePathCallback: ValueCallback<Array<Uri>>,
                        fileChooserParams: FileChooserParams
                    ): Boolean {
                        return try {
                            val intent = fileChooserParams.createIntent()
                            onShowFileChooser(filePathCallback, intent)
                            true
                        } catch (e: Exception) {
                            Log.e("FileChooser", "File chooser failed", e)
                            filePathCallback.onReceiveValue(null)
                            false
                        }
                    }
                }

                // Enable JavaScript bridge
                addJavascriptInterface(bridge, "AndroidBridge")

                // Enable required settings
                settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = true
                    allowFileAccess = true
                    allowContentAccess = true
                    cacheMode = WebSettings.LOAD_DEFAULT
                }

                loadUrl(url)
            }
        },
        modifier = Modifier.fillMaxSize()
    )
}
