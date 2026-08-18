// =========================================================================
// DEMO VİTRİN VERİSİ (utils/demoVitrin.js)
//
// ⚠ BU DOSYA GEÇİCİDİR VE SİLİNMEK ÜZERE YAZILDI.
//
// Amaç: süzgeçleri gerçekten sınayabilmek. Gerçek envanter 11 araç ve o
// hâliyle ne ızgara yoğunluğu, ne marka ağacının derinliği, ne de şehir /
// yakıt / vites / yıl / kilometre süzgeçleri değerlendirilebiliyor.
//
// -------------------------------------------------------------------------
// ⚠ MARKA/SERİ/MODEL/DONANIM DEĞERLERİ UYDURMA DEĞİL
// -------------------------------------------------------------------------
// Aşağıdaki 44 kombinasyonun tamamı `car_brands / car_series / car_models /
// car_packages` tablolarından ÇEKİLDİ. Bu şart: marka ağacı katalogtan
// besleniyor ve araçlarla eşleşme normalize METİNLE yapılıyor. Elle
// uydurulmuş bir seri adı ağaçta tıklanınca HİÇBİR ŞEY döndürmezdi — süzgeç
// çalışıyorken çalışmıyor gibi görünürdü.
//
// Yenilemek için (SQL): car_brands -> car_series -> car_models ->
// car_packages join'leyip 'marka|seri|model|donanim' biçiminde toplayın.
//
// -------------------------------------------------------------------------
// HER KOMBİNASYONDAN ÜÇ ARAÇ
// -------------------------------------------------------------------------
// Ürün sahibinin isteği: "her araca özel bir kaç araç kaydı tarzı". Sebebi
// somut: kombinasyon başına tek araç olsaydı ağacın en derin kademesi
// (donanım) daima 1 kart döndürürdü ve "süzgeç gerçekten daraltıyor mu"
// sorusu ölçülemezdi. Üç varyant x 44 kombinasyon -> 132 demo araç.
//
// Varyantlar arasında yıl, kilometre, şehir, yakıt, vites ve sicil puanı
// DEĞİŞİYOR; böylece o süzgeçlerin hepsi aynı anda sınanabiliyor.
//
// -------------------------------------------------------------------------
// NİYE VERİTABANINA YAZILMADI
// -------------------------------------------------------------------------
//   1. Canlı veritabanının yedeği yok (PITR yok).
//   2. Sahte kayıtlar `vehicles`a girseydi sayaçlar, karne sorguları ve
//      devir akışı da onları gerçek sanardı.
//   3. Silmek "dosyayı sil" kadar kolay olmalı, SQL geri alma değil.
//
// Demo kartların PIN'i YOK, dolayısıyla karneye gitmiyor ve
// favorilenmiyorlar. Bu ayrı bir kural değil: karnesi paylaşıma açık olmayan
// HER kart (görünürlüğü `listelenebilir` olan gerçek araçlar dahil) aynı
// davranışı gösteriyor — ölçüt `pin_code`.
//
// -------------------------------------------------------------------------
// SİLMEK İÇİN
// -------------------------------------------------------------------------
//   1. Bu dosyayı sil.
//   2. `MarketplaceView.jsx` içinde "DEMO" arayıp kalan iki yeri kaldır:
//      import satırı ve `loadLiveListings` içindeki birleştirme dalı.
// =========================================================================

/**
 * Katalogtan çekilmiş GERÇEK kombinasyonlar: `marka|seri|model|donanım`.
 * 15 marka, 28 seri. Sıra korunuyor ki üretilen veri deterministik olsun.
 */
const KOMBINASYONLAR = [
  'Audi|A3|1.0 TFSI|Ambiente',
  'Audi|A4|1.6|Ambiente',
  'Audi|A4|1.6|Ambition',
  'Bmw|1 Serisi|116d|Advantage',
  'Bmw|1 Serisi|116d|Comfort',
  'Bmw|3 Serisi|315|40th Year Edition',
  'Bmw|3 Serisi|315|50th Year M Edition',
  'Bmw|5 Serisi|518i|50th Year M Edition',
  'Bmw|5 Serisi|518i|Business',
  'Dacia|Duster|1.0 ECO-G|Ambiance',
  'Dacia|Sandero|0.9 TCe|Ambiance',
  'Dacia|Sandero|0.9 TCe|Essential',
  'Fiat|Egea|1.0 FireFly|Cross',
  'Fiat|Egea|1.0 FireFly|Cross Limited',
  'Ford|Fiesta|1.0 EcoBoost|Ambiente',
  'Ford|Fiesta|1.0 EcoBoost|Collection',
  'Ford|Focus|1.0 EcoBoost|Ambiente',
  'Ford|Focus|1.0 EcoBoost|Collection',
  'Honda|Civic|1.3 Hybrid|Advance',
  'Honda|Civic|1.3 Hybrid|Dream',
  'Hyundai|i20|1.0 T-GDI|Elite',
  'Hyundai|i20|1.0 T-GDI|Elite Plus',
  'Hyundai|Tucson|1.6 CRDi|Elite Plus',
  'Mercedes-Benz|E-Serisi|E 200|AMG',
  'Mercedes-Benz|E-Serisi|E 200|Avantgarde',
  'Nissan|Qashqai|1.2 DIG-T|Black Edition',
  'Nissan|Qashqai|1.2 DIG-T|Design Pack',
  'Opel|Astra|1.2 Turbo|CD',
  'Opel|Astra|1.2 Turbo|CDX',
  'Opel|Corsa|1.0|City',
  'Opel|Corsa|1.0|Color Edition',
  'Peugeot|3008|1.2 Hybrid|Access',
  'Renault|Clio|0.9 TCe|Alize',
  'Renault|Megane|1.2 TCe|Alize',
  'Skoda|Octavia|1.0 e-TEC|Ambiente',
  'Skoda|Superb|1.4 TSI|Active',
  'Skoda|Superb|1.4 TSI|Ambition',
  'Toyota|C-HR|1.2 Turbo|Diamond',
  'Toyota|Corolla|1.3|Active',
  'Toyota|Corolla|1.3|Advance',
  'Volkswagen|Passat|1.4 TSI|Business',
  'Volkswagen|Passat|1.4 TSI|Comfortline',
  'Volkswagen|Polo|1.0|40. Yıl',
  'Volkswagen|Polo|1.0|Basicline',
];

// Varyasyon kaynakları. Uzunlukları BİLEREK farklı: hepsi aynı adımla
// ilerleseydi her araçta aynı bileşim tekrarlanır ve süzgeçler birbirinden
// ayrışmazdı (ör. her Dizel aracın hep Ankara'da olması gibi).
const SEHIRLER = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Konya', 'Adana', 'Kocaeli', 'Gaziantep', 'Kayseri', 'Mersin'];
const YAKITLAR = ['Benzin', 'Dizel', 'LPG & Benzin', 'Hibrit', 'Elektrik', 'Benzin', 'Dizel'];
const VITESLER = ['Otomatik', 'Manuel', 'Yarı Otomatik'];

const GUN = 24 * 60 * 60 * 1000;

/** Her kombinasyondan kaç araç üretiliyor. */
const VARYANT = 3;

/**
 * Demo kayıtlarını üretir.
 *
 * ⚠ `simdi` DIŞARIDAN GEÇİLİYOR. `Date.now()` burada çağrılıp sonucu render
 * sırasında okunsaydı React saflık kuralı ihlal edilirdi (lint hatası).
 *
 * @param {number} adet En fazla kaç kart (üst sınır {@link DEMO_EN_FAZLA}).
 * @param {number} simdi Şimdiki zaman (ms).
 */
export function demoVitrinUret(adet, simdi) {
  const cikti = [];
  const sinir = Math.min(Math.max(0, adet), KOMBINASYONLAR.length * VARYANT);

  for (let i = 0; i < sinir; i++) {
    const [brand, series, model, paket] = KOMBINASYONLAR[Math.floor(i / VARYANT)].split('|');
    const v = i % VARYANT;

    cikti.push({
      // ⚠ "demo-" ön eki: bir kayıt yanlışlıkla gerçek veriyle karışırsa tek
      // bakışta ayırt edilebilsin.
      listing_id: `demo-${i + 1}`,
      id: `demo-${i + 1}`,
      kart_id: `demo-${i + 1}`,
      // ⚠ PIN YOK. Demo aracın karnesi de yok; sahte bir PIN vermek karta
      // tıklanabilir bir kapı açardı.
      pin_code: null,
      katman: 'listelenebilir',
      brand,
      series,
      model,
      package: paket,
      // Yıl, km ve puan varyanta göre kayıyor: aynı donanımın üç aracı
      // birbirinden ayırt edilebilsin ve yıl/km süzgeçleri sınanabilsin.
      year: 2013 + ((i * 3 + v) % 12),
      km: 18000 + ((i * 17393 + v * 40961) % 260000),
      city: SEHIRLER[(i * 5 + v) % SEHIRLER.length],
      fuel_type: YAKITLAR[(i * 3 + v) % YAKITLAR.length],
      // ⚠ `(i + v)`, `(i + 2v)` DEĞİL. `v = i % 3` ve dizi de 3 uzunlukta
      // olduğu için `(i + 2v) mod 3` = `3i mod 3` = DAİMA 0 idi: her demo
      // araç 'Otomatik' çıkıyordu (ölçüldü: 139 Otomatik / 3 Manuel, ve o
      // üçü gerçek araçlardan geliyordu). Katsayı toplamı 3'ün katı
      // olmamalı; (1+1)=2 üçünü de eşit dağıtıyor.
      transmission: VITESLER[(i + v) % VITESLER.length],
      trust_score: 22 + ((i * 13 + v * 29) % 73),
      // ~9'da bir öne çıkan: "Yalnızca öne çıkanlar" süzgeci anlamlı bir alt
      // küme döndürsün ama ızgaranın çoğunu kaplamasın.
      is_featured: i % 9 === 0,
      created_at: new Date(simdi - ((i * 7 + v * 2) % 95) * GUN).toISOString(),
      // Görsel YOK: `AracGorseli` "GÖRSEL YOK" yer tutucusunu basıyor.
      // Uydurma fotoğraf koymak ürünün "beyan edilmeyeni beyan etme"
      // kuralına aykırı olurdu.
      image_url: null,
      // Başlık verilmiyor: kart marka/model/donanımdan kendisi kuruyor.
      listing_title: null,
      favorite_count: 0,
      views_count: 0,
    });
  }
  return cikti;
}

/** Üretilebilecek en fazla demo kart sayısı (44 kombinasyon x 3 varyant). */
export const DEMO_EN_FAZLA = KOMBINASYONLAR.length * VARYANT;
