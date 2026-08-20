// =========================================================================
// 31 · TİPOGRAFİ ÖLÇEĞİ (C1)
//
// -------------------------------------------------------------------------
// NİYE BU PAKET VAR
// -------------------------------------------------------------------------
// Sitede 737 yerde ham Tailwind puntosu vardı (karne hariç, 53 dosya).
// Bunların %47'si `text-xs` idi ve ÖLÇEKTE 12px YOKTU — yani eksik olan
// kodun disiplini değil, ölçeğin kendisiydi. Ölçeğe 12px eklendi
// (`--text-mini`) ve ham puntolar belirteçlere taşındı.
//
// -------------------------------------------------------------------------
// ⚠ PROJEDE İKİ PARALEL SİSTEM VAR — KARIŞTIRMAK YANLIŞ SAYIM ÜRETİYOR
// -------------------------------------------------------------------------
//   1) @theme belirteçleri: `text-mini` `text-yardimci` `text-govde` ...
//      YALNIZCA punto veriyorlar, `font-*` ile normal birleşiyorlar.
//      DOĞRU KULLANIM.
//   2) Bileşen sınıfları: `.metin-yardimci` `.etiket` ...
//      Punto + AĞIRLIK + satır yüksekliği veriyorlar ve KATMANSIZ
//      oldukları için Tailwind'in `font-*` yardımcısını YENİYORLAR.
//
// İkincisinin yanına `font-semibold` yazmak sessizce ölü bir sınıf
// bırakıyor: yazan da okuyan da ağırlığın değiştiğini sanıyor, hesaplanan
// değer değişmiyor. Bu paket o yalanın geri gelmesini engelliyor.
//
// -------------------------------------------------------------------------
// ⚠ SATIR YÜKSEKLİĞİ ORAN OLARAK TANIMLI, SABİT DEĞİL
// -------------------------------------------------------------------------
// Tailwind satır yüksekliğini `calc(1 / 0.75)` gibi ORAN tutuyor; punto
// başka bir sınıfla değişirse satır da ölçekleniyor. Belirteçlere önce
// SABİT değer yazılmıştı ve 1627 ögenin 1626'sı eşleşip biri kaymıştı
// (puntosu 11px'e düşürülmüş bir öge). Bu yüzden oranlar birebir
// Tailwind'inkiyle aynı — ve aşağıdaki tarayıcı testi bunu bekçiliyor.
// =========================================================================

const fs = require('fs');
const path = require('path');
const { test, expect } = require('./yardimcilar');

const KOK = path.join(__dirname, '..', 'src');
// Ürün sahibinin talimatı: karne bu turda kapsam dışı.
const KARNE = ['otokarnescreen', 'officialreportview', 'advertisingcard', 'karne'];

// Ölçekte karşılığı OLAN ve bu yüzden artık kaynakta bulunmaması gereken
// ham puntolar.
//
// ⚠ `text-4xl` BİLEREK LİSTEDE DEĞİL. Ölçeğe 36px eklenmedi: yalnızca TEK
// dosyada 4 kullanımı var ve onun için kademe açmak, ölçeği bir kısıt
// olmaktan çıkarıp "kodun kullandığı her boyutun listesi"ne çevirirdi.
// Orada ham kalması bilinçli bir karar; test onu kusur saymıyor.
const YASAK_PUNTO = /(?<![\w-])text-(xs|sm|lg|xl|2xl|3xl)(?![\w-])/g;

const BILESEN = /(?<!text-)\b(baslik-sayfa|baslik-bolum|baslik-kart|metin-govde|metin-yardimci|etiket|sayi-vurgu)\b/;
const AGIRLIK = /\bfont-(thin|light|normal|medium|semibold|bold|extrabold|black)\b/;
const SINIF = /className=(?:"([^"]*)"|\{`([^`]*)`\}|\{'([^']*)'\})/gs;

function kaynakDosyalari() {
  const cikti = [];
  (function yur(dizin) {
    for (const ad of fs.readdirSync(dizin)) {
      const tam = path.join(dizin, ad);
      if (fs.statSync(tam).isDirectory()) { yur(tam); continue; }
      if (!/\.(jsx?|tsx?)$/.test(ad)) continue;
      if (KARNE.some((k) => tam.toLowerCase().includes(k))) continue;
      cikti.push(tam);
    }
  }(KOK));
  return cikti;
}

test.describe('Tipografi ölçeği · kaynak', () => {
  test('ölçekte karşılığı olan ham punto KALMADI', () => {
    const dosyalar = kaynakDosyalari();
    expect(dosyalar.length).toBeGreaterThan(50);   // gerçekten taradığının kanıtı

    const bulgular = [];
    for (const yol of dosyalar) {
      const metin = fs.readFileSync(yol, 'utf8');
      const eslesmeler = metin.match(YASAK_PUNTO);
      if (eslesmeler) {
        bulgular.push(`${path.relative(KOK, yol)}: ${eslesmeler.join(', ')}`);
      }
    }
    expect(bulgular, 'ham punto geri sızmış').toEqual([]);
  });

  test('bileşen sınıfının yanında ÖLÜ font-* yok', () => {
    const bulgular = [];
    for (const yol of kaynakDosyalari()) {
      const metin = fs.readFileSync(yol, 'utf8');
      for (const m of metin.matchAll(SINIF)) {
        const sinif = m[1] || m[2] || m[3] || '';
        if (BILESEN.test(sinif) && AGIRLIK.test(sinif)) {
          bulgular.push(`${path.relative(KOK, yol)}: ${sinif.trim().slice(0, 70)}`);
        }
      }
    }
    expect(bulgular, 'bileşen sınıfı ağırlığı zaten belirliyor — bu font-* hiçbir şey yapmıyor')
      .toEqual([]);
  });
});

test.describe('Tipografi ölçeği · tarayıcı', () => {
  test('belirteçler yerini aldıkları Tailwind sınıflarıyla BİREBİR aynı',
    async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const olcum = await page.evaluate(() => {
        const kap = document.createElement('div');
        document.body.appendChild(kap);
        const olc = (sinif) => {
          const e = document.createElement('span');
          e.className = sinif;
          e.textContent = 'X';
          kap.appendChild(e);
          const c = getComputedStyle(e);
          return { punto: c.fontSize, satir: c.lineHeight };
        };
        const sonuc = {};
        // ⚠ Ham sınıflar da ölçülüyor: Tailwind onları ARTIK ÜRETMİYOR
        // olabilir (kaynakta kullanılmıyorlar), o yüzden beklenen değerler
        // burada SABİT yazılı — ölçümün kendisi taraftan bağımsız olsun.
        for (const s of ['text-mini', 'text-govde', 'text-bolum', 'text-sayfa',
                         'text-vurgu', 'text-buyuk']) {
          sonuc[s] = olc(s);
        }
        kap.remove();
        return sonuc;
      });

      // Bu değerler Tailwind'in text-xs / text-sm / text-lg / text-3xl
      // sınıflarının ÖLÇÜLMÜŞ değerleri. Göç bunlara dayanıyordu.
      expect(olcum['text-mini']).toEqual({ punto: '12px', satir: '16px' });
      expect(olcum['text-govde']).toEqual({ punto: '14px', satir: '20px' });
      expect(olcum['text-bolum']).toEqual({ punto: '18px', satir: '28px' });
      expect(olcum['text-sayfa']).toEqual({ punto: '30px', satir: '36px' });
      expect(olcum['text-vurgu']).toEqual({ punto: '20px', satir: '28px' });
      expect(olcum['text-buyuk']).toEqual({ punto: '24px', satir: '32px' });
    });
});
