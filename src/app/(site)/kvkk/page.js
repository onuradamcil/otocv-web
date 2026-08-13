// =========================================================================
// KVKK AYDINLATMA METNİ ((site)/kvkk)
//
// Nihai metni hukuk danışmanı onayıyla site sahibi yazacak. Buradaki döküm
// sistemin FİİLEN ne yaptığını anlatıyor: şemadan ve RLS politikalarından
// okunmuş, doğrulanabilir bilgiler.
//
// ⚠ BELGE CÜMLESİ (aşağıda "Belgeler araçla kalır") nihai metinde MUTLAKA
// yer almalı. Ürün kararı gereği fatura belgeleri hesap kapatılsa da araç
// siciliyle kalıyor; bu kayıt altına alınmazsa tutulamayacak bir silme sözü
// verilmiş olur.
// =========================================================================

'use client';

import React from 'react';
import YasalSayfa from '@/components/legal/YasalSayfa';

const BOLUMLER = [
  {
    baslik: 'Hangi verileri tutuyoruz',
    satirlar: [
      { ad: 'Hesap bilgileri', deger: 'Ad, soyad, telefon numarası ve e-posta adresi. Kayıt sırasında sizin girdiğiniz değerler.' },
      { ad: 'Araç bilgileri', deger: 'Plaka, marka, model, yıl, kilometre, sigorta/kasko/muayene tarihleri, hasar beyanı ve araç fotoğrafları.' },
      { ad: 'Servis kayıtları', deger: 'Bakım tarihi, kilometre, servis adı, tutar ve açıklama. İsteğe bağlı olarak fatura görseli.' },
      { ad: 'Sahiplik geçmişi', deger: 'Bir aracın kaç kez el değiştirdiği ve her devirde onaylanan rıza metni.' },
      { ad: 'Sorgu kayıtları', deger: 'Karne sorgularında istek sayısı ve IP adresi. Yalnızca kötüye kullanımı engellemek için, bir saat sonra siliniyor.' },
    ],
  },
  {
    baslik: 'Kim ne görüyor',
    satirlar: [
      { ad: 'Siz', deger: 'Kendi araçlarınızın tamamı, yüklediğiniz fatura belgeleri ve profil bilgileriniz.' },
      { ad: 'Karne bağlantısını alan kişi', deger: 'Aracın bakım geçmişi ve sicil puanı. PLAKA GÖRÜNMEZ ve fatura görselleri açılmaz — yalnızca bir kaydın belgeli olup olmadığı yazar.' },
      { ad: 'Diğer kullanıcılar', deger: 'Yalnızca pazaryerinde yayımladığınız ilanlar. Araç kayıtlarınızın geri kalanı görünmez.' },
      { ad: 'Biz', deger: 'Teknik destek ve kötüye kullanım incelemesi için gerekli olduğunda.' },
    ],
  },
  {
    baslik: 'Plaka neden gizli',
    satirlar: [
      'Plaka, araç sahibine ulaşılabilecek kişisel bir veridir. Bu yüzden karne bağlantılarında ve paylaşılan sayfalarda plaka yer almaz; adres çubuğunda da taşınmaz. Paylaşılan karnede aracın kimliği yerine yalnızca sicil bilgileri görünür.',
    ],
  },
  {
    baslik: 'Hesabınızı kapattığınızda',
    satirlar: [
      'KVKK m.7 üç yol sayıyor: silme, yok etme veya anonim hale getirme. Hesap kapatmada anonimleştirme uygulanıyor.',
      { ad: 'Silinen', deger: 'Profil bilgileriniz (ad, soyad, telefon), bildirimleriniz ve yayındaki ilanlarınız.' },
      { ad: 'Anonimleşen', deger: 'Sahiplik geçmişi. "Bu aracın iki sahibi olmuş" bilgisi kalır, kim olduğunuz silinir.' },
      { ad: 'Kalan', deger: 'Araç kaydı ve servis geçmişi. Bunlar araca ait verilerdir; aracın sicili sahibinden bağımsız yaşar.' },
      { ad: 'Belgeler araçla kalır', deger: 'Yüklediğiniz servis belgeleri araç sicilinin parçasıdır; aracın el değiştirmesi veya hesabınızı kapatmanız hâlinde araç kaydıyla birlikte kalır. Belgelerinizin silinmesini ayrıca talep edebilirsiniz.' },
    ],
  },
  {
    baslik: 'Haklarınız',
    satirlar: [
      'Kişisel verilerinize erişme, düzeltme, silinmesini isteme ve işlemeye itiraz etme haklarına sahipsiniz. Profil bilgilerinizi hesap ekranınızdan doğrudan düzenleyebilirsiniz.',
      'Hesap kapatma ve belge silme talepleriniz için bizimle iletişime geçmeniz yeterli. Talebiniz kayıt altına alınır ve yapılan işlem kaydedilir.',
    ],
  },
];

export default function Page() {
  return (
    <YasalSayfa
      baslik="KVKK Aydınlatma Metni"
      ozet="Kişisel verilerinizin neden ve nasıl işlendiği hakkında bilgilendirme."
      bolumler={BOLUMLER}
    />
  );
}
