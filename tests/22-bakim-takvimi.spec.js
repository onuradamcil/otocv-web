// =========================================================================
// 22 · BAKIM TAKVİMİ — İKİNCİ ÖLÜ KAPI VE UYDURULMAYAN BAKIM ARALIĞI
//
// -------------------------------------------------------------------------
// NİYE BU PAKET VAR
// -------------------------------------------------------------------------
// `/maintenance-planner` anasayfadaki "Bakım Takvimi" kartının hedefiydi ve
// `ComingSoon` yer tutucusuydu — sigorta kartındaki ölü kapının birebir
// aynısı. Kart "Randevu Al" diyor, tıklayan kullanıcı "yapım aşamasında"
// görüyordu.
//
// -------------------------------------------------------------------------
// ⚠ ASIL RİSK: BAKIM ARALIĞI UYDURMAK
// -------------------------------------------------------------------------
// Bir "bakım planlayıcı" yazarken en kolay yol sabit bir aralık koymaktır:
// "her 15.000 km'de bir bakım". Ama bu aralık markaya, motora ve kullanıma
// göre değişiyor ve bizde o bilgi YOK. Sabit bir kural koymak, bu üründen
// temizlenen uydurma veri sınıfının aynısı olurdu — üstelik kullanıcıyı
// gereksiz servise göndererek para harcatabilirdi.
//
// Ekran yalnızca üç gerçeği söylüyor: kayıt var mı, son bakım ne zamandı,
// kullanıcı sonraki bakım km'sini KENDİ girdiyse ne kadar kaldı.
//
// ⚠ HİÇBİR YAZMA YOK.
// =========================================================================

const {
  test, expect, girisYap, hamMetin, supabaseIstemcisi,
} = require('./yardimcilar');

test.describe('Bakım takvimi', () => {
  test.beforeEach(async ({ page }) => {
    await girisYap(page);
    await page.goto('/maintenance-planner');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('ekran yer tutucu DEĞİL', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Bakım Takvimi', level: 1 }))
      .toBeVisible({ timeout: 15_000 });

    const metin = await hamMetin(page);
    expect(metin, 'bakım planlayıcı hâlâ "yapım aşamasında"').not.toContain('Yapım Aşamasında');
  });

  test('BAKIM ARALIĞI uydurulmuyor', async ({ page }) => {
    // Sabit aralık iddiasının bilinen yazılışları. Ekran bunlardan birini
    // basıyorsa, bilmediği bir kuralı kullanıcıya dayatıyor demektir.
    const metin = await hamMetin(page);
    for (const kalip of [
      'her 10.000', 'her 15.000', 'her 20.000', 'her 30.000',
      'bakım zamanı geldi', 'bakıma girmeniz gerekiyor', 'bakımı gecikti',
    ]) {
      expect(metin, `ekran uydurma bakım aralığı/hükmü basıyor: "${kalip}"`)
        .not.toContain(kalip);
    }
  });

  test('EKRANIN SINIRI açıkça yazıyor', async ({ page }) => {
    // "Bakım Takvimi" başlığı, ekranın bakım zamanını söyleyeceği beklentisi
    // yaratıyor. Söyleyemiyoruz; bunu saklamak yerine yazıyoruz.
    const metin = await hamMetin(page);
    expect(metin, 'ekran ne yapamadığını söylemiyor')
      .toContain('bir bakım zamanı belirlemiyor');
  });

  test('SON BAKIM TARİHLERİ veritabanıyla birebir', async ({ page }) => {
    const sb = await supabaseIstemcisi();
    const { data: { user } } = await sb.auth.getUser();
    const { data: araclar } = await sb
      .from('vehicles').select('plate_number').eq('user_id', user.id);

    const plakalar = (araclar || []).map((a) => a.plate_number);
    test.skip(plakalar.length === 0, 'test hesabında araç yok');

    const { data: kayitlar } = await sb
      .from('maintenance_records')
      .select('vehicle_plate')
      .in('vehicle_plate', plakalar);

    // Kaydı OLMAYAN araç sayısı ekranda "Kayıt Yok" çipi olarak görünmeli.
    const kayitli = new Set((kayitlar || []).map((k) => k.vehicle_plate));
    const kayitsizSayisi = plakalar.filter((p) => !kayitli.has(p)).length;

    const cipler = await page.locator('.etiket', { hasText: 'Kayıt Yok' }).count();
    expect(
      cipler,
      `"Kayıt Yok" çipi ${cipler} adet, veritabanında kayıtsız araç ${kayitsizSayisi} adet`
    ).toBe(kayitsizSayisi);
  });

  test('DEMO servis firmaları normal ekrana SIZMIYOR', async ({ page }) => {
    const metin = await hamMetin(page);
    expect(metin, 'demo firması normal ekranda görünüyor').not.toContain('Örnek Servis');
    expect(metin, 'demo şeridi normal ekranda görünüyor').not.toContain('ÖRNEK GÖRÜNÜM');
  });

  test('MOBİLDE taşma ve kesik metin yok', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const kesikler = await page.evaluate(() => {
      const c = [];
      document.querySelectorAll('*').forEach((el) => {
        if (el.children.length) return;
        const m = (el.textContent || '').trim();
        if (!m) return;
        if (el.scrollWidth > el.clientWidth + 1) c.push(m.slice(0, 40));
      });
      return c;
    });
    const gercek = kesikler.filter((k) => !k.includes('İçeriğe geç'));
    expect(gercek, `mobilde metin kesiliyor: ${gercek.join(' | ')}`).toEqual([]);

    const yatay = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(yatay, 'bakım ekranı mobilde yatay kaydırma yapıyor').toBe(false);
  });

  test('BAKIM KAYDI EKLE düğmesi gerçekten araç sayfasına GÖTÜRÜYOR', async ({ page }) => {
    // ⚠ TIKLAYAN TEST. Panel satırlarındaki kırık bağ, tıklamayan bir testin
    // altından geçmişti: satır okunuyordu ama izlenmiyordu.
    const dugme = page.getByRole('button', { name: /Bakım kaydı ekle/i }).first();
    test.skip(await dugme.count() === 0, 'ekranda araç kartı yok');

    await dugme.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const metin = await hamMetin(page);
    expect(metin, 'düğme "Araç bulunamadı" ekranına götürüyor').not.toContain('Araç bulunamadı');
    expect(page.url(), 'araç sayfasına gidilmedi').toContain('/garage');
  });
});

test.describe('Bakım takvimi · demo görünümü', () => {
  test.beforeEach(async ({ page }) => {
    await girisYap(page);
    await page.goto('/maintenance-planner?demo=1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('ÖRNEK servis görünüyor ve şerit zorunlu', async ({ page }) => {
    const metin = await hamMetin(page);
    expect(metin, 'demo açıkken örnek servis görünmüyor').toContain('Örnek Servis');
    expect(metin, 'demo şeridi yok — ekran gerçek sanılabilir').toContain('ÖRNEK GÖRÜNÜM');

    const serit = page.getByRole('status').first();
    await expect(serit).toBeVisible();
    expect(await serit.getByRole('button').count(), 'demo şeridi kapatılabiliyor').toBe(0);
  });

  test('DEMO DA OLSA tutar basılmıyor', async ({ page }) => {
    const metin = await hamMetin(page);
    const eslesme = metin.match(/(₺\s?\d[\d.,]*)|(\d[\d.,]*\s?(TL|₺))/);
    expect(eslesme?.[0] ?? null, `bakım ekranında tutar var: ${eslesme?.[0]}`).toBeNull();
  });
});
