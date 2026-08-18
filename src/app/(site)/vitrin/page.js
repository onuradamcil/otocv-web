// =========================================================================
// VİTRİN — TÜM ARAÇLAR ROTASI ((site)/vitrin/page.js)
//
// -------------------------------------------------------------------------
// NİYE VAR
// -------------------------------------------------------------------------
// Anasayfadaki vitrin eskiden "12 kart göster, gerisini yerinde aç" diye
// çalışıyordu: envanter büyüdükçe anasayfa sınırsız uzuyordu. Ürün sahibi
// bunu reddetti — anasayfa sabit sayıda kart gösteriyor (24) ve sığmayanların
// adresi burası.
//
// Referans siteler de böyle: anasayfa bir vitrin, tam liste ayrı bir sayfa.
//
// -------------------------------------------------------------------------
// SAYFA SUNUCU BİLEŞENİ
// -------------------------------------------------------------------------
// `metadata` yalnızca sunucu bileşenlerinden export edilebiliyor. Anasayfada
// da aynı kalıp kullanıldı: rota sunucuda kalıyor, yönlendirme gerektiren
// istemci mantığı `VitrinIstemci`ye iniyor.
// =========================================================================

import VitrinIstemci from '@/components/marketplace/VitrinIstemci';

export const metadata = {
  // ⚠ Düz metin: kök layout'ta `title.template = '%s | Oto.CV'` tanımlı.
  title: 'Vitrindeki Araçlar',
  description:
    'Sicili tutulan araçları marka, model, şehir, model yılı ve kilometreye '
    + 'göre süzerek inceleyin. Her aracın sicil puanı kartında görünüyor.',
  alternates: { canonical: '/vitrin' },
  openGraph: {
    title: 'Vitrindeki Araçlar | Oto.CV',
    description:
      'Sicili tutulan araçları süzgeçlerle inceleyin; her aracın sicil puanı '
      + 'kartında görünüyor.',
    url: '/vitrin',
    type: 'website',
  },
};

export default function VitrinRotasi() {
  return <VitrinIstemci />;
}
