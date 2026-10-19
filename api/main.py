# =========================================================
# LUNA2 — Microservizio astrologico + Bot Telegram + AI
# =========================================================

import os
import traceback
import random
import string
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import swisseph as swe
import httpx
from supabase import create_client

from transiti import calcola_transiti_lenti
from report import assembla_report
from ai import genera_oroscopo_settimanale, rispondi_chat, genera_copione_voce

app = FastAPI(title="Luna2 Astro API", version="0.19.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

EPHE_PATH = os.getenv("SE_EPHE_PATH", "/app/ephe")
if os.path.isdir(EPHE_PATH):
    swe.set_ephe_path(EPHE_PATH)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_API = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}" if TELEGRAM_TOKEN else None
CRON_SECRET = os.getenv("CRON_SECRET", "")

SITE_URL = "https://luna2-2hw.pages.dev"

DOMINI_TEMPORANEI = {
    "mailinator.com", "yopmail.com", "10minutemail.com", "guerrillamail.com",
    "tempmail.com", "temp-mail.org", "throwawaymail.com", "sharklasers.com",
    "getnada.com", "maildrop.cc", "dispostable.com", "mytemp.email",
    "trashmail.com", "fakeinbox.com", "mailnesia.com"
}

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

def genera_codice_verifica() -> str:
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=32))

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
        "version": "0.19.0",
        "supabase_configured": bool(SUPABASE_URL and SUPABASE_KEY),
        "telegram_configured": bool(TELEGRAM_TOKEN),
        "ai_provider": os.getenv("AI_PROVIDER", "groq"),
        "cron_configured": bool(CRON_SECRET),
    }

@app.get("/geocode")
async def geocode(q: str = ""):
    if len(q) < 3: return {"features": []}
    url = "https://photon.komoot.io/api/"
    params = {"q": q, "limit": 5, "lang": "default"}
    headers = {"User-Agent": "Luna2/0.19", "Accept": "application/json"}
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
        dominio = email_lower.split("@")[-1]
        if dominio in DOMINI_TEMPORANEI:
            raise HTTPException(status_code=400, detail="Le email temporanee non sono accettate.")

        lat, lon = req.birth_lat, req.birth_lon
        tema = calcola_tema_completo(req.birth_date, req.birth_time, lat, lon, 1.0)
        sb = create_client(SUPABASE_URL, SUPABASE_KEY)

        existing = sb.table("profiles").select("*").eq("email", email_lower).execute()
        codice_verifica = genera_codice_verifica()
        
        if existing.data:
            profile_id = existing.data[0]["id"]
            access_token = existing.data[0]["access_token"]
            sb.table("profiles").update({
                "nome": req.nome, "birth_date": req.birth_date, "birth_time": req.birth_time,
                "birth_lat": lat, "birth_lon": lon, "birth_city": req.birth_city,
                "codice_verifica": codice_verifica,
            }).eq("id", profile_id).execute()
            sb.table("natal_charts").delete().eq("profile_id", profile_id).execute()
        else:
            prof_res = sb.table("profiles").insert({
                "email": email_lower, "nome": req.nome, "telegram_id": None,
                "birth_date": req.birth_date, "birth_time": req.birth_time,
                "birth_lat": lat, "birth_lon": lon, "birth_city": req.birth_city,
                "timezone": "Europe/Rome", "consent_gdpr": True,
                "email_verificata": True, "codice_verifica": codice_verifica,
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

        return {
            "status": "ok",
            "message": f"Tema natale calcolato per {req.nome}.",
            "profile_id": profile_id,
            "access_token": access_token,
            "email_verificata": True,
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
        res = sb.table("profiles").select("id, nome, access_token, email_verificata").eq("email", email).execute()
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

    return {
        "profile": {
            "nome": profile.get("nome"), "email": profile.get("email"),
            "birth_date": str(profile.get("birth_date")),
            "birth_time": str(profile.get("birth_time"))[:5] if profile.get("birth_time") else None,
            "birth_city": profile.get("birth_city"),
            "chat_questions_used": profile.get("chat_questions_used", 0),
            "chat_questions_limit": 3,
            "is_paying": profile.get("is_paying", False),
            "telegram_id": profile.get("telegram_id"),
        },
        "chart": {
            "planets": tema["planets"], "planets_in_houses": tema["planets_in_houses"],
            "houses": tema["houses"], "aspects": tema["aspects"],
            "ascendant": {"longitude": tema["ascendant"]}, "mc": {"longitude": tema["mc"]},
        },
        "transits": transits_data,
    }

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
    
    tema = calcola_tema_completo(str(profile["birth_date"]), str(profile["birth_time"])[:5], float(profile["birth_lat"]), float(profile["birth_lon"]), 1.0)
    report = genera_report_interno(profile, tema, sb)
    oroscopo = await genera_oroscopo_settimanale(report)
    if not oroscopo: raise HTTPException(status_code=503, detail="Il consulto non è disponibile. Riprova più tardi.")
    return {"oroscopo": oroscopo, "nome": profile.get("nome")}

@app.post("/chat/{token}")
async def chat_endpoint(token: str, req: ChatRequest):
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    res = sb.table("profiles").select("*").eq("access_token", token).execute()
    if not res.data: raise HTTPException(status_code=404, detail="Profilo non trovato")
    profile = res.data[0]
    
    usate = profile.get("chat_questions_used", 0)
    limite = 3
    is_paying = profile.get("is_paying", False)
    if not is_paying and usate >= limite:
        raise HTTPException(status_code=402, detail=f"Hai esaurito le {limite} domande gratuite.")
    
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
async def get_copione_voce(token: str):
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    res = sb.table("profiles").select("*").eq("access_token", token).execute()
    if not res.data: raise HTTPException(status_code=404, detail="Profilo non trovato")
    profile = res.data[0]
    
    tema = calcola_tema_completo(str(profile["birth_date"]), str(profile["birth_time"])[:5], float(profile["birth_lat"]), float(profile["birth_lon"]), 1.0)
    report = genera_report_interno(profile, tema, sb)
    copione = await genera_copione_voce(report)
    if not copione: raise HTTPException(status_code=503, detail="Il consulto non è disponibile. Riprova più tardi.")
    return {"copione": copione}

@app.post("/transits")
def transits(req: TransitRequest):
    tema = calcola_tema_completo(req.date, req.time, req.lat, req.lon, req.tz_offset)
    tgt = datetime.strptime(req.target_date, "%Y-%m-%d") if req.target_date else datetime.now(timezone.utc)
    jd_today = swe.julday(tgt.year, tgt.month, tgt.day, 12.0)
    transits_now = {}
    for nome, pid in PIANETI.items():
        try: transits_now[nome] = lon_to_sign(calc_ut_safe(jd_today, pid))
        except Exception: continue
    aspetti_transito = []
    for t_nome, t_pos in transits_now.items():
        for n_nome, n_pos in tema["planets"].items():
            diff = abs(t_pos["longitude"] - n_pos["longitude"])
            diff = min(diff, 360 - diff)
            for nome_asp, (ang, orb) in ASPETTI.items():
                if abs(diff - ang) <= orb:
                    aspetti_transito.append({"transito": t_nome, "natale": n_nome, "tipo": nome_asp, "orb": round(abs(diff - ang), 2)})
    return {"target_date": tgt.strftime("%Y-%m-%d"), "transits": transits_now, "aspects_to_natal": aspetti_transito}

@app.post("/telegram/webhook")
async def telegram_webhook(request: Request):
    if not TELEGRAM_TOKEN or not TELEGRAM_API: return {"ok": True}
    try: update = await request.json()
    except Exception: return {"ok": True}
    message = update.get("message") or update.get("edited_message")
    if not message: return {"ok": True}

    chat_id = message["chat"]["id"]
    text = (message.get("text") or "").strip()

    if text.startswith("/start"):
        parts = text.split(maxsplit=1)
        if len(parts) < 2:
            await send_telegram(chat_id, "Ciao! Per attivare il tuo oroscopo, apri il link dal sito Luna2.")
            return {"ok": True}
        token = parts[1].strip()
        sb = create_client(SUPABASE_URL, SUPABASE_KEY)
        res = sb.table("profiles").select("id, nome, access_token").eq("access_token", token).execute()
        if not res.data:
            await send_telegram(chat_id, "Non ho trovato il tuo profilo. Rifai l'iscrizione.")
            return {"ok": True}
        
        prof = res.data[0]
        nome = prof["nome"]
        sb.table("profiles").update({"telegram_id": str(chat_id)}).eq("access_token", token).execute()
        await send_telegram(chat_id, f"Benvenuto <b>{nome}</b>! 🌙\n\nQuesto è il tuo contatto con le stelle. Profilo collegato correttamente.\n🌐 {SITE_URL}/sala?token={token}")
        
        # Invia l'oroscopo se non è mai stato inviato (controllo semplice: se il campo è vuoto)
        refreshed = sb.table("profiles").select("*").eq("id", prof["id"]).execute().data[0]
        if not refreshed.get("ultimo_oroscopo_inviato"):
            tema = calcola_tema_completo(str(refreshed["birth_date"]), str(refreshed["birth_time"])[:5], float(refreshed["birth_lat"]), float(refreshed["birth_lon"]), 1.0)
            report = genera_report_interno(refreshed, tema, sb)
            oroscopo = await genera_oroscopo_settimanale(report)
            if oroscopo:
                adesso = datetime.now(timezone.utc)
                data_inizio = adesso.strftime("%d/%m")
                data_fine = (adesso + timedelta(days=6)).strftime("%d/%m")
                testo = f"<b>Oroscopo settimanale dal {data_inizio} al {data_fine}</b>\n\n{oroscopo}\n\n🌐 <a href='{SITE_URL}/sala?token={token}'>Approfondisci nella tua sala</a>"
                await send_telegram(chat_id, testo)
                sb.table("profiles").update({"ultimo_oroscopo_inviato": adesso.isoformat()}).eq("id", prof["id"]).execute()
        return {"ok": True}
        
    if text == "/stop":
        await unlink_telegram_account(chat_id)
        await send_telegram(chat_id, "Va bene. Usa /start TOKEN per riattivare.")
        return {"ok": True}
    await send_telegram(chat_id, "Comando non riconosciuto.")
    return {"ok": True}

# =========================================================
# CRON
# =========================================================

@app.post("/cron/oroscopo-settimanale")
async def cron_oroscopo_settimanale(request: Request):
    try:
        if not CRON_SECRET: raise HTTPException(status_code=500, detail="CRON_SECRET non configurato.")
        if request.headers.get("x-cron-secret", "") != CRON_SECRET: raise HTTPException(status_code=403, detail="Non autorizzato.")
        if not SUPABASE_URL or not SUPABASE_KEY: raise HTTPException(status_code=500, detail="Supabase non configurato.")

        sb = create_client(SUPABASE_URL, SUPABASE_KEY)
        res = sb.table("profiles").select("*").execute()
        utenti = [u for u in (res.data or []) if u.get("telegram_id")]
        
        adesso = datetime.now(timezone.utc)
        inizio_settimana = adesso - timedelta(days=adesso.weekday(), hours=adesso.hour, minutes=adesso.minute, seconds=adesso.second)

        inviati = 0
        in_coda = 0
        errori = 0

        for u in utenti:
            nome = u.get("nome", "?")
            ultimo = u.get("ultimo_oroscopo_inviato")
            if ultimo:
                dt_ultimo = datetime.fromisoformat(ultimo.replace("Z", "+00:00"))
                if dt_ultimo >= inizio_settimana:
                    continue

            try:
                tema = calcola_tema_completo(str(u["birth_date"]), str(u["birth_time"])[:5], float(u["birth_lat"]), float(u["birth_lon"]), 1.0)
                report = genera_report_interno(u, tema, sb)
                oroscopo = await genera_oroscopo_settimanale(report)

                if not oroscopo:
                    sb.table("coda_invii").insert({"profile_id": u["id"], "tipo": "oroscopo", "contenuto": "", "tentativi": 0}).execute()
                    in_coda += 1
                    continue

                data_inizio = adesso.strftime("%d/%m")
                data_fine = (adesso + timedelta(days=6)).strftime("%d/%m")
                testo = f"<b>Oroscopo settimanale dal {data_inizio} al {data_fine}</b>\n\n{oroscopo}\n\n🌐 <a href='{SITE_URL}/sala?token={u['access_token']}'>Approfondisci nella tua sala</a>"
                
                chat_id = int(u["telegram_id"])
                await send_telegram(chat_id, testo)
                
                sb.table("profiles").update({"ultimo_oroscopo_inviato": adesso.isoformat()}).eq("id", u["id"]).execute()
                inviati += 1
            except Exception as e:
                errori += 1
                print(f"=== CRON: errore per {nome}: {e} ===")

        return {"status": "ok", "inviati": inviati, "in_coda": in_coda, "errori": errori}
    except HTTPException: raise
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Errore: {e}")

@app.post("/cron/recupera-coda")
async def cron_recupera_coda(request: Request):
    try:
        if not CRON_SECRET: raise HTTPException(status_code=500, detail="CRON_SECRET non configurato.")
        if request.headers.get("x-cron-secret", "") != CRON_SECRET: raise HTTPException(status_code=403, detail="Non autorizzato.")

        sb = create_client(SUPABASE_URL, SUPABASE_KEY)
        res = sb.table("coda_invii").select("*").lt("tentativi", 20).order("creato_il").limit(10).execute()
        elementi = res.data or []

        if not elementi: return {"status": "ok", "recuperati": 0}
        recuperati = 0
        falliti = 0

        for el in elementi:
            try:
                prof_res = sb.table("profiles").select("*").eq("id", el["profile_id"]).execute()
                if not prof_res.data:
                    sb.table("coda_invii").delete().eq("id", el["id"]).execute()
                    continue
                u = prof_res.data[0]

                ultimo = u.get("ultimo_oroscopo_inviato")
                if ultimo:
                    dt_ultimo = datetime.fromisoformat(ultimo.replace("Z", "+00:00"))
                    adesso = datetime.now(timezone.utc)
                    inizio_settimana = adesso - timedelta(days=adesso.weekday(), hours=adesso.hour, minutes=adesso.minute, seconds=adesso.second)
                    if dt_ultimo >= inizio_settimana:
                        sb.table("coda_invii").delete().eq("id", el["id"]).execute()
                        continue

                tema = calcola_tema_completo(str(u["birth_date"]), str(u["birth_time"])[:5], float(u["birth_lat"]), float(u["birth_lon"]), 1.0)
                report = genera_report_interno(u, tema, sb)
                oroscopo = await genera_oroscopo_settimanale(report)

                if not oroscopo:
                    sb.table("coda_invii").update({"tentativi": (el.get("tentativi", 0) + 1), "ultimo_tentativo": datetime.now(timezone.utc).isoformat()}).eq("id", el["id"]).execute()
                    falliti += 1
                    continue

                nome = u.get("nome", "")
                adesso = datetime.now(timezone.utc)
                data_inizio = adesso.strftime("%d/%m")
                data_fine = (adesso + timedelta(days=6)).strftime("%d/%m")
                testo = f"<b>Oroscopo settimanale dal {data_inizio} al {data_fine}</b>\n\n{oroscopo}\n\n🌐 <a href='{SITE_URL}/sala?token={u['access_token']}'>Approfondisci nella tua sala</a>"
                
                chat_id = int(u["telegram_id"])
                await send_telegram(chat_id, testo)
                
                sb.table("profiles").update({"ultimo_oroscopo_inviato": adesso.isoformat()}).eq("id", u["id"]).execute()
                sb.table("coda_invii").delete().eq("id", el["id"]).execute()
                recuperati += 1
            except Exception as e:
                falliti += 1
                print(f"=== CRON CODA: errore: {e} ===")

        return {"status": "ok", "recuperati": recuperati, "falliti": falliti}
    except HTTPException: raise
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Errore: {e}")

async def send_telegram(chat_id, text):
    if not TELEGRAM_API: return
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(f"{TELEGRAM_API}/sendMessage", json={"chat_id": chat_id, "text": text, "parse_mode": "HTML", "disable_web_page_preview": True})
    except Exception as e:
        print(f"Errore Telegram: {e}")

async def unlink_telegram_account(chat_id):
    sb = create_client(
