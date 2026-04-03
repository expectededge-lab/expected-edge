"use client";
import { useState, useMemo } from "react";

// ─── POISSON ───────────────────────────────────────────────────
function poissonPMF(k: number, l: number): number {
  if (l <= 0) return k === 0 ? 1 : 0;
  let f = 1;
  for (let i = 2; i <= k; i++) f *= i;
  return (Math.pow(l, k) * Math.exp(-l)) / f;
}

function buildScoreProbs(homeXg: number, awayXg: number, max = 4) {
  const scores: { h: number; a: number; label: string; prob: number }[] = [];
  for (let h = 0; h <= max; h++)
    for (let a = 0; a <= max; a++)
      scores.push({ h, a, label: `${h}-${a}`, prob: poissonPMF(h, homeXg) * poissonPMF(a, awayXg) });
  return scores.sort((a, b) => b.prob - a.prob);
}

// ─── GAME STATE ADJUSTMENTS ────────────────────────────────────
function adjustXg(baseXg: number, gameState: string): number {
  let multiplier = 1.0;
  if (gameState === "chasing") multiplier = 1.25;
  if (gameState === "protecting") multiplier = 0.7;
  if (gameState === "level") multiplier = 1.05;
  return Math.round(baseXg * multiplier * 100) / 100;
}

// ─── TYPES ─────────────────────────────────────────────────────
interface Fixture {
  id: number;
  home: string;
  away: string;
  league: string;
  flag: string;
  homePreXg: number;
  awayPreXg: number;
}

// ─── FIXTURES ──────────────────────────────────────────────────
const FIXTURES: Fixture[] = [
  { id: 1, home: "Arsenal", away: "Chelsea", league: "Premier League", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", homePreXg: 2.14, awayPreXg: 1.12 },
  { id: 2, home: "Liverpool", away: "Man City", league: "Premier League", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", homePreXg: 1.95, awayPreXg: 1.78 },
  { id: 3, home: "VfL Wolfsburg", away: "St. Pauli", league: "Bundesliga", flag: "🇩🇪", homePreXg: 1.75, awayPreXg: 0.92 },
  { id: 4, home: "Barcelona", away: "Atletico", league: "La Liga", flag: "🇪🇸", homePreXg: 2.31, awayPreXg: 0.95 },
  { id: 5, home: "Inter", away: "Napoli", league: "Serie A", flag: "🇮🇹", homePreXg: 1.92, awayPreXg: 1.45 },
  { id: 6, home: "Bayern", away: "Dortmund", league: "Bundesliga", flag: "🇩🇪", homePreXg: 2.42, awayPreXg: 1.22 },
  { id: 7, home: "Napoli", away: "Parma", league: "Serie A", flag: "🇮🇹", homePreXg: 2.35, awayPreXg: 0.78 },
  { id: 8, home: "Real Madrid", away: "Sevilla", league: "La Liga", flag: "🇪🇸", homePreXg: 2.55, awayPreXg: 0.88 },
];

// ─── FONTS & PALETTE ───────────────────────────────────────────
const heading = "'Oswald', 'Bebas Neue', sans-serif";
const body = "'DM Sans', sans-serif";
const mono = "'IBM Plex Mono', monospace";

const c = {
  bg: "#060A0F", surface: "#0B1018", card: "#111B28", cardHover: "#162030",
  border: "#1A2540", accent: "#00E676", accentDim: "rgba(0,230,118,0.07)",
  accentMid: "rgba(0,230,118,0.22)", gold: "#FFB800", goldDim: "rgba(255,184,0,0.07)",
  red: "#FF4060", redDim: "rgba(255,64,96,0.07)", cyan: "#00D4FF",
  cyanDim: "rgba(0,212,255,0.07)", purple: "#A78BFA", purpleDim: "rgba(167,139,250,0.07)",
  white: "#EEF2F7", text: "#9EAAB8", dim: "#4A5A6E", dimmer: "#2A3548",
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
@keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
@keyframes pulse { 0%,100% { opacity:0.5; } 50% { opacity:1; } }
@keyframes spin { to { transform:rotate(360deg); } }
@keyframes glowPulse { 0%,100% { box-shadow:0 0 20px rgba(0,230,118,0.1); } 50% { box-shadow:0 0 40px rgba(0,230,118,0.25); } }
* { box-sizing:border-box; margin:0; padding:0; }
html, body { background: ${c.bg}; }
input[type=number] { -moz-appearance:textfield; }
input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
`;

// ─── SCREENS ───────────────────────────────────────────────────
const SC = { SELECT: 0, INPUT: 1, LOADING: 2, RESULT: 3 };

export default function HalfTimeCSEngine() {
  const [screen, setScreen] = useState(SC.SELECT);
  const [match, setMatch] = useState<Fixture | null>(null);
  const [htHome, setHtHome] = useState(0);
  const [htAway, setHtAway] = useState(0);
  const [liveHomeXg, setLiveHomeXg] = useState("");
  const [liveAwayXg, setLiveAwayXg] = useState("");
  const [homeShots, setHomeShots] = useState("");
  const [awayShots, setAwayShots] = useState("");
  const [homeSot, setHomeSot] = useState("");
  const [awaySot, setAwaySot] = useState("");
  const [homePoss, setHomePoss] = useState("");
  const [awayPoss, setAwayPoss] = useState("");
  const [homeCorners, setHomeCorners] = useState("");
  const [awayCorners, setAwayCorners] = useState("");
  const [redCard, setRedCard] = useState("none");
  const [reveal, setReveal] = useState(0);
  const [loadMsg, setLoadMsg] = useState("");

  const resetInputs = () => {
    setHtHome(0); setHtAway(0); setLiveHomeXg(""); setLiveAwayXg("");
    setHomeShots(""); setAwayShots(""); setHomeSot(""); setAwaySot("");
    setHomePoss(""); setAwayPoss(""); setHomeCorners(""); setAwayCorners(""); setRedCard("none");
  };

  const selectMatch = (f: Fixture) => { setMatch(f); resetInputs(); setScreen(SC.INPUT); };
  const canGenerate = liveHomeXg !== "" && liveAwayXg !== "";

  const generate = () => {
    setReveal(0);
    setScreen(SC.LOADING);
    const msgs = ["Fetching match data...", "Building Poisson model...", "Mapping xG distributions...", "Scanning CS market...", "Detecting value gaps...", "Assembling your edge..."];
    let i = 0;
    setLoadMsg(msgs[0]);
    const iv = setInterval(() => {
      i++;
      if (i < msgs.length) { setLoadMsg(msgs[i]); }
      else {
        clearInterval(iv);
        setScreen(SC.RESULT);
        let s = 0;
        const rv = setInterval(() => { s++; setReveal(s); if (s >= 18) clearInterval(rv); }, 140);
      }
    }, 550);
  };

  const go = (s: number) => { setReveal(0); setScreen(s); };

  // ─── ANALYSIS ──────────────────────────────────────────────
  const analysis = useMemo(() => {
    if (!match || screen !== SC.RESULT) return null;
    const hXg = parseFloat(liveHomeXg) || 0;
    const aXg = parseFloat(liveAwayXg) || 0;
    const homeState = htHome > htAway ? "protecting" : htHome < htAway ? "chasing" : "level";
    const awayState = htAway > htHome ? "protecting" : htAway < htHome ? "chasing" : "level";
    const homePreRemaining = match.homePreXg * 0.55;
    const awayPreRemaining = match.awayPreXg * 0.55;
    const liveRatioHome = hXg > 0 ? hXg / (match.homePreXg * 0.45) : 0.8;
    const liveRatioAway = aXg > 0 ? aXg / (match.awayPreXg * 0.45) : 0.8;
    let home2hXg = homePreRemaining * Math.min(1.5, Math.max(0.5, liveRatioHome));
    let away2hXg = awayPreRemaining * Math.min(1.5, Math.max(0.5, liveRatioAway));
    home2hXg = adjustXg(home2hXg, homeState);
    away2hXg = adjustXg(away2hXg, awayState);
    if (redCard === "home") { home2hXg *= 0.65; away2hXg *= 1.2; }
    if (redCard === "away") { away2hXg *= 0.65; home2hXg *= 1.2; }
    home2hXg = Math.round(home2hXg * 100) / 100;
    away2hXg = Math.round(away2hXg * 100) / 100;

    const secondHalfScores = buildScoreProbs(home2hXg, away2hXg, 3);
    const ftScores = secondHalfScores.map(s => ({
      ...s, ftHome: htHome + s.h, ftAway: htAway + s.a,
      ftLabel: `${htHome + s.h}-${htAway + s.a}`,
    }));
    const ftMap: Record<string, typeof ftScores[0] & { prob: number }> = {};
    ftScores.forEach(s => {
      if (!ftMap[s.ftLabel]) ftMap[s.ftLabel] = { ...s, prob: 0 };
      ftMap[s.ftLabel].prob += s.prob;
    });
    const ftSorted = Object.values(ftMap).sort((a, b) => b.prob - a.prob);

    const planA = ftSorted.slice(0, 3);
    const planALabels = new Set(planA.map(s => s.ftLabel));
    const planBCandidates = ftSorted.filter(s => !planALabels.has(s.ftLabel));
    const planBFiltered = planBCandidates.filter(s => s.ftHome === s.ftAway || (homeState === "protecting" ? s.ftAway > s.ftHome : s.ftHome < s.ftAway)).slice(0, 2);
    const planB = planBFiltered.length > 0 ? planBFiltered : planBCandidates.slice(0, 2);

    // Over/Under
    const totalGoalsProbs: Record<number, number> = {};
    ftSorted.forEach(s => {
      const total = s.ftHome + s.ftAway;
      if (!totalGoalsProbs[total]) totalGoalsProbs[total] = 0;
      totalGoalsProbs[total] += s.prob;
    });
    const overUnderLines = [0.5, 1.5, 2.5, 3.5, 4.5].map(line => {
      let overProb = 0;
      Object.entries(totalGoalsProbs).forEach(([goals, prob]) => { if (parseFloat(goals) > line) overProb += prob; });
      return {
        line, overProb: Math.round(overProb * 1000) / 10, underProb: Math.round((1 - overProb) * 1000) / 10,
        overOdds: overProb > 0.01 ? Math.round((1 / overProb) * 100) / 100 : 99,
        underOdds: (1 - overProb) > 0.01 ? Math.round((1 / (1 - overProb)) * 100) / 100 : 99,
      };
    });

    return { hXg, aXg, home2hXg, away2hXg, homeState, awayState, ftSorted, planA, planB, overUnderLines };
  }, [screen, match, liveHomeXg, liveAwayXg, htHome, htAway, redCard]);

  const rl = (n: number) => ({ opacity: reveal >= n ? 1 : 0, transform: reveal >= n ? "translateY(0)" : "translateY(6px)", transition: "all 0.35s ease" });

  const ScoreBtn = ({ value, onChange, color }: { value: number; onChange: (v: number) => void; color: string }) => (
    <div style={{ display: "flex", alignItems: "center" }}>
      <button onClick={() => onChange(Math.max(0, value - 1))} style={{ width: 36, height: 44, background: c.card, border: `1px solid ${c.border}`, borderRadius: "8px 0 0 8px", color: c.dim, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
      <div style={{ width: 52, height: 44, background: c.surface, borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: heading, fontSize: 28, color }}>
        {value}
      </div>
      <button onClick={() => onChange(Math.min(9, value + 1))} style={{ width: 36, height: 44, background: c.card, border: `1px solid ${c.border}`, borderRadius: "0 8px 8px 0", color: c.dim, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
    </div>
  );

  const StatInput = ({ label, value, onChange, placeholder, unit }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; unit?: string }) => (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 9, color: c.dim, letterSpacing: 1.5, marginBottom: 4 }}>{label}</div>
      <div style={{ position: "relative" }}>
        <input type="text" inputMode="decimal" value={value} onChange={e => { const v = e.target.value; if (v === "" || /^[0-9]*\.?[0-9]*$/.test(v)) onChange(v); }} placeholder={placeholder}
          style={{ width: "100%", padding: "10px 12px", background: c.surface, border: `1px solid ${c.border}`, borderRadius: 6, color: c.white, fontSize: 15, fontFamily: mono, fontWeight: 600, outline: "none" }}
          onFocus={e => { e.target.style.borderColor = c.accent; }} onBlur={e => { e.target.style.borderColor = c.border; }} />
        {unit && <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: c.dim }}>{unit}</span>}
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: body, background: c.bg, color: c.text, minHeight: "100vh" }}>
      <style>{css}</style>

      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: `${c.bg}ee`, backdropFilter: "blur(16px)", borderBottom: `1px solid ${c.border}`, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        {screen !== SC.SELECT && (
          <button onClick={() => go(screen === SC.RESULT ? SC.INPUT : SC.SELECT)} style={{ background: "none", border: "none", color: c.dim, fontSize: 18, cursor: "pointer" }}>←</button>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: heading, fontSize: 16, color: c.accent, letterSpacing: 2, lineHeight: 1 }}>EXPECTED EDGE</div>
          <div style={{ fontSize: 7, color: c.dim, letterSpacing: 3 }}>HALF-TIME CS ENGINE</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, background: c.redDim, border: `1px solid ${c.red}22`, borderRadius: 4, padding: "4px 8px" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: c.red, animation: "pulse 1.5s ease infinite" }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: c.red, letterSpacing: 1, fontFamily: mono }}>HT</span>
        </div>
      </div>

      {/* SELECT */}
      {screen === SC.SELECT && (
        <div style={{ padding: "0 16px 80px", animation: "fadeIn 0.3s ease" }}>
          <div style={{ padding: "28px 0 20px", textAlign: "center", borderBottom: `1px solid ${c.border}`, marginBottom: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", margin: "0 auto 14px", background: `linear-gradient(135deg, ${c.accent}, #00B860)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, animation: "glowPulse 3s ease infinite" }}>⏸</div>
            <h1 style={{ fontFamily: heading, fontSize: 28, color: c.white, letterSpacing: 3, marginBottom: 6 }}>HALF-TIME EDGE</h1>
            <p style={{ fontSize: 13, color: c.dim, lineHeight: 1.5, maxWidth: 300, margin: "0 auto" }}>The market overreacts at half-time. Your xG data finds the value. Select a live match.</p>
          </div>
          {FIXTURES.map((f, i) => (
            <button key={f.id} onClick={() => selectMatch(f)} style={{ width: "100%", background: c.card, border: `1px solid ${c.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 8, cursor: "pointer", textAlign: "left", fontFamily: body, animation: `fadeIn 0.3s ease ${i * 0.05}s both`, transition: "all 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c.accent; (e.currentTarget as HTMLElement).style.background = c.cardHover; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = c.border; (e.currentTarget as HTMLElement).style.background = c.card; }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><span style={{ fontSize: 14, fontWeight: 700, color: c.white }}>{f.home}</span><span style={{ color: c.dim, margin: "0 6px", fontSize: 12 }}>vs</span><span style={{ fontSize: 14, fontWeight: 700, color: c.white }}>{f.away}</span></div>
                <span style={{ fontSize: 12 }}>{f.flag}</span>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 11 }}>
                <span style={{ color: c.dim }}>{f.league}</span>
                <span style={{ color: c.accent }}>xG {f.homePreXg}</span>
                <span style={{ color: c.cyan }}>xG {f.awayPreXg}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* INPUT */}
      {screen === SC.INPUT && match && (
        <div style={{ padding: "0 16px 80px", animation: "fadeIn 0.3s ease" }}>
          <div style={{ padding: "20px 0", textAlign: "center", borderBottom: `1px solid ${c.border}`, marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: c.dim, letterSpacing: 2 }}>{match.flag} {match.league}</div>
            <div style={{ fontFamily: heading, fontSize: 24, color: c.white, letterSpacing: 2, marginTop: 4 }}>{match.home} vs {match.away}</div>
            <div style={{ fontSize: 11, color: c.red, fontFamily: mono, marginTop: 6, fontWeight: 600 }}>⏸ HALF-TIME — Enter live data below</div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, color: c.dim, letterSpacing: 2, marginBottom: 12, textAlign: "center" }}>HALF-TIME SCORE</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 12, color: c.accent, fontWeight: 600, marginBottom: 6 }}>{match.home}</div>
                <ScoreBtn value={htHome} onChange={setHtHome} color={c.accent} />
              </div>
              <div style={{ fontFamily: heading, fontSize: 24, color: c.dimmer, marginTop: 18 }}>—</div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 12, color: c.cyan, fontWeight: 600, marginBottom: 6 }}>{match.away}</div>
                <ScoreBtn value={htAway} onChange={setHtAway} color={c.cyan} />
              </div>
            </div>
          </div>

          <div style={{ background: c.accentDim, border: `1px solid ${c.accent}22`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: c.accent, letterSpacing: 2, marginBottom: 10, fontWeight: 600 }}>⚡ LIVE xG (REQUIRED)</div>
            <div style={{ display: "flex", gap: 10 }}>
              <StatInput label={match.home.toUpperCase()} value={liveHomeXg} onChange={setLiveHomeXg} placeholder="e.g. 1.24" unit="xG" />
              <StatInput label={match.away.toUpperCase()} value={liveAwayXg} onChange={setLiveAwayXg} placeholder="e.g. 0.35" unit="xG" />
            </div>
          </div>

          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: c.dim, letterSpacing: 2, marginBottom: 10 }}>📊 SHOTS</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <StatInput label={`${match.home} TOTAL`} value={homeShots} onChange={setHomeShots} placeholder="—" />
              <StatInput label={`${match.away} TOTAL`} value={awayShots} onChange={setAwayShots} placeholder="—" />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <StatInput label={`${match.home} ON TARGET`} value={homeSot} onChange={setHomeSot} placeholder="—" />
              <StatInput label={`${match.away} ON TARGET`} value={awaySot} onChange={setAwaySot} placeholder="—" />
            </div>
          </div>

          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: c.dim, letterSpacing: 2, marginBottom: 10 }}>📈 POSSESSION & CORNERS</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <StatInput label={`${match.home} POSS`} value={homePoss} onChange={setHomePoss} placeholder="—" unit="%" />
              <StatInput label={`${match.away} POSS`} value={awayPoss} onChange={setAwayPoss} placeholder="—" unit="%" />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <StatInput label={`${match.home} CRN`} value={homeCorners} onChange={setHomeCorners} placeholder="—" />
              <StatInput label={`${match.away} CRN`} value={awayCorners} onChange={setAwayCorners} placeholder="—" />
            </div>
          </div>

          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 10, padding: 16, marginBottom: 24 }}>
            <div style={{ fontSize: 10, color: c.dim, letterSpacing: 2, marginBottom: 10 }}>🟥 RED CARDS</div>
            <div style={{ display: "flex", gap: 6 }}>
              {[{ id: "none", label: "None" }, { id: "home", label: match.home }, { id: "away", label: match.away }].map(opt => (
                <button key={opt.id} onClick={() => setRedCard(opt.id)} style={{
                  flex: 1, padding: "10px 8px", borderRadius: 6,
                  border: `1px solid ${redCard === opt.id ? (opt.id === "none" ? c.accent : c.red) : c.border}`,
                  background: redCard === opt.id ? (opt.id === "none" ? c.accentDim : c.redDim) : "transparent",
                  color: redCard === opt.id ? (opt.id === "none" ? c.accent : c.red) : c.dim,
                  fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: body,
                }}>{opt.label}</button>
              ))}
            </div>
          </div>

          <button onClick={generate} disabled={!canGenerate} style={{
            width: "100%", padding: "16px", borderRadius: 12,
            background: canGenerate ? `linear-gradient(135deg, ${c.accent}, #00B860)` : c.dimmer,
            border: "none", cursor: canGenerate ? "pointer" : "not-allowed",
            fontFamily: heading, fontSize: 18, letterSpacing: 3,
            color: canGenerate ? c.bg : c.dim,
          }}>
            {canGenerate ? "🎯 GENERATE 2ND HALF CS STRATEGY" : "ENTER LIVE xG TO CONTINUE"}
          </button>
        </div>
      )}

      {/* LOADING */}
      {screen === SC.LOADING && (
        <div style={{ padding: "100px 24px", textAlign: "center", animation: "fadeIn 0.2s ease" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", border: `2px solid ${c.border}`, borderTopColor: c.accent, margin: "0 auto 24px", animation: "spin 0.8s linear infinite" }} />
          <div style={{ fontFamily: mono, fontSize: 12, color: c.accent, animation: "pulse 1s ease infinite" }}>{loadMsg}</div>
        </div>
      )}

      {/* RESULT */}
      {screen === SC.RESULT && analysis && match && (
        <div style={{ padding: "0 16px 80px" }}>
          {/* HT Score banner */}
          <div style={{ padding: "16px 0", borderBottom: `1px solid ${c.border}`, marginBottom: 16, textAlign: "center", ...rl(1) }}>
            <div style={{ fontSize: 10, color: c.dim, letterSpacing: 2, marginBottom: 6 }}>{match.flag} {match.home} vs {match.away} • HALF-TIME</div>
            <div style={{ fontFamily: heading, fontSize: 44, color: c.white, letterSpacing: 6 }}>
              <span style={{ color: htHome > htAway ? c.accent : htHome < htAway ? c.text : c.white }}>{htHome}</span>
              <span style={{ color: c.dimmer, margin: "0 8px" }}>-</span>
              <span style={{ color: htAway > htHome ? c.cyan : htAway < htHome ? c.text : c.white }}>{htAway}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 8, fontSize: 11, fontFamily: mono }}>
              <span style={{ color: c.accent }}>xG {analysis.hXg}</span><span style={{ color: c.dim }}>|</span><span style={{ color: c.cyan }}>xG {analysis.aXg}</span>
            </div>
          </div>

          {/* xG Divergence */}
          {(Math.abs(analysis.hXg - htHome) > 0.8 || Math.abs(analysis.aXg - htAway) > 0.8) && (
            <div style={{ background: c.purpleDim, border: `1px solid ${c.purple}33`, borderRadius: 8, padding: "12px 14px", marginBottom: 16, ...rl(2) }}>
              <span style={{ color: c.purple, fontWeight: 600, fontSize: 12 }}>📡 xG DIVERGENCE — </span>
              <span style={{ fontSize: 12, color: c.text }}>
                {analysis.hXg > htHome + 0.8 ? `${match.home} have ${analysis.hXg} xG but only ${htHome} goals. Value building.` : `${match.away} have ${analysis.aXg} xG but only ${htAway} goals. Value building on away side.`}
              </span>
            </div>
          )}

          {/* AI intro */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20, ...rl(3) }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg, ${c.accent}, #00B860)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, marginTop: 2 }}>⚡</div>
            <div style={{ fontSize: 14, color: c.text, lineHeight: 1.75 }}>
              <span style={{ color: c.white, fontWeight: 600 }}>2nd Half CS Strategy.</span>
              {" "}It&apos;s <strong style={{ color: c.white }}>{htHome}-{htAway}</strong> at the break.
              {" "}{match.home}&apos;s live xG of <strong style={{ color: c.accent }}>{analysis.hXg}</strong>
              {analysis.hXg > htHome ? " suggests they've been creating more than the scoreline shows" : " is tracking close to goals scored"}.
              {" "}My 2nd half model projects <strong style={{ color: c.accent }}>{analysis.home2hXg} xG</strong> for {match.home} and <strong style={{ color: c.cyan }}>{analysis.away2hXg} xG</strong> for {match.away}
              {analysis.homeState === "chasing" ? ` — expect ${match.home} to push harder` : ""}
              {analysis.awayState === "chasing" ? ` — expect ${match.away} to come out swinging` : ""}.
              {redCard !== "none" && <span style={{ color: c.red }}> Red card to {redCard === "home" ? match.home : match.away} compresses their output significantly.</span>}
            </div>
          </div>

          {/* 2H xG bars */}
          <div style={{ paddingLeft: 44, marginBottom: 24, ...rl(4) }}>
            <div style={{ fontSize: 10, color: c.dim, letterSpacing: 2, marginBottom: 8 }}>📈 2ND HALF PROJECTED xG</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ team: match.home, xg: analysis.home2hXg, color: c.accent }, { team: match.away, xg: analysis.away2hXg, color: c.cyan }].map((t, i) => (
                <div key={i} style={{ flex: 1, background: c.card, borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: t.color, marginBottom: 4 }}>{t.team}</div>
                  <div style={{ height: 6, background: c.surface, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(100, t.xg / 2.5 * 100)}%`, height: "100%", background: t.color, borderRadius: 3 }} />
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, color: t.color, marginTop: 6 }}>{t.xg}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Target Score Formula */}
          <div style={{ paddingLeft: 44, marginBottom: 12, ...rl(5) }}>
            <div style={{ fontSize: 13, color: c.dim }}>My <span style={{ color: c.accent, fontWeight: 600 }}>Target Score Formula</span> for the final whistle:</div>
          </div>

          {/* Plan A */}
          <div style={{ paddingLeft: 44, marginBottom: 14, ...rl(6) }}>
            <div style={{ fontSize: 10, color: c.accent, letterSpacing: 2, marginBottom: 8, fontWeight: 600 }}>PLAN A — MOST PROBABLE FULL-TIME</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {analysis.planA.map((s, i) => (
                <div key={i} style={{ background: c.accentDim, border: `1px solid ${c.accent}33`, borderRadius: 8, padding: "10px 20px", textAlign: "center" }}>
                  <div style={{ fontFamily: heading, fontSize: 30, color: c.accent, letterSpacing: 3, lineHeight: 1 }}>{s.ftLabel}</div>
                  <div style={{ fontSize: 10, color: c.dim, fontFamily: mono, marginTop: 4 }}>{(s.prob * 100).toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Plan B */}
          <div style={{ paddingLeft: 44, marginBottom: 24, ...rl(7) }}>
            <div style={{ fontSize: 10, color: c.gold, letterSpacing: 2, marginBottom: 8, fontWeight: 600 }}>PLAN B — PROTECTION / ALTERNATIVE</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {analysis.planB.map((s, i) => (
                <div key={i} style={{ background: c.goldDim, border: `1px solid ${c.gold}33`, borderRadius: 8, padding: "10px 20px", textAlign: "center" }}>
                  <div style={{ fontFamily: heading, fontSize: 30, color: c.gold, letterSpacing: 3, lineHeight: 1 }}>{s.ftLabel}</div>
                  <div style={{ fontSize: 10, color: c.dim, fontFamily: mono, marginTop: 4 }}>{(s.prob * 100).toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Over/Under */}
          <div style={{ paddingLeft: 44, marginBottom: 24, ...rl(8) }}>
            <div style={{ fontSize: 10, color: c.cyan, letterSpacing: 2, marginBottom: 10, fontWeight: 600 }}>📊 FULL-TIME OVER / UNDER PROBABILITIES</div>
            <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 10, overflow: "hidden" }}>
              <div style={{ display: "flex", padding: "8px 12px", background: c.surface, borderBottom: `1px solid ${c.border}` }}>
                <div style={{ flex: 1, fontSize: 9, color: c.dim, letterSpacing: 1, fontWeight: 600 }}>LINE</div>
                <div style={{ flex: 1, fontSize: 9, color: c.accent, letterSpacing: 1, fontWeight: 600, textAlign: "center" }}>OVER %</div>
                <div style={{ flex: 1, fontSize: 9, color: c.red, letterSpacing: 1, fontWeight: 600, textAlign: "center" }}>UNDER %</div>
                <div style={{ flex: 1, fontSize: 9, color: c.dim, letterSpacing: 1, fontWeight: 600, textAlign: "right" }}>FAIR ODDS</div>
              </div>
              {analysis.overUnderLines.map((ou, i) => {
                const htGoals = htHome + htAway;
                const alreadyOver = htGoals > ou.line;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", padding: "10px 12px", borderBottom: i < analysis.overUnderLines.length - 1 ? `1px solid ${c.border}` : "none", background: alreadyOver ? c.accentDim : "transparent" }}>
                    <div style={{ flex: 1, fontFamily: mono, fontSize: 14, fontWeight: 700, color: c.white }}>
                      O/U {ou.line}{alreadyOver && <span style={{ fontSize: 9, color: c.accent, marginLeft: 6 }}>✓ HIT</span>}
                    </div>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: alreadyOver ? c.accent : ou.overProb > 60 ? c.accent : ou.overProb > 40 ? c.gold : c.text }}>{alreadyOver ? "100" : ou.overProb}%</span>
                    </div>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: alreadyOver ? c.dimmer : ou.underProb > 60 ? c.red : c.text }}>{alreadyOver ? "0" : ou.underProb}%</span>
                    </div>
                    <div style={{ flex: 1, textAlign: "right", fontFamily: mono, fontSize: 11, color: c.dim }}>
                      {alreadyOver ? <span style={{ color: c.dimmer }}>—</span> : <><span style={{ color: c.accent }}>{ou.overOdds}</span><span style={{ color: c.dimmer }}> / </span><span style={{ color: c.red }}>{ou.underOdds}</span></>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reasoning */}
          <div style={{ paddingLeft: 44, marginBottom: 24, fontSize: 14, color: c.text, lineHeight: 1.75, ...rl(9) }}>
            Plan A targets the most probable full-time results based on the recalculated 2nd half xG model.
            {analysis.homeState === "chasing" && ` ${match.home} are chasing — 2nd half xG boosted by 25%.`}
            {analysis.awayState === "chasing" && ` ${match.away} are behind and will push — output increased.`}
            {analysis.homeState === "protecting" && ` ${match.home} are leading — expect them to sit deeper.`}
            {" "}Plan B covers the draw scenario and the underdog route — essential insurance in CS trading.
          </div>

          {/* Game State */}
          <div style={{ paddingLeft: 44, marginBottom: 24, ...rl(10) }}>
            <div style={{ background: c.card, borderRadius: 8, padding: "12px 14px", borderLeft: `3px solid ${c.gold}` }}>
              <span style={{ color: c.gold, fontWeight: 600, fontSize: 12 }}>Game State: </span>
              <span style={{ fontSize: 12, color: c.text }}>
                {htHome === htAway ? "Level at the break — both sides will look to break the deadlock early. CS prices shift fast after the next goal." :
                  htHome > htAway ? `${match.home} lead — they may sit deeper. Watch for ${match.away} pushing men forward.` :
                    `${match.away} lead — ${match.home} will take risks. Expect a more open 2nd half.`}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, paddingLeft: 44, ...rl(11) }}>
            <button onClick={() => setScreen(SC.INPUT)} style={{ flex: 1, padding: "14px", borderRadius: 10, background: c.card, border: `1px solid ${c.border}`, color: c.text, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: body }}>← Edit Data</button>
            <button onClick={() => { setMatch(null); go(SC.SELECT); }} style={{ flex: 1, padding: "14px", borderRadius: 10, background: c.accent, border: "none", color: c.bg, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: body }}>New Match</button>
          </div>

          <div style={{ paddingLeft: 44, marginTop: 16, fontSize: 9, color: c.dimmer, lineHeight: 1.5, ...rl(12) }}>
            Educational only. CS trading is high variance. Never stake more than you can afford to lose.
          </div>
        </div>
      )}
    </div>
  );
}
