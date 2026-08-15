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

    // =====================================================================
    // ⚠ ARTIK DOĞRUDAN TABLOYA YAZILMIYOR — `vitrin_yayinla` RPC'si
    // ---------------------------------------------------------------------
    // İki ayrı sorunu birden çözdüğü için taşındı.
    //
    // 1. GÜVENLİK. `listings` tablosunun SELECT politikası PUBLIC'e
    //    `USING(true)` veriyordu; anon anahtarıyla ölçüldü ve tablo tamamen
    //    okunuyordu: `vehicle_plate` (3/3 satır), `price` (bir satırda
    //    100000), `contact_phone`. Plakayı gizlemek ve araç fiyatı
    //    göstermemek ürünün iki temel kısıtı; ikisi de tek REST çağrısıyla
    //    atlanıyordu. Tablo kapatıldı, yazma işi sunucuya alındı.
    //
    // 2. SESSİZ BAŞARISIZLIK. Eski akış şuydu:
    //       a) plakaya ait satırı SELECT et (sahiplik filtresi YOK —
    //          genel okuma politikası başkasının satırını da gösteriyordu)
    //       b) bulduysa o id'yi UPDATE et
    //    Ama UPDATE sahiplik politikasına tabi. Araç DEVREDİLDİKTEN sonra
    //    satır hâlâ ESKİ sahibin üzerinde olduğu için UPDATE 0 satır
    //    etkiliyor, Supabase HATA DÖNDÜRMÜYOR ve servis `success: true`
    //    diyordu. Yani devraldığınız aracı vitrine çıkarınca hiçbir şey
    //    olmuyor, ekran başarı gösteriyordu.
    //
    // RPC sahipliği İLAN üzerinden değil ARAÇ üzerinden denetliyor ve satır
    // varsa `user_id`yi yeni sahibe devralıyor.
    //
    // ⚠ `price` HİÇ GÖNDERİLMİYOR ve RPC de yazmıyor: araca ait fiyat
    // üründe yok.
    // =====================================================================
    const { data, error } = await supabase.rpc('vitrin_yayinla', {
      p_plaka: plate,
      p_baslik: listingPayload.title?.trim(),
      p_aciklama: listingPayload.description?.trim(),
      p_il: listingPayload.city,
      p_ilce: listingPayload.district,
      p_tramer: Number(listingPayload.tramerAmount || 0),
      p_one_cikar: listingPayload.isFeatured || false,
    });

    if (error) throw error;
    if (!data?.basarili) {
      // Sunucunun verdiği sebep kullanıcı diline çevriliyor. Ham anahtarı
      // ekrana basmak kullanıcıya bir şey anlatmıyor.
      const METIN = {
        oturum_yok: 'Oturumunuz sonlanmış. Yeniden giriş yapın.',
        arac_yok: 'Bu plakaya kayıtlı araç bulunamadı.',
        sahip_degil: 'Bu araç sizin garajınızda değil.',
        eksik_alan: 'Başlık, açıklama, il ve ilçe zorunlu.',
      };
      throw new Error(METIN[data?.hata] || 'Vitrin kartı yayınlanamadı.');
    }
    return { success: true, data };
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

    // Yayınlamayla aynı gerekçe: tablo ziyaretçiye kapatıldı, yazma sunucuya
    // alındı. Kaldırma da sahipliği ARAÇ üzerinden denetliyor, böylece devir
    // sonrası sessizce başarısız olmuyor.
    const { data, error } = await supabase.rpc('vitrin_kaldir', { p_plaka: plate });

    if (error) throw error;
    if (!data?.basarili) {
      const METIN = {
        oturum_yok: 'Oturumunuz sonlanmış. Yeniden giriş yapın.',
        arac_yok: 'Bu plakaya kayıtlı araç bulunamadı.',
        sahip_degil: 'Bu araç sizin garajınızda değil.',
      };
      throw new Error(METIN[data?.hata] || 'Vitrinden kaldırılamadı.');
    }
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
