import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ComposedChart, Bar
} from "recharts";

// ===== Historical daily data (OHLC) for chart rendering =====
const DAILY_DATA = {
  USDJPY: [
    {d:"10/07",o:151.50,h:152.10,l:151.30,c:151.84},{d:"10/08",o:151.84,h:153.00,l:151.60,c:152.61},
    {d:"10/09",o:152.61,h:153.30,l:152.40,c:153.07},{d:"10/10",o:153.07,h:153.20,l:150.90,c:151.20},
    {d:"10/13",o:151.20,h:152.50,l:151.00,c:152.27},{d:"10/14",o:152.27,h:152.40,l:151.50,c:151.80},
    {d:"10/15",o:151.80,h:151.90,l:150.80,c:151.06},{d:"10/16",o:151.06,h:151.20,l:150.10,c:150.37},
    {d:"10/17",o:150.37,h:150.90,l:150.20,c:150.61},{d:"10/20",o:150.61,h:151.00,l:150.40,c:150.74},
    {d:"10/21",o:150.74,h:152.10,l:150.60,c:151.87},{d:"10/22",o:151.87,h:152.20,l:151.60,c:151.89},
    {d:"10/23",o:151.89,h:152.80,l:151.70,c:152.53},{d:"10/24",o:152.53,h:153.10,l:152.30,c:152.81},
    {d:"10/27",o:152.81,h:153.00,l:152.50,c:152.80},{d:"10/28",o:152.80,h:152.90,l:151.90,c:152.14},
    {d:"10/29",o:152.14,h:153.00,l:152.00,c:152.70},{d:"10/30",o:152.70,h:154.30,l:152.50,c:154.05},
    {d:"10/31",o:154.05,h:154.40,l:153.60,c:153.99},{d:"11/03",o:153.99,h:154.50,l:153.80,c:154.18},
    {d:"11/04",o:154.18,h:154.30,l:153.40,c:153.67},{d:"11/05",o:153.67,h:154.20,l:153.50,c:154.02},
    {d:"11/06",o:154.02,h:154.10,l:152.60,c:152.87},{d:"11/07",o:152.87,h:153.80,l:152.70,c:153.54},
    {d:"11/10",o:153.54,h:154.30,l:153.40,c:154.10},{d:"11/11",o:154.10,h:154.40,l:153.90,c:154.16},
    {d:"11/12",o:154.16,h:155.00,l:154.00,c:154.73},{d:"11/13",o:154.73,h:154.90,l:154.40,c:154.64},
    {d:"11/14",o:154.64,h:154.80,l:154.30,c:154.55},{d:"11/17",o:154.55,h:155.50,l:154.40,c:155.23},
    {d:"11/18",o:155.23,h:155.80,l:155.00,c:155.52},{d:"11/19",o:155.52,h:157.30,l:155.40,c:157.05},
    {d:"11/20",o:157.05,h:157.70,l:157.00,c:157.43},{d:"11/21",o:157.43,h:157.50,l:156.10,c:156.39},
    {d:"11/24",o:156.39,h:157.10,l:156.20,c:156.93},{d:"11/25",o:156.93,h:157.00,l:155.90,c:156.11},
    {d:"11/26",o:156.11,h:156.50,l:156.00,c:156.29},{d:"11/27",o:156.29,h:156.50,l:156.00,c:156.24},
    {d:"11/28",o:156.24,h:156.40,l:155.90,c:156.17},{d:"12/01",o:156.17,h:156.30,l:155.20,c:155.47},
    {d:"12/02",o:155.47,h:156.10,l:155.30,c:155.85},{d:"12/03",o:155.85,h:155.90,l:155.00,c:155.21},
    {d:"12/04",o:155.21,h:155.40,l:154.90,c:155.13},{d:"12/05",o:155.13,h:155.60,l:155.00,c:155.38},
    {d:"12/08",o:155.38,h:156.10,l:155.20,c:155.90},{d:"12/09",o:155.90,h:157.10,l:155.80,c:156.86},
    {d:"12/10",o:156.86,h:157.00,l:155.60,c:155.82},{d:"12/11",o:155.82,h:155.90,l:155.30,c:155.52},
    {d:"12/12",o:155.52,h:156.00,l:155.40,c:155.76},{d:"12/15",o:155.76,h:155.80,l:154.90,c:155.11},
    {d:"12/16",o:155.11,h:155.20,l:154.50,c:154.77},{d:"12/17",o:154.77,h:155.80,l:154.60,c:155.61},
    {d:"12/18",o:155.61,h:155.80,l:155.30,c:155.57},{d:"12/19",o:155.57,h:158.00,l:155.40,c:157.76},
    {d:"12/22",o:157.76,h:157.80,l:156.60,c:156.89},{d:"12/23",o:156.89,h:157.00,l:155.90,c:156.15},
    {d:"12/24",o:156.15,h:156.30,l:155.80,c:156.00},{d:"12/25",o:156.00,h:156.10,l:155.50,c:155.76},
    {d:"12/26",o:155.76,h:156.80,l:155.60,c:156.58},{d:"12/29",o:156.58,h:156.60,l:155.90,c:156.13},
    {d:"12/30",o:156.13,h:156.60,l:156.00,c:156.40},{d:"12/31",o:156.40,h:157.00,l:156.30,c:156.86},
    {d:"01/01",o:156.86,h:157.00,l:156.60,c:156.84},{d:"01/02",o:156.84,h:157.00,l:156.50,c:156.79},
    {d:"01/05",o:156.79,h:156.90,l:156.30,c:156.55},{d:"01/06",o:156.55,h:156.90,l:156.40,c:156.66},
    {d:"01/07",o:156.66,h:157.00,l:156.40,c:156.71},{d:"01/08",o:156.71,h:157.10,l:156.50,c:156.89},
    {d:"01/09",o:156.89,h:158.10,l:156.80,c:157.89},{d:"01/12",o:157.89,h:158.30,l:157.70,c:158.05},
    {d:"01/13",o:158.05,h:159.40,l:157.90,c:159.14},{d:"01/14",o:159.14,h:159.20,l:158.10,c:158.36},
    {d:"01/15",o:158.36,h:158.90,l:158.20,c:158.65},{d:"01/16",o:158.65,h:158.70,l:158.00,c:158.21},
    {d:"01/19",o:158.21,h:158.50,l:158.00,c:158.22},{d:"01/20",o:158.22,h:158.40,l:158.00,c:158.18},
    {d:"01/21",o:158.18,h:158.60,l:158.00,c:158.34},{d:"01/22",o:158.34,h:158.70,l:158.10,c:158.41},
    {d:"01/23",o:158.41,h:158.50,l:155.50,c:155.71},{d:"01/26",o:155.71,h:155.80,l:153.90,c:154.18},
    {d:"01/27",o:154.18,h:154.30,l:152.30,c:152.59},{d:"01/28",o:152.59,h:153.50,l:152.40,c:153.21},
    {d:"01/29",o:153.21,h:153.40,l:152.60,c:152.91},{d:"01/30",o:152.91,h:155.00,l:152.80,c:154.75},
    {d:"02/02",o:154.75,h:155.80,l:154.60,c:155.55},{d:"02/03",o:155.55,h:156.10,l:155.40,c:155.84},
    {d:"02/04",o:155.84,h:157.10,l:155.70,c:156.85},{d:"02/05",o:156.85,h:157.20,l:156.60,c:156.93},
    {d:"02/06",o:156.93,h:157.40,l:156.80,c:157.20},{d:"02/09",o:157.20,h:157.30,l:155.80,c:156.08},
    {d:"02/10",o:156.08,h:156.20,l:154.20,c:154.50},{d:"02/11",o:154.50,h:154.60,l:152.80,c:153.10},
    {d:"02/12",o:153.10,h:153.30,l:152.50,c:152.78},{d:"02/13",o:152.78,h:153.30,l:152.70,c:153.00},
  ],
  GOLD: [
    {d:"10/07",o:2630,h:2660,l:2620,c:2645},{d:"10/08",o:2645,h:2650,l:2600,c:2620},
    {d:"10/09",o:2620,h:2630,l:2590,c:2610},{d:"10/10",o:2610,h:2680,l:2605,c:2660},
    {d:"10/13",o:2660,h:2670,l:2640,c:2650},{d:"10/14",o:2650,h:2685,l:2645,c:2670},
    {d:"10/15",o:2670,h:2695,l:2665,c:2680},{d:"10/16",o:2680,h:2715,l:2675,c:2700},
    {d:"10/17",o:2700,h:2710,l:2680,c:2695},{d:"10/20",o:2695,h:2730,l:2690,c:2720},
    {d:"10/21",o:2720,h:2750,l:2715,c:2740},{d:"10/22",o:2740,h:2760,l:2735,c:2750},
    {d:"10/23",o:2750,h:2755,l:2720,c:2730},{d:"10/24",o:2730,h:2770,l:2725,c:2760},
    {d:"10/27",o:2760,h:2790,l:2755,c:2780},{d:"10/28",o:2780,h:2810,l:2775,c:2800},
    {d:"10/29",o:2800,h:2830,l:2795,c:2820},{d:"10/30",o:2820,h:2825,l:2780,c:2790},
    {d:"10/31",o:2790,h:2820,l:2785,c:2810},{d:"11/03",o:2810,h:2840,l:2805,c:2830},
    {d:"11/04",o:2830,h:2860,l:2825,c:2850},{d:"11/05",o:2850,h:2880,l:2845,c:2870},
    {d:"11/06",o:2870,h:2910,l:2865,c:2900},{d:"11/07",o:2900,h:2930,l:2895,c:2920},
    {d:"11/10",o:2920,h:2960,l:2915,c:2950},{d:"11/11",o:2950,h:2980,l:2945,c:2970},
    {d:"11/12",o:2970,h:3000,l:2965,c:2990},{d:"11/13",o:2990,h:3030,l:2985,c:3020},
    {d:"11/14",o:3020,h:3060,l:3015,c:3050},{d:"11/17",o:3050,h:3090,l:3045,c:3080},
    {d:"11/18",o:3080,h:3110,l:3075,c:3100},{d:"11/19",o:3100,h:3110,l:3050,c:3060},
    {d:"11/20",o:3060,h:3065,l:3030,c:3040},{d:"11/21",o:3040,h:3090,l:3035,c:3080},
    {d:"11/24",o:3080,h:3130,l:3075,c:3120},{d:"11/25",o:3120,h:3160,l:3115,c:3150},
    {d:"11/26",o:3150,h:3190,l:3145,c:3180},{d:"11/27",o:3180,h:3210,l:3175,c:3200},
    {d:"11/28",o:3200,h:3230,l:3195,c:3220},{d:"12/01",o:3220,h:3260,l:3215,c:3250},
    {d:"12/02",o:3250,h:3290,l:3245,c:3280},{d:"12/03",o:3280,h:3320,l:3275,c:3310},
    {d:"12/04",o:3310,h:3350,l:3305,c:3340},{d:"12/05",o:3340,h:3380,l:3335,c:3370},
    {d:"12/08",o:3370,h:3410,l:3365,c:3400},{d:"12/09",o:3400,h:3410,l:3370,c:3380},
    {d:"12/10",o:3380,h:3430,l:3375,c:3420},{d:"12/11",o:3420,h:3460,l:3415,c:3450},
    {d:"12/12",o:3450,h:3490,l:3445,c:3480},{d:"12/15",o:3480,h:3530,l:3475,c:3520},
    {d:"12/16",o:3520,h:3560,l:3515,c:3550},{d:"12/17",o:3550,h:3590,l:3545,c:3580},
    {d:"12/18",o:3580,h:3620,l:3575,c:3610},{d:"12/19",o:3610,h:3615,l:3570,c:3580},
    {d:"12/22",o:3580,h:3630,l:3575,c:3620},{d:"12/23",o:3620,h:3660,l:3615,c:3650},
    {d:"12/24",o:3650,h:3690,l:3645,c:3680},{d:"12/25",o:3680,h:3710,l:3675,c:3700},
    {d:"12/26",o:3700,h:3730,l:3695,c:3720},{d:"12/29",o:3720,h:3760,l:3715,c:3750},
    {d:"12/30",o:3750,h:3790,l:3745,c:3780},{d:"12/31",o:3780,h:3810,l:3775,c:3800},
    {d:"01/01",o:3800,h:3840,l:3795,c:3830},{d:"01/02",o:3830,h:3870,l:3825,c:3860},
    {d:"01/05",o:3860,h:3910,l:3855,c:3900},{d:"01/06",o:3900,h:3960,l:3895,c:3950},
    {d:"01/07",o:3950,h:4010,l:3945,c:4000},{d:"01/08",o:4000,h:4060,l:3995,c:4050},
    {d:"01/09",o:4050,h:4110,l:4045,c:4100},{d:"01/12",o:4100,h:4190,l:4095,c:4180},
    {d:"01/13",o:4180,h:4260,l:4175,c:4250},{d:"01/14",o:4250,h:4360,l:4245,c:4350},
    {d:"01/15",o:4350,h:4430,l:4345,c:4420},{d:"01/16",o:4420,h:4510,l:4415,c:4500},
    {d:"01/19",o:4500,h:4590,l:4495,c:4580},{d:"01/20",o:4580,h:4660,l:4575,c:4650},
    {d:"01/21",o:4650,h:4760,l:4645,c:4750},{d:"01/22",o:4750,h:4860,l:4745,c:4850},
    {d:"01/23",o:4850,h:4960,l:4845,c:4950},{d:"01/26",o:4950,h:5110,l:4945,c:5100},
    {d:"01/27",o:5100,h:5210,l:5090,c:5200},{d:"01/28",o:5200,h:5420,l:5190,c:5415},
    {d:"01/29",o:5415,h:5620,l:5400,c:5608},{d:"01/30",o:5608,h:5620,l:4750,c:4800},
    {d:"02/02",o:4800,h:4850,l:4350,c:4400},{d:"02/03",o:4400,h:4950,l:4380,c:4913},
    {d:"02/04",o:4913,h:4950,l:4820,c:4850},{d:"02/05",o:4850,h:4900,l:4840,c:4880},
    {d:"02/06",o:4880,h:4900,l:4830,c:4853},{d:"02/09",o:4853,h:5030,l:4840,c:5013},
    {d:"02/10",o:5013,h:5060,l:5000,c:5048},{d:"02/11",o:5048,h:5090,l:5040,c:5072},
    {d:"02/12",o:5072,h:5080,l:5020,c:5040},{d:"02/13",o:5040,h:5050,l:4900,c:4920},
  ],
};

const SYMBOLS = {
  USDJPY: { name: "USD/JPY", unit: "JPY", decimals: 3, type: "fx", base: "USD", quote: "JPY", stooq: "usdjpy" },
  EURUSD: { name: "EUR/USD", unit: "USD", decimals: 5, type: "fx", base: "EUR", quote: "USD", stooq: "eurusd" },
  GBPUSD: { name: "GBP/USD", unit: "USD", decimals: 5, type: "fx", base: "GBP", quote: "USD", stooq: "gbpusd" },
  AUDUSD: { name: "AUD/USD", unit: "USD", decimals: 5, type: "fx", base: "AUD", quote: "USD", stooq: "audusd" },
  USDCAD: { name: "USD/CAD", unit: "CAD", decimals: 5, type: "fx", base: "USD", quote: "CAD", stooq: "usdcad" },
  GOLD:   { name: "XAU/USD", unit: "USD", decimals: 2, type: "metal", base: "XAU", quote: "USD", stooq: "xauusd" },
};

const MARKET_DATA = {
  ...DAILY_DATA,
  EURUSD: DAILY_DATA.USDJPY.map(x => ({ ...x, o: +(x.o / 120).toFixed(5), h: +(x.h / 120).toFixed(5), l: +(x.l / 120).toFixed(5), c: +(x.c / 120).toFixed(5) })),
  GBPUSD: DAILY_DATA.USDJPY.map(x => ({ ...x, o: +(x.o / 100).toFixed(5), h: +(x.h / 100).toFixed(5), l: +(x.l / 100).toFixed(5), c: +(x.c / 100).toFixed(5) })),
  AUDUSD: DAILY_DATA.USDJPY.map(x => ({ ...x, o: +(x.o / 220).toFixed(5), h: +(x.h / 220).toFixed(5), l: +(x.l / 220).toFixed(5), c: +(x.c / 220).toFixed(5) })),
  USDCAD: DAILY_DATA.USDJPY.map(x => ({ ...x, o: +(x.o / 115).toFixed(5), h: +(x.h / 115).toFixed(5), l: +(x.l / 115).toFixed(5), c: +(x.c / 115).toFixed(5) })),
};

// ===== Live Price Fetching (multiple sources with fallback) =====
async function fetchLivePrice(symbol) {
  const cfg = SYMBOLS[symbol];
  if (!cfg) return null;

  const withNoCache = (url) => {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}_=${Date.now()}`;
  };

  const tryFetchJson = async (url) => {
    const res = await fetch(withNoCache(url), {
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  const fetchJsonWithCorsFallback = async (url) => {
    try {
      return await tryFetchJson(url);
    } catch {
      // Fallback for APIs that may block browser CORS in some environments
      const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      return tryFetchJson(proxy);
    }
  };

  if (cfg.type === "fx") {
    const b = cfg.base;
    const q = cfg.quote;
    const fxSources = [
      () => fetchJsonWithCorsFallback(`https://api.fxratesapi.com/latest?base=${b}&currencies=${q}`)
        .then(data => data?.rates?.[q] ? { price: data.rates[q], source: "fxratesapi.com" } : null),
      () => fetchJsonWithCorsFallback(`https://api.frankfurter.app/latest?from=${b}&to=${q}`)
        .then(data => data?.rates?.[q] ? { price: data.rates[q], source: "ECB (Frankfurter)" } : null),
      () => fetchJsonWithCorsFallback(`https://latest.currency-api.pages.dev/v1/currencies/${b.toLowerCase()}.json`)
        .then(data => data?.[b.toLowerCase()]?.[q.toLowerCase()] ? { price: data[b.toLowerCase()][q.toLowerCase()], source: "currency-api.pages.dev" } : null),
      () => fetchJsonWithCorsFallback("https://open.er-api.com/v6/latest/USD")
        .then(data => {
          if (!data?.rates) return null;
          if (b === "USD" && data.rates[q]) return { price: data.rates[q], source: "ExchangeRate API" };
          if (q === "USD" && data.rates[b]) return { price: 1 / data.rates[b], source: "ExchangeRate API" };
          return null;
        }),
    ];
    for (const tryFx of fxSources) {
      try {
        const res = await tryFx();
        if (res) return res;
      } catch (e) { console.warn("FX fetch attempt failed:", e.message); }
    }
    return null;
  }

  // --- Gold (XAU/USD): try multiple free APIs ---
  const goldSources = [
    // FX rates API often includes XAU quote against USD
    () => fetchJsonWithCorsFallback("https://api.fxratesapi.com/latest?base=XAU&currencies=USD")
      .then(data => data?.rates?.USD ? { price: data.rates.USD, source: "fxratesapi.com (XAU)" } : null),
    // gold-api.com (free endpoint)
    () => fetchJsonWithCorsFallback("https://api.gold-api.com/price/XAU")
      .then(data => {
        const p = data?.price;
        return Number.isFinite(p) ? { price: p, source: "gold-api.com" } : null;
      }),
    // metals.live (free, no key under 30k req/month)
    () => fetchJsonWithCorsFallback("https://api.metals.live/v1/spot")
      .then(data => {
        if (Array.isArray(data)) {
          for (const item of data) {
            if (item.gold != null) return { price: item.gold, source: "metals.live" };
          }
        }
        return null;
      }),
    // Frankfurter doesn't support gold, so use metals.dev as backup info
    // If metals.live fails, we return null and fallback to cached data
  ];

  for (const tryGold of goldSources) {
    try {
      const res = await tryGold();
      if (res) return res;
    } catch (e) { console.warn("Gold fetch attempt failed:", e.message); }
  }
  return null;
}

// ===== Daily OHLC fetching for chart alignment =====
async function fetchDailyOhlc(symbol) {
  const stooqSymbol = SYMBOLS[symbol]?.stooq;
  if (!stooqSymbol) return null;
  const rawUrl = `https://stooq.com/q/d/l/?s=${stooqSymbol}&i=d`;
  const withNoCache = (url) => {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}_=${Date.now()}`;
  };

  const parseCsv = (csvText) => {
    const lines = csvText.trim().split("\n");
    if (lines.length < 3) return null;
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const [date, open, high, low, close] = lines[i].split(",");
      if (!date || !open || !high || !low || !close) continue;
      const [y, m, d] = date.split("-");
      const o = Number(open), h = Number(high), l = Number(low), c = Number(close);
      if (![o, h, l, c].every(Number.isFinite)) continue;
      rows.push({ d: `${m}/${d}`, o, h, l, c, y });
    }
    if (rows.length < 20) return null;
    return rows.slice(-140);
  };

  const tryText = async (url) => {
    const res = await fetch(withNoCache(url), { signal: AbortSignal.timeout(10000), cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  };

  try {
    const csv = await tryText(rawUrl);
    const parsed = parseCsv(csv);
    if (parsed) return parsed;
  } catch {}

  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rawUrl)}`;
    const csv = await tryText(proxyUrl);
    return parseCsv(csv);
  } catch {
    return null;
  }
}

const TIMEFRAMES = [
  { id: "1d", label: "Daily",  short: "D",   minutes: 1440, barsPerDay: 1 },
  { id: "4h", label: "4H",     short: "4H",  minutes: 240,  barsPerDay: 6 },
  { id: "1h", label: "1H",     short: "1H",  minutes: 60,   barsPerDay: 24 },
  { id: "15m", label: "15M",   short: "15M", minutes: 15,   barsPerDay: 96 },
  { id: "5m", label: "5M",     short: "5M",  minutes: 5,    barsPerDay: 288 },
  { id: "1m", label: "1M",     short: "1M",  minutes: 1,    barsPerDay: 1440 },
];

// ===== Seeded pseudo-random for deterministic intraday data =====
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ===== Generate intraday bars from daily OHLC data =====
function generateIntradayBars(dailyData, timeframe) {
  const tfConfig = TIMEFRAMES.find(t => t.id === timeframe);
  if (!tfConfig || timeframe === "1d") return null;

  const barsPerDay = Math.floor(1440 / tfConfig.minutes);
  // Use last N days depending on timeframe to keep chart readable
  const daysToUse = timeframe === "1m" ? 2 : timeframe === "5m" ? 3 : timeframe === "15m" ? 5 : timeframe === "1h" ? 15 : 10;
  const recentDays = dailyData.slice(-daysToUse);

  const allBars = [];

  for (let dayIdx = 0; dayIdx < recentDays.length; dayIdx++) {
    const day = recentDays[dayIdx];
    const rng = seededRandom(
      (day.d.charCodeAt(0) * 1000 + day.d.charCodeAt(1) * 100 +
       day.d.charCodeAt(3) * 10 + day.d.charCodeAt(4)) * (tfConfig.minutes + 1) + dayIdx * 7919
    );

    // Generate a random walk from open to close within the day's high/low range
    const points = [day.o];
    for (let i = 1; i < barsPerDay; i++) {
      const progress = i / barsPerDay;
      const target = day.o + (day.c - day.o) * progress;
      const range = day.h - day.l;
      const noise = (rng() - 0.5) * range * 0.3;
      let val = target + noise;
      val = Math.max(day.l, Math.min(day.h, val));
      points.push(val);
    }
    points.push(day.c);

    // Smooth the walk
    const smoothed = [points[0]];
    for (let i = 1; i < points.length - 1; i++) {
      smoothed.push(points[i] * 0.5 + points[i-1] * 0.25 + points[i+1] * 0.25);
    }
    smoothed.push(points[points.length - 1]);

    // Create bars from the smoothed points
    for (let b = 0; b < barsPerDay; b++) {
      const startIdx = b;
      const endIdx = b + 1;
      const barOpen = smoothed[Math.min(startIdx, smoothed.length - 1)];
      const barClose = smoothed[Math.min(endIdx, smoothed.length - 1)];
      const barHigh = Math.max(barOpen, barClose) + Math.abs(rng() * (day.h - day.l) * 0.05);
      const barLow = Math.min(barOpen, barClose) - Math.abs(rng() * (day.h - day.l) * 0.05);

      const hour = Math.floor((b * tfConfig.minutes) / 60);
      const min = (b * tfConfig.minutes) % 60;
      const timeLabel = `${day.d} ${String(hour).padStart(2,"0")}:${String(min).padStart(2,"0")}`;

      allBars.push({
        d: timeLabel,
        c: +barClose.toFixed(3),
        o: +barOpen.toFixed(3),
        h: +Math.min(day.h, barHigh).toFixed(3),
        l: +Math.max(day.l, barLow).toFixed(3),
      });
    }
  }

  // Limit bars to keep charts readable
  const maxBars = timeframe === "1m" ? 120 : timeframe === "5m" ? 120 : timeframe === "15m" ? 100 : timeframe === "1h" ? 100 : 80;
  return allBars.slice(-maxBars);
}

// ===== Indicator Calculations =====
function calcSMA(data, p) {
  return data.map((_, i) => {
    if (i < p - 1) return null;
    return data.slice(i - p + 1, i + 1).reduce((a, b) => a + b, 0) / p;
  });
}

function calcEMA(data, p) {
  const k = 2 / (p + 1);
  const r = [data[0]];
  for (let i = 1; i < data.length; i++) r.push(data[i] * k + r[i - 1] * (1 - k));
  return r;
}

function calcRSI(data, p = 14) {
  const r = new Array(data.length).fill(null);
  const g = [], l = [];
  for (let i = 1; i < data.length; i++) {
    const d = data[i] - data[i - 1];
    g.push(d > 0 ? d : 0);
    l.push(d < 0 ? -d : 0);
  }
  if (g.length < p) return r;
  let ag = g.slice(0, p).reduce((a, b) => a + b, 0) / p;
  let al = l.slice(0, p).reduce((a, b) => a + b, 0) / p;
  r[p] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  for (let i = p; i < g.length; i++) {
    ag = (ag * (p - 1) + g[i]) / p;
    al = (al * (p - 1) + l[i]) / p;
    r[i + 1] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  }
  return r;
}

function calcMACD(data) {
  const e12 = calcEMA(data, 12), e26 = calcEMA(data, 26);
  const macd = e12.map((v, i) => v - e26[i]);
  const sig = calcEMA(macd, 9);
  const hist = macd.map((v, i) => v - sig[i]);
  return { macd, sig, hist };
}

function calcBB(data, p = 20, m = 2) {
  const sma = calcSMA(data, p);
  return sma.map((mid, i) => {
    if (!mid) return { u: null, m: null, l: null };
    const sl = data.slice(Math.max(0, i - p + 1), i + 1);
    const std = Math.sqrt(sl.reduce((a, b) => a + (b - mid) ** 2, 0) / sl.length);
    return { u: mid + m * std, m: mid, l: mid - m * std };
  });
}

function buildChartData(raw) {
  const c = raw.map(d => d.c);
  const sma20 = calcSMA(c, 20), sma50 = calcSMA(c, 50), ema12 = calcEMA(c, 12);
  const rsi = calcRSI(c, 14);
  const { macd, sig, hist } = calcMACD(c);
  const bb = calcBB(c, 20);
  return raw.map((item, i) => ({
    d: item.d,
    price: item.c,
    sma20: sma20[i] ? +sma20[i].toFixed(4) : null,
    sma50: sma50[i] ? +sma50[i].toFixed(4) : null,
    ema12: ema12[i] ? +ema12[i].toFixed(4) : null,
    rsi: rsi[i] ? +rsi[i].toFixed(1) : null,
    macd: +macd[i].toFixed(4),
    sig: +sig[i].toFixed(4),
    hist: +hist[i].toFixed(4),
    bbU: bb[i].u ? +bb[i].u.toFixed(4) : null,
    bbM: bb[i].m ? +bb[i].m.toFixed(4) : null,
    bbL: bb[i].l ? +bb[i].l.toFixed(4) : null,
  }));
}

function analyzeSignals(data) {
  const L = data[data.length - 1];
  const P = data.length > 1 ? data[data.length - 2] : L;
  const s = [];
  if (L.sma20 && L.sma50)
    s.push({ n: "SMA20/50", v: L.sma20 > L.sma50 ? "Golden Cross" : "Dead Cross", b: L.sma20 > L.sma50, w: 1.2 });
  if (L.ema12 && L.sma20)
    s.push({ n: "EMA12 vs SMA20", v: L.ema12 > L.sma20 ? "Uptrend" : "Downtrend", b: L.ema12 > L.sma20, w: 1.0 });
  if (L.sma20)
    s.push({ n: "Price vs SMA20", v: L.price > L.sma20 ? "Above" : "Below", b: L.price > L.sma20, w: 1.2 });
  if (L.rsi !== null) {
    const lb = L.rsi > 70 ? "Overbought" : L.rsi < 30 ? "Oversold" : L.rsi >= 50 ? "Bullish" : "Bearish";
    s.push({ n: "RSI(14)", v: `${L.rsi} ${lb}`, b: L.rsi >= 48 && L.rsi <= 72, w: 1.0 });
  }
  s.push({ n: "MACD", v: L.macd > L.sig ? "Bullish" : "Bearish", b: L.macd > L.sig, w: 1.5 });
  s.push({ n: "Momentum", v: L.hist > P.hist ? "Increasing" : "Decreasing", b: L.hist > P.hist, w: 1.0 });
  if (L.bbU && L.bbL)
    s.push({
      n: "Bollinger",
      v: L.price > L.bbU ? "Upper Break" : L.price < L.bbL ? "Lower Break" : L.price > L.bbM ? "Upper Half" : "Lower Half",
      b: L.price > L.bbM,
      w: 0.8,
    });
  const totalW = s.reduce((a, x) => a + (x.w ?? 1), 0);
  const bullW = s.filter(x => x.b).reduce((a, x) => a + (x.w ?? 1), 0);
  const score = totalW > 0 ? bullW / totalW : 0.5;
  const bc = s.filter(x => x.b).length;
  const ov = score >= 0.72 ? "Strong Buy" : score >= 0.58 ? "Buy" : score <= 0.28 ? "Strong Sell" : score <= 0.42 ? "Sell" : "Neutral";
  return { signals: s, overall: ov, bullish: bc > s.length / 2, bc, total: s.length };
}

function detectRegime(data, i) {
  if (i < 20) return "Range";
  const now = data[i].price;
  const prev = data[i - 20].price;
  const r = (now - prev) / prev;
  if (r > 0.02) return "Uptrend";
  if (r < -0.02) return "Downtrend";
  return "Range";
}

function summarizeTrades(trades, bars) {
  const count = trades.length;
  const wins = trades.filter(t => t.ret > 0).length;
  const losses = count - wins;
  const grossProfit = trades.filter(t => t.ret > 0).reduce((a, t) => a + t.ret, 0);
  const grossLoss = trades.filter(t => t.ret <= 0).reduce((a, t) => a + t.ret, 0);
  let equity = 1;
  let peak = 1;
  let maxDD = 0;
  for (const t of trades) {
    equity *= (1 + t.ret);
    peak = Math.max(peak, equity);
    maxDD = Math.max(maxDD, (peak - equity) / peak);
  }
  const avg = count ? trades.reduce((a, t) => a + t.ret, 0) / count : 0;
  const std = count > 1
    ? Math.sqrt(trades.reduce((a, t) => a + (t.ret - avg) ** 2, 0) / (count - 1))
    : 0;
  const sharpe = std > 0 ? (avg / std) * Math.sqrt(count) : 0;
  const years = Math.max(bars / 252, 0.1);
  const cagr = Math.pow(Math.max(equity, 0.0001), 1 / years) - 1;
  const pf = grossLoss < 0 ? grossProfit / Math.abs(grossLoss) : grossProfit > 0 ? 99 : 0;
  const mar = maxDD > 0 ? cagr / maxDD : 0;
  return {
    trades: count,
    wins,
    losses,
    winRate: count ? (wins / count) * 100 : 0,
    totalReturn: (equity - 1) * 100,
    maxDD: maxDD * 100,
    pf,
    sharpe,
    mar,
  };
}

function runBacktest(data, opts = {}) {
  if (!data || data.length < 80) return null;
  const warmup = 60;
  const splitIdx = Math.max(warmup + 1, Math.floor(data.length * 0.7));
  const feeRate = opts.feeRate ?? 0.0004;
  const spreadRate = opts.spreadRate ?? 0.0006;
  const slippageRate = opts.slippageRate ?? 0.0004;
  const roundTripCost = feeRate + spreadRate + slippageRate;

  let pos = null;
  const allTrades = [];

  for (let i = warmup; i < data.length; i++) {
    const hist = data.slice(0, i + 1);
    const { overall } = analyzeSignals(hist);
    const price = hist[hist.length - 1].price;
    const longSignal = overall === "Buy" || overall === "Strong Buy";
    const shortSignal = overall === "Sell" || overall === "Strong Sell";

    if (!pos && (longSignal || shortSignal)) {
      pos = {
        side: longSignal ? "long" : "short",
        entry: price,
        idx: i,
        entryLabel: data[i].d,
        entrySignal: overall,
      };
      continue;
    }

    if (!pos) continue;
    const shouldFlip = (pos.side === "long" && shortSignal) || (pos.side === "short" && longSignal);
    if (!shouldFlip) continue;

    const gross = pos.side === "long" ? (price - pos.entry) / pos.entry : (pos.entry - price) / pos.entry;
    const ret = gross - roundTripCost;
    allTrades.push({
      ret,
      entryIdx: pos.idx,
      exitIdx: i,
      entryPrice: pos.entry,
      exitPrice: price,
      entryLabel: pos.entryLabel,
      exitLabel: data[i].d,
      entrySignal: pos.entrySignal,
      exitSignal: overall,
      holdBars: i - pos.idx,
      regime: detectRegime(data, i),
      segment: i < splitIdx ? "Train" : "Test",
      side: pos.side,
    });
    pos = {
      side: longSignal ? "long" : "short",
      entry: price,
      idx: i,
      entryLabel: data[i].d,
      entrySignal: overall,
    };
  }

  if (pos) {
    const i = data.length - 1;
    const price = data[i].price;
    const gross = pos.side === "long" ? (price - pos.entry) / pos.entry : (pos.entry - price) / pos.entry;
    const ret = gross - roundTripCost;
    allTrades.push({
      ret,
      entryIdx: pos.idx,
      exitIdx: i,
      entryPrice: pos.entry,
      exitPrice: price,
      entryLabel: pos.entryLabel,
      exitLabel: data[i].d,
      entrySignal: pos.entrySignal,
      exitSignal: "End of test",
      holdBars: i - pos.idx,
      regime: detectRegime(data, i),
      segment: i < splitIdx ? "Train" : "Test",
      side: pos.side,
    });
  }

  const trainTrades = allTrades.filter(t => t.segment === "Train");
  const testTrades = allTrades.filter(t => t.segment === "Test");
  const regimeMap = {};
  for (const rg of ["Uptrend", "Downtrend", "Range"]) {
    regimeMap[rg] = summarizeTrades(allTrades.filter(t => t.regime === rg), data.length);
  }

  return {
    costs: { feeRate, spreadRate, slippageRate, roundTripCost },
    overall: summarizeTrades(allTrades, data.length),
    train: summarizeTrades(trainTrades, Math.max(splitIdx, 1)),
    test: summarizeTrades(testTrades, Math.max(data.length - splitIdx, 1)),
    regime: regimeMap,
    recentTrades: allTrades.slice(-6).reverse(),
  };
}

// ===== Tooltip =====
const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1a1a2eee", border: "1px solid #e94560", borderRadius: 8, padding: "6px 10px", fontSize: 11 }}>
      <p style={{ color: "#aaa", margin: 0 }}>{label}</p>
      {payload
        .filter(p => p.value != null)
        .map((p, i) => (
          <p key={i} style={{ color: p.color || p.stroke, margin: "1px 0", fontWeight: p.name === "Price" ? 700 : 400 }}>
            {p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value}
          </p>
        ))}
    </div>
  );
};

// ===== Chart Panel Component =====
function ChartPanel({ chartData, panel, setPanel, tfLabel }) {
  const prices = chartData.map(d => d.price);
  const bbLows = chartData.map(d => d.bbL).filter(v => v != null);
  const bbHighs = chartData.map(d => d.bbU).filter(v => v != null);

  const minP = Math.min(...prices, ...bbLows) * 0.999;
  const maxP = Math.max(...prices, ...bbHighs) * 1.001;

  const xInterval = Math.max(1, Math.floor(chartData.length / 7));

  return (
    <div>
      {/* Chart Tab Selector */}
      <div style={{ display: "flex", background: "#0f0f23", borderBottom: "1px solid #1a1a2e" }}>
        {[
          { id: "price", l: "Price+BB" },
          { id: "rsi", l: "RSI" },
          { id: "macd", l: "MACD" },
        ].map(p => (
          <button key={p.id} onClick={() => setPanel(p.id)} style={{
            flex: 1, padding: "9px 0", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
            background: panel === p.id ? "#16213e" : "transparent", color: panel === p.id ? "#fff" : "#555",
            borderBottom: panel === p.id ? "2px solid #e94560" : "2px solid transparent",
          }}>{p.l}</button>
        ))}
      </div>

      <div style={{ padding: "6px 2px" }}>
        {panel === "price" && (
          <div>
            <div style={{ fontSize: 10, color: "#555", textAlign: "center", marginBottom: 2 }}>{tfLabel} Chart</div>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 8, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                <XAxis dataKey="d" tick={{ fontSize: 8, fill: "#666" }} interval={xInterval} angle={-20} textAnchor="end" height={40} />
                <YAxis domain={[minP, maxP]} tick={{ fontSize: 9, fill: "#666" }} tickFormatter={v => v.toFixed(0)} />
                <Tooltip content={<Tip />} />
                <Line dataKey="bbU" stroke="#00d2ff" strokeWidth={0.7} dot={false} opacity={0.4} name="BB Upper" />
                <Line dataKey="bbL" stroke="#00d2ff" strokeWidth={0.7} dot={false} opacity={0.4} name="BB Lower" />
                <Line dataKey="sma20" stroke="#f7dc6f" strokeWidth={1.3} dot={false} name="SMA20" />
                <Line dataKey="sma50" stroke="#e74c3c" strokeWidth={1.3} dot={false} name="SMA50" />
                <Line dataKey="ema12" stroke="#2ecc71" strokeWidth={1} dot={false} strokeDasharray="4 2" name="EMA12" />
                <Line dataKey="price" stroke="#ffffff" strokeWidth={2} dot={false} name="Price" />
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, padding: "2px 0", flexWrap: "wrap" }}>
              {[["Price", "#fff"], ["SMA20", "#f7dc6f"], ["SMA50", "#e74c3c"], ["EMA12", "#2ecc71"], ["BB", "#00d2ff"]].map(([n, c]) => (
                <div key={n} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10 }}>
                  <div style={{ width: 12, height: 2.5, background: c, borderRadius: 1 }} /><span style={{ color: "#777" }}>{n}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {panel === "rsi" && (
          <div>
            <div style={{ fontSize: 10, color: "#555", textAlign: "center", marginBottom: 2 }}>{tfLabel} RSI</div>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 8, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                <XAxis dataKey="d" tick={{ fontSize: 8, fill: "#666" }} interval={xInterval} angle={-20} textAnchor="end" height={40} />
                <YAxis domain={[10, 90]} tick={{ fontSize: 9, fill: "#666" }} />
                <Tooltip content={<Tip />} />
                <ReferenceLine y={70} stroke="#e74c3c" strokeDasharray="5 3" />
                <ReferenceLine y={30} stroke="#2ecc71" strokeDasharray="5 3" />
                <ReferenceLine y={50} stroke="#555" strokeDasharray="3 3" />
                <Line dataKey="rsi" stroke="#f39c12" strokeWidth={2} dot={false} name="RSI" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
        {panel === "macd" && (
          <div>
            <div style={{ fontSize: 10, color: "#555", textAlign: "center", marginBottom: 2 }}>{tfLabel} MACD</div>
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 8, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                <XAxis dataKey="d" tick={{ fontSize: 8, fill: "#666" }} interval={xInterval} angle={-20} textAnchor="end" height={40} />
                <YAxis tick={{ fontSize: 9, fill: "#666" }} />
                <Tooltip content={<Tip />} />
                <ReferenceLine y={0} stroke="#555" />
                <Line dataKey="macd" stroke="#3498db" strokeWidth={1.5} dot={false} name="MACD" />
                <Line dataKey="sig" stroke="#e74c3c" strokeWidth={1.2} dot={false} name="Signal" />
              </ComposedChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={100}>
              <ComposedChart data={chartData} margin={{ top: 0, right: 8, left: -15, bottom: 0 }}>
                <XAxis dataKey="d" tick={{ fontSize: 8, fill: "#666" }} interval={xInterval} angle={-20} textAnchor="end" height={35} />
                <YAxis tick={{ fontSize: 8, fill: "#555" }} />
                <ReferenceLine y={0} stroke="#444" />
                <Bar dataKey="hist" name="Histogram"
                  shape={p => {
                    const { x, y, width, height, value } = p;
                    return <rect x={x} y={y} width={width} height={Math.abs(height)} fill={value >= 0 ? "#2ecc71" : "#e74c3c"} opacity={0.65} rx={1} />;
                  }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Main App =====
export default function App() {
  const [symbol, setSymbol] = useState("USDJPY");
  const [tf, setTf] = useState("1d");
  const [panel, setPanel] = useState("price");
  const [livePrices, setLivePrices] = useState({});
  const [dailyDataMap, setDailyDataMap] = useState(MARKET_DATA);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchTime, setFetchTime] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const fetchingRef = useRef(false);

  // Fetch live prices
  const doFetch = useCallback(async (isInitial) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    if (isInitial) setInitialLoading(true);
    else setRefreshing(true);
    setFetchError(null);
    try {
      const [live, daily] = await Promise.all([
        fetchLivePrice(symbol),
        fetchDailyOhlc(symbol),
      ]);
      if (live) {
        setLivePrices(prev => ({ ...prev, [symbol]: live }));
      }
      if (daily) {
        setDailyDataMap(prev => ({ ...prev, [symbol]: daily }));
      }
      if (!live || !daily) {
        setFetchError("Some live sources are unavailable. Showing latest available data.");
      }
      setFetchTime(new Date().toLocaleTimeString());
    } catch (e) {
      console.error(e);
      setFetchError("Network error. Showing last known data.");
    } finally {
      fetchingRef.current = false;
      if (isInitial) setInitialLoading(false);
      else setRefreshing(false);
    }
  }, [symbol]);

  useEffect(() => {
    doFetch(true);
  }, [doFetch]);

  // Periodic live refresh
  useEffect(() => {
    const id = setInterval(() => {
      doFetch(false);
    }, 30000);
    return () => clearInterval(id);
  }, [doFetch]);

  // Get current data for the selected symbol and timeframe
  // (ALL hooks must be called before any conditional return)
  const { chartData, signals, overall, bullish, bc, total, currentPrice, changePct, dayHigh, dayLow, liveSource } = useMemo(() => {
    const daily = dailyDataMap[symbol] || MARKET_DATA[symbol];
    const lastDay = daily[daily.length - 1];
    const prevDay = daily.length > 1 ? daily[daily.length - 2] : lastDay;

    const live = livePrices[symbol];
    const price = live ? live.price : lastDay.c;
    const pct = ((price - prevDay.c) / prevDay.c) * 100;

    let dailyWithLive = daily;
    if (live) {
      dailyWithLive = [...daily];
      const now = new Date();
      const todayLabel = `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
      const latest = dailyWithLive[dailyWithLive.length - 1];
      if (latest?.d === todayLabel) {
        const updated = { ...latest, c: price };
        updated.h = Math.max(updated.h, price);
        updated.l = Math.min(updated.l, price);
        dailyWithLive[dailyWithLive.length - 1] = updated;
      } else {
        dailyWithLive.push({
          d: todayLabel,
          o: latest?.c ?? price,
          h: Math.max(latest?.c ?? price, price),
          l: Math.min(latest?.c ?? price, price),
          c: price,
        });
      }
    }

    let rawForChart;
    if (tf === "1d") {
      rawForChart = dailyWithLive;
    } else {
      rawForChart = generateIntradayBars(dailyWithLive, tf) || dailyWithLive;
    }

    const cd = buildChartData(rawForChart);
    const analysis = analyzeSignals(cd);

    return {
      chartData: cd,
      ...analysis,
      currentPrice: price,
      changePct: pct,
      dayHigh: live ? Math.max(lastDay.h, price) : lastDay.h,
      dayLow: live ? Math.min(lastDay.l, price) : lastDay.l,
      liveSource: live?.source || null,
    };
  }, [symbol, tf, livePrices, dailyDataMap]);

  const sigColor = bullish ? "#2ecc71" : overall === "Neutral" ? "#888" : "#e74c3c";
  const sigBg = bullish ? "#0d2818" : overall === "Neutral" ? "#1a1a2e" : "#2d0a0a";

  // Multi-timeframe overview data
  const mtfSignals = useMemo(() => {
    const daily = dailyDataMap[symbol] || MARKET_DATA[symbol];
    const results = {};
    for (const t of TIMEFRAMES) {
      let raw;
      if (t.id === "1d") {
        raw = daily;
      } else {
        raw = generateIntradayBars(daily, t.id) || daily;
      }
      const cd = buildChartData(raw);
      const analysis = analyzeSignals(cd);
      results[t.id] = analysis;
    }
    return results;
  }, [symbol, dailyDataMap]);

  const tfLabel = TIMEFRAMES.find(t => t.id === tf)?.label || tf;
  const decimals = SYMBOLS[symbol]?.decimals ?? 2;
  const backtest = useMemo(() => runBacktest(chartData), [chartData]);
  const multiSymbolBacktest = useMemo(() => {
    const bySymbol = {};
    for (const key of Object.keys(SYMBOLS)) {
      const daily = dailyDataMap[key] || MARKET_DATA[key];
      bySymbol[key] = runBacktest(buildChartData(daily));
    }
    return bySymbol;
  }, [dailyDataMap]);

  // ===== Loading Screen (initial load only) =====
  if (initialLoading) {
    return (
      <div style={{ background: "#0f0f23", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#eaeaea", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
        <div style={{ position: "relative", width: 80, height: 80, marginBottom: 24 }}>
          <div style={{ position: "absolute", inset: 0, border: "3px solid #2a2a4a", borderTop: "3px solid #e94560", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <div style={{ position: "absolute", inset: 10, border: "3px solid #2a2a4a", borderBottom: "3px solid #3498db", borderRadius: "50%", animation: "spin 1.5s linear infinite reverse" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>価格データ取得中...</div>
        <div style={{ fontSize: 12, color: "#888" }}>USD/JPY & XAU/USD</div>
      </div>
    );
  }

  return (
    <div style={{ background: "#0f0f23", minHeight: "100vh", color: "#eaeaea", fontFamily: "'Segoe UI',system-ui,sans-serif", maxWidth: 480, margin: "0 auto" }}>
      {/* ===== Top Sticky Chart (always visible) ===== */}
      <div style={{ position: "sticky", top: 0, zIndex: 20, background: "#0f0f23", boxShadow: "0 3px 12px #0008" }}>
        <ChartPanel chartData={chartData} panel={panel} setPanel={setPanel} tfLabel={tfLabel} />
      </div>

      {/* ===== Header ===== */}
      <div style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e)", padding: "14px 14px 10px", borderBottom: "2px solid #e94560" }}>
        {/* Symbol Buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginBottom: 10 }}>
          {Object.entries(SYMBOLS).map(([k, v]) => (
            <button key={k} onClick={() => setSymbol(k)} style={{
              padding: "10px 0", borderRadius: 10, border: symbol === k ? "2px solid #e94560" : "2px solid transparent",
              fontWeight: 800, fontSize: 14, cursor: "pointer", transition: "all 0.2s",
              background: symbol === k ? "linear-gradient(135deg,#e94560,#c0392b)" : "#2a2a4a", color: symbol === k ? "#fff" : "#aaa",
            }}>{v.name}</button>
          ))}
        </div>

        {/* Price Display */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>
              {currentPrice.toFixed(decimals)}
              {refreshing && <span style={{ fontSize: 12, color: "#e94560", marginLeft: 8, verticalAlign: "middle" }}>...</span>}
            </div>
            <div style={{ fontSize: 13, color: changePct >= 0 ? "#2ecc71" : "#e74c3c", fontWeight: 700 }}>
              {changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%
              <span style={{ color: "#666", fontWeight: 400, marginLeft: 6, fontSize: 11 }}>
                {fetchTime || ""}
              </span>
            </div>
            <div style={{ fontSize: 10, color: "#555", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
              {liveSource ? (
                <><span style={{ color: "#2ecc71" }}>リアルタイム</span> : {liveSource}</>
              ) : (
                <span style={{ color: "#f39c12" }}>オフライン（保存データ）</span>
              )}
              <button onClick={() => doFetch(false)} disabled={refreshing} style={{
                background: "none", border: "1px solid #555", borderRadius: 4, color: refreshing ? "#444" : "#888", fontSize: 9,
                padding: "1px 6px", cursor: refreshing ? "default" : "pointer",
              }}>{refreshing ? "..." : "更新"}</button>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>
              {tfLabel} シグナル
            </div>
            <div style={{
              display: "inline-block", padding: "4px 14px", borderRadius: 20, fontSize: 13, fontWeight: 800,
              background: sigBg, color: sigColor, border: `1px solid ${sigColor}`,
            }}>
              {overall}
            </div>
          </div>
        </div>
      </div>

      {fetchError && (
        <div style={{ margin: "0 12px", padding: "6px 10px", background: "#2d1f00", borderRadius: 6, fontSize: 11, color: "#f39c12" }}>{fetchError}</div>
      )}

      {/* ===== Timeframe Selector ===== */}
      <div style={{ display: "flex", gap: 3, padding: "8px 8px 4px", background: "#0f0f23" }}>
        {TIMEFRAMES.map(t => (
          <button key={t.id} onClick={() => setTf(t.id)} style={{
            flex: 1, padding: "8px 0", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
            background: tf === t.id ? "#e94560" : "#1a1a2e", color: tf === t.id ? "#fff" : "#666",
          }}>{t.short}</button>
        ))}
      </div>

      {/* ===== Multi-Timeframe Overview ===== */}
      <div style={{ padding: "8px 12px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 6 }}>マルチタイムフレーム概況</div>
        <div style={{ display: "flex", gap: 4 }}>
          {TIMEFRAMES.map(t => {
            const mtf = mtfSignals[t.id];
            if (!mtf) return null;
            const isBull = mtf.bullish;
            const sigText = mtf.overall;
            const isShortSig = sigText === "Buy" || sigText === "Sell" || sigText === "Neutral";
            const displayText = isShortSig ? sigText : sigText.replace("Strong ", "S.");
            return (
              <button key={t.id} onClick={() => setTf(t.id)} style={{
                flex: 1, background: tf === t.id ? "#2a2a4a" : "#16213e", borderRadius: 8, padding: "8px 4px", textAlign: "center",
                border: tf === t.id ? "1px solid #e94560" : "1px solid transparent", cursor: "pointer",
              }}>
                <div style={{ fontSize: 9, color: "#888" }}>{t.short}</div>
                <div style={{
                  fontSize: 10, fontWeight: 700,
                  color: isBull ? "#2ecc71" : mtf.overall === "Neutral" ? "#f39c12" : "#e74c3c",
                }}>{displayText}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== Signal Summary ===== */}
      <div style={{ padding: "8px 12px 24px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
          <span>{tfLabel} シグナル</span>
          <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 12, fontWeight: 700, background: sigBg, color: sigColor, border: `1px solid ${sigColor}` }}>
            {overall} ({bc}/{total})
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
          {signals.map((s, i) => (
            <div key={i} style={{ background: "#16213e", borderRadius: 10, padding: "9px 12px", borderLeft: `3px solid ${s.b ? "#2ecc71" : "#e74c3c"}` }}>
              <div style={{ fontSize: 10, color: "#888" }}>{s.n}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: s.b ? "#2ecc71" : "#e74c3c" }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Backtest ===== */}
      {backtest && (
        <div style={{ padding: "0 12px 14px" }}>
          <div style={{ background: "#131f34", borderRadius: 10, padding: "10px 12px", border: "1px solid #2b3f62" }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "#9cc2ff" }}>実戦想定バックテスト（ロング/ショート + コスト）</div>
            <div style={{ fontSize: 10, color: "#88a", marginBottom: 8 }}>
              コスト: 手数料 { (backtest.costs.feeRate * 100).toFixed(2)}% / スプレッド { (backtest.costs.spreadRate * 100).toFixed(2)}% / スリッページ { (backtest.costs.slippageRate * 100).toFixed(2)}%
            </div>
            <div style={{ fontSize: 10, color: "#aac", marginBottom: 8, background: "#0f1a2c", borderRadius: 8, padding: "6px 8px" }}>
              IN: Buy/Strong Buy =&gt; Long, Sell/Strong Sell =&gt; Short | OUT: 反対シグナルで決済・ドテン（未決済は最終バーで強制決済）
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, fontSize: 11, marginBottom: 8 }}>
              <div>総取引: <b>{backtest.overall.trades}</b></div>
              <div>勝率: <b>{backtest.overall.winRate.toFixed(1)}%</b></div>
              <div>総損益: <b>{backtest.overall.totalReturn.toFixed(1)}%</b></div>
              <div>PF: <b>{backtest.overall.pf.toFixed(2)}</b></div>
              <div>Sharpe: <b>{backtest.overall.sharpe.toFixed(2)}</b></div>
              <div>MAR: <b>{backtest.overall.mar.toFixed(2)}</b></div>
              <div>最大DD: <b>{backtest.overall.maxDD.toFixed(1)}%</b></div>
              <div>勝ち: <b>{backtest.overall.wins}</b></div>
              <div>負け: <b>{backtest.overall.losses}</b></div>
            </div>
            <div style={{ fontSize: 11, color: "#c9d6ff", marginBottom: 6 }}>学習/検証 分割（70/30）</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 10, marginBottom: 8 }}>
              <div style={{ background: "#0f1a2c", borderRadius: 8, padding: "6px 8px" }}>学習: 勝率 {backtest.train.winRate.toFixed(1)}% / PF {backtest.train.pf.toFixed(2)} / Sharpe {backtest.train.sharpe.toFixed(2)}</div>
              <div style={{ background: "#0f1a2c", borderRadius: 8, padding: "6px 8px" }}>検証: 勝率 {backtest.test.winRate.toFixed(1)}% / PF {backtest.test.pf.toFixed(2)} / Sharpe {backtest.test.sharpe.toFixed(2)}</div>
            </div>
            <div style={{ fontSize: 11, color: "#c9d6ff", marginBottom: 6 }}>相場局面ごとの再現性</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, fontSize: 10, marginBottom: 8 }}>
              {Object.entries(backtest.regime).map(([k, v]) => (
                <div key={k} style={{ background: "#0f1a2c", borderRadius: 8, padding: "6px 8px" }}>
                  {k}: 勝率 {v.winRate.toFixed(1)}% / PF {v.pf.toFixed(2)}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#c9d6ff", marginBottom: 6 }}>複数銘柄での再現性（D足）</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 10 }}>
              {Object.entries(multiSymbolBacktest).map(([k, v]) => (
                <div key={k} style={{ background: "#0f1a2c", borderRadius: 8, padding: "6px 8px" }}>
                  {SYMBOLS[k].name}: 勝率 {v?.overall?.winRate?.toFixed(1) ?? "0.0"}% / PF {v?.overall?.pf?.toFixed(2) ?? "0.00"} / MAR {v?.overall?.mar?.toFixed(2) ?? "0.00"}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#c9d6ff", margin: "10px 0 6px" }}>直近トレード（IN/OUT検証）</div>
            <div style={{ display: "grid", gap: 5 }}>
              {backtest.recentTrades?.length ? backtest.recentTrades.map((t, i) => (
                <div key={i} style={{ background: "#0f1a2c", borderRadius: 8, padding: "6px 8px", fontSize: 10 }}>
                  {t.side.toUpperCase()} | IN {t.entryLabel} @{t.entryPrice.toFixed(decimals)} ({t.entrySignal}) → OUT {t.exitLabel} @{t.exitPrice.toFixed(decimals)} ({t.exitSignal}) |
                  <span style={{ color: t.ret >= 0 ? "#2ecc71" : "#e74c3c", marginLeft: 4 }}>{(t.ret * 100).toFixed(2)}%</span>
                </div>
              )) : (
                <div style={{ fontSize: 10, color: "#888" }}>No closed trades in current sample.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== Key Levels ===== */}
      {tf !== "1d" && (
        <div style={{ padding: "0 12px 16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <div style={{ background: "#16213e", borderRadius: 10, padding: "12px 14px", borderLeft: "3px solid #2ecc71" }}>
              <div style={{ fontSize: 10, color: "#888" }}>Day Low (Support)</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#2ecc71" }}>{dayLow.toFixed(decimals)}</div>
            </div>
            <div style={{ background: "#16213e", borderRadius: 10, padding: "12px 14px", borderLeft: "3px solid #e74c3c" }}>
              <div style={{ fontSize: 10, color: "#888" }}>Day High (Resistance)</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#e74c3c" }}>{dayHigh.toFixed(decimals)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "10px", color: "#444", fontSize: 10, borderTop: "1px solid #1a1a2e" }}>
        参考情報であり、投資助言ではありません。
        <span> | H: {dayHigh.toFixed(decimals)} L: {dayLow.toFixed(decimals)}</span>
      </div>
    </div>
  );
}
