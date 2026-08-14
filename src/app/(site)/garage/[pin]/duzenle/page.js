// =========================================================================
// ARAÇ KAYDI DÜZENLEME ROTASI ((site)/garage/[pin]/duzenle/page.js)
//
// Vitrin kartı ekranı "araç kaydınızda il/ilçe/açıklama eksik" diyordu ama
// düzeltilecek yer yoktu — tek bağlantı salt okunur detay sayfasına
// gidiyordu. Bu rota o çıkışsız yolu kapatıyor.
//
// Adres PIN tabanlı, plaka değil: plaka kişisel veri, URL'de taşınmaz.
// =========================================================================

'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { pinNormalize } from '@/utils/pinUretici';
import AracKaydiDuzenleEkrani from '@/components/garage/AracKaydiDuzenleEkrani';

export default function AracDuzenlePage() {
  const params = useParams();
  const pin = pinNormalize(decodeURIComponent(params?.pin || ''));

  return <AracKaydiDuzenleEkrani pin={pin} />;
}
