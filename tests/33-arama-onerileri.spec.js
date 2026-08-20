// =========================================================================
// 33 · ARAMA ÖNERİLERİ (autocomplete)
//
// -------------------------------------------------------------------------
// NİYE BU PAKET VAR
// -------------------------------------------------------------------------
// Başlık şeridindeki arama kutusu yalnızca Enter'da çalışıyordu; kullanıcı
// yazarken hiçbir geri bildirim almıyordu. Artık yazdıkça marka/seri/model
// (sunucudan `katalog_oneri` RPC'si) ve il/ilçe (istemcide
// `turkeyLocations.js`) önerisi çıkıyor.
//
// -------------------------------------------------------------------------
// ⚠ EN KRİTİK İDDİA: ENTER'IN ESKİ DAVRANIŞI
// -------------------------------------------------------------------------
// `25-anasayfa.spec.js`teki DÖRT test kutuya yazıp Enter'a basıyor ve
// `/arama?q=…`e gidilmesini bekliyor. Öneri paneli eklenince Enter'ı "ilk
// öneriye git" yapmak dördünü birden kırardı — ve daha kötüsü, kullanıcının
// yazdığı serbest metni sessizce başka bir aramaya çevirirdi.
//
// Kural: ok tuşuyla bir öneri SEÇİLMEDİYSE Enter eski davranışı korur.
// Aşağıdaki test o kuralın bekçisi.
//
// -------------------------------------------------------------------------
// ⚠ ÖNERİLER KATALOGDAN GELİYOR, ENVANTERDEN DEĞİL
// -------------------------------------------------------------------------
// Ürün sahibinin kararı: liste eksiksiz olsun. Yani envanterde hiç aracı
// olmayan bir model de önerilir ve tıklanınca boş sonuç ekranı gelir. Bu
// yüzden "öneriye tıklayınca kart çıkmalı" diye bir iddia YOK — öyle bir
// iddia katalogda olup envanterde olmayan her künyede yanlış olurdu.
// =========================================================================

const { test, expect } = require('./yardimcilar');

const KUTU = /PIN ile ara/i;
const PANEL = '[role="listbox"]';
const SATIR = '[role="option"]';
const KARARTMA = 'div.fixed.inset-0.z-40';

/** Kutuya yazıp önerilerin yerleşmesini bekler. */
async function yaz(page, metin) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const kutu = page.getByLabel(KUTU);
  await kutu.click();
  await kutu.type(metin, { delay: 30 });
  return kutu;
}

test.describe('Arama önerileri · açılma', () => {
  test('tek harfte panel AÇILMIYOR', async ({ page }) => {
    const kutu = await yaz(page, 'b');
    // ⚠ Gecikmenin (300 ms) geçmesi beklenmeli, yoksa test panelin daha
    // açılmadığı anı ölçer ve her hâlükârda geçer — yani hiçbir şey kanıtlamaz.
    await page.waitForTimeout(1200);
    await expect(page.locator(PANEL)).toHaveCount(0);
    expect(await kutu.getAttribute('aria-expanded')).toBe('false');
  });

  test('iki harfte öneri geliyor ve satırlar 44 px eşiğini geçiyor', async ({ page }) => {
    await yaz(page, 'bm');
    await expect(page.locator(PANEL)).toBeVisible({ timeout: 15_000 });

    const satirlar = page.locator(SATIR);
    expect(await satirlar.count()).toBeGreaterThan(0);

    const kucukler = await satirlar.evaluateAll((es) => es
      .map((e) => ({ m: e.innerText.trim(), boy: Math.round(e.getBoundingClientRect().height) }))
      .filter((x) => x.boy < 44));
    expect(kucukler, 'öneri satırı dokunma eşiğinin altında').toEqual([]);
  });

  test('panel açılınca sayfa KARARIYOR, Escape ile ikisi de kapanıyor',
    async ({ page }) => {
      await yaz(page, 'bm');
      await expect(page.locator(PANEL)).toBeVisible({ timeout: 15_000 });
      await expect(page.locator(KARARTMA)).toHaveCount(1);

      await page.keyboard.press('Escape');
      await expect(page.locator(PANEL)).toHaveCount(0);
      await expect(page.locator(KARARTMA), 'karartma açık kaldı').toHaveCount(0);
    });
});

test.describe('Arama önerileri · içerik ve yönlendirme', () => {
  test('ŞEHİR önerisi süzgeç adresine götürüyor', async ({ page }) => {
    await yaz(page, 'anka');
    await expect(page.locator(PANEL)).toBeVisible({ timeout: 15_000 });

    await page.getByRole('option', { name: 'Ankara', exact: true }).click();
    await page.waitForURL(/sehir=Ankara/, { timeout: 20_000 });
    // ⚠ Şehir HAM adıyla gidiyor: `arac_arama` şehri `kart_sehir = v_sehir`
    // ile NORMALİZE ETMEDEN eşleştiriyor. Normalize gönderilseydi ("ankara")
    // hiçbir araç eşleşmez, sessizce boş sonuç gelirdi.
    expect(decodeURIComponent(page.url())).toContain('sehir=Ankara');
  });

  test('MARKA önerisi süzgeç adresine götürüyor ve sonuç geliyor',
    async ({ page }) => {
      await yaz(page, 'bmw');
      await expect(page.locator(PANEL)).toBeVisible({ timeout: 15_000 });

      await page.locator(SATIR).first().click();
      await page.waitForURL(/marka=/, { timeout: 20_000 });
      // Adres normalize ad taşımalı — `arac_arama` yüklemi
      // `arama_normalize(k.brand) = v_marka` biçiminde tam eşitlik.
      expect(page.url()).toContain('marka=bmw');
    });

  test('TÜRKÇE karakter eşleşiyor — ilçe önerisi', async ({ page }) => {
    // ⚠ AKSAN BEKÇİSİ. Öneri eşleştirmesi `agacAnahtari` kullanıyor,
    // `toLowerCase()` değil: Türkçe `İ`/`ı` `toLowerCase()` ile birleştirici
    // nokta üretiyor ve eşleşme sessizce kayboluyor. Bu tuzak projede
    // `markaAgaci.js:83-84`te belgeli ve hâlâ başka bir dosyada duruyor.
    await yaz(page, 'kadik');
    await expect(page.locator(PANEL)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('option', { name: /Kadıköy/ })).toBeVisible();
  });
});

test.describe('Arama önerileri · klavye', () => {
  test('ok tuşu seçimi ilerletiyor ve aria-activedescendant güncelleniyor',
    async ({ page }) => {
      const kutu = await yaz(page, 'bm');
      await expect(page.locator(PANEL)).toBeVisible({ timeout: 15_000 });

      // Açılışta hiçbir öneri seçili DEĞİL — Enter'ın eski davranışı bu
      // duruma bağlı.
      expect(await kutu.getAttribute('aria-activedescendant')).toBeNull();
      await expect(page.locator(`${SATIR}[aria-selected="true"]`)).toHaveCount(0);

      await page.keyboard.press('ArrowDown');
      const etkin = await kutu.getAttribute('aria-activedescendant');
      expect(etkin, 'ok tuşu etkin ögeyi duyurmuyor').toBeTruthy();
      await expect(page.locator(`${SATIR}[aria-selected="true"]`)).toHaveCount(1);
      // Duyurulan kimlik gerçekten sayfadaki bir ögeye işaret etmeli;
      // aksi hâlde ekran okuyucu boşluğa bakar.
      // ⚠ `#${id}` KULLANILAMAZ: React `useId()` değerleri `:` içeriyor ve
      // ham CSS kimlik seçicisini kırıyor. `CSS.escape` da tarayıcı API'si,
      // Node tarafındaki test bağlamında tanımlı değil. Öznitelik seçicisi
      // her iki sorunu da çözüyor.
      await expect(page.locator(`[id="${etkin}"]`)).toHaveCount(1);
    });

  test('⚠ ÖNERİ SEÇİLİ DEĞİLKEN Enter eski davranışı koruyor', async ({ page }) => {
    // Bu testin koruduğu şey `25-anasayfa`daki dört testin varsayımı.
    const kutu = await yaz(page, 'bmw');
    await expect(page.locator(PANEL)).toBeVisible({ timeout: 15_000 });

    await kutu.press('Enter');
    await page.waitForURL(/\/arama/, { timeout: 20_000 });
    expect(decodeURIComponent(page.url()), 'Enter serbest metni taşımadı')
      .toContain('q=bmw');
    expect(page.url(), 'Enter sessizce süzgeç adresine saptı')
      .not.toContain('marka=');
  });

  test('ok tuşuyla SEÇİLDİĞİNDE Enter öneriye gidiyor', async ({ page }) => {
    const kutu = await yaz(page, 'bmw');
    await expect(page.locator(PANEL)).toBeVisible({ timeout: 15_000 });

    await page.keyboard.press('ArrowDown');
    await kutu.press('Enter');
    await page.waitForURL(/marka=/, { timeout: 20_000 });
    expect(page.url()).toContain('marka=bmw');
  });
});
