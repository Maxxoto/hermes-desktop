use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize, Position, Size};

/// Snap the main window to a screen position.
///
/// Supported positions: "left", "right", "top", "bottom",
/// "top-left", "top-right", "bottom-left", "bottom-right",
/// "center", "maximize".
#[tauri::command]
pub fn snap_window(app: AppHandle, position: String) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("Window not found")?;
    let monitor = window
        .primary_monitor()
        .map_err(|e| e.to_string())?
        .ok_or("No monitor")?;
    let size = monitor.size();
    let pos = monitor.position();

    let (x, y, w, h) = match position.as_str() {
        "left" => (pos.x, pos.y, size.width / 2, size.height),
        "right" => (
            pos.x + size.width as i32 / 2,
            pos.y,
            size.width / 2,
            size.height,
        ),
        "top" => (pos.x, pos.y, size.width, size.height / 2),
        "bottom" => (
            pos.x,
            pos.y + size.height as i32 / 2,
            size.width,
            size.height / 2,
        ),
        "top-left" => (pos.x, pos.y, size.width / 2, size.height / 2),
        "top-right" => (
            pos.x + size.width as i32 / 2,
            pos.y,
            size.width / 2,
            size.height / 2,
        ),
        "bottom-left" => (
            pos.x,
            pos.y + size.height as i32 / 2,
            size.width / 2,
            size.height / 2,
        ),
        "bottom-right" => (
            pos.x + size.width as i32 / 2,
            pos.y + size.height as i32 / 2,
            size.width / 2,
            size.height / 2,
        ),
        "center" => {
            let ww = size.width / 2;
            let wh = size.height / 2;
            (
                pos.x + (size.width as i32 - ww as i32) / 2,
                pos.y + (size.height as i32 - wh as i32) / 2,
                ww,
                wh,
            )
        }
        "maximize" => (pos.x, pos.y, size.width, size.height),
        _ => return Err(format!("Unknown position: {position}")),
    };

    window
        .set_position(Position::Physical(PhysicalPosition { x, y }))
        .map_err(|e| e.to_string())?;
    window
        .set_size(Size::Physical(PhysicalSize {
            width: w,
            height: h,
        }))
        .map_err(|e| e.to_string())?;

    Ok(())
}
