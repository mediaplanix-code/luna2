# Luna2

Piattaforma astrologica personalizzata mobile-first.

## Cosa fa

- Raccoglie i dati di nascita del cliente
- Calcola il tema natale reale con Swiss Ephemeris (pianeti, case, aspetti, transiti)
- Invia oroscopo giornaliero / segnali mensili / auguri di compleanno via Telegram e WhatsApp
- Genera un report interno NON visibile all'utente
- Offre consulenza AI di 15 minuti a 19€

## Stack

- Frontend: Next.js (mobile-first)
- Backend calcoli: Python + Swiss Ephemeris
- Database: Supabase
- Hosting: Render
- DNS/CDN: Cloudflare
- Email: Resend + Brevo
- Messaggistica: Telegram Bot + WhatsApp Cloud API

## Struttura prevista

\`\`\`
web/       → sito Next.js
api/       → microservizio calcoli astrologici (Python)
cron/      → invio automatico oroscopi
supabase/  → schema database
\`\`\`

## Stato

🚧 In costruzione
