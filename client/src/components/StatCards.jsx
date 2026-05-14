export default function StatCards({ logs, alerts }) {
  const total = logs.length;
  const errors = logs.filter((l) => l.level === "error").length;
  const warns = logs.filter((l) => l.level === "warn").length;
  const errorRate =
    total > 0 ? ((errors / total) * 100).toFixed(1) + "%" : "0%";
  const services = [...new Set(logs.map((l) => l.service))].length;
  const activeAlerts = alerts.filter((a) => !a.resolved).length;

  const cards = [
    { label: "Total logs", value: total, sub: "all time" },
    {
      label: "Error rate",
      value: errorRate,
      sub: `${errors} errors`,
      danger: parseFloat(errorRate) > 30,
    },
    { label: "Warnings", value: warns, sub: "log entries", warn: warns > 10 },
    {
      label: "Active alerts",
      value: activeAlerts,
      sub: "need attention",
      danger: activeAlerts > 0,
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: "12px",
      }}
    >
      {cards.map((c) => (
        <div
          key={c.label}
          style={{
            background: "var(--surface)",
            border: `1px solid ${c.danger ? "rgba(248,113,113,0.3)" : c.warn ? "rgba(251,191,36,0.3)" : "var(--border)"}`,
            borderRadius: "12px",
            padding: "1rem",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "var(--muted2)",
              marginBottom: "6px",
            }}
          >
            {c.label}
          </div>
          <div
            style={{
              fontSize: "26px",
              fontWeight: "600",
              marginBottom: "4px",
              color: c.danger
                ? "var(--danger)"
                : c.warn
                  ? "var(--warn)"
                  : "#fff",
            }}
          >
            {c.value}
          </div>
          <div style={{ fontSize: "11px", color: "var(--muted)" }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
