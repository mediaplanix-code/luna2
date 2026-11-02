import os
from datetime import datetime
from weasyprint import HTML
from ai import _chiama_ai

async def genera_libro_completo(profile: dict, report: dict) -> str:
    """Genera il PDF del libro con tutti i contenuti del sito."""
    
    nome = profile.get("nome", "Cliente")
    data_nascita = str(profile.get("birth_date", ""))
    luogo_nascita = profile.get("birth_city", "")
    
    # 1. INTRODUZIONE
    prompt_intro = f"""Sei un'astrologa italiana. Scrivi l'introduzione per un libro astrologico personalizzato per {nome}, nato il {data_nascita} a {luogo_nascita}.
Tono: caldo, elegante, misterioso. Spiega che questo libro è un viaggio nel suo 2027.
Massimo 200 parole. Non usare markdown o asterischi."""
    intro = await _chiama_ai(prompt_intro, max_tokens=500) or "Benvenuto nel tuo viaggio astrale."

    # 2. PARTE I - IDENTITÀ
    riepilogo = report.get("riepilogo_testuale", "")
    prompt_identita = f"""Sei un'astrologa italiana. Scrivi la Parte I del libro di {nome}: "La Tua Identità Astrologica". 
Analizza il suo Sole, la sua Luna e il suo Ascendente.
Basati su questi dati: {riepilogo}
Tono: elegante, empatico. Massimo 400 parole. Non usare markdown."""
    identita = await _chiama_ai(prompt_identita, max_tokens=800) or "I tuoi pianeti raccontano una storia unica."

    # 3. PARTE II - LA CARTA (Pianeti e Case)
    # Creiamo una tabella HTML con i pianeti per il libro
    tabella_pianeti = "<table class='dati'><tr><th>Pianeta</th><th>Segno</th><th>Casa</th></tr>"
    for nome_p, dati_p in profile.get("planets", {}).items():
        casa = profile.get("planets_in_houses", {}).get(nome_p, "-")
        tabella_pianeti += f"<tr><td>{nome_p}</td><td>{dati_p.get('segno', '')}</td><td>{casa}ª</td></tr>"
    tabella_pianeti += "</table>"

    prompt_carta = f"""Sei un'astrologa italiana. Scrivi la Parte II del libro di {nome}: "La Struttura della Tua Carta Natale".
Spiega l'importanza delle case astrologiche e leggi la tabella dei suoi pianeti che trovi qui sotto.
Tono: profondo, didattico ma affascinante. Massimo 300 parole. Non usare markdown."""
    carta = await _chiama_ai(prompt_carta, max_tokens=600) or "Le tue case astrologiche rivelano i tuoi ambiti di vita."

    # 4. PARTE III - TRANSITI 2027
    transiti = report.get("transiti", [])
    transiti_testo = ""
    for t in transiti[:5]: # Prendiamo i primi 5 transiti
        transiti_testo += f"- {t.get('transito')} in {t.get('aspetto')} a {t.get('punto_natale')}\n"

    prompt_transiti = f"""Sei un'astrologa italiana. Scrivi la Parte III del libro di {nome}: "Il Tuo 2027: Il Quadro Generale".
Spiega i transiti lenti che lo aspettano quest'anno.
Ecco i transiti calcolati: {transiti_testo}
Tono: rassicurante, mai catastrofico. Massimo 400 parole. Non usare markdown."""
    transiti_2027 = await _chiama_ai(prompt_transiti, max_tokens=800) or "I transiti del 2027 ti guideranno attraverso nuove consapevolezze."

    # 5. COMPONIAMO L'HTML
    template_path = os.path.join(os.path.dirname(__file__), "template_libro.html")
    with open(template_path, "r", encoding="utf-8") as f:
        html_content = f.read()
        
    html_content = html_content.replace("{{NOME_CLIENTE}}", nome)
    
    corpo_libro = f"""
    <div class="capitolo">
        <h2>Introduzione</h2>
        <p class="intro">{intro}</p>
    </div>
    
    <div class="capitolo">
        <h2>Parte I - La Tua Identità Astrologica</h2>
        <p>{identita}</p>
    </div>
    
    <div class="capitolo">
        <h2>Parte II - La Struttura della Tua Carta</h2>
        <p>{carta}</p>
        {tabella_pianeti}
    </div>
    
    <div class="capitolo">
        <h2>Parte III - Il Tuo 2027</h2>
        <p>{transiti_2027}</p>
    </div>
    """
    
    html_content = html_content.replace("<!-- QUI L'AI INSERIRÀ I CAPITOLI -->", corpo_libro)
    
    nome_file = f"libro_{profile['id']}_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
    percorso_file = os.path.join("/tmp", nome_file)
    
    HTML(string=html_content).write_pdf(percorso_file)
    
    return percorso_file
