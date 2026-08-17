// =========================================================================
// YÜKLEME ÖNCESİ GÖRSEL SIKIŞTIRMA — TEK KAYNAK
//
// -------------------------------------------------------------------------
// NİYE GEREKİYOR
// -------------------------------------------------------------------------
// Projede BEŞ ayrı yükleme kapısı vardı ve HİÇBİRİNDE küçültme yoktu:
//
//   Step1VehicleAndPhotos  · araç fotoğrafı (15 adete kadar)
//   hesapService.avatarYukle · profil görseli
//   MaintenanceDialog      · servis faturası
//   Step3MedicalHistory    · sihirbaz faturaları
//   SahipsizGeriYukleDialog · ruhsat
//
// Telefondan çıkan ham fotoğraf doğrudan Supabase'e gidiyordu. Canlı kovada
// ölçüldü: ortalama 924 KB, en büyüğü 4,5 MB, toplam 122 MB / 37 dosya.
//
// Bunun ÜÇ ayrı bedeli var ve üçü de kullanıcıya farklı yerden çarpıyor:
//   1. DEPOLAMA — kova durmadan şişiyor.
//   2. ÇIKIŞ TRAFİĞİ — her görüntülemede tam boy dosya iniyor.
//   3. YÜKLEME SÜRESİ — 15 fotoğraflı bir kayıt ~14 MB gönderiyordu; zayıf
//      mobil bağlantıda yükleme yarıda kopuyor ve kullanıcı kaydı hiç
//      tamamlayamıyor. Ölçek hedefi mobil olan bir üründe en pahalı bedel bu.
//
// ⚠ `next/image` bunu ÇÖZMÜYOR. O yalnızca GÖSTERİM tarafını iyileştiriyor:
// depolanan dosya, çıkış trafiğinin kaynağı ve yükleme süresi aynı kalıyor.
// İki katman birbirinin yerine geçmiyor, ikisi de gerekiyor.
//
// -------------------------------------------------------------------------
// NİYE YENİ BİR BAĞIMLILIK YOK
// -------------------------------------------------------------------------
// Tarayıcının kendi `canvas` + `toBlob` yolu bu işi zaten yapıyor. Sıkıştırma
// kütüphanesi eklemek paket boyutunu büyütür ve hiçbir şey kazandırmaz.
//
// -------------------------------------------------------------------------
// TEMEL KURAL: SIKIŞTIRMA HİÇBİR ZAMAN YÜKLEMEYİ ENGELLEMEZ
// -------------------------------------------------------------------------
// Kodlama başarısız olursa (HEIC, bozuk dosya, bellek yetmemesi, eski
// tarayıcı) ORİJİNAL dosya döndürülüyor. Sıkıştırma bir iyileştirme; kullanıcı
// aracını kaydedemez hâle gelmesi kabul edilemez bir takas olurdu.
//
// Aynı sebeple sonuç orijinalden BÜYÜKSE orijinal korunuyor: zaten optimize
// edilmiş küçük bir dosyayı yeniden kodlamak onu şişirebiliyor.
// =========================================================================

// =========================================================================
// DESTEKLENEN GÖRSEL TÜRLERİ — TEK KAYNAK
// =========================================================================
// Bu liste ÜÇ yerde aynı olmak zorunda ve üçü ayrı ayrı yazılırsa kaçınılmaz
// olarak birbirinden ayrılıyor:
//
//   1. Supabase kovasının `allowed_mime_types` ayarı (sunucu — asıl kapı)
//   2. Dosya seçicinin `accept` özniteliği (kullanıcı yanlış dosya seçemesin)
//   3. Sürükle-bırak süzgeci (`accept` sürüklemede ÇALIŞMIYOR)
//
// ⚠ ÜÇÜNCÜSÜ ATLANAMAZ. `accept` yalnızca dosya seçici penceresini süzüyor;
// sürükleyip bırakan kullanıcı istediği türü geçirebiliyor. Denetim yoksa
// dosya sunucuda reddediliyor ve yükleyici hatayı yutup veritabanına
// `blob:` adresi yazıyor — kullanıcı kaydettiğini sanıyor, kayıt bozuk.
//
// `image/heic` listede: iPhone'un öntanımlı biçimi. Tarayıcı onu ÇÖZEMİYOR,
// yani sıkıştırılamıyor ve orijinal hâliyle yükleniyor. Listeden çıkarmak
// iPhone'dan gelen bir yüklemeyi bugün çalışırken bozardı.
// =========================================================================

/** Kovaların ve arayüzün ortak kabul listesi. */
export const IZINLI_GORSEL_TURLERI = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
];

/** `<input type="file" accept=...>` için hazır dize. */
export const GORSEL_ACCEPT = IZINLI_GORSEL_TURLERI.join(',');

/** Kullanıcıya gösterilecek okunur biçim listesi. */
export const GORSEL_TURLERI_METNI = 'JPG, PNG, WEBP veya HEIC';

/** Dosya kabul edilen bir görsel türü mü? */
export function gorselTuruUygun(dosya) {
  return !!dosya && IZINLI_GORSEL_TURLERI.includes(dosya.type);
}

// =========================================================================
// BELGE TÜRLERİ (fatura, makbuz, ruhsat)
// =========================================================================
// Görsel listesinden tek farkı PDF: fatura ve ruhsat sıklıkla PDF geliyor ve
// `belgeler` ile `vehicle-invoices` kovaları onu kabul ediyor.
//
// ⚠ PDF SIKIŞTIRILMIYOR. `gorselSikistir` görüntü olmayan her dosyayı
// dokunmadan geçiriyor: bir PDF'i tuvale çizmek onu piksele çevirip metnini
// yok eder — faturada bu doğrudan veri kaybı.
//
// Bu liste `SahipsizGeriYukleDialog`da elle yazılıydı; oraya da buradan
// veriliyor. İki listenin ayrı durması, birini güncelleyip diğerini
// unutmanın en kısa yolu.
// =========================================================================

/** Belge kovalarının ve belge girdilerinin ortak kabul listesi. */
export const IZINLI_BELGE_TURLERI = [
  ...IZINLI_GORSEL_TURLERI,
  'application/pdf',
];

/** Belge girdileri için `accept` dizesi. */
export const BELGE_ACCEPT = IZINLI_BELGE_TURLERI.join(',');

/** Kullanıcıya gösterilecek okunur belge biçimi listesi. */
export const BELGE_TURLERI_METNI = 'JPG, PNG, WEBP, HEIC veya PDF';

/** Dosya kabul edilen bir belge türü mü? */
export function belgeTuruUygun(dosya) {
  return !!dosya && IZINLI_BELGE_TURLERI.includes(dosya.type);
}

/**
 * Sıkıştırma profilleri. Sayılar rastgele değil, kullanım yerine bağlı.
 */
export const SIKISTIRMA = {
  /**
   * ARAÇ FOTOĞRAFI — 1920 px / WebP %82.
   *
   * Detay ekranında tam boy gösteriliyor, o yüzden WhatsApp'ın ayarı
   * (~1600 px / %70) fazla agresif: tam ekran görüntülemede yumuşama fark
   * ediliyor. 1920 px, 1440p ekrana kadar birebir keskin ve araç
   * pazaryerlerinin fiili standardı.
   */
  aracFotografi: { enUzunKenar: 1920, kalite: 0.82 },

  /**
   * BELGE (fatura, makbuz, ruhsat) — 2400 px / %88.
   *
   * ⚠ BİLİNÇLİ OLARAK ARAÇ FOTOĞRAFINDAN DAHA CÖMERT. Belgede değerli olan
   * şey OKUNABİLİRLİK: sicilin tüm iddiası bu evraka dayanıyor. Okunamayan
   * bir fatura hiç yüklenmemiş faturadan iyi değil.
   *
   * Küçük punto metin için ÇÖZÜNÜRLÜK kaliteden daha belirleyici — o yüzden
   * kenar büyük tutulup kalite makul bırakıldı, tersi değil.
   */
  belge: { enUzunKenar: 2400, kalite: 0.88 },

  /**
   * PROFİL GÖRSELİ — 512 px / %85.
   *
   * En büyük gösterildiği yer 64 px (Hesabım ekranı). 512 px, yüksek yoğunluk
   * ekranlarda bile fazlasıyla yeterli.
   *
   * ⚠ BURADA SIKIŞTIRMA BİR HATAYI DA DÜZELTİYOR: `avatarYukle` 2 MB üstü
   * dosyayı reddediyor, telefon fotoğrafı ise neredeyse her zaman 2 MB'ın
   * üstünde. Yani kullanıcı bugün profil fotoğrafı koymayı deniyor ve hata
   * alıyor. Sıkıştırma bunu yan etki olarak çözüyor.
   */
  avatar: { enUzunKenar: 512, kalite: 0.85 },
};

/**
 * Tarayıcıda çözülemeyen görüntü biçimleri.
 *
 * iPhone'un öntanımlı biçimi HEIC. iOS Safari dosya seçicide bunu kendisi
 * JPEG'e çeviriyor, ama masaüstünden seçilen bir .heic dosyasını hiçbir
 * tarayıcı çözemiyor. Boşuna kodlamaya çalışıp hata yakalamak yerine baştan
 * atlanıyor — sonuç aynı (orijinal yükleniyor) ama bellek harcanmıyor.
 */
const COZULEMEYEN = /^image\/(heic|heif|avif-sequence)$/i;

/** Sıkıştırılamayacak dosyayı olduğu gibi bildiren yanıt. */
function dokunulmadi(dosya) {
  return {
    dosya,
    sikistirildi: false,
    oncekiBayt: dosya?.size ?? 0,
    sonrakiBayt: dosya?.size ?? 0,
  };
}

/**
 * Dosyayı çözülmüş bir bitmap'e çevirir.
 *
 * ⚠ EXIF DÖNÜŞÜ BURADA ÇÖZÜLÜYOR. Telefon fotoğrafları görüntüyü döndürmüyor;
 * EXIF'e "bu 90° çevrili gösterilmeli" notu yazıyor. `drawImage` bu notu
 * kendiliğinden UYGULAMIYOR — dikkate alınmazsa dikey çekilmiş her fotoğraf
 * yan yatık kaydedilir ve kullanıcı düzeltemez.
 *
 * `imageOrientation: 'from-image'` notu bitmap'e uygulatıyor.
 */
async function bitmapCoz(dosya) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(dosya, { imageOrientation: 'from-image' });
    } catch {
      // Bazı tarayıcılar seçeneği tanımıyor; seçeneksiz bir kez daha.
      try {
        return await createImageBitmap(dosya);
      } catch {
        /* aşağıdaki <img> yoluna düşülüyor */
      }
    }
  }

  // Yedek yol: `<img>` ile çöz. Modern tarayıcılarda `<img>` EXIF dönüşünü
  // varsayılan olarak uyguluyor (`image-orientation: from-image`).
  return new Promise((coz, reddet) => {
    const adres = URL.createObjectURL(dosya);
    const im = new Image();
    im.onload = () => {
      URL.revokeObjectURL(adres);
      coz(im);
    };
    im.onerror = () => {
      URL.revokeObjectURL(adres);
      reddet(new Error('gorsel_cozulemedi'));
    };
    im.src = adres;
  });
}

/**
 * Tuvali istenen biçimde kodlar.
 *
 * ⚠ `toBlob` DESTEKLENMEYEN BİÇİMDE SESSİZCE PNG DÖNDÜRÜYOR. Dönen değeri
 * denetlemezsek WebP kodlayamayan bir tarayıcıda ORİJİNALDEN BÜYÜK bir PNG
 * üretip onu "sıkıştırılmış" sanarak yüklerdik. O yüzden dönen `type` her
 * seferinde doğrulanıyor.
 */
function tuvalKodla(tuval, tur, kalite) {
  return new Promise((coz) => {
    tuval.toBlob(
      (blob) => coz(blob && blob.type === tur ? blob : null),
      tur,
      kalite
    );
  });
}

/** Uzantıyı MIME türüne göre düzeltir. */
function uzantiDegistir(ad, tur) {
  const uzanti = tur === 'image/webp' ? 'webp' : 'jpg';
  const govde = (ad || 'gorsel').replace(/\.[^.]+$/, '');
  return `${govde}.${uzanti}`;
}

/**
 * Görseli yüklemeden ÖNCE küçültür ve yeniden kodlar.
 *
 * PDF ve görüntü olmayan her dosya dokunulmadan geri döner — bir PDF'i
 * tuvale çizmek onu görüntüye çevirip metnini yok eder, faturada bu veri
 * kaybıdır.
 *
 * @param {File|Blob} dosya
 * @param {{enUzunKenar: number, kalite: number}} profil `SIKISTIRMA`dan biri
 * @returns {Promise<{dosya: File|Blob, sikistirildi: boolean, oncekiBayt: number, sonrakiBayt: number}>}
 */
export async function gorselSikistir(dosya, profil = SIKISTIRMA.aracFotografi) {
  if (!dosya) return dokunulmadi(dosya);
  if (typeof document === 'undefined') return dokunulmadi(dosya); // sunucu tarafı
  if (!dosya.type?.startsWith('image/')) return dokunulmadi(dosya); // PDF dahil
  if (COZULEMEYEN.test(dosya.type)) return dokunulmadi(dosya);

  // SVG bir çizim tarifi, fotoğraf değil: tuvale çizmek onu piksele çevirip
  // hem büyütür hem bozar.
  if (dosya.type === 'image/svg+xml') return dokunulmadi(dosya);

  let kaynak = null;
  let tuval = null;

  try {
    kaynak = await bitmapCoz(dosya);

    const g = kaynak.width;
    const y = kaynak.height;
    if (!g || !y) return dokunulmadi(dosya);

    // ⚠ ASLA BÜYÜTME. `min(1, …)` olmadan küçük bir görsel hedef boyuta
    // şişirilir: dosya büyür, görüntü bulanıklaşır — iki yönlü kayıp.
    const olcek = Math.min(1, profil.enUzunKenar / Math.max(g, y));
    const hedefG = Math.max(1, Math.round(g * olcek));
    const hedefY = Math.max(1, Math.round(y * olcek));

    tuval = document.createElement('canvas');
    tuval.width = hedefG;
    tuval.height = hedefY;

    const ctx = tuval.getContext('2d');
    if (!ctx) return dokunulmadi(dosya);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(kaynak, 0, 0, hedefG, hedefY);

    // WebP ÖNCE deneniyor: JPEG'den belirgin küçük ve ALFA KANALINI taşıyor.
    // Şeffaf bir PNG'yi JPEG'e çevirmek şeffaf bölgeleri SİYAH yapıyor —
    // profil görselinde bu doğrudan görünür bir bozulma.
    let blob = await tuvalKodla(tuval, 'image/webp', profil.kalite);
    let tur = 'image/webp';

    if (!blob) {
      // WebP kodlanamadı. JPEG'e düşülüyor, ama önce zemin BEYAZA boyanıyor:
      // JPEG alfa taşımıyor ve boyanmazsa şeffaf bölgeler siyah çıkıyor.
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, hedefG, hedefY);
      ctx.globalCompositeOperation = 'source-over';

      blob = await tuvalKodla(tuval, 'image/jpeg', profil.kalite);
      tur = 'image/jpeg';
    }

    if (!blob) return dokunulmadi(dosya);

    // Kazanç yoksa orijinali koru. Zaten sıkıştırılmış bir dosyayı yeniden
    // kodlamak sık sık BÜYÜTÜYOR; o hâlde kalite kaybını boşuna almıyoruz.
    if (blob.size >= dosya.size) return dokunulmadi(dosya);

    // ⚠ `File` olarak sarmak ZORUNLU, `Blob` yeterli değil: çağıran taraflar
    // dosya adını okuyor (ör. MaintenanceDialog uzantıyı `dosya.name`den
    // çıkarıyor). Ham `Blob` döndürmek orada `undefined` uzantı üretirdi.
    const ad = uzantiDegistir(dosya.name, tur);
    const cikti =
      typeof File === 'function'
        ? new File([blob], ad, { type: tur, lastModified: Date.now() })
        : blob;

    return {
      dosya: cikti,
      sikistirildi: true,
      oncekiBayt: dosya.size,
      sonrakiBayt: blob.size,
    };
  } catch (e) {
    console.warn('Görsel sıkıştırılamadı, orijinal yüklenecek:', e?.message || e);
    return dokunulmadi(dosya);
  } finally {
    // ⚠ BELLEK BOŞALTMA ATLANAMAZ. 12 MP bir fotoğraf çözülmüş hâlde ~48 MB
    // yer tutuyor. 15 fotoğraf üst üste işlenirken bunlar bırakılmazsa mobil
    // tarayıcı sekmeyi öldürüyor ve kullanıcı sebebini hiç anlamıyor.
    if (kaynak && typeof kaynak.close === 'function') kaynak.close();
    if (tuval) {
      tuval.width = 0;
      tuval.height = 0;
    }
  }
}

/**
 * Birden fazla görseli SIRAYLA sıkıştırır.
 *
 * ⚠ `Promise.all` BİLİNÇLİ OLARAK KULLANILMIYOR. 15 fotoğrafı paralel çözmek
 * aynı anda ~700 MB çözülmüş görüntü demek; telefonda sekme düşüyor. Sıra
 * biraz daha yavaş ama tamamlanıyor — yarım kalan yükleme kullanıcı için
 * yavaş yüklemeden çok daha pahalı.
 *
 * @param {Array<File|Blob>} dosyalar
 * @param {{enUzunKenar: number, kalite: number}} profil
 * @param {(islenen: number, toplam: number) => void} [ilerleme]
 */
export async function gorselleriSikistir(dosyalar, profil, ilerleme) {
  const sonuc = [];
  for (let i = 0; i < dosyalar.length; i++) {
    sonuc.push(await gorselSikistir(dosyalar[i], profil));
    ilerleme?.(i + 1, dosyalar.length);
  }
  return sonuc;
}
