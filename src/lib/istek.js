// =========================================================================
// AĞ İSTEĞİ DAYANIKLILIĞI (istek.js)
//
// -------------------------------------------------------------------------
// NİYE VAR — ÖLÇÜLMÜŞ BİR KUSUR
// -------------------------------------------------------------------------
// Araç detayı, karne ve `useSicil` üçü de `supabase.rpc('sicil_getir')`
// çağırıyordu ve üçünde de `try/catch` YOKTU. supabase-js normalde
// `{data, error}` döndürür, ama promise'in kendisi REDDEDİLİRSE (ağ kopması,
// sunucu ölümü, CORS, DNS) hiçbir dal çalışmıyordu:
//
//   const { data, error } = await supabase.rpc(...)   <- burada fırlıyor
//   ...
//   setYukleniyor(false);                             <- buraya HİÇ gelinmiyor
//
// Sonuç: yükleme durumu sonsuza kadar açık kalıyor, kullanıcı kalıcı iskelet
// görüyor ve çıkış yolu yok. Üstelik reddedilen promise `app/error.js`
// sınırına da ULAŞMIYOR — hata sınırları yalnızca render sırasında fırlatılan
// hataları yakalar. Yani ekranda ne veri var, ne hata; sadece dönen iskelet.
//
// Doğru kalıp projede zaten vardı (`GarageScreen.jsx` `try/catch/finally`),
// ama bu üç dosyaya uygulanmamıştı.
//
// -------------------------------------------------------------------------
// NİYE ZAMAN AŞIMI DA GEREKİYOR
// -------------------------------------------------------------------------
// Reddedilmek hızlıdır; ASILI KALMAK değil. İstek hiç cevap vermezse
// promise ne çözülür ne reddedilir — `try/catch` bile kurtarmaz, çünkü
// beklenen satıra hiç gelinmez. Bu yüzden yarış (`Promise.race`) şart.
//
// Projede daha önce hiç zaman aşımı yoktu: `AbortController`, `AbortSignal`
// ve `Promise.race` için tüm `src/` içinde sıfır eşleşme vardı.
// =========================================================================

/** Varsayılan üst sınır. Mobil şebekede yavaş ama çalışan bir bağlantıyı
 *  kesmeyecek kadar uzun, kullanıcıyı ekrana kilitlemeyecek kadar kısa. */
export const ZAMAN_ASIMI_MS = 15_000;

/** Zaman aşımına uğrayan isteklerin fırlattığı işaret. */
export class ZamanAsimiHatasi extends Error {
  constructor(ms) {
    super(`İstek ${ms} ms içinde yanıtlanmadı.`);
    this.name = 'ZamanAsimiHatasi';
    this.zamanAsimi = true;
  }
}

/**
 * Bir promise'i zaman aşımına bağlar.
 *
 * Not: yarışı kaybeden istek İPTAL EDİLMİYOR — supabase-js çağrısına
 * `AbortSignal` geçirmenin yolu yok. Ama arayüz artık beklemiyor, ve geç
 * gelen yanıt çağıran taraftaki `iptal` bayrağı sayesinde state'e yazmıyor.
 *
 * @template T
 * @param {Promise<T>} istek
 * @param {number} ms
 * @returns {Promise<T>}
 */
export function zamanAsimiyla(istek, ms = ZAMAN_ASIMI_MS) {
  let sayac;
  const saat = new Promise((_, reddet) => {
    sayac = setTimeout(() => reddet(new ZamanAsimiHatasi(ms)), ms);
  });

  return Promise.race([istek, saat]).finally(() => clearTimeout(sayac));
}

/**
 * Yakalanan bir hatayı kullanıcıya gösterilebilir metne çevirir.
 *
 * Ham hata mesajını basmak iki sebeple yanlış: dil karışıyor ve teknik
 * ayrıntı kullanıcıya bir şey anlatmıyor. Ama hatayı YUTMUYORUZ da —
 * konsola tam hâli yazılıyor, ekrana ne yapılacağı yazılıyor.
 */
export function agHatasiMetni(hata) {
  if (hata?.zamanAsimi) {
    return 'Sunucu zamanında yanıt vermedi. Bağlantınızı kontrol edip tekrar deneyin.';
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'İnternet bağlantınız görünmüyor. Bağlandığınızda tekrar deneyin.';
  }
  return 'Bağlantı kurulamadı. Lütfen tekrar deneyin.';
}
