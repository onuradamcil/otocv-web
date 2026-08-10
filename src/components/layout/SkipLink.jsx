// =========================================================================
// OTO-CV İÇERİĞE GEÇ BAĞLANTISI (SkipLink.jsx)
// İşlev: Klavye kullanıcısı menüyü atlayıp doğrudan içeriğe gidebilir.
//        Normalde görünmez, yalnızca odaklanınca ortaya çıkar.
// =========================================================================

'use client';

import React from 'react';

export default function SkipLink() {
  return (
    <a
      href="#icerik"
      className="sr-only focus:not-sr-only focus:fixed focus:z-[100] focus:top-3 focus:left-3 focus:px-4 focus:py-2.5 focus:bg-indigo-600 focus:text-white focus:font-bold focus:text-xs focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white print:hidden"
    >
      İçeriğe geç
    </a>
  );
}
