import { useState } from "react";
//import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
  const [devices, setDevices] = useState<{ name: string; address: string }[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function scanForDevices() {
    setIsScanning(true);
    setError(null);

    try {
      // Call the Tauri command to scan for devices
      const scannedDevices = await invoke<{ name: string; address: string }[]>("scan");
      setDevices(scannedDevices);
    } catch (err) {
      console.error("Error scanning devices:", err);
      setError("Failed to scan devices. Make sure Bluetooth is enabled.");
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <div>
      <h1>Bluetooth Device Scanner</h1>

      <button onClick={scanForDevices} disabled={isScanning}>
        {isScanning ? "Scanning..." : "Scan for Devices"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <h2>Discovered Devices:</h2>
      <ul>
        {devices.length > 0 ? (
          devices.map((device, index) => (
            <li key={index}>
              <strong>{device.name}</strong> ({device.address})
            </li>
          ))
        ) : (
          <p>{isScanning ? "Scanning for devices..." : "No devices found."}</p>
        )}
      </ul>
    </div>
  );
}

export default App;