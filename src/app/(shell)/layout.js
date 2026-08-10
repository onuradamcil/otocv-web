// =========================================================================
// OTO-CV NAVBAR'LI SAYFA GRUBU SARMALAYICISI ((shell)/layout.js)
// İşlev: Üst şeridi bir kez basar, altındaki tüm sayfalara ortak gövde verir.
//        Parantezli klasör adı URL'de görünmez, yalnızca layout gruplar.
// =========================================================================

'use client';

import React from 'react';
import Navbar from '@/components/layout/Navbar';

export default function ShellLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#FFFDFB] text-[#0F172A] font-sans antialiased tracking-tight">
      <Navbar />
      {children}
    </div>
  );
}
