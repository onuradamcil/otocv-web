// =========================================================================
// OTO-CV YER TUTUCU SAYFA GÖVDESİ (ComingSoon.jsx)
// İşlev: Henüz tamamlanmamış ekranlar için dürüst bir bilgi kartı.
//        Menüden tıklanan ekranların sessizce pazaryerine düşmesini bitirir.
// =========================================================================

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function ComingSoon({ title, description }) {
  const router = useRouter();

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 animate-fadeIn">
      <div className="bg-white border border-gray-200 rounded-lg p-8 md:p-10 shadow-sm space-y-5 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600 text-etiket font-semibold tracking-wider uppercase">
          Yapım Aşamasında
        </span>

        <div className="space-y-2">
          <h1 className="text-buyuk font-semibold text-slate-900 tracking-tight">{title}</h1>
          <p className="text-mini md:text-govde text-slate-500 font-medium leading-relaxed max-w-md mx-auto">
            {description}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <button
            type="button"
            onClick={() => router.push('/garage')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-mini px-6 py-3 rounded-md transition-colors cursor-pointer"
          >
            Garajıma Dön
          </button>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="bg-white hover:bg-slate-50 text-slate-800 border border-gray-200 font-bold text-mini px-6 py-3 rounded-md transition-colors cursor-pointer"
          >
            Anasayfa
          </button>
        </div>
      </div>
    </div>
  );
}
