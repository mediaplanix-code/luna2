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

def genera_ruota_svg() -> str:
    segni = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"]
    svg = f'<svg class="ruota-svg" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">'
    svg += f'<circle cx="200" cy="200" r="190" fill="none" stroke="#b89752" stroke-width="2"/>'
    svg += f'<circle cx="200" cy="200" r="150" fill="none" stroke="#b89752" stroke-width="1" stroke-dasharray="4 4"/>'
    
    for i, segno in enumerate(segni):
        angle = (i * 30 - 90) * (math.pi / 180)
        x = 200 + 170 * math.cos(angle)
        y = 200 + 170 * math.sin(angle)
        svg += f'<text x="{x}" y="{y}" fill="#b89752" font-size="24" text-anchor="middle" dominant-baseline="central">{segno}</text>'
        
        angle_line = (i * 30 + 15 - 90) * (math.pi / 180)
        x1 = 200 + 190 * math.cos(angle_line)
        y1 = 200 + 190 * math.sin(angle_line)
        x2 = 200 + 150 * math.cos(angle_line)
        y2 = 200 + 150 * math.sin(angle_line)
        svg += f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#b89752" stroke-width="1"/>'

    svg += '</svg>'
    return svg

async def genera_libro_completo(profile: dict, report: dict, tema: dict, settori: dict) -> str:
    nome = profile.get("nome", "Cliente")
    data_nascita = str(profile.get("birth_date", ""))
    luogo_nascita = profile.get("birth_city", "")
    
    segno_sole = tema.get("planets", {}).get("Sole", {}).get("segno", "")
    simboli_segni = {"Ariete": "♈", "Toro": "♉", "Gemelli": "♊", "Cancro": "♋", "Leone": "♌", "Vergine": "♍", "Bilancia": "♎", "Scorpione": "♏", "Sagittario": "♐", "Capricorno": "♑", "Acquario": "♒", "Pesci": "♓"}
    simbolo_segno = simboli_segni.get(segno_sole, "✦")
    
    testo_dedica = f"Questo libro è dedicato a {nome}.<br>Nato il {data_nascita} a {luogo_nascita}.<br>Nasce dal cielo del giorno in cui sei venuto al mondo e attraversa i simboli astrologici che accompagnano il tuo percorso."

    ruota_svg = genera_ruota_svg()

    # TABELLA PIANETI
    tab_pianeti = "<table class='dati'><tr><th>Pianeta</th><th>Posizione</th><th>Significato</th></tr>"
    for nome_p, dati_p in tema.get("planets", {}).items():
        segno = dati_p.get('segno', '')
        grado = round(dati_p.get('grado', 0), 2)
        # Aggiungiamo una piccola pausa per non far arrabbiare Groq
        await asyncio.sleep(1) 
        prompt_sig = f"In una frase brevissima (max 10 parole), spiega il significato di {nome_p} in {segno}."
        significato = pulisci_testo(await _chiama_ai(prompt_sig, max_tokens=50))
        tab_pianeti += f"<tr><td>{nome_p}</td><td>{segno} {grado}°</td><td>{significato}</td></tr>"
    tab_pianeti += "</table>"

    # CASE
    tab_case = "<table class='dati'><tr><th>Casa</th><th>Grado</th></tr>"
    for i, cuspide in enumerate(tema.get("houses", [])):
        tab_case += f"<tr><td>{i+1}ª Casa</td><td>{round(cuspide, 2)}°</td></tr>"
    tab_case += "</table>"

    # ASPETTI
    tab_aspetti = "<table class='dati'><tr><th>Pianeta A</th><th>Aspetto</th><th>Pianeta B</th></tr>"
    for asp in tema.get("aspects", [])[:10]:
        tab_aspetti += f"<tr><td>{asp.get('pianeta1')}</td><td>{asp.get('tipo')}</td><td>{asp.get('pianeta2')}</td></tr>"
    tab_aspetti += "</table>"

    # IDENTITÀ
    riepilogo = report.get("riepilogo_testuale", "")
    await asyncio.sleep(1)
    prompt_id = f"Scrivi la Parte I (Identità) per {nome}. Dati: {riepilogo}. Dividi in 3 parti [SEP]. Max 150 parole a parte."
    identita_raw = await _chiama_ai(prompt_id, max_tokens=900) or "Testo"
    parti_id = identita_raw.split("[SEP]")
    while len(parti_id) < 3: parti_id.append("")
    sole_txt, luna_txt, asc_txt = [pulisci_testo(p) for p in parti_id[:3]]

    # TRANSITI
    transiti_testo = "\n".join([f"- {t.get('transito')} in {t.get('aspetto')} a {t.get('punto_natale')}" for t in report.get("transiti", [])[:5]])
    await asyncio.sleep(1)
    prompt_transiti = f"Scrivi la Parte II (Transiti 2027) per {nome}. Transiti: {transiti_testo}. Dividi in 3 blocchi [SEP]. Max 150 parole per blocco."
    transiti_raw = await _chiama_ai(prompt_transiti, max_tokens=900) or "Transiti"
    parti_transiti = transiti_raw.split("[SEP]")
    while len(parti_transiti) < 3: parti_transiti.append("")
    
    transiti_blocchi = ""
    titoli_transiti = ["Le Sfide del 2027", "Le Opportunità del 2027", "La Crescita del 2027"]
    for i, t_txt in enumerate(parti_transiti[:3]):
        transiti_blocchi += f"<div class='box-identita'><span class='titolo-box'>{titoli_transiti[i]}</span><p>{pulisci_testo(t_txt)}</p></div>"

    # MESI (con pausa di sicurezza)
    mesi_nomi = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]
    capitoli_mesi = ""
    for mese in mesi_nomi:
        await asyncio.sleep(2) # Pausa di 2 secondi tra un mese e l'altro
        prompt_mese = f"Scrivi un testo di almeno 150 parole per il mese di {mese} 2027 per {nome} (Sole in {segno_sole}). Parla dell'energia del mese. Tono: ispirazionale."
        testo_mese = pulisci_testo(await _chiama_ai(prompt_mese, max_tokens=400))
        capitoli_mesi += f"<div class='capitolo'><h2>{mese} 2027</h2><p>{testo_mese}</p></div>"

    # SETTORI (con pausa)
    settori_html = ""
    if settori:
        for chiave, titolo in [("amore", "Amore e Relazioni"), ("lavoro", "Lavoro e Carriera"), ("salute", "Salute e Benessere"), ("crescita", "Crescita Personale")]:
            await asyncio.sleep(2)
            testo_settore = settori.get(chiave, "")
            if testo_settore:
                settori_html += f"<div class='capitolo'><h2>{titolo}</h2><p>{pulisci_testo(testo_settore)}</p></div>"

    # COMPONIAMO L'HTML
    template_path = os.path.join(os.path.dirname(__file__), "template_libro.html")
    with open(template_path, "r", encoding="utf-8") as f:
        html_content = f.read()
        
    html_content = html_content.replace("{{NOME_CLIENTE}}", nome)
    
    corpo_libro = f"""
    <div class="capitolo"><div class="dedica"><div class="simbolo-segno">{simbolo_segno}</div><p class="testo-dedica">{testo_dedica}</p></div></div>
    <div class="capitolo"><h2>La Tua Ruota e i Tuoi Dati</h2><div class="ruota-container">{ruota_svg}</div><h3>I Pianeti</h3>{tab_pianeti}<h3>Le Case</h3>{tab_case}<h3>Gli Aspetti</h3>{tab_aspetti}</div>
    <div class="capitolo"><h2>Parte I - La Tua Identità</h2><div class="box-identita"><div class="simbolo-grande">☉</div><span class="titolo-box">Il Sole</span><p>{sole_txt}</p></div><div class="box-identita"><div class="simbolo-grande">☽</div><span class="titolo-box">La Luna</span><p>{luna_txt}</p></div><div class="box-identita"><div class="simbolo-grande">↑</div><span class="titolo-box">L'Ascendente</span><p>{asc_txt}</p></div></div>
    <div class="capitolo"><h2>Parte II - Il Tuo 2027</h2>{transiti_blocchi}</div>
    {capitoli_mesi}
    {settori_html}
    """
    
    html_content = html_content.replace('<div id="contenuto"></div>', f'<div id="contenuto">{corpo_libro}</div>')
    
    # Generiamo il PDF
    nome_file = f"libro_{profile['id']}_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
    percorso_temp = os.path.join("/tmp", nome_file)
    HTML(string=html_content).write_pdf(percorso_temp)
    
    # Carichiamo su Supabase
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    sb = create_client(supabase_url, supabase_key)
    
    with open(percorso_temp, "rb") as f:
        sb.storage.from_("libri").upload(path=nome_file, file=f, file_options={"content-type": "application/pdf"})
    
    url_pubblico = sb.storage.from_("libri").get_public_url(nome_file)
    os.remove(percorso_temp)
    
    return url_pubblico
