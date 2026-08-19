// =========================================================================
// KULLANICI HTML'İNİ TEMİZLEME (htmlTemizle.js)
//
// -------------------------------------------------------------------------
// NİYE VAR — GERÇEKTEN SÖMÜRÜLEBİLİR BİR AÇIKTI
// -------------------------------------------------------------------------
// İlan açıklaması, Step2'deki `contentEditable` editörden HAM `innerHTML`
// olarak okunuyor ve `listings.description` sütununa öylece yazılıyor.
// Sonra iki yerde `dangerouslySetInnerHTML` ile basılıyor:
//
//   • VehicleDetailsScreen.jsx  -> /details/[pin]  (HERKESE AÇIK sayfa)
//   • Step4PreviewAndPublish.jsx -> yayınlama önizlemesi
//
// Yani bir kullanıcının yazdığı HTML, BAŞKA bir kullanıcının tarayıcısında
// çalışıyordu. 19 Ağustos 2026 taramasında bu canlıda kanıtlandı: açıklama
// alanına yerleştirilen `<img src=x onerror=…>` çalıştı ve `document.title`
// değişti.
//
// ⚠ ZİNCİR BURADA BİTMİYOR: oturum jetonu `localStorage`'da duruyor
// (`src/lib/supabase.js`) ve `httpOnly` değil. Yani sayfada çalışan herhangi
// bir betik `access_token`'ı okuyabiliyor. Temizlenmemiş bir açıklama =
// vitrindeki bir aracı görüntüleyen herkesin hesabının devralınabilmesi.
//
// -------------------------------------------------------------------------
// NİYE "HTML'İ TAMAMEN BIRAKALIM" DENMEDİ
// -------------------------------------------------------------------------
// Açıklama düz metin olsaydı sorun kökten biterdi. Ama ürün açıklamayı
// KENDİSİ üretiyor (Step2'deki otomatik özet `<p>`, `<b>`, `<ul>`, `<li>`
// kuruyor) ve editörde kalın/italik/liste/renk düğmeleri var. Düz metne
// geçmek hem bu özelliği hem de veritabanındaki mevcut kayıtları bozardı.
// Doğru çözüm, izin verilenleri beyaz listeye almak.
//
// -------------------------------------------------------------------------
// ⚠ TEMİZLİK BASMA ANINDA YAPILIYOR, YALNIZCA YAZMA ANINDA DEĞİL
// -------------------------------------------------------------------------
// Veritabanında ZATEN temizlenmemiş satırlar var. Yalnızca yazarken
// temizleseydik, bugüne kadar kaydedilmiş her açıklama sömürülebilir
// kalırdı. Bu yüzden asıl savunma `dangerouslySetInnerHTML`'e giden yolda:
// eski kayıtlar da, yeni kayıtlar da aynı süzgeçten geçiyor.
// =========================================================================

import DOMPurify from 'isomorphic-dompurify';

// Editörün ÜRETEBİLECEĞİ her şey burada; fazlası yok.
//   bold/italic              -> <b> <strong> <i> <em>
//   insertUnorderedList      -> <ul><li>
//   insertOrderedList        -> <ol><li>
//   foreColor / hiliteColor  -> <font color> ya da <span style="color…">
//   otomatik özet            -> <p> <b> <ul> <li> <br>
const IZINLI_ETIKETLER = [
  'p', 'br', 'div', 'span', 'font',
  'b', 'strong', 'i', 'em', 'u',
  'ul', 'ol', 'li',
];

// ⚠ `style` bilerek açık: renk düğmeleri onu üretiyor. DOMPurify style
// içeriğini de ayrıştırıp `expression()`, `url(javascript:)` gibi taşıyıcıları
// atıyor — ham bırakmakla aynı şey değil.
const IZINLI_OZNITELIKLER = ['color', 'style', 'face'];

/**
 * Kullanıcı kaynaklı HTML'i `dangerouslySetInnerHTML`'e verilebilir hâle
 * getirir.
 *
 * ⚠ BOŞ/NULL GİRDİDE BOŞ DİZE DÖNÜYOR, `undefined` DEĞİL. `undefined`
 * dönseydi `dangerouslySetInnerHTML={{ __html: undefined }}` React'te
 * uyarı üretirdi ve çağıran taraf her seferinde ayrıca korumak zorunda
 * kalırdı.
 *
 * @param {string|null|undefined} ham
 * @returns {string} temizlenmiş HTML
 */
export function htmlTemizle(ham) {
  if (!ham) return '';
  return DOMPurify.sanitize(String(ham), {
    ALLOWED_TAGS: IZINLI_ETIKETLER,
    ALLOWED_ATTR: IZINLI_OZNITELIKLER,
    // Etiket atılınca içindeki METİN kalsın: bilinmeyen bir sarmalayıcı
    // yüzünden kullanıcının yazdığı cümle yok olmamalı.
    KEEP_CONTENT: true,
    // `<a>` beyaz listede yok; yine de olası bir yönlendirmeyi kapatıyoruz.
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  });
}

export default htmlTemizle;
