// =========================================================================
// 19 · VİTRİN SAYAÇLARI — FAVORİ VE GÖRÜNTÜLENME
//
// -------------------------------------------------------------------------
// NİYE BU PAKET VAR
// -------------------------------------------------------------------------
// Bu üründe sayaçlar iki kez sessizce yalan söyledi:
//
// 1. `listings.favorite_count` şemada duruyordu ve ekran "N Favori" diye
//    basıyordu ama favori diye bir tablo yoktu — sayaç hiç artmıyordu.
//    Favori sistemi kurulduktan sonra tetikleyici de eklendi ve sayaç
//    doğru çalışmaya başladı. AMA pazaryeri listesi doğrudan sorgudan
//    `vitrin_listesi` RPC'sine taşınırken `favorite_count` alanı
//    DÜŞÜRÜLDÜ: veritabanında 1 yazarken ekranda 0 görünüyordu.
//
// 2. `listings.views_count` da aynı durumdaydı: sütun vardı, ekran "0 Kez
//    Okundu" basıyordu, artıran hiçbir kod yoktu.
//
// Ortak ders: sayaç göstermek ucuz, sayacı BESLEMEK ayrı bir iş. Bu paket
// ikisinin de uçtan uca beslendiğini denetliyor.
//
// -------------------------------------------------------------------------
// GÖRÜNTÜLENME "KAÇ KEZ" DEĞİL "KAÇ KİŞİ"
// -------------------------------------------------------------------------
// Aynı kişinin sayfayı beş kez yenilemesi bir sayılıyor. Tekilleştirme
// veritabanında birincil anahtarla (plaka + izleyici) yapılıyor, yani
// istemciye güvenmiyor.
//
// ⚠ BU PAKET VERİTABANINA YAZIYOR — kendi çöpünü `afterAll`da siliyor.
// =========================================================================

const {
  test, expect, supabaseIstemcisi, aliciIstemcisi, anonIstemcisi, ornekPin,
} = require('./yardimcilar');

test.describe('Vitrin sayaçları', () => {
  // ⚠ PIN VİTRİNDEN SEÇİLİYOR, `ornekPin()`den değil.
  // Sayaçlar `listings` üzerinde tutuluyor; vitrinde olmayan bir araçta
  // ölçülecek sayaç yok ve testler sessizce atlanıyordu. Atlanan test,
  // koşmayan testtir.
  let pin = null;

  test.beforeAll(async () => {
    const sahip = await supabaseIstemcisi();
    const { data } = await sahip.rpc('vitrin_listesi', { p_sehir: null, p_kullanici: null });
    // Sahibin KENDİ vitrindeki aracı: favori/görüntülenme denemeleri için
    // ikinci hesap gerekiyor, o yüzden sahibi bilinen bir araç şart.
    const { data: { user } } = await sahip.auth.getUser();
    const benim = (data || []).filter((x) => x.user_id === user.id);
    pin = (benim[0] || (data || [])[0])?.pin_code || await ornekPin();
  });

  test('vitrin listesi favori sayacını DÖNDÜRÜYOR', async () => {
    const alici = await aliciIstemcisi();
    const { data } = await alici.rpc('vitrin_listesi', { p_sehir: null, p_kullanici: null });
    const kayitlar = Array.isArray(data) ? data : [];
    test.skip(kayitlar.length === 0, 'vitrinde araç yok');

    // ⚠ ASIL DENETİM: alan var mı? Yokluğu `item.favorite_count || 0` ile
    // sessizce 0'a dönüşüyor ve ekran hiç şikâyet etmiyordu.
    for (const k of kayitlar) {
      expect(
        Object.keys(k),
        'vitrin listesi favori sayacını döndürmüyor — ekranda hep 0 görünür'
      ).toContain('favorite_count');
      expect(typeof k.favorite_count).toBe('number');
      expect(Object.keys(k), 'görüntülenme sayacı dönmüyor').toContain('views_count');
    }
  });

  test('favori sayacı gerçek favori sayısıyla aynı', async () => {
    test.skip(!pin, 'örnek PIN yok');
    const alici = await aliciIstemcisi();
    const sahip = await supabaseIstemcisi();

    // Temiz başlangıç: favori varsa kaldır.
    const { data: mevcut } = await alici.rpc('favori_pinlerim');
    if (Array.isArray(mevcut) && mevcut.includes(pin)) {
      await alici.rpc('favori_degistir', { p_pin: pin });
    }

    const oku = async () => {
      const { data } = await sahip.rpc('vitrin_listesi', { p_sehir: null, p_kullanici: null });
      return (data || []).find((x) => x.pin_code === pin)?.favorite_count;
    };

    const once = await oku();
    test.skip(once === undefined, 'örnek araç vitrinde değil');

    await alici.rpc('favori_degistir', { p_pin: pin });
    expect(await oku(), 'favorileyince sayaç artmadı').toBe(once + 1);

    await alici.rpc('favori_degistir', { p_pin: pin });
    expect(await oku(), 'favoriden çıkınca sayaç azalmadı').toBe(once);
  });

  test('görüntülenme AYNI kişiyi ikinci kez saymıyor', async () => {
    test.skip(!pin, 'örnek PIN yok');
    const alici = await aliciIstemcisi();
    const sahip = await supabaseIstemcisi();

    const oku = async () => {
      const { data } = await sahip.rpc('vitrin_listesi', { p_sehir: null, p_kullanici: null });
      return (data || []).find((x) => x.pin_code === pin)?.views_count;
    };

    const once = await oku();
    test.skip(once === undefined, 'örnek araç vitrinde değil');

    // İlk görüntüleme: sayılabilir (daha önce bakmadıysa).
    const ilk = await alici.rpc('vitrin_goruntulendi', { p_pin: pin });
    expect(ilk.data?.basarili).toBe(true);

    const ilkSonra = await oku();

    // İKİNCİ görüntüleme: aynı kullanıcı, sayı DEĞİŞMEMELİ.
    const ikinci = await alici.rpc('vitrin_goruntulendi', { p_pin: pin });
    expect(ikinci.data?.sayildi, 'aynı kişi ikinci kez sayıldı').toBe(false);
    expect(await oku(), 'aynı kişinin ikinci ziyareti sayacı artırdı').toBe(ilkSonra);
  });

  test('ARAÇ SAHİBİ kendi aracını saydırmıyor', async () => {
    test.skip(!pin, 'örnek PIN yok');
    const sahip = await supabaseIstemcisi();

    const { data } = await sahip.rpc('vitrin_goruntulendi', { p_pin: pin });
    expect(data?.basarili).toBe(true);
    expect(data?.sayildi, 'araç sahibi kendi aracını saydırdı').toBe(false);
  });

  test('ziyaretçi kimliksiz sayılmıyor, kimlikle sayılıyor', async () => {
    test.skip(!pin, 'örnek PIN yok');
    const anon = anonIstemcisi();

    // Kimlik yoksa tekilleştirilemez; saymamak yanlış saymaktan iyi.
    const kimliksiz = await anon.rpc('vitrin_goruntulendi', { p_pin: pin });
    expect(kimliksiz.data?.sayildi, 'kimliksiz ziyaretçi sayıldı').toBe(false);

    // Kimlikle ilk kez sayılıyor, ikinci kez sayılmıyor.
    const kimlik = `test-${Date.now()}`;
    const ilk = await anon.rpc('vitrin_goruntulendi', { p_pin: pin, p_anon_kimlik: kimlik });
    expect(ilk.data?.sayildi, 'kimlikli ziyaretçi sayılmadı').toBe(true);

    const ikinci = await anon.rpc('vitrin_goruntulendi', { p_pin: pin, p_anon_kimlik: kimlik });
    expect(ikinci.data?.sayildi, 'aynı ziyaretçi ikinci kez sayıldı').toBe(false);
  });

  test('görüntülenme tablosu istemciye kapalı — plaka sızmıyor', async () => {
    const alici = await aliciIstemcisi();
    const { data, error } = await alici.from('vitrin_goruntulenmeleri').select('*');
    expect(
      error || (data && data.length === 0),
      'görüntülenme tablosu istemciye açık — plaka ve kimin neye baktığı okunabilir'
    ).toBeTruthy();
  });

  test('olmayan PIN reddediliyor', async () => {
    const anon = anonIstemcisi();
    const { data } = await anon.rpc('vitrin_goruntulendi', {
      p_pin: 'CV-YOKYOK-YOKYO', p_anon_kimlik: 'x',
    });
    expect(data?.basarili).toBe(false);
    expect(data?.hata).toBe('bulunamadi');
  });
});
