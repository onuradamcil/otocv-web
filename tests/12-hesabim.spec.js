// =========================================================================
// 12 · HESABIM EKRANI
//
// -------------------------------------------------------------------------
// NİYE BU PAKET VAR
// -------------------------------------------------------------------------
// `/account` bu turda `ComingSoon` yer tutucusundan gerçek bir ekrana
// çevrildi. Ekranın iki tarafı var ve ikisi de teste bağlanmalı:
//
//   1. ARAYÜZ — altı bölüm, oturum yoksa ne yazdığı, kapatma diyaloğunun
//      yazarak onay istemesi
//   2. KİLİTLER — ekranın gösterdiği her şey veritabanında da kilitli mi
//
// İkincisi asıl önemlisi. "Hesabım" ekranı, kullanıcının kendi satırına
// yazdığı tek yer; buradan `is_premium` ya da rıza tarihi yazılabilseydi
// tüm ödeme kilidi ve KVKK ispatı çökerdi.
//
// -------------------------------------------------------------------------
// YAZMA DAVRANIŞI
// -------------------------------------------------------------------------
// Arayüz testleri hiçbir şey KAYDETMİYOR: formlar dolduruluyor ama gönderme
// düğmesine basılmıyor, kapatma diyaloğu açılıp vazgeçiliyor.
//
// Kilit testleri yazma DENİYOR ve reddedilmesini bekliyor — reddedilen
// yazma artık bırakmıyor. Rıza tetikleyicisi testi tek istisna: ikinci test
// hesabının kendi satırında iznini açıp kapatıyor ve eski hâline döndürüyor.
// =========================================================================

const { test, expect, girisYap, aliciIstemcisi, anonIstemcisi } = require('./yardimcilar');

test.describe('Hesabım ekranı', () => {

  test('oturum yoksa ne yapılacağını söylüyor', async ({ page }) => {
    await page.goto('/account');
    await page.waitForLoadState('networkidle');

    // 404 vermiyor, boş da kalmıyor.
    await expect(page.getByText('Bu sayfa için oturum açmanız gerekiyor'))
      .toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('link', { name: 'Giriş Yap' }).first()).toBeVisible();
  });

  test.describe('Oturum açıkken', () => {
    test.beforeEach(async ({ page }) => {
      await girisYap(page);
      await page.goto('/account');
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Hesabım', level: 1 }))
        .toBeVisible({ timeout: 15_000 });
    });

    test('altı bölüm de yerinde', async ({ page }) => {
      for (const baslik of ['Profil', 'E-posta adresi', 'Şifre', 'Üyelik', 'İletişim tercihleri', 'Verilerim']) {
        await expect(
          page.getByRole('heading', { name: baslik, level: 2 }),
          `"${baslik}" bölümü yok`
        ).toBeVisible();
      }
    });

    test('profil alanları mevcut veriyle dolu geliyor', async ({ page }) => {
      // Boş gelen bir form, kullanıcıya "bilgilerim silinmiş" hissi verir.
      await expect(page.getByLabel('Ad', { exact: true })).not.toHaveValue('');
      await expect(page.getByLabel('Soyad', { exact: true })).not.toHaveValue('');
    });

    test('e-posta bölümü mevcut adresi gösteriyor ve anında değişmediğini söylüyor', async ({ page }) => {
      const govde = await page.locator('body').textContent();
      expect(govde, 'mevcut adres yazmıyor').toContain('@');

      // Doğrulama düğmesi boş alanla kapalı olmalı: boşa istek atmak
      // Supabase hız sınırını yiyor.
      const dugme = page.getByRole('button', { name: 'Doğrulama gönder' });
      await expect(dugme).toBeDisabled();
    });

    test('şifre bölümü mevcut şifre istemeden değiştirmiyor', async ({ page }) => {
      const dugme = page.getByRole('button', { name: 'Şifreyi değiştir' });
      await expect(dugme, 'alanlar boşken düğme açık').toBeDisabled();

      // Yalnızca yeni şifre yeterli olmamalı; mevcut şifre de gerekli.
      await page.getByLabel('Yeni şifre', { exact: true }).fill('yeniSifre123');
      await expect(dugme, 'mevcut şifre olmadan düğme açıldı').toBeDisabled();
    });

    test('şifreleri göster düğmesi tipi değiştiriyor', async ({ page }) => {
      const alan = page.getByLabel('Mevcut şifre');
      await expect(alan).toHaveAttribute('type', 'password');

      await page.getByRole('button', { name: /Şifreleri göster/ }).click();
      await expect(alan).toHaveAttribute('type', 'text');
    });

    test('devir bildirimleri KAPATILAMAZ olduğunu söylüyor', async ({ page }) => {
      // Bu ürün kararı: işlem bildirimini susturmak güvenlik açığı.
      // Gri bir anahtar koyup tıklatmamak yerine hiç anahtar konmadı.
      const govde = await page.locator('body').textContent();
      expect(govde, 'kapatılamaz gerekçesi yazmıyor').toContain('Kapatılamaz');

      const kutular = page.locator('input[type="checkbox"]');
      // Tek onay kutusu var: pazarlama izni. Devir bildirimi için kutu YOK.
      await expect(kutular).toHaveCount(1);
      await expect(kutular.first()).toHaveAttribute('aria-label', /ticari elektronik ileti/i);
    });

    test('kapatma diyaloğu araç adımıyla açılıyor ve yazarak onay istiyor', async ({ page }) => {
      await page.getByRole('button', { name: 'Kapatma talebi oluştur' }).click();
      await page.waitForTimeout(600);

      const diyalog = page.getByRole('dialog');
      await expect(diyalog).toBeVisible();

      // Bu hesabın araçları var; ilk adım araç uyarısı olmalı.
      // Sahipsiz araç oluşmasını engelleyen asıl önlem bu adım.
      await expect(diyalog.getByText(/sahipsiz havuza/)).toBeVisible();
      await expect(diyalog.getByRole('link', { name: /devredeyim/ })).toBeVisible();

      await diyalog.getByRole('button', { name: 'Yine de devam et' }).click();
      await page.waitForTimeout(400);

      // İkinci adım: onay kelimesi yazılmadan gönderilemiyor.
      const gonder = diyalog.getByRole('button', { name: /Kapatma talebi gönder/ });
      await expect(gonder, 'onay yazılmadan gönder açık').toBeDisabled();

      // KÜÇÜK HARFLE yazılıyor ve bu testin asıl amacı.
      // İlk yazımda onay kelimesi "HESABIMI KAPAT" idi; Türkçe locale'de
      // küçük 'i'nin büyüğü 'İ' olduğu için `toLocaleUpperCase('tr-TR')`
      // "hesabimi" -> "HESABİMİ" üretiyor ve eşleşmiyordu. Noktasız ı
      // yazmayan hiç kimse hesabını kapatamıyordu. Kelime i/ı içermeyen
      // "HESAP KAPAT" ile değiştirildi.
      await diyalog.getByLabel('Onay metni').fill('hesap kapat');
      await expect(gonder, 'küçük harf onay kabul edilmedi').toBeEnabled();

      // GÖNDERİLMİYOR: bu paket veritabanına yazmıyor.
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      await expect(page.getByRole('dialog')).toHaveCount(0);
    });
  });

  // -----------------------------------------------------------------------
  // KİLİTLER — ekranın gösterdiği her şey veritabanında da kapalı mı
  // -----------------------------------------------------------------------
  test.describe('Kilitler', () => {

    /**
     * Alıcı test hesabının `profiles` satırı YOKTU ve bu iki kilit testini
     * sessizce anlamsız kılıyordu: update 0 satırı etkiliyor, ardından
     * yapılan select null dönüyor ve "premium verilemedi" gibi görünüyordu.
     * Hesap programatik oluşturulduğu için kayıt akışından geçmemiş.
     *
     * Satır burada, uygulamanın kendi INSERT yolundan oluşturuluyor —
     * `profil_olustur_kendi` politikası `auth.uid() = id` istiyor. Bu aynı
     * zamanda INSERT kilidini de denetliyor: `is_premium: true` gönderilse
     * bile tetikleyici false'a çeviriyor.
     */
    async function profilVarOlsun(sb, user) {
      const { data } = await sb.from('profiles').select('id, is_premium').eq('id', user.id).maybeSingle();
      if (data) return data;

      const { error } = await sb.from('profiles').insert({
        id: user.id,
        first_name: 'Test',
        last_name: 'Alici',
        is_premium: true,   // ⚠ bilerek: tetikleyici bunu false yapmalı
      });
      expect(error, 'test profili oluşturulamadı').toBeFalsy();

      const { data: yeni } = await sb.from('profiles').select('id, is_premium').eq('id', user.id).single();
      expect(yeni.is_premium, 'INSERT sırasında kendine premium verilebildi').toBe(false);
      return yeni;
    }

    test('kullanıcı kapatma talebi tablosuna DOĞRUDAN yazamıyor', async () => {
      const sb = await aliciIstemcisi();
      const { data: { user } } = await sb.auth.getUser();

      const { error } = await sb.from('hesap_kapatma_talepleri').insert({
        user_id: user.id,
        arac_sayisi: 0,
      });

      // Yazabilseydi araç sayısı ve zaman damgası istemciden gelirdi;
      // "talep sırasında hiç aracım yoktu" diyen sahte bir kayıt üretilebilirdi.
      expect(error, 'istemci kapatma talebi yazabiliyor').toBeTruthy();
    });

    test('anon kapatma RPC\'lerini çağıramıyor', async () => {
      const sb = anonIstemcisi();

      for (const fn of ['hesap_kapatma_talep_et', 'hesap_kapatma_talebi_iptal']) {
        const { data, error } = await sb.rpc(fn, fn === 'hesap_kapatma_talep_et' ? { p_not: null } : {});
        // Ya yetki hatası ya da fonksiyonun kendi oturum kontrolü.
        const kapali = !!error || data?.basarili === false;
        expect(kapali, `${fn} anon'a açık`).toBeTruthy();
      }
    });

    test('rıza tarihini istemci yazamıyor — tetikleyici eziyor', async () => {
      const sb = await aliciIstemcisi();
      const { data: { user } } = await sb.auth.getUser();
      await profilVarOlsun(sb, user);

      const { data: onceki } = await sb.from('profiles')
        .select('pazarlama_izni, pazarlama_izni_at').eq('id', user.id).single();

      // Sahte bir geçmiş tarihle izin vermeyi dene.
      const sahteTarih = '2020-01-01T00:00:00Z';
      const { error } = await sb.from('profiles')
        .update({ pazarlama_izni: true, pazarlama_izni_at: sahteTarih })
        .eq('id', user.id);
      expect(error, 'izin güncellenemedi').toBeFalsy();

      const { data: sonraki } = await sb.from('profiles')
        .select('pazarlama_izni, pazarlama_izni_at').eq('id', user.id).single();

      expect(sonraki.pazarlama_izni, 'izin yazılamadı').toBe(true);
      expect(
        new Date(sonraki.pazarlama_izni_at).getFullYear(),
        'istemcinin yazdığı sahte rıza tarihi kabul edildi — ispat yükümlülüğü bizde'
      ).toBeGreaterThan(2020);

      // Eski hâline döndür.
      await sb.from('profiles')
        .update({ pazarlama_izni: onceki?.pazarlama_izni ?? false })
        .eq('id', user.id);
    });

    test('is_premium hâlâ istemciden yazılamıyor', async () => {
      // Hesabım ekranı `profiles` üzerinde UPDATE yapan ilk yer. Yeni
      // sütunlar eklendikten sonra premium korumasının bozulmadığını
      // burada da denetliyoruz.
      const sb = await aliciIstemcisi();
      const { data: { user } } = await sb.auth.getUser();
      await profilVarOlsun(sb, user);

      await sb.from('profiles').update({ is_premium: true }).eq('id', user.id);

      const { data } = await sb.from('profiles').select('is_premium').eq('id', user.id).single();
      expect(data?.is_premium, 'kullanıcı kendine premium verebildi').toBe(false);
    });
  });
});
