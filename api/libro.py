import os
import re
from datetime import datetime
from weasyprint import HTML
from ai import _chiama_ai

def pulisci_testo(testo: str) -> str:
    """Rimuove asterischi, markdown e formattazioni indesiderate."""
    if not testo: return ""
    testo = testo.replace("**", "").replace("*", "").replace("#", "").replace("_", "")
    return testo.strip()

async def genera_libro_completo(profile: dict, report: dict) -> str:
    nome = profile.get("nome", "Cliente")
    data_nascita = str(profile.get("birth_date", ""))
    luogo_nascita = profile.get("birth_city", "")
    
    # --- INTRO ---
    prompt_intro = f"Sei un'astrologa italiana. Scrivi l'introduzione del libro per {nome} (nato il {data_nascita} a {luogo_nascita}). Tono caldo e misterioso, max 200 parole. Non usare asterischi."
    intro = pulisci_testo(await _chiama_ai(prompt_intro, max_tokens=500))

    # --- IDENTITÀ (Sole, Luna, Asc) ---
    # Chiediamo all'AI di dividerlo in 3 blocchi separati
    riepilogo = report.get("riepilogo_testuale", "")
    prompt_id = f"""Scrivi la Parte I (Identità) per {nome}. 
Dati: {riepilogo}
Restituisci il testo diviso ESATTAMENTE in tre parti, separate dalla parola [SEP].
1. Paragrafo sul Sole (identità)
2. Paragrafo sulla Luna (emozioni)
3. Paragrafo sull'Ascendente (personalità)
Max 150 parole per parte. Non usare asterischi o markdown."""
    
    identita_raw = await _chiama_ai(prompt_id, max_tokens=900) or "Testo Identità"
    parti_id = identita_raw.split("[SEP]")
    if len(parti_id) < 3: parti_id += ["", "", ""] # Fallback
    
    sole_txt = pulisci_testo(parti_id[0])
    luna_txt = pulisci_testo(parti_id[1])
    asc_txt = pulisci_testo(parti_id[2])

    # --- CARTA NATALE (Tabella) ---
    tabella_pianeti = "<table class='dati'><tr><th>Pianeta</th><th>Segno</th><th>Casa</th></tr>"
    for nome_p, dati_p in profile.get("planets", {}).items():
        casa = profile.get("planets_in_houses", {}).get(nome_p, "-")
        simboli = {"Sole": "☉", "Luna": "☽", "Mercurio": "☿", "Venere": "♀", "Marte": "♂", "Giove": "♃", "Saturno": "♄", "Urano": "♅", "Nettuno": "♆", "Plutone": "♇"}
        sym = simboli.get(nome_p, "✦")
        tabella_pianeti += f"<tr><td>{sym} {nome_p}</td><td>{dati_p.get('segno', '')}</td><td>{casa}ª</td></tr>"
    tabella_pianeti += "</table>"

    # --- TRANSITI 2027 ---
    transiti = report.get("transiti", [])
    transiti_testo = "\n".join([f"- {t.get('transito')} in {t.get('aspetto')} a {t.get('punto_natale')}" for t in transiti[:5]])
    prompt_transiti = f"Scrivi la Parte III (Transiti 2027) per {nome}. Ecco i transiti: {transiti_testo}. Tono rassicurante. Max 300 parole. Non usare asterischi."
    transiti_2027 = pulisci_testo(await _chiama_ai(prompt_transiti, max_tokens=800))

    # --- I 12 MESI ---
    mesi_nomi = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]
    capitoli_mesi = ""
    
    for mese in mesi_nomi:
        prompt_mese = f"Scrivi il capitolo per {mese} 2027 per {nome}. Tono: ispirazionale. Max 200 parole. Non usare asterischi."
        testo_mese = pulisci_testo(await _chiama_ai(prompt_mese, max_tokens=400))
        capitoli_mesi += f"""
        <div class="capitolo">
            <h2>{mese} 2027</h2>
            <p>{testo_mese}</p>
        </div>
        """

    # --- AMBITI DI VITA (Passiamo i pianeti per far scrivere meglio l'AI) ---
    # Recuperiamo Venere, Marte, ecc. per dare contesto
    venere = profile.get("planets", {}).get("Venere", {}).get("segno", "")
    marte = profile.get("planets", {}).get("Marte", {}).get("segno", "")
    
    ambiti = [
        ("Amore e Relazioni", f"Venere è in {venere}."),
        ("Lavoro e Carriera", f"Marte è in {marte}."),
        ("Salute e Benessere", "Analizza l'energia vitale."),
        ("Crescita Personale", "Analizza il percorso evolutivo.")
    ]
    
    capitoli_ambiti = ""
    for titolo, contesto_extra in ambiti:
        prompt_ambito = f"Scrivi un capitolo sull'ambito '{titolo}' per {nome} nel 2027. Contesto: {contesto_extra}. Tono: empatico e costruttivo. Almeno 200 parole. Non usare asterischi."
        testo_ambito = pulisci_testo(await _chiama_ai(prompt_ambito, max_tokens=500))
        capitoli_ambiti += f"""
        <div class="capitolo">
            <h2>{titolo}</h2>
            <p>{testo_ambito}</p>
        </div>
        """

    # --- COMPONIAMO L'HTML ---
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
        
        <div class="box-identita">
            <div class="simbolo-grande">☉</div>
            <span class="titolo-box">Il Sole</span>
            <p>{sole_txt}</p>
        </div>
        
        <div class="box-identita">
            <div class="simbolo-grande">☽</div>
            <span class="titolo-box">La Luna</span>
            <p>{luna_txt}</p>
        </div>
        
        <div class="box-identita">
            <div class="simbolo-grande">↑</div>
            <span class="titolo-box">L'Ascendente</span>
            <p>{asc_txt}</p>
        </div>
    </div>
    
    <div class="capitolo">
        <h2>Parte II - La Tua Carta</h2>
        <p>Ecco la struttura del tuo cielo al momento della nascita. Ogni pianeta racconta una sfumatura della tua personalità.</p>
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
    
    html_content = html_content.replace('<div id="contenuto"></div>', f'<div id="contenuto">{corpo_libro}</div>')
    
    nome_file = f"libro_{profile['id']}_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
    percorso_file = os.path.join("/tmp", nome_file)
    
    HTML(string=html_content).write_pdf(percorso_file)
    
    return percorso_file
