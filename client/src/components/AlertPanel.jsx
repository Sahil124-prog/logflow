function severity(count) {
  if (count >= 50)
    return { label: "Critical", color: "#f87171", bg: "rgba(248,113,113,0.1)" };
  if (count >= 20)
    return { label: "High", color: "#fb923c", bg: "rgba(251,146,60,0.1)" };
  if (count >= 10)
    return { label: "Medium", color: "#fbbf24", bg: "rgba(251,191,36,0.1)" };
  return { label: "Low", color: "#60a5fa", bg: "rgba(96,165,250,0.1)" };
}

export default function AlertPanel({ alerts, onResolve }) {
  const active = alerts.filter((a) => !a.resolved);
  const resolved = alerts.filter((a) => a.resolved).slice(0, 5);

  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
    >
      {/* Active alerts */}
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
            gap: "8px",
          }}
        >
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "var(--danger)",
              animation: active.length > 0 ? "pulse 1s infinite" : "none",
            }}
          />
          <span
            style={{
              fontSize: "12px",
              fontWeight: "500",
              color: "var(--muted2)",
            }}
          >
            Active alerts
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: "11px",
              padding: "2px 8px",
              background:
                active.length > 0
                  ? "rgba(248,113,113,0.15)"
                  : "var(--surface2)",
              color: active.length > 0 ? "var(--danger)" : "var(--muted)",
              borderRadius: "6px",
            }}
          >
            {active.length}
          </span>
        </div>

        {active.length === 0 ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              fontSize: "13px",
              color: "var(--muted)",
            }}
          >
            No active alerts — all systems healthy
          </div>
        ) : (
          <div style={{ maxHeight: "280px", overflowY: "auto" }}>
            {active.map((a) => {
              const sev = severity(a.errorCount);
              return (
                <div
                  key={a._id}
                  style={{
                    padding: "12px 1.25rem",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    animation: "fadeIn 0.3s ease",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "4px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: "500",
                          fontFamily: "var(--mono)",
                        }}
                      >
                        {a.service}
                      </span>
                      <span
                        style={{
                          fontSize: "10px",
                          padding: "2px 7px",
                          borderRadius: "4px",
                          fontWeight: "600",
                          background: sev.bg,
                          color: sev.color,
                        }}
                      >
                        {sev.label}
                      </span>
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                      {a.errorCount} errors ·{" "}
                      {new Date(
                        a.createdAt || a.windowStart,
                      ).toLocaleTimeString()}
                    </div>
                  </div>

                  {onResolve ? (
                    <button
                      onClick={() => onResolve(a._id)}
                      style={{
                        padding: "5px 12px",
                        fontSize: "11px",
                        fontWeight: "500",
                        background: "rgba(29,158,117,0.12)",
                        color: "var(--accent)",
                        border: "1px solid rgba(29,158,117,0.3)",
                        borderRadius: "6px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Resolve
                    </button>
                  ) : (
                    <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                      Admin only
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent incidents */}
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
            Recent incidents
          </span>
        </div>

        {resolved.length === 0 ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              fontSize: "13px",
              color: "var(--muted)",
            }}
          >
            No resolved incidents yet
          </div>
        ) : (
          <div>
            {resolved.map((a) => (
              <div
                key={a._id}
                style={{
                  padding: "10px 1.25rem",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "12px",
                      fontFamily: "var(--mono)",
                      marginBottom: "2px",
                    }}
                  >
                    {a.service}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                    {a.errorCount} errors · resolved
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "11px",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    background: "rgba(29,158,117,0.1)",
                    color: "var(--accent)",
                  }}
                >
                  ✓ Resolved
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
