// =========================================================================
// TEKLİF KARTI — UYARININ YANINDAKİ KAPI
//
// -------------------------------------------------------------------------
// NİYE VAR
// -------------------------------------------------------------------------
// Panel kullanıcıya "bu belgenin süresi doldu" diyor ve onu araç düzenleme
// ekranına gönderiyor. Yani sorunu haber verip çözümü kullanıcıya
// bırakıyor. Bu kart o boşluğa duruyor: uyarıyı okuyan kişiye SONRA NE
// YAPACAĞINI söylüyor.
//
// -------------------------------------------------------------------------
// ⚠ SESİ ALÇAK — BU BİR TASARIM KARARI, EKSİKLİK DEĞİL
// -------------------------------------------------------------------------
// Garajdaki uyarı şeridi için daha önce şu yazılmıştı: "aciliyet renkle
// anlatılıyor, alanla değil" — bant dolgu kırmızıyken sayfanın en yüksek
// sesli ögesiydi ve başlığı bile bastırıyordu.
//
// Aynı ders burada da geçerli, üstelik daha sert: bu kart bir UYARI değil,
// bir TEKLİF. Uyarıdan daha yüksek sesli olması, kullanıcının sorununu
// kendi satışımızın arkasına itmek olurdu. O yüzden:
//   · kritik satırların ALTINDA, ince bir ayraçtan sonra
//   · dolgu değil açık zemin, kırmızı değil nötr indigo
//   · uyarı listesi BOŞKEN hiç çizilmiyor (çağıran ekran karar veriyor)
//
// ⚠ HİÇBİR TUTAR YOK. Ne prim, ne ücret, ne "şu kadar kazanın". Bu üründe
// ürünle ilgili tutar göstermek platformu satış sitesi konumuna sokuyor.
// =========================================================================

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Icon from './icons';
import { teklifYolu } from '../../services/teklifService';

/**
 * @param {object}  props
 * @param {string}  props.kaynak Talebi hangi ekranın doğurduğu ('panel' vb.)
 * @param {string} [props.plaka] Belirli bir araca odaklanacaksa
 * @param {string} [props.tur]   Belirli bir belgeye odaklanacaksa
 * @param {string} [props.baslik]
 * @param {string} [props.ozet]
 */
export default function TeklifKarti({
  kaynak,
  plaka = null,
  tur = null,
  baslik = 'Yenileme adımlarını görün',
  ozet = 'Süresi yaklaşan belgeleriniz için hatırlatma kurun, hazır olduğunda size haber verelim.',
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(teklifYolu(plaka, tur, kaynak))}
      className="w-full text-left flex items-center gap-3 p-4 rounded-md border border-indigo-200
        bg-indigo-50/60 hover:bg-indigo-50 hover:border-indigo-300 transition-colors cursor-pointer group"
    >
      <span className="w-10 h-10 rounded-md grid place-items-center shrink-0 bg-white text-indigo-600 ring-1 ring-inset ring-indigo-100">
        <Icon name="kalkan" size="lg" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="baslik-kart text-slate-900 block">{baslik}</span>
        <span className="metin-yardimci text-slate-600 block">{ozet}</span>
      </span>

      {/* Ok işareti yalnızca yön belirtiyor; erişilebilir ad düğmenin
          metninden geliyor, o yüzden ekran okuyucudan gizli. */}
      <span className="shrink-0 text-indigo-600 transition-transform group-hover:translate-x-0.5" aria-hidden="true">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </span>
    </button>
  );
}
