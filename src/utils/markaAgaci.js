// =========================================================================
// KADEMELİ MARKA AĞACI (utils/markaAgaci.js)
//
// Vitrin süzgecinin marka kırılımı: Marka → Seri → Model → Donanım.
// Kullanıcı bir kademe seçtiğinde ızgara ANINDA süzülüyor ve bir alt kademe
// açılıyor. Yani bu yapı hem gezinme hem süzgeç.
//
// -------------------------------------------------------------------------
// NİYE KATALOG TABLOLARI KULLANILMIYOR
// -------------------------------------------------------------------------
// Projede `car_brands / car_series / car_models / car_packages` tabloları
// var ama ağaç onları OKUMUYOR. Üç sebep, üçü de ölçüldü:
//   1. `services/catalogService.js` ölü kod — projede tek çağrısı yok.
//      Sihirbaz (`Step1VehicleAndPhotos.jsx`) servisi atlayıp tabloları
//      doğrudan sorguluyor.
//   2. Seçim KAYDEDİLİRKEN metne düzleştiriliyor
//      (`CreateListingWizard.jsx:853-857` → `brand/series/model/package`
//      alanlarına `.name` string'i yazılıyor). `listings`/`vehicles`
//      tarafında `car_brands`'e foreign key YOK.
//   3. Katalog envanteri değil KATALOĞU tutuyor. Oradan liste kurmak
//      "envanterde 0 aracı olan marka" üretirdi — MarketplaceView'in
//      sabit "%80+ güven" çipini tam bu yüzden kaldırdığı hata.
//
// Bu yüzden ağaç `vitrin_listesi` RPC'sinin döndürdüğü METİN alanlarından
// kuruluyor: her dal gerçekten en az bir araç taşıyor, her sayaç gerçek.
//
// -------------------------------------------------------------------------
// NİYE AYRI DOSYA
// -------------------------------------------------------------------------
// Bu fonksiyonlar React'e hiç dokunmuyor: girdi dizi, çıktı dizi. Saf
// oldukları için tek başına akıl yürütülebilir ve sınanabilir haldeler.
// `MarketplaceView.jsx` zaten 1300+ satır.
// =========================================================================

/**
 * Ağacın dört kademesi. Dizideki SIRA ağacın derinliğidir.
 *
 * `veri`  → `vitrin_listesi` RPC'sinin alan adı
 * `alan`  → `suzgec` state'indeki alan adı
 * Adlar sahibinden.com'un kendi terimleri: kullanıcı aşinalığı ürün
 * sahibinin açık isteği ve verimizin değerleri bu adlarla doğru okunuyor
 * (Bentley → Continental → 6.0 W12 → GT V8).
 */
export const KADEMELER = [
  { alan: 'marka', veri: 'brand', baslik: 'Marka' },
  { alan: 'seri', veri: 'series', baslik: 'Seri' },
  { alan: 'model', veri: 'model', baslik: 'Model' },
  { alan: 'donanim', veri: 'package', baslik: 'Donanım' },
];

/**
 * GRUPLAMA ANAHTARI — ekranda hiç görünmez, yalnızca dalın kimliği.
 *
 * Bu alanlara kullanıcı serbest metin girebiliyor ve veritabanında bugün
 * bile tutarsız: `Bentley` ama `COROLLA HB`. Normalize edilmezse "BMW" ile
 * "bmw" iki ayrı dal olur.
 *
 * -----------------------------------------------------------------------
 * ⚠ TÜRKÇE 'I' TUZAĞI — `toLocaleLowerCase('tr')` BU İŞ İÇİN YANLIŞTIR
 * -----------------------------------------------------------------------
 * Türkçe yerelinde noktalı/noktasız i ayrı harflerdir, dolayısıyla:
 *     'FIAT'.toLocaleLowerCase('tr')  ->  'fıat'   (noktasız ı)
 *     'Fiat'.toLocaleLowerCase('tr')  ->  'fiat'   (noktalı i)
 * İki AYRI anahtar: aynı marka iki dal olurdu. Ölçüldü; FIAT, MINI,
 * CITROEN ve INFINITI'de bölünme oluyor — dördü de gerçek marka.
 *
 * Locale'siz `toLowerCase()` da kurtarmıyor:
 *     'İSTANBUL'.toLowerCase()  ->  'i̇stanbul'  (i + BİRLEŞEN NOKTA, 9 kod
 *                                                noktası) ≠ 'istanbul'
 *
 * Çözüm: i-ailesinin dört biçimi ÖNCE tek harfe katlanıyor, küçültme
 * ONDAN SONRA ve locale'siz. Kalan Türkçe harfler (ç ğ ö ş ü) yerelden
 * bağımsız olarak doğru küçülüyor.
 *
 * ⚠ Bu fonksiyon YALNIZCA gruplama/karşılaştırma içindir. Ekranda gösterilen
 * etiket `kanonikEtiket` ile seçilir — kullanıcı asla 'fiat' görmez.
 */
export function agacAnahtari(deger) {
  return String(deger ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[İIıi]/g, 'i')
    .toLowerCase();
}

/**
 * Aynı dala düşen ham yazımlardan EKRANDA hangisi gösterilecek?
 * En SIK geçen; eşitlikte Türkçe alfabetik ilk olan.
 *
 * Deterministik olması şart, süs değil: envanter bugün iki araç, yani her
 * sayı 1 ve kararı DAİMA alfabetik eşitlik bozucu veriyor. Kayıt sırası
 * değiştiğinde etiketin değişmemesi buna bağlı.
 *
 * ⚠ BAŞ HARF BÜYÜTME YAPILMIYOR. `COROLLA HB` → `Corolla Hb` veriyi bozar;
 * `1.2TURBO FLAME` ve `X-PACK MULTIDRIVE S` gibi değerlerde hiçbir harf
 * kuralı doğru sonuç vermiyor. Kart başlığı da (`MarketplaceView`) ham
 * değeri basıyor — süzgeçte başka bir yazım göstermek aynı aracı iki adla
 * anlatmak olurdu.
 */
function kanonikEtiket(yazimlar) {
  return [...yazimlar.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'tr'))[0][0];
}

/**
 * Bir kademenin çocukları, GERÇEK sayaçlarıyla.
 *
 * @param {object[]} kayitlar Bu kademe için süzülmüş küme. Çağıran taraf
 *   üstteki kademeleri UYGULAMIŞ, bu kademeyi ve altını KALDIRMIŞ olmalı
 *   (bkz. `agaciKirp`) — sayaçların dürüstlüğü buna dayanıyor.
 * @param {string} veriAlani 'brand' | 'series' | 'model' | 'package'
 * @returns {{anahtar: string, etiket: string, adet: number}[]}
 */
export function kademeCocuklari(kayitlar, veriAlani) {
  const kova = new Map();

  for (const kayit of kayitlar || []) {
    const ham = String(kayit?.[veriAlani] ?? '').replace(/\s+/g, ' ').trim();
    // Boş kademe dal üretmiyor: "Marka: (boş)" diye bir seçenek göstermek
    // kullanıcıya hiçbir şey anlatmaz, tıklanınca da anlamsız süzer.
    if (ham === '') continue;
    const anahtar = agacAnahtari(ham);
    let dal = kova.get(anahtar);
    if (!dal) {
      dal = { adet: 0, yazimlar: new Map() };
      kova.set(anahtar, dal);
    }
    dal.adet += 1;
    dal.yazimlar.set(ham, (dal.yazimlar.get(ham) || 0) + 1);
  }

  // Sıralama `MarketplaceView`in `grupla()`sıyla AYNI: çok olan üstte,
  // eşitlikte Türkçe alfabetik. İki liste aynı kenar çubuğunda yan yana
  // duruyor; farklı sıralamak sebepsiz bir tutarsızlık olurdu.
  return [...kova.entries()]
    .map(([anahtar, dal]) => ({
      anahtar,
      etiket: kanonikEtiket(dal.yazimlar),
      adet: dal.adet,
    }))
    .sort((a, b) => b.adet - a.adet || a.etiket.localeCompare(b.etiket, 'tr'));
}

/**
 * Ağaç kısıtı: kayıt seçili kırılıma uyuyor mu?
 * Boş kademe = kısıt yok. Ölçüt TEK yerde, burada.
 */
export function agacUygun(kayit, s) {
  for (const k of KADEMELER) {
    if (!s[k.alan]) continue;
    if (agacAnahtari(kayit?.[k.veri]) !== s[k.alan]) return false;
  }
  return true;
}

/**
 * `derinlik` ve ALTINDAKİ kademeleri boşaltmış süzgeç kopyası.
 *
 * Kademe sayaçlarının dürüstlüğü bununla sağlanıyor: Marka sayaçları ağaç
 * kısıtı hiç yokmuş gibi (derinlik 0), Seri sayaçları yalnızca marka
 * uygulanmış hâlde (derinlik 1) hesaplanıyor. Şehir/yıl/km/sicil süzgeçleri
 * her ikisinde de uygulanıyor — kullanıcı İstanbul seçtiyse marka sayaçları
 * da İstanbul'a ait olmalı.
 *
 * ⚠ `suz(..., haric)` mekanizması BU İŞE YARAMAZ: o tek bir yüklem adını
 * tamamen atlıyor, yani ağacın dört kademesini BİRDEN düşürürdü ve Seri
 * sayaçları seçili markayı yok sayardı.
 */
export function agaciKirp(s, derinlik) {
  const kopya = { ...s };
  KADEMELER.forEach((k, i) => {
    if (i >= derinlik) kopya[k.alan] = '';
  });
  return kopya;
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
