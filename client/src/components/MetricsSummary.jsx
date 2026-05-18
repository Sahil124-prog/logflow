import { useState, useEffect } from "react";
import axios from "axios";

const PROMETHEUS = "http://localhost:9090";

export default function MetricsSummary() {
  const [metrics, setMetrics] = useState({
    logsTotal: null,
    p95: null,
    heapMB: null,
    eventLoop: null,
    errorRate: null,
    activeAlerts: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 15000);
    return () => clearInterval(interval);
  }, []);

  async function query(expr) {
    try {
      const res = await axios.get(`${PROMETHEUS}/api/v1/query`, {
        params: { query: expr },
        timeout: 3000,
      });
      const result = res.data?.data?.result?.[0]?.value?.[1];
      return result !== undefined ? parseFloat(result) : null;
    } catch (e) {
      return null;
    }
  }

 

  async function fetchMetrics() {
    const [logsTotal, p95, heapMB, eventLoop, errorRate, activeAlerts] =
      await Promise.all([
        query("sum(logs_received_total)"),
        
        query(
          "histogram_quantile(0.95, sum by (le) (rate(api_request_duration_seconds_bucket[5m])))",
        ),
        query("nodejs_heap_size_used_bytes / 1024 / 1024"),
        query("nodejs_eventloop_lag_seconds * 1000"),
        
        query(
          "sum(rate(logs_received_total{level='error'}[5m])) / sum(rate(logs_received_total[5m])) * 100",
        ),
        query("active_alerts"),
      ]);

   
    const safeErrorRate =
      isNaN(errorRate) || !isFinite(errorRate) ? 0 : errorRate;

    setMetrics({
      logsTotal,
      p95,
      heapMB,
      eventLoop,
      errorRate: safeErrorRate,
      activeAlerts,
    });
    setLoading(false);
  }

  const cards = [
    {
      label: "Total logs ingested",
      value:
        metrics.logsTotal !== null && !isNaN(metrics.logsTotal)
          ? Math.round(metrics.logsTotal)
          : null,
      unit: "",
      query: "sum(logs_received_total)",
      color: "var(--accent)",
    },
    {
      label: "p95 response time",
      value:
        metrics.p95 !== null && !isNaN(metrics.p95)
          ? (metrics.p95 * 1000).toFixed(1)
          : null,
      unit: "ms",
      query: "histogram_quantile(0.95,...)",
      color: metrics.p95 > 0.5 ? "var(--danger)" : "var(--accent)",
    },
    {
      label: "Heap memory used",
      value:
        metrics.heapMB !== null && !isNaN(metrics.heapMB)
          ? metrics.heapMB.toFixed(1)
          : null,
      unit: "MB",
      query: "nodejs_heap_size_used_bytes",
      color: "var(--info)",
    },
    {
      label: "Event loop lag",
      value:
        metrics.eventLoop !== null && !isNaN(metrics.eventLoop)
          ? metrics.eventLoop.toFixed(2)
          : null,
      unit: "ms",
      query: "nodejs_eventloop_lag_seconds",
      color:
        metrics.eventLoop > 50
          ? "var(--danger)"
          : metrics.eventLoop > 10
            ? "var(--warn)"
            : "var(--accent)",
    },
    {
      label: "Error rate (5m)",
      value:
        metrics.errorRate !== null && !isNaN(metrics.errorRate)
          ? metrics.errorRate.toFixed(1)
          : "0.0",
      unit: "%",
      query: "rate(logs_received_total{level='error'}) / total",
      color:
        metrics.errorRate > 30
          ? "var(--danger)"
          : metrics.errorRate > 10
            ? "var(--warn)"
            : "var(--accent)",
    },
    {
      label: "Active alerts",
      value:
        metrics.activeAlerts !== null && !isNaN(metrics.activeAlerts)
          ? Math.round(metrics.activeAlerts)
          : null,
      unit: "",
      query: "active_alerts",
      color: metrics.activeAlerts > 0 ? "var(--danger)" : "var(--accent)",
    },
  ];

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
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: "500",
              color: "var(--muted2)",
              marginBottom: "2px",
            }}
          >
            Live Prometheus metrics
          </div>
          <div style={{ fontSize: "11px", color: "var(--muted)" }}>
            Queried directly from Prometheus API via PromQL — updates every 15
            seconds
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: loading ? "var(--warn)" : "var(--accent)",
              animation: "pulse 2s infinite",
            }}
          />
          <span
            style={{
              fontSize: "10px",
              padding: "2px 8px",
              borderRadius: "4px",
              background: "rgba(29,158,117,0.1)",
              color: "var(--accent)",
              border: "1px solid rgba(29,158,117,0.2)",
              fontFamily: "var(--mono)",
            }}
          >
            scrape interval: 15s
          </span>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "10px",
        }}
      >
        {cards.map((c) => (
          <div
            key={c.label}
            style={{
              background: "var(--surface2)",
              borderRadius: "8px",
              padding: "12px",
              border: "1px solid rgba(255,255,255,0.03)",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "var(--muted)",
                marginBottom: "6px",
              }}
            >
              {c.label}
            </div>
            <div
              style={{
                fontSize: "22px",
                fontWeight: "600",
                color: c.color,
                marginBottom: "4px",
              }}
            >
              {loading ? "..." : c.value !== null ? `${c.value}${c.unit}` : "—"}
            </div>
            <div
              style={{
                fontSize: "10px",
                color: "var(--muted)",
                fontFamily: "var(--mono)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={c.query}
            >
              {c.query}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
