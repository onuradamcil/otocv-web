// =========================================================================
// PAYWALL — ÜCRETLİ İŞLEM ONAY EKRANI
//
// Tek bileşen, dört ürün: devir, sicil geri yükleme, ek araç, vitrin.
// Ürün tanımları `src/data/paketler.js` içinde; burada hiçbir fiyat ya da
// ürün metni yazılı DEĞİL. Sebep: aynı fiyat iki yerde durursa kayar ve bu
// projede o hata hasar kataloğunda bir kez yaşandı.
//
// -------------------------------------------------------------------------
// ⚠ DEMO OLDUĞU SAKLANMIYOR
// -------------------------------------------------------------------------
// Tahsilat altyapısı yok. Ekran bunu kullanıcıdan gizlemiyor: `DEMO_MOD`
// açıkken hem üstte bant, hem düğmenin üstünde etiket var. Gerçek bir ödeme
// ekranına benzeyip para almamak, kullanıcıya ödediğini sandırmak olurdu —
// bu projede kaldırılan sahte QR tarayıcısıyla aynı hata.
//
// -------------------------------------------------------------------------
// SUNUCU KİLİDİ YOK — BİLİNEN VE KABUL EDİLMİŞ
// -------------------------------------------------------------------------
// Bu ekran bir ARAYÜZ kapısı. Ayrıcalıklar hâlâ istemciden yazılabiliyor
// (`listings.is_featured` kullanıcının kendi satırında serbest,
// `profiles` INSERT politikası koşulsuz). Yani paywall şu an atlanabilir.
// Ürün kararı: önce ekran, kilit sonra. Ayrıntı ve gerekçe TODO.md'de.
// Tahsilat bağlanırken kilit de aynı turda kurulmalı — aksi halde para alan
// ama zorlamayan bir sistem olur ki bu, hiç almamaktan kötüdür.
// =========================================================================

'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './icons';
import { DEMO_MOD, fiyatYaz, urunGetir } from '../../data/paketler';
import { demoSatinAl } from '../../services/odemeService';

/**
 * @param {object}   props
 * @param {string}   props.urunKodu  'devir' | 'sicil_geri_yukleme' | 'ek_arac' | 'vitrin'
 * @param {string}  [props.baslik]   Ürün adının yerine geçen başlık (bağlama özel)
 * @param {node}    [props.detay]    Ürünün altında gösterilecek bağlam (örn. araç kartı)
 * @param {Function} props.onKapat
 * @param {Function} props.onSatinAl Demo satın alma onaylandığında çağrılır
 * @param {boolean} [props.kaydiCagiranUretir=false]
 *   TRUE ise bu diyalog `satin_almalar` kaydını ÜRETMEZ, yalnızca onayı
 *   toplar ve `onSatinAl`ı çağırır.
 *
 *   Varsayılan davranış (kaydı diyalogun üretmesi) bilinçli bir korumadır —
 *   gerekçesi `satinAl` içinde yazılı. Bu bayrak yalnızca çağıranın kaydı
 *   İŞLEMLE BİRLİKTE, tek bir sunucu çağrısında ürettiği durumda açılmalı.
 *
 *   Tek kullanıcısı devir: `devir_odeyip_tamamla` satın alma kaydını
 *   sahiplik değişimiyle AYNI işlemde oluşturuyor, tutarı sunucudaki
 *   sabitten yazıyor ve devir başarısız olursa kaydı `iade` ediyor.
 *   Yani oradaki güvence bu diyalogunkinden daha güçlü; iki kayıt üretmek
 *   ise kullanıcıdan iki kez ücret alınmış gibi görünürdü.
 */
export default function PaywallDialog({
  urunKodu, baslik, detay, onKapat, onSatinAl, kaydiCagiranUretir = false,
}) {
  const [islemde, setIslemde] = useState(false);
  const [hata, setHata] = useState('');
  const urun = urunGetir(urunKodu);

  // Bilinmeyen ürün kodunda sessizce boş modal göstermek yerine hiç açılmıyor.
  // Sessiz boşluk, "ödeme ekranı açılmadı" diye bildirilen bir hataya dönerdi.
  if (!urun) {
    console.error('PaywallDialog: bilinmeyen ürün kodu:', urunKodu);
    return null;
  }

  // SATIN ALMA KAYDI BURADA ÜRETİLİYOR, ÇAĞIRANDA DEĞİL.
  //
  // Sebep: ayrıcalıklar veritabanındaki `satin_almalar` kaydından türüyor.
  // Kaydı çağırana bıraksaydım, bir çağıran unuttuğunda arayüz "satın
  // alındı" der ama veritabanı işlemi reddederdi — kullanıcı ödediğini
  // sanıp hata alırdı. Kayıt üretilmeden `onSatinAl` çağrılmıyor.
  const satinAl = async () => {
    setIslemde(true);
    setHata('');

    let veri = null;

    if (!kaydiCagiranUretir) {
      const sonuc = await demoSatinAl(urun.kod, urun.fiyat);
      if (!sonuc.basarili) {
        setHata(sonuc.hata);
        setIslemde(false);
        return;
      }
      veri = sonuc.veri;
    }

    try {
      // Çağıran kaydı kendisi üretiyorsa hatayı da o bildiriyor; burada
      // yalnızca diyalog kapanma sorumluluğu çağırana geçiyor.
      await onSatinAl?.(urun, veri);
    } finally {
      setIslemde(false);
    }
  };

  // Portal yalnızca tarayıcıda kurulabiliyor. `useEffect` + state ile
  // "bağlandım" bayrağı tutmak da işe yarardı ama React onu haklı olarak
  // uyarıyor (etki gövdesinde senkron setState = zincirleme render) — aynı
  // uyarıyla useSicil'de de uğraşıldı. Buna gerek de yok: bu diyalog
  // yalnızca kullanıcı tıkladıktan sonra monte ediliyor, yani sunucuda hiç
  // render edilmiyor ve hidrasyon uyuşmazlığı doğmuyor.
  if (typeof document === 'undefined') return null;

  // -------------------------------------------------------------------------
  // PORTAL ŞART — tarayıcıda görülerek bulundu
  // -------------------------------------------------------------------------
  // Paywall, ilan modalının içinden açılıyor ve o modalın kökünde
  // `backdrop-blur-xs` var. `backdrop-filter` (tıpkı `transform` ve `filter`
  // gibi) `position: fixed` alt öğeler için KAPSAYICI BLOK yaratıyor: yani
  // `inset-0` ekranı değil, o modalın kutusunu referans alıyordu ve paywall'ın
  // üstü — sarı demo bandı ve başlık dahil — kırpılıyordu.
  //
  // Bu, yalnızca ekran görüntüsü alınarak fark edildi; ne lint ne derleme
  // yakalar. `body`'ye taşımak sorunu kaynağında bitiriyor ve bileşen
  // ileride başka bir bulanık/dönüşümlü kabın içinden açılırsa da güvenli.
  return createPortal(
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4 animate-fadeIn font-sans antialiased">
      {/* max-h + flex sütun: içerik uzunsa MODAL kendi içinde kayıyor.
          İlk hâlinde sabit yükseklikti ve içerik ekrandan uzun olduğunda
          modalın ÜSTÜ görünmez oluyordu — yani demo bandı ve başlık
          kayboluyordu. Tarayıcıda görülmeseydi fark edilmezdi. */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full relative border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">

        {/* DEMO BANDI — en üstte, kaçırılamaz yerde. shrink-0: içerik
            kayarken bant yerinde kalıyor. */}
        {DEMO_MOD && (
          <div className="bg-amber-400 text-slate-950 px-5 py-2 flex items-center justify-center gap-2 shrink-0">
            <Icon name="uyari" size="xs" strokeWidth={2.5} />
            <span className="text-[11px] font-black uppercase tracking-wider">
              Demo — gerçek ödeme alınmıyor
            </span>
          </div>
        )}

        <div className="p-6 sm:p-7 space-y-5 overflow-y-auto">
          <button
            type="button"
            onClick={onKapat}
            aria-label="Pencereyi kapat"
            className={`absolute right-4 text-slate-400 hover:text-slate-600 transition-colors w-11 h-11 rounded-full hover:bg-slate-100 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${DEMO_MOD ? 'top-12' : 'top-4'}`}
          >
            <Icon name="kapat" size="md" />
          </button>

          <div className="space-y-1 pr-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
              Ücretli işlem
            </p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              {baslik || urun.ad}
            </h3>
            <p className="text-sm text-slate-500 font-normal leading-relaxed">
              {urun.ozet}
            </p>
          </div>

          {/* Bağlama özel içerik: hangi araç, hangi ilan. Çağıran veriyor. */}
          {detay}

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
            {urun.kazanimlar.map((k) => (
              <div key={k} className="flex items-start gap-2.5">
                <span className="text-emerald-600 shrink-0 mt-0.5">
                  <Icon name="onay" size="xs" strokeWidth={3} />
                </span>
                <span className="text-xs text-slate-700 font-medium leading-relaxed">{k}</span>
              </div>
            ))}
          </div>

          <div className="flex items-end justify-between border-t border-slate-100 pt-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Tek seferlik
              </p>
              <p className="text-3xl font-black text-slate-900 tabular-nums leading-none mt-0.5">
                {fiyatYaz(urun.fiyat)}
              </p>
              {urun.sureGun && (
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  {urun.sureGun} gün geçerli
                </p>
              )}
            </div>
            {/* Abonelik DEĞİL olduğu açıkça yazıyor: tekrar eden ödeme
                beklentisi oluşmasın. */}
            <p className="text-[11px] text-slate-400 font-medium text-right max-w-[45%] leading-relaxed">
              Abonelik değil, tekrar eden ödeme yok
            </p>
          </div>

          {hata && (
            <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded-lg p-3">
              {hata}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onKapat}
              disabled={islemde}
              className="w-full bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-800 font-bold text-sm py-3.5 rounded-xl transition-all cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={satinAl}
              disabled={islemde}
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-98 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm py-3.5 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              {islemde
                ? 'İşleniyor…'
                : DEMO_MOD
                  ? `${fiyatYaz(urun.fiyat)} Öde (Demo)`
                  : `${fiyatYaz(urun.fiyat)} Öde`}
            </button>
          </div>

          {DEMO_MOD && (
            <p className="text-[11px] text-slate-400 leading-relaxed text-center">
              Ödeme altyapısı henüz bağlı değil. Bu adım işlemi ücretsiz
              tamamlar; kartınızdan hiçbir tutar çekilmez.
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
