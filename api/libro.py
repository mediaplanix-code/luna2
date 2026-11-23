import os
import math
import asyncio
import hashlib
from datetime import datetime
from weasyprint import HTML
from ai import _chiama_ai
from supabase import create_client

def pulisci_testo(testo: str) -> str:
    if not testo: return ""
    testo = testo.replace("**", "").replace("*", "").replace("#", "").replace("_", "").strip()
    return testo

# SVG Semplificato e Centrato per WeasyPrint
def genera_ruota_svg(tema: dict) -> str:
    segni = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"]
    # Uso stili inline semplici per evitare problemi di rendering
    svg = f'<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" style="width: 320px; height: 320px; display: block; margin: 0 auto;">'
    svg += f'<circle cx="200" cy="200" r="190" fill="#fcfbf7" stroke="#b89752" stroke-width="2"/>'
    svg += f'<circle cx="200" cy="200" r="150" fill="none" stroke="#b89752" stroke-width="1"/>'
    svg += f'<circle cx="200" cy="200" r="100" fill="none" stroke="#b89752" stroke-width="1"/>'
    
    # Linee e simboli segni
    for i, segno in enumerate(segni):
        angle_start = (i * 30 - 90) * (math.pi / 180)
        angle_mid = (i * 30 + 15 - 90) * (math.pi / 180)
        x1 = 200 + 190 * math.cos(angle_start)
        y1 = 200 + 190 * math.sin(angle_start)
        x2 = 200 + 100 * math.cos(angle_start)
        y2 = 200 + 100 * math.sin(angle_start)
        svg += f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#b89752" stroke-width="1"/>'
        x_sym = 200 + 170 * math.cos(angle_mid)
        y_sym = 200 + 170 * math.sin(angle_mid)
        svg += f'<text x="{x_sym}" y="{y_sym}" fill="#b89752" font-size="18" text-anchor="middle" dominant-baseline="central">{segno}</text>'
    
    # Pianeti
    simboli_pianeti = {"Sole": "☉", "Luna": "☽", "Mercurio": "☿", "Venere": "♀", "Marte": "♂", "Giove": "♃", "Saturno": "♄", "Urano": "♅", "Nettuno": "♆", "Plutone": "♇"}
    for nome_p, dati_p in tema.get("planets", {}).items():
        if nome_p in simboli_pianeti:
            lon = dati_p.get("longitude", 0)
            angle = (lon - 90) * (math.pi / 180)
            x = 200 + 125 * math.cos(angle)
            y = 200 + 125 * math.sin(angle)
            sym = simboli_pianeti[nome_p]
            svg += f'<text x="{x}" y="{y}" fill="#0d1321" font-size="16" text-anchor="middle" dominant-baseline="central">{sym}</text>'
    svg += '</svg>'
    return svg

def get_segno_da_longitudine(lon: float) -> str:
    segni = ["Ariete", "Toro", "Gemelli", "Cancro", "Leone", "Vergine", "Bilancia", "Scorpione", "Sagittario", "Capricorno", "Acquario", "Pesci"]
    idx = int(((lon % 360) + 360) % 360 // 30)
    return segni[idx]

# Dizionario statico per i significati delle case
SIGNIFICATI_CASE = {
    1: "Identità, aspetto fisico, approccio alla vita.",
    2: "Denaro, risorse materiali, valori personali.",
    3: "Comunicazione, fratelli, studi, spostamenti brevi.",
    4: "Famiglia, radici, casa, sicurezza interiore.",
    5: "Creatività, amore, figli, piacere, gioco.",
    6: "Lavoro quotidiano, salute, routine, servizio.",
    7: "Relazioni, matrimonio, soci, contratti.",
    8: "Trasformazione, crisi, risorse condivise, intimità.",
    9: "Viaggi, filosofia, fede, istruzione superiore.",
    10: "Carriera, status, reputazione, obiettivi pubblici.",
    11: "Amicizie, gruppi, ideali, progetti futuri.",
    12: "Inconscio, sogni, spiritualità, isolamento."
}

# Funzione per generare stelle deterministiche (da sostituire con calcolo transiti reali in futuro)
def get_stelle_finte(nome: str, contesto: str) -> int:
    hash_val = int(hashlib.md5(f"{nome}_{contesto}".encode()).hexdigest(), 16)
    return (hash_val % 5) + 1

def render_stelle(num: int) -> str:
    return "★" * num + "☆" * (5 - num)

async def genera_libro_completo(profile: dict, report: dict, tema: dict, settori: dict) -> str:
    nome = profile.get("nome", "Cliente")
    
    segno_sole = tema.get("planets", {}).get("Sole", {}).get("segno", "")
    segno_luna = tema.get("planets", {}).get("Luna", {}).get("segno", "")
    simboli_segni = {"Ariete": "♈", "Toro": "♉", "Gemelli": "♊", "Cancro": "♋", "Leone": "♌", "Vergine": "♍", "Bilancia": "♎", "Scorpione": "♏", "Sagittario": "♐", "Capricorno": "♑", "Acquario": "♒", "Pesci": "♓"}
    simbolo_segno = simboli_segni.get(segno_sole, "✦")

    ruota_svg = genera_ruota_svg(tema)

    # TABELLE
    tab_pianeti = "<table class='dati'><tr><th>Pianeta</th><th>Posizione</th><th>Significato</th></tr>"
    for nome_p, dati_p in tema.get("planets", {}).items():
        segno = dati_p.get('segno', '')
        grado = round(dati_p.get('grado', 0), 2)
        await asyncio.sleep(0.2)
        prompt_sig = f"In una frase brevissima (max 10 parole), spiega il significato di {nome_p} in {segno}."
        significato = pulisci_testo(await _chiama_ai(prompt_sig, max_tokens=50)) or "Influenza il tuo carattere."
        tab_pianeti += f"<tr><td>{nome_p}</td><td>{segno} {grado}°</td><td>{significato}</td></tr>"
    tab_pianeti += "</table>"

    tab_case = "<table class='dati'><tr><th>Casa</th><th>Posizione</th><th>Significato</th></tr>"
    for i, cuspide in enumerate(tema.get("houses", [])):
        casa_num = i + 1
        segno_casa = get_segno_da_longitudine(cuspide)
        grado_casa = round(cuspide % 30, 2)
        significato_casa = SIGNIFICATI_CASE.get(casa_num, "Area della vita.")
        tab_case += f"<tr><td>{casa_num}ª Casa</td><td>{segno_casa} {grado_casa}°</td><td>{significato_casa}</td></tr>"
    tab_case += "</table>"

    tab_aspetti = "<table class='dati'><tr><th>Pianeta A</th><th>Aspetto</th><th>Pianeta B</th><th>Significato</th></tr>"
    for asp in tema.get("aspects", [])[:10]:
        p1 = asp.get('pianeta1')
        p2 = asp.get('pianeta2')
        tipo = asp.get('tipo')
        await asyncio.sleep(0.2)
        prompt_asp = f"In una frase brevissima (max 10 parole), spiega il significato dell'aspetto {tipo} tra {p1} e {p2}."
        significato_asp = pulisci_testo(await _chiama_ai(prompt_asp, max_tokens=50)) or "Tensione o armonia."
        tab_aspetti += f"<tr><td>{p1}</td><td>{tipo}</td><td>{p2}</td><td>{significato_asp}</td></tr>"
    tab_aspetti += "</table>"

    # TRANSITI con date
    transiti_list = report.get("transiti_lenti_12_mesi", [])
    tab_transiti = "<table class='dati'><tr><th>Transito</th><th>Aspetto</th><th>Al tuo</th><th>Periodo</th><th>Significato</th></tr>"
    if transiti_list:
        for t in transiti_list[:10]:
            p_transito = t.get('pianeta_transito', '')
            tipo_asp = t.get('aspetto', '')
            p_natale = t.get('punto_natale', '')
            data_ini = t.get('data_esatta', '')
            # Creiamo un range approssimativo di 3 mesi per i transiti lenti
            mese_ini = data_ini[:7] if data_ini else "2027"
            significato_trans = t.get('significato', '') or "Trasformazione."
            tab_transiti += f"<tr><td>{p_transito}</td><td>{tipo_asp}</td><td>{p_natale}</td><td>{mese_ini}</td><td>{pulisci_testo(significato_trans)}</td></tr>"
    else:
        tab_transiti += "<tr><td colspan='5' style='text-align: center;'>Nessun transito rilevante per il 2027.</td></tr>"
    tab_transiti += "</table>"

    # IDENTITÀ
    await asyncio.sleep(0.5)
    sole_txt = pulisci_testo(await _chiama_ai(f"Scrivi 100 parole sull'identità di {nome} con Sole in {segno_sole}. Non includere il conteggio delle parole nel testo.", max_tokens=300)) or "Il tuo Sole brilla."
    await asyncio.sleep(0.5)
    asc_lon = tema.get("ascendant", 0)
    asc_segno = get_segno_da_longitudine(asc_lon)
    asc_txt = pulisci_testo(await _chiama_ai(f"Scrivi 100 parole sull'Ascendente in {asc_segno} di {nome}.", max_tokens=300)) or "Il tuo Ascendente ti guida."
    await asyncio.sleep(0.5)
    luna_txt = pulisci_testo(await _chiama_ai(f"Scrivi 100 parole sulla Luna in {segno_luna} di {nome}.", max_tokens=300)) or "La tua Luna ti dona sensibilità."
    await asyncio.sleep(0.5)
    mc_lon = tema.get("mc", 0)
    mc_segno = get_segno_da_longitudine(mc_lon)
    mc_txt = pulisci_testo(await _chiama_ai(f"Scrivi 100 parole sul Medio Cielo in {mc_segno} di {nome}.", max_tokens=300)) or "Il tuo Medio Cielo indica la strada."

    # SEGNI COMPATIBILI CON DETTAGLI
    COMPATIBILI = {
        "Ariete": ["Leone", "Sagittario", "Gemelli", "Acquario"], "Toro": ["Vergine", "Capricorno", "Cancro", "Pesci"],
        "Gemelli": ["Bilancia", "Acquario", "Ariete", "Leone"], "Cancro": ["Scorpione", "Pesci", "Toro", "Vergine"],
        "Leone": ["Ariete", "Sagittario", "Gemelli", "Bilancia"], "Vergine": ["Toro", "Capricorno", "Cancro", "Scorpione"],
        "Bilancia": ["Gemelli", "Acquario", "Leone", "Sagittario"], "Scorpione": ["Cancro", "Pesci", "Vergine", "Capricorno"],
        "Sagittario": ["Ariete", "Leone", "Bilancia", "Acquario"], "Capricorno": ["Toro", "Vergine", "Scorpione", "Pesci"],
        "Acquario": ["Gemelli", "Bilancia", "Ariete", "Sagittario"], "Pesci": ["Cancro", "Scorpione", "Toro", "Capricorno"],
    }
    
    compatibili = COMPATIBILI.get(segno_sole, [])
    compatibili_html = "<div style='display: grid; grid-template-columns: 1fr 1fr; gap: 20px;'>"
    for c in compatibili:
        compatibili_html += f"""
        <div style='background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #ddd;'>
            <h4 style='color: #b89752; font-size: 18pt; margin-top: 0; margin-bottom: 5px;'>{simboli_segni.get(c, '')} {c}</h4>
            <p style='font-size: 11pt; margin-bottom: 5px;'><strong>Amore:</strong> {pulisci_testo(await _chiama_ai(f"Max 6 parole: compatibilità amorosa tra {segno_sole} e {c}.", max_tokens=20)) or 'Intesa profonda.'}</p>
            <p style='font-size: 11pt; margin-bottom: 5px;'><strong>Lavoro:</strong> {pulisci_testo(await _chiama_ai(f"Max 6 parole: compatibilità lavorativa tra {segno_sole} e {c}.", max_tokens=20)) or 'Buona collaborazione.'}</p>
            <p style='font-size: 11pt; margin: 0;'><strong>Amicizia:</strong> {pulisci_testo(await _chiama_ai(f"Max 6 parole: amicizia tra {segno_sole} e {c}.", max_tokens=20)) or 'Affinità naturale.'}</p>
        </div>
        """
    compatibili_html += "</div>"

    # RESOCONTO ANNUALE (con stelle)
    stelle_anno = get_stelle_finte(nome, "2027")
    stelle_anno_html = f"<div style='text-align: center; margin-bottom: 20px; font-size: 20pt; color: #b89752;'>{render_stelle(stelle_anno)}</div>"
    
    await asyncio.sleep(1)
    prompt_resoconto = f"Scrivi un resoconto annuale per il 2027 per {nome} (Sole in {segno_sole}). Massimo 300 parole. Tono: ispirazionale."
    resoconto = pulisci_testo(await _chiama_ai(prompt_resoconto, max_tokens=600)) or "Il 2027 è un anno di crescita."
    
    if resoconto:
        resoconto = f"<span style='font-size: 40pt; float: left; line-height: 1; margin-right: 10px; color: #b89752; font-family: Cinzel;'>{resoconto[0]}</span>{resoconto[1:]}"

    # MESI con stelle
    mesi_nomi = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]
    capitoli_mesi = ""
    
    for mese in mesi_nomi:
        await asyncio.sleep(1)
        stelle_mese = get_stelle_finte(nome, mese)
        stelline_html = f"<span style='color: #b89752; font-size: 14pt;'>{render_stelle(stelle_mese)}</span>"
        
        prompt_mese = f"Scrivi un testo di almeno 150 parole per il mese di {mese} 2027 per {nome} (Sole in {segno_sole}). Parla dell'energia del mese."
        testo_mese = pulisci_testo(await _chiama_ai(prompt_mese, max_tokens=400)) or f"Il mese di {mese} porta nuove energie."
        
        if testo_mese:
            testo_mese = f"<span style='font-size: 40pt; float: left; line-height: 1; margin-right: 10px; color: #b89752; font-family: Cinzel;'>{testo_mese[0]}</span>{testo_mese[1:]}"
        
        stelle_box = f"<div style='text-align: center; margin-bottom: 15px; font-size: 12pt; color: #333;'><strong>Come andrà il mese:</strong> {stelline_html}</div>"
        
        capitoli_mesi += f"<div class='capitolo'><h2>{mese} 2027</h2>{stelle_box}<p>{testo_mese}</p></div>"

    # AMBITI (con stelle)
    settori_html = ""
    ambiti = [
        ("Amore e Relazioni", f"Venere in {tema.get('planets', {}).get('Venere', {}).get('segno', '')}"),
        ("Lavoro e Carriera", f"Marte in {tema.get('planets', {}).get('Marte', {}).get('segno', '')}"),
        ("Salute e Benessere", f"Luna in {segno_luna}"),
        ("Crescita Personale", f"Nodo Nord in {tema.get('planets', {}).get('NodoNord', {}).get('segno', '')}")
    ]
    for titolo, contesto in ambiti:
        await asyncio.sleep(1)
        stelle_ambito = get_stelle_finte(nome, titolo)
        stelline_ambito = f"<span style='color: #b89752; font-size: 14pt;'>{render_stelle(stelle_ambito)}</span>"
        
        prompt_ambito = f"Scrivi un capitolo di almeno 250 parole sull'ambito '{titolo}' per {nome} nel 2027. Contesto: {contesto}. Tono: empatico."
        testo_ambito = pulisci_testo(await _chiama_ai(prompt_ambito, max_tokens=600)) or "Testo non disponibile."
        
        settori_html += f"<div class='capitolo'><h2>{titolo}</h2><div style='text-align: center; margin-bottom: 15px; font-size: 14pt;'>{stelline_ambito}</div><p>{testo_ambito}</p></div>"

    # --- COMPONIAMO L'HTML ---
    template_path = os.path.join(os.path.dirname(__file__), "template_libro.html")
    with open(template_path, "r", encoding="utf-8") as f:
        html_content = f.read()
    html_content = html_content.replace("{{NOME_CLIENTE}}", nome)
    
    # DEDICA
    dedica_html = f"""
    <div class="capitolo">
        <div class="dedica">
            <div class="simbolo-segno">{simbolo_segno}</div>
            <p class="testo-dedica">Questo libro porta un nome che è anche un augurio.</p>
            <p class="testo-dedica" style="margin-top: 20px;">Tufelia nasce da un "tu" e da una "Felia": il "tu" è la scusa per guardare il cielo da vicino, senza il filtro delle previsioni uguali per tutti; "Felia" viene dal latino felix, che significa felice, fortunato, fecondo — e conserva dentro di sé l'antica radice di chi porta aiuto.</p>
            <p class="testo-dedica" style="margin-top: 20px;">Tu, Felia: tu che questo cielo lo abiti, tu a cui le stelle parlano al singolare.</p>
            <p class="testo-dedica" style="margin-top: 20px;">Le pagine che seguono non vogliono dirti cosa accadrà, ma aiutarti a leggere ciò che già sei. Il tuo cielo personalizzato comincia qui, con il tuo nome sulla prima riga e il tuo tempo scritto nelle pagine.</p>
            <p class="testo-dedica" style="margin-top: 20px;">Che questo sia un anno felice. Che le stelle ti siano, come si dice, favorevoli — e che tu sappia riconoscerle anche quando si nascondono.</p>
            <p class="testo-dedica" style="margin-top: 30px; font-size: 14pt;">Con affetto,<br>tuFelia</p>
        </div>
    </div>
    """

    # PAGINA FINALE CON MARCHIO
    pagina_finale_html = f"""
    <div class="capitolo">
        <div class="dedica" style="margin-top: 80px;">
            <div class="simbolo-segno">✦</div>
            <p class="testo-dedica" style="font-size: 16pt; font-style: italic;">Tufelia — perché il tuo cielo non è quello di tutti.</p>
            <p class="testo-dedica" style="font-size: 14pt; margin-top: 30px;">A {nome}, con l'augurio di ogni felicità.</p>
            <div style="margin-top: 60px; font-size: 12pt; color: #b89752;">✦</div>
            <p style="margin-top: 40px; font-size: 10pt; color: #888;">© tufelia.com — Marchio Registrato</p>
        </div>
    </div>
    """
    
    corpo_libro = f"""
    {dedica_html}
    
    <div class="capitolo">
        <h2>La Tua Ruota e i Tuoi Dati</h2>
        <div class="ruota-container" style="text-align: center;">{ruota_svg}</div>
        <h3>I Pianeti</h3>{tab_pianeti}
        <h3>Le Case</h3>{tab_case}
        <h3>Gli Aspetti</h3>{tab_aspetti}
        <h3>I Transiti del 2027</h3>{tab_transiti}
    </div>
    
    <div class="capitolo">
        <h2>Parte I - La Tua Identità</h2>
        <div class="box-identita"><div class="simbolo-grande">☉</div><span class="titolo-box">Il Segno Solare</span><p>{sole_txt}</p></div>
        <div class="box-identita"><div class="simbolo-grande">↑</div><span class="titolo-box">L'Ascendente ({asc_segno})</span><p>{asc_txt}</p></div>
        <div class="box-identita"><div class="simbolo-grande">☽</div><span class="titolo-box">La Luna</span><p>{luna_txt}</p></div>
        <div class="box-identita"><div class="simbolo-grande">⚡</div><span class="titolo-box">Il Medio Cielo ({mc_segno})</span><p>{mc_txt}</p></div>
    </div>
    
    <div class="capitolo">
        <h2>I Tuoi Segni Compatibili</h2>
        <p>Le tue energie si armonizzano meglio con:</p>
        {compatibili_html}
    </div>
    
    <div class="capitolo">
        <h2>Resoconto Annuale 2027</h2>
        {stelle_anno_html}
        <p>{resoconto}</p>
    </div>
    
    {capitoli_mesi}
    {settori_html}
    {pagina_finale_html}
    """
    
    html_content = html_content.replace('<div id="contenuto"></div>', f'<div id="contenuto">{corpo_libro}</div>')
    
    # Aggiungiamo il footer a ogni pagina tramite CSS (se supportato da WeasyPrint)
    html_content = html_content.replace('</body>', '<div style="text-align:center; font-size:9pt; color:#aaa; position:fixed; bottom:0; width:100%;">© tufelia.com — Marchio Registrato</div></body>')
    
    nome_file = f"libro_{profile['id']}_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
    percorso_temp = os.path.join("/tmp", nome_file)
    HTML(string=html_content).write_pdf(percorso_temp)
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    sb = create_client(supabase_url, supabase_key)
    
    with open(percorso_temp, "rb") as f:
        sb.storage.from_("libri").upload(path=nome_file, file=f, file_options={"content-type": "application/pdf"})
    
    url_pubblico = sb.storage.from_("libri").get_public_url(nome_file)
    os.remove(percorso_temp)
    
    return url_pubblico
