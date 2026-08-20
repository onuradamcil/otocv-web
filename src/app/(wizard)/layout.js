// =========================================================================
// OTO-CV SİHİRBAZ ÇATISI ((wizard)/layout.js)
// İşlev: Araç kayıt akışı için erişilebilirlik katmanı + içerik alanı.
//
// NEDEN GÖRSEL BAŞLIK YOK: CreateListingWizard kendi başlığını zaten
// taşıyor — OTO.CV logosu, "Adım N / 4" göstergesi ve adım başlığını
// gösteren yapışkan bar. Buraya ikinci bir başlık koymak logo ve adım
// göstergesini çift gösterirdi. Sihirbazın kendi başlığı daha zengin
// (adım başlıkları da var), o yüzden korunuyor.
//
// Ana menü ve footer YOK — kullanıcı akıştan çıkmamalı.
// =========================================================================

'use client';

import React from 'react';
import SkipLink from '@/components/layout/SkipLink';

export default function WizardLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F2F4F7] text-[#0F172A] font-sans antialiased tracking-tight">
      <SkipLink />
      <main id="icerik" className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
