import os
from datetime import datetime
from weasyprint import HTML
from ai import _chiama_ai

async def genera_libro_completo(profile: dict, report: dict) -> str:
    nome = profile.get("nome", "Cliente")
    data_nascita = str(profile.get("birth_date", ""))
    luogo_nascita = profile.get("birth_city", "")
    
    # --- 1. INTRO ---
    prompt_intro = f"Sei un'astrologa italiana. Scrivi l'introduzione del libro per {nome} (nato il {data_nascita} a {luogo_nascita}). Tono caldo e misterioso, max 200 parole."
    intro = await _chiama_ai(prompt_intro, max_tokens=500) or "Benvenuto."

    # --- 2. IDENTITÀ (con simboli) ---
    riepilogo = report.get("riepilogo_testuale", "")
    prompt_id = f"Scrivi la Parte I (Identità: Sole, Luna, Ascendente) per {nome}. Dati: {riepilogo}. Max 400 parole. Usa i simboli astrologici (☉ Luna ☽ Ascendente ↑) all'inizio dei paragrafi."
    identita = await _chiama_ai(prompt_id, max_tokens=800) or "La tua identità."

    # --- 3. CARTA NATALE (con tabella e ruota) ---
    tabella_pianeti = "<table class='dati'><tr><th>Pianeta</th><th>Segno</th><th>Casa</th></tr>"
    for nome_p, dati_p in profile.get("planets", {}).items():
        casa = profile.get("planets_in_houses", {}).get(nome_p, "-")
        # Simboli per i pianeti
        simboli = {"Sole": "☉", "Luna": "☽", "Mercurio": "☿", "Venere": "♀", "Marte": "♂", "Giove": "♃", "Saturno": "♄", "Urano": "♅", "Nettuno": "♆", "Plutone": "♇", "NodoNord": "☊", "Chirone": "⚷"}
        sym = simboli.get(nome_p, "✦")
        tabella_pianeti += f"<tr><td><span class='simbolo'>{sym}</span> {nome_p}</td><td>{dati_p.get('segno', '')}</td><td>{casa}ª</td></tr>"
    tabella_pianeti += "</table>"

    prompt_carta = f"Scrivi la Parte II (La Carta Natale) per {nome}. Spiega le case e i pianeti. Max 300 parole."
    carta = await _chiama_ai(prompt_carta, max_tokens=600) or "Le tue case."

    # --- 4. TRANSITI 2027 ---
    transiti = report.get("transiti", [])
    transiti_testo = "\n".join([f"- {t.get('transito')} in {t.get('aspetto')} a {t.get('punto_natale')}" for t in transiti[:5]])
    prompt_transiti = f"Scrivi la Parte III (Transiti 2027) per {nome}. Ecco i transiti: {transiti_testo}. Tono rassicurante. Max 400 parole."
    transiti_2027 = await _chiama_ai(prompt_transiti, max_tokens=800) or "I tuoi transiti."

    # --- 5. I 12 MESI (Generiamo un testo generico ma personalizzato per ogni mese) ---
    mesi_nomi = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]
    capitoli_mesi = ""
    
    for mese in mesi_nomi:
        prompt_mese = f"Scrivi il capitolo per il mese di {mese} 2027 per {nome}. Tono: ispirazionale, focalizzato sulle opportunità e sulla crescita. Max 150 parole."
        testo_mese = await _chiama_ai(prompt_mese, max_tokens=300) or f"Il mese di {mese} porta nuove energie."
        capitoli_mesi += f"""
        <div class="capitolo">
            <h2>{mese} 2027</h2>
            <p>{testo_mese}</p>
        </div>
        """

    # --- 6. AMBITI DI VITA ---
    ambiti = ["Amore e Relazioni", "Lavoro e Carriera", "Salute e Benessere", "Crescita Personale"]
    capitoli_ambiti = ""
    for ambito in ambiti:
        prompt_ambito = f"Scrivi un capitolo sull'ambito '{ambito}' per {nome} nel 2027. Tono: empatico e costruttivo. Max 200 parole."
        testo_ambito = await _chiama_ai(prompt_ambito, max_tokens=400) or f"L'ambito {ambito} è in evoluzione."
        capitoli_ambiti += f"""
        <div class="capitolo">
            <h2>{ambito}</h2>
            <p>{testo_ambito}</p>
        </div>
        """

    # --- 7. COMPONIAMO L'HTML ---
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
        <h2>Parte I - La Tua Identità</h2>
        <p>{identita}</p>
    </div>
    
    <div class="capitolo">
        <h2>Parte II - La Struttura della Tua Carta</h2>
        <p>{carta}</p>
        {tabella_pianeti}
        
        <div class="ruota-container">
            <div class="ruota-placeholder">Qui andrà la Ruota Zodiacale</div>
        </div>
    </div>
    
    <div class="capitolo">
        <h2>Parte III - Il Tuo 2027</h2>
        <p>{transiti_2027}</p>
    </div>
    
    {capitoli_mesi}
    
    {capitoli_ambiti}
    """
    
    html_content = html_content.replace("<!-- QUI L'AI INSERIRÀ I CAPITOLI -->", corpo_libro)
    
    nome_file = f"libro_{profile['id']}_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
    percorso_file = os.path.join("/tmp", nome_file)
    
    HTML(string=html_content).write_pdf(percorso_file)
    
    return percorso_file
