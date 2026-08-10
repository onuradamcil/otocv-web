// =========================================================================
// OTO-CV AKTİF İLANLARIM ROUTE'U ((shell)/my-listings/page.js)
// İşlev: Oturumu doğrular, kullanıcı nesnesini ekrana geçirir.
// =========================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import MyListingsScreen from '@/components/marketplace/MyListingsScreen';

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
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
        <span className="text-[11px] font-bold text-slate-400 tracking-wide">İlanlarınız yükleniyor...</span>
      </div>
    );
  }

  return <MyListingsScreen user={user} onNavigateToGarage={() => router.push('/garage')} />;
}
