import os
import math
import asyncio
from datetime import datetime
from weasyprint import HTML
from ai_libro import _chiama_gemini_libro
from supabase import create_client

def pulisci_testo(testo: str) -> str:
    if not testo: return ""
    return testo.replace("**", "").replace("*", "").replace("#", "").replace("_", "").strip()

def genera_ruota_svg(tema: dict) -> str:
    # (Identico a prima, non lo tocco per non fare casini)
    segni = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"]
    svg = f'<svg class="ruota-svg" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg" style="width: 100%; max-width: 450px; margin: 0 auto; display: block;">'
    svg += f'<circle cx="300" cy="300" r="280" fill="#fcfbf7" stroke="#b89752" stroke-width="2"/>'
    svg += f'<circle cx="300" cy="300" r="230" fill="none" stroke="#b89752" stroke-width="1"/>'
    svg += f'<circle cx="300" cy="300" r="150" fill="none" stroke="#b89752" stroke-width="1"/>'
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

    ruota_svg = genera_ruota_svg(tema)

    # --- IDENTITÀ (Schema Strutturato) ---
    schema_identita = {
        "type": "object",
        "properties": {
            "sole": {"type": "string", "description": "Testo sull'identità basato ESCLUSIVAMENTE sul Sole in " + segno_sole},
            "ascendente": {"type": "string", "description": "Testo sull'Ascendente se disponibile, altrimenti scrivi ESATTAMENTE 'Dato non disponibile'"},
            "luna": {"type": "string", "description": "Testo sulla Luna in " + segno_luna},
            "mc": {"type": "string", "description": "Testo sul Medio Cielo se disponibile, altrimenti scrivi ESATTAMENTE 'Dato non disponibile'"}
        },
        "required": ["sole", "ascendente", "luna", "mc"]
    }
    
    prompt_identita = f"Sei un'astrologa italiana. Scrivi i testi per l'identità di {nome}. Usa SOLO i dati forniti. Non inventare nulla. Dati: Sole in {segno_sole}, Luna in {segno_luna}. Per Ascendente e MC, se non hai i dati esatti, scrivi 'Dato non disponibile'."
    
    identita = await _chiama_gemini_libro(prompt_identita, schema_identita)
    sole_txt = pulisci_testo(identita.get("sole", "")) or "Dato non disponibile."
    asc_txt = pulisci_testo(identita.get("ascendente", "")) or "Dato non disponibile."
    luna_txt = pulisci_testo(identita.get("luna", "")) or "Dato non disponibile."
    mc_txt = pulisci_testo(identita.get("mc", "")) or "Dato non disponibile."

    # --- RESOCONTO ANNUALE (Schema Strutturato) ---
    schema_resoconto = {
        "type": "object",
        "properties": {
            "testo": {"type": "string", "description": "Resoconto annuale di max 300 parole. NON inventare percentuali, cifre o eventi specifici. Parla solo di temi astrologici generali."}
        },
        "required": ["testo"]
    }
    prompt_resoconto = f"Scrivi un resoconto annuale per {nome} (Sole in {segno_sole}) per il 2027. Tono ispirazionale. NON inventare dati economici o medici."
    resoconto_data = await _chiama_gemini_libro(prompt_resoconto, schema_resoconto)
    resoconto = pulisci_testo(resoconto_data.get("testo", "")) or "Il 2027 è un anno di crescita interiore."

    # --- MESI (Schema Strutturato) ---
    schema_mesi = {
        "type": "object",
        "properties": {
            "mese": {"type": "string", "description": "Nome del mese"},
            "testo": {"type": "string", "description": "Testo di almeno 150 parole. NON inventare transiti specifici che non conosci. Parla dell'energia del mese legata al segno solare."}
        },
        "required": ["mese", "testo"]
    }
    
    mesi_nomi = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]
    capitoli_mesi = ""
    for mese in mesi_nomi:
        await asyncio.sleep(1) # Pausa per non far arrabbiare Gemini
        prompt_mese = f"Scrivi il testo per il mese di {mese} 2027 per {nome} (Sole in {segno_sole}). Max 200 parole. Non inventare transiti."
        mese_data = await _chiama_gemini_libro(prompt_mese, schema_mesi)
        testo_mese = pulisci_testo(mese_data.get("testo", "")) or f"Il mese di {mese} porta nuove energie."
        if testo_mese:
            testo_mese = f"<span style='font-size: 40pt; float: left; line-height: 1; margin-right: 10px; color: #b89752; font-family: Cinzel;'>{testo_mese[0]}</span>{testo_mese[1:]}"
        capitoli_mesi += f"<div class='capitolo'><h2>{mese} 2027</h2><p>{testo_mese}</p></div>"

    # --- AMBITI (Schema Strutturato) ---
    schema_ambito = {
        "type": "object",
        "properties": {
            "testo": {"type": "string", "description": "Testo di almeno 200 parole. Non inventare eventi o percentuali. Parla solo di temi astrologici generali legati al pianeta."}
        },
        "required": ["testo"]
    }
    
    settori_html = ""
    ambiti = [("Amore e Relazioni", f"Venere in {tema.get('planets', {}).get('Venere', {}).get('segno', '')}"), ("Lavoro e Carriera", f"Marte in {tema.get('planets', {}).get('Marte', {}).get('segno', '')}"), ("Salute e Benessere", f"Luna in {segno_luna}"), ("Crescita Personale", f"Nodo Nord in {tema.get('planets', {}).get('NodoNord', {}).get('segno', '')}")]
    for titolo, contesto in ambiti:
        await asyncio.sleep(1)
        prompt_ambito = f"Scrivi un testo sull'ambito '{titolo}' per {nome} nel 2027. Contesto: {contesto}. Tono empatico. NON inventare eventi."
        ambito_data = await _chiama_gemini_libro(prompt_ambito, schema_ambito)
        testo_ambito = pulisci_testo(ambito_data.get("testo", "")) or "Testo non disponibile."
        settori_html += f"<div class='capitolo'><h2>{titolo}</h2><p>{testo_ambito}</p></div>"

    # --- DEDICA (Fissa, corretta) ---
    dedica_html = f"""
    <div class="capitolo">
        <div class="dedica">
            <div class="simbolo-segno">{simbolo_segno}</div>
            <p class="testo-dedica">Questo libro porta un nome che è anche un augurio.</p>
            <p class="testo-dedica" style="margin-top: 20px;">TuFelia nasce da un "tu" e da una "Felia": il "tu" è la scusa per guardare il cielo da vicino, senza il filtro delle previsioni uguali per tutti; "Felia" viene dal latino felix, che significa felice, fortunato, fecondo — e conserva dentro di sé l'antica radice di chi porta aiuto.</p>
            <p class="testo-dedica" style="margin-top: 20px;">Tu, Felia: tu che questo cielo lo abiti, tu a cui le stelle parlano al singolare.</p>
            <p class="testo-dedica" style="margin-top: 20px;">Le pagine che seguono non vogliono dirti cosa accadrà, ma aiutarti a leggere ciò che già sei.</p>
            <p class="testo-dedica" style="margin-top: 30px; font-size: 14pt;">Con affetto,<br>tuFelia</p>
        </div>
    </div>
    """

    # (Tabelle e Segni Compatibili identici a prima, per non allungare troppo)
    # ... (Incolla qui le stesse tabelle che avevi, sono corrette) ...

    corpo_libro = f"""
    {dedica_html}
    <div class="capitolo"><h2>La Tua Ruota e i Tuoi Dati</h2><div class="ruota-container">{ruota_svg}</div></div>
    <div class="capitolo">
        <h2>Parte I - La Tua Identità</h2>
        <div class="box-identita"><div class="simbolo-grande">☉</div><span class="titolo-box">Il Segno Solare</span><p>{sole_txt}</p></div>
        <div class="box-identita"><div class="simbolo-grande">↑</div><span class="titolo-box">L'Ascendente</span><p>{asc_txt}</p></div>
        <div class="box-identita"><div class="simbolo-grande">☽</div><span class="titolo-box">La Luna</span><p>{luna_txt}</p></div>
        <div class="box-identita"><div class="simbolo-grande">⚡</div><span class="titolo-box">Il Medio Cielo</span><p>{mc_txt}</p></div>
    </div>
    <div class="capitolo"><h2>Resoconto Annuale 2027</h2><p>{resoconto}</p></div>
    {capitoli_mesi}
    {settori_html}
    """
    
    # (Il resto del codice per generare il PDF e caricarlo su Supabase è identico)
    # ...
