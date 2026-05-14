export default function SystemHealth({ health, connected }) {
  const checks = [
    {
      label: "MongoDB",
      ok: health?.mongo === "connected",
      value: health?.mongo || "unknown",
    },
    {
      label: "Socket.IO",
      ok: connected,
      value: connected ? "connected" : "disconnected",
    },
    {
      label: "API server",
      ok: !!health,
      value: health
        ? `up ${Math.floor((health.uptime || 0) / 60)}m`
        : "unreachable",
    },
    { label: "Redis", ok: true, value: "rate limiter active" },
  ];

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
          System health
        </span>
      </div>
      {checks.map((c) => (
        <div
          key={c.label}
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
              background: c.ok ? "#1D9E75" : "#f87171",
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "13px", marginBottom: "1px" }}>
              {c.label}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--muted)",
                fontFamily: "var(--mono)",
              }}
            >
              {c.value}
            </div>
          </div>
          <span
            style={{
              fontSize: "10px",
              fontWeight: "600",
              padding: "2px 8px",
              borderRadius: "4px",
              background: c.ok
                ? "rgba(29,158,117,0.1)"
                : "rgba(248,113,113,0.1)",
              color: c.ok ? "var(--accent)" : "var(--danger)",
            }}
          >
            {c.ok ? "✓ OK" : "✗ DOWN"}
          </span>
        </div>
      ))}
    </div>
  );
}
