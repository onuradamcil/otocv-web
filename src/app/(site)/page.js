// =========================================================================
// OTO-CV ANASAYFA ROTASI ((site)/page.js)
//
// ⚠ BU DOSYA ARTIK SUNUCU BİLEŞENİ — VE BU BİR DÜZELTME.
//
// Eskiden `'use client'` idi ve bu yüzden anasayfanın KENDİNE AİT metadata'sı
// yoktu: başlık ve açıklama kökteki genel değerlerden geliyordu. Oysa `/`
// sitenin en çok ziyaret edilen sayfası ve `sitemap.js`'te `priority 1`
// veriliyor.
//
// Next kuralı: `metadata` yalnızca sunucu bileşenlerinden export edilebiliyor
// (`node_modules/next/dist/docs/.../generate-metadata.md:110`). Dokümanın
// önerdiği çözüm de uygulanan bu: sayfa sunucuda kalıyor, yönlendirme
// gerektiren istemci mantığı ayrı bir bileşene taşınıyor (aynı doküman, :120).
//
// Projedeki diğer istemci sayfalar bunu KARDEŞ `layout.js` ile çözüyor
// (ör. `dashboard/layout.js`). Anasayfada o yol kapalı: `/` rotasının
// layout'u `(site)/layout.js`, yani grubun tamamı — oraya konan metadata
// bütün site rotalarına sızardı.
// =========================================================================

import AnasayfaIstemci from '@/components/marketplace/AnasayfaIstemci';

export const metadata = {
  // ⚠ `title` düz metin: kök layout'ta `title.template = '%s | Oto.CV'`
  // tanımlı, yani buraya "… | Oto.CV" yazmak adı iki kez basardı.
  title: 'Dijital Taşıt Sicili ve Bakım Karnesi',
  description:
    'Aracınızın bakım geçmişini dijital sicil olarak tutun, sigorta ve muayene '
    + 'tarihlerini kaçırmayın. PIN kodu ile bir aracın sicil karnesini görüntüleyin.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Oto.CV | Dijital Taşıt Sicili ve Bakım Karnesi',
    description:
      'Bir aracın bakım geçmişini PIN kodu ile görüntüleyin ya da kendi aracınızın '
      + 'sicilini oluşturun.',
    url: '/',
    type: 'website',
  },
};

export default function AnasayfaRotasi() {
  return <AnasayfaIstemci />;
}
