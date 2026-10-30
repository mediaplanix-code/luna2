@app.post("/avvia-voce/{token}")
async def avvia_voce(token: str):
    try:
        sb = create_client(SUPABASE_URL, SUPABASE_KEY)
        res = sb.table("profiles").select("*").eq("access_token", token).execute()
        if not res.data: raise HTTPException(status_code=404, detail="Profilo non trovato")
        profile = res.data[0]
        
        adesso = datetime.now(timezone.utc)
        sb.table("profiles").update({"timer_avviato_il": adesso.isoformat()}).eq("id", profile["id"]).execute()
        return {"status": "ok"}
    except HTTPException: raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ferma-voce/{token}")
async def ferma_voce(token: str):
    try:
        sb = create_client(SUPABASE_URL, SUPABASE_KEY)
        res = sb.table("profiles").select("*").eq("access_token", token).execute()
        if not res.data: raise HTTPException(status_code=404, detail="Profilo non trovato")
        profile = res.data[0]
        
        inizio_iso = profile.get("timer_avviato_il")
        if not inizio_iso:
            return {"status": "ok", "credito_secondi": profile.get("credito_secondi", 0)}
        
        inizio = datetime.fromisoformat(str(inizio_iso).replace("Z", "+00:00"))
        adesso = datetime.now(timezone.utc)
        secondi_trascorsi = int((adesso - inizio).total_seconds())
        
        credito_attuale = profile.get("credito_secondi") or 0
        nuovo_credito = max(0, credito_attuale - secondi_trascorsi)
        
        sb.table("profiles").update({
            "credito_secondi": nuovo_credito,
            "timer_avviato_il": None
        }).eq("id", profile["id"]).execute()
        
        return {"status": "ok", "credito_secondi": nuovo_credito, "consumati": secondi_trascorsi}
    except HTTPException: raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
