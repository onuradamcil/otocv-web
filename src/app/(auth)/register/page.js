// =========================================================================
// OTO-CV HESAP AÇMA ROUTE'U ((full)/register/page.js)
// İşlev: Kayıt ekranını tam sayfa açar, başarılı kayıtta garaja taşır.
// =========================================================================

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import VehicleAuthScreen from '@/components/VehicleAuthScreen';

export default function RegisterPage() {
  const router = useRouter();

  return (
    <VehicleAuthScreen
      initialMode="register_step1"
      onAuthSuccess={() => router.push('/garage')}
      onBack={() => router.push('/')}
    />
  );
}
