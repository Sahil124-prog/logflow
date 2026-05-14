import { useState } from "react";
import axios from "axios";

const API = "http://localhost:8081";

const s = {
  screen: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg)",
    padding: "1rem",
  },
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "16px",
    padding: "2rem",
    width: "100%",
    maxWidth: "380px",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "1.5rem",
  },
  dot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "var(--accent)",
    animation: "pulse 2s infinite",
  },
  logoText: { fontSize: "20px", fontWeight: "600", color: "#fff" },
  tabs: {
    display: "flex",
    gap: "4px",
    background: "var(--surface2)",
    borderRadius: "10px",
    padding: "4px",
    marginBottom: "1.5rem",
  },
  tab: (active) => ({
    flex: 1,
    padding: "8px",
    border: "none",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "500",
    transition: "all 0.15s",
    background: active ? "var(--accent)" : "transparent",
    color: active ? "#fff" : "var(--muted2)",
  }),
  label: {
    display: "block",
    fontSize: "12px",
    color: "var(--muted2)",
    marginBottom: "6px",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    color: "var(--text)",
    fontSize: "14px",
    outline: "none",
    marginBottom: "1rem",
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    color: "var(--text)",
    fontSize: "14px",
    outline: "none",
    marginBottom: "1rem",
  },
  btn: {
    width: "100%",
    padding: "11px",
    background: "var(--accent)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    transition: "opacity 0.15s",
  },
  error: {
    background: "rgba(248,113,113,0.1)",
    border: "1px solid rgba(248,113,113,0.3)",
    borderRadius: "8px",
    padding: "10px 12px",
    fontSize: "13px",
    color: "var(--danger)",
    marginBottom: "1rem",
  },
  hint: {
    fontSize: "12px",
    color: "var(--muted)",
    textAlign: "center",
    marginTop: "1rem",
  },
};

export default function Login({ onLogin }) {
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "viewer",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.username || !form.password)
      return setError("Fill in all fields.");
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
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.screen}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      <div style={s.card}>
        <div style={s.logo}>
          <div style={s.dot} />
          <span style={s.logoText}>LogFlow</span>
        </div>

        <div style={s.tabs}>
          <button
            style={s.tab(tab === "login")}
            onClick={() => {
              setTab("login");
              setError("");
            }}
          >
            Sign in
          </button>
          <button
            style={s.tab(tab === "signup")}
            onClick={() => {
              setTab("signup");
              setError("");
            }}
          >
            Sign up
          </button>
        </div>

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={submit}>
          <label style={s.label}>Username</label>
          <input
            style={s.input}
            name="username"
            value={form.username}
            onChange={update}
            placeholder="admin"
            autoComplete="username"
          />
          <label style={s.label}>Password</label>
          <input
            style={s.input}
            name="password"
            type="password"
            value={form.password}
            onChange={update}
            placeholder="••••••••"
            autoComplete="current-password"
          />
          {tab === "signup" && (
            <>
              <label style={s.label}>Role</label>
              <select
                style={s.select}
                name="role"
                value={form.role}
                onChange={update}
              >
                <option value="viewer">Viewer — read logs only</option>
                <option value="admin">Admin — full access</option>
              </select>
            </>
          )}
          <button style={s.btn} type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : tab === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <p style={s.hint}>Default credentials: admin / admin123</p>
      </div>
    </div>
  );
}
