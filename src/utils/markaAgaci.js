// =========================================================================
// KADEMELİ MARKA AĞACI (utils/markaAgaci.js)
//
// Süzgecin marka kırılımı: Marka → Seri → Model → Donanım.
// Kullanıcı bir kademe seçtiğinde ızgara ANINDA süzülüyor ve bir alt kademe
// açılıyor. Yani bu yapı hem gezinme hem süzgeç.
//
// -------------------------------------------------------------------------
// ⚠ AĞAÇ ARTIK KATALOGTAN BESLENİYOR — ÖNCEKİ KARAR TERSİNE DÖNDÜ
// -------------------------------------------------------------------------
// Bu dosya bir süre "katalog tabloları KULLANILMAYACAK" diye gerekçelendirdi
// ve dalları envanterden (vitrindeki araçlardan) üretti. Ürün sahibi bunu
// reddetti ve haklı:
//
//   "Skoda markasından bir araç vitrine çıkmış diye süzgeçe Skoda eklemişsin.
//    O aracın vitrin süresi dolduğunda markayı süzgeçten mi kaldıracağız?"
//
// Envanterden türetilen ağaç, süzgeci envanterin gölgesi yapıyordu: marka
// listesi araç girip çıktıkça değişiyor, kullanıcı aynı yerde aynı seçeneği
// bulamıyordu. Sektör liderlerinde marka listesi SABİT bir taksonomi.
//
// Bu yüzden dallar artık `car_brands / car_series / car_models / car_packages`
// tablolarından geliyor (49 / 822 / 3.591 / 23.138 satır, RLS'te herkese açık
// okunabilir). Çekme işi `services/catalogService.js`te ve Step1'in kaskad
// mantığıyla birebir aynı: kademe kademe, tıklandıkça.
//
// BU DOSYADA KALAN İŞ: dal üretmek değil, seçilen dalın araçlarla EŞLEŞMESİ.
// Araçlar katalog kimliği tutmuyor (`vehicles.brand/series/model/package` düz
// metin, foreign key yok), o yüzden eşleşme normalize METİNLE yapılıyor.
// =========================================================================

/**
 * Ağacın dört kademesi. Dizideki SIRA ağacın derinliğidir.
 *
 * `veri`  → araç kaydındaki alan adı (metin)
 * `alan`  → `suzgec` state'indeki alan adı (normalize anahtar)
 * Adlar sahibinden.com'un kendi terimleri: kullanıcı aşinalığı ürün
 * sahibinin açık isteği ve verimizin değerleri bu adlarla doğru okunuyor.
 */
export const KADEMELER = [
  { alan: 'marka', veri: 'brand', baslik: 'Marka' },
  { alan: 'seri', veri: 'series', baslik: 'Seri' },
  { alan: 'model', veri: 'model', baslik: 'Model' },
  { alan: 'donanim', veri: 'package', baslik: 'Donanım' },
];

/**
 * KARŞILAŞTIRMA ANAHTARI — ekranda hiç görünmez.
 *
 * Katalogtaki ad ile araçtaki metin birebir aynı yazılmış olmak zorunda
 * değil: araç kayıtları serbest metin ve veritabanında bugün bile tutarsız
 * (`Bentley` ama `COROLLA HB`). Normalize edilmezse katalogtan gelen "Bmw"
 * ile araçtaki "BMW" eşleşmez.
 *
 * -----------------------------------------------------------------------
 * ⚠ TÜRKÇE 'I' TUZAĞI — `toLocaleLowerCase('tr')` BU İŞ İÇİN YANLIŞTIR
 * -----------------------------------------------------------------------
 * Türkçe yerelinde noktalı/noktasız i ayrı harflerdir, dolayısıyla:
 *     'FIAT'.toLocaleLowerCase('tr')  ->  'fıat'   (noktasız ı)
 *     'Fiat'.toLocaleLowerCase('tr')  ->  'fiat'   (noktalı i)
 * İki AYRI anahtar: aynı marka eşleşmezdi. Ölçüldü; FIAT, MINI, CITROEN ve
 * INFINITI'de bölünme oluyor — dördü de katalogda gerçek marka.
 *
 * Locale'siz `toLowerCase()` da kurtarmıyor:
 *     'İSTANBUL'.toLowerCase()  ->  'i̇stanbul'  (i + BİRLEŞEN NOKTA)
 *
 * Çözüm: i-ailesinin dört biçimi ÖNCE tek harfe katlanıyor, küçültme ONDAN
 * SONRA ve locale'siz. Kalan Türkçe harfler (ç ğ ö ş ü) yerelden bağımsız
 * doğru küçülüyor.
 */
export function agacAnahtari(deger) {
  return String(deger ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[İIıi]/g, 'i')
    .toLowerCase();
}

/**
 * Ağaç kısıtı: kayıt seçili kırılıma uyuyor mu?
 * Boş kademe = kısıt yok. Ölçüt TEK yerde, burada.
 *
 * ⚠ `s[k.alan]` NORMALİZE ANAHTAR tutuyor (katalogtan seçilen adın
 * `agacAnahtari`den geçmiş hâli), araçtaki metin de burada normalize
 * ediliyor. İki taraf da aynı işlemden geçmeden karşılaştırılmıyor.
 */
export function agacUygun(kayit, s) {
  for (const k of KADEMELER) {
    if (!s[k.alan]) continue;
    if (agacAnahtari(kayit?.[k.veri]) !== s[k.alan]) return false;
  }
  return true;
}

/**
 * Gösterilecek kademenin derinliği = ilk BOŞ kademe.
 * Hepsi doluysa `KADEMELER.length` (en derin: gösterilecek çocuk yok).
 *
 * Bu, `agacSec`in koruduğu değişmeze dayanıyor: bir kademe seçilince ALTI
 * sıfırlanır, dolayısıyla "marka boş ama seri dolu" durumu hiç oluşmaz.
 */
export function agacDerinligi(s) {
  const i = KADEMELER.findIndex((k) => !s[k.alan]);
  return i === -1 ? KADEMELER.length : i;
}
