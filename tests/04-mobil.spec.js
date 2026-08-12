// =========================================================================
// MOBİL VE ERİŞİLEBİLİRLİK
//
// Bu dosya YALNIZCA mobil projede koşar (playwright.config.js -> testMatch).
// Sebebi: form doldurma testlerini iki cihazda çalıştırmak veritabanına iki
// kez yazmak olurdu.
//
// NE YAKALAR:
//   · yatay kaydırma (mobilde en sık görülen yerleşim kusuru)
//   · etiketsiz buton (ekran okuyucu "düğme" der, ne yaptığını söylemez)
//   · h1 eksikliği (başlık seviyesiyle gezinen kullanıcı sayfanın konusunu
//     kaybeder; SEO'da da sayfa başlıksız sayılır)
//   · WCAG 2.2 AA dokunma alanı (SC 2.5.8, asgari 24x24)
//   · çekmecenin odak tuzağı ve kapanışta odağı geri vermesi
//
// Son madde geliştirme sırasında bulundu: MobileDrawer'ın kendi dosya
// başlığında gereksinim olarak yazılıydı ama kod yapmıyordu. Klavyeyle
// gezen kullanıcı çekmeceyi kapattığında sayfanın en başına savruluyordu.
// =========================================================================

const { test, expect } = require('./yardimcilar');

const ROTALAR = ['/', '/verify', '/login'];

test.describe('Mobil yerleşim', () => {
  for (const yol of ROTALAR) {
    test(`${yol} — yatay kaydırma yok`, async ({ page }) => {
      await page.goto(yol);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1200);

      const tasma = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(tasma, `${yol} yatay taşma (px)`).toBeLessThanOrEqual(1);
    });
  }
});

test.describe('Erişilebilirlik temelleri', () => {
  for (const yol of ROTALAR) {
    test(`${yol} — her butonun erişilebilir adı var`, async ({ page }) => {
      await page.goto(yol);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1200);

      const etiketsiz = await page.evaluate(() =>
        [...document.querySelectorAll('button')]
          .filter((b) => !b.textContent.trim() && !b.getAttribute('aria-label') && !b.getAttribute('title'))
          .map((b) => (b.className || '').slice(0, 60))
      );
      expect(etiketsiz, `${yol} etiketsiz butonlar`).toEqual([]);
    });

    test(`${yol} — tam bir h1 var`, async ({ page }) => {
      await page.goto(yol);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1200);

      const adet = await page.locator('h1').count();
      expect(adet, `${yol} h1 sayısı (tam 1 olmalı)`).toBe(1);
    });

    test(`${yol} — dokunma alanları WCAG AA asgarisini geçiyor`, async ({ page }) => {
      await page.goto(yol);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1200);

      // sr-only öğeler dışlanır: görünmez olmaları DOĞRU davranış, bir
      // atlama bağlantısının dokunma alanı olmamalı.
      const kucuk = await page.evaluate(() =>
        [...document.querySelectorAll('button, a[href]')]
          .filter((e) => {
            const s = getComputedStyle(e);
            if ((e.className || '').toString().includes('sr-only')) return false;
            if (s.position === 'absolute' && (parseInt(s.width) <= 1 || parseInt(s.height) <= 1)) return false;
            const r = e.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && (r.height < 24 || r.width < 24);
          })
          .map((e) => {
            const r = e.getBoundingClientRect();
            const ad = (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 24);
            return `${ad} ${Math.round(r.width)}x${Math.round(r.height)}`;
          })
      );
      expect(kucuk, `${yol} 24x24 altında öğeler`).toEqual([]);
    });
  }
});

test.describe('Mobil çekmece', () => {
  test('açılıyor, odağı tutuyor, Esc ile kapanıyor ve odağı geri veriyor', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // DİKKAT: 'button[aria-expanded]' seçicisi KULLANILMAZ. Sayfada üç öğede
    // aria-expanded var (İlan Ver menüsü, hamburger, bildirim zili) ve o
    // seçici ilkini yakalıyor. Geliştirme sırasında bu yüzden çekmecenin
    // bozuk olduğu sanıldı; oysa yanlış butona tıklanıyordu.
    const hamburger = page.locator("button[aria-label='Menüyü aç']");
    await expect(hamburger).toBeVisible();

    const kutu = await hamburger.boundingBox();
    expect(kutu.width, 'hamburger dokunma alanı').toBeGreaterThanOrEqual(44);
    expect(kutu.height, 'hamburger dokunma alanı').toBeGreaterThanOrEqual(44);

    await hamburger.focus();
    await hamburger.click();
    await page.waitForTimeout(600);

    const cekmece = page.locator("[role='dialog'][aria-modal='true']");
    await expect(cekmece, 'çekmece role=dialog + aria-modal ile açılmalı').toBeVisible();

    // Açıkken sayfa kaydırması kilitli olmalı.
    const tasma = await page.evaluate(() => getComputedStyle(document.body).overflow);
    expect(tasma, 'çekmece açıkken gövde kaydırması kilitli olmalı').toBe('hidden');

    // Odak tuzağı: 20 Tab boyunca odak çekmeceden çıkmamalı.
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const icinde = await page.evaluate(() => {
        const d = document.querySelector("[role='dialog']");
        return d ? d.contains(document.activeElement) : false;
      });
      expect(icinde, `${i + 1}. Tab'da odak çekmeceden çıktı`).toBe(true);
    }

    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
    await expect(cekmece, 'Esc ile kapanmalı').toHaveCount(0);

    // Kapanışta odak hamburger'a dönmeli. Dönmezse klavyeyle gezen kullanıcı
    // sayfanın en başına savrulur.
    const odakEtiketi = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
    expect(odakEtiketi, 'kapanışta odak hamburger butonuna dönmeli').toBe('Menüyü aç');
  });
});
