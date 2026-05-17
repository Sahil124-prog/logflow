import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:8081";

export default function DeployHistory({ auth }) {
  const [deploys, setDeploys] = useState([]);
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    fetchDeploys();
  }, []);

  async function fetchDeploys() {
    try {
      const res = await axios.get(API + "/api/deploys", {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      setDeploys(res.data);
    } catch (e) {
      console.error(e);
    }
  }

  async function seedDeploys() {
    setSeeding(true);
    const samples = [
      { buildNumber: 1, imageTag: "logflow-api:1.0.1", status: "success" },
      { buildNumber: 2, imageTag: "logflow-api:1.0.2", status: "success" },
      { buildNumber: 3, imageTag: "logflow-api:1.0.3", status: "failed" },
      { buildNumber: 4, imageTag: "logflow-api:1.0.4", status: "success" },
    ];
    for (const d of samples) {
      try {
        await axios.post(API + "/api/deploys", d);
      } catch (e) {}
    }
    await fetchDeploys();
    setSeeding(false);
    setSeeded(true);
  }

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
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <span
            style={{
              fontSize: "12px",
              fontWeight: "500",
              color: "var(--muted2)",
            }}
          >
            Deployment history
          </span>
          <span
            style={{
              fontSize: "11px",
              color: "var(--muted)",
              marginLeft: "8px",
            }}
          >
            Jenkins pipeline builds
          </span>
        </div>
        {deploys.length === 0 && auth.user.role === "admin" && !seeded && (
          <button
            onClick={seedDeploys}
            disabled={seeding}
            style={{
              padding: "4px 12px",
              fontSize: "11px",
              fontWeight: "500",
              background: "rgba(29,158,117,0.12)",
              color: "var(--accent)",
              border: "1px solid rgba(29,158,117,0.3)",
              borderRadius: "6px",
              opacity: seeding ? 0.6 : 1,
              cursor: "pointer",
            }}
          >
            {seeding ? "Seeding..." : "Seed demo builds"}
          </button>
        )}
      </div>

      {deploys.length === 0 ? (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            fontSize: "13px",
            color: "var(--muted)",
          }}
        >
          No deployments yet — run Jenkins pipeline or click seed above
        </div>
      ) : (
        <div>
          {deploys.map((d, i) => (
            <div
              key={d._id || i}
              style={{
                padding: "10px 1.25rem",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  background:
                    d.status === "success"
                      ? "rgba(29,158,117,0.15)"
                      : "rgba(248,113,113,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  color:
                    d.status === "success" ? "var(--accent)" : "var(--danger)",
                  flexShrink: 0,
                }}
              >
                {d.status === "success" ? "✓" : "✗"}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: "13px",
                    fontFamily: "var(--mono)",
                    marginBottom: "2px",
                  }}
                >
                  Build #{d.buildNumber}
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                  {d.imageTag} · {new Date(d.deployedAt).toLocaleString()}
                </div>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  fontWeight: "500",
                  background:
                    d.status === "success"
                      ? "rgba(29,158,117,0.1)"
                      : "rgba(248,113,113,0.1)",
                  color:
                    d.status === "success" ? "var(--accent)" : "var(--danger)",
                }}
              >
                {d.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
