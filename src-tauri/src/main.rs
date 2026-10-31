#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::fs;
use tauri::Manager;

#[tauri::command]
fn open_link(url: String) -> Result<(), String> {
    let parsed = url::Url::parse(&url).map_err(|e| e.to_string())?;
    if !matches!(parsed.scheme(), "http" | "https") { return Err("Unsupported URL".into()); }
    open::that(url).map_err(|e| e.to_string())
}

#[tauri::command]
fn toggle_fullscreen(app: tauri::AppHandle) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("Window unavailable")?;
    let is_fullscreen = window.is_fullscreen().map_err(|e| e.to_string())?;
    window.set_fullscreen(!is_fullscreen).map_err(|e| e.to_string())
}

#[tauri::command]
fn export_dashboard(data: String) -> Result<bool, String> {
    if data.len() > 1_048_576 { return Err("データが大きすぎます。".into()); }
    let file = rfd::FileDialog::new().set_title("ダッシュボードを書き出す").set_file_name("mono-dashboard.json").add_filter("JSON", &["json"]).save_file();
    match file { Some(path) => { fs::write(path, data).map_err(|e| e.to_string())?; Ok(true) }, None => Ok(false) }
}

#[tauri::command]
fn import_dashboard() -> Result<Option<String>, String> {
    let file = rfd::FileDialog::new().set_title("JSON ファイルを読み込む").add_filter("JSON", &["json"]).pick_file();
    match file { Some(path) => { if fs::metadata(&path).map_err(|e| e.to_string())?.len() > 1_048_576 { return Err("ファイルが大きすぎます。".into()); } fs::read_to_string(path).map(Some).map_err(|e| e.to_string()) }, None => Ok(None) }
}

fn main() {
    tauri::Builder::default().invoke_handler(tauri::generate_handler![export_dashboard, import_dashboard, open_link, toggle_fullscreen]).run(tauri::generate_context!()).expect("failed to start MONO");
}
