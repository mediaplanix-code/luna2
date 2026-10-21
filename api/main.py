# =========================================================
# LUNA2 — Microservizio astrologico + Bot Telegram + AI
# =========================================================

import os
import traceback
import random
import string
import asyncio
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import swisseph as swe
import httpx
from supabase import create_client

from transiti import calcola_transiti_lenti
from report import assembla_report
from ai import genera_oroscopo_settimanale, rispondi_chat, genera_copione_voce, rispondi_chat_compatibilita, genera_copione_voce_compatibilita
from compatibilita import router as compatibilita_router

app = FastAPI(title="Luna2 Astro API", version="0.24.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(compatibilita_router)

EPHE_PATH = os.getenv("SE_EPHE_PATH", "/app/ephe")
if os.path.isdir(EPHE_PATH):
    swe.set_ephe_path(EPHE_PATH)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_API = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}" if TELEGRAM_TOKEN else None
CRON_SECRET = os.getenv("CRON_SECRET", "")

SITE_URL = "https://luna2-2hw.pages.dev"

PIANETI = {
    "Sole": swe.SUN, "Luna": swe.MOON, "Mercurio": swe.MERCURY,
    "Venere": swe.VENUS, "Marte": swe.MARS, "Giove": swe.JUPITER,
    "Saturno": swe.SATURN, "Urano": swe.URANUS, "Nettuno": swe.NEPTUNE,
    "Plutone": swe.PLUTO, "NodoNord": swe.TRUE_NODE, "Chirone": swe.CHIRON,
}

SEGNI = [
    "Ariete", "Toro", "Gemelli", "Cancro", "Leone", "Vergine",
    "Bilancia", "Scorpione", "Sagittario", "Capricorno", "Acquario", "Pesci"
]

ASPETTI = {
    "congiunzione": (0, 8), "sestile": (60, 4),
    "quadratura": (90, 6), "trigono": (120, 6), "opposizione": (180, 8),
}

class BirthData(BaseModel):
    date: str
    time: str
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    tz_offset: float = 1.0

class TransitRequest(BaseModel):
    date: str
    time: str
    lat: float
    lon: float
    tz_offset: float
    target_date: str | None = None

class OnboardingRequest(BaseModel):
    nome: str
    email: str
    birth_date: str
    birth_time: str
    birth_city: str
    birth_country: str = ""
    birth_lat: float = 0
    birth_lon: float = 0
    wants_telegram: bool = False

class ChatRequest(BaseModel):
    domanda: str
    storico: list = []

class RecuperoRequest(BaseModel):
    email: str

def lon_to_sign(lon: float) -> dict:
    lon = lon % 360
    segno_idx = int(lon // 30)
    return {"longitude": round(lon, 4), "segno": SEGNI[segno_idx], "grado": round(lon % 30, 2)}

def compute_aspects(planets: dict) -> list:
    out = []
    nomi = list(planets.keys())
    for i in range(len(nomi)):
        for j in range(i + 1, len(nomi)):
            p1, p2 = nomi[i], nomi[j]
            diff = abs(planets[p1]["longitude"] - planets[p2]["longitude"])
            diff = min(diff, 360 - diff)
            for nome_asp, (ang, orb) in ASPETTI.items():
                if abs(diff - ang) <= orb:
                    out.append({"pianeta1": p1, "pianeta2": p2, "tipo": nome_asp, "orb": round(abs(diff - ang), 2)})
    return out

def julian_day_from_local(date_str: str, time_str: str, tz_offset: float) -> float:
    dt_local = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
    ut_hour = dt_local.hour + dt_local.minute / 60 - tz_offset
    return swe.julday(dt_local.year, dt_local.month, dt_local.day, ut_hour)

def calcola_pianeti_in_case(planets: dict, houses: list) -> dict:
    out = {}
    for nome, p in planets.items():
        lon_p = p["longitude"]
        for k in range(12):
            c1 = houses[k]
            c2 = houses[(k + 1) % 12]
            if c1 <= c2:
                if c1 <= lon_p < c2:
                    out[nome] = k + 1
                    break
            else:
                if lon_p >= c1 or lon_p < c2:
                    out[nome] = k + 1
                    break
    return out

def calc_ut_safe(jd: float, planet_id) -> float:
    result = swe.calc_ut(jd, planet_id)
    xx = result[0] if isinstance(result, tuple) else result
    if isinstance(xx, (tuple, list)):
        return float(xx[0])
    return float(xx)

def calcola_tema_completo(date_str: str, time_str: str, lat: float, lon: float, tz_offset: float = 1.0) -> dict:
    jd = julian_day_from_local(date_str, time_str, tz_offset)
    planets = {}
    for nome, pid in PIANETI.items():
        try:
            planets[nome] = lon_to_sign(calc_ut_safe(jd, pid))
        except Exception as e:
            print(f"Errore calcolo {nome}: {e}")
            continue
    cusps, ascmc = swe.houses(jd, lat, lon, b'P')
    houses = [round(c, 4) for c in cusps[:12]]
    ascendant = round(ascmc[0], 4)
    mc = round(ascmc[1], 4)
    return {
        "julian_day": round(jd, 6),
        "planets": planets,
        "houses": houses,
        "ascendant": ascendant,
        "mc": mc,
        "aspects": compute_aspects(planets),
        "planets_in_houses": calcola_pianeti_in_case(planets, houses),
    }

def carica_significati(sb):
    try: ps = sb.table("significati_pianeti_segni").select("*").execute().data or []
    except: ps = []
    try: pc = sb.table("significati_pianeti_case").select("*").execute().data or []
    except: pc = []
    try: tr = sb.table("significati_transiti").select("*").execute().data or []
    except: tr = []
    return ps, pc, tr

def genera_report_interno(profile: dict, tema: dict, sb):
    ps, pc, tr = carica_significati(sb)
    return assembla_report(
        profile=profile,
        tema=tema,
        significati_ps=ps,
        significati_pc=pc,
        significati_tr=tr,
    )

@app.on_event("startup")
async def on_startup():
    if not TELEGRAM_TOKEN or not TELEGRAM_API: return
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(f"{TELEGRAM_API}/setWebhook", json={
                "url": "https://luna2-api.onrender.com/telegram/webhook"
            })
            print(f"=== Auto-webhook: {r.json()} ===")
    except Exception as e:
        print(f"=== Errore auto-webhook: {e} ===")

@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "Luna2 Astro API",
        "version": "0.24.0",
        "supabase_configured": bool(SUPABASE_URL and SUPABASE_KEY),
        "telegram_configured": bool(TELEGRAM_TOKEN),
        "ai_provider": os.getenv("AI_PROVIDER", "groq"),
        "cron_configured": bool(CRON_SECRET),
        "compatibilita_attiva": True,
    }

@app.get("/geocode")
async def geocode(q: str = ""):
    if len(q) < 3: return {"features": []}
    url = "https://photon.komoot.io/api/"
    params = {"q": q, "limit": 5, "lang": "default"}
    headers = {"User-A
