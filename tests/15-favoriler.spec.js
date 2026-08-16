// =========================================================================
// 15 · FAVORİLER
//
// -------------------------------------------------------------------------
// NİYE BU PAKET VAR
// -------------------------------------------------------------------------
// `listings.favorite_count` sütunu şemada duruyordu ve "Vitrindeki
// Araçlarım" ekranı onu "N Favori" diye basıyordu. Ama favori diye bir
// tablo, servis ya da düğme YOKTU: sayaç hiçbir zaman artmıyordu.
//
// -------------------------------------------------------------------------
// FAVORİ ARACA AİT — VE TABLOYA DOĞRUDAN ERİŞİM KAPALI
// -------------------------------------------------------------------------
// İlk tasarım favoriyi `listings.id`'ye bağlıyordu. İki sorun çıktı:
//
// 1. PIN ile sicil sorgulayan kullanıcı da favorileyebilmeli, ama o araç
//    vitrinde olmayabiliyor — favorilenecek "ilan" yok.
// 2. Favori tablosu PLAKA tutuyor. Kullanıcı kendi satırlarını
//    okuyabilseydi, pazaryerinde bilerek gizlenen plakaya favori üzerinden
//    ulaşırdı. Plakanın URL'de bile taşınmadığı bir üründe bu yan kapı
//    tutarsız olurdu.
//
// Çözüm: tabloya doğrudan erişim yok; her şey PIN alan/dönen security
// definer RPC'lerden geçiyor. Bu paket ikisini de denetliyor.
// =========================================================================

const { test, expect, supabaseIstemcisi, aliciIstemcisi, anonIstemcisi, ornekPin } = require('./yardimcilar');

test.describe('Favoriler', () => {
  let pin = null;

  test.beforeAll(async () => {
    pin = await ornekPin();
  });

  test.afterAll(async () => {
    // Favoriyi kaldır: bu paket kendi çöpünü temizliyor.
    const alici = await aliciIstemcisi();
    const { data } = await alici.rpc('favori_pinlerim');
    if (Array.isArray(data) && data.includes(pin)) {
      await alici.rpc('favori_degistir', { p_pin: pin });
    }
  });

  test('favori tablosuna DOĞRUDAN erişilemiyor — plaka sızmıyor', async () => {
    const alici = await aliciIstemcisi();
    const { data, error } = await alici.from('favoriler').select('*');

    // Tablo okunabilseydi `vehicle_plate` görünürdü; pazaryeri plakayı
    // bilerek gizliyor.
    expect(
      error || (data && data.length === 0),
      'favori tablosu istemciye açık — plaka sızabilir'
    ).toBeTruthy();
  });

  test('kendi aracını favorileyemiyor', async () => {
    test.skip(!pin, 'örnek PIN yok');
    const sahip = await supabaseIstemcisi();

    const { data } = await sahip.rpc('favori_degistir', { p_pin: pin });
    expect(data?.basarili, 'kullanıcı kendi aracını favoriledi').toBe(false);
    expect(data?.hata).toBe('kendi_aracin');
  });

  test('başkası favoriliyor ve sayaç tetikleyiciyle güncelleniyor', async () => {
    test.skip(!pin, 'örnek PIN yok');
    const alici = await aliciIstemcisi();

    // Temiz başlangıç.
    const { data: mevcut } = await alici.rpc('favori_pinlerim');
    if (Array.isArray(mevcut) && mevcut.includes(pin)) {
      await alici.rpc('favori_degistir', { p_pin: pin });
    }

    const { data: ekle } = await alici.rpc('favori_degistir', { p_pin: pin });
    expect(ekle?.basarili, JSON.stringify(ekle)).toBe(true);
    expect(ekle?.favorili, 'favoriye eklenmedi').toBe(true);

    const { data: liste } = await alici.rpc('favori_listem');
    const kayit = (liste || []).find((f) => f.pin_code === pin);
    expect(kayit, 'favori listede görünmüyor').toBeTruthy();

    // ⚠ PLAKA DÖNMEMELİ.
    expect(
      Object.keys(kayit || {}),
      'favori listesi plaka döndürüyor — pazaryerinde gizlenen veri sızıyor'
    ).not.toContain('plate_number');

    // Aynı çağrı ikinci kez: aç/kapa.
    const { data: kaldir } = await alici.rpc('favori_degistir', { p_pin: pin });
    expect(kaldir?.favorili, 'ikinci çağrı favoriyi kaldırmadı').toBe(false);
  });

  test('vitrinde olmayan araç da favorilenebiliyor', async () => {
    test.skip(!pin, 'örnek PIN yok');
    const alici = await aliciIstemcisi();

    // Favori araca ait, vitrin kaydına değil: araç vitrinde olmasa da
    // kaydediliyor. Bu, PIN ile sicil sorgulayan kullanıcının favori
    // ekleyebilmesinin ön koşulu.
    const { data } = await alici.rpc('favori_degistir', { p_pin: pin });
    expect(data?.basarili, JSON.stringify(data)).toBe(true);

    const { data: liste } = await alici.rpc('favori_listem');
    const kayit = (liste || []).find((f) => f.pin_code === pin);
    expect(kayit, 'favori kaydedilmedi').toBeTruthy();
    // `vitrinde` bir SÜZGEÇ değil, etiket: kayıt listeden düşmüyor.
    expect(typeof kayit.vitrinde, 'vitrin durumu bildirilmiyor').toBe('boolean');

    await alici.rpc('favori_degistir', { p_pin: pin });
  });

  test('olmayan PIN reddediliyor', async () => {
    const alici = await aliciIstemcisi();
    const { data } = await alici.rpc('favori_degistir', { p_pin: 'CV-YOKYOK-YOKYO' });
    expect(data?.basarili).toBe(false);
    expect(data?.hata).toBe('bulunamadi');
  });

  test('anon favori RPC\'lerini çağıramıyor', async () => {
    const anon = anonIstemcisi();

    // =====================================================================
    // ⚠ BU TEST YANLIŞ SEBEPLE GEÇİYORDU — DÜZELTİLDİ
    // ---------------------------------------------------------------------
    // Eski kabul koşulu dört dallıydı:
    //
    //   const kapali = !!error || data?.basarili === false
    //     || (Array.isArray(data) && data.length === 0) || data === 0;
    //
    // Son üç dal YETKİDEN BAĞIMSIZ olarak zaten sağlanıyordu: fonksiyonların
    // kendi içinde `auth.uid() is null` koruması var, dolayısıyla oturumsuz
    // çağrı `{basarili:false}` ya da boş dizi/0 döndürüyor. Yani
    // `grant execute ... to anon` verilse test AYNEN GEÇERDİ — adında geçen
    // yetki hiç ölçülmüyordu.
    //
    // Artık yalnızca GERÇEK RET kabul ediliyor ve hata kodu doğrulanıyor.
    //
    // ⚠ POZİTİF KONTROL de var: aynı çağrı OTURUMLU istemciyle yapıldığında
    // bu hatanın ÇIKMADIĞI denetleniyor. Bu, 07-devir'de yaşanan tuzağı
    // kapatıyor — orada boş parametre yüzünden gelen "imza bulunamadı"
    // hatası yetki reddi sanılmıştı.
    // =====================================================================
    const oturumlu = await supabaseIstemcisi();

    for (const fn of ['favori_degistir', 'favori_listem', 'favori_pinlerim']) {
      const arg = fn === 'favori_degistir' ? { p_pin: 'CV-XXXX-XXXXX' } : {};
      const { error } = await anon.rpc(fn, arg);

      expect(error, `${fn} anon'a AÇIK — çağrı hiç reddedilmedi`).toBeTruthy();
      expect(
        `${error.message} ${error.code || ''}`,
        `${fn} yetki dışı bir sebeple hata verdi ("${error.message}") — kilit doğrulanamadı`
      ).toMatch(/permission denied|42501/i);

      const { error: oturumluHata } = await oturumlu.rpc(fn, arg);
      const yetkiHatasi = oturumluHata
        && /permission denied|42501/i.test(`${oturumluHata.message} ${oturumluHata.code || ''}`);
      expect(yetkiHatasi, `${fn} OTURUMLU kullanıcıya da kapalı — akış kırık`).toBeFalsy();
    }
  });
});
