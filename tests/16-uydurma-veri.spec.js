// =========================================================================
// 16 · UYDURMA VERİ — EKRANDA SABİT KODLANMIŞ SAHTE BİLGİ OLMAYACAK
//
// -------------------------------------------------------------------------
// NİYE BU PAKET VAR
// -------------------------------------------------------------------------
// Araç detay ekranının sağ sütununda bir "satıcı & iletişim" kartı vardı ve
// gösterdiği üç bilginin ÜÇÜ DE uydurmaydı:
//
//     sellerName  = vehicle.owner_name  || 'Tescilli Araç Sahibi'
//     sellerPhone = vehicle.owner_phone || '0 (532) 123 45 67'
//     memberSince = 'Mart 2026'
//
// `vehicles` tablosunda `owner_name` ve `owner_phone` SÜTUNLARI YOK. Yani
// yedek değer istisna değil, tek durumdu: her araçta, her ziyaretçiye aynı
// uydurma telefon numarası gösteriliyordu. Üstelik "Cep Telefonunu Göster"
// düğmesinin arkasındaydı — kullanıcı gerçek bir iletişim bilgisi açtığını
// sanıyordu.
//
// Aynı blok araç kayıt sihirbazının 4. adımındaki ön izlemede de vardı;
// oradaki yedek isim geliştiricinin kendi adıydı.
//
// -------------------------------------------------------------------------
// TESTİN ASIL DERSİ: DOĞRU HESAPLA BAKMAK
// -------------------------------------------------------------------------
// Sahte telefon `isPublicView` dalında duruyordu. Araç sahibinin hesabıyla
// girip sayfayı denetleyen bir test bu dala HİÇ girmiyor ve "temiz" diyor.
// Bu yüzden aşağıdaki denetim ikinci hesapla, yani gerçek ziyaretçi
// gözüyle yapılıyor.
//
// -------------------------------------------------------------------------
// TELEFON GERÇEK OLSAYDI DA GÖSTERİLMEYECEKTİ
// -------------------------------------------------------------------------
// Plaka, araç sahibini rahatsız etmeye yarayabildiği için pazaryerinden ve
// devir akışından kaldırılmıştı. Telefon numarası çok daha doğrudan bir
// taciz kanalı ve ziyaretçiye açılması KVKK'da ayrı bir rıza gerektiriyor.
// Bu yüzden test yalnızca "sahte numara yok" demiyor; "telefon açma düğmesi
// yok" da diyor.
//
// -------------------------------------------------------------------------
// HİÇBİR YAZMA YOK — CI'DA KOŞUYOR
// =========================================================================

const {
  test, expect, girisYap, girisYapAlici, hamMetin, ornekPin, supabaseIstemcisi,
} = require('./yardimcilar');

// Sabit kodlanmış oldukları için birebir aranabiliyorlar.
const UYDURMA = [
  '532) 123 45 67',        // sahte cep telefonu
  'Mart 2026',             // sabit üyelik tarihi
  'Bireysel Üye',          // üyelik türü henüz yok
  'Tescilli Araç Sahibi',  // sabit isim yedeği
];

const ILETISIM_DUGMELERI = ['Cep Telefonunu', 'Telefonu Göster'];

test.describe('Uydurma veri', () => {
  let pin = null;

  test.beforeAll(async () => {
    pin = await ornekPin();
  });

  test('ziyaretçi gözüyle araç detayında uydurma bilgi yok', async ({ page }) => {
    test.skip(!pin, 'örnek PIN yok');

    // ⚠ İKİNCİ HESAP: aracın sahibi değil. `isPublicView` ancak böyle açılıyor.
    await girisYapAlici(page);
    await page.goto(`/details/${encodeURIComponent(pin)}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('ARAÇ KÜNYESİ')).toBeVisible({ timeout: 20_000 });

    const metin = await hamMetin(page);

    for (const deger of UYDURMA) {
      expect(metin, `araç detayında uydurma bilgi geri gelmiş: "${deger}"`).not.toContain(deger);
    }

    for (const dugme of ILETISIM_DUGMELERI) {
      expect(metin, `telefon açma düğmesi geri gelmiş: "${dugme}"`).not.toContain(dugme);
    }
  });

  test('sicil özeti kartı gerçek veriyi gösteriyor ve kaydırma boyunca duruyor', async ({ page }) => {
    test.skip(!pin, 'örnek PIN yok');

    await girisYap(page);
    await page.goto(`/details/${encodeURIComponent(pin)}`);
    await page.waitForLoadState('networkidle');

    const ozet = page.locator('div.sticky.top-20').first();
    await expect(ozet).toBeVisible({ timeout: 20_000 });

    // Kartın içeriği gerçek: sicil numarası sayfadaki PIN ile aynı olmalı.
    await expect(ozet).toContainText(pin);

    // ⚠ ASIL DENETİM: kart YAPIŞIK mı?
    // Kart zaten `sticky top-20` sınıfını taşıyordu ama çalışmıyordu, çünkü
    // dış ızgaradaki `items-start` sarmalayıcıyı içeriği kadar kısaltıyor ve
    // `sticky` ögesine hareket alanı bırakmıyordu. Sınıfın varlığını
    // denetlemek bu hatayı YAKALAMAZ; görünürlüğü denetlemek yakalar.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.85));
    await page.waitForTimeout(600);

    const gorunur = await ozet.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    });
    expect(gorunur, 'sicil özeti kartı kaydırınca kayboluyor — sticky çalışmıyor').toBe(true);
  });

  // -------------------------------------------------------------------------
  // UYDURMA KONUM
  //
  // Araç detayı `{vehicle.city || 'Aksaray'}, {vehicle.district || 'Merkez'}`
  // yazıyordu: il/ilçesi olmayan HER araç "Aksaray, Merkez" gösteriyordu.
  // İki ayrı zarar veriyordu:
  //   · Alıcı aracın nerede olduğu konusunda yanıltılıyordu.
  //   · Araç sahibi vitrine çıkaramıyor, "il ilçe eksik" uyarısı alıyor,
  //     sonra detay sayfasında ilçeyi DOLU görüyordu. Uyarı doğruydu,
  //     ekran yalan söylüyordu — hata sanılan şey buydu.
  // -------------------------------------------------------------------------
  test('konumu olmayan araçta uydurma il/ilçe basılmıyor', async ({ page }) => {
    const sb = await supabaseIstemcisi();
    const { data: { user } } = await sb.auth.getUser();

    // Kaydında il/ilçe OLMAYAN bir araç aranıyor; testin öncülü bu.
    const { data: araclar } = await sb
      .from('vehicles')
      .select('pin_code, city, district')
      .eq('user_id', user.id)
      .is('city', null)
      .limit(1);

    const konumsuz = (araclar || [])[0];
    test.skip(!konumsuz, 'konumu boş araç yok — öncül sağlanamıyor');

    await girisYap(page);
    await page.goto(`/details/${encodeURIComponent(konumsuz.pin_code)}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('ARAÇ KÜNYESİ')).toBeVisible({ timeout: 20_000 });

    const metin = await hamMetin(page);
    expect(
      metin,
      'konumu boş araçta uydurma il/ilçe basılıyor'
    ).not.toContain('Aksaray, Merkez');
  });
});

// =========================================================================
// ÇIKIŞSIZ YOL
//
// Vitrin kartı ekranı "araç kaydınızda il/ilçe/açıklama eksik, önce
// tamamlayın" diyordu. Ama kayda ait tek bağlantı `/details/[pin]` idi ve
// o sayfa SALT OKUNUR: kullanıcıya bir şey düzeltmesi söyleniyor,
// düzeltecek yer verilmiyordu.
//
// Bir uyarı, düzeltme yolunu göstermiyorsa uyarı değil engeldir.
// =========================================================================
test.describe('Vitrin çıkışsız yolu', () => {
  test('eksik alan uyarısı düzenleme sayfasına götürüyor', async ({ page }) => {
    const sb = await supabaseIstemcisi();
    const { data: { user } } = await sb.auth.getUser();

    const { data: araclar } = await sb
      .from('vehicles')
      .select('pin_code, city')
      .eq('user_id', user.id)
      .is('city', null)
      .limit(1);

    const eksik = (araclar || [])[0];
    test.skip(!eksik, 'eksik alanlı araç yok — öncül sağlanamıyor');

    await girisYap(page);
    await page.goto(`/garage/${encodeURIComponent(eksik.pin_code)}/vitrin`);
    await expect(page.getByRole('heading', { name: 'Vitrin Kartı', level: 1 }))
      .toBeVisible({ timeout: 20_000 });

    // Uyarının yanında ÇALIŞAN bir düzeltme yolu olmalı.
    const tamamla = page.getByRole('link', { name: 'Eksikleri tamamla' });
    await expect(tamamla, 'eksik alan uyarısı var ama düzeltme yolu yok').toBeVisible();

    await tamamla.click();
    await expect(page.getByRole('heading', { name: 'Araç Kaydını Düzenle', level: 1 }))
      .toBeVisible({ timeout: 20_000 });

    // Eksik alanlar gerçekten düzenlenebiliyor mu?
    // ⚠ `getByLabel` KULLANILMIYOR. Etiketler `.etiket` sınıfıyla CSS'te
    // büyütülüyor ve erişilebilir ad "İL" oluyor; 'İl' araması eşleşmiyor.
    // Bu tuzağa daha önce de düşülmüştü, `hamMetin` yardımcısı onun için
    // var. Denetim yazıma değil ROLE bağlanıyor: iki açılır liste (il, ilçe)
    // ve bir metin alanı (açıklama) olmalı.
    await expect(page.getByRole('combobox'), 'il ve ilçe seçicileri yok').toHaveCount(2);
    await expect(page.locator('textarea'), 'açıklama alanı yok').toHaveCount(1);

    // `hamMetin` HAM DOM metnini veriyor; CSS'in büyütmesi ona yansımıyor.
    // Etiketler kaynakta "İl", "İlçe", "Açıklama" olarak yazılı.
    const formMetni = await hamMetin(page);
    for (const alan of ['İl', 'İlçe', 'Açıklama']) {
      expect(formMetni, `${alan} alanı formda yok`).toContain(alan);
    }

    // ⚠ Sicilin kimliği DEĞİŞTİRİLEMEMELİ: kilometrenin serbestçe
    // düzeltilebilmesi puanlamadaki tutarlılık denetimini anlamsız kılar.
    // Metin araması BURADA YANLIŞ OLURDU: ekrandaki bilgi notu zaten
    // "kilometre" ve "plaka" kelimelerini geçiriyor (niye değiştirilemedik-
    // lerini anlatıyor). Denetim ALAN SAYISINA bakıyor: tek metin girdisi
    // (başlık) olmalı, sayı girdisi hiç olmamalı.
    await expect(page.locator('input'), 'beklenenden fazla girdi alanı var').toHaveCount(1);
    await expect(page.locator('input[type="number"]'), 'km gibi sayısal alan düzenlenebiliyor').toHaveCount(0);
  });
});
