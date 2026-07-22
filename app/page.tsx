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
  { id:"tokyo", country:"Japan", name:"Tokyo Tip-Toe", venue:"Badminton Court 1", time:"12 min", max:40, icon:"🟨", color:"#f6c453", criteria:[["Rounds completed",15],["Accuracy",10],["Teamwork",10],["Rule adherence",5]], rules:["React within three seconds to each instruction.","Avoid the forbidden colour and the colours shown on the flag.","The Game Master records each correctly completed round."] },
  { id:"dodo", country:"Mauritius", name:"Dodo Ring", venue:"Badminton Court 1", time:"12 min", max:15, icon:"⭕", color:"#ff7b68", criteria:[["Speed",8],["Coordination",5],["Team spirit",2]], rules:["Form one circle and hold hands throughout.","Move the hoop head-to-toe through every teammate for three full rotations.","Breaking the chain applies a 3-point penalty."] },
  { id:"safari", country:"Africa", name:"Safari Express", venue:"Badminton Court 1", time:"12 min", max:40, icon:"🦒", color:"#f09b45", criteria:[["Round 1",10],["Round 2",10],["Round 3",10],["Performance",10]], rules:["Stand in a line facing the same direction.","The first player sees a safari animal and silently acts it down the line.","The last player guesses; rotate positions and complete three rounds."] },
  { id:"monsoon", country:"Brunei", name:"Monsoon Winds", venue:"Badminton Court 2", time:"8 min", max:40, icon:"🎈", color:"#58aee8", criteria:[["Survival score",40]], rules:["Keep all balloons airborne without holding or catching them.","Each player may tap a balloon only once before another teammate touches it.","The Game Master adds balloons every 10-20 seconds; record final survival time."] },
  { id:"marble", country:"Indonesia", name:"Balap Kelereng (Marble relay)", venue:"Badminton Court 2", time:"12 min", max:40, icon:"🥄", color:"#e86b59", criteria:[["Challenge completion",10],["Marble control",10],["Teamwork",10],["Rules",5],["Participation",5]], rules:["Balance a marble on a spoon while completing the assigned movement challenge.","Do not touch the marble with hands once the attempt begins.","The next teammate starts only after a successful completion."] },
  { id:"golden", country:"Myanmar", name:"Golden Order", venue:"Badminton Court 2", time:"12 min", max:40, icon:"↔️", color:"#e4a93e", criteria:[["Rounds",10],["Accuracy",10],["Teamwork",10],["Creativity",5],["Rules",5]], rules:["Arrange the full team in the announced order, such as birthday or height.","Communicate without speaking.","Signal the Game Master when ready; complete up to three challenges."] },
  { id:"island", country:"Maldives", name:"Escape the Island", venue:"Futsal Field", time:"15 min", max:40, icon:"🏝️", color:"#28b9aa", criteria:[["Balls collected",25],["Teamwork",10],["Rotation",5]], rules:["Work in pairs to guide balls from the bottom box to the top hole.","Rotate pairs after each turn.","Balls that fall into obstacle holes restart from the bottom."] },
  { id:"galaxy", country:"Sri Lanka", name:"Jungle Trek", venue:"Futsal Field", time:"10 min", max:40, icon:"🪐", color:"#8067e8", criteria:[["Time",10],["Accuracy",15],["Completion",5],["Teamwork",10]], rules:["Navigate the rope maze without touching ropes or obstacles.","A player who touches a rope restarts from the beginning.","Teammates may guide verbally but may not alter the course."] },
  { id:"cups", country:"India × Nepal", name:"Himalayan Hustle", venue:"Dance Studio", time:"5 min", max:40, icon:"🥤", color:"#dc6f9e", criteria:[["Correct arrangements",40]], rules:["One player at a time recreates the cup pattern on a reference card.","The judge must confirm it before the next player begins.","Complete as many correct arrangements as possible in the time limit."] },
  { id:"art", country:"Pakistan", name:"Rang-E-Pakistan", venue:"Dance Studio", time:"5 min", max:40, icon:"🎨", color:"#53a66e", criteria:[["Completion",10],["Accuracy",15],["Teamwork",10],["Rules",5]], rules:["One player draws for 10-15 seconds, then passes the marker.","Waiting teammates may give verbal hints but cannot touch the drawing.","Stop immediately when time is called."] },
  { id:"blackhole", country:"Bangladesh", name:"Delta Dash", venue:"Dance Studio", time:"10 min", max:40, icon:"🕳️", color:"#5f6578", criteria:[["Time",10],["Accuracy",15],["Completion",5],["Teamwork",10]], rules:["Choose three players to take turns blindfolded through the course.","The team may guide using voices only.","Avoid cones, then throw the ball into the correct Black Hole bucket."] },
] as const;

const buffers = [
  { id:"rally", name:"Rally Rakyat", country:"Malaysia", icon:"🪶", venue:"Student Lounge", always:false, rules:"Complete the Malaysia team activity while waiting for the next available graded station." },
  { id:"scroll", name:"The Endless Scroll", country:"China", icon:"📜", venue:"Student Lounge", always:false, rules:"Draw word-sticks and build one connected story, one sentence per person." },
  { id:"medicine", name:"The Medicine Room", country:"Korea", icon:"🌿", venue:"Student Lounge", always:false, rules:"Memorise the herb chart, then select a safe prescription for the patient card." },
  { id:"media", name:"Media Activity", country:"MUISS", icon:"📸", venue:"Media Zone", always:true, rules:"Complete the event media prompt with your team. This zone is always open." },
] as const;

const venueById:Record<string,string> = {tokyo:"Badminton Court",scroll:"Badminton Court",dodo:"Badminton Court",cups:"Badminton Court",art:"Badminton Court",safari:"Badminton Court",golden:"Badminton Court",galaxy:"Student Lounge",blackhole:"Student Lounge",medicine:"Student Lounge",rally:"Dance Studio",island:"Dance Studio",monsoon:"Dance Studio",marble:"Dance Studio",media:"Media Zone"};
const venueFor=(id:string,fallback:string)=>venueById[id]||fallback;

const flowGameIds=["tokyo","dodo","golden","safari","art","cups","galaxy","blackhole","island","monsoon","marble"];
const flowBooths=[
  ...flowGameIds.map(id=>({...games.find(game=>game.id===id)!,graded:true})),
  ...Array.from({length:5},(_,index)=>({id:`flow-buffer-${index+1}`,country:"BUFFER ZONE",name:`Buffer ${index+1}`,venue:"Buffer Zone",icon:"⏱",graded:false}))
];

const initialAvailability = Object.fromEntries([...games, ...buffers].map(g => [g.id, true]));
function rotation(team:number) { return flowBooths.map((_, i) => ({ game:flowBooths[(team - 1 + i) % flowBooths.length] })); }

async function supabase(path:string, init?:RequestInit) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers:{ apikey:SUPABASE_KEY, Authorization:`Bearer ${SUPABASE_KEY}`, "Content-Type":"application/json", Prefer:"resolution=merge-duplicates,return=minimal", ...(init?.headers || {}) } });
  const body = await response.text();
  if (!response.ok) throw new Error(body || `Supabase request failed (${response.status})`);
  return body ? JSON.parse(body) : null;
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
  const [celebrate,setCelebrate] = useState(false);
  const [notesReady,setNotesReady] = useState(true);

  useEffect(() => { (async()=>{ try {
    let s; try { s=await supabase("scores?select=team,game,total,notes,breakdown,updated_at"); } catch { setNotesReady(false); s=await supabase("scores?select=team,game,total,updated_at"); }
    const [a,c] = await Promise.all([supabase("game_availability?select=game,available"),supabase("checklist?select=team,game,complete")]);
    setScores(s || []); if(a?.length) setAvailability(v=>({...v,...Object.fromEntries(a.map((x:{game:string,available:boolean})=>[x.game,x.available]))}));
    if(c?.length) setChecks(Object.fromEntries(c.map((x:{team:number,game:string,complete:boolean})=>[`${x.team}-${x.game}`,x.complete]))); setSync("Live sync");
  } catch { setSync("Setup needed"); } })(); },[]);

  useEffect(()=>{
    const refreshScores=async()=>{try{let latest;try{latest=await supabase("scores?select=team,game,total,notes,breakdown,updated_at")}catch{latest=await supabase("scores?select=team,game,total,updated_at")}setScores(latest||[])}catch{/* Keep the last known scores during a brief connection issue. */}};
    const refreshWhenVisible=()=>{if(document.visibilityState==="visible")refreshScores()};
    const timer=window.setInterval(refreshWhenVisible,8000);
    window.addEventListener("focus",refreshWhenVisible);
    document.addEventListener("visibilitychange",refreshWhenVisible);
    return()=>{window.clearInterval(timer);window.removeEventListener("focus",refreshWhenVisible);document.removeEventListener("visibilitychange",refreshWhenVisible)};
  },[]);

  const gradedScores = useMemo(()=>scores.filter(score=>games.some(game=>game.id===score.game)),[scores]);
  const leaderboard = useMemo(()=>teams.map(t=>({team:t,total:gradedScores.filter(s=>s.team===t).reduce((n,s)=>n+s.total,0),played:gradedScores.filter(s=>s.team===t).length})).sort((a,b)=>b.total-a.total||b.played-a.played||a.team-b.team),[gradedScores]);
  const selectedGame = games.find(g=>g.id===scoreGame)!;
  const existingScore = scores.find(s=>s.team===team&&s.game===scoreGame);
  const hasDraft = Object.keys(draft).length > 0;
  const draftTotal = selectedGame.criteria.reduce((n,[name,max])=>n+Math.min(max,Math.max(0,draft[name]||0)),0);
  const pages:{id:Tab;label:string;icon:string;access:"both"|Role}[] = [
    {id:"leaderboard",label:"Leaderboard",icon:"🏆",access:"both"},{id:"scoring",label:"Scoring",icon:"✦",access:"master"},{id:"availability",label:"Availability",icon:"◉",access:"both"},{id:"buffers",label:"Buffer zones",icon:"⏱",access:"leader"},{id:"checklist",label:"Flow plan",icon:"✓",access:"both"},{id:"map",label:"Map",icon:"⌖",access:"both"}
  ];
  const visiblePages=pages.filter(p=>p.access==="both"||p.access===role);
  useEffect(()=>{if(!visiblePages.some(p=>p.id===tab))setTab("leaderboard")},[role]);
  useEffect(()=>{ setDraft({}); setNotes(""); },[team,scoreGame]);

  async function saveScore(){ if(saving||!hasDraft)return; setSaving(true); const row={team,game:scoreGame,total:draftTotal,notes:notes.trim(),breakdown:draft,updated_at:new Date().toISOString()}; try{await supabase("scores?on_conflict=team,game",{method:"POST",body:JSON.stringify({team,game:scoreGame,total:draftTotal,updated_at:row.updated_at})});setScores(v=>[...v.filter(s=>!(s.team===team&&s.game===scoreGame)),row]);let savedMessage=existingScore?"Score updated":"Saved live";if(notesReady){try{await supabase(`scores?team=eq.${team}&game=eq.${scoreGame}`,{method:"PATCH",body:JSON.stringify({notes:row.notes,breakdown:row.breakdown,updated_at:row.updated_at})})}catch{setNotesReady(false);savedMessage="Score saved · notes setup needed"}}setDraft({});setNotes("");setSync(savedMessage);setCelebrate(true);window.setTimeout(()=>setCelebrate(false),1800)}catch(error){setSync(error instanceof Error?`Could not save: ${error.message}`:"Could not save")}finally{setSaving(false)} }
  async function resetScore(){ if(!existingScore||saving)return; setSaving(true); setScores(v=>v.filter(s=>!(s.team===team&&s.game===scoreGame))); setDraft({});setNotes("");try{await supabase(`scores?team=eq.${team}&game=eq.${scoreGame}`,{method:"DELETE"});setSync("Score reset")}catch{setSync("Could not reset")}finally{setSaving(false)} }
  async function toggleAvailability(id:string){ if(role!=="master"||id==="media")return; const available=!availability[id]; setAvailability(v=>({...v,[id]:available})); try{await supabase("game_availability?on_conflict=game",{method:"POST",body:JSON.stringify({game:id,available})});setSync("Saved live")}catch{setSync("Saved in preview")} }
  async function toggleCheck(id:string){const key=`${team}-${id}`,complete=!checks[key];setChecks(v=>({...v,[key]:complete}));try{await supabase("checklist?on_conflict=team,game",{method:"POST",body:JSON.stringify({team,game:id,complete})});setSync("Saved live")}catch{setSync("Saved in preview")} }

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">I</span><div><strong>IGN</strong><small>2026</small></div></div>
      <div className="role-switch"><button className={role==="leader"?"active":""} onClick={()=>setRole("leader")}>Team Leader</button><button className={role==="master"?"active":""} onClick={()=>setRole("master")}>Game Master</button></div>
      <nav>{visiblePages.map(p=><button key={p.id} className={tab===p.id?"active":""} onClick={()=>setTab(p.id)}><span>{p.icon}</span>{p.label}</button>)}</nav>
    </aside>
    <main>
      {celebrate&&<div className="save-celebration" role="status"><span>✦</span><strong>Score saved!</strong><span>✦</span></div>}
      <header className="topbar"><div><p>MUISS × SASS INTERNATIONAL GAMES NIGHT</p><h1>{pages.find(p=>p.id===tab)?.label}</h1></div><div className="header-actions"><div className="mobile-role"><button className={role==="leader"?"active":""} onClick={()=>setRole("leader")}>Leader</button><button className={role==="master"?"active":""} onClick={()=>setRole("master")}>Master</button></div><span className={`sync ${sync.includes("Live")||sync.includes("Saved")||sync.includes("updated")||sync.includes("reset")?"ok":""}`}>{sync}</span><label>Viewing team<select value={team} onChange={e=>setTeam(Number(e.target.value))}>{teams.map(t=><option key={t} value={t}>Team {String(t).padStart(2,"0")}</option>)}</select></label></div></header>

      {tab==="leaderboard"&&<section className="page"><div className="hero"><div><span className="eyebrow">THE GLOBAL CIRCUIT</span><h2>Play the world.<br/><em>Top the board.</em></h2><p>Eleven graded games. Sixteen teams. One night to remember.</p></div><div className="hero-orbit"><span>16</span><small>TEAMS</small></div></div><div className="stats"><article><span>🎮</span><div><b>11</b><small>Graded games</small></div></article><article><span>⏸</span><div><b>5</b><small>Buffer stops</small></div></article><article><span>✓</span><div><b>{scores.length}</b><small>Scores submitted</small></div></article></div><div className="panel"><div className="panel-title"><div><span className="eyebrow">LIVE RANKING</span><h3>Leaderboard</h3></div><span>Graded stations only</span></div><div className="table-wrap"><table><thead><tr><th>Rank</th><th>Team</th><th>Games</th><th>Total points</th></tr></thead><tbody>{leaderboard.map((r,i)=><tr key={r.team}><td><span className={`rank r${i+1}`}>{i+1}</span></td><td><b>Team {String(r.team).padStart(2,"0")}</b></td><td>{r.played}/11</td><td><strong>{r.total}</strong></td></tr>)}</tbody></table></div></div></section>}

      {tab==="scoring"&&<section className="page scoring-page"><div className="split"><div><div className="panel score-panel"><div className="panel-title"><div><span className="eyebrow">GAME MASTER ENTRY</span><h3>{existingScore?"Enter a replacement score":"Record a score"}</h3></div><span className={existingScore?"saved-pill":""}>{existingScore?`Saved: ${existingScore.total} pts`:"New result"}</span></div>{!notesReady&&<div className="schema-note">Scores will save. Run the Supabase notes upgrade to also save notes and detailed breakdowns.</div>}<div className="form-grid"><label>Team<select value={team} onChange={e=>setTeam(Number(e.target.value))}>{teams.map(t=><option key={t} value={t}>Team {String(t).padStart(2,"0")}</option>)}</select></label><label>Game<select value={scoreGame} onChange={e=>setScoreGame(e.target.value)}>{games.map(g=><option value={g.id} key={g.id}>{g.country} · {g.name}</option>)}</select></label></div><div className="criteria">{selectedGame.criteria.map(([name,max])=><label key={name}><span>{name}<small>Maximum {max}</small></span><input inputMode="numeric" aria-label={`${name} score`} type="number" min="0" max={max} value={draft[name]??""} onChange={e=>setDraft(v=>({...v,[name]:Math.min(max,Math.max(0,Number(e.target.value)))}))}/></label>)}</div><label className="notes-field"><span>Game Master notes <small>Optional — may be left empty</small></span><textarea maxLength={500} rows={3} placeholder="Optional: tie-break details, penalties or exceptional play…" value={notes} onChange={e=>setNotes(e.target.value)}/></label><div className="total"><span>Calculated total<small>Maximum {selectedGame.max} points</small></span><strong>{draftTotal}<i> pts</i></strong></div><div className="score-actions"><button className="primary" disabled={saving||!hasDraft} onClick={saveScore}>{saving?"Saving…":existingScore?"Replace saved score":"Submit score"} →</button>{existingScore&&<button className="reset" disabled={saving} onClick={resetScore}>Reset score</button>}</div><p className="duplicate-note">After saving, the score fields and optional notes are cleared. The saved result remains in the records below.</p></div></div><GameGuide game={selectedGame}/></div><ScoreRecords scores={gradedScores} selectedGameId={scoreGame}/></section>}

      {tab==="availability"&&<section className="page"><div className="notice"><span>◉</span><div><b>Live station status</b><p>{role==="master"?"Tap a station to open or pause it. Media Activity always stays open.":"Game Masters update this board. Choose the next open station with your team."}</p></div></div><div className="station-grid">{[...games,...buffers].map(g=>{const open=availability[g.id]||g.id==="media";return <button key={g.id} className={`station ${open?"open":"closed"}`} onClick={()=>toggleAvailability(g.id)} disabled={role!=="master"||g.id==="media"}><span className="station-icon">{g.icon}</span><div><small>{"country" in g?g.country:""}</small><b>{g.name}</b><em>{venueFor(g.id,g.venue)}</em></div><i>{open?"OPEN":"PAUSED"}</i></button>})}</div></section>}

      {tab==="buffers"&&<section className="page"><div className="page-intro"><div><span className="eyebrow">ZERO POINTS · ALL ENERGY</span><h2>Buffer zones</h2><p>Use a buffer whenever your next station is occupied. These activities never affect the leaderboard.</p></div></div><div className="buffer-grid">{buffers.map(b=><article className={b.always?"featured":""} key={b.id}><div className="buffer-head"><span>{b.icon}</span><i>{b.always?"ALWAYS OPEN":availability[b.id]?"OPEN":"PAUSED"}</i></div><small>{b.country} · {venueFor(b.id,b.venue)}</small><h3>{b.name}</h3><p>{b.rules}</p><div className="ungraded">Not graded</div></article>)}</div></section>}

      {tab==="checklist"&&<section className="page"><div className="check-head"><div><span className="eyebrow">TEAM {String(team).padStart(2,"0")} · 16-BOOTH FLOW</span><h2>{role==="master"?"Rotation reference":"Game checklist"}</h2><p>{role==="master"?"The approved T1-T16 flow plan for the selected team. This reference is read-only.":"Follow this exact station order. Scored games complete automatically; mark buffers or missing stations manually."}</p></div>{role==="leader"&&<div className="progress-ring"><strong>{rotation(team).filter(slot=>scores.some(s=>s.team===team&&s.game===slot.game.id)||checks[`${team}-${slot.game.id}`]).length}<small>/16</small></strong></div>}</div><div className="flow-key"><span><i className="game-key"/>Graded game</span><span><i className="buffer-key"/>Buffer stop</span><span><i className="done-key"/>Completed</span></div><div className="checklist flow-list">{rotation(team).map((slot,i)=>{const auto=slot.game.graded&&scores.some(s=>s.team===team&&s.game===slot.game.id),done=auto||checks[`${team}-${slot.game.id}`];return <button key={slot.game.id} className={`${done?"done ":""}${slot.game.graded?"game-step":"buffer-step"}`} disabled={role==="master"} onClick={()=>role==="leader"&&!auto&&toggleCheck(slot.game.id)}><span className="check">{done?"✓":i+1}</span><span className="game-icon">{slot.game.icon}</span><span><b>{slot.game.name}</b><small>{slot.game.country} · {venueFor(slot.game.id,slot.game.venue)}</small></span><em>{auto?"Scored":done?"Manual":slot.game.graded?"Game":"Buffer"}</em></button>})}</div></section>}

      {tab==="map"&&<section className="page"><div className="map-layout"><div className="map-card"><div className="map-title"><span>MONASH SPORTS CENTRE</span><b>International Games Night · Floor plan</b></div><div className="actual-floor">
        <section className="venue-map"><h3>BADMINTON COURT</h3><div className="venue-grid badminton-grid"><article className="support-zone">FIRST AID</article><article><b>Japan</b><small>Tokyo Tip-Toe</small></article><article className="buffer-zone"><b>China</b><small>The Endless Scroll · Buffer</small></article><article><b>Mauritius</b><small>Dodo Ring</small></article><article className="support-zone wide-support">SUPERVISORS &amp; COMPLAINTS</article><article><b>India × Nepal</b><small>Himalayan Hustle</small></article><article><b>Pakistan</b><small>Rang-E-Pakistan</small></article><article><b>Africa</b><small>Safari Express</small></article><article><b>Myanmar</b><small>Golden Order</small></article></div></section>
        <section className="venue-map"><h3>STUDENT LOUNGE</h3><div className="venue-grid lounge-grid"><article className="large-zone"><b>Sri Lanka</b><small>Jungle Trek</small></article><article><b>Bangladesh</b><small>Delta Dash</small></article><article className="buffer-zone"><b>Korea</b><small>The Medicine Room · Buffer</small></article><article className="support-zone"><b>Registration</b></article></div></section>
        <section className="venue-map dance-map"><h3>DANCE STUDIO</h3><div className="venue-grid dance-grid"><article className="buffer-zone"><b>Malaysia</b><small>Rally Rakyat · Buffer</small></article><article><b>Maldives</b><small>Escape the Island</small></article><article><b>Brunei</b><small>Monsoon Winds</small></article><article><b>Indonesia</b><small>Balap Kelereng</small></article></div></section>
        <div className="map-legend"><span><i/> Graded game</span><span><i/> Buffer zone</span><span><i/> Support area</span></div>
      </div></div><div className="route"><span className="eyebrow">TEAM {String(team).padStart(2,"0")} FLOW</span><h3>Your station order</h3>{rotation(team).map((r,i)=><div key={r.game.id}><span>{i+1}</span><p><b>{r.game.name}</b><small>{venueFor(r.game.id,r.game.venue)}</small></p></div>)}</div></div></section>}
    </main>
  </div>;
}

function GameGuide({game}:{game:typeof games[number]}){return <aside className="guide-card" style={{"--accent":game.color} as React.CSSProperties}><div className="guide-hero"><span>{game.icon}</span><small>{game.country}</small><h3>{game.name}</h3><p>{venueFor(game.id,game.venue)}</p></div><div className="rules"><span className="eyebrow">HOW TO PLAY</span><ol>{game.rules.map(r=><li key={r}>{r}</li>)}</ol></div></aside>}

function ScoreRecords({scores,selectedGameId}:{scores:ScoreRow[];selectedGameId:string}){
  const [filter,setFilter]=useState(selectedGameId);
  useEffect(()=>setFilter(selectedGameId),[selectedGameId]);
  const ordered=[...scores].sort((a,b)=>(b.updated_at||"").localeCompare(a.updated_at||"")||a.team-b.team);
  const visible=filter==="all"?ordered:ordered.filter(row=>row.game===filter);
  const tied=(row:ScoreRow)=>scores.some(other=>other!==row&&other.game===row.game&&other.total===row.total);
  function exportScores(){const esc=(v:unknown)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[c]!));const rows=ordered.map(row=>{const game=games.find(g=>g.id===row.game);return [row.team,game?.name||row.game,game?.country||"",row.total,game?.max||"",row.notes||"",row.updated_at||""]});const xml=`<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Scores"><Table>${[["Team","Game","Country","Score","Maximum","Notes","Updated At"],...rows].map(r=>`<Row>${r.map(v=>`<Cell><Data ss:Type="${typeof v==='number'?'Number':'String'}">${esc(v)}</Data></Cell>`).join('')}</Row>`).join('')}</Table></Worksheet></Workbook>`;const url=URL.createObjectURL(new Blob([xml],{type:"application/vnd.ms-excel"}));const a=document.createElement("a");a.href=url;a.download=`IGN-score-backup-${new Date().toISOString().slice(0,10)}.xls`;a.click();URL.revokeObjectURL(url)}
  return <section className="panel records"><div className="panel-title records-head"><div><span className="eyebrow">GAME MASTER VIEW</span><h3>Saved score records</h3></div><div className="record-tools"><select aria-label="Filter saved scores" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All games</option>{games.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select><button onClick={exportScores}>↓ Excel backup</button><a href={SCORE_SHEET_URL} target="_blank" rel="noreferrer">Open Google Sheet ↗</a></div></div><div className="record-summary"><b>{visible.length}</b> shown · {scores.length} total saved</div>{!visible.length?<p className="records-empty">No saved scores for this view yet.</p>:<div className="record-list">{visible.map(row=>{const game=games.find(g=>g.id===row.game);return <article key={`${row.team}-${row.game}`} className={tied(row)?"tie-record":""}><span className="record-icon">{game?.icon||"🎮"}</span><div><small>TEAM {String(row.team).padStart(2,"0")} · {game?.country}</small><b>{game?.name||row.game}</b>{row.notes&&<p>“{row.notes}”</p>}</div><strong>{row.total}<small>PTS</small></strong>{tied(row)&&<em>⚖ TIE</em>}</article>})}</div>}</section>
}
