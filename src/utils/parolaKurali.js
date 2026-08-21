// =========================================================================
// PAROLA KURALI — TEK KAYNAK
//
// -------------------------------------------------------------------------
// NİYE VAR — KURAL DÖRT YERE AYRI AYRI YAZILMIŞTI
// -------------------------------------------------------------------------
// "En az 6 karakter" şu dört yerde birbirinden bağımsız duruyordu:
//
//   HesabimEkrani.jsx        şifre değiştirme doğrulaması
//   ResetPasswordScreen.jsx  parolamı unuttum akışı
//   VehicleAuthScreen.jsx    kayıt / giriş hata metni
//   hesapService.js          Supabase hata çevirisi
//
// Dördü ayrı ayrı eskiyebilir. Nitekim `VehicleAuthScreen` metninde bir de
// yazım hatası birikmişti ("en his en az 6 karakterden").
//
// -------------------------------------------------------------------------
// ⚠ KURALLAR KULLANICIYA ÖNCEDEN GÖSTERİLMELİ — ÖLÇÜLMÜŞ BİR KUSUR
// -------------------------------------------------------------------------
// Ürün sahibi parolasını değiştiremedi. Sebep: kuralları ancak GÖNDERDİKTEN
// SONRA, kırmızı bir hata kutusunda öğrendi:
//
//   "İşlem tamamlanamadı: Password should contain at least one character
//    of each: abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ,
//    0123456789, !@#$%^&*()_+-=[]{};'\:"|<>?,./`~."
//
// Üç ayrı sorun bir arada: kural önceden görünmüyor, mesaj İngilizce
// (çeviri haritası bu hatayı tanımıyordu) ve ham karakter dökümü okunmuyor.
// Bu dosya kuralları makinece denetlenebilir hâle getiriyor; arayüz onları
// yazarken canlı gösteriyor (`components/common/ParolaKurallari.jsx`).
//
// -------------------------------------------------------------------------
// ⚠ SEMBOL KÜMESİ SUPABASE'İN HATA MESAJINDAN BİREBİR ALINDI
// -------------------------------------------------------------------------
// Ezbere yazılmadı. Sunucu farklı bir küme kabul ediyorsa, arayüzde geçen
// bir parola sunucuda düşer ve kullanıcı yine anlamsız bir hata görür —
// yani listeyi "yaklaşık" tutmak sorunu çözmüş gibi yapıp saklar.
//
// Düzenli ifade DEĞİL, dize + `includes` kullanılıyor: bu kümede `]`, `\`,
// `^` ve `-` var; hepsi karakter sınıfında ayrı ayrı kaçış istiyor ve tek
// bir unutulan kaçış kuralı sessizce yanlış yapar.
// =========================================================================

/** Arayüzün dayattığı asgari parola uzunluğu. */
export const EN_AZ_PAROLA = 10;

/** Supabase'in kabul ettiği sembol kümesi — hata mesajından birebir. */
export const SEMBOLLER = '!@#$%^&*()_+-=[]{};\'\\:"|<>?,./`~';

/**
 * Parola kuralları. Sıra ekrandaki sıradır.
 *
 * ⚠ HARF DENETİMLERİ ASCII: `[a-z]` ve `[A-Z]`. Supabase'in kümesi de
 * ASCII. Yani "şifre" yazan bir kullanıcının `ş` harfi HİÇBİR kurala
 * saymıyor. Bu, Türkçe bir üründe gerçek bir tuzak; arayüz bunu ayrıca
 * uyarıyor (bkz. `turkceHarfVarMi`).
 */
export const KURALLAR = [
  {
    ad: 'uzunluk',
    metin: `En az ${EN_AZ_PAROLA} karakter`,
    sinar: (p) => p.length >= EN_AZ_PAROLA,
  },
  {
    ad: 'kucuk',
    metin: 'Bir küçük harf (a-z)',
    sinar: (p) => /[a-z]/.test(p),
  },
  {
    ad: 'buyuk',
    metin: 'Bir büyük harf (A-Z)',
    sinar: (p) => /[A-Z]/.test(p),
  },
  {
    ad: 'rakam',
    metin: 'Bir rakam (0-9)',
    sinar: (p) => /[0-9]/.test(p),
  },
  {
    ad: 'sembol',
    metin: 'Bir sembol (! ? . - _ @ # * gibi)',
    sinar: (p) => [...p].some((k) => SEMBOLLER.includes(k)),
  },
];

/**
 * Her kuralın sağlanıp sağlanmadığını döndürür.
 * @param {string} parola
 * @returns {Array<{ad: string, metin: string, saglandi: boolean}>}
 */
export function kurallariDenetle(parola) {
  const p = typeof parola === 'string' ? parola : '';
  return KURALLAR.map((k) => ({ ad: k.ad, metin: k.metin, saglandi: k.sinar(p) }));
}

/** Tüm kurallar sağlanıyor mu? */
export function parolaYeterliMi(parola) {
  const p = typeof parola === 'string' ? parola : '';
  return KURALLAR.every((k) => k.sinar(p));
}

/**
 * Parolada ASCII dışı karakter var mı?
 *
 * ⚠ NİYE AYRI: Türkçe bir üründe kullanıcı doğal olarak "Güvenlik1!" gibi
 * bir parola yazıyor ve `ü` hiçbir kurala saymadığı için "bir küçük harf"
 * kuralı sağlanmamış görünüyor. Kullanıcı harf yazdığını bildiği için bunu
 * bir arayüz hatası sanıyor. Uyarı olmadan bu kutu insanı deli eder.
 */
export function turkceHarfVarMi(parola) {
  return /[^\x20-\x7E]/.test(typeof parola === 'string' ? parola : '');
}

/**
 * Sağlanmayan ilk kuralın metnini döndürür; hepsi sağlanıyorsa null.
 * Gönderim anındaki tek satırlık hata mesajı için.
 */
export function ilkEksikKural(parola) {
  const eksik = kurallariDenetle(parola).find((k) => !k.saglandi);
  return eksik ? eksik.metin : null;
}

/** Kullanıcıya gösterilecek özet kural metni. */
export const PAROLA_KURALI_METNI =
  `Şifre en az ${EN_AZ_PAROLA} karakter olmalı; küçük harf, büyük harf, rakam ve sembol içermeli.`;
