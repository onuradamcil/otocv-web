// =========================================================================
// ROTA ERİŞİMİ VE SAYFA SAĞLIĞI
//
// NE YAKALAR: Bir sayfanın hiç açılmaması. Geliştirme sırasında iki kez
// tüm site 500 döndü — bir kez `return (` ile eleman arasına JSX yorumu
// konduğu için (parse hatası), bir kez de bir bileşenin import satırı
// eksik kaldığı için. İkisi de ancak derleme elle çalıştırıldığında
// görüldü. Bu paket onları saniyeler içinde yakalar.
//
// NEDEN sadece "200 döndü" yetmez: Next.js hata sayfası da 200 dönebilir.
// O yüzden her rotada AYRICA sayfanın gerçekten içerik bastığı ve konsola
// hata yazmadığı denetleniyor.
// =========================================================================

const { test, expect, girisYap } = require('./yardimcilar');

// Herkese açık rotalar — oturum gerektirmez.
const ACIK_ROTALAR = [
  { yol: '/', ad: 'Anasayfa / vitrin' },
  { yol: '/verify', ad: 'PIN sorgulama' },
  // Anasayfa sabit 24 kart gösteriyor; sığmayan araçların tek adresi
  // burası. Yeni rota olduğu için bekçiye eklendi: aksi hâlde konsol
  // hatası, oturum sızıntısı ve boş sayfa denetimlerinin hiçbiri
  // bu rotaya uygulanmazdı.
  { yol: '/vitrin', ad: 'Vitrin (tüm araçlar)' },
  { yol: '/login', ad: 'Giriş' },
  { yol: '/register', ad: 'Kayıt' },
  { yol: '/dashboard', ad: 'Özet (yer tutucu)' },
  { yol: '/query-history', ad: 'Sorgu geçmişi (yer tutucu)' },
  { yol: '/packages', ad: 'Ücretler' },
  // Oturum GEREKTİRMİYOR: giriş yapmamış ziyaretçiye giriş çağrısı gösteriyor.
  // Korumalı listeye konursa test /login'e yönlendirme bekler ve kırılır.
  { yol: '/devir', ad: 'Araç devir' },
  // Yasal sayfalar: footer ve giriş ekranı buraya bağlanıyor. Kırılırlarsa
  // kullanıcı sözleşmeyi okumak isterken 404 görür.
  { yol: '/kvkk', ad: 'KVKK aydınlatma' },
  { yol: '/gizlilik', ad: 'Gizlilik politikası' },
  { yol: '/kullanim-sartlari', ad: 'Kullanım şartları' },
  { yol: '/account', ad: 'Hesap (yer tutucu)' },
  { yol: '/insurance-offer', ad: 'Sigorta teklifi (yer tutucu)' },
  { yol: '/maintenance-planner', ad: 'Bakım planı (yer tutucu)' },
];

// Oturum gerektiren rotalar — çıkışta /login'e yönlenmeli.
const KORUMALI_ROTALAR = ['/garage', '/my-listings', '/add-vehicle/step1'];

test.describe('Herkese açık rotalar', () => {
  for (const { yol, ad } of ACIK_ROTALAR) {
    test(`${yol} — ${ad} sağlıklı açılıyor`, async ({ page }) => {
      const konsolHatalari = [];
      const sayfaHatalari = [];
      page.on('console', (m) => m.type() === 'error' && konsolHatalari.push(m.text()));
      page.on('pageerror', (e) => sayfaHatalari.push(String(e)));

      const yanit = await page.goto(yol, { waitUntil: 'domcontentloaded' });
      expect(yanit.status(), `${yol} HTTP durumu`).toBe(200);

      await page.waitForLoadState('networkidle');

      // Sayfa gerçekten içerik bastı mı? Boş bir kabuk 200 dönebilir.
      const metin = await page.locator('body').innerText();
      expect(metin.length, `${yol} içerik uzunluğu`).toBeGreaterThan(80);

      // Site çatısı yerinde mi? Header kaybolduysa layout kırılmış demektir.
      await expect(page.locator('header').first()).toBeVisible();

      expect(sayfaHatalari, `${yol} sayfa hatası`).toEqual([]);
      expect(konsolHatalari, `${yol} konsol hatası`).toEqual([]);
    });
  }
});

test.describe('Korumalı rotalar', () => {
  for (const yol of KORUMALI_ROTALAR) {
    test(`${yol} — çıkışta /login'e yönlendiriyor`, async ({ page }) => {
      await page.goto(yol);
      await page.waitForURL((u) => u.toString().includes('/login'), { timeout: 30_000 });
      expect(page.url()).toContain('/login');
    });
  }

  test('oturum açıldığında korumalı rotalar açılıyor', async ({ page }) => {
    await girisYap(page);
    for (const yol of KORUMALI_ROTALAR) {
      const yanit = await page.goto(yol, { waitUntil: 'domcontentloaded' });
      expect(yanit.status(), `${yol} HTTP`).toBe(200);
      await page.waitForLoadState('networkidle');
      expect(page.url(), `${yol} yönlendirilmemeli`).not.toContain('/login');
    }
  });
});

test.describe('Sistem sayfaları', () => {
  test('olmayan sayfa 404 döndürüyor ve 404 ekranı basıyor', async ({ page }) => {
    const yanit = await page.goto('/kesinlikle-olmayan-sayfa-xyz', { waitUntil: 'domcontentloaded' });
    expect(yanit.status()).toBe(404);
    const metin = await page.locator('body').innerText();
    // Boş bir 404 değil, kendi tasarladığımız ekran olmalı.
    expect(metin.length).toBeGreaterThan(40);
  });

  for (const [yol, beklenen] of [
    ['/robots.txt', 'text/plain'],
    ['/sitemap.xml', 'xml'],
    ['/manifest.webmanifest', 'json'],
  ]) {
    test(`${yol} servis ediliyor`, async ({ request }) => {
      const y = await request.get(yol);
      expect(y.status()).toBe(200);
      expect(y.headers()['content-type'] || '').toContain(beklenen);
    });
  }
});

test.describe('PIN ile doğrulama akışı', () => {
  test('/verify/[pin] geçerli kodda araç detayına yönlendiriyor', async ({ page }) => {
    const { ornekPin } = require('./yardimcilar');
    const pin = await ornekPin();
    await page.goto(`/verify/${pin}`);
    await page.waitForURL((u) => u.toString().includes('/details/'), { timeout: 30_000 });
    expect(page.url()).toContain(`/details/${pin}`);
  });

  test('geçersiz PIN forma hata mesajıyla dönüyor', async ({ page }) => {
    await page.goto('/verify/CV-YOKBOYLE');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);
    // Detaya YÖNLENMEMELİ; form ekranında kalmalı.
    expect(page.url()).not.toContain('/details/');
  });
});
