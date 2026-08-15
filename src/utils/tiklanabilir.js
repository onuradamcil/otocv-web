// =========================================================================
// TIKLANABİLİR — KLAVYEYE KAPALI ÖGELER İÇİN SON ÇARE
//
// -------------------------------------------------------------------------
// NİYE VAR
// -------------------------------------------------------------------------
// Uygulamada 27 tıklanabilir öge `<div onClick>` olarak yazılmıştı. Ölçüldü:
//
//   araç kayıt sihirbazı Adım 1 : 8  (kategori, yıl, yakıt, marka, seri,
//                                     model, paket, teyit)
//   Adım 2                      : 8  (renk, il, ilçe, donanım ızgarası)
//   Adım 3 · 4                  : 3
//   pazaryeri süzgeçleri        : 3
//   bildirim satırı             : 1
//   araç detayı, karne, giriş   : 4
//
// `<div onClick>` klavyeyle çalışmıyor: Tab üzerine gelmiyor, Enter ve Space
// hiçbir şey yapmıyor. Sihirbazdaki hâli WCAG 2.1.1'i (Klavye, Seviye A)
// ihlal ediyordu ve ürünün ÇEKİRDEK akışını kapatıyordu — fare kullanamayan
// biri hiç araç ekleyemiyordu, çünkü kategori sütununda takılıyordu ve
// sonraki sütunlar hiç çizilmiyordu.
//
// -------------------------------------------------------------------------
// ⚠ BU YARDIMCI SON ÇARE — ÖNCE `<button>` DENENMELİ
// -------------------------------------------------------------------------
// Doğru çözüm ögeyi `<button type="button">` yapmak: klavye, odak sırası,
// ekran okuyucu semantiği ve `disabled` desteği bedava gelir. Bu yardımcı
// yalnızca `<button>` KULLANILAMAYAN yerler için:
//
//   · İçinde başka bir düğme barındıran satırlar. Bildirim satırının içinde
//     "Sil" düğmesi var; düğme içinde düğme GEÇERSİZ HTML ve tarayıcılar
//     iç içe geçmiş düğmeyi tahmin edilemez biçimde işliyor.
//   · İçinde `<a>` ya da form alanı barındıran kartlar.
//
// Başka bir gerekçeyle kullanılmamalı. "Görünüm bozulur" gerekçe değildir:
// Tailwind preflight zaten düğme varsayılanlarını sıfırlıyor.
// =========================================================================

/**
 * Bir ögeyi klavyeyle çalıştırılabilir hâle getiren öznitelikleri döndürür.
 *
 * @param {(olay: Event) => void} calistir  Tıklama/Enter/Space eylemi
 * @param {object} [secenekler]
 * @param {boolean} [secenekler.devreDisi]  true ise öge odaklanamaz ve
 *                                          çalıştırılamaz
 * @param {string}  [secenekler.etiket]     Ekran okuyucu adı. Ögenin kendi
 *                                          metni yeterliyse verilmemeli.
 * @returns {object} JSX'e yayılacak öznitelikler
 *
 * @example
 *   <div {...tiklanabilir(() => sec(renk))} className="...">
 */
export function tiklanabilir(calistir, secenekler = {}) {
  const { devreDisi = false, etiket } = secenekler;

  if (devreDisi) {
    // Odak sırasından çıkarılıyor ama ögenin kendisi görünür kalıyor:
    // devre dışı bir seçeneği GİZLEMEK, kullanıcıya "yok" demek olur.
    return { 'aria-disabled': true, ...(etiket ? { 'aria-label': etiket } : {}) };
  }

  return {
    role: 'button',
    tabIndex: 0,
    ...(etiket ? { 'aria-label': etiket } : {}),
    onClick: calistir,
    onKeyDown: (olay) => {
      // Space tuşu varsayılan olarak sayfayı kaydırıyor; düğme davranışında
      // kaydırma değil çalıştırma bekleniyor.
      if (olay.key === 'Enter' || olay.key === ' ' || olay.key === 'Spacebar') {
        olay.preventDefault();
        calistir(olay);
      }
    },
  };
}

/**
 * Odak halkası sınıfı. Projede yerleşik kalıp bu; tek yerden okunması
 * yeni eklenen her kontrolde aynı görünmesini sağlıyor.
 *
 * ⚠ `outline-none` TEK BAŞINA KULLANILMAMALI — odağı görünmez yapar.
 * Bu dizede her zaman bir `ring` eşlik ediyor.
 */
export const ODAK_HALKASI =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600';
