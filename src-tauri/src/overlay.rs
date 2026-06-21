use tauri::{App, AppHandle, Manager};

/// Register the global shortcut for toggling the overlay window.
/// Uses Ctrl+Shift+Space (Linux) / Cmd+Shift+Space (macOS).
pub fn register_shortcut(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    let app_handle = app.handle().clone();

    // Use the global-shortcut plugin API
    use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

    // Build the shortcut: Cmd+Shift+Space on macOS, Ctrl+Shift+Space elsewhere
    #[cfg(target_os = "macos")]
    let shortcut = Shortcut::new(Some(Modifiers::META | Modifiers::SHIFT), Code::Space);
    #[cfg(not(target_os = "macos"))]
    let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::Space);

    app.global_shortcut()
        .on_shortcut(shortcut, move |_app, _shortcut, event| {
            if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                let _ = toggle_overlay(&app_handle);
            }
        })?;

    Ok(())
}

/// Toggle the overlay window visibility.
pub fn toggle_overlay(app: &AppHandle) -> Result<(), String> {
    let overlay = app
        .get_webview_window("overlay")
        .ok_or("overlay window not found")?;

    if overlay.is_visible().unwrap_or(false) {
        overlay.hide().map_err(|e: tauri::Error| e.to_string())?;
    } else {
        overlay.show().map_err(|e: tauri::Error| e.to_string())?;
        overlay.set_focus().map_err(|e: tauri::Error| e.to_string())?;
    }

    Ok(())
}
