@app.get("/admin/clienti")
async def admin_clienti(password: str = ""):
    try:
        admin_password = os.getenv("ADMIN_PASSWORD", "")
        if not admin_password or password != admin_password:
            raise HTTPException(status_code=403, detail="Non autorizzato.")

        sb = create_client(SUPABASE_URL, SUPABASE_KEY)
        res = sb.table("profiles").select("*").order("created_at", desc=True).execute()
        clienti = res.data or []

        # Mappa dei libri
        libri_res = sb.table("libri_in_coda").select("profile_id, stato").execute()
        libri_map = {}
        for l in (libri_res.data or []):
            libri_map[l["profile_id"]] = l["stato"]

        risultato = []
        for c in clienti:
            # Età
            eta = None
            segno = ""
            data_nascita = str(c.get("birth_date", ""))[:10] if c.get("birth_date") else ""
            if data_nascita:
                try:
                    from datetime import date
                    anno, mese, giorno = map(int, data_nascita.split("-"))
                    oggi = date.today()
                    eta = oggi.year - anno - ((oggi.month, oggi.day) < (mese, giorno))
                    # Segno zodiacale (approssimativo per il Sole)
                    segni = ["Capricorno", "Acquario", "Pesci", "Ariete", "Toro", "Gemelli", "Cancro", "Leone", "Vergine", "Bilancia", "Scorpione", "Sagittario"]
                    idx = (mese - 1) * 2 + (1 if giorno >= 21 else 0)
                    if idx >= 24: idx -= 24
                    segno = segni[idx // 2]
                except:
                    eta = None

            risultato.append({
                "id": c["id"],
                "nome": c.get("nome"),
                "email": c.get("email"),
                "telefono": c.get("telefono") or "",
                "sesso": c.get("sesso", "Non specificato"),
                "eta": eta,
                "data_nascita": data_nascita,
                "segno": segno,
                "citta": c.get("birth_city", ""),
                "credito_secondi": c.get("credito_secondi", 0),
                "is_paying": c.get("is_paying", False),
                "telegram_id": c.get("telegram_id"),
                "created_at": c.get("created_at"),
                "libro": libri_map.get(c["id"], "nessuno"),
                "marketing_consent": c.get("marketing_consent", False),
                "importo_totale": float(c.get("importo_totale") or 0),
                "data_ultimo_pagamento": c.get("data_ultimo_pagamento"),
            })

        return {"status": "ok", "clienti": risultato, "totale": len(risultato)}
    except HTTPException: raise
    except Exception as e:
        print(f"=== ERRORE ADMIN CLIENTI: {e} ===")
        raise HTTPException(status_code=500, detail=str(e))
