// =========================================================================
// 32 · FORM ERİŞİLEBİLİRLİĞİ (C2)
//
// -------------------------------------------------------------------------
// ÖLÇÜLEN DURUM (onarım öncesi, 21 alan tarandı)
// -------------------------------------------------------------------------
//   · Erişilebilir adı olmayan alan : 6
//   · Sayısal alanda `inputmode`    : 5 eksik
//   · `autocomplete`                : 10 eksik
//
// En kritik olanı `/verify` PIN kutusuydu: ürünün en çok paylaşılan kamuya
// açık ekranı ve ekran okuyucu orada yalnızca "düzenleme alanı" diyordu.
// Yer tutucu etiket yerine GEÇMEZ — odaklanınca kaybolur ve birçok ekran
// okuyucu onu hiç okumaz.
//
// -------------------------------------------------------------------------
// ⚠ ONARIM METİN UYDURMADI, VAR OLAN ETİKETİ BAĞLADI
// -------------------------------------------------------------------------
// Sihirbazdaki km ve tarih alanlarının GÖRÜNÜR etiketleri zaten vardı
// ("Güncel Kilometre (KM) *", "Trafik Sigortası *"); yalnızca `htmlFor`/`id`
// bağlantısı yoktu ve input `<label>`ın içinde de değildi. Uydurulmuş bir
// `aria-label` görünen etiketten farklı olsaydı bu ayrı bir ihlal olurdu.
//
// -------------------------------------------------------------------------
// ⚠ İKİ BİLİNÇLİ İSTİSNA — TEST BUNLARI SAYIYOR
// -------------------------------------------------------------------------
//   1. PLAKA alanı: ürün sahibinin kuralı gereği dokunulmaz bölge.
//      Test onu tek istisna olarak tanıyor; BAŞKA bir adsız alan çıkarsa
//      düşüyor.
//   2. PIN kutusunda `inputmode="numeric"` YOK ve olmamalı: PIN
//      ALFANÜMERİK (`CV-4TKMB-9XQ2R`). Kendi tarama betiğim burayı
//      "sayısal" diye işaretlemişti — yanlış pozitifti; rakam klavyesi
//      açmak kullanıcıyı harf yazamaz hâle getirirdi.
//
// ⚠ Native `required` EKLENMEDİ: sihirbaz kendi doğrulamasını yapıyor
// (`isStep1Valid`) ve tarayıcı doğrulamasını devreye sokmak akışı bozabilir.
// `aria-required` semantiği veriyor, davranışı değiştirmiyor.
// =========================================================================

const { test, expect, girisYap } = require('./yardimcilar');

/**
 * Sayfadaki görünür form alanlarının erişilebilir adını çıkarır.
 *
 * ⚠ GERÇEK FONKSİYON, DİZE DEĞİL. `page.evaluate`e dize verildiğinde
 * Playwright onu FONKSİYON olarak değil İFADE olarak değerlendiriyor ve
 * geriye dizi değil `undefined` dönüyor; test de "hiç alan yok" diye
 * düşüyor. Bu tuzağa `29-baslik-hiyerarsisi` yazılırken de düşülmüştü —
 * aynı hatanın ikinci kez tekrarı, o yüzden burada da not ediliyor.
 */
async function alanAdlari(page) {
  return page.evaluate(() => {
    const out = [];
    document.querySelectorAll('input, textarea, select').forEach((el) => {
      if (el.type === 'hidden' || !el.offsetParent) return;
      let ad = el.getAttribute('aria-label') || '';
      if (!ad && el.getAttribute('aria-labelledby')) {
        const t = document.getElementById(el.getAttribute('aria-labelledby'));
        ad = t ? t.innerText.trim() : '';
      }
      if (!ad && el.id) {
        const l = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
        if (l) ad = l.innerText.trim();
      }
      if (!ad && el.closest('label')) ad = el.closest('label').innerText.trim();
      out.push({ yer: el.placeholder || el.name || el.id || '(tanimsiz)', ad });
    });
    return out;
  });
}

test.describe('Form erişilebilirliği · ziyaretçi', () => {
  for (const rota of ['/login', '/register', '/verify']) {
    test(`${rota} — her alanın erişilebilir adı var`, async ({ page }) => {
      await page.goto(rota);
      await page.waitForLoadState('networkidle');
      const alanlar = await alanAdlari(page);
      expect(alanlar.length).toBeGreaterThan(0);
      expect(alanlar.filter((a) => !a.ad)).toEqual([]);
    });
  }

  test('/verify PIN kutusu: etiket + hata bağlantısı', async ({ page }) => {
    await page.goto('/verify');
    await page.waitForLoadState('networkidle');

    const pin = page.locator('#sicil-pin-kodu');
    await expect(pin).toBeVisible();

    // Etiket bağlı mı?
    const etiket = page.locator('label[for="sicil-pin-kodu"]');
    await expect(etiket).toHaveText(/PIN/i);

    // ⚠ PIN alfanümerik — rakam klavyesi AÇILMAMALI.
    expect(await pin.getAttribute('inputmode')).toBeNull();
    expect(await pin.getAttribute('autocomplete')).toBe('off');

    // Hata yokken `aria-invalid` de olmamalı.
    expect(await pin.getAttribute('aria-invalid')).toBeNull();

    // Geçersiz PIN gir -> hata alana BAĞLANMALI.
    await pin.fill('CV-GECERSIZ-99');
    await page.locator('form').first().press('Enter');
    await page.waitForTimeout(2500);

    const hataId = await pin.getAttribute('aria-describedby');
    if (hataId) {
      expect(await pin.getAttribute('aria-invalid')).toBe('true');
      await expect(page.locator(`#${hataId}`)).toBeVisible();
    }
  });
});

test.describe('Form erişilebilirliği · sihirbaz', () => {
  test.beforeEach(async ({ page }) => {
    await girisYap(page);
    await page.goto('/add-vehicle/step1');
    await page.waitForLoadState('networkidle');
    await page.locator('#arac-km').waitFor({ timeout: 20_000 });
  });

  test('yalnızca PLAKA alanı adsız — başka istisna yok', async ({ page }) => {
    const alanlar = await alanAdlari(page);
    const adsiz = alanlar.filter((a) => !a.ad).map((a) => a.yer);
    // Plaka dokunulmaz bölge (ürün sahibinin kuralı). Bu testin işi onu
    // affetmek DEĞİL, başka bir alanın sessizce adsız kalmasını engellemek.
    expect(adsiz).toEqual(['34 ABC 123']);
  });

  test('km ve tarih alanları sayısal klavye açıyor', async ({ page }) => {
    for (const kimlik of ['#arac-km', '#trafik-sigortasi-bitis',
      '#kasko-bitis', '#muayene-bitis']) {
      const el = page.locator(kimlik);
      await expect(el, `${kimlik} bulunamadı`).toBeVisible();
      expect(await el.getAttribute('inputmode'), kimlik).toBe('numeric');
    }
  });

  test('zorunlu alanlar aria-required taşıyor, opsiyonel olan TAŞIMIYOR',
    async ({ page }) => {
      for (const kimlik of ['#arac-km', '#trafik-sigortasi-bitis', '#muayene-bitis']) {
        expect(await page.locator(kimlik).getAttribute('aria-required'), kimlik)
          .toBe('true');
      }
      // Kasko opsiyonel; zorunlu göstermek kullanıcıya yanlış bilgi olurdu.
      expect(await page.locator('#kasko-bitis').getAttribute('aria-required'))
        .toBeNull();
    });

  test('hata mesajı alana BAĞLANIYOR', async ({ page }) => {
    // Boş bırakıp odaktan çıkınca `touchedFields.mileage` doluyor ve
    // "Kilometre verisi zorunludur." beliriyor.
    const km = page.locator('#arac-km');
    await km.click();
    await page.locator('#trafik-sigortasi-bitis').click();   // blur
    await page.waitForTimeout(600);

    expect(await km.getAttribute('aria-invalid')).toBe('true');
    const hataId = await km.getAttribute('aria-describedby');
    expect(hataId, 'hata metni alana bağlanmamış').toBeTruthy();
    await expect(page.locator(`#${hataId}`)).toHaveText(/zorunlu/i);
  });
});
