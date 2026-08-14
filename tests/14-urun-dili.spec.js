// =========================================================================
// 14 · ÜRÜN DİLİ — ARAÇ FİYATI HİÇBİR YERDE GÖRÜNMEMELİ
//
// -------------------------------------------------------------------------
// NİYE BU PAKET VAR — HUKUKİ
// -------------------------------------------------------------------------
// Ürüne (araca) ait herhangi bir fiyat gösterilmesi, platformu satış sitesi
// konumuna sokuyor. Bu ürün bir dijital taşıt sicili; satış platformu
// DEĞİL. Karar ürün sahibine ait ve gerekçesi mevzuat.
//
// Bu, gözle bakınca kolayca kaçan türden bir kural: bir kart bileşenine
// eklenen tek bir `{item.price}` satırı, yüzlerce araçta yüzlerce fiyat
// demek. Sessizce geri gelmemesi için teste bağlandı.
//
// -------------------------------------------------------------------------
// AYRIM: BİZİM HİZMET ÜCRETLERİMİZ YASAK DEĞİL
// -------------------------------------------------------------------------
// "Öne Çıkar ₺250" gibi tutarlar BİZİM sattığımız hizmetin bedeli, aracın
// değil. Onlar `/packages` ve paywall ekranlarında görünmeye devam ediyor.
// Bu paket yalnızca ARAÇ tutarlarını denetliyor; o yüzden testler araç
// listelerine ve vitrin kartına bakıyor, ücret ekranlarına değil.
//
// -------------------------------------------------------------------------
// HİÇBİR YAZMA YOK — CI'DA KOŞUYOR
// =========================================================================

const { test, expect, girisYap, hamMetin } = require('./yardimcilar');

// Araç tutarı olabilecek kalıplar. "₺450.000" ya da "450.000 TL".
const TUTAR_KALIBI = /(₺\s?\d{1,3}(\.\d{3})+)|(\d{1,3}(\.\d{3})+\s?TL\b)/;

test.describe('Ürün dili', () => {

  test('pazaryerinde araç tutarı yok', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const metin = await hamMetin(page);
    const eslesme = metin.match(TUTAR_KALIBI);

    expect(
      eslesme,
      `Pazaryerinde araç tutarı görünüyor: "${eslesme?.[0]}". Ürüne ait fiyat, ` +
      `platformu satış sitesi konumuna sokuyor.`
    ).toBeNull();
  });

  // Yasaklı kelimeler ekranlara sızmaya devam ediyordu: her turda birkaçı
  // daha bulundu ("Tescil / İlan No", "Satıcıya Mesaj Gönder", karne
  // kartındaki "Pazaryeri Satış Operasyonları"). Tek tek aramak yerine
  // ekranları tarayan bir test daha güvenilir.
  const YASAKLI = ['İlan', 'Satıcı', 'Satış', 'satıcı'];

  for (const yol of ['/', '/devir', '/verify']) {
    test(`${yol} — satış sitesi dili yok`, async ({ page }) => {
      await page.goto(yol);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      const metin = await hamMetin(page);
      for (const kelime of YASAKLI) {
        expect(metin, `${yol} sayfasında "${kelime}" geçiyor`).not.toContain(kelime);
      }
    });
  }

  test('pazaryerinde fiyat süzgeci ve değerleme kalmadı', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const metin = await hamMetin(page);
    // Bu üçü hem çalışmıyordu hem de satış sitesi izlenimi veriyordu.
    expect(metin, '"Fiyatı Düşenler" süzgeci geri gelmiş').not.toContain('Fiyatı Düşenler');
    expect(metin, '"Fiyat Öğren" geri gelmiş').not.toContain('Fiyat Öğren');
    expect(metin, 'AI Değerleme geri gelmiş').not.toContain('AI Değerleme');
  });

  test.describe('Oturum açıkken', () => {
    test.beforeEach(async ({ page }) => {
      await girisYap(page);
    });

    test('garajda araç tutarı yok', async ({ page }) => {
      await page.goto('/garage');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const metin = await hamMetin(page);
      const eslesme = metin.match(TUTAR_KALIBI);
      expect(eslesme, `Garajda araç tutarı görünüyor: "${eslesme?.[0]}"`).toBeNull();
    });

    test('vitrindeki araçlarımda tutar yok', async ({ page }) => {
      await page.goto('/my-listings');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const metin = await hamMetin(page);
      const eslesme = metin.match(TUTAR_KALIBI);
      expect(eslesme, `Vitrin listesinde araç tutarı görünüyor: "${eslesme?.[0]}"`).toBeNull();
    });

    test('vitrin kartında bedel alanı yok', async ({ page }) => {
      // Rotaya DOĞRUDAN gidiliyor. Araç seçiciden geçmek kırılgandı: araç
      // bir kez vitrine çıkınca seçicide "Zaten vitrinde" ile devre dışı
      // kalıyor ve test ilerleyemiyordu.
      await page.goto('/garage');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Kartın "Detay" bağlantısından PIN'i öğrenip vitrin rotasına gidiyoruz.
      const kart = page.locator('.grid > div').filter({ hasText: 'Skor:' }).first();
      await kart.getByRole('button', { name: 'Detay', exact: true }).click();
      await page.waitForURL('**/details/**', { timeout: 20_000 });
      const pin = decodeURIComponent(page.url().split('/details/')[1] || '');
      expect(pin, 'PIN okunamadı').toBeTruthy();

      await page.goto(`/garage/${encodeURIComponent(pin)}/vitrin`);
      // `networkidle` YETMİYOR: sayfa kendi verisini istemci tarafında
      // çekiyor ve o bitmeden gövdede yalnızca başlık/altbilgi oluyor.
      // Başlığı beklemek içeriğin geldiğini garanti ediyor.
      await expect(page.getByRole('heading', { name: 'Vitrin Kartı', level: 1 }))
        .toBeVisible({ timeout: 20_000 });

      // Bedel girilecek bir alan OLMAMALI.
      await expect(page.getByLabel(/bedel|fiyat/i), 'vitrin kartında bedel alanı var').toHaveCount(0);

      // Sayfanın ne yaptığını söylediğini de denetliyoruz: sessizce alanı
      // kaldırmak, kullanıcıya "fiyat girmeyi unuttum" hissi verirdi.
      const metin = await hamMetin(page);
      expect(metin, 'bedel gösterilmediği açıklanmıyor').toContain('Bedel bilgisi yer almaz');
    });

    test('garaj ürün diliyle uyumlu: satış/ilan kelimeleri yok', async ({ page }) => {
      await page.goto('/garage');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const metin = await hamMetin(page);
      for (const yasak of ['Satışa çıkar', 'Satışta', 'İlan Ver', 'İlan Oluştur']) {
        expect(metin, `garajda "${yasak}" geçiyor`).not.toContain(yasak);
      }
      // Yerine geçen dil duruyor mu?
      expect(metin, 'vitrin dili yok').toContain('Vitrine çıkar');
    });
  });
});
