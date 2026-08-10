// =========================================================================
// OTO-CV ÜST ŞERİT (TopBar.jsx)
// İşlev: Kazanım hunisinin girişini her sayfada en üstte tutar. Alıcı,
//        rakip ilan sitesindeki karne görselinden gelip PIN'i buradan girer.
// Mobil: yalnızca PIN bağlantısı kalır, Kurumsal çekmeceye taşınır.
//        Şerit mobilde 44px yüksekliğe çıkar — dokunma alanı standardı.
// =========================================================================

'use client';

import React from 'react';
import Link from 'next/link';

export default function TopBar() {
  return (
    <div className="bg-[#0F172A] text-white print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-11 md:h-9 flex items-center justify-between">
        <Link
          href="/verify"
          className="group flex items-center gap-1.5 min-h-[44px] md:min-h-0 text-[11px] font-bold tracking-tight text-slate-200 hover:text-white transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F172A]"
        >
          <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.642z" />
          </svg>
          <span>Karne PIN&apos;i ile araç sorgula</span>
          <span className="text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">&rsaquo;</span>
        </Link>

        <span className="hidden sm:inline text-[11px] font-semibold text-slate-400 cursor-not-allowed select-none">
          Kurumsal Çözümler
        </span>
      </div>
    </div>
  );
}
