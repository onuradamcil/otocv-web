// =========================================================================
// VİTRİN (TÜM ARAÇLAR) — İSTEMCİ KATMANI
//
// `AnasayfaIstemci.jsx` ile aynı kalıp ve aynı sebep: sayfa SUNUCU bileşeni
// kalsın ki kendi `metadata`sı olabilsin (Next kuralı: metadata yalnızca
// sunucu bileşenlerinden), yönlendirme gerektiren istemci mantığı buraya
// insin.
//
// -------------------------------------------------------------------------
// NİYE AYRI BİR EKRAN BİLEŞENİ YOK
// -------------------------------------------------------------------------
// Bu sayfa `MarketplaceView`i `tamSayfa` bayrağıyla yeniden kullanıyor.
// Süzgeç motoru (`suz` / `YUKLEMLER` / faceted sayaçlar), marka ağacı ve
// kart ızgarası birlikte 700 satırdan fazla; ikinci bir kopya çıkarmak iki
// ayrı süzgeç davranışı ve iki ayrı hata kaynağı demek olurdu. Bayrak
// yalnızca anasayfaya ait bölümleri kapatıyor.
//
// ⚠ Bu dosya yalnızca YÖNLENDİRME bağlıyor; iş mantığı eklenmemeli.
// =========================================================================

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import MarketplaceView from './MarketplaceView';

export default function VitrinIstemci() {
  const router = useRouter();

  return (
    <MarketplaceView
      tamSayfa
      onSelectVehicle={(item) => router.push(`/details/${encodeURIComponent(item.pin_code)}`)}
      // ⚠ Bu dört yönlendirme `tamSayfa` kipinde ÇİZİLMEYEN bölümlere ait
      // (Hizmetler şeridi ve "Nasıl çalışır" CTA'sı). Yine de geçiliyor:
      // bileşen onları çağırmadan önce `tamSayfa` kontrolü yapıyor ama
      // eksik prop bırakmak, bayrak ileride gevşetildiğinde sessiz bir
      // "is not a function" hatası anlamına gelirdi.
      onNavigateToGarage={() => router.push('/garage')}
      onNavigateToVerify={() => router.push('/verify')}
      onNavigateToInsurance={() => router.push('/insurance-offer')}
      onNavigateToMaintenance={() => router.push('/maintenance-planner')}
    />
  );
}
