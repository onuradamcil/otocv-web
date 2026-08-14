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

    for (const [ad, sonuc] of [['alıcı', alici], ['ziyaretçi', anon]]) {
      for (const kayit of sonuc.kayitlar) {
        expect(kayit.plate_number, `${ad} plakayı görüyor — gizlenen veri sızıyor`).toBeFalsy();
      }
    }
  });

  test('vitrin kartından açılan detay sayfası ziyaretçide çalışıyor', async ({ page }) => {
    const { kayitlar } = await vitrinCek(anonIstemcisi());
    test.skip(kayitlar.length === 0, 'vitrinde araç yok');

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
    const { kayitlar } = await vitrinCek(anonIstemcisi());
    test.skip(kayitlar.length === 0, 'vitrinde araç yok');

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
