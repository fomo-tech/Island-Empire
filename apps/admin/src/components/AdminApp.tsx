import { FormEvent, useEffect, useState } from "react";
import type { AdminOverview } from "@island/shared";
import { getOverview, loginAdmin } from "../api";

const TOKEN_KEY = "island_admin_token";

export function AdminApp() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? "");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    getOverview(token)
      .then(setOverview)
      .catch(() => {
        setOverview(null);
        setError("Không tải được dashboard. Kiểm tra server hoặc đăng nhập lại.");
      });
  }, [token]);

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await loginAdmin(String(form.get("username")), String(form.get("password")));
      localStorage.setItem(TOKEN_KEY, result.token);
      setToken(result.token);
    } catch {
      setError("Sai tài khoản hoặc mật khẩu admin.");
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setOverview(null);
  }

  if (!token) {
    return (
      <main className="admin-shell">
        <form className="login-panel" onSubmit={onLogin}>
          <h1>Island Empire Admin</h1>
          <label>
            Tài khoản
            <input name="username" autoComplete="username" required minLength={3} />
          </label>
          <label>
            Mật khẩu
            <input name="password" type="password" autoComplete="current-password" required minLength={8} />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button type="submit">Đăng nhập</button>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <section className="dashboard">
        <header>
          <div>
            <h1>Quản trị game</h1>
            <p>Theo dõi người chơi, save và hoạt động gần đây.</p>
          </div>
          <button type="button" onClick={logout}>Đăng xuất</button>
        </header>
        {error ? <p className="error">{error}</p> : null}
        <div className="metric-grid">
          <Metric label="Người chơi" value={overview?.players ?? "..."} />
          <Metric label="Bản lưu" value={overview?.saves ?? "..."} />
          <Metric label="Online 24h" value={overview?.activeToday ?? "..."} />
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
