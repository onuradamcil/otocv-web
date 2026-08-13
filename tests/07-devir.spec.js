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
      if (kod?.kod) await rpc(satici, 'devir_tamamla', { p_kod: kod.kod });
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
    const dene = await rpc(alici, 'devir_tamamla', { p_kod: kod.kod });
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

    const sonuc = await rpc(alici, 'devir_tamamla', { p_kod: kod.kod });
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
    const tekrar = await rpc(alici, 'devir_tamamla', { p_kod: kod.kod });
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
  test('TALEP YOLU: talep, sınırlar ve onay', async () => {
    // Araç şu an ALICIDA (önceki test devretti). Satıcı geri talep ediyor.
    const satici = await supabaseIstemcisi();
    const alici = await aliciIstemcisi();

    const t1 = await rpc(satici, 'devir_talep_et', {
      p_plaka: DEVIR_PLAKA, p_mesaj: 'Test: aracı geri alıyorum.',
    });
    expect(t1?.basarili, JSON.stringify(t1)).toBe(true);

    // SINIR: aynı araca ikinci bekleyen talep açılamaz.
    const t2 = await rpc(satici, 'devir_talep_et', { p_plaka: DEVIR_PLAKA, p_mesaj: 'ikinci' });
    expect(t2?.hata, 'ikinci talep engellenmedi').toBe('zaten_bekleyen_talep');

    // Yeni sahip talebi görüyor.
    const durum = await rpc(alici, 'devir_durumu', { p_plaka: DEVIR_PLAKA });
    expect((durum?.talepler || []).length, 'sahip talebi görmüyor').toBe(1);
    expect(durum.talepler[0].mesaj).toContain('geri alıyorum');

    // SAHİP OLMAYAN karar veremez.
    const yanlis = await rpc(satici, 'devir_talep_karari', {
      p_istek_id: t1.istek_id, p_onay: true, p_riza_metni: RIZA,
    });
    expect(yanlis?.hata, 'sahip olmayan karar verebildi').toBe('sahip_degil');

    // Sahip onaylıyor → devir tamamlanıyor.
    const karar = await rpc(alici, 'devir_talep_karari', {
      p_istek_id: t1.istek_id, p_onay: true, p_riza_metni: RIZA,
    });
    expect(karar?.basarili, JSON.stringify(karar)).toBe(true);
    expect(karar?.karar).toBe('onaylandi');

    const { data: { user: u1 } } = await satici.auth.getUser();
    const { data: son } = await satici
      .from('vehicles').select('user_id').eq('plate_number', DEVIR_PLAKA).single();
    expect(son?.user_id, 'talep onayı devri tamamlamadı').toBe(u1.id);
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
