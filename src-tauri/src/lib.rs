use std::collections::HashMap;
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, WindowEvent,
};

#[tauri::command]
async fn store_credentials(
    app: AppHandle,
    url: String,
    api_key: String,
) -> Result<(), String> {
    let store = app.store("credentials.json").map_err(|e| e.to_string())?;
    store
        .set("gateway_url", url)
        .map_err(|e| e.to_string())?;
    store
        .set("api_key", api_key)
        .map_err(|e| e.to_string())?;
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn load_credentials(app: AppHandle) -> Result<Option<HashMap<String, String>>, String> {
    let store = app.store("credentials.json").map_err(|e| e.to_string())?;
    let url: Option<String> = store.get("gateway_url").map_err(|e| e.to_string())?;
    let key: Option<String> = store.get("api_key").map_err(|e| e.to_string())?;
    match (url, key) {
        (Some(url), Some(key)) => Ok(Some(HashMap::from([
            ("gateway_url".into(), url),
            ("api_key".into(), key),
        ]))),
        _ => Ok(None),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            // Build tray menu
            let show = MenuItem::with_id(app, "show", "Show Hermes", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            // Load tray icon
            if let Ok(icon) = Image::from_bytes(include_bytes!("../icons/icon.png")) {
                TrayIconBuilder::new()
                    .icon(icon)
                    .tooltip("Hermes Desktop")
                    .menu(&menu)
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    })
                    .build(app)?;
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { .. } = event {
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![store_credentials, load_credentials,])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
