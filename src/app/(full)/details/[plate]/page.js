// =========================================================================
// OTO-CV ARAÇ DETAY ROUTE'U ((full)/details/[plate]/page.js)
// İşlev: URL'deki plakayla aracı buluttan çeker, oturum sahibiyle
//        karşılaştırıp sahip/ziyaretçi rolünü belirler.
// Not:   Next.js 16'da params bir Promise'tir. Client component olduğumuz
//        için useParams() ile okuyoruz.
// =========================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import VehicleDetailsScreen from '@/components/VehicleDetailsScreen';

export default function VehicleDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const plate = decodeURIComponent(params.plate);

  const [vehicle, setVehicle] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
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

      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;

      setVehicle(data);
      setIsOwner(!!user && user.id === data.user_id);
      setStatus('ready');
    };

    loadVehicle();
    return () => { cancelled = true; };
  }, [plate]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#FFFDFB] flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
        <span className="text-[11px] font-bold text-slate-400 tracking-wide">Araç sicili yükleniyor...</span>
      </div>
    );
  }

  if (status === 'notfound') {
    return (
      <div className="min-h-screen bg-[#FFFDFB] flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <h1 className="text-lg font-black text-slate-900 tracking-tight">Araç bulunamadı</h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            <span className="font-mono font-bold text-slate-700">{plate}</span> plakasına ait tescilli bir kayıt
            bulunamadı. Plakayı kontrol edin ya da PIN kodu ile sorgulayın.
          </p>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => router.push('/verify')}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl transition-colors cursor-pointer"
            >
              PIN ile Sorgula
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="flex-1 bg-white hover:bg-slate-50 text-slate-800 border border-gray-200 font-bold text-xs py-3 rounded-xl transition-colors cursor-pointer"
            >
              Anasayfa
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <VehicleDetailsScreen
      vehicle={vehicle}
      isPublicView={!isOwner}
      onBack={() => router.back()}
      onViewKarne={() => router.push(`/karne/${encodeURIComponent(plate)}`)}
      onManageInGarage={isOwner ? () => router.push('/garage') : undefined}
    />
  );
}
