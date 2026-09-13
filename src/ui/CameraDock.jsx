// src/ui/CameraDock.jsx
//
// Hovering camera rig over the 3D view — monitoring angles from Blender.
// Glass card floating on the right edge of the viewpanel, matching SimHud chrome.

import { useCameraStore, cameraStore, CameraMode } from "../systems/Camera/cameraStore";

export function CameraDock() {
  const mode = useCameraStore((s) => s.mode);
  const monitors = useCameraStore((s) => s.monitors);
  const activeId = useCameraStore((s) => s.activeMonitorId);

  return (
    <div className="cam-dock">
      {/* Monitors from Blender CAM_* */}
      <div className="cam-card">
        <div className="cam-card-head">
          <span className="cam-label">MONITOR</span>
          <span className="cam-count">{monitors.length ? `${monitors.length} FEED${monitors.length > 1 ? "S" : ""}` : "NO FEED"}</span>
        </div>
        {monitors.length === 0 ? (
          <div className="cam-empty">add CAM_* in Blender · export Cameras</div>
        ) : (
          <div className="cam-list">
            {monitors.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`cam-btn ${mode === CameraMode.MONITOR && activeId === m.id ? "on" : ""}`}
                onClick={() => cameraStore.setActiveMonitor(m.id)}
                title={m.name}
              >
                <span className="cam-dot" />
                {m.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active status */}
      <div className="cam-card cam-status-card">
        <span className="cam-status-dot" />
        <span className="cam-status-text">
          {mode === CameraMode.MONITOR
            ? `MONITOR · ${monitors.find((x) => x.id === activeId)?.name ?? activeId}`
            : "MONITOR"}
        </span>
      </div>
    </div>
  );
}
