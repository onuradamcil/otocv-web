// =========================================================================
// (wizard) HATA SINIRI ((wizard)/error.js)
//
// -------------------------------------------------------------------------
// NİYE VAR
// -------------------------------------------------------------------------
// `(wizard)` grubunun hiç hata sınırı yoktu: araç kayıt sihirbazındaki bir
// çökme kök sınıra düşüyor ve kullanıcı BOŞ BEYAZ EKRAN görüyordu.
// 19 Ağustos 2026 beta taramasının bulgusu.
//
// Burası ürünün en uzun akışı (4 adım, ~7.800 satır) ve kullanıcı oraya
// gelene kadar fotoğraf yüklüyor, plaka giriyor, bakım geçmişi dolduruyor.
// Beyaz ekran, girilen her şeyin kaybolduğu izlenimi veriyor.
//
// -------------------------------------------------------------------------
// ⚠ TASLAK HAKKINDA DÜRÜST OLMAK
// -------------------------------------------------------------------------
// Sihirbaz `vehicle_drafts` tablosuna taslak yazıyor, yani girilenlerin bir
// kısmı sunucuda duruyor olabilir. Ama HANGİ adıma kadar kaydedildiği bu
// sınırdan bilinemiyor — "her şey duruyor" demek uydurma güvence olurdu.
// Metin bu yüzden ölçülü: taslağın KALMIŞ OLABİLECEĞİNİ söylüyor, garanti
// vermiyor. Kullanıcı garaja dönüp gerçekte ne kaldığını görebiliyor.
//
// -------------------------------------------------------------------------
// SINIRIN SINIRI
// -------------------------------------------------------------------------
// Yalnızca render/efekt sırasında FIRLATILAN hatalar buraya ulaşıyor.
// Reddedilen bir promise (fotoğraf yükleme, RPC) buraya HİÇ GELMİYOR;
// o yollar kendi `try/catch`leriyle toast basıyor. Son çare, tek çare değil.
// =========================================================================

'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Icon from '@/components/common/icons';

export default function WizardError({ error, reset }) {
  useEffect(() => {
    console.error('Araç kayıt sihirbazı hatası:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-lg p-8 max-w-md w-full text-center space-y-4 shadow-sm">
        <span className="w-12 h-12 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 grid place-items-center mx-auto">
          <Icon name="uyari" size="xl" />
        </span>

        <div className="space-y-2">
          <h1 className="baslik-bolum text-slate-900">Kayıt adımı açılamadı</h1>
          <p className="metin-yardimci text-slate-500 leading-relaxed">
            Beklenmedik bir sorun oluştu. Daha önce kaydedilmiş bilgileriniz
            taslakta durabilir; garajınızdan kaldığınız yerden devam
            edebilirsiniz.
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
