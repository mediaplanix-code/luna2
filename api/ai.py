# =========================================================
# LUNA2 — Integrazione AI (Google Gemini Flash)
# Genera oroscopo settimanale, risposte chat, copione voce
# =========================================================

import os
import asyncio
import httpx

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MODELLO = "gemini-3.8-flash"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODELLO}:generateContent"


async def _chiama_gemini(prompt: str, max_tokens: int = 800) -> str:
    """Chiama Gemini Flash con retry automatico su 503 / 429 / 500."""
    if not GEMINI_API_KEY:
        return "ERRORE: GEMINI_API_KEY non configurata"

    url = f"{GEMINI_URL}?key={GEMINI_API_KEY}"
    body = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "thinkingConfig": {
                "thinkingLevel": "low"
            },
            "maxOutputTokens": max_tokens,
        }
    }

    tentativi = 3
    attesa = [1, 3, 6]  # secondi tra i tentativi

    for i in range(tentativi):
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                r = await client.post(url, json=body)

                # Retry su errori temporanei
                if r.status_code in (429, 500, 503):
                    if i < tentativi - 1:
                        await asyncio.sleep(attesa[i])
                        continue
                    return "Il servizio è momentaneamente sovraccarico. Riprova tra qualche minuto."

                try:
                    data = r.json()
                except Exception:
                    return f"ERRORE Gemini ({r.status_code}): risposta non JSON"

                if r.status_code != 200:
                    return f"ERRORE Gemini ({r.status_code}): {data}"

                candidates = data.get("candidates", [])
                if not candidates:
                    return "Nessuna risposta generata. Riprova."

                parts = candidates[0].get("content", {}).get("parts", [])
                if not parts:
                    finish = candidates[0].get("finishReason", "sconosciuto")
                    return f"Risposta vuota (motivo: {finish}). Riprova."

                return parts[0].get("text", "")

        except httpx.TimeoutException:
            if i < tentativi - 1:
                await asyncio.sleep(attesa[i])
                continue
            return "Il servizio sta impiegando troppo tempo. Riprova tra poco."
        except httpx.ConnectError:
            if i < tentativi - 1:
                await asyncio.sleep(attesa[i])
                continue
            return "Problema di connessione al servizio. Riprova tra poco."
        except Exception as e:
            return f"ERRORE: {type(e).__name__}"

    return "Servizio momentaneamente non disponibile. Riprova tra qualche minuto."


async def genera_oroscopo_settimanale(report: dict) -> str:
    """Genera l'oroscopo settimanale partendo dal report interno."""
    riepilogo = report.get("riepilogo_testuale", "")
    nome = report.get("profile", {}).get("nome", "utente")

    prompt = f"""Sei un'astrologa italiana esperta. Scrivi l'oroscopo settimanale per {nome}, basandoti ESCLUSIVAMENTE sul report qui sotto. Non inventare nulla che non sia nel report. Tono: caldo, diretto, professionale, come se parlassi a tu per tu. Massimo 200 parole.

REPORT INTERNO:
{riepilogo}

Scrivi l'oroscopo settimanale. Inizia con una frase di saluto personalizzata. Poi 3-4 frasi sul tema principale della settimana, basandoti sui transiti attivi e sui settori toccati. Chiudi con una breve indicazione pratica."""

    return await _chiama_gemini(prompt, max_tokens=800)


async def rispondi_chat(report: dict, domanda: str, storico: list) -> str:
    """Risponde a una domanda dell'utente nella chat."""
    riepilogo = report.get("riepilogo_testuale", "")
    nome = report.get("profile", {}).get("nome", "utente")

    storico_testo = ""
    for m in storico[-6:]:
        ruolo = "Utente" if m.get("role") == "user" else "Astrologa"
        storico_testo += f"{ruolo}: {m.get('content', '')}\n"

    prompt = f"""Sei un'astrologa italiana esperta, stai parlando con {nome}. Rispondi alla sua domanda basandoti ESCLUSIVAMENTE sul report interno qui sotto. Non inventare nulla. Se la domanda esce dal tema natale e dai transiti, riportala con gentilezza ai dati che hai. Tono: caldo, diretto, professionale. Massimo 150 parole.

REPORT INTERNO:
{riepilogo}

CONVERSAZIONE PRECEDENTE:
{storico_testo}

DOMANDA DI {nome}:
{domanda}

Rispondi come astrologa."""

    return await _chiama_gemini(prompt, max_tokens=600)


async def genera_copione_voce(report: dict) -> str:
    """Genera un copione che l'AI vocale leggerà nella sessione telefonica."""
    riepilogo = report.get("riepilogo_testuale", "")
    nome = report.get("profile", {}).get("nome", "utente")

    prompt = f"""Sei un'astrologa italiana. Stai per parlare al telefono con {nome} per 15 minuti. Basandoti ESCLUSIVAMENTE sul report qui sotto, scrivi un copione di apertura che duri circa 2 minuti. Tono: caldo, diretto, mistico ma professionale. Non inventare nulla. Struttura:

1. Saluto personalizzato con il nome
2. I 3 pilastri del tema natale (Sole, Luna, Ascendente) in 2-3 frasi
3. Il transito più importante dei prossimi mesi e cosa significa
4. Apertura alla conversazione ("dimmi cosa ti risuona di più")

REPORT INTERNO:
{riepilogo}

Scrivi il copione di apertura."""
    return await _chiama_gemini(prompt, max_tokens=900)
