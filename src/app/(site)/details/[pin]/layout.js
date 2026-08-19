// =========================================================================
// ARAÇ DETAY SAYFASI METADATA'SI ((site)/details/[pin]/layout.js)
//
// -------------------------------------------------------------------------
// NİYE VAR
// -------------------------------------------------------------------------
// `/details/[pin]` projedeki TEK metadata'sız rotaydı (19 Ağustos 2026 beta
// taraması). Üstelik vitrinin en çok paylaşılacak sayfası: bir aracı birine
// göndermek demek bu adresi göndermek demek. Metadata olmadığı için
// WhatsApp/X/LinkedIn önizlemesinde ne başlık ne açıklama ne görsel çıkıyor,
// sekmede yalnızca site adı görünüyordu.
//
// -------------------------------------------------------------------------
// NİYE `layout.js`, `page.js` DEĞİL
// -------------------------------------------------------------------------
// `page.js` bir istemci bileşeni (`'use client'`) ve istemci bileşenlerinden
// `generateMetadata` export EDİLEMİYOR. Aynı kalıp `karne/layout.js`te de
// kullanılıyor. Layout sunucuda kalıyor, sayfa istemcide.
//
// -------------------------------------------------------------------------
// ⚠ METADATA'DA GEÇMEYECEKLER — HUKUKİ VE KVKK
// -------------------------------------------------------------------------
//   • PLAKA: kişisel veri. `sicil_getir` zaten sahibi dışında null döndürüyor
//     ama burada hiç okunmuyor bile.
//   • ARAÇ FİYATI: ürünün temel kısıtı; platformu satış sitesi konumuna sokar.
//   • "ilan / satış / satıcı" kelimeleri: ürün dili kısıtı (`14-urun-dili`).
//
// -------------------------------------------------------------------------
// ⚠ VERİ YOKSA UYDURULMUYOR
// -------------------------------------------------------------------------
// RPC başarısız olursa ya da PIN geçersizse genel bir başlık dönüyor. Var
// olmayan bir aracın adını uydurmak, ürünün "beyan edilmeyeni beyan etme"
// kuralına aykırı olurdu.
// =========================================================================

import { createClient } from '@supabase/supabase-js';

const TABAN = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

const GENEL = {
  title: 'Araç Sicili',
  description:
    'Aracın bakım geçmişini, belgelerini ve sicil puanını inceleyin. '
    + 'Her kayıt beyana değil belgeye dayanıyor.',
};

/**
 * Aracın kamuya açık künyesini çeker.
 *
 * ⚠ SUNUCUDA AYRI BİR İSTEMCİ KURULUYOR. `src/lib/supabase.js` tarayıcı için
 * yazılmış: oturumu `localStorage`'a bağlıyor ve sunucuda `window` yok.
 * Burada oturumsuz, tek seferlik bir istemci yeterli — `sicil_getir` anon
 * role'e açık (migration'daki `grant execute ... to anon`).
 */
async function aracKunyesi(pin) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anahtar = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anahtar || !pin) return null;

  try {
    const sb = createClient(url, anahtar, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await sb.rpc('sicil_getir', { p_pin: pin });
    if (error || !data?.arac) return null;
    return data.arac;
  } catch {
    // Metadata üretimi sayfayı ÇÖKERTMEMELİ: önizleme kartı olmaması
    // sayfanın hiç açılmamasından iyidir.
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { pin } = await params;
  const arac = await aracKunyesi(pin);
  if (!arac) return GENEL;

  // Künye: marka + seri + model + donanım. Boş alanlar hiç yazılmıyor.
  const ad = [arac.brand, arac.series, arac.model, arac.package]
    .filter(Boolean).join(' ').trim();
  const baslik = ad ? (arac.year ? `${ad} (${arac.year})` : ad) : GENEL.title;

  // Açıklama yalnızca DOLU alanlardan kuruluyor.
  const parcalar = [];
  if (Number.isFinite(Number(arac.trust_score))) {
    parcalar.push(`Sicil puanı ${arac.trust_score}/100`);
  }
  if (Number.isFinite(Number(arac.km))) {
    parcalar.push(`${Number(arac.km).toLocaleString('tr-TR')} km`);
  }
  if (arac.fuel_type) parcalar.push(arac.fuel_type);
  if (arac.transmission) parcalar.push(arac.transmission);
  if (arac.city) parcalar.push(arac.city);

  const aciklama = parcalar.length
    ? `${parcalar.join(' · ')}. Aracın bakım geçmişini ve belgelerini inceleyin.`
    : GENEL.description;

  // ⚠ GÖRSEL YALNIZCA GERÇEKTEN VARSA. `image_url` virgülle ayrılmış çoklu
  // adres tutabiliyor; ilki alınıyor. Yoksa kök `opengraph-image` devreye
  // giriyor — uydurma bir araç fotoğrafı konmuyor.
  const ilkGorsel = arac.image_url ? String(arac.image_url).split(',')[0].trim() : null;

  return {
    title: baslik,
    description: aciklama,
    alternates: { canonical: `/details/${pin}` },
    openGraph: {
      title: `${baslik} | Oto.CV`,
      description: aciklama,
      url: `${TABAN}/details/${pin}`,
      type: 'website',
      ...(ilkGorsel ? { images: [{ url: ilkGorsel }] } : {}),
    },
    twitter: {
      card: ilkGorsel ? 'summary_large_image' : 'summary',
      title: `${baslik} | Oto.CV`,
      description: aciklama,
    },
  };
}

export default function Layout({ children }) {
  return children;
}
