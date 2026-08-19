// =========================================================================
// ARAMA SONUÇLARI ROTASI ((site)/arama/page.js)
//
// -------------------------------------------------------------------------
// NİYE AYRI BİR ROTA
// -------------------------------------------------------------------------
// Anasayfa üç işi birden yapıyordu: teşhir (vitrin), arama ve süzme. Semptomu
// da görünüyordu — ızgaranın başlığı `suzgecEtkin` durumuna göre "Vitrindeki
// Araçlar" ile "Süzgeç sonuçları" arasında gidip geliyordu. Aynı kutu bazen
// teşhir, bazen sonuç listesiydi.
//
// Ayrım artık yüzey düzeyinde:
//   /          -> teşhir (vitrin katmanı, SÜZÜLMEZ) + giriş kapıları
//   /vitrin    -> teşhirin tamamı, sayfalamalı
//   /arama     -> sonuç ekranı: arama + süzgeçler + yatay liste
//
// Anasayfadaki arama kutusu ve süzgeç seçimleri buraya yönlendiriyor.
//
// -------------------------------------------------------------------------
// ⚠ SUSPENSE ZORUNLU — SÜS DEĞİL
// -------------------------------------------------------------------------
// `AramaIstemci` adres çubuğundaki süzgeç parametrelerini `useSearchParams`
// ile okuyor. Next 16'da bu kanca, ön işlenen (prerender) bir rotada en
// yakın Suspense sınırına kadar olan istemci ağacını istemcide çizdiriyor;
// sınır YOKSA derleme hata veriyor.
// (node_modules/next/dist/docs/01-app/03-api-reference/04-functions/
//  use-search-params.md — "Behavior · Prerendering")
//
// Aynı kalıp `/vitrin` ve `/insurance-offer` rotalarında da var.
//
// -------------------------------------------------------------------------
// ⚠ `robots.js` BU ROTAYI TARAMAYA KAPATIYOR — BİLİNÇLİ
// -------------------------------------------------------------------------
// Arama sonucu sayfaları ince ve yinelenen içerik üretir: aynı araçlar
// sayısız süzgeç kombinasyonunda tekrar tekrar listelenir. Arama motorları
// bu tür adresleri zaten değersiz sayıyor; indekslenmesine izin vermek tarama
// bütçesini boşa harcar. İndekslenmesi gereken yüzeyler `/` ve `/vitrin`.
// =========================================================================

import { Suspense } from 'react';
import AramaIstemci from '@/components/marketplace/AramaIstemci';
import GlobalStepLoader from '@/components/common/GlobalStepLoader';

export const metadata = {
  // ⚠ Düz metin: kök layout'ta `title.template = '%s | Oto.CV'` tanımlı.
  title: 'Araç Arama',
  description:
    'Sicili tutulan araçları marka, seri, model, şehir, model yılı, '
    + 'kilometre ve sicil puanına göre arayın. Her aracın sicil puanı '
    + 'sonuç listesinde görünüyor.',
  alternates: { canonical: '/arama' },
  // ⚠ Arama sonuçları indekslenmemeli (yukarıdaki gerekçe). `robots.js`
  // zaten kapatıyor; burada da açıkça yazılıyor ki tek bir yere bakıp
  // "acaba indeksleniyor mu" sorusu doğmasın.
  robots: { index: false, follow: true },
};

export default function AramaRotasi() {
  return (
    <Suspense fallback={<GlobalStepLoader mode="iskelet" varyant="kart" adet={6} />}>
      <AramaIstemci />
    </Suspense>
  );
}
