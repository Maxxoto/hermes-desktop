use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, WindowEvent,
};

// Module for overlay window management
mod overlay;

const SERVICE_NAME: &str = "hermes-desktop";
const KEY_URL: &str = "gateway_url";
const KEY_API_KEY: &str = "api_key";

/// Try to read the fallback credentials file (legacy plaintext store).
fn fallback_path(app: &AppHandle) -> PathBuf {
    app.path()
        .app_config_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("credentials.json")
}

/// Attempt to load from the old plaintext fallback file, then migrate to keychain.
fn try_migrate_from_file(app: &AppHandle) -> Option<HashMap<String, String>> {
    let path = fallback_path(app);
    let data = fs::read_to_string(&path).ok()?;
    let json: serde_json::Value = serde_json::from_str(&data).ok()?;
    let url = json.get("gateway_url")?.as_str()?;
    let api_key = json.get("api_key")?.as_str()?;

    // If we got here, we have legacy creds — write them into keychain.
    let _ = keyring::Entry::new(SERVICE_NAME, KEY_URL)
        .and_then(|e| e.set_password(url));
    let _ = keyring::Entry::new(SERVICE_NAME, KEY_API_KEY)
        .and_then(|e| e.set_password(api_key));

    // Remove the plaintext file after successful migration.
    let _ = fs::remove_file(&path);

    Some(HashMap::from([
        ("gateway_url".into(), url.to_string()),
        ("api_key".into(), api_key.to_string()),
    ]))
}

#[tauri::command]
async fn store_credentials(
    app: AppHandle,
    url: String,
    api_key: String,
) -> Result<(), String> {
    // Write both entries into macOS Keychain.
    let url_entry = keyring::Entry::new(SERVICE_NAME, KEY_URL)
        .map_err(|e| format!("keyring entry (url): {e}"))?;
    url_entry
        .set_password(&url)
        .map_err(|e| format!("keyring set_password (url): {e}"))?;

    let key_entry = keyring::Entry::new(SERVICE_NAME, KEY_API_KEY)
        .map_err(|e| format!("keyring entry (api_key): {e}"))?;
    key_entry
        .set_password(&api_key)
        .map_err(|e| format!("keyring set_password (api_key): {e}"))?;

    // Also persist to a local JSON as a fallback for environments without
    // keychain access (CI, sandboxed Linux, etc.).
    let path = fallback_path(&app);
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let json = serde_json::json!({
        "gateway_url": url,
        "api_key": api_key,
    });
    fs::write(&path, serde_json::to_string_pretty(&json).unwrap_or_default())
        .map_err(|e| format!("fallback write: {e}"))?;

    Ok(())
}

#[tauri::command]
async fn load_credentials(app: AppHandle) -> Result<Option<HashMap<String, String>>, String> {
    // 1. Try macOS Keychain first.
    let url_result = keyring::Entry::new(SERVICE_NAME, KEY_URL)
        .ok()
        .and_then(|e| e.get_password().ok());
    let key_result = keyring::Entry::new(SERVICE_NAME, KEY_API_KEY)
        .ok()
        .and_then(|e| e.get_password().ok());

    if let (Some(url), Some(key)) = (url_result, key_result) {
        return Ok(Some(HashMap::from([
            ("gateway_url".into(), url),
            ("api_key".into(), key),
        ])));
    }

    // 2. Fall back to legacy file and migrate.
    if let Some(creds) = try_migrate_from_file(&app) {
        return Ok(Some(creds));
    }

    Ok(None)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            // Register overlay toggle shortcut
            overlay::register_shortcut(app)?;

            // Build tray menu
            let show = MenuItem::with_id(app, "show", "Show Hermes", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            // Load tray icon
            let icon_bytes = include_bytes!("../icons/icon.png");
            if let Ok(icon) = Image::from_bytes(icon_bytes) {
                TrayIconBuilder::new()
                    .icon(icon)
                    .tooltip("Hermes Desktop")
                    .menu(&menu)
                    .on_menu_event(|app: &AppHandle, event| match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _: Result<(), tauri::Error> = window.unminimize();
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
