// =========================================================================
// useCanliTazeleme — BİLDİRİM SİNYALİYLE LİSTE TAZELEME
//
// Gerekçesi `src/lib/canliOlay.js` başlığında: sinyal `notifications`
// akışından geliyor, veri her zaman RPC'den.
//
// ⚠ YALNIZCA UCUZ VE IDEMPOTENT tazelemelere bağlanmalı. Ağır bir işi buna
// bağlamak, sinyal başına maliyeti kullanıcı sayısıyla çarpar.
// =========================================================================

'use client';

import { useEffect, useRef } from 'react';
import { BILDIRIM_GELDI } from '../lib/canliOlay';

const VARSAYILAN_GECIKME_MS = 400;

/**
 * Belirtilen türlerde bildirim geldiğinde `tazele`yi çağırır.
 *
 * @param {string[]} turler  İlgilenilen bildirim türleri. Boş dizi = hepsi.
 * @param {() => void} tazele
 * @param {{gecikmeMs?: number}} [secenekler]
 */
export default function useCanliTazeleme(turler, tazele, secenekler = {}) {
  const { gecikmeMs = VARSAYILAN_GECIKME_MS } = secenekler;

  // `tazele` her render'da yeni bir referans olabiliyor. Ref'te tutulmazsa
  // dinleyici her render'da sökülüp yeniden takılırdı.
  //
  // ⚠ ATAMA EFEKTİN İÇİNDE: render sırasında ref'e yazmak React'in eşzamanlı
  // çalışmasında güvenli değil ve lint bunu hata olarak veriyor
  // ("Cannot access refs during render").
  const tazeleRef = useRef(tazele);
  useEffect(() => { tazeleRef.current = tazele; });

  // Diziyi bağımlılığa doğrudan koymak her render'da yeni referans demek.
  const turAnahtari = (turler || []).join(',');

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const ilgiliTurler = turAnahtari ? turAnahtari.split(',') : [];
    let zamanlayici = null;
    let sekmeGizliykenBirikti = false;

    const calistir = () => {
      zamanlayici = null;
      // GÖRÜNMEYEN SEKME ERTELENİYOR. Arka planda duran yirmi sekmenin her
      // birinin RPC atması, kaçındığımız yoklamanın ta kendisi olurdu.
      if (document.visibilityState === 'hidden') {
        sekmeGizliykenBirikti = true;
        return;
      }
      tazeleRef.current?.();
    };

    const olayGeldi = (e) => {
      const tur = e?.detail?.tur;
      if (ilgiliTurler.length > 0 && !ilgiliTurler.includes(tur)) return;

      // TOPLAMA: kısa aralıkta gelen N bildirim TEK tazelemeye iniyor.
      // Devir onayında birden fazla bildirim aynı anda düşebiliyor.
      if (zamanlayici) clearTimeout(zamanlayici);
      zamanlayici = setTimeout(calistir, gecikmeMs);
    };

    const sekmeDondu = () => {
      if (document.visibilityState === 'visible' && sekmeGizliykenBirikti) {
        sekmeGizliykenBirikti = false;
        tazeleRef.current?.();
      }
    };

    window.addEventListener(BILDIRIM_GELDI, olayGeldi);
    document.addEventListener('visibilitychange', sekmeDondu);

    return () => {
      window.removeEventListener(BILDIRIM_GELDI, olayGeldi);
      document.removeEventListener('visibilitychange', sekmeDondu);
      if (zamanlayici) clearTimeout(zamanlayici);
    };
  }, [turAnahtari, gecikmeMs]);
}
