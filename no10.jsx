import { useState, useEffect, useRef, useCallback, useMemo } from “react”;
import { LineChart, XAxis, YAxis, Line, ResponsiveContainer, Tooltip } from “recharts”;
import { Settings, ChevronRight, TrendingUp, TrendingDown, AlertTriangle, Crown, Newspaper, Users, MessageSquare, Timer, Shield, BarChart3, ChevronDown, ChevronUp, X, RotateCcw, BookOpen, Award, Loader2, Send, Edit3, Star, Zap, DoorOpen, Volume2 } from “lucide-react”;

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════
const PARTIES = [“Labour”,“Conservative”,“Liberal Democrats”,“Reform UK”,“Green Party”,“SNP (Scottish National Party)”,“Plaid Cymru”,“Independent”];
const DIFFICULTIES = [
{ value: “Easy”, desc: “Forgiving media, patient party, generous economics” },
{ value: “Medium”, desc: “Balanced realism across all metrics” },
{ value: “Hard”, desc: “Hostile media, impatient factions, strict policy economics” },
{ value: “Nightmare”, desc: “Razor-thin majority, recession, leadership challenge brewing from week 1” }
];
const ELECTIONS = [“Within 6 Months”,“Within 1 Year”,“Within 2 Years”,“Within 5 Years (Full Term)”];
const ELECTION_WEEKS = { “Within 6 Months”: 26, “Within 1 Year”: 52, “Within 2 Years”: 104, “Within 5 Years (Full Term)”: 260 };
const GAME_MODES = [
{ value: “Regular Career”, desc: “Standard political crises and events” },
{ value: “The Thick of It”, desc: “Satirical chaos — Malcolm Tucker energy, omnishambles crises, darkly comic tone” },
{ value: “The NEON Scenario”, desc: “Radical progressive PM pushing UBI, housing reform, and democratic transformation against establishment resistance” },
{ value: “1997: The Landslide”, desc: “Massive majority, sky-high expectations, can you deliver?” },
{ value: “Hung Parliament”, desc: “No majority — coalition survival, every vote a negotiation” },
{ value: “Winter of Crisis”, desc: “Recession, strikes, collapsing public services — hold it together” }
];
const FLAGSHIP_COUNTS = { “Within 6 Months”: 1, “Within 1 Year”: 1, “Within 2 Years”: 2, “Within 5 Years (Full Term)”: 2 };

const COLORS = {
bg: “#0A1628”, card: “#1A2332”, cardHover: “#243044”, gold: “#C5A45A”, cream: “#F5F0E6”,
green: “#22C55E”, red: “#EF4444”, amber: “#F59E0B”, navy: “#0D2137”,
cardBorder: “#2A3A4E”, muted: “#8899AA”
};

const LOADING_MESSAGES = [
“The PM is considering the options…”,
“Cabinet is being briefed…”,
“Downing Street prepares a statement…”,
“Special advisors are running the numbers…”,
“The whips are counting heads…”,
“No. 10 is drafting a response…”,
“The red box awaits your decision…”,
“Backbenchers are watching closely…”
];

// ═══════════════════════════════════════════════════════════════
// STORAGE HELPERS
// ═══════════════════════════════════════════════════════════════
async function storageGet(key) {
try {
const r = await window.storage.get(key);
return r ? r.value : null;
} catch { return null; }
}
async function storageSet(key, value) {
try {
await window.storage.set(key, typeof value === “string” ? value : JSON.stringify(value));
return true;
} catch { return false; }
}

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════
function buildSystemPrompt(gameState) {
return `You are the game engine for “No. 10”, a Prime Minister Simulator. You evaluate the player’s political decisions and return structured JSON responses that drive the game forward.

You must ALWAYS respond with valid JSON only. No markdown, no preamble, no explanation outside the JSON structure. Your response must parse with JSON.parse() directly.

CURRENT GAME STATE:
${JSON.stringify(gameState, null, 1)}

SCENARIO PACK: ${gameState.gameMode}

- “Regular Career”: Realistic modern UK political crises. Authentic, serious tone. Think BBC Politics Live.
- “The Thick of It”: Satirical, darkly comic tone. Crises are absurd but politically logical. Advisor speaks like Malcolm Tucker (profane, aggressive, creative insults). Newspaper headlines are sensationalist. Persona reactions are blunter. Everything has a layer of dark comedy.
- “The NEON Scenario”: Progressive insurgent PM pushing radical policy against hostile establishment. The media is overwhelmingly hostile. Business lobbies are panicking. The public is cautiously hopeful. Internal party tensions between radicals and moderates. Urgent and idealistic vs cynical establishment.
- “1997: The Landslide”: Massive majority, media honeymoon, enormous public expectation. The challenge is living up to impossible promises.
- “Hung Parliament”: No majority. Every decision requires cross-party negotiation. Coalition partners are unreliable.
- “Winter of Crisis”: Economy in recession, public services collapsing, strikes across multiple sectors. Pure survival.

DIFFICULTY: ${gameState.difficulty}

- Easy: Personas are more forgiving, media gives benefit of the doubt, party is patient, economic policies don’t need to be precisely costed
- Medium: Balanced realism
- Hard: Personas are sceptical, media is adversarial, party factions are impatient, policies must be economically credible
- Nightmare: Everything on Hard plus: majority is only 2 seats, economy starts in recession, a leadership rival is already briefing against you, media is permanently hostile

VOTER PERSONAS (evaluate the player’s response from each persona’s perspective):

1. Midlands Mike — White British male, 52, former factory worker now delivery driver, Wolverhampton. Voted Labour then Conservative then Reform. Cares about: immigration control, cost of living, local jobs. Suspicious of London elites.
1. Red Wall Rachel — White British female, 44, teaching assistant, Leigh. Lifelong Labour who nearly switched Conservative. Cares about: NHS waiting times, school funding, housing for her kids. Pragmatic.
1. Stevenage Sarah — White British female, 38, HR at a mid-size firm. Swing voter. Cares about: childcare costs, mortgage rates, commuter rail. Moderate.
1. Brighton Ben — White British male, 29, digital marketing, rents a flat-share. Voted Green then Labour. Cares about: climate, housing affordability, LGBTQ+ rights, mental health. Progressive, idealistic.
1. Coastal Keith — White British male, 67, retired builder, Norfolk seaside town. Conservative then Reform. Cares about: immigration, pension security, local hospital. Nostalgic, patriotic.
1. Commuter Claire — White British female, 41, solicitor, Surrey. Conservative then Lib Dem. Cares about: tax burden on middle earners, train reliability, property values. Fiscally conservative, socially liberal.
1. Birmingham Aisha — British Pakistani female, 33, pharmacist, Edgbaston. Labour. Cares about: NHS investment, community safety, Islamophobia, small business. Moderate.
1. Squeezed Sam — White British male, 36, electrician, rents in Bristol with partner and kids. Labour. Cares about: housing costs, energy bills, childcare, in-work poverty. Frustrated.
1. Council Carl — White British male, 48, unemployed, social housing in Sunderland. Doesn’t always vote. Cares about: benefits, mental health services, dignity. Feels forgotten.
1. Graduate Gemma — White British female, 26, junior policy researcher, London house-share. Labour. Cares about: student debt, housing, climate, gender equality, democratic reform. Impatient.
1. Silver Surfer Sue — White British female, 72, retired teacher, Cotswolds. Conservative. Cares about: pension triple lock, GP surgery, heritage, polite politics, BBC. Traditional.
1. Waitrose Wendy — White British female, 55, interior design business, Winchester. Conservative or Lib Dem. Cares about: business rates, cultural institutions, school quality. Affluent, moderate.
1. Tower Hamlets Tariq — British Bangladeshi male, 40, minicab driver, Tower Hamlets. Labour. Cares about: community cohesion, affordable housing, Islamophobia, foreign policy. Politically engaged.
1. Swing Voter Shane — White British male, 31, logistics, Midlands new town. Has voted for three parties. Cares about: whoever seems competent, cost of living. Low information, high impact.
1. Glasgow Gregor — White Scottish male, 58, council worker, Glasgow. SNP. Cares about: Scottish independence, NHS Scotland, not being patronised by English politicians. Sceptical of any PM.

INSTITUTIONAL STAKEHOLDERS:

1. The Guardian — Centre-left broadsheet. Values: social justice, public services, climate, human rights.
1. The Daily Mail — Right-wing tabloid. Values: immigration control, law and order, traditional values, fiscal responsibility.
1. The Daily Telegraph — Centre-right broadsheet. Values: free markets, low taxes, business-friendly policy, strong defence.
1. The Sun — Populist tabloid. Values: whatever is popular, strong personality, patriotism, common sense.
1. The Financial Times — Centrist/pro-business. Values: economic stability, market confidence, fiscal credibility, evidence-based policy.
1. CBI (Business Lobby) — Values: low regulation, flexible labour, trade deals, stable policy.
1. TUC (Trade Unions) — Values: workers’ rights, wage growth, public sector investment, NHS funding.
1. Party Left Faction — The more radical/idealist wing of the PM’s party.
1. Party Right Faction — The more pragmatic/establishment wing of the PM’s party.

CABINET MEMBERS:
${JSON.stringify(gameState.cabinet || [], null, 1)}

GAME BALANCE RULES:

1. Metrics move 3-8 points per week normally, 10-15 for major events.
1. Flagship policies cause 10-20 point swing in primary metric but -5 to -10 in another.
1. PMQs affect Authority by ±5-15.
1. Recovery is slow — losing the Mail takes 3-4 good weeks to recover.
1. Party stability is hardest to recover — factions have long memories.
1. Difficulty scaling: Nightmare trends downward even with decent decisions. Easy trends upward unless you actively screw up.
1. Contradictions cause 20+ point drops in authority and media.
1. As election approaches, every decision is scrutinised more harshly.`;
   }

// ═══════════════════════════════════════════════════════════════
// API CALL HELPER
// ═══════════════════════════════════════════════════════════════
async function callAPI(apiKey, systemPrompt, userMessage, maxRetries = 2) {
let lastError = null;
for (let attempt = 0; attempt <= maxRetries; attempt++) {
try {
const res = await fetch(“https://api.anthropic.com/v1/messages”, {
method: “POST”,
headers: { “Content-Type”: “application/json”, “x-api-key”: apiKey, “anthropic-version”: “2023-06-01”, “anthropic-dangerous-direct-browser-access”: “true” },
body: JSON.stringify({ model: “claude-sonnet-4-20250514”, max_tokens: 8000, system: systemPrompt, messages: [{ role: “user”, content: userMessage }] })
});
if (!res.ok) {
const errBody = await res.text();
throw new Error(`API ${res.status}: ${errBody.slice(0, 300)}`);
}
const data = await res.json();
const text = data.content.map(c => c.text || “”).join(””);
const clean = text.replace(/`json\s*/g, "").replace(/`\s*/g, “”).trim();
return JSON.parse(clean);
} catch (e) {
lastError = e;
if (attempt < maxRetries) await new Promise(r => setTimeout(r, 2000));
}
}
throw lastError;
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function MetricBar({ label, value, icon, thresholds }) {
const t = thresholds || { green: 45, amber: 30 };
const color = value >= t.green ? COLORS.green : value >= t.amber ? COLORS.amber : COLORS.red;
return (
<div className="mb-2">
<div className="flex justify-between items-center mb-1">
<span className=“text-xs font-medium” style={{ color: COLORS.cream }}>{icon} {label}</span>
<span className=“text-xs font-bold” style={{ color }}>{value}</span>
</div>
<div className=“w-full h-2 rounded-full” style={{ background: COLORS.cardBorder }}>
<div className=“h-2 rounded-full transition-all duration-1000” style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
</div>
</div>
);
}

function MetricChange({ value, label }) {
if (!value || value === 0) return <span className=“text-xs” style={{ color: COLORS.muted }}>— {label}</span>;
const pos = value > 0;
return (
<span className=“text-xs font-semibold flex items-center gap-1” style={{ color: pos ? COLORS.green : COLORS.red }}>
{pos ? <TrendingUp size={12}/> : <TrendingDown size={12}/>} {pos ? “+” : “”}{value} {label}
</span>
);
}

function LoadingScreen({ message }) {
return (
<div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-6">
<div className="relative">
<div className=“w-16 h-16 border-4 rounded-full animate-spin” style={{ borderColor: `${COLORS.gold}33`, borderTopColor: COLORS.gold }} />
</div>
<p className=“text-center text-lg” style={{ color: COLORS.gold, fontFamily: “‘Playfair Display’, serif” }}>{message || “The PM is considering…”}</p>
</div>
);
}

function ErrorBox({ error, onRetry }) {
return (
<div className=“p-4 rounded-lg border mx-4 my-6” style={{ background: “#2A1520”, borderColor: COLORS.red }}>
<div className="flex items-start gap-2">
<AlertTriangle size={18} className=“mt-0.5 flex-shrink-0” style={{ color: COLORS.red }} />
<div className="flex-1">
<p className=“text-sm font-semibold mb-1” style={{ color: COLORS.red }}>Something went wrong</p>
<p className=“text-xs mb-3” style={{ color: COLORS.cream }}>{String(error).slice(0, 300)}</p>
{onRetry && <button onClick={onRetry} className=“flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold” style={{ background: COLORS.red, color: “#fff” }}><RotateCcw size={12}/> Retry</button>}
</div>
</div>
</div>
);
}

function GoldButton({ children, onClick, disabled, className = “”, small }) {
return (
<button onClick={onClick} disabled={disabled}
className={`font-semibold rounded-lg transition-all ${small ? "px-4 py-2 text-sm" : "px-6 py-3 text-base"} ${disabled ? "opacity-40 cursor-not-allowed" : "hover:brightness-110 active:scale-[0.97]"} ${className}`}
style={{ background: disabled ? COLORS.cardBorder : `linear-gradient(135deg, ${COLORS.gold}, #A8893E)`, color: disabled ? COLORS.muted : “#0A1628”, fontFamily: “‘Playfair Display’, serif” }}>
{children}
</button>
);
}

function Card({ children, className = “”, style = {}, onClick }) {
return (
<div onClick={onClick} className={`rounded-xl p-4 ${className}`}
style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, …style }}>
{children}
</div>
);
}

function SelectField({ label, desc, value, onChange, options }) {
return (
<div className="mb-4">
<label className=“block text-sm font-semibold mb-1” style={{ color: COLORS.cream }}>{label}</label>
<select value={value} onChange={e => onChange(e.target.value)}
className=“w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2”
style={{ background: COLORS.cardBorder, color: COLORS.cream, borderColor: COLORS.cardBorder, focusRingColor: COLORS.gold }}>
{options.map(o => <option key={typeof o === “string” ? o : o.value} value={typeof o === “string” ? o : o.value}>{typeof o === “string” ? o : o.value}</option>)}
</select>
{desc && <p className=“text-xs mt-1” style={{ color: COLORS.muted }}>{typeof desc === “function” ? desc(value) : desc}</p>}
</div>
);
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function App() {
// Core state
const [screen, setScreen] = useState(“loading”); // loading, title, settings, setup, cabinet, dashboard, results, pmqs, flagship, challenge, election, gameover, legacy, memoir
const [apiKey, setApiKey] = useState(””);
const [gameState, setGameState] = useState(null);
const [loading, setLoading] = useState(false);
const [loadingMsg, setLoadingMsg] = useState(””);
const [error, setError] = useState(null);
const [hasSave, setHasSave] = useState(false);
const [legacyBoard, setLegacyBoard] = useState([]);

// Setup state
const [setupName, setSetupName] = useState(””);
const [setupParty, setSetupParty] = useState(“Labour”);
const [setupDifficulty, setSetupDifficulty] = useState(“Medium”);
const [setupElection, setSetupElection] = useState(“Within 2 Years”);
const [setupMode, setSetupMode] = useState(“Regular Career”);

// Cabinet selection state
const [cabinetCandidates, setCabinetCandidates] = useState(null);
const [cabinetSelections, setCabinetSelections] = useState({});
const [flagshipPolicies, setFlagshipPolicies] = useState([]);
const [initialScenario, setInitialScenario] = useState(null);

// Dashboard state
const [selectedResponse, setSelectedResponse] = useState(“A”);
const [customResponse, setCustomResponse] = useState(””);
const [editingA, setEditingA] = useState(””);
const [editingB, setEditingB] = useState(””);
const [metricsExpanded, setMetricsExpanded] = useState(true);
const [chartExpanded, setChartExpanded] = useState(false);

// Results state
const [turnResult, setTurnResult] = useState(null);

// PMQs state
const [pmqsData, setPmqsData] = useState(null);
const [pmqsResponse, setPmqsResponse] = useState(””);
const [pmqsTimer, setPmqsTimer] = useState(0);
const [pmqsTimerActive, setPmqsTimerActive] = useState(false);
const pmqsInterval = useRef(null);

// Challenge state
const [challengeResponse, setChallengeResponse] = useState(””);
const [challengeData, setChallengeData] = useState(null);

// Election state
const [electionResult, setElectionResult] = useState(null);

// Game over state
const [legacyData, setLegacyData] = useState(null);

// Flagship state
const [selectedFlagship, setSelectedFlagship] = useState(null);

// ─── Init ───
useEffect(() => {
(async () => {
const key = await storageGet(“api-key”);
if (key) setApiKey(key);
const save = await storageGet(“current-game”);
setHasSave(!!save);
const lb = await storageGet(“legacy-history”);
if (lb) { try { setLegacyBoard(JSON.parse(lb)); } catch {} }
setScreen(“title”);
})();
}, []);

// ─── Save game whenever gameState changes ───
useEffect(() => {
if (gameState) storageSet(“current-game”, JSON.stringify(gameState));
}, [gameState]);

// ─── Loading message rotation ───
useEffect(() => {
if (!loading) return;
setLoadingMsg(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
const iv = setInterval(() => setLoadingMsg(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]), 4000);
return () => clearInterval(iv);
}, [loading]);

// ─── Generate legacy on game over ───
useEffect(() => {
if (screen === “gameover” && !legacyData && !loading && gameState) generateLegacy();
}, [screen]);

// ─── PMQs Timer ───
useEffect(() => {
if (pmqsTimerActive && pmqsTimer > 0) {
pmqsInterval.current = setInterval(() => {
setPmqsTimer(t => {
if (t <= 1) {
clearInterval(pmqsInterval.current);
setPmqsTimerActive(false);
return 0;
}
return t - 1;
});
}, 1000);
return () => clearInterval(pmqsInterval.current);
}
}, [pmqsTimerActive]);

// ─── API CALLS ───
const apiCall = useCallback(async (systemPrompt, userMsg) => {
if (!apiKey) { setError(“No API key set. Go to Settings.”); return null; }
setLoading(true);
setError(null);
try {
const result = await callAPI(apiKey, systemPrompt, userMsg);
return result;
} catch (e) {
setError(e.message || String(e));
return null;
} finally {
setLoading(false);
}
}, [apiKey]);

// ─── Begin Career ───
const beginCareer = useCallback(async () => {
if (!setupName.trim()) { setError(“Please enter your name.”); return; }
const initState = {
pmName: setupName.trim(), party: setupParty, difficulty: setupDifficulty,
electionTimer: setupElection, gameMode: setupMode, week: 0,
metrics: { polling: 45, media: 45, partyStability: 55, authority: 50, backbenchRebels: 8 },
pollingHistory: [], cabinet: [], flagshipPolicies: [], flagshipsRemaining: FLAGSHIP_COUNTS[setupElection] || 2,
electionWeeksRemaining: ELECTION_WEEKS[setupElection] || 104,
memoir: [], decisionSummary: [], personas: null, stakeholders: null
};

```
const sys = `You generate the initial setup for a Prime Minister Simulator game. Return ONLY valid JSON, no markdown or preamble.
```

The player is ${setupName.trim()}, leading ${setupParty}, on ${setupDifficulty} difficulty, in “${setupMode}” scenario mode. Election: ${setupElection}.`;

```
const msg = `Generate the initial game setup. Return JSON:
```

{
“cabinetCandidates”: {
“chancellor”: [{“name”:”…”,“bio”:“One sentence bio”,“competence”:7,“loyalty”:8,“lean”:“soft left”},{“name”:”…”,“bio”:”…”,“competence”:6,“loyalty”:9,“lean”:“centrist”},{“name”:”…”,“bio”:”…”,“competence”:8,“loyalty”:5,“lean”:“right-wing”}],
“homeSec”: [same 3-option format],
“foreignSec”: [same 3-option format],
“healthSec”: [same 3-option format],
“advisor”: [{“name”:”…”,“bio”:”…”,“competence”:8,“loyalty”:9,“personality”:“Description of their advisory style and voice”,“lean”:”…”},3 options]
},
“flagshipPolicies”: [{“title”:“Policy Name”,“description”:“2-3 sentence description”,“expectedImpact”:“Brief who it helps/alienates”},6-8 policies for ${setupParty} under ${setupMode}],
“initialScenario”: {
“title”:“Week 1 Crisis Headline”,
“description”:“2-3 paragraphs describing the situation”,
“tags”:[“NHS”,“Economy”],
“suggestedResponseA”:“2-3 sentence suggested response”,
“suggestedResponseB”:“2-3 sentence alternative response”,
“isPMQs”:false,“isElection”:false,“isLeadershipChallenge”:false
},
“initialMetrics”: {“polling”:${setupDifficulty===“Easy”?52:setupDifficulty===“Medium”?45:setupDifficulty===“Hard”?38:32},“media”:${setupDifficulty===“Easy”?55:setupDifficulty===“Medium”?45:setupDifficulty===“Hard”?35:25},“partyStability”:${setupDifficulty===“Easy”?70:setupDifficulty===“Medium”?55:setupDifficulty===“Hard”?40:25},“authority”:${setupDifficulty===“Easy”?65:setupDifficulty===“Medium”?50:setupDifficulty===“Hard”?40:30},“backbenchRebels”:${setupDifficulty===“Easy”?3:setupDifficulty===“Medium”?8:setupDifficulty===“Hard”?15:25}},
“advisorIntro”: “The advisor’s intro in their voice”
}
All cabinet candidates must be unique, plausible UK politicians for ${setupParty}. Make them distinctive with varied competence/loyalty tradeoffs. The advisor options should have vivid contrasting personalities${setupMode === “The Thick of It” ? “ — one should be a Malcolm Tucker-type with profane, aggressive style” : “”}.`;

```
const result = await apiCall(sys, msg);
if (!result) return;

setCabinetCandidates(result.cabinetCandidates);
setFlagshipPolicies(result.flagshipPolicies || []);
setInitialScenario(result.initialScenario);

const m = result.initialMetrics || initState.metrics;
setGameState({ ...initState, metrics: m, flagshipPolicies: result.flagshipPolicies || [], pollingHistory: [{ week: 0, polling: m.polling }] });
setCabinetSelections({});
setScreen("cabinet");
```

}, [setupName, setupParty, setupDifficulty, setupElection, setupMode, apiCall]);

// ─── Confirm Cabinet ───
const confirmCabinet = useCallback(() => {
const roles = [“chancellor”, “homeSec”, “foreignSec”, “healthSec”, “advisor”];
const roleLabels = { chancellor: “Chancellor of the Exchequer”, homeSec: “Home Secretary”, foreignSec: “Foreign Secretary”, healthSec: “Health Secretary”, advisor: “Chief Advisor” };
const cab = roles.map(r => {
const idx = cabinetSelections[r] ?? 0;
const c = cabinetCandidates[r]?.[idx];
return c ? { …c, role: roleLabels[r], roleKey: r } : null;
}).filter(Boolean);

```
setGameState(prev => ({
  ...prev, cabinet: cab, week: 1,
  currentScenario: initialScenario,
  advisorIntro: cabinetCandidates?.advisor?.[cabinetSelections.advisor ?? 0]?.personality || ""
}));
setEditingA(initialScenario?.suggestedResponseA || "");
setEditingB(initialScenario?.suggestedResponseB || "");
setSelectedResponse("A");
setCustomResponse("");
setScreen("dashboard");
```

}, [cabinetSelections, cabinetCandidates, initialScenario]);

// ─── Submit Weekly Response ───
const submitResponse = useCallback(async () => {
const responseText = selectedResponse === “A” ? editingA : selectedResponse === “B” ? editingB : customResponse;
if (!responseText.trim()) { setError(“Please write a response before submitting.”); return; }

```
const gs = gameState;
const sys = buildSystemPrompt(gs);
const summaryText = (gs.decisionSummary || []).slice(-10).map(d => `Week ${d.week}: ${d.summary}`).join("\n");

const msg = `WEEK ${gs.week} SCENARIO:
```

${gs.currentScenario?.title || “Ongoing political situation”}
${gs.currentScenario?.description || “”}

PLAYER’S CHOSEN RESPONSE:
${responseText}

PREVIOUS DECISIONS SUMMARY:
${summaryText || “First week — no previous decisions.”}

CURRENT METRICS:

- Public Polling: ${gs.metrics.polling}/100
- Media Sentiment: ${gs.metrics.media}/100
- Party Stability: ${gs.metrics.partyStability}/100
- Authority: ${gs.metrics.authority}/100
- Backbench Rebels: ${gs.metrics.backbenchRebels}
- Election Deadline: ${gs.electionWeeksRemaining} weeks remaining

INSTRUCTIONS: Evaluate this response and return JSON in this exact structure:
{
“headlines”:[{“paper”:“Paper Name”,“headline”:“HEADLINE TEXT”,“sentiment”:“positive|negative|neutral”},{“paper”:”…”,“headline”:”…”,“sentiment”:”…”},{“paper”:”…”,“headline”:”…”,“sentiment”:”…”}],
“personas”:[{“name”:“Midlands Mike”,“approvalChange”:0,“newApproval”:50,“reaction”:”…”},{“name”:“Red Wall Rachel”,“approvalChange”:0,“newApproval”:50,“reaction”:”…”},{“name”:“Stevenage Sarah”,“approvalChange”:0,“newApproval”:50,“reaction”:”…”},{“name”:“Brighton Ben”,“approvalChange”:0,“newApproval”:50,“reaction”:”…”},{“name”:“Coastal Keith”,“approvalChange”:0,“newApproval”:50,“reaction”:”…”},{“name”:“Commuter Claire”,“approvalChange”:0,“newApproval”:50,“reaction”:”…”},{“name”:“Birmingham Aisha”,“approvalChange”:0,“newApproval”:50,“reaction”:”…”},{“name”:“Squeezed Sam”,“approvalChange”:0,“newApproval”:50,“reaction”:”…”},{“name”:“Council Carl”,“approvalChange”:0,“newApproval”:50,“reaction”:”…”},{“name”:“Graduate Gemma”,“approvalChange”:0,“newApproval”:50,“reaction”:”…”},{“name”:“Silver Surfer Sue”,“approvalChange”:0,“newApproval”:50,“reaction”:”…”},{“name”:“Waitrose Wendy”,“approvalChange”:0,“newApproval”:50,“reaction”:”…”},{“name”:“Tower Hamlets Tariq”,“approvalChange”:0,“newApproval”:50,“reaction”:”…”},{“name”:“Swing Voter Shane”,“approvalChange”:0,“newApproval”:50,“reaction”:”…”},{“name”:“Glasgow Gregor”,“approvalChange”:0,“newApproval”:50,“reaction”:”…”}],
“stakeholders”:[{“name”:“The Guardian”,“approvalChange”:0,“newApproval”:50,“reaction”:”…”},{“name”:“The Daily Mail”,“approvalChange”:0,“newApproval”:50,“reaction”:”…”},{“name”:“The Daily Telegraph”,“approvalChange”:0,“newApproval”:50,“reaction”:”…”},{“name”:“The Sun”,“approvalChange”:0,“newApproval”:50,“reaction”:”…”},{“name”:“The Financial Times”,“approvalChange”:0,“newApproval”:50,“reaction”:”…”},{“name”:“CBI”,“approvalChange”:0,“newApproval”:50,“reaction”:”…”},{“name”:“TUC”,“approvalChange”:0,“newApproval”:50,“reaction”:”…”},{“name”:“Party Left Faction”,“approvalChange”:0,“newApproval”:50,“reaction”:”…”},{“name”:“Party Right Faction”,“approvalChange”:0,“newApproval”:50,“reaction”:”…”}],
“metrics”:{“polling”:45,“pollingChange”:0,“media”:45,“mediaChange”:0,“partyStability”:55,“partyStabilityChange”:0,“authority”:50,“authorityChange”:0,“backbenchRebels”:8,“backbenchRebelsChange”:0},
“narrative”:“2-3 paragraphs describing consequences.”,
“cabinetEvents”:[],
“memoirEntry”:“First-person retrospective paragraph.”,
“advisorComment”:“1-2 sentences in character.”,
“nextScenario”:{“title”:“Next Crisis”,“description”:“2-3 paragraphs”,“tags”:[“Economy”],“suggestedResponseA”:”…”,“suggestedResponseB”:”…”,“isPMQs”:${(gs.week % 4 === 3) ? “true” : “false”},“isElection”:${gs.electionWeeksRemaining <= 1 ? “true” : “false”},“isLeadershipChallenge”:${gs.metrics.partyStability < 15 ? “true” : “false”}},
“gameOver”:null
}
Remember: Be consistent, cumulative, realistic. Difficulty is ${gs.difficulty}. Scenario pack is “${gs.gameMode}”.${gs.gameMode === “The Thick of It” ? “ Keep the dark comedy tone throughout — profane advisor, sensationalist headlines, absurd-but-logical crises.” : “”}`;

```
const result = await apiCall(sys, msg);
if (!result) return;

// Update game state
const newMetrics = result.metrics || gs.metrics;
const updatedCabinet = [...(gs.cabinet || [])];
(result.cabinetEvents || []).forEach(evt => {
  const idx = updatedCabinet.findIndex(c => c.name === evt.ministerName);
  if (idx >= 0) {
    updatedCabinet[idx] = { ...updatedCabinet[idx], loyalty: evt.newLoyalty ?? updatedCabinet[idx].loyalty, lastEvent: evt.event };
  }
});

const newState = {
  ...gs,
  week: gs.week + 1,
  metrics: { polling: newMetrics.polling, media: newMetrics.media, partyStability: newMetrics.partyStability, authority: newMetrics.authority, backbenchRebels: newMetrics.backbenchRebels },
  pollingHistory: [...(gs.pollingHistory || []), { week: gs.week, polling: newMetrics.polling }],
  cabinet: updatedCabinet,
  electionWeeksRemaining: gs.electionWeeksRemaining - 1,
  currentScenario: result.nextScenario,
  personas: result.personas,
  stakeholders: result.stakeholders,
  memoir: [...(gs.memoir || []), { week: gs.week, entry: result.memoirEntry }],
  decisionSummary: [...(gs.decisionSummary || []).slice(-20), { week: gs.week, summary: `Responded to "${gs.currentScenario?.title}": ${responseText.slice(0, 100)}...` }]
};

setTurnResult(result);
setGameState(newState);

// Check for game over conditions
if (result.gameOver) {
  setScreen("gameover");
  return;
}
setScreen("results");
```

}, [gameState, selectedResponse, editingA, editingB, customResponse, apiCall]);

// ─── Advance to next week ───
const advanceWeek = useCallback(() => {
const sc = gameState.currentScenario;
if (sc?.isPMQs) {
startPMQs();
} else if (sc?.isLeadershipChallenge || gameState.metrics.partyStability < 15) {
startChallenge();
} else if (sc?.isElection || gameState.electionWeeksRemaining <= 0) {
startElection();
} else {
setEditingA(sc?.suggestedResponseA || “”);
setEditingB(sc?.suggestedResponseB || “”);
setSelectedResponse(“A”);
setCustomResponse(””);
setScreen(“dashboard”);
}
}, [gameState]);

// ─── PMQs ───
const startPMQs = useCallback(async () => {
const gs = gameState;
const sys = buildSystemPrompt(gs);
const msg = `Generate a Prime Minister's Questions exchange. The Leader of the Opposition attacks the PM. Return JSON: { "oppositionLeader": "Name and Party", "attackLine": "The opposition leader's question/attack (2-3 sentences, politically sharp)", "context": "Brief context for why they're asking this", "crowdMood": "Description of the chamber atmosphere" }`;
const result = await apiCall(sys, msg);
if (!result) return;
setPmqsData(result);
setPmqsResponse(””);
const timerSecs = gs.difficulty === “Easy” ? 90 : gs.difficulty === “Medium” ? 60 : gs.difficulty === “Hard” ? 45 : 30;
setPmqsTimer(timerSecs);
setPmqsTimerActive(true);
setScreen(“pmqs”);
}, [gameState, apiCall]);

const submitPMQs = useCallback(async () => {
clearInterval(pmqsInterval.current);
setPmqsTimerActive(false);
const response = pmqsResponse.trim() || “I… the honourable member raises an important point and we are looking at all options…”;
const gs = gameState;
const sys = buildSystemPrompt(gs);
const summaryText = (gs.decisionSummary || []).slice(-10).map(d => `Week ${d.week}: ${d.summary}`).join(”\n”);

```
const msg = `WEEK ${gs.week} — PRIME MINISTER'S QUESTIONS
```

Opposition Leader: ${pmqsData?.oppositionLeader}
Attack: ${pmqsData?.attackLine}
Context: ${pmqsData?.context}

PM’S RESPONSE: “${response}”
${pmqsTimer <= 0 ? “(NOTE: The PM ran out of time and gave a weak, stumbling response)” : “”}

isPMQsResponse: true (weight Authority and Media Sentiment changes more heavily)

PREVIOUS DECISIONS SUMMARY:
${summaryText || “No previous decisions.”}

CURRENT METRICS:

- Public Polling: ${gs.metrics.polling}/100
- Media Sentiment: ${gs.metrics.media}/100
- Party Stability: ${gs.metrics.partyStability}/100
- Authority: ${gs.metrics.authority}/100
- Backbench Rebels: ${gs.metrics.backbenchRebels}
- Election Deadline: ${gs.electionWeeksRemaining} weeks remaining

Return the standard turn evaluation JSON (same structure as a regular week).`;

```
const result = await apiCall(sys, msg);
if (!result) return;

const newMetrics = result.metrics || gs.metrics;
const newState = {
  ...gs, week: gs.week + 1,
  metrics: { polling: newMetrics.polling, media: newMetrics.media, partyStability: newMetrics.partyStability, authority: newMetrics.authority, backbenchRebels: newMetrics.backbenchRebels },
  pollingHistory: [...(gs.pollingHistory || []), { week: gs.week, polling: newMetrics.polling }],
  electionWeeksRemaining: gs.electionWeeksRemaining - 1,
  currentScenario: result.nextScenario,
  personas: result.personas, stakeholders: result.stakeholders,
  memoir: [...(gs.memoir || []), { week: gs.week, entry: result.memoirEntry }],
  decisionSummary: [...(gs.decisionSummary || []).slice(-20), { week: gs.week, summary: `PMQs: Responded to ${pmqsData?.oppositionLeader}: "${response.slice(0, 80)}..."` }]
};
setTurnResult(result);
setGameState(newState);
if (result.gameOver) { setScreen("gameover"); return; }
setScreen("results");
```

}, [gameState, pmqsData, pmqsResponse, pmqsTimer, apiCall]);

// ─── Leadership Challenge ───
const startChallenge = useCallback(async () => {
setChallengeResponse(””);
setChallengeData(null);
const gs = gameState;
const sys = buildSystemPrompt(gs);
const msg = `A leadership challenge has been triggered against the PM. Party stability is at ${gs.metrics.partyStability}. Generate only the challenger info. Return JSON: { "challenger": {"name":"...","faction":"...","pitch":"2-3 sentences why they should replace the PM"} }`;
const result = await apiCall(sys, msg);
if (!result) return;
setChallengeData(result);
setScreen(“challenge”);
}, [gameState, apiCall]);

const submitChallenge = useCallback(async () => {
const gs = gameState;
const sys = buildSystemPrompt(gs);
const msg = `LEADERSHIP CHALLENGE RESPONSE
Challenger: ${challengeData?.challenger?.name} (${challengeData?.challenger?.faction})
Challenger’s pitch: ${challengeData?.challenger?.pitch}

PM’s defence speech: “${challengeResponse}”

Track record: ${(gs.decisionSummary || []).slice(-10).map(d => d.summary).join(”; “)}
Current metrics: Polling ${gs.metrics.polling}, Media ${gs.metrics.media}, Party Stability ${gs.metrics.partyStability}, Authority ${gs.metrics.authority}, Rebels ${gs.metrics.backbenchRebels}

Evaluate whether the PM survives. Return JSON:
{
“result”: “survived” or “defeated”,
“voteBreakdown”: “e.g. 178 to 142 in favour of the PM”,
“narrative”: “2-3 paragraphs describing the drama”,
“metricsAfter”: {“polling”:0,“media”:0,“partyStability”:0,“authority”:0,“backbenchRebels”:0},
“memoirEntry”: “First-person retrospective paragraph about the challenge”
}`;
const result = await apiCall(sys, msg);
if (!result) return;

```
if (result.result === "defeated") {
  setGameState(prev => ({
    ...prev,
    memoir: [...(prev.memoir || []), { week: prev.week, entry: result.memoirEntry }],
    gameOverReason: "leadership_challenge",
    gameOverDesc: `Defeated in leadership challenge by ${challengeData?.challenger?.name}. Vote: ${result.voteBreakdown}`
  }));
  setTurnResult({ narrative: result.narrative });
  setScreen("gameover");
} else {
  const ma = result.metricsAfter;
  setGameState(prev => ({
    ...prev,
    metrics: { polling: ma.polling || prev.metrics.polling, media: ma.media || prev.metrics.media, partyStability: Math.min(40, (ma.partyStability || 30)), authority: ma.authority || prev.metrics.authority, backbenchRebels: ma.backbenchRebels || Math.max(5, prev.metrics.backbenchRebels - 10) },
    memoir: [...(prev.memoir || []), { week: prev.week, entry: result.memoirEntry }]
  }));
  setTurnResult({ narrative: result.narrative, challengeResult: result });
  setScreen("results");
}
```

}, [gameState, challengeData, challengeResponse, apiCall]);

// ─── Election ───
const startElection = useCallback(async () => {
const gs = gameState;
const sys = buildSystemPrompt(gs);
const summaryText = (gs.decisionSummary || []).map(d => `Week ${d.week}: ${d.summary}`).join(”\n”);
const msg = `The general election has arrived. The PM has served ${gs.week} weeks.
Track record:\n${summaryText}
Final metrics: Polling ${gs.metrics.polling}, Media ${gs.metrics.media}, Party Stability ${gs.metrics.partyStability}, Authority ${gs.metrics.authority}

Evaluate the entire premiership and generate an election result. Return JSON:
{
“result”: “victory” or “defeat”,
“seatCount”: number,
“oppositionSeats”: number,
“voteShare”: number,
“majority”: number (negative if lost),
“narrative”: “3-4 paragraphs describing election night”,
“newTermMetrics”: {“polling”:50,“media”:50,“partyStability”:60,“authority”:55} (only if victory),
“memoirEntry”: “First-person paragraph about election night”
}`;
const result = await apiCall(sys, msg);
if (!result) return;
setElectionResult(result);

```
if (result.result === "defeat") {
  setGameState(prev => ({
    ...prev,
    memoir: [...(prev.memoir || []), { week: prev.week, entry: result.memoirEntry }],
    gameOverReason: "election_loss",
    gameOverDesc: `Lost the general election. ${prev.party}: ${result.seatCount} seats (${result.voteShare}% vote share). Majority: ${result.majority}`
  }));
  setScreen("gameover");
} else {
  setGameState(prev => ({
    ...prev,
    metrics: result.newTermMetrics || prev.metrics,
    electionWeeksRemaining: ELECTION_WEEKS["Within 5 Years (Full Term)"],
    flagshipsRemaining: (prev.flagshipsRemaining || 0) + 2,
    memoir: [...(prev.memoir || []), { week: prev.week, entry: result.memoirEntry }]
  }));
  setElectionResult(result);
  setScreen("election");
}
```

}, [gameState, apiCall]);

// ─── Flagship Policy ───
const launchFlagship = useCallback(async (policy) => {
const gs = gameState;
const sys = buildSystemPrompt(gs);
const msg = `FLAGSHIP POLICY LAUNCH
The PM is launching a major flagship policy:
Title: ${policy.title}
Description: ${policy.description}
Expected Impact: ${policy.expectedImpact}

This is a MAJOR policy launch — evaluate with significant metric swings (10-20 point primary, -5 to -10 secondary).

CURRENT METRICS:
Polling ${gs.metrics.polling}, Media ${gs.metrics.media}, Party Stability ${gs.metrics.partyStability}, Authority ${gs.metrics.authority}, Rebels ${gs.metrics.backbenchRebels}
Election in ${gs.electionWeeksRemaining} weeks.

Return the standard turn evaluation JSON.`;

```
const result = await apiCall(sys, msg);
if (!result) return;

const newMetrics = result.metrics || gs.metrics;
setGameState(prev => ({
  ...prev, week: prev.week + 1, flagshipsRemaining: prev.flagshipsRemaining - 1,
  metrics: { polling: newMetrics.polling, media: newMetrics.media, partyStability: newMetrics.partyStability, authority: newMetrics.authority, backbenchRebels: newMetrics.backbenchRebels },
  pollingHistory: [...(prev.pollingHistory || []), { week: prev.week, polling: newMetrics.polling }],
  electionWeeksRemaining: prev.electionWeeksRemaining - 1,
  currentScenario: result.nextScenario,
  personas: result.personas, stakeholders: result.stakeholders,
  memoir: [...(prev.memoir || []), { week: prev.week, entry: result.memoirEntry }],
  decisionSummary: [...(prev.decisionSummary || []).slice(-20), { week: prev.week, summary: `Launched flagship: ${policy.title}` }]
}));
setTurnResult(result);
if (result.gameOver) { setScreen("gameover"); return; }
setScreen("results");
```

}, [gameState, apiCall]);

// ─── Game Over / Legacy ───
const generateLegacy = useCallback(async () => {
const gs = gameState;
const sys = buildSystemPrompt(gs);
const summaryText = (gs.decisionSummary || []).map(d => `Week ${d.week}: ${d.summary}`).join(”\n”);
const msg = `The premiership is over. ${gs.pmName} served ${gs.week} weeks as PM of ${gs.party}.
How it ended: ${gs.gameOverReason || “resignation”} — ${gs.gameOverDesc || “The PM resigned.”}
Track record:\n${summaryText}
Final metrics: Polling ${gs.metrics.polling}, Media ${gs.metrics.media}, Party Stability ${gs.metrics.partyStability}, Authority ${gs.metrics.authority}

Generate the legacy assessment. Return JSON:
{
“obituary”: “3-4 paragraphs newspaper-style assessment”,
“scores”: {“economicManagement”:50,“publicServices”:50,“internationalStanding”:50,“partyUnity”:50,“reformAndLegacy”:50,“mediaRelations”:50,“overall”:50},
“epitaph”: “A single punchy sentence defining this PM”
}`;
const result = await apiCall(sys, msg);
if (!result) return;
setLegacyData(result);

```
// Save to legacy board
const entry = {
  name: gs.pmName, party: gs.party, weeks: gs.week, mode: gs.gameMode,
  score: result.scores?.overall || 0, epitaph: result.epitaph,
  howEnded: gs.gameOverDesc || "Resigned", date: new Date().toISOString().split("T")[0]
};
const updated = [...legacyBoard, entry].sort((a, b) => b.score - a.score);
setLegacyBoard(updated);
storageSet("legacy-history", JSON.stringify(updated));
// Clear current save
storageSet("current-game", "");
setHasSave(false);
```

}, [gameState, legacyBoard, apiCall]);

// ─── Resign ───
const resign = useCallback(() => {
setGameState(prev => ({ …prev, gameOverReason: “resignation”, gameOverDesc: `${prev.pmName} resigned from office after ${prev.week} weeks, citing personal reasons.` }));
setScreen(“gameover”);
}, []);

// ─── Continue saved game ───
const continueGame = useCallback(async () => {
const save = await storageGet(“current-game”);
if (save) {
try {
const gs = JSON.parse(save);
setGameState(gs);
if (gs.currentScenario) {
setEditingA(gs.currentScenario.suggestedResponseA || “”);
setEditingB(gs.currentScenario.suggestedResponseB || “”);
}
setScreen(“dashboard”);
} catch { setError(“Save data corrupted.”); }
}
}, []);

// ─── Save API key ───
const saveApiKey = useCallback(async (key) => {
setApiKey(key);
await storageSet(“api-key”, key);
}, []);

// ═══════════════════════════════════════════════════════════════
// SCREEN RENDERERS
// ═══════════════════════════════════════════════════════════════

// ─── Google Fonts ───
const fontLink = useMemo(() => (
<style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400;1,600&family=Source+Sans+3:wght@300;400;500;600;700&display=swap');`}</style>
), []);

// ── TITLE SCREEN ──
const renderTitle = () => (
<div className=“flex flex-col items-center justify-center min-h-screen px-6” style={{ background: `radial-gradient(ellipse at 50% 30%, #152238, ${COLORS.bg})` }}>
<div className="text-center mb-12">
<div className=“w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center” style={{ background: `linear-gradient(135deg, ${COLORS.gold}, #A8893E)`, boxShadow: `0 8px 32px ${COLORS.gold}44` }}>
<DoorOpen size={40} color="#0A1628" />
</div>
<h1 className=“text-5xl font-extrabold mb-2” style={{ color: COLORS.gold, fontFamily: “‘Playfair Display’, serif”, textShadow: `0 2px 20px ${COLORS.gold}33` }}>No. 10</h1>
<p className=“text-lg tracking-widest uppercase” style={{ color: COLORS.muted, fontFamily: “‘Source Sans 3’, sans-serif”, letterSpacing: “0.2em” }}>Prime Minister Simulator</p>
</div>
<div className="w-full max-w-xs flex flex-col gap-3">
<GoldButton onClick={() => { setError(null); if (!apiKey) { setScreen(“settings”); } else { setScreen(“setup”); } }}>New Game</GoldButton>
<button onClick={continueGame} disabled={!hasSave}
className={`px-6 py-3 rounded-lg font-semibold text-base transition-all ${!hasSave ? "opacity-30 cursor-not-allowed" : "hover:brightness-110"}`}
style={{ background: COLORS.card, color: COLORS.cream, border: `1px solid ${COLORS.cardBorder}`, fontFamily: “‘Playfair Display’, serif” }}>
Continue
</button>
<button onClick={() => setScreen(“legacy”)} className=“px-6 py-3 rounded-lg font-semibold text-base transition-all hover:brightness-110”
style={{ background: COLORS.card, color: COLORS.cream, border: `1px solid ${COLORS.cardBorder}`, fontFamily: “‘Playfair Display’, serif” }}>
<Award size={16} className="inline mr-2" /> Legacy Board
</button>
<button onClick={() => setScreen(“settings”)} className=“px-6 py-3 rounded-lg font-semibold text-sm transition-all hover:brightness-110”
style={{ color: COLORS.muted }}>
<Settings size={14} className="inline mr-1" /> Settings
</button>
</div>
</div>
);

// ── SETTINGS ──
const [tempKey, setTempKey] = useState(””);
const renderSettings = () => (
<div className=“min-h-screen px-6 py-8” style={{ background: COLORS.bg }}>
<div className="max-w-md mx-auto">
<button onClick={() => setScreen(gameState ? “dashboard” : “title”)} className=“mb-6 text-sm flex items-center gap-1” style={{ color: COLORS.gold }}>← Back</button>
<h2 className=“text-2xl font-bold mb-6” style={{ color: COLORS.gold, fontFamily: “‘Playfair Display’, serif” }}>Settings</h2>
<Card>
<label className=“block text-sm font-semibold mb-2” style={{ color: COLORS.cream }}>Anthropic API Key</label>
<input type=“password” value={tempKey || apiKey} onChange={e => setTempKey(e.target.value)} placeholder=“sk-ant-…”
className=“w-full rounded-lg px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2”
style={{ background: COLORS.cardBorder, color: COLORS.cream, focusRingColor: COLORS.gold }} />
<GoldButton small onClick={() => { saveApiKey(tempKey || apiKey); setTempKey(””); setScreen(gameState ? “dashboard” : “title”); }}>Save Key</GoldButton>
<p className=“text-xs mt-3” style={{ color: COLORS.muted }}>Your key is stored locally and only sent to the Anthropic API. Get one at console.anthropic.com</p>
</Card>
</div>
</div>
);

// ── SETUP ──
const renderSetup = () => (
<div className=“min-h-screen px-4 py-6” style={{ background: COLORS.bg }}>
<div className="max-w-md mx-auto">
<button onClick={() => setScreen(“title”)} className=“mb-4 text-sm flex items-center gap-1” style={{ color: COLORS.gold }}>← Back</button>
<h2 className=“text-2xl font-bold mb-1” style={{ color: COLORS.gold, fontFamily: “‘Playfair Display’, serif” }}>New Career</h2>
<p className=“text-sm mb-6” style={{ color: COLORS.muted }}>Configure your premiership</p>

```
    <div className="mb-4">
      <label className="block text-sm font-semibold mb-1" style={{ color: COLORS.cream }}>Leader Name</label>
      <input value={setupName} onChange={e => setSetupName(e.target.value)} placeholder="Your name"
        className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
        style={{ background: COLORS.cardBorder, color: COLORS.cream }} />
    </div>

    <SelectField label="Party" value={setupParty} onChange={setSetupParty} options={PARTIES} />
    <SelectField label="Difficulty" value={setupDifficulty} onChange={setSetupDifficulty}
      options={DIFFICULTIES} desc={v => DIFFICULTIES.find(d=>d.value===v)?.desc} />
    <SelectField label="Next Election" value={setupElection} onChange={setSetupElection}
      options={ELECTIONS} desc={`Flagship policies available: ${FLAGSHIP_COUNTS[setupElection] || 2}`} />
    <SelectField label="Game Mode" value={setupMode} onChange={setSetupMode}
      options={GAME_MODES} desc={v => GAME_MODES.find(m=>m.value===v)?.desc} />

    {error && <ErrorBox error={error} />}

    <div className="mt-6">
      <GoldButton onClick={beginCareer} disabled={loading} className="w-full">
        {loading ? <><Loader2 size={16} className="inline animate-spin mr-2"/>Generating…</> : <>Begin Career <ChevronRight size={16} className="inline"/></>}
      </GoldButton>
    </div>
    {loading && <LoadingScreen message={loadingMsg} />}
  </div>
</div>
```

);

// ── CABINET SELECTION ──
const renderCabinet = () => {
if (!cabinetCandidates) return <LoadingScreen message="Assembling cabinet candidates…" />;
const roles = [
{ key: “chancellor”, label: “Chancellor of the Exchequer”, desc: “Controls economic messaging” },
{ key: “homeSec”, label: “Home Secretary”, desc: “Controls immigration/crime” },
{ key: “foreignSec”, label: “Foreign Secretary”, desc: “Handles international crises” },
{ key: “healthSec”, label: “Health Secretary”, desc: “Handles NHS crises” },
{ key: “advisor”, label: “Chief Advisor / Spin Doctor”, desc: “Gives you advice each week” }
];
return (
<div className=“min-h-screen px-4 py-6” style={{ background: COLORS.bg }}>
<div className="max-w-lg mx-auto">
<h2 className=“text-2xl font-bold mb-1” style={{ color: COLORS.gold, fontFamily: “‘Playfair Display’, serif” }}>Select Your Cabinet</h2>
<p className=“text-sm mb-6” style={{ color: COLORS.muted }}>Choose wisely — competence and loyalty matter.</p>
{roles.map(role => (
<div key={role.key} className="mb-6">
<h3 className=“text-base font-bold mb-1” style={{ color: COLORS.cream }}>{role.label}</h3>
<p className=“text-xs mb-3” style={{ color: COLORS.muted }}>{role.desc}</p>
<div className="flex flex-col gap-2">
{(cabinetCandidates[role.key] || []).map((c, i) => {
const selected = (cabinetSelections[role.key] ?? 0) === i;
return (
<div key={i} onClick={() => setCabinetSelections(prev => ({ …prev, [role.key]: i }))}
className=“rounded-lg p-3 cursor-pointer transition-all”
style={{ background: selected ? COLORS.navy : COLORS.card, border: `2px solid ${selected ? COLORS.gold : COLORS.cardBorder}` }}>
<div className="flex justify-between items-start mb-1">
<span className=“font-semibold text-sm” style={{ color: selected ? COLORS.gold : COLORS.cream }}>{c.name}</span>
<span className=“text-xs px-2 py-0.5 rounded” style={{ background: COLORS.cardBorder, color: COLORS.muted }}>{c.lean}</span>
</div>
<p className=“text-xs mb-2” style={{ color: COLORS.muted }}>{c.bio}</p>
<div className="flex gap-3 text-xs">
<span style={{ color: COLORS.cream }}>⚡ Competence: <strong style={{ color: c.competence >= 7 ? COLORS.green : c.competence >= 5 ? COLORS.amber : COLORS.red }}>{c.competence}/10</strong></span>
<span style={{ color: COLORS.cream }}>🤝 Loyalty: <strong style={{ color: c.loyalty >= 7 ? COLORS.green : c.loyalty >= 5 ? COLORS.amber : COLORS.red }}>{c.loyalty}/10</strong></span>
</div>
{role.key === “advisor” && c.personality && <p className=“text-xs mt-1 italic” style={{ color: COLORS.gold }}>{c.personality}</p>}
</div>
);
})}
</div>
</div>
))}
<GoldButton onClick={confirmCabinet} className="w-full mt-4">Confirm Cabinet & Enter No. 10 <ChevronRight size={16} className="inline" /></GoldButton>
</div>
</div>
);
};

// ── DASHBOARD ──
const renderDashboard = () => {
if (!gameState) return null;
const gs = gameState;
const sc = gs.currentScenario;
const advisor = gs.cabinet?.find(c => c.roleKey === “advisor”);

```
return (
  <div className="min-h-screen pb-8" style={{ background: COLORS.bg }}>
    {/* Top Bar */}
    <div className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between" style={{ background: `${COLORS.bg}ee`, borderBottom: `1px solid ${COLORS.cardBorder}`, backdropFilter: "blur(8px)" }}>
      <div>
        <span className="text-xs font-semibold" style={{ color: COLORS.gold }}>WEEK {gs.week}</span>
        <p className="text-sm font-bold" style={{ color: COLORS.cream }}>{gs.pmName} · {gs.party}</p>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={resign} className="text-xs px-2 py-1 rounded" style={{ color: COLORS.red, border: `1px solid ${COLORS.red}33` }}>Resign</button>
        <button onClick={() => setScreen("settings")}><Settings size={18} style={{ color: COLORS.muted }} /></button>
      </div>
    </div>

    <div className="px-4 mt-4 max-w-lg mx-auto">
      {/* Metrics */}
      <Card className="mb-4">
        <div className="flex justify-between items-center mb-2 cursor-pointer" onClick={() => setMetricsExpanded(!metricsExpanded)}>
          <span className="text-xs font-bold tracking-wider uppercase" style={{ color: COLORS.gold }}>Metrics</span>
          {metricsExpanded ? <ChevronUp size={14} style={{ color: COLORS.muted }}/> : <ChevronDown size={14} style={{ color: COLORS.muted }}/>}
        </div>
        {metricsExpanded && <>
          <MetricBar label="Public Polling" value={gs.metrics.polling} icon="📊" thresholds={{ green: 45, amber: 30 }} />
          <MetricBar label="Media Sentiment" value={gs.metrics.media} icon="📰" thresholds={{ green: 45, amber: 30 }} />
          <MetricBar label="Party Stability" value={gs.metrics.partyStability} icon="🏛️" thresholds={{ green: 50, amber: 25 }} />
          <MetricBar label="Authority" value={gs.metrics.authority} icon="👑" thresholds={{ green: 45, amber: 30 }} />
          <div className="flex justify-between items-center mt-2 pt-2" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
            <span className="text-xs flex items-center gap-1" style={{ color: gs.metrics.backbenchRebels > 20 ? COLORS.red : gs.metrics.backbenchRebels > 10 ? COLORS.amber : COLORS.muted }}>
              <AlertTriangle size={12} /> {gs.metrics.backbenchRebels} MPs in revolt
            </span>
            <span className="text-xs" style={{ color: COLORS.muted }}>⏱ {gs.electionWeeksRemaining}w to election</span>
          </div>
        </>}
      </Card>

      {/* Poll Chart */}
      {gs.pollingHistory?.length > 1 && (
        <Card className="mb-4">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => setChartExpanded(!chartExpanded)}>
            <span className="text-xs font-bold tracking-wider uppercase" style={{ color: COLORS.gold }}>Opinion Polls</span>
            {chartExpanded ? <ChevronUp size={14} style={{ color: COLORS.muted }}/> : <ChevronDown size={14} style={{ color: COLORS.muted }}/>}
          </div>
          <div style={{ height: chartExpanded ? 200 : 80 }} className="mt-2 transition-all">
            <ResponsiveContainer>
              <LineChart data={gs.pollingHistory}>
                <XAxis dataKey="week" hide={!chartExpanded} tick={{ fontSize: 10, fill: COLORS.muted }} />
                {chartExpanded && <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: COLORS.muted }} />}
                {chartExpanded && <Tooltip contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, color: COLORS.cream, fontSize: 12 }} />}
                <Line type="monotone" dataKey="polling" stroke={COLORS.gold} strokeWidth={2} dot={chartExpanded} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Scenario */}
      {sc && (
        <Card className="mb-4" style={{ borderLeft: `4px solid ${COLORS.gold}` }}>
          <h3 className="text-lg font-bold mb-2" style={{ color: COLORS.cream, fontFamily: "'Playfair Display', serif" }}>{sc.title}</h3>
          <p className="text-sm mb-3 leading-relaxed" style={{ color: COLORS.muted }}>{sc.description}</p>
          {sc.tags && (
            <div className="flex flex-wrap gap-1">
              {sc.tags.map(t => <span key={t} className="text-xs px-2 py-0.5 rounded-full" style={{ background: COLORS.cardBorder, color: COLORS.gold }}>{t}</span>)}
            </div>
          )}
        </Card>
      )}

      {/* Advisor */}
      {advisor && (
        <Card className="mb-4" style={{ background: "#1A2838", borderLeft: `4px solid ${COLORS.amber}` }}>
          <div className="flex items-start gap-2">
            <MessageSquare size={16} style={{ color: COLORS.amber }} className="mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-xs font-bold" style={{ color: COLORS.amber }}>{advisor.name} — Chief Advisor</span>
              <p className="text-sm mt-1 italic" style={{ color: COLORS.cream }}>
                {turnResult?.advisorComment || gameState.advisorIntro || "Standing by for your decision, PM."}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Response Options */}
      <div className="mb-4">
        <h4 className="text-sm font-bold mb-3 tracking-wider uppercase" style={{ color: COLORS.gold }}>Your Response</h4>

        {/* Option A */}
        <div onClick={() => setSelectedResponse("A")}
          className="rounded-lg p-3 mb-2 cursor-pointer transition-all"
          style={{ background: selectedResponse === "A" ? COLORS.navy : COLORS.card, border: `2px solid ${selectedResponse === "A" ? COLORS.gold : COLORS.cardBorder}` }}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold" style={{ color: selectedResponse === "A" ? COLORS.gold : COLORS.muted }}>Option A</span>
          </div>
          <textarea value={editingA} onChange={e => setEditingA(e.target.value)} rows={3}
            className="w-full rounded px-2 py-1.5 text-sm resize-none focus:outline-none"
            style={{ background: "transparent", color: COLORS.cream, border: "none" }} />
        </div>

        {/* Option B */}
        <div onClick={() => setSelectedResponse("B")}
          className="rounded-lg p-3 mb-2 cursor-pointer transition-all"
          style={{ background: selectedResponse === "B" ? COLORS.navy : COLORS.card, border: `2px solid ${selectedResponse === "B" ? COLORS.gold : COLORS.cardBorder}` }}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold" style={{ color: selectedResponse === "B" ? COLORS.gold : COLORS.muted }}>Option B</span>
          </div>
          <textarea value={editingB} onChange={e => setEditingB(e.target.value)} rows={3}
            className="w-full rounded px-2 py-1.5 text-sm resize-none focus:outline-none"
            style={{ background: "transparent", color: COLORS.cream, border: "none" }} />
        </div>

        {/* Custom */}
        <div onClick={() => setSelectedResponse("C")}
          className="rounded-lg p-3 mb-2 cursor-pointer transition-all"
          style={{ background: selectedResponse === "C" ? COLORS.navy : COLORS.card, border: `2px solid ${selectedResponse === "C" ? COLORS.gold : COLORS.cardBorder}` }}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold" style={{ color: selectedResponse === "C" ? COLORS.gold : COLORS.muted }}>✍️ Write Your Own</span>
          </div>
          <textarea value={customResponse} onChange={e => setCustomResponse(e.target.value)} rows={4} placeholder="Write your own response…"
            className="w-full rounded px-2 py-1.5 text-sm resize-none focus:outline-none placeholder-gray-500"
            style={{ background: "transparent", color: COLORS.cream, border: "none" }} />
        </div>
      </div>

      {error && <ErrorBox error={error} onRetry={() => setError(null)} />}

      <div className="flex gap-2">
        <GoldButton onClick={submitResponse} disabled={loading} className="flex-1">
          {loading ? <><Loader2 size={16} className="inline animate-spin mr-2"/>Processing…</> : <>Submit Response <Send size={14} className="inline ml-1"/></>}
        </GoldButton>
      </div>

      {/* Flagship */}
      {gs.flagshipsRemaining > 0 && (
        <button onClick={() => { setSelectedFlagship(null); setScreen("flagship"); }}
          className="w-full mt-3 px-4 py-3 rounded-lg font-semibold text-sm transition-all hover:brightness-110"
          style={{ background: `linear-gradient(135deg, ${COLORS.amber}22, ${COLORS.gold}22)`, border: `2px solid ${COLORS.gold}`, color: COLORS.gold }}>
          🏛️ Launch Flagship Policy ({gs.flagshipsRemaining} remaining)
        </button>
      )}

      {loading && <LoadingScreen message={loadingMsg} />}
    </div>
  </div>
);
```

};

// ── RESULTS ──
const renderResults = () => {
if (!turnResult) return null;
const r = turnResult;
return (
<div className=“min-h-screen pb-8” style={{ background: COLORS.bg }}>
<div className="px-4 pt-6 max-w-lg mx-auto">
{/* Week header */}
<div className="text-center mb-6">
<span className=“text-xs tracking-widest uppercase” style={{ color: COLORS.muted }}>Week {(gameState?.week || 1) - 1} Results</span>
<h2 className=“text-xl font-bold mt-1” style={{ color: COLORS.gold, fontFamily: “‘Playfair Display’, serif” }}>The Verdict</h2>
</div>

```
      {/* Headlines */}
      {r.headlines && (
        <div className="mb-6">
          {r.headlines.map((h, i) => (
            <div key={i} className="mb-3 p-3 rounded-lg" style={{ background: COLORS.card, borderLeft: `4px solid ${h.sentiment === "positive" ? COLORS.green : h.sentiment === "negative" ? COLORS.red : COLORS.muted}` }}>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: COLORS.muted }}>{h.paper}</span>
              <p className="text-base font-bold mt-1" style={{ color: COLORS.cream, fontFamily: "'Playfair Display', serif" }}>{h.headline}</p>
            </div>
          ))}
        </div>
      )}

      {/* Metrics Update */}
      {r.metrics && (
        <Card className="mb-6">
          <span className="text-xs font-bold tracking-wider uppercase mb-3 block" style={{ color: COLORS.gold }}>Metrics Update</span>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Polling", val: r.metrics.polling, chg: r.metrics.pollingChange },
              { label: "Media", val: r.metrics.media, chg: r.metrics.mediaChange },
              { label: "Party", val: r.metrics.partyStability, chg: r.metrics.partyStabilityChange },
              { label: "Authority", val: r.metrics.authority, chg: r.metrics.authorityChange }
            ].map(m => (
              <div key={m.label} className="text-center p-2 rounded" style={{ background: COLORS.cardBorder }}>
                <span className="text-xs block" style={{ color: COLORS.muted }}>{m.label}</span>
                <span className="text-lg font-bold block" style={{ color: COLORS.cream }}>{m.val}</span>
                {m.chg != null && m.chg !== 0 && <span className="text-xs font-bold" style={{ color: m.chg > 0 ? COLORS.green : COLORS.red }}>{m.chg > 0 ? "+" : ""}{m.chg}</span>}
              </div>
            ))}
          </div>
          {r.metrics.backbenchRebelsChange != null && r.metrics.backbenchRebelsChange !== 0 && (
            <p className="text-xs mt-2 text-center" style={{ color: r.metrics.backbenchRebelsChange > 0 ? COLORS.red : COLORS.green }}>
              Backbench rebels: {r.metrics.backbenchRebels} ({r.metrics.backbenchRebelsChange > 0 ? "+" : ""}{r.metrics.backbenchRebelsChange})
            </p>
          )}
        </Card>
      )}

      {/* Narrative */}
      {r.narrative && (
        <Card className="mb-6" style={{ borderLeft: `4px solid ${COLORS.gold}` }}>
          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: COLORS.cream }}>{r.narrative}</p>
        </Card>
      )}

      {/* Advisor */}
      {r.advisorComment && (
        <Card className="mb-6" style={{ background: "#1A2838", borderLeft: `4px solid ${COLORS.amber}` }}>
          <span className="text-xs font-bold" style={{ color: COLORS.amber }}>💬 Chief Advisor</span>
          <p className="text-sm mt-1 italic" style={{ color: COLORS.cream }}>{r.advisorComment}</p>
        </Card>
      )}

      {/* Cabinet Events */}
      {r.cabinetEvents?.length > 0 && (
        <Card className="mb-6">
          <span className="text-xs font-bold tracking-wider uppercase mb-2 block" style={{ color: COLORS.gold }}>Cabinet Movements</span>
          {r.cabinetEvents.map((evt, i) => (
            <div key={i} className="text-sm mb-2 p-2 rounded" style={{ background: COLORS.cardBorder }}>
              <span className="font-semibold" style={{ color: COLORS.cream }}>{evt.ministerName}</span>
              <span className="text-xs ml-2" style={{ color: evt.loyaltyChange > 0 ? COLORS.green : evt.loyaltyChange < 0 ? COLORS.red : COLORS.muted }}>
                Loyalty: {evt.newLoyalty} ({evt.loyaltyChange > 0 ? "+" : ""}{evt.loyaltyChange})
              </span>
              <p className="text-xs mt-0.5" style={{ color: COLORS.muted }}>{evt.event}</p>
            </div>
          ))}
        </Card>
      )}

      {/* Persona Reactions */}
      {r.personas && (
        <div className="mb-6">
          <span className="text-xs font-bold tracking-wider uppercase mb-3 block" style={{ color: COLORS.gold }}>Voter Reactions</span>
          <div className="grid grid-cols-2 gap-2">
            {r.personas.map((p, i) => (
              <div key={i} className="rounded-lg p-2.5" style={{
                background: COLORS.card,
                borderLeft: `3px solid ${p.approvalChange > 0 ? COLORS.green : p.approvalChange < 0 ? COLORS.red : COLORS.muted}`
              }}>
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold" style={{ color: COLORS.cream }}>{p.name}</span>
                  <span className="text-xs font-bold" style={{ color: p.approvalChange > 0 ? COLORS.green : p.approvalChange < 0 ? COLORS.red : COLORS.muted }}>
                    {p.approvalChange > 0 ? "+" : ""}{p.approvalChange}
                  </span>
                </div>
                <div className="w-full h-1 rounded-full mt-1 mb-1" style={{ background: COLORS.cardBorder }}>
                  <div className="h-1 rounded-full" style={{ width: `${p.newApproval}%`, background: p.newApproval >= 50 ? COLORS.green : p.newApproval >= 30 ? COLORS.amber : COLORS.red }} />
                </div>
                <p className="text-xs italic" style={{ color: COLORS.muted }}>"{p.reaction}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stakeholders */}
      {r.stakeholders && (
        <div className="mb-6">
          <span className="text-xs font-bold tracking-wider uppercase mb-3 block" style={{ color: COLORS.gold }}>Stakeholder Reactions</span>
          <div className="flex flex-col gap-2">
            {r.stakeholders.map((s, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg p-2.5" style={{ background: COLORS.card }}>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="text-xs font-bold" style={{ color: COLORS.cream }}>{s.name}</span>
                    <span className="text-xs font-bold" style={{ color: s.approvalChange > 0 ? COLORS.green : s.approvalChange < 0 ? COLORS.red : COLORS.muted }}>
                      {s.approvalChange > 0 ? "+" : ""}{s.approvalChange} ({s.newApproval})
                    </span>
                  </div>
                  <p className="text-xs italic mt-0.5" style={{ color: COLORS.muted }}>"{s.reaction}"</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Challenge result if applicable */}
      {r.challengeResult && (
        <Card className="mb-6" style={{ border: `2px solid ${COLORS.green}` }}>
          <h3 className="text-base font-bold mb-1" style={{ color: COLORS.green }}>✅ Leadership Challenge Survived</h3>
          <p className="text-sm" style={{ color: COLORS.cream }}>{r.challengeResult.voteBreakdown}</p>
        </Card>
      )}

      <GoldButton onClick={advanceWeek} className="w-full">
        Next Week <ChevronRight size={16} className="inline"/>
      </GoldButton>
    </div>
  </div>
);
```

};

// ── PMQs ──
const renderPMQs = () => {
if (loading) return <LoadingScreen message="The Speaker calls order…" />;
if (!pmqsData) return <LoadingScreen message="Preparing the chamber…" />;
const timerColor = pmqsTimer <= 10 ? COLORS.red : pmqsTimer <= 20 ? COLORS.amber : COLORS.green;
return (
<div className=“min-h-screen pb-8” style={{ background: `linear-gradient(180deg, #1A0A0A, ${COLORS.bg})` }}>
<div className="px-4 pt-6 max-w-lg mx-auto">
<div className="text-center mb-6">
<h2 className=“text-2xl font-bold” style={{ color: COLORS.gold, fontFamily: “‘Playfair Display’, serif” }}>Prime Minister’s Questions</h2>
<p className=“text-xs mt-1” style={{ color: COLORS.muted }}>Week {gameState?.week}</p>
</div>

```
      {/* Timer */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full" style={{ background: `${timerColor}22`, border: `2px solid ${timerColor}` }}>
          <Timer size={20} style={{ color: timerColor }} />
          <span className="text-3xl font-bold tabular-nums" style={{ color: timerColor, fontFamily: "'Playfair Display', serif" }}>
            {Math.floor(pmqsTimer / 60)}:{String(pmqsTimer % 60).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Chamber mood */}
      <Card className="mb-4" style={{ borderLeft: `4px solid ${COLORS.red}` }}>
        <p className="text-xs mb-1" style={{ color: COLORS.muted }}>🏛️ {pmqsData.crowdMood}</p>
        <p className="text-xs mb-2" style={{ color: COLORS.muted }}>{pmqsData.context}</p>
        <div className="mt-2">
          <span className="text-xs font-bold" style={{ color: COLORS.red }}>{pmqsData.oppositionLeader}</span>
          <p className="text-base font-bold mt-1 italic" style={{ color: COLORS.cream, fontFamily: "'Playfair Display', serif" }}>
            "{pmqsData.attackLine}"
          </p>
        </div>
      </Card>

      {/* Response */}
      <Card className="mb-4">
        <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: COLORS.gold }}>Your Response</label>
        <textarea value={pmqsResponse} onChange={e => setPmqsResponse(e.target.value)} rows={5}
          placeholder="The Prime Minister responds…"
          className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 placeholder-gray-500"
          style={{ background: COLORS.cardBorder, color: COLORS.cream }}
          autoFocus />
      </Card>

      {error && <ErrorBox error={error} onRetry={() => setError(null)} />}

      <GoldButton onClick={submitPMQs} disabled={loading} className="w-full">
        {loading ? <><Loader2 size={16} className="inline animate-spin mr-2"/>The House reacts…</> : <>Deliver Response <Volume2 size={14} className="inline ml-1"/></>}
      </GoldButton>

      {pmqsTimer <= 0 && !loading && (
        <p className="text-center text-xs mt-3" style={{ color: COLORS.red }}>⏱ Time's up! A weak default response will be used.</p>
      )}
    </div>
  </div>
);
```

};

// ── FLAGSHIP ──
const renderFlagship = () => {
const policies = gameState?.flagshipPolicies || [];
return (
<div className=“min-h-screen pb-8” style={{ background: COLORS.bg }}>
<div className="px-4 pt-6 max-w-lg mx-auto">
<button onClick={() => setScreen(“dashboard”)} className=“mb-4 text-sm flex items-center gap-1” style={{ color: COLORS.gold }}>← Back to Dashboard</button>
<h2 className=“text-2xl font-bold mb-1” style={{ color: COLORS.gold, fontFamily: “‘Playfair Display’, serif” }}>🏛️ Flagship Policies</h2>
<p className=“text-sm mb-6” style={{ color: COLORS.muted }}>{gameState?.flagshipsRemaining} launch{gameState?.flagshipsRemaining !== 1 ? “es” : “”} remaining. Choose carefully.</p>

```
      {policies.map((p, i) => (
        <div key={i} onClick={() => setSelectedFlagship(i)}
          className="rounded-lg p-4 mb-3 cursor-pointer transition-all"
          style={{ background: selectedFlagship === i ? COLORS.navy : COLORS.card, border: `2px solid ${selectedFlagship === i ? COLORS.gold : COLORS.cardBorder}` }}>
          <h3 className="text-base font-bold mb-1" style={{ color: selectedFlagship === i ? COLORS.gold : COLORS.cream }}>{p.title}</h3>
          <p className="text-sm mb-2" style={{ color: COLORS.muted }}>{p.description}</p>
          <p className="text-xs italic" style={{ color: COLORS.amber }}>Impact: {p.expectedImpact}</p>
        </div>
      ))}

      {error && <ErrorBox error={error} onRetry={() => setError(null)} />}

      <GoldButton onClick={() => { if (selectedFlagship != null) launchFlagship(policies[selectedFlagship]); }}
        disabled={selectedFlagship == null || loading} className="w-full mt-4">
        {loading ? <><Loader2 size={16} className="inline animate-spin mr-2"/>Launching…</> : <>Launch Policy <Zap size={14} className="inline ml-1"/></>}
      </GoldButton>

      {loading && <LoadingScreen message={loadingMsg} />}
    </div>
  </div>
);
```

};

// ── LEADERSHIP CHALLENGE ──
const renderChallenge = () => {
if (loading && !challengeData) return <LoadingScreen message="A letter has been submitted to the 1922 Committee…" />;
return (
<div className=“min-h-screen pb-8” style={{ background: `linear-gradient(180deg, #2A0A0A, ${COLORS.bg})` }}>
<div className="px-4 pt-6 max-w-lg mx-auto">
<div className="text-center mb-6">
<AlertTriangle size={40} className=“mx-auto mb-3” style={{ color: COLORS.red }} />
<h2 className=“text-2xl font-bold” style={{ color: COLORS.red, fontFamily: “‘Playfair Display’, serif” }}>LEADERSHIP CHALLENGE</h2>
<p className=“text-sm mt-1” style={{ color: COLORS.muted }}>Your party has turned against you.</p>
</div>

```
      {challengeData?.challenger && (
        <Card className="mb-4" style={{ borderLeft: `4px solid ${COLORS.red}` }}>
          <span className="text-xs font-bold uppercase" style={{ color: COLORS.red }}>The Challenger</span>
          <h3 className="text-lg font-bold mt-1" style={{ color: COLORS.cream }}>{challengeData.challenger.name}</h3>
          <span className="text-xs" style={{ color: COLORS.muted }}>{challengeData.challenger.faction}</span>
          <p className="text-sm mt-2 italic" style={{ color: COLORS.cream }}>"{challengeData.challenger.pitch}"</p>
        </Card>
      )}

      <Card className="mb-4">
        <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: COLORS.gold }}>Your Defence</label>
        <textarea value={challengeResponse} onChange={e => setChallengeResponse(e.target.value)} rows={5}
          placeholder="Make your case to the parliamentary party…"
          className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 placeholder-gray-500"
          style={{ background: COLORS.cardBorder, color: COLORS.cream }} />
      </Card>

      {error && <ErrorBox error={error} onRetry={() => setError(null)} />}

      <GoldButton onClick={submitChallenge} disabled={loading || !challengeResponse.trim()} className="w-full">
        {loading ? <><Loader2 size={16} className="inline animate-spin mr-2"/>Votes being counted…</> : <>Submit Defence <Shield size={14} className="inline ml-1"/></>}
      </GoldButton>

      {loading && <LoadingScreen message="MPs file through the lobbies…" />}
    </div>
  </div>
);
```

};

// ── ELECTION ──
const renderElection = () => {
if (loading) return <LoadingScreen message="Polls have closed. Counting underway…" />;
if (!electionResult) return null;
const won = electionResult.result === “victory”;
return (
<div className=“min-h-screen pb-8” style={{ background: COLORS.bg }}>
<div className="px-4 pt-6 max-w-lg mx-auto text-center">
<div className="mb-6">
<Crown size={48} className=“mx-auto mb-3” style={{ color: won ? COLORS.gold : COLORS.red }} />
<h2 className=“text-3xl font-bold” style={{ color: won ? COLORS.gold : COLORS.red, fontFamily: “‘Playfair Display’, serif” }}>
{won ? “ELECTION VICTORY” : “ELECTION DEFEAT”}
</h2>
</div>

```
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card><span className="text-xs block" style={{ color: COLORS.muted }}>Your Seats</span><span className="text-2xl font-bold block" style={{ color: COLORS.cream }}>{electionResult.seatCount}</span></Card>
        <Card><span className="text-xs block" style={{ color: COLORS.muted }}>Opposition</span><span className="text-2xl font-bold block" style={{ color: COLORS.cream }}>{electionResult.oppositionSeats}</span></Card>
        <Card><span className="text-xs block" style={{ color: COLORS.muted }}>Vote Share</span><span className="text-2xl font-bold block" style={{ color: COLORS.cream }}>{electionResult.voteShare}%</span></Card>
        <Card><span className="text-xs block" style={{ color: COLORS.muted }}>Majority</span><span className="text-2xl font-bold block" style={{ color: electionResult.majority > 0 ? COLORS.green : COLORS.red }}>{electionResult.majority}</span></Card>
      </div>

      <Card className="mb-6 text-left" style={{ borderLeft: `4px solid ${won ? COLORS.gold : COLORS.red}` }}>
        <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: COLORS.cream }}>{electionResult.narrative}</p>
      </Card>

      {won ? (
        <GoldButton onClick={() => {
          setEditingA(gameState?.currentScenario?.suggestedResponseA || "");
          setEditingB(gameState?.currentScenario?.suggestedResponseB || "");
          setScreen("dashboard");
        }} className="w-full">Begin New Term <ChevronRight size={16} className="inline"/></GoldButton>
      ) : (
        <GoldButton onClick={() => setScreen("gameover")} className="w-full">View Legacy</GoldButton>
      )}
    </div>
  </div>
);
```

};

// ── GAME OVER ──
const renderGameOver = () => {
return (
<div className=“min-h-screen pb-8” style={{ background: `linear-gradient(180deg, #0A0A1A, ${COLORS.bg})` }}>
<div className="px-4 pt-6 max-w-lg mx-auto">
<div className="text-center mb-6">
<h2 className=“text-3xl font-bold mb-2” style={{ color: COLORS.gold, fontFamily: “‘Playfair Display’, serif” }}>End of an Era</h2>
<p className=“text-sm” style={{ color: COLORS.muted }}>{gameState?.gameOverDesc || “The PM has left office.”}</p>
<p className=“text-xs mt-1” style={{ color: COLORS.muted }}>{gameState?.pmName} · {gameState?.party} · {gameState?.week} weeks</p>
</div>

```
      {loading && <LoadingScreen message="History renders its judgement…" />}

      {legacyData && (
        <>
          {/* Epitaph */}
          <Card className="mb-6 text-center" style={{ border: `2px solid ${COLORS.gold}` }}>
            <p className="text-lg italic font-semibold" style={{ color: COLORS.gold, fontFamily: "'Playfair Display', serif" }}>"{legacyData.epitaph}"</p>
          </Card>

          {/* Obituary */}
          <Card className="mb-6" style={{ borderLeft: `4px solid ${COLORS.gold}` }}>
            <span className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: COLORS.gold }}>Political Obituary</span>
            <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: COLORS.cream }}>{legacyData.obituary}</p>
          </Card>

          {/* Scores */}
          <Card className="mb-6">
            <span className="text-xs font-bold uppercase tracking-wider block mb-3" style={{ color: COLORS.gold }}>Legacy Scorecard</span>
            {legacyData.scores && Object.entries(legacyData.scores).filter(([k]) => k !== "overall").map(([key, val]) => (
              <div key={key} className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: COLORS.cream }}>{key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}</span>
                  <span style={{ color: val >= 60 ? COLORS.green : val >= 40 ? COLORS.amber : COLORS.red }}>{val}</span>
                </div>
                <div className="w-full h-1.5 rounded-full" style={{ background: COLORS.cardBorder }}>
                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${val}%`, background: val >= 60 ? COLORS.green : val >= 40 ? COLORS.amber : COLORS.red }} />
                </div>
              </div>
            ))}
            {legacyData.scores?.overall != null && (
              <div className="mt-4 pt-3 text-center" style={{ borderTop: `1px solid ${COLORS.cardBorder}` }}>
                <span className="text-xs uppercase tracking-wider block" style={{ color: COLORS.muted }}>Overall Legacy</span>
                <span className="text-4xl font-bold" style={{ color: COLORS.gold, fontFamily: "'Playfair Display', serif" }}>{legacyData.scores.overall}</span>
              </div>
            )}
          </Card>
        </>
      )}

      {/* Buttons */}
      <div className="flex flex-col gap-2">
        <button onClick={() => setScreen("memoir")} className="px-4 py-3 rounded-lg font-semibold text-sm transition-all"
          style={{ background: COLORS.card, color: COLORS.cream, border: `1px solid ${COLORS.cardBorder}` }}>
          <BookOpen size={14} className="inline mr-2" /> View Full Memoir
        </button>
        <GoldButton onClick={() => {
          setGameState(null); setTurnResult(null); setLegacyData(null); setChallengeData(null);
          setElectionResult(null); setPmqsData(null); setSetupName("");
          setScreen("setup");
        }} className="w-full">New Game</GoldButton>
        <button onClick={() => setScreen("title")} className="text-sm py-2" style={{ color: COLORS.muted }}>Back to Title</button>
      </div>
    </div>
  </div>
);
```

};

// ── MEMOIR ──
const renderMemoir = () => {
const entries = gameState?.memoir || [];
return (
<div className=“min-h-screen pb-8” style={{ background: COLORS.bg }}>
<div className="px-4 pt-6 max-w-lg mx-auto">
<button onClick={() => setScreen(“gameover”)} className=“mb-4 text-sm flex items-center gap-1” style={{ color: COLORS.gold }}>← Back</button>
<h2 className=“text-2xl font-bold mb-1” style={{ color: COLORS.gold, fontFamily: “‘Playfair Display’, serif” }}>The Memoir</h2>
<p className=“text-sm mb-6 italic” style={{ color: COLORS.muted }}>”{gameState?.pmName}: My Time at No. 10”</p>
{entries.length === 0 ? (
<p className=“text-sm” style={{ color: COLORS.muted }}>No entries recorded.</p>
) : entries.map((e, i) => (
<div key={i} className=“mb-4 pb-4” style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
<span className=“text-xs font-bold” style={{ color: COLORS.gold }}>Week {e.week}</span>
<p className=“text-sm mt-1 italic leading-relaxed” style={{ color: COLORS.cream }}>{e.entry}</p>
</div>
))}
</div>
</div>
);
};

// ── LEGACY BOARD ──
const renderLegacy = () => (
<div className=“min-h-screen pb-8” style={{ background: COLORS.bg }}>
<div className="px-4 pt-6 max-w-lg mx-auto">
<button onClick={() => setScreen(“title”)} className=“mb-4 text-sm flex items-center gap-1” style={{ color: COLORS.gold }}>← Back</button>
<h2 className=“text-2xl font-bold mb-1” style={{ color: COLORS.gold, fontFamily: “‘Playfair Display’, serif” }}>
<Award size={24} className="inline mr-2" />Legacy Board
</h2>
<p className=“text-sm mb-6” style={{ color: COLORS.muted }}>Your hall of fame & shame</p>
{legacyBoard.length === 0 ? (
<Card><p className=“text-sm text-center” style={{ color: COLORS.muted }}>No premierships completed yet.</p></Card>
) : legacyBoard.map((e, i) => (
<Card key={i} className="mb-3">
<div className="flex justify-between items-start">
<div>
<span className=“text-sm font-bold” style={{ color: i === 0 ? COLORS.gold : COLORS.cream }}>
{i === 0 && “👑 “}{e.name}
</span>
<span className=“text-xs ml-2” style={{ color: COLORS.muted }}>{e.party}</span>
</div>
<span className="text-lg font-bold" style={{ color: e.score >= 60 ? COLORS.green : e.score >= 40 ? COLORS.amber : COLORS.red }}>{e.score}</span>
</div>
<p className=“text-xs mt-1” style={{ color: COLORS.muted }}>{e.weeks} weeks · {e.mode} · {e.date}</p>
<p className=“text-xs mt-1” style={{ color: COLORS.muted }}>{e.howEnded}</p>
{e.epitaph && <p className=“text-xs mt-1 italic” style={{ color: COLORS.gold }}>”{e.epitaph}”</p>}
</Card>
))}
</div>
</div>
);

// ═══════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════
return (
<div className=“min-h-screen” style={{ background: COLORS.bg, color: COLORS.cream, fontFamily: “‘Source Sans 3’, sans-serif” }}>
{fontLink}
{screen === “loading” && <LoadingScreen message="Loading No. 10…" />}
{screen === “title” && renderTitle()}
{screen === “settings” && renderSettings()}
{screen === “setup” && renderSetup()}
{screen === “cabinet” && renderCabinet()}
{screen === “dashboard” && renderDashboard()}
{screen === “results” && renderResults()}
{screen === “pmqs” && renderPMQs()}
{screen === “flagship” && renderFlagship()}
{screen === “challenge” && renderChallenge()}
{screen === “election” && renderElection()}
{screen === “gameover” && renderGameOver()}
{screen === “memoir” && renderMemoir()}
{screen === “legacy” && renderLegacy()}
</div>
);
}