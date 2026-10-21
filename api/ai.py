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
        "reasoning_effort": "low",
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

            choice = choices[0]
            finish_reason = choice.get("finish_reason", "sconosciuto")
            testo = choice.get("message", {}).get("content", "")
            
            if not testo:
                print(f"=== AI {nome}: contenuto vuoto. finish_reason: {finish_reason} ===")
                return ""

            return testo

    except Exception as e:
        print(f"=== AI {nome}: eccezione {type(e).__name__}: {e} ===")
        return ""


async def _chiama_ai(prompt: str, max_tokens: int = 800) -> str:
    risposta = await _chiama_provider("GROQ", GROQ_URL, GROQ_API_KEY, GROQ_MODELLO, prompt, max_tokens)
    if risposta:
        return risposta

    print("=== AI: riprovo Groq una seconda volta ===")
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

    return await _chiama_ai(prompt, max_tokens=800)


async def rispondi_chat(report: dict, domanda: str, storico: list) -> str:
    riepilogo = report.get("riepilogo_testuale", "")
    nome = report.get("profile", {}).get("nome", "utente")

    storico_testo = ""
    for m in storico[-6:]:
        ruolo = "Utente" if m.get("role") == "user" else "Astrologa"
        storico_testo += f"{ruolo}: {m.get('content', '')}\n"

    prompt = f"""Sei un'astrologa italiana esperta, stai parlando con {nome}. Rispondi alla sua domanda basandoti ESCLUSIVAMENTE sul report interno qui sotto.
REGOLE TASSATIVE:
- Massimo 70 parole.
- Tono: caldo, diretto, professionale.
- NON usare MAI asterischi o markdown, solo testo fluido.
- Dai una risposta soddisfacente ma NON spiegare TUTTO. Lascia un velo di mistero.
- Chiudi sempre con una frase che suggerisce che c'è un livello più profondo da scoprire.

REPORT INTERNO:
{riepilogo}

CONVERSAZIONE PRECEDENTE:
{storico_testo}

DOMANDA DI {nome}:
{domanda}

Rispondi come astrologa."""

    return await _chiama_ai(prompt, max_tokens=600)


async def rispondi_chat_compatibilita(dati_compatibilita: dict, focus: str, domanda: str, storico: list) -> str:
    nome_a = dati_compatibilita.get("persona_a", "Utente")
    nome_b = dati_compatibilita.get("persona_b", "l'altra persona")
    
    aspetti_testo = ""
    for a in dati_compatibilita.get("aspetti", []):
        aspetti_testo += f"- {a['pianeta_a']} {a['tipo']} {a['pianeta_b']} (orbe {a['orb']}°)\n"

    if focus == "amore":
        istruzione_focus = f"Stai parlando SOLO ed ESCLUSIVAMENTE della compatibilità AMOROSA tra {nome_a} e {nome_b}. Analizza gli aspetti tra Venere, Marte e Luna. Non parlare di lavoro, salute o altri argomenti."
    elif focus == "lavoro":
        istruzione_focus = f"Stai parlando SOLO ed ESCLUSIVAMENTE della compatibilità LAVORATIVA tra {nome_a} e {nome_b}. Analizza gli aspetti tra Sole, Saturno e Mercurio. Non parlare di amore, salute o altri argomenti."
    elif focus == "salute":
        istruzione_focus = f"Stai parlando SOLO ed ESCLUSIVAMENTE della compatibilità relativa alla SALUTE e al BENESSERE tra {nome_a} e {nome_b}. Analizza gli aspetti tra Luna, Nettuno e gli altri pianeti. Non parlare di amore, lavoro o altri argomenti."
    elif focus == "crescita":
        istruzione_focus = f"Stai parlando SOLO ed ESCLUSIVAMENTE della CRESCITA PERSONALE e del CAMMINO KARMICO tra {nome_a} e {nome_b}. Analizza gli aspetti tra NodoNord, Saturno e gli altri pianeti. Non parlare di amore, lavoro o altri argomenti."
    elif focus == "previsioni":
        istruzione_focus = f"Stai parlando SOLO ed ESCLUSIVAMENTE delle PREVISIONI e dei TRANSITI per questa coppia. Analizza gli aspetti e spiega cosa possono aspettarsi nei prossimi mesi. Non parlare di amore, lavoro o altri argomenti."
    else:
        istruzione_focus = f"Stai parlando della COMPATIBILITÀ GENERALE tra {nome_a} e {nome_b}. Analizza i loro aspetti e spiega cosa significano per la loro relazione."

    storico_testo = ""
    for m in storico[-6:]:
        ruolo = "Utente" if m.get("role") == "user" else "Astrologa"
        storico_testo += f"{ruolo}: {m.get('content', '')}\n"

    prompt = f"""Sei un'astrologa italiana esperta di sinastria. Stai parlando con {nome_a} riguardo alla sua compatibilità con {nome_b}.

{istruzione_focus}

REGOLE TASSATIVE:
- Massimo 70 parole.
- Tono: caldo, diretto, professionale.
- NON usare MAI asterischi o markdown, solo testo fluido.
- Dai una risposta soddisfacente ma NON spiegare TUTTO. Lascia un velo di mistero.
- Chiudi sempre con una frase che suggerisce che c'è un livello più profondo da scoprire.

Ecco i dati tecnici del loro confronto (ASPETTI):
{aspetti_testo}

CONVERSAZIONE PRECEDENTE:
{storico_testo}

DOMANDA DI {nome_a}:
{domanda}

Rispondi come astrologa."""

    return await _chiama_ai(prompt, max_tokens=600)


async def rispondi_chat_tema(report: dict, focus: str, domanda: str, storico: list) -> str:
    riepilogo = report.get("riepilogo_testuale", "")
    nome = report.get("profile", {}).get("nome", "utente")

    if focus == "amore":
        istruzione_focus = "Stai parlando SOLO ed ESCLUSIVAMENTE della vita AMOROSA e delle RELAZIONI. Analizza Venere, Marte e Luna nel tema natale. Non divagare."
    elif focus == "lavoro":
        istruzione_focus = "Stai parlando SOLO ed ESCLUSIVAMENTE del LAVORO, CARRIERA e FINANZE. Analizza la Decima Casa, Saturno e Mercurio. Non divagare."
    elif focus == "salute":
        istruzione_focus = "Stai parlando SOLO ed ESCLUSIVAMENTE della SALUTE e del BENESSERE. Analizza la Sesta Casa, Luna e Nettuno. Non divagare."
    elif focus == "crescita":
        istruzione_focus = "Stai parlando SOLO ed ESCLUSIVAMENTE della CRESCITA PERSONALE e del CAMMINO KARMICO. Analizza il Nodo Nord e Saturno. Non divagare."
    elif focus == "previsioni":
        istruzione_focus = "Stai parlando SOLO ed ESCLUSIVAMENTE delle PREVISIONI per i prossimi mesi. Analizza i transiti lenti. Non divagare."
    else:
        istruzione_focus = "Stai parlando del tema natale in generale."

    storico_testo = ""
    for m in storico[-6:]:
        ruolo = "Utente" if m.get("role") == "user" else "Astrologa"
        storico_testo += f"{ruolo}: {m.get('content', '')}\n"

    prompt = f"""Sei un'astrologa italiana esperta. Stai parlando con {nome}.

{istruzione_focus}

REGOLE TASSATIVE:
- Massimo 70 parole.
- Tono: caldo, diretto, professionale.
- NON usare MAI asterischi o markdown, solo testo fluido.
- Dai una risposta soddisfacente ma NON spiegare TUTTO. Lascia un velo di mistero.
- Chiudi sempre con una frase che suggerisce che c'è un livello più profondo da scoprire.

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
    return await _chiama_ai(prompt, max_tokens=1000)


async def genera_copione_voce_compatibilita(dati_compatibilita: dict, focus: str) -> str:
    nome_a = dati_compatibilita.get("persona_a", "Utente")
    nome_b = dati_compatibilita.get("persona_b", "l'altra persona")
    
    aspetti_testo = ""
    for a in dati_compatibilita.get("aspetti", []):
        aspetti_testo += f"- {a['pianeta_a']} {a['tipo']} {a['pianeta_b']} (orbe {a['orb']}°)\n"

    if focus == "amore":
        istruzione_focus = f"Stai per parlare al telefono con {nome_a} della sua compatibilità AMOROSA con {nome_b}. Apri la conversazione parlando degli aspetti tra Venere, Marte e Luna."
    elif focus == "lavoro":
        istruzione_focus = f"Stai per parlare al telefono con {nome_a} della sua compatibilità LAVORATIVA con {nome_b}. Apri la conversazione parlando degli aspetti tra Sole, Saturno e Mercurio."
    elif focus == "salute":
        istruzione_focus = f"Stai per parlare al telefono con {nome_a} della compatibilità relativa alla SALUTE con {nome_b}. Apri la conversazione parlando degli aspetti tra Luna e Nettuno."
    elif focus == "crescita":
        istruzione_focus = f"Stai per parlare al telefono con {nome_a} della CRESCITA PERSONALE legata a {nome_b}. Apri la conversazione parlando degli aspetti tra NodoNord e Saturno."
    elif focus == "previsioni":
        istruzione_focus = f"Stai per parlare al telefono con {nome_a} delle PREVISIONI per la coppia con {nome_b}. Apri la conversazione parlando dei transiti futuri."
    else:
        istruzione_focus = f"Stai per parlare al telefono con {nome_a} della sua COMPATIBILITÀ GENERALE con {nome_b}."

    prompt = f"""{istruzione_focus}

Ecco i dati tecnici del loro confronto:
{aspetti_testo}

Scrivi il copione di apertura (circa 2 minuti). Tono: caldo, diretto, mistico ma professionale. Non usare asterischi o markdown. Struttura:

1. Saluto personalizzato
2. Introduzione all'argomento specifico
3. Apertura alla conversazione ("dimmi cosa ti risuona di più")

Scrivi il copione."""

    return await _chiama_ai(prompt, max_tokens=800)


async def genera_settori_tema(report: dict) -> dict:
    """Genera le brevi descrizioni per i 5 settori del tema natale."""
    riepilogo = report.get("riepilogo_testuale", "")

    prompt = f"""Sei un'astrologa italiana esperta. Basandoti sul tema natale qui sotto, scrivi 5 brevi descrizioni (massimo 25 parole ciascuna) per i seguenti 5 argomenti:
1. Amore e Relazioni
2. Carriera e Finanze
3. Salute e Benessere
4. Crescita Personale
5. Previsioni Annuali

REGOLE TASSATIVE:
- Per ogni argomento, scrivi 2-3 frasi che incuriosiscano.
- NON spiegare tutto. Lascia un velo di mistero.
- Tono: caldo, diretto.
- Non usare mai asterischi o markdown.

REPORT INTERNO:
{riepilogo}

Rispondi con questo formato esatto (senza altro testo):
AMORE: [testo]
LAVORO: [testo]
SALUTE: [testo]
CRESCITA: [testo]
PREVISIONI: [testo]"""

    risposta = await _chiama_ai(prompt, max_tokens=500)
    
    # Parser semplice della risposta
    testi = {"amore": "", "lavoro": "", "salute": "", "crescita": "", "previsioni": ""}
    for riga in risposta.split("\n"):
        if riga.startswith("AMORE:"):
            testi["amore"] = riga.replace("AMORE:", "").strip()
        elif riga.startswith("LAVORO:"):
            testi["lavoro"] = riga.replace("LAVORO:", "").strip()
        elif riga.startswith("SALUTE:"):
            testi["salute"] = riga.replace("SALUTE:", "").strip()
        elif riga.startswith("CRESCITA:"):
            testi["crescita"] = riga.replace("CRESCITA:", "").strip()
        elif riga.startswith("PREVISIONI:"):
            testi["previsioni"] = riga.replace("PREVISIONI:", "").strip()

    return testi


async def genera_copione_voce_tema(report: dict, focus: str) -> str:
    riepilogo = report.get("riepilogo_testuale", "")
    nome = report.get("profile", {}).get("nome", "utente")

    if focus == "amore":
        istruzione_focus = "Stai per parlare al telefono con {nome} della sua vita AMOROSA. Apri la conversazione parlando di Venere, Marte e Luna."
    elif focus == "lavoro":
        istruzione_focus = "Stai per parlare al telefono con {nome} del suo LAVORO e delle sue FINANZE. Apri la conversazione parlando della Decima Casa e di Saturno."
    elif focus == "salute":
        istruzione_focus = "Stai per parlare al telefono con {nome} della sua SALUTE e del suo BENESSERE. Apri la conversazione parlando della Sesta Casa e della Luna."
    elif focus == "crescita":
        istruzione_focus = "Stai per parlare al telefono con {nome} della sua CRESCITA PERSONALE. Apri la conversazione parlando del Nodo Nord e di Saturno."
    elif focus == "previsioni":
        istruzione_focus = "Stai per parlare al telefono con {nome} delle PREVISIONI per i prossimi mesi. Apri la conversazione parlando dei transiti."
    else:
        istruzione_focus = "Stai per parlare al telefono con {nome} del suo tema natale."

    prompt = f"""{istruzione_focus.format(nome=nome)}

REPORT INTERNO:
{riepilogo}

Scrivi il copione di apertura (circa 2 minuti). Tono: caldo, diretto, mistico ma professionale. Non usare asterischi o markdown. Struttura:

1. Saluto personalizzato
2. Introduzione all'argomento specifico
3. Apertura alla conversazione ("dimmi cosa ti risuona di più")

Scrivi il copione."""

    return await _chiama_ai(prompt, max_tokens=800)
