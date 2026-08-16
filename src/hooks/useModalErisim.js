// =========================================================================
// MODAL ERİŞİLEBİLİRLİĞİ — TEK KAYNAK
//
// -------------------------------------------------------------------------
// NİYE KANCA, NİYE KOPYALA-YAPIŞTIR DEĞİL
// -------------------------------------------------------------------------
// Aynı davranış zaten üç dosyada elle yazılmıştı (AracSeciciDialog,
// PolicyOfferModal, MobileDrawer) ve BEŞ dosyada hiç yazılmamıştı:
//
//   AracDevretDialog · MaintenanceDialog · AracDevralDialog
//   SahipsizGeriYukleDialog · PaywallDialog
//
// Bu, kopyalanan davranışın kaçınılmaz sonu: bir sonraki modal yazan kişi
// kopyalamayı unutuyor. Kural bir kez yazılıp çağrılırsa unutulamıyor.
//
// -------------------------------------------------------------------------
// ÜÇ İŞ BİRLİKTE YAPILIYOR — BİRİ EKSİKSE MODAL YARIM
// -------------------------------------------------------------------------
// 1. ESC İLE KAPANMA
//    Klavye kullanıcısının modaldan çıkmasının beklenen yolu. Yoksa
//    kullanıcı Kapat düğmesini Tab'la aramak zorunda.
//
// 2. ODAK TUZAĞI
//    Tuzak yoksa Tab, modalın ARKASINDAKİ sayfada gezinmeye devam ediyor.
//    Ekran okuyucu kullanıcısı modalın açık olduğunu bile anlamıyor;
//    görmeyen bir kullanıcı için modal fiilen görünmez bir katman.
//
// 3. ODAĞIN GERİ VERİLMESİ
//    Modal kapanınca odak, modalı AÇAN ögeye dönmeli. Dönmezse odak
//    <body>'ye düşüyor ve kullanıcı listenin başından başlıyor.
//
// ⚠ KAYDIRMA KİLİDİ de burada: modal açıkken arka sayfanın kayması,
// dokunmatikte modalı kaydırmaya çalışan kullanıcıda arka planı oynatıyor.
//
// -------------------------------------------------------------------------
// KULLANIM
// -------------------------------------------------------------------------
//   const panelRef = useModalErisim(onClose, { kilitli: kaydediliyor });
//   ...
//   <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="x-baslik">
//
// `kilitli` doluyken Esc kapatmıyor: kayıt sürerken yanlışlıkla kapatmak
// yarım kalmış bir işlem bırakıyor.
// =========================================================================

import { useEffect, useRef } from 'react';

/**
 * @param {() => void} onKapat
 * @param {{ kilitli?: boolean, acik?: boolean }} [secenekler]
 *        `acik` verilmezse kanca her zaman etkin sayılır — bileşen zaten
 *        yalnızca açıkken bağlanıyorsa (koşullu render) bu doğrudur.
 * @returns {React.RefObject} panele bağlanacak ref
 */
export default function useModalErisim(onKapat, secenekler = {}) {
  const { kilitli = false, acik = true } = secenekler;
  const panelRef = useRef(null);

  useEffect(() => {
    if (!acik) return undefined;

    const oncekiOdak = document.activeElement;

    const tusaBasildi = (e) => {
      if (e.key === 'Escape') {
        if (!kilitli) onKapat?.();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;

      const odaklanabilir = panelRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (odaklanabilir.length === 0) return;

      const ilk = odaklanabilir[0];
      const son = odaklanabilir[odaklanabilir.length - 1];

      if (e.shiftKey && document.activeElement === ilk) {
        e.preventDefault();
        son.focus();
      } else if (!e.shiftKey && document.activeElement === son) {
        e.preventDefault();
        ilk.focus();
      }
    };

    document.addEventListener('keydown', tusaBasildi);
    const oncekiOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Açılışta odağı panele al. Gecikme, animasyonlu modallarda ögenin
    // henüz odaklanabilir olmamasına karşı.
    const zamanlayici = setTimeout(() => {
      const hedef = panelRef.current?.querySelector(
        'input:not([disabled]), button:not([disabled]), [href]'
      );
      hedef?.focus();
    }, 50);

    return () => {
      document.removeEventListener('keydown', tusaBasildi);
      document.body.style.overflow = oncekiOverflow;
      clearTimeout(zamanlayici);
      // ⚠ `isConnected` denetimi şart: modal bir yönlendirmeyle kapandıysa
      // açan öge artık DOM'da olmayabiliyor ve `focus()` sessizce hata
      // veriyor.
      if (oncekiOdak instanceof HTMLElement && oncekiOdak.isConnected) {
        oncekiOdak.focus();
      }
    };
  }, [acik, kilitli, onKapat]);

  return panelRef;
}
