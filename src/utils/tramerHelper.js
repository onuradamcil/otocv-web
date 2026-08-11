// =========================================================================
// OTO-CV TRAMER (HASAR KAYDI) YARDIMCISI (tramerHelper.js)
//
// -------------------------------------------------------------------------
// NEDEN BU DOSYA VAR — GERÇEK BİR HATA YÜZÜNDEN
// -------------------------------------------------------------------------
// Hasar durumu kod içinde serbest metin karşılaştırmasıyla belirleniyordu:
//
//     vehicle?.tramer_status === 'Tramer Kaydı Var'
//
// Ama veritabanındaki değerler tek yazımda değil. Canlı veride DÖRT ayrı
// yazım vardı: 'Tramer Kaydı Var', 'Tramer Var', 'Tramer Yok', 'Hasarsız'
// (artı boş kayıtlar). Yukarıdaki karşılaştırma yalnızca birincisini
// yakalıyordu.
//
// SONUÇ: 'Tramer Var' yazan araçlar — 10 aracın 4'ü — resmi karnede
//
//     "Geçmiş Hasar, Ağır Hasar & Pert Kaydı Sorgusu → Kayıt
//      Bulunmamaktadır (Temiz)"
//
// diye, yeşil onay işaretiyle basılıyordu. Örneğin 41IHH434 plakalı aracın
// 65.756 TL tramer kaydı var ama karnesi hasarsız olduğunu beyan ediyordu.
// Karne, alıcının araca güvenmek için baktığı belge; orada yanlış bir
// beyan, ürünün varlık sebebini ortadan kaldırır.
//
// -------------------------------------------------------------------------
// ÇÖZÜM: TEK KAYNAK, METİN KARŞILAŞTIRMASI YOK
// -------------------------------------------------------------------------
// Hasar olup olmadığı artık tek bir fonksiyondan sorulur. Sıralama önemli:
//
//   1. TUTAR ASILDIR. Sayıdır, yanlış yazılamaz. > 0 ise hasar vardır.
//   2. Tutar yoksa etikete bakılır, ama sabit metinle değil: Türkçe
//      küçültme sonrası "yok"/"hasarsız" geçiyorsa hasarsız, "var"
//      geçiyorsa hasarlı sayılır. Böylece yeni bir yazım eklendiğinde
//      (örn. "Tramer kaydı mevcut") kod sessizce yanlış cevap vermez.
//   3. Hiçbiri yoksa BİLİNMİYOR döner — "hasarsız" DEĞİL. Bilgi yokken
//      temiz beyanı vermek, hatanın ilk hâliyle aynı sonuca çıkar.
//
// toLocaleLowerCase('tr-TR') kullanılıyor: Türkçe'de I harfinin küçüğü
// ı'dır, İngilizce kuralı 'HASARSIZ' → 'hasarsiz' üretip eşleşmeyi kaçırır.
// =========================================================================

// Hasar durumu üç değerli: bilgi yokluğu "hasarsız" ile karıştırılmaz.
export const TRAMER_DURUM = {
  VAR: 'var',
  YOK: 'yok',
  BILINMIYOR: 'bilinmiyor',
};

/**
 * Türkçe biçimli tramer tutarını güvenle sayıya çevirir.
 *
 * Neden özel bir ayrıştırıcı: değerler '100.000' gibi tutuluyor ve nokta
 * Türkçe'de BİNLİK ayracı. JavaScript ise noktayı ONDALIK ayracı sayar:
 *     Number('100.000')  ->  100        (100 bin değil, yüz!)
 *     Number('40.000')   ->  40
 * Yani doğrudan Number() kullanmak 100.000 TL'lik hasarı 100 TL yapıyor.
 * Bu yüzden rakam dışındaki her karakter atılır.
 *
 * @returns {number} tutar; okunamıyorsa 0
 */
export function tramerTutari(vehicle) {
  // İki adlandırma da kabul edilir: veritabanı satırı snake_case
  // (tramer_amount), sihirbazın form durumu camelCase (tramerAmount).
  // Aksi hâlde Step4 ön izlemesi yardımcıyı kullanamaz ve orada yine
  // elle metin karşılaştırması yapılırdı — düzelttiğimiz hatanın kaynağı.
  const ham = vehicle?.tramer_amount ?? vehicle?.tramerAmount;
  if (ham === null || ham === undefined || ham === '') return 0;
  if (typeof ham === 'number') return Number.isFinite(ham) ? ham : 0;

  const rakamlar = String(ham).replace(/\D/g, '');
  if (!rakamlar) return 0;
  const sayi = parseInt(rakamlar, 10);
  return Number.isFinite(sayi) ? sayi : 0;
}

/**
 * Aracın hasar kaydı durumunu döndürür.
 * @returns {'var'|'yok'|'bilinmiyor'}
 */
export function tramerDurumu(vehicle) {
  // 1. Tutar asıldır
  if (tramerTutari(vehicle) > 0) return TRAMER_DURUM.VAR;

  // 2. Etiket — sabit metinle değil, anahtar kelimeyle
  const etiket = (vehicle?.tramer_status ?? vehicle?.tramerStatus ?? '').toString().trim();
  if (!etiket) return TRAMER_DURUM.BILINMIYOR;

  const kucuk = etiket.toLocaleLowerCase('tr-TR');

  // SIRA KRİTİK — olumsuzlama önce denetlenir.
  // 'Hasarsız' kelimesi 'hasar' İÇERİR. Sıra ters olsa hasarsız bir araç
  // hasarlı sayılırdı. Aynı şekilde 'Tramer Yok' hem "yok" hem "tramer"
  // içeriyor.
  if (kucuk.includes('yok') || kucuk.includes('hasarsız') || kucuk.includes('hasarsiz')) {
    return TRAMER_DURUM.YOK;
  }

  // Hasar belirten anahtar kelimeler. 'hasar' burada, olumsuzlama
  // denetiminden SONRA güvenli.
  //
  // 'hasarlı' ve 'pert' listede olmak zorunda: sihirbazın seçenekleri
  // (Step2ListingDetails.jsx -> TRAMER_OPTIONS) şu an
  //     ['Bilmiyorum', 'Tramer Yok', 'Tramer Var', 'Ağır Hasarlı']
  // ve 'Ağır Hasarlı' ilk yazımda gözden kaçmıştı; yardımcı onu
  // "bilinmiyor" sayıyordu. En ağır hasar durumunun karnede
  // "Sorgulanamadı" diye geçmesi kabul edilemez.
  //
  // Bu listeye dokunacak olan: TRAMER_OPTIONS'a yeni bir seçenek eklerken
  // buranın da kapsadığını doğrula.
  if (
    kucuk.includes('var') ||
    kucuk.includes('mevcut') ||
    kucuk.includes('hasar') ||
    kucuk.includes('pert') ||
    kucuk.includes('ağır') ||
    kucuk.includes('agir')
  ) {
    return TRAMER_DURUM.VAR;
  }

  // 3. Tanınmayan etiket ('Bilmiyorum' gibi): temiz beyanı VERİLMEZ
  return TRAMER_DURUM.BILINMIYOR;
}

/** Kısayol: hasar kaydı var mı? (bilinmiyor ise false) */
export function tramerVarMi(vehicle) {
  return tramerDurumu(vehicle) === TRAMER_DURUM.VAR;
}

/**
 * Resmi belgede/arayüzde basılacak metin.
 * "bilinmiyor" durumu açıkça yazılır; sessizce temiz denmez.
 */
export function tramerMetni(vehicle) {
  const durum = tramerDurumu(vehicle);
  if (durum === TRAMER_DURUM.VAR) {
    const tutar = tramerTutari(vehicle);
    return tutar > 0
      ? `Kayıt Var (${tutar.toLocaleString('tr-TR')} TL)`
      : 'Kayıt Var (Tutar Belirtilmemiş)';
  }
  if (durum === TRAMER_DURUM.YOK) return 'Kayıt Bulunmamaktadır (Temiz)';
  return 'Sorgulanamadı (Beyan Yok)';
}
