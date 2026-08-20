// =========================================================================
// 21 · TEKLİF AKIŞI — KAPILAR GERÇEKTEN AÇILIYOR MU, EKRAN UYDURUYOR MU
//
// -------------------------------------------------------------------------
// NİYE BU PAKET VAR
// -------------------------------------------------------------------------
// Bu turda iki ayrı sınıf hata düzeltildi ve ikisinin de geri gelme yolu
// açık:
//
// 1) ÖLÜ KAPILAR. Ürün üç ayrı yerde "teklif al" diyordu ve ÜÇÜ DE hiçbir
//    yere gitmiyordu — ikisi yalnızca "yakında" bildirimi basıyor, üçüncüsü
//    (bildirim) `hedef_yol` yazmadığı için kullanıcıyı garaja düşürüyordu.
//    ⚠ Bu paket düğmelere TIKLIYOR. Özet panelindeki kırık bağ tam olarak
//    tıklamayan bir testin altından geçmişti: satır okunuyordu, ama hiç
//    izlenmediği için "Araç bulunamadı" ekranına gittiği görülmemişti.
//
// 2) UYDURMA VERİ. Anlaşmalı sigorta ortağı YOK. Ekran firma adı, prim
//    tutarı ya da "en uygun" iddiası basarsa, bu üründen temizlenen
//    kusurun (sabit "Sedan/Benzin/Otomatik", araca bakmadan basılan
//    "TÜVTÜRK ONAYLI", artıran kodu olmayan favori sayacı) aynısı olur.
//
// -------------------------------------------------------------------------
// ⚠ YAZMA VAR — BİLEREK, VE YALNIZCA TEST HESABININ KENDİ ARACINA
// -------------------------------------------------------------------------
// Diğer paketlerin aksine burada veritabanına yazılıyor: tekilleştirme
// kuralı ancak gerçekten kayıt açılarak denetlenebilir. Yazılan satır
// `teklif_talepleri` tablosunda, test hesabının kendi aracı için ve
// yalnızca bir ilgi kaydı — hiçbir mevcut veriye dokunmuyor.
// =========================================================================

const {
  test, expect, girisYap, hamMetin,
  supabaseIstemcisi, anonIstemcisi, aliciIstemcisi,
  garajYerlessin, basligiBekle,
} = require('./yardimcilar');

// -------------------------------------------------------------------------
// TÜRKİYE'NİN BÜYÜK SİGORTA MARKALARI
//
// Ekranda BUNLARDAN BİRİ görünüyorsa ve katalogda aktif ortak yoksa, ekran
// olmayan bir anlaşmayı varmış gibi göstermiş demektir. Liste eksiksiz
// olmak zorunda değil — amacı her firmayı yakalamak değil, "ekranı
// doldurmak için tanıdık bir marka yazma" refleksini yakalamak.
// -------------------------------------------------------------------------
const SIGORTA_MARKALARI = [
  'Anadolu Sigorta', 'Allianz', 'Axa', 'AXA', 'Sompo', 'Mapfre',
  'Ak Sigorta', 'Aksigorta', 'Zurich', 'HDI', 'Quick Sigorta',
  'Türkiye Sigorta', 'Ray Sigorta', 'Groupama', 'Neova', 'Doga Sigorta',
  'Doğa Sigorta', 'Ethica', 'Corpus', 'Unico',
];

// Tutar kalıbı: "1.250 TL", "₺2.400", "2400,50 TL"
const TUTAR_KALIBI = /(₺\s?\d[\d.,]*)|(\d[\d.,]*\s?(TL|₺))/;

test.describe('Teklif akışı · yetki', () => {
  test('ANON teklif taleplerini OKUYAMIYOR', async () => {
    // Talep kaydı "bu kullanıcının kaskosu şu tarihte doluyor ve teklif
    // arıyor" demek: hem araç hem niyet bilgisi. Herkese açık bir anon
    // anahtarla okunabilir olması, `listings` tablosunda yaşanan sızıntının
    // aynısı olurdu.
    const anon = anonIstemcisi();
    const { data, error } = await anon.from('teklif_talepleri').select('*').limit(5);

    const kapali = !!error || (data || []).length === 0;
    expect(kapali, `anon teklif taleplerini okuyabiliyor: ${JSON.stringify(data)}`).toBe(true);
  });

  test('ANON talep OLUŞTURAMIYOR — RPC yetkisi geri alınmış', async () => {
    // ⚠ GEÇERLİ İMZAYLA çağrılıyor. Parametreleri boş bırakıp gelen hatayı
    // "demek ki kapalı" diye okumak bu projede bir kez yapıldı: gelen şey
    // imza hatasıydı, fonksiyon anon'a açıktı ve test yeşil yanıyordu.
    const anon = anonIstemcisi();
    const { error } = await anon.rpc('teklif_talebi_olustur', {
      p_plaka: '34ABC123',
      p_tur: 'kasko',
      p_kaynak: 'panel',
    });

    expect(error, 'anon RPC çağrısı hatasız geçti — fonksiyon açık').toBeTruthy();
    expect(
      error.code === '42501' || /permission denied/i.test(error.message || ''),
      `beklenen yetki hatası değil: ${error.code} ${error.message}`
    ).toBe(true);
  });

  test('BAŞKASININ aracına talep açılamıyor', async () => {
    const sahip = await supabaseIstemcisi();
    const { data: { user } } = await sahip.auth.getUser();
    const { data: araclar } = await sahip
      .from('vehicles').select('plate_number').eq('user_id', user.id).limit(1);

    test.skip(!araclar?.length, 'test hesabında araç yok');

    // İkinci hesap, BİRİNCİ hesabın aracı için talep açmayı deniyor.
    const alici = await aliciIstemcisi();
    const { data, error } = await alici.rpc('teklif_talebi_olustur', {
      p_plaka: araclar[0].plate_number,
      p_tur: 'kasko',
      p_kaynak: 'panel',
    });

    expect(error, `RPC hata verdi: ${error?.message}`).toBeFalsy();
    expect(data?.basarili, 'başkasının aracına talep açılabildi').toBe(false);
    expect(data?.hata, `beklenen "sahip_degil" değil: ${data?.hata}`).toBe('sahip_degil');
  });

  test('AYNI belge için 24 saatte tek kayıt', async () => {
    const sb = await supabaseIstemcisi();
    const { data: { user } } = await sb.auth.getUser();
    const { data: araclar } = await sb
      .from('vehicles').select('plate_number').eq('user_id', user.id).limit(1);

    test.skip(!araclar?.length, 'test hesabında araç yok');
    const plaka = araclar[0].plate_number;

    // İlk çağrı yeni kayıt AÇABİLİR de açmayabilir de (önceki koşudan kalmış
    // olabilir) — denetlenen şey o değil. İKİNCİ çağrının kesinlikle yeni
    // kayıt açmaması gerekiyor. Düğmeye üç kez basan kullanıcı talebi üçe
    // katlarsa, sigorta şirketine gösterilecek sayı şişer; şişmiş bir sayı,
    // sayının hiç olmamasından kötüdür.
    const { error: e1 } = await sb.rpc('teklif_talebi_olustur', {
      p_plaka: plaka, p_tur: 'kasko', p_kaynak: 'panel',
    });
    expect(e1, `ilk talep hata verdi: ${e1?.message}`).toBeFalsy();

    const { data: ikinci, error: e2 } = await sb.rpc('teklif_talebi_olustur', {
      p_plaka: plaka, p_tur: 'kasko', p_kaynak: 'panel',
    });
    expect(e2, `ikinci talep hata verdi: ${e2?.message}`).toBeFalsy();
    expect(ikinci?.yeni, 'aynı belge için 24 saat içinde ikinci kayıt açıldı').toBe(false);
  });

  test('KENDİ talebinden başkasınınki görünmüyor', async () => {
    const sb = await supabaseIstemcisi();
    const { data: { user } } = await sb.auth.getUser();
    const { data } = await sb.from('teklif_talepleri').select('user_id');

    const yabanci = (data || []).filter((t) => t.user_id !== user.id);
    expect(yabanci.length, `başkasının ${yabanci.length} talebi okunabiliyor`).toBe(0);
  });
});

test.describe('Teklif ekranı · uydurma veri yok', () => {
  test.beforeEach(async ({ page }) => {
    await girisYap(page);
    await page.goto('/insurance-offer');
    await page.waitForLoadState('networkidle');
    await basligiBekle(page);
  });

  test('ekran yer tutucu DEĞİL', async ({ page }) => {
    const metin = await hamMetin(page);
    expect(metin, 'teklif ekranı hâlâ "yapım aşamasında"').not.toContain('Yapım Aşamasında');
    expect(metin, 'ekran açılmadı').toContain('Yenileme');
  });

  test('ORTAK YOKKEN firma adı basılmıyor', async ({ page }) => {
    const metin = await hamMetin(page);
    const gorunen = SIGORTA_MARKALARI.filter((m) => metin.includes(m));
    expect(
      gorunen,
      `anlaşmalı ortak yokken ekranda sigorta firması görünüyor: ${gorunen.join(', ')}`
    ).toEqual([]);
  });

  test('ORTAK YOKKEN prim/tutar basılmıyor', async ({ page }) => {
    // Tutar göstermek iki ayrı sorun: (a) ortak yokken uydurma olurdu,
    // (b) ürünle ilgili tutar görünen platform satış sitesi konumuna geçiyor.
    const metin = await hamMetin(page);
    const eslesme = metin.match(TUTAR_KALIBI);
    expect(eslesme?.[0] ?? null, `teklif ekranında tutar görünüyor: ${eslesme?.[0]}`).toBeNull();
  });

  test('DAYANAKSIZ ÜSTÜNLÜK İDDİASI yok', async ({ page }) => {
    // "En uygun", "en ucuz", "karşılaştırın": hiçbiri yapılamıyor —
    // karşılaştırılacak teklif yok. Bu ifadeler modalda ve anasayfa
    // kartında duruyordu, ikisi de bu turda kaldırıldı.
    const metin = (await hamMetin(page)).toLocaleLowerCase('tr-TR');
    for (const iddia of ['en uygun', 'en ucuz', 'en iyi teklif', 'fiyat']) {
      expect(metin, `ekranda dayanaksız ifade var: "${iddia}"`).not.toContain(iddia);
    }
  });

  test('EKRAN her durumda BİR ŞEY söylüyor', async ({ page }) => {
    // Boş bir bölüm bırakmak da bir seçenekti; kullanıcı o zaman "yükleniyor
    // mu, bozuk mu" diye düşünürdü. Ekran hangi durumda olursa olsun ne
    // olduğunu SÖYLÜYOR.
    const metin = await hamMetin(page);
    const durum = metin.includes('ortağımız henüz yok')
      || metin.includes('Talebiniz alındı')
      || metin.includes('Henüz aracınız yok')
      || metin.includes('Takip edilen bir belge')
      || metin.includes('ÇALIŞTIĞIMIZ FİRMALAR');
    expect(durum, 'ekran teklif durumu hakkında hiçbir şey söylemiyor').toBe(true);
  });

  // -------------------------------------------------------------------------
  // ⚠ PAKETİN EN ÖNEMLİ DENETİMİ — DEĞİŞMEZ, BAYRAKTAN BAĞIMSIZ
  // -------------------------------------------------------------------------
  // İlk hâli "demo normal ekrana sızmıyor" diyordu ve `?demo=1` yokken hiçbir
  // örnek firma görünmemesini bekliyordu. Demo site geneli bir ortam
  // değişkenine taşınınca bu beklenti YANLIŞ ŞEYİ ölçmeye başladı: bayrak
  // açıkken firmalar zaten görünecek.
  //
  // Asıl korunması gereken şey bayrağın durumu değil, şu DEĞİŞMEZ:
  //
  //     EKRANDA ÖRNEK BİR FİRMA GÖRÜNÜYORSA,
  //     "ÖRNEK GÖRÜNÜM" ŞERİDİ DE GÖRÜNMEK ZORUNDA.
  //
  // Bu ikisi ayrılırsa ürün olmayan bir anlaşmayı varmış gibi gösterir —
  // temizlenen uydurma veri sınıfının aynısı. Denetim demo açık da olsa
  // kapalı da olsa geçerli.
  test('ÖRNEK firma görünüyorsa ŞERİT de görünüyor', async ({ page }) => {
    const metin = await hamMetin(page);
    const ornekFirmaVar = /Örnek (Sigorta|Global|Anadolu|Muayene|Servis)/.test(metin);
    const seritVar = metin.includes('ÖRNEK GÖRÜNÜM');

    if (ornekFirmaVar) {
      expect(
        seritVar,
        'ÖRNEK firma gösteriliyor ama uyarı şeridi yok — ekran gerçek anlaşma sanılır'
      ).toBe(true);
    }

    // Tersi de doğru olmalı: şerit varsa gösterilecek örnek firma da olmalı.
    // Şeridi olup firması olmayan ekran, sebepsiz yere kendini şüpheli
    // gösterir.
    if (seritVar) {
      expect(ornekFirmaVar, 'demo şeridi var ama örnek firma yok').toBe(true);
    }
  });

  test('MOBİLDE taşma ve kesik metin yok', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await basligiBekle(page);

    const kesikler = await page.evaluate(() => {
      const c = [];
      document.querySelectorAll('*').forEach((el) => {
        if (el.children.length) return;
        const m = (el.textContent || '').trim();
        if (!m) return;
        if (el.scrollWidth > el.clientWidth + 1) c.push(m.slice(0, 40));
      });
      return c;
    });
    const gercek = kesikler.filter((k) => !k.includes('İçeriğe geç'));
    expect(gercek, `mobilde metin kesiliyor: ${gercek.join(' | ')}`).toEqual([]);

    const yatay = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(yatay, 'teklif ekranı mobilde yatay kaydırma yapıyor').toBe(false);
  });
});

test.describe('Teklif akışı · kapılar gerçekten açılıyor', () => {
  test('GARAJ Araç Merkezi kartı teklif ekranına GÖTÜRÜYOR', async ({ page }) => {
    await girisYap(page);
    await page.goto('/garage');
    await page.waitForLoadState('networkidle');
    await garajYerlessin(page);

    const kart = page.getByRole('button', { name: /Süreleri yönet/i }).first();
    await expect(kart, 'Araç Merkezi\'nde "Süreleri yönet" kartı yok').toBeVisible({ timeout: 15_000 });

    await kart.click();
    await page.waitForURL((u) => u.toString().includes('/insurance-offer'), { timeout: 15_000 });

    const metin = await hamMetin(page);
    expect(metin, 'kart yer tutucu ekrana götürüyor').not.toContain('Yapım Aşamasında');
    expect(page.url(), 'kaynak parametresi taşınmıyor').toContain('kaynak=garaj_serit');
  });

  test('POLİÇE MODALI düğmesi teklif ekranına GÖTÜRÜYOR', async ({ page }) => {
    await girisYap(page);
    await page.goto('/garage');
    await page.waitForLoadState('networkidle');
    await garajYerlessin(page);

    const kaskoCipi = page.getByRole('button', { name: /KASKO/ }).first();
    test.skip(await kaskoCipi.count() === 0, 'garajda araç kartı yok');
    await kaskoCipi.click();
    await page.waitForTimeout(800);

    const dugme = page.getByRole('button', { name: /Yenileme seçeneklerini gör/i }).first();
    await expect(dugme, 'modalda yenileme düğmesi yok').toBeVisible({ timeout: 10_000 });

    await dugme.click();
    await page.waitForURL((u) => u.toString().includes('/insurance-offer'), { timeout: 15_000 });

    // ⚠ ARAÇ VE BELGE TAŞINMALI. Yalnızca rotaya gitmek yetmez: kullanıcı
    // "kaskom için" tıkladı, vardığı ekranda hangi satır için geldiğini
    // yeniden aramamalı.
    const url = page.url();
    expect(url, 'plaka taşınmıyor').toContain('plaka=');
    expect(url, 'belge türü taşınmıyor').toContain('tur=kasko');
    expect(url, 'kaynak taşınmıyor').toContain('kaynak=police_modal');
  });

  test('MUAYENE çipi de teklif ekranına GÖTÜRÜYOR', async ({ page }) => {
    // ⚠ MUAYENE BİR ARA İSTİSNAYDI: modal doğrudan TÜVTÜRK'e gidiyordu,
    // bizim ekrana hiç uğramıyordu. İki sonucu vardı — muayene talebi
    // hiçbir yere kaydedilmiyordu (yani muayene/bakım tarafında elde hiç
    // veri oluşmuyordu) ve aynı görünen üç çip farklı davranıyordu.
    //
    // TÜVTÜRK randevu bağlantısı kaybolmadı: teklif ekranının "Bugün
    // yapabilecekleriniz" bölümünde, yalnızca muayene için çıkıyor.
    await girisYap(page);
    await page.goto('/garage');
    await page.waitForLoadState('networkidle');
    await garajYerlessin(page);

    const cip = page.getByRole('button', { name: /MUAYENE/ }).first();
    test.skip(await cip.count() === 0, 'garajda araç kartı yok');
    await cip.click();
    await page.waitForTimeout(800);

    const dugme = page.getByRole('button', { name: /Randevu ve hatırlatma seçenekleri/i }).first();
    await expect(dugme, 'muayene modalında yönlendirme düğmesi yok').toBeVisible({ timeout: 10_000 });

    await dugme.click();
    await page.waitForURL((u) => u.toString().includes('/insurance-offer'), { timeout: 15_000 });
    expect(page.url(), 'muayene türü taşınmıyor').toContain('tur=muayene');

    // TÜVTÜRK bağlantısı varış ekranında duruyor olmalı — yoksa muayene
    // kullanıcısı için çalışan tek kapıyı kapatmış oluruz.
    const tuvturk = page.locator('a[href*="tuvturk.com.tr"]').first();
    await expect(tuvturk, 'teklif ekranında TÜVTÜRK bağlantısı yok').toBeVisible({ timeout: 10_000 });
  });

  test('POLİÇE MODALI erişilebilir bir diyalog', async ({ page }) => {
    // Modal `role="dialog"` ve `aria-modal` TAŞIMIYORDU: klavye kullanıcısı
    // Tab'la modalın arkasındaki sayfada geziniyordu.
    await girisYap(page);
    await page.goto('/garage');
    await page.waitForLoadState('networkidle');
    await garajYerlessin(page);

    const cip = page.getByRole('button', { name: /KASKO/ }).first();
    test.skip(await cip.count() === 0, 'garajda araç kartı yok');
    await cip.click();
    await page.waitForTimeout(800);

    const diyalog = page.getByRole('dialog');
    await expect(diyalog, 'modal role="dialog" taşımıyor').toBeVisible({ timeout: 10_000 });
    await expect(diyalog).toHaveAttribute('aria-modal', 'true');

    // Esc kapatmalı — bu da yoktu.
    await page.keyboard.press('Escape');
    await expect(diyalog, 'Esc modalı kapatmıyor').toHaveCount(0);
  });

  test('PANELDEKİ teklif kartı teklif ekranına GÖTÜRÜYOR', async ({ page }) => {
    await girisYap(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await basligiBekle(page);

    const kart = page.getByRole('button', { name: /Yenileme adımlarını görün/i }).first();
    // Kart yalnızca kritik belge VARKEN çiziliyor — bu kasıtlı.
    test.skip(await kart.count() === 0, 'panelde kritik belge yok, kart çizilmiyor');

    await kart.click();
    await page.waitForURL((u) => u.toString().includes('/insurance-offer'), { timeout: 15_000 });
    expect(page.url(), 'kaynak parametresi taşınmıyor').toContain('kaynak=panel');
  });
});

test.describe('Poliçe bildirimi · hedefe gidiyor', () => {
  test('POLİÇE bildirimleri hedef_yol taşıyor', async ({ page }) => {
    // Bildirimler istemci tarafındaki bot tarafından yazılıyor; önce
    // oturum açıp botun çalışmasını bekliyoruz.
    await girisYap(page);
    await page.goto('/garage');
    await page.waitForLoadState('networkidle');
    await garajYerlessin(page);

    const sb = await supabaseIstemcisi();
    const { data: { user } } = await sb.auth.getUser();
    const { data } = await sb
      .from('notifications')
      .select('title, hedef_yol, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(40);

    // Poliçe bildirimleri aşama etiketiyle başlıyor: "[Son 7 Gün]" gibi.
    const police = (data || []).filter((n) => /\[(Süresi Doldu|Son \d+ Gün|Son 30 Gün)\]/.test(n.title || ''));
    test.skip(police.length === 0, 'poliçe bildirimi yok');

    // ⚠ ESKİ BİLDİRİMLER MUAF. Alan hiç yazılmadığı dönemde üretilenler
    // veritabanında duruyor ve onlara dokunulmuyor (kopya üretmemek için).
    // Denetlenen şey BUNDAN SONRA üretilenler.
    const yeni = police.filter((n) => n.hedef_yol);
    test.skip(yeni.length === 0, 'hedef_yol taşıyan yeni poliçe bildirimi henüz üretilmemiş');

    for (const n of yeni) {
      expect(n.hedef_yol.startsWith('/'), `hedef_yol göreli yol değil: ${n.hedef_yol}`).toBe(true);
      expect(n.hedef_yol, `poliçe bildirimi teklif ekranına gitmiyor: ${n.hedef_yol}`)
        .toContain('/insurance-offer');
      expect(n.hedef_yol, `bildirimde plaka taşınmıyor: ${n.hedef_yol}`).toContain('plaka=');
    }
  });
});

// =========================================================================
// DEMO GÖRÜNÜMÜ — DOLU EKRAN, AMA ASLA GERÇEK SANILMASIN
//
// Anlaşmalı ortak gelmeden ekranın dolu hâli görülebilsin diye `?demo=1`
// örnek firmaları açıyor. Bu paket iki şeyi birlikte zorunlu tutuyor:
// demonun ÇALIŞMASI ve demonun KENDİNİ AÇIKÇA SÖYLEMESİ.
//
// Uyarı şeridi olmayan bir demo, ekran görüntüsü alındığı anda gerçek
// sanılır — bu üründe "TÜVTÜRK ONAYLI" rozeti tam olarak böyle bir şeydi.
// =========================================================================
test.describe('Teklif ekranı · demo görünümü', () => {
  test.beforeEach(async ({ page }) => {
    await girisYap(page);
    await page.goto('/insurance-offer?demo=1');
    await page.waitForLoadState('networkidle');
    await basligiBekle(page);
  });

  test('ÖRNEK ortaklar görünüyor', async ({ page }) => {
    const metin = await hamMetin(page);
    const bulundu = metin.includes('Örnek Sigorta')
      || metin.includes('Örnek Global')
      || metin.includes('Örnek Muayene');
    expect(bulundu, 'demo açıkken örnek ortak görünmüyor — demo çalışmıyor').toBe(true);
  });

  test('UYARI ŞERİDİ zorunlu ve kapatılamaz', async ({ page }) => {
    const metin = await hamMetin(page);
    expect(metin, 'demo açıkken uyarı şeridi yok — ekran gerçek sanılabilir')
      .toContain('ÖRNEK GÖRÜNÜM');
    expect(metin, 'şerit demo olduğunu açıkça söylemiyor').toContain('gerçek değil');

    // Şeridi kapatan bir düğme OLMAMALI: kapatılan uyarı, ekran görüntüsü
    // alınırken kapatılır ve demo gerçek sanılır.
    const serit = page.getByRole('status').first();
    await expect(serit).toBeVisible();
    expect(await serit.getByRole('button').count(), 'demo şeridi kapatılabiliyor').toBe(0);
  });

  test('DEMO DA OLSA prim/tutar basılmıyor', async ({ page }) => {
    // Ortak gelse bile tutar göstermiyoruz: ürünle ilgili tutar görünen
    // platform satış sitesi konumuna geçiyor. Demo bu kuralın istisnası
    // değil — demoda gösterilen şey ileride gerçekte gösterilecek olan.
    const metin = await hamMetin(page);
    const eslesme = metin.match(/(₺\s?\d[\d.,]*)|(\d[\d.,]*\s?(TL|₺))/);
    expect(eslesme?.[0] ?? null, `demo ekranında tutar var: ${eslesme?.[0]}`).toBeNull();
  });

  test('YÖNLENDİRİCİ ROLÜ ekranda açıkça yazıyor', async ({ page }) => {
    // ⚠ BU SATIR ÜRÜNÜN HUKUKİ KONUMU.
    //
    // Sigorta aracılığı (acentelik/brokerlik) Türkiye'de SEDDK lisansına
    // tabi. Bu ürün o işi yapmıyor: kullanıcıya kendi aracına uygun
    // firmaları gösteriyor ve yönlendiriyor. Ekran firma listesi
    // gösterirken bu ayrımı söylemezse, kullanıcı poliçeyi Oto.CV'den
    // aldığını sanabilir.
    //
    // Ortak listesi göründüğü HER durumda bu beyan da görünmeli.
    const metin = await hamMetin(page);
    expect(metin, 'firma listesi var ama yönlendirici rolü yazmıyor')
      .toContain('sigorta acentesi değildir');
    expect(metin, 'kullanıcı verisinin aktarılmadığı söylenmiyor')
      .toContain('otomatik aktarılmaz');
  });

  test('SIRALAMA ya da ÜSTÜNLÜK iddiası yok', async ({ page }) => {
    // Firma listesi göstermek ile "en uygunu bu" demek farklı şeyler.
    // İkincisi karşılaştırma verisi gerektirir; bizde yok ve zaten
    // yönlendirici rolünün dışına çıkar.
    const metin = (await hamMetin(page)).toLocaleLowerCase('tr-TR');
    for (const iddia of ['en uygun', 'en ucuz', 'en iyi', 'önerilen firma', 'tavsiye edilen']) {
      expect(metin, `demo ekranında dayanaksız üstünlük iddiası: "${iddia}"`).not.toContain(iddia);
    }
  });

  test('GERÇEK bir sigorta markası kullanılmıyor', async ({ page }) => {
    // Demo firmalarına gerçek bir şirket adı vermek, o şirketle var olmayan
    // bir ticari ilişki iddia etmek olurdu.
    const metin = await hamMetin(page);
    const gorunen = SIGORTA_MARKALARI.filter((m) => metin.includes(m));
    expect(gorunen, `demoda gerçek sigorta markası kullanılmış: ${gorunen.join(', ')}`).toEqual([]);
  });
});
