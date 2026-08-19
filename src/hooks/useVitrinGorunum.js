// =========================================================================
// VİTRİN GÖRÜNÜMÜ — EKRAN GENİŞLİĞİ VE HATIRLANAN TERCİH
//
// -------------------------------------------------------------------------
// NİYE `useState` + `useEffect` DEĞİL
// -------------------------------------------------------------------------
// İkisi de TARAYICIYA AİT dış durum: `matchMedia` ve `localStorage`. Bunları
// state'e kopyalamanın üç somut bedeli ölçüldü:
//
//  1. HİDRASYON AYRIŞMASI. Sunucu bir değerle, istemci `localStorage`'daki
//     başka bir değerle çiziyor; React "server rendered HTML didn't match"
//     uyarısı basıyor ve `aria-pressed` yanlış kalıyor.
//
//  2. ETKİ İÇİNDE `setState`. Değeri effect'te okuyup yazmak React'in
//     cascading-render kuralını çiğniyor; projede lint bunu hata sayıyor.
//
//  3. ÇİFT DOM. Ekran genişliğini CSS ile çözmeye çalışınca (`hidden lg:flex`
//     + `lg:hidden`) liste HEM masaüstü HEM mobil biçiminde basılıyordu:
//     8 sonuç için DOM'da 16 öge, her biri aynı `aria-label` ile. Ekran
//     okuyucu her aracı iki kez okuyor, testler iki kat sayıyor.
//
// `useSyncExternalStore` tam olarak bu iş için var: sunucu anlık görüntüsü
// ayrı veriliyor, abonelik gerçek olaya bağlanıyor, ara state yok.
// =========================================================================

'use client';

import { useSyncExternalStore, useCallback } from 'react';

const KIRILIM = '(min-width: 1024px)';   // Tailwind `lg`
const ANAHTAR = 'otocv_vitrin_gorunum';

// -------------------------------------------------------------------------
// EKRAN GENİŞLİĞİ
// -------------------------------------------------------------------------
function genislikAbone(geriCagir) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const m = window.matchMedia(KIRILIM);
  m.addEventListener('change', geriCagir);
  return () => m.removeEventListener('change', geriCagir);
}
const genislikOku = () =>
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia(KIRILIM).matches
    : false;

// ⚠ SUNUCU ANLIK GÖRÜNTÜSÜ HEP `false` (dar ekran). Sunucu ekran genişliğini
// bilemez; "dar" varsaymak güvenli tarafta kalmak demek — ilk boyada ızgara
// çizilir, geniş ekranda ilk ölçümde listeye geçer. Tersi olsaydı dar
// ekranda bir an okunamayan yatay liste görünürdü.
const genislikSunucu = () => false;

export function useGenisEkran() {
  return useSyncExternalStore(genislikAbone, genislikOku, genislikSunucu);
}

// -------------------------------------------------------------------------
// HATIRLANAN GÖRÜNÜM TERCİHİ
// -------------------------------------------------------------------------
// `localStorage` olay yaymıyor (aynı sekmede `storage` olayı tetiklenmez),
// bu yüzden abonelikleri elde tutup yazma anında kendimiz haber veriyoruz.
const aboneler = new Set();
function tercihAbone(geriCagir) {
  aboneler.add(geriCagir);
  return () => aboneler.delete(geriCagir);
}
function tercihOku() {
  if (typeof window === 'undefined') return null;
  try {
    const d = window.localStorage.getItem(ANAHTAR);
    return d === 'liste' || d === 'izgara' ? d : null;
  } catch {
    return null;   // özel kip: tercih hatırlanmıyor
  }
}
const tercihSunucu = () => null;

/**
 * @param {string} varsayilan Tercih yoksa kullanılacak görünüm.
 * @returns {[string, (yeni: string) => void]}
 */
export function useGorunumTercihi(varsayilan) {
  const kayitli = useSyncExternalStore(tercihAbone, tercihOku, tercihSunucu);

  const sec = useCallback((yeni) => {
    try { window.localStorage.setItem(ANAHTAR, yeni); } catch { /* özel kip */ }
    // Aynı sekmede `storage` olayı gelmiyor; aboneleri elle uyandırıyoruz.
    aboneler.forEach((f) => f());
  }, []);

  return [kayitli || varsayilan, sec];
}
