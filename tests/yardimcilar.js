// =========================================================================
// OTO-CV TEST YARDIMCILARI (tests/yardimcilar.js)
//
// -------------------------------------------------------------------------
// EN ÖNEMLİ KISIM: TESTLER KENDİ ÇÖPÜNÜ TEMİZLER
// -------------------------------------------------------------------------
// Form testi veritabanına gerçek bir bakım kaydı yazıyor ve aracın
// trust_score'unu +5 yapıyor. Önceden bu temizliği elle yapıyordum — bir
// oturumda beş kez. Bu kırılgan bir düzendi: bir kez atlanınca veritabanında
// kalıcı çöp birikir, trust_score şişer ve karne yanlış puan gösterir.
//
// Artık `test.use({ temizlik: true })` diyen her dosya, koşum bitince
// otomatik temizlenir — test BAŞARISIZ olsa, hata atsa, yarıda kesilse bile.
// Playwright'ın fixture teardown mekanizması bunu garanti eder.
//
// Yazılan her kayıt BENZERSİZ bir işaret taşır (TEST_ISARETI). Böylece
// temizlik yalnızca o koşumun ürettiğini siler; gerçek kullanıcı verisine
// hiçbir koşulda dokunmaz. Bu, "sil" komutunun yanlış satırı bulma riskini
// tamamen ortadan kaldırır.
// =========================================================================

const base = require('@playwright/test');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: '.env.test', quiet: true });

// Bu koşuma özgü işaret. Zaman damgası + rastgele son ek: aynı anda iki
// koşum olsa bile birbirinin verisini silmez.
const TEST_ISARETI = `OTOCV-TEST-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// Testlerin okuduğu sabit araç. Karne ve tramer testleri bu araca bakıyor.
//
// YALNIZCA PLAKA SABİT — PIN DEĞİL.
//
// Eskiden burada `ORNEK_PIN` de vardı ve `.env.test`'ten okunuyordu. PIN
// güvenlik gerekçesiyle yenilendiğinde o değer sessizce eskidi: 12 test
// artık var olmayan bir PIN'e gidiyordu. Plaka ise birincil anahtar; hiç
// değişmiyor. PIN'e ihtiyaç duyan test onu `pinBul(ORNEK_PLAKA)` ile
// çalışma anında çözüyor.
//
// Bu, PIN döndürme (rotation) işleminin hiçbir test dosyasını
// etkilemeyeceği anlamına geliyor — güvenlik işini ucuzlatan tam da bu.
const ORNEK_PLAKA = process.env.OTOCV_TEST_PLAKA || '41IHH434';

/** ORNEK_PLAKA'nın güncel PIN'i. */
async function ornekPin() {
  return pinBul(ORNEK_PLAKA);
}

// =========================================================================
// PLAKA SIZINTI DENETİMİ İKİ BİÇİMİ BİRDEN ARAMALI
//
// Plaka veritabanında BOŞLUKSUZ duruyor ('41IHH434') ama arayüz onu
// `plakaBicimle` ile boşluklu basıyor ('41 IHH 434'). Sızıntı denetimleri
// yalnızca veritabanı biçimini arasaydı, ekrana basılmış bir plakayı
// GÖREMEZDİ ve test sessizce geçerdi — yani koruma değil, koruma görüntüsü
// olurdu.
//
// Bu yüzden denetimler her iki biçimi de arıyor.
// =========================================================================

/**
 * Bir plakanın arayüzde görünebileceği tüm biçimleri döndürür.
 *
 * ⚠ BOŞ PLAKADA HATA FIRLATIYOR, BOŞ DİZİ DÖNMÜYOR. Boş dizi dönseydi
 * çağıran taraftaki `for (const bicim of ...)` döngüsü sıfır kez koşar ve
 * sızıntı denetimi HİÇ ÇALIŞMADAN geçerdi. Atlanan test, koşmayan testtir;
 * üstelik burada atlanan şey bir güvenlik denetimi.
 *
 * @param {string} plaka
 * @returns {string[]}
 */
function plakaBicimleri(plaka) {
  const ham = String(plaka || '').replace(/\s+/g, '').toUpperCase();
  if (!ham) {
    throw new Error(
      'plakaBicimleri boş plaka aldı — sızıntı denetimi sessizce atlanacaktı. ' +
      'Çağıran taraf plakayı gerçekten okuyabiliyor mu, ona bakın.'
    );
  }
  const bosluklu = ham.replace(/^(\d{2})([A-Z]{1,3})(\d{2,4})$/, '$1 $2 $3');
  return bosluklu === ham ? [ham] : [ham, bosluklu];
}

function ortam(ad) {
  const d = process.env[ad];
  if (!d) {
    throw new Error(
      `${ad} tanımlı değil. .env.test dosyasını oluşturun ` +
      `(.env.test.example dosyasını kopyalayıp doldurun).`
    );
  }
  return d;
}

// -------------------------------------------------------------------------
// OTURUM AÇMIŞ İSTEMCİ — İŞÇİ BAŞINA BİR KEZ
//
// Eskiden her çağrıda yeni istemci kurup YENİDEN GİRİŞ yapıyordu. Paket
// büyüdükçe bu, tek koşumda onlarca `signInWithPassword` demek oldu ve
// Supabase'in kimlik doğrulama hız sınırına takıldı:
//
//   Error: Test hesabıyla oturum açılamadı: Request rate limit reached
//
// Belirtisi sinsiydi: testler tek tek koşarken geçiyor, tam koşumun SONUNDA
// rastgele biri kırılıyordu — yani kırılan testin kendisiyle ilgisi yoktu.
//
// Artık giriş işçi başına bir kez yapılıyor. Testlerin hepsi zaten "oturum
// açmış sahip" istemcisi istiyor; ayrı oturumlara ihtiyaç duyan yok.
// -------------------------------------------------------------------------
let _sahipIstemcisi = null;

async function supabaseIstemcisi() {
  if (_sahipIstemcisi) return _sahipIstemcisi;

  const sb = createClient(
    ortam('NEXT_PUBLIC_SUPABASE_URL'),
    ortam('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  );
  const { error } = await sb.auth.signInWithPassword({
    email: ortam('OTOCV_TEST_EMAIL'),
    password: ortam('OTOCV_TEST_PASSWORD'),
  });
  if (error) throw new Error(`Test hesabıyla oturum açılamadı: ${error.message}`);

  _sahipIstemcisi = sb;
  return sb;
}

/**
 * OTURUM AÇMAMIŞ Supabase istemcisi — saldırgan rolü.
 *
 * Anon anahtarı istemci paketinin içinde, yani pratikte herkese açık.
 * Güvenlik testlerinin çıkış noktası tam olarak bu: elinde yalnızca herkesin
 * görebildiği anahtar olan biri neye erişebiliyor?
 */
function anonIstemcisi() {
  return createClient(
    ortam('NEXT_PUBLIC_SUPABASE_URL'),
    ortam('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  );
}

// -------------------------------------------------------------------------
// PIN'İ PLAKADAN ÇÖZ
//
// Testler eskiden PIN'leri sabit yazıyordu ('CV-000002' gibi). PIN değişken
// bir değer: sıralı üç PIN güvenlik gerekçesiyle yenilendiğinde altı test
// birden kırıldı. Oysa testlerin umursadığı şey ARACIN VERİ ÖZELLİĞİ
// (hasarlı, kilometresi geriye giden, tek kayıtlı...) ve o aracı tanımlayan
// kalıcı değer PLAKA — birincil anahtar.
//
// Artık testler plaka veriyor, PIN çalışma anında çözülüyor. PIN yeniden
// üretildiğinde hiçbir test dosyasına dokunmak gerekmiyor.
// -------------------------------------------------------------------------
const _pinOnbellek = new Map();

// Ayrı bir istemci önbelleği vardı; `supabaseIstemcisi` artık kendisi
// önbellekli olduğu için gereksiz kaldı. İki önbellek tutmak, birinin
// diğerinden habersiz eskimesi demektir.
const _istemci = supabaseIstemcisi;

/**
 * Plakaya karşılık gelen PIN'i döndürür.
 * @param {string} plaka
 * @returns {Promise<string>}
 */
async function pinBul(plaka) {
  if (_pinOnbellek.has(plaka)) return _pinOnbellek.get(plaka);

  const sb = await _istemci();
  const { data, error } = await sb
    .from('vehicles')
    .select('pin_code')
    .eq('plate_number', plaka)
    .single();

  if (error || !data?.pin_code) {
    throw new Error(
      `${plaka} plakalı aracın PIN'i bulunamadı${error ? `: ${error.message}` : ''}. ` +
      `Test bu araca dayanıyor; veritabanında var mı?`
    );
  }

  _pinOnbellek.set(plaka, data.pin_code);
  return data.pin_code;
}


/**
 * İKİNCİ TEST HESABI — devir testleri için.
 *
 * Devir iki kullanıcı arasında olduğu için ikinci bir hesap şart. Her koşumda
 * `signUp` ile yeni hesap açmak yerine SABİT bir hesap kullanılıyor: anon
 * anahtarla auth kullanıcısı SİLİNEMEZ, yani açılan her hesap kalıcı çöp
 * olurdu. Geliştirme sırasında beş tane birikti ve elle temizlemek gerekti.
 */
// Sahip istemcisiyle aynı gerekçe: 07-devir bunu her testte çağırıyordu ve
// her çağrı bir giriş demekti. İşçi başına bir kez.
let _aliciIstemcisi = null;

async function aliciIstemcisi() {
  if (_aliciIstemcisi) return _aliciIstemcisi;

  const sb = createClient(
    ortam('NEXT_PUBLIC_SUPABASE_URL'),
    ortam('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  );
  const { error } = await sb.auth.signInWithPassword({
    email: ortam('OTOCV_TEST_EMAIL2'),
    password: ortam('OTOCV_TEST_PASSWORD2'),
  });
  if (error) throw new Error(`İkinci test hesabıyla oturum açılamadı: ${error.message}`);

  _aliciIstemcisi = sb;
  return sb;
}

/** Arayüz üzerinden giriş yapar. Gerçek kullanıcı yolunu test eder. */
async function girisYap(page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill("input[type='email']", ortam('OTOCV_TEST_EMAIL'));
  await page.fill("input[type='password']", ortam('OTOCV_TEST_PASSWORD'));
  await page.click("button[type='submit']");
  // URL değişmesini bekle — networkidle yetmez, istemci tarafı yönlendirme
  // ondan sonra tamamlanıyor.
  await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 30_000 });
}

/**
 * İKİNCİ hesapla arayüzden giriş yapar.
 *
 * NİYE AYRI BİR YARDIMCI: araç detay ekranı `isPublicView` ile ikiye
 * ayrılıyor ve iki dal FARKLI şeyler basıyor. Sahip hesabıyla girip
 * ziyaretçi dalını denetlediğini sanmak, o dalda duran bir hatayı
 * görünmez kılıyor — uydurma telefon numarası tam olarak orada duruyordu.
 */
async function girisYapAlici(page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill("input[type='email']", ortam('OTOCV_TEST_EMAIL2'));
  await page.fill("input[type='password']", ortam('OTOCV_TEST_PASSWORD2'));
  await page.click("button[type='submit']");
  await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 30_000 });
}

/**
 * Karne belgesinin "Detaylı" sekmesini açar.
 * Belge varsayılan sekmede DEĞİL; ilk sekme ilan paylaşım kartı.
 * Bu ayrımı bilmeyen bir test, belge hiç açılmadığı hâlde "yasaklı ifade
 * bulunamadı" diye yanlış geçer.
 */
async function belgeSekmesiniAc(page) {
  await page.locator('text=Detaylı Resmi Sicil Belgesi').first().click();
  await page.waitForTimeout(1200);
  await base.expect(page.locator('text=OTO.CV SİCİL BULGULARI')).toBeVisible();
}

/**
 * CSS text-transform tuzağını atlatan metin okuyucu.
 *
 * inner_text() CSS'in `uppercase` dönüşümünü UYGULAR. Kaynak etiketleri
 * ("Araç sahibi beyanı") uppercase sınıfı taşıdığı için inner_text ile
 * arandığında bulunamıyor ve test yanlış başarısız oluyor. Bu tuzağa
 * geliştirme sırasında iki kez düşüldü; bu yüzden yardımcı olarak sabitlendi.
 */
async function hamMetin(page) {
  return page.locator('body').textContent();
}

// =========================================================================
// FIXTURE: temizlik
// Testin sonunda — geçse de geçmese de — bu koşumun yazdığı veriyi siler.
// =========================================================================
const test = base.test.extend({
  /** Oturum açmış Supabase istemcisi (test içinde doğrulama için). */
  sb: async ({}, use) => {
    const sb = await supabaseIstemcisi();
    await use(sb);
  },

  /**
   * Bu fixture'ı isteyen test, veritabanına yazabilir. Koşum bitince
   * yazdıkları TEST_ISARETI üzerinden silinir ve trust_score geri alınır.
   */
  temizlik: async ({ sb }, use) => {
    const oncekiPuan = await puanOku(sb, ORNEK_PLAKA);

    await use({ isaret: TEST_ISARETI, plaka: ORNEK_PLAKA });

    // ---- TEARDOWN: test başarısız olsa bile çalışır ----
    const { error: silHata } = await sb
      .from('maintenance_records')
      .delete()
      .like('shop_name', 'OTOCV-TEST-%');
    if (silHata) console.warn('Test kaydı silinemedi:', silHata.message);

    if (oncekiPuan !== null) {
      const { error: puanHata } = await sb
        .from('vehicles')
        .update({ trust_score: oncekiPuan })
        .eq('plate_number', ORNEK_PLAKA);
      if (puanHata) console.warn('trust_score geri alınamadı:', puanHata.message);
    }
  },
});

async function puanOku(sb, plaka) {
  const { data } = await sb
    .from('vehicles')
    .select('trust_score')
    .eq('plate_number', plaka)
    .single();
  return data?.trust_score ?? null;
}

module.exports = {
  test,
  expect: base.expect,
  girisYap,
  girisYapAlici,
  belgeSekmesiniAc,
  hamMetin,
  supabaseIstemcisi,
  anonIstemcisi,
  aliciIstemcisi,
  pinBul,
  TEST_ISARETI,
  ornekPin,
  ORNEK_PLAKA,
  plakaBicimleri,
};
