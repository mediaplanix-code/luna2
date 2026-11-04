import os
import math
import asyncio
from datetime import datetime
from weasyprint import HTML
from ai import _chiama_ai
from supabase import create_client

def pulisci_testo(testo: str) -> str:
    if not testo: return ""
    return testo.replace("**", "").replace("*", "").replace("#", "").replace("_", "").strip()

def genera_ruota_svg(tema: dict) -> str:
    segni = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"]
    svg = f'<svg class="ruota-svg" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg" style="width: 100%; max-width: 450px; margin: 0 auto; display: block;">'
    svg += f'<circle cx="300" cy="300" r="280" fill="#fcfbf7" stroke="#b89752" stroke-width="2"/>'
    svg += f'<circle cx="300" cy="300" r="230" fill="none" stroke="#b89752" stroke-width="1"/>'
    svg += f'<circle cx="300" cy="300" r="150" fill="none" stroke="#b89752" stroke-width="1"/>'
    
    # Spicchi e segni
    for i, segno in enumerate(segni):
        angle_start = (i * 30 - 90) * (math.pi / 180)
        angle_mid = (i * 30 + 15 - 90) * (math.pi / 180)
        x1 = 300 + 280 * math.cos(angle_start)
        y1 = 300 + 280 * math.sin(angle_start)
        x2 = 300 + 150 * math.cos(angle_start)
        y2 = 300 + 150 * math.sin(angle_start)
        svg += f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#b89752" stroke-width="1"/>'
        x_sym = 300 + 255 * math.cos(angle_mid)
        y_sym = 300 + 255 * math.sin(angle_mid)
        svg += f'<text x="{x_sym}" y="{y_sym}" fill="#b89752" font-size="24" text-anchor="middle" dominant-baseline="central">{segno}</text>'
        
    # Pianeti (posizionati sulla ruota)
    simboli_pianeti = {"Sole": "☉", "Luna": "☽", "Mercurio": "☿", "Venere": "♀", "Marte": "♂", "Giove": "♃", "Saturno": "♄", "Urano": "♅", "Nettuno": "♆", "Plutone": "♇"}
    for nome_p, dati_p in tema.get("planets", {}).items():
        if nome_p in simboli_pianeti:
            lon = dati_p.get("longitude", 0)
            angle = (lon - 90) * (math.pi / 180)
            x = 300 + 190 * math.cos(angle)
            y = 300 + 190 * math.sin(angle)
            sym = simboli_pianeti[nome_p]
            svg += f'<text x="{x}" y="{y}" fill="#0d1321" font-size="20" text-anchor="middle" dominant-baseline="central">{sym}</text>'

    svg += '</svg>'
    return svg

async def genera_libro_completo(profile: dict, report: dict, tema: dict, settori: dict) -> str:
    nome = profile.get("nome", "Cliente")
    data_nascita = str(profile.get("birth_date", ""))
    luogo_nascita = profile.get("birth_city", "")
    
    segno_sole = tema.get("planets", {}).get("Sole", {}).get("segno", "")
    segno_luna = tema.get("planets", {}).get("Luna", {}).get("segno", "")
    simboli_segni = {"Ariete": "♈", "Toro": "♉", "Gemelli": "♊", "Cancro": "♋", "Leone": "♌", "Vergine": "♍", "Bilancia": "♎", "Scorpione": "♏", "Sagittario": "♐", "Capricorno": "♑", "Acquario": "♒", "Pesci": "♓"}
    simbolo_segno = simboli_segni.get(segno_sole, "✦")
    
    testo_dedica = f"""
    <p class="testo-dedica">Questo libro è dedicato a <strong>{nome}</strong>, nato il {data_nascita} a {luogo_nascita}.</p>
    <p class="testo-dedica" style="margin-top: 20px;">Le sue pagine nascono dal cielo di quel giorno, unico e irripetibile, e attraversano i simboli astrologici che accompagnano il tuo percorso. Ogni pianeta, ogni casa, ogni transito racconta una parte di te.</p>
    """
    ruota_svg = genera_ruota_svg(tema)

    # TABELLE
    tab_pianeti = "<table class='dati'><tr><th>Pianeta</th><th>Posizione</th><th>Significato</th></tr>"
    for nome_p, dati_p in tema.get("planets", {}).items():
        segno = dati_p.get('segno', '')
        grado = round(dati_p.get('grado', 0), 2)
        await asyncio.sleep(0.5)
        prompt_sig = f"In una frase brevissima (max 10 parole), spiega il significato di {nome_p} in {segno}."
        significato = pulisci_testo(await _chiama_ai(prompt_sig, max_tokens=50)) or "Influenza il tuo carattere."
        tab_pianeti += f"<tr><td>{nome_p}</td><td>{segno} {grado}°</td><td>{significato}</td></tr>"
    tab_pianeti += "</table>"

    tab_case = "<table class='dati'><tr><th>Casa</th><th>Grado</th><th>Significato</th></tr>"
    for i, cuspide in enumerate(tema.get("houses", [])):
        await asyncio.sleep(0.5)
        prompt_casa = f"In una frase brevissima (max 10 parole), spiega il significato della {i+1}ª Casa astrologica."
        significato_casa = pulisci_testo(await _chiama_ai(prompt_casa, max_tokens=50)) or "Area della vita."
        tab_case += f"<tr><td>{i+1}ª Casa</td><td>{round(cuspide, 2)}°</td><td>{significato_casa}</td></tr>"
    tab_case += "</table>"

    tab_aspetti = "<table class='dati'><tr><th>Pianeta A</th><th>Aspetto</th><th>Pianeta B</th><th>Significato</th></tr>"
    for asp in tema.get("aspects", [])[:10]:
        p1 = asp.get('pianeta1')
        p2 = asp.get('pianeta2')
        tipo = asp.get('tipo')
        await asyncio.sleep(0.5)
        prompt_asp = f"In una frase brevissima (max 10 parole), spiega il significato dell'aspetto {tipo} tra {p1} e {p2}."
        significato_asp = pulisci_testo(await _chiama_ai(prompt_asp, max_tokens=50)) or "Tensione o armonia."
        tab_aspetti += f"<tr><td>{p1}</td><td>{tipo}</td><td>{p2}</td><td>{significato_asp}</td></tr>"
    tab_aspetti += "</table>"

    tab_transiti = "<table class='dati'><tr><th>Transito</th><th>Aspetto</th><th>Al tuo</th><th>Significato</th></tr>"
    transiti_list = report.get("transiti", [])
    if transiti_list:
        for t in transiti_list[:10]:
            p_transito = t.get('transito', '')
            tipo_asp = t.get('aspetto', '')
            p_natale = t.get('punto_natale', '')
            await asyncio.sleep(0.5)
            prompt_trans = f"In una frase brevissima (max 10 parole), spiega il significato del transito {p_transito} in {tipo_asp} al {p_natale}."
            significato_trans = pulisci_testo(await _chiama_ai(prompt_trans, max_tokens=50)) or "Trasformazione."
            tab_transiti += f"<tr><td>{p_transito}</td><td>{tipo_asp}</td><td>{p_natale}</td><td>{significato_trans}</td></tr>"
    else:
        tab_transiti += "<tr><td colspan='4' style='text-align: center;'>Nessun transito rilevante.</td></tr>"
    tab_transiti += "</table>"

    # --- IDENTITÀ (4 chiamate separate) ---
    await asyncio.sleep(1)
    sole_txt = pulisci_testo(await _chiama_ai(f"Scrivi 100 parole sull'identità di {nome} con Sole in {segno_sole}.", max_tokens=300)) or "Il tuo Sole brilla."
    await asyncio.sleep(1)
    asc_txt = pulisci_testo(await _chiama_ai(f"Scrivi 100 parole sull'Ascendente di {nome}.", max_tokens=300)) or "Il tuo Ascendente ti guida."
    await asyncio.sleep(1)
    luna_txt = pulisci_testo(await _chiama_ai(f"Scrivi 100 parole sulla Luna in {segno_luna} di {nome}.", max_tokens=300)) or "La tua Luna ti dona sensibilità."
    await asyncio.sleep(1)
    mc_txt = pulisci_testo(await _chiama_ai(f"Scrivi 100 parole sul Medio Cielo di {nome}.", max_tokens=300)) or "Il tuo Medio Cielo indica la strada."

    # --- SEGNI COMPATIBILI (con descrizione ricca) ---
    COMPATIBILI = {
        "Ariete": ["Leone", "Sagittario", "Gemelli", "Acquario"], "Toro": ["Vergine", "Capricorno", "Cancro", "Pesci"],
        "Gemelli": ["Bilancia", "Acquario", "Ariete", "Leone"], "Cancro": ["Scorpione", "Pesci", "Toro", "Vergine"],
        "Leone": ["Ariete", "Sagittario", "Gemelli", "Bilancia"], "Vergine": ["Toro", "Capricorno", "Cancro", "Scorpione"],
        "Bilancia": ["Gemelli", "Acquario", "Leone", "Sagittario"], "Scorpione": ["Cancro", "Pesci", "Vergine", "Capricorno"],
        "Sagittario": ["Ariete", "Leone", "Bilancia", "Acquario"], "Capricorno": ["Toro", "Vergine", "Scorpione", "Pesci"],
        "Acquario": ["Gemelli", "Bilancia", "Ariete", "Sagittario"], "Pesci": ["Cancro", "Scorpione", "Toro", "Capricorno"],
    }
    # Frasi fisse basate sull'elemento
    frasi_compatibilita = {
        "Fuoco": "Condividete la stessa passione e energia vitale.",
        "Terra": "Siete pratici e cercate stabilità insieme.",
        "Aria": "La vostra comunicazione è fluida e stimolante.",
        "Acqua": "C'è un'intesa emotiva profonda e istintiva."
    }
    elementi = {"Ariete": "Fuoco", "Leone": "Fuoco", "Sagittario": "Fuoco", "Toro": "Terra", "Vergine": "Terra", "Capricorno": "Terra", "Gemelli": "Aria", "Bilancia": "Aria", "Acquario": "Aria", "Cancro": "Acqua", "Scorpione": "Acqua", "Pesci": "Acqua"}
    
    compatibili = COMPATIBILI.get(segno_sole, [])
    compatibili_html = "<ul style='list-style: none; padding: 0;'>"
    for c in compatibili:
        frase = frasi_compatibilita.get(elementi.get(c, "Aria"), "Affinità naturale.")
        compatibili_html += f"<li style='font-size: 13pt; margin-bottom: 10px;'><span style='font-size: 18pt; color: #b89752;'>{simboli_segni.get(c, '')}</span> <strong>{c}</strong>: {frase}</li>"
    compatibili_html += "</ul>"

    # --- SEGNALI DALLE STELLE ---
    segnali_html = ""
    if transiti_list:
        for t in transiti_list[:5]:
            data_inizio = t.get('inizio', '')
            mese_inizio = data_inizio[:7] if data_inizio else "Data non disponibile"
            segnali_html += f"<p style='font-size: 12pt; margin-bottom: 8px;'>• <strong>{t.get('transito')}</strong> in {t.get('aspetto')} al tuo <strong>{t.get('punto_natale')}</strong> ({mese_inizio})</p>"
    else:
        segnali_html = "<p>I transiti principali saranno rivelati mese per mese.</p>"

    # --- RESOCONTO ANNUALE ---
    await asyncio.sleep(1)
    prompt_resoconto = f"Scrivi un resoconto annuale per il 2027 per {nome} (Sole in {segno_sole}). Massimo 300 parole. Tono: ispirazionale."
    resoconto = pulisci_testo(await _chiama_ai(prompt_resoconto, max_tokens=600)) or "Il 2027 è un anno di crescita."
    if resoconto:
        resoconto = f"<span style='font-size: 40pt; float: left; line-height: 1; margin-right: 10px; color: #b89752; font-family: Cinzel;'>{resoconto[0]}</span>{resoconto[1:]}"

    # --- MESI ---
    mesi_nomi = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]
    capitoli_mesi = ""
    for mese in mesi_nomi:
        await asyncio.sleep(2)
        prompt_mese = f"Scrivi un testo di almeno 150 parole per il mese di {mese} 2027 per {nome} (Sole in {segno_sole}). Parla dell'energia del mese."
        testo_mese = pulisci_testo(await _chiama_ai(prompt_mese, max_tokens=400)) or f"Il mese di {mese} porta nuove energie."
        if testo_mese:
            # Drop Cap: solo un'immagine finta (non togliamo la lettera al testo)
            testo_mese = f"<span style='font-size: 40pt; float: left; line-height: 1; margin-right: 10px; color: #b89752; font-family: Cinzel;'>✦</span>{testo_mese}"
        capitoli_mesi += f"<div class='capitolo'><h2>{mese} 2027</h2><p>{testo_mese}</p></div>"

    # --- AMBITI (divisi in paragrafi) ---
    settori_html = ""
    ambiti = [("Amore e Relazioni", f"Venere in {tema.get('planets', {}).get('Venere', {}).get('segno', '')}"), ("Lavoro e Carriera", f"Marte in {tema.get('planets', {}).get('Marte', {}).get('segno', '')}"), ("Salute e Benessere", f"Luna in {segno_luna}"), ("Crescita Personale", f"Nodo Nord in {tema.get('planets', {}).get('NodoNord', {}).get('segno', '')}")]
    for titolo, contesto in ambiti:
        await asyncio.sleep(2)
        prompt_ambito = f"Scrivi un capitolo di almeno 250 parole sull'ambito '{titolo}' per {nome} nel 2027. Contesto: {contesto}. Tono: empatico."
        testo_ambito = pulisci_testo(await _chiama_ai(prompt_ambito, max_tokens=600)) or "Testo non disponibile."
        settori_html += f"<div class='capitolo'><h2>{titolo}</h2><p>{testo_ambito}</p></div>"

    # --- COMPONIAMO L'HTML ---
    template_path = os.path.join(os.path.dirname(__file__), "template_libro.html")
    with open(template_path, "r", encoding="utf-8") as f:
        html_content = f.read()
    html_content = html_content.replace("{{NOME_CLIENTE}}", nome)
    
    corpo_libro = f"""
    <div class="capitolo"><div class="dedica"><div class="simbolo-segno">{simbolo_segno}</div>{testo_dedica}</div></div>
    <div class="capitolo"><h2>La Tua Ruota e i Tuoi Dati</h2><div class="ruota-container">{ruota_svg}</div><h3>I Pianeti</h3>{tab_pianeti}<h3>Le Case</h3>{tab_case}<h3>Gli Aspetti</h3>{tab_aspetti}<h3>I Transiti</h3>{tab_transiti}</div>
    <div class="capitolo"><h2>Parte I - La Tua Identità</h2><div class="box-identita"><div class="simbolo-grande">☉</div><span class="titolo-box">Il Segno Solare</span><p>{sole_txt}</p></div><div class="box-identita"><div class="simbolo-grande">↑</div><span class="titolo-box">L'Ascendente</span><p>{asc_txt}</p></div><div class="box-identita"><div class="simbolo-grande">☽</div><span class="titolo-box">La Luna</span><p>{luna_txt}</p></div><div class="box-identita"><div class="simbolo-grande">⚡</div><span class="titolo-box">Il Medio Cielo</span><p>{mc_txt}</p></div></div>
    <div class="capitolo"><h2>I Tuoi Segni Compatibili</h2><p>Le tue energie si armonizzano meglio con:</p>{compatibili_html}</div>
    <div class="capitolo"><h2>Segnali dalle Stelle</h2><p>Questi sono i transiti più importanti che segneranno il tuo 2027:</p>{segnali_html}</div>
    <div class="capitolo"><h2>Resoconto Annuale 2027</h2><p>{resoconto}</p></div>
    {capitoli_mesi}
    {settori_html}
    """
    html_content = html_content.replace('<div id="contenuto"></div>', f'<div id="contenuto">{corpo_libro}</div>')
    
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
