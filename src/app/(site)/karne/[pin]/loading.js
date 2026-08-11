// =========================================================================
// OTO-KARNE YÜKLENME İSKELETİ ((site)/karne/[pin]/loading.js)
//
// Karne ekranı da solda belge / sağda panel düzeninde olduğu için "detay"
// varyantını kullanıyor. Grup seviyesindeki nötr iskelet burada yetersiz
// kalırdı.
//
// Not: bu ekranın İÇİNDEKİ resmi döküm alanı ayrıca kendi iskeletini
// gösteriyor (OtoKarneScreen içinde varyant="liste"). İkisi farklı
// beklemeler: bu dosya rotanın açılmasını, oradaki ise bakım kayıtlarının
// veritabanından gelmesini karşılıyor.
// =========================================================================

import React from 'react';
import GlobalStepLoader from '@/components/common/GlobalStepLoader';

export default function Loading() {
  return <GlobalStepLoader mode="iskelet" varyant="detay" />;
}
