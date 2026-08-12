// =========================================================================
// KARNE BÜTÜNLÜĞÜ — bu paketin varlık sebebi
//
// Karne, alıcının araca güvenmek için baktığı belge. Geliştirme sırasında
// orada şu kusurlar bulundu:
//
//   1. Hasarlı araç "Kayıt Bulunmamaktadır (Temiz)" diye beyan ediliyordu.
//      Sebep: durum dört farklı yazımla tutuluyordu, kod birini tanıyordu.
//      10 aracın 4'ü etkilenmişti — 65.756 TL hasarı olan araç dahil.
//   2. Sorgulanmadığı hâlde TÜVTÜRK, haciz/rehin ve UYAP sonucu basılıyordu.
//   3. Olmayan kolonlardan uydurma VIN ve motor numarası üretiliyordu.
//   4. Tarih yoksa "12/12/2029", renk yoksa "Metalik Siyah" yazılıyordu.
//   5. "Beyan yok" satırı YEŞİL ONAY TİKİYLE basılıyordu.
//
// Hepsi düzeltildi. Bu paket geri gelmelerini engelliyor. Buradaki bir
// testin başarısız olması, belgenin yanlış beyan verdiği anlamına gelir —
// yani en ciddi hata sınıfı.
// =========================================================================

const {
  test,
  expect,
  belgeSekmesiniAc,
  hamMetin,
  ornekPin,
  pinBul,
  supabaseIstemcisi,
} = require('./yardimcilar');

// Belgeye ASLA girmemesi gereken ifadeler. Her biri bir kusurun izi.
const YASAKLI_IFADELER = [
  // Sorgulanmayan kurum beyanları
  'Hak Mahrumiyeti',
  'UYAP',
  'Aranma İhbarı',
  'MERKEZİ VERİ TABANI',
  // Olmayan kolonlardan üretilen uydurma kimlik değerleri
  'WBA0M3T2MGM',
  'N20B20A',
  'AA012345',
  'M1 / D Segment',
  // Veri yokken uydurulan teknik özellikler
  'Benzin / Hibrit',
  'Otomatik vites',
  'Metalik Siyah',
  // Doğrulama iddiaları
  'AutoID Verified',
  'doğrulanmış dökümüdür',
  'e-devlet tescil',
];

test.describe('Belge, sorgulamadığı hiçbir şeyi beyan etmiyor', () => {
  test('yasaklı ifadelerin hiçbiri belgede yok', async ({ page }) => {
    const pin = await ornekPin();
    await page.goto(`/karne/${pin}`);
    await page.waitForLoadState('networkidle');
    await belgeSekmesiniAc(page);

    const metin = await hamMetin(page);
    const kalan = YASAKLI_IFADELER.filter((i) => metin.includes(i));
    expect(kalan, 'belgede kalan yasaklı ifadeler').toEqual([]);
  });

  test('her bulgu satırı kaynağını yazıyor', async ({ page }) => {
    const pin = await ornekPin();
    await page.goto(`/karne/${pin}`);
    await page.waitForLoadState('networkidle');
    await belgeSekmesiniAc(page);

    // DİKKAT: innerText kullanılmaz. Kaynak etiketleri `uppercase` sınıfı
    // taşıdığı için innerText onları "ARAÇ SAHİBİ BEYANI" diye döndürür ve
    // arama başarısız olur. Bu tuzağa geliştirme sırasında iki kez düşüldü.
    const etiketler = await page.evaluate(() =>
      [...document.querySelectorAll('#official-report-print-zone span')]
        .filter((e) => (e.className || '').includes('border-slate-300'))
        .map((e) => e.textContent.trim())
    );

    // Beş bulgu satırı, beş etiket.
    expect(etiketler.length, 'kaynak etiketi sayısı').toBe(5);
    expect(etiketler).toContain('Hesaplandı');
    expect(etiketler).toContain('Araç sahibi beyanı');
    expect(etiketler).toContain('Belgeli');
  });

  test('belge sınırlarını açıkça yazıyor', async ({ page }) => {
    const pin = await ornekPin();
    await page.goto(`/karne/${pin}`);
    await page.waitForLoadState('networkidle');
    await belgeSekmesiniAc(page);

    const metin = await hamMetin(page);
    expect(metin).toContain('BELGENİN KAPSAMI VE SINIRLARI');
    // Belgenin ne OLMADIĞINI söylemesi, güvenilirliğinin parçası.
    expect(metin).toContain('eksper kuruluşu değildir');
    expect(metin).toContain('yapmamaktadır');
  });
});

test.describe('Hasar beyanı doğru basılıyor', () => {
  // HASARLI ARAÇ LİSTESİ VERİDEN TÜRETİLİYOR, SABİT DEĞİL.
  //
  // Eskiden dört plaka elle yazılıydı: ['41IHH434','34KNA929','34FB1907',
  // '01ONR0001']. İki sorunu vardı:
  //
  //   1. `34KNA929` test hesabına AİT DEĞİL — ikinci kullanıcının aracı.
  //      Test onu yalnızca `vehicles` tablosu herkese açık olduğu için
  //      okuyabiliyordu. Tablo sahibine özel hâle gelince test kırıldı ve
  //      bu doğru davranış: test hesabının erişmemesi gereken bir veriye
  //      dayanıyordu.
  //   2. Kullanıcı hasarlı bir araç eklediğinde liste onu kapsamıyordu;
  //      kapsam elle güncellenmeye bağlıydı.
  //
  // Artık test, hesabın KENDİ araçları arasından hasar taşıyanları buluyor.
  // Yeni hasarlı araç eklendiğinde kapsama kendiliğinden giriyor.
  test('hasar taşıyan her araçta kayıt "temiz" diye beyan edilmiyor', async ({ page }) => {
    const sb = await supabaseIstemcisi();
    const { data: araclar, error } = await sb
      .from('vehicles')
      .select('plate_number, pin_code, tramer_status, tramer_amount');

    expect(error).toBeFalsy();

    // Hasar ölçütü: kanonik durum değeri ya da sıfırdan büyük tramer tutarı.
    const hasarli = (araclar || []).filter(
      (v) =>
        v.tramer_status === 'Tramer Var' ||
        v.tramer_status === 'Ağır Hasarlı' ||
        Number(v.tramer_amount) > 0
    );

    // Kapsam sıfırsa test sessizce geçmemeli: hiç hasarlı araç yoksa bu
    // paket hiçbir şeyi korumuyor demektir.
    expect(hasarli.length, 'hesapta hiç hasarlı araç yok — test kör kalır')
      .toBeGreaterThan(0);

    for (const arac of hasarli) {
      await page.goto(`/karne/${arac.pin_code}`);
      await page.waitForLoadState('networkidle');
      await belgeSekmesiniAc(page);

      const metin = await hamMetin(page);
      const etiket = `${arac.plate_number} (${arac.tramer_status}, ${arac.tramer_amount})`;
      expect(metin, `${etiket} hasarlı ama belgede "Kayıt Var" yok`).toContain('Kayıt Var');
      expect(metin, `${etiket} hasarlı olduğu hâlde "temiz" beyan ediliyor`)
        .not.toContain('Kayıt Bulunmamaktadır (Temiz)');
    }
  });
});

test.describe('Kilometre tutarlılığı gerçekten hesaplanıyor', () => {
  test('kilometresi geriye giden araçta tutarsızlık bildiriliyor', async ({ page }) => {
    // 11ASD1231: 5 kayıt, kilometre 151.877 km geriye gidiyor.
    // Belge bu araç için eskiden "Kilometre Verisi Tutarlı" basıyordu —
    // yani sabit metin gerçeğin tam tersini beyan ediyordu.
    await page.goto(`/karne/${await pinBul('11ASD1231')}`);
    await page.waitForLoadState('networkidle');
    await belgeSekmesiniAc(page);

    const metin = await hamMetin(page);
    expect(metin).toContain('Kilometre Tutarlılığı');
    expect(metin, 'geriye giden km tutarsız bildirilmeli').toContain('Tutarsız');
  });

  test('tek kayıtlı araçta "tutarlı" iddiası edilmiyor', async ({ page }) => {
    // Tek kayıtla karşılaştırma yapılamaz. "Tutarlı" demek, yapılmamış bir
    // doğrulamayı iddia etmek olur.
    await page.goto(`/karne/${await pinBul('34FB1907')}`);
    await page.waitForLoadState('networkidle');
    await belgeSekmesiniAc(page);

    const metin = await hamMetin(page);
    expect(metin).toContain('Kilometre Tutarlılığı');
    expect(metin, 'tek kayıtta tutarlılık iddia edilmemeli').not.toContain('Tutarlı (1 kayıt');
  });
});

test.describe('Veri yokken uydurma değer basılmıyor', () => {
  test('boş alanlar "Beyan edilmemiş" gösteriyor', async ({ page }) => {
    // 06ONR97: yakıt, vites ve renk alanları veritabanında BOŞ.
    // Belge eskiden bu araç için üç uydurma teknik özellik basıyordu.
    await page.goto(`/karne/${await pinBul('06ONR97')}`);
    await page.waitForLoadState('networkidle');
    await belgeSekmesiniAc(page);

    const metin = await hamMetin(page);
    expect(metin, 'boş alan dürüstçe yokluk göstermeli').toContain('Beyan edilmemiş');
    for (const uydurma of ['Benzin / Hibrit', 'Otomatik vites', 'Metalik Siyah']) {
      expect(metin, `"${uydurma}" uydurma varsayılanı geri gelmiş`).not.toContain(uydurma);
    }
  });
});

test.describe('KVKK: plaka ziyaretçiye gösterilmiyor', () => {
  test('çıkışta belge plaka yerine KVKK notu basıyor', async ({ page }) => {
    const pin = await ornekPin();
    await page.goto(`/karne/${pin}`);
    await page.waitForLoadState('networkidle');
    await belgeSekmesiniAc(page);

    const metin = await hamMetin(page);
    const { ORNEK_PLAKA } = require('./yardimcilar');
    expect(metin, 'plaka kişisel veri; ziyaretçiye gösterilmemeli').not.toContain(ORNEK_PLAKA);
    expect(metin).toContain('KVKK kapsamında paylaşılmaz');
  });
});

test.describe('Hasar katalogu tek kaynaktan', () => {
  // KUSUR: `CAR_PARTS` ve `DAMAGE_STATUSES` UC dosyada ayri ayri tanimliydi
  // (giris ekrani, ilan on izleme, arac detayi) ve COKTAN KAYMISTI:
  //
  //   trunk parcasi    "Bagaj Kapagi"  <->  "Arka Kaput"
  //   PAINTED          "Boyanmis"      <->  "Boyali"
  //   CHANGED          "Degismis"      <->  "Degisen"
  //
  // Kullanici bir parcayi bir isimle isaretliyor, alici baska bir isimle
  // goruyordu. Ustelik etiketler efsane listelerinde bir de SABIT yazilmisti,
  // yani ayni metin bes ayri yerde duruyordu.
  //
  // Artik hepsi src/data/hasarKatalogu.js dosyasindan okunuyor. Bu test eski
  // yazimlarin geri gelmedigini kontrol ediyor.

  const ESKI_YAZIMLAR = ['Değişmiş', 'Boyanmış', 'Lokal Boyanmış', 'Arka Kaput'];
  const YENI_YAZIMLAR = ['Değişen', 'Boyalı', 'Lokal Boyalı', 'Orijinal'];

  test('arac detayinda tek bicim etiket kullaniliyor', async ({ page }) => {
    const sb = await supabaseIstemcisi();

    // Hasar kaydi olan bir arac gerekli: efsane ve sema ancak o zaman dolu.
    const { data: araclar } = await sb
      .from('vehicles')
      .select('pin_code, plate_number, damage_report')
      .not('damage_report', 'is', null);

    const hasarli = (araclar || []).find(
      (v) => v.damage_report && Object.keys(v.damage_report).length > 0
    );
    expect(hasarli, 'hasar şeması olan araç yok — test kör kalır').toBeTruthy();

    await page.goto(`/details/${hasarli.pin_code}`);
    await page.waitForLoadState('networkidle');

    const govde = await page.locator('body').textContent();

    for (const eski of ESKI_YAZIMLAR) {
      expect(govde, `"${eski}" eski yazımı geri gelmiş — katalog yeniden ayrışmış olabilir`)
        .not.toContain(eski);
    }
    for (const yeni of YENI_YAZIMLAR) {
      expect(govde, `"${yeni}" etiketi görünmüyor`).toContain(yeni);
    }

    // Şema gerçekten çizilmiş mi? Etiketler doğru olup şema boş kalırsa
    // testin geçmesi bir şey ifade etmez.
    const yollar = await page.locator('svg path[fill]').count();
    expect(yollar, 'hasar şemasında boyalı parça yok').toBeGreaterThan(5);

    // Lokal boyalı gradyanı tanımlı mı? Katalog `url(#Gradient_local)`
    // döndürüyor; tanım eksikse parça görünmez olur.
    await expect(page.locator('linearGradient#Gradient_local')).toHaveCount(1);
  });
});
