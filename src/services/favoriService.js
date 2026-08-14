// =========================================================================
// FAVORİ SERVİSİ
//
// -------------------------------------------------------------------------
// FAVORİ ARACA AİT, İLANA DEĞİL
// -------------------------------------------------------------------------
// İlk tasarımda favori `listings.id` gösteriyordu. Ama bu ürün bir SİCİL
// ürünü ve pazaryeri ikincil: PIN ile sicil sorgulayan biri de aracı
// favorileyebilmeli, o araç vitrinde olmayabiliyor. Araç vitrinden kalksa
// bile favori anlamını koruyor.
//
// -------------------------------------------------------------------------
// NİYE HEPSİ RPC — TABLOYA DOĞRUDAN ERİŞİM YOK
// -------------------------------------------------------------------------
// İki sebep, ikisi de ölçüldü:
//
// 1. `vehicles` RLS'i yalnızca SAHİBE okuma veriyor. Favori listesini
//    join ile çekmek, başkasının aracı için boş satır döndürüyordu.
//
// 2. Favori tablosunda PLAKA duruyor. Kullanıcı kendi satırlarını
//    okuyabilseydi, pazaryerinde bilerek gizlenen plakaya favori üzerinden
//    ulaşırdı. Plakanın URL'de bile taşınmadığı bir üründe bu yan kapıyı
//    açık bırakmak tutarsız olurdu.
//
// Fonksiyonlar PIN alıyor ve PIN döndürüyor; plaka istemciye hiç gelmiyor.
// =========================================================================

import { supabase } from '../lib/supabase';

const HATA_METNI = {
  oturum_yok:   'Favorilemek için giriş yapın.',
  bulunamadi:   'Araç bulunamadı.',
  kendi_aracin: 'Kendi aracınızı favorileyemezsiniz.',
};

/**
 * Kullanıcının favorilediği PIN'ler (Set).
 *
 * OTURUM YOKSA HİÇ ÇAĞRILMIYOR. Fonksiyonlar yalnızca `authenticated`'a
 * açık; ziyaretçi çağırınca "permission denied" dönüyordu ve pazaryeri
 * anasayfası her açılışta konsola hata basıyordu. Geliştirmede bu, Next.js
 * hata katmanını açıp gerçek bir sorun varmış gibi gösteriyordu — mobil
 * çekmece testi de o katmanı ikinci bir diyalog sanıp kırıldı.
 *
 * Beklenen bir durumu hata olarak raporlamak, gerçek hataları gürültüye
 * boğuyor.
 */
export async function favoriKimlikleri() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data, error } = await supabase.rpc('favori_pinlerim');
  if (error) {
    console.error('Favoriler okunamadı:', error.message);
    return new Set();
  }
  return new Set(Array.isArray(data) ? data : []);
}

/**
 * Favoriyi açar/kapatır.
 * @param {string} pin Araç PIN kodu
 * @param {boolean} suAnFavori İyimser geri alma için mevcut durum
 * @returns {{favorili: boolean, hata: string|null}}
 */
export async function favoriDegistir(pin, suAnFavori) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { favorili: !!suAnFavori, hata: HATA_METNI.oturum_yok };

  const { data, error } = await supabase.rpc('favori_degistir', { p_pin: pin });

  if (error) {
    console.error('Favori değiştirilemedi:', error.message);
    return { favorili: !!suAnFavori, hata: 'Favori işlemi tamamlanamadı.' };
  }

  if (!data?.basarili) {
    return {
      favorili: !!suAnFavori,
      hata: HATA_METNI[data?.hata] || 'Favori işlemi tamamlanamadı.',
    };
  }

  return { favorili: data.favorili === true, hata: null };
}

/**
 * Favorilenen araçlar.
 *
 * Vitrinde olmayan araçlar SÜZÜLMÜYOR — favori artık araca ait, vitrin
 * kaydına değil. "Vitrinde" bir süzgeç değil, bir etiket.
 */
export async function favoriListesi() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { veri: [], hata: null };

  const { data, error } = await supabase.rpc('favori_listem');
  if (error) return { veri: [], hata: error.message };
  return { veri: Array.isArray(data) ? data : [], hata: null };
}
