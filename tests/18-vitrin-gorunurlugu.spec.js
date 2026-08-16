// =========================================================================
// 18 · VİTRİN GÖRÜNÜRLÜĞÜ — PAZARYERİ ZİYARETÇİ İÇİN DE ÇALIŞMALI
//
// -------------------------------------------------------------------------
// NİYE BU PAKET VAR
// -------------------------------------------------------------------------
// Pazaryeri listesi şu sorguyla çekiliyordu:
//
//     from('listings').select('*, vehicles(*)').eq('status','active')
//
// Ama `vehicles` SELECT politikası YALNIZCA SAHİBE açık. Başka bir
// kullanıcı ya da ziyaretçi listeyi çektiğinde `item.vehicles` NULL
// dönüyordu. Sonuç: kartlar marka, model, yıl, km, puan ve görsel olmadan
// çiziliyor; karta tıklanınca `pin_code` undefined olduğu için
// `/details/undefined` açılıyor ve "CV-UNDEFINED koduna ait kayıt
// bulunamadı" hatası veriyordu.
//
// Yani ürünün kamuya bakan yüzü, aracın SAHİBİ dışında hiç kimse için
// çalışmıyordu.
//
// -------------------------------------------------------------------------
// TESTİN ASIL DERSİ: DOĞRU HESAPLA BAKMAK
// -------------------------------------------------------------------------
// Bu arıza yerelde hiç görünmedi çünkü hem testler hem elle doğrulamalar
// aracın SAHİBİ hesabıyla yapılıyordu. Sahte telefon numarasında da aynı
// ders alınmıştı: o da yalnızca `isPublicView` dalında duruyordu.
//
// Bu yüzden aşağıdaki denetim ÜÇ hesabı birden karşılaştırıyor. Tek hesapla
// koşan bir test bu hatayı bir daha yakalamaz.
//
// -------------------------------------------------------------------------
// PLAKA YİNE GİZLİ
// -------------------------------------------------------------------------
// Düzeltme "vitrindekiler herkese okunsun" politikası eklemek DEĞİLDİ: o
// politika `vehicles` satırının tamamını açardı ve satırda `plate_number`
// var. Plaka üründe bilerek gizleniyor. Bu paket plakanın sızmadığını da
// denetliyor.
//
// -------------------------------------------------------------------------
// HİÇBİR YAZMA YOK — CI'DA KOŞUYOR
// =========================================================================

const { test, expect, supabaseIstemcisi, aliciIstemcisi, anonIstemcisi } = require('./yardimcilar');

async function vitrinCek(sb) {
  const { data, error } = await sb.rpc('vitrin_listesi', { p_sehir: null, p_kullanici: null });
  return { kayitlar: Array.isArray(data) ? data : [], error };
}

test.describe('Vitrin görünürlüğü', () => {

  test('ziyaretçi ve başka kullanıcı da araç bilgilerini görüyor', async () => {
    const sahip = await vitrinCek(await supabaseIstemcisi());
    test.skip(sahip.kayitlar.length === 0, 'vitrinde araç yok');

    const alici = await vitrinCek(await aliciIstemcisi());
    const anon = await vitrinCek(anonIstemcisi());

    // ⚠ ASIL DENETİM: üç hesap da AYNI sayıda kayıt görmeli.
    expect(alici.kayitlar.length, 'başka kullanıcı vitrini göremiyor').toBe(sahip.kayitlar.length);
    expect(anon.kayitlar.length, 'ziyaretçi vitrini göremiyor').toBe(sahip.kayitlar.length);

    // Ve kayıtlar DOLU olmalı. Sayının tutması yetmiyor: eski hata tam da
    // "satır geliyor ama içi boş" şeklindeydi.
    for (const [ad, sonuc] of [['alıcı', alici], ['ziyaretçi', anon]]) {
      for (const kayit of sonuc.kayitlar) {
        expect(kayit.pin_code, `${ad} için PIN gelmiyor — karta tıklanınca /details/undefined açılır`).toBeTruthy();
        expect(kayit.brand, `${ad} için marka gelmiyor`).toBeTruthy();
        expect(typeof kayit.trust_score, `${ad} için sicil puanı gelmiyor`).toBe('number');
      }
    }
  });

  test('plaka yalnızca ilan sahibine dönüyor', async () => {
    const sahip = await vitrinCek(await supabaseIstemcisi());
    test.skip(sahip.kayitlar.length === 0, 'vitrinde araç yok');

    const alici = await vitrinCek(await aliciIstemcisi());
    const anon = await vitrinCek(anonIstemcisi());

    // Sahip kendi ilanının plakasını görüyor: "Vitrindeki Araçlarım" ekranı
    // plakayı gösteriyor ve kaldırma işlemi plakayla çalışıyor.
    expect(
      sahip.kayitlar.some((k) => !!k.plate_number),
      'sahip kendi ilanının plakasını göremiyor'
    ).toBe(true);

    // ⚠ ÖNCE SAYI DENETLENİYOR: liste boş dönerse aşağıdaki döngü SIFIR kez
    // koşar ve sızıntı denetimi hiç çalışmadan test geçerdi. `plakaBicimleri`
    // için yazılan dersin aynısı (yardimcilar.js).
    for (const [ad, sonuc] of [['alıcı', alici], ['ziyaretçi', anon]]) {
      expect(
        sonuc.kayitlar.length,
        `${ad} vitrini göremiyor — sızıntı denetimi boş listede vakumlu geçerdi`
      ).toBe(sahip.kayitlar.length);

      for (const kayit of sonuc.kayitlar) {
        expect(kayit.plate_number, `${ad} plakayı görüyor — gizlenen veri sızıyor`).toBeFalsy();
      }
    }
  });

  // =========================================================================
  // ⚠ ATLAMA KOŞULU, ÖLÇÜLEN BÜYÜKLÜKTEN AYRILDI
  // -------------------------------------------------------------------------
  // Eskiden atlama koşulu ZİYARETÇİNİN gördüğü kayıt sayısına bakıyordu:
  //
  //     const { kayitlar } = await vitrinCek(anonIstemcisi());
  //     test.skip(kayitlar.length === 0, 'vitrinde araç yok');
  //
  // Ama bu paketin var oluş sebebi tam olarak "ziyaretçi vitrini göremiyor"
  // arızası. Arıza geri gelseydi ziyaretçi 0 kayıt görür, test DÜŞMEZ
  // SESSİZCE ATLANIRDI — üstelik "vitrinde araç yok" diyerek, oysa vitrinde
  // araç vardı.
  //
  // Artık atlama SAHİBİN gördüğüne bakıyor (gerçekten ilan var mı?) ve
  // ziyaretçinin AYNI SAYIYI görmesi ASSERT ediliyor.
  // =========================================================================
  test('vitrin kartından açılan detay sayfası ziyaretçide çalışıyor', async ({ page }) => {
    const sahip = await vitrinCek(await supabaseIstemcisi());
    test.skip(sahip.kayitlar.length === 0, 'vitrinde gerçekten ilan yok');

    const { kayitlar } = await vitrinCek(anonIstemcisi());
    expect(
      kayitlar.length,
      'ziyaretçi vitrini göremiyor — bu paketin var oluş sebebi olan arıza geri gelmiş'
    ).toBe(sahip.kayitlar.length);

    // Oturum AÇILMIYOR: ziyaretçi yolu deneniyor.
    const pin = kayitlar[0].pin_code;
    await page.goto(`/details/${encodeURIComponent(pin)}`);
    await page.waitForLoadState('networkidle');

    // "Araç bulunamadı" ekranı çıkmamalı.
    await expect(
      page.getByText('Araç bulunamadı'),
      'vitrin kartının PIN kodu detay sayfasında bulunamıyor'
    ).toHaveCount(0);

    await expect(page.getByText('ARAÇ KÜNYESİ')).toBeVisible({ timeout: 20_000 });
  });

  test('vitrin listesi araç sahibinin beyan etmediği vitesi uydurmuyor', async () => {
    const sahip = await vitrinCek(await supabaseIstemcisi());
    test.skip(sahip.kayitlar.length === 0, 'vitrinde gerçekten ilan yok');

    const { kayitlar } = await vitrinCek(anonIstemcisi());
    expect(kayitlar.length, 'ziyaretçi vitrini göremiyor').toBe(sahip.kayitlar.length);

    // Servis katmanı `v.gear_type || 'Otomatik'` yazıyordu ve `gear_type`
    // sütunu `vehicles` tablosunda HİÇ YOK — yani vitesi belirtilmemiş her
    // araç "Otomatik" gösteriliyordu. Sahte telefon/konum ile aynı sınıf.
    for (const kayit of kayitlar) {
      expect(
        Object.keys(kayit),
        'gear_type geri gelmiş — olmayan sütundan uydurma değer üretiliyor'
      ).not.toContain('gear_type');
    }
  });
});


// =========================================================================
// `listings` TABLOSU ZİYARETÇİYE KAPALI
//
// -------------------------------------------------------------------------
// NİYE BU BLOK VAR
// -------------------------------------------------------------------------
// Yukarıdaki testler pazaryeri LİSTESİNİN plaka sızdırmadığını denetliyor.
// Ama liste temiz olsa bile TABLONUN KENDİSİ açıksa koruma yok: politika
// "Herkes ilanları görebilir" SELECT / rol PUBLIC / USING(true) idi ve anon
// anahtarıyla yapılan gerçek bir sorgu şunu döndürdü:
//
//     3 satır · vehicle_plate 3/3 dolu · price bir satırda 100000
//     ayrıca contact_phone, previous_price, tramer_amount
//
// Yani ürünün iki temel kısıtı — plakayı gizlemek ve araç fiyatı
// göstermemek — tek REST çağrısıyla atlanıyordu. `vitrin_listesi` RPC'si
// tam da bunu denetlemek için yazılmıştı; tablo açık kaldığı için
// atlanabiliyordu.
//
// Ders: RPC ile denetlenen her tablo, tablo düzeyinde de kapatılmalı.
// Yoksa RPC bir kapı değil, yalnızca bir öneri oluyor.
//
// ⚠ HİÇBİR YAZMA YOK.
// =========================================================================

test.describe('listings tablosu kapali', () => {
  test('ANON listings tablosunu okuyamiyor', async () => {
    const anon = anonIstemcisi();
    const { data, error } = await anon.from('listings').select('*');

    expect(
      error || (data && data.length === 0),
      'listings tablosu ziyaretçiye açık — plaka ve araç fiyatı tek REST çağrısıyla alınabiliyor'
    ).toBeTruthy();
    expect(data?.length ?? 0).toBe(0);
  });

  test('OTURUMLU kullanici BASKASININ ilanini okuyamiyor', async () => {
    const alici = await aliciIstemcisi();
    const { data: { user } } = await alici.auth.getUser();
    const { data } = await alici.from('listings').select('user_id');

    const yabanci = (data || []).filter((x) => x.user_id !== user.id);
    expect(
      yabanci,
      `başka kullanıcının ilan satırı görünüyor: ${yabanci.length} satır`
    ).toEqual([]);
  });

  test('vitrin RPC hala calisiyor ve plaka/fiyat sizdirmiyor', async () => {
    // Tabloyu kapatmak vitrini bozmamalı: genel okuma security-definer
    // RPC'den geçiyor ve RLS'e tabi değil.
    const anon = anonIstemcisi();
    const { data } = await anon.rpc('vitrin_listesi', { p_sehir: null, p_kullanici: null });
    const kayitlar = Array.isArray(data) ? data : [];

    expect(kayitlar.length, 'tablo kapatılınca vitrin de boşaldı — RPC bozulmuş').toBeGreaterThan(0);
    for (const k of kayitlar) {
      expect(k.plate_number, 'vitrin ziyaretçiye plaka sızdırıyor').toBeFalsy();
      expect(Object.keys(k), 'vitrin araç fiyatı döndürüyor').not.toContain('price');
    }
  });

  test('yazma RPC leri ANON a kapali', async () => {
    const anon = anonIstemcisi();

    const y = await anon.rpc('vitrin_yayinla', {
      p_plaka: 'CV-YOK', p_baslik: 'x', p_aciklama: 'x', p_il: 'x', p_ilce: 'x',
    });
    expect(y.error, 'vitrin_yayinla anon a açık').toBeTruthy();

    const k = await anon.rpc('vitrin_kaldir', { p_plaka: 'CV-YOK' });
    expect(k.error, 'vitrin_kaldir anon a açık').toBeTruthy();
  });

  test('BASKASININ aracini vitrine cikaramiyor / kaldiramiyor', async () => {
    // Sahiplik ARAÇ üzerinden denetleniyor, ilan üzerinden değil. Sebep:
    // devir sonrası ilan satırı hâlâ eski sahipte kalıyor ve ilan üzerinden
    // yapılan denetim orada sessizce başarısız oluyordu.
    const sahip = await supabaseIstemcisi();
    const alici = await aliciIstemcisi();

    const { data: benim } = await sahip.from('listings').select('vehicle_plate').limit(1);
    test.skip(!benim || benim.length === 0, 'sahibin vitrin kaydı yok');
    const plaka = benim[0].vehicle_plate;

    const y = await alici.rpc('vitrin_yayinla', {
      p_plaka: plaka, p_baslik: 'ELE GECIRME', p_aciklama: 'olmamali',
      p_il: 'X', p_ilce: 'Y',
    });
    expect(y.data?.basarili, 'başkası aracı vitrine çıkarabildi').toBe(false);
    expect(y.data?.hata).toBe('sahip_degil');

    const k = await alici.rpc('vitrin_kaldir', { p_plaka: plaka });
    expect(k.data?.basarili, 'başkası aracı vitrinden kaldırabildi').toBe(false);
    expect(k.data?.hata).toBe('sahip_degil');
  });
});
