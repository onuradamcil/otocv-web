// =========================================================================
// DÜĞME AİLESİ — TEK KAYNAK (dugme.js)
//
// -------------------------------------------------------------------------
// NİYE VAR
// -------------------------------------------------------------------------
// Düğme sınıfları her ekranda elle yazılıyordu ve sonuç ölçüldüğünde
// tutarsızdı:
//
//   · Aynı birincil renk iki farklı yazımla: `bg-[#4F46E5]` ve
//     `bg-indigo-600` — AYNI dosyada, iki farklı düğmede.
//   · Kenarlıklar karışık: `border-gray-200` ve `border-slate-200`.
//   · Köşe yarıçapı beş ayrı değer: rounded-md / lg / xl / 2xl / 3xl.
//   · Garaj araç kartında üç düğme yan yana duruyor ama biri dolu indigo,
//     ikisi beyaz çerçeveli, dördüncüsü (`⋯`) bambaşka. Üçü de aynı sıklıkta
//     kullanılan eşdeğer eylemler; farklı görünmeleri bir bilgi taşımıyordu.
//
// Bu dosya BİLEŞEN DEĞİL, sınıf üreticisi. Sebep: mevcut ekranlar `<button>`
// ve `<Link>` karışık kullanıyor, ayrıca `disabled`, `type`, `aria-*` gibi
// özellikleri doğrudan geçiriyorlar. Bir sarmalayıcı bileşen bunların
// hepsini yeniden aktarmak zorunda kalır ve dosyaların yarısını
// dokunulması gereken hâle getirirdi. Sınıf üreticisi, tek satır
// değiştirerek aynı sonucu veriyor.
//
// -------------------------------------------------------------------------
// HİYERARŞİ — DÖRT SEVİYE
// -------------------------------------------------------------------------
//   birincil   Sayfadaki ASIL eylem. Ekran başına en fazla bir tane.
//   ikincil    Eşdeğer eylemler. Garaj kartındaki üçlü bunlar.
//   sessiz     Çerçevesiz; ikonlu ve yardımcı eylemler.
//   yikici     Geri alınamayan işler.
//
// Not: `birincil` ekran başına bir taneyle sınırlı olduğu için garaj araç
// kartındaki "Detay" ARTIK birincil değil — kartta üç eşdeğer eylem var ve
// birini öne çıkarmak yanlış bilgi veriyordu.
// =========================================================================

const ODAK = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2';

// Ortak taban: dokunma alanı, hizalama, geçiş ve odak halkası.
// `min-h-[44px]` WCAG dokunma alanı asgarisi — mobilde teste bağlı.
const TABAN =
  'inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 ' +
  'rounded-xl font-bold text-xs tracking-tight transition-colors ' +
  'cursor-pointer disabled:cursor-not-allowed select-none ' + ODAK;

const SEVIYELER = {
  birincil:
    'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm ' +
    'disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none',

  ikincil:
    'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 ' +
    'border border-slate-200 hover:border-slate-300 ' +
    'disabled:bg-slate-50 disabled:text-slate-300 disabled:border-slate-100',

  sessiz:
    'bg-transparent hover:bg-slate-100 active:bg-slate-200 text-slate-600 hover:text-slate-900 ' +
    'disabled:text-slate-300 disabled:hover:bg-transparent',

  yikici:
    'bg-white hover:bg-rose-50 active:bg-rose-100 text-rose-700 ' +
    'border border-rose-200 hover:border-rose-300 ' +
    'disabled:bg-slate-50 disabled:text-slate-300 disabled:border-slate-100',
};

/**
 * Düğme sınıflarını üretir.
 *
 * @param {'birincil'|'ikincil'|'sessiz'|'yikici'} seviye
 * @param {{tamGenislik?: boolean, ek?: string}} [secenekler]
 * @returns {string}
 */
export function dugme(seviye = 'ikincil', secenekler = {}) {
  const { tamGenislik = false, ek = '' } = secenekler;
  const stil = SEVIYELER[seviye] || SEVIYELER.ikincil;
  return [TABAN, stil, tamGenislik ? 'w-full' : '', ek].filter(Boolean).join(' ');
}

/**
 * Yalnızca ikon taşıyan kare düğme.
 *
 * Yatay dolgu yerine sabit genişlik kullanıyor ki dokunma alanı 44x44
 * kalsın. `aria-label` ÇAĞIRANIN sorumluluğu — ikonlu düğmenin erişilebilir
 * adı olmadan ekran okuyucuda "düğme" diye okunur.
 */
export function ikonDugmesi(seviye = 'ikincil', ek = '') {
  const stil = SEVIYELER[seviye] || SEVIYELER.ikincil;
  return [
    'inline-flex items-center justify-center w-11 min-h-[44px] shrink-0',
    'rounded-xl transition-colors cursor-pointer select-none',
    ODAK, stil, ek,
  ].filter(Boolean).join(' ');
}

export default dugme;
