// =========================================================================
// PAROLA GÜVENLİĞİ (34)
//
// -------------------------------------------------------------------------
// NİYE VAR — ÜRÜNÜN EN KRİTİK YOLU BEKÇİSİZDİ
// -------------------------------------------------------------------------
// 397 testin hiçbiri parola değiştirmeye dokunmuyordu. Oysa bu, bir hesabın
// ele geçirilmesinin tek adımlık yolu: parolayı değiştirebilen, hesabın
// sahibi olur. Ürün sahibi bunu sordu ("başkası hesabıma girse değiştirebilir
// mi?") ve cevabı ancak KODA BAKARAK verebildim — çalışan bir kanıt yoktu.
//
// -------------------------------------------------------------------------
// ⚠ HİÇBİR TEST PAROLAYI DEĞİŞTİRMİYOR — BU BİLİNÇLİ
// -------------------------------------------------------------------------
// Mutlu yolu denemek, parolayı yeni bir değere çevirip geri almak demekti.
// Test ortada düşerse hesabın parolası değişmiş, `.env.test` eskimiş olur ve
// TÜM oturumlu testler çöker. Bu tam olarak bugün bir kez yaşandı: ürün
// sahibi kendi parolasını değiştirdi, `.env.test` eskidi, 50'den fazla test
// zaman aşımına uğradı.
//
// Onun yerine yalnızca REDDETME yolları sınanıyor. Zaten güvenliği taşıyan
// taraf orası: parolanın değişebiliyor olması değil, YETKİSİZ birinin
// değiştirememesi.
//
// -------------------------------------------------------------------------
// KAPSAM — VE NEYİN BURAYA ALINMADIĞI
// -------------------------------------------------------------------------
// · Yanlış mevcut parola reddediliyor
// · Yeni parolalar uyuşmuyorsa reddediliyor
// · Yeni parola mevcutla AYNIYSA reddediliyor
// · Arayüzün asgari uzunluğu ile mesajı tutarlı
//
// ⚠ "MEVCUT ŞİFRE ALANI ZORUNLU" TESTİ BURAYA YAZILMADI, ÇÜNKÜ ZATEN VAR:
// `12-hesabim.spec.js:76` — "şifre bölümü mevcut şifre istemeden
// değiştirmiyor". Aynı iddiayı ikinci kez yazmak, ikisi ayrı ayrı
// eskidiğinde hangisinin doğru olduğunu belirsizleştirir.
// =========================================================================

const { test, expect, girisYap } = require('./yardimcilar');

/** Ekranda parola bölümünün alanları — erişilebilir adlarıyla. */
const MEVCUT = /^Mevcut şifre$/;
const YENI = /^Yeni şifre$/;
const YENI_TEKRAR = /^Yeni şifre tekrar$/;

/** Uygulamanın dayattığı asgari uzunluk. Mesajla birlikte değişmeli. */
const EN_AZ_UZUNLUK = 10;

/**
 * Gerçek parolayı `.env.test`ten okur.
 *
 * ⚠ Testin İÇİNDE `ortam()` çağrılmıyor: yardımcı, değişken yoksa fırlatıyor
 * ve bu, dosya yüklenirken tüm paketi düşürür. Burada okumak, hatayı yalnızca
 * ilgili teste hapsediyor.
 */
function gercekParola() {
  return process.env.OTOCV_TEST_PASSWORD ?? '';
}

async function parolaBolumu(page) {
  await page.goto('/account');
  await page.waitForLoadState('networkidle');
  const mevcut = page.getByLabel(MEVCUT);
  await expect(mevcut, 'Hesabım ekranında "Mevcut şifre" alanı yok').toBeVisible({ timeout: 20_000 });
  return {
    mevcut,
    yeni: page.getByLabel(YENI),
    tekrar: page.getByLabel(YENI_TEKRAR),
  };
}

test.describe('Parola güvenliği · Hesabım ekranı', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await girisYap(page);
  });

  test('⚠ YANLIŞ mevcut şifre reddediliyor', async ({ page }) => {
    test.setTimeout(90_000);
    const { mevcut, yeni, tekrar } = await parolaBolumu(page);

    await mevcut.fill('kesinlikle-yanlis-bir-parola-9x7q');
    await yeni.fill('BaskaParola123!');
    await tekrar.fill('BaskaParola123!');
    await page.getByRole('button', { name: 'Şifreyi değiştir' }).click();

    await expect(
      page.getByText(/mevcut şifreniz doğru değil/i),
      'yanlış mevcut şifre kabul edildi — doğrulama çalışmıyor'
    ).toBeVisible({ timeout: 20_000 });

    // ⚠ ASIL KANIT: parola gerçekten DEĞİŞMEDİ. Ekranda hata görünse bile
    // arka planda değişmiş olsaydı, bu test onu kaçırırdı.
    await page.goto('/account');
    await page.waitForLoadState('networkidle');
    await expect(page.getByLabel(MEVCUT)).toBeVisible({ timeout: 20_000 });
  });

  test('yeni şifreler UYUŞMUYORSA reddediliyor', async ({ page }) => {
    test.setTimeout(90_000);
    const { mevcut, yeni, tekrar } = await parolaBolumu(page);

    await mevcut.fill(gercekParola());
    await yeni.fill('BirinciParola123!');
    await tekrar.fill('IkinciParola456!');
    await page.getByRole('button', { name: 'Şifreyi değiştir' }).click();

    await expect(
      page.getByText(/uyuşmuyor/i),
      'birbirini tutmayan iki parola kabul edildi'
    ).toBeVisible({ timeout: 20_000 });
  });

  test('⚠ YENİ ŞİFRE MEVCUTLA AYNIYSA reddediliyor', async ({ page }) => {
    test.setTimeout(90_000);
    const parola = gercekParola();
    test.skip(!parola, 'OTOCV_TEST_PASSWORD tanımlı değil');

    const { mevcut, yeni, tekrar } = await parolaBolumu(page);

    // NİYE ÖNEMLİ: ürün sahibi parolasını değiştirdi ve aynısını mı yazdığını
    // bilemedi — hiçbir yerde uyarı çıkmamıştı. Sızmış bir parolayı
    // "değiştirdim" sanıp aynısını koymak, güvenlik açısından hiç
    // değiştirmemekle aynı şey; üstelik kullanıcı korunduğunu sanıyor.
    await mevcut.fill(parola);
    await yeni.fill(parola);
    await tekrar.fill(parola);
    await page.getByRole('button', { name: 'Şifreyi değiştir' }).click();

    await expect(
      page.getByText(/aynı olamaz|farklı olmalı|mevcut şifrenizle aynı/i),
      'yeni şifre mevcutla aynı olduğu hâlde kabul edildi — kullanıcı korunduğunu sanır'
    ).toBeVisible({ timeout: 20_000 });
  });

  test('asgari uzunluk kuralı ile mesajı TUTARLI', async ({ page }) => {
    test.setTimeout(90_000);
    const { mevcut, yeni, tekrar } = await parolaBolumu(page);

    // ⚠ ARAYÜZ İLE SUNUCU AYRI DÜŞERSE KULLANICI ANLAMSIZ HATA ALIR.
    // Arayüz 6 karakteri geçirip Supabase reddettiğinde ekranda "Password
    // should be at least 10 characters" gibi İngilizce ve bağlamsız bir
    // mesaj çıkıyordu.
    const kisa = 'a1!'.padEnd(EN_AZ_UZUNLUK - 1, 'x');
    await mevcut.fill(gercekParola());
    await yeni.fill(kisa);
    await tekrar.fill(kisa);
    await page.getByRole('button', { name: 'Şifreyi değiştir' }).click();

    const uyari = page.getByText(new RegExp(`en az ${EN_AZ_UZUNLUK} karakter`, 'i'));
    await expect(
      uyari,
      `${EN_AZ_UZUNLUK - 1} karakterlik şifre reddedilmedi ya da mesaj ${EN_AZ_UZUNLUK} demiyor`
    ).toBeVisible({ timeout: 20_000 });
  });
});
