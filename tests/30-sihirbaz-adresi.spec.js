// =========================================================================
// 30 · SİHİRBAZ ADRESİ ↔ ADIM EŞLEMESİ (B4)
//
// -------------------------------------------------------------------------
// ÖLÇÜLEN ÜÇ KUSUR
// -------------------------------------------------------------------------
//   1. Adres hiç değişmiyordu. `[step]` parametresi HİÇ okunmuyordu:
//      kullanıcı 3. adımdayken adres `/add-vehicle/step1` diyordu.
//   2. Adım geçişleri yalnızca `setCurrentStep` çağırdığı için geçmişe kayıt
//      düşmüyordu — 3. adımda geri tuşuna basan kullanıcı 2. adıma değil
//      DOĞRUDAN GARAJA çıkıyordu.
//   3. `[step]` doğrulanmıyordu: `step99` da `muz` da 200 dönüp Adım 1
//      çiziyordu.
//
// -------------------------------------------------------------------------
// ⚠ ADRES AYNA, SÜRÜCÜ DEĞİL
// -------------------------------------------------------------------------
// Adres adımı YANSITIYOR, BELİRLEMİYOR. Adres çubuğuna `step4` yazmak
// kimseyi 4. adıma taşımıyor. Bu bir konfor tercihi değil GÜVENLİK KURALI:
// ileri geçişin tek yolu `handleNextStep` ve orada atlanmaması gereken
// kapılar var — zorunlu alanlar + PLAKA TESCİL SORGUSU (aynı plaka sistemde
// kayıtlı mı). Adrese ilerletme yetkisi vermek hepsini delerdi.
//
// -------------------------------------------------------------------------
// ⚠ EN KRİTİK TEST: FORM VERİSİ ADRES DEĞİŞİNCE DURUYOR MU
// -------------------------------------------------------------------------
// Sihirbazın 4 adımlık form verisinin TAMAMI `CreateListingWizard`
// state'inde. Adresi `router.push` ile değiştirmek rotayı yeniden
// çalıştırıp bu veriyi uçurabilirdi — yani kullanıcının doldurduğu her şey
// giderdi. `history.pushState` seçilmesinin tek sebebi bu; bu paket o
// seçimin GEÇERLİ KALDIĞINI bekçiliyor. Biri `router.push`a dönerse test
// düşer.
//
// ⚠ PLAKA ALANINA DOKUNULMUYOR — dokunulmaz bölge. Kalıcılık km alanıyla
// ölçülüyor. (İlk ölçüm denemem plaka alanını seçmişti ve maskesi ham
// enjeksiyonu reddettiği için YANLIŞ NEGATİF üretti: değer hiç girmemişti
// ama "veri kayboldu" gibi görünüyordu. Bu yüzden test önce değerin
// gerçekten girdiğini doğruluyor.)
// =========================================================================

const { test, expect, girisYap } = require('./yardimcilar');

const KM_ALANI = 'input[placeholder="Örn: 42.500"]';

test.describe('Sihirbaz adresi', () => {
  test.beforeEach(async ({ page }) => {
    await girisYap(page);
  });

  for (const istenen of ['/add-vehicle/step2', '/add-vehicle/step3',
    '/add-vehicle/step4', '/add-vehicle/step99', '/add-vehicle/muz']) {
    test(`${istenen} → ulaşılmamış adım, adres gerçeğe düzeltiliyor`,
      async ({ page }) => {
        await page.goto(istenen);
        await page.waitForLoadState('networkidle');
        await page.locator(KM_ALANI).first().waitFor({ timeout: 20_000 });

        // Adres düzeltilmiş olmalı...
        expect(new URL(page.url()).pathname).toBe('/add-vehicle/step1');
        // ...ve çizilen ekran gerçekten 1. adım olmalı. İkisini birden
        // denetlemek şart: yalnızca adrese bakmak, adres doğruyken yanlış
        // adım çizen bir gerilemeyi kaçırırdı.
        await expect(page.getByText('Adım 1 / 4')).toBeVisible();
      });
  }

  test('adres değişince FORM VERİSİ hayatta kalıyor', async ({ page }) => {
    await page.goto('/add-vehicle/step1');
    await page.waitForLoadState('networkidle');

    const km = page.locator(KM_ALANI).first();
    await km.waitFor({ timeout: 20_000 });
    await km.click();
    await km.type('123456', { delay: 20 });

    // ⚠ ÖNCE DEĞERİN GERÇEKTEN GİRDİĞİNİ DOĞRULA. Bu satır olmadan, alan
    // hiç dolmamışken de test "veri kayboldu" diye düşer ve ürüne olmayan
    // bir kusur yazar.
    const once = await km.inputValue();
    expect(once, 'km alanına değer girilemedi — ölçüm geçersiz olurdu')
      .not.toBe('');

    // Sihirbazın ileri/geri akışının adres katmanında yaptığının aynısı.
    await page.evaluate(
      () => window.history.pushState({}, '', '/add-vehicle/step2'));
    expect(new URL(page.url()).pathname).toBe('/add-vehicle/step2');

    await page.goBack();
    await page.waitForTimeout(800);

    expect(new URL(page.url()).pathname).toBe('/add-vehicle/step1');
    // Bileşen yeniden bağlansaydı bu alan boşalırdı.
    expect(await page.locator(KM_ALANI).first().inputValue()).toBe(once);
  });

  test('1. adımda geri tuşu sihirbazdan çıkarıyor', async ({ page }) => {
    // Adım adım geri, 1. adıma kadar. Orada geri basmak sihirbazı
    // terk etmeli — yoksa kullanıcı sihirbaza hapsolur.
    await page.goto('/garage');
    await page.waitForLoadState('networkidle');
    await page.goto('/add-vehicle/step1');
    await page.locator(KM_ALANI).first().waitFor({ timeout: 20_000 });

    await page.goBack();
    await page.waitForTimeout(800);
    expect(new URL(page.url()).pathname).toBe('/garage');
  });
});
