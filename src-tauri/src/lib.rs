use std::io::{Read, Write};
use std::net::TcpListener;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{webview::WebviewWindowBuilder, Manager, WebviewUrl};
use tauri_plugin_opener::OpenerExt;

struct OAuthState {
    listener: Mutex<Option<TcpListener>>,
}

struct DataDirState {
    path: Mutex<PathBuf>,
}

#[tauri::command]
fn start_oauth_listener(state: tauri::State<'_, OAuthState>) -> Result<u16, String> {
    let listener =
        TcpListener::bind("127.0.0.1:0").map_err(|e| format!("Failed to bind: {}", e))?;
    let port = listener
        .local_addr()
        .map_err(|e| format!("Failed to get addr: {}", e))?
        .port();
    let mut guard = state
        .listener
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;
    *guard = Some(listener);
    Ok(port)
}

#[tauri::command]
fn await_oauth_callback(state: tauri::State<'_, OAuthState>) -> Result<String, String> {
    let listener = {
        let mut guard = state
            .listener
            .lock()
            .map_err(|e| format!("Lock error: {}", e))?;
        guard.take().ok_or("No listener available")?
    };

    listener
        .set_nonblocking(false)
        .map_err(|e| format!("Failed to set blocking: {}", e))?;

    let (mut stream, _) = listener
        .accept()
        .map_err(|e| format!("Failed to accept: {}", e))?;

    let mut buf = [0u8; 4096];
    let n = stream
        .read(&mut buf)
        .map_err(|e| format!("Failed to read: {}", e))?;
    let request = String::from_utf8_lossy(&buf[..n]);

    // Parse the code from GET /?code=...&scope=...
    let code = request
        .lines()
        .next()
        .and_then(|line| line.split_whitespace().nth(1))
        .and_then(|path| {
            path.split('?').nth(1).and_then(|query| {
                query.split('&').find_map(|param| {
                    let mut parts = param.splitn(2, '=');
                    match (parts.next(), parts.next()) {
                        (Some("code"), Some(val)) => Some(val.to_string()),
                        _ => None,
                    }
                })
            })
        })
        .ok_or_else(|| "No code parameter found in callback".to_string())?;

    let response_body = r#"<!DOCTYPE html>
<html><head><title>Authentication Complete</title>
<style>body{font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#1a1b1e;color:#c1c2c5}
.card{text-align:center;padding:2rem;border-radius:8px;background:#25262b}h1{color:#fff;margin-bottom:0.5rem}
</style></head>
<body><div class="card"><h1>Authentication Complete</h1><p>You can close this tab and return to Tally.</p></div></body></html>"#;

    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        response_body.len(),
        response_body
    );

    stream
        .write_all(response.as_bytes())
        .map_err(|e| format!("Failed to write response: {}", e))?;
    stream
        .flush()
        .map_err(|e| format!("Failed to flush: {}", e))?;

    Ok(code)
}

#[tauri::command]
fn get_data_directory(state: tauri::State<'_, DataDirState>) -> Result<String, String> {
    state
        .path
        .lock()
        .map(|guard| guard.to_string_lossy().to_string())
        .map_err(|e| format!("Lock error: {}", e))
}

#[tauri::command]
async fn open_data_directory(
    app: tauri::AppHandle,
    state: tauri::State<'_, DataDirState>,
) -> Result<(), String> {
    let path = state
        .path
        .lock()
        .map(|guard| guard.clone())
        .map_err(|e| format!("Lock error: {}", e))?;

    if !path.exists() {
        std::fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    app.opener()
        .open_path(path.to_string_lossy().to_string(), None::<String>)
        .map_err(|e| format!("Failed to open directory: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(OAuthState {
            listener: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            start_oauth_listener,
            await_oauth_callback,
            get_data_directory,
            open_data_directory
        ])
        .setup(|app| {
            let use_data_dir_near_exe = std::env::var("TALLY_DATA_DIR_NEAR_EXE")
                .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
                .unwrap_or(false);

            let data_dir = if use_data_dir_near_exe {
                let exe_dir = std::env::current_exe()
                    .ok()
                    .and_then(|p| p.parent().map(|p| p.to_path_buf()))
                    .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());
                exe_dir.join("data")
            } else {
                app.path().app_local_data_dir().unwrap_or_default()
            };

            if !data_dir.exists() {
                std::fs::create_dir_all(&data_dir).ok();
            }

            let webview_data_dir = data_dir.join("webview");
            if !webview_data_dir.exists() {
                std::fs::create_dir_all(&webview_data_dir).ok();
            }

            app.manage(DataDirState {
                path: Mutex::new(data_dir),
            });

            WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                .title("Tally")
                .inner_size(1280.0, 1024.0)
                .min_inner_size(800.0, 600.0)
                .resizable(true)
                .center()
                .data_directory(webview_data_dir)
                .build()?;

            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .build(),
            )?;

            Ok(())
        })
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_cors_fetch::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
