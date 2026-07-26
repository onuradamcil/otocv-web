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

    // Önce bu plakaya ait aktif bir ilan var mı kontrol et
    const { data: existingListings } = await supabase
      .from('listings')
      .select('id')
      .eq('vehicle_plate', plate)
      .eq('status', 'active');

    let result;
    if (existingListings && existingListings.length > 0) {
      // VARSA: Mevcut İlanı Güncelle (UPDATE)
      result = await supabase
        .from('listings')
        .update({
          title: listingPayload.title?.trim(),
          description: listingPayload.description?.trim(),
          price: Number(listingPayload.price),
          city: listingPayload.city,
          district: listingPayload.district,
          tramer_amount: Number(listingPayload.tramerAmount || 0),
          is_featured: listingPayload.isFeatured || false,
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
          price: Number(listingPayload.price),
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
    console.error('❌ [Marketplace Service] İlan yayınlama hatası:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Bir ilanı pazaryerinden kaldırır (Siler).
 */
export const unpublishVehicleListing = async (vehicle) => {
  try {
    const plate = typeof vehicle === 'object' ? vehicle.plate_number : vehicle;

    const { data, error } = await supabase
      .from('listings')
      .delete()
      .eq('vehicle_plate', plate);

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('❌ [Marketplace Service] İlandan kaldırma hatası:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Pazaryerindeki aktif ilanları ve ilişkili araç bilgilerini tek sorguda çeker.
 */
export const fetchMarketplaceListings = async (filters = {}) => {
  try {
    let query = supabase
      .from('listings')
      .select('*, vehicles(*)')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (filters.city && filters.city !== 'Tümü') {
      query = query.eq('city', filters.city);
    }

    const { data, error } = await query;
    if (error) throw error;

    // İlişkisel gelen araç verilerini düzleştirip hazır nesneye dönüştürme
    const formattedListings = (data || []).map(item => {
      const v = item.vehicles || {};
      return {
        listing_id: item.id,
        user_id: item.user_id, // 🚀 KRİTİK DÜZELTME: user_id EKLENDİ!
        listing_title: item.title,
        listing_description: item.description,
        price: item.price,
        city: item.city,
        district: item.district,
        tramer_amount: item.tramer_amount,
        is_featured: item.is_featured || false,
        views_count: item.views_count || 0, // 📊 Okunma sayısı
        favorite_count: item.favorite_count || 0, // ❤️ Favori sayısı
        created_at: item.created_at,
        // Vehicles tablosundan birleşen veriler
        plate_number: item.vehicle_plate,
        brand: v.brand,
        model: v.model,
        year: v.year,
        km: v.km,
        package: v.package,
        fuel_type: v.fuel_type,
        gear_type: v.gear_type || 'Otomatik',
        trust_score: v.trust_score,
        image_url: v.image_url,
        pin_code: v.pin_code
      };
    });

    return { success: true, data: formattedListings };
  } catch (error) {
    console.error('❌ [Marketplace Service] İlanları çekme hatası:', error.message);
    return { success: false, error: error.message, data: [] };
  }
};