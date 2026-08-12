// =========================================================================
// 06 · HIZ SINIRI — VARSAYILAN KOŞUMDA ÇALIŞMAZ, BİLEREK
//
// -------------------------------------------------------------------------
// NİYE AYRI DOSYA VE NİYE VARSAYILAN OLARAK KAPALI
// -------------------------------------------------------------------------
// Bu paket sınırı GERÇEKTEN aşıyor: 20'den fazla başarısız PIN sorgusu
// yapıyor. Sonucu, koşumu yapan makinenin IP'sinin 10 DAKİKA boyunca
// engellenmesi. Yani bu testi normal takıma koymak, ondan sonra koşan her
// karne testini kırardı — ve 10 dakika boyunca yeniden koşulamazdı.
//
// Bu, daha önce düştüğüm tuzağın aynısının farklı bir yüzü: bir testin
// başarısızlık ya da yan etki bedeli, test edilen şeyden büyük olmamalı.
// (Bkz. 05-guvenlik.spec.js başındaki yıkıcı test notu.)
//
// -------------------------------------------------------------------------
// NASIL KOŞULUR
// -------------------------------------------------------------------------
//   npx playwright test tests/06-hiz-siniri.spec.js --project=hizsiniri
//
// Koştuktan sonra 10 dakika bekleyin ya da sicil_sorgu_log tablosunu
// temizleyin (panelden: delete from public.sicil_sorgu_log;).
//
// -------------------------------------------------------------------------
// NORMAL KOŞUMDA NE KONTROL EDİLİYOR
// -------------------------------------------------------------------------
// 05-guvenlik.spec.js içindeki testler sınırın NORMAL çalışmayı bozmadığını
// doğruluyor: geçerli PIN araç döndürüyor, `hata` işareti gelmiyor. Sınırın
// gerçekten devreye girdiği bu dosyada, elle koşulur.
// =========================================================================

const {
  test,
  expect,
  anonIstemcisi,
  supabaseIstemcisi,
  aliciIstemcisi,
} = require('./yardimcilar');

test.describe('Hız sınırı gerçekten devreye giriyor', () => {
  test('numaralandırma denemesi engelleniyor', async () => {
    test.setTimeout(120_000);

    const anon = anonIstemcisi();

    let ilkEngelleme = null;
    let sonHata = null;

    // Biçimi GEÇERLİ ama var olmayan PIN'ler. Biçimsiz girdi sayaca
    // girmiyor — fonksiyon onu doğrulama aşamasında, kayıt tutmadan
    // reddediyor. Numaralandırma da biçimi geçerli PIN dener.
    for (let i = 1; i <= 25; i++) {
      const pin = `CV-ZZ${String(i).padStart(3, '0')}-ZZZZZ`;
      const { data } = await anon.rpc('sicil_getir', { p_pin: pin });

      if (data?.hata === 'cok_fazla_deneme') {
        if (ilkEngelleme === null) ilkEngelleme = i;
        sonHata = data;
      }
    }

    expect(ilkEngelleme, '25 başarısız denemede sınır hiç devreye girmedi').not.toBeNull();

    // TAM SAYI KONTROL EDİLMİYOR, BİLEREK.
    //
    // İlk yazımda `toBeGreaterThan(15)` diyordum ve test kırıldı: sayaç bu
    // IP'den daha önce yapılmış sorguları da içeriyor, dolayısıyla engelleme
    // 21. denemeden ÖNCE gelebilir. Testin doğruluğu, koşum anındaki geçmiş
    // trafiğe bağlı olmamalı.
    //
    // Kontrol edilen şey davranışın kendisi: 25 denemeden önce sınır devreye
    // giriyor ve işaret istemcinin beklediği şekilde geliyor.
    expect(ilkEngelleme).toBeLessThanOrEqual(25);

    // İşaretin şekli istemcinin beklediği gibi mi? Bu alan olmadan arayüz
    // "araç bulunamadı" gösterir ve kullanıcıya yanlış bilgi verir.
    expect(sonHata.hata).toBe('cok_fazla_deneme');
    expect(typeof sonHata.yeniden_dene_saniye).toBe('number');
    expect(sonHata.yeniden_dene_saniye).toBeGreaterThan(0);
  });

  test('sınır aşıldıktan sonra GEÇERLİ PIN de engelleniyor', async () => {
    // Bu davranış kasıtlı: sınır IP bazında. Saldırgan arada bir geçerli PIN
    // sorgulayarak sayacı sıfırlayamamalı.
    const anon = anonIstemcisi();

    // Önceki test sınırı aşmış olmalı. Aşmadıysa bu test anlamsız.
    const { data: kontrol } = await anon.rpc('sicil_getir', { p_pin: 'CV-ZZ999-ZZZZZ' });
    test.skip(
      kontrol?.hata !== 'cok_fazla_deneme',
      'IP şu an sınırlı değil — bu testin önce numaralandırma testinin koşması gerekiyor.'
    );

    // Var olduğunu bildiğimiz bir PIN'i sor: yine engellenmeli.
    const { data: araclar } = await anon.rpc('sicil_getir', { p_pin: 'CV-ZZ001-ZZZZZ' });
    expect(araclar?.hata, 'sınırlıyken sorgu geçti').toBe('cok_fazla_deneme');
  });
});

test.describe('Devir kodu oracle testi: ön izleme sayacı paylaşıyor', () => {
  // NİYE BU PAKETTE: bu test kaba kuvvet sayacını KASITEN dolduruyor ve
  // alıcı hesabı 15 dakika boyunca devir işlemi yapamıyor. İlk yazımda
  // 07-devir.spec.js içindeydi ve o paketi kendi kendini tekrar koşulamaz
  // hâle getirdi: arkasındaki testler atlandı, sonraki koşumda öndeki testler
  // kırıldı. Yan etkisi 15 dakika süren bir test, varsayılan takımda duramaz.
  //
  // TEST EDİLEN ŞEY: `devir_onizleme` bir kod oracle'ı — kodun geçerli olup
  // olmadığını söyleyen ücretsiz bir sorgu. `devir_tamamla` ile AYNI sayacı
  // kullanmazsa saldırgan ön izlemede sınırsız kod dener, geçerli olanı bulur
  // ve tek seferde tamamlar; tamamlamadaki sınır hiç devreye girmez.

  test('ön izleme kaba kuvvet frenine tabi ve sayaç devir_tamamla ile ortak', async () => {
    test.setTimeout(120_000);
    const alici = await aliciIstemcisi();

    const rpc = async (fn, a) => {
      const { data, error } = await alici.rpc(fn, a);
      return error ? { hata_mesaji: error.message } : data;
    };

    let ilkEngelleme = null;
    for (let i = 1; i <= 15; i++) {
      const r = await rpc('devir_onizleme', { p_kod: `DV-QQ${String(i).padStart(2, '0')}-QQQQ` });
      if (r?.hata === 'cok_fazla_deneme' && ilkEngelleme === null) ilkEngelleme = i;
    }

    expect(ilkEngelleme, '15 hatalı ön izlemede sınır devreye girmedi').not.toBeNull();

    // ASIL İDDİA: sayaç ORTAK. Ön izlemede dolan sayaç, tamamlamayı da
    // engellemeli. Ayrı sayaçlar olsaydı bu çağrı 'kod_gecersiz' dönerdi.
    const tamam = await rpc('devir_tamamla', { p_kod: 'DV-ZZZZ-ZZZZ' });
    expect(tamam?.hata, 'devir_tamamla AYRI bir sayaç kullanıyor — oracle açık')
      .toBe('cok_fazla_deneme');
  });
});
