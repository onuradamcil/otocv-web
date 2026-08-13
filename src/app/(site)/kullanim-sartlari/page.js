// =========================================================================
// KULLANIM ŞARTLARI ((site)/kullanim-sartlari)
//
// Nihai metin hukuk danışmanı onayıyla yazılacak. Buradaki maddeler ürünün
// fiilen uyguladığı kuralları anlatıyor — hepsi koda ya da veritabanı
// kısıtlarına karşılık geliyor, hiçbiri temenni değil.
// =========================================================================

'use client';

import React from 'react';
import YasalSayfa from '@/components/legal/YasalSayfa';

const BOLUMLER = [
  {
    baslik: 'Sicil kaydının doğruluğu',
    satirlar: [
      'Araç ve bakım bilgilerini siz giriyorsunuz; doğruluğundan siz sorumlusunuz. Sistem beyanınızı doğrulamaz, ancak sicil puanı beyanı belgeye dayanan kayıtlara daha fazla ağırlık verir.',
      'Sicil puanı bir değerleme ya da ekspertiz raporu değildir. Yalnızca kayıtların ne kadarının belgelendiğini ve kendi içinde tutarlı olduğunu özetler.',
    ],
  },
  {
    baslik: 'Araç kaydı',
    satirlar: [
      'Bir araç sisteme yalnızca bir kez kaydedilebilir. İlk aracınız ücretsizdir; sonraki araçlar için ek araç kaydı gerekir.',
      'Aracı satın aldıysanız yeniden kaydetmek yerine sicili devralırsınız. Böylece geçmiş servis kayıtları kaybolmaz.',
    ],
  },
  {
    baslik: 'Devir',
    satirlar: [
      'Devir geri alınamaz. Tamamlandığında araç, bakım kayıtları ve fatura belgeleri yeni sahibine geçer; sizin erişiminiz sona erer.',
      'Devir talebi göndermek taciz aracına dönüşmesin diye sınırlıdır: günde en fazla üç farklı araç, araç başına tek bekleyen talep ve reddedilen talepten sonra yedi gün bekleme.',
    ],
  },
  {
    baslik: 'Sahipsiz araç sicilini devralma',
    satirlar: [
      'Sahibi hesabını kapatmış bir aracın sicilini devralırken aracın gerçekten size ait olduğunu beyan edersiniz. Gerçeğe aykırı beyan hâlinde sicil geri alınabilir ve doğacak sorumluluk beyanı verene aittir.',
      'Ruhsat doğrulaması yapılmayan hızlı yolda fatura belgeleri açılmaz. Bu, önceki sahibin kişisel bilgilerini korumak içindir; ek ücret ödemeden ruhsatınızı doğrulatarak belgeleri açabilirsiniz.',
    ],
  },
  {
    baslik: 'İlanlar',
    satirlar: [
      'İlan içeriğinden ilan sahibi sorumludur. Yanıltıcı bilgi içeren ilanlar kaldırılabilir.',
      'Vitrin dopingi ilanın görünürlüğünü artırır; satış garantisi vermez.',
    ],
  },
  {
    baslik: 'Ücretler',
    satirlar: [
      'Ücretli işlemler tek seferliktir; abonelik ve tekrar eden ödeme yoktur. Güncel tutarlar Ücretler sayfasında yer alır.',
      'Ödeme altyapısı henüz devrede değildir. Şu an hiçbir işlemde tahsilat yapılmamaktadır.',
    ],
  },
  {
    baslik: 'Hesabın kapatılması',
    satirlar: [
      'Hesabınızı kapattığınızda kişisel bilgileriniz silinir; araç kayıtları ve servis geçmişi anonimleştirilerek korunur. Ayrıntı KVKK Aydınlatma Metni sayfasındadır.',
    ],
  },
];

export default function Page() {
  return (
    <YasalSayfa
      baslik="Kullanım Şartları"
      ozet="Hizmeti kullanırken geçerli olan kurallar."
      bolumler={BOLUMLER}
    />
  );
}
