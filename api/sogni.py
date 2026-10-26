import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
from supabase import create_client

from ai import _chiama_ai

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")


class SognoRequest(BaseModel):
    sogno: str


def _calcola_contesto_natale(profile: dict) -> str:
    try:
        from main import calcola_tema_completo, lon_to_sign
        tema = calcola_tema_completo(
            str(profile["birth_date"]),
            str(profile["birth_time"])[:5],
            float(profile["birth_lat"]),
            float(profile["birth_lon"]),
            1.0,
        )
        pianeti = tema.get("planets", {})
        case = tema.get("planets_in_houses", {})
        righe = []
        for nome_p in ["Sole", "Luna", "Mercurio", "Venere", "Marte", "Giove", "Saturno", "Urano", "Nettuno", "Plutone"]:
            p = pianeti.get(nome_p)
            if not p:
                continue
            casa = case.get(nome_p)
            riga = f"- {nome_p} in {p['segno']}"
            if casa:
                riga += f" in {casa}ª casa"
            righe.append(riga)
        asc = tema.get("ascendant")
        if asc is not None:
            asc_s = lon_to_sign(asc)
            righe.append(f"- Ascendente in {asc_s['segno']}")
        return "\n".join(righe)
    except Exception as e:
        print(f"=== Errore contesto natale sogno: {e} ===")
        return ""


@router.post("/sogni/{token}")
async def interpreta_sogno(token: str, req: SognoRequest):
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(status_code=500, detail="Supabase non configurato")

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    res = sb.table("profiles").select("*").eq("access_token", token).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Profilo non trovato")

    profile = res.data[0]
    nome = profile.get("nome", "")
    ultimo_sogno = profile.get("ultimo_sogno_gratuito")
    adesso = datetime.now(timezone.utc)

    if ultimo_sogno:
        dt_ultimo = datetime.fromisoformat(ultimo_sogno.replace("Z", "+00:00"))
        if (adesso - dt_ultimo).days < 7:
            raise HTTPException(
                status_code=402,
                detail="Hai già usato il sogno gratuito questa settimana. Per approfondire, prenota un consulto vocale (19€)."
            )

    sogno = req.sogno.strip()
    if not sogno:
        raise HTTPException(status_code=400, detail="Scrivi il tuo sogno.")

    contesto_natale = _calcola_contesto_natale(profile)

    if contesto_natale:
        prompt = f"""Sei Luna, un'astrologa e interprete dei sogni italiana. L'utente si chiama {nome}.
Analizza questo sogno in modo simbolico, caldo e personale, LEGGENDOLO ATTRAVERSO il suo tema natale reale (sotto riportato).
Non essere freudiano o tecnico. Massimo 150 parole. NON usare asterischi o markdown. Scrivi solo testo fluido.
Collega esplicitamente almeno 1-2 simboli del sogno ai suoi pianeti o case (es. Luna, Nettuno, 12ª casa, Plutone, 4ª casa).
Chiudi con una frase che lascia intendere che c'è un livello più profondo da scoprire con un consulto.

PUNTI NATALI RILEVANTI PER I SOGNI:
{contesto_natale}

SOGNO:
{sogno}

Interpretazione:"""
    else:
        prompt = f"""Sei Luna, un'astrologa e interprete dei sogni italiana. L'utente si chiama {nome}.
Analizza questo sogno in modo simbolico, caldo e personale, senza essere freudiano o tecnico.
Massimo 150 parole. NON usare asterischi o markdown. Scrivi solo testo fluido.
Chiudi con una frase che lascia intendere che c'è un livello più profondo da scoprire con un consulto.

SOGNO:
{sogno}

Interpretazione:"""

    risposta = await _chiama_ai(prompt, max_tokens=600)

    if not risposta:
        raise HTTPException(status_code=503, detail="L'interpretazione non è disponibile. Riprova più tardi.")

    sb.table("profiles").update({"ultimo_sogno_gratuito": adesso.isoformat()}).eq("id", profile["id"]).execute()

    return {"interpretazione": risposta, "nome": nome}
