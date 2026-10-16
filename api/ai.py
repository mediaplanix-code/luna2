# =========================================================
# LUNA2 — Integrazione AI (Groq + DeepSeek con fallback)
# Genera oroscopo settimanale, risposte chat, copione voce
# =========================================================

import os
import asyncio
import httpx

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
AI_PROVIDER = os.getenv("AI_PROVIDER", "groq")

# Provider primario: Groq (velocissimo, gratuito per il tuo volume)
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODELLO = "llama-3.3-70b-versatile"

# Provider di riserva: DeepSeek (economico, affidabile)
DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"
DEEPSEEK_MODELLO = "deepseek-flash"


async def _chiama_provider(url: str, api_key: str, modello: str, prompt: str, max_tokens: int) -> str:
    """Chiama un provider OpenAI-compatibile e restituisce il testo."""
    if not api_key:
        return ""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": modello,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_tokens,
        "temperature": 0.7,
    }
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(url, headers=headers, json=body)
            if r.status_code != 200:
                return ""
            data = r.json()
            choices = data.get("choices", [])
            if not choices:
                return ""
            return choices[0].get("message", {}).get("content", "")
    except Exception:
        return ""


async def _chiama_ai(prompt: str, max_tokens: int = 800) -> str:
    """Prova Groq, poi DeepSeek. Se entrambi falliscono, stringa vuota."""
    # Tentativo 1: Groq
    risposta = await _chiama_provider(GROQ_URL, GROQ_API_KEY, GROQ_MODELLO, prompt, max_tokens)
    if risposta:
        return risposta

    # Tentativo 2: DeepSeek
    risposta = await _chiama_provider(DEEPSEEK_URL, DEEPSEEK_API_KEY, DEEPSEEK_MODELLO, prompt, max_tokens)
    if risposta:
        return risposta

    # Entrambi falliti: stringa vuota (il chiamante deciderà cosa fare)
    return ""


async def genera_oroscopo_settimanale(report: dict) -> str:
    riepilogo = report.get("riepilogo_testuale", "")
    nome = report.get("profile", {}).get("nome", "utente")

    prompt = f"""Sei un'astrologa italiana esperta. Scrivi l'oroscopo settimanale per {nome}, basandoti ESCLUSIVAMENTE sul report qui sotto. Non inventare nulla che non sia nel report. Tono: caldo, diretto, professionale, come se parlassi a tu per tu. Massimo 200 parole.

REPORT INTERNO:
{riepilogo}

Scrivi l'oroscopo settimanale. Inizia con una frase di saluto personalizzata. Poi 3-4 frasi sul tema principale della settimana, basandoti sui transiti attivi e sui settori toccati. Chiudi con una breve indicazione pratica."""

    return await _chiama_ai(prompt, max_tokens=800)


async def rispondi_chat(report: dict, domanda: str, storico: list) -> str:
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

    return await _chiama_ai(prompt, max_tokens=600)


async def genera_copione_voce(report: dict) -> str:
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
    return await _chiama_ai(prompt, max_tokens=900)
