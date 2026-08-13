// =========================================================================
// 13 · DAYANIKLILIK — SONSUZ YÜKLENİYOR VE ÇİFT SORGU
//
// -------------------------------------------------------------------------
// NİYE BU PAKET VAR
// -------------------------------------------------------------------------
// Kullanıcı "menüdeki bazı kısımlara tıklayınca site kitleniyor", "araç
// detayı açılmıyor" ve "karne bölümüne geçemiyorum" diye bildirdi. Keşifte
// iki ayrı sebep bulundu ve ikisi de kanıtlandı:
//
// 1. BAŞARISIZLIK YOLU YOKTU. `details/[pin]/page.js`, `karne/[pin]/page.js`
//    ve `useSicil.js` üçünde de `try/catch` yoktu. `supabase.rpc` promise'i
//    REDDEDİLİRSE (ağ kopması, sunucu ölümü, CORS) yükleme durumunu kapatan
//    satıra hiç gelinmiyor, ekranda sonsuza kadar iskelet dönüyordu.
//    Reddedilen promise `error.js` sınırına da ulaşmaz — hata sınırları
//    yalnızca render sırasında fırlatılan hataları yakalar. Yani ne veri
//    vardı, ne hata; sadece dönen iskelet.
//
// 2. ÇİFT SORGU. Her detay/karne görüntülemesi `sicil_getir`'i İKİ KEZ
//    çağırıyordu: bir kez rota, bir kez ekranın içindeki `useSicil`. Her
//    çağrı `sicil_sorgu_log`'a satır yazıyor ve hız sınırı 10 dakikada
//    20 BAŞARISIZ sorguda geçerli PIN'leri de 10 dakika bloklüyor. Çift
//    sayım yüzünden gerçek eşik 20 değil 10 hatalı denemeydi.
//
// -------------------------------------------------------------------------
// HİÇBİR YAZMA YOK — CI'DA KOŞUYOR
// -------------------------------------------------------------------------
// Ağ kesintisi Playwright'ın `route.abort()` yeteneğiyle taklit ediliyor;
// veritabanına hiç istek gitmiyor. Sorgu sayımı testi sayfayı bir kez
// açıyor — bu zaten normal bir ziyaret.
// =========================================================================

const { test, expect, girisYap, ornekPin } = require('./yardimcilar');

test.describe('Dayanıklılık', () => {

  test.describe('Ağ koptuğunda sonsuz iskelet YOK', () => {
    // `sicil_getir` çağrısını düşürüyoruz. Eskiden bu, ekranı kalıcı
    // iskelette bırakıyordu.
    const rpcKes = async (page) => {
      await page.route('**/rest/v1/rpc/sicil_getir*', (route) => route.abort('failed'));
    };

    test('karne: hata ekranı ve çıkış yolu geliyor', async ({ page }) => {
      const pin = await ornekPin();
      await rpcKes(page);

      await page.goto(`/karne/${encodeURIComponent(pin)}`);

      // İskelet DEĞİL, gerçek bir hata ekranı bekleniyor.
      await expect(
        page.getByRole('heading', { name: /ulaşılamadı/i }),
        'ağ koptuğunda hâlâ sonsuz iskelet dönüyor'
      ).toBeVisible({ timeout: 25_000 });

      // Çıkış yolu ŞART: kullanıcı ekranda mahsur kalmamalı.
      await expect(page.getByRole('button', { name: 'Tekrar Dene' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Anasayfa' })).toBeVisible();
    });

    test('araç detayı: hata ekranı ve çıkış yolu geliyor', async ({ page }) => {
      const pin = await ornekPin();
      await rpcKes(page);

      await page.goto(`/details/${encodeURIComponent(pin)}`);

      await expect(
        page.getByRole('heading', { name: /ulaşılamadı/i }),
        'ağ koptuğunda hâlâ sonsuz iskelet dönüyor'
      ).toBeVisible({ timeout: 25_000 });

      await expect(page.getByRole('button', { name: 'Tekrar Dene' })).toBeVisible();
    });

    test('"Tekrar Dene" ağ dönünce sayfayı kurtarıyor', async ({ page }) => {
      const pin = await ornekPin();

      // Önce kes.
      let kesik = true;
      await page.route('**/rest/v1/rpc/sicil_getir*', (route) => {
        if (kesik) return route.abort('failed');
        return route.continue();
      });

      await page.goto(`/karne/${encodeURIComponent(pin)}`);
      await expect(page.getByRole('button', { name: 'Tekrar Dene' }))
        .toBeVisible({ timeout: 25_000 });

      // Ağı geri ver ve tekrar dene: ekran kurtarılabilir olmalı.
      kesik = false;
      await page.getByRole('button', { name: 'Tekrar Dene' }).click();

      await expect(
        page.getByRole('heading', { name: /ulaşılamadı/i }),
        'ağ döndüğü hâlde hata ekranı kaldı — tetik çalışmıyor'
      ).toHaveCount(0, { timeout: 25_000 });
    });
  });

  test.describe('Ekran, rotanın sorgusunu TEKRARLAMIYOR', () => {
    // -----------------------------------------------------------------------
    // NİYE MUTLAK SAYI DEĞİL, KIYAS
    //
    // Geliştirme modunda React StrictMode efektleri bilerek iki kez koşuyor,
    // yani her sayfa sorgusu ekranda iki istek olarak görünüyor. Bu üretimde
    // olmayan bir çarpan; "tam 1 olmalı" demek testi ortama bağlar ve yanlış
    // alarm verir.
    //
    // Bunun yerine KONTROL sayfasıyla kıyaslıyoruz: `/verify/[pin]` de
    // `sicil_getir`'i çağırıyor ama `useSicil` kullanan bir ekran RENDER
    // ETMİYOR — yani tek çağıranı var. Karne ve detay ondan FAZLA istek
    // atıyorsa, aradaki fark StrictMode'dan değil ekranın kendi sorgusundan
    // gelir. Çarpan ikisinde de aynı olduğu için sadeleşiyor.
    //
    // Düzeltmeden önce oran 2 katıydı (rota + ekran); şimdi 1.
    // -----------------------------------------------------------------------
    const sorguSay = async (page, yol) => {
      let sayac = 0;
      page.on('request', (r) => {
        if (r.url().includes('/rpc/sicil_getir')) sayac += 1;
      });
      await page.goto(yol);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2500);
      return sayac;
    };

    test('karne, kontrol sayfasından fazla sorgulamıyor', async ({ page, context }) => {
      const pin = await ornekPin();

      const kontrolSayfa = await context.newPage();
      const kontrol = await sorguSay(kontrolSayfa, `/verify/${encodeURIComponent(pin)}`);
      await kontrolSayfa.close();

      const karne = await sorguSay(page, `/karne/${encodeURIComponent(pin)}`);

      expect(kontrol, 'kontrol sayfası hiç sorgulamadı — test kurgusu bozuk').toBeGreaterThan(0);
      expect(
        karne,
        `karne ${karne}, kontrol ${kontrol} istek attı. Fazlası ekranın rotayla aynı sorguyu ` +
        `tekrarlaması demek; hız sınırı eşiğini yarıya düşürür.`
      ).toBeLessThanOrEqual(kontrol);
    });

    test('araç detayı, kontrol sayfasından fazla sorgulamıyor', async ({ page, context }) => {
      await girisYap(page);
      const pin = await ornekPin();

      const kontrolSayfa = await context.newPage();
      const kontrol = await sorguSay(kontrolSayfa, `/verify/${encodeURIComponent(pin)}`);
      await kontrolSayfa.close();

      const detay = await sorguSay(page, `/details/${encodeURIComponent(pin)}`);

      expect(kontrol, 'kontrol sayfası hiç sorgulamadı — test kurgusu bozuk').toBeGreaterThan(0);
      expect(
        detay,
        `detay ${detay}, kontrol ${kontrol} istek attı.`
      ).toBeLessThanOrEqual(kontrol);
    });
  });

  test('(site) çatısı yerinde — başlık ve altbilgi kaybolmuyor', async ({ page }) => {
    // Oturum ŞART: `/garage` oturumsuz kullanıcıyı `/login`'e yönlendiriyor
    // ve giriş sayfası `(auth)` çatısında — orada ana menü ve altbilgi yok.
    // İlk yazımda giriş yapılmamıştı ve test bu yüzden düştü.
    await girisYap(page);
    await page.goto('/garage');
    await page.waitForLoadState('networkidle');

    // Çatı: başlık ve altbilgi. Kök hata sınırına düşülseydi ikisi de
    // kaybolurdu.
    await expect(page.getByRole('navigation', { name: 'Ana menü' })).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });
});
