// =========================================================================
// 25 · ANASAYFA — SÜZGEÇLER GERÇEKTEN SÜZÜYOR
//
// -------------------------------------------------------------------------
// NİYE BU PAKET VAR
// -------------------------------------------------------------------------
// Anasayfanın etkileşimli kısmının TAMAMI süstü. `filteredListings`
// hesaplanıyor ama hiçbir yerde çizilmiyordu; ızgara `displayedVitrinListings`
// (yalnızca öne çıkanlar) basıyordu. Sonuç: arama kutusu, marka çipleri, yıl
// aralığı ve hızlı süzgeçler tıklanınca RENGİ DEĞİŞİYOR, `aria-pressed`
// güncelleniyor — ve listede tek kart değişmiyordu.
//
// Bu hatanın en sinsi yanı buydu: görsel geri bildirim doğru olduğu için
// kullanıcı "site bozuk" değil, "bu markada araç yok" diye anlıyordu. Yani
// sessizce YANLIŞ BİR SONUÇ veriyordu.
//
// İkinci hata arama gönderimindeydi: `pinNormalize("bmw")` -> `CV-BMW` ve kod
// bunu geçerli sayıp `/karne/CV-BMW`'ye yönlendiriyordu. Marka arayan
// kullanıcı var olmayan bir karne sayfasına düşüyordu.
//
// ⚠ BU TESTLER DAVRANIŞA BAKIYOR, SINIF ADINA DEĞİL. Süzgeç arayüzü ileride
// yeniden tasarlanabilir; değişmemesi gereken şey "tıklayınca liste süzülür".
// =========================================================================

const { test, expect } = require('./yardimcilar');

/** Izgaradaki kart sayısı. Kartlar araç görseli taşıyor. */
async function kartSayisi(page) {
  return page.locator('main img, img').count();
}

test.describe('Anasayfa · süzgeçler', () => {
  test('MARKA süzgeci ızgarayı gerçekten süzüyor', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const once = await kartSayisi(page);
    test.skip(once < 2, 'süzülecek kadar araç yok (en az 2 gerekiyor)');

    // Kenar çubuğundaki ilk MARKA seçeneği ("Tümü" hariç).
    const markaGrubu = page.locator('aside').getByRole('button')
      .filter({ hasNotText: /^Tümü/ })
      .filter({ hasText: /\(\d+\)$/ });

    const adet = await markaGrubu.count();
    test.skip(adet === 0, 'marka seçeneği yok');

    // Sayısı toplamdan AZ olan bir seçenek seç: süzülme ölçülebilsin.
    let secildi = false;
    for (let i = 0; i < adet; i++) {
      const etiket = (await markaGrubu.nth(i).innerText()).replace(/\s+/g, ' ');
      const m = etiket.match(/\((\d+)\)/);
      if (m && Number(m[1]) > 0 && Number(m[1]) < once) {
        await markaGrubu.nth(i).click();
        secildi = true;
        break;
      }
    }
    test.skip(!secildi, 'toplamdan az sonuç veren seçenek bulunamadı');

    await page.waitForTimeout(800);
    const sonra = await kartSayisi(page);

    expect(
      sonra,
      `süzgeç tıklandı ama ızgara değişmedi (önce ${once}, sonra ${sonra}). `
      + 'Bu, ızgaranın süzülmüş listeye bağlı OLMADIĞI anlamına gelir.'
    ).toBeLessThan(once);
  });

  test('ARAMA yazmak listeyi süzüyor, Enter KARNEYE GÖTÜRMÜYOR', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const kutu = page.getByLabel(/PIN ile ara/i);
    await expect(kutu).toBeVisible();

    // Hiçbir araçla eşleşmeyecek bir metin: liste boşalmalı.
    await kutu.fill('zzzbulunmayanmarka');
    await page.waitForTimeout(800);
    expect(
      await kartSayisi(page),
      'aramaya rağmen ızgara değişmedi — arama listeyi süzmüyor'
    ).toBe(0);

    // ⚠ ASIL KORUMA: PIN OLMAYAN bir girdiyle Enter karneye gitmemeli.
    await kutu.fill('bmw');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    expect(
      page.url(),
      'marka yazıp Enter\'a basmak kullanıcıyı var olmayan bir karne sayfasına '
      + 'götürüyor (pinNormalize her girdiye CV- öneki ekliyor)'
    ).not.toContain('/karne/');
  });

  test('boş sonuçta SÜZGEÇ mesajı gösteriliyor, "vitrin boş" değil', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await page.getByLabel(/PIN ile ara/i).fill('zzzbulunmayanmarka');
    await page.waitForTimeout(900);

    // Boş durum iki ayrı şey olabilir ve ikisi aynı cümleyi hak etmiyor:
    // süzgeçle daraltıp sonuç bulamayan kullanıcıya "vitrinde araç yok"
    // demek, vitrinin boş olduğunu düşündürüyordu.
    await expect(page.getByText(/süzgeçlerle araç bulunamadı/i)).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Anasayfa · yapı ve erişilebilirlik', () => {
  test('başlık sırası atlama yapmıyor (h1 -> h2 -> h3)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1200);

    const seviyeler = await page.locator('h1,h2,h3,h4,h5,h6').evaluateAll(
      (ler) => ler.map((e) => Number(e.tagName[1]))
    );

    // Anasayfa h1'den doğrudan h4'e atlıyordu ve ana içerikte hiç h2 yoktu;
    // h2 yalnızca footer sütun başlıklarındaydı. Projenin kendi kuralı bu
    // atlamayı yasaklıyor (Footer.jsx:16-20).
    const atlamalar = [];
    let onceki = 0;
    for (const s of seviyeler) {
      if (onceki && s > onceki + 1) atlamalar.push(`h${onceki} -> h${s}`);
      onceki = s;
    }

    expect(atlamalar, `başlık seviyesi atlanıyor: ${atlamalar.join(', ')}`).toEqual([]);
    expect(await page.locator('h1').count(), 'anasayfada tam bir h1 olmalı').toBe(1);
  });

  test('dokunma hedefleri 44 px eşiğini geçiyor', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1200);

    // `dugme.js:41` 44 px'i WCAG dokunma alanı asgarisi olarak ilan ediyor.
    // Ölçülmüştü: anasayfada masaüstünde 24, mobilde 16 öge bunun altındaydı
    // — "Giriş Yap" 49x16, "Hesap Aç" 53x16 gibi dönüşümün en önemli iki
    // bağlantısı dahil.
    const kucukler = await page.locator('button, a[href]').evaluateAll((ler) =>
      ler
        .filter((e) => {
          const r = e.getBoundingClientRect();
          const s = getComputedStyle(e);
          if (String(e.className || '').includes('sr-only')) return false;
          // Gizli atlama bağlantısı gibi 1px'lik konumlanmış ögeler muaf.
          if (s.position === 'absolute' && (r.width <= 1 || r.height <= 1)) return false;

          // ⚠ NEXT.JS GELİŞTİRME KATMANI MUAF — bizim ögemiz değil.
          // `next dev` sayfaya kendi "Open Next.js Dev Tools" düğmesini
          // basıyor (32x32 ölçüldü) ve üretim çıktısında hiç bulunmuyor.
          // Onu saymak, kendi kodumuzda olmayan bir hatayı raporlamak olurdu.
          // (`04-mobil.spec.js` bu düğmeye takılmıyor çünkü eşiği 24 px.)
          if (e.closest('nextjs-portal, [data-nextjs-dialog], #__next-build-watcher')) return false;
          const ad = (e.innerText || e.getAttribute('aria-label') || '');
          if (/Next\.js Dev Tools|Next\.js|issues overlay/i.test(ad)) return false;

          return r.width > 0 && r.height > 0 && (r.height < 44 || r.width < 44);
        })
        .map((e) => {
          const r = e.getBoundingClientRect();
          const ad = (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 24);
          return `${Math.round(r.width)}x${Math.round(r.height)} ${ad}`;
        })
    );

    expect(
      kucukler,
      `44 px altında dokunma hedefi var: ${kucukler.join(' | ')}`
    ).toEqual([]);
  });

  test('anasayfanın KENDİ metadata\'sı var', async ({ page }) => {
    await page.goto('/');
    // `(site)/page.js` ve `layout.js` ikisi de 'use client' olduğu için
    // anasayfa kökteki genel başlığı devralıyordu. Oysa `/` sitemap'te
    // `priority 1`.
    const baslik = await page.title();
    expect(baslik, 'anasayfa başlığı boş').toBeTruthy();
    expect(baslik, 'anasayfa başlığında ürün adı yok').toContain('Oto.CV');

    const aciklama = await page.locator('meta[name="description"]').getAttribute('content');
    expect(aciklama, 'anasayfada description yok').toBeTruthy();
    expect(aciklama.length, 'description fazla kısa').toBeGreaterThan(60);
  });
});
