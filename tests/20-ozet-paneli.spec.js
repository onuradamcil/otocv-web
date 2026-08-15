// =========================================================================
// 20 · BANA ÖZEL ÖZET — SAYILAR GERÇEĞİ SÖYLEMELİ
//
// -------------------------------------------------------------------------
// NİYE BU PAKET VAR
// -------------------------------------------------------------------------
// `/dashboard` aylarca "yapım aşamasında" yer tutucusuydu. Panel kurulurken
// asıl risk görsel değil VERİ tarafındaydı: bu üründe sayaçlar daha önce
// üç kez yalan söyledi.
//
//   · `favorite_count` şemada vardı, ekran basıyordu, artıran kod YOKTU
//   · `views_count` aynı durumdaydı — canlıda toplam 0 ölçüldü
//   · vitrin listesi RPC'ye taşınırken `favorite_count` DÜŞÜRÜLDÜ ve
//     `item.favorite_count || 0` sessizce 0'a döndü
//
// Ortak kalıp: sayaç göstermek ucuz, sayacın DOĞRU olduğunu bilmek ayrı iş.
// Bu paket panelin gösterdiği her sayıyı VERİTABANIYLA karşılaştırıyor.
// Ekranı kendi kendine doğrulayan bir test (örneğin "bir sayı var mı")
// burada işe yaramaz — sayının KAÇ olduğu önemli.
//
// -------------------------------------------------------------------------
// UYDURMA VERİ KURALI
// -------------------------------------------------------------------------
// Panelin sözleşmesi: veri yoksa bölüm çizilmiyor. Sıfır ile "bilinmiyor"
// aynı şey değil. Sicil puanı olmayan araç ortalamaya girmiyor, tarihi
// girilmemiş belge uyarı listesine girmiyor.
//
// ⚠ HİÇBİR YAZMA YOK.
// =========================================================================

const {
  test, expect, girisYap, hamMetin, supabaseIstemcisi,
} = require('./yardimcilar');

test.describe('Bana Özel Özet', () => {
  test.beforeEach(async ({ page }) => {
    await girisYap(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('panel açılıyor ve yer tutucu değil', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Bana Özel Özet', level: 1 }))
      .toBeVisible({ timeout: 15_000 });

    const metin = await hamMetin(page);
    expect(metin, 'panel hâlâ "yapım aşamasında" yer tutucusu').not.toContain('Yapım Aşamasında');
  });

  test('SAYAÇLAR veritabanıyla birebir aynı', async ({ page }) => {
    const sb = await supabaseIstemcisi();
    const { data: { user } } = await sb.auth.getUser();

    // Gerçek değerler doğrudan veritabanından okunuyor. Panelin kendi
    // hesabına GÜVENİLMİYOR — zaten denetlenen şey o.
    const { data: araclar } = await sb
      .from('vehicles')
      .select('plate_number, listings(status)')
      .eq('user_id', user.id);

    const plakalar = (araclar || []).map((a) => a.plate_number);
    const { data: kayitlar } = await sb
      .from('maintenance_records')
      .select('vehicle_plate')
      .in('vehicle_plate', plakalar.length ? plakalar : ['__yok__']);

    const vitrinde = (araclar || []).filter((a) => {
      const l = Array.isArray(a.listings) ? a.listings : (a.listings ? [a.listings] : []);
      return l.some((x) => x?.status === 'active');
    }).length;

    const sayilar = await page.locator('.sayi-vurgu').allTextContents();
    const temiz = sayilar.map((s) => s.trim());

    // Şerit sırası: kritik · araç · bakım · vitrin
    expect(temiz.length, 'sayaç şeridi eksik').toBeGreaterThanOrEqual(4);
    expect(temiz[1], `araç sayısı yanlış — panel ${temiz[1]}, veritabanı ${araclar?.length}`)
      .toBe(String((araclar || []).length));
    expect(temiz[2], `bakım kaydı yanlış — panel ${temiz[2]}, veritabanı ${kayitlar?.length}`)
      .toBe(String((kayitlar || []).length));
    expect(temiz[3], `vitrin sayısı yanlış — panel ${temiz[3]}, veritabanı ${vitrinde}`)
      .toBe(String(vitrinde));
  });

  test('KRİTİK listesindeki her belge gerçekten kritik', async ({ page }) => {
    // Kritik = süresi dolmuş ya da 30 günden az kalmış. Panel "Aktif" bir
    // belgeyi kritik listesine koyuyorsa kullanıcıyı boşuna telaşlandırır;
    // tersi daha kötü — dolmuş belgeyi saklar.
    const bolum = page.locator('section', { hasText: 'Acil bakılması gerekenler' }).first();
    await expect(bolum).toBeVisible();

    const metin = (await bolum.textContent()) || '';
    if (metin.includes('Süresi dolmuş ya da yaklaşan belge yok')) return;

    // Bu bölümdeki her durum çipi ya "Süresi Doldu" ya "N Gün Kaldı" olmalı.
    const cipler = await bolum.locator('.etiket').allTextContents();
    const durumlar = cipler.map((c) => c.trim()).filter((c) => c && !c.startsWith('TR'));
    expect(durumlar.length, 'kritik bölümde durum çipi yok').toBeGreaterThan(0);

    for (const d of durumlar) {
      expect(
        /Süresi Doldu|Gün Kaldı/.test(d),
        `kritik listede kritik olmayan durum var: "${d}"`
      ).toBe(true);
    }
  });

  test('UYDURMA VERİ YOK — sicil puani yalnizca gercek puanlardan', async ({ page }) => {
    const sb = await supabaseIstemcisi();
    const { data: { user } } = await sb.auth.getUser();
    const { data: araclar } = await sb
      .from('vehicles').select('trust_score').eq('user_id', user.id);

    const puanlar = (araclar || [])
      .map((a) => a.trust_score)
      .filter((p) => typeof p === 'number');

    const metin = await hamMetin(page);

    if (puanlar.length === 0) {
      // Puanı olan araç yoksa ortalama HİÇ gösterilmemeli. "%0" basmak,
      // puanı olmayan araçları sıfır puanlı göstermek olurdu.
      expect(metin, 'puan verisi yokken ortalama gösteriliyor')
        .not.toContain('Ortalama sicil puanı');
      return;
    }

    const beklenen = Math.round(puanlar.reduce((t, p) => t + p, 0) / puanlar.length);
    expect(metin, `ortalama sicil puanı yanlış — beklenen %${beklenen}`)
      .toContain(`%${beklenen}`);
  });

  test('TARİHİ GİRİLMEMİŞ belge uyari listesine girmiyor', async ({ page }) => {
    // "Girilmedi" bir uyarı değil, eksik veri. Uyarı listesine girerse
    // kullanıcı olmayan bir sorunu kovalar.
    const bolum = page.locator('section', { hasText: 'Acil bakılması gerekenler' }).first();
    const metin = (await bolum.textContent()) || '';
    expect(metin, 'tarihi girilmemiş belge uyarı listesinde').not.toContain('Girilmedi');
  });

  test('MOBİLDE belge adlari kesilmiyor', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // İlk hâlinde satır tek kademeydi ve 390px'de belge adı "TÜV…",
    // "Kask…" diye kesiliyordu — kullanıcı HANGİ belgenin dolduğunu
    // göremiyordu. Bu denetim onun geri gelmesini engelliyor.
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

    // "İçeriğe geç" atlama bağlantısı odaklanana kadar gizli — beklenen istisna.
    const gercek = kesikler.filter((k) => !k.includes('İçeriğe geç'));
    expect(gercek, `mobilde metin kesiliyor: ${gercek.join(' | ')}`).toEqual([]);

    const yatay = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(yatay, 'panel mobilde yatay kaydırma yapıyor').toBe(false);
  });
});
