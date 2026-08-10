// =========================================================================
// OTO-CV YÜKLENME İSKELETİ ((site)/loading.js)
// İşlev: Sayfa geçişlerinde yerleşimi koruyan gri iskelet. Boş ekran ya da
//        zıplayan yerleşim (layout shift) yerine sabit bir doluluk.
//
// NEDEN (site) İÇİNDE, KÖKTE DEĞİL: kökte olsaydı yüklenirken header ve
// footer da kaybolurdu. Burada çatı ekranda kalıyor, yalnızca içerik alanı
// iskelet gösteriyor — kullanıcı nerede olduğunu kaybetmiyor.
// =========================================================================

import React from 'react';

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 motion-safe:animate-pulse">
      <div className="h-7 w-56 bg-slate-200 rounded-lg" />
      <div className="h-3 w-80 bg-slate-100 rounded mt-3" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="h-32 bg-slate-100 rounded-lg" />
            <div className="h-4 w-3/4 bg-slate-200 rounded" />
            <div className="h-3 w-1/2 bg-slate-100 rounded" />
            <div className="h-9 bg-slate-100 rounded-lg mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
