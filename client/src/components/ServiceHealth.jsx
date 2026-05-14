export default function ServiceHealth({ logs }) {
  const now = Date.now();
  const recent = logs.filter(
    (l) => now - new Date(l.timestamp).getTime() < 5 * 60 * 1000,
  );

  const services = ["auth-service", "payment-service", "order-service"];

  const serviceStats = services.map((svc) => {
    const svcLogs = recent.filter((l) => l.service === svc);
    const errors = svcLogs.filter((l) => l.level === "error").length;
    const total = svcLogs.length;

    let status, color, bg, dot;
    if (total === 0) {
      status = "No data";
      color = "#64748b";
      bg = "rgba(100,116,139,0.1)";
      dot = "#64748b";
    } else if (errors >= 10) {
      status = "Critical";
      color = "#f87171";
      bg = "rgba(248,113,113,0.1)";
      dot = "#f87171";
    } else if (errors >= 5) {
      status = "Degraded";
      color = "#fbbf24";
      bg = "rgba(251,191,36,0.1)";
      dot = "#fbbf24";
    } else {
      status = "Healthy";
      color = "#1D9E75";
      bg = "rgba(29,158,117,0.1)";
      dot = "#1D9E75";
    }

    return { name: svc, status, color, bg, dot, errors, total };
  });

  return (
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
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: "500",
            color: "var(--muted2)",
          }}
        >
          Service health
        </span>
        <span
          style={{ fontSize: "11px", color: "var(--muted)", marginLeft: "8px" }}
        >
          last 5 min
        </span>
      </div>

      {serviceStats.map((s) => (
        <div
          key={s.name}
          style={{
            padding: "12px 1.25rem",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: s.dot,
              flexShrink: 0,
              animation: s.status === "Critical" ? "pulse 1s infinite" : "none",
            }}
          />
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: "13px",
                fontFamily: "var(--mono)",
                marginBottom: "2px",
              }}
            >
              {s.name}
            </div>
            <div style={{ fontSize: "11px", color: "var(--muted)" }}>
              {s.total} logs · {s.errors} errors
            </div>
          </div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: "500",
              padding: "3px 10px",
              borderRadius: "6px",
              background: s.bg,
              color: s.color,
            }}
          >
            {s.status}
          </span>
        </div>
      ))}
    </div>
  );
}
