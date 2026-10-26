import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from supabase import create_client

from ai import _chiama_ai

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

class SognoRequest(BaseModel):
    sogno: str

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

    # Controlla se ha già usato il sogno gratuito questa settimana
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
