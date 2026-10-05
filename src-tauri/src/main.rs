// Prevents an extra console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// NEVER change `identifier` ("dev.12cb.rmgr-viewer") in tauri.conf.json: the webview's
// IndexedDB/localStorage (the stats cache and prefs) are stored under it, so changing it orphans
// that data. Likewise keep `bundle.windows.wix.upgradeCode` fixed so MSI in-place upgrades keep
// working even if `productName` changes. (tauri.conf.json is plain JSON, so the note lives here.)
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_persisted_scope::init())
        .run(tauri::generate_context!())
        .expect("error while running the RMGR Viewer");
}
