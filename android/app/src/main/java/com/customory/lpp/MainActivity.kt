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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import java.io.File
import java.io.FileOutputStream

class MainActivity : ComponentActivity() {

    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    // This launcher handles the result from the file chooser intent.
    private val fileChooserLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == Activity.RESULT_OK && result.data != null) {
            filePathCallback?.onReceiveValue(arrayOf(result.data!!.data!!))
        } else {
            filePathCallback?.onReceiveValue(null)
        }
        filePathCallback = null
    }

    // This class provides a bridge for JavaScript running in the WebView to call native Android code.
    inner class JavaScriptBridge(private val context: Context) {
        @JavascriptInterface
        fun saveFile(base64Data: String, fileName: String, mimeType: String) {
            try {
                val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                if (!downloadsDir.exists()) downloadsDir.mkdirs()

                val file = File(downloadsDir, fileName)
                val data = Base64.decode(base64Data, Base64.DEFAULT)
                FileOutputStream(file).use { it.write(data) }

                // Notify the system that a new file is available for indexing.
                MediaScannerConnection.scanFile(context, arrayOf(file.absolutePath), arrayOf(mimeType), null)

                runOnUiThread {
                    Toast.makeText(context, "Download complete: $fileName", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Log.e("WebViewDownload", "Error saving file: ${e.message}", e)
                runOnUiThread {
                    Toast.makeText(context, "Download failed.", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    // ** IMPORTANT **
                    // Replace this with your actual live Netlify URL once deployed.
                    val liveUrl = "https://your-app-name.netlify.app"

                    WebPageViewer(
                        url = liveUrl,
                        onShowFileChooser = { filePath, fileChooserIntent ->
                            filePathCallback = filePath
                            fileChooserLauncher.launch(fileChooserIntent)
                        },
                        bridge = JavaScriptBridge(this)
                    )
                }
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
                // Keep navigation inside the WebView
                webViewClient = WebViewClient()

                // Set a custom download listener to pass downloads to the JavaScript bridge.
                setDownloadListener { _, _, _, _, _ ->
                     // Intercepts the download and expects the JS bridge to handle it.
                }

                // Handle file uploads from the WebView.
                webChromeClient = object : WebChromeClient() {
                    override fun onShowFileChooser(
                        webView: WebView,
                        filePathCallback: ValueCallback<Array<Uri>>,
                        fileChooserParams: FileChooserParams
                    ): Boolean {
                        val intent = fileChooserParams.createIntent()
                        onShowFileChooser(filePathCallback, intent)
                        return true
                    }
                }

                addJavascriptInterface(bridge, "AndroidBridge")

                settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = true
                    allowFileAccess = true
                }

                loadUrl(url)
            }
        },
        modifier = Modifier.fillMaxSize()
    )
}
