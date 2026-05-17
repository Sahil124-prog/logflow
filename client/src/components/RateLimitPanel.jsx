import { useState } from "react";
import axios from "axios";

const API = "http://localhost:8081";

export default function RateLimitPanel({ auth }) {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState([]);

  async function testRateLimit() {
    setTesting(true);
    setResults([]);
    const newResults = [];

    // Fire 5 rapid requests to trigger the sliding window limit
    for (let i = 1; i <= 5; i++) {
      try {
        await axios.post(
          API + "/api/logs",
          {
            service: "auth-service",
            level: "info",
            message: `Rate limit test request ${i}`,
            timestamp: new Date().toISOString(),
          },
          {
            headers: { Authorization: `Bearer ${auth.token}` },
          },
        );
        newResults.push({ i, status: 201, label: "Accepted" });
      } catch (e) {
        newResults.push({
          i,
          status: e.response?.status || 0,
          label: e.response?.status === 429 ? "Rate Limited" : "Error",
        });
      }
      setResults([...newResults]);
      await new Promise((r) => setTimeout(r, 150)); // Tiny delay to allow state updates
    }
    setTesting(false);
  }

  const statusColor = (s) =>
    s === 201 ? "var(--accent)" : s === 429 ? "var(--danger)" : "var(--warn)";

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
          marginBottom: results.length ? "12px" : "0",
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
            Redis rate limiter demo
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--muted)",
              lineHeight: "1.5",
            }}
          >
            100 requests per minute per service. Redis tracks a sliding window
            key{" "}
            <span
              style={{
                fontFamily: "var(--mono)",
                background: "var(--surface2)",
                padding: "1px 6px",
                borderRadius: "4px",
                fontSize: "10px",
              }}
            >
              rate:auth-service:&lt;minute&gt;
            </span>
            . Exceeding limit returns HTTP 429.
          </div>
        </div>
        <button
          onClick={testRateLimit}
          disabled={testing}
          style={{
            padding: "6px 14px",
            fontSize: "12px",
            fontWeight: "500",
            background: "rgba(251,191,36,0.12)",
            color: "var(--warn)",
            border: "1px solid rgba(251,191,36,0.3)",
            borderRadius: "8px",
            whiteSpace: "nowrap",
            flexShrink: 0,
            opacity: testing ? 0.6 : 1,
            cursor: testing ? "not-allowed" : "pointer",
          }}
        >
          {testing ? "Testing..." : "Demo Rate Limit"}
        </button>
      </div>

      {results.length > 0 && (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {results.map((r) => (
            <div
              key={r.i}
              style={{
                padding: "5px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "500",
                background: `${statusColor(r.status)}22`,
                color: statusColor(r.status),
                border: `1px solid ${statusColor(r.status)}44`,
                animation: "fadeIn 0.2s ease",
              }}
            >
              #{r.i} {r.label}{" "}
              <span style={{ opacity: 0.7, fontSize: "10px" }}>
                ({r.status})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
