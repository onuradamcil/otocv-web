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
      // `ilan` (pano) ikonuydu: hem zayıf bir metafor hem de tanımlayıcı
      // adı bu üründe yasaklı kelime. Vitrine çıkarmak = GÖRÜNÜR olmak.
      ikon: 'goz',
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
      // `anahtar` bu kayıtta İNGİLİZ ANAHTARI ve yorumunda "servis/bakım"
      // diye tanımlı — devir kartı bakım ikonu taşıyordu. Kayda eklenen
      // `devir` (karşılıklı oklar) ikonuna geçti.
      ikon: 'devir',
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
      // `takvim` idi: takvim RANDEVU demek, yapılmış bir servisi kaydetmek
      // değil. Kayıttaki `anahtar` zaten "servis/bakım" için tanımlı.
      ikon: 'anahtar',
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
          {/* ⚠ SES SEVİYESİ DÜŞÜRÜLDÜ.
              Bant tam genişlikte kırmızı gradyan + gölge idi ve sayfanın EN
              yüksek sesli ögesiydi — sayfa başlığından bile baskın. Oysa
              taşıdığı şey bir uyarı, sayfanın konusu değil.

              Uyarı rengi duruyor ama dolgu yerine ince çerçeve + açık zemin:
              göze çarpıyor, bağırmıyor. Aciliyet renkle anlatılıyor, alanla
              değil. */}
          <div className="bg-rose-50 border border-rose-200 text-rose-900 px-5 py-3.5 rounded-2xl flex items-center justify-between gap-4 select-none">
            <div className="flex items-center gap-3 min-w-0">
              <span className="relative flex h-3 w-3 shrink-0">
                {/* Nokta beyazdı — koyu kırmızı zeminde görünüyordu, açık
                    zemine geçince kayboldu. Uyarı rengine alındı. */}
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
              {/* "Filo Uyarısı" değil: "filo" kelimesi kurumsal ürüne
                  ayrıldı (bkz. TODO — üyelik tipi). Bireysel kullanıcının
                  üç aracına filo demek, ileride iki farklı şeyin aynı adı
                  taşıması demekti. */}
              <p className="text-xs sm:text-sm font-bold tracking-tight truncate">
                Süre Uyarısı: <span className="underline underline-offset-2 font-semibold">{criticalVehicles.length} aracınızın</span> sigorta, kasko veya muayene süresi kritik seviyede!
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button 
                onClick={() => toast.bilgi('Sigorta teklifleri yakında bu ekranda listelenecek.')}
                className="bg-rose-600 hover:bg-rose-700 text-white metin-yardimci font-semibold px-4 py-2 rounded-xl transition-colors active:scale-95 cursor-pointer shrink-0"
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
                className="text-rose-500 hover:text-rose-800 p-1.5 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer shrink-0"
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
          {/* ⚠ SÜZGEÇ ÇİPLERİ BURADAN TAŞINDI — "Araçlarım" başlığının yanına.
              Çipler AŞAĞIDAKİ araç ızgarasını süzüyor ama burada, "Ne yapmak
              istiyorsunuz?" bloğunun ÜSTÜNDE duruyorlardı. Yani denetim ile
              denetlediği şeyin arasına koca bir bölüm giriyordu; kullanıcı
              çiplerin neyi etkilediğini göremiyordu.

              Taşımak bir tekrarı da bitirdi: "Araçlarım 10" ile "Tümü 10"
              aynı sayıyı iki kez söylüyordu. */}
          <div className="px-5 py-4 flex items-center justify-between gap-4 border-b border-slate-100">
            <h2 className="baslik-kart text-slate-700">
              Ne yapmak istiyorsunuz?
            </h2>

            <button onClick={onNavigateToAdd} className={dugme('birincil', { ek: 'shrink-0' })}>
              <Icon name="arti" size="sm" strokeWidth={2.5} />
              <span className="hidden sm:inline">Yeni Araç Kaydet</span>
              <span className="sm:hidden">Araç Kaydet</span>
            </button>
          </div>

          <div className="px-5 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {EYLEMLER.map((e) => (
                <MerkezEylem key={e.tur} eylem={e} onAc={() => setSeciciTuru(e.tur)} />
              ))}
            </div>
          </div>
        </section>

        {/* SÜZGEÇ ARTIK LİSTENİN YANINDA. Denetim, denetlediği şeyle aynı
            satırda; hangi çipin neyi süzdüğü bakılır bakılmaz anlaşılıyor.
            Ayrı bir "10" sayacı yok — "Tümü 10" çipi zaten onu söylüyor. */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
          <h2 className="baslik-bolum text-slate-900 shrink-0">Araçlarım</h2>

          <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Araç süzgeci">
            <SuzgecCipi
              deger={vehicles.length}
              etiket="Tümü"
              secili={suzgec === 'tumu'}
              onSec={() => setSuzgec('tumu')}
            />
            <SuzgecCipi
              deger={satistaSayisi}
              etiket="Vitrinde"
              renk="bg-emerald-50 text-emerald-700"
              secili={suzgec === 'satista'}
              onSec={() => setSuzgec(suzgec === 'satista' ? 'tumu' : 'satista')}
            />
            <SuzgecCipi
              deger={criticalVehicles.length}
              etiket="Süresi kritik"
              renk="bg-rose-50 text-rose-700"
              secili={suzgec === 'kritik'}
              onSec={() => setSuzgec(suzgec === 'kritik' ? 'tumu' : 'kritik')}
            />
          </div>

          {/* Etkin süzgeç çip olarak görünüyor ve temizlenebiliyor. Süzgecin
              görünmez olması, kullanıcının "araçlarım kayboldu" sanmasının
              en yaygın sebebi. */}
          {suzgec !== 'tumu' && (
            <button
              type="button"
              onClick={() => setSuzgec('tumu')}
              className="inline-flex items-center gap-1.5 min-h-[28px] px-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 metin-yardimci font-semibold hover:bg-indigo-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
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
            className="py-10 px-4 bg-red-50 border border-red-200 rounded-xl text-red-600 metin-yardimci font-semibold flex items-center justify-center gap-2"
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
          /* `items-start` KALDIRILDI. Onunla kartlar içeriği kadar yükseliyordu;
             "VİTRİNDE" çipi olan kart diğerlerinden uzun kalıyor ve satır
             hizası bozuluyordu. Varsayılan `stretch` ile aynı satırdaki
             kartlar eşit yükseklikte; eylem düğmeleri de aynı hizaya oturuyor.
             ⚠ Burası bir üçlü ifadenin içi, JSX değil. Süslü parantezli JSX
             yorumu burada geçersiz; düz JS yorumu kullanılıyor. */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
// SÜZGEÇ ÇİPİ — eskiden `Sayac` adında bir "istatistik" bloğuydu.
//
// ⚠ İŞLEV DEĞİL, BİÇİM YANLIŞTI. Bu ögeler en baştan beri tıklanabilir
// süzgeçti (`aria-pressed`, seçili durumu, liste süzme). Ama görsel dilleri
// gösterge paneli istatistiğiydi: dev bir rakam, altında küçük etiket.
// Kullanıcı süzgeç olduğunu anlamıyor, bağlamsız bir sayı görüyordu —
// "bu ne dedirtiyor" tepkisinin sebebi buydu.
//
// İkinci kusur: rakam `.sayi-vurgu` ile 24px/900 idi, yani SAYFA BAŞLIĞINDAN
// (20px) büyük. Ekran "bu sayfadaki en önemli şey 10 sayısı" diyordu.
//
// Artık tanınabilir bir süzgeç çipi: önce etiket, sonra sayı rozeti. Seçili
// olan dolu, diğerleri çerçeveli. Sayı hâlâ görünüyor ama hiyerarşinin
// tepesini işgal etmiyor.
function SuzgecCipi({ deger, etiket, renk = 'bg-slate-100 text-slate-700', secili = false, onSec }) {
  const bos = deger === 0;

  return (
    <button
      type="button"
      onClick={onSec}
      disabled={bos && !secili}
      aria-pressed={secili}
      className={`inline-flex items-center gap-2 pl-3 pr-2 min-h-[36px] rounded-full border transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 ${
        bos && !secili
          ? 'border-slate-200 bg-white text-slate-400 cursor-default'
          : secili
            ? 'border-indigo-600 bg-indigo-600 text-white cursor-pointer'
            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
      }`}
    >
      <span className="metin-yardimci font-medium whitespace-nowrap">{etiket}</span>
      {/* Sayı rozeti etiketten BİR KADEME İLERİDE: 13px, yarı kalın, tabular.
          Çip artık sayfa başlığıyla yarışmadığı (bölüm başlığının yanında)
          için sayı hiyerarşiyi bozmadan öne çıkabiliyor. `tabular-nums`
          şart: 9 -> 10 olunca çipin genişliği zıplamasın. */}
      <span className={`metin-yardimci font-semibold font-mono tabular-nums min-w-[22px] text-center px-1.5 py-0.5 rounded-full ${
        secili ? 'bg-white/25 text-white' : bos ? 'bg-slate-100 text-slate-400' : renk
      }`}>
        {deger}
      </span>
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
        {/* 32px kutuda 16px ikondu: 15px başlık ve 13px açıklamanın yanında
            cılız kalıyordu. 48px kutu / 24px ikon, kartın ağırlığına denk.
            İki tonlu: renkli zemin + renkli çizgi; hover'da dolu hale
            geçiyor, yani durum değişimi renkle değil DOLULUKLA anlatılıyor. */}
        <span
          className={`w-12 h-12 rounded-2xl grid place-items-center shrink-0 transition-colors ${
            kapali
              ? 'bg-slate-100 text-slate-400'
              : 'bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-100 group-hover:bg-indigo-600 group-hover:text-white group-hover:ring-indigo-600'
          }`}
        >
          <Icon name={eylem.ikon} size="xl" strokeWidth={1.8} />
        </span>
        <span className={`baslik-kart ${kapali ? 'text-slate-500' : 'text-slate-900'}`}>
          {eylem.baslik}
        </span>
      </span>

      <span className={`block metin-yardimci leading-relaxed ${kapali ? 'text-slate-500' : 'text-slate-500'}`}>
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

      {/* KATMAN 1 — KİMLİK
          `flex-wrap` + `basis-full`: MOBİLDE ÖLÇÜLDÜ, bilgi sütununa yalnızca
          121px kalıyordu (küçük resim 76px + skor rozeti + boşluklar geri
          kalanı yiyordu). Sonuç: araç adı 170px isterken kesiliyor, hatta
          KİLOMETRE kesiliyordu — sicil ürününde kilometre kritik veri.
          Artık dar ekranda küçük resim ve skor üstte, kimlik bilgisi altta
          tam genişlikte. `sm` ve üstünde eski tek satırlık düzen aynen
          duruyor (masaüstünde taşma zaten yoktu). */}
      <div className="flex flex-wrap gap-4 items-start">
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
            <span className="etiket text-slate-500 text-center leading-tight">
              GÖRSEL<br />YOK
            </span>
          )}
        </div>

        <div className="order-3 sm:order-none basis-full sm:basis-auto sm:flex-1 min-w-0 flex flex-col items-start space-y-1.5">
          <div className="inline-flex items-center border-[1.5px] border-slate-800 rounded-md bg-white font-mono h-7 overflow-hidden select-none shadow-sm shrink-0">
            <div className="bg-[#003399] text-white etiket font-sans flex flex-col items-center justify-center px-1.5 h-full leading-none shrink-0">
              <span>TR</span>
            </div>
            <div className="px-3 text-slate-900 tracking-wider uppercase h-full flex items-center bg-white font-mono text-sm font-semibold shrink-0">
              {plate.replace(/\s+/g, '').replace(/^(\d{2})([A-Z]{1,3})(\d{2,4})$/, '$1 $2 $3')}
            </div>
          </div>
          
          <h3 className="baslik-kart text-slate-900 truncate w-full">
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
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 text-emerald-800 px-2 py-1 rounded-lg etiket">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Vitrinde
            </span>
          )}
        </div>

        {/* Skor rozeti: eskiden `text-xs sm:text-sm` idi — aynı bilgi ekran
            genişliğine göre boyut değiştiriyordu, oysa önemi değişmiyor. */}
        <div className="ml-auto sm:ml-0 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl text-right shrink-0 select-none">
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
      <span className="etiket opacity-70">{etiket}</span>
      {/* `truncate` KALDIRILDI: tablette ölçüldü, "Süresi Doldu" 70px'lik
          kutuda 72px istiyordu ve "Süresi Do..." diye kesiliyordu. Kesmek
          bilgi kaybettiriyor; sarmak kaybettirmiyor. Üç çip aynı ızgara
          satırında olduğu için ikinci satıra taşan biri diğerlerini de
          yükseltiyor, yani hiza bozulmuyor. */}
      <span className="flex items-start gap-1.5 w-full min-w-0">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${durum.dotClass}`} />
        <span className="metin-yardimci font-semibold leading-tight">{durum.text}</span>
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
        <span className="block metin-govde font-semibold text-slate-800">{etiket}</span>
        <span className="block metin-yardimci text-slate-500">{ipucu}</span>
      </span>
    </button>
  );
}