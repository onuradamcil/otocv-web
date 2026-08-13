// =========================================================================
// OTO-CV HESABIM ROUTE'U ((site)/account/page.js)
//
// Yer tutucu (`ComingSoon`) kaldırıldı. Ekran kendi oturum kontrolünü
// yapıyor: oturum yoksa /login'e yönlendirmek yerine ne yapılması
// gerektiğini söylüyor. Yönlendirme, kullanıcı doğrudan bu adrese
// geldiğinde nereye gittiğini anlamasını zorlaştırıyordu.
// =========================================================================

'use client';

import React from 'react';
import HesabimEkrani from '@/components/account/HesabimEkrani';

export default function Page() {
  return <HesabimEkrani />;
}
