'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Vapi from '@vapi-ai/web';

const API_URL = "https://luna2-api.onrender.com";
const VAPI_PUBLIC_KEY = "LA_TUA_PUBLIC_KEY_QUI"; // <-- INCOLLA QUI LA TUA PUBLIC KEY DI VAPI
const VAPI_ASSISTANT_ID = "03b6ee79-4490-4c12-bd38-f00bfa2e6340";

function ConsulenzaContent() {
  const searchParams = useSearchParams();
  const [nome, setNome] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [vapi, setVapi] = useState<any>(null);
  const [errore, setErrore] = useState('');

  useEffect(() => {
    // 1. Prende il token dall'URL
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
      // Recupera il nome per mostrarlo a schermo (opzionale)
      fetch(`${API_URL}/sala/${urlToken}`)
        .then(res => res.json())
        .then(data => setNome(data.profile.nome))
        .catch(() => {});
    } else {
      setErrore("Attenzione: Nessun token trovato nell'URL. Sei sicuro di essere loggato?");
    }

    // 2. Inizializza Vapi
    const vapiInstance = new Vapi(VAPI_PUBLIC_KEY);
    setVapi(vapiInstance);

    vapiInstance.on('call-start', () => setIsCallActive(true));
    vapiInstance.on('call-end', () => setIsCallActive(false));
    vapiInstance.on('error', (e: any) => {
      console.error("Errore Vapi:", e);
      setErrore("Errore di connessione con la voce.");
      setIsCallActive(false);
    });

    return () => {
      vapiInstance.stop();
    };
  }, [searchParams]);

  const startCall = async () => {
    if (!vapi) return;
    if (!token) {
      setErrore("Manca il token, impossibile avviare la chiamata.");
      return;
    }
    
    setErrore('');
    
    // 3. Passiamo il token a Vapi in modo invisibile
    vapi.start(VAPI_ASSISTANT_ID, {
      variableValues: {
        token_cliente: token
      }
    });
  };

  const endCall = () => {
    if (vapi) vapi.stop();
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 flex flex-col items-center justify-center">
      <h1 className="text-3xl mb-4">Consulenza con Luna</h1>
      
      {errore && (
        <div className="bg-red-900 text-white p-4 rounded mb-4">
          {errore}
        </div>
      )}

      {nome && <p className="text-xl mb-8">Ciao {nome}, sono pronta ad ascoltarti.</p>}

      {!isCallActive ? (
        <button 
          onClick={startCall}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-full text-xl transition-all"
        >
          🎤 Inizia a parlare
        </button>
      ) : (
        <button 
          onClick={endCall}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 rounded-full text-xl animate-pulse"
        >
          🛑 Termina chiamata
        </button>
      )}
    </div>
  );
}

export default function ConsulenzaPage() {
  return (
    <Suspense fallback={<div className="text-white p-8">Caricamento...</div>}>
      <ConsulenzaContent />
    </Suspense>
  );
}
