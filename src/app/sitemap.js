// =========================================================================
// OTO-CV SAYFA HARİTASI (sitemap.js)
//
// Yalnızca indekslenmesi istenen route'lar. /details/[pin] dinamik ve sayısı
// arttıkça değişecek; ilk aşamada haritaya eklenmiyor. Gerekirse ikinci
// aşamada veritabanından üretilir (aktif vitrin kayıtları üzerinden).
// =========================================================================

import { createClient } from '@supabase/supabase-js';

const TABAN = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// =========================================================================
// ⚠ ARAÇ SAYFALARI SITEMAP'E EKLENDİ
//
// Önceden sitemap yalnızca 6 statik adres içeriyordu; vitrinin ASIL içeriği
// (`/details/[pin]`) hiç yoktu. Yani arama motoru ürünün tek indekslenebilir
// içeriğini keşfedemiyordu. (19 Ağustos 2026 beta taraması.)
//
// ⚠ YALNIZCA VİTRİN KATMANI. `arac_arama` iki katman döndürüyor:
//   vitrin         -> sahibi ücret ödeyip teşhire çıkarmış, karnesi paylaşımda
//   listelenebilir -> aranabilir ama karnesi KAPALI (pin_code null)
// Karnesi kapalı aracın detay sayfası zaten içerik göstermiyor; sitemap'e
// koymak arama motoruna boş sayfa vaat etmek olurdu.
//
// ⚠ PIN'İ OLMAYAN SATIR ATLANIYOR: adres `/details/<pin>` ve PIN yoksa
// üretilecek geçerli bir adres de yok.
//
// ⚠ HATA SITEMAP'İ ÇÖKERTMİYOR. RPC ulaşılamazsa statik liste yine dönüyor;
// sitemap'in hiç üretilmemesi, eksik üretilmesinden kötüdür.
// =========================================================================
async function aracAdresleri() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anahtar = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anahtar) return [];

  try {
    const sb = createClient(url, anahtar, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    // Sayfa tavanı 100; sitemap için ilk sayfa yeterli. Envanter büyüdüğünde
    // sayfalı gezinme ya da ayrı bir sitemap indeksi gerekecek.
    const { data, error } = await sb.rpc('arac_arama', {
      p_suzgec: {},
      p_limit: 100,
      p_offset: 0,
      p_demo: false,          // demo kartlar arama motoruna gitmemeli
      p_katman: 'vitrin',
    });
    if (error || !data?.satirlar) return [];

    return data.satirlar
      .filter((s) => s.pin_code)
      .map((s) => ({
        url: `${TABAN}/details/${encodeURIComponent(s.pin_code)}`,
        lastModified: s.created_at ? new Date(s.created_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      }));
  } catch {
    return [];
  }
}

export default async function sitemap() {
  const simdi = new Date();
  const statik = [
    { url: `${TABAN}/`, lastModified: simdi, changeFrequency: 'daily', priority: 1 },
    { url: `${TABAN}/verify`, lastModified: simdi, changeFrequency: 'monthly', priority: 0.8 },
    // Vitrinin tam listesi. Anasayfa sabit 24 kart gösteriyor; sığmayan
    // araçların tek adresi burası, dolayısıyla indekslenmesi gereken
    // içerik de burada. `daily`: envanter kullanıcı kaydıyla değişiyor.
    { url: `${TABAN}/vitrin`, lastModified: simdi, changeFrequency: 'daily', priority: 0.9 },
    // Yasal sayfalar indekslenmeli: kullanıcı "oto.cv kvkk" diye aradığında
    // bulabilmeli ve arama motoru sitenin bu metinlere sahip olduğunu görmeli.
    { url: `${TABAN}/kvkk`, lastModified: simdi, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${TABAN}/gizlilik`, lastModified: simdi, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${TABAN}/kullanim-sartlari`, lastModified: simdi, changeFrequency: 'yearly', priority: 0.3 },
  ];

  // ⚠ `/arama` BİLEREK YOK: arama sonuçları `robots.js`te de kapalı, ince ve
  // yinelenen içerik üretiyorlar.
  return [...statik, ...(await aracAdresleri())];
}
