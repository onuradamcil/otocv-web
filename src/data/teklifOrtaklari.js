// =========================================================================
// TEKLİF ORTAKLARI KATALOĞU
//
// -------------------------------------------------------------------------
// ⚠ BU DİZİ BİLEREK BOŞ
// -------------------------------------------------------------------------
// Anlaşmalı sigorta ortağı HENÜZ YOK. Buraya örnek/temsili bir firma
// koymak — "Örnek Sigorta", "Demo Kasko" — ekrana bugün var olmayan bir
// hizmeti var gibi göstermek olurdu.
//
// Bu ürün tam olarak o kusurdan temizlendi: karne kartında sabit yazılmış
// "Sedan / Benzin / Otomatik", araçla ilgisi olmayan "TÜVTÜRK ONAYLI"
// rozeti, artıran kodu olmadığı hâlde ekranda duran favori sayacı. Hepsi
// aynı sınıftı: EKRAN DOLU GÖRÜNSÜN DİYE KONMUŞ VERİ.
//
// Ortak gelene kadar teklif ekranı "ortağımız yok" diyecek ve kullanıcının
// ilgisini kaydedecek. Dürüst bir boşluk, sahte bir doluluktan iyidir.
//
// -------------------------------------------------------------------------
// ORTAK GELDİĞİNDE
// -------------------------------------------------------------------------
// Yalnızca bu dosya değişir; ekran kodu değişmez. Ekran "aktif ortak var
// mı?" sorusunu `aktifOrtaklar()`a soruyor, kendi içinde firma adı
// tutmuyor.
//
// Eklerken:
//   · `yonlendirmeUrl` ortağın verdiği takip bağlantısı olacak.
//   · Kullanıcının adı/telefonu ORTAĞA GÖNDERİLMİYOR — seçilen model
//     yönlendirme. Kişisel veri aktarımı ayrı bir açık rıza, aydınlatma
//     metni ve veri işleyen sözleşmesi gerektirir.
//   · `kapsam` hangi belge türlerinde çıkacağını belirler.
// =========================================================================

/**
 * @typedef {object} TeklifOrtagi
 * @property {string}   kod            Kalıcı kimlik. `teklif_talepleri.ortak_kodu` bunu taşır.
 * @property {string}   ad             Kullanıcıya gösterilen ad.
 * @property {string[]} kapsam         'trafik' | 'kasko' | 'muayene' | 'bakim'
 * @property {string}   yonlendirmeUrl Ortağın takip bağlantısı.
 * @property {boolean}  aktif          Sözleşme yürürlükte mi?
 */

/** @type {TeklifOrtagi[]} */
export const TEKLIF_ORTAKLARI = [];

// =========================================================================
// ÖRNEK ORTAKLAR — YALNIZCA DEMO GÖRÜNÜMÜ
//
// -------------------------------------------------------------------------
// NİYE VAR
// -------------------------------------------------------------------------
// Ortak bağlanmadan önce ekranın DOLU hâlini görebilmek gerekiyor: düzen
// çalışıyor mu, kart sıralaması okunur mu, sunumda nasıl duruyor? Boş
// ekrana bakarak bunlara karar verilemiyor.
//
// -------------------------------------------------------------------------
// ⚠ ADLAR NİYE "ÖRNEK" İLE BAŞLIYOR — GERÇEK MARKA KULLANILMIYOR
// -------------------------------------------------------------------------
// Buraya gerçek bir sigorta şirketinin adını yazmak, o şirketle var olmayan
// bir ticari ilişki iddia etmek olurdu. Kullanıcı açısından yanıltıcı,
// şirket açısından izinsiz marka kullanımı.
//
// Ayrıca demo yalnızca `?demo=1` ile açılıyor ve ekranda kalıcı bir
// "ÖRNEK GÖRÜNÜM" şeridi çıkıyor. Yani demo, kazayla gerçek kullanıcıya
// gösterilemiyor.
//
// ⚠ PRİM/TUTAR YOK. Demo bile olsa tutar basmıyoruz: hem uydurma olurdu
// hem de ürünle ilgili tutar gösteren platform satış sitesi konumuna
// geçiyor.
// =========================================================================

/** @type {TeklifOrtagi[]} */
export const ORNEK_ORTAKLAR = [
  {
    kod: 'ornek_a',
    ad: 'Örnek Sigorta A.Ş.',
    kapsam: ['trafik', 'kasko'],
    yonlendirmeUrl: 'https://example.com/ornek-sigorta',
    aktif: true,
    not: 'Online poliçe düzenleme, 7/24 hasar ihbar hattı',
  },
  {
    kod: 'ornek_b',
    ad: 'Örnek Global Sigorta',
    kapsam: ['trafik', 'kasko'],
    yonlendirmeUrl: 'https://example.com/ornek-global',
    aktif: true,
    not: 'Genişletilmiş kasko paketleri, yol yardım dahil',
  },
  {
    kod: 'ornek_c',
    ad: 'Örnek Anadolu Karşılaştırma',
    kapsam: ['trafik', 'kasko'],
    yonlendirmeUrl: 'https://example.com/ornek-karsilastirma',
    aktif: true,
    not: 'Birden fazla şirketin poliçesini tek ekranda karşılaştırır',
  },
  {
    kod: 'ornek_d',
    ad: 'Örnek Muayene Ağı',
    kapsam: ['muayene'],
    yonlendirmeUrl: 'https://example.com/ornek-muayene',
    aktif: true,
    not: 'Randevu oluşturma ve hatırlatma',
  },
  {
    kod: 'ornek_e',
    ad: 'Örnek Servis Ağı',
    kapsam: ['bakim'],
    yonlendirmeUrl: 'https://example.com/ornek-servis',
    aktif: true,
    not: 'Periyodik bakım randevusu, faturalı işlem',
  },
];

/** Kapsam kodlarının ekranda gösterilen kısa adları. */
export const KAPSAM_ADI = {
  trafik: 'Trafik',
  kasko: 'Kasko',
  muayene: 'Muayene',
  bakim: 'Bakım',
};

/**
 * Bir belge türü için sözleşmesi yürürlükte olan ortaklar.
 *
 * ⚠ Ekranlar "ortak var mı" sorusunu HEP buradan sorar. `TEKLIF_ORTAKLARI`
 * dizisine doğrudan bakan bir ekran, `aktif: false` olmuş bir ortağı
 * göstermeye devam ederdi.
 *
 * @param {string} tur
 * @param {boolean} [demo] Örnek ortaklar gösterilsin mi? Yalnızca `?demo=1`.
 * @returns {TeklifOrtagi[]}
 */
export function aktifOrtaklar(tur, demo = false) {
  const kaynak = demo ? ORNEK_ORTAKLAR : TEKLIF_ORTAKLARI;
  return kaynak.filter((o) => o.aktif && o.kapsam.includes(tur));
}
