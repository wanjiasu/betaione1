"use client";

import { useState, useEffect, useMemo } from "react";
import { Send, Wifi, Terminal, Zap, PlusCircle, Plus } from "lucide-react";

type Language = "en" | "zh";

interface TimeZone {
  label: string;
  value: string;
  offset: number;
}

const i18n = {
  en: {
    nav_cta: "Telegram",
    hero_badge: "LIVE EXPERIMENT #001",
    hero_title_1: "Stop Betting.",
    hero_title_2: "Start Investing.",
    hero_sub:
      "We size everything like a quant book, not a degen. Follow the verified journey from $1,000 to $9,000+.",
    blog_title: "Market Intelligence",
  },
  zh: {
    nav_cta: "连接机器人",
    hero_badge: "实盘实验 #001",
    hero_title_1: "智能AGENT。",
    hero_title_2: "智慧投资。",
    hero_sub: "像量化机构一样分配资金。见证 $1,000 到 $9,000+ 的真实旅程。",
    blog_title: "市场情报",
  },
};

import { getTopMatches, getCapitalGrowth, getBasketballMatch, MatchData, CapitalData, BasketballMatchData } from './actions';

export default function Home() {
  const [lang, setLang] = useState<Language>("en");
  const [timeZones, setTimeZones] = useState<TimeZone[]>([]);
  const [selectedTimeZone, setSelectedTimeZone] = useState<string>("Asia/Shanghai");
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [basketballMatch, setBasketballMatch] = useState<BasketballMatchData | null>(null);
  const [capitalData, setCapitalData] = useState<CapitalData[]>([]);

  useEffect(() => {
    // Load timezones
    fetch("/time_offset.json")
      .then((res) => res.json())
      .then((data) => {
        setTimeZones(data);
        if (data.length > 0) {
          // Keep Shanghai as default if available, or first one
          const shanghai = data.find((tz: TimeZone) => tz.value === "Asia/Shanghai");
          setSelectedTimeZone(shanghai ? shanghai.value : data[0].value);
        }
      })
      .catch((err) => console.error("Failed to load timezones:", err));
      
    // Load capital growth data
    getCapitalGrowth()
      .then(data => setCapitalData(data))
      .catch(err => console.error("Failed to load capital data:", err));

    const userLang = navigator.language;
    if (userLang && userLang.startsWith("zh")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLang("zh");
    }
  }, []);

  useEffect(() => {
    if (!selectedTimeZone || timeZones.length === 0) return;

    const tzParams = timeZones.find(tz => tz.value === selectedTimeZone);
    if (!tzParams) return;

    const offset = tzParams.offset;
    const now = new Date();
    
    // Calculate local midnight
    // We want "Today 00:00" in the selected timezone
    // UTC time + offset*3600*1000 = Local Time
    // We want to find a UTC time T such that (T + offset) is YYYY-MM-DD 00:00:00
    
    // 1. Get current time in target timezone components
    // We can use the offset to approximate "Today"
    const utcNow = now.getTime();
    const localTimeNow = utcNow + (offset * 3600 * 1000);
    const localDateObj = new Date(localTimeNow);
    
    // 2. Set to midnight (start of today in local time)
    localDateObj.setUTCHours(0, 0, 0, 0);
    const localMidnight = localDateObj.getTime();
    
    // 3. Convert back to UTC
    const startUTC = new Date(localMidnight - (offset * 3600 * 1000));
    
    // 4. End is +48h - 1ms (Today + Tomorrow)
    const endUTC = new Date(localMidnight + (48 * 3600 * 1000) - 1 - (offset * 3600 * 1000));
    
    getTopMatches(startUTC.toISOString(), endUTC.toISOString())
      .then(data => {
        setMatches(data);
      })
      .catch(err => console.error("Failed to fetch match data:", err));

    getBasketballMatch(startUTC.toISOString(), endUTC.toISOString())
      .then(data => setBasketballMatch(data))
      .catch(err => console.error("Failed to load basketball match:", err));
      
  }, [selectedTimeZone, timeZones]);

  const t = i18n[lang];
  const matchData = matches.length > 0 ? matches[0] : null;
  const lastCapital = capitalData.length > 0 ? capitalData[capitalData.length - 1] : null;
  const firstCapital = capitalData.length > 0 ? capitalData[0] : null;
  const prevCapital = capitalData.length > 1 ? capitalData[capitalData.length - 2] : null;
  const profitChange = lastCapital && prevCapital 
    ? ((lastCapital.capital - prevCapital.capital) / prevCapital.capital * 100).toFixed(2)
    : "0.00";
  const isProfit = parseFloat(profitChange) >= 0;

  const totalROI = lastCapital && firstCapital
    ? ((lastCapital.capital - firstCapital.capital) / firstCapital.capital * 100).toFixed(0)
    : "0";
  const isTotalProfit = parseFloat(totalROI) >= 0;

  // Chart Generation Logic
  const chartPoints = useMemo(() => {
    if (capitalData.length === 0) return "";
    
    const maxCapital = Math.max(...capitalData.map(d => d.capital));
    const minCapital = Math.min(...capitalData.map(d => d.capital));
    const range = maxCapital - minCapital || 1;
    
    // SVG Viewport: width 600, height 300
    const width = 600;
    const height = 300;
    
    const points = capitalData.map((d, i) => {
      const x = (i / (capitalData.length - 1)) * width;
      // Invert Y axis because SVG 0 is at top
      const y = height - ((d.capital - minCapital) / range) * height; 
      return `${x},${y}`;
    }).join(" ");
    
    return `M${points}`;
  }, [capitalData]);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-tech/30">
      <div className="fintech-bg absolute inset-0 pointer-events-none fixed"></div>

      <div className="bg-primary text-white h-9 flex items-center overflow-hidden relative z-50 text-[11px] font-medium border-b border-slate-800">
        <div className="absolute left-0 bg-profit px-4 h-full flex items-center z-10 font-bold tracking-widest shadow-lg">
          LIVE
        </div>
        <div className="whitespace-nowrap flex items-center pl-4 animate-scroll w-max font-mono">
          <div className="flex gap-10 items-center pr-10">
            <span className="text-slate-300">
              ⚽ Alpha: <span className={`${isTotalProfit ? "text-profit" : "text-red-400"} font-bold`}>Total {isTotalProfit ? "+" : ""}{totalROI}% ROI</span>
            </span>
            <span className="text-slate-300">
              📉 Today: <span className="text-loss font-bold">Man Utd (-20% DD)</span>
            </span>
            <span className="text-slate-300">
              🔔 NEW SIGNAL:{" "}
              <span className="text-white font-bold">Villarreal vs Getafe (Home Win)</span>
            </span>
            <span className="text-slate-300">
              📈 Portfolio: <span className="text-profit font-bold">All Time High</span>
            </span>
          </div>
          <div className="flex gap-10 items-center pr-10">
            <span className="text-slate-300">
              ⚽ Alpha: <span className={`${isTotalProfit ? "text-profit" : "text-red-400"} font-bold`}>Total {isTotalProfit ? "+" : ""}{totalROI}% ROI</span>
            </span>
            <span className="text-slate-300">
              📉 Today: <span className="text-loss font-bold">Man Utd (-20% DD)</span>
            </span>
            <span className="text-slate-300">
              🔔 NEW SIGNAL:{" "}
              <span className="text-white font-bold">Villarreal vs Getafe (Home Win)</span>
            </span>
            <span className="text-slate-300">
              📈 Portfolio: <span className="text-profit font-bold">All Time High</span>
            </span>
          </div>
        </div>
      </div>

      <nav className="sticky top-0 z-40 bg-surface/90 backdrop-blur border-b border-border h-16">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-tech rounded-lg flex items-center justify-center text-white font-black text-xl shadow-sm">
              β
            </div>
            <div className="font-bold text-xl tracking-tight text-primary">
              beta<span className="text-tech">ione</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="relative hidden sm:block">
                <select
                  id="timezone-select"
                  value={selectedTimeZone}
                  onChange={(e) => setSelectedTimeZone(e.target.value)}
                  className="bg-slate-50 text-xs font-bold text-muted border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-tech cursor-pointer hover:bg-slate-100"
                >
                  {timeZones.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative hidden sm:block">
                <select
                  id="lang-select"
                  value={lang}
                  onChange={(e) => setLang(e.target.value as Language)}
                  className="bg-slate-50 text-xs font-bold text-muted border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-tech cursor-pointer hover:bg-slate-100"
                >
                  <option value="en">English</option>
                  <option value="zh">中文</option>
                </select>
              </div>
            </div>
            <a
              href="https://t.me/betaionebot"
              target="_blank"
              className="bg-primary hover:bg-slate-800 text-white px-5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-lg transform active:scale-95"
            >
              <Send className="w-3 h-3" />
              <span>{t.nav_cta}</span>
            </a>
          </div>
        </div>
      </nav>

      <section className="pt-10 pb-16 px-4 relative z-10 bg-gradient-to-b from-white to-slate-50 border-b border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-8 lg:gap-12">
            <div className="lg:w-5/12 pt-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-blue-50 text-tech text-[10px] font-bold mb-4 border border-blue-100">
                <span className="w-1.5 h-1.5 bg-tech rounded-full animate-pulse"></span>
                <span>{t.hero_badge}</span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-black text-primary tracking-tight leading-[1.1] mb-4">
                <span>{t.hero_title_1}</span> <br />
                <span>{t.hero_title_2}</span>
              </h1>
              <p className="text-muted text-sm leading-relaxed max-w-md mb-6">
                {t.hero_sub}
              </p>

              <div className="flex gap-6 border-t border-border pt-6">
                <div>
                  <div className="text-[10px] text-muted uppercase font-bold">Total ROI</div>
                  <div className={`text-xl font-black ${isTotalProfit ? "text-profit" : "text-red-400"} font-mono`}>
                    {isTotalProfit ? "+" : ""}{totalROI}%
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted uppercase font-bold">Win Rate</div>
                  <div className="text-xl font-black text-primary font-mono">62%</div>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-7/12 bg-chartBg border border-slate-700 rounded-xl shadow-xl relative overflow-hidden text-white flex flex-col md:flex-row h-auto min-h-[280px]">
              <div className="md:w-5/12 p-6 border-b md:border-b-0 md:border-r border-slate-700 bg-slate-900/50 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                    Capital Pool (Virtual)
                  </h3>
                  <div className="space-y-5">
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono mb-1">
                        <span>START (Day 1)</span>
                        <span>CURRENT (Day {capitalData.length})</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-slate-400 font-mono">$1,000</span>
                        <span className="text-xs text-slate-600">→</span>
                        <span className="text-2xl font-black text-white font-mono">${lastCapital ? lastCapital.capital.toLocaleString() : "---"}</span>
                      </div>
                    </div>

                    <div className="bg-red-500/10 border border-red-500/20 rounded p-3">
                      <div className="text-[10px] text-red-400 font-bold mb-1">
                        LAST 24H ACTION {lastCapital ? `(${new Date(lastCapital.day).toLocaleDateString('en-US', {month: 'short', day: 'numeric'}).toUpperCase()})` : ""}
                      </div>
                      <div className="text-[10px] text-slate-300 font-mono leading-tight space-y-1">
                        <div className="flex justify-between">
                          <span>Result:</span>{" "}
                          <span className={`${isProfit ? "text-profit" : "text-red-400"} font-bold`}>
                            {isProfit ? "+" : ""}{profitChange}% {isProfit ? "Growth" : "Drawdown"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:w-7/12 relative h-64 md:h-auto p-4 bg-slate-800/20">
                <div className="absolute top-4 right-4 z-10 flex bg-slate-800 p-0.5 rounded-lg border border-slate-600">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-profit text-white">
                    Real PnL
                  </span>
                </div>
                <svg
                  viewBox="0 0 600 300"
                  className="w-full h-full overflow-visible"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#059669" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#059669" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <g className="grid-lines opacity-20">
                    <line x1="0" y1="260" x2="600" y2="260" stroke="#fff" />
                    <line x1="0" y1="190" x2="600" y2="190" stroke="#fff" strokeDasharray="4 4" />
                    <line x1="0" y1="120" x2="600" y2="120" stroke="#fff" strokeDasharray="4 4" />
                    <line x1="0" y1="50" x2="600" y2="50" stroke="#fff" strokeDasharray="4 4" />
                  </g>
                  {chartPoints && (
                    <path
                      d={chartPoints}
                      fill="none"
                      stroke="#059669"
                      strokeWidth="2.5"
                      className="chart-line"
                    />
                  )}
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 relative z-20 pb-16 -mt-8">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-primary">Your Investment Team</h2>
            <p className="text-muted text-sm">Active Agents analyzing the market right now.</p>
          </div>

          <div className="bg-surface border border-border rounded-2xl shadow-soft overflow-hidden relative">
            <div className="bg-slate-50 border-b border-border px-4 py-2 flex flex-col sm:flex-row justify-between items-center text-[10px] font-mono text-muted gap-2 sm:gap-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-tech rounded-full animate-pulse"></span> AGENT:
                FOOTBALL ALPHA v4.3
              </div>
              <div className="flex items-center gap-2">
                <Wifi className="w-3 h-3" /> LIVE FEED: ESTADIO DE LA CERAMICA
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[420px]">
              <div className="lg:col-span-3 p-6 border-b lg:border-b-0 lg:border-r border-border bg-slate-50/40 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-lg bg-white border border-border shadow-sm flex items-center justify-center text-2xl shrink-0">
                    ⚽
                  </div>
                  <div>
                    <h3 className="font-bold text-primary text-sm">Football Alpha</h3>
                    <div className="text-[10px] text-muted font-mono mt-0.5">
                      Value Model · xG
                    </div>
                  </div>
                </div>

                <div className="text-[10px] font-bold text-muted uppercase mb-2 flex items-center gap-2">
                  <Terminal className="w-3 h-3" /> Logic Stream
                </div>

                <div className="flex-1 bg-primary rounded-xl p-4 font-mono text-[10px] text-gray-300 relative shadow-inner flex flex-col overflow-hidden">
                  <div className="terminal-scan"></div>
                  <div className="space-y-3 leading-relaxed z-10 overflow-y-auto no-scrollbar">
                    <div>
                      <div className="text-muted">&gt; Analyzing Home Form...</div>
                      <div className="text-white pl-2 border-l border-slate-600 ml-1">
                        Villarreal elite home record (6-1-0). Goals 18:4.
                      </div>
                    </div>
                    <div>
                      <div className="text-muted">&gt; Analyzing Away Form...</div>
                      <div className="text-slate-400 pl-2 border-l border-slate-600 ml-1">
                        Getafe away form uneven (3-0-4).
                      </div>
                    </div>
                    <div>
                      <div className="text-muted">&gt; Calculating EV...</div>
                      <div className="text-profit pl-2 border-l border-profit ml-1">
                        Model: 74% Win Prob vs Market 61%. Edge Found.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 p-0 border-b lg:border-b-0 lg:border-r border-border bg-slate-900 relative flex flex-col">
                <div className="absolute top-3 right-3 bg-profit/20 text-profit text-[10px] font-bold px-2 py-0.5 rounded border border-profit/30 z-10">
                  RAW TELEGRAM SIGNAL
                </div>

                <div className="flex-1 p-8 font-mono text-xs text-slate-300 overflow-auto custom-scrollbar leading-relaxed">
                  {matchData ? (
                    <>
                      <p className="mb-2">
                        ⚽️ <span className="font-bold text-white">Match: {matchData.home_name} vs {matchData.away_name}</span>
                      </p>
                      <p className="mb-2">🕒 Kickoff: {new Date(matchData.fixture_date).toLocaleString('en-GB', {
                        timeZone: selectedTimeZone,
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      }).replace(',', '')}</p>
                      <p className="mb-4">
                        🏆 Predicted Result:{" "}
                        <span className="text-white font-bold bg-tech/50 px-1 rounded">
                          {matchData.predict_winner}
                        </span>
                        <br />
                        🎯 Confidence: <span className="text-profit font-bold">{Math.round(matchData.confidence * 100)}%</span>
                      </p>

                      <p className="mb-2 text-slate-400 border-b border-slate-700 pb-1">
                        💡 Key Points:
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-slate-400">
                        {Array.isArray(matchData.key_tag_evidence) && matchData.key_tag_evidence.length > 0 ? matchData.key_tag_evidence.map((ev, i) => (
                          <li key={i}>{ev}</li>
                        )) : <li>{matchData.key_tag_evidence ? String(matchData.key_tag_evidence) : "No key points available."}</li>}
                      </ul>

                      <p className="mt-4 border-t border-slate-700 pt-2">
                        💰 Odds: <span className="text-white font-bold">
                          {matchData.home_odd}/{matchData.draw_odd}/{matchData.away_odd}
                        </span>
                      </p>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500">
                      <p>Scanning for high-confidence opportunities...</p>
                      <p className="text-xs mt-2">Targeting &gt;60% confidence matches</p>
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-slate-700 bg-slate-800/50 text-center">
                  <a
                    href="https://t.me/betaionebot"
                    target="_blank"
                    className="inline-flex items-center gap-2 text-xs font-bold text-tech hover:text-white transition group"
                  >
                    <Zap className="w-3 h-3 group-hover:fill-current" /> Sync to Telegram
                  </a>
                </div>
              </div>

              <div className="lg:col-span-3 bg-slate-50 flex flex-col">
                <div className="p-3 border-b border-border bg-white flex justify-between items-center">
                  <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider">
                    More Today
                  </h4>
                  <span className="text-[10px] font-bold text-tech bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    4 Matches
                  </span>
                </div>

                <div className="flex-1 overflow-hidden relative h-64 p-3">
                  <div className="space-y-2 animate-scroll-y">
                    {matches.slice(1).map((match, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[10px] bg-white p-2.5 rounded border border-border shadow-sm">
                        <div>
                          <div className="font-bold text-primary">{match.home_name} vs {match.away_name}</div>
                          <div className="text-muted">{match.predict_winner}</div>
                        </div>
                        <span className="font-bold text-tech bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                          {match.predict_winner.toLowerCase().includes("home") ? match.home_odd :
                           match.predict_winner.toLowerCase().includes("away") ? match.away_odd : match.draw_odd}
                        </span>
                      </div>
                    ))}
                    {matches.length <= 1 && (
                      <div className="text-center text-slate-400 text-[10px] p-4">
                        No more matches for today.
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 border-t border-border bg-white mt-auto text-center">
                  <a
                    href="https://t.me/betaionebot"
                    className="inline-flex items-center justify-center gap-1 text-xs font-bold text-nba hover:underline"
                  >
                    Add Agent for Full List <PlusCircle className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-2xl shadow-soft overflow-hidden relative group opacity-90 hover:opacity-100 transition">
            <div className="bg-slate-50 border-b border-border px-4 py-2 flex justify-between items-center text-[10px] font-mono text-muted">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-nba rounded-full animate-pulse-slow"></span> AGENT: NBA
                QUANT
              </div>
              <div>SCANNED: 8,102 PROPS</div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[350px]">
              <div className="lg:col-span-3 p-6 border-b lg:border-b-0 lg:border-r border-border bg-slate-50/40 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-white border border-border shadow-sm flex items-center justify-center text-3xl mb-4">
                  🏀
                </div>
                <h3 className="font-bold text-primary text-lg">NBA Quant</h3>
                <div className="text-[10px] text-muted font-mono mt-1">v2.0 · Props</div>
              </div>
              <div className="lg:col-span-6 p-0 border-b lg:border-b-0 lg:border-r border-border bg-[#0F172A] relative flex flex-col">
                <div className="absolute top-3 right-3 bg-nba/20 text-nba text-[10px] font-bold px-2 py-0.5 rounded border border-nba/30 z-10">
                  RAW TELEGRAM OUTPUT
                </div>
                <div className="flex-1 p-8 font-mono text-xs text-slate-300 overflow-auto custom-scrollbar leading-relaxed">
                  {basketballMatch ? (
                    <>
                      <p className="mb-2">
                        🏀 <span className="font-bold text-white">Match: {basketballMatch.home_name} vs {basketballMatch.away_name}</span>
                      </p>
                      <p className="mb-2">🕒 Kickoff: {new Date(basketballMatch.fixture_date).toLocaleString('en-GB', {
                        timeZone: selectedTimeZone,
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      }).replace(',', '')}</p>
                      <p className="mb-4">
                        🏆 Prediction:{" "}
                        <span className="text-white font-bold bg-nba/50 px-1 rounded">
                          {basketballMatch.predict_winner}
                        </span>
                        <br />
                        🎯 Confidence: <span className="text-nba font-bold">{Math.round(basketballMatch.confidence * 100)}%</span>
                      </p>
                      <p className="mb-2 text-slate-400 border-b border-slate-700 pb-1">
                        💡 Analysis:
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-slate-400">
                        {Array.isArray(basketballMatch.key_tag_evidence) && basketballMatch.key_tag_evidence.length > 0 ? basketballMatch.key_tag_evidence.map((ev, i) => (
                          <li key={i}>{ev}</li>
                        )) : <li>{basketballMatch.key_tag_evidence ? String(basketballMatch.key_tag_evidence) : "No analysis available."}</li>}
                      </ul>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500">
                      <p>Scanning for high-confidence NBA props...</p>
                      <p className="text-xs mt-2">Targeting &gt;60% confidence</p>
                    </div>
                  )}
                </div>
                <div className="p-3 border-t border-slate-700 bg-slate-800/50 text-center">
                  <a
                    href="https://t.me/betaionebot"
                    target="_blank"
                    className="inline-flex items-center gap-2 text-xs font-bold text-nba hover:text-white transition"
                  >
                    <Zap className="w-3 h-3" /> Sync to Telegram
                  </a>
                </div>
              </div>
              <div className="lg:col-span-3 bg-slate-50 flex flex-col">
                <div className="p-3 border-b border-border bg-white flex justify-between items-center">
                  <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider">
                    Signals
                  </h4>
                  <span className="text-[10px] font-bold text-profit bg-green-50 px-2 py-0.5 rounded border border-green-100">
                    2W-0L
                  </span>
                </div>
                <div className="flex-1 p-3 space-y-2">
                  <div className="flex justify-between items-center text-[10px] bg-white p-2.5 rounded border border-border shadow-sm">
                    <div>
                      <div className="font-bold text-primary">Curry O25.5</div>
                      <div className="text-muted">Yesterday</div>
                    </div>
                    <span className="font-bold text-profit bg-green-50 px-1.5 py-0.5 rounded border border-green-100">
                      WIN
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] bg-white p-2.5 rounded border border-border shadow-sm">
                    <div>
                      <div className="font-bold text-primary">LeBron U24.5</div>
                      <div className="text-muted">Yesterday</div>
                    </div>
                    <span className="font-bold text-profit bg-green-50 px-1.5 py-0.5 rounded border border-green-100">
                      WIN
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-white border-t border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-primary">Automate Your Edge</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center group">
              <div className="w-10 h-10 bg-blue-50 text-tech font-black flex items-center justify-center rounded-xl mb-3 shadow-sm group-hover:scale-110 transition">
                1
              </div>
              <h3 className="font-bold text-primary text-sm mb-1">Select an Agent</h3>
              <p className="text-xs text-muted max-w-xs">
                Choose between Football Alpha or NBA Quant.
              </p>
            </div>
            <div className="flex flex-col items-center text-center group">
              <div className="w-10 h-10 bg-primary text-white font-black flex items-center justify-center rounded-xl mb-3 shadow-sm group-hover:scale-110 transition">
                2
              </div>
              <h3 className="font-bold text-primary text-sm mb-1">Sync to Telegram</h3>
              <p className="text-xs text-muted max-w-xs">
                One click launch. Instant portfolio sync.
              </p>
            </div>
            <div className="flex flex-col items-center text-center group">
              <div className="w-10 h-10 bg-profit text-white font-black flex items-center justify-center rounded-xl mb-3 shadow-sm group-hover:scale-110 transition">
                3
              </div>
              <h3 className="font-bold text-primary text-sm mb-1">Receive Live Signals</h3>
              <p className="text-xs text-muted max-w-xs">
                Get push notifications with staking size.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-bg border-t border-border">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div>
            <h2 className="text-xl font-bold text-primary mb-4">{t.blog_title}</h2>
            <div className="space-y-3">
              <article className="p-4 border border-border rounded-lg bg-surface hover:shadow-md transition cursor-pointer">
                <div className="text-[10px] text-tech font-bold mb-1">STRATEGY</div>
                <h3 className="font-bold text-primary text-sm mb-1">
                  Understanding &quot;Closing Line Value&quot;
                </h3>
                <p className="text-xs text-muted">
                  Why beating the closing line is the only metric that matters.
                </p>
              </article>
              <article className="p-4 border border-border rounded-lg bg-surface hover:shadow-md transition cursor-pointer">
                <div className="text-[10px] text-tech font-bold mb-1">DATA SCIENCE</div>
                <h3 className="font-bold text-primary text-sm mb-1">xG vs Actual Goals</h3>
                <p className="text-xs text-muted">
                  Finding value in teams underperforming expected metrics.
                </p>
              </article>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-primary mb-4">FAQ</h2>
            <div className="space-y-2">
              <details className="group bg-surface border border-border rounded-lg p-3 cursor-pointer">
                <summary className="flex justify-between items-center font-bold text-xs text-primary list-none">
                  How does the AI predict?{" "}
                  <Plus className="w-3 h-3 text-muted group-open:rotate-45 transition" />
                </summary>
                <p className="text-xs text-muted mt-2 leading-relaxed">
                  Our models analyze over 150 data points per match, including player tracking
                  data and historical odds movement.
                </p>
              </details>
              <details className="group bg-surface border border-border rounded-lg p-3 cursor-pointer">
                <summary className="flex justify-between items-center font-bold text-xs text-primary list-none">
                  Guaranteed wins?{" "}
                  <Plus className="w-3 h-3 text-muted group-open:rotate-45 transition" />
                </summary>
                <p className="text-xs text-muted mt-2 leading-relaxed">
                  No. We provide mathematical edge (+EV). We track all results transparently to
                  help you manage risk.
                </p>
              </details>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-8 bg-primary text-slate-400 text-[10px] text-center">
        <p>&copy; 2025 Betaione Systems. Not a bookmaker. 18+ Only.</p>
      </footer>
    </div>
  );
}
