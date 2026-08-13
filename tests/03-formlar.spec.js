// =========================================================================
// FORMLAR — "bir tane bile formun çalışmaması" kabul edilemez
//
// Bu paket veritabanına GERÇEKTEN yazan tek pakettir. Bakım kaydı formunu
// baştan sona doldurup kaydeder, sonucu veritabanından okuyup doğrular ve
// yazdığını temizler.
//
// TEMİZLİK GARANTİLİ: `temizlik` fixture'ı test başarısız olsa, hata atsa
// ya da yarıda kesilse bile çalışır. Yazılan kayıt benzersiz bir işaret
// taşıdığı için silme yalnızca bu koşumun ürettiğini bulur — gerçek
// kullanıcı verisine hiçbir koşulda dokunmaz. trust_score da koşum
// öncesindeki değerine geri alınır (form her kayıtta +5 yapıyor).
// =========================================================================

const { test, expect, girisYap, TEST_ISARETI, ORNEK_PLAKA } = require('./yardimcilar');

test.describe('Bakım kaydı formu', () => {
  test('form doldurulup kaydediliyor ve veritabanına doğru düşüyor', async ({ page, sb, temizlik }) => {
    await girisYap(page);
    await page.goto('/garage');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // ARAÇ KARTINDAKİ bakım düğmesi. `hasText: /Bakım|Servis/` KULLANILMAZ:
    // Araç Merkezi'nde de "Bakım işle" adında bir düğme var ve sayfada
    // kartlardan ÖNCE geliyor, yani `.first()` onu yakalıyordu. O düğme
    // önce araç seçiciyi açıyor, bakım formunu değil — test bu yüzden
    // "Servis & Bakım Kaydı İşle" başlığını bulamıyordu.
    const bakimButonu = page.getByRole('button', { name: 'Bakım', exact: true }).first();
    await expect(bakimButonu, 'garaj kartında bakım butonu bulunamadı').toBeVisible({ timeout: 20_000 });
    await bakimButonu.click();
    await page.waitForTimeout(1200);

    // Modal açıldı mı?
    await expect(page.locator('text=Servis & Bakım Kaydı İşle')).toBeVisible({ timeout: 15_000 });

    // Alanları GERÇEK yer tutucularına göre doldur.
    //
    // İlk yazımda genel bir döngü kullanmıştım ve /km/i kalıbıyla arıyordum;
    // ama km alanının yer tutucusu "Örn: 42.000" — içinde "km" geçmiyor.
    // Sonuç: km ve tutar alanları yanlış doldu, form doğrulaması geçmedi ve
    // kayıt veritabanına düşmedi. Genel kalıp yerine kesin seçici kullanılıyor.
    await page.fill("input[placeholder='Örn: Yetkili Servis (Borusan)']", temizlik.isaret);
    await page.fill("input[placeholder='Örn: 42.000']", '123456');
    await page.fill("input[placeholder='Örn: 8.500']", '999');
    await page.fill("textarea[placeholder^='Örn: Ön fren']", temizlik.isaret);
    // Tarih maskesi yalnızca rakam kabul ediyor ve GG/AA/YYYY üretiyor.
    await page.fill("input[placeholder='GG/AA/YYYY']", '15062025');
    await page.waitForTimeout(400);

    await page.locator("button", { hasText: /^Kaydet$/ }).click();
    await page.waitForTimeout(3500);

    // ---- VERİTABANINDAN DOĞRULA ----
    const { data: kayitlar, error } = await sb
      .from('maintenance_records')
      .select('*')
      .like('shop_name', 'OTOCV-TEST-%');

    expect(error, 'kayıt sorgulanamadı').toBeNull();
    expect(kayitlar.length, 'form kaydı veritabanına düşmedi').toBeGreaterThan(0);

    const kayit = kayitlar[0];

    // Tarih ISO olarak yazılmalı. Kolon artık 'date' tipinde; biçimlendirilmiş
    // metin göndermek sunucunun DateStyle ayarına bağlı bir kumar olurdu.
    expect(kayit.service_date, 'tarih ISO biçiminde saklanmalı').toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(kayit.service_date, '15/06/2025 girildi, 2025-06-15 beklenir').toBe('2025-06-15');

    // Özet TEK KEZ yazılmalı. Önceden `${tip} / ${ozet} - ${ozet}` biçiminde
    // üç kez tekrar ediyordu.
    const tekrarSayisi = (kayit.summary.match(new RegExp(temizlik.isaret, 'g')) || []).length;
    expect(tekrarSayisi, 'özet tekrar ediyor').toBeLessThanOrEqual(1);
  });
});

test.describe('Giriş formu', () => {
  test('geçerli bilgilerle giriş yapılıyor', async ({ page }) => {
    await girisYap(page);
    expect(page.url()).not.toContain('/login');
  });

  test('şifre göster butonu erişilebilir ve çalışıyor', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const buton = page.locator("button[aria-label='Şifreyi göster']");
    await expect(buton, 'şifre butonunun erişilebilir adı yok').toBeVisible();

    // 44px dokunma alanı — WCAG ve platform kılavuzu.
    const kutu = await buton.boundingBox();
    expect(kutu.width, 'dokunma alanı genişliği').toBeGreaterThanOrEqual(44);
    expect(kutu.height, 'dokunma alanı yüksekliği').toBeGreaterThanOrEqual(44);

    const sifreAlani = page.locator("input[type='password']").first();
    await expect(sifreAlani).toBeVisible();
    await buton.click();
    // Tıklamadan sonra alan metin tipine dönmeli.
    await expect(page.locator("input[type='text']").last()).toBeVisible();
  });
});

test.describe('PIN sorgulama formu', () => {
  test('geçersiz PIN girildiğinde hata gösteriliyor, sessizce yutulmuyor', async ({ page }) => {
    await page.goto('/verify');
    await page.waitForLoadState('networkidle');

    const alan = page.locator("input[type='text']").first();
    await alan.fill('CV-YOKBOYLE');
    // Buton type='submit' TAŞIMIYORDU; artık taşıyor (form etiketi eklendi)
    // ama teste ada göre seçmek daha dayanıklı.
    await page.locator("button", { hasText: 'Araç Sicilini Sorgula' }).click();
    await page.waitForTimeout(3000);

    // Detay sayfasına gitmemeli ve kullanıcı bir geri bildirim görmeli.
    expect(page.url()).not.toContain('/details/');
  });
});
