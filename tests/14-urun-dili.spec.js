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

const { test, expect, girisYap, hamMetin, ornekPin, izgaraYerlessin } = require('./yardimcilar');

// Araç tutarı olabilecek kalıplar. "₺450.000" ya da "450.000 TL".
const TUTAR_KALIBI = /(₺\s?\d{1,3}(\.\d{3})+)|(\d{1,3}(\.\d{3})+\s?TL\b)/;

test.describe('Ürün dili', () => {

  test('pazaryerinde araç tutarı yok', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await izgaraYerlessin(page);

    const metin = await hamMetin(page);
    const eslesme = metin.match(TUTAR_KALIBI);

    expect(
      eslesme,
      `Pazaryerinde araç tutarı görünüyor: "${eslesme?.[0]}". Ürüne ait fiyat, ` +
      `platformu satış sitesi konumuna sokuyor.`
    ).toBeNull();
  });

  // =========================================================================
  // YASAKLI KELİME TARAMASI — İKİ KUSURU VARDI, İKİSİ DE DÜZELTİLDİ
  // -------------------------------------------------------------------------
  // Yasaklı kelimeler ekranlara sızmaya devam ediyordu: her turda birkaçı
  // daha bulundu ("Tescil / İlan No", "Satıcıya Mesaj Gönder", karne
  // kartındaki "Pazaryeri Satış Operasyonları"). Tek tek aramak yerine
  // ekranları tarayan bir test daha güvenilir. Ama tarama iki yerden
  // sızdırıyordu:
  //
  // 1. KAPSAM: yalnızca ÜÇ rota ziyaret ediliyordu (/, /devir, /verify).
  //    Uygulamada 25 rota var. Kapsanmayanlar arasında HUKUKİ SAYFALAR da
  //    vardı ve orada tam bir "İlanlar" bölümü duruyordu:
  //      "İlan içeriğinden ilan sahibi sorumludur..."
  //      "Vitrin dopingi ilanın görünürlüğünü artırır; satış garantisi vermez."
  //    Üstelik o sayfa sitemap'te ve indekslenmeye açık. Bir uyuşmazlıkta
  //    karşı tarafın göstereceği ilk belge ürünün KENDİ sözleşmesi olurdu.
  //
  // 2. BÜYÜK/KÜÇÜK HARF: liste yalnızca 'İlan', 'Satıcı', 'Satış' ve
  //    'satıcı' arıyordu. Küçük harfli 'ilan' ve 'satış' listede YOKTU;
  //    "standart ilan limiti" ya da "ilan vermek için" gibi metinler o rota
  //    kapsansa bile görünmeden geçerdi.
  //
  // ⚠ TÜRKÇE 'i' AYRIMI TARAMAYI KURTARIYOR: 'ilan' NOKTALI i ile aranıyor.
  // "kullanılan", "yapılan", "karşılaştırılan" gibi çok geçen kelimeler
  // NOKTASIZ ı taşıdığı için ("ılan") eşleşmiyorlar. Bu yüzden düz metin
  // araması burada güvenli.
  // =========================================================================
  const YASAKLI = [
    'İlan', 'ilan', 'İLAN',
    'Satış', 'satış', 'SATIŞ',
    'Satıcı', 'satıcı', 'SATICI',
  ];

  // Oturum GEREKTİRMEYEN rotalar. Hukuki sayfalar bilhassa burada:
  // indekslenen metinde ürün dili ihlali en pahalı olan yer orası.
  const HERKESE_ACIK = [
    // `/vitrin` EKLENDİ: yeni herkese açık rota ve anasayfayla AYNI
    // kartları basıyor. Bekçiye alınmasaydı yasak kelime taraması
    // sitenin araç listeleyen ikinci sayfasını hiç görmezdi.
    '/', '/vitrin', '/verify', '/devir', '/login', '/register',
    '/gizlilik', '/kullanim-sartlari', '/kvkk', '/packages',
  ];

  for (const yol of HERKESE_ACIK) {
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
    await izgaraYerlessin(page);

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

    // Oturum arkasındaki rotalar. Eskiden HİÇBİRİ yasaklı kelime taramasına
    // girmiyordu; oysa ürün dilinin en çok kaydığı yer tam da burası —
    // araç kayıt sihirbazı, vitrin listesi ve karne ekranı.
    const OTURUMLU = [
      '/garage', '/my-listings', '/favorilerim', '/mesajlar',
      '/account', '/query-history', '/dashboard', '/add-vehicle/step1',
      // ⚠ TEKLİF EKRANI BU LİSTEDE OLMAK ZORUNDA. Sigorta dili "fiyat",
      // "teklif karşılaştırma", "en ucuz poliçe" gibi ifadelere doğal
      // olarak kayıyor ve ileride bir ortağın tanıtım metni buraya
      // kopyalanabilir. Ürünle ilgili tutar görünen platform satış sitesi
      // konumuna geçiyor — bu ekran o riskin en yüksek olduğu yer.
      '/insurance-offer',
    ];

    for (const yol of OTURUMLU) {
      test(`${yol} — satış sitesi dili yok`, async ({ page }) => {
        await page.goto(yol);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1800);

        const metin = await hamMetin(page);
        for (const kelime of YASAKLI) {
          expect(metin, `${yol} sayfasında "${kelime}" geçiyor`).not.toContain(kelime);
        }
      });
    }

    // PIN'e bağlı sayfalar. Karne ekranı bilhassa önemli: sekme adı
    // "İlan Paylaşım Reklam Kartı" idi ve rehberi kullanıcıya açıkça
    // "ilan portallarına yükleyin" diyordu — hiçbir test oraya uğramıyordu.
    test('PIN sayfalarında satış sitesi dili yok', async ({ page }) => {
      const pin = await ornekPin();
      test.skip(!pin, 'örnek PIN yok');

      for (const yol of [`/karne/${pin}`, `/details/${pin}`, `/verify/${pin}`]) {
        await page.goto(yol);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1800);

        const metin = await hamMetin(page);
        for (const kelime of YASAKLI) {
          expect(metin, `${yol} sayfasında "${kelime}" geçiyor`).not.toContain(kelime);
        }
      }
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
