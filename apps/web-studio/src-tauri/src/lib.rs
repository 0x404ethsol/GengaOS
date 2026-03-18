use tauri_plugin_shell::ShellExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Setup the Python sidecar automatically upon launch
            match app.shell().sidecar("sidecar") {
                Ok(sidecar) => {
                    let (_, _) = sidecar.spawn().expect("Failed to spawn FastAPI sidecar");
                    println!("Successfully launched Python sidecar.");
                }
                Err(e) => {
                    eprintln!("Failed to find sidecar binary: {}", e);
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
