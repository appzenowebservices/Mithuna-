// src/services/live/cameraCapture.js
//
// Webcam -> JPEG frames for the LIVE "eye". While the camera is on we sample it
// at ~1fps into a small rolling buffer, so the freshest frame is ALWAYS a real,
// recent frame. Each turn attaches the latest buffered frame to the message the
// brain sees.
//
// Ported from OpenLive's CameraCapture (MIT-style reference implementation in
// the OpenLive repo, apps/web/src/lib/live/cameraCapture.ts).

export class CameraCapture {
  constructor() {
    this.video = document.createElement("video");
    this.video.muted = true;
    this.video.playsInline = true;
    this.canvas = document.createElement("canvas");
    this.stream = null;
    this.buffer = [];
    this.timer = null;
    this.sampleSize = 640;
  }

  static BUFFER = 6;

  async start(deviceId, facingMode = "environment") {
    const constraints = { width: { ideal: 1280 }, height: { ideal: 720 } };
    if (deviceId) constraints.deviceId = { exact: deviceId };
    else constraints.facingMode = facingMode;
    this.sampleSize = 640;
    this.stream = await navigator.mediaDevices.getUserMedia({ video: constraints });
    this.video.srcObject = this.stream;
    await this.video.play();
    this.startSampling();
    return this.stream;
  }

  startSampling() {
    if (this.timer) return;
    this.timer = setInterval(() => void this.sample(), 1000);
    void this.sample();
  }

  async sample() {
    const buf = await this.grab(this.sampleSize, 0.72);
    if (!buf) return;
    this.buffer.push(buf);
    if (this.buffer.length > CameraCapture.BUFFER) this.buffer.shift();
  }

  /** The latest sampled frame, as base64 JPEG (what gets attached to a turn). */
  async captureFreshest() {
    const buf = this.buffer[this.buffer.length - 1] ?? (await this.grab(this.sampleSize, 0.72));
    return buf ? toBase64(buf) : null;
  }

  /** The latest sampled frame as a raw ArrayBuffer (binary wire frame). */
  async captureFreshestBuffer() {
    return this.buffer[this.buffer.length - 1] ?? (await this.grab(this.sampleSize, 0.72));
  }

  grab(size, q) {
    const v = this.video;
    if (!v.videoWidth) return Promise.resolve(null);
    const scale = Math.min(1, size / Math.max(v.videoWidth, v.videoHeight));
    const w = Math.round(v.videoWidth * scale);
    const h = Math.round(v.videoHeight * scale);
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.getContext("2d").drawImage(v, 0, 0, w, h);
    return new Promise((res) =>
      this.canvas.toBlob((b) => (b ? b.arrayBuffer().then(res) : res(null)), "image/jpeg", q)
    );
  }

  getStream() {
    return this.stream;
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.buffer = [];
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video.srcObject = null;
  }
}

function toBase64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
