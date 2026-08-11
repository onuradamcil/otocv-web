// =========================================================================
// (site) GRUP SEVİYESİ YÜKLENME İSKELETİ
//
// NE ZAMAN GÖRÜNÜR: Next.js bir rota segmentine geçerken sunucu tarafı iş
// bitene kadar bunu basar. Yani ilk gezinmede kısa bir an, sonra gerçek
// içerik gelir.
//
// NEDEN (site) İÇİNDE, KÖKTE DEĞİL: kökte olsaydı yüklenirken header ve
// footer da kaybolurdu. Burada çatı ekranda kalıyor, yalnızca içerik alanı
// iskelet gösteriyor — kullanıcı nerede olduğunu kaybetmiyor.
//
// NEDEN "sade" VARYANTI: bu dosya (site) altındaki TÜM rotalara uygulanır —
// garaj ve vitrin (kart ızgaralı), araç detayı (galeri + künye) ve veri
// çekmeyen "yakında" yer tutucuları. Hepsine kart ızgarası basmak yanlış
// beklenti kurar. Şekli belli olan rotalar kendi loading.js dosyasında
// kendi varyantını veriyor (details, karne, add-vehicle).
//
// Kendi iskeletini elle çizmiyor: tek yükleme dili GlobalStepLoader'da.
// =========================================================================

import React from 'react';
import GlobalStepLoader from '@/components/common/GlobalStepLoader';

export default function Loading() {
  return <GlobalStepLoader mode="iskelet" varyant="sade" />;
}
