// import { useState, useEffect, useRef } from "react";
// import axios from "axios";
// import { io } from "socket.io-client";
// import StatCards from "../components/StatCards";
// import LogFeed from "../components/LogFeed";
// import Charts from "../components/Charts";
// import AlertPanel from "../components/AlertPanel";
// import ServiceHealth from "../components/ServiceHealth";
// import ToastContainer from "../components/ToastContainer";
// import SystemHealth from "../components/SystemHealth";
// import RateLimitPanel from "../components/RateLimitPanel";

// const API = "http://localhost:8081";

// export default function Dashboard({ auth, onLogout }) {
//   const [logs, setLogs] = useState([]);
//   const [alerts, setAlerts] = useState([]);
//   const [health, setHealth] = useState(null);
//   const [connected, setConnected] = useState(false);
//   const [sending, setSending] = useState(false);
//   const [logFilter, setLogFilter] = useState("ALL");
//   const [search, setSearch] = useState("");
//   const [toasts, setToasts] = useState([]);
//   const [selectedLog, setSelectedLog] = useState(null);
//   const [sendForm, setSendForm] = useState({
//     service: "auth-service",
//     level: "info",
//     message: "Test log from dashboard",
//   });
//   const socketRef = useRef(null);

//   const headers = { Authorization: `Bearer ${auth.token}` };
//   const isAdmin = auth.user.role === "admin";

//   useEffect(() => {
//     fetchAll();
//     const interval = setInterval(fetchAlerts, 15000);

//     const socket = io(window.location.origin, {
//       transports: ["websocket", "polling"],
//     });
//     socketRef.current = socket;

//     socket.on("connect", () => setConnected(true));
//     socket.on("disconnect", () => setConnected(false));
//     socket.on("new-log", (log) => {
//       setLogs((prev) => [log, ...prev].slice(0, 200));
//       if (log.level === "error") {
//         addToast(`${log.service}: ${log.message}`, "error");
//       }
//     });

//     socket.on("new-alert", (alert) => {
//       setAlerts((prev) => [alert, ...prev]);
//       addToast(
//         `🚨 ${alert.service} alert triggered — ${alert.errorCount} errors`,
//         "error",
//       );
//     });

//     socket.on("alert-updated", (updatedAlert) => {
//       setAlerts((prev) =>
//         prev.map((a) => (a._id === updatedAlert._id ? updatedAlert : a)),
//       );
//     });

//     return () => {
//       socket.disconnect();
//       clearInterval(interval);
//     };
//   }, []);

//   async function fetchAll() {
//     await Promise.all([fetchLogs(), fetchAlerts(), fetchHealth()]);
//   }

//   async function fetchLogs() {
//     try {
//       const res = await axios.get(API + "/api/logs", {
//         headers: { ...headers, "Cache-Control": "no-cache" },
//       });
//       setLogs(res.data);
//     } catch (e) {
//       console.error(e);
//     }
//   }

//   async function fetchAlerts() {
//     try {
//       const res = await axios.get(API + "/api/alerts", {
//         headers: { ...headers, "Cache-Control": "no-cache" },
//       });
//       setAlerts(res.data);
//     } catch (e) {
//       console.error(e);
//     }
//   }

//   async function fetchHealth() {
//     try {
//       const res = await axios.get(API + "/health");
//       setHealth(res.data);
//     } catch (e) {
//       console.error(e);
//     }
//   }

//   async function resolveAlert(id) {
//     try {
//       await axios.patch(API + `/api/alerts/${id}/resolve`, {}, { headers });
//       setAlerts((prev) =>
//         prev.map((a) => (a._id === id ? { ...a, resolved: true } : a)),
//       );
//       addToast("Alert resolved", "success");
//     } catch (e) {
//       addToast("Failed to resolve alert", "error");
//     }
//   }

//   async function sendLog() {
//     if (!sendForm.message.trim()) return;
//     setSending(true);
//     try {
//       await axios.post(API + "/api/logs", {
//         ...sendForm,
//         timestamp: new Date().toISOString(),
//       });
//     } catch (e) {
//       console.error(e);
//     } finally {
//       setSending(false);
//     }
//   }

//   async function exportLogs() {
//     try {
//       await axios.post(API + "/api/export", {}, { headers });
//       addToast("Logs exported to S3 successfully", "success");
//     } catch (e) {
//       addToast("Export failed — check S3/LocalStack", "error");
//     }
//   }

//   function addToast(message, type = "info") {
//     const id = Date.now();
//     setToasts((prev) => [...prev, { id, message, type }]);
//     setTimeout(
//       () => setToasts((prev) => prev.filter((t) => t.id !== id)),
//       4000,
//     );
//   }

//   async function triggerAlertCheck() {
//     try {
//       const res = await axios.post(
//         API + "/api/alerts/trigger-check",
//         {},
//         { headers },
//       );
//       const data = res.data;
//       if (data.triggered > 0) {
//         setAlerts((prev) => [...data.alerts, ...prev]);
//         addToast(`${data.triggered} alert(s) created`, "error");
//       } else {
//         addToast("No new alerts — all thresholds OK", "info");
//       }
//       fetchAlerts();
//     } catch (e) {
//       addToast("Trigger failed", "error");
//     }
//   }

//   const filteredLogs = logs.filter((l) => {
//     const matchLevel =
//       logFilter === "ALL" || l.level === logFilter.toLowerCase();
//     const matchSearch =
//       !search ||
//       l.message?.toLowerCase().includes(search.toLowerCase()) ||
//       l.service?.toLowerCase().includes(search.toLowerCase());
//     return matchLevel && matchSearch;
//   });

//   return (
//     <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
//       <ToastContainer toasts={toasts} />

//       {/* Alert Banner */}
//       {alerts.filter((a) => !a.resolved).length > 0 && (
//         <div
//           style={{
//             background: "rgba(248,113,113,0.1)",
//             borderBottom: "1px solid rgba(248,113,113,0.3)",
//             padding: "8px 1.5rem",
//             display: "flex",
//             alignItems: "center",
//             gap: "8px",
//             fontSize: "13px",
//             color: "var(--danger)",
//           }}
//         >
//           <div
//             style={{
//               width: "6px",
//               height: "6px",
//               borderRadius: "50%",
//               background: "var(--danger)",
//               animation: "pulse 1s infinite",
//             }}
//           />
//           {alerts.filter((a) => !a.resolved).length} active alert
//           {alerts.filter((a) => !a.resolved).length > 1 ? "s" : ""} — services
//           experiencing high failure rates
//         </div>
//       )}

//       {/* Topbar */}
//       <div
//         style={{
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "space-between",
//           padding: "12px 1.5rem",
//           borderBottom: "1px solid var(--border)",
//           background: "var(--surface)",
//           position: "sticky",
//           top: 0,
//           zIndex: 10,
//         }}
//       >
//         <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
//           <div
//             style={{
//               width: "8px",
//               height: "8px",
//               borderRadius: "50%",
//               background: "var(--accent)",
//               animation: "pulse 2s infinite",
//             }}
//           />
//           <span style={{ fontWeight: "600", fontSize: "15px" }}>LogFlow</span>
//           <span
//             style={{
//               fontSize: "11px",
//               color: "var(--muted)",
//               marginLeft: "4px",
//             }}
//           >
//             Operations Platform
//           </span>
//         </div>

//         <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//           {isAdmin && (
//             <>
//               <button
//                 onClick={exportLogs}
//                 style={{
//                   padding: "6px 14px",
//                   fontSize: "12px",
//                   fontWeight: "500",
//                   background: "rgba(29,158,117,0.12)",
//                   color: "var(--accent)",
//                   border: "1px solid rgba(29,158,117,0.3)",
//                   borderRadius: "8px",
//                 }}
//               >
//                 Export to S3
//               </button>
//               <button
//                 onClick={triggerAlertCheck}
//                 style={{
//                   padding: "6px 14px",
//                   fontSize: "12px",
//                   fontWeight: "500",
//                   background: "rgba(248,113,113,0.12)",
//                   color: "var(--danger)",
//                   border: "1px solid rgba(248,113,113,0.3)",
//                   borderRadius: "8px",
//                 }}
//               >
//                 Trigger Alert Check
//               </button>
//             </>
//           )}

//           <span
//             style={{
//               fontSize: "12px",
//               padding: "4px 10px",
//               background: "var(--surface2)",
//               borderRadius: "6px",
//               color: isAdmin ? "var(--accent)" : "var(--info)",
//               border: "1px solid var(--border)",
//             }}
//           >
//             {auth.user.username} · {auth.user.role}
//           </span>
//           <div
//             style={{
//               width: "6px",
//               height: "6px",
//               borderRadius: "50%",
//               background: connected ? "var(--accent)" : "var(--danger)",
//             }}
//           />
//           <button
//             onClick={onLogout}
//             style={{
//               padding: "6px 14px",
//               fontSize: "13px",
//               background: "transparent",
//               border: "1px solid var(--border)",
//               borderRadius: "8px",
//               color: "var(--muted2)",
//             }}
//           >
//             Sign out
//           </button>
//         </div>
//       </div>

//       {/* Viewer Mode Banner */}
//       {!isAdmin && (
//         <div
//           style={{
//             background: "rgba(96,165,250,0.1)",
//             borderBottom: "1px solid rgba(96,165,250,0.3)",
//             padding: "10px 1.5rem",
//             display: "flex",
//             alignItems: "center",
//             gap: "10px",
//             fontSize: "13px",
//             color: "#60a5fa",
//           }}
//         >
//           <span style={{ fontSize: "16px" }}>👁</span>
//           <span>
//             You are in <strong>Read-Only Mode</strong>. Admin privileges are
//             required to resolve alerts, export logs, or send test data.
//           </span>
//         </div>
//       )}

//       <div
//         style={{
//           padding: "1.5rem",
//           display: "flex",
//           flexDirection: "column",
//           gap: "1.25rem",
//           maxWidth: "1200px",
//           margin: "0 auto",
//         }}
//       >
//         <StatCards logs={logs} alerts={alerts} />

//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "1fr 1fr",
//             gap: "1.25rem",
//           }}
//         >
//           <ServiceHealth logs={logs} />
//           <SystemHealth health={health} connected={connected} />
//         </div>

//         <Charts logs={logs} />

//         <AlertPanel alerts={alerts} onResolve={isAdmin ? resolveAlert : null} />

//         {/* Admin Controls Area */}
//         {isAdmin && (
//           <>
//             {/* Send test log */}
//             <div
//               style={{
//                 background: "var(--surface)",
//                 border: "1px solid var(--border)",
//                 borderRadius: "12px",
//                 padding: "1rem 1.25rem",
//               }}
//             >
//               <div
//                 style={{
//                   fontSize: "12px",
//                   color: "var(--muted2)",
//                   marginBottom: "10px",
//                   fontWeight: "500",
//                 }}
//               >
//                 Send test log (Admin Only)
//               </div>
//               <div
//                 style={{
//                   display: "flex",
//                   gap: "8px",
//                   flexWrap: "wrap",
//                   alignItems: "flex-end",
//                 }}
//               >
//                 {[
//                   {
//                     label: "Service",
//                     key: "service",
//                     options: [
//                       "auth-service",
//                       "payment-service",
//                       "order-service",
//                     ],
//                   },
//                   {
//                     label: "Level",
//                     key: "level",
//                     options: ["info", "error", "warn"],
//                   },
//                 ].map((f) => (
//                   <div
//                     key={f.key}
//                     style={{
//                       display: "flex",
//                       flexDirection: "column",
//                       gap: "4px",
//                     }}
//                   >
//                     <label style={{ fontSize: "11px", color: "var(--muted)" }}>
//                       {f.label}
//                     </label>
//                     <select
//                       value={sendForm[f.key]}
//                       onChange={(e) =>
//                         setSendForm((p) => ({ ...p, [f.key]: e.target.value }))
//                       }
//                       style={{
//                         padding: "8px 10px",
//                         fontSize: "13px",
//                         background: "var(--surface2)",
//                         border: "1px solid var(--border)",
//                         borderRadius: "8px",
//                         color: "var(--text)",
//                       }}
//                     >
//                       {f.options.map((o) => (
//                         <option key={o}>{o}</option>
//                       ))}
//                     </select>
//                   </div>
//                 ))}
//                 <div
//                   style={{
//                     display: "flex",
//                     flexDirection: "column",
//                     gap: "4px",
//                     flex: 1,
//                     minWidth: "180px",
//                   }}
//                 >
//                   <label style={{ fontSize: "11px", color: "var(--muted)" }}>
//                     Message
//                   </label>
//                   <input
//                     value={sendForm.message}
//                     onChange={(e) =>
//                       setSendForm((p) => ({ ...p, message: e.target.value }))
//                     }
//                     style={{
//                       padding: "8px 10px",
//                       fontSize: "13px",
//                       background: "var(--surface2)",
//                       border: "1px solid var(--border)",
//                       borderRadius: "8px",
//                       color: "var(--text)",
//                     }}
//                   />
//                 </div>
//                 <button
//                   onClick={sendLog}
//                   disabled={sending}
//                   style={{
//                     padding: "8px 18px",
//                     fontSize: "13px",
//                     fontWeight: "600",
//                     background: "var(--accent)",
//                     color: "#fff",
//                     border: "none",
//                     borderRadius: "8px",
//                     opacity: sending ? 0.6 : 1,
//                   }}
//                 >
//                   {sending ? "Sending..." : "Send"}
//                 </button>
//               </div>
//             </div>

//             {/* Rate Limit Demo Panel */}
//             <RateLimitPanel auth={auth} />
//           </>
//         )}

//         {/* Log feed with filters */}
//         <div
//           style={{
//             background: "var(--surface)",
//             border: "1px solid var(--border)",
//             borderRadius: "12px",
//             overflow: "hidden",
//           }}
//         >
//           <div
//             style={{
//               padding: "10px 1.25rem",
//               borderBottom: "1px solid var(--border)",
//               display: "flex",
//               alignItems: "center",
//               gap: "10px",
//               flexWrap: "wrap",
//             }}
//           >
//             <span
//               style={{
//                 fontSize: "12px",
//                 fontWeight: "500",
//                 color: "var(--muted2)",
//               }}
//             >
//               Live log feed
//             </span>

//             <div style={{ display: "flex", gap: "4px" }}>
//               {["ALL", "INFO", "WARN", "ERROR"].map((f) => (
//                 <button
//                   key={f}
//                   onClick={() => setLogFilter(f)}
//                   style={{
//                     padding: "4px 10px",
//                     fontSize: "11px",
//                     fontWeight: "500",
//                     borderRadius: "6px",
//                     border: "1px solid var(--border)",
//                     cursor: "pointer",
//                     background:
//                       logFilter === f
//                         ? f === "ERROR"
//                           ? "rgba(248,113,113,0.15)"
//                           : f === "WARN"
//                             ? "rgba(251,191,36,0.15)"
//                             : "rgba(29,158,117,0.15)"
//                         : "transparent",
//                     color:
//                       logFilter === f
//                         ? f === "ERROR"
//                           ? "var(--danger)"
//                           : f === "WARN"
//                             ? "var(--warn)"
//                             : "var(--accent)"
//                         : "var(--muted)",
//                   }}
//                 >
//                   {f}
//                 </button>
//               ))}
//             </div>

//             <input
//               placeholder="Search logs..."
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//               style={{
//                 padding: "5px 10px",
//                 fontSize: "12px",
//                 marginLeft: "auto",
//                 background: "var(--surface2)",
//                 border: "1px solid var(--border)",
//                 borderRadius: "8px",
//                 color: "var(--text)",
//                 width: "180px",
//               }}
//             />

//             <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
//               <div
//                 style={{
//                   width: "6px",
//                   height: "6px",
//                   borderRadius: "50%",
//                   background: connected ? "var(--accent)" : "var(--danger)",
//                   animation: connected ? "pulse 1.5s infinite" : "none",
//                 }}
//               />
//               <span style={{ fontSize: "11px", color: "var(--muted)" }}>
//                 {connected ? "live" : "offline"}
//               </span>
//             </div>
//           </div>

//           <LogFeed logs={filteredLogs} onSelectLog={setSelectedLog} />
//         </div>

//         {/* Log detail modal */}
//         {selectedLog && (
//           <div
//             onClick={() => setSelectedLog(null)}
//             style={{
//               position: "fixed",
//               inset: 0,
//               background: "rgba(0,0,0,0.7)",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               zIndex: 100,
//               padding: "1rem",
//             }}
//           >
//             <div
//               onClick={(e) => e.stopPropagation()}
//               style={{
//                 background: "var(--surface)",
//                 border: "1px solid var(--border)",
//                 borderRadius: "14px",
//                 padding: "1.5rem",
//                 maxWidth: "500px",
//                 width: "100%",
//                 animation: "fadeIn 0.2s ease",
//               }}
//             >
//               <div
//                 style={{
//                   display: "flex",
//                   justifyContent: "space-between",
//                   marginBottom: "1rem",
//                 }}
//               >
//                 <span style={{ fontWeight: "600", fontSize: "14px" }}>
//                   Log Detail
//                 </span>
//                 <button
//                   onClick={() => setSelectedLog(null)}
//                   style={{
//                     background: "none",
//                     border: "none",
//                     color: "var(--muted)",
//                     fontSize: "18px",
//                   }}
//                 >
//                   ×
//                 </button>
//               </div>
//               <pre
//                 style={{
//                   background: "var(--surface2)",
//                   borderRadius: "8px",
//                   padding: "1rem",
//                   fontSize: "12px",
//                   fontFamily: "var(--mono)",
//                   color: "var(--text)",
//                   overflow: "auto",
//                   whiteSpace: "pre-wrap",
//                   lineHeight: "1.6",
//                 }}
//               >
//                 {JSON.stringify(selectedLog, null, 2)}
//               </pre>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

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

const API = "http://localhost:8081";

export default function Dashboard({ auth, onLogout }) {
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
      if (log.level === "error") {
        addToast(`${log.service}: ${log.message}`, "error");
      }
    });

    socket.on("new-alert", (alert) => {
      setAlerts((prev) => [alert, ...prev]);
      addToast(
        `🚨 ${alert.service} alert triggered — ${alert.errorCount} errors`,
        "error",
      );
    });

    socket.on("alert-updated", (updatedAlert) => {
      setAlerts((prev) =>
        prev.map((a) => (a._id === updatedAlert._id ? updatedAlert : a)),
      );
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
      const res = await axios.get(API + "/api/logs", {
        headers: { ...headers, "Cache-Control": "no-cache" },
      });
      setLogs(res.data);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchAlerts() {
    try {
      const res = await axios.get(API + "/api/alerts", {
        headers: { ...headers, "Cache-Control": "no-cache" },
      });
      setAlerts(res.data);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchHealth() {
    try {
      const res = await axios.get(API + "/health");
      setHealth(res.data);
    } catch (e) {
      console.error(e);
    }
  }

  async function resolveAlert(id) {
    try {
      await axios.patch(API + `/api/alerts/${id}/resolve`, {}, { headers });
      setAlerts((prev) =>
        prev.map((a) => (a._id === id ? { ...a, resolved: true } : a)),
      );
      addToast("Alert resolved", "success");
    } catch (e) {
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
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  async function exportLogs() {
    try {
      await axios.post(API + "/api/export", {}, { headers });
      addToast("Logs exported to S3 successfully", "success");
    } catch (e) {
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
        addToast("No new alerts — all thresholds OK", "info");
      }
      fetchAlerts();
    } catch (e) {
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

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <ToastContainer toasts={toasts} />

      {/* Alert Banner */}
      {alerts.filter((a) => !a.resolved).length > 0 && (
        <div
          style={{
            background: "rgba(248,113,113,0.1)",
            borderBottom: "1px solid rgba(248,113,113,0.3)",
            padding: "8px 1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "13px",
            color: "var(--danger)",
          }}
        >
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "var(--danger)",
              animation: "pulse 1s infinite",
            }}
          />
          {alerts.filter((a) => !a.resolved).length} active alert
          {alerts.filter((a) => !a.resolved).length > 1 ? "s" : ""} — services
          experiencing high failure rates
        </div>
      )}

      {/* Topbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 1.5rem",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "var(--accent)",
              animation: "pulse 2s infinite",
            }}
          />
          <span style={{ fontWeight: "600", fontSize: "15px" }}>LogFlow</span>
          <span
            style={{
              fontSize: "11px",
              color: "var(--muted)",
              marginLeft: "4px",
            }}
          >
            Operations Platform
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {isAdmin && (
            <>
              <button
                onClick={exportLogs}
                style={{
                  padding: "6px 14px",
                  fontSize: "12px",
                  fontWeight: "500",
                  background: "rgba(29,158,117,0.12)",
                  color: "var(--accent)",
                  border: "1px solid rgba(29,158,117,0.3)",
                  borderRadius: "8px",
                }}
              >
                Export to S3
              </button>
              <button
                onClick={triggerAlertCheck}
                style={{
                  padding: "6px 14px",
                  fontSize: "12px",
                  fontWeight: "500",
                  background: "rgba(248,113,113,0.12)",
                  color: "var(--danger)",
                  border: "1px solid rgba(248,113,113,0.3)",
                  borderRadius: "8px",
                }}
              >
                Trigger Alert Check
              </button>
            </>
          )}

          <span
            style={{
              fontSize: "12px",
              padding: "4px 10px",
              background: "var(--surface2)",
              borderRadius: "6px",
              color: isAdmin ? "var(--accent)" : "var(--info)",
              border: "1px solid var(--border)",
            }}
          >
            {auth.user.username} · {auth.user.role}
          </span>
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: connected ? "var(--accent)" : "var(--danger)",
            }}
          />
          <button
            onClick={onLogout}
            style={{
              padding: "6px 14px",
              fontSize: "13px",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              color: "var(--muted2)",
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Viewer Mode Banner */}
      {!isAdmin && (
        <div
          style={{
            background: "rgba(96,165,250,0.1)",
            borderBottom: "1px solid rgba(96,165,250,0.3)",
            padding: "10px 1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "13px",
            color: "#60a5fa",
          }}
        >
          <span style={{ fontSize: "16px" }}>👁</span>
          <span>
            You are in <strong>Read-Only Mode</strong>. Admin privileges are
            required to resolve alerts, export logs, or send test data.
          </span>
        </div>
      )}

      <div
        style={{
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <StatCards logs={logs} alerts={alerts} />

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

        <Charts logs={logs} />

        <AlertPanel alerts={alerts} onResolve={isAdmin ? resolveAlert : null} />

        {/* PHASE 5: Deployment History (Visible to all) */}
        <DeployHistory auth={auth} />

        {/* Admin Controls Area */}
        {isAdmin && (
          <>
            {/* Send test log */}
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "1rem 1.25rem",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--muted2)",
                  marginBottom: "10px",
                  fontWeight: "500",
                }}
              >
                Send test log (Admin Only)
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                  alignItems: "flex-end",
                }}
              >
                {[
                  {
                    label: "Service",
                    key: "service",
                    options: [
                      "auth-service",
                      "payment-service",
                      "order-service",
                    ],
                  },
                  {
                    label: "Level",
                    key: "level",
                    options: ["info", "error", "warn"],
                  },
                ].map((f) => (
                  <div
                    key={f.key}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <label style={{ fontSize: "11px", color: "var(--muted)" }}>
                      {f.label}
                    </label>
                    <select
                      value={sendForm[f.key]}
                      onChange={(e) =>
                        setSendForm((p) => ({ ...p, [f.key]: e.target.value }))
                      }
                      style={{
                        padding: "8px 10px",
                        fontSize: "13px",
                        background: "var(--surface2)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        color: "var(--text)",
                      }}
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
                    gap: "4px",
                    flex: 1,
                    minWidth: "180px",
                  }}
                >
                  <label style={{ fontSize: "11px", color: "var(--muted)" }}>
                    Message
                  </label>
                  <input
                    value={sendForm.message}
                    onChange={(e) =>
                      setSendForm((p) => ({ ...p, message: e.target.value }))
                    }
                    style={{
                      padding: "8px 10px",
                      fontSize: "13px",
                      background: "var(--surface2)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      color: "var(--text)",
                    }}
                  />
                </div>
                <button
                  onClick={sendLog}
                  disabled={sending}
                  style={{
                    padding: "8px 18px",
                    fontSize: "13px",
                    fontWeight: "600",
                    background: "var(--accent)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    opacity: sending ? 0.6 : 1,
                  }}
                >
                  {sending ? "Sending..." : "Send"}
                </button>
              </div>
            </div>

            {/* Rate Limit Demo Panel */}
            <RateLimitPanel auth={auth} />

            {/* Log Retention Panel */}
            <RetentionPanel auth={auth} logs={logs} />
          </>
        )}

        {/* Log feed with filters */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "10px 1.25rem",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: "500",
                color: "var(--muted2)",
              }}
            >
              Live log feed
            </span>

            <div style={{ display: "flex", gap: "4px" }}>
              {["ALL", "INFO", "WARN", "ERROR"].map((f) => (
                <button
                  key={f}
                  onClick={() => setLogFilter(f)}
                  style={{
                    padding: "4px 10px",
                    fontSize: "11px",
                    fontWeight: "500",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                    background:
                      logFilter === f
                        ? f === "ERROR"
                          ? "rgba(248,113,113,0.15)"
                          : f === "WARN"
                            ? "rgba(251,191,36,0.15)"
                            : "rgba(29,158,117,0.15)"
                        : "transparent",
                    color:
                      logFilter === f
                        ? f === "ERROR"
                          ? "var(--danger)"
                          : f === "WARN"
                            ? "var(--warn)"
                            : "var(--accent)"
                        : "var(--muted)",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            <input
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: "5px 10px",
                fontSize: "12px",
                marginLeft: "auto",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text)",
                width: "180px",
              }}
            />

            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <div
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: connected ? "var(--accent)" : "var(--danger)",
                  animation: connected ? "pulse 1.5s infinite" : "none",
                }}
              />
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                {connected ? "live" : "offline"}
              </span>
            </div>
          </div>

          <LogFeed logs={filteredLogs} onSelectLog={setSelectedLog} />
        </div>

        {/* Log detail modal */}
        {selectedLog && (
          <div
            onClick={() => setSelectedLog(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
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
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "1.5rem",
                maxWidth: "500px",
                width: "100%",
                animation: "fadeIn 0.2s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "1rem",
                }}
              >
                <span style={{ fontWeight: "600", fontSize: "14px" }}>
                  Log Detail
                </span>
                <button
                  onClick={() => setSelectedLog(null)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--muted)",
                    fontSize: "18px",
                  }}
                >
                  ×
                </button>
              </div>
              <pre
                style={{
                  background: "var(--surface2)",
                  borderRadius: "8px",
                  padding: "1rem",
                  fontSize: "12px",
                  fontFamily: "var(--mono)",
                  color: "var(--text)",
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  lineHeight: "1.6",
                }}
              >
                {JSON.stringify(selectedLog, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}