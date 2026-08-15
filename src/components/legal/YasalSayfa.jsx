// =========================================================================
// YASAL SAYFA İSKELETİ
//
// Üç sayfa aynı kalıbı paylaşıyor: KVKK aydınlatma, gizlilik politikası,
// kullanım şartları.
//
// -------------------------------------------------------------------------
// NEDEN ÖLÜ BAĞLANTI YERİNE GERÇEK SAYFA
// -------------------------------------------------------------------------
// Footer'daki üç yasal bağlantı tıklanamaz `<span>`'di ve giriş ekranında
// (`VehicleAuthScreen`) link GİBİ GÖRÜNEN ama hiçbir şey yapmayan metinler
// vardı. İkincisi daha kötü: kullanıcı sözleşmeyi okumak istediğinde
// tıklıyor ve hiçbir şey olmuyor.
//
// -------------------------------------------------------------------------
// ⚠ NİHAİ METİN BU SAYFADA YAZILI DEĞİL — VE SAYFA BUNU SÖYLÜYOR
// -------------------------------------------------------------------------
// Yasal metinlerin içeriğini hukuk danışmanı onayıyla site sahibi yazacak.
// Onun yerine uydurma bir metin koymak, olmayan bir taahhüdü varmış gibi
// göstermek olurdu.
//
// Ama sayfa boş da değil: sistemin GERÇEKTEN ne yaptığını anlatan olgusal
// bir döküm var — hangi veri tutuluyor, kim görüyor, ne kadar kalıyor.
// Bunlar şemadan ve RLS politikalarından okunmuş doğrulanabilir bilgiler,
// hukuki taahhüt değil. Metni yazacak kişi için de girdi oluşturuyorlar.
// =========================================================================

'use client';

import React from 'react';
import Link from 'next/link';
import Icon from '../common/icons';

/**
 * @param {object} props
 * @param {string} props.baslik
 * @param {string} props.ozet         Sayfanın bir cümlelik özeti
 * @param {Array<{baslik: string, satirlar: Array<string|{ad: string, deger: string}>}>} props.bolumler
 */
export default function YasalSayfa({ baslik, ozet, bolumler }) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">{baslik}</h1>
        <p className="text-sm text-slate-500 font-medium leading-relaxed">{ozet}</p>
      </div>

      {/* Sayfanın durumu gizlenmiyor. "Yakında" demek yerine ne olduğunu ve
          bu arada neyin geçerli olduğunu söylüyor. */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <span className="text-amber-600 shrink-0 mt-0.5">
          <Icon name="uyari" size="sm" strokeWidth={2.5} />
        </span>
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-amber-950">Nihai metin hazırlanıyor</p>
          <p className="text-yardimci text-amber-900/80 font-medium leading-relaxed">
            Hukuk danışmanı onayından geçmiş nihai metin yayımlanana kadar
            aşağıda sistemin fiilen nasıl çalıştığını bulabilirsiniz. Bu döküm
            bilgilendirme amaçlıdır.
          </p>
        </div>
      </div>

      {bolumler.map((bolum) => (
        <section key={bolum.baslik} className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">{bolum.baslik}</h2>
          <div className="space-y-2.5">
            {bolum.satirlar.map((satir, i) =>
              typeof satir === 'string' ? (
                <p key={i} className="text-xs text-slate-600 font-medium leading-relaxed">
                  {satir}
                </p>
              ) : (
                <div
                  key={satir.ad}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4"
                >
                  <span className="text-xs font-semibold text-slate-900 sm:w-44 shrink-0">
                    {satir.ad}
                  </span>
                  <span className="text-xs text-slate-600 font-medium leading-relaxed">
                    {satir.deger}
                  </span>
                </div>
              )
            )}
          </div>
        </section>
      ))}

      <div className="border-t border-slate-100 pt-6 flex flex-wrap gap-3">
        {[
          ['/kvkk', 'KVKK Aydınlatma'],
          ['/gizlilik', 'Gizlilik Politikası'],
          ['/kullanim-sartlari', 'Kullanım Şartları'],
        ].map(([yol, ad]) => (
          <Link
            key={yol}
            href={yol}
            className="text-yardimci font-bold text-indigo-600 hover:text-indigo-700 hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            {ad}
          </Link>
        ))}
      </div>
    </div>
  );
}
