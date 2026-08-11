// =========================================================================
// OTO-CV ARAÇ KAYIT SİHİRBAZI ROUTE'U ((full)/add-vehicle/[step]/page.js)
// İşlev: 4 adımlı araç kayıt sihirbazını tam sayfa açar.
//
// ÖNEMLİ: Burada açılan sihirbaz create-listing klasöründeki
//         CreateListingWizard'dır. Eski components/add-vehicle/ akışı
//         tamamen kaldırıldı — garajdaki "araç ekle" butonu artık
//         bu route'a geliyor.
//
// Not: Adım ilerlemesi şu an sihirbazın kendi içinde yönetiliyor;
//      URL ile adım eşlemesi ayrı bir iş kalemi (plan Görev 7).
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
