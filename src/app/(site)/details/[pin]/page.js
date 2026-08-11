// =========================================================================
// OTO-CV ARAÇ DETAY ROUTE'U ((full)/details/[pin]/page.js)
// İşlev: URL'deki PIN kodu ile aracı buluttan çeker, oturum sahibiyle
//        karşılaştırıp sahip/ziyaretçi rolünü belirler.
//
// 🔒 NEDEN PIN, PLAKA DEĞİL: Plaka araç sahibine ulaşılabilecek kişisel
//    veridir; URL'de taşınırsa adres çubuğu, tarayıcı geçmişi, paylaşılan
//    link ve arama motoru indeksi üzerinden sızar. PIN ise zaten karne
//    kartında paylaşılmak üzere basılan kamuya açık anahtardır.
//
// Not: Next.js 16'da params bir Promise'tir; useParams() ile okuyoruz.
// =========================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import VehicleDetailsScreen from '@/components/VehicleDetailsScreen';
import GlobalStepLoader from '@/components/common/GlobalStepLoader';

export default function VehicleDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const pin = decodeURIComponent(params.pin);

  const [vehicle, setVehicle] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'notfound'

  useEffect(() => {
    let cancelled = false;

    const loadVehicle = async () => {
      setStatus('loading');

      // Büyük/küçük harf duyarsız: kullanıcı PIN'i elle yazarken karışabilir
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .ilike('pin_code', pin)
        .limit(1);

      if (cancelled) return;

      if (error || !data || data.length === 0) {
        setStatus('notfound');
        return;
      }

      const found = data[0];
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;

      setVehicle(found);
      setIsOwner(!!user && user.id === found.user_id);
      setStatus('ready');
    };

    loadVehicle();
    return () => { cancelled = true; };
  }, [pin]);

  if (status === 'loading') {
    // Tek çark yerine iskelet: gelen içeriğin şeklini taşır.
    // gecikmeMs=200 -> bekleme 200 ms'den kısaysa hiç gösterge çıkmaz;
    // kullanıcı 100 ms'i anlık sayar, orada gösterge yavaş hissettirir.
    return <GlobalStepLoader mode="iskelet" varyant="detay" gecikmeMs={200} />;
  }

  if (status === 'notfound') {
    return (
      <div className="min-h-screen bg-[#FFFDFB] flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <h1 className="text-lg font-black text-slate-900 tracking-tight">Araç bulunamadı</h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            <span className="font-mono font-bold text-slate-700">{pin}</span> koduna ait tescilli bir kayıt
            bulunamadı. Kodu kontrol edip tekrar deneyin.
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
      onViewKarne={() => router.push(`/karne/${encodeURIComponent(vehicle.pin_code)}`)}
      onManageInGarage={isOwner ? () => router.push('/garage') : undefined}
    />
  );
}
