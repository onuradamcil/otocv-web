// =========================================================================
// 16 · UYDURMA VERİ — EKRANDA SABİT KODLANMIŞ SAHTE BİLGİ OLMAYACAK
//
// -------------------------------------------------------------------------
// NİYE BU PAKET VAR
// -------------------------------------------------------------------------
// Araç detay ekranının sağ sütununda bir "satıcı & iletişim" kartı vardı ve
// gösterdiği üç bilginin ÜÇÜ DE uydurmaydı:
//
//     sellerName  = vehicle.owner_name  || 'Tescilli Araç Sahibi'
//     sellerPhone = vehicle.owner_phone || '0 (532) 123 45 67'
//     memberSince = 'Mart 2026'
//
// `vehicles` tablosunda `owner_name` ve `owner_phone` SÜTUNLARI YOK. Yani
// yedek değer istisna değil, tek durumdu: her araçta, her ziyaretçiye aynı
// uydurma telefon numarası gösteriliyordu. Üstelik "Cep Telefonunu Göster"
// düğmesinin arkasındaydı — kullanıcı gerçek bir iletişim bilgisi açtığını
// sanıyordu.
//
// Aynı blok araç kayıt sihirbazının 4. adımındaki ön izlemede de vardı;
// oradaki yedek isim geliştiricinin kendi adıydı.
//
// -------------------------------------------------------------------------
// TESTİN ASIL DERSİ: DOĞRU HESAPLA BAKMAK
// -------------------------------------------------------------------------
// Sahte telefon `isPublicView` dalında duruyordu. Araç sahibinin hesabıyla
// girip sayfayı denetleyen bir test bu dala HİÇ girmiyor ve "temiz" diyor.
// Bu yüzden aşağıdaki denetim ikinci hesapla, yani gerçek ziyaretçi
// gözüyle yapılıyor.
//
// -------------------------------------------------------------------------
// TELEFON GERÇEK OLSAYDI DA GÖSTERİLMEYECEKTİ
// -------------------------------------------------------------------------
// Plaka, araç sahibini rahatsız etmeye yarayabildiği için pazaryerinden ve
// devir akışından kaldırılmıştı. Telefon numarası çok daha doğrudan bir
// taciz kanalı ve ziyaretçiye açılması KVKK'da ayrı bir rıza gerektiriyor.
// Bu yüzden test yalnızca "sahte numara yok" demiyor; "telefon açma düğmesi
// yok" da diyor.
//
// -------------------------------------------------------------------------
// HİÇBİR YAZMA YOK — CI'DA KOŞUYOR
// =========================================================================

const {
  test, expect, girisYap, girisYapAlici, hamMetin, ornekPin, supabaseIstemcisi,
} = require('./yardimcilar');

// Sabit kodlanmış oldukları için birebir aranabiliyorlar.
const UYDURMA = [
  '532) 123 45 67',        // sahte cep telefonu
  'Mart 2026',             // sabit üyelik tarihi
  'Bireysel Üye',          // üyelik türü henüz yok
  'Tescilli Araç Sahibi',  // sabit isim yedeği
];

const ILETISIM_DUGMELERI = ['Cep Telefonunu', 'Telefonu Göster'];

test.describe('Uydurma veri', () => {
  let pin = null;

  test.beforeAll(async () => {
    pin = await ornekPin();
  });

  test('ziyaretçi gözüyle araç detayında uydurma bilgi yok', async ({ page }) => {
    test.skip(!pin, 'örnek PIN yok');

    // ⚠ İKİNCİ HESAP: aracın sahibi değil. `isPublicView` ancak böyle açılıyor.
    await girisYapAlici(page);
    await page.goto(`/details/${encodeURIComponent(pin)}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('ARAÇ KÜNYESİ')).toBeVisible({ timeout: 20_000 });

    const metin = await hamMetin(page);

    for (const deger of UYDURMA) {
      expect(metin, `araç detayında uydurma bilgi geri gelmiş: "${deger}"`).not.toContain(deger);
    }

    // ⚠ OLMAYAN KOLONLARIN YEDEKLERİ.
    // `spare_key`, `warranty`, `swap`, `is_first_owner` public şemanın
    // HİÇBİR tablosunda yok (canlıda `information_schema` ile doğrulandı).
    // Yani bu değerler "yedek" değil, HER ARAÇTA basılan maskelerdi:
    //   'Yedek Anahtar: Var' · 'Garanti: Bayi Çıkışlı' · 'İlk Sahibi Değilim'
    // Sonuncusu en zararlısıydı — sahibin hiç yapmadığı OLUMSUZ bir
    // mülkiyet beyanı, alıcıya gerçek gibi sunuluyordu.
    for (const maske of ['Yedek Anahtar', 'Bayi Çıkışlı', 'İlk Sahibi Değilim']) {
      expect(
        metin,
        `araç detayı olmayan bir kolondan okuyup "${maske}" basıyor`
      ).not.toContain(maske);
    }

    for (const dugme of ILETISIM_DUGMELERI) {
      expect(metin, `telefon açma düğmesi geri gelmiş: "${dugme}"`).not.toContain(dugme);
    }
  });

  test('sicil özeti kartı gerçek veriyi gösteriyor ve kaydırma boyunca duruyor', async ({ page }) => {
    test.skip(!pin, 'örnek PIN yok');

    await girisYap(page);
    await page.goto(`/details/${encodeURIComponent(pin)}`);
    await page.waitForLoadState('networkidle');

    const ozet = page.locator('div.sticky.top-20').first();
    await expect(ozet).toBeVisible({ timeout: 20_000 });

    // Kartın içeriği gerçek: sicil numarası sayfadaki PIN ile aynı olmalı.
    await expect(ozet).toContainText(pin);

    // ⚠ ASIL DENETİM: kart YAPIŞIK mı?
    // Kart zaten `sticky top-20` sınıfını taşıyordu ama çalışmıyordu, çünkü
    // dış ızgaradaki `items-start` sarmalayıcıyı içeriği kadar kısaltıyor ve
    // `sticky` ögesine hareket alanı bırakmıyordu. Sınıfın varlığını
    // denetlemek bu hatayı YAKALAMAZ; görünürlüğü denetlemek yakalar.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.85));
    await page.waitForTimeout(600);

    const gorunur = await ozet.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    });
    expect(gorunur, 'sicil özeti kartı kaydırınca kayboluyor — sticky çalışmıyor').toBe(true);
  });

  // -------------------------------------------------------------------------
  // UYDURMA KONUM
  //
  // Araç detayı `{vehicle.city || 'Aksaray'}, {vehicle.district || 'Merkez'}`
  // yazıyordu: il/ilçesi olmayan HER araç "Aksaray, Merkez" gösteriyordu.
  // İki ayrı zarar veriyordu:
  //   · Alıcı aracın nerede olduğu konusunda yanıltılıyordu.
  //   · Araç sahibi vitrine çıkaramıyor, "il ilçe eksik" uyarısı alıyor,
  //     sonra detay sayfasında ilçeyi DOLU görüyordu. Uyarı doğruydu,
  //     ekran yalan söylüyordu — hata sanılan şey buydu.
  // -------------------------------------------------------------------------
  test('konumu olmayan araçta uydurma il/ilçe basılmıyor', async ({ page }) => {
    const sb = await supabaseIstemcisi();
    const { data: { user } } = await sb.auth.getUser();

    // Kaydında il/ilçe OLMAYAN bir araç aranıyor; testin öncülü bu.
    const { data: araclar } = await sb
      .from('vehicles')
      .select('pin_code, city, district')
      .eq('user_id', user.id)
      .is('city', null)
      .limit(1);

    const konumsuz = (araclar || [])[0];
    test.skip(!konumsuz, 'konumu boş araç yok — öncül sağlanamıyor');

    await girisYap(page);
    await page.goto(`/details/${encodeURIComponent(konumsuz.pin_code)}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('ARAÇ KÜNYESİ')).toBeVisible({ timeout: 20_000 });

    const metin = await hamMetin(page);
    expect(
      metin,
      'konumu boş araçta uydurma il/ilçe basılıyor'
    ).not.toContain('Aksaray, Merkez');
  });
});

// =========================================================================
// ÇIKIŞSIZ YOL
//
// Vitrin kartı ekranı "araç kaydınızda il/ilçe/açıklama eksik, önce
// tamamlayın" diyordu. Ama kayda ait tek bağlantı `/details/[pin]` idi ve
// o sayfa SALT OKUNUR: kullanıcıya bir şey düzeltmesi söyleniyor,
// düzeltecek yer verilmiyordu.
//
// Bir uyarı, düzeltme yolunu göstermiyorsa uyarı değil engeldir.
// =========================================================================
test.describe('Vitrin çıkışsız yolu', () => {
  test('eksik alan uyarısı düzenleme sayfasına götürüyor', async ({ page }) => {
    const sb = await supabaseIstemcisi();
    const { data: { user } } = await sb.auth.getUser();

    const { data: araclar } = await sb
      .from('vehicles')
      .select('pin_code, city')
      .eq('user_id', user.id)
      .is('city', null)
      .limit(1);

    const eksik = (araclar || [])[0];
    test.skip(!eksik, 'eksik alanlı araç yok — öncül sağlanamıyor');

    await girisYap(page);
    await page.goto(`/garage/${encodeURIComponent(eksik.pin_code)}/vitrin`);
    await expect(page.getByRole('heading', { name: 'Vitrin Kartı', level: 1 }))
      .toBeVisible({ timeout: 20_000 });

    // Uyarının yanında ÇALIŞAN bir düzeltme yolu olmalı.
    const tamamla = page.getByRole('link', { name: 'Eksikleri tamamla' });
    await expect(tamamla, 'eksik alan uyarısı var ama düzeltme yolu yok').toBeVisible();

    await tamamla.click();
    await expect(page.getByRole('heading', { name: 'Araç Kaydını Düzenle', level: 1 }))
      .toBeVisible({ timeout: 20_000 });

    // Eksik alanlar gerçekten düzenlenebiliyor mu?
    // ⚠ `getByLabel` KULLANILMIYOR. Etiketler `.etiket` sınıfıyla CSS'te
    // büyütülüyor ve erişilebilir ad "İL" oluyor; 'İl' araması eşleşmiyor.
    // Bu tuzağa daha önce de düşülmüştü, `hamMetin` yardımcısı onun için
    // var. Denetim yazıma değil ROLE bağlanıyor: iki açılır liste (il, ilçe)
    // ve bir metin alanı (açıklama) olmalı.
    await expect(page.getByRole('combobox'), 'il ve ilçe seçicileri yok').toHaveCount(2);
    await expect(page.locator('textarea'), 'açıklama alanı yok').toHaveCount(1);

    // `hamMetin` HAM DOM metnini veriyor; CSS'in büyütmesi ona yansımıyor.
    // Etiketler kaynakta "İl", "İlçe", "Açıklama" olarak yazılı.
    const formMetni = await hamMetin(page);
    for (const alan of ['İl', 'İlçe', 'Açıklama']) {
      expect(formMetni, `${alan} alanı formda yok`).toContain(alan);
    }

    // ⚠ Sicilin kimliği DEĞİŞTİRİLEMEMELİ: kilometrenin serbestçe
    // düzeltilebilmesi puanlamadaki tutarlılık denetimini anlamsız kılar.
    // Metin araması BURADA YANLIŞ OLURDU: ekrandaki bilgi notu zaten
    // "kilometre" ve "plaka" kelimelerini geçiriyor (niye değiştirilemedik-
    // lerini anlatıyor). Denetim ALAN SAYISINA bakıyor: tek metin girdisi
    // (başlık) olmalı, sayı girdisi hiç olmamalı.
    await expect(page.locator('input'), 'beklenenden fazla girdi alanı var').toHaveCount(1);
    await expect(page.locator('input[type="number"]'), 'km gibi sayısal alan düzenlenebiliyor').toHaveCount(0);
  });
});


// =========================================================================
// KAYNAK TARAMASI — ULAŞILAMAYAN UYDURMA YEDEKLER
//
// -------------------------------------------------------------------------
// NİYE ÇALIŞMA ANI DENETİMİ YETMİYOR
// -------------------------------------------------------------------------
// Yukarıdaki testler sayfayı açıp ekranda uydurma değer arıyor. Ama bir
// yedek ancak GERÇEK VERİ EKSİKKEN devreye giriyor; canlıda 11 aracın
// 11'inde plaka, marka, model, yıl ve puan dolu olduğu için o dallara
// hiç girilmiyor. Yani ekran temiz görünüyor, uydurma değer kodda duruyor
// ve ilk eksik veride sessizce basılıyor.
//
// Bu gerçekten yaşandı. Üç ayrı yerde bulundu:
//
//   OtoKarneScreen  : plate '34 ABC 123', vin 'WBA0M3T2MGM******', year 2026
//   GarageScreen    : plate '34 ABC 123'   <- rozeti besliyordu
//   MaintenanceDialog: plate '34 ABC 123'  <- VERİTABANINA YAZILIYORDU
//
// Sonuncusu en ağırıydı: aynı değişken bakım kaydının `vehicle_plate`
// alanıydı, yani plaka çözülemediğinde kayıt olmayan bir araca yazılacaktı.
//
// `vin` ise hiç var olmayan bir sütundan okunuyordu — yedek "istisna"
// değil, TEK durumdu. `OfficialReportView` aynı tuzağı daha önce temizleyip
// gerekçesini yazmıştı; iki dosya o temizlikten kaçmıştı.
//
// -------------------------------------------------------------------------
// BU DENETİM NE YAPIYOR
// -------------------------------------------------------------------------
// Kaynağı okuyup uydurma sabitleri arıyor. Ulaşılabilir olup olmadıklarına
// bakmıyor — ulaşılamayan uydurma veri de bir tuzak, çünkü onu ulaşılabilir
// yapmak tek satırlık bir değişiklik.
//
// Yorum satırları ve `placeholder` özniteliği DIŞARIDA: yorumlar bu
// temizliğin gerekçesini yazıyor, placeholder ise veri değil, kullanıcıya
// biçim gösteren bir ipucu.
//
// ⚠ VERİTABANINA DOKUNMUYOR, CI'DA KOŞAR.
// =========================================================================

const fs = require('fs');
const path = require('path');

// Bu projede gerçekten ortaya çıkmış uydurma sabitler. Liste "her sahte
// değeri bulur" iddiasında değil; geri gelmelerini engelliyor.
const YASAKLI_SABITLER = [
  { desen: '34 ABC 123',         ne: 'uydurma plaka' },
  { desen: 'WBA0M3T2MGM',        ne: 'uydurma şasi numarası' },
  { desen: 'N20B20A',            ne: 'uydurma motor numarası' },
  { desen: 'AA012345',           ne: 'uydurma ruhsat seri no' },
  { desen: '532) 123 45 67',     ne: 'uydurma cep telefonu' },
  { desen: 'Tescilli Araç Sahibi', ne: 'uydurma araç sahibi adı' },
  { desen: 'Mart 2026',          ne: 'sabit üyelik tarihi' },
  // Karne reklam kartından: her araca basılan sabit teknik özellikler ve
  // dayanağı olmayan doğrulama iddiaları. Canlıda ölçüldü — 11 aracın
  // HİÇBİRİ Sedan değil, 4'ü Dizel, 3'ü Manuel.
  { desen: 'TÜVTÜRK ONAYLI',     ne: 'dayanağı olmayan doğrulama iddiası' },
  { desen: 'e-devlet ruhsat mülkiyeti', ne: 'olmayan entegrasyon iddiası' },

  // -----------------------------------------------------------------------
  // OLMAYAN YAPAY ZEKÂ İDDİALARI
  //
  // ⚠ BU LİSTEDE "AI" YOKTU VE ÖNCEKİ TARAMA TAM BU YÜZDEN KAÇIRDI.
  //
  // Step1'deki ruhsat kartı "AI ONAYLI ROZET" etiketi taşıyor, dosya
  // seçilince de "Ruhsat Fotoğrafı Yüklendi! (AI Güven Rozeti Aktif)"
  // yazıyordu. Depoda yapay zekâ diye bir şey yok: ne model, ne servis
  // çağrısı, ne bağımlılık. Dahası dosya HİÇBİR YERE YÜKLENMİYORDU —
  // `registration_file` yalnızca yeşil onay işaretini çizmek için
  // tutuluyor, sihirbaz bitince atılıyordu.
  //
  // Yani kullanıcı resmî belgesini veriyor, sistem ona güven rozeti
  // kazandığını söylüyor, dosya yok oluyordu. Ürün sahibinin kararıyla alan
  // komple kaldırıldı; bu desenler geri gelmesini engelliyor.
  { desen: 'AI ONAYLI',          ne: 'olmayan yapay zekâ onayı iddiası' },
  { desen: 'AI Güven',           ne: 'olmayan yapay zekâ rozeti iddiası' },
  { desen: 'AI Doğrulama',       ne: 'olmayan yapay zekâ doğrulama katmanı iddiası' },
  { desen: 'yapay zekâ onaylı',  ne: 'olmayan yapay zekâ onayı iddiası' },
  { desen: 'yapay zeka onaylı',  ne: 'olmayan yapay zekâ onayı iddiası' },

  // -----------------------------------------------------------------------
  // OLMAYAN ALTYAPI İDDİALARI
  //
  // `/verify` ekranı şunları yazıyordu: "Değiştirilemez Blokzincir Sicili",
  // "noter onaylı beyanlar ve ekspertiz kayıtları kriptografik imzalarla
  // korunur", "%100 DOĞRULANMIŞ VERİ ALTYAPISI", "Blokzincir Güvenliği".
  //
  // Depo tarandı: blockchain yok, hash zinciri yok, imzalama yok,
  // append-only tetikleyici yok. Bakım kayıtları normal UPDATE/DELETE
  // edilebilir satırlar. package.json'da böyle bir bağımlılık da yok.
  //
  // ⚠ ÜRÜN KENDİ KENDİSİYLE ÇELİŞİYORDU: aynı veri için resmi belge
  // "bağımsız olarak doğrulanmamıştır", kullanım şartları "Sistem
  // beyanınızı doğrulamaz" derken doğrulama ekranı "%100 doğrulanmış"
  // diyordu. Bu, uydurma verinin en pahalı türü: kullanıcı bir güvence
  // satın aldığını sanıyor.
  { desen: 'Blokzincir',         ne: 'olmayan blokzincir altyapısı iddiası' },
  { desen: 'blokzincir',         ne: 'olmayan blokzincir altyapısı iddiası' },
  { desen: 'kriptografik imza',  ne: 'olmayan imzalama altyapısı iddiası' },
  { desen: 'noter onaylı',       ne: 'olmayan noter onayı iddiası' },
  { desen: '%100 DOĞRULANMIŞ',   ne: 'dayanağı olmayan doğrulama iddiası' },
  { desen: '%100 Tescilli',      ne: 'tescil hiçbir yerde sorgulanmıyor' },

  // -----------------------------------------------------------------------
  // SİHİRBAZ: KULLANICININ ADINA YAPILAN BEYANLAR
  //
  // Yukarıdaki sabitler uydurma DEĞER basıyordu; bu grup daha sinsiydi —
  // kullanıcının verdiği cevabın TERSİNİ basıyordu. Üçü de canlı koddaydı:
  //
  //   `warranty === 'Evet'`      seçenekler ['Var','Yok'] -> koşul HİÇ tutmuyor,
  //                              "Var" seçen kullanıcının aracına
  //                              "Garanti süresi dolmuştur" yazılıyordu
  //   `isFirstOwner === 'Evet'`  seçenekler ['İlk Sahibiyim', ...] -> aynı tuzak,
  //                              ön izleme daima "İlk Sahibi Değilim" diyordu
  //   `spareKey || 'Var'`        sihirbazda yedek anahtar alanı HİÇ YOK —
  //                              hiç sorulmadan "yedek anahtarı var" beyanı
  //
  // Ortak kalıp: karşılaştırılan sabit ile seçenek listesi ayrı yerlerde
  // durup birbirinden habersiz kaydı. Bu yüzden desenler `=== 'Evet'`
  // biçiminde değil, ALAN ADIYLA birlikte aranıyor.
  { desen: "warranty === 'Evet'",     ne: 'seçenek listesiyle eşleşmeyen garanti karşılaştırması' },
  { desen: "isFirstOwner === 'Evet'", ne: 'seçenek listesiyle eşleşmeyen sahiplik karşılaştırması' },
  { desen: 'spareKey',                ne: 'sihirbazda alanı olmayan yedek anahtar beyanı' },
  { desen: "warranty || 'Bayi Çıkışlı'", ne: 'uydurma garanti varsayılanı' },
  { desen: "warranty || 'Yok'",       ne: 'cevaplamayan kullanıcıyı "garantisi yok" sayan varsayılan' },
];

// ⚠ 'Bayi Çıkışlı' ve 'İlk Sahibi Değilim' BU LİSTEDE DEĞİL — bilerek.
// İkisi de sihirbazda MEŞRU birer seçenek etiketi (`FIRST_OWNER_OPTIONS`)
// ve Adım 4 ön izlemesinde kullanıcının O AN girdiği formu gösteriyor.
// Statik tarama "seçenek etiketi" ile "uydurma yedek"i ayırt edemiyor;
// listeye eklemek yanlış alarm üretiyordu. Bunlar ziyaretçinin gördüğü
// detay sayfasında aranıyor — aşağıdaki çalışma anı denetiminde.

/** src altındaki tüm kaynak dosyaları. */
function kaynakDosyalari(kok) {
  const cikti = [];
  for (const ad of fs.readdirSync(kok)) {
    const tam = path.join(kok, ad);
    const stat = fs.statSync(tam);
    if (stat.isDirectory()) cikti.push(...kaynakDosyalari(tam));
    else if (/\.(js|jsx)$/.test(ad)) cikti.push(tam);
  }
  return cikti;
}

/**
 * Yorum satırlarını ve `placeholder` özniteliklerini çıkarır.
 * Amaç, gerçekten ÇALIŞAN kodu denetlemek.
 */
function calisanKod(icerik) {
  return icerik
    .replace(/\/\*[\s\S]*?\*\//g, ' ')                  // blok yorumlar
    .replace(/\/\/[^\n]*/g, ' ')                        // satir yorumlari
    .replace(/placeholder\s*=\s*"[^"]*"/g, ' ')         // girdi ipucu (cift tirnak)
    .replace(/placeholder\s*=\s*'[^']*'/g, ' ');        // girdi ipucu (tek tirnak)
}

test.describe('Uydurma veri · kaynak taramasi', () => {
  test('kaynakta ulaşılamayan uydurma yedek yok', () => {
    const kok = path.join(__dirname, '..', 'src');
    const dosyalar = kaynakDosyalari(kok);
    expect(dosyalar.length, 'src altında kaynak dosya bulunamadı').toBeGreaterThan(50);

    const bulgular = [];
    for (const dosya of dosyalar) {
      const kod = calisanKod(fs.readFileSync(dosya, 'utf8'));
      for (const { desen, ne } of YASAKLI_SABITLER) {
        if (kod.includes(desen)) {
          bulgular.push(`${path.relative(kok, dosya)} -> "${desen}" (${ne})`);
        }
      }
    }

    expect(
      bulgular,
      'Kaynakta uydurma yedek değer var. Eksik veride bu değer gerçek sanılıp '
      + 'basılır; birinde veritabanına da yazılıyordu. Yedek uydurmak yerine '
      + 'değeri boş bırakın ve gösterimi atlayın. Bulunanlar: '
      + bulgular.join(' | ')
    ).toEqual([]);
  });
});


// =========================================================================
// TRAMER ÜÇ DURUMLU — "BEYAN YOK" YEŞİL GÖSTERİLEMEZ
//
// `tramerVarMi()` yalnızca `=== VAR` bakıyor; BİLİNMİYOR ile YOK aynı
// `false`'a düşüyor. Araç detayı bu yüzden beyan VERMEMİŞ araca yeşil
// "Hasar Kaydı Yok" + "0 TL" basıyordu.
//
// `tramerHelper.js:36-37` bunu adıyla yasaklamış:
//   "Hiçbiri yoksa BİLİNMİYOR döner — 'hasarsız' DEĞİL. Bilgi yokken temiz
//    beyanı vermek, hatanın ilk hâliyle aynı sonuca çıkar."
//
// ⚠ `vehicles.tramer_status` VARSAYILANI 'Bilmiyorum' ve sihirbaz beyan
// yoksa kasıtlı olarak onu yazıyor — yani beyan vermeyen HER YENİ ARAÇ
// doğrudan bu hataya düşüyordu.
// =========================================================================
test.describe('Tramer beyani', () => {
  test('beyan edilmemis arac ZIYARETCIDE yesil "Hasar Kaydı Yok" gostermiyor', async ({ page }) => {
    const sb = await supabaseIstemcisi();
    const { data } = await sb
      .from('vehicles')
      .select('pin_code, tramer_status, tramer_amount')
      .eq('tramer_status', 'Bilmiyorum')
      .limit(1);

    test.skip(!data || data.length === 0, 'tramer beyanı olmayan araç yok');
    const arac = data[0];

    // Oturum AÇILMIYOR: alıcının gördüğü ekran denetleniyor.
    await page.goto(`/details/${encodeURIComponent(arac.pin_code)}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const metin = await hamMetin(page);

    expect(
      metin,
      'beyan verilmemiş araçta "Hasar Kaydı Yok" yazıyor — alıcıya yapılmamış bir temiz beyanı sunuluyor'
    ).not.toContain('Hasar Kaydı Yok');

    expect(metin, 'üçüncü durum için nötr metin basılmıyor').toContain('Beyan Edilmemiş');
  });
});

// =========================================================================
// SEÇENEK LİSTESİ ↔ KARŞILAŞTIRMA SABİTİ EŞLEŞMESİ
//
// -------------------------------------------------------------------------
// NİYE BU DENETİM VAR — BUGÜN ÜÇ KEZ AYNI HATA BULUNDU
// -------------------------------------------------------------------------
// Sihirbazda seçenek listeleri bir dosyada, o seçeneklerle yapılan
// karşılaştırmalar başka yerde duruyor. İkisi birbirinden habersiz kaydığı
// için ÜÇ ayrı yerde sessiz yanlış beyan üretiyordu:
//
//   `warranty === 'Evet'`       liste ['Var','Yok']            -> koşul HİÇ tutmuyor
//   `isFirstOwner === 'Evet'`   liste ['İlk Sahibiyim', ...]   -> aynı tuzak
//   ARAC_DURUMU_KODU anahtarı   liste ['İkinci El','Sıfır']    -> kayarsa alan kaydedilmez
//
// Hepsinin sonucu aynı: kullanıcı bir şey seçiyor, ürün TERSİNİ yazıyor ya
// da hiç yazmıyor. Üstelik hiçbiri hata vermiyor — sessizce yanlış çalışıyor.
//
// Bu denetim iki dosyayı okuyup sabitleri karşılaştırıyor. Bir etiket
// değiştirilip diğer yer unutulursa test kırmızı yanıyor.
//
// ⚠ VERİTABANINA DOKUNMUYOR, CI'DA KOŞAR.
// =========================================================================

test.describe('Sihirbaz · seçenek ve karşılaştırma eşleşmesi', () => {
  const OKU = (dosya) => calisanKod(
    fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'marketplace', 'create-listing', dosya), 'utf8')
  );

  /** `const AD = ['a', 'b'];` içindeki tırnaklı değerleri çıkarır. */
  function secenekListesi(kod, ad) {
    // ⚠ `new RegExp` ile kurulmuş desen KULLANILMIYOR. Şablon dizgisi içinde
    // `\s` yazmak JS'te kaçış dizisi sayılıyor ve düz `s` harfine dönüşüyor;
    // sonuç "const VEHICLE_STATUSES" yerine "consts+VEHICLE_STATUSES" arayan
    // bozuk bir desen oluyor. Köşeli parantezleri elle bulmak hem daha kısa
    // hem de kaçış hatasına kapalı.
    const bas = kod.indexOf(`const ${ad}`);
    if (bas === -1) return null;
    const ac = kod.indexOf('[', bas);
    const kapa = kod.indexOf(']', ac);
    if (ac === -1 || kapa === -1) return null;
    return [...kod.slice(ac + 1, kapa).matchAll(/'([^']*)'/g)].map((x) => x[1]);
  }

  test('ARAÇ DURUMU eşlemesi seçenek listesiyle birebir', () => {
    const adimKodu = OKU('Step2ListingDetails.jsx');
    const sihirbazKodu = OKU('CreateListingWizard.jsx');

    const secenekler = secenekListesi(adimKodu, 'VEHICLE_STATUSES');
    expect(secenekler, 'VEHICLE_STATUSES bulunamadı — liste adı değişmiş olabilir').toBeTruthy();

    const harita = sihirbazKodu.match(/const\s+ARAC_DURUMU_KODU\s*=\s*\{([^}]*)\}/);
    expect(harita, 'ARAC_DURUMU_KODU bulunamadı — araç durumu artık kaydedilmiyor olabilir').toBeTruthy();

    const anahtarlar = [...harita[1].matchAll(/'([^']+)'\s*:/g)].map((x) => x[1]);

    // İki yönlü: eksik anahtar alanı kaydedilmez yapar, fazla anahtar ise
    // artık var olmayan bir seçeneği eşlemeye çalışıyor demektir.
    expect(
      [...anahtarlar].sort(),
      `ARAC_DURUMU_KODU anahtarları seçenek listesinden kaymış.\n`
      + `  seçenekler: ${JSON.stringify(secenekler)}\n`
      + `  eşleme    : ${JSON.stringify(anahtarlar)}`
    ).toEqual([...secenekler].sort());
  });

  test('ucluBayrak KARŞILAŞTIRMALARI seçenek listeleriyle eşleşiyor', () => {
    const adimKodu = OKU('Step2ListingDetails.jsx');
    const sihirbazKodu = OKU('CreateListingWizard.jsx');

    // Hangi form alanı hangi seçenek listesinden besleniyor.
    const LISTE_ADI = {
      warranty: 'WARRANTY_OPTIONS',
      isFirstOwner: 'FIRST_OWNER_OPTIONS',
    };

    const cagrilar = [...sihirbazKodu.matchAll(
      /ucluBayrak\(\s*formData\.(\w+)\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*\)/g
    )];
    expect(cagrilar.length, 'ucluBayrak çağrısı bulunamadı — alanlar kaydedilmiyor olabilir')
      .toBeGreaterThan(0);

    for (const [, alan, evet, hayir] of cagrilar) {
      const listeAdi = LISTE_ADI[alan];
      expect(listeAdi, `"${alan}" için seçenek listesi tanımlı değil — denetim eksik kalıyor`).toBeTruthy();

      const secenekler = secenekListesi(adimKodu, listeAdi);
      expect(secenekler, `${listeAdi} bulunamadı`).toBeTruthy();

      for (const deger of [evet, hayir]) {
        expect(
          secenekler,
          `ucluBayrak(formData.${alan}, ...) "${deger}" ile karşılaştırıyor ama `
          + `${listeAdi} böyle bir seçenek içermiyor: ${JSON.stringify(secenekler)}. `
          + `Bu karşılaştırma HİÇBİR ZAMAN tutmaz ve alan yanlış kaydedilir.`
        ).toContain(deger);
      }
    }
  });
});

// =========================================================================
// KAPORTA BEYANI — BEYAN EDİLMEYEN PARÇA "ORİJİNAL" DEĞİLDİR
//
// -------------------------------------------------------------------------
// BU PAKETİN EN AĞIR BULGUSU
// -------------------------------------------------------------------------
// Araç detay ekranı ve sihirbazın son onay ekranı, kaporta parçalarının
// durumunu `damageReport[part.id] || 'ORIGINAL'` diye okuyordu. Kaporta
// paneline hiç dokunmamış bir araçta `damage_report` boş ({}) geliyor ve
// sonuç şuydu:
//
//   13 parçanın 13'ü YEŞİL boyanıyor ve alıcıya "Orijinal (13)" yazıyordu.
//
// Yani araç sahibinin HİÇ YAPMADIĞI bir "kaportası tamamen orijinaldir"
// beyanı, alıcıya onun ağzından ve OLUMLU bir iddia olarak sunuluyordu.
// Tramer alanında aynı hata bilerek çözülmüştü ('Hasarsız' -> 'Bilmiyorum');
// kaporta atlanmıştı.
//
// ⚠ ASİMETRİ: sihirbazın GİRİŞ ekranı aynı veri için `|| 'UNSPECIFIED'`
// kullanıyordu. Araç sahibi kendi ekranında GRİ, alıcı aynı araçta YEŞİL
// görüyordu.
//
// ⚠ VERİTABANINA DOKUNMUYOR, CI'DA KOŞAR.
// =========================================================================

test.describe('Uydurma veri · kaporta beyani', () => {
  const KAPORTA_DOSYALARI = [
    'src/components/VehicleDetailsScreen.jsx',
    'src/components/marketplace/create-listing/Step4PreviewAndPublish.jsx',
  ];

  test('beyan edilmeyen parça ORIGINAL varsayılmıyor', () => {
    const bulgular = [];
    for (const göreli of KAPORTA_DOSYALARI) {
      const kod = calisanKod(fs.readFileSync(path.join(__dirname, '..', göreli), 'utf8'));

      // `damageReport[...] || 'ORIGINAL'` kalıbı — parça durumunu okurken
      // olumlu bir beyanı varsayılan yapan tek kalıp bu.
      const sayi = (kod.match(/damageReport\[[^\]]+\]\s*\|\|\s*'ORIGINAL'/g) || []).length;
      if (sayi > 0) {
        bulgular.push(`${göreli} -> ${sayi} yerde beyan edilmeyen parça "Orijinal" sayılıyor`);
      }

      // Bilinmeyen durumun ORIGINAL kovasına atılması da aynı hata.
      if (/else\s+grouped\.ORIGINAL\.push/.test(kod)) {
        bulgular.push(`${göreli} -> bilinmeyen durum ORIGINAL kovasına atılıyor`);
      }
    }

    expect(
      bulgular,
      'Kaporta beyanı olmayan parça "Orijinal" gösteriliyor. Bu, araç sahibinin '
      + 'yapmadığı OLUMLU bir beyanı alıcıya onun ağzından sunmak demek:\n  '
      + bulgular.join('\n  ')
    ).toEqual([]);
  });

  test('BELİRTİLMEMİŞ parçalar listede GÖSTERİLİYOR', () => {
    // Varsayılanı düzeltmek tek başına yetmiyor: `UNSPECIFIED` kovası
    // doluyor ama ekranda karşılığı yoksa parçalar sessizce kayboluyor.
    // Alıcının NEYİN beyan edilmediğini görmesi gerekiyor.
    for (const göreli of KAPORTA_DOSYALARI) {
      const kod = calisanKod(fs.readFileSync(path.join(__dirname, '..', göreli), 'utf8'));
      expect(
        kod.includes('groupedParts.UNSPECIFIED'),
        `${göreli} beyan edilmemiş parçaları hiç listelemiyor — sessizce kayboluyorlar`
      ).toBe(true);
    }
  });
});
