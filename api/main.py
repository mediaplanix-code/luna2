# =========================================================
# LUNA2 — Microservizio astrologico + Bot Telegram + AI
# =========================================================

import os
import traceback
import random
import string
import asyncio
import re
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import swisseph as swe
import httpx
from supabase import create_client

from transiti import calcola_transiti_lenti
from report import assembla_report
from ai import genera_oroscopo_settimanale, rispondi_chat, genera_copione_voce, rispondi_chat_compatibilita, genera_copione_voce_compatibilita, genera_settori_tema, rispondi_chat_tema, genera_copione_voce_tema
from compatibilita import router as compatibilita_router
from sogni import router as sogni_router

app = FastAPI(title="Luna2 Astro API", version="0.43.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(compatibilita_router)
app.include_router(sogni_router)

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
    telefono: str = ""

class ChatRequest(BaseModel):
    domanda: str
    storico: list = []

class RecuperoRequest(BaseModel):
    email: str

class ToolRequest(BaseModel):
    token: str

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

def calcola_transiti_con_durata(tema: dict, giorni: int = 365, orb_max: float = 3.0) -> list:
    oggi = datetime.now(timezone.utc)
    pianeti_lenti = ["Giove", "Saturno", "Urano", "Nettuno", "Plutone"]
    punti_natali = ["Sole", "Luna"]
    aspetti_considerati = {"congiunzione": 0, "sestile": 60, "quadratura": 90, "trigono": 120, "opposizione": 180}
    
    attivi = {}
    
    for giorno_offset in range(0, giorni):
        data_controllo = oggi + timedelta(days=giorno_offset)
        jd_controllo = swe.julday(data_controllo.year, data_controllo.month, data_controllo.day, 12.0)
        
        for t_nome in pianeti_lenti:
            pid = PIANETI[t_nome]
            try:
                t_lon = calc_ut_safe(jd_controllo, pid)
            except Exception:
                continue
            
            for n_nome in punti_natali:
                n_lon = tema["planets"][n_nome]["longitude"]
                diff = abs(t_lon - n_lon)
                diff = min(diff, 360 - diff)
                
                for nome_asp, ang in aspetti_considerati.items():
                    if abs(diff - ang) <= orb_max:
                        chiave = f"{t_nome}_{nome_asp}_{n_nome}"
                        if chiave not in attivi:
                            attivi[chiave] = {
                                "chiave": chiave,
                                "transito": t_nome,
                                "aspetto": nome_asp,
                                "punto_natale": n_nome,
                                "inizio": data_controllo.strftime("%Y-%m-%d"),
                                "fine": data_controllo.strftime("%Y-%m-%d"),
                            }
                        else:
                            attivi[chiave]["fine"] = data_controllo.strftime("%Y-%m-%d")
    
    return list(attivi.values())

def genera_alert_futuri(profile_id: str, tema: dict, sb):
    try:
        transiti = calcola_transiti_con_durata(tema, giorni=365, orb_max=3.0)
        for t in transiti:
            existing = sb.table("alerts").select("*").eq("profile_id", profile_id).eq("descrizione", t["chiave"]).execute()
            if not existing.data:
                sb.table("alerts").insert({
                    "profile_id": profile_id,
                    "tipo": "transito_lento",
                    "descrizione": t["chiave"],
                    "data_evento": t["inizio"],
                    "inviato": False,
                }).execute()
        print(f"=== ALERT: generati {len(transiti)} alert per {profile_id} ===")
        return transiti
    except Exception as e:
        print(f"=== ERRORE generazione alert: {e} ===")
        return []

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
        "version": "0.43.0",
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
    headers = {"User-Agent": "Luna2/0.43", "Accept": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(url, params=params, headers=headers)
        if r.status_code != 200: return {"features": [], "error": f"HTTP {r.status_code}"}
        return r.json()
    except Exception as e:
        return {"features": [], "error": str(e)}

@app.post("/onboarding")
async def onboarding(req: OnboardingRequest):
    try:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise HTTPException(status_code=500, detail="Supabase non configurato")
        if not req.birth_lat or not req.birth_lon:
            raise HTTPException(status_code=400, detail="Coordinate di nascita mancanti.")

        email_lower = req.email.strip().lower()
        
        lat, lon = req.birth_lat, req.birth_lon
        tema = calcola_tema_completo(req.birth_date, req.birth_time, lat, lon, 1.0)
        sb = create_client(SUPABASE_URL, SUPABASE_KEY)

        existing = sb.table("profiles").select("*").eq("email", email_lower).execute()
        
        if existing.data:
            profile_id = existing.data[0]["id"]
            access_token = existing.data[0]["access_token"]
            sb.table("profiles").update({
                "nome": req.nome, "birth_date": req.birth_date, "birth_time": req.birth_time,
                "birth_lat": lat, "birth_lon": lon, "birth_city": req.birth_city,
                "telefono": req.telefono if req.telefono else existing.data[0].get("telefono"),
            }).eq("id", profile_id).execute()
            sb.table("natal_charts").delete().eq("profile_id", profile_id).execute()
        else:
            prof_res = sb.table("profiles").insert({
                "email": email_lower, "nome": req.nome, "telegram_id": None,
                "birth_date": req.birth_date, "birth_time": req.birth_time,
                "birth_lat": lat, "birth_lon": lon, "birth_city": req.birth_city,
                "telefono": req.telefono,
                "timezone": "Europe/Rome", "consent_gdpr": True,
            }).execute()
            if not prof_res.data:
                raise HTTPException(status_code=500, detail="Profilo non creato")
            profile_id = prof_res.data[0]["id"]
            access_token = prof_res.data[0]["access_token"]

        sb.table("natal_charts").insert({
            "profile_id": profile_id, "planets_json": tema["planets"],
            "houses_json": tema["houses"], "aspects_json": tema["aspects"],
            "ascendant": tema["ascendant"], "mc": tema["mc"],
        }).execute()

        try:
            profile = sb.table("profiles").select("*").eq("id", profile_id).execute().data[0]
            report = genera_report_interno(profile, tema, sb)
            sb.table("internal_reports").delete().eq("profile_id", profile_id).execute()
            sb.table("internal_reports").insert({
                "profile_id": profile_id,
                "interpretation": report["riepilogo_testuale"],
                "talking_points": report["settori"],
            }).execute()
        except Exception as e:
            print(f"Errore generazione report post-onboarding: {e}")

        genera_alert_futuri(profile_id, tema, sb)

        return {
            "status": "ok",
            "message": f"Tema natale calcolato per {req.nome}.",
            "profile_id": profile_id,
            "access_token": access_token,
            "chart_preview": {
                "sole": tema["planets"].get("Sole"),
                "luna": tema["planets"].get("Luna"),
                "ascendente": lon_to_sign(tema["ascendant"]),
            },
        }
    except HTTPException: raise
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Errore: {type(e).__name__}: {e}")

@app.post("/recupera-token")
async def recupera_token(req: RecuperoRequest):
    if not SUPABASE_URL or not SUPABASE_KEY: raise HTTPException(status_code=500, detail="Supabase non configurato")
    email = (req.email or "").strip().lower()
    if not email: raise HTTPException(status_code=400, detail="Email mancante.")
    try:
        sb = create_client(SUPABASE_URL, SUPABASE_KEY)
        res = sb.table("profiles").select("id, nome, access_token").eq("email", email).execute()
        if not res.data: raise HTTPException(status_code=404, detail="Nessun profilo trovato.")
        prof = res.data[0]
        return {"status": "ok", "access_token": prof["access_token"], "nome": prof.get("nome", "")}
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.get("/sala/{token}")
async def get_sala(token: str):
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    res = sb.table("profiles").select("*").eq("access_token", token).execute()
    if not res.data: raise HTTPException(status_code=404, detail="Profilo non trovato")
    profile = res.data[0]
    
    tema = calcola_tema_completo(
        str(profile["birth_date"]), str(profile["birth_time"])[:5],
        float(profile["birth_lat"]), float(profile["birth_lon"]), 1.0,
    )
    transits_data = {"transits": {}, "aspects_to_natal": []}
    try:
        today = datetime.utcnow().strftime("%Y-%m-%d")
        transits_data = transits(TransitRequest(
            date=str(profile["birth_date"]), time=str(profile["birth_time"])[:5],
            lat=float(profile["birth_lat"]), lon=float(profile["birth_lon"]),
            tz_offset=1.0, target_date=today,
        ))
    except Exception: pass

    segnali = []
    try:
        alerts_res = sb.table("alerts").select("*").eq("profile_id", profile["id"]).order("data_evento").execute()
        raw_alerts = alerts_res.data or []
        for a in raw_alerts:
            parti = (a.get("descrizione") or "").split("_")
            if len(parti) >= 3:
                segnali.append({
                    "pianeta": parti[0],
                    "aspetto": parti[1],
                    "punto_natale": parti[2],
                    "data_evento": a.get("data_evento"),
                    "inviato": a.get("inviato", False),
                })
    except Exception as e:
        print(f"Errore lettura alert per sala: {e}")

    return {
        "profile": {
            "nome": profile.get("nome"), "email": profile.get("email"),
            "birth_date": str(profile.get("birth_date")),
            "birth_time": str(profile.get("birth_time"))[:5] if profile.get("birth_time") else None,
            "birth_city": profile.get("birth_city"),
            "telefono": profile.get("telefono"),
            "chat_questions_used": profile.get("chat_questions_used", 0),
            "chat_questions_limit": 3,
            "is_paying": profile.get("is_paying", False),
            "telegram_id": profile.get("telegram_id"),
            "compatibilita_usate": profile.get("compatibilita_usate", 0),
            "ultima_compatibilita": profile.get("ultima_compatibilita"),
        },
        "chart": {
            "planets": tema["planets"], "planets_in_houses": tema["planets_in_houses"],
            "houses": tema["houses"], "aspects": tema["aspects"],
            "ascendant": {"longitude": tema["ascendant"]}, "mc": {"longitude": tema["mc"]},
        },
        "transits": transits_data,
        "segnali": segnali,
    }

@app.get("/settori/{token}")
async def get_settori(token: str):
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    res = sb.table("profiles").select("*").eq("access_token", token).execute()
    if not res.data: raise HTTPException(status_code=404, detail="Profilo non trovato")
    profile = res.data[0]
    
    tema = calcola_tema_completo(
        str(profile["birth_date"]), str(profile["birth_time"])[:5],
        float(profile["birth_lat"]), float(profile["birth_lon"]), 1.0,
    )
    report = genera_report_interno(profile, tema, sb)
    
    settori = await genera_settori_tema(report)
    return settori

@app.get("/report/{token}")
async def get_report(token: str):
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    res = sb.table("profiles").select("*").eq("access_token", token).execute()
    if not res.data: raise HTTPException(status_code=404, detail="Profilo non trovato")
    profile = res.data[0]
    
    tema = calcola_tema_completo(str(profile["birth_date"]), str(profile["birth_time"])[:5], float(profile["birth_lat"]), float(profile["birth_lon"]), 1.0)
    report = genera_report_interno(profile, tema, sb)
    try:
        sb.table("internal_reports").delete().eq("profile_id", profile["id"]).execute()
        sb.table("internal_reports").insert({
            "profile_id": profile["id"], "interpretation": report["riepilogo_testuale"], "talking_points": report["settori"],
        }).execute()
    except Exception: pass
    return report

@app.get("/oroscopo/{token}")
async def get_oroscopo(token: str):
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    res = sb.table("profiles").select("*").eq("access_token", token).execute()
    if not res.data: raise HTTPException(status_code=404, detail="Profilo non trovato")
    profile = res.data[0]
    
    if profile.get("ultimo_oroscopo_testo"):
        return {"oroscopo": profile["ultimo_oroscopo_testo"], "nome": profile.get("nome")}
    
    tema = calcola_tema_completo(str(profile["birth_date"]), str(profile["birth_time"])[:5], float(profile["birth_lat"]), float(profile["birth_lon"]), 1.0)
    report = genera_report_interno(profile, tema, sb)
    oroscopo = await genera_oroscopo_settimanale(report)
    
    if not oroscopo: 
        raise HTTPException(status_code=503, detail="Il consulto non è disponibile. Riprova più tardi.")
    
    sb.table("profiles").update({"ultimo_oroscopo_testo": oroscopo}).eq("id", profile["id"]).execute()
    
    return {"oroscopo": oroscopo, "nome": profile.get("nome")}

@app.get("/analisi-alert/{token}")
async def analisi_alert(token: str):
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    res = sb.table("profiles").select("*").eq("access_token", token).execute()
    if not res.data: raise HTTPException(status_code=404, detail="Profilo non trovato")
    profile = res.data[0]
    
    tema = calcola_tema_completo(
        str(profile["birth_date"]), str(profile["birth_time"])[:5],
        float(profile["birth_lat"]), float(profile["birth_lon"]), 1.0,
    )
    
    transiti = calcola_transiti_con_durata(tema, giorni=365, orb_max=3.0)
    
    distribuzione = {}
    for t in transiti:
        mese = t["inizio"][:7]
        if mese not in distribuzione:
            distribuzione[mese] = []
        distribuzione[mese].append(t)
    
    return {
        "totale_transiti": len(transiti),
        "transiti": transiti,
        "distribuzione_mensile": {k: len(v) for k, v in distribuzione.items()},
        "dettaglio_mensile": distribuzione,
    }

@app.post("/chat/{token}")
async def chat_endpoint(token: str, req: ChatRequest, focus: str = None):
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    res = sb.table("profiles").select("*").eq("access_token", token).execute()
    if not res.data: raise HTTPException(status_code=404, detail="Profilo non trovato")
    profile = res.data[0]
    
    usate = profile.get("chat_questions_used", 0)
    limite = 3
    is_paying = profile.get("is_paying", False)
    if not is_paying and usate >= limite:
        raise HTTPException(status_code=402, detail=f"Hai esaurito le {limite} domande gratuite.")
    
    if focus and focus.startswith("compatibilita"):
        dati_comp = profile.get("ultima_compatibilita")
        if not dati_comp:
            raise HTTPException(status_code=400, detail="Nessun confronto recente trovato. Fai prima un confronto.")
        
        tipo_focus = focus.replace("compatibilita_", "") if focus != "compatibilita" else "generico"
        risposta = await rispondi_chat_compatibilita(dati_comp, tipo_focus, req.domanda, req.storico)
    elif focus and focus.startswith("tema"):
        tema = calcola_tema_completo(str(profile["birth_date"]), str(profile["birth_time"])[:5], float(profile["birth_lat"]), float(profile["birth_lon"]), 1.0)
        report = genera_report_interno(profile, tema, sb)
        tipo_focus = focus.replace("tema_", "")
        risposta = await rispondi_chat_tema(report, tipo_focus, req.domanda, req.storico)
    else:
        tema = calcola_tema_completo(str(profile["birth_date"]), str(profile["birth_time"])[:5], float(profile["birth_lat"]), float(profile["birth_lon"]), 1.0)
        report = genera_report_interno(profile, tema, sb)
        risposta = await rispondi_chat(report, req.domanda, req.storico)

    if not risposta: raise HTTPException(status_code=503, detail="Il consulto non è disponibile. Riprova più tardi.")
    
    if not is_paying:
        sb.table("profiles").update({"chat_questions_used": usate + 1}).eq("id", profile["id"]).execute()
    try:
        sb.table("chat_questions").insert({"profile_id": profile["id"], "question": req.domanda, "answer": risposta}).execute()
    except Exception: pass
    
    return {"risposta": risposta, "domande_usate": usate + 1 if not is_paying else usate, "domande_limite": limite}

@app.get("/copione-voce/{token}")
async def get_copione_voce(token: str, focus: str = None):
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    res = sb.table("profiles").select("*").eq("access_token", token).execute()
    if not res.data: raise HTTPException(status_code=404, detail="Profilo non trovato")
    profile = res.data[0]
    
    if focus and focus.startswith("compatibilita"):
        dati_comp = profile.get("ultima_compatibilita")
        if not dati_comp:
            raise HTTPException(status_code=400, detail="Nessun confronto recente trovato.")
        
        tipo_focus = focus.replace("compatibilita_", "") if focus != "compatibilita" else "generico"
        copione = await genera_copione_voce_compatibilita(dati_comp, tipo_focus)
    elif focus and focus.startswith("tema"):
        tema = calcola_tema_completo(str(profile["birth_date"]), str(profile["birth_time"])[:5], float(profile["birth_lat"]), float(profile["birth_lon"]), 1.0)
        report = genera_report_interno(profile, tema, sb)
        tipo_focus = focus.replace("tema_", "")
        copione = await genera_copione_voce_tema(report, tipo_focus)
    else:
        tema = calcola_tema_completo(str(profile["birth_date"]), str(profile["birth_time"])[:5], float(profile["birth_lat"]), float(profile["birth_lon"]), 1.0)
        report = genera_report_interno(profile, tema, sb)
        copione = await genera_copione_voce(report)

    if not copione: raise HTTPException(status_code=503, detail="Il consulto non è disponibile. Riprova più tardi.")
    return {"copione": copione}

# =========================================================
# TOOL PER VAPI (Tool Calling)
# =========================================================

@app.post("/tool/dati-cliente")
async def tool_dati_cliente(req: ToolRequest):
    try:
        sb = create_client(SUPABASE_URL, SUPABASE_KEY)
        res = sb.table("profiles").select("*").eq("access_token", req.token).execute()
        if not res.data:
            return {"error": "Cliente non trovato."}
        
        profile = res.data[0]
        nome = profile.get("nome", "")
        
        tema = calcola_tema_completo(
            str(profile["birth_date"]), str(profile["birth_time"])[:5],
            float(profile["birth_lat"]), float(profile["birth_lon"]), 1.0,
        )
        report = genera_report_interno(profile, tema, sb)
        
        dati = {
            "nome": nome,
            "sole": tema["planets"].get("Sole"),
            "luna": tema["planets"].get("Luna"),
            "ascendente": lon_to_sign(tema["ascendant"]),
            "mc": lon_to_sign(tema["mc"]),
            "transiti": report.get("transiti", []),
            "riepilogo": report.get("riepilogo_testuale", "")
        }
        
        return dati
        
    except Exception as e:
        print(f"=== ERRORE TOOL DATI CLIENTE: {e} ===")
        return {"error": f"Errore: {type(e).__name__}"}

#
