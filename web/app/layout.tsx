import './globals.css';

export const metadata = {
  title: 'Luna2 — Il tuo oroscopo personalizzato',
  description: 'Scopri il tuo tema natale reale e ricevi il tuo oroscopo su WhatsApp e Telegram.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
