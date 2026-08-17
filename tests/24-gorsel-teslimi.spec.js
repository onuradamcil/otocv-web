// =========================================================================
// GÖRSEL TESLİMİ — next/image katmanı
//
// -------------------------------------------------------------------------
// NİYE TEST GEREKİYOR
// -------------------------------------------------------------------------
// Bu katmanın iki sessiz kırılma yolu var ve ikisi de derlemeden geçiyor:
//
// 1. YAPILANDIRMA BOZULUNCA GÖRSELLER KAYBOLUR.
//    `next.config.mjs`teki `remotePatterns` deseni Supabase adresine
//    uymazsa iyileştirici 400 döndürüyor. `AracGorseli` bunu yakalayıp
//    "GÖRSEL YOK" basıyor — yani ekran ÇÖKMÜYOR, sadece bütün araç
//    fotoğrafları sessizce yok oluyor. Test edilmezse fark edilmez.
//
// 2. KAZANÇ SESSİZCE KAYBOLUR.
//    `sizes` yanlış verilirse tarayıcı gereğinden büyük kopyayı indiriyor.
//    Hiçbir hata çıkmıyor; sadece iyileştirme hiçbir şey kazandırmıyor.
//
// Üçüncü bir koruma da burada: İMZALI ADRESLER iyileştiriciden GEÇMEMELİ.
// Geçerlerse önbellekteki kopya imzadan uzun yaşar ve kullanıcı bozuk görsel
// görür.
// =========================================================================

const { test, expect, girisYap } = require('./yardimcilar');

/** Adres `/_next/image` iyileştiricisinden mi geliyor? (mutlak da olabiliyor) */
function iyilestirilmis(src) {
  return typeof src === 'string' && src.includes('/_next/image?');
}

/** Sayfadaki tüm görselleri, yüklenmiş gerçek ölçüleriyle döndürür. */
async function gorselleriTopla(page) {
  return page.locator('img').evaluateAll((ler) =>
    ler.map((i) => ({
      src: i.getAttribute('src') || '',
      genislik: i.naturalWidth,
      kutuGenisligi: Math.round(i.getBoundingClientRect().width),
    }))
  );
}

test.describe('Görsel teslimi', () => {
  test('garajdaki araç görselleri iyileştiriciden geçiyor ve GERÇEKTEN yükleniyor', async ({ page }) => {
    test.setTimeout(120_000);
    await girisYap(page);
    await page.goto('/garage');
    await page.waitForLoadState('networkidle');

    const hepsi = await gorselleriTopla(page);
    const opt = hepsi.filter((g) => iyilestirilmis(g.src));

    console.log(`\n  /garage: ${hepsi.length} görsel, ${opt.length} iyileştirilmiş`);

    // Test hesabının garajında araç var; yoksa bu testin ölçeceği bir şey yok.
    expect(opt.length, 'hiçbir araç görseli iyileştiriciden geçmiyor').toBeGreaterThan(0);

    // ⚠ ASIL KORUMA: `naturalWidth === 0` demek iyileştirici hata döndürdü
    // demek. `remotePatterns` bozulursa test tam burada düşüyor.
    for (const g of opt) {
      expect(g.genislik, `görsel yüklenemedi (iyileştirici hata döndürdü): ${g.src}`).toBeGreaterThan(0);
    }

    // Kazanç ölçülüyor: 76 px'lik kutuya tam boy dosya inmemeli. Ölçüt cömert
    // (kutunun 3 katı) çünkü yüksek yoğunluk ekranlarda 2x-3x kopya meşru.
    // Tam boy (1920) her koşulda bu eşiğin çok üstünde kalıyor.
    for (const g of opt) {
      if (g.kutuGenisligi > 0) {
        expect(
          g.genislik,
          `kutu ${g.kutuGenisligi}px ama ${g.genislik}px indi — 'sizes' yanlış`
        ).toBeLessThanOrEqual(g.kutuGenisligi * 3 + 32);
      }
    }
  });

  test('İMZALI adresler iyileştiriciden GEÇMİYOR', async ({ page }) => {
    test.setTimeout(120_000);
    await girisYap(page);

    // Fatura ve profil görselleri özel kovalarda; adresleri kısa ömürlü imza
    // taşıyor. İyileştirici önbelleği (31 gün) imzadan uzun yaşadığı için
    // bunların oradan geçmesi bozuk görsel demek.
    for (const rota of ['/garage', '/account', '/']) {
      await page.goto(rota);
      await page.waitForLoadState('networkidle');
      const hepsi = await gorselleriTopla(page);

      for (const g of hepsi) {
        if (!iyilestirilmis(g.src)) continue;
        const cozulen = decodeURIComponent(g.src);
        expect(cozulen, `${rota}: imzalı adres iyileştiriciye verilmiş`).not.toContain('token=');
        expect(cozulen, `${rota}: özel kova iyileştiriciye verilmiş`).not.toContain('vehicle-invoices');
        expect(cozulen, `${rota}: özel kova iyileştiriciye verilmiş`).not.toContain('/avatarlar/');
        expect(cozulen, `${rota}: özel kova iyileştiriciye verilmiş`).not.toContain('/belgeler/');
      }
    }
  });
});
