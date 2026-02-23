use tauri::{webview::WebviewWindowBuilder, WebviewUrl};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let exe_dir = std::env::current_exe()
                .ok()
                .and_then(|p| p.parent().map(|p| p.to_path_buf()))
                .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());

            let data_dir = exe_dir.join("data");
            if !data_dir.exists() {
                std::fs::create_dir_all(&data_dir).ok();
            }

            let webview_data_dir = data_dir.join("webview");
            if !webview_data_dir.exists() {
                std::fs::create_dir_all(&webview_data_dir).ok();
            }

            WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                .title("Impersonal Finance")
                .inner_size(1280.0, 800.0)
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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
