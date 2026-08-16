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

/**
 * Panelde gösterilen üç belge türü. Sıra ekranda da bu sırayla çiziliyor.
 *
 * `tur` teklif akışının kullandığı kalıcı kod. Ekran adı ("Kasko Poliçesi")
 * değişebilir; `tur` veritabanına yazıldığı için değişemez. İkisi ayrı
 * tutuluyor ki bir başlık düzenlemesi kayıtlı talepleri bozmasın.
 */
const BELGELER = [
  { alan: 'traffic_insurance_end_date', ad: 'Trafik Sigortası', tur: 'trafik' },
  { alan: 'kasko_end_date', ad: 'Kasko Poliçesi', tur: 'kasko' },
  { alan: 'inspection_end_date', ad: 'TÜVTÜRK Muayenesi', tur: 'muayene' },
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
      .select('plate_number, brand, model, year, km, trust_score, pin_code, '
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
        // `km_at_service`, `next_service_km` ve `shop_name` bakım ekranı için.
        // Panel bunları kullanmıyor ama İKİNCİ BİR SORGU YAZMAMAK için
        // buradan geliyorlar: iki ayrı yerden okunan aynı veri, zamanla iki
        // farklı doğruya ayrışıyor.
        .select('vehicle_plate, service_date, km_at_service, next_service_km, shop_name')
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
        // ⚠ PIN ZORUNLU: araç düzenleme rotası `/garage/[pin]/duzenle`
        // PLAKA değil PIN bekliyor. İlk yazımda plaka gönderilmiş ve ekran
        // "Araç bulunamadı" demişti — satır tıklanabilirdi ama hiçbir yere
        // götürmüyordu. Testte satıra TIKLANMADIĞI için de yakalanmamıştı.
        pin: arac.pin_code,
        arac: [arac.brand, arac.model].filter(Boolean).join(' '),
        belge: belge.ad,
        // Teklif akışının kullandığı kalıcı kod — ekran adından ayrı.
        tur: belge.tur,
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

  // --- 2b · ARAÇ BAZINDA BAKIM DURUMU ------------------------------------
  //
  // ⚠ BAKIM ARALIĞI UYDURULMUYOR.
  // "Her 15.000 km'de bakım gerekir" demek kolay olurdu ama bu üreticiye,
  // motora ve kullanıma göre değişiyor; bilmediğimiz bir şeyi kural gibi
  // sunmak, temizlediğimiz uydurma veri sınıfının aynısı olurdu.
  //
  // Onun yerine YALNIZCA bilinen üç şey söyleniyor:
  //   · araca ait hiç kayıt var mı
  //   · son bakımın üstünden ne kadar geçti (service_date gerçek)
  //   · kullanıcı sonraki bakım km'sini KENDİ beyan ettiyse ne kadar kaldı
  //
  // `next_service_km` kullanıcının kendi girdiği değer — bizim tahminimiz
  // değil. Canlıda 13 kaydın yalnızca 2'sinde dolu; o yüzden yokluğu
  // normal karşılanıyor ve bölüm çizilmiyor.
  const bakimDetay = araclar.map((arac) => {
    const aracKayitlari = kayitlar
      .filter((k) => k.vehicle_plate === arac.plate_number && k.service_date)
      .sort((a, b) => new Date(b.service_date) - new Date(a.service_date));

    const son = aracKayitlari[0] || null;

    // Son bakımdan bu yana geçen ay. Gün farkını 30'a bölmek yerine takvim
    // ayı sayılıyor — "18 ay önce" ile "547 gün önce" aynı şey değil.
    let gecenAy = null;
    if (son) {
      const t = new Date(son.service_date);
      const bugun = new Date();
      gecenAy = (bugun.getFullYear() - t.getFullYear()) * 12
        + (bugun.getMonth() - t.getMonth());
      if (bugun.getDate() < t.getDate()) gecenAy -= 1;
      if (gecenAy < 0) gecenAy = 0;
    }

    // Sonraki bakıma kalan km — yalnızca İKİ değer de varsa.
    const suAnkiKm = typeof arac.km === 'number' ? arac.km : null;
    const hedefKm = son && typeof son.next_service_km === 'number' ? son.next_service_km : null;
    const kalanKm = (hedefKm !== null && suAnkiKm !== null) ? hedefKm - suAnkiKm : null;

    return {
      plaka: arac.plate_number,
      pin: arac.pin_code,
      arac: [arac.brand, arac.model].filter(Boolean).join(' '),
      km: suAnkiKm,
      kayitSayisi: aracKayitlari.length,
      sonTarih: son ? son.service_date : null,
      sonServis: son ? son.shop_name : null,
      sonKm: son && typeof son.km_at_service === 'number' ? son.km_at_service : null,
      gecenAy,
      hedefKm,
      kalanKm,
    };
  });

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
      // Araç bazında ayrıntı — bakım ekranı bunu kullanıyor.
      detay: bakimDetay,
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
