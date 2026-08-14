// =========================================================================
// 15 · FAVORİLER
//
// -------------------------------------------------------------------------
// NİYE BU PAKET VAR
// -------------------------------------------------------------------------
// `listings.favorite_count` sütunu şemada duruyordu ve "Vitrindeki
// Araçlarım" ekranı onu "N Favori" diye basıyordu. Ama favori diye bir
// tablo, servis ya da düğme YOKTU: sayaç hiçbir zaman artmıyordu. Ekran,
// hiç kimsenin ölçmediği bir sayıyı ölçülmüş gibi gösteriyordu.
//
// Sayaç artık gerçek. Bu paket iki şeyi koruyor:
//   1. Sayacın İSTEMCİDEN yazılamaması (yazılabilseydi herkes kendi
//      aracının favori sayısını şişirirdi)
//   2. Kendi aracını favorileyememe
//
// -------------------------------------------------------------------------
// YAZMA VAR AMA KENDİ ÇÖPÜNÜ TEMİZLİYOR
// -------------------------------------------------------------------------
// Kilit testleri favori ekleyip siliyor; `afterAll` kalanı temizliyor.
// `favoriler` tablosu istemciye açık (kendi satırları için), yani 07-devir'in
// aksine temizlik GERÇEKTEN yapılabiliyor.
// =========================================================================

const { test, expect, supabaseIstemcisi, aliciIstemcisi, anonIstemcisi } = require('./yardimcilar');

test.describe('Favoriler', () => {
  let ilanId = null;
  // Kullanıcı kimlikleri BİR KEZ, beforeAll içinde alınıyor.
  //
  // Önce her testte `auth.getUser()` çağrılıyordu ve bir koşumda `null`
  // döndü: paralel testler altında oturum tazeleme yarışa giriyor ve
  // `user.id` okuması TypeError veriyordu. Kimlik koşum boyunca
  // değişmediği için bir kez alıp saklamak hem daha hızlı hem kararlı.
  let sahipId = null;
  let aliciId = null;

  test.beforeAll(async () => {
    const sb = await supabaseIstemcisi();
    const alici = await aliciIstemcisi();

    const { data } = await sb.from('listings').select('id').eq('status', 'active').limit(1).maybeSingle();
    ilanId = data?.id ?? null;

    sahipId = (await sb.auth.getUser()).data?.user?.id ?? null;
    aliciId = (await alici.auth.getUser()).data?.user?.id ?? null;
  });

  test.afterAll(async () => {
    // Test favorilerini temizle.
    const alici = await aliciIstemcisi();
    if (aliciId && ilanId) {
      await alici.from('favoriler').delete().eq('user_id', aliciId).eq('listing_id', ilanId);
    }
  });

  test('kendi aracını favorileyemiyor', async () => {
    test.skip(!ilanId, 'aktif vitrin kaydı yok');
    test.skip(!sahipId, 'oturum alınamadı');
    const sahip = await supabaseIstemcisi();

    const { error } = await sahip.from('favoriler').insert({ user_id: sahipId, listing_id: ilanId });

    // Politikayla değil TETİKLEYİCİYLE engelleniyor: `listings` üzerinde
    // birden çok permissive politika var ve Postgres onları OR'luyor.
    expect(error?.message, 'kullanıcı kendi aracını favoriledi').toContain('KENDI_ARACIN');
  });

  test('sayaç tetikleyiciyle artıyor ve azalıyor', async () => {
    test.skip(!ilanId, 'aktif vitrin kaydı yok');
    test.skip(!aliciId, 'oturum alınamadı');
    const sahip = await supabaseIstemcisi();
    const alici = await aliciIstemcisi();

    const oku = async () => {
      const { data } = await sahip.from('listings').select('favorite_count').eq('id', ilanId).single();
      return data?.favorite_count ?? 0;
    };

    await alici.from('favoriler').delete().eq('user_id', aliciId).eq('listing_id', ilanId);
    const once = await oku();

    const { error: ekleHata } = await alici.from('favoriler').insert({ user_id: aliciId, listing_id: ilanId });
    expect(ekleHata, JSON.stringify(ekleHata)).toBeFalsy();
    expect(await oku(), 'ekleyince sayaç artmadı').toBe(once + 1);

    await alici.from('favoriler').delete().eq('user_id', aliciId).eq('listing_id', ilanId);
    expect(await oku(), 'silince sayaç azalmadı').toBe(once);
  });

  test('istemci sayacı doğrudan şişiremiyor', async () => {
    test.skip(!ilanId, 'aktif vitrin kaydı yok');
    const sahip = await supabaseIstemcisi();
    const alici = await aliciIstemcisi();

    const { data: onceki } = await sahip.from('listings').select('favorite_count').eq('id', ilanId).single();

    // Başkasının ilanına yazma denemesi.
    await alici.from('listings').update({ favorite_count: 9999 }).eq('id', ilanId);

    const { data: sonraki } = await sahip.from('listings').select('favorite_count').eq('id', ilanId).single();
    expect(
      sonraki?.favorite_count,
      'favori sayacı istemciden şişirilebiliyor — gösterilen sayı güvenilmez olur'
    ).toBe(onceki?.favorite_count ?? 0);
  });

  test('aynı ilan iki kez favorilenemiyor', async () => {
    test.skip(!ilanId, 'aktif vitrin kaydı yok');
    test.skip(!aliciId, 'oturum alınamadı');
    const alici = await aliciIstemcisi();

    await alici.from('favoriler').delete().eq('user_id', aliciId).eq('listing_id', ilanId);
    await alici.from('favoriler').insert({ user_id: aliciId, listing_id: ilanId });

    // İki sekmeden aynı anda tıklamak yeterdi; kısıt veritabanında.
    const { error } = await alici.from('favoriler').insert({ user_id: aliciId, listing_id: ilanId });
    expect(error, 'aynı ilan iki kez favorilendi').toBeTruthy();

    await alici.from('favoriler').delete().eq('user_id', aliciId).eq('listing_id', ilanId);
  });

  test('kullanıcı başkasının favorilerini göremiyor', async () => {
    const sahip = await supabaseIstemcisi();
    const { data } = await sahip.from('favoriler').select('user_id');
    const yabanci = (data || []).filter((f) => f.user_id !== sahipId);

    // Kimin neyi favorilediği bir gizlilik sınırı.
    expect(yabanci.length, 'başkasının favorileri okunabiliyor').toBe(0);
  });

  test('anon favori tablosuna erişemiyor', async () => {
    const anon = anonIstemcisi();
    const { data, error } = await anon.from('favoriler').select('*');
    expect(error || (data && data.length === 0), 'favoriler anon\'a açık').toBeTruthy();
  });
});
