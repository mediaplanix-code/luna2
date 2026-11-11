import os
import httpx
import json

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent"

async def _chiama_gemini_libro(prompt: str, schema: dict) -> dict:
    if not GEMINI_API_KEY:
        return {}
    
    # Struttura per forzare l'output JSON
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": schema
        }
    }
    
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(f"{GEMINI_URL}?key={GEMINI_API_KEY}", json=payload)
            if r.status_code != 200:
                print(f"=== ERRORE GEMINI: {r.status_code} - {r.text} ===")
                return {}
            
            data = r.json()
            testo = data["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(testo)
    except Exception as e:
        print(f"=== ERRORE GEMINI ECCEZIONE: {e} ===")
        return {}
