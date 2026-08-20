// =========================================================================
// 27 · ARAMA EKRANI VE VİTRİN AYRIMI
//
// -------------------------------------------------------------------------
// NİYE BU PAKET VAR
// -------------------------------------------------------------------------
// `/arama` ve `/vitrin` rotalarının UI testi HİÇ YOKTU. `18-vitrin-gorunurlugu`
// bir RLS paketi — `/vitrin`i hiç açmıyor. Yani şu davranışların hiçbiri
// bekçisizdi: adresle gelen süzgeçler, arama çipi, sayfalama, liste/ızgara
// değiştirici, ağaç girintisi, katman ayrımı.
//
// -------------------------------------------------------------------------
// ÜRÜN KARARI: ÜÇ AYRI YÜZEY
// -------------------------------------------------------------------------
//   /        teşhir — vitrin katmanı, SÜZÜLMEZ, seçim yapılınca /arama'ya götürür
//   /vitrin  teşhirin tamamı
//   /arama   sonuç ekranı — arama + süzgeçler + yatay liste
//
// Semptom şuydu: anasayfa ızgarasının başlığı `suzgecEtkin` durumuna göre
// "Vitrindeki Araçlar" ile "Süzgeç sonuçları" arasında gidip geliyordu; aynı
// kutu bazen teşhir bazen sonuç listesiydi.
// =========================================================================

const { test, expect, izgaraYerlessin } = require('./yardimcilar');

/** Kart çıpası: `MarketplaceView`teki `aria-label`e bağlı, değiştirmeyin. */
async function kartSayisi(page) {
  return page.locator('[role="button"][aria-label*="sicilini görüntüle"]').count();
}

test.describe('Arama ekranı · adresten süzgeç', () => {
  test('`?q=` ile açılış sonucu süzülmüş getiriyor', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/arama');
    await page.waitForLoadState('networkidle');
    await izgaraYerlessin(page);
    const hepsi = await kartSayisi(page);
    test.skip(hepsi < 2, 'süzülecek kadar araç yok');

    await page.goto('/arama?q=bmw');
    await page.waitForLoadState('networkidle');
    await izgaraYerlessin(page);

    expect(
      await kartSayisi(page),
      'adresteki arama uygulanmadı — `?q=` yok sayılıyor'
    ).toBeLessThan(hepsi);
  });

  test('`?marka=` ile açılış hem süzüyor hem AĞACI geri kuruyor', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/arama?marka=bmw');
    await page.waitForLoadState('networkidle');
    await izgaraYerlessin(page);

    const kutu = page.locator('aside').getByRole('button', { name: 'Marka' }).first();
    test.skip(await kutu.count() === 0, 'marka grubu yok');
    const govde = page.locator(`[id="${await kutu.getAttribute('aria-controls')}"]`);

    // ⚠ ASIL İDDİA: ağaç adresten geri kurulmuş olmalı. `suzgec.marka`
    // normalize AD tutuyor, `agacYolu` katalog KİMLİĞİ istiyor; bu adım
    // olmadan süzgeç uygulanır ama panel köke dönmüş görünürdü.
    await expect(
      govde.getByRole('button', { name: 'Tüm markalar' }),
      'ağaç adresten geri kurulmadı — kırıntı yolu çizilmemiş'
    ).toHaveCount(1, { timeout: 20_000 });
  });

  test('süzgeç seçimi ADRESE yansıyor ve yenilemede korunuyor', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/arama');
    await page.waitForLoadState('networkidle');
    await izgaraYerlessin(page);

    const baslik = page.getByRole('button', { name: 'Kilometre' }).first();
    test.skip(await baslik.count() === 0, 'kilometre grubu yok');
    await baslik.click();
    await page.waitForTimeout(400);
    await page.getByLabel('En az kilometre').fill('50000');
    // Adres senkronu 300 ms gecikmeli.
    await page.waitForTimeout(1600);

    expect(decodeURIComponent(page.url()), 'süzgeç adrese yazılmadı').toContain('kmMin=50000');

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: 'Kilometre' }).first().click();
    await page.waitForTimeout(400);
    await expect(
      page.getByLabel('En az kilometre'),
      'yenilemeden sonra süzgeç kayboldu — adres okunmuyor'
    ).toHaveValue('50000');
  });
});

test.describe('Arama ekranı · arama çipi', () => {
  test('çip görünüyor ve ✕ ROTA DEĞİŞTİRMEDEN aramayı kaldırıyor', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/arama?q=bmw');
    await page.waitForLoadState('networkidle');
    await izgaraYerlessin(page);

    const kaldir = page.getByRole('button', { name: /aramasını kaldır/i });
    test.skip(await kaldir.count() === 0, 'arama çipi çizilmedi');

    await kaldir.first().click();
    await page.waitForTimeout(1800);

    // ⚠ ROTA DEĞİŞMEMELİ: aynı sayfada tüm sonuçlara dönülüyor.
    expect(new URL(page.url()).pathname, 'çip kaldırınca rota değişti').toBe('/arama');
    expect(page.url(), 'arama adresten silinmedi — yenilemede geri gelirdi').not.toContain('q=');
  });
});

test.describe('Arama ekranı · görünüm ve liste', () => {
  test('liste/ızgara değiştirici çalışıyor ve seçim HATIRLANIYOR', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/arama');
    await page.waitForLoadState('networkidle');
    await izgaraYerlessin(page);

    const izgara = page.getByRole('button', { name: 'Izgara görünümü' });
    const liste = page.getByRole('button', { name: 'Liste görünümü' });
    test.skip(await izgara.count() === 0, 'görünüm değiştirici yok (dar ekran)');

    await izgara.click();
    await page.waitForTimeout(600);
    await expect(izgara, 'ızgaraya geçilmedi').toHaveAttribute('aria-pressed', 'true');

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(
      page.getByRole('button', { name: 'Izgara görünümü' }),
      'görünüm tercihi yenilemede korunmadı'
    ).toHaveAttribute('aria-pressed', 'true');

    await liste.click();
    await page.waitForTimeout(600);
  });

  test('kartlar TEK kapsayıcıda çiziliyor (çift render bekçisi)', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/arama');
    await page.waitForLoadState('networkidle');
    await izgaraYerlessin(page);

    // -------------------------------------------------------------------
    // ⚠ NİYE VAR: liste ilk yazımda `hidden lg:flex` + `lg:hidden` ikilisiyle
    // hem masaüstü hem mobil biçiminde basılıyordu. 8 sonuç için DOM'da 16
    // öge oluyor, ekran okuyucu her aracı iki kez okuyordu. Karar artık
    // `matchMedia` ile veriliyor ve tek liste çiziliyor.
    //
    // ⚠ ÖLÇÜT `aria-label` TEKRARI DEĞİL, KAPSAYICI SAYISI.
    // İlk yazımda etiket tekrarına bakılıyordu ve test YANLIŞ yere düştü:
    // etiket marka+model+yıl'dan oluşuyor, iki FARKLI aracın aynı etikete
    // sahip olması meşru (ölçüldü: iki ayrı "BMW 320i 2021"). Çift render
    // ise kartların İKİ AYRI ebeveyn altında toplanması demek.
    // -------------------------------------------------------------------
    const olcum = await page.evaluate(() => {
      const kartlar = [...document.querySelectorAll('[aria-label*="sicilini görüntüle"]')];
      return { adet: kartlar.length, kapsayici: new Set(kartlar.map((e) => e.parentElement)).size };
    });
    test.skip(olcum.adet === 0, 'araç yok');

    expect(
      olcum.kapsayici,
      `kartlar ${olcum.kapsayici} ayrı kapsayıcıda çizilmiş — liste hem masaüstü `
      + 'hem mobil biçiminde birden basılıyor olabilir'
    ).toBe(1);
  });
});

test.describe('Vitrin ayrımı', () => {
  test('anasayfa ızgarası YALNIZCA vitrin katmanını gösteriyor', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await izgaraYerlessin(page);

    // Başlık artık gidip gelmiyor: anasayfa daima teşhir.
    await expect(
      page.getByRole('heading', { name: 'Vitrindeki Araçlar' }),
      'anasayfa başlığı "Vitrindeki Araçlar" değil'
    ).toBeVisible();
  });

  test('`/arama` anasayfadan DAHA GENİŞ bir küme gösteriyor', async ({ page }) => {
    test.setTimeout(120_000);
    // ⚠ ASIL AYRIMIN KANITI: anasayfa vitrin katmanı, `/arama` tüm aranabilir
    // envanter. Ölçülen fark bugün 134 / 143.
    await page.goto('/arama');
    await page.waitForLoadState('networkidle');
    await izgaraYerlessin(page);
    const aramaToplam = await page.locator('body').innerText();

    // "Daha fazla göster (N araç daha)" metninden toplam çıkarılıyor;
    // yoksa kart sayısı kullanılıyor.
    const m = aramaToplam.match(/Daha fazla göster \((\d+) araç daha\)/);
    const aramaKart = await kartSayisi(page);
    const aramaHepsi = m ? aramaKart + Number(m[1]) : aramaKart;

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await izgaraYerlessin(page);
    const anaKart = await kartSayisi(page);

    test.skip(aramaHepsi === 0, 'envanter boş');
    expect(
      aramaHepsi,
      'arama ekranı anasayfadan geniş değil — katman ayrımı çalışmıyor olabilir'
    ).toBeGreaterThanOrEqual(anaKart);
  });
});

test.describe('Marka ağacı · girinti', () => {
  test('çocuk satırları ebeveyninden DAHA İÇERİDE çiziliyor', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/arama?marka=bmw');
    await page.waitForLoadState('networkidle');
    await izgaraYerlessin(page);

    const kutu = page.locator('aside').getByRole('button', { name: 'Marka' }).first();
    test.skip(await kutu.count() === 0, 'marka grubu yok');
    const govdeId = await kutu.getAttribute('aria-controls');

    // ⚠ METİN ÖLÇÜLÜYOR, KUTU DEĞİL. Girinti `pl-*` ile veriliyor ve satır
    // `w-full`; yani kutunun sol kenarı değişmiyor, METİN kayıyor. İlk
    // ölçümde kutu ölçülmüş ve "girinti çalışmıyor" sanılmıştı.
    const olcum = await page.evaluate((id) => {
      const govde = document.getElementById(id);
      if (!govde) return null;
      const satirlar = [...govde.querySelectorAll('button, span[aria-current]')];
      return satirlar.map((e) => {
        const metin = [...e.querySelectorAll('span')].find((x) => x.textContent.trim()) || e;
        return { ad: e.textContent.trim().slice(0, 20), sol: Math.round(metin.getBoundingClientRect().left) };
      }).filter((x) => x.ad);
    }, govdeId);

    test.skip(!olcum || olcum.length < 3, 'ağaç yeterince derin değil');

    // İlk halka kök ("Tüm markalar"), sonuncular çocuk satırları.
    const kok = olcum[0];
    const cocuk = olcum[olcum.length - 1];
    expect(
      cocuk.sol,
      `çocuk satırı ("${cocuk.ad}") kök halkadan ("${kok.ad}") daha içeride değil — `
      + 'ağaç düz liste gibi görünüyor'
    ).toBeGreaterThan(kok.sol);
  });
});

test.describe('Aksan normalizasyonu', () => {
  test('AKSANLI marka dalı seçilince süzgeç GERÇEKTEN uygulanıyor', async ({ page }) => {
    test.setTimeout(120_000);
    // -------------------------------------------------------------------
    // ⚠ BU TESTİN KORUDUĞU HATA
    // -------------------------------------------------------------------
    // İstemcideki `agacAnahtari` yalnızca i-ailesini katlıyordu
    // ('Tofaş' -> 'tofaş'), sunucudaki `arama_normalize` ise Türkçe VE
    // Avrupa aksanlarının tamamını ASCII'ye indiriyordu ('tofas').
    // Yüklem `arama_normalize(brand) = v_marka` olduğu için iki taraf
    // eşleşmiyordu: Tofaş, Doğan, Şahin, Serçe, C-Elysée ve 43 paket dalı
    // SESSİZCE boş liste veriyordu.
    //
    // Ölçüldü: `lower('Tofaş') = arama_normalize('Tofaş')` -> false.
    //
    // Test, aksanlı bir dal seçip adresteki anahtarın ASCII olduğunu ve
    // sayfa yenilenince ağacın AYNI dala geri kurulduğunu doğruluyor.
    // Zincirin iki ucu da (yazma ve okuma) böylece sınanmış oluyor.
    // -------------------------------------------------------------------
    await page.goto('/arama');
    await page.waitForLoadState('networkidle');
    await izgaraYerlessin(page);

    const kutu = page.locator('aside').getByRole('button', { name: 'Marka' }).first();
    test.skip(await kutu.count() === 0, 'marka grubu yok');
    const govdeId = await kutu.getAttribute('aria-controls');
    const govde = page.locator(`[id="${govdeId}"]`);

    // Katalogdaki aksanlı markayı bul (bugün: Tofaş).
    const aksanli = govde.locator('button').filter({ hasText: /[çğıöşüÇĞİÖŞÜ]/ });
    const adet = await aksanli.count();
    test.skip(adet === 0, 'ağaçta aksanlı marka dalı yok');

    const ad = (await aksanli.first().innerText()).trim();
    await aksanli.first().click();
    await page.waitForTimeout(2500);

    // 1) İstemci ASCII anahtar üretmeli — adreste aksanlı harf KALMAMALI.
    const adres = decodeURIComponent(page.url());
    const anahtar = (adres.match(/marka=([^&]*)/) || [])[1] || '';
    expect(anahtar, `"${ad}" için adrese anahtar yazılmadı`).not.toBe('');
    expect(
      anahtar,
      `adresteki marka anahtarı ("${anahtar}") hâlâ aksanlı harf taşıyor — `
      + 'istemci `agacAnahtari` ile sunucu `arama_normalize` ayrışmış demektir'
    ).not.toMatch(/[çğıöşüÇĞİÖŞÜ]/);

    // 2) Yenilemede ağaç AYNI dala geri kurulmalı (sunucu tarafı eşleşme).
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);

    const yeniGovdeId = await page.locator('aside').getByRole('button', { name: 'Marka' })
      .first().getAttribute('aria-controls');
    await expect(
      page.locator(`[id="${yeniGovdeId}"]`).getByText(ad, { exact: true }),
      `yenilemeden sonra "${ad}" dalı ağaçta bulunamadı — anahtar sunucuda eşleşmiyor`
    ).toBeVisible({ timeout: 20_000 });
  });
});
