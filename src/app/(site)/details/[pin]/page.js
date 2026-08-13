// =========================================================================
// OTO-CV ARAÇ DETAY ROUTE'U ((full)/details/[pin]/page.js)
// İşlev: URL'deki PIN kodu ile aracı buluttan çeker, oturum sahibiyle
//        karşılaştırıp sahip/ziyaretçi rolünü belirler.
//
// 🔒 NEDEN PIN, PLAKA DEĞİL: Plaka araç sahibine ulaşılabilecek kişisel
//    veridir; URL'de taşınırsa adres çubuğu, tarayıcı geçmişi, paylaşılan
//    link ve arama motoru indeksi üzerinden sızar. PIN ise zaten karne
//    kartında paylaşılmak üzere basılan kamuya açık anahtardır.
//
// Not: Next.js 16'da params bir Promise'tir; useParams() ile okuyoruz.
// =========================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { pinNormalize } from '@/utils/pinUretici';
import VehicleDetailsScreen from '@/components/VehicleDetailsScreen';
import GlobalStepLoader from '@/components/common/GlobalStepLoader';
import SahipsizSicilEkrani from '@/components/common/SahipsizSicilEkrani';

export default function VehicleDetailsPage() {
  const router = useRouter();
  const params = useParams();
  // URL'den gelen PIN normalleştiriliyor: boşluk/tire temizlenir, harfler
  // büyütülür ve alfabe dışı karakter REDDEDİLİR (boş metin döner).
  const pin = pinNormalize(decodeURIComponent(params.pin || ''));

  const [vehicle, setVehicle] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  // 'loading' | 'ready' | 'notfound' | 'cokfazla' | 'sahipsiz'
  const [status, setStatus] = useState('loading');
  // Sahipsiz araçta sicil kapalı; yalnızca özet dönüyor.
  const [sahipsizOzet, setSahipsizOzet] = useState(null);

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

      // HIZ SINIRI, "bulunamadı"dan AYRI bir durum. İkisini aynı göstermek
      // kullanıcıya "böyle bir araç yok" yalanını söylemek olurdu — oysa araç
      // var, yalnızca bu IP'den çok fazla sorgu geldi.
      if (sicil?.hata === 'cok_fazla_deneme') {
        setStatus('cokfazla');
        return;
      }

      // SAHİPSİZ ARAÇ, "bulunamadı"dan AYRI durum — aynı gerekçe. Araç var ve
      // servis geçmişi eksiksiz duruyor; sahibi hesabını kapattığı için sicil
      // kapalı. "Araç bulunamadı" demek burada da yalan olurdu.
      if (sicil?.hata === 'sahipsiz') {
        setSahipsizOzet(sicil.ozet || null);
        setStatus('sahipsiz');
        return;
      }

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

  if (status === 'cokfazla') {
    // "Araç bulunamadı" ekranından AYRI bir ekran. Aynı ekranı göstermek
    // kullanıcıya "böyle bir araç yok" demek olurdu — oysa araç var, yalnızca
    // bu IP'den kısa sürede çok fazla sorgu geldi. Yanlış bilgi vermek yerine
    // gerçek sebebi ve ne yapması gerektiğini söylüyoruz.
    return (
      <div className="min-h-screen bg-[#FFFDFB] flex items-center justify-center p-4">
        <div className="bg-white border border-amber-200 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <h1 className="text-lg font-black text-slate-900 tracking-tight">Çok fazla sorgu yapıldı</h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Kısa süre içinde çok sayıda sicil sorgusu geldiği için bağlantınız
            geçici olarak yavaşlatıldı. Yaklaşık <strong className="text-slate-700">10 dakika</strong> sonra
            tekrar deneyebilirsiniz.
          </p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Bu sınır, araç sicillerinin toplu olarak taranmasını engellemek için var.
          </p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="w-full bg-white hover:bg-slate-50 text-slate-800 border border-gray-200 font-bold text-xs py-3 rounded-xl transition-colors"
          >
            Anasayfa
          </button>
        </div>
      </div>
    );
  }

  if (status === 'sahipsiz') {
    return <SahipsizSicilEkrani ozet={sahipsizOzet} pin={pin} />;
  }

  if (status === 'notfound') {
    return (
      <div className="min-h-screen bg-[#FFFDFB] flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <h1 className="text-lg font-black text-slate-900 tracking-tight">Araç bulunamadı</h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            <span className="font-mono font-bold text-slate-700">{pin}</span> koduna ait tescilli bir kayıt
            bulunamadı. Kodu kontrol edip tekrar deneyin.
          </p>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => router.push('/verify')}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl transition-colors cursor-pointer"
            >
              PIN ile Sorgula
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="flex-1 bg-white hover:bg-slate-50 text-slate-800 border border-gray-200 font-bold text-xs py-3 rounded-xl transition-colors cursor-pointer"
            >
              Anasayfa
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <VehicleDetailsScreen
      vehicle={vehicle}
      isPublicView={!isOwner}
      onBack={() => router.back()}
      onViewKarne={() => router.push(`/karne/${encodeURIComponent(vehicle.pin_code)}`)}
      onManageInGarage={isOwner ? () => router.push('/garage') : undefined}
    />
  );
}
