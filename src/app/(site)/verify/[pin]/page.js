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
import { pinNormalize } from '@/utils/pinUretici';
import VehicleVerificationScreen from '@/components/VehicleVerificationScreen';

export default function VerifyWithPinPage() {
  const router = useRouter();
  const params = useParams();
  // URL'den gelen PIN normalleştiriliyor: boşluk/tire temizlenir, harfler
  // büyütülür ve alfabe dışı karakter REDDEDİLİR (boş metin döner).
  const pin = pinNormalize(decodeURIComponent(params.pin || ''));

  const [status, setStatus] = useState('searching'); // 'searching' | 'notfound'

  useEffect(() => {
    let cancelled = false;

    const lookup = async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('pin_code')
      // `eq`, `ilike` DEĞİL — bu bir güvenlik düzeltmesi.
      //
      // PIN doğrudan URL'den geliyor ve önceki hâli `.ilike('pin_code', pin)`
      // idi. `ilike` desen karakterlerini yorumlar; `/details/CV-%25` adresi
      // `pin = 'CV-%'` üretiyor ve bu BÜTÜN araçlarla eşleşiyordu. Sayfa
      // `data[0]`'ı aldığı için ziyaretçi, plakası ve PIN'i dahil rastgele
      // bir aracın tam kaydını görüyordu. Canlı veride doğrulandı: `CV-%`
      // 10 aracın 10'uyla eşleşti.
      //
      // pinNormalize alfabe dışı karakteri reddediyor, `eq` de hiçbir
      // koşulda desen olarak yorumlanmıyor. İki katman.
      //
      // Büyük/küçük harf duyarsızlık korunuyor: pinNormalize girdiyi
      // büyütüyor, PIN'ler büyük harfle saklanıyor. Ek fayda: `eq` indeksi
      // kullanır, `ilike` kullanamıyordu.
        .eq('pin_code', pin)
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

  // Burada BİLEREK iskelet kullanılmıyor, çark kalıyor.
  //
  // Sebep: iskelet "şu şekilde bir içerik geliyor" demektir. Bu ekranda ise
  // sonuç belirsiz — kod bulunursa araç detayına yönlendiriliyor, bulunmazsa
  // forma hata mesajıyla dönülüyor. Gelen bir içerik değil, süren bir sorgu
  // var. Sektör ayrımı: içerik → iskelet, işlem → çark.
  //
  // PIN'in metinde tekrar edilmesi kasıtlı: kullanıcı hangi kodun
  // sorgulandığını görüyor, yanlış kod girdiyse beklemeden anlıyor.
  if (status === 'searching') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="min-h-[60vh] flex flex-col items-center justify-center gap-3"
      >
        <div className="rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent motion-safe:animate-spin motion-reduce:animate-pulse" />
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
