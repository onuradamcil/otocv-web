// =========================================================================
// OTO-CV HATA SINIRI (error.js)
// İşlev: Bir sayfa çökerse beyaz ekran yerine kurtarma yolu sunar.
//
// Next.js sözleşmesi: error.js client component olmak ZORUNDA.
// Teknik hata metni kullanıcıya gösterilmez — hem okunabilirlik hem
// güvenlik için. Konsola yazılır, geliştirici oradan görür.
// =========================================================================

'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

const ODAK = 'focus-visible:ring-offset-2';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('Sayfa hatası:', error);
  }, [error]);

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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-100 rounded-full text-rose-600 text-etiket font-semibold tracking-wider uppercase">
            Beklenmeyen Hata
          </span>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Bir şeyler ters gitti</h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed">
              Sayfa yüklenirken bir sorun oluştu. Tekrar denemek çoğu zaman yeterli oluyor.
              Sorun sürerse bir süre sonra tekrar deneyin.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
            <button
              type="button"
              onClick={() => reset()}
              className={`flex items-center justify-center min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 rounded-xl transition-colors ${ODAK}`}
            >
              Tekrar Dene
            </button>
            {/* <a> yerine <Link>: ham <a> tam sayfa yenilemesi yapıyordu,
                yani hata ekranından anasayfaya dönmek uygulamayı baştan
                yüklüyordu. Link istemci tarafı geçiş yapar — hızlı ve
                oturum durumu korunur. */}
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
