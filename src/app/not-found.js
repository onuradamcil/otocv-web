// =========================================================================
// OTO-CV 404 SAYFASI (not-found.js)
// İşlev: Olmayan adres istendiğinde Next.js'in çıplak varsayılanı yerine
//        tasarım diline uygun, yol gösteren bir sayfa.
//
// Not: Eşleşmeyen bir adres hiçbir route grubuna girmediği için buraya
//      grup çatısı uygulanmaz. O yüzden sayfa kendi logosunu ve zeminini
//      taşıyor — yoksa sahipsiz görünür.
// =========================================================================

import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Sayfa bulunamadı',
};

const ODAK = 'focus-visible:ring-offset-2';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FFFDFB] text-[#0F172A] font-sans antialiased flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <Link href="/" className={`text-base font-semibold tracking-tight text-slate-900 rounded ${ODAK}`}>
            OTO.CV
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 md:p-10 max-w-md w-full text-center space-y-5 shadow-sm">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-slate-500 text-etiket font-semibold tracking-wider uppercase">
            Hata 404
          </span>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Sayfa bulunamadı</h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed">
              Aradığınız sayfa taşınmış ya da hiç var olmamış olabilir. Aşağıdaki yollardan
              devam edebilirsiniz.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
            <Link
              href="/verify"
              className={`flex items-center justify-center min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 rounded-xl transition-colors ${ODAK}`}
            >
              PIN ile Araç Sorgula
            </Link>
            <Link
              href="/"
              className={`flex items-center justify-center min-h-[44px] bg-white hover:bg-slate-50 text-slate-800 border border-gray-200 font-bold text-xs px-6 rounded-xl transition-colors ${ODAK}`}
            >
              Anasayfa
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
