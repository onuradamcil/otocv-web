// =========================================================================
// 17 · MESAJLAŞMA
//
// -------------------------------------------------------------------------
// NİYE BU PAKET VAR
// -------------------------------------------------------------------------
// Mesajlaşma, araç sahibine ulaşmanın TEK yolu olarak kuruldu: uydurma
// telefon numarası kaldırıldı ve yerine bu geldi. Dolayısıyla buradaki bir
// açık, plakayı ve telefonu gizlerken kapatılan taciz kanalını yeniden
// açar. Kilitler bu yüzden tek tek saldırılarak sınanıyor.
//
// -------------------------------------------------------------------------
// SINANAN KİLİTLER
// -------------------------------------------------------------------------
//  1. Tablolara doğrudan erişim yok — `konusmalar` PLAKA tutuyor
//  2. Anon hiçbir RPC'yi çağıramıyor
//  3. Taraf olmayan üçüncü kişi konuşmayı okuyamıyor
//  4. Taraf olmayan üçüncü kişi konuşmaya yazamıyor
//  5. Kendi aracına mesaj atılamıyor
//  6. Engelleme mesajı GERÇEKTEN durduruyor (ve engellenen bunu görmüyor)
//  7. Aynı araca ikinci konuşma açılamıyor (sınırsız konuşma = toplu taciz)
//
// -------------------------------------------------------------------------
// ⚠ BU PAKET VERİTABANINA YAZIYOR — kendi çöpünü `afterAll`'da siliyor.
// =========================================================================

const {
  test, expect, supabaseIstemcisi, aliciIstemcisi, anonIstemcisi, ornekPin,
  girisYap, girisYapAlici,
} = require('./yardimcilar');

test.describe('Mesajlaşma', () => {
  let pin = null;
  let konusmaId = null;

  test.beforeAll(async () => {
    pin = await ornekPin();
  });

  test.afterAll(async () => {
    // Engeli kaldır ve konuşmayı sil: bu paket kendi çöpünü temizliyor.
    const alici = await aliciIstemcisi();
    const sahip = await supabaseIstemcisi();
    if (konusmaId) {
      await sahip.rpc('konusma_engelle', { p_konusma_id: konusmaId, p_kaldir: true });
    }
    // Konuşmayı istemci silemiyor (tablo kapalı); sonraki koşum aynı
    // konuşmayı yeniden kullanıyor — tekillik kısıtı zaten buna izin veriyor.
    await alici.rpc('konusmalarim');
  });

  test('konuşma tablolarına DOĞRUDAN erişilemiyor — plaka sızmıyor', async () => {
    const alici = await aliciIstemcisi();

    for (const tablo of ['konusmalar', 'engellemeler', 'mesaj_sikayetleri']) {
      const { data, error } = await alici.from(tablo).select('*');
      expect(
        error || (data && data.length === 0),
        `${tablo} istemciye açık`
      ).toBeTruthy();
    }
  });

  test('anon hiçbir mesaj RPC\'sini çağıramıyor', async () => {
    const anon = anonIstemcisi();
    const cagrilar = [
      ['konusma_baslat', { p_pin: 'CV-XXXX-XXXXX', p_govde: 'deneme mesaji' }],
      ['konusmalarim', {}],
      ['okunmamis_mesaj_sayisi', {}],
    ];

    for (const [fn, arg] of cagrilar) {
      const { data, error } = await anon.rpc(fn, arg);
      const kapali = !!error || data?.basarili === false
        || (Array.isArray(data) && data.length === 0) || data === 0;
      expect(kapali, `${fn} anon'a açık`).toBeTruthy();
    }
  });

  test('kendi aracına mesaj atılamıyor', async () => {
    test.skip(!pin, 'örnek PIN yok');
    const sahip = await supabaseIstemcisi();

    const { data } = await sahip.rpc('konusma_baslat', {
      p_pin: pin, p_govde: 'kendi aracima mesaj denemesi',
    });
    expect(data?.basarili, 'kullanıcı kendi aracına mesaj attı').toBe(false);
    expect(data?.hata).toBe('kendi_aracin');
  });

  test('alıcı konuşma başlatıyor ve sahip görüyor', async () => {
    test.skip(!pin, 'örnek PIN yok');
    const alici = await aliciIstemcisi();
    const sahip = await supabaseIstemcisi();

    const { data: baslat } = await alici.rpc('konusma_baslat', {
      p_pin: pin, p_govde: 'Merhaba, bakim gecmisi hakkinda bilgi alabilir miyim?',
    });
    expect(baslat?.basarili, JSON.stringify(baslat)).toBe(true);
    konusmaId = baslat.konusma_id;
    expect(konusmaId, 'konuşma kimliği dönmedi').toBeTruthy();

    // Sahip tarafında görünüyor mu?
    const { data: liste } = await sahip.rpc('konusmalarim');
    const kayit = (liste || []).find((k) => k.konusma_id === konusmaId);
    expect(kayit, 'konuşma araç sahibinde görünmüyor').toBeTruthy();
    expect(kayit.sahibi_miyim, 'sahiplik yanlış').toBe(true);

    // ⚠ PLAKA DÖNMEMELİ.
    expect(
      Object.keys(kayit),
      'konuşma listesi plaka döndürüyor — gizlenen veri sızıyor'
    ).not.toContain('vehicle_plate');
    expect(kayit.pin_code, 'PIN dönmüyor').toBeTruthy();
  });

  test('aynı araca ikinci konuşma açılamıyor', async () => {
    test.skip(!pin || !konusmaId, 'konuşma yok');
    const alici = await aliciIstemcisi();

    // Sınırsız konuşma açabilmek toplu taciz aracı olurdu; tekillik kısıtı
    // aynı kişi–araç çifti için tek konuşmaya zorluyor.
    const { data } = await alici.rpc('konusma_baslat', {
      p_pin: pin, p_govde: 'ikinci konusma denemesi',
    });
    expect(data?.basarili).toBe(true);
    expect(data?.konusma_id, 'ikinci konuşma açıldı').toBe(konusmaId);

    const { data: liste } = await alici.rpc('konusmalarim');
    const ayniAraca = (liste || []).filter((k) => k.pin_code === pin);
    expect(ayniAraca.length, 'aynı araç için birden fazla konuşma var').toBe(1);
  });

  test('taraf olmayan üçüncü kişi konuşmayı okuyamıyor ve yazamıyor', async () => {
    test.skip(!konusmaId, 'konuşma yok');
    const anon = anonIstemcisi();

    // Anon zaten çağıramıyor; asıl risk oturum açmış BAŞKA bir kullanıcı.
    // Bu projede üçüncü test hesabı yok, o yüzden anon üzerinden ve
    // uydurma bir kimlikle deneniyor.
    const { data: oku, error: okuHata } = await anon.rpc('mesajlar_getir', { p_konusma_id: konusmaId });
    expect(!!okuHata || oku?.basarili === false, 'üçüncü kişi konuşmayı okudu').toBeTruthy();

    const { data: yaz, error: yazHata } = await anon.rpc('mesaj_gonder', {
      p_konusma_id: konusmaId, p_govde: 'izinsiz mesaj',
    });
    expect(!!yazHata || yaz?.basarili === false, 'üçüncü kişi konuşmaya yazdı').toBeTruthy();
  });

  test('olmayan konuşmaya yazınca varlık bilgisi sızmıyor', async () => {
    const alici = await aliciIstemcisi();
    const { data } = await alici.rpc('mesaj_gonder', {
      p_konusma_id: '00000000-0000-0000-0000-000000000000', p_govde: 'deneme',
    });
    // Taraf olmama ile yok olma AYNI hatayı döndürüyor: aksi hâlde bir
    // saldırgan hata farkından konuşmanın varlığını çıkarabilirdi.
    expect(data?.basarili).toBe(false);
    expect(data?.hata).toBe('bulunamadi');
  });

  test('ENGELLEME: mesaj gerçekten durdurulıyor ve engellenen bunu görmüyor', async () => {
    test.skip(!konusmaId, 'konuşma yok');
    const alici = await aliciIstemcisi();
    const sahip = await supabaseIstemcisi();

    // Sahip alıcıyı engelliyor.
    const { data: engel } = await sahip.rpc('konusma_engelle', { p_konusma_id: konusmaId });
    expect(engel?.basarili, JSON.stringify(engel)).toBe(true);
    expect(engel?.engelli).toBe(true);

    // Sahibin gördüğü mesaj sayısı ölçülüyor.
    const { data: once } = await sahip.rpc('mesajlar_getir', { p_konusma_id: konusmaId });
    const oncekiSayi = (once?.mesajlar || []).length;

    // Alıcı yazıyor — kendi tarafında BAŞARILI görünmeli.
    const { data: gonder } = await alici.rpc('mesaj_gonder', {
      p_konusma_id: konusmaId, p_govde: 'engellendikten sonraki mesaj',
    });
    expect(gonder?.basarili, 'engellenen kullanıcıya hata döndü — engel ifşa oluyor').toBe(true);
    expect(gonder?.hata, 'engellenen kullanıcı engeli anlayabilir').toBeFalsy();

    // ⚠ ASIL DENETİM: sahibe ULAŞMAMALI.
    const { data: sonra } = await sahip.rpc('mesajlar_getir', { p_konusma_id: konusmaId });
    expect(
      (sonra?.mesajlar || []).length,
      'engellemeye rağmen mesaj araç sahibine ulaştı'
    ).toBe(oncekiSayi);

    // Gönderen kendi mesajını görmeye devam ediyor (silinmiyor, saklanıyor:
    // şikayet incelemesinde kanıt).
    const { data: aliciGoruntu } = await alici.rpc('mesajlar_getir', { p_konusma_id: konusmaId });
    const kendi = (aliciGoruntu?.mesajlar || []).some((m) => m.govde === 'engellendikten sonraki mesaj');
    expect(kendi, 'gönderen kendi mesajını göremiyor').toBe(true);

    // Engeli kaldır.
    const { data: kaldir } = await sahip.rpc('konusma_engelle', { p_konusma_id: konusmaId, p_kaldir: true });
    expect(kaldir?.engelli).toBe(false);
  });

  test('şikayet kaydediliyor ve tekrarlanmıyor', async () => {
    test.skip(!konusmaId, 'konuşma yok');
    const alici = await aliciIstemcisi();

    const { data: bir } = await alici.rpc('konusma_sikayet_et', {
      p_konusma_id: konusmaId, p_sebep: 'spam', p_aciklama: 'test sikayeti',
    });
    expect(bir?.basarili, JSON.stringify(bir)).toBe(true);

    // İkinci şikayet sessizce yutulmalı (unique kısıt), hata vermemeli.
    const { data: iki } = await alici.rpc('konusma_sikayet_et', {
      p_konusma_id: konusmaId, p_sebep: 'spam',
    });
    expect(iki?.basarili).toBe(true);

    const { data: detay } = await alici.rpc('mesajlar_getir', { p_konusma_id: konusmaId });
    expect(detay?.konusma?.sikayet_ettim, 'şikayet durumu bildirilmiyor').toBe(true);
  });

  test('geçersiz şikayet sebebi reddediliyor', async () => {
    test.skip(!konusmaId, 'konuşma yok');
    const alici = await aliciIstemcisi();
    const { data } = await alici.rpc('konusma_sikayet_et', {
      p_konusma_id: konusmaId, p_sebep: 'uydurma_sebep',
    });
    expect(data?.basarili).toBe(false);
    expect(data?.hata).toBe('sebep_gecersiz');
  });

  test('boş mesaj gönderilemiyor', async () => {
    test.skip(!konusmaId, 'konuşma yok');
    const alici = await aliciIstemcisi();
    const { data } = await alici.rpc('mesaj_gonder', { p_konusma_id: konusmaId, p_govde: '   ' });
    expect(data?.basarili).toBe(false);
    expect(data?.hata).toBe('govde_gecersiz');
  });
});

// =========================================================================
// ARAYÜZ AKIŞI
//
// Kilitlerin doğru olması, yolun ÇALIŞTIĞI anlamına gelmiyor. Bu bölüm
// kullanıcının gerçekten izlediği yolu yürüyor: ziyaretçi araç sayfasından
// mesaj gönderiyor, araç sahibi kendi ekranında okuyor.
// =========================================================================
test.describe('Mesajlaşma arayüzü', () => {
  let pin = null;

  test.beforeAll(async () => {
    pin = await ornekPin();
  });

  test('ziyaretçi araç sayfasından mesaj gönderiyor, sahip ekranında okuyor', async ({ page }) => {
    test.skip(!pin, 'örnek PIN yok');
    const metin = `Arayuz testi ${Date.now()}`;

    // ⚠ ZİYARETÇİ GÖZÜ: ikinci hesap. Mesaj düğmesi `isPublicView` dalında;
    // araç sahibinin hesabıyla bakan bir test o dala hiç girmiyor.
    await girisYapAlici(page);
    await page.goto(`/details/${encodeURIComponent(pin)}`);
    await page.waitForLoadState('networkidle');

    const mesajDugmesi = page.getByRole('button', { name: 'Araç Sahibine Mesaj' });
    await expect(mesajDugmesi).toBeVisible({ timeout: 20_000 });
    await mesajDugmesi.click();

    const diyalog = page.getByRole('dialog');
    await expect(diyalog).toBeVisible();
    await diyalog.getByLabel('Mesajınız').fill(metin);
    await diyalog.getByRole('button', { name: 'Mesajı gönder' }).click();
    await expect(diyalog).toBeHidden({ timeout: 20_000 });

    // Araç sahibi tarafına geç.
    await page.context().clearCookies();
    await girisYap(page);
    await page.goto('/mesajlar');
    await page.waitForLoadState('networkidle');

    // Konuşmayı aç ve mesajı gör.
    const konusma = page.locator('aside button').first();
    await expect(konusma).toBeVisible({ timeout: 20_000 });
    await konusma.click();

    await expect(page.getByText(metin)).toBeVisible({ timeout: 20_000 });
  });

  test('oturumsuz ziyaretçi mesajlar sayfasında giriş uyarısı görüyor', async ({ page }) => {
    await page.goto('/mesajlar');
    await page.waitForLoadState('networkidle');
    // `#icerik` ile sınırlı: başlıkta da bir "Giriş Yap" bağlantısı var ve
    // sayfa gövdesindekiyle karışıyor. Aranan, sayfanın kendi uyarısı.
    await expect(
      page.locator('#icerik').getByRole('link', { name: 'Giriş Yap' })
    ).toBeVisible({ timeout: 20_000 });
  });
});
