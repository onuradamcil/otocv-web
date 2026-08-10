// =========================================================================
// OTO-CV SADE ÇATI BAŞLIĞI (AuthHeader.jsx)
// İşlev: Giriş, kayıt ve şifre sıfırlama ekranlarının başlığı.
//
// Ana menü YOK — sektör standardı: auth ekranında menü dikkat dağıtır ve
// kullanıcıyı akıştan çıkarır. Ama kullanıcı hangi sitede olduğunu görmeli,
// o yüzden logo ve anasayfa yolu burada.
// =========================================================================

'use client';

import React from 'react';
import Link from 'next/link';

const ODAK = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2';

export default function AuthHeader() {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link
          href="/"
          className={`flex items-center gap-1.5 min-h-[44px] text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors rounded ${ODAK}`}
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          <span>Anasayfa</span>
        </Link>

        <Link href="/" className={`text-base font-black tracking-tight text-slate-900 rounded ${ODAK}`}>
          OTO.CV
        </Link>
      </div>
    </header>
  );
}
