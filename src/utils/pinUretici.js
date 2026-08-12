// =========================================================================
// PIN ÜRETİCİ — ARAÇ SİCİL KODU
//
// -------------------------------------------------------------------------
// ÖNCEKİ ÜRETECİN ÜÇ KUSURU
// -------------------------------------------------------------------------
// Eski hâli tek satırdı:
//
//   `CV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
//
// 1) `Math.random()` KRİPTOGRAFİK DEĞİL.
//    V8'de xorshift128+ kullanılıyor ve bu bir güvenlik üreteci değil.
//    Birkaç çıktısını gören biri iç durumu geri hesaplayıp SONRAKİ ve
//    ÖNCEKİ değerleri üretebilir. Saldırgan kendi aracını kaydederek
//    birkaç PIN elde eder, ardından aynı sırada başkalarına verilen
//    PIN'leri tahmin edebilir. PIN, araç siciline erişimi açan anahtar
//    olduğu için bu gerçek bir saldırı yolu.
//
// 2) UZUNLUK DEĞİŞKENDİ.
//    `Math.random().toString(36)` her zaman uzun bir metin vermez.
//    0.5 -> "0.i"  ->  substring(2,8) = "i"   ->  PIN: "CV-I"
//    Kısa PIN saniyeler içinde denenip bulunur. Nadir ama gerçek; yüz
//    binlerce kayıtta kaçınılmaz.
//
// 3) KARIŞABİLEN KARAKTERLER.
//    base36 alfabesi 0/O ve 1/I/L'yi birlikte içeriyor. PIN telefonda
//    okunan, elle yazılan bir şey; bu çiftler doğrudan destek talebi
//    üretir.
//
// -------------------------------------------------------------------------
// ALFABE SEÇİMİ: CROCKFORD BASE32
// -------------------------------------------------------------------------
// `0123456789ABCDEFGHJKMNPQRSTVWXYZ` — 32 karakter. I, L, O ve U yok.
//
//   · I ve L çıkarıldı, çünkü 1 ile karışır. O çıkarıldı, çünkü 0 ile
//     karışır. Rakamlar KALDI: harf tarafı boşaltıldığı için 0 ve 1 artık
//     tek anlamlı.
//   · U çıkarıldı — Crockford'un gerekçesi, rastgele dizilerde istenmeyen
//     kelimelerin oluşmasını azaltmak.
//   · 32 = 2^5 olması ÖNEMLİ: her karakter tam 5 bite karşılık geliyor,
//     dolayısıyla "kalan sapması" (modulo bias) yok. 31 ya da 33 harfli
//     bir alfabede `bayt % alfabe.length` bazı harfleri diğerlerinden daha
//     sık seçer ve entropi ilan edilenin altına düşer.
//
// -------------------------------------------------------------------------
// UZUNLUK: 10 KARAKTER = 50 BİT
// -------------------------------------------------------------------------
// Eski PIN 6 base36 karakteriydi ≈ 31 bit ≈ 2,2 milyar.
//
//   Bugün, 10 araçla:      10 / 2,2 milyar  -> pratikte bulunamaz
//   1 milyon araçla:       1e6 / 2,2 milyar -> her ~2.200 denemede bir isabet
//                          (saniyede 100 istekle ~22 saniyede bir araç)
//
// Yani eski uzunluk BUGÜN yeterli, hedeflenen ölçekte değil. 10 Crockford
// karakteri 50 bit ≈ 1,1 katrilyon:
//
//   1 milyon araçla:       1e6 / 1,1e15     -> her ~1,1 milyar denemede bir
//                          (saniyede 100 istekle ~130 günde bir araç)
//
// Okunabilirlik için beşerli iki gruba ayrılıyor: `CV-XXXXX-XXXXX`.
// Toplam 14 karakter; `sicil_getir` girdi deseni (3-16) buna uyuyor.
//
// NOT — ENTROPİ TEK BAŞINA YETMEZ: numaralandırmaya karşı asıl savunma
// istek hızı sınırıdır. Bu dosya onu çözmez; roadmap'te ayrı madde.
// =========================================================================

// 32 karakter. Sıra Crockford standardındaki sıradır; değiştirilmemeli
// (ileride bir çözücü yazılırsa aynı sıraya dayanır).
const ALFABE = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const UZUNLUK = 10;
const ONEK = 'CV';

/**
 * Kriptografik üreteci getirir.
 *
 * SESSİZ GERİ DÜŞÜŞ YOK: `crypto` yoksa `Math.random()`'a dönmek, tam
 * olarak düzeltmeye çalıştığımız kusuru geri getirir ve hiçbir yerde
 * görünmez. Bunun yerine hata atıyoruz — bir ortamda çalışmıyorsa
 * bilelim.
 */
function uretec() {
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (!c || typeof c.getRandomValues !== 'function') {
    throw new Error(
      'Kriptografik rastgelelik yok (crypto.getRandomValues bulunamadı). ' +
      'PIN üretilemedi; Math.random() ile devam edilmeyecek.'
    );
  }
  return c;
}

/**
 * Yeni araç PIN kodu üretir.
 * @returns {string} `CV-XXXXX-XXXXX`
 */
export function pinUret() {
  const bayt = new Uint8Array(UZUNLUK);
  uretec().getRandomValues(bayt);

  let govde = '';
  for (let i = 0; i < UZUNLUK; i++) {
    // Baytın ALT 5 BİTİ alınıyor. Bayt 0-255 arası düzgün dağılımlı
    // olduğundan alt 5 bit de 0-31 arası düzgün dağılımlı: sapma yok.
    govde += ALFABE[bayt[i] & 31];
  }

  return `${ONEK}-${govde.slice(0, 5)}-${govde.slice(5)}`;
}

/**
 * Kullanıcının yazdığı PIN'i karşılaştırmaya hazır hâle getirir.
 *
 * Alfabede I, L ve O yok — yani kullanıcı bunlardan birini yazdıysa
 * kesinlikle 1 ya da 0 demek istemiştir. Bu katlama olmadan "O" yazan
 * kullanıcı "araç bulunamadı" görür ve hatayı kendisinde arar.
 *
 * Ayrıca: boşluk ve tire temizlenir, harfler büyütülür. Tire biçimsel;
 * PIN'i tiresiz yazan da bulmalı.
 *
 * @param {string} girdi
 * @returns {string} Normalleştirilmiş PIN (`CV-XXXXX-XXXXX`) ya da boş metin
 */
export function pinNormalize(girdi) {
  if (!girdi) return '';

  // Türkçe yerel ayarı BİLEREK kullanılmıyor: `toLocaleUpperCase('tr-TR')`
  // 'i' harfini 'İ' yapar ve alfabede 'İ' yok. PIN alfabesi ASCII.
  const ham = String(girdi).toUpperCase().replace(/[\s-]/g, '');
  const oneksiz = ham.startsWith(ONEK) ? ham.slice(ONEK.length) : ham;

  // ALFABE DIŞI KARAKTER REDDEDİLİYOR — bu satır bir güvenlik kontrolü.
  //
  // PIN sorgu formu eskiden girdiyi `ilike` ile arıyordu. `ilike` desen
  // karakterlerini yorumlar: kullanıcı `CV-%` yazdığında BÜTÜN araçlar
  // eşleşiyor ve sorgu ilk satırı döndürüyordu — yani ziyaretçi, plaka
  // dahil rastgele bir aracın tam kaydını alabiliyordu. Girdi burada
  // temizlendiği için `%` ve `_` sorguya hiç ulaşmıyor; ayrıca çağıran
  // taraf `ilike` yerine `eq` kullanıyor. İki katman.
  if (!oneksiz || /[^0-9A-Z]/.test(oneksiz)) return '';

  if (oneksiz.length === UZUNLUK) {
    // YENİ BİÇİM. Crockford katlaması yalnızca BURADA uygulanıyor:
    // alfabede I, L ve O yok, dolayısıyla kullanıcı bunlardan birini
    // yazdıysa kesinlikle 1 ya da 0 demek istemiştir.
    const katlanmis = oneksiz.replace(/[IL]/g, '1').replace(/O/g, '0');
    return `${ONEK}-${katlanmis.slice(0, 5)}-${katlanmis.slice(5)}`;
  }

  // ESKİ BİÇİM (6 karakter, base36). Katlama UYGULANMIYOR ve bu kritik:
  // eski PIN'ler base36 ile üretildi, yani I, L ve O harflerini GERÇEKTEN
  // içerebilir. Örnek: `CV-D7JMLH`. Katlama uygulansaydı `CV-D7JM1H`
  // olurdu ve araç hiç bulunamazdı.
  //
  // Karışık iki biçimin bir arada olması tam olarak bu tür hatalar
  // üretiyor; eski PIN'lerin de yenilenmesi roadmap'te açık madde.
  return `${ONEK}-${oneksiz}`;
}

export const PIN_ALFABESI = ALFABE;
export const PIN_UZUNLUGU = UZUNLUK;
