// =========================================================================
// BAKIM PLANLAYICI ROTASI ((site)/maintenance-planner/page.js)
//
// Yer tutucu değil artık: ekran `BakimEkrani` bileşeninde.
//
// Bu rota anasayfadaki "Bakım Takvimi · Randevu Al" kartının hedefiydi ve
// `ComingSoon` gösteriyordu — sigorta kartıyla birebir aynı ölü kapı.
//
// ⚠ SUSPENSE ZORUNLU: `BakimEkrani` `?demo=1` parametresini
// `useSearchParams` ile okuyor. Next 16'da bu kanca ön işlenen bir rotada
// en yakın Suspense sınırına kadar olan ağacı istemcide çizdiriyor; sınır
// yoksa derleme hata veriyor.
// =========================================================================

'use client';

import React, { Suspense } from 'react';
import BakimEkrani from '@/components/BakimEkrani';
import GlobalStepLoader from '@/components/common/GlobalStepLoader';

export default function Page() {
  return (
    <Suspense
      fallback={
        <GlobalStepLoader
          isLoading
          title="Bakım geçmişiniz okunuyor"
          subtitle="Araç ve servis kayıtlarınız getiriliyor..."
        />
      }
    >
      <BakimEkrani />
    </Suspense>
  );
}
