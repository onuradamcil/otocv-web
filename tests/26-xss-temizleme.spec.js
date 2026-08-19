// =========================================================================
// 26 · AÇIKLAMA ALANI XSS TEMİZLİĞİ
//
// -------------------------------------------------------------------------
// NİYE BU PAKET VAR — GERÇEKTEN SÖMÜRÜLEBİLİR BİR AÇIKTI
// -------------------------------------------------------------------------
// İlan açıklaması, Step2'deki `contentEditable` editörden HAM `innerHTML`
// olarak okunup `listings.description`'a yazılıyor ve iki yerde
// `dangerouslySetInnerHTML` ile basılıyor. Hiçbir temizlik yoktu.
//
// 19 Ağustos 2026 beta taramasında bu CANLIDA kanıtlandı: açıklama alanına
// yerleştirilen `<img src=x onerror=…>` çalıştı ve `document.title` değişti.
// Zincir orada bitmiyordu — oturum jetonu `localStorage`'da ve `httpOnly`
// değil, yani çalışan bir betik `access_token`'ı okuyabiliyor. Yani
// vitrindeki bir aracı GÖRÜNTÜLEYEN herkesin hesabı devralınabilirdi.
//
// Onarım: `src/utils/htmlTemizle.js` (DOMPurify, beyaz liste) her iki
// basma noktasında da çağrılıyor.
//
// -------------------------------------------------------------------------
// ⚠ TEST NİYE VERİTABANINA YAZMIYOR
// -------------------------------------------------------------------------
// Yükü gerçekten kaydetmek, canlı veritabanına saldırı yükü yazmak demek —
// üstelik temizlik basma anında çalıştığı için gereksiz. Bunun yerine
// `sicil_getir` YANITI ağda yakalanıp `description` alanı değiştiriliyor.
// Sunucudaki veri değişmiyor; tarayıcı tam olarak "saldırganın kaydettiği
// bir açıklama" görüyor. Sömürünün gerçekleştiği yer zaten burası.
//
// -------------------------------------------------------------------------
// ⚠ TEST İKİ YÖNLÜ: ATIYOR MU + KORUYOR MU
// -------------------------------------------------------------------------
// Yalnızca "betik çalışmadı" demek yetmez. Aşırı agresif bir temizleyici de
// bu testi geçerdi ama ürünün KENDİ ürettiği açıklamayı (otomatik özet
// `<p>`, `<b>`, `<ul>`, `<li>` kuruyor) ve editörün kalın/italik/liste/renk
// düğmelerini bozardı. O yüzden meşru biçimlendirmenin korunduğu da ayrıca
// doğrulanıyor.
// =========================================================================

const { test, expect, ornekPin } = require('./yardimcilar');

// Meşru biçimlendirme + saldırı vektörleri aynı dizede.
const YUK =
  '<p><b>Kalın metin</b> ve <i>italik</i></p>' +
  '<ul><li>Liste öğesi</li></ul>' +
  '<font color="#ff0000">Renkli</font>' +
  '<span style="color:#00aa00">Yeşil</span>' +
  '<img src=x onerror="window.__XSS1=1">' +
  '<script>window.__XSS2=1<\/script>' +
  '<a href="javascript:alert(1)">bağlantı</a>' +
  '<div onclick="window.__XSS3=1">tıklanabilir</div>' +
  '<iframe src="https://ornek.com"></iframe>' +
  '<svg onload="window.__XSS4=1"></svg>';

/**
 * `sicil_getir` yanıtını yakalayıp açıklamaya yükü yerleştirir.
 *
 * ⚠ YANIT AYRIŞTIRILAMAZSA ORİJİNAL AYNEN GEÇİYOR. Aksi hâlde tek bir
 * biçim değişikliği testi "yük çalışmadı" diye YEŞİL gösterirdi — oysa
 * sayfa hiç yüklenmemiş olurdu.
 */
async function yukuEnjekteEt(page) {
  await page.route('**/rest/v1/rpc/sicil_getir*', async (route) => {
    const yanit = await route.fetch();
    let govde;
    try {
      govde = await yanit.json();
    } catch {
      return route.fulfill({ response: yanit });
    }
    if (!govde || !govde.arac) return route.fulfill({ response: yanit });
    govde.arac.description = YUK;
    govde.arac.details = YUK;
    await route.fulfill({ response: yanit, body: JSON.stringify(govde) });
  });
}

test.describe('Açıklama alanı XSS temizliği', () => {
  test('enjekte edilen betik ÇALIŞMIYOR ve saldırı etiketleri DOM\'a girmiyor', async ({ page }) => {
    const pin = await ornekPin();
    await yukuEnjekteEt(page);

    const baslangicBasligi = 'OTOCV-XSS-TESTI';
    await page.addInitScript((b) => { document.title = b; }, baslangicBasligi);

    await page.goto(`/details/${pin}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const alan = page.locator('[class*="prose"]').first();
    await expect(alan).toBeVisible({ timeout: 30_000 });

    // 1) Hiçbir yük çalışmamalı.
    const calisanlar = await page.evaluate(() =>
      [window.__XSS1, window.__XSS2, window.__XSS3, window.__XSS4].filter(Boolean).length);
    expect(calisanlar, 'enjekte edilen betiklerden biri çalıştı').toBe(0);

    // 2) Yük `document.title`'ı değiştirmemeli. Taramada tam olarak bu olmuştu.
    //    Sayfanın kendi başlığını yazması normal; yükün yazdığı değer olmamalı.
    await expect(page).not.toHaveTitle(/XSS-CALISTI/);

    // 3) Saldırı taşıyan düğümler DOM'da olmamalı.
    const tehlikeli = await alan.evaluate((el) => ({
      img: el.querySelectorAll('img').length,
      script: el.querySelectorAll('script').length,
      iframe: el.querySelectorAll('iframe').length,
      svg: el.querySelectorAll('svg').length,
      baglanti: el.querySelectorAll('a').length,
      olayOznitelikli: el.querySelectorAll('[onclick],[onerror],[onload]').length,
    }));
    expect(tehlikeli, 'temizleyici bir saldırı düğümünü geçirdi').toEqual({
      img: 0, script: 0, iframe: 0, svg: 0, baglanti: 0, olayOznitelikli: 0,
    });
  });

  test('meşru biçimlendirme KORUNUYOR (temizleyici aşırı agresif değil)', async ({ page }) => {
    const pin = await ornekPin();
    await yukuEnjekteEt(page);

    await page.goto(`/details/${pin}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const alan = page.locator('[class*="prose"]').first();
    await expect(alan).toBeVisible({ timeout: 30_000 });

    const korunan = await alan.evaluate((el) => ({
      p: el.querySelectorAll('p').length,
      b: el.querySelectorAll('b').length,
      i: el.querySelectorAll('i').length,
      ul: el.querySelectorAll('ul').length,
      li: el.querySelectorAll('li').length,
      font: el.querySelectorAll('font').length,
      span: el.querySelectorAll('span').length,
    }));
    for (const [etiket, adet] of Object.entries(korunan)) {
      expect(adet, `<${etiket}> temizlikte kayboldu — ürünün kendi açıklaması bozulur`).toBeGreaterThan(0);
    }

    // ⚠ ATILAN ETİKETİN METNİ KALMALI (KEEP_CONTENT). Kullanıcının yazdığı
    // cümle, tanımadığımız bir sarmalayıcı yüzünden yok olmamalı.
    const metin = await alan.innerText();
    expect(metin).toContain('tıklanabilir');
    expect(metin).toContain('bağlantı');
  });
});
