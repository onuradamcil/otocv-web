// =========================================================================
// PAROLA KURALI — TEK KAYNAK
//
// -------------------------------------------------------------------------
// NİYE VAR — KURAL DÖRT YERE AYRI AYRI YAZILMIŞTI
// -------------------------------------------------------------------------
// "En az 6 karakter" şu dört yerde birbirinden bağımsız duruyordu:
//
//   HesabimEkrani.jsx      şifre değiştirme doğrulaması
//   ResetPasswordScreen.jsx  parolamı unuttum akışı
//   VehicleAuthScreen.jsx    kayıt / giriş hata metni
//   hesapService.js          Supabase hata çevirisi
//
// Dördü ayrı ayrı eskiyebilir. Nitekim `VehicleAuthScreen` metninde bir de
// yazım hatası birikmişti ("en his en az 6 karakterden").
//
// -------------------------------------------------------------------------
// ⚠ ARAYÜZ İLE SUNUCU AYRI DÜŞERSE KULLANICI ANLAMSIZ HATA ALIR
// -------------------------------------------------------------------------
// Supabase'in kendi asgari uzunluğu panelden ayarlanıyor
// (Authentication -> Sign In / Providers -> Email -> Minimum password
// length). Arayüz sunucudan GEVŞEK olursa kullanıcı formu geçer, istek
// sunucuda düşer ve ekrana "Password should be at least 10 characters" gibi
// İngilizce, bağlamsız bir mesaj gelir.
//
// Bu yüzden arayüz sunucudan DAHA SIKI tutuluyor: sunucu 6'ya izin verse
// bile arayüz 10 istiyor. Ters yönde hata yapmak kullanıcıyı çıkmaza sokar,
// bu yönde hata yapmak yalnızca daha güçlü parola ister.
//
// ⚠ MEVCUT KULLANICILAR ETKİLENMİYOR. Supabase belgesi açık: eski parolayla
// giriş çalışmaya devam eder; kural yalnızca YENİ parolalarda uygulanır.
// =========================================================================

/** Arayüzün dayattığı asgari parola uzunluğu. */
export const EN_AZ_PAROLA = 10;

/** Kullanıcıya gösterilecek kural metni. Uzunlukla birlikte değişir. */
export const PAROLA_KURALI_METNI = `Şifre en az ${EN_AZ_PAROLA} karakter olmalı.`;

/**
 * Parola kuralı sağlanıyor mu?
 * @param {string} parola
 * @returns {boolean}
 */
export function parolaYeterliMi(parola) {
  return typeof parola === 'string' && parola.length >= EN_AZ_PAROLA;
}
