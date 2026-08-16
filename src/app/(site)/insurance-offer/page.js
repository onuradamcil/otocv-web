// =========================================================================
// TEKLİF ROTASI ((site)/insurance-offer/page.js)
//
// Yer tutucu değil artık: ekran `TeklifEkrani` bileşeninde.
//
// -------------------------------------------------------------------------
// ⚠ SUSPENSE ZORUNLU — SÜS DEĞİL
// -------------------------------------------------------------------------
// `TeklifEkrani` adres çubuğundaki `?plaka=&tur=&kaynak=` parametrelerini
// `useSearchParams` ile okuyor. Next 16'da bu kanca, ön işlenen (prerender)
// bir rotada en yakın Suspense sınırına kadar olan istemci ağacını
// istemcide çizdiriyor; sınır YOKSA derleme hata veriyor.
// (node_modules/next/dist/docs/01-app/03-api-reference/04-functions/
//  use-search-params.md — "Behavior · Prerendering")
//
// ⚠ `robots.js` bu rotayı taramaya kapatıyor. GÖZDEN GEÇİRİLDİ, KALIYOR:
// ekran oturum arkasında ve kullanıcının kendi araç verisini gösteriyor;
// arama motoru için değeri yok.
// =========================================================================

'use client';

import React, { Suspense } from 'react';
import TeklifEkrani from '@/components/TeklifEkrani';
import GlobalStepLoader from '@/components/common/GlobalStepLoader';

export default function Page() {
  return (
    <Suspense
      fallback={
        <GlobalStepLoader
          isLoading
          title="Belgeleriniz okunuyor"
          subtitle="Poliçe ve muayene tarihleriniz getiriliyor..."
        />
      }
    >
      <TeklifEkrani />
    </Suspense>
  );
}
