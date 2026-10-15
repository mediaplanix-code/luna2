# =========================================================
# LUNA2 — Motore dei transiti lenti
# Calcola i transiti dei pianeti lenti sui punti sensibili
# del tema natale, in una finestra temporale di 12 mesi.
# =========================================================

from datetime import datetime, timedelta
import swisseph as swe

# Pianeti lenti: quelli che contano davvero (mesi o anni per segno)
PIANETI_LENTI = {
    "Giove": swe.JUPITER,
    "Saturno": swe.SATURN,
    "Urano": swe.URANUS,
    "Nettuno": swe.NEPTUNE,
    "Plutone": swe.PLUTO,
}

# Punti natale sensibili (dove un transito lento "fa male o fa bene")
PUNTI_SENSIBILI = [
    "Sole", "Luna", "Ascendente", "MC",
]

# Case angolari: quelle che l'utente sente di più
CASE_ANGOLARI = [1, 4, 7, 10]

# Aspetti maggiori e loro orbite
ASPETTI = {
    "congiunzione": 0,
    "sestile": 60,
    "quadratura": 90,
    "trigono": 120,
    "opposizione": 180,
}

ORBITA = 2.0  # gradi


def _calc_lon(jd: float, planet_id) -> float:
    """Longitudine eclittica sicura (gestisce la firma di pysweph)."""
    res = swe.calc_ut(jd, planet_id)
    if isinstance(res, tuple):
        xx = res[0]
    else:
        xx = res
    if isinstance(xx, (tuple, list)):
        return float(xx[0]) % 360
    return float(xx) % 360


def _diff_angle(a: float, b: float) -> float:
    """Differenza angolare minima tra due longitudini (0-180)."""
    d = abs(a - b) % 360
    return min(d, 360 - d)


def _settore_da_casa(casa: int) -> str:
    """Mappa la casa al settore di vita."""
    if casa in (5, 7):
        return "Amore e relazioni"
    if casa in (6, 10):
        return "Lavoro e carriera"
    if casa in (2, 8):
        return "Soldi e risorse"
    if casa == 4:
        return "Famiglia e radici"
    if casa == 1:
        return "Identità e corpo"
    if casa == 9:
        return "Crescita e fede"
    if casa == 11:
        return "Amicizie e progetti"
    if casa == 12:
        return "Interiorità"
    if casa == 3:
        return "Comunicazione e studi"
    return "Vita quotidiana"


def _casa_di_punto(lon_punto: float, houses: list) -> int:
    """Trova in quale casa cade una longitudine."""
    for k in range(12):
        c1 = houses[k]
        c2 = houses[(k + 1) % 12]
        if c1 <= c2:
            if c1 <= lon_punto < c2:
                return k + 1
        else:
            if lon_punto >= c1 or lon_punto < c2:
                return k + 1
    return 1


def calcola_transiti_lenti(
    data_inizio: str,
    planets: dict,
    houses: list,
    ascendant: float,
    mc: float,
    mesi_finestra: int = 12,
):
    """
    Calcola i transiti dei pianeti lenti sui punti natale sensibili
    nella finestra [data_inizio, data_inizio + mesi_finestra].

    Ritorna una lista di dict, uno per ogni transito esatto trovato.
    """
    dt_start = datetime.strptime(data_inizio, "%Y-%m-%d")
    dt_end = dt_start + timedelta(days=mesi_finestra * 30)

    # Punti sensibili con longitudine
    punti = {
        "Sole": planets.get("Sole", {}).get("longitude", 0),
        "Luna": planets.get("Luna", {}).get("longitude", 0),
        "Ascendente": ascendant,
        "MC": mc,
    }

    risultati = []

    # Scansione giorno per giorno (fitta abbastanza per cogliere l'esattezza)
    for planet_nome, planet_id in PIANETI_LENTI.items():
        dt = dt_start
        prev_diff_per_punto = {p: None for p in punti}
        while dt <= dt_end:
            jd = swe.julday(dt.year, dt.month, dt.day, 12.0)
            lon_transito = _calc_lon(jd, planet_id)

            for punto_nome, lon_punto in punti.items():
                for aspetto_nome, angolo in ASPETTI.items():
                    diff = _diff_angle(lon_transito, lon_punto)
                    delta = diff - angolo

                    # Rileva attraversamento (da positivo a negativo o viceversa)
                    prev = prev_diff_per_punto[punto_nome]
                    if prev is not None:
                        chiave = f"{punto_nome}_{aspetto_nome}"
                        prev_val = prev.get(chiave)
                        if prev_val is not None:
                            if (prev_val > 0 and delta <= 0) or (prev_val < 0 and delta >= 0):
                                # Transito esatto in questa data
                                casa = _casa_di_punto(lon_punto, houses)
                                settore = _settore_da_casa(casa)
                                risultati.append({
                                    "data_esatta": dt.strftime("%Y-%m-%d"),
                                    "pianeta_transito": planet_nome,
                                    "aspetto": aspetto_nome,
                                    "punto_natale": punto_nome,
                                    "casa_natale": casa,
                                    "settore": settore,
                                    "orbita_gradi": round(abs(delta), 2),
                                    "lunghezza_finestra_giorni": 30,
                                })
                        prev[chiave] = delta
                    else:
                        prev_diff_per_punto[punto_nome] = {f"{punto_nome}_{aspetto_nome}": delta}

            dt += timedelta(days=1)

    # Rimuovi duplicati (stesso transito rilevato più volte per oscillazioni)
    visti = set()
    filtrati = []
    for r in risultati:
        chiave = (r["data_esatta"], r["pianeta_transito"], r["aspetto"], r["punto_natale"])
        if chiave not in visti:
            visti.add(chiave)
            filtrati.append(r)

    # Ordina per data
    filtrati.sort(key=lambda x: x["data_esatta"])

    return filtrati
