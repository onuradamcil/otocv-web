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
import { zamanAsimiyla } from '@/lib/istek';
import { pinNormalize } from '@/utils/pinUretici';
import VehicleDetailsScreen from '@/components/VehicleDetailsScreen';
import GlobalStepLoader from '@/components/common/GlobalStepLoader';
import SahipsizSicilEkrani from '@/components/common/SahipsizSicilEkrani';
import { recordListingView } from '@/services/marketplaceService';

export default function VehicleDetailsPage() {
  const router = useRouter();
  const params = useParams();
  // URL'den gelen PIN normalleştiriliyor: boşluk/tire temizlenir, harfler
  // büyütülür ve alfabe dışı karakter REDDEDİLİR (boş metin döner).
  const pin = pinNormalize(decodeURIComponent(params.pin || ''));

  const [vehicle, setVehicle] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  // 'loading' | 'ready' | 'notfound' | 'cokfazla' | 'sahipsiz' | 'baglanti'
  const [status, setStatus] = useState('loading');
  // Sahipsiz araçta sicil kapalı; yalnızca özet dönüyor.
  const [sahipsizOzet, setSahipsizOzet] = useState(null);
  // Fonksiyondan gelen bakım kayıtları. AŞAĞI GEÇİRİLİYOR: eskiden bu alan
  // atılıyor ve VehicleDetailsScreen aynı fonksiyonu ikinci kez çağırıyordu.
  const [kayitlar, setKayitlar] = useState([]);
  // `Tekrar Dene` düğmesi bunu artırıyor.
  const [tetik, setTetik] = useState(0);

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
      // try/catch ŞART. Eskiden yoktu: `supabase.rpc` promise'i reddederse
      // (ağ kopması, sunucu ölümü, CORS) aşağıdaki hiçbir `setStatus`
      // çalışmıyor ve `status` sonsuza kadar 'loading' kalıyordu. Reddedilen
      // promise `app/error.js` sınırına da ulaşmaz — hata sınırları yalnızca
      // render sırasında fırlatılan hataları yakalar.
      let sicil, error;
      try {
        ({ data: sicil, error } = await zamanAsimiyla(
          supabase.rpc('sicil_getir', { p_pin: pin })
        ));
      } catch (e) {
        if (cancelled) return;
        console.error('Araç sicili çekilemedi (ağ):', e);
        setStatus('baglanti');
        return;
      }

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

      // SUNUCU HATASI ile BULUNAMADI ayrı. Eskiden ikisi de 'notfound'a
      // düşüyordu; gerçek bir arıza kullanıcıya "böyle bir araç yok" diye
      // görünüyordu.
      if (error) {
        console.error('sicil_getir hatası:', error.message);
        setStatus('baglanti');
        return;
      }

      if (!sicil?.arac) {
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
      // Kayıtlar da saklanıyor: VehicleDetailsScreen artık kendi sorgusunu
      // atmıyor, bunu prop olarak alıyor.
      setKayitlar(sicil.bakim_kayitlari || []);
      setStatus('ready');
    };

    loadVehicle();
    return () => { cancelled = true; };
  }, [pin, tetik]);

  // GÖRÜNTÜLENME KAYDI — yalnızca ziyaretçi görünümünde.
  //
  // ⚠ BU HOOK ERKEN `return`'LERDEN ÖNCE DURMAK ZORUNDA.
  // İlk denemede son `return`'ün hemen üstüne konmuştu; oradaki konum
  // yükleme/hata durumlarındaki erken `return`'lerin ARDINDA kalıyor ve
  // hook koşullu hâle geliyordu. React "önceki render'dan farklı sayıda
  // hook" diye patlıyor, hata sınırı devreye giriyor ve sayfa "Bu sayfa
  // açılamadı" ekranına düşüyordu — yedi test bunu yakaladı.
  //
  // Koşul artık hook'un GÖVDESİNDE: hook her render'da çalışıyor, işi
  // yapıp yapmamaya içeride karar veriyor.
  useEffect(() => {
    if (isOwner || !vehicle?.pin_code) return;
    // Sahip kendi kartını günde beş kez açıyor; sunucu da ayrıca
    // denetliyor, buradaki kontrol yalnızca gereksiz çağrıyı önlüyor.
    recordListingView(vehicle.pin_code);
  }, [isOwner, vehicle?.pin_code]);

  if (status === 'loading') {
    // Tek çark yerine iskelet: gelen içeriğin şeklini taşır.
    // gecikmeMs=200 -> bekleme 200 ms'den kısaysa hiç gösterge çıkmaz;
    // kullanıcı 100 ms'i anlık sayar, orada gösterge yavaş hissettirir.
    return <GlobalStepLoader mode="iskelet" varyant="detay" gecikmeMs={200} />;
  }

  if (status === 'baglanti') {
    // "Araç bulunamadı"dan AYRI ekran. Sunucuya ulaşılamaması ile aracın
    // olmaması iki farklı gerçek. Bu ekranın asıl işi ÇIKIŞ YOLU sunmak —
    // eskiden bu durumda ekranda sonsuza kadar dönen bir iskelet vardı.
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-lg p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900 tracking-tight">Araç detayına ulaşılamadı</h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Sunucuya bağlanılamadı. Bağlantınızı kontrol edip tekrar deneyin.
            Aracın sicili yerinde duruyor.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => setTetik((n) => n + 1)}
              className="flex-1 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-md transition-colors cursor-pointer"
            >
              Tekrar Dene
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="flex-1 min-h-[44px] bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold text-xs rounded-md transition-colors cursor-pointer"
            >
              Anasayfa
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'cokfazla') {
    // "Araç bulunamadı" ekranından AYRI bir ekran. Aynı ekranı göstermek
    // kullanıcıya "böyle bir araç yok" demek olurdu — oysa araç var, yalnızca
    // bu IP'den kısa sürede çok fazla sorgu geldi. Yanlış bilgi vermek yerine
    // gerçek sebebi ve ne yapması gerektiğini söylüyoruz.
    return (
      <div className="min-h-screen bg-[#FFFDFB] flex items-center justify-center p-4">
        <div className="bg-white border border-amber-200 rounded-lg p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900 tracking-tight">Çok fazla sorgu yapıldı</h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Kısa süre içinde çok sayıda sicil sorgusu geldiği için bağlantınız
            geçici olarak yavaşlatıldı. Yaklaşık <strong className="text-slate-700">10 dakika</strong> sonra
            tekrar deneyebilirsiniz.
          </p>
          <p className="text-yardimci text-slate-500 leading-relaxed">
            Bu sınır, araç sicillerinin toplu olarak taranmasını engellemek için var.
          </p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="w-full bg-white hover:bg-slate-50 text-slate-800 border border-gray-200 font-bold text-xs py-3 rounded-md transition-colors"
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
        <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900 tracking-tight">Araç bulunamadı</h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            <span className="font-mono font-bold text-slate-700">{pin}</span> koduna ait tescilli bir kayıt
            bulunamadı. Kodu kontrol edip tekrar deneyin.
          </p>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => router.push('/verify')}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-md transition-colors cursor-pointer"
            >
              PIN ile Sorgula
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="flex-1 bg-white hover:bg-slate-50 text-slate-800 border border-gray-200 font-bold text-xs py-3 rounded-md transition-colors cursor-pointer"
            >
              Anasayfa
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    // `kayitlar` prop olarak geçiyor: ekran artık `sicil_getir`'i ikinci kez
    // çağırmıyor. Sayfa başına tek sorgu = hız sınırı eşiği gerçekten 20.
    <VehicleDetailsScreen
      vehicle={vehicle}
      kayitlar={kayitlar}
      isPublicView={!isOwner}
      onBack={() => router.back()}
      onViewKarne={() => router.push(`/karne/${encodeURIComponent(vehicle.pin_code)}`)}
      onManageInGarage={isOwner ? () => router.push('/garage') : undefined}
    />
  );
}
