// =========================================================================
// OTO-CV KARNE ROUTE'U ((full)/karne/[pin]/page.js)
// İşlev: URL'deki PIN kodu ile aracı çeker ve Oto-Karne ekranını açar.
//
// 🔒 NEDEN PIN, PLAKA DEĞİL: bkz. (full)/details/[pin]/page.js — plaka
//    kişisel veri olduğu için URL'de taşınmaz.
//
// Not: Next.js 16'da params bir Promise'tir; useParams() ile okuyoruz.
// =========================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { pinNormalize } from '@/utils/pinUretici';
import OtoKarneScreen from '@/components/karne/OtoKarneScreen';
import GlobalStepLoader from '@/components/common/GlobalStepLoader';

export default function KarnePage() {
  const router = useRouter();
  const params = useParams();
  // URL'den gelen PIN normalleştiriliyor: boşluk/tire temizlenir, harfler
  // büyütülür ve alfabe dışı karakter REDDEDİLİR (boş metin döner).
  const pin = pinNormalize(decodeURIComponent(params.pin || ''));

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
      // `eq`, `ilike` DEĞİL — bu bir güvenlik düzeltmesi.
      //
      // PIN doğrudan URL'den geliyor ve önceki hâli `.ilike('pin_code', pin)`
      // idi. `ilike` desen karakterlerini yorumlar; `/details/CV-%25` adresi
      // `pin = 'CV-%'` üretiyor ve bu BÜTÜN araçlarla eşleşiyordu. Sayfa
      // `data[0]`'ı aldığı için ziyaretçi, plakası ve PIN'i dahil rastgele
      // bir aracın tam kaydını görüyordu. Canlı veride doğrulandı: `CV-%`
      // 10 aracın 10'uyla eşleşti.
      //
      // pinNormalize alfabe dışı karakteri reddediyor, `eq` de hiçbir
      // koşulda desen olarak yorumlanmıyor. İki katman.
      //
      // Büyük/küçük harf duyarsızlık korunuyor: pinNormalize girdiyi
      // büyütüyor, PIN'ler büyük harfle saklanıyor. Ek fayda: `eq` indeksi
      // kullanır, `ilike` kullanamıyordu.
        .eq('pin_code', pin)
        .limit(1);

      if (cancelled) return;

      if (error || !data || data.length === 0) {
        setStatus('notfound');
        return;
      }

      const found = data[0];

      // Rol, detay sayfasıyla aynı mantıkla sahiplikten türetiliyor (spec 7.3).
      // Resmi sicil belgesindeki plaka yalnızca ruhsat sahibine görünür.
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
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <h1 className="text-lg font-black text-slate-900 tracking-tight">Karne bulunamadı</h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            <span className="font-mono font-bold text-slate-700">{pin}</span> koduna ait tescilli bir kayıt yok.
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

  return <OtoKarneScreen vehicle={vehicle} onBack={() => router.back()} isPublicView={!isOwner} />;
}
