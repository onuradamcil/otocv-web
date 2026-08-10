// =========================================================================
// OTO-CV PIN'Lİ DOĞRUDAN SORGU ROUTE'U ((shell)/verify/[pin]/page.js)
// İşlev: Karne üzerindeki PIN ile gelen ziyaretçiyi otomatik sorgulayıp
//        aracın detay sayfasına taşır. Bulunamazsa formu PIN dolu açar.
// Not:   Next.js 16'da params bir Promise'tir; useParams() ile okuyoruz.
// =========================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import VehicleVerificationScreen from '@/components/VehicleVerificationScreen';

export default function VerifyWithPinPage() {
  const router = useRouter();
  const params = useParams();
  const pin = decodeURIComponent(params.pin);

  const [status, setStatus] = useState('searching'); // 'searching' | 'notfound'

  useEffect(() => {
    let cancelled = false;

    const lookup = async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('pin_code')
        .ilike('pin_code', pin)
        .limit(1);

      if (cancelled) return;

      if (!error && data && data.length > 0) {
        // Veritabanındaki kanonik yazımı kullan (kullanıcı küçük harfle yazmış olabilir).
        // replace: geri tuşunda sorgulama ekranına düşmemesi için.
        router.replace(`/details/${encodeURIComponent(data[0].pin_code)}`);
        return;
      }

      setStatus('notfound');
    };

    lookup();
    return () => { cancelled = true; };
  }, [pin, router]);

  if (status === 'searching') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
        <span className="text-[11px] font-bold text-slate-400 tracking-wide">
          <span className="font-mono">{pin}</span> kodu sorgulanıyor...
        </span>
      </div>
    );
  }

  // Bulunamadıysa formu PIN dolu ve nedeni yazılı olarak göster; kullanıcı düzeltip
  // tekrar denesin. Karneden linki elle kopyalayanlar için karakter hatası olağan.
  return (
    <div className="animate-fadeIn">
      <VehicleVerificationScreen
        initialPin={pin}
        initialError={`${pin} koduna ait aktif bir araç kaydı bulunamadı. Kodu kontrol edip tekrar deneyin.`}
        onVehicleFound={(car) => router.push(`/details/${encodeURIComponent(car.pin_code)}`)}
      />
    </div>
  );
}
