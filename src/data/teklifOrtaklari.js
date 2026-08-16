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

/**
 * Bir belge türü için sözleşmesi yürürlükte olan ortaklar.
 *
 * ⚠ Ekranlar "ortak var mı" sorusunu HEP buradan sorar. `TEKLIF_ORTAKLARI`
 * dizisine doğrudan bakan bir ekran, `aktif: false` olmuş bir ortağı
 * göstermeye devam ederdi.
 *
 * @param {string} tur
 * @returns {TeklifOrtagi[]}
 */
export function aktifOrtaklar(tur) {
  return TEKLIF_ORTAKLARI.filter((o) => o.aktif && o.kapsam.includes(tur));
}
