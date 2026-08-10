// =========================================================================
// OTO-CV GİRİŞ ROUTE'U ((full)/login/page.js)
// İşlev: Giriş ekranını tam sayfa açar, başarılı girişte garaja taşır.
// =========================================================================

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import VehicleAuthScreen from '@/components/VehicleAuthScreen';

export default function LoginPage() {
  const router = useRouter();

  return (
    <VehicleAuthScreen
      initialMode="login"
      onAuthSuccess={() => router.push('/garage')}
      onBack={() => router.push('/')}
    />
  );
}
