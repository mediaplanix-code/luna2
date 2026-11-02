import os
from datetime import datetime
from weasyprint import HTML

async def genera_libro_completo(profile: dict, report: dict) -> str:
    """Versione di test: genera un PDF senza AI per verificare weasyprint."""
    
    nome = profile.get("nome", "Cliente")
    
    # Testi finti per testare la grafica
    intro = f"Questa è l'introduzione per {nome}. Il tuo viaggio nel 2027 inizia qui."
    cap1 = "Questo è il capitolo uno. I tuoi pianeti ti guidano verso nuove avventure."
    
    template_path = os.path.join(os.path.dirname(__file__), "template_libro.html")
    with open(template_path, "r", encoding="utf-8") as f:
        html_content = f.read()
        
    html_content = html_content.replace("{{NOME_CLIENTE}}", nome)
    
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
    
    html_content = html_content.replace("<!-- QUI L'AI INSERIRÀ I CAPITOLI -->", corpo_libro)
    
    nome_file = f"libro_{profile['id']}_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
    percorso_file = os.path.join("/tmp", nome_file)
    
    HTML(string=html_content).write_pdf(percorso_file)
    
    return percorso_file
