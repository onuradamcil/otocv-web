// =========================================================================
// (site) HATA SINIRI ((site)/error.js)
//
// -------------------------------------------------------------------------
// NİYE VAR
// -------------------------------------------------------------------------
// Projede tek bir hata sınırı vardı: `src/app/error.js`. Yani `(site)`
// altındaki herhangi bir çökmede kök sınır devreye giriyor ve SAYFANIN
// TAMAMI değişiyordu — başlık, gezinme, altbilgi hepsi kayboluyordu.
// Kullanıcı nerede olduğunu ve nereye gidebileceğini yitiriyordu.
//
// Bu sınır `(site)/layout.js` içinde kaldığı için başlık ve altbilgi
// yerinde duruyor; yalnızca içerik alanı hata ekranına dönüyor.
//
// -------------------------------------------------------------------------
// SINIRIN SINIRI — BİLİNMESİ GEREKEN
// -------------------------------------------------------------------------
// Hata sınırları YALNIZCA render ve efekt sırasında FIRLATILAN hataları
// yakalar. Reddedilen bir promise (`await supabase.rpc(...)` başarısız
// olursa) buraya HİÇ ULAŞMAZ; o durumda sayfa sessizce yükleme durumunda
// kalır. O yüzden veri çeken yerlerde `try/catch/finally` ayrıca gerekiyor
// ve `src/lib/istek.js` ile zaman aşımına bağlanıyor. Bu dosya son çare,
// tek çare değil.
// =========================================================================

'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Icon from '@/components/common/icons';

export default function SiteError({ error, reset }) {
  useEffect(() => {
    // Teknik metin kullanıcıya gösterilmiyor ama YUTULMUYOR da.
    console.error('Sayfa hatası:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-lg p-8 max-w-md w-full text-center space-y-4 shadow-sm">
        <span className="w-12 h-12 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 grid place-items-center mx-auto">
          <Icon name="uyari" size="xl" />
        </span>

        <div className="space-y-2">
          <h1 className="text-bolum font-semibold text-slate-900 tracking-tight">Bu sayfa açılamadı</h1>
          <p className="text-mini text-slate-500 font-medium leading-relaxed">
            Beklenmedik bir sorun oluştu. Verileriniz etkilenmedi — araç
            kayıtlarınız ve sicil geçmişiniz yerinde duruyor.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            type="button"
            onClick={reset}
            className="flex-1 inline-flex items-center justify-center min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-mini rounded-md transition-colors cursor-pointer focus-visible:ring-offset-2"
          >
            Tekrar Dene
          </button>
          <Link
            href="/garage"
            className="flex-1 inline-flex items-center justify-center min-h-[44px] bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold text-mini rounded-md transition-colors"
          >
            Garajıma Dön
          </Link>
        </div>
      </div>
    </div>
  );
}
