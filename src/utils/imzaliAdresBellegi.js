// =========================================================================
// İMZALI ADRES BELLEĞİ
//
// -------------------------------------------------------------------------
// NİYE VAR — ÖLÇÜLDÜ
// -------------------------------------------------------------------------
// Supabase imzalı bağlantısı her üretildiğinde YENİ bir jeton taşıyor. Aynı
// dosya için iki kez imza istemek, aynı dosyaya işaret eden iki FARKLI adres
// üretiyor. Cloudflare bunları iki ayrı nesne sayıyor; ikisi de önbelleğe
// giremiyor ve her görüntüleme dosyayı kaynaktan baştan indiriyor.
//
// Günlükten ölçüldü (21.08.2026, 24 saat):
//
//   /object/sign/   (imzalı)  2.961 istek · 195,1 MB · önbellek isabeti  1
//   /object/public/ (genel)     233 istek · 137,5 MB · önbellek isabeti 187
//
// Yani imzalı yolda isabet oranı %0,03. Tek bir 55 KB'lık avatar, başlık
// şeridi her yüklendiğinde yeniden imzalandığı için günde 2.191 kez
// indirilmişti.
//
// -------------------------------------------------------------------------
// ⚠ JETON ÖMRÜ UZATILMIYOR — BU BİR GÜVENLİK SINIRI
// -------------------------------------------------------------------------
// Bu belleğin yaptığı tek şey, HÂLÂ GEÇERLİ bir jetonu yeniden kullanmak.
// Ömrü dolan jeton bellekten düşüyor ve yenisi isteniyor. Fatura bağlantısı
// 300 saniyelik ömrüyle kalıyor ("sızan bir bağlantının işe yaraması için
// kısa" — `FaturaOnizleme.jsx`); bu dosya o kararı değiştirmiyor.
//
// ⚠ GÜVENLİK PAYI ŞART. Jetonu son saniyesine kadar kullanmak, ağda geçen
// süre yüzünden sunucuya ULAŞTIĞINDA süresi dolmuş bir adres üretebilir.
// Kullanıcı bozuk görsel görür ve sebebi hiçbir yerde görünmez.
//
// -------------------------------------------------------------------------
// ⚠ SÖZ SAKLANIYOR, SONUÇ DEĞİL
// -------------------------------------------------------------------------
// Başlık şeridi ve hesap ekranı avatarı aynı anda isteyebiliyor. Sonucu
// saklamak ikisini de ayrı ayrı imzalatırdı; sözü saklamak ikisini tek
// isteğe bağlıyor.
//
// ⚠ BAŞARISIZ SONUÇ SAKLANMIYOR. `null` dönen bir imza (yetki yok, dosya
// taşınmış) önbellekte kalsaydı, sorun düzeldikten sonra bile görsel oturum
// boyunca boş görünürdü.
// =========================================================================

/** anahtar -> { soz, gecerlilikSonu } */
const bellek = new Map();

/**
 * Ağda geçen süre için ayrılan pay. Jeton bu payın içine girdiğinde
 * "bitmiş" sayılıp yeniden imzalanıyor.
 */
const GUVENLIK_PAYI_MS = 30_000;

/**
 * Aynı anahtar için geçerli bir imza varsa onu döndürür, yoksa üretir.
 *
 * @param {string} anahtar     Genelde `${kova}:${yol}`
 * @param {number} omurSaniye  İmzanın istenen ömrü (saniye)
 * @param {() => Promise<string|null>} uretici  İmzayı üreten çağrı
 * @returns {Promise<string|null>}
 */
export function imzaliAdres(anahtar, omurSaniye, uretici) {
  const simdi = Date.now();
  const kayit = bellek.get(anahtar);
  if (kayit && kayit.gecerlilikSonu > simdi) return kayit.soz;

  const soz = uretici()
    .then((adres) => {
      if (!adres) bellek.delete(anahtar);
      return adres;
    })
    .catch((hata) => {
      bellek.delete(anahtar);
      throw hata;
    });

  // ⚠ Payı düştükten sonra kalan süre negatifse hiç saklama: çok kısa ömürlü
  // bir imzayı önbelleğe koymak, bir sonraki okuyucuya ölü adres verirdi.
  const kalan = omurSaniye * 1000 - GUVENLIK_PAYI_MS;
  if (kalan > 0) bellek.set(anahtar, { soz, gecerlilikSonu: simdi + kalan });

  return soz;
}

/**
 * Belleği boşaltır. Önek verilirse yalnızca onunla başlayan anahtarlar.
 *
 * Dosya yolları zaman damgalı olduğu için yeni yükleme zaten yeni anahtar
 * üretiyor; bu yüzden gündelik akışta çağrılması gerekmiyor. Silme
 * işlemlerinde ve testlerde işe yarıyor.
 */
export function imzaliAdresBellegiTemizle(onek) {
  if (!onek) { bellek.clear(); return; }
  for (const anahtar of bellek.keys()) {
    if (anahtar.startsWith(onek)) bellek.delete(anahtar);
  }
}
