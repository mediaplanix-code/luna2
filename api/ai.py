# =========================================================
# LUNA2 — Integrazione AI (Groq + DeepSeek con fallback)
# =========================================================

import os
import asyncio
import httpx

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
AI_PROVIDER = os.getenv("AI_PROVIDER", "groq")

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODELLO = "openai/gpt-oss-120b"

DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"
DEEPSEEK_MODELLO = "deepseek-chat"


async def _chiama_provider(nome: str, url: str, api_key: str, modello: str, prompt: str, max_tokens: int) -> str:
    if not api_key:
        print(f"=== AI {nome}: API key mancante ===")
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
            print(f"=== AI {nome}: HTTP {r.status_code} (modello: {modello}) ===")

            if r.status_code != 200:
                try:
                    print(f"=== AI {nome} errore: {r.text[:500]} ===")
                except Exception:
                    pass
                return ""

            data = r.json()
            choices = data.get("choices", [])
            if not choices:
                return ""

            testo = choices[0].get("message", {}).get("content", "")
            if not testo:
                return ""

            return testo

    except Exception as e:
        print(f"=== AI {nome}: eccezione {type(e).__name__}: {e} ===")
        return ""


async def _chiama_ai(prompt: str, max_tokens: int = 800) -> str:
    risposta = await _chiama_provider("GROQ", GROQ_URL, GROQ_API_KEY, GROQ_MODELLO, prompt, max_tokens)
    if risposta:
        return risposta

    risposta = await _chiama_provider("DEEPSEEK", DEEPSEEK_URL, DEEPSEEK_API_KEY, DEEPSEEK_MODELLO, prompt, max_tokens)
    if risposta:
        return risposta

    return ""


async def genera_oroscopo_settimanale(report: dict) -> str:
    riepilogo = report.get("riepilogo_testuale", "")
    nome = report.get("profile", {}).get("nome", "utente")

    prompt = f"""Sei un'astrologa italiana esperta. Scrivi un biglietto di auguri astrologico per {nome}.
REGOLE TASSATIVE:
- Massimo 80 parole.
- Tono: caldo, diretto, come se fossi una cara amica che ne sa di stelle.
- NON usare MAI asterischi, markdown o elenchi puntati. Scrivi solo testo fluido.
- Non dare spiegazioni tecniche, usa un linguaggio semplice.
- Parla dell'energia della settimana basandoti ESCLUSIVAMENTE su questo report:

{riepilogo}

Scrivi il testo. Inizia con "Ciao {nome}," e poi 2-3 frasi."""

    return await _chiama_ai(prompt, max_tokens=200)


async def rispondi_chat(report: dict, domanda: str, storico: list) -> str:
    riepilogo = report.get("riepilogo_testuale", "")
    nome = report.get("profile", {}).get("nome", "utente")

    storico_testo = ""
    for m in storico[-6:]:
        ruolo = "Utente" if m.get("role") == "user" else "Astrologa"
        storico_testo += f"{ruolo}: {m.get('content', '')}\n"

    prompt = f"""Sei un'astrologa italiana esperta, stai parlando con {nome}. Rispondi alla sua domanda basandoti ESCLUSIVAMENTE sul report interno qui sotto. Non inventare nulla. Se la domanda esce dal tema natale e dai transiti, riportala con gentilezza ai dati che hai. Tono: caldo, diretto, professionale. Massimo 150 parole. NON usare mai asterischi o markdown, solo testo fluido.

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

    prompt = f"""Sei un'astrologa italiana. Stai per parlare al telefono con {nome} per 15 minuti. Basandoti ESCLUSIVAMENTE sul report qui sotto, scrivi un copione di apertura che duri circa 2 minuti. Tono: caldo, diretto, mistico ma professionale. Non inventare nulla. Non usare asterischi o markdown. Struttura:

1. Saluto personalizzato con il nome
2. I 3 pilastri del tema natale (Sole, Luna, Ascendente) in 2-3 frasi
3. Il transito più importante dei prossimi mesi e cosa significa
4. Apertura alla conversazione ("dimmi cosa ti risuona di più")

REPORT INTERNO:
{riepilogo}

Scrivi il copione di apertura."""
    return await _chiama_ai(prompt, max_tokens=900)
