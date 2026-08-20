// =========================================================================
// 10 · ÜST MENÜ DAVRANIŞI
//
// -------------------------------------------------------------------------
// NİYE BU PAKET VAR
// -------------------------------------------------------------------------
// Hesap açılır menüsü yalnızca kendi düğmesine tekrar tıklayınca kapanıyordu.
// Sayfanın başka bir yerine tıklamak onu açık bırakıyordu; kullanıcı menüyü
// kapatmak için onu "kovalamak" zorundaydı. Esc de çalışmıyordu.
//
// Bu, gözle bakınca fark edilmeyen ama her oturumda yaşanan türden bir kusur:
// kimse hata bildirmiyor, sadece ürün hantal hissettiriyor. Sessizce geri
// gelmemesi için teste bağlandı.
//
// Ayrıca menü metinleri ürün diliyle birlikte değişti ("Ücretsiz İlan Ver" ->
// "Araç Kaydet", "Karne Sorgula" -> "Araç Devir"). Bunlar ürün kararları;
// yanlışlıkla geri alınırlarsa burada görünür.
//
// "Araç Kaydet" düğmesinin açılır paneli de kaldırıldı. Panel iki kart
// gösteriyordu ama ikincisi yalnızca /garage'a gidiyordu ve sadece fareyle
// açılabiliyordu. Testler artık panelin GERİ GELMEDİĞİNİ de denetliyor.
//
// -------------------------------------------------------------------------
// HİÇBİR YAZMA YOK — CI'DA KOŞUYOR
// -------------------------------------------------------------------------
// Yalnızca gezinme ve tıklama. Veritabanına dokunmuyor, artık bırakmıyor.
// =========================================================================

const { test, expect, girisYap } = require('./yardimcilar');

test.describe('Üst menü', () => {

  test('menü ürün diliyle uyumlu: Araç Devir ve Araç Kaydet', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const gezinme = page.getByRole('navigation', { name: 'Ana menü' });
    await expect(gezinme.getByRole('link', { name: 'Araç Devir' })).toBeVisible();

    // "Karne Sorgula" menüden kalktı: anasayfa kartında, footer'da ve /devir
    // sayfasının altında zaten duruyor.
    await expect(gezinme.getByRole('link', { name: 'Karne Sorgula' })).toHaveCount(0);

    // "Ücretsiz" ARTIK YANLIŞ olurdu: ilk araç ücretsiz ama ikinci ve
    // sonrası Ek Araç Kaydı gerektiriyor.
    await expect(page.getByRole('link', { name: 'Araç Kaydet' }).first()).toBeVisible();
    await expect(page.locator("text=Ücretsiz İlan Ver")).toHaveCount(0);
  });

  test('"Araç Kaydet" tek düğme — üzerine gelince panel açılmıyor', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const dugme = page.getByRole('link', { name: 'Araç Kaydet' }).first();
    await expect(dugme).toBeVisible();

    // Eskiden burada iki kartlı bir panel açılıyordu. İkinci kart
    // ("Aracımı Satışa Çıkar") yalnızca /garage'a gidiyordu — bir seçim
    // değil, bir yönlendirmeydi. Üstelik yalnızca fareyle ulaşılabiliyordu:
    // klavye ve dokunmatik kullanıcı o karta hiç erişemiyordu.
    await dugme.hover();

    await expect(page.locator('text=Aracımı Satışa Çıkar')).toHaveCount(0);
    await expect(page.locator('text=Garaja Git')).toHaveCount(0);
    await expect(page.locator('text=Kayda Başla')).toHaveCount(0);
  });

  test('"Araç Kaydet" ziyaretçiyi girişe götürüyor', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('link', { name: 'Araç Kaydet' }).first().click();
    await page.waitForURL('**/login', { timeout: 15_000 });
  });

  test('"Araç Kaydet" üyeyi doğrudan sihirbaza götürüyor', async ({ page }) => {
    await girisYap(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Ara adım YOK: düğme tek tıkta 1. adımı açıyor. Panel döneminde
    // kullanıcı önce paneli bekliyor, sonra karta tıklıyordu.
    await page.getByRole('link', { name: 'Araç Kaydet' }).first().click();
    await page.waitForURL('**/add-vehicle/step1', { timeout: 20_000 });
  });

  test('/devir ziyaretçiye giriş çağrısı gösteriyor', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('navigation', { name: 'Ana menü' })
      .getByRole('link', { name: 'Araç Devir' }).click();

    // waitForURL kullanılıyor: `networkidle` istemci tarafı gezinme
    // başlamadan çözülebiliyor ve URL hâlâ eski sayfayı gösteriyordu.
    await page.waitForURL('**/devir', { timeout: 15_000 });

    // Devir oturum gerektiriyor. Sayfa 404 vermiyor, boş da kalmıyor —
    // ne yapılması gerektiğini söylüyor.
    //
    // Tek atışlık `textContent()` KULLANILMAZ. `/devir` sayfası
    // `yukleniyor = true` ile başlıyor ve `supabase.auth.getUser()`
    // çözülene kadar yükleyici gösteriyor; `networkidle` o çağrı bitmeden
    // çözülebiliyor. Tam paket koşumunda test bu yüzden bir kez düştü,
    // tek başına koşunca geçti. `expect(...).toBeVisible()` yeniden
    // deneyerek beklediği için asenkron oturum kontrolünü doğru bekliyor.
    await expect(
      page.getByText('Devir işlemleri için oturum açmanız gerekiyor')
    ).toBeVisible({ timeout: 15_000 });
  });

  test('/devir oturum açmış kullanıcıya iki tarafı da gösteriyor', async ({ page }) => {
    await girisYap(page);
    await page.goto('/devir');

    // Aynı gerekçe: oturum kontrolü bitene kadar yükleyici duruyor.
    await expect(page.getByText('Aracımı devretmek istiyorum'), 'satıcı tarafı yok')
      .toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Aracı devralacağım'), 'alıcı tarafı yok')
      .toBeVisible({ timeout: 15_000 });
  });

  // -------------------------------------------------------------------------
  // DEVİR KODU GİRİLECEK YER — BULUNAN MANTIK HATASI
  //
  // Satıcı devir kodu üretiyordu ama alıcı tarafında yalnızca PLAKA
  // girilebilen bir form vardı. Elindeki kodu yazacak yer yoktu: kullanıcı
  // önce plakayı yazmak, sonra açılan diyalogda "Devir kodum var" seçeneğini
  // bulmak zorundaydı. Kod, kendisi bir kimlik belgesiyken ikinci bir
  // kimliğin (plakanın) arkasına saklanmıştı.
  //
  // `devir_onizleme(kod)` aracı zaten kodun kendisinden çözüyor; plakaya
  // hiç ihtiyaç yok. Eksik olan tek şey giriş alanıydı.
  // -------------------------------------------------------------------------
  test.describe('Devir kodu girişi', () => {
    test.beforeEach(async ({ page }) => {
      await girisYap(page);
      await page.goto('/devir');
      await expect(page.getByLabel('Devir kodum var')).toBeVisible({ timeout: 15_000 });
    });

    test('alıcı tarafında kod alanı var ve plakadan önce geliyor', async ({ page }) => {
      const kodAlani = page.locator('#devir-kodu');
      const plakaAlani = page.locator('#devir-plaka');
      await expect(kodAlani).toBeVisible();
      await expect(plakaAlani).toBeVisible();

      // Kod elinde olan kullanıcı önce onu görmeli: plaka ikincil yol.
      const kodKutu = await kodAlani.boundingBox();
      const plakaKutu = await plakaAlani.boundingBox();
      expect(kodKutu.y, 'kod alanı plakanın altında kalmış').toBeLessThan(plakaKutu.y);
    });

    test('bozuk biçimli kod SUNUCUYA GİTMEDEN reddediliyor', async ({ page }) => {
      // Devir kodunda kaba kuvvet sayacı var; elle yazarken yapılan biçim
      // hatasının boşuna bir deneme sayılmaması gerekiyor.
      let istekGitti = false;
      page.on('request', (r) => {
        if (r.url().includes('/rpc/devir_onizleme')) istekGitti = true;
      });

      await page.locator('#devir-kodu').fill('ABC');
      await page.getByRole('button', { name: 'Kodu Kullan' }).click();

      await expect(page.getByText(/8 karakter olmalı/)).toBeVisible();
      expect(istekGitti, 'bozuk kod sunucuya gönderildi — deneme sayacını boşa harcıyor').toBe(false);
    });

    test('var olmayan kod anlaşılır hata veriyor', async ({ page }) => {
      await page.locator('#devir-kodu').fill('DV-ZZZZ-ZZZZ');
      await page.getByRole('button', { name: 'Kodu Kullan' }).click();
      await page.waitForTimeout(3000);

      // Ekran boş kalmıyor, ham hata da basmıyor.
      const govde = await page.locator('body').textContent();
      expect(govde).toMatch(/geçerli değil|süresi|bulunamadı/i);
    });
  });

  test.describe('Hesap menüsü', () => {
    test.beforeEach(async ({ page }) => {
      await girisYap(page);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    });

    test('başlıkta ham e-posta değil kimlik kartı var', async ({ page }) => {
      await page.locator('button[aria-controls="hesap-menusu"]').click();
      await page.waitForTimeout(400);

      const menu = page.locator("text=Tescilli Taşıtlarım (Garaj)").first();
      await expect(menu, 'hesap menüsü açılmadı').toBeVisible();

      const govde = await page.locator('body').textContent();
      // Üyelik durumu görünmeli: garaj ekranından kaldırılan profil kartının
      // taşıdığı bilgi buraya taşındı, kaybolmadı.
      expect(govde, 'üyelik bilgisi menüde yok').toMatch(/Standart Üyelik|Premium Üyelik/);
    });

    test('dışarı tıklayınca kapanıyor', async ({ page }) => {
      const dugme = page.locator('button[aria-controls="hesap-menusu"]');
      await dugme.click();
      await expect(page.locator("text=Tescilli Taşıtlarım (Garaj)").first()).toBeVisible();

      // Menünün DIŞINDA bir yere tıkla.
      // ⚠ ESKİDEN `h1`E TIKLANIYORDU. Koyu kahraman bloğu kaldırılınca
      // anasayfanın `h1`i `sr-only` oldu (görünmez ama hiyerarşi için
      // duruyor) ve tıklanamaz hâle geldi: "Element is outside of the
      // viewport". Testin niyeti belirli bir öge değil, MENÜ DIŞI bir
      // nokta; o yüzden artık koordinata tıklanıyor — sol kenar, başlık
      // şeridinin altı, hesap menüsü ise sağ üstte.
      await page.mouse.click(20, 400);

      await expect(
        page.locator("text=Tescilli Taşıtlarım (Garaj)"),
        'dışarı tıklandığı hâlde menü açık kaldı'
      ).toHaveCount(0);
    });

    test('Esc ile kapanıyor', async ({ page }) => {
      const dugme = page.locator('button[aria-controls="hesap-menusu"]');
      await dugme.click();
      await expect(page.locator("text=Tescilli Taşıtlarım (Garaj)").first()).toBeVisible();

      await page.keyboard.press('Escape');

      await expect(
        page.locator("text=Tescilli Taşıtlarım (Garaj)"),
        'Esc menüyü kapatmadı'
      ).toHaveCount(0);
    });
  });
});
