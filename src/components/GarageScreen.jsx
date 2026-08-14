// =========================================================================
// OTO-CV GARAJ EKRANI (GarageScreen.jsx)
// İşlev: Süre uyarısı şeridi, Araç Merkezi (özet + eylemler) ve araç kartları.
//
// -------------------------------------------------------------------------
// 13 AĞUSTOS DÜZENLEMESİ — KART KALABALIĞI
// -------------------------------------------------------------------------
// Her araç kartı BEŞ katman taşıyordu: plaka+model+skor, üç poliçe kutusu,
// ilan şeridi, devret şeridi ve üçlü aksiyon satırı. On araçta bu elli blok
// demekti ve ekran okunmaz hâle geliyordu.
//
// Kök sebep katman sayısı değil, katmanların NE OLDUĞUYDU: seyrek eylemler
// (satışa çıkar, devret) her kartta duruyordu. Kullanıcı aracını yılda bir
// kez satar ama düğmeyi her gün görür.
//
// Çözüm: seyrek eylemler Araç Merkezi'ne ve kart içi `⋯` menüsüne taşındı.
// Kart üç katmana indi. Kaldırılan profil kartının bilgisi de kaybolmadı —
// ad ve üyelik hesap menüsüne taşındı (Header.jsx).
// =========================================================================

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { calculatePolicyStatus } from '../utils/dateHelper';
import PolicyOfferModal from './garage/PolicyOfferModal';
import { useToast } from '../context/ToastContext';
import AracDevretDialog from './garage/AracDevretDialog';
import AracSeciciDialog from './garage/AracSeciciDialog';
import { dugme, ikonDugmesi } from './common/dugme';
import Icon from './common/icons';
import GlobalStepLoader from './common/GlobalStepLoader';

export default function GarageScreen({ onViewDetails, onViewKarne, onOpenMaintenance, onNavigateToAdd, onManageListings, onOpenVitrin }) {
  const toast = useToast();
  // =========================================================================
  // 1. BLOK: REAKTİF DURUM VE VERİTABANI HAFIZASI
  // =========================================================================
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  // Araç Merkezi'ndeki eylemler önce "hangi araç?" diye soruyor.
  // null | 'ilan' | 'devir' | 'bakim'
  const [seciciTuru, setSeciciTuru] = useState(null);

  // Sayaçlardan gelen süzgeç: 'tumu' | 'satista' | 'kritik'
  const [suzgec, setSuzgec] = useState('tumu');

  // Policy Offer Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVehicleForModal, setSelectedVehicleForModal] = useState(null);
  const [selectedPolicyType, setSelectedPolicyType] = useState('kasko');
  const [selectedStatusInfo, setSelectedStatusInfo] = useState({});


  // Devir diyalogu. PublishListingModal ile ayni kalip: state GarageScreen
  // icinde, basari sonrasi fetchLiveVehicles cagriliyor. Route dosyasina
  // dokunmadan calisiyor.
  const [devirModalOpen, setDevirModalOpen] = useState(false);
  const [selectedVehicleForDevir, setSelectedVehicleForDevir] = useState(null);

  useEffect(() => {
    fetchLiveVehicles();
  }, []);

  // =========================================================================
  // 2. BLOK: CANLI ARAÇ VE PROFİL VERİLERİNİ ÇEKME
  // =========================================================================
  // =========================================================================
  // CANLI ARAÇ VE İLİŞKİLİ İLAN VERİLERİNİ ÇEKME (BİRE-BİR / BİRE-ÇOK KORUMALI)
  // =========================================================================
  const fetchLiveVehicles = async () => {
    try {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      if (user) {
        // Profil sorgusu KALDIRILDI: burada yalnızca profil kartını
        // beslemek için çekiliyordu. Kart kalkınca ad ve üyelik bilgisi
        // hesap menüsüne taşındı; garaj ekranının profile ihtiyacı yok.
        // Vehicles ile ilişkili listings kaydını çekiyoruz
        const { data, error: fetchError } = await supabase
          .from('vehicles')
          .select('*, listings(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        
        // 🚀 BİRE-BİR VE BİRE-ÇOK YAPI HATA ENGELLEYİCİ İŞLEMCİ
        const processedVehicles = (data || []).map(car => {
          let activeListing = null;

          if (Array.isArray(car.listings)) {
            // Eğer Supabase dizi döndürdüyse .find kullan
            activeListing = car.listings.find(l => l.status === 'active');
          } else if (car.listings && typeof car.listings === 'object') {
            // Eğer Supabase tekil nesne döndürdüyse doğrudan nesneyi kontrol et
            activeListing = car.listings.status === 'active' ? car.listings : null;
          }

          // ARAÇ KAYDI TEMEL, VİTRİN KAYDI ÜSTÜNE YAZAR.
          //
          // Eskiden bu alanlar araç vitrinde DEĞİLKEN `null`'a eziliyordu:
          //   city: activeListing ? activeListing.city : null
          //
          // Oysa `vehicles.city`, `district`, `title` ve `description` kayıt
          // sihirbazında zaten dolduruluyor. Sonuç: sihirbazda İzmir/Konak
          // seçen kullanıcı vitrin formunu açtığında null görüyordu ve form
          // sabit "Ankara / Çankaya" yazıyordu; uzun açıklamasını da sıfırdan
          // yazmak zorunda kalıyordu.
          //
          // `is_featured` de hiç taşınmıyordu: ₺250 ödenmiş bir doping,
          // düzenleme ekranında işaretsiz açılıyor ve kaybolmuş gibi
          // görünüyordu.
          return {
            ...car,
            is_listed: !!activeListing,
            price: activeListing ? activeListing.price : 0,
            is_featured: activeListing ? activeListing.is_featured === true : false,
            listing_title: activeListing?.title ?? car.title ?? null,
            listing_description: activeListing?.description ?? car.description ?? null,
            city: activeListing?.city ?? car.city ?? null,
            district: activeListing?.district ?? car.district ?? null,
            tramer_amount: activeListing?.tramer_amount ?? car.tramer_amount,
          };
        });

        setVehicles(processedVehicles);
      }
    } catch (err) {
      console.error("Garaj yükleme hatası:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };



  // =========================================================================
  // 3. BLOK: KRİTİK ARAÇ HESAPLAMA VE MODAL TETİKLEYİCİLERİ
  // =========================================================================
  const criticalVehicles = vehicles.filter(car => {
    const ins = calculatePolicyStatus(car.traffic_insurance_end_date);
    const kas = calculatePolicyStatus(car.kasko_end_date);
    const insp = calculatePolicyStatus(car.inspection_end_date);
    return ins.isCritical || kas.isCritical || insp.isCritical;
  });

  const handleOpenModal = (vehicle, type, statusInfo) => {
    setSelectedVehicleForModal(vehicle);
    setSelectedPolicyType(type);
    setSelectedStatusInfo(statusInfo);
    setModalOpen(true);
  };

  // VİTRİN KARTI ARTIK MODAL DEĞİL, ROTA.
  //
  // `PublishListingModal` altı alanlı bir form, ücretli bir yükseltme ve
  // kalıcı bir kayıt üreten bir modaldi. Modalın doğru olduğu yer tek
  // karar, kısa ve geri dönülür işler; çok alanlı form modalda adresini,
  // geri tuşunu ve mobilde ekranın yarısını kaybediyor.
  const handleOpenListingModal = (vehicle) => {
    onOpenVitrin?.(vehicle);
  };

  const handleOpenDevirModal = (vehicle) => {
    setSelectedVehicleForDevir(vehicle);
    setDevirModalOpen(true);
  };

  const satistaSayisi = vehicles.filter((v) => v.is_listed).length;
  const satilabilirSayisi = vehicles.length - satistaSayisi;

  // Süzülmüş liste. `criticalVehicles` yukarıda zaten hesaplanıyor; aynı
  // ölçütü ikinci kez yazmak yerine kimlikten eşleştiriliyor ki iki yerin
  // kayması mümkün olmasın.
  const kritikKimlikler = new Set(criticalVehicles.map((v) => v.id ?? v.plate_number));
  const gorunenAraclar =
    suzgec === 'satista' ? vehicles.filter((v) => v.is_listed)
    : suzgec === 'kritik' ? vehicles.filter((v) => kritikKimlikler.has(v.id ?? v.plate_number))
    : vehicles;

  const SUZGEC_ADI = { tumu: 'Tümü', satista: 'Vitrinde', kritik: 'Süresi kritik' };

  // -------------------------------------------------------------------------
  // ARAÇ MERKEZİ EYLEMLERİ
  //
  // Üçü de aynı iki adımı yürüyor: araç seç -> ZATEN VAR OLAN modalı aç.
  // Burada yeni iş mantığı yok; kartlardan kaldırılan düğmelerin yeni evi.
  //
  // `kapali` doluysa eylem devre dışı ve sebebi ekranda yazıyor. Sessizce
  // çalışmayan bir düğme, çalışmadığını söyleyen düğmeden daha kötüdür.
  // -------------------------------------------------------------------------
  const EYLEMLER = [
    {
      tur: 'ilan',
      ikon: 'ilan',
      baslik: 'Vitrine çıkar',
      ozet: 'Aracınızı pazaryeri vitrininde gösterin; bilgiler ve sicil karta otomatik gelsin.',
      kapali: vehicles.length === 0 ? 'Önce araç kaydedin' : (satilabilirSayisi === 0 ? 'Tüm araçlarınız vitrinde' : null),
      secici: {
        baslik: 'Hangi aracı vitrine çıkaralım?',
        aciklama: 'Seçtiğiniz aracın bilgileri ve sicil karnesi vitrin kartına otomatik geliyor.',
        devreDisi: (v) => (v.is_listed ? 'Zaten vitrinde' : null),
        calistir: handleOpenListingModal,
      },
    },
    {
      tur: 'devir',
      ikon: 'anahtar',
      baslik: 'Aracı devret',
      ozet: 'Yeni sahibine sicili aktarın. Bakım geçmişi araçla birlikte gidiyor.',
      kapali: vehicles.length === 0 ? 'Önce araç kaydedin' : null,
      secici: {
        baslik: 'Hangi aracı devredeceksiniz?',
        aciklama: 'Devir tamamlanınca araç garajınızdan çıkıyor ve varsa vitrin kartı kapanıyor.',
        devreDisi: null,
        calistir: handleOpenDevirModal,
      },
    },
    {
      tur: 'bakim',
      ikon: 'takvim',
      baslik: 'Bakım işle',
      ozet: 'Servis kaydı ekleyin; belgelendikçe aracın sicil puanı yükseliyor.',
      kapali: vehicles.length === 0 ? 'Önce araç kaydedin' : null,
      secici: {
        baslik: 'Hangi araca bakım işleyelim?',
        aciklama: 'Tarih, kilometre ve servis bilgisi sicile kalıcı olarak yazılıyor.',
        devreDisi: null,
        calistir: onOpenMaintenance,
      },
    },
  ];

  const acikEylem = EYLEMLER.find((e) => e.tur === seciciTuru);

  // =========================================================================
  // 4. BLOK: ARAYÜZ RENDER KATMANI
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] p-4 md:p-8 font-sans antialiased">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* AKILLI ALARM BANNER'I */}
        <div 
          className={`transition-all duration-500 ease-in-out overflow-hidden ${
            criticalVehicles.length > 0 && !isBannerDismissed 
              ? 'max-h-24 opacity-100 mb-6' 
              : 'max-h-0 opacity-0 mb-0 py-0 pointer-events-none'
          }`}
        >
          <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white px-5 py-3.5 rounded-2xl shadow-lg shadow-red-600/20 border border-red-500/30 flex items-center justify-between gap-4 select-none">
            <div className="flex items-center gap-3 min-w-0">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
              {/* "Filo Uyarısı" değil: "filo" kelimesi kurumsal ürüne
                  ayrıldı (bkz. TODO — üyelik tipi). Bireysel kullanıcının
                  üç aracına filo demek, ileride iki farklı şeyin aynı adı
                  taşıması demekti. */}
              <p className="text-xs sm:text-sm font-bold tracking-tight truncate">
                Süre Uyarısı: <span className="underline underline-offset-2 font-black">{criticalVehicles.length} aracınızın</span> sigorta, kasko veya muayene süresi kritik seviyede!
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button 
                onClick={() => toast.bilgi('Sigorta teklifleri yakında bu ekranda listelenecek.')}
                className="bg-white hover:bg-red-50 text-red-600 text-xs font-black px-4 py-2 rounded-xl transition-all active:scale-95 shadow-sm cursor-pointer"
              >
                Hemen Teklif Al
              </button>
              {/* `title` tek başına güvenilir bir erişilebilir ad değil: ekran
                  okuyucuların bir kısmı okumuyor, dokunmatikte hiç
                  görünmüyor. Denetimde bu düğme "adsız" olarak ölçüldü. */}
              <button
                onClick={() => setIsBannerDismissed(true)}
                title="Uyarıyı Kapat"
                aria-label="Uyarıyı kapat"
                className="text-white/80 hover:text-white p-1.5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <Icon name="kapat" size="md" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* BAŞLIK BARI
            "Verileri Yenile" KALDIRILDI: tarayıcının kendi yenileme düğmesi
            zaten var ve kullanıcı onu biliyor. Uygulamaya ikinci bir yenileme
            koymak, verinin kendiliğinden tazelenmediğini îma ediyordu —
            oysa her işlem sonrası liste zaten yeniden çekiliyor. */}
        <div className="flex justify-between items-center border-b border-slate-200 pb-4 select-none">
          <h1 className="baslik-sayfa text-slate-900">Garajım</h1>
        </div>

        {/* =====================================================================
            ARAÇ MERKEZİ — kaldırılan profil kartının yerine

            Profil kartı üç şey gösteriyordu: baş harfler, ad soyad + e-posta,
            üyelik rozeti. Üçü de kullanıcının ZATEN BİLDİĞİ şeylerdi ve
            ekranın en değerli yerini kaplıyordu. Bilgi kaybolmadı — hesap
            menüsüne taşındı (Header.jsx).

            Yerine gerçekten iş yapan bir bölüm geldi: durum özeti ve seyrek
            eylemlerin merkezi. Kartlar bu sayede üç katmana inebildi.

            Not: kart "Standart KURUMSAL Üyelik" yazıyordu — oysa sistemde
            kurumsal üyelik diye bir şey yok, herkes bireysel. O tutarsızlık
            da bu kartla birlikte kalktı.
        ===================================================================== */}
        <section
          aria-label="Araç Merkezi"
          className="bg-white border border-slate-200 rounded-3xl shadow-[0_4px_20px_rgba(15,23,42,0.03)] overflow-hidden select-none"
        >
          {/* SAYAÇLAR ARTIK SÜZGEÇ.
              Eskiden yalnızca sayı basıyorlardı: "1 süresi kritik" yazıyor
              ama hangi araç olduğunu bulmak için otuz kartı tek tek gezmek
              gerekiyordu. Sayı bir sorunun cevabı değil, sorunun kendisiydi.
              Artık tıklanınca liste süzülüyor. */}
          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
            <div className="flex items-center gap-2 sm:gap-3" role="group" aria-label="Araç süzgeci">
              <Sayac
                deger={vehicles.length}
                etiket="Kayıtlı araç"
                secili={suzgec === 'tumu'}
                onSec={() => setSuzgec('tumu')}
              />
              <Sayac
                deger={satistaSayisi}
                etiket="Vitrinde"
                renk="text-emerald-600"
                secili={suzgec === 'satista'}
                onSec={() => setSuzgec(suzgec === 'satista' ? 'tumu' : 'satista')}
              />
              <Sayac
                deger={criticalVehicles.length}
                etiket="Süresi kritik"
                renk="text-rose-600"
                secili={suzgec === 'kritik'}
                onSec={() => setSuzgec(suzgec === 'kritik' ? 'tumu' : 'kritik')}
              />
            </div>

            <button onClick={onNavigateToAdd} className={dugme('birincil', { ek: 'w-full sm:w-auto shrink-0' })}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Yeni Araç Kaydet
            </button>
          </div>

          <div className="px-5 py-4">
            <h2 className="etiket text-slate-400 mb-3">
              Ne yapmak istiyorsunuz?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {EYLEMLER.map((e) => (
                <MerkezEylem key={e.tur} eylem={e} onAc={() => setSeciciTuru(e.tur)} />
              ))}
            </div>
          </div>
        </section>

        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <h2 className="baslik-bolum text-slate-900">Araçlarım</h2>
          {!loading && vehicles.length > 0 && (
            <span className="metin-yardimci text-slate-400 font-mono tabular-nums">
              {gorunenAraclar.length}
            </span>
          )}

          {/* Etkin süzgeç çip olarak görünüyor ve temizlenebiliyor. Süzgecin
              görünmez olması, kullanıcının "araçlarım kayboldu" sanmasının
              en yaygın sebebi. */}
          {suzgec !== 'tumu' && (
            <button
              type="button"
              onClick={() => setSuzgec('tumu')}
              className="inline-flex items-center gap-1.5 min-h-[28px] px-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-black hover:bg-indigo-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            >
              {SUZGEC_ADI[suzgec]}
              <Icon name="kapat" size="xs" />
              <span className="sr-only">süzgeci temizle</span>
            </button>
          )}
        </div>

        {/* DİZİLİM MOTORU */}
        {loading ? (
          /* Tek cark yerine kart iskeleti: gelen sey arac KARTLARI oldugu icin
             yer tutucu da o sekli tasir. baslik={false} cunku sayfa basligi
             zaten yukarida basili. */
          <GlobalStepLoader mode="iskelet" varyant="kart" kapsayici={false} baslik={false} adet={3} />
        ) : error ? (
          <div
            role="alert"
            className="py-10 px-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold flex items-center justify-center gap-2"
          >
            <Icon name="uyari" size="md" />
            <span>Veritabanı bağlantı hatası: {error}</span>
          </div>
        ) : gorunenAraclar.length === 0 ? (
          <div className="py-20 flex flex-col items-center text-center space-y-3 bg-white rounded-2xl border border-dashed border-slate-300">
            <Icon name="klasor" size="2xl" className="text-slate-300" />
            <div>
              {/* Süzgeç yüzünden boşsa bunu SÖYLÜYORUZ. "Garajınız boş"
                  demek, on aracı olan kullanıcıya yalan olurdu. */}
              <h3 className="baslik-bolum text-slate-900">
                {suzgec === 'tumu' ? 'Garajınız henüz boş' : 'Bu süzgeçte araç yok'}
              </h3>
              <p className="metin-yardimci text-slate-500 mt-1">
                {suzgec === 'tumu'
                  ? 'Sisteme kayıtlı doğrulanmış aracınız bulunmuyor.'
                  : `${vehicles.length} aracınızın hiçbiri bu ölçütte değil.`}
              </p>
            </div>
            {suzgec !== 'tumu' && (
              <button type="button" onClick={() => setSuzgec('tumu')} className={dugme('ikincil')}>
                Tüm araçları göster
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
            {gorunenAraclar.map((vehicle, index) => (
              <VehicleCard
                key={vehicle.id || vehicle.plate_number || `car-${index}`}
                vehicle={vehicle}
                onViewDetails={onViewDetails}
                onViewKarne={onViewKarne}
                onOpenMaintenance={onOpenMaintenance}
                onOpenModal={handleOpenModal}
                onOpenListingModal={handleOpenListingModal}
                onOpenDevir={handleOpenDevirModal}
                onManageListings={onManageListings}
              />
            ))}
          </div>
        )}

      </div>

      {/* POLİÇE OFFER MODALI */}
      <PolicyOfferModal 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        vehicle={selectedVehicleForModal}
        policyType={selectedPolicyType}
        statusInfo={selectedStatusInfo}
      />


      {/* ARAÇ DEVRİ DİYALOĞU */}
      {/* Koşullu render: diyalog kapalıyken hiç mount edilmiyor. Böylece her
          açılışta durumu sıfırdan okuyor ve `useEffect` içinde senkron
          setState çağırmak gerekmiyor. */}
      {devirModalOpen && selectedVehicleForDevir && (
        <AracDevretDialog
          onClose={() => setDevirModalOpen(false)}
          vehicle={selectedVehicleForDevir}
          onSuccess={fetchLiveVehicles}
        />
      )}

      {/* ARAÇ SEÇİCİ — merkezdeki üç eylemin ortak ilk adımı */}
      {acikEylem && (
        <AracSeciciDialog
          baslik={acikEylem.secici.baslik}
          aciklama={acikEylem.secici.aciklama}
          ikon={acikEylem.ikon}
          vehicles={vehicles}
          devreDisi={acikEylem.secici.devreDisi}
          onClose={() => setSeciciTuru(null)}
          onSec={(v) => {
            // Önce seçici kapanıyor: iki modal üst üste açık kalırsa
            // Esc hangisini kapatacağı belirsiz olur ve odak tuzakları
            // birbiriyle çakışır.
            setSeciciTuru(null);
            acikEylem.secici.calistir(v);
          }}
        />
      )}
    </div>
  );
}

// =========================================================================
// ARAÇ MERKEZİ PARÇALARI
// =========================================================================

// Sayaç — ARTIK SÜZGEÇ DÜĞMESİ.
//
// Eskiden yalnızca sayı basan bir `<dl>` idi. "1 süresi kritik" yazıyordu
// ama hangi araç olduğunu bulmak için kartları tek tek gezmek gerekiyordu;
// otuz araçta bu bilgiyi işe yaramaz kılıyor. Sayı artık bir soruya
// götürüyor: tıkla, o araçları gör.
//
// Sıfır olan sayaç TIKLANMIYOR: boş bir listeye götüren düğme, kullanıcıya
// bir şey vaat edip vermemek olurdu.
function Sayac({ deger, etiket, renk = 'text-slate-900', secili = false, onSec }) {
  const bos = deger === 0;

  return (
    <button
      type="button"
      onClick={onSec}
      disabled={bos && !secili}
      aria-pressed={secili}
      className={`text-left px-3 py-2 rounded-xl border transition-colors min-w-0 ${
        bos && !secili
          ? 'border-transparent cursor-default'
          : secili
            ? 'border-indigo-300 bg-indigo-50/70 cursor-pointer'
            : 'border-transparent hover:bg-slate-50 hover:border-slate-200 cursor-pointer'
      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600`}
    >
      <span className={`sayi-vurgu block font-mono ${bos ? 'text-slate-300' : renk}`}>
        {deger}
      </span>
      <span className="block text-[10px] font-bold text-slate-500 mt-1 truncate">{etiket}</span>
    </button>
  );
}

// Merkez eylemi: ikon + başlık + tek satır açıklama. Sadece düğme değil —
// kullanıcı ne olacağını tıklamadan önce okuyor.
//
// Kapalıyken `disabled` VE sebep birlikte veriliyor. Tıklanmayan ama neden
// tıklanmadığını söylemeyen düğme, kullanıcıyı ürünün bozuk olduğuna
// inandırıyor.
function MerkezEylem({ eylem, onAc }) {
  const kapali = !!eylem.kapali;

  return (
    <button
      type="button"
      disabled={kapali}
      onClick={onAc}
      className={`text-left p-4 rounded-2xl border transition-all group ${
        kapali
          ? 'border-slate-100 bg-slate-50/60 cursor-not-allowed'
          : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 hover:shadow-sm active:scale-[0.99] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2'
      }`}
    >
      <span className="flex items-center gap-2.5 mb-2">
        <span
          className={`w-8 h-8 rounded-xl grid place-items-center shrink-0 transition-colors ${
            kapali ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'
          }`}
        >
          <Icon name={eylem.ikon} size="md" />
        </span>
        <span className={`text-xs font-black tracking-tight ${kapali ? 'text-slate-400' : 'text-slate-900'}`}>
          {eylem.baslik}
        </span>
      </span>

      <span className={`block text-[11px] font-semibold leading-relaxed ${kapali ? 'text-slate-400' : 'text-slate-500'}`}>
        {kapali ? eylem.kapali : eylem.ozet}
      </span>
    </button>
  );
}

// =========================================================================
// ARAÇ KARTI (VehicleCard) — ÜÇ KATMAN
//
//   1. Fotoğraf · plaka · marka/model · skor  (+ satıştaysa ince şerit)
//   2. Üç poliçe çipi
//   3. Detay · Karne · Bakım  +  `⋯` menüsü
//
// Kaldırılan iki katman (ilan şeridi, devret şeridi) yok olmadı: `⋯`
// menüsüne ve Araç Merkezi'ne taşındı. Menüde durmaları önemli — "bu aracı
// sat" niyeti kartın üstünde doğuyor, kullanıcıyı yukarı göndermek yerine
// yerinde karşılıyoruz. Keşfedilebilirlik korunuyor, gürültü kalkıyor.
// =========================================================================
function VehicleCard({ vehicle, onViewDetails, onViewKarne, onOpenMaintenance, onOpenModal, onOpenListingModal, onOpenDevir, onManageListings }) {
  // Varsayilan 0: puan artik veritabaninda her zaman hesaplaniyor ve NULL olamaz.
  // Eskiden bu satirlar `?? 60`, `?? 92` ve `?? 94` idi -- AYNI arac icin uc
  // ayri sayi. Simdi olu kod; yine de 0 birakiliyor ki bir gun deger gelmezse
  // uydurma bir sayi degil, acikca dusuk bir puan gorunsun.
  const score = vehicle.trust_score ?? 0;
  const plate = vehicle.plate_number ?? '34 ABC 123';
  const rawImageUrl = vehicle.image_url || vehicle.image;

  let thumbnailTarget = null;
  if (rawImageUrl && rawImageUrl.length > 0) {
    const splitUrls = rawImageUrl.split(',');
    if (splitUrls.length > 0 && splitUrls[0].includes('http')) {
      thumbnailTarget = splitUrls[0].trim();
    }
  }

  const insuranceStatus = calculatePolicyStatus(vehicle.traffic_insurance_end_date);
  const kaskoStatus = calculatePolicyStatus(vehicle.kasko_end_date);
  const inspectionStatus = calculatePolicyStatus(vehicle.inspection_end_date);

  // `⋯` menüsü. Header'daki hesap menüsüyle aynı kalıp: `mousedown`
  // kullanılıyor, `click` değil — menü içindeki öğe tıklandığında DOM'dan
  // kalkabiliyor ve `contains` yanlış cevap veriyor.
  const [menuAcik, setMenuAcik] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuAcik) return;
    const disariTiklama = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuAcik(false);
    };
    const escBasildi = (e) => {
      if (e.key === 'Escape') setMenuAcik(false);
    };
    document.addEventListener('mousedown', disariTiklama);
    document.addEventListener('keydown', escBasildi);
    return () => {
      document.removeEventListener('mousedown', disariTiklama);
      document.removeEventListener('keydown', escBasildi);
    };
  }, [menuAcik]);

  const menudenCalistir = (fn) => {
    setMenuAcik(false);
    fn(vehicle);
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-[0_4px_20px_rgba(15,23,42,0.03)] hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition-all duration-300 flex flex-col gap-4 group hover:border-slate-300">

      {/* KATMAN 1 — KİMLİK */}
      <div className="flex gap-4 items-start">
        {/* THUMBNAIL — SIĞDIR, KIRPMA.
            Eskiden `object-cover` idi: görsel kutuyu dolduruyor ama aracın
            kenarları kırpılıyordu. Bir araç görselinde kırpılan şey genellikle
            aracın kendisi oluyor. `object-contain` tamamını gösteriyor;
            pazaryeri kartı (MarketplaceView) zaten böyleydi, iki ekran artık
            aynı davranıyor.

            `group-hover:scale-105` de kaldırıldı: görseli büyütmek hiçbir şey
            söylemiyordu — tıklanınca yakınlaşma olmuyor, sadece hareket
            ediyordu. Vurgu artık kartın kendisinde (gölge ve kenarlık). */}
        <div className="w-[76px] h-[76px] rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden relative p-1">
          {thumbnailTarget ? (
            <img
              src={thumbnailTarget}
              alt={`${vehicle.brand} ${vehicle.model}`}
              loading="lazy"
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="text-[10px] font-black text-slate-400 text-center leading-tight">
              GÖRSEL<br />YOK
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col items-start space-y-1.5">
          <div className="inline-flex items-center border-[1.5px] border-slate-800 rounded-md bg-white font-mono font-black text-xs h-7 overflow-hidden select-none shadow-sm shrink-0">
            <div className="bg-[#003399] text-white text-[9px] font-sans font-bold flex flex-col items-center justify-center px-1.5 h-full leading-none shrink-0">
              <span>TR</span>
            </div>
            <div className="px-3 text-slate-900 tracking-wider uppercase h-full flex items-center bg-white font-mono text-sm font-black shrink-0">
              {plate.replace(/\s+/g, '').replace(/^(\d{2})([A-Z]{1,3})(\d{2,4})$/, '$1 $2 $3')}
            </div>
          </div>
          
          <h3 className="baslik-bolum text-slate-900 truncate w-full">
            {vehicle.brand} {vehicle.model}
          </h3>
          {/* `truncate`: km altı haneli olunca satır iki satıra sarıyor ve o
              kart aynı satırdaki diğerlerinden uzun kalıyordu. Izgara
              `items-start` olduğu için hizasızlık gözle görülüyordu. */}
          <p className="metin-yardimci text-slate-500 font-mono truncate w-full">
            {vehicle.year} • {vehicle.km ? vehicle.km.toLocaleString('tr-TR') : '0'} km
          </p>

          {/* Vitrin durumu ince bir çip. TUTAR GÖSTERİLMİYOR: araca ait
              herhangi bir fiyat, platformu satış sitesi konumuna sokuyor. */}
          {vehicle.is_listed && (
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 text-emerald-800 px-2 py-1 rounded-lg text-[10px] font-black">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Vitrinde
            </span>
          )}
        </div>

        {/* Skor rozeti: eskiden `text-xs sm:text-sm` idi — aynı bilgi ekran
            genişliğine göre boyut değiştiriyordu, oysa önemi değişmiyor. */}
        <div className="bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl text-right shrink-0 select-none">
          <span className="metin-yardimci text-indigo-700 block font-mono">
            Skor: %{score}
          </span>
        </div>
      </div>

      {/* KATMAN 2 — POLİÇE ÇİPLERİ */}
      <div className="grid grid-cols-3 gap-2 select-none">
        <PoliceCipi etiket="SİGORTA" durum={insuranceStatus} onAc={() => onOpenModal(vehicle, 'insurance', insuranceStatus)} />
        <PoliceCipi etiket="KASKO" durum={kaskoStatus} onAc={() => onOpenModal(vehicle, 'kasko', kaskoStatus)} />
        <PoliceCipi etiket="MUAYENE" durum={inspectionStatus} onAc={() => onOpenModal(vehicle, 'inspection', inspectionStatus)} />
      </div>

      {/* KATMAN 3 — GÜNLÜK EYLEMLER + `⋯`
          Üç düğme her gün kullanılan işler. Dördüncü kutucuk seyrek
          olanları taşıyor; kartta yer kaplamadan erişilebilir kalıyorlar. */}
      <div className="flex gap-2 select-none">
        {/* ÜÇÜ DE İKİNCİL — renk bütünlüğü.
            Eskiden "Detay" dolu indigo, diğer ikisi beyaz çerçeveliydi. Ama
            üçü de aynı sıklıkta kullanılan eşdeğer eylemler; birini öne
            çıkarmak var olmayan bir hiyerarşi uyduruyordu. Birincil renk
            artık sayfa başına tek eyleme ayrıldı ("Yeni Araç Kaydet"). */}
        <button onClick={() => onViewDetails(vehicle)} className={dugme('ikincil', { ek: 'flex-1 min-w-0 px-2' })}>
          Detay
        </button>
        <button onClick={() => onViewKarne(vehicle)} className={dugme('ikincil', { ek: 'flex-1 min-w-0 px-2' })}>
          Karne
        </button>
        <button onClick={() => onOpenMaintenance(vehicle)} className={dugme('ikincil', { ek: 'flex-1 min-w-0 px-2' })}>
          Bakım
        </button>

        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuAcik((a) => !a)}
            aria-expanded={menuAcik}
            aria-haspopup="menu"
            aria-label={`${plate} için diğer işlemler`}
            className={ikonDugmesi('ikincil')}
          >
            {/* Üç nokta ikonu kayıtta yok. Kayda yalnızca bu kart için ikon
                eklemek yerine satır içi çizim: kullanılmayan ikon eklenmiyor
                kuralı (registry.jsx başlığı). */}
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="12" r="1.8" />
              <circle cx="12" cy="12" r="1.8" />
              <circle cx="19" cy="12" r="1.8" />
            </svg>
          </button>

          {menuAcik && (
            <div
              role="menu"
              className="absolute right-0 bottom-full mb-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-30 py-1 motion-safe:animate-fadeIn"
            >
              {vehicle.is_listed ? (
                <MenuOgesi
                  ikon="ilan"
                  etiket="Vitrin kartını düzenle"
                  ipucu="Bedel, öne çıkarma ve kaldırma"
                  onSec={() => menudenCalistir(() => onManageListings?.())}
                />
              ) : (
                <MenuOgesi
                  ikon="ilan"
                  etiket="Vitrine çıkar"
                  ipucu="Pazaryerinde göster"
                  onSec={() => menudenCalistir(onOpenListingModal)}
                />
              )}

              {/* Satıştaki araç için de gösteriliyor: satıcı ilan
                  yayındayken aracı devretmiş olabilir ve devir zaten
                  ilanı kapatıyor. */}
              <MenuOgesi
                ikon="anahtar"
                etiket="Aracı devret"
                ipucu="Sicili yeni sahibine aktar"
                onSec={() => menudenCalistir(onOpenDevir)}
              />
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

// Poliçe çipi: eskiden üç ayrı blok olarak kopyalanmıştı ve üçüncüsünün
// dolgusu diğer ikisinden farklıydı (`px-1.5 py-2` vs `p-2`) — gözle
// yakalanmayan ama hizayı bozan türden bir sapma. Tek bileşen olunca
// mümkün değil.
//
// `div` değil `button`: tıklanabilir bir öğeydi ama klavyeyle erişilemiyor
// ve ekran okuyucuya düğme olduğunu söylemiyordu.
function PoliceCipi({ etiket, durum, onAc }) {
  return (
    <button
      type="button"
      onClick={onAc}
      className={`border px-2 py-1.5 rounded-xl flex flex-col justify-center items-start gap-0.5 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 shadow-2xs text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${durum.bgClass}`}
    >
      <span className="text-[9px] font-black uppercase tracking-wider opacity-60">{etiket}</span>
      <span className="flex items-center gap-1.5 w-full min-w-0">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${durum.dotClass}`} />
        <span className="text-[11px] font-black truncate leading-none">{durum.text}</span>
      </span>
    </button>
  );
}

function MenuOgesi({ ikon, etiket, ipucu, onSec }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSec}
      className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 transition-colors flex items-start gap-2.5 cursor-pointer focus-visible:outline-none focus-visible:bg-slate-50"
    >
      <span className="text-slate-400 mt-0.5 shrink-0">
        <Icon name={ikon} size="sm" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-black text-slate-800">{etiket}</span>
        <span className="block text-[10px] text-slate-500 font-semibold">{ipucu}</span>
      </span>
    </button>
  );
}