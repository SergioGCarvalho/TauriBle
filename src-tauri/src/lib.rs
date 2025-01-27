// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use btleplug::api::{Central, CentralEvent, Manager as _, Peripheral, ScanFilter};
use btleplug::platform::{Adapter, Manager};
use futures::stream::StreamExt;
use serde::Serialize;
use std::thread::sleep;
use std::time::Duration;

#[derive(Serialize)]
struct Device {
    name: String,
    address: String,
}

// Existing greet command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// New scan_devices command
#[tauri::command]
async fn scan_devices() -> Result<Vec<Device>, String> {
    let manager = Manager::new().await.map_err(|e| e.to_string())?;

    // Get the first Bluetooth adapter
    let adapters = manager.adapters().await.map_err(|e| e.to_string())?;
    let central = adapters
        .into_iter()
        .nth(0)
        .ok_or("No Bluetooth adapters found")?;

    // Start scanning for devices
    central
        .start_scan(ScanFilter::default())
        .await
        .map_err(|e| e.to_string())?;
    sleep(Duration::from_secs(10)); // Wait for 10 seconds to gather devices

    // Gather the scanned devices
    let peripherals = central.peripherals().await.map_err(|e| e.to_string())?;
    let mut devices = Vec::new();

    for peripheral in peripherals {
        if let Ok(Some(properties)) = peripheral.properties().await {
            let name = properties.local_name.unwrap_or("Unknown".to_string());
            let address = properties.address.to_string();
            devices.push(Device { name, address });
        }
    }

    Ok(devices)
}

async fn get_central(manager: &Manager) -> Adapter {
    let adapters = manager.adapters().await.unwrap();
    adapters.into_iter().nth(0).unwrap()
}

#[tauri::command]
async fn scan() -> Result<Vec<Device>, String> {
    let manager = Manager::new().await.map_err(|e| e.to_string())?;

    // Get the first Bluetooth adapter
    let adapters = manager.adapters().await.map_err(|e| e.to_string())?;
    let central = adapters
        .into_iter()
        .nth(0)
        .ok_or("No Bluetooth adapters found")?;

    // Start scanning for devices
    central
        .start_scan(ScanFilter::default())
        .await
        .map_err(|e| e.to_string())?;

    // Set up to listen for device discovery events
    let mut events = central.events().await.map_err(|e| e.to_string())?;

    let mut devices = Vec::new();

    // Listen for events and gather discovered devices
    while let Some(event) = events.next().await {
        match event {
            CentralEvent::DeviceDiscovered(id) => {
                let peripheral = central.peripheral(&id).await.map_err(|e| e.to_string())?;
                let properties = peripheral.properties().await.map_err(|e| e.to_string())?;

                if let Some(props) = properties {
                    let name = props.local_name.unwrap_or_else(|| "Unknown".to_string());
                    let address = props.address.to_string();

                    // Add the discovered device to the list
                    devices.push(Device { name, address });
                }
            }
            _ => {}
        }
    }

    // Return the list of devices
    Ok(devices)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_macos_permissions::init())
        .invoke_handler(tauri::generate_handler![greet, scan_devices, scan])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
