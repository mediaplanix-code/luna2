# =========================================================
# LUNA2 — Microservizio astrologico + Bot Telegram
# =========================================================

import os
import traceback
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import swisseph as swe
import httpx
from supabase import create_client

app = FastAPI(title="Luna2 Astro API", version="0.8.0")

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

SITE_URL = "https://luna2-2hw.pages.dev"

PIANETI = {
    "Sole": swe.SUN,
    "Luna": swe.MOON,
    "Mercurio": swe.MERCURY,
    "Venere": swe.VENUS,
    "Marte": swe.MARS,
    "Giove": swe.JUPITER,
    "Saturno": swe.SATURN,
    "Urano": swe.URANUS,
    "Nettuno": swe.NEPTUNE,
    "Plutone": swe.PLUTO,
    "NodoNord": swe.TRUE_NODE,
    "Chirone": swe.CHIRON,
}

SEGNI = [
    "Ariete", "Toro", "Gemelli", "Cancro", "Leone", "Vergine",
    "Bilancia", "Scorpione", "Sagittario", "Capricorno",
    "Acquario", "Pesci"
]

ASPETTI = {
    "congiunzione": (0, 8),
    "sestile": (60, 4),
    "quadratura": (90, 6),
    "trigono": (120, 6),
    "opposizione": (180, 8),
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


def lon_to_sign(lon: float) -> dict:
    lon = lon % 360
    segno_idx = int(lon // 30)
    return {
        "longitude": round(lon, 4),
        "segno": SEGNI[segno_idx],
        "grado": round(lon % 30, 2),
    }


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
                    out.append({
                        "pianeta1": p1,
                        "pianeta2": p2,
                        "tipo": nome_asp,
                        "orb": round(abs(diff - ang), 2),
                    })
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


def calcola_tema_completo(date_str: str, time_str: str, lat: float, lon: float, tz_offset: float = 1.0) -> dict:
    """Calcola il tema natale completo. Ritorna dict pronto per il salvataggio."""
    jd = julian_day_from_local(date_str, time_str, tz_offset)

    planets = {}
    for nome, pid in PIANETI.items():
        try:
            xx, _ = swe.calc_ut(jd, pid)
            planets[nome] = lon_to_sign(xx[0])
        except Exception as e:
            print(f"Errore calcolo {nome}: {e}")
            continue

    print(f"=== Pianeti calcolati: {len(planets)} ===")
    for k, v in planets.items():
        print(f"  {k}: {v['segno']} {v['grado']}°")

    cusps, ascmc = swe.houses(jd, lat, lon, b'P')
    # Prendi solo le prime 12 cuspidi (Swiss Ephemeris ne restituisce 12 + 1 duplicata)
    houses = [round(c, 4) for c in cusps[:12]]
    ascendant = round(ascmc[0], 4)
    mc = round(ascmc[1], 4)

    aspects = compute_aspects(planets)
    planets_in_houses = calcola_pianeti_in_case(planets, houses)

    return {
        "julian_day": round(jd, 6),
        "planets": planets,
        "houses": houses,
        "ascendant": ascendant,
        "mc": mc,
        "aspects": aspects,
        "planets_in_houses": planets_in_houses,
    }


@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "Luna2 Astro API",
        "version": "0.8.0",
        "supabase_configured": bool(SUPABASE_URL and SUPABASE_KEY),
        "telegram_configured": bool(TELEGRAM_TOKEN),
    }


@app.get("/geocode")
async def geocode(q: str = ""):
    if len(q) < 3:
        return {"features": []}
    url = "https://photon.komoot.io/api/"
    params = {"q": q, "limit": 5, "lang": "default"}
    headers = {
        "User-Agent": "Luna2/0.8 (contatti@luna2.app)",
        "Accept": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(url, params=params, headers=headers)
        if r.status_code != 200:
            return {"features": [], "error": f"HTTP {r.status_code}"}
        return r.json()
    except Exception as e:
        return {"features": [], "error": str(e)}


@app.post("/natal-chart")
def natal_chart(data: BirthData):
    try:
        tema = calcola_tema_completo(data.date, data.time, data.lat, data.lon, data.tz_offset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore calcolo: {e}")

    return {
        "input": data.model_dump(),
        "julian_day": tema["julian_day"],
        "planets": tema["planets"],
        "houses": tema["houses"],
        "ascendant": lon_to_sign(tema["ascendant"]),
        "mc": lon_to_sign(tema["mc"]),
        "aspects": tema["aspects"],
        "planets_in_houses": tema["planets_in_houses"],
    }


@app.post("/transits")
def transits(req: TransitRequest):
    tema = calcola_tema_completo(req.date, req.time, req.lat, req.lon, req.tz_offset)

    if req.target_date:
        tgt = datetime.strptime(req.target_date, "%Y-%m-%d")
    else:
        tgt = datetime.now(timezone.utc)
    jd_today = swe.julday(tgt.year, tgt.month, tgt.day, 12.0)

    transits_now = {}
    for nome, pid in PIANETI.items():
        try:
            xx, _ = swe.calc_ut(jd_today, pid)
            transits_now[nome] = lon_to_sign(xx[0])
        except Exception:
            continue

    aspetti_transito = []
    for t_nome, t_pos in transits_now.items():
        for n_nome, n_pos in tema["planets"].items():
            diff = abs(t_pos["longitude"] - n_pos["longitude"])
            diff = min(diff, 360 - diff)
            for nome_asp, (ang, orb) in ASPETTI.items():
                if abs(diff - ang) <= orb:
                    aspetti_transito.append({
                        "transito": t_nome,
                        "natale": n_nome,
                        "tipo": nome_asp,
                        "orb": round(abs(diff - ang), 2),
                    })
    return {
        "target_date": tgt.strftime("%Y-%m-%d"),
        "transits": transits_now,
        "aspects_to_natal": aspetti_transito,
    }


@app.post("/onboarding")
async def onboarding(req: OnboardingRequest):
    try:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise HTTPException(status_code=500, detail="Supabase non configurato")

        if not req.birth_lat or not req.birth_lon:
            raise HTTPException(
                status_code=400,
                detail="Coordinate di nascita mancanti. Seleziona la città dai suggerimenti."
            )

        lat = req.birth_lat
        lon = req.birth_lon
        full_name = req.birth_city

        # Calcolo tema
        try:
            tema = calcola_tema_completo(req.birth_date, req.birth_time, lat, lon, 1.0)
        except Exception as e:
            print("=== ERRORE CALCOLO TEMA ===")
            print(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Errore calcolo tema: {e}")

        print(f"=== TEMA CALCOLATO: {len(tema['planets'])} pianeti ===")
        print(f"=== CASE: {len(tema['houses'])} ===")
        print(f"=== ASPETTI: {len(tema['aspects'])} ===")

        sb = create_client(SUPABASE_URL, SUPABASE_KEY)

        # Profilo: aggiorna o crea
        existing = sb.table("profiles").select("*").eq("email", req.email).execute()
        if existing.data:
            profile_id = existing.data[0]["id"]
            access_token = existing.data[0]["access_token"]
            sb.table("profiles").update({
                "nome": req.nome,
                "birth_date": req.birth_date,
                "birth_time": req.birth_time,
                "birth_lat": lat,
                "birth_lon": lon,
                "birth_city": full_name,
            }).eq("id", profile_id).execute()
            # Cancella temi precedenti per non accumulare
            sb.table("natal_charts").delete().eq("profile_id", profile_id).execute()
        else:
            profile_payload = {
                "email": req.email,
                "nome": req.nome,
                "telegram_id": None,
                "birth_date": req.birth_date,
                "birth_time": req.birth_time,
                "birth_lat": lat,
                "birth_lon": lon,
                "birth_city": full_name,
                "timezone": "Europe/Rome",
                "consent_gdpr": True,
            }
            prof_res = sb.table("profiles").insert(profile_payload).execute()
            if not prof_res.data:
                raise HTTPException(status_code=500, detail="Profilo non creato")
            profile_id = prof_res.data[0]["id"]
            access_token = prof_res.data[0]["access_token"]

        # Salva tema natale — con verifica
        insert_payload = {
            "profile_id": profile_id,
            "planets_json": tema["planets"],
            "houses_json": tema["houses"],
            "aspects_json": tema["aspects"],
            "ascendant": tema["ascendant"],
            "mc": tema["mc"],
        }
        print(f"=== INSERT CHART PAYLOAD: planets={len(insert_payload['planets_json'])}, houses={len(insert_payload['houses_json'])} ===")

        chart_res = sb.table("natal_charts").insert(insert_payload).execute()
        print(f"=== CHART INSERT RESPONSE: {bool(chart_res.data)} ===")

        if not chart_res.data:
            raise HTTPException(status_code=500, detail="Tema natale non salvato")

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

    except HTTPException:
        raise
    except Exception as e:
        print("=== ONBOARDING ERROR ===")
        print(traceback.format_exc())
        print("========================")
        raise HTTPException(status_code=500, detail=f"Errore interno: {type(e).__name__}: {e}")


# =========================================================
# SALA — ricalcola il tema al volo, non si fida del DB
# =========================================================
@app.get("/sala/{token}")
async def get_sala(token: str):
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(status_code=500, detail="Supabase non configurato")

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    try:
        res = sb.table("profiles").select("*").eq("access_token", token).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore lettura profilo: {e}")

    if not res.data:
        raise HTTPException(status_code=404, detail="Profilo non trovato")

    profile = res.data[0]

    # Ricalcola sempre il tema al volo dai dati di nascita (fonte di verità)
    try:
        tema = calcola_tema_completo(
            str(profile["birth_date"]),
            str(profile["birth_time"])[:5],
            float(profile["birth_lat"]),
            float(profile["birth_lon"]),
            1.0,
        )
    except Exception as e:
        print("=== SALA: errore ricalcolo ===")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Errore calcolo tema: {e}")

    # Transiti oggi
    try:
        today = datetime.utcnow().strftime("%Y-%m-%d")
        transits_req = TransitRequest(
            date=str(profile["birth_date"]),
            time=str(profile["birth_time"])[:5],
            lat=float(profile["birth_lat"]),
            lon=float(profile["birth_lon"]),
            tz_offset=1.0,
            target_date=today,
        )
        transits_data = transits(transits_req)
    except Exception:
        transits_data = {"transits": {}, "aspects_to_natal": []}

    return {
        "profile": {
            "nome": profile.get("nome"),
            "email": profile.get("email"),
            "birth_date": str(profile.get("birth_date")),
            "birth_time": str(profile.get("birth_time"))[:5] if profile.get("birth_time") else None,
            "birth_city": profile.get("birth_city"),
            "chat_questions_used": profile.get("chat_questions_used", 0),
            "chat_questions_limit": profile.get("chat_questions_limit", 5),
            "is_paying": profile.get("is_paying", False),
        },
        "chart": {
            "planets": tema["planets"],
            "planets_in_houses": tema["planets_in_houses"],
            "houses": tema["houses"],
            "aspects": tema["aspects"],
            "ascendant": {"longitude": tema["ascendant"]},
            "mc": {"longitude": tema["mc"]},
        },
        "transits": transits_data,
    }


# =========================================================
# TELEGRAM
# =========================================================
@app.post("/telegram/webhook")
async def telegram_webhook(request: Request):
    if not TELEGRAM_TOKEN or not TELEGRAM_API:
        raise HTTPException(status_code=500, detail="TELEGRAM_BOT_TOKEN non configurato")

    update = await request.json()
    message = update.get("message") or update.get("edited_message")
    if not message:
        return {"ok": True}

    chat_id = message["chat"]["id"]
    text = (message.get("text") or "").strip()

    if text.startswith("/start"):
        parts = text.split(maxsplit=1)
        if len(parts) < 2:
            await send_telegram(
                chat_id,
                "Ciao! Per attivare il tuo oroscopo, apri il link che ti è stato dato dal sito Luna2."
            )
            return {"ok": True}

        token = parts[1].strip()
        nome = await link_telegram_account(chat_id, token)

        if nome:
            await send_telegram(
                chat_id,
                f"Benvenuto <b>{nome}</b>! 🌙\n\n"
                f"Il tuo profilo è collegato correttamente.\n"
                f"Da ora riceverai qui il tuo oroscopo.\n\n"
                f"🌐 Sito: {SITE_URL}\n\n"
                f"Comandi disponibili:\n"
                f"/stop — disattiva le notifiche"
            )
        else:
            await send_telegram(
                chat_id,
                "Non ho trovato il tuo profilo. Apri di nuovo il sito Luna2 e rifai l'iscrizione."
            )
        return {"ok": True}

    if text == "/stop":
        await unlink_telegram_account(chat_id)
        await send_telegram(chat_id, "Va bene, non riceverai più messaggi. Usa /start TOKEN per riattivare.")
        return {"ok": True}

    await send_telegram(chat_id, "Comando non riconosciuto. Usa /start o /stop.")
    return {"ok": True}


async def send_telegram(chat_id, text):
    if not TELEGRAM_API:
        return
    async with httpx.AsyncClient(timeout=10) as client:
        await client.post(f"{TELEGRAM_API}/sendMessage", json={
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML",
        })


async def link_telegram_account(chat_id, token):
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    try:
        res = sb.table("profiles").select("id, nome").eq("access_token", token).execute()
        if not res.data:
            return None
        nome = res.data[0]["nome"]
        sb.table("profiles").update({"telegram_id": str(chat_id)}).eq("access_token", token).execute()
        return nome
    except Exception:
        return None


async def unlink_telegram_account(chat_id):
    if not SUPABASE_URL or not SUPABASE_KEY:
        return
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    try:
        sb.table("profiles").update({"telegram_id": None}).eq("telegram_id", str(chat_id)).execute()
    except Exception:
        pass


@app.get("/telegram/set-webhook")
async def set_telegram_webhook():
    if not TELEGRAM_TOKEN or not TELEGRAM_API:
        return {"ok": False, "error": "TELEGRAM_BOT_TOKEN non configurato su Render"}
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(f"{TELEGRAM_API}/setWebhook", json={
            "url": "https://luna2-api.onrender.com/telegram/webhook"
        })
    return r.json()


@app.get("/telegram/webhook-info")
async def webhook_info():
    if not TELEGRAM_TOKEN or not TELEGRAM_API:
        return {"ok": False, "error": "TELEGRAM_BOT_TOKEN non configurato"}
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(f"{TELEGRAM_API}/getWebhookInfo")
    return r.json()
