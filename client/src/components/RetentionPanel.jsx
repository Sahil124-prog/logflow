import { useState } from "react";
import axios from "axios";

const API = "http://localhost:8081";

export default function RetentionPanel({ auth, logs }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const retentionDays = 30;
  const oldLogs = logs.filter((l) => {
    const ageDays =
      (Date.now() - new Date(l.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    return ageDays > retentionDays;
  });

  async function runCleanup() {
    setRunning(true);
    setResult(null);
    try {
      const res = await axios.delete(API + "/api/logs/cleanup", {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      setResult({ deleted: res.data.deleted, success: true });
    } catch (e) {
      setResult({
        error: e.response?.data?.error || "Cleanup failed",
        success: false,
      });
    } finally {
      setRunning(false);
    }
  }

  return (
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
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "12px",
          gap: "12px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: "500",
              color: "var(--muted2)",
              marginBottom: "3px",
            }}
          >
            Log retention policy
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--muted)",
              lineHeight: "1.5",
            }}
          >
            Kubernetes CronJob runs nightly at{" "}
            <span
              style={{
                fontFamily: "var(--mono)",
                background: "var(--surface2)",
                padding: "1px 6px",
                borderRadius: "4px",
              }}
            >
              0 0 * * *
            </span>{" "}
            — deletes logs older than {retentionDays} days.{" "}
            <span style={{ color: "var(--accent)" }}>LOG_RETENTION_DAYS</span>{" "}
            is read from Kubernetes ConfigMap.
          </div>
        </div>
        {auth.user.role === "admin" && (
          <button
            onClick={runCleanup}
            disabled={running}
            style={{
              padding: "6px 14px",
              fontSize: "12px",
              fontWeight: "500",
              background: "rgba(248,113,113,0.12)",
              color: "var(--danger)",
              border: "1px solid rgba(248,113,113,0.3)",
              borderRadius: "8px",
              whiteSpace: "nowrap",
              flexShrink: 0,
              opacity: running ? 0.6 : 1,
              cursor: running ? "not-allowed" : "pointer",
            }}
          >
            {running ? "Running..." : "Run Cleanup Now"}
          </button>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "10px",
          marginBottom: result ? "12px" : "0",
        }}
      >
        {[
          { label: "Total logs", value: logs.length, color: "var(--accent)" },
          {
            label: `Older than ${retentionDays}d`,
            value: oldLogs.length,
            color: oldLogs.length > 0 ? "var(--warn)" : "var(--muted2)",
          },
          {
            label: "Retention days",
            value: retentionDays,
            color: "var(--info)",
          },
        ].map((c) => (
          <div
            key={c.label}
            style={{
              background: "var(--surface2)",
              borderRadius: "8px",
              padding: "10px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "22px",
                fontWeight: "600",
                color: c.color,
                marginBottom: "2px",
              }}
            >
              {c.value}
            </div>
            <div style={{ fontSize: "11px", color: "var(--muted)" }}>
              {c.label}
            </div>
          </div>
        ))}
      </div>

      {result && (
        <div
          style={{
            padding: "8px 12px",
            borderRadius: "8px",
            fontSize: "12px",
            background: result.success
              ? "rgba(29,158,117,0.1)"
              : "rgba(248,113,113,0.1)",
            color: result.success ? "var(--accent)" : "var(--danger)",
            border: `1px solid ${result.success ? "rgba(29,158,117,0.3)" : "rgba(248,113,113,0.3)"}`,
          }}
        >
          {result.success
            ? `✓ Cleanup complete — ${result.deleted} logs deleted`
            : `✗ ${result.error}`}
        </div>
      )}
    </div>
  );
}
