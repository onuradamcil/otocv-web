// =========================================================================
// GİZLİLİK POLİTİKASI ((site)/gizlilik)
//
// KVKK sayfası "hangi veri, hangi hak" anlatıyor; burası veriyi teknik olarak
// NASIL koruduğumuzu anlatıyor. İkisi ayrı sayfa çünkü okuyucuları farklı:
// biri hakkını arıyor, diğeri güvende olup olmadığını.
//
// Buradaki maddeler uygulanmış önlemler — pazarlama cümlesi değil. Her biri
// veritabanındaki bir politikaya ya da koda karşılık geliyor.
// =========================================================================

'use client';

import React from 'react';
import YasalSayfa from '@/components/legal/YasalSayfa';

const BOLUMLER = [
  {
    baslik: 'Fatura belgeleri özel alanda',
    satirlar: [
      'Yüklediğiniz fatura görselleri herkese açık bir adreste durmuyor. Özel bir alanda saklanıyor ve yalnızca aracın sahibi için, birkaç dakika geçerli olan geçici bağlantılarla açılıyor. Bağlantının süresi dolduğunda dosya yeniden kapanıyor.',
    ],
  },
  {
    baslik: 'Karne paylaşımı plakayı açmıyor',
    satirlar: [
      'Karnenizi paylaştığınızda karşı taraf bakım geçmişini ve sicil puanını görür; plakayı görmez. Bağlantı, plaka yerine paylaşılmak üzere üretilmiş bir koda dayanır.',
      'Araç el değiştirdiğinde bu kod yenilenir. Böylece önceki sahibin paylaştığı bağlantılar çalışmayı bırakır.',
    ],
  },
  {
    baslik: 'Toplu sorgulamaya karşı sınır',
    satirlar: [
      'Karne sorgularına IP başına hız sınırı uygulanıyor. Amaç, sicillerin otomatik araçlarla taranmasını engellemek. Sınıra takıldığınızda size "araç bulunamadı" denmez — gerçek sebep söylenir.',
    ],
  },
  {
    baslik: 'Devirde ne aktarılıyor',
    satirlar: [
      'Araç devrinde bakım kayıtları ve fatura belgeleri araçla birlikte yeni sahibine geçer. Bu, devir öncesinde aracı devreden kişiye açıkça onaylatılır ve onaylanan metin kayıt altına alınır.',
      'Sahibi hesabını kapatmış bir aracın sicili devralınırken iki yol vardır. Belge doğrulaması yapılmayan hızlı yolda bakım kayıtları aktarılır ancak önceki sahibin kişisel bilgilerini taşıyabilecek fatura görselleri KAPALI kalır.',
    ],
  },
  {
    baslik: 'Erişim kontrolü veritabanında',
    satirlar: [
      'Kimin neyi görebileceği arayüzde değil veritabanı düzeyinde belirleniyor. Yani uygulamayı atlayıp doğrudan veri katmanına gitmek de aynı sınırlara tabi.',
    ],
  },
  {
    baslik: 'Çerezler',
    satirlar: [
      'Oturumunuzu açık tutmak için gerekli olanlar dışında çerez kullanılmıyor. Reklam ya da izleme çerezi bulunmuyor.',
    ],
  },
];

export default function Page() {
  return (
    <YasalSayfa
      baslik="Gizlilik Politikası"
      ozet="Verilerinizi teknik olarak nasıl koruduğumuz."
      bolumler={BOLUMLER}
    />
  );
}
