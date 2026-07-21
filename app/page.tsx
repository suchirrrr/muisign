"use client";

import { useEffect, useMemo, useState } from "react";
import "./ign.css";

type Role = "leader" | "master";
type Tab = "leaderboard" | "scoring" | "availability" | "buffers" | "checklist" | "map";
type ScoreRow = { team: number; game: string; total: number; notes?: string; breakdown?: Record<string,number>; updated_at?: string };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bltyvdocczegpbkglnof.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_mKReDjUk7ZbsR8HTB5-LuQ_-zGlA0dB";
const SCORE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1JJDUz5zL-HEsCZaofq2Ycla6DSet-F4DFSQeJ90BluY/edit?usp=sharing";

const teams = Array.from({ length: 16 }, (_, i) => i + 1);

const games = [
  { id:"chapteh", country:"Malaysia", name:"Chapteh Challenge", venue:"Badminton Court 1", time:"12 min", max:40, icon:"🪶", color:"#f6c453", criteria:[["Consecutive kicks",15],["Creativity & style",10],["Teamwork",10],["Rule adherence",5]], rules:["Keep the feather shuttle in the air using feet, legs, knees or other body parts - never hands or arms.","A player cannot kick twice in a row; pass to a teammate first.","The highest consecutive streak within the session is recorded."] },
  { id:"dodo", country:"Mauritius", name:"Dodo Ring Relay", venue:"Badminton Court 1", time:"12 min", max:15, icon:"⭕", color:"#ff7b68", criteria:[["Speed",8],["Coordination",5],["Team spirit",2]], rules:["Form one circle and hold hands throughout.","Move the hoop head-to-toe through every teammate for three full rotations.","Breaking the chain applies a 3-point penalty."] },
  { id:"safari", country:"Africa", name:"Safari Train Charades", venue:"Badminton Court 1", time:"12 min", max:40, icon:"🦒", color:"#f09b45", criteria:[["Round 1",10],["Round 2",10],["Round 3",10],["Performance",10]], rules:["Stand in a line facing the same direction.","The first player sees a safari animal and silently acts it down the line.","The last player guesses; rotate positions and complete three rounds."] },
  { id:"monsoon", country:"Brunei", name:"Monsoon Winds", venue:"Badminton Court 2", time:"8 min", max:40, icon:"🎈", color:"#58aee8", criteria:[["Survival score",40]], rules:["Keep all balloons airborne without holding or catching them.","Each player may tap a balloon only once before another teammate touches it.","The Game Master adds balloons every 10-20 seconds; record final survival time."] },
  { id:"marble", country:"Indonesia", name:"Balap Kelereng", venue:"Badminton Court 2", time:"12 min", max:40, icon:"🥄", color:"#e86b59", criteria:[["Challenge completion",10],["Marble control",10],["Teamwork",10],["Rules",5],["Participation",5]], rules:["Balance a marble on a spoon while completing the assigned movement challenge.","Do not touch the marble with hands once the attempt begins.","The next teammate starts only after a successful completion."] },
  { id:"golden", country:"Myanmar", name:"Golden Line Challenge", venue:"Badminton Court 2", time:"12 min", max:40, icon:"↔️", color:"#e4a93e", criteria:[["Rounds",10],["Accuracy",10],["Teamwork",10],["Creativity",5],["Rules",5]], rules:["Arrange the full team in the announced order, such as birthday or height.","Communicate without speaking.","Signal the Game Master when ready; complete up to three challenges."] },
  { id:"island", country:"Maldives", name:"Escape the Island", venue:"Futsal Field", time:"15 min", max:40, icon:"🏝️", color:"#28b9aa", criteria:[["Balls collected",25],["Teamwork",10],["Rotation",5]], rules:["Work in pairs to guide balls from the bottom box to the top hole.","Rotate pairs after each turn.","Balls that fall into obstacle holes restart from the bottom."] },
  { id:"galaxy", country:"Sri Lanka", name:"Galaxy Escape", venue:"Futsal Field", time:"10 min", max:40, icon:"🪐", color:"#8067e8", criteria:[["Time",10],["Accuracy",15],["Completion",5],["Teamwork",10]], rules:["Navigate the rope maze without touching ropes or obstacles.","A player who touches a rope restarts from the beginning.","Teammates may guide verbally but may not alter the course."] },
  { id:"cups", country:"India × Nepal", name:"Himalayan Stack Relay", venue:"Dance Studio", time:"5 min", max:40, icon:"🥤", color:"#dc6f9e", criteria:[["Correct arrangements",40]], rules:["One player at a time recreates the cup pattern on a reference card.","The judge must confirm it before the next player begins.","Complete as many correct arrangements as possible in the time limit."] },
  { id:"art", country:"Pakistan", name:"Art Relay Challenge", venue:"Dance Studio", time:"5 min", max:40, icon:"🎨", color:"#53a66e", criteria:[["Completion",10],["Accuracy",15],["Teamwork",10],["Rules",5]], rules:["One player draws for 10-15 seconds, then passes the marker.","Waiting teammates may give verbal hints but cannot touch the drawing.","Stop immediately when time is called."] },
  { id:"blackhole", country:"Bangladesh", name:"Into the Black Hole", venue:"Dance Studio", time:"10 min", max:40, icon:"🕳️", color:"#5f6578", criteria:[["Time",10],["Accuracy",15],["Completion",5],["Teamwork",10]], rules:["Choose three players to take turns blindfolded through the course.","The team may guide using voices only.","Avoid cones, then throw the ball into the correct Black Hole bucket."] },
] as const;

const buffers = [
  { id:"scroll", name:"The Endless Scroll", country:"China", icon:"📜", venue:"Student Lounge", always:false, rules:"Draw word-sticks and build one connected story, one sentence per person." },
  { id:"medicine", name:"The Medicine Room", country:"Korea", icon:"🌿", venue:"Student Lounge", always:false, rules:"Memorise the herb chart, then select a safe prescription for the patient card." },
  { id:"colour", name:"Don't Touch the Colour", country:"Japan", icon:"🟨", venue:"Student Lounge", always:false, rules:"React within three seconds and avoid the forbidden colour or flag colours." },
  { id:"media", name:"Media Activity", country:"MUISS", icon:"📸", venue:"Media Zone", always:true, rules:"Complete the event media prompt with your team. This zone is always open." },
] as const;

const initialAvailability = Object.fromEntries([...games, ...buffers].map(g => [g.id, true]));
const slots = ["5:30", "5:45", "6:00", "6:15", "6:30", "6:45", "7:00", "7:15", "7:30", "7:45", "8:00"];

function rotation(team:number) { return slots.map((time, i) => ({ time, game:games[(team - 1 + i) % games.length] })); }

async function supabase(path:string, init?:RequestInit) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers:{ apikey:SUPABASE_KEY, Authorization:`Bearer ${SUPABASE_KEY}`, "Content-Type":"application/json", Prefer:"resolution=merge-duplicates,return=minimal", ...(init?.headers || {}) } });
  if (!response.ok) throw new Error(await response.text());
  return response.status === 204 ? null : response.json();
}

export default function Home() {
  const [role,setRole] = useState<Role>("leader");
  const [tab,setTab] = useState<Tab>("leaderboard");
  const [team,setTeam] = useState(1);
  const [scores,setScores] = useState<ScoreRow[]>([]);
  const [availability,setAvailability] = useState<Record<string,boolean>>(initialAvailability);
  const [checks,setChecks] = useState<Record<string,boolean>>({});
  const [sync,setSync] = useState("Connecting…");
  const [scoreGame,setScoreGame] = useState<string>(games[0].id);
  const [draft,setDraft] = useState<Record<string,number>>({});
  const [notes,setNotes] = useState("");
  const [saving,setSaving] = useState(false);
  const [notesReady,setNotesReady] = useState(true);

  useEffect(() => { (async()=>{ try {
    let s; try { s=await supabase("scores?select=team,game,total,notes,breakdown,updated_at"); } catch { setNotesReady(false); s=await supabase("scores?select=team,game,total,updated_at"); }
    const [a,c] = await Promise.all([supabase("game_availability?select=game,available"),supabase("checklist?select=team,game,complete")]);
    setScores(s || []); if(a?.length) setAvailability(v=>({...v,...Object.fromEntries(a.map((x:{game:string,available:boolean})=>[x.game,x.available]))}));
    if(c?.length) setChecks(Object.fromEntries(c.map((x:{team:number,game:string,complete:boolean})=>[`${x.team}-${x.game}`,x.complete]))); setSync("Live sync");
  } catch { setSync("Setup needed"); } })(); },[]);

  const leaderboard = useMemo(()=>teams.map(t=>({team:t,total:scores.filter(s=>s.team===t).reduce((n,s)=>n+s.total,0),played:scores.filter(s=>s.team===t).length})).sort((a,b)=>b.total-a.total||b.played-a.played||a.team-b.team),[scores]);
  const selectedGame = games.find(g=>g.id===scoreGame)!;
  const existingScore = scores.find(s=>s.team===team&&s.game===scoreGame);
  const draftTotal = selectedGame.criteria.reduce((n,[name,max])=>n+Math.min(max,Math.max(0,draft[name]||0)),0);
  const pages:{id:Tab;label:string;icon:string;access:"both"|Role}[] = [
    {id:"leaderboard",label:"Leaderboard",icon:"🏆",access:"both"},{id:"scoring",label:"Scoring",icon:"✦",access:"master"},{id:"availability",label:"Availability",icon:"◉",access:"both"},{id:"buffers",label:"Buffer zones",icon:"⏱",access:"leader"},{id:"checklist",label:"Checklist",icon:"✓",access:"leader"},{id:"map",label:"Map",icon:"⌖",access:"both"}
  ];
  const visiblePages=pages.filter(p=>p.access==="both"||p.access===role);
  useEffect(()=>{if(!visiblePages.some(p=>p.id===tab))setTab("leaderboard")},[role]);
  useEffect(()=>{ const saved=scores.find(s=>s.team===team&&s.game===scoreGame); setDraft(saved?.breakdown||{}); setNotes(saved?.notes||""); },[team,scoreGame,scores]);

  async function saveScore(){ if(saving)return; setSaving(true); const row={team,game:scoreGame,total:draftTotal,notes:notes.trim(),breakdown:draft,updated_at:new Date().toISOString()}; try{await supabase("scores?on_conflict=team,game",{method:"POST",body:JSON.stringify({team,game:scoreGame,total:draftTotal,updated_at:row.updated_at})});setScores(v=>[...v.filter(s=>!(s.team===team&&s.game===scoreGame)),row]);if(notesReady){try{await supabase(`scores?team=eq.${team}&game=eq.${scoreGame}`,{method:"PATCH",body:JSON.stringify({notes:row.notes,breakdown:row.breakdown,updated_at:row.updated_at})})}catch{setNotesReady(false);setSync("Score saved · notes setup needed");setSaving(false);return}}setSync(existingScore?"Score updated":"Saved live")}catch{setSync("Could not save")}finally{setSaving(false)} }
  async function resetScore(){ if(!existingScore||saving)return; setSaving(true); setScores(v=>v.filter(s=>!(s.team===team&&s.game===scoreGame))); setDraft({});setNotes("");try{await supabase(`scores?team=eq.${team}&game=eq.${scoreGame}`,{method:"DELETE"});setSync("Score reset")}catch{setSync("Could not reset")}finally{setSaving(false)} }
  async function toggleAvailability(id:string){ if(role!=="master"||id==="media")return; const available=!availability[id]; setAvailability(v=>({...v,[id]:available})); try{await supabase("game_availability?on_conflict=game",{method:"POST",body:JSON.stringify({game:id,available})});setSync("Saved live")}catch{setSync("Saved in preview")} }
  async function toggleCheck(id:string){const key=`${team}-${id}`,complete=!checks[key];setChecks(v=>({...v,[key]:complete}));try{await supabase("checklist?on_conflict=team,game",{method:"POST",body:JSON.stringify({team,game:id,complete})});setSync("Saved live")}catch{setSync("Saved in preview")} }

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">I</span><div><strong>IGN</strong><small>2026</small></div></div>
      <div className="role-switch"><button className={role==="leader"?"active":""} onClick={()=>setRole("leader")}>Team Leader</button><button className={role==="master"?"active":""} onClick={()=>setRole("master")}>Game Master</button></div>
      <nav>{visiblePages.map(p=><button key={p.id} className={tab===p.id?"active":""} onClick={()=>setTab(p.id)}><span>{p.icon}</span>{p.label}</button>)}</nav>
      <div className="event-card"><span className="live-dot"/> EVENT LIVE<strong>23 JULY · 5:30 PM</strong><small>16 teams · 15 stations</small></div>
    </aside>
    <main>
      <header className="topbar"><div><p>MUISS × SASS INTERNATIONAL GAMES NIGHT</p><h1>{pages.find(p=>p.id===tab)?.label}</h1></div><div className="header-actions"><div className="mobile-role"><button className={role==="leader"?"active":""} onClick={()=>setRole("leader")}>Leader</button><button className={role==="master"?"active":""} onClick={()=>setRole("master")}>Master</button></div><span className={`sync ${sync.includes("Live")||sync.includes("Saved")||sync.includes("updated")||sync.includes("reset")?"ok":""}`}>{sync}</span><label>Viewing team<select value={team} onChange={e=>setTeam(Number(e.target.value))}>{teams.map(t=><option key={t} value={t}>Team {String(t).padStart(2,"0")}</option>)}</select></label></div></header>

      {tab==="leaderboard"&&<section className="page"><div className="hero"><div><span className="eyebrow">THE GLOBAL CIRCUIT</span><h2>Play the world.<br/><em>Top the board.</em></h2><p>Eleven graded games. Sixteen teams. One night to remember.</p></div><div className="hero-orbit"><span>16</span><small>TEAMS</small></div></div><div className="stats"><article><span>🎮</span><div><b>11</b><small>Graded games</small></div></article><article><span>⏸</span><div><b>4</b><small>Buffer zones</small></div></article><article><span>✓</span><div><b>{scores.length}</b><small>Scores submitted</small></div></article></div><div className="panel"><div className="panel-title"><div><span className="eyebrow">LIVE RANKING</span><h3>Leaderboard</h3></div><span>Graded stations only</span></div><div className="table-wrap"><table><thead><tr><th>Rank</th><th>Team</th><th>Games</th><th>Total points</th></tr></thead><tbody>{leaderboard.map((r,i)=><tr key={r.team}><td><span className={`rank r${i+1}`}>{i+1}</span></td><td><b>Team {String(r.team).padStart(2,"0")}</b></td><td>{r.played}/11</td><td><strong>{r.total}</strong></td></tr>)}</tbody></table></div></div></section>}

      {tab==="scoring"&&<section className="page scoring-page"><div className="split"><div><div className="panel score-panel"><div className="panel-title"><div><span className="eyebrow">GAME MASTER ENTRY</span><h3>{existingScore?"Edit saved score":"Record a score"}</h3></div><span className={existingScore?"saved-pill":""}>{existingScore?`Saved: ${existingScore.total} pts`:"New result"}</span></div>{!notesReady&&<div className="schema-note">Scores will save. Run the Supabase notes upgrade to also save notes and detailed breakdowns.</div>}<div className="form-grid"><label>Team<select value={team} onChange={e=>setTeam(Number(e.target.value))}>{teams.map(t=><option key={t} value={t}>Team {String(t).padStart(2,"0")}</option>)}</select></label><label>Game<select value={scoreGame} onChange={e=>setScoreGame(e.target.value)}>{games.map(g=><option value={g.id} key={g.id}>{g.country} · {g.name}</option>)}</select></label></div><div className="criteria">{selectedGame.criteria.map(([name,max])=><label key={name}><span>{name}<small>Maximum {max}</small></span><input inputMode="numeric" aria-label={`${name} score`} type="number" min="0" max={max} value={draft[name]??""} onChange={e=>setDraft(v=>({...v,[name]:Math.min(max,Math.max(0,Number(e.target.value)))}))}/></label>)}</div><label className="notes-field"><span>Game Master notes <small>Visible in score records</small></span><textarea maxLength={500} rows={3} placeholder="Tie-break details, penalties, exceptional play…" value={notes} onChange={e=>setNotes(e.target.value)}/></label><div className="total"><span>Calculated total<small>Maximum {selectedGame.max} points</small></span><strong>{draftTotal}<i> pts</i></strong></div><div className="score-actions"><button className="primary" disabled={saving} onClick={saveScore}>{saving?"Saving…":existingScore?"Update score":"Submit score"} →</button>{existingScore&&<button className="reset" disabled={saving} onClick={resetScore}>Reset score</button>}</div><p className="duplicate-note">One result per team and game. Submitting again updates the existing result instead of adding another.</p></div></div><GameGuide game={selectedGame}/></div><ScoreRecords scores={scores} selectedGameId={scoreGame}/></section>}

      {tab==="availability"&&<section className="page"><div className="notice"><span>◉</span><div><b>Live station status</b><p>{role==="master"?"Tap a station to open or pause it. Media Activity always stays open.":"Game Masters update this board. Choose the next open station with your team."}</p></div></div><div className="station-grid">{[...games,...buffers].map(g=>{const open=availability[g.id]||g.id==="media";return <button key={g.id} className={`station ${open?"open":"closed"}`} onClick={()=>toggleAvailability(g.id)} disabled={role!=="master"||g.id==="media"}><span className="station-icon">{g.icon}</span><div><small>{"country" in g?g.country:""}</small><b>{g.name}</b><em>{g.venue}</em></div><i>{open?"OPEN":"PAUSED"}</i></button>})}</div></section>}

      {tab==="buffers"&&<section className="page"><div className="page-intro"><div><span className="eyebrow">ZERO POINTS · ALL ENERGY</span><h2>Buffer zones</h2><p>Use a buffer whenever your next station is occupied. These activities never affect the leaderboard.</p></div></div><div className="buffer-grid">{buffers.map(b=><article className={b.always?"featured":""} key={b.id}><div className="buffer-head"><span>{b.icon}</span><i>{b.always?"ALWAYS OPEN":availability[b.id]?"OPEN":"PAUSED"}</i></div><small>{b.country} · {b.venue}</small><h3>{b.name}</h3><p>{b.rules}</p><div className="ungraded">Not graded</div></article>)}</div></section>}

      {tab==="checklist"&&<section className="page"><div className="check-head"><div><span className="eyebrow">TEAM {String(team).padStart(2,"0")}</span><h2>Game checklist</h2><p>Scored games complete automatically. Mark any missing station manually.</p></div><div className="progress-ring"><strong>{games.filter(g=>scores.some(s=>s.team===team&&s.game===g.id)||checks[`${team}-${g.id}`]).length}<small>/11</small></strong></div></div><div className="checklist">{rotation(team).map((slot,i)=>{const auto=scores.some(s=>s.team===team&&s.game===slot.game.id),done=auto||checks[`${team}-${slot.game.id}`];return <button key={slot.game.id} className={done?"done":""} onClick={()=>!auto&&toggleCheck(slot.game.id)}><span className="time">{slot.time}</span><span className="check">{done?"✓":i+1}</span><span className="game-icon">{slot.game.icon}</span><span><b>{slot.game.name}</b><small>{slot.game.country} · {slot.game.venue}</small></span><em>{auto?"Scored":done?"Manual":"Next"}</em></button>})}</div></section>}

      {tab==="map"&&<section className="page"><div className="map-layout"><div className="map-card"><div className="map-title"><span>MONASH SPORTS CENTRE</span><b>International Games Night · Floor plan</b></div><div className="floor"><div className="court c1"><strong>BADMINTON COURT 1</strong><span>🪶 Chapteh</span><span>⭕ Dodo Ring</span><span>🦒 Safari Train</span></div><div className="court c2"><strong>BADMINTON COURT 2</strong><span>🎈 Monsoon Winds</span><span>🥄 Marble Race</span><span>↔️ Golden Line</span></div><div className="court futsal"><strong>FUTSAL FIELD</strong><span>🏝️ Escape the Island</span><span>🪐 Galaxy Escape</span></div><div className="court studio"><strong>DANCE STUDIO</strong><span>🥤 Cup Stack</span><span>🎨 Art Relay</span><span>🕳️ Black Hole</span></div><div className="court lounge"><strong>STUDENT LOUNGE · BUFFERS</strong><span>📜 Endless Scroll</span><span>🌿 Medicine Room</span><span>🟨 Don't Touch Colour</span></div><div className="court media"><strong>MEDIA ZONE</strong><span>📸 Always open</span></div><div className="entrance">↑ REGISTRATION & ENTRY</div></div></div><div className="route"><span className="eyebrow">TEAM {String(team).padStart(2,"0")} FLOW</span><h3>Your station order</h3>{rotation(team).map((r,i)=><div key={r.game.id}><span>{i+1}</span><p><b>{r.game.name}</b><small>{r.time} · {r.game.venue}</small></p></div>)}</div></div></section>}
    </main>
  </div>;
}

function GameGuide({game}:{game:typeof games[number]}){return <aside className="guide-card" style={{"--accent":game.color} as React.CSSProperties}><div className="guide-hero"><span>{game.icon}</span><small>{game.country}</small><h3>{game.name}</h3><p>{game.venue} · {game.time}</p></div><div className="rules"><span className="eyebrow">HOW TO PLAY</span><ol>{game.rules.map(r=><li key={r}>{r}</li>)}</ol></div></aside>}

function ScoreRecords({scores,selectedGameId}:{scores:ScoreRow[];selectedGameId:string}){
  const [filter,setFilter]=useState(selectedGameId);
  useEffect(()=>setFilter(selectedGameId),[selectedGameId]);
  const ordered=[...scores].sort((a,b)=>(b.updated_at||"").localeCompare(a.updated_at||"")||a.team-b.team);
  const visible=filter==="all"?ordered:ordered.filter(row=>row.game===filter);
  const tied=(row:ScoreRow)=>scores.some(other=>other!==row&&other.game===row.game&&other.total===row.total);
  function exportScores(){const esc=(v:unknown)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[c]!));const rows=ordered.map(row=>{const game=games.find(g=>g.id===row.game);return [row.team,game?.name||row.game,game?.country||"",row.total,game?.max||"",row.notes||"",row.updated_at||""]});const xml=`<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Scores"><Table>${[["Team","Game","Country","Score","Maximum","Notes","Updated At"],...rows].map(r=>`<Row>${r.map(v=>`<Cell><Data ss:Type="${typeof v==='number'?'Number':'String'}">${esc(v)}</Data></Cell>`).join('')}</Row>`).join('')}</Table></Worksheet></Workbook>`;const url=URL.createObjectURL(new Blob([xml],{type:"application/vnd.ms-excel"}));const a=document.createElement("a");a.href=url;a.download=`IGN-score-backup-${new Date().toISOString().slice(0,10)}.xls`;a.click();URL.revokeObjectURL(url)}
  return <section className="panel records"><div className="panel-title records-head"><div><span className="eyebrow">GAME MASTER VIEW</span><h3>Saved score records</h3></div><div className="record-tools"><select aria-label="Filter saved scores" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All games</option>{games.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select><button onClick={exportScores}>↓ Excel backup</button><a href={SCORE_SHEET_URL} target="_blank" rel="noreferrer">Open Google Sheet ↗</a></div></div><div className="record-summary"><b>{visible.length}</b> shown · {scores.length} total saved</div>{!visible.length?<p className="records-empty">No saved scores for this view yet.</p>:<div className="record-list">{visible.map(row=>{const game=games.find(g=>g.id===row.game);return <article key={`${row.team}-${row.game}`} className={tied(row)?"tie-record":""}><span className="record-icon">{game?.icon||"🎮"}</span><div><small>TEAM {String(row.team).padStart(2,"0")} · {game?.country}</small><b>{game?.name||row.game}</b>{row.notes&&<p>“{row.notes}”</p>}</div><strong>{row.total}<small>PTS</small></strong>{tied(row)&&<em>⚖ TIE</em>}</article>})}</div>}</section>
}
