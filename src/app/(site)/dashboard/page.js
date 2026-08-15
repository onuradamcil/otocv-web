// =========================================================================
// BANA ÖZEL ÖZET ROTASI ((site)/dashboard)
//
// Eskiden `ComingSoon` yer tutucusuydu. Vaadi — "araçlarınızın durumunu,
// yaklaşan tarihleri ve bakım özetini tek ekranda toplayan panel" — artık
// gerçek veriyle karşılanıyor; mantık `OzetEkrani` içinde.
// =========================================================================

'use client';

import React from 'react';
import OzetEkrani from '@/components/OzetEkrani';

export default function Page() {
  return <OzetEkrani />;
}
