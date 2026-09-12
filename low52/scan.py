#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
批量找「现价距 52 周最低点 ±5% 以内」的美股主板股票。
数据源:TradingView scanner(同任务1-5 的 screener.py),一次拉全量,本地算距离。
用法: python scan.py [阈值百分比,默认5] [最低市值(美元),默认0]
产出: 52周新低.csv / data.json(网页用) / index.html
"""
import json, sys, time, urllib.request, csv, os
from datetime import datetime, timezone, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
PCT = float(sys.argv[1]) if len(sys.argv) > 1 else 5.0
MCAP_MIN = float(sys.argv[2]) if len(sys.argv) > 2 else 0

COLS = ["name", "description", "close", "price_52_week_low", "price_52_week_high",
        "market_cap_basic", "sector", "industry", "exchange", "country",
        "change", "volume", "price_earnings_ttm", "Perf.Y", "Perf.3M", "Perf.1M",
        "dividend_yield_recent", "net_income_ttm"]

def post(rng):
    payload = {
        "filter": [
            {"left": "exchange", "operation": "in_range", "right": ["NASDAQ", "NYSE", "AMEX"]},
            {"left": "is_primary", "operation": "equal", "right": True},
        ],
        "options": {"lang": "en"},
        "markets": ["america"],
        "symbols": {"query": {"types": ["stock", "dr"]}, "tickers": []},
        "columns": COLS,
        "sort": {"sortBy": "market_cap_basic", "sortOrder": "desc"},
        "range": rng,
    }
    req = urllib.request.Request("https://scanner.tradingview.com/america/scan",
                                 data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.loads(r.read().decode())

rows, start, step = [], 0, 2000
while True:
    d = post([start, start + step])
    batch = d.get("data", [])
    rows += batch
    total = d.get("totalCount", 0)
    start += step
    if not batch or start >= total:
        break
    time.sleep(1)
print("全量", len(rows), "家 / totalCount", total)

hits, seen = [], set()
for it in rows:
    if len(it.get("d", [])) < len(COLS):
        continue
    r = dict(zip(COLS, it["d"]))
    px, lo, hi, mcap = r["close"], r["price_52_week_low"], r["price_52_week_high"], r["market_cap_basic"]
    if not px or not lo or lo <= 0:
        continue
    if mcap is None or mcap < MCAP_MIN:
        continue
    dist = (px - lo) / lo * 100
    if abs(dist) > PCT:
        continue
    key = (r["description"] or "").strip().lower()
    if key in seen:   # GOOG/GOOGL 之类同一家多类股只留市值最大的
        continue
    seen.add(key)
    hits.append({
        "ticker": r["name"], "name": r["description"], "exchange": r["exchange"],
        "price": round(px, 2), "low52": round(lo, 2), "high52": round(hi, 2) if hi else None,
        "dist": round(dist, 2),
        "off_high": round((px - hi) / hi * 100, 1) if hi else None,
        "mcap": mcap, "sector": r["sector"], "industry": r["industry"], "country": r["country"],
        "chg": round(r["change"], 2) if r["change"] is not None else None,
        "vol": r["volume"],
        "pe": round(r["price_earnings_ttm"], 1) if r["price_earnings_ttm"] else None,
        "perf1y": round(r["Perf.Y"], 1) if r["Perf.Y"] is not None else None,
        "perf3m": round(r["Perf.3M"], 1) if r["Perf.3M"] is not None else None,
        "perf1m": round(r["Perf.1M"], 1) if r["Perf.1M"] is not None else None,
        "divy": round(r["dividend_yield_recent"], 2) if r["dividend_yield_recent"] else None,
        "loss": (r["net_income_ttm"] is not None and r["net_income_ttm"] < 0),
    })

hits.sort(key=lambda x: -(x["mcap"] or 0))
stamp = datetime.now(timezone(timedelta(hours=8))).strftime("%Y-%m-%d %H:%M")  # 统一北京时间,本机和 GitHub Actions 一致
meta = {"generated": stamp, "pct": PCT, "mcap_min": MCAP_MIN, "universe": len(rows), "hits": len(hits)}

with open(os.path.join(HERE, "data.json"), "w", encoding="utf-8") as f:
    json.dump({"meta": meta, "rows": hits}, f, ensure_ascii=False)

with open(os.path.join(HERE, "52周新低.csv"), "w", encoding="utf-8-sig", newline="") as f:
    w = csv.writer(f)
    w.writerow(["代号", "公司", "交易所", "现价", "52周最低", "距最低%", "52周最高", "距最高%",
                "市值(亿美元)", "行业板块", "细分行业", "国家", "今日涨跌%", "市盈率TTM", "1年涨跌%", "3月涨跌%", "1月涨跌%", "股息率%", "亏损"])
    for h in hits:
        w.writerow([h["ticker"], h["name"], h["exchange"], h["price"], h["low52"], h["dist"], h["high52"], h["off_high"],
                    round(h["mcap"] / 1e8, 1), h["sector"], h["industry"], h["country"], h["chg"], h["pe"],
                    h["perf1y"], h["perf3m"], h["perf1m"], h["divy"], "是" if h["loss"] else ""])
print("命中", len(hits), "家, 阈值 ±%.1f%%, 市值下限 %.0f" % (PCT, MCAP_MIN))
by_tier = [(1e11, "≥1000亿"), (1e10, "100–1000亿"), (2e9, "20–100亿"), (0, "<20亿")]
prev = float("inf")
for th, lab in by_tier:
    n = sum(1 for h in hits if th <= (h["mcap"] or 0) < prev)
    print(f"  {lab}: {n}")
    prev = th
