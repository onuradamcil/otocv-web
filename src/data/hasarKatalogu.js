// =========================================================================
// HASAR KATALOĞU — ARAÇ PARÇALARI VE BOYA/DEĞİŞEN DURUMLARI
//
// -------------------------------------------------------------------------
// NİYE BU DOSYA VAR: KATALOG ÜÇ YERDE TEKRARLANIYORDU VE KAYMIŞTI
// -------------------------------------------------------------------------
// `CAR_PARTS` ve `DAMAGE_STATUSES` üç dosyada AYRI AYRI tanımlıydı:
//
//   Step2ListingDetails.jsx   (kullanıcının hasarı GİRDİĞİ ekran)
//   Step4PreviewAndPublish.jsx (ilan ön izlemesi)
//   VehicleDetailsScreen.jsx   (alıcının GÖRDÜĞÜ ekran)
//
// Ve çoktan birbirinden ayrılmışlardı. Ölçülen farklar:
//
//   | alan          | giriş ekranı        | ön izleme + detay |
//   | trunk parçası | "Bagaj Kapağı"      | "Arka Kaput"      |
//   | PAINTED       | "Boyanmış" #EAB308  | "Boyalı" #facc15  |
//   | LOCAL_PAINTED | "Lokal Boyanmış"    | "Lokal Boyalı"    |
//   | CHANGED       | "Değişmiş" #EF4444  | "Değişen" #e11d48 |
//
// Yani kullanıcı "Bagaj Kapağı"nı "Boyanmış" işaretliyor, alıcı "Arka
// Kaput"u "Boyalı" olarak görüyordu — başka kelime, başka renk tonu. Aynı
// veriyi iki farklı şekilde beyan etmek, karne dürüstlüğü için verdiğimiz
// uğraşın kodun içindeki karşılığı.
//
// Ayrıca giriş ekranı `Gradient_local` SVG gradyanını TANIMLIYOR ama
// kullanmıyordu: lokal boyalı parça girişte düz turuncu, ön izlemede
// gradyanlı görünüyordu.
//
// -------------------------------------------------------------------------
// BİRLEŞTİRİRKEN VERİLEN ÜÇ KARAR
// -------------------------------------------------------------------------
// 1. ETİKETLER: "Orijinal / Boyalı / Lokal Boyalı / Değişen" seçildi.
//    Bunlar Türkiye'de ekspertiz raporlarının ve araç ilan sitelerinin
//    kullandığı standart terimler; alıcının tanıdığı kelimeler bunlar.
//    "Boyanmış / Değişmiş" anlamca aynı ama sektörde kullanılmıyor.
//
// 2. `trunk` PARÇASI: "Bagaj Kapağı" seçildi. "Arka Kaput" yanlış —
//    kaput aracın ÖN kapağıdır; bagaj kapağına kaput denmez.
//
// 3. LOCAL_PAINTED RENGİ: `url(#Gradient_local)` seçildi. Üç dosyanın üçü
//    de bu gradyanı SVG'sinde tanımlıyor, dolayısıyla her yerde çözülüyor
//    ve giriş ekranındaki ölü gradyan tanımı da işe yarar hâle geliyor.
//
// -------------------------------------------------------------------------
// ALAN SÖZLEŞMESİ — hangi alan nerede kullanılıyor
// -------------------------------------------------------------------------
//   hex     -> SVG `fill` değeri. ÜÇ DOSYADA DA yalnızca burada kullanılıyor
//              (doğrulandı: 13 parça × 3 dosya, hiçbiri CSS renk değeri
//              olarak kullanmıyor). Bu yüzden gradyan URL'si olması güvenli.
//   bg      -> Tailwind sınıfı. Giriş ekranındaki durum seçici listesinde
//              renk noktası olarak kullanılıyor.
//   id      -> durum anahtarı; veritabanına yazılan değer.
//   label   -> kullanıcıya gösterilen metin.
//   text /
//   border  -> giriş ekranının ileride kullanabileceği tonlar; kaldırılmadı
//              çünkü kaldırmak bu birleştirmenin kapsamı dışında bir
//              görünüm değişikliği olurdu.
//
// DİKKAT: `id` değerleri veritabanındaki `damage_report` jsonb alanının
// anahtarları. DEĞİŞTİRİLEMEZ — değiştirmek kayıtlı hasar beyanlarını
// okunamaz hâle getirir. Etiketler serbest, anahtarlar değil.
// =========================================================================

/**
 * Hasar şemasındaki 13 gövde parçası.
 *
 * SIRA: giriş ekranının sırası korundu (tamponlar, kaput, tavan, bagaj,
 * sonra tüm SOL parçalar, sonra tüm SAĞ parçalar). Sıra işlevsel olarak
 * önemli değil — kod bu diziyi yalnızca `forEach` ile ilk durumu kurmak ve
 * `find` ile isim aramak için kullanıyor — ama iki farklı sıra tutmanın da
 * bir anlamı yok.
 */
export const CAR_PARTS = [
  { id: 'front_bumper', name: 'Ön Tampon' },
  { id: 'rear_bumper', name: 'Arka Tampon' },
  { id: 'front_bonnet', name: 'Motor Kaputu' },
  { id: 'roof', name: 'Tavan' },
  { id: 'trunk', name: 'Bagaj Kapağı' },
  { id: 'fender_front_left', name: 'Sol Ön Çamurluk' },
  { id: 'door_front_left', name: 'Sol Ön Kapı' },
  { id: 'door_rear_left', name: 'Sol Arka Kapı' },
  { id: 'fender_rear_left', name: 'Sol Arka Çamurluk' },
  { id: 'fender_front_right', name: 'Sağ Ön Çamurluk' },
  { id: 'door_front_right', name: 'Sağ Ön Kapı' },
  { id: 'door_rear_right', name: 'Sağ Arka Kapı' },
  { id: 'fender_rear_right', name: 'Sağ Arka Çamurluk' },
];

/**
 * Parça durumları. `id` alanları veritabanı anahtarı — değiştirilemez.
 */
export const DAMAGE_STATUSES = {
  UNSPECIFIED: {
    id: 'UNSPECIFIED',
    label: 'Belirtilmemiş',
    bg: 'bg-slate-200',
    text: 'text-slate-600',
    hex: '#E2E8F0',
    border: '#CBD5E1',
  },
  ORIGINAL: {
    id: 'ORIGINAL',
    label: 'Orijinal',
    bg: 'bg-emerald-500',
    text: 'text-emerald-700',
    hex: '#22C55E',
    border: '#16A34A',
  },
  PAINTED: {
    id: 'PAINTED',
    label: 'Boyalı',
    bg: 'bg-amber-400',
    text: 'text-amber-700',
    hex: '#EAB308',
    border: '#D97706',
  },
  LOCAL_PAINTED: {
    id: 'LOCAL_PAINTED',
    label: 'Lokal Boyalı',
    bg: 'bg-orange-500',
    text: 'text-orange-700',
    // Gradyan: üç dosyanın üçü de <linearGradient id="Gradient_local">
    // tanımlıyor. Düz renk yerine gradyan, lokal boyamanın "parçanın bir
    // kısmı" anlamını görsel olarak taşıyor.
    hex: 'url(#Gradient_local)',
    border: '#EA580C',
  },
  CHANGED: {
    id: 'CHANGED',
    label: 'Değişen',
    bg: 'bg-rose-600',
    text: 'text-rose-700',
    hex: '#EF4444',
    border: '#DC2626',
  },
};

/** Parça id'sinden okunabilir isim. Üç ekranın da aynı ismi basması için. */
export function parcaAdi(id) {
  return CAR_PARTS.find((p) => p.id === id)?.name || null;
}

/** Durum anahtarından etiket. Bilinmeyen anahtarda uydurma metin dönmez. */
export function durumEtiketi(id) {
  return DAMAGE_STATUSES[id]?.label || null;
}
