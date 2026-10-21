"use client";

import { useEffect, useState } from "react";
import "./ign.css";

type Mode = "guest" | "master" | "map";
type Filter = "all" | "open" | "occupied";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bltyvdocczegpbkglnof.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_mKReDjUk7ZbsR8HTB5-LuQ_-zGlA0dB";

const boothGroups = [
  { name: "The Underground Casino", short: "Casino", icon: "♠", clue: "HIGH STAKES", booths: ["A", "B"] },
  { name: "The Evidence Relay", short: "Relay", icon: "⌁", clue: "CHAIN OF CUSTODY", booths: ["A", "B"] },
  { name: "The Forensics Lab", short: "Forensics", icon: "⌕", clue: "TRACE THE TRUTH", booths: ["A", "B"] },
  { name: "The Secret Sketch", short: "Sketch", icon: "✎", clue: "DRAW THE SUSPECT", booths: ["A", "B"] },
  { name: "The Crime Scene Memory", short: "Memory", icon: "◉", clue: "NOTICE EVERYTHING", booths: ["A", "B"] },
  { name: "The Blind Vault Heist", short: "Vault", icon: "◇", clue: "TRUST YOUR CREW", booths: ["A", "B"] },
  { name: "The Telephone Witness", short: "Witness", icon: "☏", clue: "PASS THE TESTIMONY", booths: ["A", "B"] },
  { name: "The Locked Study", short: "Study", icon: "⚿", clue: "ESCAPE THE ROOM", booths: ["A", "B"] },
] as const;

const booths = boothGroups.flatMap((group, groupIndex) => group.booths.map((wing, wingIndex) => ({
  id: `october-booth-${String(groupIndex * 2 + wingIndex + 1).padStart(2, "0")}`,
  number: groupIndex * 2 + wingIndex + 1,
  name: group.name,
  wing,
  icon: group.icon,
  clue: group.clue,
  short: group.short,
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
  const [assignedBoothId, setAssignedBoothId] = useState("");
  const [detailBoothId, setDetailBoothId] = useState<string | null>(null);

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
    const savedBooth = window.localStorage.getItem("murder-masquerade-booth");
    if (savedBooth && booths.some(booth => booth.id === savedBooth)) setAssignedBoothId(savedBooth);
    loadAvailability();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") loadAvailability(true); }, 8000);
    return () => window.clearInterval(timer);
  }, []);

  function assignBooth(id: string) {
    setAssignedBoothId(id);
    if (id) window.localStorage.setItem("murder-masquerade-booth", id);
    else window.localStorage.removeItem("murder-masquerade-booth");
  }

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
  const assignedBooth = booths.find(booth => booth.id === assignedBoothId);
  const visibleCases = boothGroups.map((group, index) => ({ group, index, entries: booths.filter(booth => booth.name === group.name).filter(booth => filter === "open" ? availability[booth.id] : filter === "occupied" ? !availability[booth.id] : true) })).filter(item => item.entries.length);
  const quickBooths = booths.filter(booth => filter === "open" ? availability[booth.id] : filter === "occupied" ? !availability[booth.id] : true).sort((a,b) => filter === "all" ? Number(availability[b.id]) - Number(availability[a.id]) : a.number - b.number);
  const detailBooth = booths.find(booth => booth.id === detailBoothId);

  return <main className={`crime-shell ${mode === "master" ? "control-mode" : mode === "map" ? "map-mode" : "guest-mode"}`}>
    <header className="crime-header">
      <div className="crime-brand"><span className="brand-signal">M</span><div><b>MURDER MASQUERADE</b><small>OCTOBER IGN · LIVE SYSTEM</small></div></div>
      <nav className="view-tabs" aria-label="Choose view"><button className={mode === "guest" ? "active" : ""} onClick={() => setMode("guest")}>Live board</button><button className={mode === "master" ? "active" : ""} onClick={() => setMode("master")}>My booth</button><button className={mode === "map" ? "active" : ""} onClick={() => setMode("map")}>Map</button></nav>
      <button className="header-sync" onClick={() => loadAvailability()}><i className={sync === "Live now" || sync === "Board updated" ? "live" : ""}/><span>{sync}</span><b>↻</b></button>
    </header>

    {mode !== "map" && <>{mode === "guest" ? <>
      <section className="crime-hero">
        <div className="hero-code">INCIDENT / 10.2026 / ACTIVE</div>
        <div className="hero-message"><span>NOT EVERY CLUE WANTS TO BE FOUND</span><h1>ENTER THE<br/><em>CRIME SCENE</em></h1><p>Eight investigations. Sixteen live booths. Choose an available lead before someone else gets there first.</p></div>
        <div className="hero-figure" aria-hidden="true"><div className="eyes"><i/><i/></div><span>UNKNOWN<br/>SUBJECT</span></div>
        <div className="hero-count"><strong>{openCount}</strong><span>AVAILABLE</span><small>OUT OF 16 BOOTHS</small></div>
      </section>
      <section className="briefing-strip"><span>● LIVE INTELLIGENCE</span><p>Status refreshes automatically every eight seconds.</p><b>SCROLL TO INVESTIGATE ↓</b></section>
    </> : <section className="control-hero">
      <div><span>GAME MASTER CONTROL ROOM</span><h1>Control your booth.<br/><em>Nothing else.</em></h1><p>Select your station once. This device remembers it for the rest of the event.</p></div>
      <label>YOUR ASSIGNED STATION<select value={assignedBoothId} onChange={event => assignBooth(event.target.value)}><option value="">Choose booth…</option>{booths.map(booth => <option value={booth.id} key={booth.id}>{String(booth.number).padStart(2, "0")} · {booth.name} {booth.wing}</option>)}</select></label>
    </section>}

    <section className="crime-content">
      {mode === "master" && (assignedBooth ? <section className={`my-booth ${availability[assignedBooth.id] ? "open" : "busy"}`}>
        <div className="my-booth-index"><span>STATION</span><strong>{String(assignedBooth.number).padStart(2, "0")}</strong></div><div className="my-booth-name"><small>YOUR ACTIVE CONTROL</small><h2>{assignedBooth.name}</h2><p>BOOTH {assignedBooth.wing}</p></div><div className="my-booth-status"><span>CURRENT STATE</span><strong><i/>{availability[assignedBooth.id] ? "AVAILABLE" : "OCCUPIED"}</strong></div><button disabled={updating === assignedBooth.id} onClick={() => toggleBooth(assignedBooth.id)}>{updating === assignedBooth.id ? "UPDATING…" : availability[assignedBooth.id] ? "SET TO OCCUPIED" : "SET TO AVAILABLE"}<span>→</span></button>
      </section> : <section className="select-prompt"><span>01</span><div><b>NO BOOTH SELECTED</b><p>Use the station selector above. Your control panel will appear here.</p></div></section>)}

      <div className="case-heading"><div><span>{mode === "master" ? "SECONDARY OVERVIEW" : "QUICK AVAILABILITY"}</span><h2>{mode === "master" ? "All booth activity" : "Find an open booth"}</h2></div><div className="case-filters"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>ALL / 16</button><button className={filter === "open" ? "active" : ""} onClick={() => setFilter("open")}>OPEN / {openCount}</button><button className={filter === "occupied" ? "active" : ""} onClick={() => setFilter("occupied")}>BUSY / {16-openCount}</button></div></div>

      {mode === "guest" ? <div className="quick-board">{quickBooths.map(booth => <button key={booth.id} className={availability[booth.id] ? "quick-open" : "quick-busy"} onClick={() => setDetailBoothId(booth.id)}><span className="quick-number">{String(booth.number).padStart(2,"0")}</span><i>{booth.icon}</i><b>{booth.short}</b><small>BOOTH {booth.wing}</small><em><span/>{availability[booth.id] ? "OPEN" : "BUSY"}</em></button>)}</div> : <div className="case-board">{visibleCases.map(({group,index,entries}) => <article className="case-row" key={group.name}>
        <div className="case-file"><span>CASE {String(index+1).padStart(2,"0")}</span><i>{group.icon}</i></div><div className="case-name"><small>{group.clue}</small><h3>{group.name}</h3><p>{entries.length === 2 ? "TWO PARALLEL BOOTHS" : "FILTERED RESULT"}</p></div><div className="case-wings">{entries.map(booth => {const available=availability[booth.id],busy=updating===booth.id;return <button key={booth.id} className={available ? "wing-open" : "wing-busy"} disabled={mode!=="master"||busy} onClick={()=>toggleBooth(booth.id)}><span>BOOTH {booth.wing}</span><strong><i/>{busy?"UPDATING":available?"AVAILABLE":"OCCUPIED"}</strong>{mode==="master"&&<small>TAP TO CHANGE</small>}</button>})}</div>
      </article>)}</div>}
      {(mode === "guest" ? !quickBooths.length : !visibleCases.length) && <div className="no-cases"><b>NO MATCHING CASES</b><p>Change the status filter to continue.</p></div>}
    </section>
    {detailBooth && <div className="detail-backdrop" onClick={() => setDetailBoothId(null)}><section className={`booth-detail ${availability[detailBooth.id] ? "open" : "busy"}`} onClick={event => event.stopPropagation()}><button className="detail-close" onClick={() => setDetailBoothId(null)} aria-label="Close">×</button><span className="detail-code">CASE STATION {String(detailBooth.number).padStart(2,"0")}</span><i className="detail-icon">{detailBooth.icon}</i><h2>{detailBooth.name}</h2><p>BOOTH {detailBooth.wing}</p><div><span/><strong>{availability[detailBooth.id] ? "AVAILABLE NOW" : "CURRENTLY OCCUPIED"}</strong></div><small>{availability[detailBooth.id] ? "This booth is ready for your team." : "Choose another green booth and return later."}</small></section></div>}
    </>}
    {mode === "map" && <VenueMap/>}
    <footer className="crime-footer"><span>SYSTEM ONLINE</span><p>Trust the evidence. Question everyone.</p><b>MM / 2026</b></footer>
  </main>;
}

function VenueMap(){
  const Booth=({name,wing}:{name:string,wing:"A"|"B"})=><div className={`map-booth wing-${wing.toLowerCase()}`}><small>{wing} BOOTH</small><b>{name}</b></div>;
  return <section className="map-page">
    <header className="map-intro"><span>VENUE INTELLIGENCE</span><h1>Find the crime scene.</h1><p>A booths are marked in green. B booths are marked in amber. Swipe sideways on a phone to inspect the full floor plan.</p></header>
    <div className="map-legend"><span><i className="legend-a"/> A booths · top half</span><span><i className="legend-b"/> B booths · bottom half</span><span><i className="legend-service"/> Event services</span></div>
    <div className="venue-scroll"><div className="venue-plan">
      <article className="floor badminton-floor"><h2>BADMINTON COURT</h2><div className="court-map">
        <div className="service supervisors">SUPERVISORS</div><div className="service stage">STAGE</div>
        <div className="left-a"><Booth name="Evidence Relay" wing="A"/><Booth name="Blind Vault Heist" wing="A"/><Booth name="Secret Sketch" wing="A"/><Booth name="Crime Scene" wing="A"/></div>
        <div className="right-a"><Booth name="Casino" wing="A"/><Booth name="Forensics Lab" wing="A"/></div>
        <div className="left-b"><Booth name="Evidence Relay" wing="B"/><Booth name="Blind Vault Heist" wing="B"/><Booth name="Secret Sketch" wing="B"/></div>
        <div className="right-b"><Booth name="Crime Scene" wing="B"/><Booth name="Casino" wing="B"/><Booth name="Forensics Lab" wing="B"/></div>
        <div className="service fnb">F&amp;B</div>
      </div></article>
      <article className="floor lounge-floor"><h2>STUDENT LOUNGE · SC103</h2><div className="lounge-map">
        <div className="lounge-a"><Booth name="Telephone Witness" wing="A"/><Booth name="Locked Study" wing="A"/></div>
        <div className="service registration">REGISTRATION</div>
        <div className="lounge-b"><Booth name="Telephone Witness" wing="B"/><Booth name="Locked Study" wing="B"/></div>
        <div className="service bag">BAG LOCKER</div>
      </div></article>
    </div></div>
  </section>;
}
