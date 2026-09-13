import { useEffect, useRef, useState } from "react";
import "./simhud.css";
import "./desktop.css";
import { SimHud } from "./SimHud";
import { ActionButton } from "./Mobile/ActionButton";
import { AgentsPanel } from "./Panels/AgentsPanel";
import { IssuesPanel } from "./Panels/IssuesPanel";
import { ChatPanel } from "./Panels/ChatPanel";
import { BoardChannelPanel } from "./Panels/BoardChannelPanel";
import { RunTranscriptPanel } from "./Panels/RunTranscriptPanel";
import { CompanySwitcher } from "./Panels/CompanySwitcher";
import { LiveCall } from "./Live/LiveCall";
import { usePaperclipStore } from "../networking/sync/paperclipStore";
import { useBoardChannelStore } from "../networking/sync/boardChannelStore";
import { useLiveStore } from "../services/live/liveStore";
import { startLiveCall, stopLiveCall } from "../services/live/liveSession";
import { playerState } from "../entities/Player/playerState";

function FpsCounter() {
  const [fps, setFps] = useState(0);

  useEffect(() => {
    let frames = 0;
    let last = performance.now();
    let raf;
    const loop = (now) => {
      frames += 1;
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <span>{fps}</span>;
}

function LiveIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C11.6 21 3 12.4 3 2c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"
      />
    </svg>
  );
}

function LiveButton() {
  const { active, agentName } = useLiveStore((s) => s);
  const agents = usePaperclipStore((s) => s.agents);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const onMainClick = () => {
    if (active) {
      void stopLiveCall();
    } else if (agents.length > 1) {
      setOpen((v) => !v);
    } else if (agents.length === 1) {
      const a = agents[0];
      void startLiveCall(a.id, a.name, a.description || a.role);
    }
  };

  return (
    <div className={`live-top ${active ? "live-top-active" : ""}`} ref={ref}>
      <button
        type="button"
        className="live-top-btn ui-interactive"
        title={active ? `End LIVE call with ${agentName}` : "Start a LIVE voice call"}
        onClick={onMainClick}
      >
        <LiveIcon />
        <span>{active ? agentName.toUpperCase() : "LIVE"}</span>
      </button>
      {open && (
        <div className="live-top-menu">
          <div className="live-top-menu-title">CALL AGENT</div>
          {agents.map((agent) => (
            <button
              key={agent.id}
              type="button"
              className="live-top-opt ui-interactive"
              onClick={() => {
                setOpen(false);
                void startLiveCall(agent.id, agent.name, agent.description || agent.role);
              }}
            >
              {agent.name} · {agent.role}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityTicker() {
  const connected = usePaperclipStore((s) => s.connected);
  const activity = useBoardChannelStore((s) => s.activity);

  if (!connected || !activity?.length) {
    return (
      <section className="panel">
        <div className="panel-title">
          <span>System Log</span>
          <span className="title-dot">▤</span>
        </div>
        <div className="log">
          <span className="ln ok">&gt; boot sequence complete</span>
          <span className="ln ok">&gt; physics world online</span>
          <span className="ln ok">&gt; avatar pinned to grid</span>
          <span className="ln warn">&gt; wall breaches: 0</span>
          <span className="ln">&gt; watching unit-042<span className="cursor" /></span>
        </div>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-title">
        <span>Company Feed</span>
        <span className="title-dot">▤</span>
      </div>
      <div className="log">
        {activity.slice(0, 9).map((entry) => {
          const who = entry.agentName ?? entry.actorType ?? "system";
          const what = String(entry.action ?? "").replaceAll("_", " ");
          return (
            <span
              key={entry.id}
              className={`ln ${String(entry.action ?? "").includes("fail") ? "warn" : ""}`}
            >
              &gt; {who}: {what}
            </span>
          );
        })}
        <span className="ln">&gt; listening<span className="cursor" /></span>
      </div>
    </section>
  );
}

export function DesktopLayout({ children }) {
  const [isSitting, setIsSitting] = useState(playerState.isSitting);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("board"); // board | agents | chat | activity

  // keep button in sync if sitting is toggled elsewhere (e.g. future chair click)
  useEffect(() => {
    const id = setInterval(() => {
      if (isSitting !== playerState.isSitting) setIsSitting(playerState.isSitting);
    }, 200);
    return () => clearInterval(id);
  }, [isSitting]);

  const toggleSit = () => {
    const body = playerState.bodyRef;
    if (!body) return;
    if (playerState.isSitting) {
      playerState.isSitting = false;
      setIsSitting(false);
      const p = body.translation();
      // stand up slightly behind chair so you don't spawn inside it
      body.setTranslation({ x: p.x, y: p.y, z: p.z + 0.8 }, true);
      body.setLinvel({ x: 0, y: 2, z: 0 }, true);
      body.wakeUp?.();
    } else {
      // Chair at [10.109, -1.86] from registry teamAnchors
      // Lift a bit so the sit pose (hips lowered) still sits on the seat
      const p = body.translation();
      body.setTranslation({ x: 10.109, y: p.y + 0.7, z: -1.86 }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      body.resetForces?.(true);
      body.wakeUp?.();
      playerState.isSitting = true;
      setIsSitting(true);
    }
  };

  return (
    <div className={`desktop ${drawerOpen ? "drawer-open" : "drawer-closed"}`}>
      <header className="desktop-topbar">
        <div className="dt-left">
          <button
            type="button"
            className="dt-drawer-toggle ui-interactive"
            onClick={() => setDrawerOpen((v) => !v)}
            title={drawerOpen ? "Collapse command drawer" : "Expand command drawer"}
            aria-expanded={drawerOpen}
          >
            {drawerOpen ? "⟨⟩" : "⟨⟩"}
            <span className="dt-toggle-label">{drawerOpen ? "HIDE" : "COMMAND"}</span>
          </button>
          <span className="dt-brand">MITHUNA // SIMULATION CONSOLE</span>
        </div>
        <div className="dt-right">
          <CompanySwitcher />
          <LiveButton />
          <span className="dt-status">UNIT-042 · CONTAINMENT STABLE</span>
        </div>
      </header>

      <div className="desktop-body">
        {/* 3D simulation viewport — full edge-to-edge centerpiece */}
        <main className="viewpanel">
          {children}
          <SimHud />
          <LiveCall />
        </main>

        {/* Collapsible command drawer / tabbed inspector rail */}
        <aside className={`inspector-rail ${drawerOpen ? "open" : "closed"}`} aria-hidden={!drawerOpen}>
          <div className="rail-tabs" role="tablist">
            {[
              ["board", "BOARD"],
              ["agents", "AGENTS"],
              ["chat", "CHAT"],
              ["activity", "ACTIVITY"],
            ].map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={activeTab === id}
                type="button"
                className={`rail-tab ${activeTab === id ? "on" : ""} ui-interactive`}
                onClick={() => {
                  setActiveTab(id);
                  if (!drawerOpen) setDrawerOpen(true);
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="rail-content">
            {activeTab === "board" && (
              <>
                <BoardChannelPanel />
                <RunTranscriptPanel />
                <IssuesPanel />
              </>
            )}
            {activeTab === "agents" && <AgentsPanel />}
            {activeTab === "chat" && <ChatPanel />}
            {activeTab === "activity" && (
              <>
                <section className="panel">
                  <div className="panel-title">
                    <span>Quick Actions</span>
                    <span className="title-dot">⚡</span>
                  </div>
                  <div className="qa-grid">
                    <div className="qa-item">
                      <ActionButton label="RUN" keyLabel="shift" className="act-run" />
                      <span className="key-hint">SHIFT</span>
                    </div>
                    <div className="qa-item">
                      <ActionButton label="JUMP" keyLabel=" " className="act-jump" />
                      <span className="key-hint">SPACE</span>
                    </div>
                    <div className="qa-item">
                      <button
                        type="button"
                        className="act-btn ui-interactive"
                        style={{
                          background: isSitting
                            ? "var(--accent)"
                            : "radial-gradient(circle at 35% 30%, var(--primary-glow-top), var(--primary))",
                          color: isSitting ? "#000" : "var(--secondary)",
                        }}
                        onClick={toggleSit}
                      >
                        {isSitting ? "STAND" : "SIT"}
                      </button>
                      <span className="key-hint">{isSitting ? "SIT" : "CHAIR"}</span>
                    </div>
                  </div>
                </section>
                <ActivityTicker />
              </>
            )}
          </div>
        </aside>

        {/* Edge reopen tab when drawer is collapsed */}
        {!drawerOpen && (
          <button
            type="button"
            className="rail-edge-tab ui-interactive"
            onClick={() => setDrawerOpen(true)}
            title="Open command drawer"
          >
            ‹
          </button>
        )}
      </div>
    </div>
  );
}
