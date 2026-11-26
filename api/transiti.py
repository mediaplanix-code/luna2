# =========================================================
# LUNA2 — Motore dei transiti (lenti e veloci)
# =========================================================

from datetime import datetime, timedelta
import swisseph as swe

PIANETI_LENTI = {
    "Giove": swe.JUPITER,
    "Saturno": swe.SATURN,
    "Urano": swe.URANUS,
    "Nettuno": swe.NEPTUNE,
    "Plutone": swe.PLUTO,
}

PIANETI_VELOCI = {
    "Sole": swe.SUN,
    "Mercurio": swe.MERCURY,
    "Venere": swe.VENUS,
    "Marte": swe.MARS,
}

ASPETTI = {
    "congiunzione": 0,
    "sestile": 60,
    "quadratura": 90,
    "trigono": 120,
    "opposizione": 180,
}


def _calc_lon(jd: float, planet_id) -> float:
    res = swe.calc_ut(jd, planet_id)
    if isinstance(res, tuple):
        xx = res[0]
    else:
        xx = res
    if isinstance(xx, (tuple, list)):
        return float(xx[0]) % 360
    return float(xx) % 360


def _diff_angle(a: float, b: float) -> float:
    d = abs(a - b) % 360
    return min(d, 360 - d)


def _settore_da_casa(casa: int) -> str:
    if casa in (5, 7): return "Amore e relazioni"
    if casa in (6, 10): return "Lavoro e carriera"
    if casa in (2, 8): return "Soldi e risorse"
    if casa == 4: return "Famiglia e radici"
    if casa == 1: return "Identità e corpo"
    if casa == 9: return "Crescita e fede"
    if casa == 11: return "Amicizie e progetti"
    if casa == 12: return "Interiorità"
    if casa == 3: return "Comunicazione e studi"
    return "Vita quotidiana"


def _calcola_transiti_generico(data_inizio: str, pianeti_da_calcolare: dict, planets: dict, houses: list, ascendant: float, mc: float, planets_in_houses: dict, giorni_finestra: int = 365):
    dt_start = datetime.strptime(data_inizio, "%Y-%m-%d")
    dt_end = dt_start + timedelta(days=giorni_finestra)

    punti = {}
    for nome in ["Sole", "Luna"]:
        lon = planets.get(nome, {}).get("longitude")
        casa = planets_in_houses.get(nome)
        if lon is not None and casa:
            punti[nome] = {"lon": lon, "casa": casa}

    if ascendant is not None: punti["Ascendente"] = {"lon": ascendant, "casa": 1}
    if mc is not None: punti["MC"] = {"lon": mc, "casa": 10}

    risultati = []

    for planet_nome, planet_id in pianeti_da_calcolare.items():
        dt = dt_start
        prev_diff = {p: {} for p in punti}
        while dt <= dt_end:
            jd = swe.julday(dt.year, dt.month, dt.day, 12.0)
            try:
                lon_transito = _calc_lon(jd, planet_id)
            except Exception:
                dt += timedelta(days=1)
                continue

            for punto_nome, info in punti.items():
                lon_punto = info["lon"]
                casa = info["casa"]

                for aspetto_nome, angolo in ASPETTI.items():
                    diff = _diff_angle(lon_transito, lon_punto)
                    delta = diff - angolo
                    chiave = f"{punto_nome}_{aspetto_nome}"
                    prev_val = prev_diff[punto_nome].get(chiave)

                    if prev_val is not None:
                        if (prev_val > 0 and delta <= 0) or (prev_val < 0 and delta >= 0):
                            settore = _settore_da_casa(casa)
                            risultati.append({
                                "data_esatta": dt.strftime("%Y-%m-%d"),
                                "pianeta_transito": planet_nome,
                                "aspetto": aspetto_nome,
                                "punto_natale": punto_nome,
                                "casa_natale": casa,
                                "settore": settore,
                                "orbita_gradi": round(abs(delta), 2),
                            })
                    prev_diff[punto_nome][chiave] = delta
            dt += timedelta(days=1)

    visti = set()
    filtrati = []
    for r in risultati:
        chiave = (r["data_esatta"], r["pianeta_transito"], r["aspetto"], r["punto_natale"])
        if chiave not in visti:
            visti.add(chiave)
            filtrati.append(r)

    filtrati.sort(key=lambda x: x["data_esatta"])
    return filtrati


def calcola_transiti_lenti(data_inizio: str, planets: dict, houses: list, ascendant: float, mc: float, planets_in_houses: dict, mesi_finestra: int = 12):
    return _calcola_transiti_generico(data_inizio, PIANETI_LENTI, planets, houses, ascendant, mc, planets_in_houses, giorni_finestra=mesi_finestra * 30)

def calcola_transiti_veloci(data_inizio: str, planets: dict, houses: list, ascendant: float, mc: float, planets_in_houses: dict, giorni_finestra: int = 30):
    return _calcola_transiti_generico(data_inizio, PIANETI_VELOCI, planets, houses, ascendant, mc, planets_in_houses, giorni_finestra=giorni_finestra)
