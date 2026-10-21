import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
import swisseph as swe
from supabase import create_client

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

PIANETI = {
    "Sole": swe.SUN, "Luna": swe.MOON, "Mercurio": swe.MERCURY,
    "Venere": swe.VENUS, "Marte": swe.MARS, "Giove": swe.JUPITER,
    "Saturno": swe.SATURN, "Urano": swe.URANUS, "Nettuno": swe.NEPTUNE,
    "Plutone": swe.PLUTO, "NodoNord": swe.TRUE_NODE, "Chirone": swe.CHIRON,
}

SEGNI = ["Ariete", "Toro", "Gemelli", "Cancro", "Leone", "Vergine",
         "Bilancia", "Scorpione", "Sagittario", "Capricorno", "Acquario", "Pesci"]

ASPETTI = {"congiunzione": (0, 8), "sestile": (60, 4), "quadratura": (90, 6), "trigono": (120, 6), "opposizione": (180, 8)}

class PersonaB(BaseModel):
    nome: str
    birth_date: str
    birth_time: str
    birth_lat: float
    birth_lon: float

def julian_day(date_str: str, time_str: str) -> float:
    try:
        dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
        return swe.julday(dt.year, dt.month, dt.day, dt.hour + dt.minute / 60 - 1.0)
    except Exception:
        return 0.0

def calcola_pianeti(jd: float) -> dict:
    planets = {}
    for nome, pid in PIANETI.items():
        try:
            res = swe.calc_ut(jd, pid)
            lon = res[0][0] if isinstance(res[0], tuple) else res[0]
            planets[nome] = round(lon % 360, 4)
        except Exception:
            continue
    return planets

@router.post("/compatibilita/{token}")
async def calcola_compatibilita(token: str, persona_b: PersonaB):
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(status_code=500, detail="Supabase non configurato")

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    res = sb.table("profiles").select("*").eq("access_token", token).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Profilo non trovato")
    persona_a = res.data[0]

    jd_a = julian_day(str(persona_a["birth_date"]), str(persona_a["birth_time"])[:5])
    jd_b = julian_day(persona_b.birth_date, persona_b.birth_time)

    if jd_a == 0.0 or jd_b == 0.0:
        raise HTTPException(status_code=400, detail="Date di nascita non valide.")

    tema_a = calcola_pianeti(jd_a)
    tema_b = calcola_pianeti(jd_b)

    aspetti = []
    punteggio_totale = 0

    for p_a, lon_a in tema_a.items():
        for p_b, lon_b in tema_b.items():
            diff = abs(lon_a - lon_b)
            diff = min(diff, 360 - diff)
            
            for nome_asp, (ang, orb) in ASPETTI.items():
                if abs(diff - ang) <= orb:
                    punteggio = 0
                    if nome_asp == "trigono": punteggio = 10
                    elif nome_asp == "sestile": punteggio = 8
                    elif nome_asp == "congiunzione": punteggio = 6
                    elif nome_asp == "quadratura": punteggio = 3
                    elif nome_asp == "opposizione": punteggio = 2
                    
                    aspetti.append({
                        "pianeta_a": p_a,
                        "pianeta_b": p_b,
                        "tipo": nome_asp,
                        "orb": round(abs(diff - ang), 2),
                        "punteggio": punteggio
                    })
                    punteggio_totale += punteggio

    if aspetti:
        media = punteggio_totale / len(aspetti)
        percentuale = min(100, int(50 + (media * 5)))
    else:
        percentuale = 50

    aspetti.sort(key=lambda x: x["punteggio"], reverse=True)

    segno_a = SEGNI[int(tema_a["Sole"] // 30)]
    segno_b = SEGNI[int(tema_b["Sole"] // 30)]

    pianeti_b = {}
    for nome, lon in tema_b.items():
        segno_idx = int(lon // 30)
        pianeti_b[nome] = {
            "longitude": lon,
            "segno": SEGNI[segno_idx],
            "grado": round(lon % 30, 2)
        }

    usate = persona_a.get("compatibilita_usate", 0) or 0
    sb.table("profiles").update({"compatibilita_usate": usate + 1}).eq("id", persona_a["id"]).execute()

    testi = {
        "amore": "La sinastria mostra una connessione significativa tra i vostri corpi celesti, con un'energia che può favorire l'intesa emotiva." if any(a["pianeta_a"] in ["Venere", "Luna"] or a["pianeta_b"] in ["Venere", "Luna"] for a in aspetti) else "Non ci sono aspetti dominanti tra i pianeti dell'amore, il che indica un legame che si costruisce con il tempo e la comprensione.",
        "lavoro": "I vostri pianeti indicano una buona collaborazione e un sostegno reciproco nelle attività pratiche." if any(a["pianeta_a"] in ["Sole", "Saturno"] or a["pianeta_b"] in ["Sole", "Saturno"] for a in aspetti) else "Le energie professionali richiedono struttura e chiarezza per esprimersi al meglio.",
        "salute": "Il vostro legame può essere un rifugio e una fonte di energia, aiutandovi a gestire lo stress." if any(a["pianeta_a"] in ["Luna", "Nettuno"] or a["pianeta_b"] in ["Luna", "Nettuno"] for a in aspetti) else "Le energie vitali si sostengono a vicenda, ma richiedono attenzione ai ritmi quotidiani.",
        "crescita": "La relazione stimola una profonda crescita personale e un senso di scopo condiviso." if any(a["pianeta_a"] in ["NodoNord", "Saturno"] or a["pianeta_b"] in ["NodoNord", "Saturno"] for a in aspetti) else "Il vostro cammino di crescita è personale e si arricchisce attraverso il confronto.",
        "previsioni": "I transiti futuri indicano un periodo di espansione e nuove opportunità per la coppia." if percentuale > 50 else "I transiti futuri richiedono pazienza e capacità di adattamento.",
    }

    link_contesto = {
        "generico": {"chat": f"/chat?focus=compatibilita", "voce": f"/consulenza?focus=compatibilita"},
        "amore": {"chat": f"/chat?focus=compatibilita_amore", "voce": f"/consulenza?focus=compatibilita_amore"},
        "lavoro": {"chat": f"/chat?focus=compatibilita_lavoro", "voce": f"/consulenza?focus=compatibilita_lavoro"},
        "salute": {"chat": f"/chat?focus=compatibilita_salute", "voce": f"/consulenza?focus=compatibilita_salute"},
        "crescita": {"chat": f"/chat?focus=compatibilita_crescita", "voce": f"/consulenza?focus=compatibilita_crescita"},
        "previsioni": {"chat": f"/chat?focus=compatibilita_previsioni", "voce": f"/consulenza?focus=compatibilita_previsioni"},
    }

    risultato = {
        "persona_a": persona_a["nome"],
        "persona_b": persona_b.nome,
        "segno_a": segno_a,
        "segno_b": segno_b,
        "percentuale": percentuale,
        "pianeti_b": pianeti_b,
        "aspetti": aspetti[:15],
        "totale_aspetti": len(aspetti),
        "testi": testi,
        "link": link_contesto
    }

    # Salva l'ultimo confronto nel profilo dell'utente
    sb.table("profiles").update({"ultima_compatibilita": risultato}).eq("id", persona_a["id"]).execute()

    return risultato
