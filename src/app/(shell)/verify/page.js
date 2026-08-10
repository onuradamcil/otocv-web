// =========================================================================
// OTO-CV PIN SORGULAMA ROUTE'U ((shell)/verify/page.js)
// İşlev: PIN sorgulama formunu açar, araç bulunduğunda detay adresine taşır.
// =========================================================================

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import VehicleVerificationScreen from '@/components/VehicleVerificationScreen';

export default function VerifyPage() {
  const router = useRouter();

  return (
    <div className="animate-fadeIn">
      <VehicleVerificationScreen
        onVehicleFound={(car) => router.push(`/details/${encodeURIComponent(car.plate_number)}`)}
      />
    </div>
  );
}
