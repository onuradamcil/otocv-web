// =========================================================================
// OTO-CV ARAMA MOTORU TALİMATI (robots.js)
//
// Politika:
//   index    -> kamuya açık ve içerik taşıyan sayfalar (/ ve /verify)
//   noindex  -> oturum gerektiren üye alanı
//   noindex  -> /karne: sahibinin belge üretme aracı, aramada işlevi yok
//   noindex  -> yer tutucular: yalnızca "Yapım Aşamasında" kartı taşıyorlar,
//               içeriksiz sayfaların indekslenmesi sitenin genel kalite
//               sinyalini düşürür. İçerik geldiğinde açılacaklar.
//
// /details indekslenmeye AÇIK: bakım geçmişi ürünün kamuya açık değeri,
// plaka gizli, organik kazanım kanalı.
// =========================================================================

const TABAN = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/garage',
          '/my-listings',
          '/favorilerim',
          '/add-vehicle/',
          '/login',
          '/register',
          '/reset-password',
          '/karne/',
          '/dashboard',
          '/query-history',
          '/packages',
          '/account',
          '/insurance-offer',
          '/maintenance-planner',
          // ⚠ ARAMA SONUÇLARI İNDEKSLENMEMELİ. Aynı araçlar sayısız süzgeç
          // kombinasyonunda tekrar tekrar listelenir; arama motorları bunu
          // ince ve yinelenen içerik sayıyor ve tarama bütçesi boşa gider.
          // İndekslenmesi gereken yüzeyler `/` ve `/vitrin`.
          '/arama',
        ],
      },
    ],
    sitemap: `${TABAN}/sitemap.xml`,
  };
}
