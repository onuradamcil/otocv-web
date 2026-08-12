// =========================================================================
// OTO-CV GARAJ MOTORU: ULTRA-PREMIUM DASHBOARD (GarageScreen.jsx)
// İşlev: Akıllı kapatılabilir (X) Top Alert Banner, 3'lü tarih matrisi,
//        Dinamik Pazaryeri İlan Sihirbazı entegrasyonu ve lüks modal paneli.
// =========================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { calculatePolicyStatus } from '../utils/dateHelper';
import PolicyOfferModal from './garage/PolicyOfferModal';
import { useToast } from '../context/ToastContext';
import PublishListingModal from './garage/PublishListingModal';
import AracDevretDialog from './garage/AracDevretDialog'; // 🚀 İLAN MODALI ENJEKTE EDİLDİ
import Icon from './common/icons';
import GlobalStepLoader from './common/GlobalStepLoader';

export default function GarageScreen({ onViewDetails, onViewKarne, onOpenMaintenance, onNavigateToAdd }) {
  const toast = useToast();
  // =========================================================================
  // 1. BLOK: REAKTİF DURUM VE VERİTABANI HAFIZASI
  // =========================================================================
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeUser, setActiveUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  // Policy Offer Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVehicleForModal, setSelectedVehicleForModal] = useState(null);
  const [selectedPolicyType, setSelectedPolicyType] = useState('kasko');
  const [selectedStatusInfo, setSelectedStatusInfo] = useState({});

  // 🚀 PAZARYERİ İLAN SİHİRBAZI MODAL STATE'İ
  const [listingModalOpen, setListingModalOpen] = useState(false);

  // Devir diyalogu. PublishListingModal ile ayni kalip: state GarageScreen
  // icinde, basari sonrasi fetchLiveVehicles cagriliyor. Route dosyasina
  // dokunmadan calisiyor.
  const [devirModalOpen, setDevirModalOpen] = useState(false);
  const [selectedVehicleForDevir, setSelectedVehicleForDevir] = useState(null);
  const [selectedVehicleForListing, setSelectedVehicleForListing] = useState(null);

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
        setActiveUser(user);

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileData) setUserProfile(profileData);

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

          return {
            ...car,
            is_listed: !!activeListing,
            price: activeListing ? activeListing.price : 0,
            listing_title: activeListing ? activeListing.title : null,
            listing_description: activeListing ? activeListing.description : null,
            city: activeListing ? activeListing.city : null,
            district: activeListing ? activeListing.district : null,
            tramer_amount: activeListing ? activeListing.tramer_amount : car.tramer_amount
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

  // İlan Modal Tetikleyicisi
  const handleOpenListingModal = (vehicle) => {
    setSelectedVehicleForListing(vehicle);
    setListingModalOpen(true);
  };

  const handleOpenDevirModal = (vehicle) => {
    setSelectedVehicleForDevir(vehicle);
    setDevirModalOpen(true);
  };

  const userInitials = userProfile ? `${userProfile.first_name[0]}${userProfile.last_name[0]}`.toUpperCase() : 'CV';
  const userFullName = userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'Kullanıcı Hesabı';

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
              <p className="text-xs sm:text-sm font-bold tracking-tight truncate">
                Filo Uyarısı: <span className="underline underline-offset-2 font-black">{criticalVehicles.length} adet aracınızın</span> sigorta, kasko veya muayene süresi kritik seviyede!
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button 
                onClick={() => toast.bilgi('Sigorta teklifleri yakında bu ekranda listelenecek.')}
                className="bg-white hover:bg-red-50 text-red-600 text-xs font-black px-4 py-2 rounded-xl transition-all active:scale-95 shadow-sm cursor-pointer"
              >
                Hemen Teklif Al
              </button>
              <button
                onClick={() => setIsBannerDismissed(true)}
                title="Uyarıyı Kapat"
                className="text-white/80 hover:text-white p-1.5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <Icon name="kapat" size="md" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* BAŞLIK BARI */}
        <div className="flex justify-between items-center border-b border-gray-200 pb-4 select-none">
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-[#0F172A]">
            Oto.CV Garaj Paneli
          </h1>
          <button 
            onClick={fetchLiveVehicles}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-xs font-bold text-indigo-600 rounded-xl hover:bg-indigo-50 transition-all active:scale-95 shadow-sm cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Verileri Yenile
          </button>
        </div>

        {/* PROFİL KARTI */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-shadow duration-300 hover:shadow-md select-none">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-black shadow-inner font-display">
              {userInitials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base text-[#0F172A]">{userFullName}</span>
                <span className="bg-emerald-50 text-[#2E7D32] text-[9px] font-black px-2 py-0.5 rounded-md border border-emerald-200/50 tracking-wider">
                  DOĞRULANDI
                </span>
              </div>
              <p className="text-xs text-[#6F7887] font-medium mt-0.5">{activeUser?.email || 'Yükleniyor...'}</p>
            </div>
          </div>
          
          <div className="bg-[#F8FAFC] border border-gray-200 px-4 py-2.5 rounded-xl flex flex-col items-end shrink-0 w-full sm:w-auto">
            <span className={`text-xs font-black flex items-center gap-1 ${userProfile?.is_premium ? 'text-amber-600' : 'text-[#0f172a]'}`}>
              {userProfile?.is_premium && <Icon name="yildiz" size="sm" />}
              {userProfile?.is_premium ? 'Premium Kurumsal Üyelik' : 'Standart Kurumsal Üyelik'}
            </span>
            <span className="text-[#6F7887] text-[10px] font-bold mt-0.5">Sorgu Limiti: Sınırsız</span>
          </div>
        </div>

        {/* EYLEM AKSİYON BARI */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-0.5">
            <h2 className="text-lg font-black text-[#0f172a] tracking-tight">
              Mevcut Filo Yönetimi <span className="text-gray-400 font-medium text-sm">(Kendi Araçlarım)</span>
            </h2>
            <p className="text-xs text-[#6F7887] font-medium">
              Ruhsatlı araçlarınız ve dijital karne tescil yönetim merkeziniz.
            </p>
          </div>
          
          <button 
            onClick={onNavigateToAdd}
            className="w-full sm:w-auto bg-[#4F46E5] hover:bg-indigo-700 active:scale-98 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/10 transition-all duration-200 select-none cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Yeni Araç Kaydet
          </button>
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
        ) : vehicles.length === 0 ? (
          <div className="py-20 flex flex-col items-center text-center space-y-3 bg-white rounded-2xl border border-dashed border-gray-300">
            <Icon name="klasor" size="2xl" className="text-gray-300" />
            <div>
              <h3 className="text-sm font-black text-[#0F172A]">Garajınız Henüz Boş</h3>
              <p className="text-xs text-[#6F7887] mt-1 font-medium">Sisteme kayıtlı doğrulanmış aracınız bulunmamaktadır.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
            {vehicles.map((vehicle, index) => (
              <VehicleCard 
                key={vehicle.id || vehicle.plate_number || `car-${index}`} 
                vehicle={vehicle} 
                onViewDetails={onViewDetails}
                onViewKarne={onViewKarne}
                onOpenMaintenance={onOpenMaintenance}
                onOpenModal={handleOpenModal}
                onOpenListingModal={handleOpenListingModal}
              onOpenDevir={handleOpenDevirModal} // 🚀 İLAN MODAL TETİKLEYİCİSİ
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

      {/* 🚀 PAZARYERİ İLAN YAYINLAMA MODALI */}
      <PublishListingModal 
        isOpen={listingModalOpen}
        onClose={() => setListingModalOpen(false)}
        vehicle={selectedVehicleForListing}
        onSuccess={fetchLiveVehicles}
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
    </div>
  );
}

// =========================================================================
// 5. BLOK: REAKTİF VE PAZARYERİ BAĞLANTILI ARAÇ KARTI (VehicleCard)
// =========================================================================
function VehicleCard({ vehicle, onViewDetails, onViewKarne, onOpenMaintenance, onOpenModal, onOpenListingModal, onOpenDevir}) {
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

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-[0_4px_20px_rgba(15,23,42,0.03)] hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition-all duration-300 flex flex-col justify-between min-h-[300px] group hover:border-slate-300">
      
      {/* ÜST BİLGİ ALANI */}
      <div className="flex gap-4 items-start">
        <div className="w-[76px] h-[76px] rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner">
          {thumbnailTarget ? (
            <img 
              src={thumbnailTarget} 
              alt={`${vehicle.brand} ${vehicle.model}`} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-slate-400 bg-slate-100">GÖRSEL YOK</div>
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
          
          <h3 className="text-base font-black text-[#0F172A] truncate w-full tracking-tight">
            {vehicle.brand} {vehicle.model}
          </h3>
          <p className="text-[11px] text-slate-500 font-bold font-mono">
            {vehicle.year} Yıl • {vehicle.km ? vehicle.km.toLocaleString('tr-TR') : '0'} km
          </p>
        </div>

        <div className="bg-indigo-50 border border-indigo-100/90 px-3 py-1.5 rounded-2xl text-right shrink-0 select-none shadow-xs">
          <span className="text-indigo-700 text-xs sm:text-sm font-extrabold block font-mono tracking-tight">
            Skor: %{score}
          </span>
        </div>
      </div>

      {/* POLİÇE DURUM KARTLARI */}
      <div className="grid grid-cols-3 gap-2 my-4 select-none">
        <div 
          onClick={() => onOpenModal(vehicle, 'insurance', insuranceStatus)}
          className={`border p-2 rounded-2xl flex flex-col justify-center items-start gap-1 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 shadow-2xs ${insuranceStatus.bgClass}`}
        >
          <span className="text-[9px] font-black uppercase tracking-wider opacity-60">SİGORTA</span>
          <div className="flex items-center gap-1.5 w-full min-w-0">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${insuranceStatus.dotClass}`} />
            <span className="text-xs font-black truncate leading-none">{insuranceStatus.text}</span>
          </div>
        </div>

        <div 
          onClick={() => onOpenModal(vehicle, 'kasko', kaskoStatus)}
          className={`border p-2 rounded-2xl flex flex-col justify-center items-start gap-1 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 shadow-2xs ${kaskoStatus.bgClass}`}
        >
          <span className="text-[9px] font-black uppercase tracking-wider opacity-60">KASKO</span>
          <div className="flex items-center gap-1.5 w-full min-w-0">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${kaskoStatus.dotClass}`} />
            <span className="text-xs font-black truncate leading-none">{kaskoStatus.text}</span>
          </div>
        </div>

        <div 
          onClick={() => onOpenModal(vehicle, 'inspection', inspectionStatus)}
          className={`border px-1.5 py-2 rounded-2xl flex flex-col justify-center items-start gap-1 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 shadow-2xs ${inspectionStatus.bgClass}`}
        >
          <span className="text-[9px] font-black uppercase tracking-wider opacity-60">MUAYENE</span>
          <div className="flex items-center gap-1.5 w-full min-w-0">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${inspectionStatus.dotClass}`} />
            <span className="text-xs font-black truncate leading-none">{inspectionStatus.text}</span>
          </div>
        </div>
      </div>

      {/* 🚀 GARAJDAN SADECE BİLGİ GÖSTERİLİR / DÜZENLEME İLANI YÖNETİM SAYFASINA TAŞINDI */}
      {vehicle.is_listed ? (
        <div className="bg-emerald-50 border border-emerald-200/80 px-3.5 py-2.5 rounded-2xl flex items-center justify-between select-none mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-emerald-800 font-extrabold text-xs tracking-tight">Pazaryerinde Satışta</span>
          </div>
          <span className="font-mono font-black text-xs sm:text-sm tracking-tight text-slate-900">
            ₺{vehicle.price ? Number(vehicle.price).toLocaleString('tr-TR') : '0'}
          </span>
        </div>
      ) : (
        <button
          onClick={() => onOpenListingModal(vehicle)}
          className="w-full bg-slate-50 hover:bg-indigo-50 border border-dashed border-slate-300 hover:border-indigo-300 text-slate-600 hover:text-indigo-600 py-2.5 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold transition-all mb-3 cursor-pointer group"
        >
          <svg className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>Pazaryerinde Satışa Çıkar</span>
        </button>
      )}

      {/* ARACI DEVRET — tam genişlik ikincil şerit.
          Alt aksiyon satırı `grid-cols-3` ve dolu; dördüncü düğme eklemek o
          düzeni bozardı. Bu yüzden ilan şeridinin (yukarıda) birebir kalıbı
          kullanılıyor: kesikli çerçeveli, ikincil ağırlıkta, tam genişlik.

          İlanda olan araç için de gösteriliyor: satıcı ilanı yayındayken
          aracı devretmiş olabilir ve devir zaten ilanı kapatıyor. */}
      <button
        type="button"
        onClick={() => onOpenDevir(vehicle)}
        className="w-full bg-slate-50 hover:bg-amber-50 border border-dashed border-slate-300 hover:border-amber-300 text-slate-600 hover:text-amber-700 font-bold text-xs py-2.5 rounded-2xl transition-colors cursor-pointer flex items-center justify-center gap-2 group"
      >
        <Icon name="anahtar" size="sm" className="text-slate-400 group-hover:text-amber-600 transition-colors" />
        <span>Aracı Devret</span>
      </button>

      {/* EŞİT GENİŞLİKTE MİNİMALİST AKSİYON BUTONLARI */}
      <div className="grid grid-cols-3 gap-2 select-none pt-1">
        <button 
          onClick={() => onViewDetails(vehicle)}
          className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer text-center truncate"
        >
          Detayları Gör
        </button>
        <button 
          onClick={() => onViewKarne(vehicle)}
          className="bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-95 text-slate-800 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center truncate"
        >
          Sicil Karne
        </button>
        <button 
          onClick={() => onOpenMaintenance(vehicle)}
          className="bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-95 text-slate-800 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center truncate"
        >
          Bakım İşle
        </button>
      </div>

    </div>
  );
}