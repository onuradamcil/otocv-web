// =========================================================================
// OTO-CV KARNE ROUTE'U ((full)/karne/[pin]/page.js)
// İşlev: URL'deki PIN kodu ile aracı çeker ve Oto-Karne ekranını açar.
//
// 🔒 NEDEN PIN, PLAKA DEĞİL: bkz. (full)/details/[pin]/page.js — plaka
//    kişisel veri olduğu için URL'de taşınmaz.
//
// Not: Next.js 16'da params bir Promise'tir; useParams() ile okuyoruz.
// =========================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { pinNormalize } from '@/utils/pinUretici';
import OtoKarneScreen from '@/components/karne/OtoKarneScreen';
import GlobalStepLoader from '@/components/common/GlobalStepLoader';

export default function KarnePage() {
  const router = useRouter();
  const params = useParams();
  // URL'den gelen PIN normalleştiriliyor: boşluk/tire temizlenir, harfler
  // büyütülür ve alfabe dışı karakter REDDEDİLİR (boş metin döner).
  const pin = pinNormalize(decodeURIComponent(params.pin || ''));

  const [vehicle, setVehicle] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'notfound'

  useEffect(() => {
    let cancelled = false;

    const loadVehicle = async () => {
      setStatus('loading');

      // `vehicles` TABLOSU DEĞİL, sicil_getir() FONKSİYONU.
      //
      // Tablo artık yalnızca araç sahibine açık. Eskiden `select('*')`
      // yapılıyordu ve o sorgu oturum açmamış herkese ÇALIŞIYORDU: anon
      // anahtarıyla tablonun tamamı, plakalar ve PIN'ler dahil okunabiliyordu.
      // Bu, plakayı ziyaretçiden saklama ve PIN entropisini yükseltme
      // çabalarının ikisini de boşa çıkarıyordu — listeleyebilen birinin
      // tahmin etmesi gerekmez.
      //
      // Fonksiyon ziyaretçiye plakayı ve fatura yolunu vermiyor, sahibine
      // veriyor. Sahiplik de `sahip_mi` alanıyla geliyor; kullanıcı kimliğini
      // dışarı vermeye gerek kalmadı.
      const { data: sicil, error } = await supabase.rpc('sicil_getir', { p_pin: pin });

      if (cancelled) return;

      if (error || !sicil?.arac) {
        setStatus('notfound');
        return;
      }

      const found = sicil.arac;


      // ROL, FONKSİYONUN DÖNDÜRDÜĞÜ `sahip_mi` ALANINDAN.
      //
      // Eskiden `user.id === found.user_id` karşılaştırılıyordu. Bu iki
      // sebeple değişti:
      //   · Fonksiyon `user_id` döndürmüyor (bilerek: storage klasör adları
      //     da kullanıcı kimliği, dışarı vermek gereksiz ipucu). O yüzden
      //     karşılaştırma HER ZAMAN false verirdi ve sahip kendi aracını
      //     ziyaretçi gibi görürdü — plakası gizlenmiş hâlde.
      //   · Sahiplik kararı artık sunucuda veriliyor. İstemcide karşılaştırma
      //     yapmak, kararın istemciye bağlı olması demekti; sunucu zaten
      //     plakayı ve fatura yolunu ona göre veriyor ya da vermiyor.
      //     Karar tek yerde olsun.
      if (cancelled) return;

      setVehicle(found);
      setIsOwner(found.sahip_mi === true);
      setStatus('ready');
    };

    loadVehicle();
    return () => { cancelled = true; };
  }, [pin]);

  if (status === 'loading') {
    // Tek çark yerine iskelet: gelen içeriğin şeklini taşır.
    // gecikmeMs=200 -> bekleme 200 ms'den kısaysa hiç gösterge çıkmaz;
    // kullanıcı 100 ms'i anlık sayar, orada gösterge yavaş hissettirir.
    return <GlobalStepLoader mode="iskelet" varyant="detay" gecikmeMs={200} />;
  }

  if (status === 'notfound') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <h1 className="text-lg font-black text-slate-900 tracking-tight">Karne bulunamadı</h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            <span className="font-mono font-bold text-slate-700">{pin}</span> koduna ait tescilli bir kayıt yok.
          </p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl transition-colors cursor-pointer"
          >
            Anasayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  return <OtoKarneScreen vehicle={vehicle} onBack={() => router.back()} isPublicView={!isOwner} />;
}
