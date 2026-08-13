// =========================================================================
// 08 · HESAP KAPATMA VE SAHİPSİZ ARAÇ HAVUZU
//
// -------------------------------------------------------------------------
// NİYE BU PAKET VAR
// -------------------------------------------------------------------------
// Ölçüldü: FK düzeltmesinden önce tek bir hesabın silinmesi 10 aracın 9'unu,
// 12 bakım kaydının 11'ini ve 8 fatura dosyasını götürüyordu. Ürünün iş
// modeli sicilin sahibinden bağımsız yaşamasına dayanıyor.
//
// Bu düzeltme sessizce geri alınabilir: bir migration `on delete cascade`
// yazar, bir "şunu da açalım" grant'i kapıyı aralar. Bedeli bir sonraki
// hesap kapatmasında ödenir ve o noktada geri dönüş yoktur.
//
// -------------------------------------------------------------------------
// BU TESTLER HİÇBİR HESABI SİLMİYOR — VE SİLEMEZ
// -------------------------------------------------------------------------
// Canlı veride yedek yok (PITR yok, temel migration yok). Bir güvenlik testi
// "koruma çalışmıyor" varsayımıyla koşar; yıkıcı bir deneme gerçekten yıkar.
// Bu projede tam olarak o oldu: RLS henüz kapalıyken koşan bir test gerçek
// bir bakım kaydını sildi.
//
// Ayrıca teknik olarak da yapamazlar: sahipsiz araç ÜRETMEK service_role
// gerektiriyor (`hesap_kapat` yalnızca ona açık) ve test istemcileri anon ile
// authenticated. Bu bir eksiklik değil, tasarımın kendisi — testin sahipsiz
// araç üretebilmesi, kapının açık olduğu anlamına gelirdi.
//
// Tam yaşam döngüsü (kapat → sahipsiz → talep → onay → ödeme → geri yükle)
// tek kullanımlık bir hesapla, elle, MCP üzerinden doğrulandı ve JSON dökümü
// alınarak yapıldı. Burada doğrulanan şey KAPALI KAPILAR ve SÖZLEŞME.
//
// -------------------------------------------------------------------------
// CI'DA KOŞUYOR
// -------------------------------------------------------------------------
// 05-guvenlik gibi: hiçbir yazma yapmıyor, artık bırakmıyor. Tek "yazma"
// denemesi başarısız olması BEKLENEN bir denemedir (kendi aracını
// sahipsizleştirme) ve başarılı olursa test kırılır.
// =========================================================================

const {
  test,
  expect,
  anonIstemcisi,
  supabaseIstemcisi,
  ORNEK_PLAKA,
} = require('./yardimcilar');

/** RPC çağrısı; yetki/ağ hatasını da veri gibi döndürür. */
async function rpc(istemci, fonksiyon, parametreler) {
  const { data, error } = await istemci.rpc(fonksiyon, parametreler);
  if (error) return { hata_mesaji: error.message };
  return data;
}

test.describe('Hesap kapatma ve sahipsiz araç havuzu', () => {

  // -----------------------------------------------------------------------
  // KAPALI KAPILAR
  //
  // Üç fonksiyon yalnızca service_role'e açık. İstemciden çağrılabilmeleri,
  // sırasıyla şu anlamlara gelirdi:
  //   hesap_kapat            -> herkes herkesin aracını havuza atabilir
  //   fatura_belgelerini_sil -> herkes herkesin belgesini silebilir
  //   sahipsiz_geri_yukle    -> ödeme ve onay kapıları baypas edilir
  // -----------------------------------------------------------------------
  const YONETIM_FONKSIYONLARI = [
    ['hesap_kapat', { p_user_id: '00000000-0000-0000-0000-000000000000' }],
    ['fatura_belgelerini_sil', { p_user_id: '00000000-0000-0000-0000-000000000000' }],
    ['sahipsiz_geri_yukle', { p_istek_id: 1 }],
  ];

  for (const [fonksiyon, parametreler] of YONETIM_FONKSIYONLARI) {
    test(`anon ${fonksiyon} çağıramaz`, async () => {
      const sonuc = await rpc(anonIstemcisi(), fonksiyon, parametreler);
      expect(sonuc.hata_mesaji, `anon ${fonksiyon} çağırabildi`).toBeTruthy();
    });

    test(`oturum açmış kullanıcı ${fonksiyon} çağıramaz`, async () => {
      const sb = await supabaseIstemcisi();
      const sonuc = await rpc(sb, fonksiyon, parametreler);
      expect(sonuc.hata_mesaji, `authenticated ${fonksiyon} çağırabildi`).toBeTruthy();
    });
  }

  // -----------------------------------------------------------------------
  // KENDİ ARACINI SAHİPSİZLEŞTİREMEZ
  //
  // Bu paketteki EN ÖNEMLİ test. Mümkün olsaydı şu oyun açılırdı: kullanıcı
  // aracını havuza atar, sonra "geri yükleme" ücretiyle geri alır ya da
  // anlaştığı alıcı geri alır — devir ücreti atlatılmış olur. Daha kötüsü,
  // aracın PIN'i yenilenip sicili kapanır ve bu geri alınamaz.
  //
  // İki katman koruyor: `vehicles` UPDATE politikasının WITH CHECK'i
  // (auth.uid() = null -> NULL -> reddedilir) ve tetikleyicideki açık
  // auth.uid() kontrolü. Test ikisinin BİRLİKTE sonucunu ölçüyor.
  // -----------------------------------------------------------------------
  test('kullanıcı kendi aracını sahipsiz havuza atamaz', async () => {
    const sb = await supabaseIstemcisi();

    const { data: oncesi } = await sb
      .from('vehicles')
      .select('plate_number, user_id, pin_code, sahipsiz_kaldi_at')
      .eq('plate_number', ORNEK_PLAKA)
      .single();

    expect(oncesi, 'test aracı bulunamadı').toBeTruthy();
    expect(oncesi.user_id, 'test aracının sahibi yok').toBeTruthy();

    const { error } = await sb
      .from('vehicles')
      .update({ user_id: null })
      .eq('plate_number', ORNEK_PLAKA);

    // Hata almak BEKLENEN sonuç. Hata gelmezse bile araç değişmemiş olmalı;
    // ikisini de sınıyoruz çünkü PostgREST bazı durumlarda 0 satır etkileyip
    // sessizce başarılı döner — bu projede tam olarak o yanılgı yaşandı.
    const { data: sonrasi } = await sb
      .from('vehicles')
      .select('user_id, pin_code, sahipsiz_kaldi_at')
      .eq('plate_number', ORNEK_PLAKA)
      .single();

    expect(sonrasi.user_id, 'araç sahipsiz kaldı — kapı açık').toBe(oncesi.user_id);
    expect(sonrasi.sahipsiz_kaldi_at, 'sahipsizlik damgası vuruldu').toBeNull();
    expect(sonrasi.pin_code, 'PIN yenilendi — tetikleyici çalışmış').toBe(oncesi.pin_code);
    expect(error, 'sahipsizleştirme denemesi hata vermedi').toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // SÖZLEŞME: plaka_durumu'nun dördüncü alanı
  //
  // Arayüzdeki mükerrer plaka modalı `sahipsiz` alanına bakarak dördüncü
  // durumu gösteriyor. Alan kaybolursa modal sessizce eski üç duruma döner
  // ve sahipsiz araç yazan kullanıcı "satıcıdan devir kodu isteyin" gibi
  // uygulanamaz bir yönerge görür — satıcı yok.
  // -----------------------------------------------------------------------
  test('plaka_durumu sahipsiz alanını döndürüyor', async () => {
    const sb = await supabaseIstemcisi();
    const sonuc = await rpc(sb, 'plaka_durumu', { p_plaka: ORNEK_PLAKA });

    expect(sonuc.hata_mesaji).toBeFalsy();
    expect(sonuc.kayitli).toBe(true);
    expect(sonuc.benim_mi).toBe(true);
    expect(sonuc, 'sahipsiz alanı yok').toHaveProperty('sahipsiz');
    expect(sonuc.sahipsiz, 'sahibi olan araç sahipsiz görünüyor').toBe(false);
  });

  test('kayıtsız plakada da sahipsiz alanı geliyor', async () => {
    const sb = await supabaseIstemcisi();
    const sonuc = await rpc(sb, 'plaka_durumu', { p_plaka: '99YOK9999' });

    expect(sonuc.kayitli).toBe(false);
    expect(sonuc.sahipsiz).toBe(false);
  });

  // -----------------------------------------------------------------------
  // SAHİPLİ ARAÇ SAHİPSİZ AKIŞINA GİREMEZ
  //
  // Sahipsiz akışı, sahibi olan bir araca uygulanabilseydi ruhsat yükleyen
  // herkes başkasının aracı için başvuru açabilirdi.
  // -----------------------------------------------------------------------
  test('sahipsiz_onizleme sahipli araç hakkında bilgi vermiyor', async () => {
    const sb = await supabaseIstemcisi();
    const sonuc = await rpc(sb, 'sahipsiz_onizleme', { p_plaka: ORNEK_PLAKA });

    expect(sonuc.hata).toBe('arac_sahipsiz_degil');
    // Sızıntı kontrolü: reddederken bile araç bilgisi vermemeli.
    expect(sonuc.marka, 'reddedilen ön izleme marka sızdırdı').toBeUndefined();
    expect(sonuc.kayit, 'reddedilen ön izleme kayıt sayısı sızdırdı').toBeUndefined();
  });

  test('sahipsiz_talep_et sahipli araç için talep açmıyor', async () => {
    const sb = await supabaseIstemcisi();
    const sonuc = await rpc(sb, 'sahipsiz_talep_et', {
      p_plaka: ORNEK_PLAKA,
      p_ruhsat_yolu: 'test/olmayan-ruhsat.png',
    });

    expect(sonuc.hata).toBe('arac_sahipsiz_degil');
  });

  // -----------------------------------------------------------------------
  // RUHSAT ZORUNLU
  //
  // Ele geçirmeyi engelleyen tek kontrol bu. Ödeme kapısı yalnızca bedava
  // geri almayı engelliyor; plakayı bilen birinin başkasının aracını
  // devralmasını engelleyen şey belge doğrulaması. Ruhsat kontrolü aracın
  // durumundan ÖNCE yapılıyor, o yüzden herhangi bir plaka ile sınanabilir.
  // -----------------------------------------------------------------------
  test('sahipsiz_talep_et ruhsat olmadan reddediyor', async () => {
    const sb = await supabaseIstemcisi();

    for (const bosDeger of ['', '   ', null]) {
      const sonuc = await rpc(sb, 'sahipsiz_talep_et', {
        p_plaka: ORNEK_PLAKA,
        p_ruhsat_yolu: bosDeger,
      });
      expect(sonuc.hata, `ruhsat "${bosDeger}" ile geçti`).toBe('ruhsat_gerekli');
    }
  });

  // -----------------------------------------------------------------------
  // ANON'A KAPALI
  //
  // Hepsi zaten `auth.uid() is null` ile başlıyor, ama API yüzeyi gereksiz
  // geniş olmamalı. Bu testin asıl değeri: `revoke ... from public` ile
  // `revoke ... from anon` ikisinin de yazıldığını kanıtlıyor — bu projede
  // biri unutulduğu için iki kez açık kaldı.
  // -----------------------------------------------------------------------
  const OTURUM_GEREKENLER = [
    ['sahipsiz_onizleme', { p_plaka: ORNEK_PLAKA }],
    ['sahipsiz_talep_et', { p_plaka: ORNEK_PLAKA, p_ruhsat_yolu: 'x/y.png' }],
    ['plaka_durumu', { p_plaka: ORNEK_PLAKA }],
    ['devir_talep_et', { p_plaka: ORNEK_PLAKA, p_mesaj: 'test' }],
  ];

  for (const [fonksiyon, parametreler] of OTURUM_GEREKENLER) {
    test(`anon ${fonksiyon} çağıramaz`, async () => {
      const sonuc = await rpc(anonIstemcisi(), fonksiyon, parametreler);
      expect(sonuc.hata_mesaji, `anon ${fonksiyon} çağırabildi`).toBeTruthy();
    });
  }

  // -----------------------------------------------------------------------
  // REGRESYON: normal karne bozulmadı
  //
  // sicil_getir'e sahipsiz dalı eklendi. O dal yanlış koşulla çalışırsa
  // SAHİPLİ araçların karnesi de kapanır — ürünün çekirdeği söner ve bu,
  // hiçbir hata mesajı üretmeden olur.
  // -----------------------------------------------------------------------
  test('sahipli aracın karnesi tam veri döndürmeye devam ediyor', async () => {
    const sb = await supabaseIstemcisi();

    const { data: arac } = await sb
      .from('vehicles').select('pin_code').eq('plate_number', ORNEK_PLAKA).single();

    const sicil = await rpc(anonIstemcisi(), 'sicil_getir', { p_pin: arac.pin_code });

    expect(sicil.hata, 'sahipli araçta karne kapandı').toBeFalsy();
    expect(sicil.arac, 'karne araç bilgisi döndürmedi').toBeTruthy();
    expect(sicil.arac.brand).toBeTruthy();
    expect(Array.isArray(sicil.bakim_kayitlari), 'bakım kayıtları dizi değil').toBe(true);
  });

  // -----------------------------------------------------------------------
  // SAHİPSİZ HAVUZ BOŞ OLMALI
  //
  // Bu bir veri sağlığı kontrolü, davranış testi değil. Sahipsiz araç
  // yalnızca gerçek bir hesap kapatmasıyla oluşur; testler ya da yarım kalmış
  // bir işlem sonucu oluşmuşsa fark edilmeli. RLS gereği sahipsiz araç
  // istemciden GÖRÜNMÜYOR — bu yüzden burada "0 satır" beklemek aynı zamanda
  // görünmezliğin de kanıtı.
  // -----------------------------------------------------------------------
  test('sahipsiz araç istemciden görünmüyor', async () => {
    const sb = await supabaseIstemcisi();

    const { data, error } = await sb
      .from('vehicles')
      .select('plate_number')
      .not('sahipsiz_kaldi_at', 'is', null);

    expect(error).toBeFalsy();
    expect(data, 'sahipsiz araç istemciye görünüyor').toEqual([]);
  });
});
