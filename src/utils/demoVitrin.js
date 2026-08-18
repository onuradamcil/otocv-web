// =========================================================================
// DEMO VİTRİN VERİSİ (utils/demoVitrin.js)
//
// ⚠ BU DOSYA GEÇİCİDİR VE SİLİNMEK ÜZERE YAZILDI.
//
// Amaç: vitrin dolu olduğunda anasayfanın nasıl göründüğünü görmek. Envanter
// bugün iki araç ve o hâliyle ne ızgara yoğunluğu ne de marka ağacının
// derinliği değerlendirilebiliyor.
//
// -------------------------------------------------------------------------
// NİYE VERİTABANINA YAZILMADI
// -------------------------------------------------------------------------
// Bu kayıtlar CANLI veritabanına HİÇ girmiyor. Üç sebep:
//   1. Canlı veritabanının yedeği yok (PITR yok, temel migration yok).
//      Görsel bir denemenin bedeli olarak veri riski alınmaz.
//   2. Sahte kayıtlar `listings`/`vehicles` tablosuna girseydi sayaçlar,
//      karne sorguları ve devir akışı da onları gerçek sanardı.
//   3. Silmek "dosyayı sil" kadar kolay olmalı, SQL geri alma değil.
//
// -------------------------------------------------------------------------
// NASIL ÇALIŞIYOR
// -------------------------------------------------------------------------
// Ürün sahibinin kararıyla adres parametresi kaldırıldı: demo kartlar artık
// GERÇEK araçlarla aynı ızgarada, doğrudan anasayfada duruyor ("iki iş
// yapmayalım"). Gerçek kayıtlar listenin başına konuyor.
//
// Demo kartların PIN'i YOK, dolayısıyla karneye gitmiyorlar ve
// favorilenmiyorlar. Bu ayrı bir kural değil: karnesi paylaşıma açık
// olmayan HER kart (görünürlüğü `listelenebilir` olan gerçek araçlar dahil)
// aynı davranışı gösteriyor — ölçüt `pin_code`.
//
// -------------------------------------------------------------------------
// SİLMEK İÇİN
// -------------------------------------------------------------------------
//   1. Bu dosyayı sil.
//   2. `MarketplaceView.jsx` içinde "DEMO" arayıp kalan iki yeri kaldır:
//      import satırı ve `loadLiveListings` içindeki birleştirme dalı.
// =========================================================================

/**
 * Ham demo satırları.
 * Sütunlar: marka, seri, model, donanım, yıl, km, şehir, yakıt, vites,
 *           sicil puanı, öne çıkan mı, kaç gün önce eklendi.
 *
 * Değerler Türkiye pazarında gerçekten bulunan kombinasyonlar — marka
 * ağacının dört kademesinin nasıl dallandığını görebilmek için. Aynı
 * markadan birden fazla seri, aynı seriden birden fazla model bilinçli:
 * ağaç ancak böyle derinleşiyor (ör. Volkswagen > Passat > 1.6 TDI >
 * Highline / Comfortline).
 */
const HAM = [
  ['Volkswagen', 'Passat', '1.6 TDI', 'Highline', 2019, 128000, 'İstanbul', 'Dizel', 'Otomatik', 78, true, 2],
  ['Volkswagen', 'Passat', '1.6 TDI', 'Comfortline', 2017, 186500, 'Ankara', 'Dizel', 'Otomatik', 64, false, 19],
  ['Volkswagen', 'Golf', '1.4 TSI', 'Comfortline', 2016, 142300, 'İzmir', 'Benzin', 'Otomatik', 57, false, 41],
  ['Volkswagen', 'Polo', '1.0 TSI', 'Trendline', 2021, 46800, 'Bursa', 'Benzin', 'Manuel', 86, false, 5],
  ['Renault', 'Clio', '1.5 dCi', 'Touch', 2018, 97400, 'Antalya', 'Dizel', 'Manuel', 71, false, 12],
  ['Renault', 'Clio', '1.0 TCe', 'Joy', 2022, 31200, 'Kocaeli', 'Benzin', 'Otomatik', 91, true, 1],
  ['Renault', 'Megane', '1.3 TCe', 'Icon', 2020, 63900, 'İstanbul', 'Benzin', 'Otomatik', 83, false, 8],
  ['Renault', 'Symbol', '1.0 SCe', 'Joy', 2019, 112700, 'Konya', 'Benzin', 'Manuel', 52, false, 33],
  ['Fiat', 'Egea', '1.6 Multijet', 'Lounge', 2020, 88400, 'Ankara', 'Dizel', 'Otomatik', 74, false, 6],
  ['Fiat', 'Egea', '1.6 Multijet', 'Urban', 2018, 154900, 'Adana', 'Dizel', 'Manuel', 48, false, 27],
  ['Fiat', 'Egea', '1.4 Fire', 'Easy', 2017, 133600, 'Gaziantep', 'Benzin', 'Manuel', 41, false, 52],
  ['Fiat', 'Doblo', '1.6 Multijet', 'Safeline', 2016, 219300, 'Kayseri', 'Dizel', 'Manuel', 36, false, 61],
  ['Ford', 'Focus', '1.5 TDCi', 'Titanium', 2019, 104200, 'İzmir', 'Dizel', 'Otomatik', 77, false, 14],
  ['Ford', 'Fiesta', '1.0 EcoBoost', 'Titanium', 2018, 79800, 'İstanbul', 'Benzin', 'Otomatik', 69, false, 22],
  ['Opel', 'Astra', '1.6 CDTI', 'Excellence', 2018, 121500, 'Bursa', 'Dizel', 'Otomatik', 62, false, 30],
  ['Opel', 'Corsa', '1.4', 'Enjoy', 2015, 168900, 'Antalya', 'LPG & Benzin', 'Manuel', 39, false, 47],
  ['Toyota', 'Corolla', '1.6', 'Dream', 2019, 92600, 'Ankara', 'Benzin', 'Otomatik', 81, false, 4],
  ['Toyota', 'C-HR', '1.8 Hybrid', 'Passion', 2021, 41300, 'İstanbul', 'Hibrit', 'Otomatik', 93, true, 3],
  ['Honda', 'Civic', '1.6 i-DTEC', 'Executive', 2018, 118400, 'İzmir', 'Dizel', 'Otomatik', 72, false, 17],
  ['BMW', '3 Serisi', '320i', 'M Sport', 2020, 58700, 'İstanbul', 'Benzin', 'Otomatik', 88, true, 2],
  ['BMW', '3 Serisi', '320d', 'Luxury Line', 2017, 149200, 'Ankara', 'Dizel', 'Otomatik', 66, false, 25],
  ['BMW', '5 Serisi', '520d', 'Executive', 2019, 96100, 'İzmir', 'Dizel', 'Otomatik', 79, false, 11],
  ['Mercedes-Benz', 'C Serisi', 'C 200 d', 'AMG', 2020, 71400, 'İstanbul', 'Dizel', 'Otomatik', 85, false, 9],
  ['Mercedes-Benz', 'E Serisi', 'E 200', 'Exclusive', 2018, 124800, 'Bursa', 'Benzin', 'Otomatik', 68, false, 36],
  ['Audi', 'A3', '1.6 TDI', 'Sportback', 2017, 137500, 'Kocaeli', 'Dizel', 'Otomatik', 59, false, 44],
  ['Audi', 'A4', '2.0 TDI', 'Design', 2019, 89300, 'Ankara', 'Dizel', 'Otomatik', 76, false, 15],
  ['Hyundai', 'i20', '1.4 MPI', 'Elite', 2020, 54600, 'Konya', 'Benzin', 'Otomatik', 82, false, 7],
  ['Hyundai', 'Tucson', '1.6 CRDi', 'Elite', 2021, 48200, 'İstanbul', 'Dizel', 'Otomatik', 89, false, 5],
  ['Peugeot', '301', '1.6 BlueHDi', 'Active', 2018, 143700, 'Adana', 'Dizel', 'Manuel', 45, false, 38],
  ['Skoda', 'Superb', '1.6 TDI', 'Prestige', 2019, 108900, 'İzmir', 'Dizel', 'Otomatik', 75, false, 20],
  ['Dacia', 'Duster', '1.5 dCi', 'Prestige', 2020, 76300, 'Kayseri', 'Dizel', 'Manuel', 70, false, 13],
  ['Dacia', 'Sandero', '1.0 TCe', 'Stepway', 2021, 39500, 'Gaziantep', 'Benzin', 'Manuel', 84, false, 6],
];

const GUN = 24 * 60 * 60 * 1000;

/**
 * `adet` kadar demo kaydı `vitrin_listesi` RPC'sinin şeklinde üretir.
 *
 * ⚠ `simdi` DIŞARIDAN GEÇİLİYOR. `Date.now()` burada çağrılıp sonucu render
 * sırasında okunsaydı React saflık kuralı ihlal edilirdi (lint hatası).
 * Çağıran taraf zaten `acilisZamani`yi tutuyor.
 *
 * @param {number} adet Kaç kart üretilsin.
 * @param {number} simdi Şimdiki zaman (ms).
 */
export function demoVitrinUret(adet, simdi) {
  return HAM.slice(0, Math.max(0, adet)).map((satir, i) => {
    const [brand, series, model, paket, year, km, city, fuel, vites, puan, oneCikan, gunOnce] = satir;
    return {
      // ⚠ `listing_id` "demo-" ile başlıyor: bir kayıt yanlışlıkla gerçek
      // veriyle karışırsa tek bakışta ayırt edilebilsin.
      listing_id: `demo-${i + 1}`,
      id: `demo-${i + 1}`,
      // ⚠ PIN YOK. Demo aracin karnesi de yok; sahte bir PIN vermek
      // karta tiklanabilir bir kapi acardi. Karti etkisiz kilan kural
      // artik tek: PIN'i olmayan kartin karnesi paylasima acik degil —
      // bu hem demo kartlari hem `listelenebilir` araclari kapsiyor.
      pin_code: null,
      brand,
      series,
      model,
      package: paket,
      year,
      km,
      city,
      fuel_type: fuel,
      transmission: vites,
      trust_score: puan,
      is_featured: oneCikan,
      created_at: new Date(simdi - gunOnce * GUN).toISOString(),
      // Görsel YOK: `AracGorseli` bu durumda "GÖRSEL YOK" yer tutucusunu
      // basıyor. Uydurma fotoğraf koymak, ürünün "beyan edilmeyeni beyan
      // etme" kuralına aykırı olurdu.
      image_url: null,
      // Başlık da verilmiyor: kart marka/model/donanımdan kendisi kuruyor.
      listing_title: null,
      favorite_count: 0,
    };
  });
}

/** Üretilebilecek en fazla demo kart sayısı. */
export const DEMO_EN_FAZLA = HAM.length;
