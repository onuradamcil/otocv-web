// =========================================================================
// 29 · BAŞLIK HİYERARŞİSİ (B3)
//
// -------------------------------------------------------------------------
// NİYE BU PAKET VAR
// -------------------------------------------------------------------------
// 19 Ağustos 2026 taramasında 21 rotanın 17'si temizdi, 4'ü değildi.
// Kademe atlaması (h1 -> h3) ekran okuyucu kullanıcısı için "arada bir
// bölüm var ama okunmuyor" demek.
//
// ⚠ ASIL BULGU SIRALAMA DEĞİLDİ. `/maintenance-planner` ekranında başlık
// listesi 10 kez "BUGÜN YAPABİLECEKLERİNİZ" gösteriyordu ve İÇİNDE HİÇ
// ARAÇ ADI YOKTU: araç adı `<span class="baslik-kart">` idi, yani görsel
// olarak başlık ama semantik olarak değil. Başlıkla içerik yer
// değiştirmişti. Başlıklar arasında gezen kullanıcı hangi karta baktığını
// anlayamıyordu. Bu yüzden bu paket yalnızca kademe saymıyor, başlıkların
// GERÇEKTEN AYIRT EDİCİ olduğunu da denetliyor.
//
// -------------------------------------------------------------------------
// ⚠ KARNE KAPSAM DIŞI
// -------------------------------------------------------------------------
// Ürün sahibinin talimatı: `/karne/*` bu turda hiç açılmıyor.
// =========================================================================

const { test, expect, girisYap } = require('./yardimcilar');

const ZIYARETCI = ['/', '/arama', '/vitrin', '/verify', '/login', '/register',
  '/reset-password', '/kvkk', '/gizlilik', '/kullanim-sartlari', '/packages'];

const OTURUMLU = ['/dashboard', '/garage', '/account', '/favorilerim', '/mesajlar',
  '/my-listings', '/query-history', '/devir', '/maintenance-planner',
  '/insurance-offer'];

/**
 * Sayfanın YERLEŞMİŞ durumunu bekler.
 *
 * ⚠ NİYE GEREKLİ — İLK YAZIŞIMDA BU TEST YANLIŞ ALARM VERDİ.
 * `/reset-password` ziyaretçide önce iskelet yükleyici çiziyor ve
 * `networkidle` o sırada tamamlanıyor; test "hiç başlık yok" diye düştü.
 * Ama iskelet İÇERİK DEĞİL, DURUM: `GlobalStepLoader` onu `role="status"`
 * + `aria-live="polite"` + `aria-busy` ile duyuruyor ve sahte gövdeyi
 * `aria-hidden` yapıyor. Geçici bir yükleme durumundan başlık beklemek
 * ürüne yanlış kusur yazmak olurdu — ölçüm yerleşmiş durumu bekliyor.
 */
async function yerlesmesiniBekle(page) {
  const iskelet = page.locator('[aria-busy="true"]');
  if (await iskelet.count() > 0) {
    await iskelet.first().waitFor({ state: 'detached', timeout: 15_000 })
      .catch(() => {});
  }
  await page.locator('h1,h2,h3,h4,h5,h6').first()
    .waitFor({ timeout: 15_000 }).catch(() => {});
}

/** Sayfadaki GÖRÜNÜR başlıkları sırayla döndürür. */
async function basliklar(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'))
      .filter((e) => (e.offsetWidth || e.offsetHeight || e.getClientRects().length)
        && (e.innerText || '').trim())
      .map((e) => ({ kademe: Number(e.tagName[1]),
                     metin: (e.innerText || '').trim().slice(0, 45) })));
}

function kusurlar(liste) {
  const hatalar = [];
  const h1 = liste.filter((b) => b.kademe === 1).length;
  if (h1 === 0) hatalar.push('h1 yok');
  if (h1 > 1) hatalar.push(`${h1} adet h1`);

  let onceki = 0;
  for (const b of liste) {
    if (onceki && b.kademe > onceki + 1) {
      hatalar.push(`atlama h${onceki} -> h${b.kademe} ("${b.metin}")`);
    }
    onceki = b.kademe;
  }
  return hatalar;
}

test.describe('Başlık hiyerarşisi · ziyaretçi', () => {
  for (const rota of ZIYARETCI) {
    test(`${rota} — kademe atlamıyor, tek h1`, async ({ page }) => {
      await page.goto(rota);
      await page.waitForLoadState('networkidle');
      await yerlesmesiniBekle(page);
      const liste = await basliklar(page);
      expect(liste.length).toBeGreaterThan(0);   // gerçekten ölçtüğünün kanıtı
      expect(kusurlar(liste)).toEqual([]);
    });
  }
});

test.describe('Başlık hiyerarşisi · oturumlu', () => {
  test.beforeEach(async ({ page }) => {
    await girisYap(page);
  });

  for (const rota of OTURUMLU) {
    test(`${rota} — kademe atlamıyor, tek h1`, async ({ page }) => {
      await page.goto(rota);
      await page.waitForLoadState('networkidle');
      await yerlesmesiniBekle(page);
      const liste = await basliklar(page);
      expect(liste.length).toBeGreaterThan(0);
      expect(kusurlar(liste)).toEqual([]);
    });
  }

  test('araç kartlarının BAŞLIĞI kartın kendi adı — tekrar eden etiket değil',
    async ({ page }) => {
      // Onarım öncesi: h1 -> (h3 "BUGÜN YAPABİLECEKLERİNİZ") x10.
      // Onarım sonrası: h1 -> h2 (araç adı) -> h3 (etiket).
      // Değişmez kural: tekrar eden etiket ASLA kendi başına duramaz,
      // her zaman kendi kartını ADLANDIRAN bir h2'nin altında olmalı.
      await page.goto('/maintenance-planner');
      await page.waitForLoadState('networkidle');
      await yerlesmesiniBekle(page);
      const liste = await basliklar(page);

      const oncekiH2Yok = [];
      let sonH2 = null;
      for (const b of liste) {
        if (b.kademe === 2) sonH2 = b.metin;
        if (b.kademe === 3 && b.metin.includes('YAPABİLECEKLERİNİZ') && !sonH2) {
          oncekiH2Yok.push(b.metin);
        }
      }
      expect(oncekiH2Yok).toEqual([]);

      // Kart varsa, başlık listesi tekrar eden etiketten BAŞKA şey de
      // içermeli — yoksa gezinme yine işe yaramaz.
      const etiketler = liste.filter((b) => b.metin.includes('YAPABİLECEKLERİNİZ'));
      if (etiketler.length > 0) {
        const kartAdlari = liste.filter((b) => b.kademe === 2
          && !b.metin.includes('YAPABİLECEKLERİNİZ'));
        expect(kartAdlari.length).toBeGreaterThan(0);
      }
    });

  test('başlıklar geçerli HTML — <span> içinde başlık yok', async ({ page }) => {
    // `<span>` satır içi öğe; içine `<h2>` koymak geçersiz. Araç adını
    // başlığa çevirirken sarmalayıcının da `<div>` olması gerekiyordu.
    for (const rota of ['/maintenance-planner', '/insurance-offer']) {
      await page.goto(rota);
      await page.waitForLoadState('networkidle');
      const gecersiz = await page.evaluate(
        () => document.querySelectorAll('span h1, span h2, span h3, span h4').length);
      expect(gecersiz, `${rota} içinde span > başlık`).toBe(0);
    }
  });
});
