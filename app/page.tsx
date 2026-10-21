"use client";

import { useEffect, useMemo, useState } from "react";
import "./ign.css";

type Mode = "guest" | "master";
type Filter = "all" | "open" | "occupied";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bltyvdocczegpbkglnof.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_mKReDjUk7ZbsR8HTB5-LuQ_-zGlA0dB";

const boothGroups = [
  { name: "The Underground Casino", icon: "♠", clue: "HIGH STAKES", booths: ["A", "B"] },
  { name: "The Evidence Relay", icon: "⌁", clue: "CHAIN OF CUSTODY", booths: ["A", "B"] },
  { name: "The Forensics Lab", icon: "⌕", clue: "TRACE THE TRUTH", booths: ["A", "B"] },
  { name: "The Secret Sketch", icon: "✎", clue: "DRAW THE SUSPECT", booths: ["A", "B"] },
  { name: "The Crime Scene Memory", icon: "◉", clue: "NOTICE EVERYTHING", booths: ["A", "B"] },
  { name: "The Blind Vault Heist", icon: "◇", clue: "TRUST YOUR CREW", booths: ["A", "B"] },
  { name: "The Telephone Witness", icon: "☏", clue: "PASS THE TESTIMONY", booths: ["A", "B"] },
  { name: "The Locked Study", icon: "⚿", clue: "ESCAPE THE ROOM", booths: ["A", "B"] },
] as const;

const booths = boothGroups.flatMap((group, groupIndex) => group.booths.map((wing, wingIndex) => ({
  id: `october-booth-${String(groupIndex * 2 + wingIndex + 1).padStart(2, "0")}`,
  number: groupIndex * 2 + wingIndex + 1,
  name: group.name,
  wing,
  icon: group.icon,
  clue: group.clue,
})));

const initialAvailability = Object.fromEntries(booths.map(booth => [booth.id, true]));

async function supabase(path: string, init?: RequestInit) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal", ...(init?.headers || {}) },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(body || `Supabase request failed (${response.status})`);
  return body ? JSON.parse(body) : null;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("guest");
  const [filter, setFilter] = useState<Filter>("all");
  const [availability, setAvailability] = useState<Record<string, boolean>>(initialAvailability);
  const [sync, setSync] = useState("Connecting…");
  const [updating, setUpdating] = useState<string | null>(null);

  async function loadAvailability(silent = false) {
    if (!silent) setSync("Checking booths…");
    try {
      const rows = await supabase("game_availability?select=game,available");
      if (rows?.length) {
        const live = Object.fromEntries(rows.map((row: { game: string; available: boolean }) => [row.game, row.available]));
        setAvailability(current => ({ ...current, ...live }));
      }
      setSync("Live now");
    } catch { setSync("Connection unavailable"); }
  }

  useEffect(() => {
    loadAvailability();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") loadAvailability(true); }, 8000);
    return () => window.clearInterval(timer);
  }, []);

  async function toggleBooth(id: string) {
    if (mode !== "master" || updating) return;
    const next = !availability[id];
    setUpdating(id);
    setAvailability(current => ({ ...current, [id]: next }));
    try {
      await supabase("game_availability?on_conflict=game", { method: "POST", body: JSON.stringify({ game: id, available: next }) });
      setSync("Board updated");
    } catch {
      setAvailability(current => ({ ...current, [id]: !next }));
      setSync("Could not update");
    } finally { setUpdating(null); }
  }

  const openCount = booths.filter(booth => availability[booth.id]).length;
  const visibleBooths = useMemo(() => booths.filter(booth => filter === "open" ? availability[booth.id] : filter === "occupied" ? !availability[booth.id] : true), [filter, availability]);

  return <main className="masquerade-shell">
    <header className="masquerade-header">
      <div className="crest" aria-hidden="true"><span>☾</span></div>
      <div className="event-title"><p>MUISS × SASS · OCTOBER INTAKE</p><h1>Murder <i>Masquerade</i></h1><span>International Games Night 2026</span></div>
      <div className="mode-switch" aria-label="Viewing mode"><button className={mode === "guest" ? "active" : ""} onClick={() => setMode("guest")}>Guest view</button><button className={mode === "master" ? "active" : ""} onClick={() => setMode("master")}>Game Master</button></div>
    </header>

    <section className="availability-page">
      <div className="intro-card">
        <div className="intro-copy"><span className="kicker">CASE FILE 01 · LIVE BOOTH BOARD</span><h2>Choose your next <em>investigation.</em></h2><p>{mode === "master" ? "Tap any booth card to mark it available or occupied. Every device updates automatically." : "Find an available booth, gather your team and follow the clues. This board refreshes automatically."}</p></div>
        <div className="availability-tally" aria-label={`${openCount} of 16 booths available`}><strong>{openCount}</strong><span>of 16</span><small>available now</small></div>
        <div className="mask-mark" aria-hidden="true">◡</div>
      </div>

      <div className="board-toolbar">
        <div className="filters" aria-label="Filter booths"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All <b>16</b></button><button className={filter === "open" ? "active" : ""} onClick={() => setFilter("open")}>Available <b>{openCount}</b></button><button className={filter === "occupied" ? "active" : ""} onClick={() => setFilter("occupied")}>Occupied <b>{16 - openCount}</b></button></div>
        <button className="sync-status" onClick={() => loadAvailability()} aria-label="Refresh booth availability"><i className={sync === "Live now" || sync === "Board updated" ? "live" : ""}/>{sync}<span>↻</span></button>
      </div>

      {mode === "master" && <div className="master-note"><span>✦</span><div><b>Game Master controls are active</b><small>Tap a booth to switch its status. Changes go live for everyone.</small></div></div>}

      <div className="booth-grid">{visibleBooths.map(booth => {
        const available = availability[booth.id];
        const busy = updating === booth.id;
        return <button key={booth.id} className={`booth-card ${available ? "available" : "occupied"} ${mode === "master" ? "editable" : ""}`} onClick={() => toggleBooth(booth.id)} disabled={mode !== "master" || busy} aria-label={`${booth.name} ${booth.wing}, ${available ? "available" : "occupied"}${mode === "master" ? ", tap to change" : ""}`}>
          <span className="booth-number">{String(booth.number).padStart(2, "0")}</span><span className="booth-icon">{booth.icon}</span><span className="booth-copy"><small>{booth.clue}</small><b>{booth.name}</b><em>Booth {booth.wing}</em></span><span className="status-pill"><i/>{busy ? "Updating" : available ? "Available" : "Occupied"}</span>{mode === "master" && <span className="tap-hint">Tap to {available ? "pause" : "open"}</span>}
        </button>;
      })}</div>

      {!visibleBooths.length && <div className="empty-state"><span>⌛</span><h3>No booths in this view</h3><p>Try another filter to see the full case board.</p></div>}
      <footer><span>✦</span><p>Keep your identity concealed. Keep your evidence close.</p><span>✦</span></footer>
    </section>
  </main>;
}
