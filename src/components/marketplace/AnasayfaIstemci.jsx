// =========================================================================
// ANASAYFA — İSTEMCİ KATMANI
//
// -------------------------------------------------------------------------
// NİYE AYRI DOSYA
// -------------------------------------------------------------------------
// Anasayfanın kendine ait bir başlık ve açıklaması YOKTU: `(site)/page.js`
// ve `(site)/layout.js` ikisi de `'use client'` olduğu için `metadata`
// export edilemiyordu (Next kuralı: metadata yalnızca sunucu bileşenlerinde
// — `generate-metadata.md:110`). Sonuç: sitenin en çok ziyaret edilen ve
// `sitemap.js`'te `priority 1` verilen sayfası, kökteki genel başlığı
// devralıyordu.
//
// Projede bu sorun başka sayfalarda KARDEŞ `layout.js` ile çözülmüş
// (ör. `dashboard/layout.js`). Anasayfada o yol kapalı: `/` rotasının
// layout'u `(site)/layout.js`, yani grubun tamamı — oraya konan metadata
// bütün site rotalarına uygulanırdı.
//
// Bu yüzden Next dokümanının önerdiği yol izleniyor
// (`generate-metadata.md:120`): sayfa SUNUCU bileşeni kalıyor, yönlendirme
// gerektiren istemci mantığı buraya taşınıyor.
//
// ⚠ Bu dosya yalnızca YÖNLENDİRME bağlıyor. Ekranın kendisi
// `MarketplaceView`; buraya iş mantığı eklenmemeli.
// =========================================================================

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import MarketplaceView from './MarketplaceView';

export default function AnasayfaIstemci() {
  const router = useRouter();

  return (
    <MarketplaceView
      onSelectVehicle={(item) => router.push(`/details/${encodeURIComponent(item.pin_code)}`)}
      onNavigateToGarage={() => router.push('/garage')}
      onNavigateToVerify={() => router.push('/verify')}
      onNavigateToInsurance={() => router.push('/insurance-offer')}
      onNavigateToMaintenance={() => router.push('/maintenance-planner')}
    />
  );
}
