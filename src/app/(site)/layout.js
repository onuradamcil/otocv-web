// =========================================================================
// OTO-CV TAM ÇATI ((site)/layout.js)
// İşlev: Header + içerik + footer. Kamuya açık ve üye sayfalarının tamamı
//        bu çatının altında. Parantezli klasör adı URL'de görünmez.
//
// Not: Üst şerit (top bar) kullanıcı tercihiyle kaldırıldı — logonun
//      üstünde hiçbir katman yok. PIN sorgulama kapısı header'daki
//      "Karne Sorgula" menü öğesinde ve mobil çekmecede duruyor.
// =========================================================================

'use client';

import React from 'react';
import SkipLink from '@/components/layout/SkipLink';
import Header from '@/components/layout/Header';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Footer from '@/components/layout/Footer';

export default function SiteLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F2F4F7] text-[#0F172A] font-sans antialiased tracking-tight">
      <SkipLink />
      <Header />
      <Breadcrumb />
      <main id="icerik" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
