'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Vapi from '@vapi-ai/web';

const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/test_fZu14pfFefK76BRgk8e3e00";
const API_URL = "https://luna2-api.onrender.com";
const VAPI_PUBLIC_KEY = "INSERISCI_QUI_LA_TUA_PUBLIC_KEY"; // <-- METTI LA TUA PUBLIC KEY
const VAPI_ASSISTANT_ID = "03b6ee79-4490-4c12-bd38-f00bfa2e6340";

function ConsulenzaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focus = searchParams.get('focus') || 'generico';
  const pagato = searchParams.get('pagato');

  const [nome, setNome] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [vapi, setVapi] = useState<any>(null);

  useEffect(() => {
    // Prende il token dall'URL (es. ?token=xyz)
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
      fetch(`${API_URL}/sala/${urlToken}`)
        .then(res => res.json())
        .then(data => setNome(data.profile.nome))
        .catch(() => {});
    }

    // Inizializza Vapi
    const vapiInstance = new Vapi(VAPI_PUBLIC_KEY);
    setVapi(vapiInstance);

    vapiInstance.on('call-start', () => setIsCallActive(true));
    vapiInstance.on('call-end', () => setIsCallActive(false));

    return () => {
      vapiInstance.stop();
    };
  }, [searchParams]);

  const startCall = async () => {
    if (!vapi || !token) return;
    
    // Passiamo il token di nascosto a Vapi tramite variableValues
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
      {nome && <p className="text-xl mb-8">Ciao {nome}, sono pronta ad ascoltarti.</p>}

      {!isCallActive ? (
        <button 
          onClick={startCall}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-full text-xl"
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
