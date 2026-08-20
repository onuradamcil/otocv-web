// =========================================================================
// 25 · ANASAYFA — SÜZGEÇLER GERÇEKTEN SÜZÜYOR
//
// -------------------------------------------------------------------------
// NİYE BU PAKET VAR
// -------------------------------------------------------------------------
// Anasayfanın etkileşimli kısmının TAMAMI süstü. `filteredListings`
// hesaplanıyor ama hiçbir yerde çizilmiyordu; ızgara `displayedVitrinListings`
// (yalnızca öne çıkanlar) basıyordu. Sonuç: arama kutusu, marka çipleri, yıl
// aralığı ve hızlı süzgeçler tıklanınca RENGİ DEĞİŞİYOR, `aria-pressed`
// güncelleniyor — ve listede tek kart değişmiyordu.
//
// Bu hatanın en sinsi yanı buydu: görsel geri bildirim doğru olduğu için
// kullanıcı "site bozuk" değil, "bu markada araç yok" diye anlıyordu. Yani
// sessizce YANLIŞ BİR SONUÇ veriyordu.
//
// İkinci hata arama gönderimindeydi: `pinNormalize("bmw")` -> `CV-BMW` ve kod
// bunu geçerli sayıp `/karne/CV-BMW`'ye yönlendiriyordu. Marka arayan
// kullanıcı var olmayan bir karne sayfasına düşüyordu.
//
// ⚠ BU TESTLER DAVRANIŞA BAKIYOR, SINIF ADINA DEĞİL. Süzgeç arayüzü ileride
// yeniden tasarlanabilir; değişmemesi gereken şey "tıklayınca liste süzülür".
// =========================================================================

// `girisYap` ve `supabaseIstemcisi` KALDIRILDI: garaj şeridi testi çıktı
// (bölüm ürün sahibinin kararıyla kaldırıldı) ve kalan testlerin hiçbiri
// oturum gerektirmiyor — anasayfa ziyaretçiye açık.
const { test, expect, izgaraYerlessin } = require('./yardimcilar');

/**
 * Izgaradaki KART sayısı.
 *
 * ⚠ ÖNCEKİ HÂLİ KUSURLUYDU: `page.locator('main img, img').count()` yani
 * sayfadaki HER görseli sayıyordu. İki yönlü yanlıştı:
 *   · Anasayfaya herhangi bir görsel eklenmesi (hero, logo, illüstrasyon)
 *     testi hiçbir davranış bozulmadan kırıyordu.
 *   · `AracGorseli` görsel yokken `<span>GÖRSEL YOK</span>` basıyor
 *     (`AracGorseli.jsx:109`) — yani görselsiz kartlar HİÇ sayılmıyordu.
 *     "Kart sayısı" ölçtüğünü sanan bir ölçüm, aslında görsel sayıyordu.
 *
 * Doğru çıpa kartın kendi erişilebilir adı: her vitrin kartı
 * `role="button"` ve `aria-label="… — sicilini görüntüle"` taşıyor.
 */
async function kartSayisi(page) {
  return page.locator('[role="button"][aria-label*="sicilini görüntüle"]').count();
}

// =========================================================================
// ⚠ BU PAKET ARTIK `/arama` EKRANINDA KOŞUYOR — ANASAYFADA DEĞİL
//
// Ürün sahibinin kararıyla anasayfa bir TEŞHİR yüzeyi oldu: vitrin katmanını
// gösteriyor ve SÜZÜLMÜYOR. Süzgeçten bir seçim yapmak kullanıcıyı `/arama`
// ekranına götürüyor; süzme orada yapılıyor.
//
// Testler silinmedi, İDDİALAR TAŞINDI: aşağıdaki her iddia hâlâ geçerli,
// yalnızca doğru yüzeyde sınanıyor. Anasayfanın kendi davranışı (seçim →
// yönlendirme, ızgaranın süzülmemesi) ayrı bir pakette.
// =========================================================================
test.describe('Süzgeçler · /arama ekranı', () => {
  // ⚠ ESKİ HÂLİ "MARKA süzgeci" idi. Marka listesi kaldırıldı (ürün sahibinin
  // kararı; referans siteler de anasayfada marka listesi göstermiyor). Ama
  // eski testin seçicisi zaten KUSURLUYDU:
  //     page.locator('aside').getByRole('button').filter({hasText:/\(\d+\)$/})
  // Bu, marka'ya İZOLE DEĞİL — "Yalnızca öne çıkanlar (2)" anahtarını, sicil
  // bantlarını, şehir/yakıt/vites satırlarını da yakalıyordu. Grup sırası
  // değişse başka bir süzgece tıklardı ve test bunu fark etmezdi.
  //
  // Yeni test bir GRUBU adıyla açıp içindeki seçeneğe tıklıyor: hangi süzgece
  // dokunduğu belirsiz değil.
  test('ŞEHİR süzgeci ızgarayı gerçekten süzüyor', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/arama');
    await page.waitForLoadState('networkidle');
    await izgaraYerlessin(page);

    const once = await kartSayisi(page);
    test.skip(once < 2, 'süzülecek kadar araç yok (en az 2 gerekiyor)');

    // Akordiyon başlığı: tek seçeneği olan gruplar hiç çizilmiyor.
    const baslik = page.getByRole('button', { name: 'Şehir' });
    test.skip(await baslik.count() === 0, 'şehir grubu yok (tek seçenek)');
    await baslik.first().click();
    await page.waitForTimeout(400);

    // ⚠ SEÇİCİ GRUBUN GÖVDESİNE KİLİTLENDİ — `aside` kapsamı ARTIK YETMİYOR.
    //
    // Eski hâli `page.locator('aside').getByRole('button').filter(/\(\d+\)$/)`
    // idi. Marka ağacı eklenince onun kademe satırları da "(N)" ile bitiyor VE
    // DOM'da Şehir grubundan ÖNCE geliyor: kapsamsız seçici bir MARKA satırına
    // tıklardı, kart sayısı yine azalırdı ve test YEŞİL yanardı — şehir
    // süzgeci hiç sınanmadan. Testin kendi 49-58. satırlarındaki uyarının
    // aynı hatası, bu kez marka listesi geri geldiği için.
    //
    // Akordiyonun mevcut `aria-controls` bağı doğru çıpayı veriyor.
    // `[id="..."]` biçimi zorunlu: `useId()` çıktısı CSS `#id` seçicisinde
    // geçersiz karakter taşıyor.
    const govdeId = await baslik.first().getAttribute('aria-controls');
    const secenek = page.locator(`[id="${govdeId}"]`).getByRole('button')
      .filter({ hasNotText: /^Tümü/ })
      .filter({ hasText: /\(\d+\)$/ });
    const adet = await secenek.count();
    test.skip(adet === 0, 'şehir seçeneği yok');

    let secildi = false;
    for (let i = 0; i < adet; i++) {
      const etiket = (await secenek.nth(i).innerText()).replace(/\s+/g, ' ');
      const m = etiket.match(/\((\d+)\)/);
      if (m && Number(m[1]) > 0 && Number(m[1]) < once) {
        await secenek.nth(i).click();
        secildi = true;
        break;
      }
    }
    test.skip(!secildi, 'toplamdan az sonuç veren seçenek bulunamadı');

    await page.waitForTimeout(800);
    expect(
      await kartSayisi(page),
      'süzgeç tıklandı ama ızgara değişmedi — ızgara süzülmüş listeye bağlı değil'
    ).toBeLessThan(once);
  });

  // KİLOMETRE — YENİ SÜZGEÇ. `km` alanı RPC'den geliyordu ama hiçbir yerde
  // kullanılmıyordu; bu test onun gerçekten bağlandığını kanıtlıyor.
  test('KİLOMETRE aralığı ızgarayı süzüyor', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/arama');
    await page.waitForLoadState('networkidle');
    await izgaraYerlessin(page);

    const once = await kartSayisi(page);
    test.skip(once < 1, 'araç yok');

    await page.getByRole('button', { name: 'Kilometre' }).first().click();
    await page.waitForTimeout(400);

    // Hiçbir aracın sağlamayacağı bir taban: liste boşalmalı.
    await page.getByLabel('En az kilometre').fill('99999999');
    await page.waitForTimeout(700);

    expect(
      await kartSayisi(page),
      'kilometre alt sınırı verildi ama ızgara değişmedi — km süzgeci bağlı değil'
    ).toBe(0);
  });

  // AKORDİYON DAVRANIŞI — grup başlığı içeriği açıp kapatıyor.
  test('akordiyon başlığı grubu açıp kapatıyor', async ({ page }) => {
    await page.goto('/arama');
    await page.waitForLoadState('networkidle');
    await izgaraYerlessin(page);

    const baslik = page.getByRole('button', { name: 'Kilometre' }).first();
    // Kilometre KAPALI geliyor (yalnızca ilk iki grup açık).
    await expect(baslik).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByLabel('En az kilometre')).toHaveCount(0);

    await baslik.click();
    await expect(baslik).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByLabel('En az kilometre')).toBeVisible();

    await baslik.click();
    await expect(baslik).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByLabel('En az kilometre')).toHaveCount(0);
  });

  // =======================================================================
  // MARKA AĞACI — KATALOG TABANLI KADEMELİ SÜZGEÇ
  //
  // ⚠ AĞACIN KAYNAĞI DEĞİŞTİ. Dallar eskiden ENVANTERDEN (vitrindeki
  // araçlardan) türetiliyordu; ürün sahibi bunu reddetti:
  //
  //   "Skoda'dan bir araç vitrine çıkmış diye süzgeçe Skoda eklemişsin.
  //    O aracın vitrin süresi dolunca markayı süzgeçten mi kaldıracağız?"
  //
  // Artık dallar `car_brands/car_series/car_models/car_packages`
  // tablolarından geliyor (49/822/3.591/23.138). Bu testin ASIL denetlediği
  // şey de bu: envanterde HİÇ ARACI OLMAYAN bir markanın süzgeçte görünmesi.
  // Eski envanter-tabanlı ağaçta o marka listede YOKTU — test o kodda düşer.
  //
  // ⚠ SAYAÇ DENETİMİ KALDIRILDI. Eski hâli her dalın `(N)` ile bitmesini
  // şart koşuyordu; katalogda "kaç araç var" bilgisi yok ve ürün sahibi
  // sayaç istemedi ("sitemiz çok büyüdüğünde yaparız").
  // =======================================================================
  test('MARKA ağacı katalogtan geliyor, kademe kademe süzüyor', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/arama');
    await page.waitForLoadState('networkidle');
    await izgaraYerlessin(page);

    const once = await kartSayisi(page);
    test.skip(once < 2, 'ağaç sınanacak kadar araç yok (en az 2 gerekiyor)');

    const kutu = page.locator('aside').getByRole('button', { name: 'Marka' }).first();
    await expect(kutu, 'marka ağacı kutusu yok').toHaveCount(1);
    const govdeId = await kutu.getAttribute('aria-controls');
    const govde = page.locator(`[id="${govdeId}"]`);
    if ((await kutu.getAttribute('aria-expanded')) === 'false') await kutu.click();

    // Kademe satırları: kırıntıdaki "Tüm markalar" hariç her düğme.
    const satirlar = () => govde.locator('button').filter({ hasNotText: /^Tüm markalar$/ });
    await expect.poll(
      () => satirlar().count(),
      { timeout: 15_000, message: 'marka kademesi katalogtan dolmadı' }
    ).toBeGreaterThan(20);

    // 1) ⚠ ASIL DENETİM: envanterde aracı OLMAYAN marka da listede.
    //    Katalogda 49 marka var, envanterde bir avuç. Eski ağaç yalnızca
    //    araçtan türeyen markaları çizdiği için bu iddia orada düşer.
    const etiketler = (await satirlar().allInnerTexts()).map((t) => t.trim());
    expect(
      etiketler.length,
      `katalog markaları gelmedi (${etiketler.length} satır): ağaç hâlâ envanterden mi türüyor?`
    ).toBeGreaterThan(20);

    // 2) Sayaç YOK — hiçbir dal "(N)" ile bitmiyor.
    const sayacli = etiketler.filter((t) => /\(\d+\)$/.test(t));
    expect(sayacli, `ağaçta sayaç var: ${sayacli.slice(0, 3).join(', ')}`).toEqual([]);

    // 3) Aracı OLAN bir markaya tıklayınca ızgara süzülüyor VE alt kademe
    //    açılıyor. Hangi markanın aracı olduğu envantere bağlı; toplamdan az
    //    sonuç veren ilkini arıyoruz.
    let secilen = null;
    for (const ad of etiketler) {
      // ⚠ `getByRole(..., { exact: true })` — elle RegExp KURULMUYOR.
      // Marka adlarında `.` ve `-` gibi regex anlamı olan karakterler var
      // (Alfa Romeo, Mercedes-Benz, D.S. Automobiles); kaçış zinciri hem
      // okunmaz hem kırılgandı. Playwright'ın kendi tam eşleşmesi bunu
      // zaten doğru yapıyor.
      const dugme = govde.getByRole('button', { name: ad, exact: true }).first();
      if (!(await dugme.count())) continue;
      await dugme.click();
      await page.waitForTimeout(900);
      const sonra = await kartSayisi(page);
      if (sonra > 0 && sonra < once) { secilen = ad; break; }
      // Bu markanın aracı yok: köke dönüp sıradakine bak.
      await govde.getByRole('button', { name: 'Tüm markalar' }).click();
      await page.waitForTimeout(600);
    }
    test.skip(!secilen, 'envanterde hiçbir markaya ait araç bulunamadı');

    expect(
      await kartSayisi(page),
      `"${secilen}" seçildi ama ızgara süzülmedi — ağaç gezinme yapıyor, süzmüyor`
    ).toBeLessThan(once);

    await expect(
      govde.getByRole('button', { name: 'Tüm markalar' }),
      'kırıntı yolu çizilmedi — kullanıcının geri dönüş yolu yok'
    ).toHaveCount(1);
    await expect.poll(
      () => satirlar().count(),
      { timeout: 15_000, message: 'alt kademe (seri) açılmadı' }
    ).toBeGreaterThan(0);

    // 4) Kökteki halka süzgeci tamamen geri alıyor.
    await govde.getByRole('button', { name: 'Tüm markalar' }).click();
    await page.waitForTimeout(900);
    expect(
      await kartSayisi(page),
      'kırıntıdan köke dönüldü ama ızgara eski hâline gelmedi'
    ).toBe(once);
  });

  test('ARAMA `/arama` ekranında listeyi süzüyor', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/arama');
    await page.waitForLoadState('networkidle');
    await izgaraYerlessin(page);

    const kutu = page.getByLabel(/PIN ile ara/i);
    await expect(kutu).toBeVisible();

    // ⚠ ARAMA ARTIK YERİNDE SÜZMÜYOR, GÖNDERİLİYOR.
    // Kutu koyu kahraman bloğundan başlık şeridine taşındı (blok
    // kaldırıldı). Şerit her sayfada olduğu için arama yazarken değil
    // ENTER ile çalışıyor — büyük sitelerdeki ve bu projede örnek alınan
    // iki rakipteki davranışın aynısı. İddia zayıflamadı: hiçbir araçla
    // eşleşmeyen metin yine listeyi boşaltmalı.
    await kutu.fill('zzzbulunmayanmarka');
    await kutu.press('Enter');
    await page.waitForURL(/q=zzzbulunmayanmarka/, { timeout: 15_000 });
    await expect(page.getByText(/süzgeçlerle araç bulunamadı/i))
      .toBeVisible({ timeout: 15_000 });
    expect(
      await kartSayisi(page),
      'aramaya rağmen ızgara değişmedi — arama listeyi süzmüyor'
    ).toBe(0);
  });

  test('boş sonuçta SÜZGEÇ mesajı gösteriliyor, "vitrin boş" değil', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/arama');
    await page.waitForLoadState('networkidle');
    await izgaraYerlessin(page);

    const kutu2 = page.getByLabel(/PIN ile ara/i);
    await kutu2.fill('zzzbulunmayanmarka');
    await kutu2.press('Enter');   // arama gönderiliyor, yerinde süzmüyor

    // Boş durum iki ayrı şey olabilir ve ikisi aynı cümleyi hak etmiyor:
    // süzgeçle daraltıp sonuç bulamayan kullanıcıya "vitrinde araç yok"
    // demek, vitrinin boş olduğunu düşündürüyordu.
    await expect(page.getByText(/süzgeçlerle araç bulunamadı/i)).toBeVisible({ timeout: 15_000 });
  });
});

// =========================================================================
// ANASAYFA · TEŞHİR YÜZEYİ VE YÖNLENDİRME
//
// Ürün sahibinin senaryosu:
//   · Anasayfa vitrin katmanını gösteriyor ve SÜZÜLMÜYOR.
//   · Arama kutusuna yazıp Enter -> `/arama?q=...`
//   · Süzgeçten seçim -> `/arama?marka=...` (seçim orada işaretli)
//
// ⚠ ESKİ İDDİA KORUNUYOR: PIN OLMAYAN bir girdiyle Enter, var olmayan bir
// karne sayfasına GÖTÜRMEMELİ (`pinNormalize` her girdiye `CV-` ekliyordu).
// =========================================================================
test.describe('Anasayfa · teşhir ve yönlendirme', () => {
  test('arama kutusuna yazmak ANASAYFA ızgarasını DEĞİŞTİRMİYOR', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await izgaraYerlessin(page);

    const once = await kartSayisi(page);
    test.skip(once === 0, 'vitrinde araç yok');

    await page.getByLabel(/PIN ile ara/i).fill('zzzbulunmayanmarka');
    await page.waitForTimeout(1200);

    expect(
      await kartSayisi(page),
      'anasayfa ızgarası aramadan etkilendi — anasayfa teşhir yüzeyi, süzülmemeli'
    ).toBe(once);
  });

  test('Enter `/arama` ekranına götürüyor, KARNEYE GÖTÜRMÜYOR', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await izgaraYerlessin(page);

    await page.getByLabel(/PIN ile ara/i).fill('bmw');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    expect(
      page.url(),
      'marka yazıp Enter tuşuna basmak kullanıcıyı var olmayan bir karne '
      + 'sayfasına götürüyor (pinNormalize her girdiye CV- öneki ekliyor)'
    ).not.toContain('/karne/');

    expect(page.url(), 'Enter sonuç ekranına götürmedi').toContain('/arama');
    expect(decodeURIComponent(page.url()), 'arama metni adrese taşınmadı').toContain('q=bmw');
  });

  test('süzgeçten MARKA seçmek `/arama` ekranına götürüyor', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await izgaraYerlessin(page);

    const kutu = page.locator('aside').getByRole('button', { name: 'Marka' }).first();
    test.skip(await kutu.count() === 0, 'marka grubu yok');
    const govdeId = await kutu.getAttribute('aria-controls');
    const govde = page.locator(`[id="${govdeId}"]`);

    const satirlar = govde.locator('button').filter({ hasNotText: /^Tüm markalar$/ });
    await expect.poll(() => satirlar.count(), { timeout: 20_000 }).toBeGreaterThan(0);

    const ad = (await satirlar.first().innerText()).trim();
    await satirlar.first().click();
    await page.waitForTimeout(2500);

    expect(page.url(), 'marka seçimi sonuç ekranına götürmedi').toContain('/arama');
    expect(
      decodeURIComponent(page.url()).toLowerCase(),
      `seçilen marka (${ad}) adrese taşınmadı`
    ).toContain('marka=');
  });
});



test.describe('Anasayfa · yapı ve erişilebilirlik', () => {
  test('başlık sırası atlama yapmıyor (h1 -> h2 -> h3)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await izgaraYerlessin(page);

    const seviyeler = await page.locator('h1,h2,h3,h4,h5,h6').evaluateAll(
      (ler) => ler.map((e) => Number(e.tagName[1]))
    );

    // Anasayfa h1'den doğrudan h4'e atlıyordu ve ana içerikte hiç h2 yoktu;
    // h2 yalnızca footer sütun başlıklarındaydı. Projenin kendi kuralı bu
    // atlamayı yasaklıyor (Footer.jsx:16-20).
    const atlamalar = [];
    let onceki = 0;
    for (const s of seviyeler) {
      if (onceki && s > onceki + 1) atlamalar.push(`h${onceki} -> h${s}`);
      onceki = s;
    }

    expect(atlamalar, `başlık seviyesi atlanıyor: ${atlamalar.join(', ')}`).toEqual([]);
    expect(await page.locator('h1').count(), 'anasayfada tam bir h1 olmalı').toBe(1);
  });

  test('dokunma hedefleri 44 px eşiğini geçiyor', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await izgaraYerlessin(page);

    // `dugme.js:41` 44 px'i WCAG dokunma alanı asgarisi olarak ilan ediyor.
    // Ölçülmüştü: anasayfada masaüstünde 24, mobilde 16 öge bunun altındaydı
    // — "Giriş Yap" 49x16, "Hesap Aç" 53x16 gibi dönüşümün en önemli iki
    // bağlantısı dahil.
    const kucukler = await page.locator('button, a[href]').evaluateAll((ler) =>
      ler
        .filter((e) => {
          const r = e.getBoundingClientRect();
          const s = getComputedStyle(e);
          if (String(e.className || '').includes('sr-only')) return false;
          // Gizli atlama bağlantısı gibi 1px'lik konumlanmış ögeler muaf.
          if (s.position === 'absolute' && (r.width <= 1 || r.height <= 1)) return false;

          // ⚠ NEXT.JS GELİŞTİRME KATMANI MUAF — bizim ögemiz değil.
          // `next dev` sayfaya kendi "Open Next.js Dev Tools" düğmesini
          // basıyor (32x32 ölçüldü) ve üretim çıktısında hiç bulunmuyor.
          // Onu saymak, kendi kodumuzda olmayan bir hatayı raporlamak olurdu.
          // (`04-mobil.spec.js` bu düğmeye takılmıyor çünkü eşiği 24 px.)
          if (e.closest('nextjs-portal, [data-nextjs-dialog], #__next-build-watcher')) return false;
          const ad = (e.innerText || e.getAttribute('aria-label') || '');
          if (/Next\.js Dev Tools|Next\.js|issues overlay/i.test(ad)) return false;

          return r.width > 0 && r.height > 0 && (r.height < 44 || r.width < 44);
        })
        .map((e) => {
          const r = e.getBoundingClientRect();
          const ad = (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 24);
          return `${Math.round(r.width)}x${Math.round(r.height)} ${ad}`;
        })
    );

    expect(
      kucukler,
      `44 px altında dokunma hedefi var: ${kucukler.join(' | ')}`
    ).toEqual([]);
  });

  // =======================================================================
  // GARAJ ŞERİDİ — ZİYARETÇİYE HİÇBİR SORGU ATILMIYOR
  //
  // Oturumlu kullanıcıya anasayfada kendi garajından bir şerit gösteriliyor.
  // Bunun iki katı riski var ve ikisi de test edilmeli:
  //
  //   1. Ziyaretçiye şerit GÖSTERİLMEMELİ (verisi yok).
  //   2. Ziyaretçi için SORGU ATILMAMALI. `vehicles` tablosu RLS'e tabi;
  //      oturumsuz çağrı hata döndürüp konsola yazıyor ve
  //      `01-rota-erisim.spec.js:63` ("/ konsola error yazmıyor") ile
  //      `04-mobil.spec.js:112` (Next hata katmanı ikinci dialog sanılıyor)
  //      testlerini BİRDEN kırıyor.
  //
  // İkinci madde ağ trafiğine bakmadan doğrulanamaz: şerit görünmüyor olabilir
  // ama sorgu yine atılmış olabilir. Bu yüzden istekler dinleniyor.
  // =======================================================================
  test('ZİYARETÇİDE garaj şeridi yok ve vehicles sorgusu ATILMIYOR', async ({ page }) => {
    const aracSorgulari = [];
    page.on('request', (r) => {
      const u = r.url();
      if (/\/rest\/v1\/vehicles/.test(u)) aracSorgulari.push(r.method());
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await izgaraYerlessin(page);

    await expect(
      page.getByText(/Garajınızda/),
      'oturumsuz ziyaretçiye garaj şeridi gösteriliyor'
    ).toHaveCount(0);

    expect(
      aracSorgulari,
      'oturumsuz ziyaretçi için `vehicles` sorgusu atılıyor — RLS hatası '
      + 'konsola düşer ve iki testi birden kırar'
    ).toEqual([]);
  });

  // Ürün sahibinin kararıyla kaldırılan bölümler geri gelmesin.
  test('KALDIRILAN bölümler geri gelmedi', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await izgaraYerlessin(page);

    const metin = await page.locator('body').innerText();

    // 1) Garaj şeridi — oturumlu kullanıcıya da gösterilmiyor artık.
    expect(metin, 'garaj şeridi geri gelmiş').not.toContain('Garajınızda');
    // 2) Ücretli işlemler şeridi.
    expect(metin, '"Ücretli işlemler" bölümü geri gelmiş').not.toContain('Ücretli işlemler');
    // 3) "Nereden başlarsınız?" — Hizmetler'deki iki kartın tekrarıydı.
    expect(metin, '"Nereden başlarsınız" bölümü geri gelmiş').not.toContain('Nereden başlarsınız');
    // 4) ⚠ MADDE KALDIRILDI — ÜRÜN SAHİBİ KARARI GERİ ALDI.
    //
    //    Buradaki iddia `getByRole('button', { name: 'Marka' })` sayısının 0
    //    olmasıydı. Yasaklanan şey DÜZ marka listesiydi: ~50 marka, tek
    //    kademe, yer kaplayan ve sonucu daraltmayan bir liste.
    //
    //    Yerine gelen yapı KADEMELİ AĞAÇ (Marka › Seri › Model › Donanım):
    //    ekranda hep tek kademe duruyor (2-10 satır) ve her tıklama ızgarayı
    //    ANINDA daraltıyor. Ağacın kendisi "MARKA ağacı kademe kademe
    //    süzüyor" testiyle denetleniyor; burada onu yasaklamak iki testi
    //    çelişik hâle getirirdi.
    //
    //    ⚠ Bu iddia zaten kırılgandı: `getByRole` adı varsayılan olarak
    //    büyük/küçük harf duyarsız ALT DİZE eşliyor, yani seçim yapıldığında
    //    kırıntıdaki "Tüm markalar" halkası da eşleşiyordu.
    //
    //    1-3. maddeler yerinde: o bölümler gerçekten kaldırıldı.
  });

  test('anasayfanın KENDİ metadata\'sı var', async ({ page }) => {
    await page.goto('/');
    // `(site)/page.js` ve `layout.js` ikisi de 'use client' olduğu için
    // anasayfa kökteki genel başlığı devralıyordu. Oysa `/` sitemap'te
    // `priority 1`.
    const baslik = await page.title();
    expect(baslik, 'anasayfa başlığı boş').toBeTruthy();
    expect(baslik, 'anasayfa başlığında ürün adı yok').toContain('Oto.CV');

    const aciklama = await page.locator('meta[name="description"]').getAttribute('content');
    expect(aciklama, 'anasayfada description yok').toBeTruthy();
    expect(aciklama.length, 'description fazla kısa').toBeGreaterThan(60);
  });
});

// =========================================================================
// OTURUMLU KULLANICI — ANASAYFA ARTIK KİŞİSEL
//
// Ölçülmüştü: oturumlu ve oturumsuz ziyaretçi anasayfada BİREBİR AYNI şeyi
// görüyordu. Tek fark dolu kalpler ve başlıktaki menüydü — yani geri gelen
// kullanıcıya kişisel hiçbir sebep sunulmuyordu.
// =========================================================================
