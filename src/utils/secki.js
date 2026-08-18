// =========================================================================
// "SİZİN İÇİN SEÇTİKLERİMİZ" SEÇKİSİ (utils/secki.js)
//
// Anasayfada vitrinin hemen altındaki bölümü besleyen seçim.
//
// -------------------------------------------------------------------------
// BUGÜN RASTGELE, YARIN KİŞİSELLEŞTİRİLMİŞ
// -------------------------------------------------------------------------
// Ürün sahibinin planı: "ilk başta rastgele ama sonradan kullanıcının
// gezdiği araçlara göre". Bu dosya o geçişi TEK NOKTADA topluyor —
// `gecmis` parametresi bugün boş geliyor, sinyal bağlandığında yalnızca
// buradaki sıralama değişecek, çağıran taraf hiç değişmeyecek.
//
// Sinyalin muhtemel kaynağı: `/query-history` (sorgulama geçmişi) zaten
// kullanıcının hangi araçlara baktığını tutuyor. Bağlanmadı çünkü seçkinin
// hangi ölçüte göre kişiselleşeceği (aynı marka mı, aynı şehir mi, aynı
// fiyat bandı mı) henüz kararlaştırılmadı.
//
// -------------------------------------------------------------------------
// NİYE `Math.random()` DEĞİL
// -------------------------------------------------------------------------
// `Math.random()` render sırasında çağrılırsa React saflık kuralını ihlal
// ediyor (lint hatası) ve her render'da seçki değişeceği için kartlar
// kullanıcının gözünün önünde zıplıyor. Bunun yerine tohumlu (deterministik)
// bir karıştırma var: aynı tohum + aynı havuz -> aynı sonuç. Tohum oturum
// başına bir kez üretiliyor (`acilisZamani`), yani seçki sayfa açıkken
// sabit, yeni ziyarette farklı.
// =========================================================================

/**
 * Tohumlu sözde-rastgele üretici (mulberry32).
 * Küçük, bağımlılıksız ve aynı tohumda aynı diziyi veriyor.
 */
function uretici(tohum) {
  let t = tohum >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Havuzdan seçki üretir.
 *
 * @param {object[]} havuz Aday araçlar (çağıran taraf zaten gösterilenleri
 *   çıkarmış olmalı — aynı aracı iki kez göstermek seçkiyi değersizleştirir).
 * @param {number} adet En fazla kaç kart.
 * @param {number} tohum Oturum tohumu. Aynı tohumda sonuç değişmiyor.
 * @param {string[]} [gecmis] Kullanıcının daha önce baktığı araçların PIN'leri.
 *   ⚠ BUGÜN KULLANILMIYOR ve bu bilinçli: sinyal henüz bağlı değil. İmzada
 *   duruyor ki kişiselleştirme geldiğinde çağrı yerleri değişmesin.
 * @returns {object[]}
 */
export function seckiUret(havuz, adet, tohum, gecmis = []) {
  const liste = Array.isArray(havuz) ? [...havuz] : [];
  if (liste.length === 0 || adet <= 0) return [];

  // ⚠ KİŞİSELLEŞTİRME KANCASI. `gecmis` dolduğunda burada bir puanlama
  // yapılacak (ör. kullanıcının baktığı markalara yakın araçlar öne).
  // Bugün boş olduğu için liste olduğu gibi karışıyor — davranış "rastgele".
  if (gecmis.length > 0) {
    // Henüz bir ölçüt kararlaştırılmadı; sinyal geldiğinde bu dal dolacak.
    // Boş bırakmak yerine yorum bırakılıyor ki yanlışlıkla "uygulandı"
    // sanılmasın.
  }

  // Fisher-Yates, tohumlu.
  const rnd = uretici(tohum);
  for (let i = liste.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [liste[i], liste[j]] = [liste[j], liste[i]];
  }
  return liste.slice(0, adet);
}
