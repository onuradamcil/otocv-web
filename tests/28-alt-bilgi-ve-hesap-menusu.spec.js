// =========================================================================
// 28 · ALT BİLGİ KOYU TONU + HESAP MENÜSÜ
//
// -------------------------------------------------------------------------
// NİYE BU PAKET VAR
// -------------------------------------------------------------------------
// Alt bilgi `bg-white` idi, sayfa zemini `--color-canvas` (#FFFDFB): ikisi
// arasındaki fark 1.01:1 ölçüldü, yani alt bilgi sayfadan görsel olarak HİÇ
// ayrılmıyordu. Zemin markanın kendi koyu tonuna (`#0F172A`) çekildi.
//
// ⚠ ZEMİN DEĞİŞTİRMEK, O ZEMİNDEKİ HER METNİ RİSKE ATAR. Açık zeminde AA'yı
// geçen `text-slate-500`, koyu zeminde 3.59:1'e düşüyor. Bu paket tam olarak
// bunu bekliyor: birileri ileride tonu değiştirir ya da eski gri değerleri
// geri getirirse, sessizce okunaksız bir alt bilgi kalmasın.
//
// Aynı şey ODAK HALKASI için de geçerli: genel kural `outline: #4f46e5`
// (indigo-600) ve bu koyu zeminde 2.1:1 — klavyeyle gezen kullanıcı nerede
// olduğunu göremez. `.odak-acik` sınıfı halkayı beyaza çeviriyor.
//
// -------------------------------------------------------------------------
// ⚠ RENKLER TUVALE BOYANARAK OKUNUYOR, DİZE AYRIŞTIRILMIYOR
// -------------------------------------------------------------------------
// `getComputedStyle().color` bu projede `lab(65.53 -2.25 -14.5)` biçiminde
// dönebiliyor. Dizeyi elle ayrıştırmak bir kez patladı, daha öncesinde de
// UYDURMA ihlal üretmişti. Tuvale boyayıp pikseli geri okumak bütün renk
// uzaylarını aynı yere indiriyor ve alfa varsa zemine katmanlıyor.
// =========================================================================

const { test, expect, girisYap } = require('./yardimcilar');

/**
 * Bir rengi, verilen zeminin ÜSTÜNE boyayıp gerçek pikseli döndürür.
 * ⚠ `page.evaluate`e DİZE değil GERÇEK FONKSİYON veriliyor: dize hâli
 * ifade olarak değerlendirilip diziyi değil `undefined` döndürüyordu.
 */
async function rengiCoz(page, renk, zemin = '#FFFFFF') {
  return page.evaluate(([r, z]) => {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.fillStyle = z; x.fillRect(0, 0, 1, 1);
    x.fillStyle = r; x.fillRect(0, 0, 1, 1);
    const d = x.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  }, [renk, zemin]);
}

function kanal(c) {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function parlaklik([r, g, b]) {
  return 0.2126 * kanal(r) + 0.7152 * kanal(g) + 0.0722 * kanal(b);
}
function kontrast(a, b) {
  const [x, y] = parlaklik(a) >= parlaklik(b) ? [a, b] : [b, a];
  return (parlaklik(x) + 0.05) / (parlaklik(y) + 0.05);
}

test.describe('Alt bilgi · koyu ton', () => {
  test('sayfa zemininden görsel olarak AYRILIYOR', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const zeminler = await page.evaluate(() => ({
      alt: getComputedStyle(document.querySelector('footer')).backgroundColor,
      sayfa: getComputedStyle(document.body).backgroundColor,
    }));

    const alt = await rengiCoz(page, zeminler.alt);
    const sayfa = await rengiCoz(page, zeminler.sayfa);

    // 3:1 grafik nesne eşiği: iki yüzeyin sınırı gerçekten görünmeli.
    // Onarım öncesi bu değer 1.01:1 idi.
    expect(kontrast(alt, sayfa)).toBeGreaterThan(3);
  });

  test('her metin AA kontrast eşiğini geçiyor', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const zeminDize = await page.evaluate(
      () => getComputedStyle(document.querySelector('footer')).backgroundColor,
    );
    const zemin = await rengiCoz(page, zeminDize);
    const zeminRgb = `rgb(${zemin.join(',')})`;

    const ogeler = await page.evaluate(() => {
      const f = document.querySelector('footer');
      const out = [];
      f.querySelectorAll('h2, a, span, p').forEach((el) => {
        const t = (el.innerText || '').trim();
        if (!t || t.length > 80) return;
        if (el.querySelector('h2, a, span, p')) return;  // yalnızca yaprak
        out.push({ metin: t.slice(0, 40), renk: getComputedStyle(el).color });
      });
      return out;
    });

    expect(ogeler.length).toBeGreaterThan(5);   // gerçekten ölçtüğünün kanıtı

    const dusenler = [];
    for (const o of ogeler) {
      const rgb = await rengiCoz(page, o.renk, zeminRgb);
      const k = kontrast(rgb, zemin);
      if (k < 4.5) dusenler.push(`${o.metin} → ${k.toFixed(2)}:1`);
    }
    expect(dusenler).toEqual([]);
  });

  test('bağlantılar koyu zemin odak halkası taşıyor', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // `.odak-acik` olmadan halka indigo-600 kalır ve #0F172A üstünde 2.1:1
    // ile görünmez olur. Sınıfın VARLIĞI denetleniyor: `:focus-visible`
    // yalnızca klavye etkileşiminde eşleştiği için hesaplanan `outlineColor`
    // headless'ta güvenilir bir kanıt değil.
    const eksik = await page.$$eval('footer a', (baglar) =>
      baglar.filter((a) => !a.className.includes('odak-acik'))
        .map((a) => a.innerText.trim()));
    expect(eksik).toEqual([]);
  });
});

test.describe('Hesap menüsü', () => {
  test.beforeEach(async ({ page }) => {
    await girisYap(page);
  });

  async function menuyuAc(page) {
    await page.click('button[aria-controls="hesap-menusu"]');
    const menu = page.locator('#hesap-menusu');
    await menu.waitFor({ state: 'visible' });
    return menu;
  }

  test('satırlar 44 px dokunma eşiğini geçiyor', async ({ page }) => {
    const menu = await menuyuAc(page);
    const kucukler = await menu.evaluate((m) =>
      Array.from(m.querySelectorAll('a, button'))
        .map((e) => ({ metin: e.innerText.trim().split('\n')[0],
                       boy: Math.round(e.getBoundingClientRect().height) }))
        .filter((x) => x.boy < 44));
    expect(kucukler).toEqual([]);
  });

  test('satırlarda dekoratif chevron YOK', async ({ page }) => {
    const menu = await menuyuAc(page);

    // Her satırın sonundaki ok hiçbir bilgi taşımıyordu (menüdeki her satır
    // zaten bir bağlantı) ve `text-slate-300` ile beyaz üstünde 1.6:1'di.
    // Sağ taraf yalnızca GERÇEK sinyali taşımalı: okunmamış sayısı, "Yakında".
    const okluSatir = await menu.evaluate((m) =>
      Array.from(m.querySelectorAll('a'))
        .filter((a) => a.querySelectorAll('svg').length > 0)
        .map((a) => a.innerText.trim()));
    expect(okluSatir).toEqual([]);

    // Menüdeki TEK ikon çıkış düğmesinde ve METNİN SOLUNDA olmalı:
    // sağa yaslı bir ok "ileri git" demektir, oysa çıkış bir yere götürmüyor.
    const cikis = await menu.evaluate((m) => {
      const b = Array.from(m.querySelectorAll('button'))
        .find((x) => x.innerText.includes('Çıkış'));
      if (!b) return null;
      const svg = b.querySelector('svg');
      const sp = b.querySelector('span');
      return svg && sp
        ? svg.getBoundingClientRect().left < sp.getBoundingClientRect().left
        : null;
    });
    expect(cikis).toBe(true);
  });

  test('tipografi ölçeğe bağlı — ham punto yok', async ({ page }) => {
    const menu = await menuyuAc(page);
    // Satırlar 12px ham `text-xs` idi: menünün ASIL EYLEMLERİ, hemen
    // üstündeki yardımcı e-posta satırından (13px) küçük kalıyordu.
    const puntolar = await menu.evaluate((m) =>
      Array.from(m.querySelectorAll('a'))
        .map((a) => getComputedStyle(a).fontSize));
    expect(puntolar.length).toBeGreaterThan(3);
    expect([...new Set(puntolar)]).toEqual(['13px']);
  });

  test('kendi görseli yoksa SAĞLAYICI fotoğrafına düşüyor', async ({ page }) => {
    // `profiles.avatar_yolu` yalnızca kullanıcının KENDİ yüklediğini tutuyor.
    // Google ile giren kullanıcı baş harf görüyordu; artık oturumdaki
    // `user_metadata.avatar_url` yedek olarak devreye giriyor.
    //
    // ⚠ Veritabanına DOKUNULMUYOR: yanıt ağda yakalanıp `avatar_yolu` null'a
    // çevriliyor. Tarayıcı tam olarak "kendi görseli olmayan kullanıcı"yı
    // görüyor — yedeğin çalıştığı yer zaten burası.
    await page.route('**/rest/v1/profiles*', async (route) => {
      try {
        const yanit = await route.fetch();
        const govde = await yanit.json();
        if (Array.isArray(govde)) govde.forEach((s) => { s.avatar_yolu = null; });
        else if (govde && typeof govde === 'object') govde.avatar_yolu = null;
        await route.fulfill({ response: yanit, json: govde });
      } catch {
        await route.continue();
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');
    const menu = await menuyuAc(page);

    const avatar = await menu.evaluate((m) => {
      const i = m.querySelector('img');
      if (!i) return { tur: 'basharf' };
      return {
        tur: 'gorsel',
        host: (() => { try { return new URL(i.src).host; } catch { return '?'; } })(),
        referrer: i.referrerPolicy,
      };
    });

    // Bu hesabın metadata'sında gerçek bir Google fotoğrafı var; yedek
    // çalışmazsa `basharf` döner ve test düşer.
    expect(avatar.tur).toBe('gorsel');
    expect(avatar.host).toBe('lh3.googleusercontent.com');
    // Referer gönderilirse Google 403 dönebiliyor; ayrıca profil adresimizi
    // Google'a bildirmemiş oluyoruz.
    expect(avatar.referrer).toBe('no-referrer');
  });

  test('Google fotoğrafı CSP tarafından engellenmiyor', async ({ page }) => {
    // ⚠ BU SATIR OLMASAYDI ÖZELLİK SESSİZCE ÖLÜRDÜ: `img-src` yalnızca
    // 'self'/data:/blob:/Supabase idi, yani fotoğraf yüklenmeden baş harfe
    // düşerdi ve kullanıcı sebebini göremezdi.
    const yanit = await page.goto('/');
    const csp = yanit.headers()['content-security-policy'] || '';
    const imgSrc = csp.split(';').map((s) => s.trim())
      .find((s) => s.startsWith('img-src')) || '';
    expect(imgSrc).toContain('https://lh3.googleusercontent.com');
  });
});
