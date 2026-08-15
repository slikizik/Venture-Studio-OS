"use client";
import { useEffect, useState } from "react";
import { useSettings } from "../settings-context";

const COMMON_TZ = ["UTC", "Africa/Johannesburg", "Europe/London", "America/New_York", "America/Los_Angeles", "Asia/Tokyo", "Australia/Sydney"];

export default function SettingsPage() {
  useSettings();
  const [displayName, setDisplayName] = useState("");
  const [timeZone, setTimeZone] = useState("UTC");
  const [retention, setRetention] = useState("30");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => {
      if (d.settings) {
        setDisplayName(d.settings.ownerDisplayName);
        setTimeZone(d.settings.ownerTimeZone);
        setRetention(String(d.settings.backupRetentionDays));
      }
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaved(false);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerDisplayName: displayName, ownerTimeZone: timeZone, backupRetentionDays: Number(retention) }),
    });
    if (!res.ok) { setError("Save failed"); return; }
    setSaved(true);
  }

  return (
    <div data-testid="settings-page">
      <h1>Settings</h1>
      <form className="card" onSubmit={save}>
        <label>Owner display name</label>
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} data-testid="owner-name" />
        <label>Timezone (NFR-008: dates stored UTC, displayed here)</label>
        <select value={timeZone} onChange={(e) => setTimeZone(e.target.value)} data-testid="owner-timezone">
          {COMMON_TZ.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <label>Backup retention (days)</label>
        <input type="number" value={retention} min={1} onChange={(e) => setRetention(e.target.value)} />
        {error && <div className="error">{error}</div>}
        {saved && <p className="muted small" data-testid="settings-saved">Saved.</p>}
        <button className="btn" style={{ marginTop: 12 }} type="submit" data-testid="settings-save">Save</button>
      </form>
      <p className="muted small">Environment: {process.env.NODE_ENV}</p>
    </div>
  );
}
