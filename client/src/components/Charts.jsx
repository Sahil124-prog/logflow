import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

const tt = {
  contentStyle: {
    background: "#1a1d27",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "8px",
    fontSize: "12px",
  },
  labelStyle: { color: "#94a3b8" },
  itemStyle: { color: "#1D9E75" },
};

export default function Charts({ logs }) {
  const serviceMap = {};
  const timeMap = {};
  const errorTimeMap = {};

  logs.forEach((l) => {
    serviceMap[l.service] = (serviceMap[l.service] || 0) + 1;
    const hour = new Date(l.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    timeMap[hour] = (timeMap[hour] || 0) + 1;
    if (l.level === "error") errorTimeMap[hour] = (errorTimeMap[hour] || 0) + 1;
  });

  const serviceData = Object.entries(serviceMap).map(([name, count]) => ({
    name: name.replace("-service", ""),
    count,
  }));

  const allTimes = [
    ...new Set([...Object.keys(timeMap), ...Object.keys(errorTimeMap)]),
  ].sort();
  const trendData = allTimes.slice(-12).map((time) => ({
    time,
    total: timeMap[time] || 0,
    errors: errorTimeMap[time] || 0,
  }));

  if (logs.length === 0) return null;

  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
    >
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
            marginBottom: "12px",
            fontWeight: "500",
          }}
        >
          Logs by service
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={serviceData} barSize={28}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip {...tt} />
            <Bar dataKey="count" fill="#1D9E75" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

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
            marginBottom: "12px",
            fontWeight: "500",
          }}
        >
          Error trend over time
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={trendData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
            />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip {...tt} />
            <Legend wrapperStyle={{ fontSize: "11px" }} />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#1D9E75"
              strokeWidth={2}
              dot={false}
              name="total"
            />
            <Line
              type="monotone"
              dataKey="errors"
              stroke="#f87171"
              strokeWidth={2}
              dot={false}
              name="errors"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
