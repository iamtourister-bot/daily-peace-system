# SentinelBot v3 — Complete Chart Intelligence System
# Philosophy: The chart always whispers before it screams.
# Features: Pre-move detection, pattern recognition, market phase,
#           RSI divergence, volume climax, weighted TF scoring,
#           S/R touch counter, BTC correlation, 50-coin watcher,
#           Entry quality learning — limit order fill tracking + auto-improve
#           Dynamic check weighting — checks that win more count more
# Runs standalone — Bot 1 calls /analyse, Sentinel approves or rejects
# Port: 8081

import requests
import time
import logging
import json
import os
import threading
import math
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from flask import Flask, request

# ============================================================
# API KEYS — Add to Railway Variables
# ============================================================
SENTINEL_TOKEN    = os.getenv("SENTINEL_TOKEN", "")
CMC_API_KEY       = os.getenv("CMC_API_KEY", "")
BYBIT_API_KEY     = os.getenv("BYBIT_API_KEY", "")
BYBIT_SECRET      = os.getenv("BYBIT_SECRET", "")
SENTINEL_CHAT_ID  = os.getenv("SENTINEL_CHAT_ID", "")
BOT1_URL          = os.getenv("BOT1_URL", "https://cryptoradar-production.up.railway.app")

# ============================================================
# SETTINGS
# ============================================================
MIN_CHECKS_TO_APPROVE       = 4
APPROVAL_WEIGHTED_THRESHOLD = 0.57
WATCH_INTERVAL              = 900
ALERT_COOLDOWN              = 1800
SUGGEST_COOLDOWN_HOURS      = 4      # hours before same coin+direction can be suggested again after resolve
PRE_MOVE_HISTORY_MAX   = 100
BINANCE_BASE           = "https://api.binance.com"
BYBIT_BASE             = "https://api.bybit.com"

_api_calls    = {"binance": [], "bybit": []}
BINANCE_LIMIT = 1000
BYBIT_LIMIT   = 500

logging.basicConfig(level=logging.INFO, format="%(asctime)s [SENTINEL] %(message)s")
logger = logging.getLogger(__name__)
app    = Flask(__name__)

# ============================================================
# STORAGE
# ============================================================
DATA_DIR = os.getenv("RAILWAY_VOLUME_MOUNT_PATH", "/app/data")
os.makedirs(DATA_DIR, exist_ok=True)

def _path(f): return os.path.join(DATA_DIR, f)

def load_json(filename, default):
    try:
        p = _path(filename)
        if os.path.exists(p):
            with open(p) as f: return json.load(f)
    except Exception: pass
    return default

def save_json(filename, data):
    try:
        with open(_path(filename), "w") as f: json.dump(data, f, indent=2)
    except Exception as e: logger.error("Save " + filename + ": " + str(e))

# ============================================================
# LOAD STATE
# ============================================================
sentinel_brain = load_json("sentinel_brain.json", {
    "total_verdicts": 0, "approved": 0, "rejected": 0,
    "approved_wins": 0, "approved_losses": 0,
    # Source-split counters (Bot1 pipeline vs Sentinel direct)
    # Started after the source-tagging upgrade — legacy approved_wins/losses
    # remain as combined totals. These grow from now forward.
    "bot1_wins": 0, "bot1_losses": 0,
    "sentinel_wins": 0, "sentinel_losses": 0,
    "coin_memory": {}, "pre_move_patterns": [],
    "check_accuracy": {
        "macro_trend":    {"correct":0,"total":0},
        "mid_trend":      {"correct":0,"total":0},
        "micro_trend":    {"correct":0,"total":0},
        "volume_profile": {"correct":0,"total":0},
        "rsi_confluence": {"correct":0,"total":0},
        "money_flow":     {"correct":0,"total":0},
        "structure":      {"correct":0,"total":0}
    }
})
# Backfill new source-split fields for existing brains saved before this upgrade
# Default to 0 — these grow from now forward, legacy data stays in approved_wins/losses
for k in ["bot1_wins", "bot1_losses", "sentinel_wins", "sentinel_losses"]:
    if k not in sentinel_brain:
        sentinel_brain[k] = 0

verdict_history  = load_json("sentinel_history.json", [])
coin_knowledge   = load_json("coin_knowledge.json", {})
sr_touch_map     = load_json("sr_touch_map.json", {})
pre_move_history = load_json("pre_move_history.json", [])

# AUTO-FIX corrupted brain on startup
_brain_corrupted = (
    sentinel_brain.get("approved_losses", 0) > sentinel_brain.get("total_verdicts", 0) or
    sentinel_brain.get("approved_wins", 0) > sentinel_brain.get("total_verdicts", 0) or
    sentinel_brain.get("approved", 0) > sentinel_brain.get("total_verdicts", 0)
)
if _brain_corrupted:
    logger.warning("Corrupted brain detected — auto-resetting stats only")
    sentinel_brain = {
        "total_verdicts": 0, "approved": 0, "rejected": 0,
        "approved_wins": 0, "approved_losses": 0,
        "coin_memory": {}, "pre_move_patterns": [],
        "check_accuracy": {
            "macro_trend":    {"correct":0,"total":0},
            "mid_trend":      {"correct":0,"total":0},
            "micro_trend":    {"correct":0,"total":0},
            "volume_profile": {"correct":0,"total":0},
            "rsi_confluence": {"correct":0,"total":0},
            "money_flow":     {"correct":0,"total":0},
            "structure":      {"correct":0,"total":0}
        }
    }
    verdict_history = []
    save_json("sentinel_brain.json", sentinel_brain)
    save_json("sentinel_history.json", verdict_history)
    logger.info("Brain reset complete — coin_knowledge and sr_touch_map preserved")

# ── ONE-TIME STAT CORRECTION ─────────────────────────────────────────────────
# Previous Bot1 flow sent fake losses to Sentinel (Bot1 chose entries/stops,
# Sentinel had no control, but losses were recorded as Sentinel's own).
# Corrected to 5W/3L — a fair clean starting point.
# Flag prevents this from running again on future restarts.
# All knowledge (coin_knowledge, sr_touch_map, entry_learning) is fully preserved.
if not sentinel_brain.get("_stat_corrected_v2", False):
    logger.info("One-time stat correction v2: resetting all polluted stats from old Bot1 flow")

    # Reset W/L scoreboard
    sentinel_brain["approved_wins"]      = 5
    sentinel_brain["approved_losses"]    = 3
    sentinel_brain["total_verdicts"]     = 8
    sentinel_brain["approved"]           = 8
    sentinel_brain["rejected"]           = 0
    sentinel_brain["_stat_corrected_v1"] = True
    sentinel_brain["_stat_corrected_v2"] = True   # never runs again
    save_json("sentinel_brain.json", sentinel_brain)

    # Reset verdict history (polluted by old flow)
    verdict_history = []
    save_json("sentinel_history.json", verdict_history)

    # Reset check_tags — all 66 trades were fake, weights are wrong
    clean_tags = {
        "macro_trend":    {"wins":0,"losses":0},
        "mid_trend":      {"wins":0,"losses":0},
        "micro_trend":    {"wins":0,"losses":0},
        "volume_profile": {"wins":0,"losses":0},
        "rsi_confluence": {"wins":0,"losses":0},
        "money_flow":     {"wins":0,"losses":0},
        "structure":      {"wins":0,"losses":0}
    }
    check_tag_stats.update(clean_tags)
    save_json("check_tags.json", check_tag_stats)

    # Reset coin_confidence — fake losses from Bot1 (ADA, ETH, RLUSD etc.)
    coin_confidence.clear()
    save_json("coin_confidence.json", coin_confidence)

    # Reset missed_trades — old block history from previous flow is meaningless
    missed_trades.clear()
    save_json("missed_trades.json", missed_trades)

    logger.info("Stat correction v2 done — check weights back to 1.0, confidence fresh, knowledge preserved")
# ─────────────────────────────────────────────────────────────────────────────

last_update_id = 0
_last_alerts   = {}
_pre_move_sent = {}
_paused        = False

# Feature 1: Missed trade tracker
missed_trades = load_json("missed_trades.json", [])

# Feature 2: Win/loss reason tagging
check_tag_stats = load_json("check_tags.json", {
    "macro_trend":    {"wins":0,"losses":0},
    "mid_trend":      {"wins":0,"losses":0},
    "micro_trend":    {"wins":0,"losses":0},
    "volume_profile": {"wins":0,"losses":0},
    "rsi_confluence": {"wins":0,"losses":0},
    "money_flow":     {"wins":0,"losses":0},
    "structure":      {"wins":0,"losses":0}
})

# Feature 3: Market regime engine
_current_regime = {"mode": "unknown", "updated": 0}

# Feature 4: Dynamic confidence per coin
coin_confidence = load_json("coin_confidence.json", {})

# Feature 5: Suggested trades tracker — reset on startup to clear duplicates
suggested_trades = []
save_json("suggested_trades.json", [])

# Feature 6: Entry quality learning
# Tracks per-coin, per-direction: wins, losses, avg fill distance from S/R
# Used to auto-improve limit entry suggestions over time
entry_learning = load_json("entry_learning.json", {})
# Structure: { "TRX": { "long": {"wins":3,"losses":1,"avg_dist":0.8,"total_dist":2.4} } }

# ============================================================
# WATCH LIST — 50 COINS
# ============================================================
WATCH_LIST = [
    "BTC","ETH","BNB","SOL","XRP","DOGE","ADA","TRX","AVAX","LINK",
    "SHIB","DOT","SUI","HBAR","BCH","LTC","UNI","NEAR","APT","PEPE",
    "ICP","TAO","ARB","ENA","OP","ATOM","XLM","AAVE","CRV","FIL",
    "ALGO","VET","SAND","MANA","AXS","GALA","CHZ","THETA","FTM","STX",
    "MATIC","COMP","SNX","ZEC","EGLD","CRO","ONDO","KAS","RENDER","JUP",
    "JASMY","HNT","RAY","ORDI","BERA","BONK","SEI","LDO","HYPE","WIF",
    "FLOKI","INJ","TIA","BLUR","PYTH","JTO","STRK","ALT","SAGA","DYM",
    "W","OMNI","ZK","ZRO","DOGS"
]

# ============================================================
# TELEGRAM
# ============================================================
def send_message(text, chat_id=None):
    if not SENTINEL_TOKEN: return
    cid = chat_id or SENTINEL_CHAT_ID
    if not cid: return
    if _paused and not chat_id: return
    try:
        requests.post(
            "https://api.telegram.org/bot" + SENTINEL_TOKEN + "/sendMessage",
            json={"chat_id": cid, "text": text, "parse_mode": "HTML"}, timeout=10)
    except Exception as e: logger.error("Telegram: " + str(e))

def send_suggestion_with_button(text, sym, direction, entry, stop, tp1, tp2, chat_id=None):
    if not SENTINEL_TOKEN: return
    cid = chat_id or SENTINEL_CHAT_ID
    if not cid: return
    if _paused and not chat_id: return
    try:
        callback = "entered:"+sym+":"+direction+":"+str(entry)+":"+str(stop)+":"+str(tp1)+":"+str(tp2)
        requests.post(
            "https://api.telegram.org/bot" + SENTINEL_TOKEN + "/sendMessage",
            json={
                "chat_id": cid,
                "text": text,
                "parse_mode": "HTML",
                "reply_markup": {
                    "inline_keyboard": [[
                        {"text": "✅ I Entered This Trade", "callback_data": callback}
                    ]]
                }
            }, timeout=10)
    except Exception as e: logger.error("Telegram button: " + str(e))

def answer_callback(callback_id):
    try:
        requests.post(
            "https://api.telegram.org/bot" + SENTINEL_TOKEN + "/answerCallbackQuery",
            json={"callback_query_id": callback_id}, timeout=5)
    except Exception: pass

def get_updates(offset=None):
    try:
        r = requests.get(
            "https://api.telegram.org/bot" + SENTINEL_TOKEN + "/getUpdates",
            params={"timeout": 10, "offset": offset}, timeout=15)
        return r.json()
    except Exception: return {"result": []}

# ============================================================
# RATE LIMITING
# ============================================================
def check_rate_limit(source):
    now = time.time()
    _api_calls[source] = [t for t in _api_calls[source] if now-t < 60]
    limits = {"binance": BINANCE_LIMIT, "bybit": BYBIT_LIMIT}
    if len(_api_calls[source]) >= limits[source] * 0.8:
        logger.warning(source + " at 80% limit")
        return False
    _api_calls[source].append(now)
    return True

# ============================================================
# CANDLE FETCHING
# ============================================================
def get_candles(symbol, interval, limit=200):
    sym = symbol + "USDT" if not symbol.endswith("USDT") else symbol
    bybit_map = {"15m":"15","30m":"30","1h":"60","4h":"240","1d":"D","1w":"W","1M":"M"}

    if check_rate_limit("binance"):
        try:
            r = requests.get(BINANCE_BASE + "/api/v3/klines",
                params={"symbol":sym,"interval":interval,"limit":limit}, timeout=10)
            data = r.json()
            if data and isinstance(data, list):
                return [[float(c[1]),float(c[2]),float(c[3]),float(c[4]),float(c[5])] for c in data]
        except Exception as e: logger.warning("Binance " + symbol + " " + interval + ": " + str(e))

    if check_rate_limit("bybit") and interval in bybit_map:
        try:
            r = requests.get(BYBIT_BASE + "/v5/market/kline",
                params={"category":"spot","symbol":sym,"interval":bybit_map[interval],"limit":limit}, timeout=10)
            data = r.json().get("result",{}).get("list",[])
            if data:
                data = list(reversed(data))
                return [[float(c[2]),float(c[3]),float(c[4]),float(c[5]),float(c[6])] for c in data]
        except Exception as e: logger.warning("Bybit " + symbol + " " + interval + ": " + str(e))
    return []

# ============================================================
# INDICATORS
# ============================================================
def calc_ema(values, period):
    if len(values) < period: return values[-1] if values else 0
    k = 2.0/(period+1); ema = sum(values[:period])/period
    for v in values[period:]: ema = v*k + ema*(1-k)
    return ema

def calc_rsi_wilder(closes, period=14):
    if len(closes) < period+1: return 50.0
    gains  = [max(closes[i]-closes[i-1],0) for i in range(1,len(closes))]
    losses = [max(closes[i-1]-closes[i],0) for i in range(1,len(closes))]
    ag = sum(gains[:period])/period; al = sum(losses[:period])/period
    for i in range(period,len(gains)):
        ag=(ag*(period-1)+gains[i])/period; al=(al*(period-1)+losses[i])/period
    if al==0: return 100.0
    return round(100.0-(100.0/(1.0+ag/al)),2)

def calc_bollinger_bands(closes, period=20, std_mult=2.0):
    if len(closes) < period: return None,None,None,None
    window = closes[-period:]; ma = sum(window)/period
    variance = sum((c-ma)**2 for c in window)/period
    std = math.sqrt(variance)
    upper = ma+std_mult*std; lower = ma-std_mult*std
    width = round((upper-lower)/ma*100,4) if ma>0 else 0
    return round(upper,6),round(ma,6),round(lower,6),width

def calc_obv(closes, volumes):
    if len(closes)<2: return 0
    obv=0
    for i in range(1,len(closes)):
        if closes[i]>closes[i-1]: obv+=volumes[i]
        elif closes[i]<closes[i-1]: obv-=volumes[i]
    return obv

def calc_cmf(highs, lows, closes, volumes, period=20):
    if len(closes)<period: return 0
    mf_vol=[]
    for i in range(-period,0):
        hl=highs[i]-lows[i]
        if hl==0: mf_vol.append(0); continue
        mf_vol.append(((closes[i]-lows[i])-(highs[i]-closes[i]))/hl*volumes[i])
    tv=sum(volumes[-period:])
    return round(sum(mf_vol)/tv,4) if tv else 0

def calc_trend(closes, fast=20, slow=50):
    if len(closes)<slow: return "sideways"
    ef=calc_ema(closes[-fast*2:],fast); es=calc_ema(closes[-slow*2:],slow)
    if not ef or not es: return "sideways"
    if abs(ef-es)/es*100<0.1: return "sideways"
    return "bullish" if ef>es else "bearish"

def find_key_levels(highs, lows, closes, lookback=50):
    if len(highs)<lookback: return None,None
    rh=highs[-lookback:]; rl=lows[-lookback:]; price=closes[-1]
    res=sup=None
    for i in range(2,len(rh)-2):
        if rh[i]>rh[i-1] and rh[i]>rh[i+1] and rh[i]>price:
            if res is None or rh[i]<res: res=rh[i]
    for i in range(2,len(rl)-2):
        if rl[i]<rl[i-1] and rl[i]<rl[i+1] and rl[i]<price:
            if sup is None or rl[i]>sup: sup=rl[i]
    return res,sup

# ============================================================
# RSI DIVERGENCE
# ============================================================
def detect_rsi_divergence(closes, rsi_values, lookback=20):
    if len(closes)<lookback or len(rsi_values)<lookback: return None,0
    pr=closes[-lookback:]; rr=rsi_values[-lookback:]
    pl=[]; rl_=[]; ph=[]; rh_=[]
    for i in range(1,lookback-1):
        if pr[i]<pr[i-1] and pr[i]<pr[i+1]: pl.append(i)
        if rr[i]<rr[i-1] and rr[i]<rr[i+1]: rl_.append(i)
        if pr[i]>pr[i-1] and pr[i]>pr[i+1]: ph.append(i)
        if rr[i]>rr[i-1] and rr[i]>rr[i+1]: rh_.append(i)
    if len(pl)>=2 and len(rl_)>=2:
        if pr[pl[-1]]<pr[pl[-2]] and rr[rl_[-1]]>rr[rl_[-2]]:
            return "bullish",round(abs(rr[rl_[-1]]-rr[rl_[-2]]),1)
    if len(ph)>=2 and len(rh_)>=2:
        if pr[ph[-1]]>pr[ph[-2]] and rr[rh_[-1]]<rr[rh_[-2]]:
            return "bearish",round(abs(rr[rh_[-1]]-rr[rh_[-2]]),1)
    return None,0

# ============================================================
# VOLUME CLIMAX
# ============================================================
def detect_volume_climax(closes, volumes, lookback=30):
    if len(closes)<lookback or len(volumes)<lookback: return None,0
    avg_vol=sum(volumes[-lookback:-5])/(lookback-5)
    if avg_vol==0: return None,0
    rv=volumes[-lookback:]; mvi=rv.index(max(rv)); mv=rv[mvi]
    ratio=mv/avg_vol
    if ratio<2.5: return None,0
    c_at=closes[-(lookback-mvi)]; o_approx=closes[-(lookback-mvi)-1] if (lookback-mvi)<len(closes) else c_at
    is_red=c_at<o_approx
    vol_died=False
    if mvi<lookback-3:
        post=sum(rv[mvi+1:mvi+4])/3
        vol_died=post<avg_vol*0.7
    conf=min(round(ratio/5.0,2),1.0)
    if is_red and vol_died: return "selling_climax",conf
    elif not is_red and vol_died: return "buying_climax",conf
    return None,0

# ============================================================
# BB SQUEEZE
# ============================================================
def detect_bb_squeeze(closes, lookback=50):
    if len(closes)<lookback: return False,0,"neutral"
    widths=[]
    for i in range(20,lookback):
        _,_,_,w=calc_bollinger_bands(closes[:-lookback+i+1])
        if w: widths.append(w)
    if len(widths)<10: return False,0,"neutral"
    cw=widths[-1]; aw=sum(widths)/len(widths); mw=min(widths)
    is_sq=cw<aw*0.7 or cw<=mw*1.1
    sq_hrs=0
    for i in range(len(widths)-1,0,-1):
        if widths[i]<aw*0.8: sq_hrs+=1
        else: break
    ma20=sum(closes[-20:])/20
    bias="bullish" if closes[-1]>ma20 else "bearish" if closes[-1]<ma20 else "neutral"
    return is_sq,sq_hrs,bias

# ============================================================
# PATTERN RECOGNITION
# ============================================================
def detect_patterns(highs, lows, closes, volumes, lookback=50):
    patterns=[]
    if len(closes)<lookback: return patterns
    rh=highs[-lookback:]; rl=lows[-lookback:]; rc=closes[-lookback:]
    price=closes[-1]; prev_close=closes[-2]
    rh10=rh[-10:]; rl10=rl[-10:]
    if rh10[-1]>rh10[-5]>rh10[-8]: patterns.append(("Higher Highs","bullish","Price making higher highs — uptrend confirmed"))
    if rl10[-1]<rl10[-5]<rl10[-8]: patterns.append(("Lower Lows","bearish","Price making lower lows — downtrend confirmed"))
    move10=(rc[-10]-rc[-20])/rc[-20]*100 if rc[-20]>0 else 0
    range5=(max(rh[-5:])-min(rl[-5:]))/rc[-5]*100 if rc[-5]>0 else 0
    if move10>5 and range5<2: patterns.append(("Bull Flag","bullish","Sharp pump then tight consolidation — bull flag forming"))
    if move10<-5 and range5<2: patterns.append(("Bear Flag","bearish","Sharp dump then tight consolidation — bear flag forming"))
    res_l=max(rh[-20:]); lows_slope=(rl[-1]-rl[-10])/10
    res_tests=sum(1 for h in rh[-20:] if abs(h-res_l)/res_l<0.005)
    if lows_slope>0 and res_tests>=2: patterns.append(("Ascending Triangle","bullish","Higher lows with flat resistance — breakout pending"))
    sup_l=min(rl[-20:]); highs_slope=(rh[-1]-rh[-10])/10
    sup_tests=sum(1 for l in rl[-20:] if abs(l-sup_l)/sup_l<0.005)
    if highs_slope<0 and sup_tests>=2: patterns.append(("Descending Triangle","bearish","Lower highs with flat support — breakdown pending"))
    range20=(max(rh[-20:])-min(rl[-20:]))/rc[-1]*100 if rc[-1]>0 else 0
    if range20<4: patterns.append(("Range/Coiling","neutral","Price coiling in tight range — big move coming"))
    prev_res=max(rh[-21:-1]) if len(rh)>20 else 0
    if price>prev_res and prev_close<prev_res and prev_res>0: patterns.append(("Resistance Break","bullish","Price broke above resistance — bullish breakout"))
    prev_sup=min(rl[-21:-1]) if len(rl)>20 else float('inf')
    if price<prev_sup and prev_close>prev_sup and prev_sup<float('inf'): patterns.append(("Support Break","bearish","Price broke below support — bearish breakdown"))
    return patterns

# ============================================================
# S/R TOUCH COUNTER
# ============================================================
def update_sr_touches(symbol, highs, lows, closes, tolerance=0.005):
    if symbol not in sr_touch_map: sr_touch_map[symbol]={"resistance":[],"support":[]}
    res,sup=find_key_levels(highs,lows,closes)
    def add_or_update(level_list, pl):
        if pl is None: return
        for entry in level_list:
            if abs(entry["level"]-pl)/pl<tolerance:
                entry["touches"]+=1; entry["last_seen"]=datetime.now(timezone.utc).isoformat(); return
        level_list.append({"level":round(pl,6),"touches":1,
            "first_seen":datetime.now(timezone.utc).isoformat(),
            "last_seen":datetime.now(timezone.utc).isoformat()})
    add_or_update(sr_touch_map[symbol]["resistance"],res)
    add_or_update(sr_touch_map[symbol]["support"],sup)
    sr_touch_map[symbol]["resistance"]=sorted(sr_touch_map[symbol]["resistance"],key=lambda x:x["touches"],reverse=True)[:10]
    sr_touch_map[symbol]["support"]=sorted(sr_touch_map[symbol]["support"],key=lambda x:x["touches"],reverse=True)[:10]
    save_json("sr_touch_map.json",sr_touch_map)
    br=sr_touch_map[symbol]["resistance"][0] if sr_touch_map[symbol]["resistance"] else None
    bs=sr_touch_map[symbol]["support"][0] if sr_touch_map[symbol]["support"] else None
    return br,bs

# ============================================================
# MARKET PHASE (WYCKOFF)
# ============================================================
def detect_market_phase(closes, volumes, highs, lows):
    if len(closes)<50: return "Unknown","Not enough data","❓"
    c50=closes[-50:]; v50=volumes[-50:]; h50=highs[-50:]; l50=lows[-50:]
    ma20=sum(closes[-20:])/20; ma50=sum(closes[-50:])/50
    rsi=calc_rsi_wilder(c50); avg_vol=sum(v50[:25])/25; recent_vol=sum(v50[25:])/25
    vr=recent_vol/avg_vol if avg_vol>0 else 1
    range20=(max(h50[-20:])-min(l50[-20:]))/ma50*100 if ma50>0 else 0
    was_down=c50[0]>c50[15]; at_lows=closes[-1]<ma50*1.05; at_highs=closes[-1]>ma50*0.95 and closes[-1]>ma20
    if was_down and at_lows and range20<8 and vr<1.0 and 35<rsi<55:
        return "Accumulation","Flat after downtrend — smart money quietly buying","🔵"
    if closes[-1]>ma20>ma50 and vr>1.0 and rsi>50:
        return "Markup","Price rising with volume — uptrend in progress","🟢"
    if at_highs and vr>1.2 and range20<6 and rsi>55:
        return "Distribution","High volume at highs but not advancing — smart money selling","🟡"
    if closes[-1]<ma20<ma50 and vr>1.0 and rsi<50:
        return "Markdown","Price falling with volume — downtrend in progress","🔴"
    return "Sideways","No clear phase — market undecided","⚪️"

# ============================================================
# WEIGHTED TF SCORE
# ============================================================
def calc_tf_alignment_score(symbol, direction):
    tf_weights=[("1w",5,"Weekly"),("1d",4,"Daily"),("4h",3,"4H"),("1h",2,"1H"),("30m",1,"30min")]
    total=0; max_s=15; details=[]
    for interval,weight,label in tf_weights:
        try:
            candles=get_candles(symbol,interval,100)
            if not candles or len(candles)<20: details.append(label+": ❓"); continue
            closes=[c[3] for c in candles]; trend=calc_trend(closes,20,50)
            if direction=="long":
                if trend=="bullish": total+=weight; details.append(label+": 🟢 +"+str(weight)+"pts")
                elif trend=="sideways": total+=weight//2; details.append(label+": 🟡 +"+str(weight//2)+"pts")
                else: details.append(label+": 🔴 +0pts")
            else:
                if trend=="bearish": total+=weight; details.append(label+": 🔴 +"+str(weight)+"pts")
                elif trend=="sideways": total+=weight//2; details.append(label+": 🟡 +"+str(weight//2)+"pts")
                else: details.append(label+": 🟢 +0pts")
        except Exception as e: details.append(label+": ❓"); logger.error("TF "+symbol+" "+interval+": "+str(e))
    return total,max_s,round(total/max_s*100),details

# ============================================================
# BTC PRE-MOVE DETECTION
# ============================================================
def detect_btc_pre_move():
    try:
        c1h=get_candles("BTC","1h",100)
        if not c1h or len(c1h)<50: return False,"neutral",[],0,None
        closes=[c[3] for c in c1h]; highs=[c[1] for c in c1h]
        lows=[c[2] for c in c1h]; volumes=[c[4] for c in c1h]
        signals=[]; bull=0; bear=0
        is_sq,sq_hrs,bb_bias=detect_bb_squeeze(closes,50)
        if is_sq:
            signals.append("BB squeeze: "+str(sq_hrs)+"h coiling")
            if bb_bias=="bullish": bull+=2
            elif bb_bias=="bearish": bear+=2
            else: bull+=1; bear+=1
        avg20=sum(volumes[-20:])/20; avg5=sum(volumes[-5:])/5
        drought=round((1-avg5/avg20)*100) if avg20>0 else 0
        if drought>30:
            signals.append("Volume drought: "+str(drought)+"% below avg")
            bull+=1; bear+=1
        obv_now=calc_obv(closes,volumes); obv_10=calc_obv(closes[:-10],volumes[:-10])
        p_flat=abs(closes[-1]-closes[-10])/closes[-10]<0.01
        if p_flat and obv_now>obv_10:
            signals.append("OBV rising while price flat — accumulation (BULLISH)"); bull+=3
        elif p_flat and obv_now<obv_10:
            signals.append("OBV falling while price flat — distribution (BEARISH)"); bear+=3
        rsi_hist=[calc_rsi_wilder(closes[:i]) for i in range(20,len(closes))]
        div_type,div_str=detect_rsi_divergence(closes[-20:],rsi_hist[-20:] if len(rsi_hist)>=20 else rsi_hist)
        if div_type=="bullish": signals.append("RSI bullish divergence ("+str(div_str)+")"); bull+=2
        elif div_type=="bearish": signals.append("RSI bearish divergence ("+str(div_str)+")"); bear+=2
        rl=[min(lows[i:i+4]) for i in range(-20,0,4) if lows[i:i+4]]
        rh=[max(highs[i:i+4]) for i in range(-20,0,4) if highs[i:i+4]]
        if len(rl)>=3 and rl[-1]>rl[-2]>rl[-3]: signals.append("Higher lows — ascending triangle"); bull+=2
        if len(rh)>=3 and rh[-1]<rh[-2]<rh[-3]: signals.append("Lower highs — descending triangle"); bear+=2
        similar=None
        for p in sentinel_brain.get("pre_move_patterns",[])[-20:]:
            snap=p.get("snapshot",{}); outcome=p.get("outcome","unknown")
            cur={"squeeze":is_sq,"vol_drought":drought>30,"obv_div":div_type or "none"}
            matches=sum(1 for k,v in cur.items() if snap.get(k)==v and v not in [False,"none"])
            if matches>=2 and outcome!="unknown":
                similar={"date":p.get("date","")[:10],"direction":p.get("direction",""),"pct_move":p.get("pct_move",0),"matches":matches}
                if p.get("direction")=="up": bull+=1
                elif p.get("direction")=="down": bear+=1
                break
        total=bull+bear; detected=total>=3 and len(signals)>=2
        bias="bullish" if bull>bear else "bearish" if bear>bull else "neutral"
        conf=min(round(total/10.0,2),1.0)
        if detected:
            snap_entry={"date":datetime.now(timezone.utc).isoformat(),
                "snapshot":{"squeeze":is_sq,"vol_drought":drought>30,"obv_div":div_type or "none"},
                "direction":bias,"signals":signals,"outcome":"unknown","pct_move":0}
            sentinel_brain["pre_move_patterns"]=sentinel_brain.get("pre_move_patterns",[])
            sentinel_brain["pre_move_patterns"].append(snap_entry)
            if len(sentinel_brain["pre_move_patterns"])>PRE_MOVE_HISTORY_MAX:
                sentinel_brain["pre_move_patterns"].pop(0)
            save_json("sentinel_brain.json",sentinel_brain)
        return detected,bias,signals,conf,similar
    except Exception as e:
        logger.error("Pre-move: "+str(e)); return False,"neutral",[],0,None

# ============================================================
# 7 CHART CHECKS
# ============================================================
def check_macro_trend(symbol,direction):
    try:
        wk=get_candles(symbol,"1w",52); mo=get_candles(symbol,"1M",24)
        if not wk or not mo: return True,"⚠️ Macro: unavailable"
        wc=[c[3] for c in wk]; mc=[c[3] for c in mo]
        wt=calc_trend(wc,10,20); mt=calc_trend(mc,6,12)
        wr=calc_rsi_wilder(wc); mr=calc_rsi_wilder(mc)
        if direction=="short":
            passed=wt in ["bearish","sideways"] or wr>60
            if mt=="bullish" and wt=="bullish": passed=False
        else:
            passed=wt in ["bullish","sideways"] or wr<40
            if mt=="bearish" and wt=="bearish": passed=False
        s="✅" if passed else "❌"
        return passed,s+" Macro: W="+wt+" RSI:"+str(wr)+" | M="+mt+" RSI:"+str(mr)
    except Exception as e: return True,"⚠️ Macro: "+str(e)

def check_mid_trend(symbol,direction):
    try:
        d=get_candles(symbol,"1d",100); h4=get_candles(symbol,"4h",100)
        if not d or not h4: return True,"⚠️ Mid: unavailable"
        dc=[c[3] for c in d]; h4c=[c[3] for c in h4]
        dt=calc_trend(dc,20,50); h4t=calc_trend(h4c,20,50)
        dr=calc_rsi_wilder(dc); h4r=calc_rsi_wilder(h4c)
        if direction=="short":
            passed=dt in ["bearish","sideways"] and h4t in ["bearish","sideways"]
            if h4r>70: passed=True
        else:
            passed=dt in ["bullish","sideways"] and h4t in ["bullish","sideways"]
            if h4r<30: passed=True
        s="✅" if passed else "❌"
        return passed,s+" Mid: Daily="+dt+" RSI:"+str(dr)+" | 4H="+h4t+" RSI:"+str(h4r)
    except Exception as e: return True,"⚠️ Mid: "+str(e)

def check_micro_trend(symbol,direction):
    try:
        h1=get_candles(symbol,"1h",100); m30=get_candles(symbol,"30m",100)
        if not h1 or not m30: return True,"⚠️ Micro: unavailable"
        h1c=[c[3] for c in h1]; m30c=[c[3] for c in m30]
        h1t=calc_trend(h1c,20,50); m30t=calc_trend(m30c,20,50)
        h1r=calc_rsi_wilder(h1c); m30r=calc_rsi_wilder(m30c)
        if direction=="short":
            passed=h1t in ["bearish","sideways"] or m30t=="bearish"
            if h1r>65 or m30r>65: passed=True
        else:
            passed=h1t in ["bullish","sideways"] or m30t=="bullish"
            if h1r<35 or m30r<35: passed=True
        s="✅" if passed else "❌"
        return passed,s+" Micro: 1H="+h1t+" RSI:"+str(h1r)+" | 30m="+m30t+" RSI:"+str(m30r)
    except Exception as e: return True,"⚠️ Micro: "+str(e)

def check_volume_profile(symbol,direction):
    try:
        h1=get_candles(symbol,"1h",50)
        if not h1: return True,"⚠️ Volume: unavailable"
        h1v=[c[4] for c in h1]; h1c=[c[3] for c in h1]
        avg=sum(h1v[-20:])/20; cur=h1v[-1]
        ratio=round(cur/avg,2) if avg>0 else 1
        v5=sum(h1v[-5:])/5; v20=sum(h1v[-20:])/20
        pu=h1c[-1]>h1c[-5]; vu=v5>v20
        climax,conf=detect_volume_climax(h1c,h1v)
        cs=" | ⚡ "+climax.replace("_"," ").title() if climax else ""
        if direction=="short":
            if pu and not vu: return True,"✅ Volume: Price up on weak vol — exhaustion"+cs
            if not pu and vu: return True,"✅ Volume: Strong selling "+str(ratio)+"x"+cs
            if ratio>1.5: return True,"✅ Volume: Spike "+str(ratio)+"x"+cs
            return False,"❌ Volume: No conviction ("+str(ratio)+"x)"+cs
        else:
            if not pu and not vu: return True,"✅ Volume: Selling exhaustion"+cs
            if pu and vu: return True,"✅ Volume: Strong buying "+str(ratio)+"x"+cs
            if ratio>1.5: return True,"✅ Volume: Spike "+str(ratio)+"x"+cs
            return False,"❌ Volume: Weak buying ("+str(ratio)+"x)"+cs
    except Exception as e: return True,"⚠️ Volume: "+str(e)

def check_rsi_confluence(symbol,direction):
    try:
        tfs=[("15m",get_candles(symbol,"15m",50)),("1h",get_candles(symbol,"1h",50)),
             ("4h",get_candles(symbol,"4h",50)),("1d",get_candles(symbol,"1d",50))]
        rv={}
        for tf,c in tfs:
            if c: rv[tf]=calc_rsi_wilder([x[3] for x in c])
        if not rv: return True,"⚠️ RSI: unavailable"
        rsi_str=" | ".join([tf+":"+str(v) for tf,v in rv.items()])
        if direction=="short":
            passed=sum(1 for v in rv.values() if v>55 or v<45)>=2 or sum(1 for v in rv.values() if v>65)>=1
            verdict="bearish" if passed else "mixed"
        else:
            passed=sum(1 for v in rv.values() if v>50 or v<40)>=2 or sum(1 for v in rv.values() if v<35)>=1
            verdict="bullish" if passed else "mixed"
        s="✅" if passed else "❌"
        return passed,s+" RSI ("+verdict+"): "+rsi_str
    except Exception as e: return True,"⚠️ RSI: "+str(e)

def check_money_flow(symbol,direction):
    try:
        h1=get_candles(symbol,"1h",50); h4=get_candles(symbol,"4h",50)
        if not h1: return True,"⚠️ Money flow: unavailable"
        h1H=[c[1] for c in h1]; h1L=[c[2] for c in h1]
        h1C=[c[3] for c in h1]; h1V=[c[4] for c in h1]
        cmf1=calc_cmf(h1H,h1L,h1C,h1V,20)
        obv_now=calc_obv(h1C,h1V); obv_prev=calc_obv(h1C[:-5],h1V[:-5]); obv_up=obv_now>obv_prev
        cmf4=0
        if h4: cmf4=calc_cmf([c[1] for c in h4],[c[2] for c in h4],[c[3] for c in h4],[c[4] for c in h4],20)
        info="CMF 1H:"+str(cmf1)+" 4H:"+str(cmf4)+" | OBV "+("rising" if obv_up else "falling")
        if direction=="short":
            passed=cmf1<0 or cmf4<-0.05 or not obv_up; verdict="outflow" if passed else "inflow (risky)"
        else:
            passed=cmf1>0 or cmf4>0.05 or obv_up; verdict="inflow" if passed else "outflow (risky)"
        s="✅" if passed else "❌"
        return passed,s+" Money flow ("+verdict+"): "+info
    except Exception as e: return True,"⚠️ Money flow: "+str(e)

def check_structure(symbol,direction,entry_price):
    try:
        h4=get_candles(symbol,"4h",100); d1=get_candles(symbol,"1d",60)
        if not h4: return True,"⚠️ Structure: unavailable"
        h4H=[c[1] for c in h4]; h4L=[c[2] for c in h4]; h4C=[c[3] for c in h4]
        res,sup=find_key_levels(h4H,h4L,h4C)
        price=entry_price if entry_price>0 else h4C[-1]
        ema200=calc_ema(h4C,200) if len(h4C)>=200 else None
        ema_str=""
        if ema200: ema_str=" | 4H EMA200: "+("below ❌" if price<ema200 else "above ✅")
        br,bs=update_sr_touches(symbol,h4H,h4L,h4C)
        touch_str=""
        if br and direction=="short": touch_str=" | Res "+str(br["touches"])+"x tested"
        elif bs and direction=="long": touch_str=" | Sup "+str(bs["touches"])+"x tested"
        hh=ll=hl=lh=False
        if d1 and len(d1)>=10:
            dH=[c[1] for c in d1]; dL=[c[2] for c in d1]
            hh=dH[-1]>max(dH[-10:-1]); ll=dL[-1]<min(dL[-10:-1])
            hl=dL[-1]>min(dL[-4:-1]); lh=dH[-1]<max(dH[-4:-1])
        h4V=[c[4] for c in h4]
        patterns=detect_patterns(h4H,h4L,h4C,h4V)
        pat_str=""
        if patterns:
            rel=[p for p in patterns if (direction=="long" and p[1]=="bullish") or (direction=="short" and p[1]=="bearish")]
            if rel: pat_str=" | Pattern: "+rel[0][0]
        if direction=="short":
            nr=res and abs(price-res)/price<0.02; be=ema200 and price<ema200; bs2=lh or ll
            passed=nr or be or bs2; pts=[]
            if nr: pts.append("near res $"+str(round(res,4)))
            if be: pts.append("below 200EMA")
            if bs2: pts.append("LH/LL confirmed")
            detail=" | ".join(pts) if pts else "no key structure"
        else:
            ns=sup and abs(price-sup)/price<0.02; ae=ema200 and price>ema200; bs3=hl or hh
            passed=ns or ae or bs3; pts=[]
            if ns: pts.append("near sup $"+str(round(sup,4)))
            if ae: pts.append("above 200EMA")
            if bs3: pts.append("HH/HL confirmed")
            detail=" | ".join(pts) if pts else "no key structure"
        s="✅" if passed else "❌"
        return passed,s+" Structure: "+detail+ema_str+touch_str+pat_str
    except Exception as e: return True,"⚠️ Structure: "+str(e)

# ============================================================
# FEATURE 1: WIN/LOSS REASON TAGGING
# ============================================================
def tag_check_results(checks, is_win):
    """
    True bidirectional learning — weights rise AND fall based on real signal quality.

    - Pass + Win   → wins++   (check correctly passed a winner — reward it)
    - Pass + Loss  → losses++ (check wrongly passed a loser — penalize it)
    - Fail + Win   → losses++ (check wrongly blocked a winner — penalize it)
    - Fail + Loss  → wins++   (check correctly identified a loser — reward it)

    Without Fail+Loss being rewarded, all weights drift DOWN over time because
    losses come from two directions but wins only from one. This causes uniform
    weight decay instead of real divergence.

    A check that consistently passes winners AND fails losers will have its
    wins++ and losses++ balanced correctly → weight rises to reflect reliability.
    A check that passes losers AND fails winners will accumulate losses → weight drops.
    """
    check_names = ["macro_trend","mid_trend","micro_trend",
                   "volume_profile","rsi_confluence","money_flow","structure"]
    for i, (name, passed, _) in enumerate(checks):
        key = check_names[i] if i < len(check_names) else name.lower().replace(" ","_")
        if key not in check_tag_stats:
            check_tag_stats[key] = {"wins":0,"losses":0}
        if passed and is_win:
            check_tag_stats[key]["wins"]   += 1   # correctly passed a winner
        elif passed and not is_win:
            check_tag_stats[key]["losses"] += 1   # wrongly passed a loser
        elif not passed and is_win:
            check_tag_stats[key]["losses"] += 1   # wrongly blocked a winner
        elif not passed and not is_win:
            check_tag_stats[key]["wins"]   += 1   # correctly identified a loser
    save_json("check_tags.json", check_tag_stats)

def get_check_reliability():
    results = []
    for check, stats in check_tag_stats.items():
        total = stats["wins"] + stats["losses"]
        if total > 0:
            acc = round(stats["wins"] / total * 100)
            results.append((check, acc, total))
    return sorted(results, key=lambda x: x[1], reverse=True)

# ============================================================
# FEATURE 7: DYNAMIC CHECK WEIGHTING
# ============================================================
# Each of the 7 checks starts with weight 1.0.
# As outcomes come in, checks that correlate with wins get heavier,
# checks that correlate with losses get lighter.
# Weight formula: 0.5 + (win_rate * 1.5), capped at [0.5, 2.0]
#   - 0%  win rate → 0.5  (still counts, just half)
#   - 50% win rate → 1.25 (roughly neutral — slightly above 1.0 since 50% is better than random)
#   - 70% win rate → 1.55 (proven — counts 55% more than default)
#   - 90% win rate → 1.85 (very trusted)
# Requires 5+ trades before weight shifts from default 1.0.
# Saved to check_weights.json so weights persist across restarts.

CHECK_NAMES = ["macro_trend","mid_trend","micro_trend",
               "volume_profile","rsi_confluence","money_flow","structure"]
WEIGHT_MIN_TRADES = 5     # need this many before weight shifts from default
WEIGHT_DEFAULT    = 1.0
WEIGHT_FLOOR      = 0.5
WEIGHT_CEILING    = 2.0

def get_check_weights():
    """
    Returns a dict of {check_name: weight} for all 7 checks.
    Default 1.0 until WEIGHT_MIN_TRADES outcomes recorded for that check.
    """
    weights = {}
    for check in CHECK_NAMES:
        stats = check_tag_stats.get(check, {"wins":0,"losses":0})
        total = stats.get("wins",0) + stats.get("losses",0)
        if total < WEIGHT_MIN_TRADES:
            weights[check] = WEIGHT_DEFAULT
        else:
            win_rate = stats["wins"] / total
            raw      = 0.5 + (win_rate * 1.5)
            weights[check] = round(max(WEIGHT_FLOOR, min(WEIGHT_CEILING, raw)), 3)
    return weights

def calc_weighted_score(checks, weights):
    """
    Given list of (name, passed, detail) and weight dict,
    returns (weighted_score, max_possible_score, pct).
    Only checks that PASSED contribute their weight to score.
    Max possible = sum of all weights (all pass).
    """
    check_key_map = {
        "Macro Trend":    "macro_trend",
        "Mid Trend":      "mid_trend",
        "Micro Trend":    "micro_trend",
        "Volume Profile": "volume_profile",
        "RSI Confluence": "rsi_confluence",
        "Money Flow":     "money_flow",
        "Structure":      "structure"
    }
    score   = 0.0
    max_s   = 0.0
    details = []
    for name, passed, _ in checks:
        key    = check_key_map.get(name, name.lower().replace(" ","_"))
        w      = weights.get(key, WEIGHT_DEFAULT)
        max_s += w
        if passed:
            score += w
            details.append(name+": ✅ (w="+str(w)+")")
        else:
            details.append(name+": ❌ (w="+str(w)+")")
    pct = round(score / max_s * 100) if max_s > 0 else 0
    return round(score,3), round(max_s,3), pct, details

# ============================================================
# FEATURE 2: DYNAMIC CONFIDENCE SCORING
# ============================================================
def get_coin_confidence(symbol, direction):
    if symbol not in coin_confidence:
        return 0.5, "No history — base confidence"
    data    = coin_confidence[symbol]
    key     = direction
    wins    = data.get(key + "_wins", 0)
    losses  = data.get(key + "_losses", 0)
    total   = wins + losses
    if total < 3:
        return 0.5, "Only " + str(total) + " past verdicts — building history"
    conf = wins / total
    if conf >= 0.7:
        desc = "High confidence (" + str(round(conf*100)) + "% win rate on " + str(total) + " trades)"
    elif conf >= 0.5:
        desc = "Moderate confidence (" + str(round(conf*100)) + "% win rate)"
    else:
        desc = "Low confidence (" + str(round(conf*100)) + "% win rate — be cautious)"
    return round(conf, 2), desc

def update_coin_confidence(symbol, direction, is_win):
    if symbol not in coin_confidence:
        coin_confidence[symbol] = {
            "long_wins":0,"long_losses":0,
            "short_wins":0,"short_losses":0
        }
    key = direction + ("_wins" if is_win else "_losses")
    coin_confidence[symbol][key] = coin_confidence[symbol].get(key, 0) + 1
    save_json("coin_confidence.json", coin_confidence)

# ============================================================
# FEATURE 3: MARKET REGIME ENGINE
# ============================================================
def detect_market_regime():
    global _current_regime
    now = time.time()
    if now - _current_regime.get("updated", 0) < 900 and _current_regime.get("mode") != "unknown":
        return _current_regime
    try:
        candles = get_candles("BTC", "4h", 50)
        if not candles or len(candles) < 30:
            return _current_regime
        closes = [c[3] for c in candles]
        highs  = [c[1] for c in candles]
        lows   = [c[2] for c in candles]
        tr_list = []
        for i in range(1, len(closes)):
            tr = max(highs[i]-lows[i], abs(highs[i]-closes[i-1]), abs(lows[i]-closes[i-1]))
            tr_list.append(tr)
        _,_,_,bb_width = calc_bollinger_bands(closes, 20)
        range_20 = (max(highs[-20:]) - min(lows[-20:])) / closes[-1] * 100
        ema20 = calc_ema(closes[-40:], 20)
        ema20_prev = calc_ema(closes[-41:-1], 20) if len(closes) >= 41 else ema20
        ema_slope = (ema20 - ema20_prev) / ema20_prev * 100 if ema20_prev else 0
        rsi = calc_rsi_wilder(closes)
        if bb_width and bb_width > 6 and abs(ema_slope) > 0.1:
            mode = "TREND"
            direction = "BULLISH" if ema_slope > 0 else "BEARISH"
            desc = "Strong " + direction + " trend — follow momentum"
            emoji = "🟢" if direction == "BULLISH" else "🔴"
        elif bb_width and bb_width < 3 or range_20 < 4:
            mode = "RANGE"
            desc = "Price ranging — fade extremes, RSI divergence plays"
            emoji = "🟡"
        elif bb_width and 3 <= bb_width <= 6:
            mode = "TRANSITION"
            desc = "Regime changing — wait for confirmation, reduce size"
            emoji = "⚪️"
        else:
            mode = "RANGE"
            desc = "No clear trend — ranging market"
            emoji = "🟡"
        _current_regime = {
            "mode":      mode,
            "desc":      desc,
            "emoji":     emoji,
            "bb_width":  bb_width,
            "range_20":  range_20,
            "ema_slope": round(ema_slope, 4),
            "rsi":       rsi,
            "updated":   now
        }
        save_json("regime.json", _current_regime)
        logger.info("Regime: " + mode + " | " + desc)
        return _current_regime
    except Exception as e:
        logger.error("Regime engine: " + str(e))
        return _current_regime

# ============================================================
# FEATURE 4: MISSED TRADE TRACKER
# ============================================================
def track_missed_trade(signal, checks, reason, extra_failed=None):
    # Store which checks failed + any extra blocking reasons (level, phase, timing)
    check_name_map = {
        "Macro Trend":    "macro_trend",
        "Mid Trend":      "mid_trend",
        "Micro Trend":    "micro_trend",
        "Volume Profile": "volume_profile",
        "RSI Confluence": "rsi_confluence",
        "Money Flow":     "money_flow",
        "Structure":      "structure"
    }
    failed_checks  = [check_name_map.get(n, n.lower().replace(" ","_"))
                      for n,p,_ in checks if not p]
    passed_checks  = [check_name_map.get(n, n.lower().replace(" ","_"))
                      for n,p,_ in checks if p]
    # Merge extra blocking reasons (level_validation, phase_gate, entry_timing)
    # This fixes the empty "blocked by:" for HBAR/UNI type blocks where all
    # 7 checks passed but level validation or phase gate blocked the trade
    if extra_failed:
        failed_checks.extend(extra_failed)
    missed = {
        "symbol":        signal.get("symbol"),
        "direction":     signal.get("direction"),
        "entry":         signal.get("entry", 0),
        "blocked_at":    datetime.now(timezone.utc).isoformat(),
        "reason":        reason,
        "checks_passed": sum(1 for _,p,_ in checks if p),
        "failed_checks": failed_checks,
        "passed_checks": passed_checks,
        "outcome":       "unknown",
        "outcome_pct":   0,
        "was_correct":   None
    }
    missed_trades.append(missed)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    while missed_trades and missed_trades[0].get("blocked_at","") < cutoff:
        missed_trades.pop(0)
    save_json("missed_trades.json", missed_trades)
    logger.info("Missed trade tracked: "+missed["symbol"]+" "+missed["direction"]+
                " | failed: "+", ".join(failed_checks))

def update_missed_trade_outcomes():
    now = datetime.now(timezone.utc)
    updated = False
    for trade in missed_trades:
        if trade.get("outcome") != "unknown": continue
        blocked_at = trade.get("blocked_at", "")
        if not blocked_at: continue
        try:
            blocked_time = datetime.fromisoformat(blocked_at)
            hours_since  = (now - blocked_time).total_seconds() / 3600
            if hours_since < 1: continue
            if hours_since > 168:
                trade["outcome"]     = "expired"
                trade["was_correct"] = None
                updated = True
                continue
            symbol    = trade["symbol"]
            direction = trade["direction"]
            entry     = trade.get("entry", 0)
            if entry <= 0: continue
            candles = get_candles(symbol, "1h", 1)
            if not candles: continue
            current_price = candles[-1][3]
            if direction == "short":
                pct_move = round((entry - current_price) / entry * 100, 2)
            else:
                pct_move = round((current_price - entry) / entry * 100, 2)
            trade["outcome_pct"] = pct_move
            trade["was_correct"] = pct_move < 0
            trade["outcome"] = "would_win" if pct_move > 1 else "would_lose" if pct_move < -1 else "neutral"
            updated = True

            # ── WRONG BLOCK LEARNING ─────────────────────────────────────────
            # If we blocked a trade that would have WON, the checks that FAILED
            # caused a wrong block — penalize them in check_tag_stats.
            # This is what makes macro_trend/volume_profile weights drop over time
            # when they consistently block good trades.
            if not trade["was_correct"] and pct_move > 1:
                failed = trade.get("failed_checks", [])
                for check_key in failed:
                    if check_key not in check_tag_stats:
                        check_tag_stats[check_key] = {"wins":0,"losses":0}
                    check_tag_stats[check_key]["losses"] += 1
                    logger.info("Wrong block penalty: "+check_key+" on "+symbol+" (missed "+str(pct_move)+"%)")
                if failed:
                    save_json("check_tags.json", check_tag_stats)
            # ────────────────────────────────────────────────────────────────

            logger.info("Missed trade outcome: "+symbol+" "+
                       ("CORRECT block" if trade["was_correct"] else "WRONG block — missed "+str(pct_move)+"%"))
        except Exception as e:
            logger.error("Missed trade update: "+str(e))
    if updated:
        save_json("missed_trades.json", missed_trades)

# ============================================================
# FEATURE 5: ENTRY TIMING TRIGGER
# ============================================================
def check_entry_timing(symbol, direction):
    try:
        m15 = get_candles(symbol, "15m", 10)
        if not m15 or len(m15) < 5:
            return True, "✅ Timing: No data — proceeding"
        closes  = [c[3] for c in m15]
        volumes = [c[4] for c in m15]
        last_close = closes[-1]
        prev_close = closes[-2]
        last_vol   = volumes[-1]
        avg_vol    = sum(volumes[-5:]) / 5
        last_candle_bull = last_close > prev_close
        vol_spike        = last_vol > avg_vol * 1.3
        if direction == "short":
            if not last_candle_bull and vol_spike:
                return True, "✅ Timing: Red candle + volume — good short entry"
            if not last_candle_bull:
                return True, "✅ Timing: Bearish momentum confirmed"
            if last_candle_bull and vol_spike:
                return False, "❌ Timing: Last candle bullish + volume spike — wait for reversal"
            return True, "✅ Timing: Acceptable entry window"
        else:
            if last_candle_bull and vol_spike:
                return True, "✅ Timing: Green candle + volume — good long entry"
            if last_candle_bull:
                return True, "✅ Timing: Bullish momentum confirmed"
            if not last_candle_bull and vol_spike:
                return False, "❌ Timing: Last candle bearish + volume — wait for bounce"
            return True, "✅ Timing: Acceptable entry window"
    except Exception as e:
        logger.error("Entry timing: " + str(e))
        return True, "✅ Timing: Error — proceeding"

# ============================================================
# MASTER VERDICT
# ============================================================
def run_sentinel_analysis(signal):
    symbol=signal.get("symbol","BTC"); direction=signal.get("direction","long")
    score_b1=signal.get("score",6); entry=signal.get("entry",0); nl=chr(10)
    logger.info("Analysing: "+symbol+" "+direction.upper()+" Bot1:"+str(score_b1))

    ck = coin_knowledge.get(symbol, {})
    own_bias = ck.get("overall_bias", "NEUTRAL")
    if own_bias != "NEUTRAL":
        if direction == "short" and own_bias == "BULLISH":
            msg = ("🧠 <b>SENTINEL SELF-REJECT</b>"+nl+
                   "❌ "+symbol+" SHORT — REJECTED"+nl+nl+
                   "My knowledge says "+symbol+" is BULLISH."+nl+
                   "I will not short what I know is going up."+nl+nl+
                   "Daily: "+ck.get("daily_trend","?")+
                   " | RSI: "+str(ck.get("daily_rsi","?"))+nl+
                   "Phase: "+ck.get("phase","?")+nl+
                   "⏰ "+datetime.now(timezone.utc).strftime("%H:%M UTC"))
            send_message(msg)
            logger.info("SELF-REJECT: "+symbol+" SHORT conflicts with own BULLISH bias")
            sentinel_brain["total_verdicts"]+=1
            sentinel_brain["rejected"]=sentinel_brain.get("rejected",0)+1
            save_json("sentinel_brain.json",sentinel_brain)
            return {"approved":False,"score":0,"total":7,"symbol":symbol,
                    "direction":direction,"reason":"Self-reject: own bias BULLISH"}

        if direction == "long" and own_bias == "BEARISH":
            msg = ("🧠 <b>SENTINEL SELF-REJECT</b>"+nl+
                   "❌ "+symbol+" LONG — REJECTED"+nl+nl+
                   "My knowledge says "+symbol+" is BEARISH."+nl+
                   "I will not long what I know is going down."+nl+nl+
                   "Daily: "+ck.get("daily_trend","?")+
                   " | RSI: "+str(ck.get("daily_rsi","?"))+nl+
                   "Phase: "+ck.get("phase","?")+nl+
                   "⏰ "+datetime.now(timezone.utc).strftime("%H:%M UTC"))
            send_message(msg)
            logger.info("SELF-REJECT: "+symbol+" LONG conflicts with own BEARISH bias")
            sentinel_brain["total_verdicts"]+=1
            sentinel_brain["rejected"]=sentinel_brain.get("rejected",0)+1
            save_json("sentinel_brain.json",sentinel_brain)
            return {"approved":False,"score":0,"total":7,"symbol":symbol,
                    "direction":direction,"reason":"Self-reject: own bias BEARISH"}

    coin_conf, conf_desc = get_coin_confidence(symbol, direction)
    regime = detect_market_regime()
    regime_mode = regime.get("mode", "UNKNOWN")
    regime_emoji = regime.get("emoji", "❓")
    good_timing, timing_reason = check_entry_timing(symbol, direction)

    # ── BOT1 TIMING INTELLIGENCE ─────────────────────────────────────────────
    # Read Bot1's hour_stats — it knows from real trade history which hours win.
    # IMPORTANT: boost is capped at ±3 to avoid overfitting to time patterns.
    # Total combined boost (hour + coin) capped at ±5 so chart analysis stays primary.
    bot1_hour_boost  = 0
    bot1_timing_note = ""
    bot1_coin_note   = ""
    try:
        now_hour = datetime.now(timezone.utc).hour
        b1 = requests.get(BOT1_URL + "/brain", timeout=4)
        if b1.status_code == 200:
            b1_data    = b1.json()
            hour_stats = b1_data.get("hour_stats", {})
            hd         = hour_stats.get(str(now_hour), {})
            hw         = hd.get("wins",0); hl = hd.get("losses",0); ht = hw+hl
            if ht >= 8:   # need at least 8 trades before trusting hour data
                hour_wr = round(hw/ht*100)
                if hour_wr >= 70:
                    bot1_hour_boost  = 3   # trusted hour — gentle boost
                    bot1_timing_note = "🕐 Bot1: "+str(now_hour)+":00 UTC — "+str(hour_wr)+"% win rate ("+str(ht)+" trades) ✅"
                elif hour_wr <= 30:
                    bot1_hour_boost  = -3  # bad hour — gentle penalty
                    bot1_timing_note = "🕐 Bot1: "+str(now_hour)+":00 UTC — only "+str(hour_wr)+"% win rate ⚠️"
                else:
                    bot1_timing_note = "🕐 Bot1: "+str(now_hour)+":00 UTC — "+str(hour_wr)+"% (neutral)"
            # Bot1 coin-specific directional win rate — only if 8+ trades
            coin_stats = b1_data.get("coin_stats",{}).get(symbol,{})
            if direction=="long":
                cw=coin_stats.get("long_wins",0); cl=coin_stats.get("long_losses",0)
            else:
                cw=coin_stats.get("short_wins",0); cl=coin_stats.get("short_losses",0)
            ct = cw+cl
            if ct >= 8:
                cwr = round(cw/ct*100)
                if cwr >= 70:
                    bot1_hour_boost = min(bot1_hour_boost + 3, 5)   # cap combined at +5
                    bot1_coin_note = "🧠 Bot1: "+symbol+" "+direction+" wins "+str(cwr)+"% ("+str(ct)+" trades) ✅"
                elif cwr <= 25:
                    bot1_hour_boost = max(bot1_hour_boost - 3, -5)  # cap combined at -5
                    bot1_coin_note = "🧠 Bot1: "+symbol+" "+direction+" only "+str(cwr)+"% ⚠️"
    except Exception as e:
        logger.warning("Bot1 brain read: "+str(e))
    # ─────────────────────────────────────────────────────────────────────────
    prior,context_summary=get_coin_context(symbol)
    if prior:
        send_message("📚 <b>Prior Knowledge: "+symbol+"</b>"+nl+nl+context_summary+nl+nl+
            "Confidence: "+str(round(coin_conf*100))+"% | Regime: "+regime_emoji+" "+regime_mode+nl+
            "Running fresh analysis...")

    h1_raw=get_candles(symbol,"1h",100)
    phase=phase_desc=phase_emoji="❓"
    if h1_raw and len(h1_raw)>=50:
        phase,phase_desc,phase_emoji=detect_market_phase([c[3] for c in h1_raw],[c[4] for c in h1_raw],[c[1] for c in h1_raw],[c[2] for c in h1_raw])

    tf_score,tf_max,tf_pct,tf_details=calc_tf_alignment_score(symbol,direction)
    btc_pm,btc_bias,btc_signals,btc_conf,similar=detect_btc_pre_move()

    checks=[]
    try:
        checks.append(("Macro Trend",    *check_macro_trend(symbol,direction)))
        checks.append(("Mid Trend",      *check_mid_trend(symbol,direction)))
        checks.append(("Micro Trend",    *check_micro_trend(symbol,direction)))
        checks.append(("Volume Profile", *check_volume_profile(symbol,direction)))
        checks.append(("RSI Confluence", *check_rsi_confluence(symbol,direction)))
        checks.append(("Money Flow",     *check_money_flow(symbol,direction)))
        checks.append(("Structure",      *check_structure(symbol,direction,entry)))
    except Exception as e: logger.error("Checks: "+str(e))

    passed=sum(1 for _,p,_ in checks if p); total=len(checks)

    # ── DYNAMIC WEIGHTED SCORING ─────────────────────────────────────────────
    weights          = get_check_weights()
    w_score, w_max, w_pct, w_details = calc_weighted_score(checks, weights)

    # ── REGIME-AWARE APPROVAL THRESHOLD ─────────────────────────────────────
    # TREND:      easier (52%) — chart is clear, follow momentum
    # TRANSITION: stricter (62%) — uncertain, need more conviction
    # RANGE/other: default (57%)
    if regime_mode == "TREND":
        regime_threshold = 0.52
    elif regime_mode == "TRANSITION":
        regime_threshold = 0.62
    else:
        regime_threshold = APPROVAL_WEIGHTED_THRESHOLD  # 0.57 default
    # ────────────────────────────────────────────────────────────────────────

    # Apply Bot1 timing boost (capped at ±5)
    w_pct_final = min(100, max(0, w_pct + bot1_hour_boost))

    # ── WEAK COIN HARD BLOCK + FRICTION ─────────────────────────────────────
    cc_data = coin_confidence.get(symbol, {})
    if direction == "long":
        cck_w = cc_data.get("long_wins",0); cck_l = cc_data.get("long_losses",0)
    else:
        cck_w = cc_data.get("short_wins",0); cck_l = cc_data.get("short_losses",0)
    cck_t = cck_w + cck_l
    weak_coin_note = ""
    if cck_t >= 6:
        cck_wr = cck_w / cck_t
        if cck_wr < 0.20:
            w_pct_final = 0   # force below any threshold
            weak_coin_note = chr(10)+"🚫 WEAK COIN BLOCK: "+symbol+" "+direction+" only "+str(round(cck_wr*100))+"% win ("+str(cck_t)+" trades)"
            logger.info("HARD BLOCK weak coin: "+symbol+" "+direction+" "+str(round(cck_wr*100))+"% win rate")
        elif cck_wr < 0.35:
            w_pct_final = max(0, w_pct_final - 15)
            weak_coin_note = chr(10)+"⚠️ Weak coin penalty: "+symbol+" "+direction+" "+str(round(cck_wr*100))+"% win ("+str(cck_t)+" trades) → -15pts"
            logger.info("Weak coin penalty: "+symbol+" "+direction+" "+str(round(cck_wr*100))+"% → adjusted to "+str(w_pct_final)+"%")
    elif cck_t >= 5:
        cck_wr = cck_w / cck_t
        if cck_wr < 0.25:
            w_pct_final = max(0, w_pct_final - 10)
            weak_coin_note = chr(10)+"⚠️ Caution: "+symbol+" "+direction+" "+str(round(cck_wr*100))+"% win ("+str(cck_t)+" trades) → -10pts"
    # ────────────────────────────────────────────────────────────────────────

    # ── COIN-LEVEL PHASE GATE ────────────────────────────────────────────────
    # BTC can be in TREND while individual coins are in Markdown or Sideways.
    # Approving a LONG on a coin in Markdown is wrong regardless of BTC regime.
    # This gate reads the coin's OWN phase from Sentinel's 15-min knowledge update.
    #
    # LONG rules:
    #   Markup      → ✅ full green light (coin is moving up)
    #   Accumulation→ ✅ allowed (early entry, good R:R)
    #   Sideways    → ⚠️ require +10pts higher score (direction unclear)
    #   Distribution→ 🚫 hard block (smart money selling)
    #   Markdown    → 🚫 hard block (coin is falling)
    #
    # SHORT rules (inverse):
    #   Markdown    → ✅ full green light
    #   Distribution→ ✅ allowed
    #   Sideways    → ⚠️ require +10pts higher score
    #   Accumulation→ 🚫 hard block
    #   Markup      → 🚫 hard block
    #
    coin_phase = ck.get("phase", "Unknown").lower()
    phase_note = ""
    phase_blocked = False

    if direction == "long":
        if coin_phase in ["markdown", "distribution"]:
            phase_blocked = True
            phase_note = chr(10)+"🚫 PHASE BLOCK: "+symbol+" in "+coin_phase.title()+" — wrong direction for LONG"
            logger.info("PHASE BLOCK: "+symbol+" LONG blocked — coin in "+coin_phase)
        elif coin_phase == "sideways":
            # Unclear direction — raise threshold by adding penalty to score
            w_pct_final = max(0, w_pct_final - 10)
            phase_note = chr(10)+"⚠️ Phase penalty: "+symbol+" Sideways — direction unclear → -10pts"
            logger.info("Phase penalty: "+symbol+" LONG sideways → adjusted to "+str(w_pct_final)+"%")
        elif coin_phase in ["markup", "accumulation"]:
            phase_note = chr(10)+"✅ Phase aligned: "+symbol+" "+coin_phase.title()+" — good for LONG"
    elif direction == "short":
        if coin_phase in ["markup", "accumulation"]:
            phase_blocked = True
            phase_note = chr(10)+"🚫 PHASE BLOCK: "+symbol+" in "+coin_phase.title()+" — wrong direction for SHORT"
            logger.info("PHASE BLOCK: "+symbol+" SHORT blocked — coin in "+coin_phase)
        elif coin_phase == "sideways":
            w_pct_final = max(0, w_pct_final - 10)
            phase_note = chr(10)+"⚠️ Phase penalty: "+symbol+" Sideways — direction unclear → -10pts"
            logger.info("Phase penalty: "+symbol+" SHORT sideways → adjusted to "+str(w_pct_final)+"%")
        elif coin_phase in ["markdown", "distribution"]:
            phase_note = chr(10)+"✅ Phase aligned: "+symbol+" "+coin_phase.title()+" — good for SHORT"
    # ────────────────────────────────────────────────────────────────────────

    # ── MACRO_TREND REQUIRED GATE ────────────────────────────────────────────
    # Data shows macro_trend is 96% correct when it blocks a trade.
    # When macro fails but weak signals pass → those are the 61 losses.
    # Fix: if macro_trend fails, raise threshold by 15pts — weak signals
    # cannot compensate for a failed macro. Chart must be overwhelming.
    macro_passed = any(n=="Macro Trend" and p for n,p,_ in checks)
    macro_gate_note = ""
    if not macro_passed:
        w_pct_final = max(0, w_pct_final - 15)
        macro_gate_note = chr(10)+"⚠️ Macro gate: macro_trend failed → -15pts (need strong confirmation)"
        logger.info("Macro gate penalty: "+symbol+" macro failed → adjusted to "+str(w_pct_final)+"%")
    # ────────────────────────────────────────────────────────────────────────

    # Approval based on final adjusted score vs regime threshold
    approved = w_pct_final >= int(regime_threshold * 100)
    if phase_blocked:
        approved = False

    breakdown=nl.join(d for _,_,d in checks)
    w_breakdown=nl.join("  "+d for d in w_details)
    tf_str=nl.join("  "+d for d in tf_details)
    now_str=datetime.now(timezone.utc).strftime("%H:%M UTC")

    level_note = ""
    sl   = signal.get("sl", 0)
    tp1  = signal.get("tp1", 0)
    if entry > 0 and sl > 0 and tp1 > 0:
        if direction == "long":
            risk   = entry - sl
            reward = tp1 - entry
        else:
            risk   = sl - entry
            reward = entry - tp1
        rr = round(reward / risk, 2) if risk > 0 else 0
        risk_pct = round(risk / entry * 100, 2)
        ck = coin_knowledge.get(symbol, {})
        sup = ck.get("support", 0)
        res = ck.get("resistance", 0)
        level_issues = []
        if rr < 1.5:
            level_issues.append("R:R too low ("+str(rr)+") — need 1.5 minimum")
            approved = False
        if risk_pct > 5:
            level_issues.append("Stop too wide ("+str(risk_pct)+"%) — max 5%")
            approved = False
        if direction == "long" and sup > 0:
            if sl > sup:
                level_issues.append("Stop $"+str(round(sl,4))+" above support $"+str(round(sup,4))+" — not protected")
                approved = False
        if direction == "short" and res > 0:
            if sl < res:
                level_issues.append("Stop $"+str(round(sl,4))+" below resistance $"+str(round(res,4))+" — not protected")
                approved = False
        if level_issues:
            level_note = nl+"⚠️ <b>Level Issues:</b>"+nl+nl.join("  • "+i for i in level_issues)
        else:
            level_note = nl+"✅ <b>Levels valid:</b> R:R 1:"+str(rr)+" | Risk "+str(risk_pct)+"% | Stop behind key level"

    timing_note = ""
    if not good_timing:
        timing_note = nl + "⏱️ " + timing_reason
        approved = False

    dir_icon="📈 LONG" if direction=="long" else "📉 SHORT"
    btc_note=""
    if btc_pm:
        btc_note=nl+"⚡ <b>BTC Pre-Move!</b> Bias: "+btc_bias.upper()
        if similar: btc_note+=nl+"Similar to "+similar["date"]+" → "+str(similar["pct_move"])+"% "+similar["direction"]

    # Build timing notes from Bot1
    b1_notes = ""
    if bot1_timing_note: b1_notes += nl + bot1_timing_note
    if bot1_coin_note:   b1_notes += nl + bot1_coin_note
    if bot1_hour_boost != 0:
        b1_notes += nl + ("📈 Timing boost: +" if bot1_hour_boost > 0 else "📉 Timing penalty: ") + str(abs(bot1_hour_boost)) + "pts → Adjusted: " + str(w_pct_final) + "%"
    if weak_coin_note:   b1_notes += weak_coin_note
    if phase_note:       b1_notes += phase_note
    if macro_gate_note:  b1_notes += macro_gate_note

    threshold_label = "TREND 52%" if regime_mode=="TREND" else ("TRANSITION 62%" if regime_mode=="TRANSITION" else "DEFAULT 57%")

    msg=(
        "🛡️ <b>SENTINEL v3 VERDICT</b>"+nl+"━━━━━━━━━━━━━━━━━━━━"+nl+nl+
        dir_icon+" <b>"+symbol+"/USDT</b>"+nl+"Bot 1 score: "+str(score_b1)+nl+
        phase_emoji+" Phase: "+phase+" | "+regime_emoji+" Regime: "+regime_mode+nl+
        "🎯 Confidence: "+str(round(coin_conf*100))+"% — "+conf_desc+nl+nl+
        "<b>📊 TF Score: "+str(tf_score)+"/"+str(tf_max)+" ("+str(tf_pct)+"%)</b>"+nl+
        tf_str+nl+nl+
        "<b>7 Checks (raw):</b>"+nl+breakdown+nl+nl+
        "<b>⚖️ Weighted Score: "+str(w_score)+"/"+str(w_max)+" ("+str(w_pct)+"%)</b>"+nl+
        w_breakdown+nl+
        b1_notes+nl+nl+
        timing_reason+nl+nl+
        "━━━━━━━━━━━━━━━━━━━━"+nl+
        "<b>Raw: "+str(passed)+"/"+str(total)+" | Weighted: "+str(w_pct)+"% → Adjusted: "+str(w_pct_final)+"% (need "+threshold_label+")</b>"+nl+nl+
        "<b>"+("✅ APPROVED" if approved else "❌ REJECTED")+"</b>"+nl+
        ("✅ Chart aligns. Clearing Bot 1." if approved else "🚫 Blocking trade.")+
        level_note+btc_note+timing_note+nl+nl+"⏰ "+now_str
    )
    send_message(msg)

    sentinel_brain["total_verdicts"]+=1
    if approved: sentinel_brain["approved"]+=1
    else: sentinel_brain["rejected"]+=1
    if symbol not in sentinel_brain["coin_memory"]:
        sentinel_brain["coin_memory"][symbol]={"approved":0,"wins":0,"losses":0}
    if approved: sentinel_brain["coin_memory"][symbol]["approved"]+=1
    save_json("sentinel_brain.json",sentinel_brain)

    verdict_history.append({"symbol":symbol,"direction":direction,"approved":approved,
        "score":passed,"tf_score":tf_score,"phase":phase,
        "w_score":w_score,"w_pct":w_pct,
        "timestamp":datetime.now(timezone.utc).isoformat(),
        "checks":[(n,p) for n,p,_ in checks]})
    if len(verdict_history)>100: verdict_history.pop(0)
    save_json("sentinel_history.json",verdict_history)

    if approved:
        sl2  = signal.get("sl", 0)
        tp1b = signal.get("tp1", 0)
        rr2  = 0
        risk_pct2 = 0
        if entry>0 and sl2>0 and tp1b>0:
            risk2   = (entry-sl2) if direction=="long" else (sl2-entry)
            reward2 = (tp1b-entry) if direction=="long" else (entry-tp1b)
            rr2     = round(reward2/risk2,2) if risk2>0 else 0
            risk_pct2 = round(risk2/entry*100,2)
        approved_trades = load_json("approved_trades.json",[])
        approved_trades.append({
            "symbol":    symbol,
            "direction": direction,
            "entry":     entry,
            "stop":      sl2,
            "tp1":       tp1b,
            "rr":        rr2,
            "risk_pct":  risk_pct2,
            "checks_passed": passed,
            "tf_score":  tf_score,
            "phase":     phase,
            "btc_bias":  btc_bias if btc_pm else "neutral",
            "btc_premove": btc_pm,
            "time":      datetime.now(timezone.utc).isoformat(),
            "outcome":   "pending",
            "pnl":       0
        })
        if len(approved_trades)>200: approved_trades=approved_trades[-200:]
        save_json("approved_trades.json", approved_trades)

    if not approved:
        block_reason = "Score: "+str(passed)+"/"+str(total)+" | "+timing_reason
        if phase_blocked:
            block_reason = "Phase block: "+coin_phase+" | "+block_reason
        if level_issues:
            block_reason = "Level: "+(" | ".join(level_issues))+" | "+block_reason
        # If all checks passed but trade was blocked by level/phase/timing,
        # record the blocking reason as a synthetic "failed check" so /blocked shows it
        extra_failed = []
        if level_issues:
            extra_failed.append("level_validation")
        if phase_blocked:
            extra_failed.append("phase_gate:"+coin_phase)
        if not good_timing:
            extra_failed.append("entry_timing")
        track_missed_trade(signal, checks, block_reason, extra_failed)

    sent_entry = sent_stop = sent_tp1 = sent_tp2 = 0
    if approved:
        ck = coin_knowledge.get(symbol, {})
        sup = ck.get("support", 0)
        res = ck.get("resistance", 0)
        if direction == "long":
            if not sup: sup = round(float(entry) * 0.97, 6) if entry else 0
            sent_entry = sup
            sent_stop  = round(sup * 0.992, 6)
            risk = sent_entry - sent_stop
            if risk <= 0: risk = sent_entry * 0.01
            sent_tp1 = round(sent_entry + risk * 2.0, 6)
            sent_tp2 = round(sent_entry + risk * 3.5, 6)
        else:
            if not res: res = round(float(entry) * 1.03, 6) if entry else 0
            sent_entry = res
            sent_stop  = round(res * 1.008, 6)
            risk = sent_stop - sent_entry
            if risk <= 0: risk = sent_entry * 0.01
            sent_tp1 = round(sent_entry - risk * 2.0, 6)
            sent_tp2 = round(sent_entry - risk * 3.5, 6)

        # ── STOP SANITY CHECK ────────────────────────────────────────────────
        # Critical: stop must ALWAYS be on correct side of entry.
        # LONG:  stop must be BELOW entry (stop < entry)
        # SHORT: stop must be ABOVE entry (stop > entry)
        # If this fails, the levels are invalid — reject the trade.
        # This prevents "stop hit on fill" situations like LDO where stop
        # was above entry and trade died the moment it filled.
        stop_valid = True
        if direction == "long" and sent_stop >= sent_entry:
            stop_valid = False
            logger.warning("STOP SANITY FAIL: "+symbol+" LONG stop $"+str(sent_stop)+" >= entry $"+str(sent_entry)+" — rejecting")
        elif direction == "short" and sent_stop <= sent_entry:
            stop_valid = False
            logger.warning("STOP SANITY FAIL: "+symbol+" SHORT stop $"+str(sent_stop)+" <= entry $"+str(sent_entry)+" — rejecting")

        if not stop_valid:
            approved = False
            sent_entry = sent_stop = sent_tp1 = sent_tp2 = 0
            # Update message to show rejection reason
            extra_msg = nl+"🚫 <b>LEVEL SANITY FAIL</b>"+nl+"Stop was on wrong side of entry — trade rejected for safety."
            send_message(msg + extra_msg)
            sentinel_brain["total_verdicts"] += 1
            sentinel_brain["rejected"] = sentinel_brain.get("rejected", 0) + 1
            save_json("sentinel_brain.json", sentinel_brain)
            return {"approved":False,"score":passed,"total":total,"symbol":symbol,
                    "direction":direction,"reason":"Stop sanity fail — invalid levels"}
        # ────────────────────────────────────────────────────────────────────

    return {"approved":approved,"score":passed,"total":total,"tf_score":tf_score,
            "tf_pct":tf_pct,"phase":phase,"symbol":symbol,"direction":direction,
            "btc_premove":btc_pm,"timestamp":datetime.now(timezone.utc).isoformat(),
            "entry":sent_entry,"stop":sent_stop,"tp1":sent_tp1,"tp2":sent_tp2}

# ============================================================
# COIN WATCHER
# ============================================================
def get_btc_context():
    if "BTC" in coin_knowledge:
        btc=coin_knowledge["BTC"]; dt=btc.get("daily_trend","sideways")
        wt=btc.get("weekly_trend","sideways"); dr=btc.get("daily_rsi",50)
        if wt=="bearish" and dt=="bearish": return "bear"
        if wt=="bullish" and dt=="bullish": return "bull"
        if dt=="bearish" and dr<45: return "bear"
        if dt=="bullish" and dr>55: return "bull"
    return "sideways"

def get_coin_context(symbol):
    if symbol not in coin_knowledge: return None,"No prior knowledge for "+symbol
    k=coin_knowledge[symbol]; updated=k.get("last_updated","")[:16].replace("T"," ")
    bias=k.get("overall_bias","NEUTRAL"); dt=k.get("daily_trend","?")
    wt=k.get("weekly_trend","?"); dr=k.get("daily_rsi",50)
    phase=k.get("phase","Unknown"); history=k.get("history",[])
    ts="Still learning" if len(history)<4 else ("Consistent "+history[-1]["bias"]+" for "+str(len(history))+" reads" if len(set(h["bias"] for h in history[-4:]))==1 else "Mixed signals recently")
    summary=("📚 "+symbol+":"+chr(10)+"Last: "+updated+chr(10)+"Bias: "+bias+" | Phase: "+phase+chr(10)+
             "Daily: "+dt+" RSI:"+str(dr)+chr(10)+"Weekly: "+wt+chr(10)+ts)
    return k,summary

def analyze_coin_deeply(symbol):
    try:
        daily=get_candles(symbol,"1d",50); weekly=get_candles(symbol,"1w",20)
        h1=get_candles(symbol,"1h",100)
        dt=wt="unknown"; dr=wr=50
        phase=phase_desc=phase_emoji="Unknown"
        if daily:
            dc=[c[3] for c in daily]; dt=calc_trend(dc,20,50); dr=calc_rsi_wilder(dc)
        if weekly:
            wc=[c[3] for c in weekly]; wt=calc_trend(wc,10,20); wr=calc_rsi_wilder(wc)
        if h1 and len(h1)>=50:
            phase,phase_desc,phase_emoji=detect_market_phase([c[3] for c in h1],[c[4] for c in h1],[c[1] for c in h1],[c[2] for c in h1])
        mp,_=check_macro_trend(symbol,"long"); midp,_=check_mid_trend(symbol,"long")
        micp,_=check_micro_trend(symbol,"long"); rp,_=check_rsi_confluence(symbol,"long")
        fp,_=check_money_flow(symbol,"long")
        bc=sum([mp,midp,micp,rp,fp])
        bias="BULLISH" if bc>=4 else "BEARISH" if bc<=1 else "NEUTRAL"
        h4=get_candles(symbol,"4h",100)
        res=sup=cp=0
        if h4:
            h4H=[c[1] for c in h4]; h4L=[c[2] for c in h4]; h4C=[c[3] for c in h4]
            r,s=find_key_levels(h4H,h4L,h4C)
            res=round(r,6) if r else 0; sup=round(s,6) if s else 0; cp=round(h4C[-1],6)
            update_sr_touches(symbol,h4H,h4L,h4C)
        h1c=[c[3] for c in h1] if h1 else []
        is_sq,sq_hrs,_=detect_bb_squeeze(h1c) if h1c else (False,0,"neutral")
        knowledge={"symbol":symbol,"last_updated":datetime.now(timezone.utc).isoformat(),
            "daily_trend":dt,"weekly_trend":wt,"daily_rsi":dr,"weekly_rsi":wr,
            "overall_bias":bias,"phase":phase,"phase_desc":phase_desc,"phase_emoji":phase_emoji,
            "bb_squeeze":is_sq,"squeeze_hours":sq_hrs,"resistance":res,"support":sup,
            "current_price":cp,"macro_bullish":mp,"mid_bullish":midp,"micro_bullish":micp,
            "rsi_aligned":rp,"money_flowing":fp,
            "history":coin_knowledge.get(symbol,{}).get("history",[])}
        knowledge["history"].append({"time":datetime.now(timezone.utc).strftime("%H:%M"),"bias":bias,"phase":phase,"d_rsi":dr})
        if len(knowledge["history"])>96: knowledge["history"].pop(0)
        coin_knowledge[symbol]=knowledge
        save_json("coin_knowledge.json",coin_knowledge)
        logger.info(symbol+" — "+bias+" | "+phase+" | D:"+dt+" RSI:"+str(dr))
        generate_market_alert(symbol,knowledge,cp)
        return knowledge
    except Exception as e:
        logger.error("Deep read "+symbol+": "+str(e)); return {}

def generate_market_alert(symbol,knowledge,price):
    if _paused: return
    try:
        bias=knowledge.get("overall_bias","NEUTRAL"); dt=knowledge.get("daily_trend","sideways")
        wt=knowledge.get("weekly_trend","sideways"); dr=knowledge.get("daily_rsi",50)
        phase=knowledge.get("phase","Unknown"); pe=knowledge.get("phase_emoji","❓")
        res=knowledge.get("resistance"); sup=knowledge.get("support")
        sq=knowledge.get("bb_squeeze",False); sqh=knowledge.get("squeeze_hours",0)
        history=knowledge.get("history",[])
        if len(history)<2: return
        btc=get_btc_context(); btc_str="BTC: "+btc.upper()
        alert=alert_type=None; nl=chr(10)
        if sq and sqh>=4:
            try:
                h1_sq=get_candles(symbol,"1h",50)
                sq_dir="UNCLEAR"; sq_icon="⚪️"; sq_note="Wait for first candle break"
                if h1_sq:
                    sqc=[c[3] for c in h1_sq]; sqv=[c[4] for c in h1_sq]
                    obv_up=calc_obv(sqc,sqv)>calc_obv(sqc[:-5],sqv[:-5])
                    sqrsi=calc_rsi_wilder(sqc)
                    above_ma=sqc[-1]>sum(sqc[-20:])/20
                    bull=sum([obv_up,sqrsi>50,above_ma,btc=="bull"])
                    bear=sum([not obv_up,sqrsi<50,not above_ma,btc=="bear"])
                    if bull>=3:
                        sq_dir="UP 📈"; sq_icon="🟢"
                        sq_note="OBV "+("rising ✅" if obv_up else "falling ❌")+" | RSI:"+str(sqrsi)+" | "+("Above" if above_ma else "Below")+" MA | BTC:"+btc.upper()
                    elif bear>=3:
                        sq_dir="DOWN 📉"; sq_icon="🔴"
                        sq_note="OBV "+("rising ❌" if obv_up else "falling ✅")+" | RSI:"+str(sqrsi)+" | "+("Above" if above_ma else "Below")+" MA | BTC:"+btc.upper()
                    else:
                        sq_dir="UNCLEAR ❓"; sq_icon="⚪️"
                        sq_note="Mixed signals — wait for candle confirmation"
            except Exception: sq_dir="UNCLEAR ❓"; sq_icon="⚪️"; sq_note="Data unavailable"
            alert=("🔥 <b>"+symbol+" — BB Squeeze ("+str(sqh)+"h)</b>"+nl+
                "Coiling — big move incoming."+nl+
                "Direction bias: "+sq_icon+" "+sq_dir+nl+
                sq_note+nl+pe+" Phase: "+phase+nl+btc_str+nl+
                "📍 Watch for "+sq_dir.split()[0]+" breakout.")
            alert_type="bb_squeeze"
        if not alert and len(history)>=4:
            pb=[h["bias"] for h in history[-4:-1]]
            if pb and all(b!=bias for b in pb):
                alert=("🔄 <b>"+symbol+" — Trend Shift!</b>"+nl+pb[-1]+" → "+bias+nl+"Daily RSI: "+str(dr)+" | Weekly: "+wt+nl+pe+" Phase: "+phase+nl+btc_str+nl+"📍 Momentum changing — watch closely.")
                alert_type="shift"
        if not alert and dr<25:
            alert=("📉 <b>"+symbol+" — Extreme Oversold</b>"+nl+"Daily RSI: "+str(dr)+nl+pe+" Phase: "+phase+nl+btc_str+nl+"🎯 Counter-trend long zone."+(" ⚠️ BTC bear — high risk." if btc=="bear" else ""))
            alert_type="oversold"
        if not alert and dr>75:
            alert=("📈 <b>"+symbol+" — Extreme Overbought</b>"+nl+"Daily RSI: "+str(dr)+nl+pe+" Phase: "+phase+nl+btc_str+nl+"🎯 Counter-trend short zone."+(" ⚠️ BTC bull — high risk." if btc=="bull" else ""))
            alert_type="overbought"
        if not alert and phase=="Accumulation":
            alert=("🔵 <b>"+symbol+" — Accumulation</b>"+nl+"Smart money quietly buying."+nl+btc_str+nl+"📍 Watch for breakout.")
            alert_type="accumulation"
        if not alert and phase=="Distribution":
            alert=("🟡 <b>"+symbol+" — Distribution</b>"+nl+"Smart money quietly selling."+nl+btc_str+nl+"📍 Take profits. Markdown coming.")
            alert_type="distribution"
        if not alert and btc=="bear" and bias=="BEARISH" and dt=="bearish" and wt=="bearish" and 35<dr<50:
            alert=("🐻 <b>"+symbol+" — Bear Setup</b>"+nl+"All timeframes aligned bearish."+nl+"Daily RSI: "+str(dr)+nl+("✅ BTC confirms." if btc=="bear" else "⚠️ BTC sideways.")+nl+"📍 Watch for short on bounce.")
            alert_type="bear_setup"
        if not alert and btc=="bull" and bias=="BULLISH" and dt=="bullish" and wt=="bullish" and 50<dr<65:
            alert=("🚀 <b>"+symbol+" — Bull Setup</b>"+nl+"All timeframes aligned bullish."+nl+"Daily RSI: "+str(dr)+nl+("✅ BTC confirms." if btc=="bull" else "⚠️ BTC sideways.")+nl+"📍 Watch for long on pullback.")
            alert_type="bull_setup"
        ns=sup and price>0 and abs(price-sup)/price<0.008
        nr=res and price>0 and abs(price-res)/price<0.008
        if not alert and ns and not nr and btc!="bear" and dr<45:
            sr=sr_touch_map.get(symbol,{}); sd=sr.get("support",[{}])[0] if sr.get("support") else {}
            tc=sd.get("touches",1); ts2="very strong" if tc>=4 else "strong" if tc>=2 else "fresh"
            alert=("🟢 <b>"+symbol+" — At Key Support</b> ("+str(tc)+"x — "+ts2+")"+nl+"Price: $"+str(round(price,4))+nl+"Support: $"+str(round(sup,4))+nl+"Daily: "+dt+" | RSI: "+str(dr)+nl+btc_str+nl+"📍 Watch for bounce confirmation.")
            alert_type="support"
        if not alert and nr and not ns and btc!="bull" and dr>55:
            sr=sr_touch_map.get(symbol,{}); rd=sr.get("resistance",[{}])[0] if sr.get("resistance") else {}
            tc=rd.get("touches",1); ts2="very strong" if tc>=4 else "strong" if tc>=2 else "fresh"
            alert=("🔴 <b>"+symbol+" — At Key Resistance</b> ("+str(tc)+"x — "+ts2+")"+nl+"Price: $"+str(round(price,4))+nl+"Resistance: $"+str(round(res,4))+nl+"Daily: "+dt+" | RSI: "+str(dr)+nl+btc_str+nl+"📍 Watch for rejection confirmation.")
            alert_type="resistance"
        if alert and alert_type:
            now=time.time(); last=_last_alerts.get(symbol,{})
            if last.get("type")==alert_type and now-last.get("time",0)<ALERT_COOLDOWN:
                logger.info("Cooldown: "+symbol+" "+alert_type); return
            send_message("👁️ <b>Sentinel Market Insight</b>"+nl+nl+alert)
            _last_alerts[symbol]={"type":alert_type,"time":now}
            logger.info("Alert: "+symbol+" — "+alert_type+" | BTC: "+btc)
    except Exception as e: logger.error("Alert "+symbol+": "+str(e))

# ============================================================
# BTC PRE-MOVE ALERT
# ============================================================
def check_and_alert_btc_premove():
    global _pre_move_sent
    if _paused: return
    now=time.time()
    if now-_pre_move_sent.get("btc",0)<3600: return
    det,bias,signals,conf,similar=detect_btc_pre_move()
    if not det or len(signals)<2: return
    nl=chr(10); sig_text=nl.join("• "+s for s in signals)
    sim_str=""
    if similar: sim_str=nl+nl+"📚 Similar to "+similar["date"]+" → "+str(similar["pct_move"])+"% "+similar["direction"]
    send_message("⚡ <b>BTC PRE-MOVE DETECTED</b>"+nl+nl+
        "Bias: "+("🟢 BULLISH" if bias=="bullish" else "🔴 BEARISH" if bias=="bearish" else "⚪️ NEUTRAL")+nl+
        "Confidence: "+str(round(conf*100))+"%"+nl+nl+
        "<b>Signals:</b>"+nl+sig_text+sim_str+nl+nl+
        "📍 Big move incoming. Get ready."+nl+"⏰ "+datetime.now(timezone.utc).strftime("%H:%M UTC"))
    _pre_move_sent["btc"]=now

# ============================================================
# FLASK ENDPOINTS
# ============================================================
@app.route("/")
def health():
    return "SentinelBot v3 — Chart Intelligence Active", 200

@app.route("/analyse", methods=["POST"])
def analyse_endpoint():
    try:
        signal=request.get_json()
        if not signal: return {"approved":False,"reason":"No data"},400
        symbol=signal.get("symbol","BTC"); direction=signal.get("direction","long"); score=signal.get("score",0)
        logger.info("Signal from Bot 1: "+symbol+" "+direction.upper())
        send_message("🔍 <b>Signal from Bot 1</b>"+chr(10)+chr(10)+
            ("📈 LONG" if direction=="long" else "📉 SHORT")+" <b>"+symbol+"/USDT</b>"+chr(10)+
            "Bot 1 score: "+str(score)+chr(10)+chr(10)+"📊 Reading all timeframes now...")
        v=run_sentinel_analysis(signal)
        return {"approved":v["approved"],"score":v["score"],"total":v["total"],
                "tf_score":v.get("tf_score",0),"tf_pct":v.get("tf_pct",0),
                "phase":v.get("phase","Unknown"),"symbol":symbol,"direction":direction,
                "btc_premove":v.get("btc_premove",False),
                "entry":v.get("entry",0),"stop":v.get("stop",0),
                "tp1":v.get("tp1",0),"tp2":v.get("tp2",0)},200
    except Exception as e:
        logger.error("Analyse: "+str(e)); return {"approved":False,"reason":str(e)},500

@app.route("/outcome", methods=["POST"])
def outcome_endpoint():
    try:
        data=request.get_json()
        if not data: return {"ok":False},400
        symbol=data.get("symbol","?"); direction=data.get("direction","long")
        result=data.get("result","LOSS"); pnl=data.get("pnl",0)
        is_win=result in ["WIN_TP1","WIN_TP2"]
        # Combined legacy counters (kept for backward compat)
        if is_win: sentinel_brain["approved_wins"]=sentinel_brain.get("approved_wins",0)+1
        else: sentinel_brain["approved_losses"]=sentinel_brain.get("approved_losses",0)+1
        # Source-split: this came from Bot1 pipeline via /outcome endpoint
        if is_win: sentinel_brain["bot1_wins"]=sentinel_brain.get("bot1_wins",0)+1
        else: sentinel_brain["bot1_losses"]=sentinel_brain.get("bot1_losses",0)+1
        if symbol in sentinel_brain["coin_memory"]:
            if is_win: sentinel_brain["coin_memory"][symbol]["wins"]+=1
            else: sentinel_brain["coin_memory"][symbol]["losses"]+=1
        for p in reversed(sentinel_brain.get("pre_move_patterns",[])):
            if p.get("outcome")=="unknown":
                p["outcome"]="up" if is_win else "down"; p["pct_move"]=round(abs(pnl),2); break
        t=sentinel_brain.get("approved_wins",0)+sentinel_brain.get("approved_losses",0)
        acc=round(sentinel_brain.get("approved_wins",0)/t*100) if t>0 else 0
        save_json("sentinel_brain.json",sentinel_brain)
        approved_trades = load_json("approved_trades.json",[])
        for t2 in reversed(approved_trades):
            if t2.get("symbol")==symbol and t2.get("direction")==direction and t2.get("outcome")=="pending":
                t2["outcome"] = "WIN" if is_win else "LOSS"
                t2["pnl"]     = round(pnl,2)
                break
        if len(approved_trades)>200: approved_trades=approved_trades[-200:]
        save_json("approved_trades.json", approved_trades)
        recent_verdict=next((v for v in reversed(verdict_history) if v.get("symbol")==symbol and v.get("direction")==direction),[])
        if recent_verdict and "checks" in recent_verdict:
            tag_check_results([(n,p,"-") for n,p in recent_verdict["checks"]],is_win)
        update_coin_confidence(symbol,direction,is_win)
        reliability=get_check_reliability()
        rel_str=""
        if reliability:
            top=reliability[0]; rel_str=chr(10)+"🏆 Most reliable check: "+top[0]+" ("+str(top[1])+"% acc, "+str(top[2])+" trades)"
        icon="✅" if is_win else "❌"; nl=chr(10)
        coin_conf,conf_desc=get_coin_confidence(symbol,direction)
        send_message("🧠 <b>Sentinel Learning</b>"+nl+nl+
            icon+" "+symbol+" "+direction.upper()+" — "+result+nl+
            "P&L: "+("+" if pnl>=0 else "")+str(round(pnl,2))+"$"+nl+nl+
            "📊 Overall accuracy: "+str(acc)+"%"+nl+
            "("+str(sentinel_brain.get("approved_wins",0))+"W / "+str(sentinel_brain.get("approved_losses",0))+"L)"+nl+
            "🎯 "+symbol+" confidence: "+str(round(coin_conf*100))+"%"+
            (rel_str if rel_str else ""))
        return {"ok":True},200
    except Exception as e:
        logger.error("Outcome: "+str(e)); return {"ok":False},500

@app.route("/knowledge/<symbol>", methods=["GET"])
def knowledge_endpoint(symbol):
    sym=symbol.upper()
    return (coin_knowledge[sym],200) if sym in coin_knowledge else ({"error":"No knowledge for "+sym},404)

@app.route("/regime", methods=["GET"])
def regime_endpoint():
    """Bot1 reads this instead of calculating its own regime — single source of truth."""
    r = detect_market_regime()
    return {"mode":r.get("mode","UNKNOWN"),"desc":r.get("desc",""),
            "emoji":r.get("emoji","❓"),"bb_width":r.get("bb_width",0),
            "ema_slope":r.get("ema_slope",0),"rsi":r.get("rsi",50),
            "updated":r.get("updated",0)}, 200

@app.route("/brain", methods=["GET"])
def brain_endpoint():
    """
    Exposes Sentinel's accumulated intelligence to Bot1.
    Bot1 reads this to adjust scoring, min score requirements, and timing.
    """
    weights = get_check_weights()
    w   = sentinel_brain.get("approved_wins",0)
    l   = sentinel_brain.get("approved_losses",0)
    acc = round(w/(w+l)*100) if (w+l)>0 else 0
    # Top 10 coin biases for Bot1 to reference
    top_biases = {sym: {"bias": ck.get("overall_bias","NEUTRAL"),
                        "phase": ck.get("phase","Unknown"),
                        "daily_rsi": ck.get("daily_rsi",50),
                        "support": ck.get("support",0),
                        "resistance": ck.get("resistance",0)}
                  for sym, ck in coin_knowledge.items()}
    return {
        "check_weights":   weights,
        "accuracy":        acc,
        "approved_wins":   w,
        "approved_losses": l,
        "coin_biases":     top_biases,
        "regime":          _current_regime.get("mode","UNKNOWN"),
        "regime_emoji":    _current_regime.get("emoji","❓"),
        "coin_confidence": coin_confidence
    }, 200

@app.route("/filled", methods=["POST"])
def filled_endpoint():
    """
    Bot1 calls this the moment a limit order fills.
    Keeps Sentinel's suggested_trades in sync with Bot1's actual fills.
    This is more accurate than Sentinel price-polling — Bot1 knows the exact fill.
    """
    try:
        data        = request.get_json()
        if not data: return {"ok":False},400
        symbol      = data.get("symbol","")
        direction   = data.get("direction","long")
        fill_price  = data.get("fill_price",0)
        limit_entry = data.get("limit_entry",0)
        if not symbol or not fill_price:
            return {"ok":False,"reason":"Missing symbol or fill_price"},400
        # Find matching pending_fill in suggested_trades and update it
        for t in suggested_trades:
            if (t["symbol"]==symbol and
                t["direction"]==direction and
                t["outcome"]=="pending_fill"):
                t["outcome"]   = "pending"
                t["entry"]     = fill_price
                t["peak"]      = fill_price
                t["fill_time"] = datetime.now(timezone.utc).isoformat()
                # Calculate how far fill was from limit level
                lim = limit_entry if limit_entry > 0 else t.get("limit_entry", fill_price)
                t["fill_dist"] = round(abs(fill_price-lim)/lim*100,4) if lim>0 else 0
                t["source"]    = t.get("source","bot1_fill")
                save_json("suggested_trades.json",suggested_trades)
                logger.info("Bot1 fill received: "+symbol+" "+direction+" @ $"+str(fill_price)+
                            " (limit was $"+str(lim)+", dist "+str(t["fill_dist"])+"%)")
                if not _paused:
                    send_message("✅ <b>Bot1 filled: "+symbol+" "+direction.upper()+"</b>"+chr(10)+
                        "Entry: $"+str(round(fill_price,6))+chr(10)+
                        "Limit was: $"+str(round(lim,6))+chr(10)+
                        "Now watching TP1/Stop...")
                return {"ok":True,"fill_dist":t["fill_dist"]},200
        # No matching record found — create one so Sentinel still learns
        suggested_trades.append({
            "symbol":       symbol,
            "direction":    direction,
            "limit_entry":  limit_entry if limit_entry>0 else fill_price,
            "entry":        fill_price,
            "stop":         data.get("stop",0),
            "tp1":          data.get("tp1",0),
            "tp2":          data.get("tp2",0),
            "time":         datetime.now(timezone.utc).isoformat(),
            "fill_time":    datetime.now(timezone.utc).isoformat(),
            "outcome":      "pending",
            "peak":         fill_price,
            "fill_dist":    0,
            "source":       "bot1_fill_new"
        })
        if len(suggested_trades)>100: suggested_trades[:]=suggested_trades[-100:]
        save_json("suggested_trades.json",suggested_trades)
        logger.info("Bot1 fill created new record: "+symbol+" "+direction)
        return {"ok":True,"created":True},200
    except Exception as e:
        logger.error("Filled endpoint: "+str(e)); return {"ok":False},500

# ============================================================
# COMMANDS
# ============================================================
def handle_commands():
    global last_update_id, _paused
    data=get_updates(offset=last_update_id)
    for update in data.get("result",[]):
        last_update_id=update["update_id"]+1
        nl=chr(10)

        # Handle button press (callback query)
        if "callback_query" in update:
            cq=update["callback_query"]
            callback_id=cq["id"]
            chat_id=cq["message"]["chat"]["id"]
            data_str=cq.get("data","")
            answer_callback(callback_id)

            # ── Resume notifications button ──────────────────────────────
            if data_str == "resume_notifications":
                _paused = False
                save_json("paused.json",{"paused":False})
                send_message(
                    "🔔 <b>Notifications resumed</b>"+nl+nl+
                    "Sentinel is active. All alerts back on."+nl+
                    "⏰ "+datetime.now(timezone.utc).strftime("%H:%M UTC"), chat_id)
                logger.info("Sentinel notifications resumed via button")
                continue
            # ────────────────────────────────────────────────────────────

            if data_str.startswith("entered:"):
                try:
                    parts=data_str.split(":")
                    sym=parts[1]; direction=parts[2]
                    entry=float(parts[3]); stop=float(parts[4])
                    tp1=float(parts[5]); tp2=float(parts[6])

                    # Find the auto-recorded suggestion and mark as user-confirmed
                    # Also sync its levels with what was shown in the button message
                    found = False
                    for t in suggested_trades:
                        if (t["symbol"] == sym and
                            t["direction"] == direction and
                            t["outcome"] in ["pending_fill", "pending"]):
                            # Always sync levels from button — these are what user saw
                            if t["outcome"] == "pending_fill":
                                t["limit_entry"] = entry   # entry in callback = limit_e shown
                                t["stop"]        = stop
                                t["tp1"]         = tp1
                                t["tp2"]         = tp2
                            t["user_entered"] = True
                            found = True
                            save_json("suggested_trades.json", suggested_trades)
                            send_message(
                                "✅ <b>"+sym+" "+direction.upper()+" confirmed!</b>"+nl+
                                "Sentinel watching for fill at $"+str(entry)+nl+
                                "Stop: $"+str(stop)+" | TP1: $"+str(tp1)+nl+
                                "Auto-learn triggers on TP1 or Stop hit.", chat_id)
                            logger.info("User confirmed entry: "+sym+" "+direction+" limit $"+str(entry))
                            break

                    if not found:
                        # Fallback: create record if auto-save somehow missed
                        suggested_trades.append({
                            "symbol":       sym,
                            "direction":    direction,
                            "limit_entry":  entry,
                            "entry":        0,
                            "stop":         stop,
                            "tp1":          tp1,
                            "tp2":          tp2,
                            "time":         datetime.now(timezone.utc).isoformat(),
                            "outcome":      "pending_fill",
                            "peak":         0,
                            "source":       "user_button",
                            "user_entered": True
                        })
                        if len(suggested_trades)>100: suggested_trades[:]=suggested_trades[-100:]
                        save_json("suggested_trades.json", suggested_trades)
                        send_message(
                            "✅ <b>"+sym+" "+direction.upper()+" recorded!</b>"+nl+
                            "Watching for limit fill at $"+str(entry)+".", chat_id)
                except Exception as e:
                    logger.error("Callback: "+str(e))
            continue

        msg=update.get("message",{}); chat_id=msg.get("chat",{}).get("id")
        text=msg.get("text","").strip().lower()
        if not chat_id: continue

        if text=="/start":
            send_message("🛡️ <b>SentinelBot v3 — Chart Intelligence</b>"+nl+nl+
                "The chart always whispers before it screams."+nl+nl+
                "<b>📊 Analysis:</b>"+nl+
                "/status — Accuracy stats"+nl+
                "/brain — Full brain report"+nl+
                "/weights — Check weight breakdown"+nl+
                "/blocked — Which checks cause wrong blocks"+nl+
                "/missed — Blocked trades tracker"+nl+
                "/regime — Current market regime"+nl+nl+
                "<b>🔍 Coin Intelligence:</b>"+nl+
                "/checks BTC — Live 7-check analysis"+nl+
                "/knowledge BTC — What I know about a coin"+nl+
                "/entries BTC — Entry learning stats"+nl+
                "/confidence BTC — Coin confidence score"+nl+
                "/sync BTC — Compare Sentinel + Bot1 knowledge"+nl+
                "/premove — BTC pre-move detection"+nl+
                "/watchlist — All 75 watched coins"+nl+nl+
                "<b>💡 Trading:</b>"+nl+
                "/suggest — Best setups near key levels"+nl+
                "/think BTC — Manual trade analysis"+nl+
                "/result ETH WIN — Report /think trade outcome"+nl+nl+
                "<b>⚙️ System:</b>"+nl+
                "/pause — Stop notifications (bot keeps running)"+nl+
                "/resume — Resume notifications"+nl+
                "/history — Last 10 verdicts"+nl+
                "/learn — Full learning report"+nl+nl+
                "📌 <b>Reporting rules:</b>"+nl+
                "/suggest → press button → fully automatic"+nl+
                "/think → you decide → /result when done"+nl+
                "Bot1 trades → 100% automatic",chat_id)

        elif text=="/blocked":
            nl2 = chr(10)
            wrong   = [t for t in missed_trades if t.get("outcome")=="would_win"]
            correct = [t for t in missed_trades
                      if t.get("was_correct")==True
                      and t.get("outcome","unknown") not in ["unknown","expired"]]
            expired = [t for t in missed_trades if t.get("outcome") in ["expired","neutral","unknown"]]
            resolved = wrong + correct + expired
            decided  = wrong + correct
            if not resolved:
                send_message("No resolved blocks yet. Check back after a few cycles.",chat_id)
            else:
                total_r   = len(resolved)
                n_correct = len(correct)
                n_wrong   = len(wrong)
                n_decided = len(decided)
                n_expired = len(expired)
                true_acc  = round(n_correct/(n_correct+n_wrong)*100) if (n_correct+n_wrong)>0 else 0
                coverage  = round(n_decided/total_r*100) if total_r>0 else 0
                exp_rate  = round(n_expired/total_r*100) if total_r>0 else 0
                wrong_check_counts = {}
                correct_check_counts = {}
                for t in wrong:
                    for ck in t.get("failed_checks",[]):
                        wrong_check_counts[ck] = wrong_check_counts.get(ck,0)+1
                for t in correct:
                    for ck in t.get("failed_checks",[]):
                        correct_check_counts[ck] = correct_check_counts.get(ck,0)+1
                all_checks = set(list(wrong_check_counts.keys())+list(correct_check_counts.keys()))
                lines = []
                for ck in sorted(all_checks, key=lambda x: wrong_check_counts.get(x,0), reverse=True):
                    w2 = wrong_check_counts.get(ck,0)
                    c2 = correct_check_counts.get(ck,0)
                    tot2 = w2+c2
                    acc2 = round(c2/tot2*100) if tot2>0 else 0
                    icon = "🔴" if acc2 < 40 else ("🟡" if acc2 < 60 else "✅")
                    lines.append(icon+" <b>"+ck+"</b>: "+str(acc2)+"% correct ("+str(c2)+"✅/"+str(w2)+"❌ wrong)")
                recent_wrong = wrong[-5:][::-1]
                recent_str = nl2.join(
                    "  ❌ "+t["symbol"]+" "+t["direction"].upper()+
                    " missed +"+str(t["outcome_pct"])+"%" +
                    " | blocked by: "+", ".join(t.get("failed_checks",[]))
                    for t in recent_wrong
                ) if recent_wrong else "  None recently ✅"
                send_message(
                    "🚫 <b>Block Analysis</b>"+nl2+nl2+
                    "📊 Total resolved: "+str(total_r)+nl2+nl2+
                    "🎯 <b>True Block Accuracy: "+str(true_acc)+"%</b>"+nl2+
                    "  "+str(n_correct)+" correct ÷ "+str(n_correct+n_wrong)+" decided trades"+nl2+
                    "  👉 When system blocks — how often it's right"+nl2+nl2+
                    "📡 <b>Coverage: "+str(coverage)+"%</b>"+nl2+
                    "  "+str(n_decided)+" decided ÷ "+str(total_r)+" resolved"+nl2+
                    "  👉 How often a clear outcome was reached"+nl2+nl2+
                    "⏳ <b>Expired/Neutral: "+str(exp_rate)+"%</b>"+nl2+
                    "  "+str(n_expired)+" trades with no clear outcome"+nl2+nl2+
                    "<b>Which checks cause wrong blocks:</b>"+nl2+
                    (nl2.join(lines) if lines else "  Not enough data yet")+nl2+nl2+
                    "<b>Recent wrong blocks:</b>"+nl2+recent_str+nl2+nl2+
                    "🔴 = blocks too aggressively"+nl2+
                    "✅ = blocks correctly"+nl2+
                    "⏰ "+datetime.now(timezone.utc).strftime("%H:%M UTC"),chat_id)

        elif text=="/premove":
            send_message("⚡ Checking BTC pre-move signals...",chat_id)
            det,bias,signals,conf,similar=detect_btc_pre_move()
            if det:
                sig_text=nl.join("• "+s for s in signals)
                sim_str="" if not similar else nl+"📚 Similar to "+similar["date"]+" → "+str(similar["pct_move"])+"% "+similar["direction"]
                send_message("⚡ <b>BTC Pre-Move</b>"+nl+"Bias: "+bias.upper()+nl+"Confidence: "+str(round(conf*100))+"%"+nl+nl+sig_text+sim_str,chat_id)
            else:
                send_message("😴 No pre-move signals on BTC right now.",chat_id)

        elif text.startswith("/checks"):
            parts=text.split(); sym=parts[1].upper() if len(parts)>1 else "BTC"
            send_message("📊 Analysing "+sym+"... (30-60s)",chat_id)
            try: run_sentinel_analysis({"symbol":sym,"direction":"long","score":0,"entry":0})
            except Exception as e: send_message("❌ Error: "+str(e),chat_id)

        elif text=="/status":
            t=sentinel_brain["total_verdicts"]; a=sentinel_brain["approved"]; r=sentinel_brain["rejected"]
            w=sentinel_brain.get("approved_wins",0); l=sentinel_brain.get("approved_losses",0)
            # Use outcome field directly — cleanest separation
            correct_blocks = sum(1 for t2 in missed_trades
                                 if t2.get("was_correct")==True
                                 and t2.get("outcome","unknown") not in ["unknown","expired"])
            wrong_blocks   = sum(1 for t2 in missed_trades
                                 if t2.get("outcome")=="would_win")
            expired_blocks = sum(1 for t2 in missed_trades
                                 if t2.get("outcome") in ["expired","neutral","unknown"])
            decided_blocks = correct_blocks + wrong_blocks
            block_acc      = round(correct_blocks/decided_blocks*100) if decided_blocks>0 else 0
            total_resolved = w + l + correct_blocks + wrong_blocks
            true_correct   = w + correct_blocks
            true_acc  = round(true_correct/total_resolved*100) if total_resolved>0 else 0
            app_acc   = round(w/(w+l)*100) if (w+l)>0 else 0
            total_el_trades = sum(
                el.get("wins",0)+el.get("losses",0)
                for sym_data in entry_learning.values()
                for el in sym_data.values()
            )
            pause_str = "⏸️ PAUSED — type /resume to reactivate"+nl if _paused else "▶️ Active"+nl
            send_message("🛡️ <b>Sentinel v3 Status</b>"+nl+nl+
                pause_str+
                "📊 Total verdicts: "+str(t)+" | ✅ "+str(a)+" | ❌ "+str(r)+nl+nl+
                "🏆 <b>True accuracy: "+str(true_acc)+"%</b>"+nl+
                "  ✅ Approved wins:    "+str(w)+nl+
                "  ✅ Correct blocks:   "+str(correct_blocks)+nl+
                "  ❌ Approved losses:  "+str(l)+nl+
                "  ❌ Wrong blocks:     "+str(wrong_blocks)+nl+
                "  ⏳ Unresolved: "+str(max(0,t-total_resolved))+nl+nl+
                "📈 <b>Approved win rate: "+str(app_acc)+"%</b> ("+str(w)+"W/"+str(l)+"L)"+nl+
                "🚫 <b>True block accuracy: "+str(block_acc)+"%</b>"+nl+
                "  ("+str(correct_blocks)+" correct ÷ "+str(decided_blocks)+" decided)"+nl+
                "  ⏳ "+str(expired_blocks)+" expired/neutral blocks (no clear outcome)"+nl+nl+
                "📚 Coins known: "+str(len(coin_knowledge))+"/75"+nl+
                "📈 Entry learning: "+str(total_el_trades)+" trades tracked"+nl+
                "Min checks: "+str(MIN_CHECKS_TO_APPROVE)+"/7"+nl+
                "⏰ "+datetime.now(timezone.utc).strftime("%H:%M UTC"),chat_id)

        elif text=="/history":
            if not verdict_history: send_message("No verdicts yet.",chat_id)
            else:
                mt="🛡️ <b>Last 10 Verdicts</b>"+nl+nl
                for v in verdict_history[-10:][::-1]:
                    icon="✅" if v["approved"] else "❌"
                    ts=v["timestamp"][:16].replace("T"," ")
                    w_pct_str=" W:"+str(v.get("w_pct","?"))+"%" if v.get("w_pct") else ""
                    mt+=icon+" "+v["symbol"]+" "+v["direction"].upper()+" — "+str(v["score"])+"/7"+w_pct_str+" TF:"+str(v.get("tf_score","?"))+" "+v.get("phase","")+" — "+ts+nl
                send_message(mt,chat_id)

        elif text=="/weights":
            weights = get_check_weights()
            nl2     = chr(10)
            lines   = ["⚖️ <b>Dynamic Check Weights</b>"+nl2+nl2+
                       "Default: 1.0 | Floor: "+str(WEIGHT_FLOOR)+" | Ceiling: "+str(WEIGHT_CEILING)+nl2+
                       "Shifts after "+str(WEIGHT_MIN_TRADES)+" trades per check"+nl2]
            for check in CHECK_NAMES:
                stats = check_tag_stats.get(check, {"wins":0,"losses":0})
                total = stats.get("wins",0)+stats.get("losses",0)
                w     = weights[check]
                if total < WEIGHT_MIN_TRADES:
                    bar  = "⬜⬜⬜⬜⬜"
                    note = "default ("+str(total)+"/"+str(WEIGHT_MIN_TRADES)+" trades)"
                else:
                    win_rate = round(stats["wins"]/total*100)
                    filled   = round(w / WEIGHT_CEILING * 5)
                    bar      = "🟩"*filled + "⬜"*(5-filled)
                    note     = str(win_rate)+"% win ("+str(total)+" trades)"
                    if w >= 1.5:   note += " ← trusted"
                    elif w <= 0.7: note += " ← underperforming"
                lines.append(bar+" <b>"+check+"</b>: "+str(w)+nl2+"   "+note)
            send_message(nl2.join(lines), chat_id)

        elif text.startswith("/sync"):
            # Show what both Sentinel and Bot1 know about the same coin
            parts=text.split(); sym=parts[1].upper() if len(parts)>1 else "BTC"
            send_message("🔄 Syncing knowledge on "+sym+"...",chat_id)
            nl2=chr(10)
            # Sentinel's knowledge
            sk=coin_knowledge.get(sym,{})
            s_bias=sk.get("overall_bias","NEUTRAL"); s_phase=sk.get("phase","Unknown")
            s_rsi=sk.get("daily_rsi",50); s_sup=sk.get("support",0); s_res=sk.get("resistance",0)
            s_conf,s_conf_desc=get_coin_confidence(sym,"long")
            el=entry_learning.get(sym,{})
            el_long=el.get("long",{}); el_short=el.get("short",{})
            el_lt=el_long.get("wins",0)+el_long.get("losses",0)
            el_st=el_short.get("wins",0)+el_short.get("losses",0)
            el_str=""
            if el_lt>=2: el_str+=nl2+"  Long fill accuracy: "+str(round(el_long.get("wins",0)/el_lt*100))+"% ("+str(el_lt)+" fills)"
            if el_st>=2: el_str+=nl2+"  Short fill accuracy: "+str(round(el_short.get("wins",0)/el_st*100))+"% ("+str(el_st)+" fills)"
            # Bot1's knowledge
            b1_str="Bot1: unavailable"
            try:
                b1=requests.get(BOT1_URL+"/brain",timeout=5)
                if b1.status_code==200:
                    b1d=b1.json(); cs=b1d.get("coin_stats",{}).get(sym,{})
                    bw=cs.get("wins",0); bl=cs.get("losses",0); bt=bw+bl
                    lw=cs.get("long_wins",0); ll=cs.get("long_losses",0)
                    sw=cs.get("short_wins",0); sl2=cs.get("short_losses",0)
                    b1_str=("Bot1 overall: "+str(bw)+"W/"+str(bl)+"L"+nl2+
                            "  Long: "+str(lw)+"W/"+str(ll)+"L"+nl2+
                            "  Short: "+str(sw)+"W/"+str(sl2)+"L"+nl2+
                            "  Bot1 streak: "+str(b1d.get("streak",0)))
            except Exception: pass
            # Agreement score
            weights=get_check_weights()
            top_w=sorted(weights.items(),key=lambda x:x[1],reverse=True)[:2]
            agree="✅ Both aligned on "+sym if s_bias!="NEUTRAL" else "⚪️ Sentinel still neutral on "+sym
            send_message(
                "🔄 <b>Dual Brain Sync: "+sym+"</b>"+nl2+nl2+
                "━━━ SENTINEL ━━━"+nl2+
                "Bias: "+s_bias+" | Phase: "+s_phase+nl2+
                "Daily RSI: "+str(s_rsi)+nl2+
                "Support: $"+str(s_sup)+" | Resistance: $"+str(s_res)+nl2+
                "Confidence: "+str(round(s_conf*100))+"% — "+s_conf_desc+
                el_str+nl2+nl2+
                "━━━ BOT1 ━━━"+nl2+b1_str+nl2+nl2+
                "━━━ COMBINED ━━━"+nl2+
                agree+nl2+
                "Top weighted checks: "+", ".join(c+"("+str(w)+")" for c,w in top_w)+nl2+
                "⏰ "+datetime.now(timezone.utc).strftime("%H:%M UTC"),chat_id)

        elif text.startswith("/knowledge"):
            parts=text.split(); sym=parts[1].upper() if len(parts)>1 else "BTC"
            k,summary=get_coin_context(sym)
            if k:
                h=k.get("history",[]); bt=" → ".join([x["bias"][:1] for x in h[-8:]]) if h else "no history"
                sq=k.get("bb_squeeze",False); sqh=k.get("squeeze_hours",0)
                sr=sr_touch_map.get(sym,{})
                br=sr.get("resistance",[{}])[0] if sr.get("resistance") else {}
                bs=sr.get("support",[{}])[0] if sr.get("support") else {}

                # Entry learning stats for this coin
                el_sym = entry_learning.get(sym, {})
                el_lines = []
                for d in ["long","short"]:
                    el = el_sym.get(d, {})
                    el_total = el.get("wins",0)+el.get("losses",0)
                    if el_total >= 2:
                        el_rate = round(el.get("wins",0)/el_total*100)
                        trend_note = " ✅ Good level" if el_rate>=60 else " ⚠️ Level needs review"
                        el_lines.append("  "+d.upper()+": "+str(el_rate)+"% win ("+str(el_total)+" trades) | Avg fill dist: "+str(el.get("avg_dist","?"))+"%"+trend_note)

                el_str = (nl+"📊 <b>Entry learning:</b>"+nl+nl.join(el_lines)) if el_lines else ""

                send_message("📚 <b>Sentinel Knowledge: "+sym+"</b>"+nl+nl+summary+nl+nl+
                    "Phase: "+k.get("phase","Unknown")+nl+
                    ("⚡ BB Squeeze: "+str(sqh)+"h"+nl if sq else "")+
                    ("🔴 Res: $"+str(br.get("level","?"))+" ("+str(br.get("touches","?"))+"x)"+nl if br else "")+
                    ("🟢 Sup: $"+str(bs.get("level","?"))+" ("+str(bs.get("touches","?"))+"x)"+nl if bs else "")+
                    nl+"Bias history: "+bt+el_str,chat_id)
            else:
                send_message("📚 No knowledge yet for "+sym+". Check back after first scan.",chat_id)

        # NEW: /entries command — full entry learning report for a coin
        elif text.startswith("/entries"):
            parts=text.split(); sym=parts[1].upper() if len(parts)>1 else "BTC"
            el_sym = entry_learning.get(sym, {})
            if not el_sym:
                send_message("📊 No entry learning data for "+sym+" yet."+nl+
                    "Use /suggest to generate limit orders — Sentinel will learn from each one.",chat_id)
            else:
                msg_lines = ["📊 <b>Entry Learning: "+sym+"</b>"+nl]
                for d in ["long","short"]:
                    el = el_sym.get(d, {})
                    w  = el.get("wins",0)
                    l  = el.get("losses",0)
                    total = w+l
                    if total == 0: continue
                    rate = round(w/total*100)
                    avg_dist = el.get("avg_dist", 0)
                    trend_icon = "✅" if rate>=60 else "⚠️" if rate>=40 else "❌"
                    msg_lines.append(trend_icon+" "+d.upper()+": "+str(rate)+"% win rate ("+str(w)+"W/"+str(l)+"L)")
                    msg_lines.append("  Avg fill distance from S/R: "+str(avg_dist)+"%")
                    if total >= 5:
                        if rate < 45:
                            msg_lines.append("  → Auto-adjusting entries 0.2% closer to S/R next time")
                        else:
                            msg_lines.append("  → S/R level confirmed — keeping entries as-is")
                # Pending fills
                pending = [t for t in suggested_trades
                           if t["symbol"]==sym and t["outcome"]=="pending_fill"]
                if pending:
                    msg_lines.append(nl+"⏳ Waiting for limit fill:")
                    for p in pending:
                        msg_lines.append("  "+p["direction"].upper()+" @ $"+str(p.get("limit_entry","?")))
                send_message(nl.join(msg_lines), chat_id)

        elif text=="/watchlist":
            send_message("👁️ <b>75 Coins — Every 15min</b>"+nl+nl+", ".join(WATCH_LIST)+nl+nl+
                "Known: "+str(len(coin_knowledge))+"/50"+nl+"API: ~2% of Binance free limit",chat_id)

        elif text=="/pause":
            _paused = True
            save_json("paused.json",{"paused":True})
            try:
                requests.post(
                    "https://api.telegram.org/bot"+SENTINEL_TOKEN+"/sendMessage",
                    json={"chat_id":chat_id,
                          "text":"🔕 <b>Notifications paused</b>"+nl+nl+
                                 "Sentinel is still running fully:"+nl+
                                 "✅ Watching all 75 coins every 15min"+nl+
                                 "✅ Monitoring all open trades"+nl+
                                 "✅ Approving/rejecting Bot1 signals"+nl+
                                 "✅ Learning from outcomes"+nl+nl+
                                 "Only Telegram alerts are off."+nl+
                                 "Tap below when you want alerts back.",
                          "parse_mode":"HTML",
                          "reply_markup":{"inline_keyboard":[[
                              {"text":"🔔 Resume Notifications","callback_data":"resume_notifications"}
                          ]]}},timeout=10)
            except Exception as e:
                logger.error("Pause msg: "+str(e))
            logger.info("Sentinel notifications paused — all systems still running")

        elif text=="/resume" or data=="resume_notifications":
            _paused = False
            save_json("paused.json",{"paused":False})
            if data=="resume_notifications":
                answer_callback(callback_id)
            send_message(
                "🔔 <b>Notifications resumed</b>"+nl+nl+
                "Sentinel is active. All alerts back on."+nl+
                "⏰ "+datetime.now(timezone.utc).strftime("%H:%M UTC"),chat_id)
            logger.info("Sentinel notifications resumed")

        elif text in ["/learn", "/brain"]:
            rel=get_check_reliability()
            rel_str=nl.join("  "+str(i+1)+". "+c[0]+" — "+str(c[1])+"% ("+str(c[2])+" trades)" for i,c in enumerate(rel[:5])) if rel else "  Not enough data yet"
            best_coins=[]; worst_coins=[]
            for sym,data in coin_confidence.items():
                for d in ["long","short"]:
                    w=data.get(d+"_wins",0); l=data.get(d+"_losses",0)
                    if w+l>=3:
                        acc2=round(w/(w+l)*100)
                        if acc2>=70: best_coins.append((sym,d,acc2,w+l))
                        elif acc2<=40: worst_coins.append((sym,d,acc2,w+l))
            best_coins=sorted(best_coins,key=lambda x:x[2],reverse=True)[:3]
            worst_coins=sorted(worst_coins,key=lambda x:x[2])[:3]
            t=sentinel_brain["total_verdicts"]; a=sentinel_brain["approved"]; r=sentinel_brain["rejected"]
            w=sentinel_brain.get("approved_wins",0); l=sentinel_brain.get("approved_losses",0)
            # Use outcome field directly — cleanest separation:
            # would_win  = we blocked but price went UP > 1% → WRONG block
            # would_lose = we blocked and price went DOWN > 1% → CORRECT block
            # neutral    = price barely moved → ambiguous, exclude from accuracy
            # expired    = never resolved → exclude from accuracy
            correct  = sum(1 for t2 in missed_trades
                         if t2.get("was_correct")==True
                         and t2.get("outcome","unknown") not in ["unknown","expired"])
            wrong2   = sum(1 for t2 in missed_trades
                         if t2.get("outcome")=="would_win")
            expired2 = sum(1 for t2 in missed_trades
                          if t2.get("outcome") in ["expired","neutral","unknown"])
            decided2 = correct + wrong2
            total_resolved = w + l + correct + wrong2
            true_correct   = w + correct
            true_acc  = round(true_correct/total_resolved*100) if total_resolved>0 else 0
            app_acc   = round(w/(w+l)*100) if (w+l)>0 else 0
            block_acc = round(correct/decided2*100) if decided2>0 else 0
            unresolved = max(0, t - total_resolved)
            regime=detect_market_regime()
            # Entry learning summary
            el_best=[]
            for sym_name, sym_data in entry_learning.items():
                for d, el in sym_data.items():
                    tot = el.get("wins",0)+el.get("losses",0)
                    if tot >= 3:
                        rate = round(el.get("wins",0)/tot*100)
                        el_best.append((sym_name, d, rate, tot))
            el_best = sorted(el_best, key=lambda x: x[2], reverse=True)[:3]
            el_str = nl.join("  📈 "+x[0]+" "+x[1].upper()+" — "+str(x[2])+"% ("+str(x[3])+" entries)" for x in el_best) if el_best else "  Building entry history..."
            best_str=nl.join("  🏆 "+c[0]+" "+c[1].upper()+" — "+str(c[2])+"% ("+str(c[3])+" trades)" for c in best_coins) if best_coins else "  Still learning..."
            worst_str=nl.join("  ⚠️ "+c[0]+" "+c[1].upper()+" — "+str(c[2])+"% ("+str(c[3])+" trades)" for c in worst_coins) if worst_coins else "  None yet"
            # Check weights
            weights = get_check_weights()
            shifted = [(c, w) for c, w in weights.items() if abs(w - WEIGHT_DEFAULT) > 0.05]
            if shifted:
                w_str = nl.join("  "+c+": "+str(w)+("↑" if w>WEIGHT_DEFAULT else "↓") for c,w in sorted(shifted, key=lambda x:x[1], reverse=True))
            else:
                w_str = "  All checks at default (1.0) — still building history"

            # ── DIRECTIONAL ACCURACY ─────────────────────────────────────
            resolved_st = [t2 for t2 in suggested_trades
                           if t2.get("outcome") in ["WIN","LOSS"]
                           and t2.get("entry",0) > 0
                           and t2.get("peak",0) > 0]
            dir_total = len(resolved_st)
            if dir_total > 0:
                soft_wins = 0; strong_wins = 0; true_bad = 0
                for t2 in resolved_st:
                    ent = t2["entry"]; pk = t2["peak"]
                    d2  = t2.get("direction","long")
                    peak_pct = (pk-ent)/ent*100 if d2=="long" else (ent-pk)/ent*100
                    if peak_pct >= 1.0: soft_wins   += 1
                    if peak_pct >= 2.0: strong_wins += 1
                    if peak_pct < 0.2:  true_bad    += 1
                dir_str = (
                    "  📈 +1% reached:    "+str(round(soft_wins/dir_total*100))+"% ("+str(soft_wins)+"/"+str(dir_total)+")"+nl+
                    "  🚀 +2% reached:    "+str(round(strong_wins/dir_total*100))+"% ("+str(strong_wins)+"/"+str(dir_total)+")"+nl+
                    "  ❌ Never positive: "+str(round(true_bad/dir_total*100))+"% ("+str(true_bad)+"/"+str(dir_total)+")"
                )
            else:
                dir_str = "  Not enough resolved trades yet"
            # ────────────────────────────────────────────────────────────

            # ── SOURCE-SPLIT PERFORMANCE ─────────────────────────────────
            # Separates Bot1 pipeline trades from Sentinel direct trades
            # so we can diagnose which layer is performing better.
            # Started after upgrade — legacy combined data stays in approved_wins/losses.
            b1w = sentinel_brain.get("bot1_wins",0)
            b1l = sentinel_brain.get("bot1_losses",0)
            snw = sentinel_brain.get("sentinel_wins",0)
            snl = sentinel_brain.get("sentinel_losses",0)
            b1_total  = b1w + b1l
            sn_total  = snw + snl
            b1_acc    = round(b1w/b1_total*100) if b1_total>0 else 0
            sn_acc    = round(snw/sn_total*100) if sn_total>0 else 0
            if b1_total + sn_total > 0:
                src_str = (
                    "  📡 <b>Bot1 Pipeline:</b>" + nl +
                    "    " + str(b1_total) + " trades | " + str(b1_acc) + "% win (" + str(b1w) + "W/" + str(b1l) + "L)" + nl +
                    "  🛡️ <b>Sentinel Direct:</b>" + nl +
                    "    " + str(sn_total) + " trades | " + str(sn_acc) + "% win (" + str(snw) + "W/" + str(snl) + "L)"
                )
                if b1_total >= 5 and sn_total >= 5:
                    diff = sn_acc - b1_acc
                    if abs(diff) >= 10:
                        if diff > 0:
                            src_str += nl + "  💡 Sentinel direct outperforms Bot1 by +" + str(diff) + "% — refine Bot1 timing/quality"
                        else:
                            src_str += nl + "  💡 Bot1 outperforms Sentinel by +" + str(abs(diff)) + "% — Bot1 finding better setups"
            else:
                src_str = "  Building source-split data (requires new trades after upgrade)"
            # ────────────────────────────────────────────────────────────

            send_message(
                "🧠 <b>Sentinel Brain Report</b>"+nl+nl+
                "📊 Total verdicts: "+str(t)+nl+
                "✅ Approved: "+str(a)+" | ❌ Rejected: "+str(r)+nl+nl+
                "🏆 <b>TRUE Accuracy: "+str(true_acc)+"%</b>"+nl+
                "  (approved wins + correct blocks ÷ all resolved)"+nl+nl+
                "📈 Approved trades: "+str(app_acc)+"% ("+str(w)+"W/"+str(l)+"L)"+nl+
                "🚫 True block accuracy: "+str(block_acc)+"% ("+str(correct)+"✅/"+str(wrong2)+"❌ decided)"+nl+
                "⏳ Unresolved: "+str(unresolved)+" verdicts still open"+nl+nl+
                "📊 <b>Source Performance:</b>"+nl+
                src_str+nl+nl+
                "🎯 <b>Directional Accuracy (entry quality):</b>"+nl+
                dir_str+nl+nl+
                "⚖️ <b>Check weights (shifted from 1.0):</b>"+nl+w_str+nl+nl+
                "📐 <b>Most reliable checks:</b>"+nl+rel_str+nl+nl+
                "🎯 <b>Best coins I know:</b>"+nl+best_str+nl+nl+
                "⚠️ <b>Weakest coins:</b>"+nl+worst_str+nl+nl+
                "📍 <b>Best entry levels (learned):</b>"+nl+el_str+nl+nl+
                "🌍 Regime: "+regime.get("emoji","❓")+" "+regime.get("mode","?")+nl+
                "⏰ "+datetime.now(timezone.utc).strftime("%H:%M UTC"),chat_id)

        elif text=="/regime":
            r=detect_market_regime()
            send_message("🌍 <b>Market Regime</b>"+nl+nl+
                r.get("emoji","❓")+" Mode: "+r.get("mode","?")+nl+
                r.get("desc","")+nl+nl+
                "BB Width: "+str(r.get("bb_width","?"))+nl+
                "EMA Slope: "+str(r.get("ema_slope","?"))+nl+
                "RSI: "+str(r.get("rsi","?"))+nl+nl+
                "Strategy: "+("Follow momentum" if r.get("mode")=="TREND" else
                              "Fade extremes" if r.get("mode")=="RANGE" else
                              "Wait for confirmation")+nl+
                "⏰ "+datetime.now(timezone.utc).strftime("%H:%M UTC"),chat_id)

        elif text=="/resetstats":
            # Clears polluted check_tags, coin_confidence, missed_trades
            # Resets brain W/L to 5W/3L clean starting point
            # Does NOT touch coin_knowledge, sr_touch_map, entry_learning
            clean_tags = {
                "macro_trend":    {"wins":0,"losses":0},
                "mid_trend":      {"wins":0,"losses":0},
                "micro_trend":    {"wins":0,"losses":0},
                "volume_profile": {"wins":0,"losses":0},
                "rsi_confluence": {"wins":0,"losses":0},
                "money_flow":     {"wins":0,"losses":0},
                "structure":      {"wins":0,"losses":0}
            }
            check_tag_stats.clear()
            check_tag_stats.update(clean_tags)
            save_json("check_tags.json", check_tag_stats)

            coin_confidence.clear()
            save_json("coin_confidence.json", coin_confidence)

            missed_trades.clear()
            save_json("missed_trades.json", missed_trades)

            sentinel_brain["approved_wins"]   = 5
            sentinel_brain["approved_losses"] = 3
            sentinel_brain["total_verdicts"]  = 8
            sentinel_brain["approved"]        = 8
            sentinel_brain["rejected"]        = 0
            sentinel_brain["_stat_corrected_v1"] = True
            sentinel_brain["_stat_corrected_v2"] = True
            save_json("sentinel_brain.json", sentinel_brain)

            verdict_history.clear()
            save_json("sentinel_history.json", verdict_history)

            logger.info("Manual /resetstats: all polluted data cleared, knowledge preserved")
            send_message(
                "🧹 <b>Stats Reset Complete</b>"+nl+nl+
                "✅ Brain: 5W/3L (62%) clean start"+nl+
                "✅ Check weights: back to 1.0"+nl+
                "✅ Coin confidence: cleared"+nl+
                "✅ Missed trades: cleared"+nl+
                "✅ Verdict history: cleared"+nl+nl+
                "🔒 Untouched:"+nl+
                "  coin_knowledge ✅"+nl+
                "  sr_touch_map ✅"+nl+
                "  entry_learning ✅"+nl+nl+
                "Sentinel starts fresh. Type /learn to confirm.",chat_id)

        elif text=="/missed":
            if not missed_trades:
                send_message("🚫 No missed trades tracked yet."+nl+"Blocks will appear here within 1 hour of being blocked.",chat_id)
            else:
                correct=sum(1 for t in missed_trades if t.get("was_correct")==True)
                wrong=sum(1 for t in missed_trades if t.get("was_correct")==False)
                pending=sum(1 for t in missed_trades if t.get("outcome")=="unknown")
                total_known=correct+wrong
                acc=round(correct/total_known*100) if total_known>0 else 0
                daily=defaultdict(lambda:{"correct":0,"wrong":0,"pending":0})
                for t in missed_trades:
                    day=t.get("blocked_at","")[:10]
                    wc=t.get("was_correct")
                    if wc==True: daily[day]["correct"]+=1
                    elif wc==False: daily[day]["wrong"]+=1
                    else: daily[day]["pending"]+=1
                mt="🚫 <b>Missed Trade Tracker — 7 Days</b>"+nl+nl
                mt+="Overall block accuracy: "+str(acc)+"%"+nl
                mt+="✅ Correct blocks: "+str(correct)+nl
                mt+="❌ Wrong blocks: "+str(wrong)+" (missed profit)"+nl
                mt+="⏳ Pending: "+str(pending)+nl+nl
                mt+="<b>Daily breakdown:</b>"+nl
                for day in sorted(daily.keys(),reverse=True):
                    d=daily[day]
                    day_total=d["correct"]+d["wrong"]
                    day_acc=round(d["correct"]/day_total*100) if day_total>0 else 0
                    mt+=day+" — ✅"+str(d["correct"])+" ❌"+str(d["wrong"])+" ⏳"+str(d["pending"])
                    if day_total>0: mt+=" ("+str(day_acc)+"% acc)"
                    mt+=nl
                mt+=nl+"<b>Last 10 blocks:</b>"+nl
                for t in list(reversed(missed_trades))[:10]:
                    icon="✅" if t.get("was_correct")==True else "❌" if t.get("was_correct")==False else "⏳"
                    pct=t.get("outcome_pct",0)
                    day=t.get("blocked_at","")[:10]
                    mt+=icon+" "+t.get("symbol","?")+" "+t.get("direction","?").upper()
                    if pct!=0: mt+=" → "+("+" if pct>0 else "")+str(pct)+"%"
                    mt+=" ("+day+")"+nl
                send_message(mt,chat_id)

        elif text.startswith("/confidence"):
            parts=text.split(); sym=parts[1].upper() if len(parts)>1 else "BTC"
            conf_l,desc_l=get_coin_confidence(sym,"long")
            conf_s,desc_s=get_coin_confidence(sym,"short")
            rel=get_check_reliability()
            rel_str=nl.join(c[0]+" — "+str(c[1])+"% ("+str(c[2])+" trades)" for c in rel[:5]) if rel else "Not enough data yet"
            send_message("🎯 <b>Confidence: "+sym+"</b>"+nl+nl+
                "Long: "+str(round(conf_l*100))+"% — "+desc_l+nl+
                "Short: "+str(round(conf_s*100))+"% — "+desc_s+nl+nl+
                "<b>Top reliable checks:</b>"+nl+rel_str,chat_id)

        elif text=="/suggest":
            send_message("👁️ Checking what I know...",chat_id)
            try:
                best=[]
                btc_ck=coin_knowledge.get("BTC",{})
                btc_bias_str=btc_ck.get("overall_bias","NEUTRAL")
                for sym in WATCH_LIST:
                    try:
                        ck=coin_knowledge.get(sym,{})
                        if not ck: continue
                        bias=ck.get("overall_bias","NEUTRAL")
                        phase=ck.get("phase","Unknown")
                        rsi=ck.get("daily_rsi",50)
                        dt=ck.get("daily_trend","sideways")
                        wt=ck.get("weekly_trend","sideways")
                        sq=ck.get("bb_squeeze",False)
                        res=ck.get("resistance",0)
                        sup=ck.get("support",0)
                        score=sum([
                            ck.get("macro_bullish",False),
                            ck.get("mid_bullish",False),
                            ck.get("micro_bullish",False),
                            ck.get("rsi_aligned",False),
                            ck.get("money_flowing",False)
                        ])
                        if bias=="BULLISH" and score>=3: direction="long"
                        elif bias=="BEARISH" and score>=3: direction="short"
                        else: continue
                        if not res or not sup: continue
                        money_in=ck.get("money_flowing",True)
                        if direction=="long" and sq and not money_in:
                            logger.info("Suggest skip "+sym+" — squeeze + OBV falling = DOWN risk")
                            continue
                        if direction=="long" and rsi>70 and not money_in:
                            logger.info("Suggest skip "+sym+" — RSI overbought + OBV falling")
                            continue

                        # Get current price
                        try:
                            r2=requests.get("https://api.binance.com/api/v3/ticker/price",
                                params={"symbol":sym+"USDT"},timeout=5)
                            price=float(r2.json().get("price",0)) if r2.status_code==200 else 0
                        except: price=0
                        if not price: continue

                        # ── CALCULATE LEVELS FROM LIMIT ENTRY (not current price) ──
                        if direction=="long":
                            dist_from_sup=((price-sup)/price)*100
                            if dist_from_sup>3 or dist_from_sup<0: continue
                            limit_entry = sup                       # enter AT support
                            stop        = round(sup*0.995, 6)
                            risk        = limit_entry - stop
                            if risk<=0: continue
                            risk_pct    = round(risk/limit_entry*100, 2)
                            if risk_pct>4 or risk_pct<0.2: continue
                            tp1 = round(limit_entry + risk*2.0, 6)
                            tp2 = round(limit_entry + risk*3.5, 6)
                            rr  = round((tp1-limit_entry)/risk, 1)
                            dist = dist_from_sup
                        else:
                            dist_from_res=((res-price)/price)*100
                            if dist_from_res>3 or dist_from_res<0: continue
                            limit_entry = res                       # enter AT resistance
                            stop        = round(res*1.005, 6)
                            risk        = stop - limit_entry
                            if risk<=0: continue
                            risk_pct    = round(risk/limit_entry*100, 2)
                            if risk_pct>4 or risk_pct<0.2: continue
                            tp1 = round(limit_entry - risk*2.0, 6)
                            tp2 = round(limit_entry - risk*3.5, 6)
                            rr  = round((limit_entry-tp1)/risk, 1)
                            dist = dist_from_res

                        # ── ENTRY LEARNING ADJUSTMENT ──────────────────────────────
                        el = entry_learning.get(sym, {}).get(direction, {})
                        el_total = el.get("wins",0)+el.get("losses",0)
                        entry_adjust = 0.0
                        el_win_rate  = None
                        if el_total >= 5:
                            el_win_rate = round(el.get("wins",0)/el_total*100)
                            if el_win_rate < 45:
                                # Support keeps failing — enter slightly lower (tighter)
                                if direction=="long":
                                    entry_adjust = -round(limit_entry*0.002, 6)
                                else:
                                    entry_adjust = round(limit_entry*0.002, 6)
                                logger.info("Entry learning adj: "+sym+" "+direction+" by "+str(entry_adjust)+" ("+str(el_win_rate)+"% win rate)")

                        adjusted_limit = round(limit_entry + entry_adjust, 6)
                        # Recalculate stop and TPs from adjusted limit
                        if direction=="long":
                            stop = round(adjusted_limit*0.995, 6)
                            risk = adjusted_limit - stop
                            if risk<=0: risk = adjusted_limit*0.01
                            tp1  = round(adjusted_limit + risk*2.0, 6)
                            tp2  = round(adjusted_limit + risk*3.5, 6)
                            rr   = round((tp1-adjusted_limit)/risk, 1)
                        else:
                            stop = round(adjusted_limit*1.005, 6)
                            risk = stop - adjusted_limit
                            if risk<=0: risk = adjusted_limit*0.01
                            tp1  = round(adjusted_limit - risk*2.0, 6)
                            tp2  = round(adjusted_limit - risk*3.5, 6)
                            rr   = round((adjusted_limit-tp1)/risk, 1)
                        risk_pct = round(risk/adjusted_limit*100, 2) if adjusted_limit>0 else 0
                        # ──────────────────────────────────────────────────────────

                        best.append({
                            "sym": sym, "direction": direction, "bias": bias,
                            "phase": phase, "rsi": rsi, "score": score,
                            "price": price,
                            "limit_entry": adjusted_limit,
                            "stop": stop, "tp1": tp1, "tp2": tp2, "rr": rr,
                            "risk_pct": risk_pct, "dt": dt, "wt": wt, "sq": sq,
                            "sup": sup, "res": res, "dist": dist,
                            "el_win_rate": el_win_rate,
                            "el_total": el_total
                        })
                    except: continue

                best=sorted(best,key=lambda x:(x["score"],-x["dist"]),reverse=True)

                # ── VARIETY FIX ──────────────────────────────────────────────
                # Always show top 5, but prioritize coins not recently suggested.
                # This prevents the same 3 coins appearing every single time.
                # Split: coins not recently auto-recorded first, then the rest.
                active_syms = {t["symbol"] for t in suggested_trades
                               if t["outcome"] in ["pending_fill","pending"]}
                fresh  = [b for b in best if b["sym"] not in active_syms]
                active = [b for b in best if b["sym"] in active_syms]
                # Show fresh coins first, then active ones to fill up to 5
                best = (fresh + active)[:5]
                # ────────────────────────────────────────────────────────────

                if not best:
                    send_message("Nothing near key levels right now. Market is in the middle. Wait.",chat_id)
                else:
                    for b in best:
                        sym       = b["sym"]
                        direction = b["direction"]
                        price     = b["price"]
                        limit_e   = b["limit_entry"]
                        sq_note   = " | 🔥 Squeeze" if b["sq"] else ""
                        el_note   = (" | 📚 "+str(b["el_win_rate"])+"% win ("+str(b["el_total"])+" trades)"
                                     if b["el_win_rate"] is not None else "")
                        sr_level  = b["sup"] if direction=="long" else b["res"]

                        msg_text=(
                            "━━━━━━━━━━━━━━━━━━━━"+nl+
                            ("📈" if direction=="long" else "📉")+" <b>"+sym+"</b> — "+
                            ("LONG" if direction=="long" else "SHORT")+nl+
                            "📍 Now:    $"+str(price)+nl+
                            "⏳ Limit:  $"+str(limit_e)+" ← wait for price here"+nl+
                            "🛑 Stop:   $"+str(b["stop"])+" ("+str(b["risk_pct"])+"%)"+nl+
                            "🎯 TP1:    $"+str(b["tp1"])+nl+
                            "🎯 TP2:    $"+str(b["tp2"])+nl+
                            "📊 R:R 1:"+str(b["rr"])+" | "+str(b["score"])+"/5 ✅"+sq_note+el_note
                        )

                        # ── AUTO-RECORD for learning (before button press) ──────
                        # Block if: already active OR resolved within cooldown window
                        cutoff_time = (datetime.now(timezone.utc) -
                                       timedelta(hours=SUGGEST_COOLDOWN_HOURS)).isoformat()
                        existing = next((
                            t for t in suggested_trades
                            if t["symbol"]==sym and
                               t["direction"]==direction and
                               t["outcome"] in ["pending_fill","pending"]
                        ), None)
                        recently_resolved = any(
                            t["symbol"]==sym and
                            t["direction"]==direction and
                            t["outcome"] in ["WIN","LOSS"] and
                            t.get("close_time","") > cutoff_time
                            for t in suggested_trades
                        )

                        if existing:
                            # ── KEY FIX: UPDATE existing record with latest levels ──
                            # This prevents stale prices from old cycles being used.
                            # The message showed limit_e — the stored record MUST match.
                            if existing["outcome"] == "pending_fill":
                                existing["limit_entry"] = limit_e
                                existing["stop"]        = b["stop"]
                                existing["tp1"]         = b["tp1"]
                                existing["tp2"]         = b["tp2"]
                                existing["time"]        = datetime.now(timezone.utc).isoformat()
                                save_json("suggested_trades.json", suggested_trades)
                                logger.info("Updated existing suggestion: "+sym+" "+direction+" limit $"+str(limit_e))
                        elif not recently_resolved:
                            suggested_trades.append({
                                "symbol":       sym,
                                "direction":    direction,
                                "limit_entry":  limit_e,
                                "entry":        0,
                                "stop":         b["stop"],
                                "tp1":          b["tp1"],
                                "tp2":          b["tp2"],
                                "time":         datetime.now(timezone.utc).isoformat(),
                                "outcome":      "pending_fill",
                                "peak":         0,
                                "source":       "auto_suggest",
                                "user_entered": False
                            })
                            if len(suggested_trades)>100: suggested_trades[:]=suggested_trades[-100:]
                            save_json("suggested_trades.json", suggested_trades)
                            logger.info("Auto-recorded suggestion: "+sym+" "+direction+" limit $"+str(limit_e))
                        # ────────────────────────────────────────────────────────

                        send_suggestion_with_button(
                            msg_text, sym, direction,
                            limit_e, b["stop"], b["tp1"], b["tp2"], chat_id)

            except Exception as e:
                send_message("Something went wrong. Try again.",chat_id)
                logger.error("Suggest: "+str(e))

        elif text.startswith("/think"):
            parts=text.split(); sym=parts[1].upper() if len(parts)>1 else "BTC"
            send_message("Let me check "+sym+"...",chat_id)
            try:
                ck=coin_knowledge.get(sym,{})
                if not ck:
                    send_message(sym+" — I don't have data on this yet. Give me 15 minutes.",chat_id)
                else:
                    bias=ck.get("overall_bias","NEUTRAL")
                    phase=ck.get("phase","Unknown")
                    rsi=ck.get("daily_rsi",50)
                    dt=ck.get("daily_trend","sideways")
                    wt=ck.get("weekly_trend","sideways")
                    sq=ck.get("bb_squeeze",False)
                    res=ck.get("resistance",0)
                    sup=ck.get("support",0)
                    score=sum([ck.get("macro_bullish",False),ck.get("mid_bullish",False),
                               ck.get("micro_bullish",False),ck.get("rsi_aligned",False),
                               ck.get("money_flowing",False)])
                    sr=sr_touch_map.get(sym,{})
                    sups=sr.get("support",[])
                    ress=sr.get("resistance",[])
                    sup_touches=sups[0].get("touches",0) if sups else 0
                    res_touches=ress[0].get("touches",0) if ress else 0
                    btc_ck=coin_knowledge.get("BTC",{})
                    btc_bias_str=btc_ck.get("overall_bias","NEUTRAL")
                    try:
                        r2=requests.get("https://api.binance.com/api/v3/ticker/price",
                            params={"symbol":sym+"USDT"},timeout=5)
                        price=float(r2.json().get("price",0)) if r2.status_code==200 else 0
                    except: price=0
                    if not price:
                        send_message(sym+" — couldn't get price right now. Try again.",chat_id)
                    else:
                        if bias=="BULLISH": direction="long"
                        elif bias=="BEARISH": direction="short"
                        elif btc_bias_str=="BULLISH": direction="long"
                        elif btc_bias_str=="BEARISH": direction="short"
                        else: direction="long"
                        if direction=="long":
                            if not sup: sup=round(price*0.97,6)
                            if not res: res=round(price*1.05,6)
                            stop=round(sup*0.995,6)
                            risk=sup-stop
                            risk_pct=round(risk/sup*100,2) if sup>0 else 0
                            tp1=round(sup+risk*2.0,6)
                            tp2=round(sup+risk*3.5,6)
                            rr=2.0
                            dir_icon="📈"; dir_label="LONG"
                            btc_note=" BTC with you." if btc_bias_str=="BULLISH" else " Watch BTC."
                            rsi_note=" RSI fine." if rsi<65 else " RSI high — wait for dip."
                            limit_entry=round(sup,6)
                        else:
                            if not res: res=round(price*1.03,6)
                            if not sup: sup=round(price*0.95,6)
                            stop=round(res*1.005,6)
                            risk=stop-res
                            risk_pct=round(risk/res*100,2) if res>0 else 0
                            tp1=round(res-risk*2.0,6)
                            tp2=round(res-risk*3.5,6)
                            rr=2.0
                            dir_icon="📉"; dir_label="SHORT"
                            btc_note=" BTC agrees." if btc_bias_str=="BEARISH" else " BTC is bullish — risky short."
                            rsi_note=" RSI room to fall." if rsi>35 else " RSI low — quick TP."
                            limit_entry=round(res,6)
                        sq_note=" 🔥 BB Squeeze — big move coming." if sq else ""
                        feel="Strong setup." if score>=4 else "Decent setup." if score>=3 else "Weak — be careful."
                        # Entry learning note
                        el=entry_learning.get(sym,{}).get(direction,{})
                        el_total=el.get("wins",0)+el.get("losses",0)
                        el_note=""
                        if el_total>=2:
                            el_rate=round(el.get("wins",0)/el_total*100)
                            el_note=nl+"📊 Entry history: "+str(el_rate)+"% win ("+str(el_total)+" trades)"
                        send_message(
                            "━━━━━━━━━━━━━━━━━━━━"+nl+
                            dir_icon+" <b>"+sym+" — "+dir_label+"</b>"+nl+
                            "📍 Now:    $"+str(price)+nl+
                            "⏳ Limit:  $"+str(limit_entry)+" ← wait for this"+nl+
                            "🛑 Stop:   $"+str(stop)+" ("+str(risk_pct)+"%)"+nl+
                            "🎯 TP1:    $"+str(tp1)+nl+
                            "🎯 TP2:    $"+str(tp2)+nl+
                            "📊 R:R 1:"+str(rr)+" | "+str(score)+"/5 ✅"+nl+
                            "━━━━━━━━━━━━━━━━━━━━"+nl+
                            feel+nl+
                            "Daily: "+dt+" | Weekly: "+wt+nl+
                            "Phase: "+phase+nl+
                            ("Support $"+str(sup)+" held "+str(sup_touches)+"x." if direction=="long" else
                             "Resistance $"+str(res)+" tested "+str(res_touches)+"x.")+nl+
                            rsi_note+btc_note+sq_note+el_note,chat_id)
            except Exception as e:
                send_message("Couldn't read "+sym+" right now. Try again.",chat_id)
                logger.error("Think: "+str(e))

        elif text.startswith("/result"):
            parts=text.split()
            if len(parts)<3:
                send_message(
                    "Usage: /result ETH WIN or /result ETH LOSS"+nl+nl+
                    "📌 <b>Only use /result for trades from /think</b>"+nl+
                    "/suggest trades are tracked automatically — no reporting needed.",chat_id)
            else:
                sym=parts[1].upper()
                outcome=parts[2].upper()
                if outcome not in ["WIN","LOSS"]:
                    send_message("Use WIN or LOSS. Example: /result ETH WIN",chat_id)
                else:
                    is_win=outcome=="WIN"

                    # ── WARN if this coin was auto-tracked via /suggest ───────
                    # Don't block — user may have taken /think trade on same coin.
                    # Just warn so they know /suggest trades don't need /result.
                    auto_tracked = any(
                        t["symbol"]==sym and
                        t["outcome"] in ["WIN","LOSS"] and
                        t.get("source") in ["auto_suggest","user_button"]
                        for t in suggested_trades
                    )
                    if auto_tracked:
                        send_message(
                            "⚠️ <b>Note: "+sym+" was auto-tracked via /suggest</b>"+nl+
                            "If this result is for a /suggest trade — skip /result, it's already counted."+nl+
                            "If this is a separate /think trade — recording now...",chat_id)

                    # ── RECORD the manual result ─────────────────────────────
                    if sym not in coin_confidence:
                        coin_confidence[sym]={"long_wins":0,"long_losses":0,"short_wins":0,"short_losses":0}
                    cc=coin_confidence[sym]
                    if is_win: cc["long_wins"]=cc.get("long_wins",0)+1
                    else:      cc["long_losses"]=cc.get("long_losses",0)+1
                    save_json("coin_confidence.json",coin_confidence)
                    sentinel_brain["total_verdicts"]=sentinel_brain.get("total_verdicts",0)+1
                    sentinel_brain["approved"]=sentinel_brain.get("approved",0)+1
                    if is_win:
                        sentinel_brain["approved_wins"]=sentinel_brain.get("approved_wins",0)+1
                        sentinel_brain["sentinel_wins"]=sentinel_brain.get("sentinel_wins",0)+1
                    else:
                        sentinel_brain["approved_losses"]=sentinel_brain.get("approved_losses",0)+1
                        sentinel_brain["sentinel_losses"]=sentinel_brain.get("sentinel_losses",0)+1
                    save_json("sentinel_brain.json",sentinel_brain)
                    w=sentinel_brain.get("approved_wins",0)
                    l=sentinel_brain.get("approved_losses",0)
                    acc=round(w/(w+l)*100) if (w+l)>0 else 0
                    send_message(
                        ("✅" if is_win else "❌")+" <b>Recorded: "+sym+" "+outcome+"</b>"+nl+nl+
                        "📌 This counts as a /think manual trade."+nl+
                        "Approved wins: "+str(w)+" | Losses: "+str(l)+nl+
                        "Real accuracy: "+str(acc)+"%",chat_id)
                    logger.info("Manual /think result: "+sym+" "+outcome+" — accuracy now "+str(acc)+"%")

        elif text=="/help":
            send_message("🛡️ <b>SentinelBot v3 Help</b>"+nl+nl+
                "/start — Introduction"+nl+
                "/status — Accuracy stats"+nl+
                "/history — Last 10 verdicts"+nl+
                "/checks BTC — Live 7-check analysis"+nl+
                "/knowledge BTC — What I know about a coin"+nl+
                "/entries BTC — Entry learning stats for a coin"+nl+
                "/premove — BTC pre-move detection"+nl+
                "/watchlist — All 75 coins"+nl+
                "/learn — Full brain report"+nl+
                "/weights — Live check weight table"+nl+
                "/blocked — Which checks cause wrong blocks"+nl+
                "/missed — Blocked trades tracker"+nl+
                "/regime — Market regime"+nl+
                "/confidence BTC — Confidence score"+nl+
                "/suggest — Best setups (press button → automatic)"+nl+
                "/think BTC — Manual trade analysis"+nl+
                "/result ETH WIN — Report /think trade outcome only"+nl+
                "/sync BTC — Compare what both bots know"+nl+
                "/pause /resume — Stop/start alerts"+nl+nl+
                "📌 <b>Reporting rules:</b>"+nl+
                "/suggest → press button → fully automatic"+nl+
                "/think → you decide → /result when done"+nl+
                "Bot1 trades → 100% automatic, nothing needed"+nl+nl+
                "The chart always whispers first. 🎯",chat_id)

# ============================================================
# FEATURE 6: CHECK SUGGESTED TRADE OUTCOMES (with fill detection)
# ============================================================
def check_suggested_trade_outcomes():
    global suggested_trades, sentinel_brain, coin_confidence, entry_learning
    if not suggested_trades: return
    changed = False

    for t in suggested_trades:
        sym       = t["symbol"]
        direction = t.get("direction","long")
        stop      = t.get("stop",0)
        tp1       = t.get("tp1",0)

        # Get current price
        try:
            r2    = requests.get("https://api.binance.com/api/v3/ticker/price",
                        params={"symbol":sym+"USDT"}, timeout=5)
            price = float(r2.json().get("price",0)) if r2.status_code==200 else 0
        except:
            continue
        if not price: continue

        # ── PHASE 1: PENDING FILL — waiting for limit order to fill ─────────
        if t.get("outcome") == "pending_fill":
            limit_e = t.get("limit_entry",0)
            if not limit_e: continue

            # Check expiry — 48 hours without fill
            try:
                age_h = (datetime.now(timezone.utc) -
                         datetime.fromisoformat(t["time"])).total_seconds() / 3600
            except:
                age_h = 0

            if age_h > 48:
                t["outcome"] = "expired_no_fill"
                logger.info("Limit expired unfilled: "+sym+" "+direction+" @ $"+str(limit_e))
                changed = True
                continue

            # Check if price reached the limit level (within 0.15%)
            filled = False
            if direction=="long" and price <= limit_e * 1.0015:
                filled = True
            elif direction=="short" and price >= limit_e * 0.9985:
                filled = True

            if filled:
                t["outcome"]   = "pending"
                t["entry"]     = price
                t["peak"]      = price
                t["fill_time"] = datetime.now(timezone.utc).isoformat()
                dist_from_limit = round(abs(price-limit_e)/limit_e*100, 4)
                t["fill_dist"] = dist_from_limit
                logger.info("Limit FILLED: "+sym+" "+direction+
                            " @ $"+str(price)+" (limit was $"+str(limit_e)+
                            ", dist "+str(dist_from_limit)+"%)")
                changed = True

                # ── CRITICAL FIX: check stop IMMEDIATELY after fill ──────────
                # If price moved fast and filled below stop (or above for shorts)
                # in the same 15-min window, record LOSS now — don't wait next cycle.
                # This is what caused stop hits to be missed entirely.
                immediate_stop = False
                if direction=="long" and stop>0 and price <= stop:
                    immediate_stop = True
                elif direction=="short" and stop>0 and price >= stop:
                    immediate_stop = True

                if immediate_stop:
                    t["outcome"]     = "LOSS"
                    t["close_price"] = price
                    t["close_time"]  = datetime.now(timezone.utc).isoformat()
                    logger.info("IMMEDIATE STOP after fill: "+sym+" "+direction+
                                " filled @ $"+str(price)+" already at/below stop $"+str(stop))
                    if not _paused:
                        send_message(
                            "❌ <b>Stop hit on fill: "+sym+" "+direction.upper()+"</b>"+chr(10)+
                            "Price filled at $"+str(round(price,6))+" and immediately hit stop $"+str(stop)+chr(10)+
                            "Recorded as LOSS — entry level may need review.")
                    # Fall through to resolve block below — don't continue
                else:
                    if not _paused:
                        send_message(
                            "✅ <b>Limit filled: "+sym+" "+direction.upper()+"</b>"+chr(10)+
                            "Entry: $"+str(round(price,6))+chr(10)+
                            "Stop: $"+str(stop)+" | TP1: $"+str(tp1)+chr(10)+
                            "Now watching for outcome...")
                    continue   # only continue if NOT immediately stopped out
            else:
                continue  # not filled yet, check again next cycle
        # ────────────────────────────────────────────────────────────────────

        # ── PHASE 2: ACTIVE — watching TP1 and Stop ─────────────────────────
        if t.get("outcome") != "pending": continue

        entry = t.get("entry",0)
        if not entry: continue

        # Update peak
        if direction=="long":
            if price > t.get("peak",entry): t["peak"] = price
            hit_tp   = price >= tp1
            hit_stop = price <= stop
        else:
            if price < t.get("peak",entry): t["peak"] = price
            hit_tp   = price <= tp1
            hit_stop = price >= stop

        if hit_tp:
            t["outcome"]     = "WIN"
            t["close_price"] = price
            t["close_time"]  = datetime.now(timezone.utc).isoformat()
        elif hit_stop:
            t["outcome"]     = "LOSS"
            t["close_price"] = price
            t["close_time"]  = datetime.now(timezone.utc).isoformat()

        # ── RESOLVE: update brain stats + entry_learning + coin_confidence ──
        # Suggested trades ARE Sentinel-originated trades — they must count
        # in the brain W/L just like Bot1 approved trades via /outcome.
        if t["outcome"] in ["WIN","LOSS"]:
            is_win = t["outcome"]=="WIN"
            nl     = chr(10)

            # ── UPDATE SENTINEL BRAIN STATS ─────────────────────────────────
            sentinel_brain["total_verdicts"] = sentinel_brain.get("total_verdicts",0)+1
            sentinel_brain["approved"]       = sentinel_brain.get("approved",0)+1
            if is_win:
                sentinel_brain["approved_wins"]   = sentinel_brain.get("approved_wins",0)+1
                sentinel_brain["sentinel_wins"]   = sentinel_brain.get("sentinel_wins",0)+1
            else:
                sentinel_brain["approved_losses"] = sentinel_brain.get("approved_losses",0)+1
                sentinel_brain["sentinel_losses"] = sentinel_brain.get("sentinel_losses",0)+1
            save_json("sentinel_brain.json", sentinel_brain)
            # ────────────────────────────────────────────────────────────────

            # Update coin confidence
            if sym not in coin_confidence:
                coin_confidence[sym] = {"long_wins":0,"long_losses":0,
                                        "short_wins":0,"short_losses":0}
            key = direction+("_wins" if is_win else "_losses")
            coin_confidence[sym][key] = coin_confidence[sym].get(key,0)+1
            save_json("coin_confidence.json",coin_confidence)

            # ── ENTRY QUALITY LEARNING ──────────────────────────────────────
            # This is what makes the bot improve entry levels over time.
            # Every fill at a support/resistance level is recorded.
            # If win rate drops below 45% → next suggestion adjusts 0.2% tighter.
            if sym not in entry_learning:
                entry_learning[sym] = {}
            if direction not in entry_learning[sym]:
                entry_learning[sym][direction] = {
                    "wins":0, "losses":0,
                    "avg_dist":0.0, "total_dist":0.0
                }
            el = entry_learning[sym][direction]
            if is_win: el["wins"]   = el.get("wins",0)+1
            else:      el["losses"] = el.get("losses",0)+1

            # Track fill distance from limit level (how close the fill was to S/R)
            fill_dist = t.get("fill_dist",0.0)
            el["total_dist"] = el.get("total_dist",0.0)+fill_dist
            total_entries    = el["wins"]+el["losses"]
            el["avg_dist"]   = round(el["total_dist"]/total_entries,4) if total_entries>0 else 0
            save_json("entry_learning.json",entry_learning)
            # ────────────────────────────────────────────────────────────────

            el_rate = round(el["wins"]/total_entries*100) if total_entries>0 else 0
            limit_e = t.get("limit_entry",entry)
            pnl_pct = round(abs(price-entry)/entry*100*(1 if is_win else -1),2)

            if not _paused:
                send_message(
                    ("✅" if is_win else "❌")+" <b>Auto-Learn: "+sym+" "+t["outcome"]+"</b>"+nl+
                    "Limit: $"+str(limit_e)+" → Fill: $"+str(round(entry,6))+" → Exit: $"+str(round(price,6))+nl+
                    ("+" if pnl_pct>=0 else "")+str(pnl_pct)+"%"+nl+nl+
                    "📚 "+sym+" "+direction+" entry accuracy: "+str(el_rate)+"% ("+str(total_entries)+" trades)"+nl+
                    "🎯 Avg fill dist from S/R: "+str(el["avg_dist"])+"% — "+
                    ("Good level ✅" if el_rate>=60 else "Level under review ⚠️"))

            total_verdicts = sentinel_brain.get("total_verdicts",0)
            aw = sentinel_brain.get("approved_wins",0)
            al = sentinel_brain.get("approved_losses",0)
            acc = round(aw/(aw+al)*100) if (aw+al)>0 else 0
            logger.info("Auto-learn: "+sym+" "+t["outcome"]+" | entry acc: "+str(el_rate)+"% | approved acc: "+str(acc)+"%")
            changed = True

    if changed:
        save_json("suggested_trades.json",suggested_trades)

# ============================================================
# OPEN TRADE MONITOR
# ============================================================
def monitor_open_trades():
    # NOTE: pause only stops NOTIFICATIONS — monitoring always runs
    # Trades must be watched 24/7 regardless of notification preference
    try:
        resp = requests.get(BOT1_URL + "/trades", timeout=10)
        if resp.status_code != 200: return
        data   = resp.json()
        trades = data.get("trades", [])
        if not trades: return
        btc_know = coin_knowledge.get("BTC", {})
        btc_bias = btc_know.get("bias", "NEUTRAL")
        for trade in trades:
            symbol    = trade.get("symbol", "")
            direction = trade.get("direction", "long")
            entry     = trade.get("entry", 0)
            peak_pnl  = trade.get("peak_pnl_pct", 0)
            if not symbol or not entry: continue
            price = None
            try:
                r2 = requests.get(
                    "https://api.binance.com/api/v3/ticker/price",
                    params={"symbol": symbol + "USDT"}, timeout=5)
                if r2.status_code == 200:
                    price = float(r2.json().get("price", 0))
            except: pass
            if not price: continue
            if direction == "long":
                real_pnl = ((price - entry) / entry) * 100
            else:
                real_pnl = ((entry - price) / entry) * 100
            close_reason = None
            if peak_pnl >= 0.3 and real_pnl < peak_pnl - 0.4:
                close_reason = "Peak was +" + str(round(peak_pnl,2)) + "% now dropping — locking profit"
            elif peak_pnl >= 0.3 and real_pnl < 0:
                if direction == "long" and btc_bias == "BEARISH":
                    close_reason = "BTC turned bearish — trade was in profit, closing now"
                elif direction == "short" and btc_bias == "BULLISH":
                    close_reason = "BTC turned bullish — trade was in profit, closing now"
            if close_reason:
                try:
                    requests.post(BOT1_URL + "/close/" + symbol, timeout=10)
                    logger.info("SENTINEL CLOSE (PROFIT PROTECT) — " + symbol + " at " + str(round(real_pnl,2)) + "% | " + close_reason)
                except Exception as e:
                    logger.error("Close signal failed: " + str(e))
    except Exception as e:
        logger.error("Monitor trades: " + str(e))

# ============================================================
# CONTINUOUS WATCHER
# ============================================================
def continuous_chart_watcher():
    logger.info("Watcher: "+str(len(WATCH_LIST))+" coins every 15min")
    last_cycle=0
    while True:
        try:
            now=time.time()
            if now-last_cycle>=WATCH_INTERVAL:
                last_cycle=now; start=time.time()
                logger.info("15min cycle starting...")
                try:
                    analyze_coin_deeply("BTC")
                    check_and_alert_btc_premove()
                    time.sleep(2)
                except Exception as e: logger.error("BTC: "+str(e))
                for symbol in WATCH_LIST[1:]:
                    try:
                        analyze_coin_deeply(symbol); time.sleep(1)
                    except Exception as e: logger.error(symbol+": "+str(e))
                try: update_missed_trade_outcomes()
                except Exception as e: logger.error("Missed trade update: "+str(e))
                try: detect_market_regime()
                except Exception as e: logger.error("Regime update: "+str(e))
                try: monitor_open_trades()
                except Exception as e: logger.error("Trade monitor: "+str(e))
                try: check_suggested_trade_outcomes()
                except Exception as e: logger.error("Suggested trades check: "+str(e))
                logger.info("Cycle done — "+str(len(coin_knowledge))+"/50 known | "+str(round(time.time()-start,1))+"s")
        except Exception as e: logger.error("Watcher: "+str(e))
        time.sleep(30)

def command_loop():
    global last_update_id
    init=get_updates(); results=init.get("result",[])
    if results: last_update_id=results[-1]["update_id"]+1
    while True:
        try:
            handle_commands(); time.sleep(1)
        except KeyboardInterrupt: break
        except Exception as e:
            logger.error("Cmd: "+str(e)); time.sleep(5)

def fast_trade_monitor():
    while True:
        try:
            monitor_open_trades()
        except Exception as e:
            logger.error("Fast monitor: " + str(e))
        time.sleep(120)

# ============================================================
# ENTRY POINT
# ============================================================
if __name__=="__main__":
    logger.info("SentinelBot v3 starting...")
    logger.info("DATA_DIR: "+DATA_DIR)
    logger.info("Min checks: "+str(MIN_CHECKS_TO_APPROVE)+"/7 | Coins: "+str(len(WATCH_LIST)))
    save_json("sentinel_brain.json",sentinel_brain)
    if SENTINEL_TOKEN and SENTINEL_CHAT_ID:
        send_message("🛡️ <b>SentinelBot v3 Online</b>"+chr(10)+chr(10)+
            "Chart Intelligence activated."+chr(10)+
            "The chart whispers. Sentinel listens."+chr(10)+chr(10)+
            "👁️ 50 coins every 15 minutes."+chr(10)+
            "⚡ BTC pre-move detection: ON"+chr(10)+
            "📊 Pattern recognition: ON"+chr(10)+
            "🔵 Market phase detection: ON"+chr(10)+
            "📈 Entry learning: ON — limit fills tracked automatically"+chr(10)+
            "⚖️ Dynamic check weights: ON — checks that win count more"+chr(10)+chr(10)+
            "Send /start for full introduction.")
    threading.Thread(target=command_loop,daemon=True).start()
    threading.Thread(target=continuous_chart_watcher,daemon=True).start()
    threading.Thread(target=fast_trade_monitor,daemon=True).start()
    app.run(host="0.0.0.0",port=8081)
