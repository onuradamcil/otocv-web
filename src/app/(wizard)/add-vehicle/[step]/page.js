// =========================================================================
// OTO-CV ARAÇ KAYIT SİHİRBAZI ROUTE'U ((full)/add-vehicle/[step]/page.js)
// İşlev: 4 adımlı araç kayıt sihirbazını tam sayfa açar.
//
// ÖNEMLİ: Burada açılan sihirbaz create-listing klasöründeki
//         CreateListingWizard'dır. Eski components/add-vehicle/ akışı
//         tamamen kaldırıldı — garajdaki "araç ekle" butonu artık
//         bu route'a geliyor.
//
// -------------------------------------------------------------------------
// `[step]` PARAMETRESİ BURADA BİLEREK OKUNMUYOR
// -------------------------------------------------------------------------
// Adres ↔ adım eşlemesi `CreateListingWizard` içinde, `history.pushState`
// ile yapılıyor. Sebebi: sihirbazın 4 adımlık form verisinin tamamı o
// bileşenin state'inde duruyor ve rotayı yeniden çalıştırmak (dinamik
// parçayı `router.push` ile değiştirmek) o veriyi uçurma riski taşıyor.
//
// ⚠ ADRES ADIMI BELİRLEMİYOR, YANSITIYOR. Adres çubuğuna `step4` yazan
// kullanıcı 4. adıma GİTMİYOR: sihirbaz ulaşılmış adımda kalıyor ve adresi
// sessizce düzeltiyor. İleri geçişin tek yolu `handleNextStep` ve oradaki
// kapılar (zorunlu alanlar + plaka tescil sorgusu) atlanamıyor.
//
// Kaldığı yerden devam etme işini `vehicle_drafts` tablosu görüyor
// (kullanıcı başına tek satır, `form_data` + `current_step`); o mekanizma
// cihazdan bağımsız çalışıyor ve buradaki adres katmanı ona karışmıyor.
// =========================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import CreateListingWizard from '@/components/marketplace/create-listing/CreateListingWizard';
import GlobalStepLoader from '@/components/common/GlobalStepLoader';

export default function AddVehiclePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authState, setAuthState] = useState('checking'); // 'checking' | 'ready'

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      if (cancelled) return;
      if (!currentUser) {
        router.replace('/login');
        return;
      }
      setUser(currentUser);
      setAuthState('ready');
    });

    return () => { cancelled = true; };
  }, [router]);

  if (authState === 'checking') {
    // Tek çark yerine iskelet: gelen içeriğin şeklini taşır.
    // gecikmeMs=200 -> bekleme 200 ms'den kısaysa hiç gösterge çıkmaz;
    // kullanıcı 100 ms'i anlık sayar, orada gösterge yavaş hissettirir.
    return <GlobalStepLoader mode="iskelet" varyant="form" gecikmeMs={200} />;
  }

  return (
    <CreateListingWizard
      user={user}
      onBack={() => router.push('/garage')}
      onSuccess={() => router.push('/garage')}
    />
  );
}
