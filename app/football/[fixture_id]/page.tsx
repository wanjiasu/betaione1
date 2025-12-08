"use client";

import { useState, useEffect, use } from "react";
import { Send } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getCapitalGrowth, getFootballFixtureReport, CapitalData } from "../../actions";

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

export default function FixturePage({ params }: { params: Promise<{ fixture_id: string }> }) {
  const { fixture_id } = use(params);
  const [lang, setLang] = useState<Language>("en");
  const [timeZones, setTimeZones] = useState<TimeZone[]>([]);
  const [selectedTimeZone, setSelectedTimeZone] = useState<string>("Asia/Shanghai");
  const [capitalData, setCapitalData] = useState<CapitalData[]>([]);
  const [report, setReport] = useState<string | null>(null);

  useEffect(() => {
    // Load timezones
    fetch("/time_offset.json")
      .then((res) => res.json())
      .then((data) => {
        setTimeZones(data);
        if (data.length > 0) {
          const shanghai = data.find((tz: TimeZone) => tz.value === "Asia/Shanghai");
          setSelectedTimeZone(shanghai ? shanghai.value : data[0].value);
        }
      })
      .catch((err) => console.error("Failed to load timezones:", err));
      
    // Load capital growth data for header
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
    // Load report
    getFootballFixtureReport(fixture_id)
      .then(setReport)
      .catch(err => console.error("Failed to load report:", err));
  }, [fixture_id]);

  const t = i18n[lang];
  const lastCapital = capitalData.length > 0 ? capitalData[capitalData.length - 1] : null;
  const firstCapital = capitalData.length > 0 ? capitalData[0] : null;
  const totalROI = lastCapital && firstCapital
    ? ((lastCapital.capital - firstCapital.capital) / firstCapital.capital * 100).toFixed(0)
    : "0";
  const isTotalProfit = parseFloat(totalROI) >= 0;

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

      <div className="max-w-4xl mx-auto px-4 py-8">
         <div className="bg-white p-6 rounded-lg border border-border shadow-sm prose prose-sm max-w-none">
           {report ? (
             <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
           ) : (
             <div className="flex justify-center items-center h-40">
                <p className="text-muted">Loading report...</p>
             </div>
           )}
         </div>
      </div>

      <footer className="py-8 bg-primary text-slate-400 text-[10px] text-center">
        <p>&copy; 2025 Betaione Systems. Not a bookmaker. 18+ Only.</p>
      </footer>
    </div>
  );
}
