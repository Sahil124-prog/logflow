

import { useState } from "react";
import axios from "axios";

const API = "http://localhost:8081";

const injectStyles = () => {
  if (document.getElementById("logflow-login-styles")) return;
  const el = document.createElement("style");
  el.id = "logflow-login-styles";
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400&display=swap');

    :root {
      --bg:          #F7F5F0;
      --surface:     #FFFFFF;
      --surface2:    #F0EDE7;
      --surface3:    #E8E4DC;
      --border:      rgba(60,50,30,0.10);
      --border-md:   rgba(60,50,30,0.16);
      --text:        #1C1917;
      --text2:       #57534E;
      --text3:       #A8A29E;
      --accent:      #16A34A;
      --accent-bg:   #DCFCE7;
      --accent-border: rgba(22,163,74,0.25);
      --danger:      #DC2626;
      --danger-bg:   #FEF2F2;
      --danger-border: rgba(220,38,38,0.2);
      --sans: 'DM Sans', sans-serif;
      --mono: 'DM Mono', monospace;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--sans);
      background: var(--bg);
      color: var(--text);
      -webkit-font-smoothing: antialiased;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.35; }
    }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @keyframes shake {
      0%,100% { transform: translateX(0); }
      20%,60% { transform: translateX(-5px); }
      40%,80% { transform: translateX(5px); }
    }

    .lf-login-card {
      animation: fadeUp 0.3s ease both;
    }

    .lf-login-input {
      width: 100%;
      padding: 10px 12px;
      background: var(--surface2);
      border: 1px solid var(--border-md);
      border-radius: 9px;
      color: var(--text);
      font-family: var(--sans);
      font-size: 14px;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
      appearance: none;
      -webkit-appearance: none;
    }
    .lf-login-input::placeholder { color: var(--text3); }
    .lf-login-input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-bg);
      background: var(--surface);
    }

    .lf-login-select {
      width: 100%;
      padding: 10px 32px 10px 12px;
      background: var(--surface2);
      border: 1px solid var(--border-md);
      border-radius: 9px;
      color: var(--text);
      font-family: var(--sans);
      font-size: 14px;
      outline: none;
      appearance: none;
      -webkit-appearance: none;
      cursor: pointer;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2378716c' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .lf-login-select:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-bg);
    }

    .lf-submit-btn {
      width: 100%;
      padding: 11px;
      background: var(--accent);
      color: #fff;
      border: none;
      border-radius: 9px;
      font-family: var(--sans);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s, transform 0.1s;
      letter-spacing: 0.01em;
    }
    .lf-submit-btn:hover:not(:disabled) { opacity: 0.88; }
    .lf-submit-btn:active:not(:disabled) { transform: scale(0.99); }
    .lf-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .lf-tab-btn {
      flex: 1;
      padding: 8px;
      border: none;
      border-radius: 8px;
      font-family: var(--sans);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }

    .lf-error-shake { animation: shake 0.35s ease; }
  `;
  document.head.appendChild(el);
};

export default function Login({ onLogin }) {
  injectStyles();

  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "viewer",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shaking, setShaking] = useState(false);

  function update(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  }

  function switchTab(t) {
    setTab(t);
    setError("");
  }

  function triggerShake() {
    setShaking(true);
    setTimeout(() => setShaking(false), 400);
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.username || !form.password) {
      setError("Please fill in all fields.");
      triggerShake();
      return;
    }
    setLoading(true);
    try {
      const endpoint =
        tab === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await axios.post(API + endpoint, form);
      const { token, role } = res.data;
      onLogin(token, { username: form.username, role: role || "viewer" });
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Something went wrong. Is the API running?",
      );
      triggerShake();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: "1rem",
        fontFamily: "var(--sans)",
      }}
    >
      
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(60,50,30,0.06) 1px, transparent 0)`,
          backgroundSize: "28px 28px",
        }}
      />

      <div
        className={`lf-login-card${shaking ? " lf-error-shake" : ""}`}
        style={{
          position: "relative",
          zIndex: 1,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "20px",
          padding: "2rem",
          width: "100%",
          maxWidth: "380px",
          boxShadow:
            "0 4px 24px rgba(28,25,23,0.07), 0 1px 4px rgba(28,25,23,0.04)",
        }}
      >
       
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "1.75rem",
          }}
        >
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #16A34A 0%, #15803D 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M3 3h18v4H3zM3 10h12v4H3zM3 17h8v4H3z" />
            </svg>
          </div>
          <div>
            <div
              style={{
                fontWeight: "600",
                fontSize: "16px",
                lineHeight: 1.2,
                color: "var(--text)",
              }}
            >
              LogFlow
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--text3)",
                marginTop: "1px",
              }}
            >
              Operations Platform
            </div>
          </div>
          <div
            style={{
              marginLeft: "auto",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "var(--accent)",
              animation: "pulse 2s infinite",
            }}
          />
        </div>

        
        <div style={{ marginBottom: "1.5rem" }}>
          <h1
            style={{
              fontSize: "20px",
              fontWeight: "600",
              color: "var(--text)",
              lineHeight: 1.3,
            }}
          >
            {tab === "login" ? "Welcome back" : "Create account"}
          </h1>
          <p
            style={{
              fontSize: "13px",
              color: "var(--text3)",
              marginTop: "4px",
            }}
          >
            {tab === "login"
              ? "Sign in to your LogFlow workspace"
              : "Register to access the dashboard"}
          </p>
        </div>

       
        <div
          style={{
            display: "flex",
            gap: "4px",
            background: "var(--surface2)",
            borderRadius: "10px",
            padding: "4px",
            marginBottom: "1.5rem",
            border: "1px solid var(--border)",
          }}
        >
          {[
            { key: "login", label: "Sign in" },
            { key: "signup", label: "Sign up" },
          ].map(({ key, label }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                className="lf-tab-btn"
                onClick={() => switchTab(key)}
                style={{
                  background: active ? "var(--surface)" : "transparent",
                  color: active ? "var(--text)" : "var(--text3)",
                  border: active
                    ? "1px solid var(--border-md)"
                    : "1px solid transparent",
                  boxShadow: active ? "0 1px 3px rgba(28,25,23,0.06)" : "none",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {error && (
          <div
            style={{
              background: "var(--danger-bg)",
              border: "1px solid var(--danger-border)",
              borderRadius: "9px",
              padding: "10px 12px",
              fontSize: "13px",
              color: "var(--danger)",
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
            }}
          >
            <svg
              style={{ flexShrink: 0, marginTop: "1px" }}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

       
        <form onSubmit={submit}>
          
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "500",
                color: "var(--text2)",
                marginBottom: "6px",
              }}
            >
              Username
            </label>
            <input
              className="lf-login-input"
              name="username"
              value={form.username}
              onChange={update}
              placeholder="admin"
              autoComplete="username"
              autoFocus
            />
          </div>

         
          <div style={{ marginBottom: tab === "signup" ? "1rem" : "1.25rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "500",
                color: "var(--text2)",
                marginBottom: "6px",
              }}
            >
              Password
            </label>
            <input
              className="lf-login-input"
              name="password"
              type="password"
              value={form.password}
              onChange={update}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          
          {tab === "signup" && (
            <div style={{ marginBottom: "1.25rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "var(--text2)",
                  marginBottom: "6px",
                }}
              >
                Role
              </label>
              <select
                className="lf-login-select"
                name="role"
                value={form.role}
                onChange={update}
              >
                <option value="viewer">Viewer — read logs only</option>
                <option value="admin">Admin — full access</option>
              </select>
            </div>
          )}

          <button className="lf-submit-btn" type="submit" disabled={loading}>
            {loading
              ? "Please wait…"
              : tab === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
