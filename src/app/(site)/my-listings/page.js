// =========================================================================
// OTO-CV AKTİF İLANLARIM ROUTE'U ((shell)/my-listings/page.js)
// İşlev: Oturumu doğrular, kullanıcı nesnesini ekrana geçirir.
// =========================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import MyListingsScreen from '@/components/marketplace/MyListingsScreen';
import GlobalStepLoader from '@/components/common/GlobalStepLoader';

export default function MyListingsPage() {
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
    return <GlobalStepLoader mode="iskelet" varyant="kart" gecikmeMs={200} />;
  }

  return <MyListingsScreen user={user} onNavigateToGarage={() => router.push('/garage')} />;
}
