// src/ui/Panels/RunTranscriptPanel.jsx
//
// Live peek into what an agent is actually doing right now. Cursor-polls the
// Paperclip run-log endpoint (GET /heartbeat-runs/:id/log?offset=) while the
// panel is open, appending new bytes — the same incremental protocol the
// board UI's transcript view uses.

import { useEffect, useRef, useState } from "react";
import { useUiActionStore, uiActionStore } from "./uiActionStore";
import { usePaperclipStore } from "../../networking/sync/paperclipStore";
import { paperclipClient } from "../../networking/api/paperclipClient";

const POLL_MS = 2500;
const MAX_LINES = 60;

function findActiveRun(runs) {
  if (!Array.isArray(runs) || runs.length === 0) return null;
  return runs.find((r) => r.status === "running") ?? runs.find((r) => r.status === "queued") ?? runs[0];
}

export function RunTranscriptPanel() {
  const connected = usePaperclipStore((s) => s.connected);
  const agentId = useUiActionStore((s) => s.transcriptAgentId);
  const agentName = useUiActionStore((s) => s.transcriptAgentName);

  const [run, setRun] = useState(null);
  const [lines, setLines] = useState([]);
  const [error, setError] = useState(null);
  const logRef = useRef(null);
  const activeRunIdRef = useRef(null);

  useEffect(() => {
    if (!connected || !agentId) return;
    let cancelled = false;
    let offset = 0;
    let timer = null;

    const tick = async () => {
      try {
        const runs = await paperclipClient.listRuns(
          paperclipClient.companyId,
          { agentId, limit: 5 }
        );
        const active = findActiveRun(runs);
        if (cancelled) return;
        if (!active || active.id !== activeRunIdRef.current) {
          activeRunIdRef.current = active?.id ?? null;
          setRun(active ?? null);
          offset = 0;
          setLines([]);
        }
        if (!active) {
          setError("no runs yet for this agent");
          return;
        }
        setError(null);

        const isRunning = active.status === "running" || active.status === "queued";
        const res = await paperclipClient.getRunLog(active.id, offset, 8192);
        if (cancelled) return;
        if (res?.content) {
          setLines((prev) =>
            [...prev, ...res.content.split("\n")].slice(-MAX_LINES)
          );
        }
        if (typeof res?.nextOffset === "number") {
          offset = res.nextOffset;
        }

        if (!isRunning && typeof res?.nextOffset !== "number") {
          // Terminal and fully drained.
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) timer = setTimeout(tick, POLL_MS);
      }
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, agentId]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [lines.length]);

  if (!agentId) return null;

  const live = run?.status === "running" || run?.status === "queued";

  return (
    <section className="panel run-panel">
      <div className="panel-title">
        <span>
          {live && <span className="run-live-dot" />}
          RUN // {agentName}
        </span>
        <span className="chat-actions">
          <button
            type="button"
            className="chat-action"
            title="Close"
            onClick={() => uiActionStore.closeTranscript()}
          >
            ▣
          </button>
        </span>
      </div>

      {error && <div className="panel-empty">{error}</div>}
      {!error && !run && <div className="panel-empty">connecting to run…</div>}

      {run && (
        <>
          <div className="bc-foot" style={{ marginBottom: 6 }}>
            <span className="bc-sub">
              {run.invocationSource ?? "heartbeat"} · {run.status}
            </span>
            <span className="bc-actions">
              {live && (
                <button
                  type="button"
                  className="bc-btn bc-reject"
                  onClick={() => void paperclipClient.cancelRun(run.id)}
                >
                  CANCEL
                </button>
              )}
            </span>
          </div>
          <div className="run-log" ref={logRef}>
            {lines.length === 0 && <div className="panel-empty">awaiting output…</div>}
            {lines.map((line, i) => (
              <div key={i} className={`run-line ${line.startsWith("##") ? "run-status" : ""}`}>
                {line}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
