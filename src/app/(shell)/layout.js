// =========================================================================
// OTO-CV NAVBAR'LI SAYFA GRUBU SARMALAYICISI ((shell)/layout.js)
// İşlev: Üst şerit + header. Parantezli klasör adı URL'de görünmez.
// Not: Bu grup Görev 2'de (site) olarak yeniden adlandırılacak ve footer
//      eklenecek.
// =========================================================================

'use client';

import React from 'react';
import TopBar from '@/components/layout/TopBar';
import Header from '@/components/layout/Header';

export default function ShellLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#FFFDFB] text-[#0F172A] font-sans antialiased tracking-tight">
      <TopBar />
      <Header />
      {children}
    </div>
  );
}
