// =========================================================================
// KARNE BÜTÜNLÜĞÜ — bu paketin varlık sebebi
//
// Karne, alıcının araca güvenmek için baktığı belge. Geliştirme sırasında
// orada şu kusurlar bulundu:
//
//   1. Hasarlı araç "Kayıt Bulunmamaktadır (Temiz)" diye beyan ediliyordu.
//      Sebep: durum dört farklı yazımla tutuluyordu, kod birini tanıyordu.
//      10 aracın 4'ü etkilenmişti — 65.756 TL hasarı olan araç dahil.
//   2. Sorgulanmadığı hâlde TÜVTÜRK, haciz/rehin ve UYAP sonucu basılıyordu.
//   3. Olmayan kolonlardan uydurma VIN ve motor numarası üretiliyordu.
//   4. Tarih yoksa "12/12/2029", renk yoksa "Metalik Siyah" yazılıyordu.
//   5. "Beyan yok" satırı YEŞİL ONAY TİKİYLE basılıyordu.
//
// Hepsi düzeltildi. Bu paket geri gelmelerini engelliyor. Buradaki bir
// testin başarısız olması, belgenin yanlış beyan verdiği anlamına gelir —
// yani en ciddi hata sınıfı.
// =========================================================================

const {
  test,
  expect,
  belgeSekmesiniAc,
  hamMetin,
  ORNEK_PIN,
  pinBul,
} = require('./yardimcilar');

// Belgeye ASLA girmemesi gereken ifadeler. Her biri bir kusurun izi.
const YASAKLI_IFADELER = [
  // Sorgulanmayan kurum beyanları
  'Hak Mahrumiyeti',
  'UYAP',
  'Aranma İhbarı',
  'MERKEZİ VERİ TABANI',
  // Olmayan kolonlardan üretilen uydurma kimlik değerleri
  'WBA0M3T2MGM',
  'N20B20A',
  'AA012345',
  'M1 / D Segment',
  // Veri yokken uydurulan teknik özellikler
  'Benzin / Hibrit',
  'Otomatik vites',
  'Metalik Siyah',
  // Doğrulama iddiaları
  'AutoID Verified',
  'doğrulanmış dökümüdür',
  'e-devlet tescil',
];

test.describe('Belge, sorgulamadığı hiçbir şeyi beyan etmiyor', () => {
  test('yasaklı ifadelerin hiçbiri belgede yok', async ({ page }) => {
    await page.goto(`/karne/${ORNEK_PIN}`);
    await page.waitForLoadState('networkidle');
    await belgeSekmesiniAc(page);

    const metin = await hamMetin(page);
    const kalan = YASAKLI_IFADELER.filter((i) => metin.includes(i));
    expect(kalan, 'belgede kalan yasaklı ifadeler').toEqual([]);
  });

  test('her bulgu satırı kaynağını yazıyor', async ({ page }) => {
    await page.goto(`/karne/${ORNEK_PIN}`);
    await page.waitForLoadState('networkidle');
    await belgeSekmesiniAc(page);

    // DİKKAT: innerText kullanılmaz. Kaynak etiketleri `uppercase` sınıfı
    // taşıdığı için innerText onları "ARAÇ SAHİBİ BEYANI" diye döndürür ve
    // arama başarısız olur. Bu tuzağa geliştirme sırasında iki kez düşüldü.
    const etiketler = await page.evaluate(() =>
      [...document.querySelectorAll('#official-report-print-zone span')]
        .filter((e) => (e.className || '').includes('border-slate-300'))
        .map((e) => e.textContent.trim())
    );

    // Beş bulgu satırı, beş etiket.
    expect(etiketler.length, 'kaynak etiketi sayısı').toBe(5);
    expect(etiketler).toContain('Hesaplandı');
    expect(etiketler).toContain('Araç sahibi beyanı');
    expect(etiketler).toContain('Belgeli');
  });

  test('belge sınırlarını açıkça yazıyor', async ({ page }) => {
    await page.goto(`/karne/${ORNEK_PIN}`);
    await page.waitForLoadState('networkidle');
    await belgeSekmesiniAc(page);

    const metin = await hamMetin(page);
    expect(metin).toContain('BELGENİN KAPSAMI VE SINIRLARI');
    // Belgenin ne OLMADIĞINI söylemesi, güvenilirliğinin parçası.
    expect(metin).toContain('eksper kuruluşu değildir');
    expect(metin).toContain('yapmamaktadır');
  });
});

test.describe('Hasar beyanı doğru basılıyor', () => {
  // Bu dört araç veritabanında hasar kaydı taşıyor. Kusurun ilk hâlinde
  // hepsi karnede "temiz" beyan ediliyordu.
  //
  // Araçlar PLAKAYLA tanımlanıyor, PIN'le değil: PIN değişken bir değer ve
  // yenilendiğinde bu liste sessizce geçersizleşiyordu. Plaka birincil
  // anahtar; PIN çalışma anında pinBul() ile çözülüyor.
  const HASARLI_ARACLAR = ['41IHH434', '34KNA929', '34FB1907', '01ONR0001'];

  for (const plaka of HASARLI_ARACLAR) {
    test(`${plaka} — hasar kaydı "temiz" diye beyan edilmiyor`, async ({ page }) => {
      const pin = await pinBul(plaka);
      await page.goto(`/karne/${pin}`);
      await page.waitForLoadState('networkidle');
      await belgeSekmesiniAc(page);

      const metin = await hamMetin(page);
      expect(metin, `${plaka} hasarlı ama belgede "Kayıt Var" yok`).toContain('Kayıt Var');
      expect(metin, `${plaka} hasarlı olduğu hâlde "temiz" beyan ediliyor`)
        .not.toContain('Kayıt Bulunmamaktadır (Temiz)');
    });
  }
});

test.describe('Kilometre tutarlılığı gerçekten hesaplanıyor', () => {
  test('kilometresi geriye giden araçta tutarsızlık bildiriliyor', async ({ page }) => {
    // 11ASD1231: 5 kayıt, kilometre 151.877 km geriye gidiyor.
    // Belge bu araç için eskiden "Kilometre Verisi Tutarlı" basıyordu —
    // yani sabit metin gerçeğin tam tersini beyan ediyordu.
    await page.goto(`/karne/${await pinBul('11ASD1231')}`);
    await page.waitForLoadState('networkidle');
    await belgeSekmesiniAc(page);

    const metin = await hamMetin(page);
    expect(metin).toContain('Kilometre Tutarlılığı');
    expect(metin, 'geriye giden km tutarsız bildirilmeli').toContain('Tutarsız');
  });

  test('tek kayıtlı araçta "tutarlı" iddiası edilmiyor', async ({ page }) => {
    // Tek kayıtla karşılaştırma yapılamaz. "Tutarlı" demek, yapılmamış bir
    // doğrulamayı iddia etmek olur.
    await page.goto(`/karne/${await pinBul('34FB1907')}`);
    await page.waitForLoadState('networkidle');
    await belgeSekmesiniAc(page);

    const metin = await hamMetin(page);
    expect(metin).toContain('Kilometre Tutarlılığı');
    expect(metin, 'tek kayıtta tutarlılık iddia edilmemeli').not.toContain('Tutarlı (1 kayıt');
  });
});

test.describe('Veri yokken uydurma değer basılmıyor', () => {
  test('boş alanlar "Beyan edilmemiş" gösteriyor', async ({ page }) => {
    // 06ONR97: yakıt, vites ve renk alanları veritabanında BOŞ.
    // Belge eskiden bu araç için üç uydurma teknik özellik basıyordu.
    await page.goto(`/karne/${await pinBul('06ONR97')}`);
    await page.waitForLoadState('networkidle');
    await belgeSekmesiniAc(page);

    const metin = await hamMetin(page);
    expect(metin, 'boş alan dürüstçe yokluk göstermeli').toContain('Beyan edilmemiş');
    for (const uydurma of ['Benzin / Hibrit', 'Otomatik vites', 'Metalik Siyah']) {
      expect(metin, `"${uydurma}" uydurma varsayılanı geri gelmiş`).not.toContain(uydurma);
    }
  });
});

test.describe('KVKK: plaka ziyaretçiye gösterilmiyor', () => {
  test('çıkışta belge plaka yerine KVKK notu basıyor', async ({ page }) => {
    await page.goto(`/karne/${ORNEK_PIN}`);
    await page.waitForLoadState('networkidle');
    await belgeSekmesiniAc(page);

    const metin = await hamMetin(page);
    const { ORNEK_PLAKA } = require('./yardimcilar');
    expect(metin, 'plaka kişisel veri; ziyaretçiye gösterilmemeli').not.toContain(ORNEK_PLAKA);
    expect(metin).toContain('KVKK kapsamında paylaşılmaz');
  });
});
