// =========================================================================
// 11 · GARAJ EKRANI — ARAÇ MERKEZİ VE KART KATMANLARI
//
// -------------------------------------------------------------------------
// NİYE BU PAKET VAR
// -------------------------------------------------------------------------
// Garaj kartları beş katman taşıyordu ve on araçta ekran okunmaz hâle
// geliyordu. Seyrek eylemler (satışa çıkar, aracı devret) HER kartta
// duruyordu; Araç Merkezi'ne ve kart içi `⋯` menüsüne taşındılar.
//
// Bu paket iki şeyi koruyor:
//   1. Eylemlerin kartlara geri sızmaması (kalabalık sessizce geri gelir)
//   2. Taşındıkları yerde GERÇEKTEN çalışmaları — bir eylemi menüye
//      saklayıp çalışmaz bırakmak, kalabalıktan daha kötüdür
//
// -------------------------------------------------------------------------
// EN ÖNEMLİ TEST: MODAL ÖRTÜSÜ EKRANI KAPLIYOR MU
// -------------------------------------------------------------------------
// `.animate-fadeIn` sınıfı `animation-fill-mode: both` taşıyordu. Animasyon
// bittikten sonra bile öğede `transform: matrix(1,0,0,1,0,0)` kalıyordu —
// hiçbir şeyi kaydırmayan bir kimlik matrisi. Ama CSS'e göre `none`
// DIŞINDAKİ her transform, içindeki `position: fixed` öğeler için yeni bir
// kapsayıcı blok yaratıyor.
//
// Sonuç: garajdaki modallar ekrana değil sayfa gövdesine göre ortalanıyordu.
// Ölçülen: bakım modalının örtüsü `0,0,1440x1000` olması gerekirken
// `0,65,1440x1320` çıkıyordu — formun Kaydet düğmesi ekran dışında
// kalıyordu ve karartma üst menüyü örtmüyordu.
//
// Bu, gözle bakınca "biraz aşağıda duruyor" diye geçiştirilebilecek ama
// formu kullanılamaz kılan türden bir hata. Bir `animate-fadeIn` eklemesi
// ya da bir sarmalayıcıya `transform` gelmesi onu geri getirir.
//
// -------------------------------------------------------------------------
// HİÇBİR YAZMA YOK — CI'DA KOŞUYOR
// -------------------------------------------------------------------------
// Modallar açılıyor ama hiçbiri gönderilmiyor. Veritabanına dokunulmuyor.
// =========================================================================

const { test, expect, girisYap } = require('./yardimcilar');

// Bu paket masaüstü düzenini denetliyor (kart ızgarası, `⋯` menüsü).
test.describe('Garaj ekranı', () => {
  // `test.skip(callback)` biçimi KULLANILMAZ: o geri çağırma yalnızca
  // fixture alıyor, `testInfo` almıyor ("Cannot read properties of
  // undefined"). Proje adına bakmanın doğru yeri `beforeEach`'in ikinci
  // parametresi.
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'masaustu', 'Kart ızgarası ve ⋯ menüsü masaüstü düzeni');

    await girisYap(page);
    await page.goto('/garage');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
  });

  test('profil kartı kalktı, yerine Araç Merkezi geldi', async ({ page }) => {
    const merkez = page.getByRole('region', { name: 'Araç Merkezi' });
    await expect(merkez, 'Araç Merkezi yok').toBeVisible();

    // Üç eylem de merkezde
    for (const ad of ['Satışa çıkar', 'Aracı devret', 'Bakım işle']) {
      await expect(merkez.getByRole('button', { name: new RegExp(ad) }), `${ad} eylemi yok`).toBeVisible();
    }

    // Kaldırılan profil kartı ham e-posta basıyordu. Aynı bilgi hesap
    // menüsünde duruyor; garaj ekranında görünmemeli.
    const govde = await page.locator('body').textContent();
    expect(govde, 'profil kartı hâlâ e-posta basıyor').not.toContain('@gmail.com');

    // "Kurumsal Üyelik" yazıyordu ama sistemde kurumsal üyelik yok.
    expect(govde, 'olmayan üyelik tipi hâlâ yazıyor').not.toContain('Kurumsal Üyelik');
  });

  test('kart üç katman: seyrek eylemler kartta değil ⋯ menüsünde', async ({ page }) => {
    const kart = page.locator('.grid > div').filter({ hasText: 'Skor:' }).first();
    await expect(kart).toBeVisible();

    // Eski tam genişlik şeritler kartta OLMAMALI
    await expect(kart.getByText('Pazaryerinde Satışa Çıkar')).toHaveCount(0);
    await expect(kart.getByRole('button', { name: 'Aracı Devret' })).toHaveCount(0);

    // Günlük üç eylem yerinde
    for (const ad of ['Detay', 'Karne', 'Bakım']) {
      await expect(kart.getByRole('button', { name: ad, exact: true })).toBeVisible();
    }

    // Seyrek eylemler `⋯` menüsünde — kaybolmadılar
    await kart.locator("button[aria-label*='diğer işlemler']").click();
    await page.waitForTimeout(400);
    const menu = page.getByRole('menu').first();
    await expect(menu.getByRole('menuitem', { name: /Satışa çıkar|İlanı yönet/ })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: /Aracı devret/ })).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // SAYAÇLAR SÜZGEÇ (madde 9)
  //
  // Eskiden sayaçlar yalnızca sayı basıyordu: "1 süresi kritik" yazıyor ama
  // hangi araç olduğunu bulmak için kartları tek tek gezmek gerekiyordu.
  // Otuz araçta bu bilgiyi işe yaramaz kılıyor.
  // -------------------------------------------------------------------------
  test('sayaca tıklayınca liste süzülüyor ve çip temizlenebiliyor', async ({ page }) => {
    const kartSay = () => page.locator('.grid > div').filter({ hasText: 'Skor:' }).count();
    const oncekiAdet = await kartSay();
    expect(oncekiAdet, 'test için birden çok araç gerekiyor').toBeGreaterThan(1);

    await page.getByRole('button', { name: /Süresi kritik/ }).click();
    await page.waitForTimeout(600);

    const suzulmus = await kartSay();
    expect(suzulmus, 'süzgeç listeyi daraltmadı').toBeLessThan(oncekiAdet);

    // Etkin süzgeç GÖRÜNÜR olmalı: görünmez süzgeç, kullanıcının
    // "araçlarım kayboldu" sanmasının en yaygın sebebi.
    const cip = page.getByRole('button', { name: /Süresi kritik.*süzgeci temizle/ });
    await expect(cip, 'etkin süzgeç çipi görünmüyor').toBeVisible();

    await cip.click();
    await page.waitForTimeout(600);
    expect(await kartSay(), 'çip süzgeci temizlemedi').toBe(oncekiAdet);
  });

  test('sayaca ikinci kez tıklamak süzgeci kaldırıyor', async ({ page }) => {
    const kartSay = () => page.locator('.grid > div').filter({ hasText: 'Skor:' }).count();
    const oncekiAdet = await kartSay();

    // Sayaç grubuna daraltılıyor: süzgeç etkinken ekranda aynı adı taşıyan
    // İKİ öğe var — sayacın kendisi ve temizleme çipi.
    const sayac = page
      .getByRole('group', { name: 'Araç süzgeci' })
      .getByRole('button', { name: /Süresi kritik/ });
    await sayac.click();
    await page.waitForTimeout(500);
    await expect(sayac).toHaveAttribute('aria-pressed', 'true');

    await sayac.click();
    await page.waitForTimeout(500);
    await expect(sayac).toHaveAttribute('aria-pressed', 'false');
    expect(await kartSay()).toBe(oncekiAdet);
  });

  test('"Verileri Yenile" kaldırıldı', async ({ page }) => {
    // Tarayıcının kendi yenileme düğmesi zaten var. Uygulamaya ikinci bir
    // yenileme koymak, verinin kendiliğinden tazelenmediğini îma ediyordu.
    await expect(page.getByRole('button', { name: /Verileri Yenile/ })).toHaveCount(0);
  });

  test('kart düğmeleri aynı görsel ailede', async ({ page }) => {
    // Eskiden "Detay" dolu indigo, "Karne" ve "Bakım" beyaz çerçeveliydi.
    // Üçü de aynı sıklıkta kullanılan eşdeğer eylemler; birini öne çıkarmak
    // var olmayan bir hiyerarşi uyduruyordu.
    const kart = page.locator('.grid > div').filter({ hasText: 'Skor:' }).first();

    const arkaPlanlar = [];
    for (const ad of ['Detay', 'Karne', 'Bakım']) {
      const d = kart.getByRole('button', { name: ad, exact: true });
      arkaPlanlar.push(await d.evaluate((el) => getComputedStyle(el).backgroundColor));
    }

    expect(
      new Set(arkaPlanlar).size,
      `üç düğmenin arka planı farklı: ${arkaPlanlar.join(' / ')}`
    ).toBe(1);
  });

  test('araç görseli kırpılmıyor', async ({ page }) => {
    // `object-cover` görseli kutuya sığdırmak için kırpıyordu ve bir araç
    // görselinde kırpılan şey genellikle aracın kendisi oluyor.
    const gorsel = page.locator('.grid > div img').first();
    await expect(gorsel).toHaveCSS('object-fit', 'contain');
  });

  test('⋯ menüsü dışarı tıklayınca kapanıyor', async ({ page }) => {
    const kart = page.locator('.grid > div').filter({ hasText: 'Skor:' }).first();
    await kart.locator("button[aria-label*='diğer işlemler']").click();
    await page.waitForTimeout(400);
    await expect(page.getByRole('menu').first()).toBeVisible();

    await page.locator('h1').first().click({ force: true });
    await page.waitForTimeout(400);
    await expect(page.getByRole('menu'), 'menü açık kaldı').toHaveCount(0);
  });

  test('araç seçici: arama var, satıştaki araç sebebiyle devre dışı', async ({ page }) => {
    await page.getByRole('button', { name: /Satışa çıkar/ }).first().click();
    await page.waitForTimeout(700);

    const secici = page.getByRole('dialog');
    await expect(secici).toBeVisible();

    // Hesapta altıdan fazla araç var; arama kutusu bu eşikte beliriyor.
    await expect(secici.getByLabel('Araç ara'), 'arama kutusu yok').toBeVisible();

    // Satıştaki araç GİZLENMİYOR, sebebiyle gösteriliyor. Gizlenseydi
    // kullanıcı aracını listede bulamayıp kaybolduğunu sanardı.
    await expect(secici.getByText('Zaten satışta').first()).toBeVisible();

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    await expect(page.getByRole('dialog'), 'Esc seçiciyi kapatmadı').toHaveCount(0);
  });

  test('araç seçicide arama plakayı buluyor', async ({ page }) => {
    await page.getByRole('button', { name: /Bakım işle/ }).first().click();
    await page.waitForTimeout(700);

    const secici = page.getByRole('dialog');
    const oncekiSayi = await secici.locator('button').count();

    // Boşluksuz ve küçük harfle yazılıyor: kullanıcı plakayı böyle yazar.
    await secici.getByLabel('Araç ara').fill('bulunmayanplaka');
    await page.waitForTimeout(400);
    await expect(secici.getByText(/eşleşen araç yok/)).toBeVisible();

    await secici.getByLabel('Araç ara').fill('');
    await page.waitForTimeout(400);
    expect(await secici.locator('button').count()).toBe(oncekiSayi);
  });

  // -------------------------------------------------------------------------
  // REGRESYON KORUMASI — paket başlığındaki ölçüme bakın
  // -------------------------------------------------------------------------
  test('modal örtüleri ekranın tamamını kaplıyor', async ({ page }) => {
    const ekran = page.viewportSize();

    const olc = async (ad) => {
      const ortu = page.locator('div.fixed.inset-0').last();
      const kutu = await ortu.boundingBox();
      expect(kutu, `${ad}: örtü bulunamadı`).not.toBeNull();
      // 1px tolerans: alt piksel yuvarlama.
      expect(Math.abs(kutu.x), `${ad}: örtü soldan kaymış`).toBeLessThan(1.5);
      expect(Math.abs(kutu.y), `${ad}: örtü yukarıdan kaymış (üst menü örtülmüyor)`).toBeLessThan(1.5);
      expect(Math.abs(kutu.width - ekran.width), `${ad}: örtü genişliği ekranla uyuşmuyor`).toBeLessThan(1.5);
      expect(Math.abs(kutu.height - ekran.height), `${ad}: örtü yüksekliği ekranla uyuşmuyor — sayfa gövdesine göre konumlanıyor olabilir`).toBeLessThan(1.5);
    };

    // 1) Araç seçici (portal ile body'ye taşınıyor)
    await page.getByRole('button', { name: /Aracı devret/ }).first().click();
    await page.waitForTimeout(700);
    await olc('araç seçici');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // 2) Bakım modalı — hatanın ilk yakalandığı yer
    const kart = page.locator('.grid > div').filter({ hasText: 'Skor:' }).first();
    await kart.getByRole('button', { name: 'Bakım', exact: true }).click();
    await page.waitForTimeout(1000);
    await olc('bakım modalı');
  });

  test('sarmalayıcıda artık transform kalmıyor', async ({ page }) => {
    // Hatanın kökü: `.animate-fadeIn` sınıfı `both` fill-mode ile
    // animasyon bittikten sonra da transform bırakıyordu. Sınıf 58 yerde
    // kullanılıyor, yani tek bir modal testi tüm sızıntıyı yakalamaz.
    const transform = await page.evaluate(() => {
      const el = document.querySelector('.animate-fadeIn');
      return el ? getComputedStyle(el).transform : 'öğe yok';
    });
    expect(transform, 'animate-fadeIn hâlâ transform bırakıyor — fixed öğeler ekrandan kopar').toBe('none');
  });
});
