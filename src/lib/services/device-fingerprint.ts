/**
 * Device Fingerprinting Service
 * - Collects device-specific identifiers for security
 * - Used for trusted device registration
 * - Helps detect anomalies in login patterns
 */

export interface DeviceFingerprint {
  id: string;
  platform: string;
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  colorDepth: number;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  touchSupport: boolean;
  webglVendor?: string;
  webglRenderer?: string;
  canvasHash?: string;
  audioHash?: string;
  timestamp: string;
}

export interface DeviceInfo {
  fingerprint: DeviceFingerprint;
  isTrusted: boolean;
  firstSeen?: Date;
  lastSeen?: Date;
  trustLevel: "high" | "medium" | "low";
}

/**
 * Generate a unique device fingerprint
 */
export async function generateDeviceFingerprint(): Promise<DeviceFingerprint> {
  const fingerprint: Partial<DeviceFingerprint> = {
    timestamp: new Date().toISOString(),
  };

  // Basic info
  fingerprint.platform = navigator.platform || "unknown";
  fingerprint.userAgent = navigator.userAgent || "unknown";
  fingerprint.screenResolution = `${window.screen.width}x${window.screen.height}`;
  fingerprint.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  fingerprint.language = navigator.language;
  fingerprint.colorDepth = window.screen.colorDepth;
  fingerprint.touchSupport = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  // Hardware info (if available)
  if ("deviceMemory" in navigator) {
    fingerprint.deviceMemory = (navigator as any).deviceMemory;
  }
  fingerprint.hardwareConcurrency = navigator.hardwareConcurrency;

  // WebGL fingerprint
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (gl && gl instanceof WebGLRenderingContext) {
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        fingerprint.webglVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        fingerprint.webglRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      }
    }
  } catch (e) {
    console.log("[DeviceFingerprint] WebGL not available");
  }

  // Canvas fingerprint (simplified)
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "alphabetic";
      ctx.font = "14px Arial";
      ctx.fillStyle = "#f60";
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = "#069";
      ctx.fillText("DeviceFingerprint", 2, 15);
      ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
      ctx.fillText("DeviceFingerprint", 4, 17);
      
      fingerprint.canvasHash = await hashString(canvas.toDataURL());
    }
  } catch (e) {
    console.log("[DeviceFingerprint] Canvas fingerprint failed");
  }

  // Generate unique ID from fingerprint components
  const fingerprintString = [
    fingerprint.platform,
    fingerprint.screenResolution,
    fingerprint.timezone,
    fingerprint.language,
    fingerprint.colorDepth,
    fingerprint.hardwareConcurrency,
    fingerprint.webglRenderer,
    fingerprint.canvasHash,
  ].join("|");

  fingerprint.id = await hashString(fingerprintString);

  return fingerprint as DeviceFingerprint;
}

/**
 * Simple hash function for strings
 */
async function hashString(str: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 32);
  } catch (e) {
    // Fallback for environments without crypto.subtle
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, "0");
  }
}

/**
 * Get basic device info for display
 */
export function getBasicDeviceInfo(): { type: string; os: string; browser: string } {
  const ua = navigator.userAgent;
  
  // Detect device type
  let type = "Desktop";
  if (/Mobi|Android/i.test(ua)) {
    type = "Mobile";
  } else if (/Tablet|iPad/i.test(ua)) {
    type = "Tablet";
  }

  // Detect OS
  let os = "Unknown";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iOS|iPhone|iPad/i.test(ua)) os = "iOS";

  // Detect browser
  let browser = "Unknown";
  if (/Chrome/i.test(ua) && !/Edge/i.test(ua)) browser = "Chrome";
  else if (/Firefox/i.test(ua)) browser = "Firefox";
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Edge/i.test(ua)) browser = "Edge";
  else if (/Opera|OPR/i.test(ua)) browser = "Opera";

  return { type, os, browser };
}

/**
 * Check if device is likely a mobile device
 */
export function isMobileDevice(): boolean {
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
}

/**
 * Get geolocation data
 */
export function getGeolocation(): Promise<{ lat: number; lng: number; accuracy: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      () => {
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}

/**
 * Store trusted device in localStorage
 */
export function storeTrustedDevice(fingerprint: DeviceFingerprint): void {
  const devices = getTrustedDevices();
  const existingIndex = devices.findIndex(d => d.id === fingerprint.id);
  
  if (existingIndex >= 0) {
    devices[existingIndex] = { ...fingerprint, timestamp: new Date().toISOString() };
  } else {
    devices.push(fingerprint);
  }

  // Keep only last 5 trusted devices
  const trimmedDevices = devices.slice(-5);
  localStorage.setItem("trusted_devices", JSON.stringify(trimmedDevices));
}

/**
 * Get trusted devices from localStorage
 */
export function getTrustedDevices(): DeviceFingerprint[] {
  try {
    const data = localStorage.getItem("trusted_devices");
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Check if current device is trusted
 */
export async function isDeviceTrusted(): Promise<boolean> {
  const fingerprint = await generateDeviceFingerprint();
  const trustedDevices = getTrustedDevices();
  return trustedDevices.some(d => d.id === fingerprint.id);
}

/**
 * Remove a trusted device
 */
export function removeTrustedDevice(deviceId: string): void {
  const devices = getTrustedDevices().filter(d => d.id !== deviceId);
  localStorage.setItem("trusted_devices", JSON.stringify(devices));
}

/**
 * Calculate device trust level based on various factors
 */
export async function calculateTrustLevel(fingerprint: DeviceFingerprint): Promise<"high" | "medium" | "low"> {
  const trustedDevices = getTrustedDevices();
  const isTrusted = trustedDevices.some(d => d.id === fingerprint.id);
  
  if (isTrusted) {
    return "high";
  }

  // Check if similar device exists
  const similarDevice = trustedDevices.find(d => 
    d.platform === fingerprint.platform && 
    d.timezone === fingerprint.timezone
  );

  if (similarDevice) {
    return "medium";
  }

  return "low";
}

export default {
  generateDeviceFingerprint,
  getBasicDeviceInfo,
  isMobileDevice,
  getGeolocation,
  storeTrustedDevice,
  getTrustedDevices,
  isDeviceTrusted,
  removeTrustedDevice,
  calculateTrustLevel,
};
