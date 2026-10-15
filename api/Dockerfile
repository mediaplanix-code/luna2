FROM python:3.12-slim

WORKDIR /app

# Librerie di sistema richieste da pysweph
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Scarica i file delle effemeridi Swiss Ephemeris dal repository ufficiale GitHub
# Il range _18 copre gli anni 1800-2400, sufficiente per qualsiasi data di nascita moderna
RUN mkdir -p /app/ephe && \
    cd /app/ephe && \
    wget -q https://raw.githubusercontent.com/aloistr/swisseph/master/ephe/sepl_18.se1 && \
    wget -q https://raw.githubusercontent.com/aloistr/swisseph/master/ephe/semo_18.se1 && \
    wget -q https://raw.githubusercontent.com/aloistr/swisseph/master/ephe/seas_18.se1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
