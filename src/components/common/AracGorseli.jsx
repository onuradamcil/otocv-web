// =========================================================================
// ARAÇ GÖRSELİ — TEK GÖSTERİM NOKTASI
//
// -------------------------------------------------------------------------
// NİYE SARMALAYICI, NİYE HER EKRANDA `<Image>` DEĞİL
// -------------------------------------------------------------------------
// `<img>`i `next/image` ile değiştirmek göründüğü kadar mekanik değil. Üç
// tuzağı var ve üçü de on ayrı dosyada tekrar tekrar çözülmek zorunda kalırdı:
//
// 1. `onError` YEDEĞİ SESSİZCE ÖLÜYOR.
//    Projede on bir yerde şu kalıp vardı:
//      onError={(e) => { e.target.src = '/placeholder-car.jpg'; }}
//    `next/image` ile `e.target.src` atamak İŞE YARAMIYOR — bileşen kendi
//    `srcset`ini yönetiyor ve atama bir sonraki render'da eziliyor. Körlemesine
//    dönüştürmek, kırık görselde hiçbir yedeğin çıkmaması demekti.
//
// 2. ⚠ O YEDEK DOSYA ZATEN YOKTU.
//    `/placeholder-car.jpg` `public/` içinde HİÇ BULUNMUYOR (ölçüldü: 11
//    referans, 7 dosya, 0 dosya). Yani "kırık görsel yedeği" ikinci bir 404
//    üretiyor ve kullanıcı tarayıcının kırık-görsel simgesini görüyordu.
//    Doğru çözüm var olmayan bir dosyayı işaret etmek değil, hiç istek
//    yapmadan "GÖRSEL YOK" durumunu basmak — kodun başka yerlerinde
//    (GarageScreen, MarketplaceView, MyListingsScreen) zaten yapılan şey bu.
//
// 3. İYİLEŞTİRİLEMEYEN ADRESLER 400 DÖNDÜRÜYOR.
//    `blob:`, `data:`, imzalı URL'ler ve tanımadığımız hostlar `remotePatterns`
//    denetiminden geçemiyor. Bugün canlı veride yalnızca genel kova adresi var
//    (37/37 ölçüldü) ama eski bir kayıt ya da yeni bir kaynak eklendiğinde
//    ekran sessizce kırılırdı. Sarmalayıcı böyle adreslerde düz `<img>`e
//    düşüyor: görsel her koşulda görünüyor, yalnızca iyileştirme atlanıyor.
//
// Üçünü on dosyada tekrarlamak yerine bir kez burada çözülüyor.
// =========================================================================

'use client';

import Image from 'next/image';
import { useState } from 'react';
import { YER_TUTUCU_GORSEL } from '../../utils/aracGorseli';

// ⚠ SINIF ADLARI SABİT YAZILMAK ZORUNDA. `object-${uyum}` gibi birleştirilen
// bir ad Tailwind'in tarayıcısı tarafından görülmüyor ve üretimde stil hiç
// basılmıyor — geliştirmede çalışıp canlıda bozulan sinsi hata sınıfı.
const UYUM_SINIFI = {
  contain: 'object-contain',
  cover: 'object-cover',
};

/** Genel araç görseli kovasının yol öneki. `next.config.mjs`teki desenle eş. */
const GENEL_KOVA_YOLU = '/storage/v1/object/public/vehicle-images/';

/**
 * Adres `next/image` iyileştiricisinden geçebilir mi?
 *
 * `next.config.mjs`teki `remotePatterns` ile AYNI kuralı uyguluyor. Geçemeyen
 * bir adresi `<Image>`e vermek 400 Bad Request ve boş kutu demek.
 */
function iyilestirilebilir(adres) {
  if (typeof adres !== 'string' || adres.length === 0) return false;

  // Yerel yol (`/public` altındaki dosyalar) her zaman iyileştirilebilir.
  if (adres.startsWith('/')) return true;

  try {
    const u = new URL(adres);
    if (u.protocol !== 'https:') return false;      // blob:, data:, http: hariç
    if (u.search) return false;                     // imzalı URL'ler hariç
    return u.pathname.startsWith(GENEL_KOVA_YOLU);
  } catch {
    return false;
  }
}

/**
 * Araç görseli. Kapsayıcısını tamamen dolduruyor.
 *
 * ⚠ KAPSAYICI `relative` OLMALI. `fill` konumlandırması buna dayanıyor;
 * `relative` yoksa görsel en yakın konumlanmış ataya yayılıp taşıyor.
 *
 * @param {object} p
 * @param {string} p.src Görsel adresi. Boş ya da yer tutucu ise "GÖRSEL YOK" basılır.
 * @param {string} p.alt Süs görselde boş dize; bilgi taşıyorsa gerçek metin.
 * @param {string} p.sizes Kutunun GERÇEK ölçüsü. Yanlış verilmesi tüm kazancı yok eder.
 * @param {'contain'|'cover'} [p.uyum]
 * @param {boolean} [p.priority] Yalnızca ilk ekranda görünen ana görsel için.
 * @param {string} [p.className]
 * @param {string} [p.bosMetin] Görsel yokken yazılacak metin.
 */
export default function AracGorseli({
  src,
  alt = '',
  sizes,
  uyum = 'contain',
  priority = false,
  className = '',
  bosMetin = 'GÖRSEL YOK',
}) {
  // ⚠ HANGİ ADRESİN BOZUK OLDUĞU TUTULUYOR, SADECE "BOZUK MU" DEĞİL.
  //
  // Galeride tek bileşen örneği farklı adresleri sırayla gösteriyor. Boole bir
  // bayrak kullanılsa 2. fotoğraf kırıkken 3. fotoğrafa geçince bayrak açık
  // kalır ve sağlam görsel de bir daha hiç görünmezdi.
  const [bozukAdres, setBozukAdres] = useState(null);

  const yok = !src || src === YER_TUTUCU_GORSEL || bozukAdres === src;

  if (yok) {
    return (
      /* ⚠ `text-slate-600`, `slate-500` DEĞİL. Ölçüldü: slate-500 bu
         zeminde (slate-100) 4.34:1 veriyor ve WCAG AA küçük metin eşiği
         4.5. Metin 11 px kalın; kalınlık büyük-metin muafiyetine (18.66 px)
         yetmiyor, yani gerçek bir ihlaldi. slate-600 aynı zeminde 6.92:1.
         Uzun süre görünmedi çünkü her aracın fotoğrafı vardı; fotoğrafsız
         kayıt eklenince ortaya çıktı. */
      <span className="absolute inset-0 flex items-center justify-center bg-slate-100 text-etiket font-bold text-slate-600 text-center leading-tight px-1">
        {bosMetin}
      </span>
    );
  }

  const sinif = `${UYUM_SINIFI[uyum] || UYUM_SINIFI.contain} ${className}`.trim();

  if (!iyilestirilebilir(src)) {
    // İyileştirilemeyen adres: düz `<img>`. Görsel görünüyor, yalnızca
    // `/_next/image` atlanıyor. Alternatif 400 ve boş kutu olurdu.
    return (
      // eslint-disable-next-line @next/next/no-img-element -- gerekçe dosya başında
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={`absolute inset-0 w-full h-full ${sinif}`}
        onError={() => setBozukAdres(src)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={sinif}
      onError={() => setBozukAdres(src)}
    />
  );
}
