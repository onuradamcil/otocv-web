// =========================================================================
// 09 · YETKİ KİLİTLERİ
//
// -------------------------------------------------------------------------
// NİYE BU PAKET VAR
// -------------------------------------------------------------------------
// Paywall ekranı kurulduğunda ayrıcalıklar hâlâ istemciden yazılabiliyordu:
// kullanıcı kendi ilanını vitrine çıkarabiliyor, kendine premium verebiliyor
// ve sınırsız araç ekleyebiliyordu. Yani ödeme ekranı bir vitrindi.
//
// Kilitler POLİTİKA DEĞİL TETİKLEYİCİ ile kuruldu, çünkü `vehicles` üzerinde
// INSERT'e izin veren iki permissive politika var ve Postgres onları OR'luyor
// — birine koşul eklemek hiçbir şeye yaramazdı. Bu tuzağa bu projede daha
// önce iki kez düşüldü; test onun geri gelmediğini denetliyor.
//
// -------------------------------------------------------------------------
// BU TESTLER KALICI ARTIK BIRAKMIYOR
// -------------------------------------------------------------------------
// Tüm yazma denemelerinin BAŞARISIZ olması bekleniyor; başarısız yazma satır
// bırakmaz. Tek istisna araç kotası testi: kilit kırılmışsa satır oluşur ve
// `afterAll` onu plakadan siliyor.
//
// `demo_satin_alma` BİLEREK çağrılmıyor: `satin_almalar` üzerinde kullanıcıya
// DELETE hakkı yok, yani üretilen her satın alma kaydı kalıcı çöp olurdu.
// Bu paket yalnızca KAPALI KAPILARI denetliyor.
// =========================================================================

const { test, expect, supabaseIstemcisi, anonIstemcisi } = require('./yardimcilar');

const KOTA_TEST_PLAKA = '99KOTA9999';

test.describe('Yetki kilitleri', () => {

  test.afterAll(async () => {
    // Kilit kırılmışsa oluşan satırları temizle. Kilit çalışıyorsa bunlar
    // hiçbir şey silmiyor — zararsız.
    const sb = await supabaseIstemcisi();
    await sb.from('vehicles').delete().eq('plate_number', KOTA_TEST_PLAKA);
    await sb.from('listings').delete().eq('title', 'Kilit testi');
  });

  // -----------------------------------------------------------------------
  // ARAÇ KOTASI
  //
  // İlk araç ücretsiz, sonrası "ek_arac" satın alması gerektiriyor. Test
  // hesabının zaten birden fazla aracı var, yani yeni kayıt reddedilmeli.
  // -----------------------------------------------------------------------
  test('kotayı aşan araç kaydı reddediliyor', async () => {
    const sb = await supabaseIstemcisi();
    const { data: oturum } = await sb.auth.getUser();

    const { error } = await sb.from('vehicles').insert({
      plate_number: KOTA_TEST_PLAKA,
      km: 1, brand: 'KilitTest', model: 'KilitTest', year: 2020, package: 'T',
      inspection_end_date: '2029-01-01',
      tramer_status: 'Tramer Yok',
      user_id: oturum.user.id,
    });

    expect(error, 'kota uygulanmıyor — sınırsız araç eklenebiliyor').toBeTruthy();
    expect(error.message, 'beklenen kilit hatası gelmedi').toContain('EK_ARAC_GEREKLI');

    // Gerçekten yazılmadığı da doğrulanıyor: hata dönüp satırı yine de yazan
    // bir kurulum olsaydı yalnızca mesaja bakmak yanıltırdı.
    const { count } = await sb
      .from('vehicles').select('plate_number', { count: 'exact', head: true })
      .eq('plate_number', KOTA_TEST_PLAKA);
    expect(count, 'reddedilen araç yine de yazılmış').toBe(0);
  });

  // -----------------------------------------------------------------------
  // VİTRİN
  //
  // `is_featured` ücretli bir ayrıcalık. İstemciden yazılabilmesi, vitrin
  // gelirinin tamamen kaybı demek.
  // -----------------------------------------------------------------------
  // İlk yazımda bu test MEVCUT bir ilanı güncellemeyi deniyordu ve
  // "vitrinde olmayan ilan yok" diye ATLANIYORDU — yani en çok kapsanması
  // gereken kilit hiç sınanmıyordu. Atlanan test, olmayan testtir.
  //
  // INSERT yolu hem her zaman çalıştırılabilir hem de daha sıkı: kilit
  // çalışıyorsa satır hiç oluşmuyor, kırılmışsa `afterAll` temizliyor.
  test('kullanıcı ilanını bedavaya vitrine çıkaramıyor', async () => {
    const sb = await supabaseIstemcisi();
    const { data: oturum } = await sb.auth.getUser();

    // Henüz ilanı olmayan bir araç seçiliyor.
    const { data: ilanlar } = await sb
      .from('listings').select('vehicle_plate').eq('user_id', oturum.user.id);
    const ilanliPlakalar = new Set((ilanlar || []).map((i) => i.vehicle_plate));

    // VİTRİN HAKKI OLAN PLAKALAR DA ELENİYOR.
    //
    // Bu test bir koşumda yanlış alarm verdi: elle doğrulama sırasında
    // paywall'dan geçilmiş ve o plaka için gerçek bir "vitrin" satın alma
    // kaydı oluşmuştu. Test o plakayı seçince ekleme HAKLI OLARAK kabul
    // edildi ve "ilan bedavaya vitrine çıktı" diye kırıldı — oysa kilit
    // doğru çalışıyordu.
    //
    // Testin öncülü "bu plakanın vitrin hakkı YOK" olmalı; öncülü
    // doğrulamak, sonucu doğrulamak kadar önemli.
    const { data: haklar } = await sb
      .from('satin_almalar')
      .select('hedef_plaka')
      .eq('user_id', oturum.user.id)
      .eq('urun_kodu', 'vitrin')
      .eq('durum', 'tamamlandi');
    const hakliPlakalar = new Set((haklar || []).map((h) => h.hedef_plaka).filter(Boolean));
    const harcanmamisHakVar = (haklar || []).some((h) => !h.hedef_plaka);

    const { data: araclar } = await sb
      .from('vehicles').select('plate_number').eq('user_id', oturum.user.id);
    const bosArac = (araclar || []).find(
      (a) => !ilanliPlakalar.has(a.plate_number) && !hakliPlakalar.has(a.plate_number)
    );

    // Harcanmamış bir vitrin hakkı varsa hangi plaka seçilirse seçilsin
    // ekleme kabul edilir; o durumda test bir şey ölçemiyor.
    test.skip(harcanmamisHakVar, 'harcanmamış vitrin hakkı var — kilit ölçülemez');
    expect(bosArac, 'vitrin hakkı olmayan ilansız araç bulunamadı — test kurulamıyor').toBeTruthy();

    const { error } = await sb.from('listings').insert({
      vehicle_plate: bosArac.plate_number,
      user_id: oturum.user.id,
      title: 'Kilit testi',
      description: 'Kilit testi',
      price: 1,
      city: 'Ankara',
      district: 'Çankaya',
      status: 'active',
      is_featured: true,          // ← ücretli ayrıcalık, satın alma kaydı YOK
    });

    expect(error, 'ilan bedavaya vitrine çıktı').toBeTruthy();
    expect(error.message, 'beklenen kilit hatası gelmedi').toContain('VITRIN_GEREKLI');

    // Reddedilen INSERT satır bırakmamalı.
    const { count } = await sb
      .from('listings').select('id', { count: 'exact', head: true })
      .eq('vehicle_plate', bosArac.plate_number);
    expect(count, 'reddedilen ilan yine de yazılmış').toBe(0);
  });

  // -----------------------------------------------------------------------
  // PREMIUM BAYRAĞI
  //
  // Kendine premium verebilmek, tüm kotaların ve ücretlerin tek hamlede
  // atlanması demek.
  // -----------------------------------------------------------------------
  test('kullanıcı kendine premium veremiyor', async () => {
    const sb = await supabaseIstemcisi();
    const { data: oturum } = await sb.auth.getUser();

    await sb.from('profiles').update({ is_premium: true }).eq('id', oturum.user.id);

    const { data: profil } = await sb
      .from('profiles').select('is_premium').eq('id', oturum.user.id).single();

    expect(profil.is_premium, 'kullanıcı kendine premium verdi').not.toBe(true);
  });

  test('kullanıcı başkasının profilini oluşturamıyor', async () => {
    const sb = await supabaseIstemcisi();

    const { error } = await sb.from('profiles').insert({
      id: '00000000-0000-0000-0000-000000000001',
      first_name: 'kilit', last_name: 'test',
    });

    expect(error, 'başkasının profili oluşturulabiliyor').toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // SATIN ALMA KAYITLARI
  //
  // Ayrıcalık bu tablodan türüyor. Yazılabilmesi, tüm kilitlerin
  // anlamsızlaşması demek — kullanıcı kendine satın alma yazar.
  // -----------------------------------------------------------------------
  test('satin_almalar istemciden yazılamıyor', async () => {
    const sb = await supabaseIstemcisi();
    const { data: oturum } = await sb.auth.getUser();

    const { error } = await sb.from('satin_almalar').insert({
      user_id: oturum.user.id,
      urun_kodu: 'ek_arac',
      durum: 'tamamlandi',
    });

    expect(error, 'kullanıcı kendine satın alma yazabiliyor').toBeTruthy();
  });

  test('anon satin_almalar tablosunu okuyamıyor', async () => {
    const { data, error } = await anonIstemcisi().from('satin_almalar').select('id');
    expect(error || (data || []).length === 0, 'anon satın almaları görüyor').toBeTruthy();
  });

  test('anon demo_satin_alma çağıramıyor', async () => {
    const { error } = await anonIstemcisi()
      .rpc('demo_satin_alma', { p_urun_kodu: 'ek_arac' });
    expect(error, 'anon satın alma kaydı üretebiliyor').toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // MEŞRU İŞLEMLER BOZULMADI
  //
  // Kilit koyarken çalışan bir şeyi kırmak, açığı kapatmaktan daha pahalıya
  // patlar. Bu iki test onu denetliyor.
  // -----------------------------------------------------------------------
  test('MEŞRU: kullanıcı kendi profilini güncelleyebiliyor', async () => {
    const sb = await supabaseIstemcisi();
    const { data: oturum } = await sb.auth.getUser();

    const { data: once } = await sb
      .from('profiles').select('first_name').eq('id', oturum.user.id).single();

    // Aynı değer yazılıyor: veriyi değiştirmeden politikanın izin verdiğini
    // ölçmek için.
    const { error } = await sb
      .from('profiles').update({ first_name: once.first_name }).eq('id', oturum.user.id);

    expect(error, 'profil güncellenemiyor — Hesabım ekranı çalışmaz').toBeFalsy();
  });

  test('MEŞRU: kullanıcı kendi satın almalarını okuyabiliyor', async () => {
    const sb = await supabaseIstemcisi();
    const { error } = await sb.from('satin_almalar').select('id, urun_kodu, durum');
    expect(error, 'kullanıcı kendi satın almalarını göremiyor').toBeFalsy();
  });
});
