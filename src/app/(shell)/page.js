// =========================================================================
// OTO-CV ANASAYFA ROUTE'U ((shell)/page.js)
// İşlev: Pazaryeri vitrinini açar. Navbar (shell) layout'undan geldiği için
//        burada tekrar basılmaz.
//
// Bu dosya, 436 satırlık eski src/app/page.js monolitinin yerini aldı.
// Ekran değiştirme artık viewState state'i ile değil, URL ile yapılıyor.
// =========================================================================

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import MarketplaceView from '@/components/marketplace/MarketplaceView';

export default function HomePage() {
  const router = useRouter();

  return (
    <MarketplaceView
      onSelectVehicle={(item) => router.push(`/details/${encodeURIComponent(item.pin_code)}`)}
      onNavigateToGarage={() => router.push('/garage')}
      onNavigateToVerify={() => router.push('/verify')}
      onNavigateToInsurance={() => router.push('/insurance-offer')}
      onNavigateToMaintenance={() => router.push('/maintenance-planner')}
      onOpenCreateListingModal={() => router.push('/add-vehicle/step1')}
    />
  );
}
