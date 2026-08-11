// =========================================================================
// (wizard) GRUP SEVİYESİ YÜKLENME İSKELETİ
//
// NEDEN EKLENDİ: (wizard) grubunda hiç loading.js yoktu. Araç tescil
// sihirbazına geçilirken ekranda HİÇBİR ŞEY görünmüyordu — kullanıcı
// tıklıyor, bir süre boşluk, sonra form açılıyor. Yavaş bağlantıda bu
// "tıklamam işlemedi mi?" hissi veriyor.
//
// "form" varyantı: sihirbazın her adımı etiket + giriş alanı çiftlerinden
// oluşuyor, iskelet de o şekli taşıyor.
//
// Bu, sihirbazın İÇİNDEKİ tam ekran kilidiyle karıştırılmamalı. Aradaki
// fark şu:
//   bu dosya            → rota açılıyor, içerik BEKLENİYOR   → iskelet
//   CreateListingWizard → kullanıcı tescili GÖNDERDİ, işlem   → tam ekran
//                         yarıda kesilmemeli                   kilit
// =========================================================================

import React from 'react';
import GlobalStepLoader from '@/components/common/GlobalStepLoader';

export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <GlobalStepLoader mode="iskelet" varyant="form" kapsayici={false} />
    </div>
  );
}
