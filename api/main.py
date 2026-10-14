# =========================================================
# LUNA2 — Microservizio calcoli astrologici
# Swiss Ephemeris + FastAPI
# =========================================================

import os
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import swisseph as swe

app = FastAPI(title="Luna2 Astro API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # in produzione limitare al dominio
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# Configurazione Swiss Ephemeris
# ---------------------------------------------------------
EPHE_PATH = os.getenv("SE_EPHE_PATH", "/app/ephe")
if os.path.isdir(EPHE_PATH):
    swe.set_ephe_path(EPHE_PATH)

# Pianeti da calcolare
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

# Aspetti maggiori (gradi, orb)
ASPETTI = {
    "congiunzione": (0, 8),
    "sestile":      (60, 4),
    "quadratura":   (90, 6),
    "trigono":      (120, 6),
    "opposizione":  (180, 8),
}

# ---------------------------------------------------------
# Modelli input
# ---------------------------------------------------------
class BirthData(BaseModel):
    date: str = Field(..., description="YYYY-MM-DD")
    time: str = Field(..., description="HH:MM")
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    tz_offset: float = Field(1.0, description="Offset UTC in ore (es. Italia estivo=2.0)")

# ---------------------------------------------------------
# Utility
# ---------------------------------------------------------
def lon_to_sign(lon: float) -> dict:
    """Converte longitudine eclittica 0-360 in segno + grado."""
    lon = lon % 360
    segno_idx = int(lon // 30)
    grado = lon % 30
    return {
        "longitude": round(lon, 4),
        "segno": SEGNI[segno_idx],
        "grado": round(grado, 2),
    }

def compute_aspects(planets: dict) -> list:
    """Calcola aspetti tra tutti i pianeti."""
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
                        "esatto_gradi": round(diff, 2),
                    })
    return out

def julian_day_from_local(date_str: str, time_str: str, tz_offset: float) -> float:
    """Calcola il giorno giuliano in UT."""
    dt_local = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
    ut_hour = dt_local.hour + dt_local.minute / 60 - tz_offset
    return swe.julday(dt_local.year, dt_local.month, dt_local.day, ut_hour)

# ---------------------------------------------------------
# Endpoint: health check
# ---------------------------------------------------------
@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "Luna2 Astro API",
        "version": "0.1.0",
    }

# ---------------------------------------------------------
# Endpoint: tema natale completo
# ---------------------------------------------------------
@app.post("/natal-chart")
def natal_chart(data: BirthData):
    try:
        jd = julian_day_from_local(data.date, data.time, data.tz_offset)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Data/ora non valide: {e}")

    # Pianeti
    planets = {}
    for nome, pid in PIANETI.items():
        try:
            xx, _ = swe.calc_ut(jd, pid)
            planets[nome] = lon_to_sign(xx[0])
        except Exception:
            continue

    # Case (Placidus)
    try:
        cusps, ascmc = swe.houses(jd, data.lat, data.lon, b'P')
        houses = [round(c, 4) for c in cusps]
        ascendant = round(ascmc[0], 4)
        mc = round(ascmc[1], 4)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore calcolo case: {e}")

    # Aspetti
    aspects = compute_aspects(planets)

    # Posizioni pianeti nelle case (quale pianeta in quale casa)
    planets_in_houses = {}
    for nome, p in planets.items():
        lon_p = p["longitude"]
        casa = None
        for k in range(12):
            c1 = houses[k]
            c2 = houses[(k + 1) % 12]
            if c1 <= c2:
                if c1 <= lon_p < c2:
                    casa = k + 1
                    break
            else:  # attraversa 0°
                if lon_p >= c1 or lon_p < c2:
                    casa = k + 1
                    break
        if casa:
            planets_in_houses[nome] = casa

    return {
        "input": data.model_dump(),
        "julian_day": round(jd, 6),
        "planets": planets,
        "houses": houses,
        "ascendant": lon_to_sign(ascendant),
        "mc": lon_to_sign(mc),
        "aspects": aspects,
        "planets_in_houses": planets_in_houses,
    }

# ---------------------------------------------------------
# Endpoint: transiti odierni rispetto a un tema natale
# ---------------------------------------------------------
class TransitRequest(BaseModel):
    date: str
    time: str
    lat: float
    lon: float
    tz_offset: float
    target_date: str | None = None  # se None, usa oggi

@app.post("/transits")
def transits(req: TransitRequest):
    # 1. Calcola il tema natale
    natal = natal_chart(BirthData(
        date=req.date, time=req.time,
        lat=req.lat, lon=req.lon, tz_offset=req.tz_offset
    ))

    # 2. Data target (oggi o specificata)
    if req.target_date:
        tgt = datetime.strptime(req.target_date, "%Y-%m-%d")
    else:
        tgt = datetime.now(timezone.utc)

    jd_today = swe.julday(tgt.year, tgt.month, tgt.day, 12.0)

    # 3. Posizioni attuali pianeti
    transits_now = {}
    for nome, pid in PIANETI.items():
        try:
            xx, _ = swe.calc_ut(jd_today, pid)
            transits_now[nome] = lon_to_sign(xx[0])
        except Exception:
            continue

    # 4. Aspetti transito ↔ natale
    aspetti_transito = []
    for t_nome, t_pos in transits_now.items():
        for n_nome, n_pos in natal["planets"].items():
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