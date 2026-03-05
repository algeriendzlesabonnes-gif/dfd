import { useEffect, useState } from "react";
import "./styles.css";

const API = "http://localhost:3001/api";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [dutyTime, setDutyTime] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (token) {
      fetch(API + "/me", { headers: { Authorization: "Bearer " + token } })
        .then(r => r.json())
        .then(setUser)
        .catch(() => setToken(null));
    }
  }, [token]);

  useEffect(() => {
    if (!user?.onDuty) return;
    const i = setInterval(() => setDutyTime(t => t + 1), 1000);
    return () => clearInterval(i);
  }, [user?.onDuty]);

  const login = async e => {
    e.preventDefault();
    setError("");
    const form = new FormData(e.target);
    const res = await fetch(API + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form))
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Login error"); return; }
    localStorage.setItem("token", data.token);
    setToken(data.token);
  };

  const toggleDuty = async () => {
    await fetch(API + "/duty/toggle", { method: "POST", headers: { Authorization: "Bearer " + token } });
    window.location.reload();
  };

  if (!token)
    return (
      <div className="login fade-in">
        <form onSubmit={login} className="glass">
          <h2>LAPD MDT</h2>
          {error && <p style={{ color: "#ff6b6b" }}>{error}</p>}
          <input name="matricule" placeholder="Matricule" required />
          <input name="password" type="password" placeholder="Mot de passe" required />
          <button className="glow">Connexion</button>
        </form>
      </div>
    );

  return (
    <div className="app fade-in">
      <aside className="sidebar">🚔 MDT</aside>
      <main>
        <div className="card glass">
          <h3>Officier</h3>
          <p>{user?.matricule}</p>
          <p>Grade: {user?.grade}</p>
          <p>Heures: {user?.totalHours?.toFixed(2)}</p>
        </div>
        <div className={`card glass ${user?.onDuty ? "pulse" : ""}`}>
          <h3>Duty Panel</h3>
          <button onClick={toggleDuty} className="glow">{user?.onDuty ? "OFF DUTY" : "ON DUTY"}</button>
          <p>Timer: {dutyTime}s</p>
        </div>
      </main>
    </div>
  );
}
