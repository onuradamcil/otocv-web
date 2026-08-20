// =========================================================================
// ARAMA ÖNERİLERİ (oneriService.js)
//
// -------------------------------------------------------------------------
// İKİ KAYNAK, İKİ FARKLI YER
// -------------------------------------------------------------------------
//   · ARAÇ künyesi (marka/seri/model) → SUNUCU. `katalog_oneri` RPC'si.
//     İstemcide yapılamıyor: `catalogService` kademeleri yalnızca ebeveyn
//     kimliğiyle çekebiliyor, 3.591 modeli ebeveyn bilmeden indirmenin
//     yolu yok.
//   · KONUM (il/ilçe) → İSTEMCİ. `turkeyLocations.js` zaten pakette
//     (81 il / 973 ilçe, gzip ~5 KB). Sunucuya sormak boşuna gidiş-dönüş
//     olurdu; veri sabit ve küçük.
//
// -------------------------------------------------------------------------
// ⚠ ÜRETİLEN DEĞERLER DOĞRUDAN ADRESE YAZILIYOR
// -------------------------------------------------------------------------
// Her önerinin `adres` alanı hazır: istemcinin yeniden normalize etmesi
// gerekmiyor. Bu bilinçli — normalize etme işi iki yerde yapılırsa
// (SQL `arama_normalize` ve JS `agacAnahtari`) haritalar bir gün ayrışır ve
// eşleşme SESSİZCE bozulur. Bu proje o hatayı bir kez yaşadı
// (`markaAgaci.js:56-94`).
//
// ⚠ ŞEHİR HAM ADIYLA GİDİYOR, NORMALİZE DEĞİL. `arac_arama` şehri
// `k.kart_sehir = v_sehir` ile NORMALİZE ETMEDEN eşleştiriyor
// (`20260819080000:134`). Marka/seri/model ise normalize karşılaştırılıyor.
// İkisi farklı; karıştırmak sessiz boş sonuç üretir.
// =========================================================================

import { supabase } from '../lib/supabase';
import { TURKEY_LOCATIONS } from '../data/turkeyLocations';
import { agacAnahtari } from '../utils/markaAgaci';

/** Öneri paneli 2 karakterden kısa girdide hiç açılmıyor. */
export const EN_AZ_HARF = 2;

/**
 * Araç künyesi önerileri (marka / seri / model).
 *
 * ⚠ HATA FIRLATMIYOR. Öneri yan bir kolaylık; sunucu cevap vermezse arama
 * kutusu normal çalışmaya devam etmeli, ekranda hata belirmemeli.
 * `catalogService`in davranışıyla aynı.
 */
export async function katalogOnerileri(sorgu, limit = 6) {
  const temiz = (sorgu || '').trim();
  if (temiz.length < EN_AZ_HARF) return [];

  try {
    const { data, error } = await supabase.rpc('katalog_oneri', {
      p_sorgu: temiz,
      p_limit: limit,
    });
    if (error) throw error;

    return (data?.satirlar || []).map((s) => ({
      tur: s.tur,                       // 'marka' | 'seri' | 'model'
      etiket: s.etiket,                 // "Bmw › 3 Serisi"
      adres: kunyeAdresi(s),
    }));
  } catch (hata) {
    console.error('Katalog önerisi alınamadı:', hata.message);
    return [];
  }
}

/** Künye önerisini süzülmüş sonuç adresine çevirir. */
function kunyeAdresi(s) {
  const p = new URLSearchParams();
  if (s.marka) p.set('marka', s.marka);
  if (s.seri) p.set('seri', s.seri);
  if (s.model) p.set('model', s.model);
  return `/arama?${p.toString()}`;
}

/**
 * Konum önerileri (il / ilçe) — tamamen istemcide.
 *
 * ⚠ `agacAnahtari` KULLANILIYOR, `toLowerCase()` DEĞİL. Türkçe `İ`
 * `toLowerCase()` ile `i` + birleştirici nokta üretiyor ve "İSTANBUL"
 * hiçbir şeyle eşleşmiyor. Aynı tuzak `Step2ListingDetails.jsx:394`'te
 * hâlâ duruyor (ayrı bir onarım kalemi).
 */
export function konumOnerileri(sorgu, limit = 5) {
  const anahtar = agacAnahtari(sorgu || '');
  if (anahtar.length < EN_AZ_HARF) return [];

  const iller = [];
  const ilceler = [];

  for (const [il, ilceListesi] of Object.entries(TURKEY_LOCATIONS)) {
    if (iller.length < limit && agacAnahtari(il).includes(anahtar)) {
      iller.push({
        tur: 'sehir',
        etiket: il,
        // ⚠ HAM ad — bkz. dosya başı.
        adres: `/arama?sehir=${encodeURIComponent(il)}`,
      });
    }

    if (ilceler.length >= limit) continue;
    for (const ilce of ilceListesi) {
      if (ilceler.length >= limit) break;
      if (!agacAnahtari(ilce).includes(anahtar)) continue;
      ilceler.push({
        tur: 'ilce',
        etiket: `${il} › ${ilce}`,
        // ⚠ İLÇE SÜZGECİ YOK: `arac_arama`nın `p_suzgec` anahtarları arasında
        // `ilce` bulunmuyor. Ama `vehicles.arama_metni` ilçeyi içerdiği için
        // serbest metin araması ilçeyi buluyor. Gerçek süzgeç çipi istenirse
        // RPC'ye parametre eklemek gerekir — ayrı iş.
        adres: `/arama?q=${encodeURIComponent(ilce)}`,
      });
    }
  }

  // Önce iller: kullanıcı genelden özele iner ve il sayısı (81) ilçeden
  // (973) çok daha az, yani il eşleşmesi daha ayırt edici bir sinyal.
  return [...iller, ...ilceler];
}
