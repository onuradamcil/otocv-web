// =========================================================================
// ARAÇ GÖRSELİ AYRIŞTIRICI
//
// -------------------------------------------------------------------------
// NİYE ORTAK BİR YARDIMCI GEREKİYOR
// -------------------------------------------------------------------------
// `vehicles.image_url` TEK BİR URL DEĞİL. Kayıt sihirbazı birden fazla
// fotoğrafı VİRGÜLLE BİRLEŞTİRİP tek alana yazıyor:
//
//   https://…/1785618590775_0_z7z03.jpeg,https://…/1785618591621_1_fc9isf.jpeg,…
//
// Canlıda ölçüldü: bir araçta 6 adres, 719 karakter tek alanda.
//
// Bu alanı doğrudan `<img src>` içine koyan her ekran KIRIK GÖRSEL basıyor.
// Devir ekranlarında tam olarak bu oldu.
//
// Ayrıştırıcı projede zaten vardı ama İKİ DOSYADA KOPYALANMIŞTI
// (`VehicleDetailsScreen`, `Step4PreviewAndPublish`) ve yeni ekranlar
// ondan habersiz yazıldı. Kopyalanan bir yardımcı, üçüncü çağrı yerinde
// mutlaka unutuluyor — o yüzden tek kaynağa taşındı.
//
// -------------------------------------------------------------------------
// GİRDİ BİÇİMLERİ
// -------------------------------------------------------------------------
// Sihirbaz farklı adımlarda farklı şekiller üretiyor; hepsi karşılanıyor:
//   · virgüllü metin (veritabanındaki hâli)
//   · dizi
//   · {preview} / {url} / {src} taşıyan nesneler (yükleme öncesi önizleme)
// =========================================================================

/** Görsel yokken kullanılan yer tutucu. */
export const YER_TUTUCU_GORSEL = '/placeholder-car.jpg';

/**
 * Ham alanı geçerli görsel adresleri dizisine çevirir.
 * Hiçbir geçerli adres yoksa yer tutucu döndürür — çağıran taraf boş dizi
 * ihtimalini ayrıca ele almak zorunda kalmasın.
 *
 * @param {string|Array|object|null} ham
 * @returns {string[]} en az bir öge
 */
export function aracGorselleri(ham) {
  if (!ham) return [YER_TUTUCU_GORSEL];

  let ogeler = [];
  if (Array.isArray(ham)) ogeler = ham;
  else if (typeof ham === 'string') ogeler = ham.split(',').map((s) => s.trim());
  else ogeler = [ham];

  const cozulen = ogeler
    .map((oge) => {
      if (!oge) return null;
      if (typeof oge === 'string') {
        const temiz = oge.trim();
        // Yalnızca gerçekten adres olanlar. Boş metin ya da yarım kalmış
        // bir yol `<img>` içinde sessizce kırık görsele dönüşüyor.
        if (temiz.startsWith('http') || temiz.startsWith('data:') || temiz.startsWith('blob:')) {
          return temiz;
        }
        return null;
      }
      if (typeof oge.preview === 'string') return oge.preview;
      if (typeof oge.url === 'string') return oge.url;
      if (typeof oge.src === 'string') return oge.src;
      return null;
    })
    .filter(Boolean);

  return cozulen.length > 0 ? cozulen : [YER_TUTUCU_GORSEL];
}

/**
 * Kart ve liste görünümleri için TEK kapak görseli.
 *
 * Listelerde galeri yok; oradaki tek ihtiyaç ilk geçerli adres. Bu yardımcı
 * olmadan çağıran taraf `image_url`i ham basıyor ve virgüllü alanlarda
 * kırık görsel çıkıyor.
 */
export function aracKapakGorseli(ham) {
  return aracGorselleri(ham)[0];
}
