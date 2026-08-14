// =========================================================================
// ÜCRETLİ İŞLEMLER — TEK KAYNAK
//
// -------------------------------------------------------------------------
// NEDEN İŞLEM BAŞINA, ABONELİK DEĞİL
// -------------------------------------------------------------------------
// Bireysel kullanıcı yılda bir araba satıyor. Ona aylık ödeme yaptırmanın
// karşılığı yok; sektörün Türkiye'deki kalıbı da bu ayrımı yapıyor —
// bireysel tarafta ek ilan hakkı ve doping (işlem başına), galeri/kurumsal
// tarafta aylık paket. Kurumsal fiyatlandırma ayrı bir liste olacak ve bu
// dosyaya sonradan eklenecek.
//
// Ürünlerin doğal olarak işlem başına olmasının bir sebebi daha var: hepsi
// PARANIN ZATEN DÖNDÜĞÜ ANDA gerçekleşiyor (araç el değiştiriyor, ilan öne
// çıkıyor). Ödeme direncinin en düşük olduğu an orası.
//
// -------------------------------------------------------------------------
// ÜCRETLENDİRİLMEYEN ŞEYLER — bilerek
// -------------------------------------------------------------------------
// · Kendi faturasını görmek. Belgeyi yükleyen araç sahibi ve zaten yalnızca
//   o görüyor. Para istenirse belge yüklemeyi bırakır; sicilin değeri de
//   biter. Veri bu ürünün varlığı, azaltılmaz.
// · Karneyi PIN ile görmek. Karnenin paylaşılabilir olması ürünün işe
//   yaramasının sebebi; paraya bağlamak paylaşımı öldürür.
//
// -------------------------------------------------------------------------
// ⚠ ŞU AN DEMO — HİÇBİR TAHSİLAT YAPILMIYOR
// -------------------------------------------------------------------------
// Ödeme sağlayıcısı bağlı değil (iyzico/RevenueCat: yok). `DEMO_MOD` true
// olduğu sürece arayüz "demo" etiketini AÇIKÇA gösteriyor. Etiketi kaldırmak
// tahsilat gerçekten çalışmaya başladığında tek satırlık iş; önce kaldırıp
// sonra bağlamak, kullanıcıya ödeme yaptığını sandırmak olurdu.
//
// -------------------------------------------------------------------------
// REVENUECAT'E HAZIR
// -------------------------------------------------------------------------
// `saglayiciId` alanı, sağlayıcıdaki ürün tanımlayıcısıyla birebir aynı
// olacak. Bağlandığında bu dosyadaki `fiyat` alanı SAĞLAYICIDAN gelecek —
// çünkü fiyat mağazaya ve ülkeye göre değişir ve iki yerde tutulan fiyat
// kayar. O gün `fiyat` yerel yedek olarak kalır, gösterilen değer
// sağlayıcının döndürdüğü olur.
//
// `tur` alanı sağlayıcının modeliyle eşleşiyor:
//   'tuketilebilir' -> consumable      (her seferinde yeniden satın alınır)
//   'kalici'        -> non-consumable  (bir kez alınır, kalıcı hak verir)
// =========================================================================

/** Tahsilat bağlı mı? false olduğu sürece arayüz "demo" diyor. */
export const DEMO_MOD = true;

export const PARA_BIRIMI = 'TRY';

export const URUNLER = {
  // Araç el değiştiriyor: sicil, bakım kayıtları ve fatura belgeleri yeni
  // sahibe geçiyor. Devir altyapısı hazır, ücret kapısı bekliyor.
  devir: {
    kod: 'devir',
    saglayiciId: 'otocv_arac_devri',
    tur: 'tuketilebilir',
    ad: 'Araç Devri',
    ozet: 'Aracın sicilini yeni sahibine aktarın',
    fiyat: 199,
    kazanimlar: [
      'Tüm bakım kayıtları ve sicil puanı yeni sahibe geçer',
      'Fatura belgeleri araçla birlikte aktarılır',
      'Sahiplik geçmişi kalıcı olarak kaydedilir',
      'Aracın karne bağlantısı yenilenir; eski bağlantı kapanır',
    ],
  },

  // Hesabı kapatılmış sahibin aracı. Ücret, "hesabı kapat, aracı bedavaya
  // geri al" oyununu bitiriyor. Ruhsat doğrulaması ayrı bir kapı ve ücret
  // onun yerine geçmiyor.
  sicilGeriYukleme: {
    kod: 'sicil_geri_yukleme',
    saglayiciId: 'otocv_sicil_geri_yukleme',
    tur: 'tuketilebilir',
    ad: 'Sicil Geri Yükleme',
    ozet: 'Sahipsiz kalmış bir aracın sicilini garajınıza alın',
    fiyat: 199,
    kazanimlar: [
      'Aracın geçmiş servis kayıtları eksiksiz devralınır',
      'Sicil puanı ve belgeli kayıt sayısı korunur',
      'Ruhsat doğrulaması sonrası aktarılır',
      'Onaylanmayan başvurudan ücret alınmaz',
    ],
  },

  // Gelir modelinin çekirdeği: ilk araç ücretsiz, sonrakiler ücretli.
  ekArac: {
    kod: 'ek_arac',
    saglayiciId: 'otocv_ek_arac',
    tur: 'tuketilebilir',
    ad: 'Ek Araç Kaydı',
    ozet: 'İkinci ve sonraki araçlarınızı garajınıza ekleyin',
    fiyat: 149,
    kazanimlar: [
      'Araç başına sınırsız bakım kaydı',
      'Ayrı dijital karne ve paylaşılabilir PIN',
      'Sigorta, kasko ve muayene takibi',
      'Vitrine çıkarma hakkı',
    ],
  },

  // Tek gerçek fiyat: arayüzde zaten ₺250 olarak duruyordu, korundu.
  vitrin: {
    kod: 'vitrin',
    saglayiciId: 'otocv_vitrin_30g',
    tur: 'tuketilebilir',
    ad: 'Vitrin Dopingi',
    ozet: 'İlanınız anasayfa vitrininde öne çıksın',
    fiyat: 250,
    sureGun: 30,
    kazanimlar: [
      'Anasayfa vitrin rafında üst sırada gösterim',
      'Pazaryeri listelerinde öncelikli sıralama',
      'İlan kartında vitrin rozeti',
      '30 gün boyunca geçerli',
    ],
  },
};

/** Ekranda listeleme sırası. Nesne anahtar sırasına güvenilmiyor. */
export const URUN_SIRASI = ['devir', 'sicilGeriYukleme', 'ekArac', 'vitrin'];

/**
 * Fiyatı Türkçe biçimde yazar: 250 -> "₺250".
 *
 * `toLocaleString('tr-TR')` binlik ayıracı NOKTA yapıyor (1.250) — bu doğru
 * ve kasıtlı. Bu projede daha önce nokta/virgül karışması yaşandı, o yüzden
 * biçimlendirme tek yerde.
 */
export function fiyatYaz(kurus) {
  if (kurus === null || kurus === undefined) return '—';
  return `₺${Number(kurus).toLocaleString('tr-TR')}`;
}

/** Ürünü koduyla getirir. Bilinmeyen kodda null döner, patlamaz. */
export function urunGetir(kod) {
  return Object.values(URUNLER).find((u) => u.kod === kod) || null;
}
