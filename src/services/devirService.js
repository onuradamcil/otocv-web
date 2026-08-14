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

  // SAHİPSİZ ARAÇ HAVUZU
  // Hesabı kapatılan kullanıcının aracı silinmiyor, sahipsiz havuza düşüyor.
  // Sicili yaşıyor ama kimsenin garajında görünmüyor.
  sahipsiz:             'Bu aracın kayıtlı sahibi yok. Devir talebi yerine sicil geri yükleme yolunu kullanmanız gerekiyor.',
  arac_sahipsiz_degil:  'Bu aracın kayıtlı bir sahibi var.',
  arac_sahipli:         'Bu araç bu sırada başka birine geçmiş.',
  ruhsat_gerekli:       'Devam etmek için aracın ruhsatını yüklemeniz gerekiyor.',
  beyan_gerekli:        'Devam etmek için beyanı onaylamanız gerekiyor.',
  bilinmeyen_yol:       'Geçersiz işlem yolu.',
  onay_bekliyor:        'Başvurunuz inceleniyor. Ruhsat doğrulandığında bilgilendirileceksiniz.',
  odeme_bekliyor:       'Sicili garajınıza almak için ödemeyi tamamlayın.',
  bekleme_suresi:       'Bekleme süresi henüz dolmadı.',
  belgeli_yol:          'Bu başvuru belge doğrulaması bekliyor; kendiliğinden tamamlanamaz.',
  kisit_yok:            'Bu aracın belgeleri zaten açık.',
  sahip_degismis:       'Araç bu sırada el değiştirmiş.',

  // ⚠ AŞAĞIDAKİ ÜÇÜ EKSİKTİ ve kullanıcı "Bilinmeyen bir hata oluştu."
  // görüyordu. Üçü de devir onay/ödeme akışının GERÇEK dalları:
  bulunamadi:           'Bu devir işlemi bulunamadı ya da artık geçerli değil.',
  durum_uygun_degil:    'Bu talep zaten karara bağlanmış.',
  suresi_doldu:         'Ödeme süresi doldu; işlem sıfırlandı. Araç sahibinden yeni bir devir kodu isteyin.',
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


// -------------------------------------------------------------------------
// ALICI TARAFI
//
// ⚠ `devirTalepKarari` ve `devirTalepEt` KALDIRILDI. İkisi de hiçbir yerden
// çağrılmıyordu: ilkinin yerini `devirIstekKarari` aldı, ikincisi ise
// sunucuda zaten yetkisiz (`20260814140000_devir_talep_yolu_kapatildi.sql`)
// — çağrılsa yetki hatası dönerdi. Çalışmayan bir fonksiyonu serviste
// tutmak, sonraki okuyucuya var olmayan bir yol vaat ediyor.
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

/**
 * ⚠ `devirTamamla` KALDIRILDI.
 *
 * Eskiden kodu giren kişi aracı ANINDA üzerine alıyordu; araç sahibinin
 * ikinci bir onayı ve devir ücreti yoktu. `devir_tamamla` artık istemciye
 * kapalı (yalnızca service_role). Açık kalsaydı devralan kişi hem onayı hem
 * ücreti atlayabilir, aşağıdaki akış yalnızca arayüzde var olan bir süs
 * olurdu.
 *
 * Devir artık üç adım: istek -> araç sahibinin onayı -> ücret.
 */

/**
 * DEVRALAN: kod üzerinden devir isteği açar. ARAÇ GEÇMEZ, araç sahibine
 * bildirim gider.
 */
export async function devirIstekOlustur(kod) {
  return cagir('devir_istek_olustur', { p_kod: kod });
}

/** ARAÇ SAHİBİ: kendisine gelen açık devir talepleri. */
export async function devirGelenTalepler() {
  return cagir('devir_gelen_talepler');
}

/**
 * ARAÇ SAHİBİ: talebi onaylar ya da reddeder.
 *
 * Rıza metni BURADA istenmiyor: rıza kod üretilirken bir kez alınıyor
 * (ürün sahibinin kararı). Aynı metni iki kez onaylatmak onayı refleks
 * hâline getiriyordu.
 */
export async function devirIstekKarari(istekId, onay) {
  return cagir('devir_istek_karari', { p_istek_id: istekId, p_onay: onay });
}

/** DEVRALAN: onay bekleyen ve ödeme bekleyen devir işlemlerim. */
export async function devirBekleyenlerim() {
  return cagir('devir_bekleyenlerim');
}

/**
 * DEVRALAN: ücreti öder ve aracı devralır.
 *
 * ⚠ TUTAR İSTEMCİDEN GİTMİYOR. `demo_satin_alma` tutarı istemciden alıyor,
 * yani oradan geçirilseydi ₺0 gönderilebilirdi. Satın alma kaydını
 * fonksiyonun kendisi oluşturuyor ve tutarı sunucudaki `devir_ucreti()`
 * sabitinden yazıyor.
 */
export async function devirOdeyipTamamla(istekId) {
  return cagir('devir_odeyip_tamamla', { p_istek_id: istekId });
}


// -------------------------------------------------------------------------
// SAHİPSİZ ARAÇ HAVUZU
//
// Bir kullanıcı hesabını kapattığında aracı ve sicili SİLİNMİYOR: sahip bağı
// koparılıyor, araç "sahipsiz" oluyor. Kimsenin garajında görünmüyor ve
// karnesi PIN'le bile açılmıyor — yalnızca özeti görünüyor.
//
// Geri almanın İKİ KAPISI var ve ikisi ayrı işi yapıyor:
//
//   1. RUHSAT + ELLE ONAY  → aracın gerçekten talep edenin olduğunu kanıtlar.
//      Ele geçirmeyi engelleyen kontrol BUDUR. Plakalar sokakta görünür;
//      yalnızca plakayı bilmek bir aracın servis geçmişini ve önceki
//      sahibinin faturalarını almaya yetmemeli.
//
//   2. ÜCRET → hesabı kapatıp aracı ücretsiz geri alma oyununu bitirir.
//      Ödeme ele geçirmeyi ENGELLEMEZ, yalnızca fiyatlandırır; bu yüzden
//      birinci kapının yerine geçemez.
//
// Ücret ONAYDAN SONRA alınıyor: reddedilen talepte hiç para alınmadığı için
// iade, itiraz ve ters ibraz süreci hiç doğmuyor.
//
// `sahipsiz_geri_yukle` BİLEREK burada yok — o fonksiyon yalnızca
// service_role'e açık. İstemciden çağrılamaz; onayı ve tahsilatı yönetim
// tarafı veriyor.
// -------------------------------------------------------------------------

/**
 * Sahipsiz aracın özeti: kaç bakım kaydı, kaçı belgeli, sicil puanı.
 *
 * Kayıtların KENDİSİNİ döndürmüyor. Özetin gerçek sayılarla dönmesi, geri
 * yükleme teklifinin ("bu aracın 11 bakım kaydı var") doğru olması için.
 */
export async function sahipsizOnizleme(plaka) {
  return cagir('sahipsiz_onizleme', { p_plaka: plaka });
}

/**
 * Otomatik yolda kullanıcının onayladığı beyan.
 *
 * `RIZA_METNI` ile aynı kalıp: metin veritabanında AYNEN saklanıyor
 * (`sahipsiz_talepleri.beyan_metni`). İleride değişirse geçmiş başvurularda
 * hangi beyanın onaylandığı kanıt olarak duruyor.
 *
 * Beyanın tek başına bir şeyi KANITLAMADIĞINI biliyoruz — bu yüzden otomatik
 * yolda fatura belgeleri açılmıyor. Beyan, kötüye kullanımı hukuken
 * sorumlulaştırıyor; belgeleri koruyan şey ise veri ayrımı.
 */
export const BEYAN_METNI =
  'Bu aracın maliki olduğumu ve sicilini devralmaya yetkili olduğumu beyan ' +
  'ederim. Beyanımın gerçeğe aykırı olması hâlinde doğacak hukuki ve cezai ' +
  'sorumluluğun bana ait olduğunu, sicilin geri alınabileceğini kabul ediyorum.';

/**
 * Sahipsiz araç için sicil geri yükleme başvurusu açar. İki yol var:
 *
 *   'otomatik' — beyan + ödeme + 7 gün bekleme. İnsan onayı YOK.
 *                Bakım kayıtları gelir, FATURA GÖRSELLERİ GELMEZ.
 *   'belgeli'  — ruhsat yüklenir, elle incelenir. Belgeler de açılır.
 *
 * Ayrım kasıtlı: otomatik yol kötüye kullanılsa bile ele geçen şey arabaya
 * ait veri oluyor; eski sahibin adı-adresi yazılı belgeler aktarılmıyor.
 *
 * HİÇBİR ŞEYİ DEVRETMEZ — yalnızca kayıt oluşturur. Sınırlar `devirTalepEt`
 * ile aynı: günde 3 farklı araç, araç başına tek bekleyen başvuru, ret
 * sonrası 7 gün bekleme.
 *
 * @param {string} plaka
 * @param {'otomatik'|'belgeli'} yol
 * @param {{ruhsatYolu?: string}} [ekler] Belgeli yolda ruhsat yolu zorunlu
 */
export async function sahipsizTalepEt(plaka, yol, ekler = {}) {
  return cagir('sahipsiz_talep_et', {
    p_plaka: plaka,
    p_yol: yol,
    p_ruhsat_yolu: ekler.ruhsatYolu ?? null,
    p_beyan_metni: yol === 'otomatik' ? BEYAN_METNI : null,
  });
}

/**
 * Otomatik yolda bekleme süresi dolduktan sonra devralmayı tamamlar.
 *
 * Zamanlanmış iş yok: kullanıcı geri gelip kendisi tamamlıyor. İki kapı
 * fonksiyonun içinde — bekleme süresi ve ödeme.
 */
export async function sahipsizOtomatikTamamla(istekId) {
  return cagir('sahipsiz_otomatik_tamamla', { p_istek_id: istekId });
}

/**
 * Otomatik yolla devralınan araçta fatura belgelerini açmak için ruhsat
 * doğrulama başvurusu.
 *
 * ÜCRETSİZ: belge kısıtı bir paywall değil, önceki sahibin kişisel verisini
 * koruyan güvenlik önlemi. Sicil geri yükleme ücreti zaten ödendi.
 */
export async function belgeKisitiTalepEt(plaka, ruhsatYolu) {
  return cagir('belge_kisiti_talep_et', { p_plaka: plaka, p_ruhsat_yolu: ruhsatYolu });
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
