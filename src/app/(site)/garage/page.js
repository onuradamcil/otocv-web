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
import GlobalStepLoader from '@/components/common/GlobalStepLoader';

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
    // Tek çark yerine iskelet: gelen içeriğin şeklini taşır.
    // gecikmeMs=200 -> bekleme 200 ms'den kısaysa hiç gösterge çıkmaz;
    // kullanıcı 100 ms'i anlık sayar, orada gösterge yavaş hissettirir.
    return <GlobalStepLoader mode="iskelet" varyant="kart" gecikmeMs={200} />;
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
