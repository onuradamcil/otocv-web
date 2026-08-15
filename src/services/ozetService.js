// =========================================================================
// BANA ÖZEL ÖZET — VERİ KATMANI
//
// -------------------------------------------------------------------------
// NİYE AYRI DOSYA
// -------------------------------------------------------------------------
// Panel yalnızca GERÇEKTEN VAR OLAN veriyi göstermeli. Veri toplama ile
// çizim aynı dosyada olsaydı, eksik bir alanı "|| 0" ile doldurmak çok
// kolay olurdu — bu projede tam olarak o hata birkaç kez yapıldı
// (uydurma plaka, uydurma şasi, hep sıfır gösteren sayaçlar).
//
// Burada kural açık: alan yoksa `null` dönüyor, panel de o bölümü
// GÖSTERMİYOR. Sıfır ile "bilinmiyor" aynı şey değil.
//
// -------------------------------------------------------------------------
// NİYE TEK SORGU DEĞİL
// -------------------------------------------------------------------------
// Araçlar ve vitrin kayıtları tek sorguda geliyor (`vehicles` + iç içe
// `listings`). Bakım kayıtları ayrı, çünkü `maintenance_records` araca
// değil PLAKAYA bağlı ve iç içe sorgu ilişkisi yok.
//
// İkisi de RLS altında: kullanıcı yalnızca kendi araçlarını ve kendi
// kayıtlarını görüyor. Panelin ayrıca süzmesine gerek yok — ama yine de
// `user_id` ile süzülüyor, çünkü RLS'e güvenmek ile RLS'i tek savunma
// hattı yapmak farklı şeyler.
// =========================================================================

import { supabase } from '../lib/supabase';
import { calculatePolicyStatus } from '../utils/dateHelper';

/** Panelde gösterilen üç belge türü. Sıra ekranda da bu sırayla çiziliyor. */
const BELGELER = [
  { alan: 'traffic_insurance_end_date', ad: 'Trafik Sigortası' },
  { alan: 'kasko_end_date', ad: 'Kasko Poliçesi' },
  { alan: 'inspection_end_date', ad: 'TÜVTÜRK Muayenesi' },
];

/**
 * Panelin ihtiyaç duyduğu her şeyi tek çağrıda toplar.
 *
 * @returns {Promise<{basarili: boolean, veri?: object, hata?: string}>}
 */
export async function ozetGetir() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { basarili: false, hata: 'Oturum bulunamadı.' };

    const { data: araclar, error: aracHata } = await supabase
      .from('vehicles')
      .select('plate_number, brand, model, year, trust_score, pin_code, '
        + 'traffic_insurance_end_date, kasko_end_date, inspection_end_date, '
        + 'listings(id, status, views_count, favorite_count)')
      .eq('user_id', user.id);

    if (aracHata) throw aracHata;

    const plakalar = (araclar || []).map((a) => a.plate_number);

    // Araç yoksa bakım sorgusu da anlamsız; boş `in()` sorgusu ayrıca
    // PostgREST'te hataya yol açıyor.
    let kayitlar = [];
    if (plakalar.length > 0) {
      const { data, error } = await supabase
        .from('maintenance_records')
        .select('vehicle_plate, service_date')
        .in('vehicle_plate', plakalar);
      if (error) throw error;
      kayitlar = data || [];
    }

    return { basarili: true, veri: ozetHesapla(araclar || [], kayitlar) };
  } catch (hata) {
    console.error('Özet verisi alınamadı:', hata.message);
    return { basarili: false, hata: hata.message };
  }
}

/**
 * Ham veriyi panelin çizeceği biçime indirger.
 *
 * ⚠ SAF FONKSİYON — ağ çağrısı yok. Böylece testten doğrudan çağrılabiliyor
 * ve "ekranda ne yazıyor" ile "veride ne var" ayrı ayrı denetlenebiliyor.
 *
 * @param {Array} araclar
 * @param {Array} kayitlar
 */
export function ozetHesapla(araclar, kayitlar) {
  // --- 1 · YAKLAŞAN TARİHLER ---------------------------------------------
  // Her araç için üç belge ayrı satır. Tarihi GİRİLMEMİŞ olanlar listeye
  // alınmıyor: "girilmedi" bir uyarı değil, eksik veri. Onlar ayrıca
  // sayılıyor ki kullanıcı neyi doldurması gerektiğini görsün.
  const tarihler = [];
  let eksikTarih = 0;

  for (const arac of araclar) {
    for (const belge of BELGELER) {
      const durum = calculatePolicyStatus(arac[belge.alan]);
      if (durum.status === 'unknown') { eksikTarih += 1; continue; }
      tarihler.push({
        plaka: arac.plate_number,
        arac: [arac.brand, arac.model].filter(Boolean).join(' '),
        belge: belge.ad,
        tarih: arac[belge.alan],
        durum,
      });
    }
  }

  // Önce süresi dolanlar, sonra yaklaşanlar, sonra güvenli olanlar.
  const SIRA = { expired: 0, warning: 1, active: 2 };
  tarihler.sort((a, b) => SIRA[a.durum.status] - SIRA[b.durum.status]);

  // --- 2 · BAKIM ÖZETİ ----------------------------------------------------
  const kayitliPlakalar = new Set(kayitlar.map((k) => k.vehicle_plate));
  const tarihliKayitlar = kayitlar
    .map((k) => k.service_date)
    .filter(Boolean)
    .sort();

  // --- 3 · VİTRİN DURUMU --------------------------------------------------
  // `listings` iç içe geldiği için dizi ya da tekil nesne olabiliyor —
  // GarageScreen'de de aynı koruma var, orada canlıda ikisi de görüldü.
  let vitrindeki = 0;
  let goruntulenme = 0;
  let favori = 0;

  for (const arac of araclar) {
    const ilanlar = Array.isArray(arac.listings)
      ? arac.listings
      : (arac.listings ? [arac.listings] : []);
    for (const ilan of ilanlar) {
      if (ilan?.status !== 'active') continue;
      vitrindeki += 1;
      goruntulenme += ilan.views_count || 0;
      favori += ilan.favorite_count || 0;
    }
  }

  // --- 4 · SİCİL PUANI ----------------------------------------------------
  // ⚠ Puanı OLMAYAN araç ortalamaya katılmıyor. `?? 0` yazmak, puanı
  // girilmemiş bir aracı "sıfır puanlı" göstermek olurdu.
  const puanlar = araclar
    .map((a) => a.trust_score)
    .filter((p) => typeof p === 'number');

  return {
    aracSayisi: araclar.length,
    kritikler: tarihler.filter((t) => t.durum.isCritical),
    tumTarihler: tarihler,
    eksikTarih,
    bakim: {
      toplam: kayitlar.length,
      kayitliArac: kayitliPlakalar.size,
      kayitsizArac: araclar.length - kayitliPlakalar.size,
      sonTarih: tarihliKayitlar.length ? tarihliKayitlar[tarihliKayitlar.length - 1] : null,
    },
    vitrin: { adet: vitrindeki, goruntulenme, favori },
    // Puan yoksa `null` — panel o kartı hiç göstermiyor.
    sicil: puanlar.length
      ? {
          ortalama: Math.round(puanlar.reduce((t, p) => t + p, 0) / puanlar.length),
          adet: puanlar.length,
          eksik: araclar.length - puanlar.length,
        }
      : null,
  };
}
