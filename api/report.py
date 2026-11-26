# =========================================================
# LUNA2 — Assemblaggio del report interno
# Combina tema natale + significati + transiti in un unico
# documento pronto per l'AI (chat + voce).
# =========================================================

from datetime import datetime
from transiti import calcola_transiti_lenti, calcola_transiti_veloci


def assembla_report(
    profile: dict,
    tema: dict,
    significati_ps: list,
    significati_pc: list,
    significati_tr: list,
):
    """
    profile: riga dalla tabella profiles
    tema: risultato di calcola_tema_completo
    significati_ps, pc, tr: dataset astrologici
    Ritorna un dict pronto per essere passato all'AI.
    """

    # --- 1. Indici per lookup veloce ---
    map_ps = {(r["pianeta"], r["segno"]): r["testo"] for r in significati_ps}
    map_pc = {(r["pianeta"], r["casa"]): r["testo"] for r in significati_pc}
    map_tr = {
        (r["pianeta_transito"], r["aspetto"], r["punto_natale"]): (r["testo"], r["durata_mesi"])
        for r in significati_tr
    }

    # --- 2. Pianeti con significati ---
    pianeti_report = []
    planets = tema["planets"]
    planets_in_houses = tema["planets_in_houses"]

    for nome, pos in planets.items():
        segno = pos["segno"]
        grado = pos["grado"]
        casa = planets_in_houses.get(nome)
        significato_segno = map_ps.get((nome, segno), "")
        significato_casa = map_pc.get((nome, casa), "") if casa else ""
        pianeti_report.append({
            "pianeta": nome,
            "segno": segno,
            "grado": grado,
            "casa": casa,
            "significato_segno": significato_segno,
            "significato_casa": significato_casa,
        })

    # --- 3. Ascendente e MC ---
    asc_lon = tema.get("ascendant")
    mc_lon = tema.get("mc")
    asc_sign = lon_to_sign_local(asc_lon) if asc_lon is not None else None
    mc_sign = lon_to_sign_local(mc_lon) if mc_lon is not None else None

    # --- 4. Aspetti con significato sintetico ---
    aspetti_report = []
    for a in tema["aspects"]:
        aspetti_report.append({
            "pianeta1": a["pianeta1"],
            "pianeta2": a["pianeta2"],
            "tipo": a["tipo"],
            "orb": a["orb"],
            "lettura": f"{a['pianeta1']} in {a['tipo']} con {a['pianeta2']} (orbita {a['orb']}°)",
        })

    # --- 5. Calcolo Transiti (Veloci e Lenti) ---
    oggi_str = datetime.now().strftime("%Y-%m-%d")
    
    # Transiti lenti (12 mesi)
    transiti_lenti = calcola_transiti_lenti(
        data_inizio=oggi_str,
        planets=tema["planets"],
        houses=tema["houses"],
        ascendant=tema["ascendant"],
        mc=tema["mc"],
        planets_in_houses=tema["planets_in_houses"],
        mesi_finestra=12,
    )
    
    # Transiti veloci (30 giorni)
    transiti_veloci = calcola_transiti_veloci(
        data_inizio=oggi_str,
        planets=tema["planets"],
        houses=tema["houses"],
        ascendant=tema["ascendant"],
        mc=tema["mc"],
        planets_in_houses=tema["planets_in_houses"],
        giorni_finestra=30,
    )

    transiti_report = []
    for t in transiti_lenti:
        chiave = (t["pianeta_transito"], t["aspetto"], t["punto_natale"])
        significato, durata = map_tr.get(chiave, ("", 6))
        transiti_report.append({
            "data_esatta": t["data_esatta"],
            "pianeta_transito": t["pianeta_transito"],
            "aspetto": t["aspetto"],
            "punto_natale": t["punto_natale"],
            "casa_natale": t["casa_natale"],
            "settore": t["settore"],
            "significato": significato,
            "durata_mesi": durata,
            "tipo_transito": "lento"
        })

    transiti_veloci_report = []
    for t in transiti_veloci:
        transiti_veloci_report.append({
            "data_esatta": t["data_esatta"],
            "pianeta_transito": t["pianeta_transito"],
            "aspetto": t["aspetto"],
            "punto_natale": t["punto_natale"],
            "casa_natale": t["casa_natale"],
            "settore": t["settore"],
            "significato": "Transito veloce: energia passeggera e concreta.",
            "durata_mesi": 1,
            "tipo_transito": "veloce"
        })

    # --- 6. Raggruppa i transiti per settore ---
    settori = {}
    for t in transiti_report + transiti_veloci_report:
        s = t["settore"]
        if s not in settori:
            settori[s] = []
        settori[s].append(t)

    # --- 7. Riepilogo testuale per l'AI ---
    riepilogo = []
    riepilogo.append(f"DATA ODIERNA: {datetime.now().strftime('%d/%m/%Y')}")
    riepilogo.append(f"Cliente: {profile.get('nome')}")
    riepilogo.append(f"Nato il: {profile.get('birth_date')} alle {profile.get('birth_time')}")
    riepilogo.append(f"Luogo: {profile.get('birth_city')}")
    riepilogo.append("")
    riepilogo.append("TEMA NATALE:")
    for p in pianeti_report:
        riepilogo.append(f"- {p['pianeta']} in {p['segno']} ({p['grado']}°), casa {p['casa']}")
        if p["significato_segno"]:
            riepilogo.append(f"  Significato segno: {p['significato_segno']}")
        if p["significato_casa"]:
            riepilogo.append(f"  Significato casa: {p['significato_casa']}")
    if asc_sign:
        riepilogo.append(f"- Ascendente in {asc_sign}")
    if mc_sign:
        riepilogo.append(f"- Medio Cielo in {mc_sign}")
    riepilogo.append("")
    
    if aspetti_report:
        riepilogo.append("ASPETTI PRINCIPALI:")
        for a in aspetti_report[:10]:
            riepilogo.append(f"- {a['lettura']}")
        riepilogo.append("")

    riepilogo.append("TRANSITI VELOCI (PROSSIMI 30 GIORNI - PER L'IMMEDIATO):")
    if not transiti_veloci_report:
         riepilogo.append("- Nessun transito veloce rilevante nel prossimo mese.")
    for t in transiti_veloci_report:
        riepilogo.append(
            f"- {t['data_esatta']}: {t['pianeta_transito']} in {t['aspetto']} "
            f"al tuo {t['punto_natale']} (settore: {t['settore']})"
        )
    riepilogo.append("")

    riepilogo.append("TRANSITI LENTI (PROSSIMI 12 MESI - PER IL FUTURO):")
    if not transiti_report:
         riepilogo.append("- Nessun transito lento rilevante nei prossimi 12 mesi.")
    for t in transiti_report:
        riepilogo.append(
            f"- {t['data_esatta']}: {t['pianeta_transito']} in {t['aspetto']} "
            f"al tuo {t['punto_natale']} (settore: {t['settore']}, "
            f"durata ~{t['durata_mesi']} mesi)"
        )
        if t["significato"]:
            riepilogo.append(f"  {t['significato']}")

    return {
        "profile": {
            "nome": profile.get("nome"),
            "birth_date": str(profile.get("birth_date")),
            "birth_time": str(profile.get("birth_time"))[:5] if profile.get("birth_time") else None,
            "birth_city": profile.get("birth_city"),
        },
        "pianeti": pianeti_report,
        "ascendente": {"longitude": asc_lon, "segno": asc_sign},
        "medio_cielo": {"longitude": mc_lon, "segno": mc_sign},
        "aspetti": aspetti_report,
        "transiti_lenti_12_mesi": transiti_report,
        "transiti_veloci_30_giorni": transiti_veloci_report,
        "settori": settori,
        "riepilogo_testuale": "\n".join(riepilogo),
    }


def lon_to_sign_local(lon: float) -> str:
    segni = ["Ariete", "Toro", "Gemelli", "Cancro", "Leone", "Vergine",
             "Bilancia", "Scorpione", "Sagittario", "Capricorno",
             "Acquario", "Pesci"]
    lon = lon % 360
    return segni[int(lon // 30)]
