// =========================================================================
// ÖDEME SERVİSİ
//
// Ayrıcalıklar artık istemcinin yazdığı boolean alanlardan DEĞİL,
// `satin_almalar` tablosundaki kayıttan türüyor. Veritabanı tarafında üç
// tetikleyici bunu zorluyor:
//
//   vehicles_kota_denetle    ilk araç ücretsiz, sonrası "ek_arac" kaydı ister
//   listings_vitrin_denetle  is_featured için "vitrin" kaydı ister
//   profiles_premium_koru    is_premium istemciden yazılamaz
//
// Yani bu servisi atlayıp doğrudan tabloya yazmak işe yaramıyor — kilit
// arayüzde değil veritabanında.
//
// -------------------------------------------------------------------------
// ⚠ DEMO — GERÇEK TAHSİLAT BAĞLANDIĞINDA DEĞİŞECEK TEK YER
// -------------------------------------------------------------------------
// `demo_satin_alma` RPC'si parasız bir "tamamlandi" kaydı üretiyor. Sağlayıcı
// (RevenueCat/iyzico) bağlandığında:
//   1. Bu fonksiyonun yetkisi geri alınacak
//   2. Kayıt sağlayıcının webhook'undan gelecek
//   3. `satin_almalar` şeması DEĞİŞMEYECEK — `saglayici` alanı 'demo' yerine
//      sağlayıcının adını taşıyacak
// Tetikleyiciler ve arayüz olduğu gibi kalacak.
// =========================================================================

import { supabase } from '../lib/supabase';

/**
 * Veritabanı tetikleyicilerinin fırlattığı hata kodları.
 *
 * Postgres `raise exception 'KOD'` mesajı PostgREST üzerinden ham hâliyle
 * geliyor. Kullanıcıya kod göstermek yerine burada okunur metne çevriliyor —
 * `devirService.js` ile aynı sözleşme.
 */
const KILIT_METNI = {
  EK_ARAC_GEREKLI: 'İlk aracınız ücretsiz. Yeni araç eklemek için Ek Araç Kaydı gerekiyor.',
  VITRIN_GEREKLI: 'Aracı öne çıkarmak için Vitrin Dopingi gerekiyor.',
};

/**
 * Bir veritabanı hatası, kilit tetikleyicilerinden mi geliyor?
 * Geliyorsa okunur metni, gelmiyorsa null döner.
 *
 * @param {{message?: string}|null} hata Supabase hata nesnesi
 * @returns {{kod: string, metin: string}|null}
 */
export function kilitHatasi(hata) {
  const mesaj = hata?.message || '';
  for (const kod of Object.keys(KILIT_METNI)) {
    if (mesaj.includes(kod)) return { kod, metin: KILIT_METNI[kod] };
  }
  return null;
}

/**
 * Demo satın alma kaydı oluşturur.
 *
 * Para ALINMIYOR. Kayıt gerçek: tetikleyiciler bu kaydı arıyor, yani demo
 * akışı ile gerçek akış aynı yoldan geçiyor. Bu kasıtlı — tahsilat
 * bağlandığında test edilmemiş yeni bir yol ortaya çıkmasın.
 *
 * @param {string} urunKodu 'devir' | 'sicil_geri_yukleme' | 'ek_arac' | 'vitrin'
 * @param {number} [tutar]
 * @returns {Promise<{basarili: boolean, veri?: object, hata?: string}>}
 */
export async function demoSatinAl(urunKodu, tutar) {
  const { data, error } = await supabase.rpc('demo_satin_alma', {
    p_urun_kodu: urunKodu,
    p_tutar: tutar ?? null,
  });

  if (error) {
    console.error('Satın alma kaydedilemedi:', error.message);
    return { basarili: false, hata: 'İşlem tamamlanamadı. Lütfen tekrar deneyin.' };
  }

  if (data?.hata) {
    return {
      basarili: false,
      hata: data.hata === 'oturum_yok'
        ? 'Bu işlem için oturum açmanız gerekiyor.'
        : 'İşlem tamamlanamadı. Lütfen tekrar deneyin.',
    };
  }

  return { basarili: true, veri: data };
}

/**
 * Kullanıcının harcanmamış satın alma haklarını sayar.
 *
 * Arayüz "1 hakkınız var" diyebilsin diye. `satin_almalar` üzerinde
 * kullanıcının SELECT hakkı var; yazma hakkı yok.
 *
 * @param {string} urunKodu
 * @returns {Promise<number>}
 */
export async function harcanmamisHak(urunKodu) {
  const { count, error } = await supabase
    .from('satin_almalar')
    .select('id', { count: 'exact', head: true })
    .eq('urun_kodu', urunKodu)
    .eq('durum', 'tamamlandi')
    .is('hedef_plaka', null);

  if (error) {
    // Okunamadıysa en kısıtlayıcı varsayım: hak yok. Aksi halde kullanıcıya
    // olmayan bir hak gösterip işlemin ortasında hata aldırırdık.
    console.error('Satın alma hakları okunamadı:', error.message);
    return 0;
  }

  return count ?? 0;
}
