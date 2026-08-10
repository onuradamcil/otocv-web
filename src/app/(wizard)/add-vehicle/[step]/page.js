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
    return (
      <div className="min-h-screen bg-[#FFFDFB] flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
        <span className="text-[11px] font-bold text-slate-400 tracking-wide">Sihirbaz hazırlanıyor...</span>
      </div>
    );
  }

  return (
    <CreateListingWizard
      user={user}
      onBack={() => router.push('/garage')}
      onSuccess={() => router.push('/garage')}
    />
  );
}
