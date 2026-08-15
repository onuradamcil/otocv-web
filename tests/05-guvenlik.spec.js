// =========================================================================
// 05 · GÜVENLİK — SALDIRGAN TESTLERİ
//
// -------------------------------------------------------------------------
// NİYE BU DOSYA VAR
// -------------------------------------------------------------------------
// RLS ve storage politikaları elle bir kez doğrulandı. Bu yetmez: bir
// migration, bir politika düzenlemesi ya da "şunu da açalım" diyen bir
// değişiklik açığı sessizce geri getirebilir. Güvenlik, her push'ta
// koşmayan bir kontrolle korunmuş sayılmaz.
//
// Testler SALDIRGAN rolünü oynuyor: elinde yalnızca anon anahtarı olan
// biri neye erişebiliyor? Anon anahtarı istemci paketinin içinde, yani
// herkese açık; "gizli anahtar" varsayımı yok.
//
// -------------------------------------------------------------------------
// BU TESTLERİN NEYİ İSPATLADIĞI
// -------------------------------------------------------------------------
//   · Bakım kayıtlarına doğrudan erişim yalnızca araç sahibinde
//   · Ziyaretçi karneyi görebiliyor ama plakayı ve faturayı göremiyor
//   · Fatura dosyası imzasız açılamıyor, imzayı da sahibi olmayan alamıyor
//   · Eski public URL'ler ölü
//   · Fonksiyon toplu veri çekmeye zorlanamıyor
//
// -------------------------------------------------------------------------
// ⚠ BU DOSYANIN EN ÖNEMLİ KURALI: YIKICI TEST YAZILMAZ
// -------------------------------------------------------------------------
// İlk yazımda silme testi şöyleydi:
//
//   anon.from('maintenance_records').delete().eq('vehicle_plate', ORNEK_PLAKA)
//
// Bu test koşturulduğunda RLS henüz AÇIK DEĞİLDİ. Politikalar tanımlıydı ama
// RLS kapalı olduğu için değerlendirilmiyordu — yani silme GERÇEKTEN çalıştı
// ve 41IHH434 plakasının canlı bakım kaydı (#22) silindi. Yedekten geri
// yazıldı, ama sebep düşünme hatasıydı:
//
//   Güvenlik testi, korumanın ÇALIŞMADIĞI varsayımı altında koşar.
//   Dolayısıyla yıkıcı bir işlem denemesi, korumanın olmadığı durumda
//   GERÇEKTEN yıkar. Testin başarısızlık bedeli veri kaybı olmamalı.
//
// KURAL: yazma/silme/güncelleme denemeleri YALNIZCA testin kendi oluşturduğu
// tek bir kayda, `eq('id', …)` ile yapılır. Politika tamamen açık olsa bile
// zarar yarıçapı testin kendi çöpüdür. Plaka ya da tarih gibi geniş
// filtrelerle asla denenmez.
//
// Oluşturulan kayıt `afterAll` içinde sahibi tarafından silinir — test
// başarısız olsa da çalışır.
// =========================================================================

const {
  test,
  expect,
  girisYap,
  anonIstemcisi,
  supabaseIstemcisi,
  ornekPin,
  ORNEK_PLAKA,
  plakaBicimleri,
  aliciIstemcisi,
} = require('./yardimcilar');

// Testin kendi oluşturduğu kayıtların işareti. Yıkıcı denemeler yalnızca
// bunlara, id üzerinden yapılır.
const ISARET = 'OTOCV-TEST-GUVENLIK';

test.describe('Güvenlik · doğrudan tablo erişimi', () => {
  // Test dosyası bittiğinde — testler geçse de geçmese de — bu dosyanın
  // yazdığı her kayıt sahibi tarafından silinir.
  test.afterAll(async () => {
    const sb = await supabaseIstemcisi();
    const { error } = await sb
      .from('maintenance_records')
      .delete()
      .like('shop_name', `${ISARET}%`);
    if (error) console.warn('Güvenlik testi çöpü silinemedi:', error.message);
  });

  test('anon anahtarı, oturum açmadan bakım kaydı OKUYAMAZ', async () => {
    const anon = anonIstemcisi();
    const { data, error } = await anon.from('maintenance_records').select('*');

    // İki kabul edilebilir sonuç var: politika hatası ya da boş liste.
    // RLS'te "yetkin yok" hata değil, satır yok demektir.
    expect(error || (data && data.length === 0)).toBeTruthy();
    expect(data?.length ?? 0).toBe(0);
  });

  test('anon anahtarı bakım kaydı EKLEYEMEZ', async () => {
    const anon = anonIstemcisi();
    const { error } = await anon.from('maintenance_records').insert({
      vehicle_plate: ORNEK_PLAKA,
      shop_name: `${ISARET}-EKLEME`,
      km_at_service: 1,
      cost: 1,
      summary: 'bu kayıt oluşmamalı',
      service_type: 'Periyodik Bakım',
    });
    // Reddedilmesi ZORUNLU. Geçerse tabloya herkes yazabiliyor demektir.
    // Yine de afterAll temizliği var: politika açıksa kayıt oluşur ve
    // veritabanında çöp olarak kalmasın.
    expect(error, 'anon anahtarıyla bakım kaydı eklenebiliyor').toBeTruthy();
  });

  test('anon anahtarı bakım kaydı SİLEMEZ', async () => {
    // Hedef kaydı testin KENDİSİ oluşturuyor. Böylece politika tamamen açık
    // olsa bile silinebilecek tek şey bu satır — canlı veri değil.
    const sb = await supabaseIstemcisi();
    const { data: hedef, error: olusturHata } = await sb
      .from('maintenance_records')
      .insert({
        vehicle_plate: ORNEK_PLAKA,
        shop_name: `${ISARET}-SILME-HEDEFI`,
        km_at_service: 1,
        cost: 1,
        summary: 'silme denemesi için tek kullanımlık kayıt',
        service_type: 'Periyodik Bakım',
      })
      .select('id')
      .single();

    expect(olusturHata, 'sahip kendi aracına kayıt ekleyemiyor').toBeFalsy();

    const anon = anonIstemcisi();
    const { data: silinen } = await anon
      .from('maintenance_records')
      .delete()
      .eq('id', hedef.id)          // ← YALNIZCA testin kendi kaydı
      .select();

    expect(silinen?.length ?? 0, 'anon anahtarıyla kayıt silinebiliyor').toBe(0);

    // Kayıt gerçekten yerinde mi? Silme isteği sessizce 0 satır döndürüp
    // arkadan silmiş olamaz — sahibinden doğrulanıyor.
    const { data: halaVar } = await sb
      .from('maintenance_records')
      .select('id')
      .eq('id', hedef.id);
    expect(halaVar?.length, 'kayıt silinmiş').toBe(1);
  });

  test('anon anahtarı bakım kaydı GÜNCELLEYEMEZ', async () => {
    const sb = await supabaseIstemcisi();
    const { data: hedef } = await sb
      .from('maintenance_records')
      .insert({
        vehicle_plate: ORNEK_PLAKA,
        shop_name: `${ISARET}-GUNCELLEME-HEDEFI`,
        km_at_service: 1,
        cost: 1,
        summary: 'güncelleme denemesi için tek kullanımlık kayıt',
        service_type: 'Periyodik Bakım',
      })
      .select('id')
      .single();

    const anon = anonIstemcisi();
    await anon
      .from('maintenance_records')
      .update({ summary: 'SALDIRGAN DEĞİŞTİRDİ' })
      .eq('id', hedef.id);

    const { data: sonrasi } = await sb
      .from('maintenance_records')
      .select('summary')
      .eq('id', hedef.id)
      .single();

    expect(sonrasi?.summary, 'anon anahtarıyla kayıt değiştirilebiliyor').not.toBe(
      'SALDIRGAN DEĞİŞTİRDİ'
    );
  });

  test('oturum açmış kullanıcı YALNIZCA kendi araçlarının kaydını görür', async () => {
    const sb = await supabaseIstemcisi();

    const { data: { user } } = await sb.auth.getUser();
    const { data: kendiAraclar } = await sb
      .from('vehicles')
      .select('plate_number')
      .eq('user_id', user.id);

    const kendiPlakalar = new Set((kendiAraclar || []).map((v) => v.plate_number));

    const { data: kayitlar, error } = await sb.from('maintenance_records').select('vehicle_plate');
    expect(error).toBeFalsy();

    // Dönen HER satırın plakası kendi araçlarından biri olmalı. Bu, "başka
    // kullanıcının plakasını tahmin et" testinden daha güçlü: hangi yabancı
    // plakanın var olduğunu bilmeye gerek yok.
    const yabanci = (kayitlar || [])
      .map((k) => k.vehicle_plate)
      .filter((p) => !kendiPlakalar.has(p));

    expect(yabanci, `başka kullanıcının kayıtları görünüyor: ${yabanci.join(', ')}`).toEqual([]);
  });
});

test.describe('Güvenlik · vehicles tablosu', () => {
  // İKİ AÇIK KANITLANDI VE KAPATILDI:
  //
  //   1. `"Herkes araçları sorgulayabilir"` (SELECT true) — anon anahtarıyla
  //      oturum açmadan 10 aracın hepsi döndü; plate_number VE pin_code
  //      dahil. Bu, iki ayrı güvenlik çalışmasını boşa çıkarıyordu:
  //      sicil_getir plakayı ziyaretçiden saklıyor (listeleyen için
  //      anlamsız) ve PIN entropisi 50 bite çıkarıldı (listeleyenin tahmin
  //      etmesi gerekmez).
  //
  //   2. `"Herkes araç ekleyebilir"` (INSERT check true) — anon, BAŞKA
  //      kullanıcının adına 98 puanlı araç ekledi. Kanıtlandı, eklenen satır
  //      silindi.
  //
  // Tuzak şuydu: yanlarında `auth.uid() = user_id` koşullu SIKI politikalar
  // da duruyordu. Postgres'te aynı komut için birden fazla permissive
  // politika VEYA'lanır, dolayısıyla açık olan sıkı olanı etkisiz kılıyordu.
  // Sıkı politikanın varlığı, korunduğu izlenimini veriyordu.

  const TEST_PLAKA = 'ZZTEST9999';

  test.afterAll(async () => {
    // Anon ekleme BAŞARILI olursa (yani açık geri gelmişse) satır burada
    // temizlenir. Saldırı senaryosu kaydı test hesabının adına eklediği
    // için sahibi onu silebiliyor.
    const sb = await supabaseIstemcisi();
    const { error } = await sb.from('vehicles').delete().like('plate_number', 'ZZTEST%');
    if (error) console.warn('Test aracı silinemedi:', error.message);
  });

  test('anon anahtarı, oturum açmadan HİÇBİR aracı okuyamaz', async () => {
    const anon = anonIstemcisi();
    const { data, error } = await anon.from('vehicles').select('plate_number, pin_code');

    expect(error || (data && data.length === 0)).toBeTruthy();
    expect(data?.length ?? 0, 'anon anahtarıyla araç listesi okunabiliyor').toBe(0);
  });

  test('anon anahtarı başka kullanıcının adına araç EKLEYEMEZ', async () => {
    const sb = await supabaseIstemcisi();
    const { data: { user } } = await sb.auth.getUser();

    const anon = anonIstemcisi();
    const { error } = await anon.from('vehicles').insert({
      plate_number: TEST_PLAKA,
      user_id: user.id,                 // saldırı: başkasının kimliği
      pin_code: 'CV-ZZTST-ZZTST',
      brand: 'TEST', model: 'TEST', year: 2020, km: 1,
      package: 'TEST', inspection_end_date: '2030-01-01',
      trust_score: 98,                  // saldırı: puanı kendisi belirliyor
    });

    expect(error, 'anon anahtarıyla başkasının adına araç eklenebiliyor').toBeTruthy();
  });

  test('oturum açmış kullanıcı YALNIZCA kendi araçlarını görür', async () => {
    const sb = await supabaseIstemcisi();
    const { data: { user } } = await sb.auth.getUser();

    const { data: araclar, error } = await sb.from('vehicles').select('plate_number, user_id');
    expect(error).toBeFalsy();
    expect(araclar?.length, 'kullanıcının hiç aracı okunamadı').toBeGreaterThan(0);

    const yabanci = (araclar || []).filter((v) => v.user_id !== user.id);
    expect(yabanci.map((v) => v.plate_number), 'başka kullanıcının aracı görünüyor').toEqual([]);
  });

  test('plaka_kayitli_mi yalnızca doğru/yanlış döner, plaka sızdırmaz', async () => {
    // Sihirbazın tekillik kontrolü eskiden filtresiz `select('plate_number')`
    // yapıyordu: sistemdeki BÜTÜN plakaları indiriyordu. Artık tek boolean.
    //
    // OTURUMLU istemci kullanılıyor: fonksiyon anon'a kapatıldı, çünkü plaka
    // uzayı PIN uzayından çok küçük ve bir keşif kapısıydı. Anon'un
    // reddedildiğini ayrı bir test doğruluyor.
    const anon = await supabaseIstemcisi();

    const { data: yok, error: e1 } = await anon.rpc('plaka_kayitli_mi', {
      p_plaka: 'ZZ YOK BOYLE 999',
    });
    expect(e1).toBeFalsy();
    expect(typeof yok, 'dönüş tipi boolean olmalı').toBe('boolean');
    expect(yok).toBe(false);

    // Var olan bir plaka: sahibi bilir, sistem doğrular. Yeni bilgi sızmıyor.
    const sb = anon;
    const { data: kendi } = await sb.from('vehicles').select('plate_number').limit(1);
    const plaka = kendi?.[0]?.plate_number;
    expect(plaka).toBeTruthy();

    const { data: var_ } = await anon.rpc('plaka_kayitli_mi', { p_plaka: plaka });
    expect(var_).toBe(true);

    // Boşluklu yazım da bulmalı — normalleştirme sunucuda.
    const bosluklu = plaka.replace(/^(\d\d)/, '$1 ');
    const { data: var2 } = await anon.rpc('plaka_kayitli_mi', { p_plaka: bosluklu });
    expect(var2, `"${bosluklu}" bulunamadı — sunucu normalleştirmesi çalışmıyor`).toBe(true);

    // Joker karakter tüm plakalarla eşleşmemeli.
    for (const joker of ['%', '_', '%%%']) {
      const { data: r } = await anon.rpc('plaka_kayitli_mi', { p_plaka: joker });
      expect(r, `joker "${joker}" eşleşti`).toBe(false);
    }
  });
});

test.describe('Güvenlik · sicil_getir() genel okuma yolu', () => {
  test('ziyaretçi karneyi görür ama PLAKA ve FATURA YOLU gelmez', async () => {
    const anon = anonIstemcisi();
    const pin = await ornekPin();
    const { data, error } = await anon.rpc('sicil_getir', { p_pin: pin });

    expect(error).toBeFalsy();
    expect(data, 'fonksiyon boş döndü — karne ziyaretçide boş görünür').toBeTruthy();
    expect(data.arac).toBeTruthy();
    expect(Array.isArray(data.bakim_kayitlari)).toBe(true);

    // Sahip değil.
    expect(data.arac.sahip_mi).toBe(false);

    // KVKK: plaka kişisel veri, ziyaretçiye gitmez.
    expect(data.arac.plate_number, 'plaka ziyaretçiye sızıyor').toBeNull();

    // Fatura yolu gitmezse ziyaretçi imzalı bağlantı da isteyemez.
    for (const k of data.bakim_kayitlari) {
      expect(k.invoice_path, 'fatura yolu ziyaretçiye sızıyor').toBeNull();
      // Belgenin VARLIĞI görünebilir — görseli açığa çıkarmıyor.
      expect(typeof k.faturali).toBe('boolean');
    }
  });

  test('araç sahibi kendi PIN’inde plakayı ve fatura yolunu görür', async () => {
    const sb = await supabaseIstemcisi();
    const pin = await ornekPin();
    const { data, error } = await sb.rpc('sicil_getir', { p_pin: pin });

    expect(error).toBeFalsy();
    expect(data?.arac?.sahip_mi).toBe(true);
    expect(data.arac.plate_number).toBeTruthy();
  });

  test('fonksiyon toplu çekmeye zorlanamaz (desen, enjeksiyon, taşma)', async () => {
    const anon = anonIstemcisi();

    const kotuGirdiler = [
      "' or 1=1 --",     // SQL enjeksiyon denemesi
      '%',               // joker: tüm araçlar
      'CV-%',            // önekli joker
      '_' .repeat(8),    // tek karakter jokeri
      '',                // boş
      '   ',             // yalnızca boşluk
      'A'.repeat(200),   // taşma denemesi
      'CV-000002; drop table vehicles',
    ];

    for (const girdi of kotuGirdiler) {
      const { data } = await anon.rpc('sicil_getir', { p_pin: girdi });
      expect(data, `"${girdi.slice(0, 24)}" girdisi veri döndürdü`).toBeNull();
    }
  });

  test('olmayan PIN hata değil, boş sonuç döner', async () => {
    const anon = anonIstemcisi();
    const { data, error } = await anon.rpc('sicil_getir', { p_pin: 'CV-YOKBOYLE' });
    expect(error).toBeFalsy();
    expect(data).toBeNull();
  });
});

test.describe('Güvenlik · fatura dosyaları (storage)', () => {
  test('sahibi imzalı bağlantı alabilir, ziyaretçi ALAMAZ', async () => {
    const sb = await supabaseIstemcisi();

    // Tek bir PIN'e bağlanmıyor: sahibin HERHANGİ bir aracındaki fatura
    // yeterli. Önceki hâli ORNEK_PIN'e bakıyordu ve o araçta fatura
    // olmadığı bir anda test sessizce atlandı — güvenlik testinin
    // atlanması, geçmesi kadar tehlikeli.
    const { data: faturali } = await sb
      .from('maintenance_records')
      .select('invoice_path')
      .not('invoice_path', 'is', null)
      .limit(1);

    const yol = faturali?.[0]?.invoice_path;
    expect(yol, 'hiç fatura yollu kayıt yok — storage politikası test edilemedi').toBeTruthy();

    // Sahip: çalışan bağlantı.
    const { data: imza, error: imzaHata } = await sb.storage
      .from('vehicle-invoices')
      .createSignedUrl(yol, 60);
    expect(imzaHata).toBeFalsy();
    expect(imza?.signedUrl).toBeTruthy();

    // Bağlantı gerçekten dosyayı veriyor mu?
    const yanit = await fetch(imza.signedUrl);
    expect(yanit.status, 'sahibin imzalı bağlantısı çalışmıyor').toBe(200);

    // Ziyaretçi: aynı yol için imza ALAMAZ.
    const anon = anonIstemcisi();
    const { data: anonImza, error: anonHata } = await anon.storage
      .from('vehicle-invoices')
      .createSignedUrl(yol, 60);
    expect(anonHata || !anonImza?.signedUrl, 'ziyaretçi imzalı bağlantı alabiliyor').toBeTruthy();

    // Ziyaretçi: imzasız indirme de olmaz.
    const { data: indirme, error: indirHata } = await anon.storage
      .from('vehicle-invoices')
      .download(yol);
    expect(indirHata || !indirme, 'ziyaretçi fatura dosyasını indirebiliyor').toBeTruthy();
  });

  test('sahip BAŞKA kullanıcının klasörüne erişemez', async () => {
    const sb = await supabaseIstemcisi();
    const { data: { user } } = await sb.auth.getUser();

    // Kendi kimliğinden farklı, geçerli biçimde bir uuid klasörü.
    const yabanciKlasor = user.id.startsWith('0')
      ? user.id.replace(/^0/, '1')
      : user.id.replace(/^./, '0');

    const { data, error } = await sb.storage
      .from('vehicle-invoices')
      .createSignedUrl(`${yabanciKlasor}/41IHH434/invoice_1.jpg`, 60);

    // Dosya olmasa bile politika ÖNCE devreye girmeli. Hata beklenir.
    expect(error || !data?.signedUrl, 'başka kullanıcının klasörüne imza alınabiliyor').toBeTruthy();
  });

  test('bucket’a listeleme yapılamaz (dosya adları keşfedilemez)', async () => {
    const anon = anonIstemcisi();
    const { data, error } = await anon.storage.from('vehicle-invoices').list('', { limit: 100 });

    // Listeleme açık olsa saldırgan klasör adlarını (yani kullanıcı
    // kimliklerini) toplayabilirdi.
    expect(error || (data && data.length === 0)).toBeTruthy();
    expect(data?.length ?? 0).toBe(0);
  });
});

test.describe('Güvenlik · PIN joker karakterle zorlanamaz', () => {
  // KUSUR: PIN sorguları `.ilike('pin_code', pin)` kullanıyordu. `ilike`
  // desen karakterlerini yorumluyor, yani `CV-%` BÜTÜN araçlarla eşleşiyor
  // ve sayfalar `data[0]`'ı alıyordu. Sonuç: oturum açmamış biri, plakası ve
  // PIN'i dahil rastgele bir aracın tam kaydını görebiliyordu. Canlı veride
  // doğrulandı: `CV-%` 10 aracın 10'uyla eşleşti.
  //
  // Düzeltme iki katmanlı: pinNormalize alfabe dışı karakteri reddediyor,
  // sorgular `eq` kullanıyor. Bu testler ikisinin de yerinde durduğunu
  // kontrol ediyor.

  const JOKER_GIRDILER = ['CV-%', 'CV-_', '%', 'CV-%25'];

  for (const girdi of JOKER_GIRDILER) {
    test(`/details/${girdi} araç DÖNDÜRMÜYOR`, async ({ page }) => {
      await page.goto(`/details/${encodeURIComponent(girdi)}`);
      await page.waitForLoadState('networkidle');

      const govde = await page.locator('body').textContent();

      // PIN'İ KONTROL ETMEK KRİTİK, PLAKAYI DEĞİL.
      //
      // Ziyaretçi arayüzü plakayı zaten göstermiyor, dolayısıyla yalnızca
      // plakaya bakan bir test kusur DURUYORKEN DE geçerdi — boş test olur.
      // Sızan şey aracın kendisi ve ekranda basılan PIN'i: `CV-%` sorgusu
      // 01DNM0012 aracını döndürüyordu ve sayfa onun PIN'ini (CV-7MBV0Y)
      // ekrana yazıyordu. Yani kusur, tam erişim veren anahtarı sızdırıyordu.
      //
      // Değerler veritabanından okunuyor; sabit liste tutmak yeni araç
      // eklendiğinde testi sessizce kör bırakırdı.
      const sb = await supabaseIstemcisi();
      const { data: araclar } = await sb.from('vehicles').select('plate_number, pin_code');

      for (const { plate_number, pin_code } of araclar || []) {
        expect(govde, `joker girdi "${girdi}" ${plate_number} aracının PIN'ini sızdırdı`)
          .not.toContain(pin_code);
        // ⚠ İKİ BİÇİM BİRDEN: arayüz plakayı boşluklu basıyor
        // ('41 IHH 434'), veritabanı boşluksuz tutuyor ('41IHH434').
        // Yalnızca veritabanı biçimini aramak sızıntıyı görmezdi.
        for (const bicim of plakaBicimleri(plate_number)) {
          expect(govde, `joker girdi "${girdi}" ${plate_number} plakasını "${bicim}" biçiminde sızdırdı`)
            .not.toContain(bicim);
        }
      }
    });
  }

  test('PIN formuna joker yazmak araç getirmiyor, hata gösteriyor', async ({ page }) => {
    await page.goto('/verify');
    await page.waitForLoadState('networkidle');

    const kutu = page.locator("input[placeholder*='CV-']").first();
    await kutu.fill('CV-%');
    await page.locator("button[type='submit']").first().click();
    await page.waitForTimeout(1500);

    // Araç detayına GİTMEMELİ.
    expect(page.url(), 'joker girdi araç detayına götürdü').not.toContain('/details/');

    // Kullanıcıya sebebi söylenmeli — sessizce hiçbir şey olmaması da kötü.
    const govde = await page.locator('body').textContent();
    expect(govde).toContain('PIN biçimi geçersiz');
  });

  test('yeni biçim PIN (14 karakter) URL üzerinden çalışıyor', async ({ page }) => {
    // Giriş kutusunda `maxLength` 9'du; yeni biçim PIN'i sessizce kesiyordu.
    // Bu test yeni biçimin uçtan uca çalıştığını kontrol ediyor.
    const sb = await supabaseIstemcisi();
    const { data } = await sb
      .from('vehicles')
      .select('pin_code')
      .like('pin_code', 'CV-_____-_____')
      .limit(1);

    const yeniPin = data?.[0]?.pin_code;
    expect(yeniPin, 'yeni biçimde (CV-XXXXX-XXXXX) hiç PIN yok').toBeTruthy();
    expect(yeniPin.length).toBe(14);

    await page.goto(`/karne/${yeniPin}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator(`text=${yeniPin}`).first()).toBeVisible({ timeout: 15_000 });
  });

  test('her PIN güçlü biçimde: sıralı yok, eski kısa biçim yok', async () => {
    // İKİ KUSUR BİRDEN KONTROL EDİLİYOR:
    //
    // 1. SIRALI PIN. CV-000001/2/3 sıralıydı (PIN yapısı ilk kurulurken elle
    //    girilmişti); bir saldırgan sırayla yazarak sicilleri gezebilirdi.
    //
    // 2. ESKİ KISA BİÇİM. `CV-XXXXXX` = 6 base36 karakteri ≈ 31 bit. Bugün
    //    yeterli, hedeflenen ölçekte değil: 1 milyon araçla her ~2.200
    //    denemede bir isabet demek. Ayrıca iki biçimin bir arada olması
    //    normalleştirmede tuzak üretiyordu (eski PIN'ler base36 olduğu için
    //    gerçekten L içerebiliyor, Crockford katlaması onları bozar).
    //
    // Beklenen biçim: `CV-XXXXX-XXXXX`, Crockford Base32 (I, L, O, U YOK).
    const GECERLI = /^CV-[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$/;

    const sb = await supabaseIstemcisi();
    const { data, error } = await sb.from('vehicles').select('plate_number, pin_code');
    expect(error).toBeFalsy();
    expect(data?.length, 'hiç araç okunamadı — test kör kalır').toBeGreaterThan(0);

    const zayif = (data || [])
      .filter((v) => !GECERLI.test(v.pin_code || ''))
      .map((v) => `${v.plate_number}=${v.pin_code}`);

    expect(zayif, `zayıf biçimli PIN var: ${zayif.join(', ')}`).toEqual([]);
  });
});

test.describe('Güvenlik · arayüz RLS’ten sonra çalışmaya devam ediyor', () => {
  // Bu grup, güvenliğin ARAYÜZÜ BOZMADIĞINI ispatlıyor. Politikaları
  // sıkılaştırmanın en gerçek riski bu: karne boşalır ve kullanıcı
  // "verilerim kayboldu" der.

  test('ziyaretçi karne sayfasında bakım kayıtlarını görebiliyor', async ({ page }) => {
    // Oturum AÇMADAN. Ziyaretçi yolunun ta kendisi.
    const pin = await ornekPin();
    await page.goto(`/karne/${pin}`);
    await page.waitForLoadState('networkidle');

    // "okunamadı" hata durumu görünmemeli.
    await expect(page.locator('text=Bakım sicili şu an okunamadı')).toHaveCount(0);

    // Sayfa açıldı ve PIN'i gösteriyor.
    await expect(page.locator(`text=${pin}`).first()).toBeVisible();
  });

  test('araç sahibi fatura görselini imzalı bağlantıyla açabiliyor', async ({ page }) => {
    // Bu, imzalı bağlantı akışının uçtan uca tek testi. Politikalar doğru
    // olsa bile istemci yolu yanlışsa kullanıcı faturasını göremez —
    // "güvenli ama kullanılamaz" da bir arıza.
    await girisYap(page);
    const pin = await ornekPin();
    await page.goto(`/details/${pin}`);
    await page.waitForLoadState('networkidle');

    // Bakım kayıtları bölümündeki ilk kaydı aç. Akordeon kapalıysa fatura
    // bileşeni hiç render edilmiyor (imzalama isteği de atılmıyor).
    const faturaBaslik = page.locator('text=Servis Faturası / Evrak').first();
    if ((await faturaBaslik.count()) === 0) {
      await page.locator('text=İşlem Detayı & Usta Notu').first().click().catch(() => {});
      await page.waitForTimeout(500);
    }

    await expect(faturaBaslik).toBeVisible({ timeout: 15_000 });

    // "Belge kayıtlı, şu an açılamıyor" görünüyorsa imzalama başarısız.
    await expect(page.locator('text=Belge kayıtlı, şu an açılamıyor')).toHaveCount(0);

    // Küçük resim gerçekten yüklendi mi? `naturalWidth` 0 ise kırık görsel.
    const kucukResim = page
      .locator('button:has-text("Fatura / Evrak Görselini Büyüt") img')
      .first();
    await expect(kucukResim).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(() => kucukResim.evaluate((el) => el.naturalWidth), { timeout: 15_000 })
      .toBeGreaterThan(0);
  });

  test('ziyaretçi araç detayında bakım geçmişini görüyor, PLAKAYI görmüyor', async ({ page }) => {
    const pin = await ornekPin();
    await page.goto(`/details/${pin}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Bakım sicili şu an okunamadı')).toHaveCount(0);

    // Plaka ziyaretçide görünmemeli. Bu kontrol `textContent` ile yapılıyor:
    // `innerText` CSS text-transform uyguluyor ve karşılaştırmayı bozuyor.
    const govde = await page.locator('body').textContent();
    // İki biçim birden: arayüz plakayı boşluklu basıyor.
    for (const bicim of plakaBicimleri(ORNEK_PLAKA)) {
      expect(govde, `plaka ziyaretçi arayüzünde "${bicim}" biçiminde görünüyor`).not.toContain(bicim);
    }
  });
});

test.describe('Sicil puani kanita bagli', () => {
  // KUSURUN İLK HÂLİ:
  //   · sihirbaz her yeni araca SABİT 92 yazıyordu (`formData.otocv_score`
  //     hiçbir yerde set edilmiyordu, hep varsayılana düşüyordu)
  //   · bakım kaydı eklenince +5, tavan 98 — puan yalnızca YUKARI gidiyordu
  //   · puanı düşüren hiçbir şey yoktu: hasarlı, muayenesi dolmuş, kilometresi
  //     tutarsız bir araç kayıt ekleyerek 98'e çıkıyordu
  //   · puan istemciden yazılıyordu; anon anahtarıyla 98 verilebiliyordu
  //
  // Artık `vehicles` üzerindeki tetikleyici puanı gerçek veriden hesaplıyor.

  test('puan kirilim toplamiyla birebir tutuyor', async () => {
    // Puan ile kırılım ayrı yerlerde saklanıyor. Biri güncellenip diğeri
    // atlanırsa alıcıya gösterilen sayı, altındaki açıklamayla çelişir —
    // güvenilirliği bitiren tam olarak bu.
    const sb = await supabaseIstemcisi();
    const { data, error } = await sb
      .from('vehicles')
      .select('plate_number, trust_score, trust_breakdown');

    expect(error).toBeFalsy();
    expect(data?.length, 'hiç araç okunamadı').toBeGreaterThan(0);

    for (const v of data) {
      expect(v.trust_breakdown, `${v.plate_number} kırılımı yok`).toBeTruthy();

      const kalemler = v.trust_breakdown.kirilim || [];
      const toplam = kalemler.reduce((t, k) => t + k.puan, 0);

      expect(toplam, `${v.plate_number}: kalem toplamı ${toplam}, puan ${v.trust_score}`)
        .toBe(v.trust_score);
      expect(v.trust_breakdown.puan).toBe(v.trust_score);

      // Hiçbir kalem tavanını geçmemeli.
      for (const k of kalemler) {
        expect(k.puan, `${v.plate_number} · ${k.ad}: ${k.puan} > tavan ${k.tavan}`)
          .toBeLessThanOrEqual(k.tavan);
        expect(k.puan).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('puan istemciden ZORLA yazilamiyor', async () => {
    const sb = await supabaseIstemcisi();
    const { data: once } = await sb
      .from('vehicles')
      .select('plate_number, trust_score')
      .limit(1)
      .single();

    // Sahip kendi aracına 100 yazmayı deniyor.
    await sb.from('vehicles').update({ trust_score: 100 }).eq('plate_number', once.plate_number);

    const { data: sonra } = await sb
      .from('vehicles')
      .select('trust_score')
      .eq('plate_number', once.plate_number)
      .single();

    expect(sonra.trust_score, 'istemci puani belirleyebiliyor').not.toBe(100);
    expect(sonra.trust_score, 'puan degismis olmamali').toBe(once.trust_score);
  });

  test('kilometre kalemi, karnedeki hesapla ayni sonucu veriyor', async () => {
    // DRIFT KORUMASI. Kilometre tutarlılığı İKİ yerde hesaplanıyor:
    // SQL'de (puan için) ve JS'de (karne belgesindeki metin için). İkisi
    // aynı kuralı uygulamak zorunda; biri değişip diğeri kalırsa belge ile
    // puan birbirini yalanlar.
    //
    // Bu test SQL'in verdiği sonucu, JS'in aynı veriden vardığı sonuçla
    // karşılaştırıyor.
    const sb = await supabaseIstemcisi();
    const { data: araclar } = await sb
      .from('vehicles')
      .select('plate_number, trust_breakdown');

    for (const v of araclar || []) {
      const kalem = (v.trust_breakdown?.kirilim || []).find((k) => k.ad === 'Kilometre tutarliligi');
      expect(kalem, `${v.plate_number} kilometre kalemi yok`).toBeTruthy();

      const { data: kayitlar } = await sb
        .from('maintenance_records')
        .select('service_date, km_at_service')
        .eq('vehicle_plate', v.plate_number);

      // JS tarafındaki kuralın aynısı: tarihe göre sırala, geriye gidiş ara.
      const kullanilabilir = (kayitlar || [])
        .filter((k) => k.service_date && k.km_at_service !== null)
        .sort((a, b) => new Date(a.service_date) - new Date(b.service_date));

      let geriAdim = 0;
      for (let i = 1; i < kullanilabilir.length; i++) {
        if (kullanilabilir[i].km_at_service < kullanilabilir[i - 1].km_at_service) geriAdim++;
      }

      const jsBeklenen = kullanilabilir.length < 2 ? 0 : geriAdim === 0 ? 20 : 0;

      expect(kalem.puan, `${v.plate_number}: SQL ${kalem.puan} puan verdi, JS kuralı ${jsBeklenen} bekliyordu`)
        .toBe(jsBeklenen);
    }
  });

  test('veri yokken yuksek puan verilmiyor', async () => {
    // ESKİ KUSURUN TAM KARŞILIĞI: hiçbir bilgi taşımayan araç 92 alıyordu.
    // Veri yokluğunu yüksek puanla ödüllendirmek, en yanlış beyan türü.
    const sb = await supabaseIstemcisi();
    const { data: araclar } = await sb.from('vehicles').select('plate_number, trust_score');

    for (const v of araclar || []) {
      const { count } = await sb
        .from('maintenance_records')
        .select('id', { count: 'exact', head: true })
        .eq('vehicle_plate', v.plate_number);

      if ((count ?? 0) === 0) {
        // Bakım kaydı olmayan araç, belgelenme kaleminden (45) puan alamaz.
        // Kalan tavan 55; 55'in üstü imkânsız olmalı.
        expect(v.trust_score, `${v.plate_number} hiç kaydı yok ama ${v.trust_score} puan almış`)
          .toBeLessThanOrEqual(55);
      }
    }
  });
});

test.describe('Hiz siniri normal kullanimi bozmuyor', () => {
  // Hız sınırının GERÇEKTEN devreye girdiği test ayrı dosyada
  // (06-hiz-siniri.spec.js) ve varsayılan koşumda çalışmıyor: sınırı aşmak,
  // koşan makinenin IP'sini 10 dakika engelliyor.
  //
  // Buradaki testler tersini kontrol ediyor ve asıl risk bu: sınır, mesru
  // kullanıcıyı engelliyor mu? Bir hız sınırının en olası arızası saldırganı
  // durdurmaması değil, kullanıcıyı durdurmasıdır.

  test('gecerli PIN sorgusu sinira takilmiyor', async () => {
    const anon = anonIstemcisi();
    const pin = await ornekPin();

    // Bir kullanıcının makul davranışı: aynı karneyi birkaç kez açmak.
    for (let i = 0; i < 5; i++) {
      const { data, error } = await anon.rpc('sicil_getir', { p_pin: pin });
      expect(error).toBeFalsy();
      expect(data?.hata, `${i + 1}. sorguda mesru kullanici engellendi`).toBeUndefined();
      expect(data?.arac, `${i + 1}. sorguda arac donmedi`).toBeTruthy();
    }
  });

  test('sinir log tablosu istemciye KAPALI', async () => {
    // Tablo IP adresi ve hangi PIN'in sorgulandığını tutuyor: ikisi de
    // kişisel veri. Okunabilir olsaydı, kimin hangi aracı sorguladığı
    // dışarıdan görülebilirdi — sınırın kendisi bir sızıntıya dönüşürdü.
    const anon = anonIstemcisi();
    const { data, error } = await anon.from('sicil_sorgu_log').select('*');
    expect(error || (data && data.length === 0)).toBeTruthy();
    expect(data?.length ?? 0, 'sorgu kaydi tablosu okunabiliyor').toBe(0);

    const sb = await supabaseIstemcisi();
    const { data: d2, error: e2 } = await sb.from('sicil_sorgu_log').select('*');
    expect(e2 || (d2 && d2.length === 0)).toBeTruthy();
    expect(d2?.length ?? 0, 'oturumlu kullanici sorgu kaydini okuyabiliyor').toBe(0);
  });

  test('plaka_kayitli_mi anon icin KAPALI, oturumluya acik', async () => {
    // Bu fonksiyon bir keşif kapısı: plaka uzayı PIN uzayından çok küçük,
    // 34ABC001, 34ABC002... denenerek hangi araçların kayıtlı olduğu
    // öğrenilebilirdi. İlan sihirbazı zaten oturum gerektiriyor.
    const anon = anonIstemcisi();
    const { error: anonHata } = await anon.rpc('plaka_kayitli_mi', { p_plaka: ORNEK_PLAKA });
    expect(anonHata, 'plaka_kayitli_mi anon icin hala acik').toBeTruthy();

    const sb = await supabaseIstemcisi();
    const { data, error } = await sb.rpc('plaka_kayitli_mi', { p_plaka: ORNEK_PLAKA });
    expect(error, 'oturumlu kullanici plaka kontrolu yapamiyor — sihirbaz kirilir').toBeFalsy();
    expect(data).toBe(true);
  });
});


// =========================================================================
// ARAÇ GÖRSELLERİ — KİMSE KİMSENİNKİNE DOKUNAMIYOR
//
// -------------------------------------------------------------------------
// NİYE BU BLOK VAR
// -------------------------------------------------------------------------
// `vehicle-images` kovasında iki politika PUBLIC'e açıktı:
//
//     "Allow Delete Images"              DELETE  rol PUBLIC
//     "Herkes araç resmi yükleyebilsin"  INSERT  rol PUBLIC
//
// Yani anon anahtarını (istemci paketinin içinde) eline geçiren herkes
// üründeki TÜM araç görsellerini silebiliyordu. Canlı veritabanının yedeği
// yok — geri alınamaz bir kayıptı.
//
// Sahiplik `vehicles` üzerinden denetlenemedi, çünkü fotoğraflar araç kaydı
// OLUŞMADAN yükleniyor ve silme taslak iptalinde çağrılıyor. Çözüm yol
// düzenini <user_id>/<plaka>/ yapmak oldu.
//
// -------------------------------------------------------------------------
// ⚠ `remove()` HATA DÖNDÜRMÜYOR
// -------------------------------------------------------------------------
// Supabase depolama silmesi RLS engellediğinde HATA VERMİYOR, sessizce
// hiçbir şey silmiyor. Bu yüzden testler hata mesajına DEĞİL, dosyanın
// hâlâ durup durmadığına bakıyor. Hata mesajına bakan bir test burada
// yanlış sebeple geçerdi.
//
// ⚠ Bu blok kovaya YAZIYOR — kendi çöpünü `afterAll`da siliyor.
// =========================================================================

test.describe('Araç görselleri · sahiplik', () => {
  const KOVA = 'vehicle-images';
  let sahipId = null;
  let denemeYolu = null;

  test.afterAll(async () => {
    if (!denemeYolu) return;
    const sb = await supabaseIstemcisi();
    await sb.storage.from(KOVA).remove([denemeYolu]);
  });

  test('sahip kendi klasörüne yükleyebiliyor', async () => {
    const sb = await supabaseIstemcisi();
    const { data: { user } } = await sb.auth.getUser();
    sahipId = user.id;
    denemeYolu = `${sahipId}/taslak/otocv-test-${Date.now()}.txt`;

    const { error } = await sb.storage
      .from(KOVA).upload(denemeYolu, new Blob(['test']), { contentType: 'text/plain' });
    expect(error, 'araç sahibi kendi klasörüne yükleyemiyor — kayıt akışı kırık').toBeFalsy();
  });

  test('BAŞKASI o klasöre yükleyemiyor', async () => {
    test.skip(!sahipId, 'kurulum yapılamadı');
    const alici = await aliciIstemcisi();
    const { error } = await alici.storage
      .from(KOVA).upload(`${sahipId}/taslak/izinsiz-${Date.now()}.txt`,
        new Blob(['x']), { contentType: 'text/plain' });
    expect(error, 'başka kullanıcı, sahibin klasörüne dosya yükleyebiliyor').toBeTruthy();
  });

  test('BAŞKASI ve ANON silemiyor — dosya yerinde kalıyor', async () => {
    test.skip(!denemeYolu, 'kurulum yapılamadı');
    const sb = await supabaseIstemcisi();
    const alici = await aliciIstemcisi();
    const anon = anonIstemcisi();

    const duruyorMu = async () => {
      const { data } = await sb.storage.from(KOVA).list(`${sahipId}/taslak`);
      return (data || []).some((f) => denemeYolu.endsWith(f.name));
    };

    expect(await duruyorMu(), 'deneme dosyası kurulamadı').toBe(true);

    // ⚠ Hata mesajına BAKILMIYOR: remove() engellendiğinde hata vermiyor.
    await alici.storage.from(KOVA).remove([denemeYolu]);
    expect(await duruyorMu(), 'BAŞKA KULLANICI sahibin görselini sildi').toBe(true);

    await anon.storage.from(KOVA).remove([denemeYolu]);
    expect(await duruyorMu(), 'ANON sahibin görselini sildi').toBe(true);
  });

  test('sahip kendi dosyasını silebiliyor', async () => {
    test.skip(!denemeYolu, 'kurulum yapılamadı');
    const sb = await supabaseIstemcisi();
    await sb.storage.from(KOVA).remove([denemeYolu]);

    const { data } = await sb.storage.from(KOVA).list(`${sahipId}/taslak`);
    const duruyor = (data || []).some((f) => denemeYolu.endsWith(f.name));
    expect(duruyor, 'sahip kendi görselini silemiyor — taslak temizliği kırık').toBe(false);
    denemeYolu = null;
  });

  test('ANON okuma AÇIK kalmalı — vitrin buna bağlı', async () => {
    const anon = anonIstemcisi();
    const { error } = await anon.storage.from(KOVA).list('', { limit: 1 });
    expect(error, 'araç görselleri okunamıyor — vitrin görselsiz kalır').toBeFalsy();
  });
});
