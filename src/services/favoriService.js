// =========================================================================
// FAVORİ SERVİSİ
//
// -------------------------------------------------------------------------
// SAYAÇ İSTEMCİDEN YAZILMIYOR
// -------------------------------------------------------------------------
// `listings.favorite_count` bu servisin hiç dokunmadığı bir alan: veritabanı
// tetikleyicisi `favoriler` tablosundan türetiyor. İstemciden yazılabilseydi
// herkes kendi aracının favori sayısını şişirebilirdi.
//
// Aynı sebeple "kendi aracını favorileme" de tetikleyiciyle engelleniyor;
// burada yalnızca hatanın okunur karşılığı üretiliyor.
// =========================================================================

import { supabase } from '../lib/supabase';

const KILIT_METNI = {
  KENDI_ARACIN: 'Kendi aracınızı favorileyemezsiniz.',
};

function hataMetni(hata) {
  const mesaj = hata?.message || '';
  for (const kod of Object.keys(KILIT_METNI)) {
    if (mesaj.includes(kod)) return KILIT_METNI[kod];
  }
  // Tekillik ihlali: iki sekmeden aynı anda tıklanmış olabilir. Kullanıcı
  // açısından sonuç zaten istediği durum, hata göstermeye gerek yok.
  if (mesaj.includes('favori_tek_kayit')) return null;
  return 'Favori işlemi tamamlanamadı.';
}

/** Kullanıcının favorilediği ilan kimlikleri (Set). */
export async function favoriKimlikleri() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data, error } = await supabase
    .from('favoriler')
    .select('listing_id')
    .eq('user_id', user.id);

  if (error) {
    console.error('Favoriler okunamadı:', error.message);
    return new Set();
  }
  return new Set((data || []).map((f) => f.listing_id));
}

/**
 * Favoriyi açar/kapatır.
 * @returns {{favorili: boolean, hata: string|null}}
 */
export async function favoriDegistir(listingId, suAnFavori) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { favorili: !!suAnFavori, hata: 'Favorilemek için giriş yapın.' };

  if (suAnFavori) {
    const { error } = await supabase
      .from('favoriler')
      .delete()
      .eq('user_id', user.id)
      .eq('listing_id', listingId);

    if (error) return { favorili: true, hata: hataMetni(error) };
    return { favorili: false, hata: null };
  }

  const { error } = await supabase
    .from('favoriler')
    .insert({ user_id: user.id, listing_id: listingId });

  if (error) {
    const metin = hataMetni(error);
    // Tekillik ihlalinde kullanıcı zaten istediği duruma ulaşmış sayılıyor.
    return { favorili: metin === null, hata: metin };
  }
  return { favorili: true, hata: null };
}

/** Favorilenen vitrin kayıtlarını araç bilgileriyle birlikte getirir. */
export async function favoriListesi() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { veri: [], hata: null };

  const { data, error } = await supabase
    .from('favoriler')
    .select('listing_id, olustu, listings(*, vehicles(*))')
    .eq('user_id', user.id)
    .order('olustu', { ascending: false });

  if (error) return { veri: [], hata: error.message };

  // Vitrinden kaldırılmış kayıtlar süzülüyor: favorilerde "artık yok" bir
  // kart göstermek, kullanıcıya var olmayan bir araç vaat etmek olurdu.
  const veri = (data || [])
    .filter((f) => f.listings && f.listings.status === 'active')
    .map((f) => {
      const l = f.listings;
      const v = l.vehicles || {};
      return {
        listing_id: l.id,
        listing_title: l.title,
        city: l.city,
        district: l.district,
        is_featured: l.is_featured || false,
        favorilendi: f.olustu,
        plate_number: l.vehicle_plate,
        brand: v.brand,
        model: v.model,
        year: v.year,
        km: v.km,
        trust_score: v.trust_score,
        image_url: v.image_url,
        pin_code: v.pin_code,
      };
    });

  return { veri, hata: null };
}
