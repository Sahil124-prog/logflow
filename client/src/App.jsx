import { useState } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const [auth, setAuth] = useState(() => {
    const t = localStorage.getItem("lf_token");
    const u = localStorage.getItem("lf_user");
    return t && u ? { token: t, user: JSON.parse(u) } : null;
  });

  function handleLogin(token, user) {
    localStorage.setItem("lf_token", token);
    localStorage.setItem("lf_user", JSON.stringify(user));
    setAuth({ token, user });
  }

  function handleLogout() {
    localStorage.removeItem("lf_token");
    localStorage.removeItem("lf_user");
    setAuth(null);
  }

  if (!auth) return <Login onLogin={handleLogin} />;
  return <Dashboard auth={auth} onLogout={handleLogout} />;
}
