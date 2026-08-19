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
import Icon from '../common/icons';

const ODAK = 'focus-visible:ring-offset-2';

export default function AuthHeader() {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link
          href="/"
          className={`flex items-center gap-1.5 min-h-[44px] text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors rounded ${ODAK}`}
        >
          <Icon name="geri" size="sm" className="shrink-0" strokeWidth={2.5} />
          <span>Anasayfa</span>
        </Link>

        {/* ⚠ `inline-flex items-center min-h-[44px]` — logo bağlantısı 52x24 idi.
            Yanındaki "Anasayfa" bağlantısı zaten 44px taşıyor; ikisi aynı
            şeritte olduğu için logonun daha küçük kalması hem hedef hem hiza
            sorunuydu. */}
        <Link
          href="/"
          className={`inline-flex items-center min-h-[44px] text-base font-display font-bold tracking-tight text-slate-900 rounded ${ODAK}`}
        >
          OTO.CV
        </Link>
      </div>
    </header>
  );
}
