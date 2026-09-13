// src/services/live/devices.js
//
// Mic / camera enumeration for the LIVE dialer's device-switch menus (ported
// from OpenLive's refreshDevices pattern). Labels are only available after the
// browser has granted a media permission, so devices fall back to "Mic N" /
// "Cam N" until then.

export async function enumerateDevices() {
  let devs = [];
  try {
    devs = await navigator.mediaDevices.enumerateDevices();
  } catch {
    return { mics: [], cams: [] };
  }
  const mics = devs
    .filter((d) => d.kind === "audioinput")
    .map((d, i) => ({ id: d.deviceId, label: d.label || `Microphone ${i + 1}` }));
  const cams = devs
    .filter((d) => d.kind === "videoinput")
    .map((d, i) => ({ id: d.deviceId, label: d.label || `Camera ${i + 1}` }));
  return { mics, cams };
}

/** Build audio constraints for a chosen mic id ("" = system default). */
export function micConstraints(deviceId) {
  const audio = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
  if (deviceId) audio.deviceId = { exact: deviceId };
  return audio;
}
