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
}
