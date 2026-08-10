// =========================================================================
// OTO-CV GARAJ ROUTE'U ((shell)/garage/page.js)
// İşlev: Oturum kontrolü yapar, garaj ekranını açar ve bakım modalını
//        sayfa içi state olarak yönetir.
//
// Not: Araç adresleri PIN tabanlı (plaka kişisel veri, URL'de taşınmaz).
//      Araç ekleme artık create-listing sihirbazına gidiyor; eski
//      add-vehicle akışı kaldırıldı.
// =========================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import GarageScreen from '@/components/GarageScreen';
import MaintenanceDialog from '@/components/garage/MaintenanceDialog';

export default function GaragePage() {
  const router = useRouter();
  const [authState, setAuthState] = useState('checking'); // 'checking' | 'ready'
  const [activeMaintenanceVehicle, setActiveMaintenanceVehicle] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;
      if (!user) {
        router.replace('/login');
        return;
      }
      setAuthState('ready');
    });

    return () => { cancelled = true; };
  }, [router]);

  if (authState === 'checking') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
        <span className="text-[11px] font-bold text-slate-400 tracking-wide">Garajınız hazırlanıyor...</span>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn relative">
      <GarageScreen
        key={refreshKey}
        onViewDetails={(car) => router.push(`/details/${encodeURIComponent(car.pin_code)}`)}
        onViewKarne={(car) => router.push(`/karne/${encodeURIComponent(car.pin_code)}`)}
        onOpenMaintenance={(incomingVehicle) => setActiveMaintenanceVehicle(incomingVehicle)}
        onNavigateToAdd={() => router.push('/add-vehicle/step1')}
      />

      {activeMaintenanceVehicle && (
        <MaintenanceDialog
          isOpen={true}
          vehicle={activeMaintenanceVehicle}
          onClose={() => setActiveMaintenanceVehicle(null)}
          onRecordAdded={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
