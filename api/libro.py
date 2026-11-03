import os
from datetime import datetime
from weasyprint import HTML
from ai import _chiama_ai

def pulisci_testo(testo: str) -> str:
    if not testo: return ""
    return testo.replace("**", "").replace("*", "").replace("#", "").replace("_", "").strip()

async def genera_libro_completo(profile: dict, report: dict, tema: dict, settori: dict) -> str:
    nome = profile.get("nome", "Cliente")
    data_nascita = str(profile.get("birth_date", ""))
    luogo_nascita = profile.get("birth_city", "")
    
    # --- SIMBOLO SEGNO PER LA DEDICA ---
    segno_sole = profile.get("planets", {}).get("Sole", {}).get("segno", "")
    simboli_segni = {
        "Ariete": "♈", "Toro": "♉", "Gemelli": "♊", "Cancro": "♋", "Leone": "♌", "Vergine": "♍",
        "Bilancia": "♎", "Scorpione": "♏", "Sagittario": "♐", "Capricorno": "♑", "Acquario": "♒", "Pesci": "♓"
    }
    simbolo_segno = simboli_segni.get(segno_sole, "✦")

    # --- DEDICA ---
    testo_dedica = f"Questo libro è dedicato a {nome}.<br>Nasce dal cielo del giorno in cui sei venuto al mondo e attraversa i simboli astrologici che accompagnano il tuo percorso."

    # --- TABELLE DATI GREZZI ---
    # 1. Pianeti
    tab_pianeti = "<table class='dati'><tr><th>Pianeta</th><th>Segno</th><th>Grado</th><th>Casa</th></tr>"
    for nome_p, dati_p in profile.get("planets", {}).items():
        casa = profile.get("planets_in_houses", {}).get(nome_p, "-")
        grado = round(dati_p.get('grado', 0), 2)
        tab_pianeti += f"<tr><td>{nome_p}</td><td>{dati_p.get('segno', '')}</td><td>{grado}°</td><td>{casa}ª</td></tr>"
    tab_pianeti += "</table>"

    # 2. Case
    tab_case = "<table class='dati'><tr><th>Casa</th><th>Cuspide (Segno)</th></tr>"
    case_data = profile.get("houses", [])
    for i, cuspide in enumerate(case_data):
        # Dobbiamo calcolare il segno della cuspide (longitudine)
        # Semplifichiamo: se non abbiamo la funzione, mettiamo solo il grado
        tab_case += f"<tr><td>{i+1}ª Casa</td><td>{round(cuspide, 2)}°</td></tr>"
    tab_case += "</table>"

    # 3. Aspetti
    tab_aspetti = "<table class='dati'><tr><th>Pianeta A</th><th>Aspetto</th><th>Pianeta B</th><th>Orbe</th></tr>"
    for asp in profile.get("aspects", [])[:10]: # Primi 10
        tab_aspetti += f"<tr><td>{asp.get('pianeta1')}</td><td>{asp.get('tipo')}</td><td>{asp.get('pianeta2')}</td><td>{asp.get('orb')}°</td></tr>"
    tab_aspetti += "</table>"

    # --- PARTE I: IDENTITÀ (AI) ---
    riepilogo = report.get("riepilogo_testuale", "")
    prompt_id = f"Scrivi la Parte I (Identità) per {nome}. Dati: {riepilogo}. Dividi in 3 parti [SEP]. Max 150 parole a parte."
    identita_raw = await _chiama_ai(prompt_id, max_tokens=900) or "Testo"
    parti_id = identita_raw.split("[SEP]")
    if len(parti_id) < 3: parti_id += ["", "", ""]
    sole_txt, luna_txt, asc_txt = [pulisci_testo(p) for p in parti_id]

    # --- PARTE II: TRANSITI (AI) ---
    transiti_testo = "\n".join([f"- {t.get('transito')} in {t.get('aspetto')} a {t.get('punto_natale')}" for t in report.get("transiti", [])[:5]])
    prompt_transiti = f"Scrivi la Parte III (Transiti 2027) per {nome}. Transiti: {transiti_testo}. Tono rassicurante. Max 300 parole."
    transiti_2027 = pulisci_testo(await _chiama_ai(prompt_transiti, max_tokens=800))

    # --- PARTE III: I 12 MESI (AI) ---
    mesi_nomi = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]
    capitoli_mesi = ""
    for mese in mesi_nomi:
        prompt_mese = f"Scrivi il capitolo per {mese} 2027 per {nome}. Tono: ispirazionale. Max 200 parole."
        testo_mese = pulisci_testo(await _chiama_ai(prompt_mese, max_tokens=400))
        capitoli_mesi += f"<div class='capitolo'><h2>{mese} 2027</h2><p>{testo_mese}</p></div>"

    # --- PARTE IV: SETTORI (Usa i dati del report!) ---
    # Il report ha già i settori calcolati (amore, lavoro, ecc.)
    settori_html = ""
    if settori:
        for chiave, titolo in [("amore", "Amore e Relazioni"), ("lavoro", "Lavoro e Carriera"), ("salute", "Salute e Benessere"), ("crescita", "Crescita Personale")]:
            testo_settore = settori.get(chiave, "")
            if testo_settore:
                settori_html += f"<div class='capitolo'><h2>{titolo}</h2><p>{pulisci_testo(testo_settore)}</p></div>"

    # --- COMPONIAMO L'HTML ---
    template_path = os.path.join(os.path.dirname(__file__), "template_libro.html")
    with open(template_path, "r", encoding="utf-8") as f:
        html_content = f.read()
        
    html_content = html_content.replace("{{NOME_CLIENTE}}", nome)
    
    corpo_libro = f"""
    <div class="capitolo">
        <div class="dedica">
            <div class="simbolo-segno">{simbolo_segno}</div>
            <p class="testo-dedica">{testo_dedica}</p>
        </div>
    </div>
    
    <div class="capitolo">
        <h2>I Tuoi Dati Astrologici</h2>
        <p>Queste sono le coordinate esatte del tuo cielo al momento della nascita.</p>
        <h3>I Pianeti</h3>
        {tab_pianeti}
        <h3>Le Case</h3>
        {tab_case}
        <h3>Gli Aspetti</h3>
        {tab_aspetti}
    </div>
    
    <div class="capitolo">
        <h2>Parte I - La Tua Identità</h2>
        <div class="box-identita"><div class="simbolo-grande">☉</div><span class="titolo-box">Il Sole</span><p>{sole_txt}</p></div>
        <div class="box-identita"><div class="simbolo-grande">☽</div><span class="titolo-box">La Luna</span><p>{luna_txt}</p></div>
        <div class="box-identita"><div class="simbolo-grande">↑</div><span class="titolo-box">L'Ascendente</span><p>{asc_txt}</p></div>
    </div>
    
    <div class="capitolo">
        <h2>Parte III - Il Tuo 2027</h2>
        <p>{transiti_2027}</p>
    </div>
    
    {capitoli_mesi}
    {settori_html}
    """
    
    html_content = html_content.replace('<div id="contenuto"></div>', f'<div id="contenuto">{corpo_libro}</div>')
    
    nome_file = f"libro_{profile['id']}_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
    percorso_file = os.path.join("/tmp", nome_file)
    HTML(string=html_content).write_pdf(percorso_file)
    return percorso_file
