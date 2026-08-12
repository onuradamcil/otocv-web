// =========================================================================
// OTO-CV TEST YAPILANDIRMASI (playwright.config.js)
//
// KULLANIM — tek komut yeter:
//   npm test              tüm testleri çalıştırır
//   npm run test:rapor    son koşumun görsel raporunu açar
//   npm run test:izle     tarayıcı açık, adım adım izleyerek çalıştırır
//
// Hata olduğunda ne göreceksiniz: Playwright başarısız her adım için ekran
// görüntüsü, video ve "iz" (trace) kaydeder. `npm run test:rapor` komutu
// tarayıcıda bir rapor açar; oradan testin tıkladığı her yeri, o anki DOM'u
// ve ağ isteklerini adım adım gezebilirsiniz. Yani hatayı okumak zorunda
// kalmıyorsunuz, izliyorsunuz.
//
// SUNUCUYU KENDİ BAŞLATIR: webServer bölümü sayesinde `npm test` demek
// yeterli — dev sunucusu zaten açıksa ona bağlanır, kapalıysa kendi açar.
// Elle `npm run dev` çalıştırmanız gerekmez.
// =========================================================================

const { defineConfig, devices } = require('@playwright/test');

// Kimlik bilgileri .env.test dosyasından okunur. O dosya git'e GİRMEZ.
// Örneği .env.test.example olarak depoda duruyor.
require('dotenv').config({ path: '.env.test', quiet: true });

const ADRES = process.env.OTOCV_TEST_URL || 'http://localhost:3000';

module.exports = defineConfig({
  testDir: './tests',

  // Aynı anda kaç test dosyası koşsun. Testler aynı veritabanını
  // paylaştığı için 1: paralel koşumda iki test aynı aracın
  // trust_score'unu değiştirip birbirini bozabilir.
  workers: 1,
  fullyParallel: false,

  // CI'da bir kez tekrar dene: ağ kaynaklı tek seferlik takılmalar
  // gerçek hata sanılmasın. Yerelde tekrar YOK — hatayı görmek istersiniz.
  retries: process.env.CI ? 1 : 0,

  // CI'da test.only bırakılmışsa koşum başarısız olsun; yoksa yanlışlıkla
  // tek test koşup "hepsi geçti" sanılır.
  forbidOnly: !!process.env.CI,

  timeout: 90_000,
  expect: { timeout: 15_000 },

  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }], ['list']]
    : [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: ADRES,
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',

    // Hata anında kanıt: ekran görüntüsü, video ve iz kaydı.
    // 'on-first-retry' değil 'retain-on-failure': yerelde tekrar yok,
    // o yüzden ilk hatada iz tutulmalı.
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'masaustu',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
      // Mobil paketi burada KOŞMAZ. İlk yazımda bu dışlama yoktu; mobil
      // testler masaüstünde de koştu ve haklı olarak başarısız oldu —
      // hamburger butonu md:hidden olduğu için masaüstünde görünmüyor.
      // Projeye testMatch vermek yetmiyor, diğer projeye de testIgnore
      // gerekiyor; aksi halde dosya iki kez çalışır.
      //
      // 06-hiz-siniri de dışlanıyor ve bu KRİTİK: o paket hız sınırını
      // gerçekten aşıyor, yani koşumu yapan makinenin IP'sini 10 DAKİKA
      // engelliyor. Varsayılan takıma girseydi, ondan sonra koşan her karne
      // testi kırılırdı ve takım 10 dakika yeniden koşulamazdı.
      // Elle koşmak için: --project=hizsiniri
      testIgnore: [/.*mobil\.spec\.js/, /.*hiz-siniri\.spec\.js/],
    },
    {
      name: 'mobil',
      use: { ...devices['Pixel 7'] },
      // Mobilde yalnızca duyarlılık ve erişilebilirlik testleri koşar;
      // form doldurma testlerini iki kez çalıştırmak veritabanına iki kez
      // yazmak olurdu.
      testMatch: /.*mobil\.spec\.js/,
    },
    // İSTEĞE BAĞLI PAKET — ortam değişkeni olmadan HİÇ TANIMLANMIYOR.
    //
    // İlk denemede projeyi normal şekilde eklemiştim ve varsayılan koşumda
    // ÇALIŞTI: `testIgnore` yalnızca masaustu projesinden dışlıyor, yeni
    // proje kendi başına koşuyor. Playwright'ta "bu projeyi elle çağırmadıkça
    // koşma" diye bir bayrak yok; tek güvenilir yol projeyi hiç tanımlamamak.
    //
    // Neden bu kadar önemli: paket hız sınırını gerçekten aşıyor, yani koşan
    // makinenin IP'sini 10 DAKİKA engelliyor. Varsayılan takıma girdiğinde
    // ondan sonraki her karne testi kırılır.
    //
    // Koşmak için:
    //   HIZ_SINIRI=1 npx playwright test --project=hizsiniri
    // Sonrasında 10 dakika beklenir ya da sicil_sorgu_log temizlenir.
    ...(process.env.HIZ_SINIRI
      ? [{
          name: 'hizsiniri',
          use: { ...devices['Desktop Chrome'] },
          testMatch: /.*hiz-siniri\.spec\.js/,
        }]
      : []),
  ],

  // Sunucu zaten açıksa yeniden başlatmaz (reuseExistingServer).
  // CI'da her zaman kendi başlatır.
  webServer: {
    command: 'npm run dev',
    url: ADRES,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
