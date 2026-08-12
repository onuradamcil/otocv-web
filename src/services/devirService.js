// =========================================================================
// ARAÇ DEVRİ SERVİSİ
//
// Devir RPC çağrıları burada toplanıyor. Sebep: iki ayrı arayüz kullanıyor —
// satıcı tarafı (garaj) ve alıcı tarafı (ilan sihirbazı). Çağrıları
// bileşenlerin içine dağıtmak, hata metinlerini iki yerde tutmak demek olurdu
// ve bu projede tam olarak o hatanın bedelini gördük (hasar kataloğu üç
// dosyada ayrı ayrı duruyordu ve kaymıştı).
//
// SÖZLEŞME: marketplaceService.js ile aynı — `{ basarili, hata, veri }`.
// Fonksiyonlar ASLA exception atmaz; çağıran `basarili` alanına bakar.
//
// -------------------------------------------------------------------------
// HATA KODLARI NİYE MERKEZİ
// -------------------------------------------------------------------------
// Veritabanı fonksiyonları makine-okunur kod döndürüyor (`sahip_degil`,
// `kod_gecersiz`, ...). Kullanıcıya gösterilecek Türkçe metin burada
// üretiliyor. Böylece aynı hata iki arayüzde iki farklı cümleyle
// açıklanmıyor — ve bir metin değiştiğinde tek yer değişiyor.
// =========================================================================

import { supabase } from '../lib/supabase';

/**
 * Satıcının devir sırasında onayladığı rıza metni.
 *
 * "İÇEREBİLİR" diyor, "içermez" DEMİYOR — bu ayrım kasıtlı. Faturalar özel
 * bucket'ta ve yalnızca araç sahibi görüyor; kullanıcı onları tam da gizli
 * olduğu için yüklüyor. Türkiye'de servis faturası ada kesildiği için büyük
 * olasılıkla ad ve adres içeriyor. Devrin hukuki dayanağı bu metnin
 * onaylanması, "zaten kişisel bilgi yoktur" varsayımı değil.
 *
 * Metin veritabanında AYNEN saklanıyor (`devir_kodlari.riza_metni`), yani
 * ileride değişirse geçmiş devirlerde hangi metnin onaylandığı kanıt olarak
 * duruyor. Bu yüzden burada değiştirmek geçmişi bozmuyor.
 */
export const RIZA_METNI =
  'Bu aracı devrettiğimde bakım kayıtlarım ve yüklediğim fatura belgeleri ' +
  'araçla birlikte yeni sahibine geçecek. Bu belgeler adımı, adresimi ve ' +
  'iletişim bilgilerimi içerebilir. Devrin geri alınamayacağını ve aracın ' +
  'siciline erişimimin sona ereceğini biliyorum.';

const HATA_METNI = {
  oturum_yok:           'Bu işlem için oturum açmanız gerekiyor.',
  sahip_degil:          'Bu araç sizin garajınızda değil.',
  riza_metni_gerekli:   'Devri başlatmak için onay kutusunu işaretlemeniz gerekiyor.',
  kod_gecersiz:         'Bu devir kodu geçersiz, kullanılmış ya da süresi dolmuş.',
  kendine_devir:        'Kendi aracınızı kendinize devredemezsiniz.',
  sahiplik_degismis:    'Bu araç başka birine devredilmiş; kod artık geçerli değil.',
  cok_fazla_deneme:     'Çok fazla hatalı deneme yapıldı. 15 dakika sonra tekrar deneyin.',
  arac_yok:             'Bu plakaya kayıtlı bir araç bulunamadı.',
  zaten_sizde:          'Bu araç zaten sizin garajınızda.',
  gunluk_sinir:         'Günde en fazla 3 araç için devir talebi gönderebilirsiniz.',
  zaten_bekleyen_talep: 'Bu araç için zaten bekleyen bir devir talebi var.',
  ret_bekleme_suresi:   'Bu araç için talebiniz reddedildi. 7 gün sonra tekrar deneyebilirsiniz.',
  istek_yok:            'Bu talep bulunamadı ya da zaten karara bağlanmış.',
  aktif_sahip_yok:      'Aracın aktif sahibi bulunamadı.',
};

/** RPC sarmalayıcı: hata kodunu okunur metne çevirir, exception atmaz. */
async function cagir(fonksiyon, parametreler) {
  const { data, error } = await supabase.rpc(fonksiyon, parametreler);

  if (error) {
    // Ağ ya da yetki hatası. Ham mesajı konsola, kullanıcıya sade metin.
    console.error(`Devir servisi (${fonksiyon}):`, error.message);
    return { basarili: false, hata: 'İşlem tamamlanamadı. Lütfen tekrar deneyin.' };
  }

  if (data && data.hata) {
    return {
      basarili: false,
      kod: data.hata,
      hata: HATA_METNI[data.hata] || 'Bilinmeyen bir hata oluştu.',
      veri: data,
    };
  }

  return { basarili: true, veri: data };
}

// -------------------------------------------------------------------------
// SATICI TARAFI
// -------------------------------------------------------------------------

/** Aracın bekleyen devir kodu ve bekleyen talepleri. */
export async function devirDurumu(plaka) {
  return cagir('devir_durumu', { p_plaka: plaka });
}

/** Devir kodu üretir. Rıza metni zorunlu ve aynen saklanıyor. */
export async function devirKoduUret(plaka) {
  return cagir('devir_kodu_uret', { p_plaka: plaka, p_riza_metni: RIZA_METNI });
}

/** Bekleyen devir kodunu iptal eder. */
export async function devirKoduIptal(plaka) {
  return cagir('devir_kodu_iptal', { p_plaka: plaka });
}

/** Bekleyen bir talebi onaylar ya da reddeder. */
export async function devirTalepKarari(istekId, onay) {
  return cagir('devir_talep_karari', {
    p_istek_id: istekId,
    p_onay: onay,
    // Ret durumunda da metin gönderiliyor: fonksiyon onu yalnızca onayda
    // kullanıyor, ama iki ayrı çağrı imzası tutmaya gerek yok.
    p_riza_metni: onay ? RIZA_METNI : 'ret',
  });
}

// -------------------------------------------------------------------------
// ALICI TARAFI
// -------------------------------------------------------------------------

/** Plakanın durumu: kayıtlı mı, benim mi? Modalın üç durumu için. */
export async function plakaDurumu(plaka) {
  return cagir('plaka_durumu', { p_plaka: plaka });
}

/**
 * Devir kodunun ön izlemesi: ne devralıyorum?
 *
 * DİKKAT: bu çağrı kaba kuvvet sayacını `devirTamamla` ile PAYLAŞIYOR.
 * Arayüzde her tuş vuruşunda çağırmak, kullanıcının kendi sayacını tüketip
 * kendini kilitlemesine yol açar — yalnızca kullanıcı açıkça "Devam" dediğinde
 * çağrılmalı.
 */
export async function devirOnizleme(kod) {
  return cagir('devir_onizleme', { p_kod: kod });
}

/** Devri tamamlar. Başarılıysa `veri.yeni_pin` döner. */
export async function devirTamamla(kod) {
  return cagir('devir_tamamla', { p_kod: kod });
}

/** Araç sahibine devir talebi gönderir. */
export async function devirTalepEt(plaka, mesaj) {
  return cagir('devir_talep_et', { p_plaka: plaka, p_mesaj: mesaj });
}

/**
 * Devir kodunu normalleştirir: büyük harf, boşluk ve tire temizliği, sonra
 * `DV-XXXX-XXXX` biçimine sokar.
 *
 * Kod alfabesi Crockford Base32 (I, L, O, U yok) — kullanıcı bunlardan birini
 * yazdıysa 1 ya da 0 demek istemiştir, PIN girişindeki `pinNormalize` ile aynı
 * mantık. Bu katlama olmadan "O" yazan kullanıcı "kod geçersiz" görür ve
 * hatayı kendisinde arar.
 */
export function devirKoduNormalize(girdi) {
  if (!girdi) return '';

  // Türkçe yerel ayarı BİLEREK kullanılmıyor: toLocaleUpperCase('tr-TR')
  // 'i' harfini 'İ' yapar ve alfabede 'İ' yok. Kod alfabesi ASCII.
  const ham = String(girdi).toUpperCase().replace(/[\s-]/g, '');
  const oneksiz = ham.startsWith('DV') ? ham.slice(2) : ham;

  // Alfabe dışı karakter reddediliyor: sorguya desen karakteri ulaşmasın.
  if (!oneksiz || /[^0-9A-Z]/.test(oneksiz)) return '';

  const katlanmis = oneksiz.replace(/[IL]/g, '1').replace(/O/g, '0');
  if (katlanmis.length !== 8) return '';

  return `DV-${katlanmis.slice(0, 4)}-${katlanmis.slice(4)}`;
}
