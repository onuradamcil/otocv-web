// =========================================================================
// VİTRİN KARTI ROTASI ((site)/garage/[pin]/vitrin/page.js)
//
// `PublishListingModal` buraya taşındı. Modal yerine sayfa olmasının
// gerekçesi bileşen başlığında; kısaca: çok alanlı form modalda adresini,
// geri tuşunu ve mobilde ekranın yarısını kaybediyor.
//
// Adres PIN tabanlı, plaka değil — plaka kişisel veri, URL'de taşınmaz.
// Aynı kural detay ve karne rotalarında da geçerli.
// =========================================================================

'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { pinNormalize } from '@/utils/pinUretici';
import VitrinKartiEkrani from '@/components/garage/VitrinKartiEkrani';

export default function VitrinPage() {
  const params = useParams();
  const pin = pinNormalize(decodeURIComponent(params?.pin || ''));

  return <VitrinKartiEkrani pin={pin} />;
}
