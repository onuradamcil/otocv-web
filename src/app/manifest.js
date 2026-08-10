// =========================================================================
// OTO-CV PWA MANIFEST (manifest.js)
// İşlev: Telefonda "ana ekrana ekle" desteği ve tarayıcı tema rengi.
//        Renkler tasarım diliyle aynı: zemin #FFFDFB, tema #0F172A.
// =========================================================================

export default function manifest() {
  return {
    name: 'Oto.CV — Dijital Taşıt Sicili',
    short_name: 'Oto.CV',
    description:
      'Aracınızın bakım geçmişini dijital sicil olarak tutun, sigorta ve muayene tarihlerini kaçırmayın.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFFDFB',
    theme_color: '#0F172A',
    lang: 'tr',
    icons: [
      { src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
    ],
  };
}
