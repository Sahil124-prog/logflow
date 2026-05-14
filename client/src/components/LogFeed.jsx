const levelColors = {
  info: { bg: "rgba(29,158,117,0.12)", color: "#17c790" },
  error: { bg: "rgba(248,113,113,0.12)", color: "#f87171" },
  warn: { bg: "rgba(251,191,36,0.12)", color: "#fbbf24" },
};

export default function LogFeed({ logs, onSelectLog }) {
  if (logs.length === 0)
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          fontSize: "13px",
          color: "var(--muted)",
        }}
      >
        No logs match the current filter
      </div>
    );

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "70px 120px 1fr 80px",
          gap: "8px",
          padding: "6px 1.25rem",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {["Level", "Service", "Message", "Time"].map((h) => (
          <span key={h} style={{ fontSize: "11px", color: "var(--muted)" }}>
            {h}
          </span>
        ))}
      </div>

      <div style={{ maxHeight: "320px", overflowY: "auto" }}>
        {logs.slice(0, 100).map((log, i) => {
          const lc = levelColors[log.level] || levelColors.info;
          return (
            <div
              key={log._id || i}
              onClick={() => onSelectLog(log)}
              style={{
                display: "grid",
                gridTemplateColumns: "70px 120px 1fr 80px",
                gap: "8px",
                alignItems: "center",
                padding: "7px 1.25rem",
                borderBottom: "1px solid var(--border)",
                animation: i === 0 ? "fadeIn 0.3s ease" : "none",
                fontSize: "12px",
                cursor: "pointer",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--surface2)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: "4px",
                  fontWeight: "500",
                  fontSize: "11px",
                  textAlign: "center",
                  background: lc.bg,
                  color: lc.color,
                }}
              >
                {log.level}
              </span>
              <span
                style={{
                  color: "var(--muted2)",
                  fontFamily: "var(--mono)",
                  fontSize: "11px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {log.service}
              </span>
              <span
                style={{
                  color: "var(--text)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {log.message}
              </span>
              <span
                style={{
                  color: "var(--muted)",
                  fontSize: "11px",
                  textAlign: "right",
                }}
              >
                {new Date(log.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
