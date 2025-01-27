import { useEffect, useState } from "react";
//import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import { checkAccessibilityPermissions, requestAccessibilityPermissions } from "tauri-plugin-macos-permissions-api";
import "./App.css";

function App() {
  const [devices, setDevices] = useState<{ name: string; address: string }[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessibilityGranted, setAccessibilityGranted] = useState(false);

  // Check Accessibility permissions on load (example use case)
  useEffect(() => {
    async function checkPermissions() {
      const granted = await checkAccessibilityPermissions();
      setAccessibilityGranted(granted);
    }
    checkPermissions();
  }, []);

  async function scanForDevices() {
    if (!accessibilityGranted) {
      setError("Accessibility permissions are required for this functionality.");
      console.log("Accessibility permissions are required for this functionality.");
      return;
    }

    setIsScanning(true);
    setError(null);
    try {
      // Call the Tauri command to scan for devices
      const scannedDevices = await invoke<{ name: string; address: string }[]>("scan_devices");
      setDevices(scannedDevices);
    } catch (err) {
      console.error("Error scanning devices:", err);
      setError("Failed to scan devices. Make sure Bluetooth is enabled.");
    } finally {
      console.log("Scanning devices complete.");
      setIsScanning(false);
    }
  }

  async function requestPermissions() {
    try {
      await requestAccessibilityPermissions();

      // Check if permissions were granted after the request
      const granted = await checkAccessibilityPermissions();
      setAccessibilityGranted(granted);

      if (!granted) {
        setError("Accessibility permissions are required to scan for devices.");
      } else {
        setError(null);
      }
    } catch (err) {
      console.error("Error requesting permissions:", err);
      setError("Failed to request Accessibility permissions.");
    }
  }

  return (
    <main className="container">
      <h1>Bluetooth Device Scanner</h1>

      {!accessibilityGranted && (
        <button onClick={requestPermissions}>
          Request Accessibility Permissions
        </button>
      )}

      <button onClick={scanForDevices} disabled={isScanning || !accessibilityGranted}>
        {isScanning ? "Scanning..." : "Scan"}
      </button>

      {error && <p className="error">{error}</p>}

      <h2>Scanned Devices:</h2>
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
    </main>
  );
}

export default App;