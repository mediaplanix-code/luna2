FROM python:3.12-slim

WORKDIR /app

# Librerie di sistema richieste da pysweph
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Scarica i file delle effemeridi Swiss Ephemeris
RUN mkdir -p /app/ephe && \
    cd /app/ephe && \
    wget -q https://www.astro.com/ftp/swisseph/ephe/seas_18.se1 && \
    wget -q https://www.astro.com/ftp/swisseph/ephe/sepl_18.se1 && \
    wget -q https://www.astro.com/ftp/swisseph/ephe/semo_18.se1 && \
    wget -q https://www.astro.com/ftp/swisseph/ephe/seas_12.se1 && \
    wget -q https://www.astro.com/ftp/swisseph/ephe/sepl_12.se1 && \
    wget -q https://www.astro.com/ftp/swisseph/ephe/semo_12.se1 && \
    wget -q https://www.astro.com/ftp/swisseph/ephe/seas_06.se1 && \
    wget -q https://www.astro.com/ftp/swisseph/ephe/sepl_06.se1 && \
    wget -q https://www.astro.com/ftp/swisseph/ephe/semo_06.se1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
