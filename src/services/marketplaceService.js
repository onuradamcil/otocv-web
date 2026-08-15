// =========================================================================
// OTO-CV MİMARİ KATMANI: PAZARYERİ VERİ VE AKSİYON SERVİSİ (marketplaceService.js)
// İşlev: Bağımsız 'listings' tablosu üzerinde CRUD işlemlerini, Vitrin (Doping)
//        ve ilişkisel Supabase Join sorgularını yöneten servis.
// =========================================================================

import { supabase } from '../lib/supabase';

/**
 * Bir araç için pazaryerinde ilan oluşturur veya mevcut ilanı günceller.
 * @param {Object} vehicle - Garajdaki araç nesnesi
 * @param {Object} listingPayload - Fiyat, Başlık, Açıklama, Konum, Tramer ve Vitrin Doping verileri
 */
export const publishVehicleListing = async (vehicle, listingPayload) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Oturum açmış kullanıcı bulunamadı.');

    const plate = vehicle.plate_number;

    // PLAKAYA AİT KAYIT ARANIYOR — DURUMA BAKILMADAN.
    //
    // Eskiden yalnızca `status='active'` aranıyordu. Kaldırma işlemi kaydı
    // sildiği sürece bu çalışıyordu; artık kaldırma kaydı `pasif` yapıyor
    // (kalıcı silme veri kaybıydı). Filtre 'active' kalsaydı pasif kayıt
    // bulunamaz, INSERT denenir ve `unique_active_listing_per_plate`
    // kısıtına takılırdı.
    //
    // ⚠ O kısıtın adı yanıltıcı: `UNIQUE (vehicle_plate)` — koşulsuz. Yani
    // plaka başına yalnızca BİR satır olabiliyor, durumu ne olursa olsun.
    const { data: existingListings } = await supabase
      .from('listings')
      .select('id')
      .eq('vehicle_plate', plate)
      .limit(1);

    let result;
    if (existingListings && existingListings.length > 0) {
      // VARSA: mevcut kaydı güncelle ve yeniden yayına al.
      result = await supabase
        .from('listings')
        .update({
          title: listingPayload.title?.trim(),
          description: listingPayload.description?.trim(),
          city: listingPayload.city,
          district: listingPayload.district,
          tramer_amount: Number(listingPayload.tramerAmount || 0),
          is_featured: listingPayload.isFeatured || false,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingListings[0].id)
        .select();
    } else {
      // YOKSA: Sıfırdan Yeni İlan Oluştur (INSERT)
      result = await supabase
        .from('listings')
        .insert({
          vehicle_plate: plate,
          user_id: user.id,
          title: listingPayload.title?.trim(),
          description: listingPayload.description?.trim(),
          city: listingPayload.city,
          district: listingPayload.district,
          tramer_amount: Number(listingPayload.tramerAmount || 0),
          is_featured: listingPayload.isFeatured || false,
          status: 'active'
        })
        .select();
    }

    if (result.error) throw result.error;
    return { success: true, data: result.data?.[0] };
  } catch (error) {
    console.error('❌ [Marketplace Service] Vitrin kartı yayınlama hatası:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * ⚠ ARAÇ TUTARI ARTIK HİÇ YAZILMIYOR VE OKUNMUYOR
 *
 * `listings.price` sütunu şemada duruyor ama uygulama ona ne yazıyor ne de
 * okuyor. Gerekçe hukuki: ürüne (araca) ait herhangi bir fiyat göstermek
 * platformu satış sitesi konumuna sokuyor. Bu ürün bir dijital taşıt
 * sicili; vitrin kartı aracın SİCİLİNİ gösteriyor, bedelini değil.
 *
 * Sütun bilerek düşürülmedi: mevcut satırdaki değer geçmiş veri ve silmek
 * geri alınamaz. Ekranda hiçbir yerde görünmüyor.
 */

/**
 * Bir aracı pazaryerinden kaldırır.
 *
 * ⚠ ESKİDEN KALICI SİLME YAPIYORDU — düzeltildi.
 *
 * Eski hâli `.delete().eq('vehicle_plate', plate)` idi ve iki ayrı sorunu
 * vardı:
 *   1. `status` filtresi yoktu. Yani o plakanın SADECE yayındaki kaydını
 *      değil, TÜM kayıtlarını siliyordu — geçmiş yayınlar dahil.
 *   2. Silme geri alınamaz. Canlı veritabanının yedeği yok (PITR kapalı),
 *      yani yanlışlıkla basılan bir düğme fiyat geçmişini, görüntülenme ve
 *      favori sayaçlarını kalıcı olarak yok ediyordu.
 *
 * Artık kayıt duruyor, yalnızca `status` değişiyor. `fetchMarketplaceListings`
 * zaten `status='active'` süzüyor, dolayısıyla araç pazaryerinden anında
 * kalkıyor; veri ise kalıyor.
 */
export const unpublishVehicleListing = async (vehicle) => {
  try {
    const plate = typeof vehicle === 'object' ? vehicle.plate_number : vehicle;

    const { data, error } = await supabase
      .from('listings')
      .update({ status: 'pasif', updated_at: new Date().toISOString() })
      .eq('vehicle_plate', plate)
      .eq('status', 'active')
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('❌ [Marketplace Service] Pazaryerinden kaldırma hatası:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Pazaryerindeki aktif vitrin kayıtlarını çeker.
 *
 * -------------------------------------------------------------------------
 * NİYE DOĞRUDAN SORGU DEĞİL RPC
 * -------------------------------------------------------------------------
 * Eskiden `from('listings').select('*, vehicles(*)')` çağrılıyordu. Ama
 * `vehicles` tablosunun SELECT politikası YALNIZCA SAHİBE açık, dolayısıyla
 * başka bir kullanıcı ya da ziyaretçi için `item.vehicles` NULL dönüyordu.
 *
 * Üç hesapla ölçüldü, aynı sorgu:
 *     SAHİP : 2 ilan -> arac_geldi=true,  pin=CV-8YW4W-R5Z4F
 *     ALICI : 2 ilan -> arac_geldi=false, pin=YOK
 *     ANON  : 2 ilan -> arac_geldi=false, pin=YOK
 *
 * Yani kartlar marka/model/puan/görsel olmadan çiziliyor, karta tıklanınca
 * `pin_code` undefined olduğu için `/details/undefined` açılıyordu. Ürünün
 * kamuya bakan yüzü, sahibi dışında herkes için çalışmıyordu.
 *
 * "Vitrindekiler herkese okunsun" politikası eklemek en kısa yoldu ama
 * satırın TAMAMINI açardı ve satırda `plate_number` var — plaka üründe
 * bilerek gizleniyor. Çözüm favori ve mesaj servislerindeki kalıbın aynısı:
 * güvenli izdüşüm döndüren `security definer` fonksiyon.
 */
export const fetchMarketplaceListings = async (filters = {}) => {
  try {
    const { data, error } = await supabase.rpc('vitrin_listesi', {
      p_sehir: filters.city && filters.city !== 'Tümü' ? filters.city : null,
      p_kullanici: filters.userId || null,
    });

    if (error) throw error;

    // RPC zaten düzleştirilmiş nesne döndürüyor; istemcide yeniden
    // eşleme yapmak iki kopya demekti.
    return { success: true, data: Array.isArray(data) ? data : [] };
  } catch (error) {
    console.error('❌ [Marketplace Service] Vitrin kartlarını çekme hatası:', error.message);
    return { success: false, error: error.message, data: [] };
  }
};
/**
 * Vitrin görüntülenmesini kaydeder.
 *
 * "Kaç KEZ" değil "kaç FARKLI KİŞİ": sunucu oturum açmışsa `auth.uid()`,
 * ziyaretçide ise tarayıcıdaki kalıcı kimlikle tekilleştiriyor. Araç sahibi
 * kendi aracını saydırmıyor.
 *
 * ⚠ SESSİZ ÇALIŞIYOR. Bu bir yan etki; kullanıcının yaptığı bir iş değil.
 * Başarısız olması ekranda hata göstermeyi hak etmiyor ve sayfayı hiçbir
 * şekilde bloke etmemeli.
 */
export const recordListingView = async (pin) => {
  try {
    if (!pin) return;
    const { izleyiciKimligi } = await import('../utils/izleyiciKimligi');
    await supabase.rpc('vitrin_goruntulendi', {
      p_pin: pin,
      p_anon_kimlik: izleyiciKimligi(),
    });
  } catch {
    /* yan etki: sessizce vazgeçiliyor */
  }
};
