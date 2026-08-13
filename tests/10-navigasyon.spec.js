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
    await page.waitForTimeout(500);

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
    await page.waitForLoadState('networkidle');

    // Devir oturum gerektiriyor. Sayfa 404 vermiyor, boş da kalmıyor —
    // ne yapılması gerektiğini söylüyor.
    const govde = await page.locator('body').textContent();
    expect(govde).toContain('Devir işlemleri için oturum açmanız gerekiyor');
  });

  test('/devir oturum açmış kullanıcıya iki tarafı da gösteriyor', async ({ page }) => {
    await girisYap(page);
    await page.goto('/devir');
    await page.waitForLoadState('networkidle');

    const govde = await page.locator('body').textContent();
    expect(govde, 'satıcı tarafı yok').toContain('Aracımı devretmek istiyorum');
    expect(govde, 'alıcı tarafı yok').toContain('Aracı devralacağım');
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
      await page.waitForTimeout(300);
      await expect(page.locator("text=Tescilli Taşıtlarım (Garaj)").first()).toBeVisible();

      // Menünün DIŞINDA bir yere tıkla: sayfa başlığı.
      await page.locator('h1').first().click({ force: true });
      await page.waitForTimeout(400);

      await expect(
        page.locator("text=Tescilli Taşıtlarım (Garaj)"),
        'dışarı tıklandığı hâlde menü açık kaldı'
      ).toHaveCount(0);
    });

    test('Esc ile kapanıyor', async ({ page }) => {
      const dugme = page.locator('button[aria-controls="hesap-menusu"]');
      await dugme.click();
      await page.waitForTimeout(300);
      await expect(page.locator("text=Tescilli Taşıtlarım (Garaj)").first()).toBeVisible();

      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);

      await expect(
        page.locator("text=Tescilli Taşıtlarım (Garaj)"),
        'Esc menüyü kapatmadı'
      ).toHaveCount(0);
    });
  });
});
