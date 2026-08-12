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
  ORNEK_PIN,
  ORNEK_PLAKA,
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

test.describe('Güvenlik · sicil_getir() genel okuma yolu', () => {
  test('ziyaretçi karneyi görür ama PLAKA ve FATURA YOLU gelmez', async () => {
    const anon = anonIstemcisi();
    const { data, error } = await anon.rpc('sicil_getir', { p_pin: ORNEK_PIN });

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
    const { data, error } = await sb.rpc('sicil_getir', { p_pin: ORNEK_PIN });

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
        expect(govde, `joker girdi "${girdi}" ${plate_number} plakasını sızdırdı`)
          .not.toContain(plate_number);
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

  test('sıralı PIN kalmadı', async () => {
    // CV-000001, CV-000002, CV-000003 sıralıydı; bir saldırgan sırayla
    // yazarak sicilleri gezebilirdi.
    const sb = await supabaseIstemcisi();
    const { data } = await sb.from('vehicles').select('pin_code');

    const sirali = (data || [])
      .map((v) => v.pin_code)
      .filter((p) => /^CV-\d+$/.test(p || ''));

    expect(sirali, `sıralı PIN geri gelmiş: ${sirali.join(', ')}`).toEqual([]);
  });
});

test.describe('Güvenlik · arayüz RLS’ten sonra çalışmaya devam ediyor', () => {
  // Bu grup, güvenliğin ARAYÜZÜ BOZMADIĞINI ispatlıyor. Politikaları
  // sıkılaştırmanın en gerçek riski bu: karne boşalır ve kullanıcı
  // "verilerim kayboldu" der.

  test('ziyaretçi karne sayfasında bakım kayıtlarını görebiliyor', async ({ page }) => {
    // Oturum AÇMADAN. Ziyaretçi yolunun ta kendisi.
    await page.goto(`/karne/${ORNEK_PIN}`);
    await page.waitForLoadState('networkidle');

    // "okunamadı" hata durumu görünmemeli.
    await expect(page.locator('text=Bakım sicili şu an okunamadı')).toHaveCount(0);

    // Sayfa açıldı ve PIN'i gösteriyor.
    await expect(page.locator(`text=${ORNEK_PIN}`).first()).toBeVisible();
  });

  test('araç sahibi fatura görselini imzalı bağlantıyla açabiliyor', async ({ page }) => {
    // Bu, imzalı bağlantı akışının uçtan uca tek testi. Politikalar doğru
    // olsa bile istemci yolu yanlışsa kullanıcı faturasını göremez —
    // "güvenli ama kullanılamaz" da bir arıza.
    await girisYap(page);
    await page.goto(`/details/${ORNEK_PIN}`);
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
    await page.goto(`/details/${ORNEK_PIN}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Bakım sicili şu an okunamadı')).toHaveCount(0);

    // Plaka ziyaretçide görünmemeli. Bu kontrol `textContent` ile yapılıyor:
    // `innerText` CSS text-transform uyguluyor ve karşılaştırmayı bozuyor.
    const govde = await page.locator('body').textContent();
    expect(govde, 'plaka ziyaretçi arayüzünde görünüyor').not.toContain(ORNEK_PLAKA);
  });
});
