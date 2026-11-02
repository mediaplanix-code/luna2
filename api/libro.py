import os
from datetime import datetime
from weasyprint import HTML
from ai import _chiama_ai

async def genera_libro_completo(profile: dict, report: dict) -> str:
    """Genera il PDF del libro con i testi scritti dall'AI."""
    
    # 1. Prepariamo i dati base
    nome = profile.get("nome", "Cliente")
    data_nascita = str(profile.get("birth_date", ""))
    luogo_nascita = profile.get("birth_city", "")
    
    # 2. Chiediamo all'AI di scrivere l'Introduzione
    prompt_intro = f"""Sei un'astrologa italiana. Scrivi l'introduzione per un libro astrologico personalizzato per {nome}, nato il {data_nascita} a {luogo_nascita}.
Tono: caldo, elegante, misterioso. Spiega che questo libro è un viaggio nel suo 2027.
Massimo 200 parole. Non usare markdown o asterischi."""
    
    intro = await _chiama_ai(prompt_intro, max_tokens=500)
    if not intro: intro = "Benvenuto nel tuo viaggio astrale."
    
    # 3. Chiediamo all'AI di scrivere il Capitolo 1 (Identità)
    riepilogo = report.get("riepilogo_testuale", "")
    prompt_cap1 = f"""Sei un'astrologa italiana. Scrivi il Capitolo 1 del libro di {nome}. 
Titolo: La Tua Identità Astrologica.
Basati su questi dati: {riepilogo}
Tono: elegante, empatico, profondo. Massimo 400 parole. Non usare markdown."""
    
    cap1 = await _chiama_ai(prompt_cap1, max_tokens=800)
    if not cap1: cap1 = "I tuoi pianeti raccontano una storia unica."
    
    # 4. Leggiamo il template HTML
    template_path = os.path.join(os.path.dirname(__file__), "template_libro.html")
    with open(template_path, "r", encoding="utf-8") as f:
        html_content = f.read()
        
    # 5. Sostituiamo i segnaposto
    html_content = html_content.replace("{{NOME_CLIENTE}}", nome)
    
    # Costruiamo il corpo del libro
    corpo_libro = f"""
    <div class="capitolo">
        <h2 class="titolo-capitolo">Introduzione</h2>
        <p>{intro}</p>
    </div>
    <div class="capitolo">
        <h2 class="titolo-capitolo">Parte I - La Tua Identità Astrologica</h2>
        <p>{cap1}</p>
    </div>
    """
    
    # Inseriamo il corpo nel template
    html_content = html_content.replace("<!-- QUI L'AI INSERIRÀ I CAPITOLI -->", corpo_libro)
    
    # 6. Generiamo il PDF
    nome_file = f"libro_{profile['id']}_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
    percorso_file = os.path.join("/tmp", nome_file)
    
    HTML(string=html_content).write_pdf(percorso_file)
    
    return percorso_file
