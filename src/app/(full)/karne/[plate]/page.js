// =========================================================================
// OTO-CV KARNE ROUTE'U ((full)/karne/[plate]/page.js)
// İşlev: URL'deki plakayla aracı çeker ve Oto-Karne ekranını açar.
// Not:   Next.js 16'da params bir Promise'tir; useParams() ile okuyoruz.
// =========================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import OtoKarneScreen from '@/components/karne/OtoKarneScreen';

export default function KarnePage() {
  const router = useRouter();
  const params = useParams();
  const plate = decodeURIComponent(params.plate);

  const [vehicle, setVehicle] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'notfound'

  useEffect(() => {
    let cancelled = false;

    const loadVehicle = async () => {
      setStatus('loading');

      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('plate_number', plate)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setStatus('notfound');
        return;
      }

      setVehicle(data);
      setStatus('ready');
    };

    loadVehicle();
    return () => { cancelled = true; };
  }, [plate]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
        <span className="text-[11px] font-bold text-slate-400 tracking-wide">Resmi sicil derleniyor...</span>
      </div>
    );
  }

  if (status === 'notfound') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <h1 className="text-lg font-black text-slate-900 tracking-tight">Karne bulunamadı</h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            <span className="font-mono font-bold text-slate-700">{plate}</span> plakasına ait tescilli bir kayıt yok.
          </p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl transition-colors cursor-pointer"
          >
            Anasayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  return <OtoKarneScreen vehicle={vehicle} onBack={() => router.back()} />;
}
