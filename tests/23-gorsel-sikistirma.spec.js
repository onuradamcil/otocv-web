// =========================================================================
// YÜKLEME ÖNCESİ GÖRSEL SIKIŞTIRMA
//
// -------------------------------------------------------------------------
// NİYE TEST GEREKİYOR
// -------------------------------------------------------------------------
// Sıkıştırma SESSİZ bir katman: çalışmayı bıraksa hiçbir hata çıkmaz, hiçbir
// ekran bozulmaz. Yalnızca kova şişmeye, trafik artmaya ve mobil yükleme
// yavaşlamaya başlar — aylar sonra fark edilir.
//
// Bu yüzden ölçülüyor: gerçek tarayıcıda, gerçek dosya seçicisiyle, gerçek
// kod yolundan geçirilip önizleme blob'unun BOYUTU ve PİKSEL ÖLÇÜSÜ okunuyor.
// İddia değil ölçüm.
// =========================================================================

const { test, expect, girisYap, girisYapAlici } = require('./yardimcilar');

/**
 * Tarayıcıda gerçek bir telefon fotoğrafını temsil eden JPEG üretir.
 *
 * ⚠ GÜRÜLTÜ ŞART. Düz renkli bir tuval JPEG'de neredeyse hiç yer tutmuyor;
 * onunla ölçüm yapmak sıkıştırmayı olduğundan başarılı gösterirdi. Gürültü
 * gerçek bir fotoğrafın entropisine yakın.
 */
async function fotografUret(page, g, y) {
  const b64 = await page.evaluate(async ({ g, y }) => {
    const c = document.createElement('canvas');
    c.width = g; c.height = y;
    const ctx = c.getContext('2d');
    const im = ctx.createImageData(g, y);
    for (let i = 0; i < im.data.length; i += 4) {
      im.data[i] = Math.random() * 255;
      im.data[i + 1] = Math.random() * 255;
      im.data[i + 2] = Math.random() * 255;
      im.data[i + 3] = 255;
    }
    ctx.putImageData(im, 0, 0);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.95));
    const u8 = new Uint8Array(await blob.arrayBuffer());
    let s = '';
    for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return btoa(s);
  }, { g, y });
  return Buffer.from(b64, 'base64');
}

/** Önizleme blob'unun boyutunu ve piksel ölçüsünü okur. */
async function onizlemeyiOlc(page) {
  return page.evaluate(async () => {
    const im = document.querySelector("img[src^='blob:']");
    if (!im) return null;
    const blob = await (await fetch(im.src)).blob();
    const bmp = await createImageBitmap(blob);
    const sonuc = { bayt: blob.size, tur: blob.type, g: bmp.width, y: bmp.height };
    bmp.close();
    return sonuc;
  });
}

async function fotografAlaniniAc(page) {
  await girisYap(page);
  await page.goto('/add-vehicle/step1');
  await page.waitForLoadState('networkidle');

  // ⚠ SEÇİCİ `accept` DEĞERİNE BAĞLANMIYOR.
  //
  // Eskiden `input[type='file'][accept='image/*']` yazıyordu. `accept`
  // kovanın kabul listesine daraltılınca (`image/jpeg,png,webp,heic`) bu
  // seçici hiçbir şeyle eşleşmedi ve iki test `setInputFiles` zaman aşımıyla
  // düştü — ölçtükleri davranış hiç bozulmamıştı, yalnızca seçici eskimişti.
  //
  // `multiple` daha dayanıklı bir çıpa: projede çoklu dosya kabul eden tek
  // girdi bu (fatura, ruhsat ve profil görseli tek dosya alıyor) ve bu
  // özellik "aynı anda birden fazla fotoğraf" ürün kararına bağlı, biçim
  // listesine değil.
  return page.locator("input[type='file'][multiple]").first();
}

test.describe('Yükleme öncesi görsel sıkıştırma', () => {
  test('büyük fotoğraf 1920 px WebP olarak küçültülüyor', async ({ page }) => {
    test.setTimeout(180_000);
    const girdi = await fotografAlaniniAc(page);

    // 4000x3000 ≈ 12 MP: bugünün orta seviye telefon kamerası.
    const ham = await fotografUret(page, 4000, 3000);
    await girdi.setInputFiles({
      name: 'telefon-fotografi.jpg', mimeType: 'image/jpeg', buffer: ham,
    });

    await expect(page.locator("img[src^='blob:']").first()).toBeVisible({ timeout: 90_000 });
    const olcum = await onizlemeyiOlc(page);

    console.log(
      `\n  ham: ${(ham.length / 1024 / 1024).toFixed(2)} MB` +
      ` -> ${(olcum.bayt / 1024).toFixed(0)} KB (${olcum.tur}, ${olcum.g}x${olcum.y})` +
      `  kazanç: %${((1 - olcum.bayt / ham.length) * 100).toFixed(1)}\n`
    );

    // Uzun kenar hedefte, oran korunmuş.
    expect(olcum.g).toBe(1920);
    expect(olcum.y).toBe(1440);
    // WebP seçildi (JPEG'e düşülmedi).
    expect(olcum.tur).toBe('image/webp');
    // ⚠ ASIL İDDİA: dosya küçüldü. Bu satır düşerse sıkıştırma çalışmıyor.
    expect(olcum.bayt).toBeLessThan(ham.length);
  });

  test('küçük fotoğraf BÜYÜTÜLMÜYOR', async ({ page }) => {
    test.setTimeout(180_000);
    const girdi = await fotografAlaniniAc(page);

    // 640x480: hedefin (1920) çok altında. Hedefe şişirilirse hem dosya
    // büyür hem görüntü bulanıklaşır — iki yönlü kayıp.
    const ham = await fotografUret(page, 640, 480);
    await girdi.setInputFiles({
      name: 'kucuk.jpg', mimeType: 'image/jpeg', buffer: ham,
    });

    await expect(page.locator("img[src^='blob:']").first()).toBeVisible({ timeout: 90_000 });
    const olcum = await onizlemeyiOlc(page);

    console.log(`\n  küçük dosya: ${olcum.g}x${olcum.y}, ${(olcum.bayt / 1024).toFixed(0)} KB\n`);

    // Ölçü hiç büyümedi.
    expect(olcum.g).toBe(640);
    expect(olcum.y).toBe(480);
    // Boyut da büyümedi: kazanç yoksa `gorselSikistir` orijinali koruyor.
    expect(olcum.bayt).toBeLessThanOrEqual(ham.length);
  });

  // =======================================================================
  // PROFİL GÖRSELİ — BU BİR HATA DÜZELTMESİNİN TESTİ
  //
  // `avatarYukle` 2 MB üstü dosyayı reddediyor. Telefon fotoğrafı neredeyse
  // her zaman 2 MB'ın üstünde olduğundan özellik FİİLEN ÇALIŞMIYORDU:
  // kullanıcı görsel koymayı deniyor, "2 MB'den küçük olmalı" hatasını alıyor
  // ve elinde küçültecek hiçbir araç yok.
  //
  // Sıkıştırma yüklemeden ÖNCE koştuğu için dosya sınırın altına iniyor.
  // Bu test o düzeltmenin geri alınmasını yakalar.
  // =======================================================================
  test('2 MB üstü profil görseli artık reddedilmiyor', async ({ page }) => {
    test.setTimeout(180_000);

    // ⚠ İKİNCİ (ATILABİLİR) HESAP — BU BİR VERİ KAYBI ONARIMI.
    // Bu test `girisYap` ile BİRİNCİ hesaba giriyordu ve o hesap ürün
    // sahibinin GERÇEK hesabı. Aşağıda üretilen şey rastgele RGB gürültüsü;
    // yani suit her koştuğunda gerçek profil fotoğrafı gürültüyle
    // DEĞİŞTİRİLİYORDU. `avatarYukle` yeni yolu yazdıktan sonra eskisini
    // sildiği için orijinal geri getirilemiyor.
    // Kanıtlandı: hesabın avatarı 512x375 WebP ve içeriği gri gürültü.
    // Kullanıcıya görünen belirti "görseli değiştiriyorum ama kaydedilmiyor"
    // idi — kayıt çalışıyordu, üstüne bu test yazıyordu.
    await girisYapAlici(page);
    await page.goto('/account');
    await page.waitForLoadState('networkidle');

    // 3000x2200 gürültü ≈ 6-7 MB: eski kodun kesin reddettiği boyut.
    const ham = await fotografUret(page, 3000, 2200);
    expect(ham.length, 'test verisi 2 MB sınırının üstünde olmalı').toBeGreaterThan(2 * 1024 * 1024);
    console.log(`\n  profil görseli ham: ${(ham.length / 1024 / 1024).toFixed(2)} MB`);

    await page.locator("input[type='file'][accept='image/jpeg,image/png,image/webp']").setInputFiles({
      name: 'profil.jpg', mimeType: 'image/jpeg', buffer: ham,
    });

    // ⚠ DENETİM "2 MB" DİZESİNE DEĞİL, HATA CÜMLESİNE BAKIYOR.
    //
    // Önce `text=2 MB` aranıyordu ve bu yanlıştı: alanın yardımcı metni de
    // üst sınırı yazıyor ("büyük görseller otomatik küçültülür (üst sınır
    // 2 MB)"). Yani test, hata olmasa bile o sabit metne takılıp düşüyordu —
    // ölçmek istediği şeyle alakasız bir sebeple.
    //
    // `avatarYukle` reddettiğinde bastığı cümle: "Görsel 2 MB'den küçük
    // olmalı." Yalnızca ona bakmak, yardımcı metinle çakışmıyor.
    await expect(page.locator('text=küçük olmalı')).toHaveCount(0, { timeout: 60_000 });

    // Ve görsel gerçekten yerine oturmalı: "Değiştir" düğmesi ancak görsel
    // varken beliriyor (yoksa "Görsel yükle" yazıyor).
    await expect(page.getByRole('button', { name: 'Değiştir' })).toBeVisible({ timeout: 60_000 });
    console.log('  profil görseli kabul edildi\n');

    // ⚠ TEST KENDİ ÇÖPÜNÜ TOPLUYOR. Yüklenen gürültü bırakılırsa hesapta
    // kalıcı olarak duruyor ve kovada yetim dosya birikiyor. Projenin
    // yerleşik kuralı: test ne yarattıysa geri alır.
    await page.getByRole('button', { name: 'Kaldır' }).click();
    await expect(page.getByRole('button', { name: 'Görsel yükle' }))
      .toBeVisible({ timeout: 30_000 });
  });
});
