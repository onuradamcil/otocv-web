// =========================================================================
// ARAÇ DETAYI YÜKLENME İSKELETİ ((site)/details/[pin]/loading.js)
//
// Bu dosya, üstündeki (site)/loading.js yerine geçer — Next.js en yakın
// loading.js'i kullanır. Buraya ayrı bir tane koymamızın sebebi: detay
// sayfasının yerleşimi (solda büyük galeri, sağda künye paneli) grup
// seviyesindeki nötr iskeletten tamamen farklı. Yer tutucu gelen içeriğin
// şeklini taşımazsa içerik geldiğinde yerleşim zıplar ve kullanıcı yanlış
// şeyi beklemiş olur.
//
// Bu sayfa sitenin en çok ziyaret edilen herkese açık ekranı: karne
// bağlantısıyla gelen alıcı buraya düşüyor. O yüzden ilk izlenimin doğru
// olması özellikle önemli.
// =========================================================================

import React from 'react';
import GlobalStepLoader from '@/components/common/GlobalStepLoader';

export default function Loading() {
  return <GlobalStepLoader mode="iskelet" varyant="detay" />;
}
