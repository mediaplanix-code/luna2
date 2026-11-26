import os
import math
import asyncio
import hashlib
import re
from datetime import datetime
from weasyprint import HTML
from ai import _chiama_ai
from supabase import create_client

def pulisci_testo(testo: str) -> str:
    if not testo: return ""
    testo = testo.replace("**", "").replace("*", "").replace("#", "").replace("_", "").strip()
    testo = re.sub(r'[^\w\s\.\,\;\:\!\?\'\"\(\)\-àèéìòùÀÈÉÌÒÙ]', '', testo)
    return testo

# --- FUNZIONE BLINDATA CONTRO I VUOTI DELL'AI ---
async def _chiama_ai_con_retry(prompt: str, max_tokens: int, min_len: int = 40) -> str:
    for tentativo in range(3):
        risposta = await _chiama_ai(prompt, max_tokens)
        risposta_pulita = pulisci_testo(risposta)
        if risposta_pulita and len(risposta_pulita) >= min_len:
            return risposta_pulita
        print(f"=== RETRY AI (Tentativo {tentativo+1}/3 fallito, risposta vuota o troppo corta) ===")
        await asyncio.sleep(2)
    return ""

def genera_ruota_svg(tema: dict) -> str:
    segni = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"]
    svg = f'<svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg" style="width: 100%; max-width: 500px; display: block; margin: 0 auto;">'
    svg += f'<circle cx="300" cy="300" r="290" fill="#fcfbf7" stroke="#b89752" stroke-width="2"/>'
    svg += f'<circle cx="300" cy="300" r="250" fill="none" stroke="#b89752" stroke-width="1"/>'
    svg += f'<circle cx="300" cy="300" r="160" fill="none" stroke="#b89752" stroke-width="1"/>'
    svg += f'<circle cx="300" cy="300" r="80" fill="none" stroke="#b89752" stroke-width="1" stroke-dasharray="4,4"/>'

    for i, segno in enumerate(segni):
        angle_start = (i * 30 - 90) * (math.pi / 180)
        angle_mid = (i * 30 + 15 - 90) * (math.pi / 180)
        x1 = 300 + 290 * math.cos(angle_start)
        y1 = 300 + 290 * math.sin(angle_start)
        x2 = 300 + 160 * math.cos(angle_start)
        y2 = 300 + 160 * math.sin(angle_start)
        svg += f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#b89752" stroke-width="1"/>'
        x_sym = 300 + 270 * math.cos(angle_mid)
        y_sym = 300 + 270 * math.sin(angle_mid)
        svg += f'<text x="{x_sym}" y="{y_sym}" fill="#b89752" font-size="28" text-anchor="middle" dominant-baseline="central">{segno}</text>'

    houses = tema.get("houses", [])
    for idx, cuspide in enumerate(houses):
        angle = (cuspide - 90) * (math.pi / 180)
        x1 = 300 + 80 * math.cos(angle)
        y1 = 300 + 80 * math.sin(angle)
        x2 = 300 + 160 * math.cos(angle)
        y2 = 300 + 160 * math.sin(angle)
        svg += f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#e0d6c3" stroke-width="1"/>'
        
        if idx < len(houses) - 1:
            next_cuspide = houses[idx+1]
        else:
            next_cuspide = houses[0] + 360
        if next_cuspide < cuspide: next_cuspide += 360
        mid_angle = ((cuspide + next_cuspide) / 2 - 90) * (math.pi / 180)
        hx = 300 + 120 * math.cos(mid_angle)
        hy = 300 + 120 * math.sin(mid_angle)
        svg += f'<text x="{hx}" y="{hy}" fill="#a0a0a0" font-size="16" text-anchor="middle" dominant-baseline="central">{idx+1}</text>'

    planets = tema.get("planets", {})
    simboli_pianeti = {"Sole": "☉", "Luna": "☽", "Mercurio": "☿", "Venere": "♀", "Marte": "♂", "Giove": "♃", "Saturno": "♄", "Urano": "♅", "Nettuno": "♆", "Plutone": "♇", "NodoNord": "☊", "Chirone": "⚷"}
    colori_pianeti = {"Sole": "#FFD700", "Luna": "#C0C0C0", "Mercurio": "#B0C4DE", "Venere": "#FFB6C1", "Marte": "#FF4500", "Giove": "#FFA500", "Saturno": "#8B4513", "Urano": "#00CED1", "Nettuno": "#0000FF", "Plutone": "#800080", "NodoNord": "#444", "Chirone": "#444"}
    
    pianeti_ordinati = sorted(planets.items(), key=lambda x: x[1].get("longitude", 0) if isinstance(x[1], dict) else 0)
    last_lon = -999
    offset_radius = 0
    
    for nome_p, dati_p in pianeti_ordinati:
        if nome_p in simboli_pianeti:
            lon = dati_p.get("longitude", 0)
            if lon - last_lon < 15: offset_radius += 22
            else: offset_radius = 0
            last_lon = lon
            
            angle = (lon - 90) * (math.pi / 180)
            r_planet = 205 + offset_radius
            x = 300 + r_planet * math.cos(angle)
            y = 300 + r_planet * math.sin(angle)
            sym = simboli_pianeti[nome_p]
            colore = colori_pianeti.get(nome_p, "#0d1321")
            
            svg += f'<circle cx="{x}" cy="{y}" r="16" fill="{colore}" opacity="0.15"/>'
            svg += f'<text x="{x}" y="{y}" fill="{colore}" font-size="24" text-anchor="middle" dominant-baseline="central">{sym}</text>'

    svg += f'<text x="300" y="300" fill="#b89752" font-size="36" text-anchor="middle" dominant-baseline="central">✦</text>'
    svg += '</svg>'
    return svg

def get_segno_da_longitudine(lon: float) -> str:
    segni = ["Ariete", "Toro", "Gemelli", "Cancro", "Leone", "Vergine", "Bilancia", "Scorpione", "Sagittario", "Capricorno", "Acquario", "Pesci"]
    idx = int(((lon % 360) + 360) % 360 // 30)
    return segni[idx]

SIGNIFICATI_CASE = {
    1: "Identità, aspetto fisico, approccio alla vita.", 2: "Denaro, risorse materiali, valori personali.",
    3: "Comunicazione, fratelli, studi, spostamenti brevi.", 4: "Famiglia, radici, casa, sicurezza interiore.",
    5: "Creatività, amore, figli, piacere, gioco.", 6: "Lavoro quotidiano, salute, routine, servizio.",
    7: "Relazioni, matrimonio, soci, contratti.", 8: "Trasformazione, crisi, risorse condivise, intimità.",
    9: "Viaggi, filosofia, fede, istruzione superiore.", 10: "Carriera, status, reputazione, obiettivi pubblici.",
    11: "Amicizie, gruppi, ideali, progetti futuri.", 12: "Inconscio, sogni, spiritualità, isolamento."
}

SEGNI_MESI = {
    "Gennaio": ("Acquario", "♒"), "Febbraio": ("Pesci", "♓"), "Marzo": ("Ariete", "♈"),
    "Aprile": ("Toro", "♉"), "Maggio": ("Gemelli", "♊"), "Giugno": ("Cancro", "♋"),
    "Luglio": ("Leone", "♌"), "Agosto": ("Vergine", "♍"), "Settembre": ("Bilancia", "♎"),
    "Ottobre": ("Scorpione", "♏"), "Novembre": ("Sagittario", "♐"), "Dicembre": ("Capricorno", "♑")
}

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
        significato = await _chiama_ai_con_retry(prompt_sig, max_tokens=50, min_len=10) or "Influenza il tuo carattere."
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
        p1, p2, tipo = asp.get('pianeta1'), asp.get('pianeta2'), asp.get('tipo')
        await asyncio.sleep(0.2)
        prompt_asp = f"In una frase brevissima (max 10 parole), spiega il significato dell'aspetto {tipo} tra {p1} e {p2}."
        significato_asp = await _chiama_ai_con_retry(prompt_asp, max_tokens=50, min_len=10) or "Tensione o armonia."
        tab_aspetti += f"<tr><td>{p1}</td><td>{tipo}</td><td>{p2}</td><td>{significato_asp}</td></tr>"
    tab_aspetti += "</table>"

    transiti_list = report.get("transiti_lenti_12_mesi", [])
    tab_transiti = "<table class='dati'><tr><th>Transito</th><th>Aspetto</th><th>Al tuo</th><th>Significato</th></tr>"
    if transiti_list:
        for t in transiti_list[:10]:
            tab_transiti += f"<tr><td>{t.get('pianeta_transito')}</td><td>{t.get('aspetto')}</td><td>{t.get('punto_natale')}</td><td>{pulisci_testo(t.get('significato'))}</td></tr>"
    else:
        tab_transiti += "<tr><td colspan='4' style='text-align: center;'>Nessun transito rilevante per il 2027.</td></tr>"
    tab_transiti += "</table>"

    # IDENTITÀ
    sole_txt = await _chiama_ai_con_retry(f"Scrivi 100 parole sull'identità di {nome} con Sole in {segno_sole}. Non includere il conteggio delle parole nel testo.", max_tokens=300) or "Il tuo Sole brilla."
    asc_segno = get_segno_da_longitudine(tema.get("ascendant", 0))
    asc_txt = await _chiama_ai_con_retry(f"Scrivi 100 parole sull'Ascendente in {asc_segno} di {nome}.", max_tokens=300) or "Il tuo Ascendente ti guida."
    luna_txt = await _chiama_ai_con_retry(f"Scrivi 100 parole sulla Luna in {segno_luna} di {nome}.", max_tokens=300) or "La tua Luna ti dona sensibilità."
    mc_segno = get_segno_da_longitudine(tema.get("mc", 0))
    mc_txt = await _chiama_ai_con_retry(f"Scrivi 100 parole sul Medio Cielo in {mc_segno} di {nome}.", max_tokens=300) or "Il tuo Medio Cielo indica la strada."

    # SEGNI COMPATIBILI (Lista elegante con testo più corposo)
    COMPATIBILI = {
        "Ariete": ["Leone", "Sagittario", "Gemelli", "Acquario"], "Toro": ["Vergine", "Capricorno", "Cancro", "Pesci"],
        "Gemelli": ["Bilancia", "Acquario", "Ariete", "Leone"], "Cancro": ["Scorpione", "Pesci", "Toro", "Vergine"],
        "Leone": ["Ariete", "Sagittario", "Gemelli", "Bilancia"], "Vergine": ["Toro", "Capricorno", "Cancro", "Scorpione"],
        "Bilancia": ["Gemelli", "Acquario", "Leone", "Sagittario"], "Scorpione": ["Cancro", "Pesci", "Vergine", "Capricorno"],
        "Sagittario": ["Ariete", "Leone", "Bilancia", "Acquario"], "Capricorno": ["Toro", "Vergine", "Scorpione", "Pesci"],
        "Acquario": ["Gemelli", "Bilancia", "Ariete", "Sagittario"], "Pesci": ["Cancro", "Scorpione", "Toro", "Capricorno"],
    }
    
    compatibili = COMPATIBILI.get(segno_sole, [])
    compatibili_html = "<ul style='list-style: none; padding: 0;'>"
    for c in compatibili:
        prompt_comp = f"Scrivi una frase di massimo 25 parole che descriva la compatibilità tra il segno {segno_sole} e il segno {c}. Parla di come si completano in amore o in amicizia."
        testo_comp = await _chiama_ai_con_retry(prompt_comp, max_tokens=60, min_len=15) or "Affinità naturale e scambio reciproco."
        
        compatibili_html += f"""
        <li style='margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;'>
            <div style='font-size: 28pt; color: #b89752; float: left; margin-right: 15px; line-height: 1;'>{simboli_segni.get(c, '')}</div>
            <div style='font-family: Cinzel, serif; font-size: 16pt; color: #0d1321; margin-bottom: 5px;'>{c}</div>
            <div style='font-size: 12pt; color: #555; font-style: italic; line-height: 1.6;'>{testo_comp}</div>
            <div style='clear: both;'></div>
        </li>
        """
    compatibili_html += "</ul>"

    # RESOCONTO ANNUALE (Blindato)
    stelle_anno = get_stelle_finte(nome, "2027")
    stelle_anno_html = f"<div style='text-align: center; margin-bottom: 20px; font-size: 20pt; color: #b89752;'>{render_stelle(stelle_anno)}</div>"
    
    prompt_resoconto = f"Scrivi un resoconto annuale per il 2027 per {nome} (Sole in {segno_sole}). Massimo 300 parole. Tono: ispirazionale."
    resoconto = await _chiama_ai_con_retry(prompt_resoconto, max_tokens=600, min_len=100)
    
    if not resoconto:
        resoconto = f"Caro {nome}, il 2027 si prospetta come un anno di profonda evoluzione. Le stelle ti invitano a guardare dentro te stesso e a coltivare i tuoi talenti nascosti. È il momento di lasciare andare ciò che non ti serve più e di abbracciare le nuove opportunità che l'universo ha in serbo per te. Con il tuo Sole in {segno_sole}, la tua sensibilità sarà la tua guida."
    
    if resoconto:
        resoconto = f"<span style='font-size: 40pt; float: left; line-height: 1; margin-right: 10px; color: #b89752; font-family: Cinzel;'>{resoconto[0]}</span>{resoconto[1:]}"

    # MESI
    mesi_nomi = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]
    capitoli_mesi = ""
    
    for mese in mesi_nomi:
        stelle_mese = get_stelle_finte(nome, mese)
        stelline_html = f"<span style='color: #b89752; font-size: 14pt;'>{render_stelle(stelle_mese)}</span>"
        
        prompt_mese = f"Scrivi un testo di almeno 200 parole per il mese di {mese} 2027 per {nome} (Sole in {segno_sole}). Parla dell'energia del mese."
        testo_mese = await _chiama_ai_con_retry(prompt_mese, max_tokens=500, min_len=100) or f"Il mese di {mese} porta nuove energie e ti invita a riflettere sui tuoi obiettivi."
        
        if testo_mese:
            testo_mese = f"<span style='font-size: 40pt; float: left; line-height: 1; margin-right: 10px; color: #b89752; font-family: Cinzel;'>{testo_mese[0]}</span>{testo_mese[1:]}"
        
        stelle_box = f"<div style='text-align: center; margin-bottom: 15px; font-size: 12pt; color: #333;'><strong>Le stelle indicano:</strong> {stelline_html}</div>"
        
        segno_mese, sym_mese = SEGNI_MESI.get(mese, ("Ariete", "♈"))
        decorazione_mese = f"""
        <div style='margin-top: 50px; text-align: center; border-top: 1px solid #e0d5c1; padding-top: 20px; page-break-inside: avoid;'>
            <div style='font-size: 45pt; color: #b89752; line-height: 1;'>{sym_mese}</div>
            <div style='font-family: Cinzel, serif; font-size: 13pt; color: #0d1321; letter-spacing: 2px; margin-top: 10px;'>IL SOLE IN {segno_mese.upper()}</div>
        </div>
        """
        
        capitoli_mesi += f"<div class='capitolo'><h2>{mese} 2027</h2>{stelle_box}<p>{testo_mese}</p>{decorazione_mese}</div>"

    # AMBITI (Blindati)
    settori_html = ""
    ambiti = [("Amore e Relazioni", f"Venere in {tema.get('planets', {}).get('Venere', {}).get('segno', '')}"), ("Lavoro e Carriera", f"Marte in {tema.get('planets', {}).get('Marte', {}).get('segno', '')}"), ("Salute e Benessere", f"Luna in {segno_luna}"), ("Crescita Personale", f"Nodo Nord in {tema.get('planets', {}).get('NodoNord', {}).get('segno', '')}")]
    
    for titolo, contesto in ambiti:
        stelle_ambito = get_stelle_finte(nome, titolo)
        stelline_ambito = f"<span style='color: #b89752; font-size: 14pt;'>{render_stelle(stelle_ambito)}</span>"
        
        prompt_ambito = f"Scrivi un capitolo di almeno 250 parole sull'ambito '{titolo}' per {nome} nel 2027. Contesto: {contesto}. Tono: empatico. Sii dettagliato."
        testo_ambito = await _chiama_ai_con_retry(prompt_ambito, max_tokens=600, min_len=150)
        
        if not testo_ambito:
            testo_ambito = f"Quest'anno l'energia del tuo tema natale ti guida a esplorare nuove dimensioni di {titolo.lower()}. Le stelle suggeriscono di ascoltare il tuo intuito e di muoverti con coraggio verso ciò che desideri."
        
        settori_html += f"<div class='capitolo'><h2>{titolo}</h2><div style='text-align: center; margin-bottom: 15px; font-size: 14pt;'>Le stelle indicano: {stelline_ambito}</div><p>{testo_ambito}</p></div>"

    # --- COMPONIAMO L'HTML ---
    template_path = os.path.join(os.path.dirname(__file__), "template_libro.html")
    with open(template_path, "r", encoding="utf-8") as f:
        html_content = f.read()
    html_content = html_content.replace("{{NOME_CLIENTE}}", nome)
    
    dedica_html = f"""
    <div class="capitolo">
        <div class="dedica">
            <div class="simbolo-segno">{simbolo_segno}</div>
            <p class="testo-dedica">Questo libro porta un nome che è anche un augurio.</p>
            <p class="testo-dedica">Tufelia nasce da un "tu" e da una "Felia": il "tu" è la scusa per guardare il cielo da vicino, senza il filtro delle previsioni uguali per tutti; "Felia" viene dal latino felix, che significa felice, fortunato, fecondo — e conserva dentro di sé l'antica radice di chi porta aiuto.</p>
            <p class="testo-dedica">Tu, Felia: tu che questo cielo lo abiti, tu a cui le stelle parlano al singolare.</p>
            <p class="testo-dedica">Le pagine che seguono non vogliono dirti cosa accadrà, ma aiutarti a leggere ciò che già sei. Il tuo cielo personalizzato comincia qui, con il tuo nome sulla prima riga e il tuo tempo scritto nelle pagine.</p>
            <p class="testo-dedica">Che questo sia un anno felice. Che le stelle ti siano, come si dice, favorevoli — e che tu sappia riconoscerle anche quando si nascondono.</p>
            <p class="testo-dedica firma-dedica" style="margin-top: 40px;">Con affetto,<br>tuFelia</p>
        </div>
    </div>
    """

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
        <div class="ruota-container">{ruota_svg}</div>
        <h3>I Pianeti</h3>{tab_pianeti}
        <h3>Le Case</h3>{tab_case}
        <h3>Gli Aspetti</h3>{tab_aspetti}
    </div>
    
    <div class="capitolo">
        <h2>I Transiti del 2027</h2>
        {tab_transiti}
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
        <p style="text-align: center; font-style: italic; color: #555; margin-bottom: 20px;">Le tue energie si armonizzano meglio con:</p>
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
