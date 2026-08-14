// =========================================================================
// 07 · ARAÇ DEVRİ
//
// -------------------------------------------------------------------------
// NİYE BU PAKET VAR
// -------------------------------------------------------------------------
// Devir geri alınamaz bir işlem: sahiplik, PIN, bakım kayıtları ve fatura
// belgeleri el değiştiriyor. Bir regresyon burada "araç yanlış kişiye geçti"
// demek olur. Ayrıca üç ayrı savunma var (kod tek kullanımlık, sayaç
// paylaşımlı, talep sınırları) ve hiçbiri test edilmezse sessizce bozulabilir.
//
// -------------------------------------------------------------------------
// BU PAKET CANLI VERIDE GERCEK DEVIR YAPIYOR VE ARTIK BIRAKIYOR
// -------------------------------------------------------------------------
// `afterAll` araci saticiya geri devrediyor — o kisim guvenli. AMA arkasinda
// TEMIZLENEMEYEN artik kaliyor:
//
//   vehicle_ownerships  -> her devir bir kapanmis satir birakiyor
//   devir_kodlari       -> uretilen kodlar
//   devir_istekleri     -> acilan talepler
//   devir_deneme_log    -> hatali deneme sayaci
//   notifications       -> devir bildirimleri
//
// Test bunlari SILEMEZ, cunku o tablolar bilerek istemciye kapali (RLS acik,
// politika yok). Yani "test kendi copunu temizler" ilkesini burada
// uygulayamiyorum ve bunu gizlemiyorum.
//
// Artigin anlami: sahiplik gecmisinde GERCEKTEN OLMUS ama arac satildigi icin
// degil, test edildigi icin olmus devirler gorunuyor. Sicil provenansi bu
// projenin cekirdek iddiasi; oraya test gurultusu birakmak istemezdik.
//
// TEMIZLIK (Supabase SQL panelinden, kosumdan sonra):
//
//   delete from public.devir_deneme_log;
//   delete from public.devir_kodlari;
//   delete from public.devir_istekleri;
//   delete from public.notifications
//     where title like '%devredildi%' or title like 'Devir%';
//   delete from public.vehicle_ownerships where vehicle_plate = '74SDF2343';
//   insert into public.vehicle_ownerships (vehicle_plate, user_id, baslangic)
//   select plate_number, user_id, coalesce(created_at, now())
//   from public.vehicles where plate_number = '74SDF2343';
//
// BU YUZDEN CI'DA KOSMUYOR (03-formlar gibi). Ve bu, CI'in 2. asamasi
// (yerel Supabase) icin simdiye kadarki en guclu gerekce: devir gibi yikici
// bir islemi canli veriye karsi test etmek, temizlenemeyen iz birakiyor.
//
// -------------------------------------------------------------------------
// -------------------------------------------------------------------------
// ORACLE TESTİ BU DOSYADA DEĞİL — VE BUNUN BİR SEBEBİ VAR
// -------------------------------------------------------------------------
// `devir_onizleme`'nin kaba kuvvet sayacını `devir_tamamla` ile paylaştığını
// kanıtlamak, sayacı KASITEN doldurmayı gerektiriyor. Ama sayaç dolduğunda
// alıcı hesabı 15 DAKİKA boyunca hiçbir devir işlemi yapamıyor.
//
// İlk yazımda o testi buraya koydum. Sonuç: arkasındaki iki test atlandı,
// sonra paketi tekrar koştuğumda ilk testler de kırıldı — çünkü önceki
// koşumun sayacı hâlâ doluydu. Yani paket kendi kendini tekrar koşulamaz
// hâle getiriyordu.
//
// Oracle testi 06-hiz-siniri.spec.js'e taşındı: o paket zaten isteğe bağlı
// (varsayılan koşumda proje olarak tanımlanmıyor) ve zaten hız sınırı
// hakkında. Bu, aynı dersin ikinci kez öğrenilmesiydi.
//
// Burada kalan ön izleme kontrolü yalnızca GEÇERLİ kod kullanıyor, sayaca
// dokunmuyor.
//
// -------------------------------------------------------------------------
// İKİNCİ HESAP SABİT
// -------------------------------------------------------------------------
// Her koşumda `signUp` ile yeni hesap açmıyoruz: anon anahtarla auth
// kullanıcısı silinemez, yani açılan her hesap kalıcı çöp olur. Geliştirme
// sırasında beş tane birikti. `.env.test` içindeki OTOCV_TEST_EMAIL2 sabit.
// =========================================================================

const {
  test,
  expect,
  girisYap,
  anonIstemcisi,
  supabaseIstemcisi,
  aliciIstemcisi,
  ORNEK_PLAKA,
  girisYapAlici,
  hamMetin,
} = require('./yardimcilar');

// Devir testleri bu araç üzerinde çalışıyor. ORNEK_PLAKA kullanılmıyor:
// diğer paketler ona bakıyor ve devir sırasında sahibi değişince onlar kırılır.
const DEVIR_PLAKA = process.env.OTOCV_DEVIR_PLAKA || '74SDF2343';

const RIZA = 'Test rıza metni: belgeler ad ve adres içerebilir.';

/** Yardımcı: RPC çağrısı, hata alanını da döndürür. */
async function rpc(istemci, fonksiyon, parametreler) {
  const { data, error } = await istemci.rpc(fonksiyon, parametreler);
  if (error) return { hata_mesaji: error.message };
  return data;
}

test.describe.configure({ mode: 'serial' });

/**
 * DEVRİ UÇTAN UCA TAMAMLAR — ÜÇ ADIMLI YENİ AKIŞ.
 *
 * `devir_tamamla` artık istemciye KAPALI. Açık kalsaydı devralan kişi hem
 * araç sahibinin son onayını hem devir ücretini atlayabilirdi. Devir artık
 * üç adım: istek -> onay -> ödeme.
 *
 * @param devralan  Aracı alacak istemci (isteği o açar, ücreti o öder)
 * @param sahip     Aracın o anki sahibi (onayı o verir)
 */
async function devriTamamla(devralan, sahip, kod) {
  const istek = await rpc(devralan, 'devir_istek_olustur', { p_kod: kod });
  if (!istek?.basarili) return istek;

  const karar = await rpc(sahip, 'devir_istek_karari', {
    p_istek_id: istek.istek_id, p_onay: true,
  });
  if (!karar?.basarili) return karar;

  return rpc(devralan, 'devir_odeyip_tamamla', { p_istek_id: istek.istek_id });
}

test.describe('Araç devri', () => {
  test.afterAll(async () => {
    // ---- DEVRİ GERİ AL VE SAHTE GEÇMİŞİ SİL ----
    const satici = await supabaseIstemcisi();
    const alici = await aliciIstemcisi();

    const { data: { user: u1 } } = await satici.auth.getUser();
    const { data: arac } = await alici
      .from('vehicles').select('user_id').eq('plate_number', DEVIR_PLAKA).maybeSingle();

    // Araç alıcıda kaldıysa geri devret.
    if (arac?.user_id) {
      const kod = await rpc(alici, 'devir_kodu_uret', {
        p_plaka: DEVIR_PLAKA, p_riza_metni: 'Test sonrası geri devir.',
      });
      if (kod?.kod) await devriTamamla(satici, alici, kod.kod);
    }

    const { data: sonArac } = await satici
      .from('vehicles').select('user_id').eq('plate_number', DEVIR_PLAKA).maybeSingle();
    if (sonArac?.user_id !== u1.id) {
      console.warn(`UYARI: ${DEVIR_PLAKA} satıcıya geri devredilemedi. Elle kontrol edin.`);
    }
  });

  // -----------------------------------------------------------------------
  test('plaka_durumu üç durumu ayırıyor', async () => {
    const satici = await supabaseIstemcisi();
    const alici = await aliciIstemcisi();

    const kendi = await rpc(satici, 'plaka_durumu', { p_plaka: DEVIR_PLAKA });
    expect(kendi?.kayitli, 'araç kayıtlı görünmüyor').toBe(true);
    expect(kendi?.benim_mi, 'sahip için benim_mi false döndü').toBe(true);
    // PIN yalnızca sahibine: "aracıma git" bağlantısı için gerekiyor.
    expect(kendi?.pin_code).toBeTruthy();

    const baskasinin = await rpc(alici, 'plaka_durumu', { p_plaka: DEVIR_PLAKA });
    expect(baskasinin?.kayitli).toBe(true);
    expect(baskasinin?.benim_mi, 'başkasının aracı benim gibi göründü').toBe(false);
    expect(baskasinin?.pin_code, 'başkasına PIN sızdı').toBeNull();

    const yok = await rpc(alici, 'plaka_durumu', { p_plaka: '99ZZ9999' });
    expect(yok?.kayitli).toBe(false);

    // Anon çağıramamalı: plaka varlığı bir keşif kapısı.
    const anon = anonIstemcisi();
    const anonSonuc = await rpc(anon, 'plaka_durumu', { p_plaka: DEVIR_PLAKA });
    expect(anonSonuc?.hata_mesaji, 'plaka_durumu anon için açık').toBeTruthy();
  });

  // -----------------------------------------------------------------------
  test('satıcı kodu YENİDEN görebiliyor ve iptal edebiliyor', async () => {
    const satici = await supabaseIstemcisi();

    const kod = await rpc(satici, 'devir_kodu_uret', { p_plaka: DEVIR_PLAKA, p_riza_metni: RIZA });
    expect(kod?.kod, JSON.stringify(kod)).toMatch(/^DV-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);

    // Faz 1'deki boşluk: kod yalnızca dönüşte geliyordu, sayfa kapanınca
    // kaybediliyordu.
    const durum = await rpc(satici, 'devir_durumu', { p_plaka: DEVIR_PLAKA });
    expect(durum?.kod?.kod, 'satıcı kodu yeniden göremiyor').toBe(kod.kod);
    expect(durum?.kod?.kalan_saniye).toBeGreaterThan(170000);   // ~48 saat
    expect(durum?.kod?.riza_metni, 'rıza metni aynen saklanmamış').toBe(RIZA);

    const iptal = await rpc(satici, 'devir_kodu_iptal', { p_plaka: DEVIR_PLAKA });
    expect(iptal?.basarili).toBe(true);

    const sonra = await rpc(satici, 'devir_durumu', { p_plaka: DEVIR_PLAKA });
    expect(sonra?.kod, 'iptal edilen kod hâlâ görünüyor').toBeNull();

    // İptal edilen kod kullanılamaz.
    const alici = await aliciIstemcisi();
    const dene = await rpc(alici, 'devir_istek_olustur', { p_kod: kod.kod });
    expect(dene?.hata, 'iptal edilen kod çalıştı').toBe('kod_gecersiz');
  });

  // -----------------------------------------------------------------------
  test('sahip olmayan kod üretemez ve karar veremez', async () => {
    const alici = await aliciIstemcisi();
    const r = await rpc(alici, 'devir_kodu_uret', { p_plaka: DEVIR_PLAKA, p_riza_metni: RIZA });
    expect(r?.hata).toBe('sahip_degil');

    const iptal = await rpc(alici, 'devir_kodu_iptal', { p_plaka: DEVIR_PLAKA });
    expect(iptal?.hata).toBe('sahip_degil');
  });

  // -----------------------------------------------------------------------
  test('ön izleme devri TAMAMLAMIYOR', async () => {
    // Sayaç tüketen ORACLE testi bu dosyada DEĞİL — 06-hiz-siniri paketinde
    // (isteğe bağlı). Buradaki kontrol yalnızca geçerli kodla çalışıyor ve
    // sayaca dokunmuyor, dolayısıyla paket tekrar tekrar koşulabilir.
    const satici = await supabaseIstemcisi();
    const alici = await aliciIstemcisi();

    const kod = await rpc(satici, 'devir_kodu_uret', { p_plaka: DEVIR_PLAKA, p_riza_metni: RIZA });
    expect(kod?.kod).toBeTruthy();

    const on = await rpc(alici, 'devir_onizleme', { p_kod: kod.kod });
    expect(on?.plaka).toBe(DEVIR_PLAKA);
    expect(typeof on?.kayit).toBe('number');
    expect(typeof on?.faturali).toBe('number');
    expect(typeof on?.sicil_puani).toBe('number');
    expect(on?.riza_metni).toBe(RIZA);

    // Kod HÂLÂ geçerli olmalı: ön izleme onu tüketmiyor.
    const durum = await rpc(satici, 'devir_durumu', { p_plaka: DEVIR_PLAKA });
    expect(durum?.kod?.kod, 'ön izleme kodu tüketti').toBe(kod.kod);
  });

  // -----------------------------------------------------------------------
  test('KOD YOLU: devir uçtan uca çalışıyor, satıcı erişimini kaybediyor', async () => {
    const satici = await supabaseIstemcisi();
    const alici = await aliciIstemcisi();
    const { data: { user: u1 } } = await satici.auth.getUser();

    const { data: once } = await satici
      .from('vehicles').select('pin_code, trust_score').eq('plate_number', DEVIR_PLAKA).single();
    const { data: kayitlarOnce } = await satici
      .from('maintenance_records').select('id, invoice_path').eq('vehicle_plate', DEVIR_PLAKA);
    const faturaYolu = kayitlarOnce.find((k) => k.invoice_path)?.invoice_path;

    // Sayaç bir önceki testten dolu olabilir; 15 dakika beklemek yerine
    // geçerli kodla ilerliyoruz — sayaç yalnızca BAŞARISIZ denemeleri sayıyor,
    // ama eşiği aşmışsa geçerli kod da engellenir. Bu yüzden önce kontrol.
    const sayacKontrol = await rpc(alici, 'devir_onizleme', { p_kod: 'DV-0000-0000' });
    test.skip(
      sayacKontrol?.hata === 'cok_fazla_deneme',
      'Alıcı hesabı hâlâ hız sınırında. 15 dakika sonra tekrar koşun.'
    );

    const kod = await rpc(satici, 'devir_kodu_uret', { p_plaka: DEVIR_PLAKA, p_riza_metni: RIZA });
    expect(kod?.kod).toBeTruthy();

    const sonuc = await devriTamamla(alici, satici, kod.kod);
    expect(sonuc?.basarili, JSON.stringify(sonuc)).toBe(true);
    expect(sonuc?.yeni_pin, 'PIN yenilenmedi').not.toBe(once.pin_code);

    // Alıcıda: araç, kayıtlar, puan
    const { data: yeni } = await alici
      .from('vehicles').select('user_id, trust_score').eq('plate_number', DEVIR_PLAKA).single();
    expect(yeni?.trust_score, 'puan devirde değişti').toBe(once.trust_score);

    const { data: kayitlarSonra } = await alici
      .from('maintenance_records').select('id, invoice_path, yukleyen_user_id')
      .eq('vehicle_plate', DEVIR_PLAKA);
    expect(kayitlarSonra.length, 'bakım kayıtları geçmedi').toBe(kayitlarOnce.length);
    // KVKK: belgeyi kim yükledi bilgisi devirde DEĞİŞMEZ.
    expect(kayitlarSonra.every((k) => k.yukleyen_user_id === u1.id)).toBe(true);

    // Fatura dosyası: alıcı AÇABİLMELİ (Faz 1.5'in amacı buydu)
    if (faturaYolu) {
      const { data: imza, error: iz } = await alici.storage
        .from('vehicle-invoices').createSignedUrl(faturaYolu, 60);
      expect(iz, 'alıcı fatura imzası alamadı').toBeFalsy();
      const yanit = await fetch(imza.signedUrl);
      expect(yanit.status, 'alıcı fatura dosyasını indiremedi').toBe(200);
    }

    // SATICI ERİŞİMİNİ KAYBETMİŞ OLMALI
    const { data: saticiArac } = await satici
      .from('vehicles').select('plate_number').eq('plate_number', DEVIR_PLAKA);
    expect(saticiArac?.length, 'satıcı aracı hâlâ görüyor').toBe(0);

    const { data: saticiKayit } = await satici
      .from('maintenance_records').select('id').eq('vehicle_plate', DEVIR_PLAKA);
    expect(saticiKayit?.length, 'satıcı kayıtları hâlâ görüyor').toBe(0);

    if (faturaYolu) {
      const { data: sImza, error: sHata } = await satici.storage
        .from('vehicle-invoices').createSignedUrl(faturaYolu, 60);
      expect(sHata || !sImza?.signedUrl, 'satıcı faturaya hâlâ erişiyor').toBeTruthy();
    }

    // Kullanılmış kod tekrar çalışmamalı.
    const tekrar = await rpc(alici, 'devir_istek_olustur', { p_kod: kod.kod });
    expect(tekrar?.hata).toBe('kod_gecersiz');
  });

  // -----------------------------------------------------------------------
  test('SATICIYA BİLDİRİM düştü ve metni kendi kendine yeterli', async () => {
    const satici = await supabaseIstemcisi();
    const { data } = await satici
      .from('notifications').select('title, message, type')
      .order('created_at', { ascending: false }).limit(5);

    const bildirim = (data || []).find((b) => (b.title || '').includes('devredildi'));
    expect(bildirim, 'devir bildirimi düşmedi').toBeTruthy();
    // Bildirime tıklamak her zaman /garage'a gidiyor ve araç orada olmayacak;
    // bu yüzden plaka METNİN İÇİNDE olmak zorunda.
    expect(bildirim.message, 'bildirim metninde plaka yok').toContain(DEVIR_PLAKA);
    expect(bildirim.type).toBe('warning');
  });

  // -----------------------------------------------------------------------
  // -----------------------------------------------------------------------
  // TALEP YOLU KAPATILDI — ARTIK BUNU DENETLİYORUZ
  //
  // `devir_talep_et` herhangi bir oturumlu kullanıcının YALNIZCA PLAKAYI
  // bilerek araç sahibine bildirim göndermesine izin veriyordu. Plakalar
  // sokakta görünüyor; yol bir taciz kanalıydı.
  //
  // Üstelik zaten işlemiyordu: arayüzdeki gerekçesi "satıcıya
  // ulaşamıyorsanız" idi ama `devir_talep_karari` sahibin AKTİF onayını ve
  // rıza metnini istiyor — ulaşılamayan satıcı talebi de onaylayamaz.
  // Satıcı ulaşılabilir olduğunda ise zaten devir kodu üretebiliyor.
  //
  // Yetki veritabanında geri alındı. Bu test onun geri açılmadığını
  // denetliyor: bir migration ya da "şunu da açalım" düzenlemesi kanalı
  // sessizce geri getirebilir.
  // -----------------------------------------------------------------------
  test('TALEP YOLU KAPALI: plakayı bilen sahibe bildirim gönderemiyor', async () => {
    const satici = await supabaseIstemcisi();
    const alici = await aliciIstemcisi();

    for (const [ad, istemci] of [['satıcı', satici], ['alıcı', alici]]) {
      const r = await rpc(istemci, 'devir_talep_et', {
        p_plaka: DEVIR_PLAKA, p_mesaj: 'kilit denemesi',
      });
      // `rpc` yardımcısı hata durumunda `{hata_mesaji}` döndürüyor.
      expect(
        r?.hata_mesaji || r?.hata,
        `${ad} hâlâ devir talebi gönderebiliyor — taciz kanalı yeniden açık`
      ).toBeTruthy();
    }

    const anon = anonIstemcisi();
    const ra = await rpc(anon, 'devir_talep_et', { p_plaka: DEVIR_PLAKA, p_mesaj: 'x' });
    expect(ra?.hata_mesaji || ra?.hata, 'anon talep gönderebiliyor').toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // ARACI GERİ DÖNDÜR — KOD YOLUYLA
  //
  // Önceki test aracı alıcıya devretti. Eskiden geri dönüş TALEP yoluyla
  // yapılıyordu; o yol kapandığı için artık kod yolu kullanılıyor. Bu aynı
  // zamanda kod yolunun İKİ YÖNDE de çalıştığını gösteriyor.
  //
  // Geri döndürmek şart: araç bu hesapta kalırsa sonraki koşumlar bozulur.
  // -----------------------------------------------------------------------
  test('araç kod yoluyla satıcıya geri dönüyor', async () => {
    const satici = await supabaseIstemcisi();
    const alici = await aliciIstemcisi();

    // Araç şu an ALICIDA; kodu o üretiyor.
    const uret = await rpc(alici, 'devir_kodu_uret', {
      p_plaka: DEVIR_PLAKA, p_riza_metni: RIZA,
    });
    expect(uret?.kod, JSON.stringify(uret)).toBeTruthy();

    const tamam = await devriTamamla(satici, alici, uret.kod);
    expect(tamam?.basarili, JSON.stringify(tamam)).toBe(true);

    const { data: { user: u1 } } = await satici.auth.getUser();
    const { data: son } = await satici
      .from('vehicles').select('user_id').eq('plate_number', DEVIR_PLAKA).single();
    expect(son?.user_id, 'araç satıcıya geri dönmedi').toBe(u1.id);
  });

  // -----------------------------------------------------------------------
  test('devir tabloları ve iç fonksiyonlar istemciye kapalı', async () => {
    const anon = anonIstemcisi();
    const sb = await supabaseIstemcisi();

    for (const tablo of ['devir_kodlari', 'devir_istekleri', 'devir_deneme_log']) {
      const a = await anon.from(tablo).select('*');
      const o = await sb.from(tablo).select('*');
      expect(a.error || (a.data && a.data.length === 0), `${tablo} anon'a açık`).toBeTruthy();
      expect(o.error || (o.data && o.data.length === 0), `${tablo} oturumluya açık`).toBeTruthy();
    }

    // İç fonksiyonlar: yalnızca diğer definer fonksiyonlar çağırabilir.
    for (const fn of ['_devri_uygula', '_bildirim_yaz', '_devir_deneme_asildi_mi',
                      'pin_uret', 'istemci_ip', 'sicil_hiz_siniri_asildi_mi']) {
      const r = await rpc(sb, fn, {});
      expect(r?.hata_mesaji, `${fn} oturumlu kullanıcıya açık`).toBeTruthy();
    }
  });

  // -----------------------------------------------------------------------
  // Devret düğmesi artık HER KARTTA değil. Kartlar beş katmandan üçe
  // indirilirken seyrek eylemler Araç Merkezi'ne ve kart içi `⋯` menüsüne
  // taşındı. Yol bir adım uzadı — araç seçici araya girdi — ama diyaloğun
  // kendisi ve rıza metni aynı.
  test('ARAYÜZ: Araç Merkezi\'nden devir diyaloğu açılıyor', async ({ page }) => {
    await girisYap(page);
    await page.goto('/garage');
    await page.waitForLoadState('networkidle');

    const dugme = page.getByRole('button', { name: /Aracı devret/ }).first();
    await expect(dugme, 'Araç Merkezi\'nde devret eylemi yok').toBeVisible({ timeout: 15_000 });
    await dugme.click();
    await page.waitForTimeout(1200);

    // Araç seçici: "hangi araç?" adımı. İlk araç seçiliyor.
    const secici = page.getByRole('dialog');
    await expect(secici, 'araç seçici açılmadı').toBeVisible({ timeout: 10_000 });
    await secici.locator('button').filter({ hasText: 'TR' }).first().click();
    await page.waitForTimeout(2000);

    const govde = await page.locator('body').textContent();
    // Rıza metni TAM görünmeli: gizlemek devrin dayanağını zayıflatır.
    expect(govde, 'rıza metni görünmüyor').toContain('içerebilir');
    expect(govde).toContain('Devir Kodu');
    expect(govde).toContain('Gelen Talepler');

    // Onay kutusu olmadan kod üretilmemeli.
    await page.locator("button:has-text('Devir Kodu Oluştur')").click();
    await page.waitForTimeout(800);
    const govde2 = await page.locator('body').textContent();
    expect(govde2, 'onay olmadan kod üretildi').toContain('onay kutusunu işaretlemeniz');
  });
});

// =========================================================================
// YENİ AKIŞIN KİLİTLERİ: ONAY VE ÜCRET ATLANAMAZ
//
// Devir artık üç adım: istek -> araç sahibinin onayı -> ücret. Bu bölüm
// adımların ATLANAMADIĞINI sınıyor. Bir tanesi bile atlanabiliyorsa akış
// yalnızca arayüzde var olan bir süs demektir.
// =========================================================================
test.describe('Devir onay ve ücret kilitleri', () => {

  test('ESKİ TEK ADIMLI YOL KAPALI: devir_tamamla istemciden çağrılamıyor', async () => {
    const alici = await aliciIstemcisi();
    const satici = await supabaseIstemcisi();

    // ⚠ EN KRİTİK DENETİM. Açık kalsaydı devralan hem onayı hem ücreti
    // atlayıp aracı doğrudan üzerine alabilirdi.
    for (const [ad, istemci] of [['alıcı', alici], ['satıcı', satici]]) {
      const { data, error } = await istemci.rpc('devir_tamamla', { p_kod: 'DV-XXXX-XXXX' });
      expect(
        !!error || data?.hata === 'oturum_yok',
        `devir_tamamla ${ad} tarafından çağrılabiliyor — onay ve ücret atlanabilir`
      ).toBeTruthy();
    }
  });

  test('ONAY ATLANAMIYOR: onaysız istekte ödeme reddediliyor', async () => {
    const satici = await supabaseIstemcisi();
    const alici = await aliciIstemcisi();

    const kod = await rpc(satici, 'devir_kodu_uret', { p_plaka: DEVIR_PLAKA, p_riza_metni: RIZA });
    test.skip(!kod?.kod, 'kod üretilemedi (araç bu koşumda satıcıda değil)');

    const istek = await rpc(alici, 'devir_istek_olustur', { p_kod: kod.kod });
    expect(istek?.basarili, JSON.stringify(istek)).toBe(true);

    // Araç sahibi HENÜZ onaylamadı.
    const odeme = await rpc(alici, 'devir_odeyip_tamamla', { p_istek_id: istek.istek_id });
    expect(odeme?.basarili, 'onaysız devir tamamlandı').toBe(false);
    expect(odeme?.hata).toBe('onay_bekliyor');

    // Araç hâlâ satıcıda olmalı.
    const { data: arac } = await satici
      .from('vehicles').select('plate_number').eq('plate_number', DEVIR_PLAKA);
    expect(arac?.length, 'onaysız devir aracı taşıdı').toBe(1);

    await rpc(satici, 'devir_kodu_iptal', { p_plaka: DEVIR_PLAKA });
  });

  test('DEVRALAN KENDİ İSTEĞİNİ ONAYLAYAMIYOR', async () => {
    const satici = await supabaseIstemcisi();
    const alici = await aliciIstemcisi();

    const kod = await rpc(satici, 'devir_kodu_uret', { p_plaka: DEVIR_PLAKA, p_riza_metni: RIZA });
    test.skip(!kod?.kod, 'kod üretilemedi');

    const istek = await rpc(alici, 'devir_istek_olustur', { p_kod: kod.kod });
    expect(istek?.basarili).toBe(true);

    // Taraf olmayan/yetkisiz karar: isteğin VARLIĞI bile sızmamalı.
    const karar = await rpc(alici, 'devir_istek_karari', { p_istek_id: istek.istek_id, p_onay: true });
    expect(karar?.basarili, 'devralan kendi isteğini onayladı').toBe(false);
    expect(karar?.hata).toBe('bulunamadi');

    await rpc(satici, 'devir_kodu_iptal', { p_plaka: DEVIR_PLAKA });
  });

  test('ONAY 2 GÜNLÜK ÖDEME SÜRESİ AÇIYOR ve ücret sunucuda sabit', async () => {
    const satici = await supabaseIstemcisi();
    const alici = await aliciIstemcisi();

    const kod = await rpc(satici, 'devir_kodu_uret', { p_plaka: DEVIR_PLAKA, p_riza_metni: RIZA });
    test.skip(!kod?.kod, 'kod üretilemedi');

    const istek = await rpc(alici, 'devir_istek_olustur', { p_kod: kod.kod });
    const karar = await rpc(satici, 'devir_istek_karari', { p_istek_id: istek.istek_id, p_onay: true });
    expect(karar?.basarili, JSON.stringify(karar)).toBe(true);
    expect(karar?.odeme_son_tarih, 'ödeme süresi açılmadı').toBeTruthy();

    // Süre ~2 gün olmalı. Dar bir pencere yerine 1.9-2.1 gün aralığı:
    // testin saat farkına takılmasını istemiyoruz.
    const fark = (new Date(karar.odeme_son_tarih).getTime() - Date.now()) / 86_400_000;
    expect(fark, `ödeme süresi 2 gün değil: ${fark.toFixed(2)} gün`).toBeGreaterThan(1.9);
    expect(fark).toBeLessThan(2.1);

    // ÜCRET SUNUCUDAN: istemci tutarı belirleyemiyor.
    const bekleyen = await rpc(alici, 'devir_bekleyenlerim');
    const kayit = (bekleyen || []).find((b) => b.istek_id === istek.istek_id);
    expect(kayit?.ucret, 'ücret bildirilmiyor').toBe(150);

    // ⚠ PLAKA DÖNMEMELİ.
    expect(Object.keys(kayit || {}), 'bekleyen devir listesi plaka döndürüyor')
      .not.toContain('vehicle_plate');

    // Temizlik: devri tamamlayıp aracı geri devrediyoruz.
    const odeme = await rpc(alici, 'devir_odeyip_tamamla', { p_istek_id: istek.istek_id });
    expect(odeme?.basarili, JSON.stringify(odeme)).toBe(true);

    const geri = await rpc(alici, 'devir_kodu_uret', { p_plaka: DEVIR_PLAKA, p_riza_metni: RIZA });
    if (geri?.kod) await devriTamamla(satici, alici, geri.kod);
  });

  test('devir istek tablosu ve süre düşürücü istemciye kapalı', async () => {
    const alici = await aliciIstemcisi();

    const { data, error } = await alici.from('devir_istekleri').select('*');
    expect(error || (data && data.length === 0), 'devir_istekleri istemciye açık').toBeTruthy();

    const { error: fnHata } = await alici.rpc('_devir_sureleri_dusur');
    expect(fnHata, '_devir_sureleri_dusur istemciden çağrılabiliyor').toBeTruthy();
  });
});

// =========================================================================
// ARAYÜZ: ÖDEME EKRANI
//
// Akışın son halkasıydı ve ekranı YOKTU: araç sahibi onayladıktan sonra
// devralan kişi bildirimi alıyor ama ödeme yapacak yeri bulamıyordu. Akış
// son adımda tıkanıyordu; bu paket o halkanın çalıştığını sınıyor.
// =========================================================================
test.describe('Devir ödeme ekranı', () => {

  test('onay öncesi ve sonrası doğru ekranı gösteriyor, ödeme aracı taşıyor', async ({ page }) => {
    const satici = await supabaseIstemcisi();
    const alici = await aliciIstemcisi();

    await rpc(satici, 'devir_kodu_iptal', { p_plaka: DEVIR_PLAKA });
    const kod = await rpc(satici, 'devir_kodu_uret', { p_plaka: DEVIR_PLAKA, p_riza_metni: RIZA });
    test.skip(!kod?.kod, 'kod üretilemedi (araç bu koşumda satıcıda değil)');

    const istek = await rpc(alici, 'devir_istek_olustur', { p_kod: kod.kod });
    expect(istek?.basarili, JSON.stringify(istek)).toBe(true);

    // ---- 'bekliyor': kullanıcının yapabileceği bir şey yok ----
    await girisYapAlici(page);
    await page.goto('/devir');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByText('Araç sahibinin onayı bekleniyor'),
      'onay beklerken durum bildirilmiyor'
    ).toBeVisible({ timeout: 20_000 });

    // Ödeme düğmesi HENÜZ olmamalı: tıklanacak bir şey yokken düğme
    // göstermek "bozuk" izlenimi verir.
    await expect(
      page.getByRole('button', { name: /Ücreti öde ve devral/i }),
      'onay gelmeden ödeme düğmesi görünüyor'
    ).toHaveCount(0);

    // ---- A onaylıyor ----
    const karar = await rpc(satici, 'devir_istek_karari', { p_istek_id: istek.istek_id, p_onay: true });
    expect(karar?.basarili, JSON.stringify(karar)).toBe(true);

    // ---- 'onaylandi': ücret, kalan süre ve ödeme düğmesi ----
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Araç üzerinize geçmeye hazır')).toBeVisible({ timeout: 20_000 });

    const metin = await hamMetin(page);
    expect(metin, 'devir ücreti gösterilmiyor').toContain('150');
    // Süre dolduğunda her şey sıfırlanıyor; kullanıcı bunu ödemeden ÖNCE bilmeli.
    expect(metin, 'kalan süre bildirilmiyor').toMatch(/kaldı/);
    expect(metin, 'süre dolarsa ne olacağı söylenmiyor').toContain('sıfırlanır');

    // ---- ödeme ----
    // Düğme artık doğrudan devretmiyor, önce ödeme onayı (paywall) açıyor;
    // vitrine çıkarmadaki akışın aynısı.
    await page.getByRole('button', { name: /Ücreti öde ve devral/i }).click();
    await expect(page.getByRole('heading', { name: 'Devir ücreti' }))
      .toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /Öde \(Demo\)/i }).click();
    await page.waitForURL('**/garage', { timeout: 30_000 });

    const { data: aracAlicida } = await alici
      .from('vehicles').select('plate_number').eq('plate_number', DEVIR_PLAKA);
    expect(aracAlicida?.length, 'ödeme sonrası araç devralana geçmedi').toBe(1);

    // Ücret SUNUCUDAN yazılıyor: istemci tutarı belirleyemiyor.
    const { data: alim } = await alici
      .from('satin_almalar').select('tutar, durum')
      .eq('urun_kodu', 'devir').order('id', { ascending: false }).limit(1);
    expect(Number(alim?.[0]?.tutar), 'devir ücreti sunucudaki tutardan farklı').toBe(150);
    expect(alim?.[0]?.durum).toBe('tamamlandi');

    // Temizlik: araç geri devrediliyor, sonraki koşumlar bozulmasın.
    const geri = await rpc(alici, 'devir_kodu_uret', { p_plaka: DEVIR_PLAKA, p_riza_metni: RIZA });
    if (geri?.kod) await devriTamamla(satici, alici, geri.kod);
  });
});

// =========================================================================
// GELEN TALEPLER EKRANI + BİLDİRİM HEDEFİ
//
// Araç sahibi, hangi aracına talep geldiğini sayfada göremiyordu: talepler
// yalnızca araç kartından açılan diyaloğun bir sekmesinde ve PLAKA BAZINDA
// duruyordu. Bildirimler de tıklanınca hep `/garage` açıyordu, çünkü
// `Header` bildirim nesnesini yok sayıyordu.
// =========================================================================
test.describe('Gelen talepler ve bildirim hedefi', () => {

  test('araç sahibi talebi /devir sayfasında görüp onaylayabiliyor', async ({ page }) => {
    const satici = await supabaseIstemcisi();
    const alici = await aliciIstemcisi();

    await rpc(satici, 'devir_kodu_iptal', { p_plaka: DEVIR_PLAKA });
    const kod = await rpc(satici, 'devir_kodu_uret', { p_plaka: DEVIR_PLAKA, p_riza_metni: RIZA });
    test.skip(!kod?.kod, 'kod üretilemedi (araç bu koşumda satıcıda değil)');

    const istek = await rpc(alici, 'devir_istek_olustur', { p_kod: kod.kod });
    expect(istek?.basarili, JSON.stringify(istek)).toBe(true);

    // ⚠ ARAÇ KARTI AÇILMIYOR. Bütün mesele buydu: sahibin talebi görmek
    // için araçlarını tek tek açması gerekiyordu.
    await girisYap(page);
    await page.goto('/devir');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: 'Size gelen devir talepleri' }),
      'gelen talepler bölümü /devir sayfasında yok'
    ).toBeVisible({ timeout: 20_000 });

    const metin = await hamMetin(page);
    expect(metin, 'talebin hangi araca ait olduğu yazmıyor').toContain(kod.pin_code || 'CV-');

    await page.getByRole('button', { name: /Onayla ve devret/i }).first().click();
    await expect(page.getByText('Onayladınız.')).toBeVisible({ timeout: 20_000 });

    // Temizlik: onay ödeme bekliyor; iptal edilip kod düşürülüyor.
    await rpc(satici, 'devir_kodu_iptal', { p_plaka: DEVIR_PLAKA });
  });

  test('devir bildirimi kendi hedefini taşıyor', async () => {
    const alici = await aliciIstemcisi();
    const { data: { user } } = await alici.auth.getUser();

    const { data } = await alici
      .from('notifications')
      .select('title, type, hedef_yol')
      .eq('user_id', user.id)
      .not('hedef_yol', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);

    // Hedefi olan en az bir bildirim bulunmalı; hepsi uygulama içi bir yola
    // işaret etmeli. Eskiden hangi bildirime tıklanırsa tıklansın `/garage`
    // açılıyordu çünkü bildirimde hedef alanı YOKTU.
    expect((data || []).length, 'hedef taşıyan bildirim yok').toBeGreaterThan(0);
    for (const b of data) {
      expect(b.hedef_yol, `geçersiz hedef: ${b.hedef_yol}`).toMatch(/^\//);
    }
  });
});

// =========================================================================
// DEVİR ÜCRETİ: DEMO ÖDEME AKIŞI
//
// Ücret eskiden düğmeye basınca sessizce tahsil ediliyordu; kullanıcı ne
// için ödediğini onaylayacağı bir ekran görmüyordu. Artık vitrine
// çıkarmadaki `PaywallDialog` akışının aynısı.
//
// ⚠ BU PAKETİN ASIL DENETİMİ: TEK satın alma kaydı oluşmalı.
// `PaywallDialog` normalde kaydı KENDİSİ üretiyor; `devir_odeyip_tamamla`
// da üretiyor. İkisi birden çalışsaydı kullanıcı iki kez ücretlendirilmiş
// görünürdü. Diyalog bu yüzden `kaydiCagiranUretir` ile açılıyor.
// =========================================================================
test.describe('Devir ücreti demo ödemesi', () => {

  test('arayüzdeki tutar sunucudakiyle aynı', async () => {
    const alici = await aliciIstemcisi();
    const { data: sunucuUcret } = await alici.rpc('devir_ucreti');

    // Katalogdaki gösterim tutarı ile sunucunun tahsil ettiği tutar
    // ayrışırsa kullanıcı bir rakam görüp başkasını öder. Katalogda 199,
    // sunucuda 150 yazıyordu.
    const { URUNLER } = require('../src/data/paketler');
    expect(
      Number(URUNLER.devir.fiyat),
      'katalog fiyatı sunucudaki `devir_ucreti()` ile uyuşmuyor'
    ).toBe(Number(sunucuUcret));
  });

  test('ödeme paywall\'dan geçiyor ve TEK satın alma kaydı üretiyor', async ({ page }) => {
    const satici = await supabaseIstemcisi();
    const alici = await aliciIstemcisi();
    const { data: { user: aliciUser } } = await alici.auth.getUser();

    const { count: once } = await alici
      .from('satin_almalar').select('*', { count: 'exact', head: true })
      .eq('user_id', aliciUser.id).eq('urun_kodu', 'devir');

    await rpc(satici, 'devir_kodu_iptal', { p_plaka: DEVIR_PLAKA });
    const kod = await rpc(satici, 'devir_kodu_uret', { p_plaka: DEVIR_PLAKA, p_riza_metni: RIZA });
    test.skip(!kod?.kod, 'kod üretilemedi (araç bu koşumda satıcıda değil)');

    const istek = await rpc(alici, 'devir_istek_olustur', { p_kod: kod.kod });
    await rpc(satici, 'devir_istek_karari', { p_istek_id: istek.istek_id, p_onay: true });

    await girisYapAlici(page);
    await page.goto('/devir');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Ücreti öde ve devral/i }).first().click();

    // Paywall açılmalı: kullanıcı ne için ödediğini onaylıyor.
    await expect(page.getByRole('heading', { name: 'Devir ücreti' }))
      .toBeVisible({ timeout: 20_000 });

    // ⚠ `hamMetin` HAM DOM metnini veriyor; ekrandaki büyük harfler CSS'ten
    // geliyor ve buraya yansımıyor. Bu tuzağa daha önce de düşülmüştü.
    const metin = await hamMetin(page);
    expect(metin, 'demo uyarısı yok').toContain('gerçek ödeme alınmıyor');
    expect(metin, 'gerçek tahsilat yapılmadığı söylenmiyor')
      .toContain('kartınızdan hiçbir tutar çekilmez');
    expect(metin, 'katalogdan kalan eski tutar görünüyor').not.toContain('₺199');

    await page.getByRole('button', { name: /Öde \(Demo\)/i }).click();
    await page.waitForURL('**/garage', { timeout: 30_000 });

    const { data: aracAlicida } = await alici
      .from('vehicles').select('plate_number').eq('plate_number', DEVIR_PLAKA);
    expect(aracAlicida?.length, 'ödeme sonrası araç geçmedi').toBe(1);

    // ⚠ ASIL DENETİM.
    const { count: sonra } = await alici
      .from('satin_almalar').select('*', { count: 'exact', head: true })
      .eq('user_id', aliciUser.id).eq('urun_kodu', 'devir');
    expect(sonra, 'devir için birden fazla satın alma kaydı oluştu').toBe((once || 0) + 1);

    // Temizlik: araç geri devrediliyor.
    const geri = await rpc(alici, 'devir_kodu_uret', { p_plaka: DEVIR_PLAKA, p_riza_metni: RIZA });
    if (geri?.kod) await devriTamamla(satici, alici, geri.kod);
  });
});
