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

    // =====================================================================
    // ⚠ BU TEST YANLIŞ SEBEPLE GEÇİYORDU — DÜZELTİLDİ
    // ---------------------------------------------------------------------
    // Eski kabul koşulu dört dallıydı:
    //
    //   const kapali = !!error || data?.basarili === false
    //     || (Array.isArray(data) && data.length === 0) || data === 0;
    //
    // Son üç dal YETKİDEN BAĞIMSIZ olarak zaten sağlanıyordu: fonksiyonların
    // kendi içinde `auth.uid() is null` koruması var, dolayısıyla oturumsuz
    // çağrı `{basarili:false}` ya da boş dizi/0 döndürüyor. Yani
    // `grant execute ... to anon` verilse test AYNEN GEÇERDİ — adında geçen
    // yetki hiç ölçülmüyordu.
    //
    // Artık yalnızca GERÇEK RET kabul ediliyor ve hata kodu doğrulanıyor.
    //
    // ⚠ POZİTİF KONTROL de var: aynı çağrı OTURUMLU istemciyle yapıldığında
    // bu hatanın ÇIKMADIĞI denetleniyor. Bu, 07-devir'de yaşanan tuzağı
    // kapatıyor — orada boş parametre yüzünden gelen "imza bulunamadı"
    // hatası yetki reddi sanılmıştı.
    // =====================================================================
    const oturumlu = await supabaseIstemcisi();

    for (const [fn, arg] of cagrilar) {
      const { error } = await anon.rpc(fn, arg);

      expect(error, `${fn} anon'a AÇIK — çağrı hiç reddedilmedi`).toBeTruthy();
      expect(
        `${error.message} ${error.code || ''}`,
        `${fn} yetki dışı bir sebeple hata verdi ("${error.message}") — kilit doğrulanamadı`
      ).toMatch(/permission denied|42501/i);

      // Pozitif kontrol: oturumluda AYNI hata çıkmamalı. Çıkıyorsa yukarıdaki
      // ret yetkiden değil başka bir arızadan geliyordur.
      const { error: oturumluHata } = await oturumlu.rpc(fn, arg);
      const yetkiHatasi = oturumluHata
        && /permission denied|42501/i.test(`${oturumluHata.message} ${oturumluHata.code || ''}`);
      expect(yetkiHatasi, `${fn} OTURUMLU kullanıcıya da kapalı — akış kırık`).toBeFalsy();
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

  // =======================================================================
  // REGRESYON: KENDİ MESAJIM İKİ KEZ VE "KARŞI TARAFTAN" GÖRÜNÜYORDU
  //
  // Ürün sahibinin bildirdiği hata: yazdığı mesaj aynı anda karşı taraftan
  // gelmiş gibi ikinci kez beliriyordu.
  //
  // SEBEBİ: "iyimser ekleme" `await mesajGonder(...)` SONRASINDA yapılıyordu.
  // Realtime INSERT olayı `await` çözülmeden önce geldiği için gerçek sıra
  // şuydu:
  //   1. satır yazıldı
  //   2. realtime geldi -> değiştirilecek yer tutucu HENÜZ YOK -> satır eklendi
  //   3. await döndü -> yer tutucu da eklendi   => ekranda İKİ baloncuk
  // Kimlik (`getUser`) henüz çözülmemişse 2. adımdaki kopya `benim: false`
  // alıyor ve KARŞI TARAF baloncuğu olarak çiziliyordu.
  //
  // ⚠ YARIŞ DURUMU UMULMUYOR, ZORLANIYOR.
  //
  // İlk yazımda bu test hatalı kodda da GEÇTİ: geliştirme makinesinde RPC
  // yanıtı realtime'dan hızlı dönüyor, dolayısıyla yer tutucu yine önce
  // ekleniyor ve kopya hiç oluşmuyor. Yani test, hatayı yakalamadığı hâlde
  // yeşil veriyordu — en tehlikeli test türü.
  //
  // Çözüm: `mesaj_gonder` yanıtı KASITLI geciktiriliyor. Realtime WebSocket
  // üzerinden geldiği için gecikmeden etkilenmiyor ve sıra kullanıcının
  // yaşadığı hâle geliyor (yavaş bağlantı, yüklü sunucu). Hatalı kodda bu
  // pencerede kopya kesin oluşuyor.
  //
  // Ayrıca gönderdikten sonra BEKLENİYOR: kopya realtime ile geldiği için
  // hemen sayan bir denetim onu kaçırır.
  // =======================================================================
  test('REGRESYON: gönderilen mesaj TEK baloncuk ve KENDİ tarafımda', async ({ page }) => {
    test.setTimeout(120_000);

    // ⚠ İSTEK DEĞİL, YANIT GECİKTİRİLİYOR — VE FARK ÖNEMLİ.
    //
    // İlk denemede `await bekle(); route.continue()` yazılmıştı. O, İSTEĞİ
    // geciktiriyor: satır 3 saniye sonra yazılıyor, realtime da ondan sonra
    // geliyor, yer tutucu yine önce ekleniyor ve yarış HİÇ oluşmuyor. Test
    // hatalı kodda da geçiyordu.
    //
    // Doğrusu: istek HEMEN gitsin (satır yazılsın, realtime yayılsın), ama
    // istemcinin `await`i geç çözülsün. Kullanıcının yaşadığı durum bu —
    // yavaş bağlantıda yanıt gecikiyor, realtime WebSocket'ten çabuk geliyor.
    await page.route('**/rpc/mesaj_gonder', async (route) => {
      const yanit = await route.fetch();               // satır şimdi yazılıyor
      await new Promise((r) => setTimeout(r, 3000));    // yanıt bekletiliyor
      await route.fulfill({ response: yanit });
    });

    await girisYap(page);
    await page.goto('/mesajlar');
    await page.waitForLoadState('networkidle');

    const konusma = page.locator('aside button').first();
    const varMi = await konusma.isVisible().catch(() => false);
    test.skip(!varMi, 'araç sahibinin konuşması yok');
    await konusma.click();

    const metin = `Tek balon denetimi ${Date.now()}`;
    await page.getByLabel('Mesajınız').fill(metin);
    await page.getByRole('button', { name: /Gönder/i }).click();

    // Baloncuk belirsin.
    const balonlar = page.getByText(metin, { exact: true });
    await expect(balonlar.first()).toBeVisible({ timeout: 30_000 });

    // =====================================================================
    // ⚠ TEK AN ÖRNEKLENMİYOR — PENCERE BOYUNCA İZLENİYOR.
    //
    // İlk yazımda test "gönder, 5 sn bekle, say" diyordu ve hatalı kodda
    // GEÇİYORDU. Sebebi ölçüldü: kopya t≈3,5 sn'de oluşuyor, ama uygulamanın
    // emniyet ağı t=5 sn'de konuşmayı sunucudan tazeleyip listeyi
    // düzeltiyor. Yani kendi emniyet ağımız hatayı kendi testimizden
    // saklıyordu — tam olarak "yanlış sebeple geçen test".
    //
    // Ölçülen seyir (hatalı kodda):
    //     t=0,5s -> 1     realtime geldi
    //     t=3,5s -> 2     await döndü, yer tutucu da eklendi  ← KOPYA
    //     t=8,5s -> 1     emniyet ağı düzeltti
    //
    // Doğru iddia "sonunda tek" değil, "HİÇBİR AN ikiden fazla olmadı".
    // Kullanıcı o 5 saniyeyi görüyor.
    // =====================================================================
    let enFazla = 0;
    const seyir = [];
    for (let i = 0; i < 32; i++) {
      await page.waitForTimeout(250);
      const n = await balonlar.count();
      if (n > enFazla) enFazla = n;
      seyir.push(n);
    }

    expect(
      enFazla,
      `mesaj bir an için ${enFazla} kez göründü (kopya). Seyir: ${seyir.join(',')}`
    ).toBe(1);

    // 2) Ve KENDİ tarafımda. Kendi baloncuğum `bg-indigo-600`, karşı tarafın
    //    `bg-white border`. Kopya yanlış tarafta çizilirse burada düşer.
    const balon = balonlar.locator(
      'xpath=ancestor::div[contains(@class,"rounded-2xl")][1]'
    );
    await expect(
      balon,
      'kendi mesajım karşı taraf baloncuğu olarak çizilmiş'
    ).toHaveClass(/bg-indigo-600/);
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

// =========================================================================
// CANLI TESLİMAT
//
// Mesaj realtime'ı aylarca sessizce bozuk kalabilirdi: `mesajlar`
// politikası `konusmalar` tablosuna başvuruyordu ama o tablo istemciye
// kapalı. RLS ifadeleri sorguyu ATAN rolün yetkisiyle değerlendirildiği
// için politika `42501 permission denied` veriyor, Realtime de RLS'e
// uyduğu için hiçbir olay yayınlamıyordu.
//
// Bu paket iki şeyi birden tutuyor: teslimatın çalıştığını VE onarımın
// gölge engellemeyi ifşa etmediğini.
// =========================================================================
test.describe('Mesaj canlı teslimat', () => {

  test('yeni mesaj aboneye ANLIK düşüyor ve `teslim` sızmıyor', async () => {
    const sahip = await supabaseIstemcisi();
    const alici = await aliciIstemcisi();
    const pin = await ornekPin();
    test.skip(!pin, 'örnek PIN yok');

    await alici.rpc('konusma_baslat', { p_pin: pin, p_govde: 'canli teslimat testi' });
    const { data: liste } = await alici.rpc('konusmalarim');
    const konusmaId = (liste || []).find((k) => k.pin_code === pin)?.konusma_id;
    expect(konusmaId, 'konuşma kurulamadı').toBeTruthy();

    const gelenler = [];
    let abonelik = 'yok';
    const kanal = alici
      .channel(`test-canli:${konusmaId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mesajlar', filter: `konusma_id=eq.${konusmaId}` },
        (y) => gelenler.push(y.new))
      .subscribe((d) => { abonelik = d; });

    for (let i = 0; i < 40 && abonelik !== 'SUBSCRIBED'; i++) {
      await new Promise((r) => setTimeout(r, 250));
    }
    expect(abonelik, 'realtime aboneliği kurulamadı').toBe('SUBSCRIBED');

    // Gövde her koşumda benzersiz: aynı konuşmada önceki koşumdan kalan
    // mesajlar da akışa düşebiliyor, sıraya güvenmek kırılgan olurdu.
    const damga = `anlik teslim ${konusmaId.slice(0, 8)}-${(await sahip.rpc('devir_ucreti')).data}`;
    await sahip.rpc('mesaj_gonder', { p_konusma_id: konusmaId, p_govde: damga });

    for (let i = 0; i < 40 && !gelenler.some((m) => m.govde === damga); i++) {
      await new Promise((r) => setTimeout(r, 250));
    }

    await alici.removeChannel(kanal);

    const bizimki = gelenler.find((m) => m.govde === damga);
    expect(bizimki, 'mesaj anlık gelmedi — realtime yine sessizce bozuk').toBeTruthy();

    // ⚠ GÖLGE ENGELLEME İFŞA OLMAMALI.
    // `teslim = false` engellendiğini ele verir. Politika onarılınca istemci
    // `mesajlar`ı okuyabilir hâle geldi; sütun yetkisi bu yüzden daraltıldı.
    expect(
      Object.keys(bizimki),
      'realtime yükünde `teslim` var — engellenen kullanıcı engellendiğini anlayabilir'
    ).not.toContain('teslim');
  });

  test('REGRESYON: `konusmalar` hâlâ istemciye kapalı', async () => {
    const alici = await aliciIstemcisi();

    // Politikayı onarmanın KOLAY yolu `grant select on konusmalar` idi ve o
    // grant plakayı istemciye açardı. Bu test o kapıyı kilitli tutuyor.
    const { data, error } = await alici.from('konusmalar').select('*');
    expect(
      error || (data && data.length === 0),
      'konusmalar istemciye açılmış — plaka sızıyor'
    ).toBeTruthy();
  });
});
