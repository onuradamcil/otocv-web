// =========================================================================
// MESAJLARIM ((site)/mesajlar/page.js)
//
// Araç sahipleriyle yapılan yazışmalar. Tüm veri `mesajService` üzerinden,
// yani PIN alan/dönen RPC'lerden geliyor — konuşma tablosu plakayı tutuyor
// ve o plaka istemciye hiç ulaşmıyor.
//
// Oturum kontrolü burada, ekranın kendisinde değil: `MesajlarEkrani` bir
// kez yüklendiğinde hemen `konusmalarim()` çağırıyor ve oturumsuz kullanıcı
// için bu, konsola "permission denied" basmak demekti.
// =========================================================================

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import GlobalStepLoader from '@/components/common/GlobalStepLoader';
import MesajlarEkrani from '@/components/mesaj/MesajlarEkrani';
import { dugme } from '@/components/common/dugme';

export default function MesajlarPage() {
  const [durum, setDurum] = useState('yukleniyor'); // yukleniyor | hazir | oturumyok

  useEffect(() => {
    let iptal = false;

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (iptal) return;
        setDurum(user ? 'hazir' : 'oturumyok');
      } catch {
        // Reddedilen promise `error.js`'e ulaşmıyor; yakalanmazsa ekran
        // sonsuza kadar iskelette kalıyor.
        if (!iptal) setDurum('oturumyok');
      }
    })();

    return () => { iptal = true; };
  }, []);

  if (durum === 'yukleniyor') {
    return <GlobalStepLoader mode="iskelet" varyant="kart" gecikmeMs={200} adet={3} />;
  }

  if (durum === 'oturumyok') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <h1 className="baslik-bolum text-slate-900">Mesajlarım</h1>
          <p className="metin-yardimci text-slate-500">
            Yazışmalarınızı görmek için oturum açmanız gerekiyor.
          </p>
          <Link href="/login" className={dugme('birincil')}>Giriş Yap</Link>
        </div>
      </div>
    );
  }

  return <MesajlarEkrani />;
}
