// =========================================================================
// HESAP SERVİSİ
//
// "Hesabım" ekranının veritabanı ve auth çağrıları. Ekran bileşenleri
// doğrudan `supabase` çağırmıyor; hata metinleri tek yerde toplanıyor —
// `devirService.js` ve `odemeService.js` ile aynı sözleşme.
//
// -------------------------------------------------------------------------
// NELERİN İSTEMCİDEN YAZILAMADIĞI
// -------------------------------------------------------------------------
//   is_premium         `profiles_premium_koru` tetikleyicisi eski değeri
//                      geri yazıyor — sessizce, hata vermeden
//   pazarlama_izni_at  `profiles_pazarlama_izni_damgala` tetikleyicisi
//                      yazıyor; istemciden gelen değer her zaman eziliyor
//   kapatma talebi     `hesap_kapatma_talepleri` tablosunda authenticated
//                      için yalnızca SELECT yetkisi var; kayıt RPC'den
//
// Yani bu servisi atlamak bir işe yaramıyor: kilit arayüzde değil
// veritabanında.
// =========================================================================

import { supabase } from '../lib/supabase';

/**
 * Supabase auth hatalarının okunur karşılıkları.
 *
 * Ham İngilizce mesajı kullanıcıya göstermek iki sebeple yanlış: dil
 * karışıyor ve mesajlar sürüm arasında değişebiliyor.
 */
const AUTH_METNI = [
  [/New password should be different/i,
   'Yeni şifreniz mevcut şifrenizden farklı olmalı.'],
  [/Password should be at least/i,
   'Şifre en az 6 karakter olmalı.'],
  [/email address is invalid|Unable to validate email/i,
   'E-posta adresi geçerli görünmüyor.'],
  [/already registered|already been registered/i,
   'Bu e-posta adresi başka bir hesapta kullanılıyor.'],
  [/rate limit|too many requests/i,
   'Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar deneyin.'],
  [/same_email|should be different from the old/i,
   'Yeni e-posta adresi mevcut adresinizle aynı.'],
];

export function authHatasi(hata) {
  const mesaj = hata?.message || '';
  if (!mesaj) return null;
  for (const [kalip, metin] of AUTH_METNI) {
    if (kalip.test(mesaj)) return metin;
  }
  // Eşleşmeyen hatayı YUTMUYORUZ. Sessizce "bir şeyler ters gitti" demek,
  // kullanıcıyı da bizi de kör bırakıyor.
  return `İşlem tamamlanamadı: ${mesaj}`;
}

// -------------------------------------------------------------------------
// PROFİL
// -------------------------------------------------------------------------

export async function profilGetir(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('first_name, last_name, phone_number, is_premium, pazarlama_izni, pazarlama_izni_at, avatar_yolu, created_at')
    .eq('id', userId)
    .single();

  if (error) return { veri: null, hata: error.message };
  return { veri: data, hata: null };
}

/**
 * Ad, soyad ve telefonu günceller.
 *
 * `is_premium` BİLEREK gönderilmiyor. Gönderilse bile tetikleyici eski
 * değeri geri yazardı; göndermemek niyeti de açık ediyor.
 */
export async function profilGuncelle(userId, { ad, soyad, telefon }) {
  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: ad.trim(),
      last_name: soyad.trim(),
      phone_number: telefon.trim() || null,
    })
    .eq('id', userId);

  if (error) return { basarili: false, hata: error.message };
  return { basarili: true, hata: null };
}

/**
 * Pazarlama iznini günceller.
 *
 * Rıza tarihi GÖNDERİLMİYOR: sunucudaki tetikleyici yazıyor. İspat
 * yükümlülüğü bizde olduğu için tarihin istemciden gelmesi kabul edilemez.
 */
export async function pazarlamaIzniYaz(userId, izinli) {
  const { error } = await supabase
    .from('profiles')
    .update({ pazarlama_izni: !!izinli })
    .eq('id', userId);

  if (error) return { basarili: false, hata: error.message };
  return { basarili: true, hata: null };
}

// -------------------------------------------------------------------------
// E-POSTA VE ŞİFRE
// -------------------------------------------------------------------------

/**
 * E-posta değişikliği başlatır.
 *
 * Adres ANINDA değişmiyor: Supabase yeni adrese doğrulama bağlantısı
 * gönderiyor ve kullanıcı tıklayana kadar eski adres geçerli kalıyor.
 * Ekranın bunu açıkça söylemesi gerekiyor, yoksa kullanıcı değişikliğin
 * tamamlandığını sanır ve eski adresle giriş yapmayı deneyip şaşırır.
 */
export async function epostaDegistir(yeniEposta) {
  const { error } = await supabase.auth.updateUser({ email: yeniEposta.trim() });
  if (error) return { basarili: false, hata: authHatasi(error) };
  return { basarili: true, hata: null };
}

/**
 * Şifreyi değiştirir.
 *
 * Önce MEVCUT şifre doğrulanıyor. Supabase `updateUser` bunu istemiyor —
 * oturum açık olması yeterli. Ama açık bırakılmış bir ekranı bulan biri
 * şifreyi değiştirip hesabı ele geçirebilirdi. `signInWithPassword` ile
 * mevcut şifreyi doğrulamak bu boşluğu kapatıyor; sektörde de standart.
 */
export async function sifreDegistir(eposta, mevcutSifre, yeniSifre) {
  const { error: dogrulama } = await supabase.auth.signInWithPassword({
    email: eposta,
    password: mevcutSifre,
  });

  if (dogrulama) {
    return { basarili: false, hata: 'Mevcut şifreniz doğru değil.' };
  }

  const { error } = await supabase.auth.updateUser({ password: yeniSifre });
  if (error) return { basarili: false, hata: authHatasi(error) };
  return { basarili: true, hata: null };
}

// -------------------------------------------------------------------------
// HESAP KAPATMA TALEBİ
// -------------------------------------------------------------------------

/** Bekleyen talep varsa döner, yoksa null. */
export async function bekleyenKapatmaTalebi(userId) {
  const { data, error } = await supabase
    .from('hesap_kapatma_talepleri')
    .select('id, durum, arac_sayisi, olustu')
    .eq('user_id', userId)
    .eq('durum', 'bekliyor')
    .maybeSingle();

  if (error) return { talep: null, hata: error.message };
  return { talep: data || null, hata: null };
}

export async function kapatmaTalepEt(notMetni) {
  const { data, error } = await supabase.rpc('hesap_kapatma_talep_et', {
    p_not: notMetni || null,
  });

  if (error) return { basarili: false, hata: error.message };
  if (!data?.basarili) return { basarili: false, hata: data?.hata_mesaji || 'Talep oluşturulamadı.' };
  return { basarili: true, hata: null, aracSayisi: data.arac_sayisi };
}

export async function kapatmaTalebiIptal() {
  const { data, error } = await supabase.rpc('hesap_kapatma_talebi_iptal');

  if (error) return { basarili: false, hata: error.message };
  if (!data?.basarili) return { basarili: false, hata: data?.hata_mesaji || 'Talep iptal edilemedi.' };
  return { basarili: true, hata: null };
}

/** Kullanıcının hâlâ üzerinde duran araçları — kapatma öncesi uyarı için. */
export async function aracOzeti(userId) {
  const { data, error } = await supabase
    .from('vehicles')
    .select('plate_number, brand, model')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return { araclar: [], hata: error.message };
  return { araclar: data || [], hata: null };
}

// -------------------------------------------------------------------------
// PROFİL GÖRSELİ
//
// Kova ÖZEL (`public: false`): profil görseli bir kişinin yüzü olabiliyor.
// Genel kovada dosya adını tahmin eden herkes ona ulaşır; üstelik klasör
// adı kullanıcı kimliği olduğu için genel kova "bu kimliğin görseli var mı"
// sorusunu da cevaplar. Okuma imzalı URL ile — `belgeler` kovasındaki
// kalıbın aynısı.
// -------------------------------------------------------------------------

const AVATAR_KOVASI = 'avatarlar';

/**
 * Profil görseli değiştiğinde yayınlanan olay.
 *
 * NİYE GEREKİYOR: başlıktaki hesap menüsü profili KENDİ çekiyor ve bunu
 * yalnızca oturum değişince yapıyor. Kullanıcı Hesabım ekranından görsel
 * yüklediğinde menü bunu bilmiyordu ve sayfa yenilenene kadar baş harfleri
 * göstermeye devam ediyordu — kullanıcı "yüklenmedi mi?" diye tekrar
 * deniyordu.
 *
 * Global durum kütüphanesi eklemek yerine tarayıcının kendi olay yolu
 * kullanılıyor: tek yönlü, tek tüketicili ve bağımlılık getirmiyor.
 */
export const AVATAR_DEGISTI = 'otocv:avatar-degisti';

function avatarDegistiDuyur() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AVATAR_DEGISTI));
  }
}

/** Görsel için kısa ömürlü imzalı URL. Yol yoksa null. */
export async function avatarUrl(yol, saniye = 3600) {
  if (!yol) return null;
  const { data, error } = await supabase.storage
    .from(AVATAR_KOVASI)
    .createSignedUrl(yol, saniye);

  if (error) {
    console.error('Avatar URL üretilemedi:', error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}

/**
 * Profil görselini yükler ve `profiles.avatar_yolu` alanını günceller.
 *
 * Dosya adı zaman damgalı: aynı adla üzerine yazmak, tarayıcı ve CDN
 * önbelleğinde eski görselin kalmasına yol açıyor ve kullanıcı "değişmedi"
 * sanıyor. Yeni ad bu sorunu tamamen kaldırıyor.
 *
 * Boyut ve tür sınırı KOVADA da var (2 MB, yalnızca görüntü). Buradaki
 * kontrol kullanıcıya hızlı geri bildirim için; asıl kapı sunucuda.
 */
export async function avatarYukle(userId, dosya) {
  if (!dosya) return { yol: null, hata: 'Dosya seçilmedi.' };

  if (!/^image\/(jpeg|png|webp)$/.test(dosya.type)) {
    return { yol: null, hata: 'Yalnızca JPG, PNG veya WEBP yükleyebilirsiniz.' };
  }
  if (dosya.size > 2 * 1024 * 1024) {
    return { yol: null, hata: 'Görsel 2 MB’den küçük olmalı.' };
  }

  const uzanti = dosya.type === 'image/png' ? 'png' : dosya.type === 'image/webp' ? 'webp' : 'jpg';
  const yol = `${userId}/${Date.now()}.${uzanti}`;

  const { error: yuklemeHatasi } = await supabase.storage
    .from(AVATAR_KOVASI)
    .upload(yol, dosya, { upsert: false, contentType: dosya.type });

  if (yuklemeHatasi) {
    console.error('Avatar yüklenemedi:', yuklemeHatasi.message);
    return { yol: null, hata: 'Görsel yüklenemedi. Lütfen tekrar deneyin.' };
  }

  // Eski dosya, yeni yol yazıldıktan SONRA siliniyor. Sıra önemli: önce
  // silip sonra yazma başarısız olursa kullanıcı görselsiz kalırdı.
  const { data: onceki } = await supabase
    .from('profiles').select('avatar_yolu').eq('id', userId).single();

  const { error } = await supabase
    .from('profiles').update({ avatar_yolu: yol }).eq('id', userId);

  if (error) return { yol: null, hata: error.message };

  if (onceki?.avatar_yolu && onceki.avatar_yolu !== yol) {
    await supabase.storage.from(AVATAR_KOVASI).remove([onceki.avatar_yolu]);
  }

  avatarDegistiDuyur();
  return { yol, hata: null };
}

/** Profil görselini kaldırır. */
export async function avatarKaldir(userId, yol) {
  const { error } = await supabase
    .from('profiles').update({ avatar_yolu: null }).eq('id', userId);

  if (error) return { basarili: false, hata: error.message };

  // Dosyayı silmek başarısız olsa bile profil temiz: kayıt tek gerçek
  // kaynak. Yetim dosya, görünen bozuk görselden iyidir.
  if (yol) await supabase.storage.from(AVATAR_KOVASI).remove([yol]);
  avatarDegistiDuyur();
  return { basarili: true, hata: null };
}
