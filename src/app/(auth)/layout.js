// =========================================================================
// OTO-CV SADE ÇATI ((auth)/layout.js)
// İşlev: Kimlik ekranları için başlık + içerik + yasal şerit.
//        Ana menü ve footer YOK — auth akışında dikkat dağıtmamalı.
//        Kullanıcı yine de hangi sitede olduğunu görür (AuthHeader).
// =========================================================================

'use client';

import React from 'react';
import SkipLink from '@/components/layout/SkipLink';
import AuthHeader from '@/components/layout/AuthHeader';

export default function AuthLayout({ children }) {
  const yil = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDFB] text-[#0F172A] font-sans antialiased tracking-tight">
      <SkipLink />
      <AuthHeader />

      <main id="icerik" className="flex-1 flex flex-col">
        {children}
      </main>

      <div className="border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-1.5">
          <span className="text-etiket font-semibold text-slate-500">
            © {yil} Oto.CV · Tüm hakları saklıdır
          </span>
          <span className="text-etiket font-medium text-slate-500">
            Yasal metinler hazırlanıyor
          </span>
        </div>
      </div>
    </div>
  );
}
