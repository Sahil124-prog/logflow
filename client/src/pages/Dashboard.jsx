
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import StatCards from "../components/StatCards";
import LogFeed from "../components/LogFeed";
import Charts from "../components/Charts";
import AlertPanel from "../components/AlertPanel";
import ServiceHealth from "../components/ServiceHealth";
import ToastContainer from "../components/ToastContainer";
import SystemHealth from "../components/SystemHealth";
import RateLimitPanel from "../components/RateLimitPanel";
import RetentionPanel from "../components/RetentionPanel";
import DeployHistory from "../components/DeployHistory";
import MetricsSummary from "../components/MetricsSummary";

const API = "http://localhost:8081";

/* ─── CSS injected once ─────────────────────────────────────────────────── */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');

  :root {
    --bg:        #F7F5F0;
    --surface:   #FFFFFF;
    --surface2:  #F0EDE7;
    --surface3:  #E8E4DC;
    --border:    rgba(60,50,30,0.10);
    --border-md: rgba(60,50,30,0.16);
    --text:      #1C1917;
    --text2:     #57534E;
    --text3:     #A8A29E;
    --accent:    #16A34A;
    --accent-bg: #DCFCE7;
    --accent-border: rgba(22,163,74,0.25);
    --danger:    #DC2626;
    --danger-bg: #FEF2F2;
    --danger-border: rgba(220,38,38,0.2);
    --warn:      #D97706;
    --warn-bg:   #FFFBEB;
    --info:      #2563EB;
    --info-bg:   #EFF6FF;
    --mono: 'DM Mono', monospace;
    --sans: 'DM Sans', sans-serif;
    --muted:  #A8A29E;   /* add this — same as --text3 */
    --muted2: #78716C;   /* add this if not present */
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--sans);
    background: var(--bg);
    color: var(--text);
    -webkit-font-smoothing: antialiased;
  }

  button, select, input {
    font-family: var(--sans);
    font-size: 13px;
    color: var(--text);
    outline: none;
  }

  button {
    cursor: pointer;
    transition: opacity 0.15s, transform 0.1s, background 0.15s;
  }
  button:hover { opacity: 0.85; }
  button:active { transform: scale(0.98); }

  select {
    background: var(--surface);
    border: 1px solid var(--border-md);
    border-radius: 8px;
    padding: 7px 10px;
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2378716c' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
    padding-right: 28px;
    cursor: pointer;
  }

  select:focus, input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-bg);
  }

  input {
    background: var(--surface);
    border: 1px solid var(--border-md);
    border-radius: 8px;
    padding: 7px 10px;
  }
  input::placeholder { color: var(--text3); }

  pre { font-family: var(--mono); }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .lf-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    overflow: hidden;
  }

  .lf-card-header {
    padding: 12px 1.25rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .lf-card-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--text2);
    letter-spacing: 0.02em;
  }

  .lf-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .lf-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 9px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 500;
  }

  .lf-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 7px 14px;
    font-size: 12px;
    font-weight: 500;
    border-radius: 8px;
    border: 1px solid var(--border-md);
    background: var(--surface);
    color: var(--text2);
    transition: background 0.15s, border-color 0.15s;
  }
  .lf-btn:hover { background: var(--surface2); border-color: var(--border-md); opacity: 1; }

  .lf-btn-accent {
    background: var(--accent);
    color: #fff;
    border-color: transparent;
    font-weight: 600;
    font-size: 13px;
    padding: 8px 18px;
    border-radius: 9px;
  }
  .lf-btn-accent:hover { opacity: 0.88; }
  .lf-btn-accent:disabled { opacity: 0.5; cursor: not-allowed; }

  .lf-btn-danger {
    background: var(--danger-bg);
    color: var(--danger);
    border-color: var(--danger-border);
  }
  .lf-btn-success {
    background: var(--accent-bg);
    color: var(--accent);
    border-color: var(--accent-border);
  }
`;

function injectStyles() {
  if (document.getElementById("logflow-styles")) return;
  const el = document.createElement("style");
  el.id = "logflow-styles";
  el.textContent = css;
  document.head.appendChild(el);
}


function Topbar({
  auth,
  connected,
  onLogout,
  isAdmin,
  exportLogs,
  triggerAlertCheck,
}) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "rgba(247,245,240,0.88)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
        padding: "0 1.5rem",
        height: "52px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {/* Left: brand */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            background: "linear-gradient(135deg,#16A34A 0%,#15803D 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M3 3h18v4H3zM3 10h12v4H3zM3 17h8v4H3z" />
          </svg>
        </div>
        <span
          style={{
            fontWeight: "600",
            fontSize: "14px",
            letterSpacing: "-0.01em",
          }}
        >
          LogFlow
        </span>
        <span
          style={{
            fontSize: "11px",
            color: "var(--text3)",
            padding: "2px 8px",
            background: "var(--surface2)",
            borderRadius: "20px",
            border: "1px solid var(--border)",
          }}
        >
          Operations
        </span>
      </div>

      {/* Right: actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {isAdmin && (
          <>
            <button className="lf-btn lf-btn-success" onClick={exportLogs}>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Export S3
            </button>
            <button
              className="lf-btn lf-btn-danger"
              onClick={triggerAlertCheck}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Trigger Check
            </button>
          </>
        )}

       
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            padding: "5px 10px 5px 6px",
            background: "var(--surface)",
            border: "1px solid var(--border-md)",
            borderRadius: "20px",
            fontSize: "12px",
          }}
        >
          <div
            style={{
              width: "22px",
              height: "22px",
              borderRadius: "50%",
              background: isAdmin ? "var(--accent-bg)" : "var(--info-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "10px",
              fontWeight: "600",
              color: isAdmin ? "var(--accent)" : "var(--info)",
            }}
          >
            {auth.user.username?.[0]?.toUpperCase()}
          </div>
          <span style={{ color: "var(--text2)", fontWeight: "500" }}>
            {auth.user.username}
          </span>
          <span
            className="lf-badge"
            style={{
              background: isAdmin ? "var(--accent-bg)" : "var(--info-bg)",
              color: isAdmin ? "var(--accent)" : "var(--info)",
            }}
          >
            {auth.user.role}
          </span>
        </div>

        
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div
            className="lf-dot"
            style={{
              background: connected ? "var(--accent)" : "var(--danger)",
              animation: connected ? "pulse 2s infinite" : "none",
            }}
          />
          <span style={{ fontSize: "11px", color: "var(--text3)" }}>
            {connected ? "live" : "offline"}
          </span>
        </div>

        <button
          className="lf-btn"
          onClick={onLogout}
          style={{ padding: "6px 12px" }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}


function AlertBanner({ count }) {
  if (!count) return null;
  return (
    <div
      style={{
        background: "var(--danger-bg)",
        borderBottom: "1px solid var(--danger-border)",
        padding: "9px 1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontSize: "13px",
        color: "var(--danger)",
        animation: "slideDown 0.2s ease",
      }}
    >
      <div
        className="lf-dot"
        style={{ background: "var(--danger)", animation: "pulse 1s infinite" }}
      />
      <strong>
        {count} active alert{count > 1 ? "s" : ""}
      </strong>
      <span style={{ color: "#B91C1C" }}>
        — services experiencing elevated failure rates
      </span>
    </div>
  );
}


function ViewerBanner() {
  return (
    <div
      style={{
        background: "var(--info-bg)",
        borderBottom: "1px solid rgba(37,99,235,0.15)",
        padding: "10px 1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontSize: "13px",
        color: "#1D4ED8",
      }}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <span>
        <strong>Read-only mode</strong> — admin privileges required to resolve
        alerts, export, or send test data.
      </span>
    </div>
  );
}


function SectionLabel({ children }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "-4px",
      }}
    >
      <span
        style={{
          fontSize: "11px",
          fontWeight: "600",
          letterSpacing: "0.06em",
          color: "var(--text3)",
          textTransform: "uppercase",
        }}
      >
        {children}
      </span>
      <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
    </div>
  );
}


function SendLogCard({ sendForm, setSendForm, onSend, sending }) {
  return (
    <div className="lf-card">
      <div className="lf-card-header">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text3)"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
        <span className="lf-card-label">Send test log</span>
        <span
          className="lf-badge"
          style={{
            background: "var(--surface2)",
            color: "var(--text3)",
            marginLeft: "auto",
          }}
        >
          Admin only
        </span>
      </div>
      <div
        style={{
          padding: "1rem 1.25rem",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          alignItems: "flex-end",
          background: "var(--surface)",
        }}
      >
        {[
          {
            label: "Service",
            key: "service",
            options: ["auth-service", "payment-service", "order-service"],
          },
          { label: "Level", key: "level", options: ["info", "error", "warn"] },
        ].map((f) => (
          <div
            key={f.key}
            style={{ display: "flex", flexDirection: "column", gap: "5px" }}
          >
            <label
              style={{
                fontSize: "11px",
                fontWeight: "500",
                color: "var(--text3)",
              }}
            >
              {f.label}
            </label>
            <select
              value={sendForm[f.key]}
              onChange={(e) =>
                setSendForm((p) => ({ ...p, [f.key]: e.target.value }))
              }
            >
              {f.options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
        ))}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
            flex: 1,
            minWidth: "180px",
          }}
        >
          <label
            style={{
              fontSize: "11px",
              fontWeight: "500",
              color: "var(--text3)",
            }}
          >
            Message
          </label>
          <input
            value={sendForm.message}
            onChange={(e) =>
              setSendForm((p) => ({ ...p, message: e.target.value }))
            }
          />
        </div>
        <button className="lf-btn-accent" onClick={onSend} disabled={sending}>
          {sending ? "Sending…" : "Send log"}
        </button>
      </div>
    </div>
  );
}


const LEVEL_STYLES = {
  ALL: { bg: "var(--surface2)", color: "var(--text2)" },
  INFO: { bg: "var(--info-bg)", color: "var(--info)" },
  WARN: { bg: "var(--warn-bg)", color: "var(--warn)" },
  ERROR: { bg: "var(--danger-bg)", color: "var(--danger)" },
};

function LogFilterBar({
  logFilter,
  setLogFilter,
  search,
  setSearch,
  connected,
}) {
  return (
    <div
      style={{
        padding: "10px 1.25rem",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        flexWrap: "wrap",
        background: "var(--surface2)",
      }}
    >
      <span
        style={{
          fontSize: "12px",
          fontWeight: "600",
          color: "var(--text2)",
          letterSpacing: "0.01em",
        }}
      >
        Log feed
      </span>
      <div style={{ display: "flex", gap: "4px" }}>
        {["ALL", "INFO", "WARN", "ERROR"].map((f) => {
          const active = logFilter === f;
          const s = LEVEL_STYLES[f];
          return (
            <button
              key={f}
              onClick={() => setLogFilter(f)}
              style={{
                padding: "4px 11px",
                fontSize: "11px",
                fontWeight: "500",
                borderRadius: "20px",
                border: active
                  ? "1px solid transparent"
                  : "1px solid var(--border-md)",
                background: active ? s.bg : "transparent",
                color: active ? s.color : "var(--text3)",
                transition: "all 0.15s",
              }}
            >
              {f}
            </button>
          );
        })}
      </div>
      <input
        placeholder="Search logs…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginLeft: "auto", width: "190px", fontSize: "12px" }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        <div
          className="lf-dot"
          style={{
            background: connected ? "var(--accent)" : "var(--danger)",
            animation: connected ? "pulse 1.5s infinite" : "none",
          }}
        />
        <span style={{ fontSize: "11px", color: "var(--text3)" }}>
          {connected ? "live" : "offline"}
        </span>
      </div>
    </div>
  );
}


function LogModal({ log, onClose }) {
  if (!log) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(28,25,23,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "1rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-md)",
          borderRadius: "16px",
          padding: "1.5rem",
          maxWidth: "520px",
          width: "100%",
          boxShadow: "0 20px 60px rgba(28,25,23,0.15)",
          animation: "fadeIn 0.18s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <span style={{ fontWeight: "600", fontSize: "14px" }}>
            Log detail
          </span>
          <button
            onClick={onClose}
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text2)",
              fontSize: "16px",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <pre
          style={{
            background: "var(--surface2)",
            borderRadius: "10px",
            padding: "1rem",
            fontSize: "12px",
            color: "var(--text)",
            overflow: "auto",
            whiteSpace: "pre-wrap",
            lineHeight: "1.65",
            border: "1px solid var(--border)",
          }}
        >
          {JSON.stringify(log, null, 2)}
        </pre>
      </div>
    </div>
  );
}


export default function Dashboard({ auth, onLogout }) {
  injectStyles();

  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [health, setHealth] = useState(null);
  const [connected, setConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const [logFilter, setLogFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [toasts, setToasts] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [sendForm, setSendForm] = useState({
    service: "auth-service",
    level: "info",
    message: "Test log from dashboard",
  });
  const socketRef = useRef(null);

  const headers = { Authorization: `Bearer ${auth.token}` };
  const isAdmin = auth.user.role === "admin";

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAlerts, 15000);
    const socket = io(window.location.origin, {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("new-log", (log) => {
      setLogs((prev) => [log, ...prev].slice(0, 200));
      if (log.level === "error")
        addToast(`${log.service}: ${log.message}`, "error");
    });
    socket.on("new-alert", (alert) => {
      setAlerts((prev) => [alert, ...prev]);
      addToast(`${alert.service} alert — ${alert.errorCount} errors`, "error");
    });
    socket.on("alert-updated", (upd) => {
      setAlerts((prev) => prev.map((a) => (a._id === upd._id ? upd : a)));
    });

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  async function fetchAll() {
    await Promise.all([fetchLogs(), fetchAlerts(), fetchHealth()]);
  }
  async function fetchLogs() {
    try {
      const r = await axios.get(API + "/api/logs", {
        headers: { ...headers, "Cache-Control": "no-cache" },
      });
      setLogs(r.data);
    } catch {}
  }
  async function fetchAlerts() {
    try {
      const r = await axios.get(API + "/api/alerts", { headers });
      setAlerts(r.data);
    } catch {}
  }
  async function fetchHealth() {
    try {
      const r = await axios.get(API + "/health");
      setHealth(r.data);
    } catch {}
  }

  async function resolveAlert(id) {
    try {
      await axios.patch(API + `/api/alerts/${id}/resolve`, {}, { headers });
      setAlerts((prev) =>
        prev.map((a) => (a._id === id ? { ...a, resolved: true } : a)),
      );
      addToast("Alert resolved", "success");
    } catch {
      addToast("Failed to resolve alert", "error");
    }
  }

  async function sendLog() {
    if (!sendForm.message.trim()) return;
    setSending(true);
    try {
      await axios.post(API + "/api/logs", {
        ...sendForm,
        timestamp: new Date().toISOString(),
      });
    } catch {
    } finally {
      setSending(false);
    }
  }

  async function exportLogs() {
    try {
      await axios.post(API + "/api/export", {}, { headers });
      addToast("Logs exported to S3", "success");
    } catch {
      addToast("Export failed — check S3/LocalStack", "error");
    }
  }

  function addToast(message, type = "info") {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      4000,
    );
  }

  async function triggerAlertCheck() {
    try {
      const res = await axios.post(
        API + "/api/alerts/trigger-check",
        {},
        { headers },
      );
      const data = res.data;
      if (data.triggered > 0) {
        setAlerts((prev) => [...data.alerts, ...prev]);
        addToast(`${data.triggered} alert(s) created`, "error");
      } else {
        addToast("No new alerts — thresholds OK", "info");
      }
      fetchAlerts();
    } catch {
      addToast("Trigger failed", "error");
    }
  }

  const filteredLogs = logs.filter((l) => {
    const matchLevel =
      logFilter === "ALL" || l.level === logFilter.toLowerCase();
    const matchSearch =
      !search ||
      l.message?.toLowerCase().includes(search.toLowerCase()) ||
      l.service?.toLowerCase().includes(search.toLowerCase());
    return matchLevel && matchSearch;
  });

  const activeAlertCount = alerts.filter((a) => !a.resolved).length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <ToastContainer toasts={toasts} />

      <AlertBanner count={activeAlertCount} />

      <Topbar
        auth={auth}
        connected={connected}
        onLogout={onLogout}
        isAdmin={isAdmin}
        exportLogs={exportLogs}
        triggerAlertCheck={triggerAlertCheck}
      />

      {!isAdmin && <ViewerBanner />}

     
      <div
        style={{
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
          maxWidth: "1240px",
          margin: "0 auto",
        }}
      >
        
        <SectionLabel>Overview</SectionLabel>
        <StatCards logs={logs} alerts={alerts} />

      
        <SectionLabel>Infrastructure</SectionLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.25rem",
          }}
        >
          <ServiceHealth logs={logs} />
          <SystemHealth health={health} connected={connected} />
        </div>

        
        <SectionLabel>Prometheus metrics</SectionLabel>
        <MetricsSummary />

       
        <SectionLabel>Analytics</SectionLabel>
        <Charts logs={logs} />

      
        <SectionLabel>Alerts</SectionLabel>
        <AlertPanel alerts={alerts} onResolve={isAdmin ? resolveAlert : null} />

        
        <SectionLabel>Deployments</SectionLabel>
        <DeployHistory auth={auth} />

      
        {isAdmin && (
          <>
            <SectionLabel>Admin controls</SectionLabel>
            <SendLogCard
              sendForm={sendForm}
              setSendForm={setSendForm}
              onSend={sendLog}
              sending={sending}
            />
            <RateLimitPanel auth={auth} />
            <RetentionPanel auth={auth} logs={logs} />
          </>
        )}

        
        <SectionLabel>Live logs</SectionLabel>
        <div className="lf-card">
          <LogFilterBar
            logFilter={logFilter}
            setLogFilter={setLogFilter}
            search={search}
            setSearch={setSearch}
            connected={connected}
          />
          <LogFeed logs={filteredLogs} onSelectLog={setSelectedLog} />
        </div>
      </div>

      <LogModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}
