const toastColors = {
  error: {
    bg: "rgba(248,113,113,0.15)",
    border: "rgba(248,113,113,0.4)",
    color: "#f87171",
    icon: "🚨",
  },
  success: {
    bg: "rgba(29,158,117,0.15)",
    border: "rgba(29,158,117,0.4)",
    color: "#17c790",
    icon: "✓",
  },
  info: {
    bg: "rgba(96,165,250,0.15)",
    border: "rgba(96,165,250,0.4)",
    color: "#60a5fa",
    icon: "ℹ",
  },
};

export default function ToastContainer({ toasts }) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "16px",
        right: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        zIndex: 1000,
      }}
    >
      {toasts.map((t) => {
        const tc = toastColors[t.type] || toastColors.info;
        return (
          <div
            key={t.id}
            style={{
              background: "var(--surface)",
              border: `1px solid ${tc.border}`,
              borderLeft: `3px solid ${tc.color}`,
              borderRadius: "10px",
              padding: "10px 14px",
              fontSize: "13px",
              color: "var(--text)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              animation: "slideIn 0.3s ease",
              maxWidth: "320px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}
          >
            <span style={{ color: tc.color, flexShrink: 0 }}>{tc.icon}</span>
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {t.message}
            </span>
          </div>
        );
      })}
    </div>
  );
}
