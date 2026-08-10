// =========================================================================
// OTO-CV SAYFA HARİTASI (sitemap.js)
//
// Yalnızca indekslenmesi istenen route'lar. /details/[pin] dinamik ve sayısı
// arttıkça değişecek; ilk aşamada haritaya eklenmiyor. Gerekirse ikinci
// aşamada veritabanından üretilir (aktif vitrin kayıtları üzerinden).
// =========================================================================

const TABAN = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default function sitemap() {
  const simdi = new Date();
  return [
    { url: `${TABAN}/`, lastModified: simdi, changeFrequency: 'daily', priority: 1 },
    { url: `${TABAN}/verify`, lastModified: simdi, changeFrequency: 'monthly', priority: 0.8 },
  ];
}
