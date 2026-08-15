// =========================================================================
// TR PLAKA — TEK BİÇİMLEYİCİ
//
// -------------------------------------------------------------------------
// NİYE VAR
// -------------------------------------------------------------------------
// Plaka biçimlendirmesi uygulamada DÖRT ayrı kopya hâlinde dolaşıyordu:
//
//   · `formatTRPlate`  -> Step1:75 ve Step2:350 (birbirinin kopyası)
//   · satır içi regex  -> GarageScreen, MaintenanceDialog, VitrinKartiEkrani,
//                         HesapKapatmaDialog, AracSeciciDialog (beş kez
//                         yapıştırılmış aynı satır)
//   · `plakaBicimle`   -> devir/page.js:39
//   · HİÇBİRİ          -> MyListingsScreen, PolicyOfferModal,
//                         AracDevretDialog, AracDevralDialog (ön izleme dalı)
//
// Son grup asıl sorundu: plaka veritabanında BOŞLUKSUZ duruyor (canlıda 11
// aracın 11'i: '41IHH434', '34FB1907'...), yani biçimlemeyen ekran ham
// basıyordu. Kullanıcı aynı aracı bir ekranda "41 IHH 434", diğerinde
// "41IHH434" olarak görüyordu.
//
// AracSeciciDialog'un kendi yorumu kuralı zaten yazmış:
//   "Aynı plakayı iki ekranda iki farklı biçimde görmek, kullanıcıya farklı
//    araç hissi verir."
//
// -------------------------------------------------------------------------
// ⚠ TÜRKÇE BÜYÜK HARF TUZAĞI
// -------------------------------------------------------------------------
// Burada `toLocaleUpperCase('tr-TR')` KULLANILMIYOR ve bu bilerek.
// Türkçe yerelinde 'i' -> 'İ' oluyor; plaka harfleri ise ASCII. 'İ' hiçbir
// `[A-Z]` kalıbına uymadığı için kullanıcı küçük 'i' yazdığında plaka
// sessizce bozulurdu. Plakada Türkçe harf yok — sade `toUpperCase()` doğru.
// =========================================================================

/**
 * Ham plakayı okunur biçime çevirir: '41IHH434' -> '41 IHH 434'.
 *
 * Aynı işlev hem GÖSTERİM hem de GİRİŞ MASKESİ olarak çalışıyor: yarım
 * yazılmış değerde ('34AB') anlamlı çıktı veriyor ('34 AB'), bu yüzden
 * form maskesi ile gösterim arasında ikinci bir kopyaya gerek yok.
 *
 * ⚠ VERİ KAYBETMİYOR: maske TR plaka kalıbına (2 rakam · 1-3 harf ·
 * 2-4 rakam) uymayan fazlalığı normalde düşürürdü. Gösterimde bir karakteri
 * sessizce yutmak, yanlış plaka göstermek demek. Bu yüzden çıktı ham
 * değerle karşılaştırılıyor; kalıba oturmuyorsa değer OLDUĞU GİBİ (yalnızca
 * büyük harfe çevrilerek) döndürülüyor.
 *
 * @param {string} deger
 * @returns {string}
 */
export function plakaBicimle(deger) {
  const ham = String(deger || '')
    .replace(/\s+/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  if (!ham) return '';

  let cikti = '';
  let i = 0;

  // 1 · İl kodu: iki rakam.
  let ilRakami = 0;
  while (i < ham.length && ilRakami < 2) {
    if (/[0-9]/.test(ham[i])) { cikti += ham[i]; ilRakami++; }
    i++;
  }
  if (ilRakami === 2 && i < ham.length) cikti += ' ';

  // 2 · Harf grubu: en fazla üç harf. Harf başladıktan sonra gelen ilk
  //     rakam grubu bitiriyor.
  let harf = 0;
  while (i < ham.length && harf < 3) {
    if (/[A-Z]/.test(ham[i])) { cikti += ham[i]; harf++; }
    else if (/[0-9]/.test(ham[i]) && harf > 0) break;
    i++;
  }
  if (harf > 0 && i < ham.length && /[0-9]/.test(ham[i])) cikti += ' ';

  // 3 · Sıra numarası: en fazla dört rakam.
  let sonRakam = 0;
  while (i < ham.length && sonRakam < 4) {
    if (/[0-9]/.test(ham[i])) { cikti += ham[i]; sonRakam++; }
    i++;
  }

  // Maske bir şey yuttuysa ham değeri göster; eksik plaka göstermektense
  // biçimsiz göstermek doğru.
  return cikti.replace(/\s/g, '') === ham ? cikti : ham;
}

/**
 * Plaka TR kalıbına tam oturuyor mu? Doğrulama ekranlarında kullanmak için.
 * Gösterim bu kontrolü BEKLEMİYOR — eski kayıtlar kalıba uymasa da
 * görünmeye devam ediyor.
 *
 * @param {string} deger
 * @returns {boolean}
 */
export function plakaGecerliMi(deger) {
  const ham = String(deger || '').replace(/\s+/g, '').toUpperCase();
  return /^[0-9]{2}[A-Z]{1,3}[0-9]{2,4}$/.test(ham);
}
