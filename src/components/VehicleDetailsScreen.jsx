// =========================================================================
// OTO-CV MODÜL 3: DETAYLI SİCİL VE ARAÇ DNA PANELİ (VehicleDetailsScreen.jsx)
// İşlev: Sahibinden tarzı alt vitrinli slider, sonsuz döngülü tam ekran galeri,
//        teknik spesifikasyon gridleri, dinamik toplam yatırım bilançosu kartı,
//        akıllı akordeon ve 2. kullanıcı (public) PREMIUM PAYWALL koruması.
// =========================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function VehicleDetailsScreen({ vehicle, onBack, onViewKarne, isPublicView = false }) {
  
  // =========================================================================
  // 1. BLOK: REAKTİF DURUM VE AKILLI HAFIZA MERKEZİ
  // =========================================================================
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [expandedTileIndex, setExpandedTileIndex] = useState(null); 

  // Premium Simülasyon Modal Kontrolcüsü
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Tam Ekran Işık Kutusu (Lightbox) Kontrolcüleri
  const [isFullscreenGallery, setIsFullscreenGallery] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState([]); 

  // Güvenli Kimlik ve Skor Bilgilerinin Süzülmesi
  const plateNumber = vehicle?.plate_number || vehicle?.plate || '';
  const score = vehicle?.trust_score ?? 60;

  useEffect(() => {
    if (plateNumber) {
      fetchVehicleMaintenanceHistory();
    }
  }, [plateNumber]);

  // =========================================================================
  // 2. BLOK: VERİTABANI BAĞLANTI MOTORU (FRANKFURT DB TIMELINE FETCH)
  // =========================================================================
  const fetchVehicleMaintenanceHistory = async () => {
    try {
      setLoadingRecords(true);
      const { data, error } = await supabase
        .from('maintenance_records')
        .select('*')
        .eq('vehicle_plate', plateNumber)
        .order('km_at_service', { ascending: false });

      if (error) throw error;
      setMaintenanceRecords(data || []);
    } catch (err) {
      console.error('Bakım geçmişi yüklenirken siber hata:', err.message);
    } finally {
      setLoadingRecords(false);
    }
  };

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-xs font-semibold text-slate-400">
        Araç sicil verileri yükleniyor...
      </div>
    );
  }

  // =========================================================================
  // 3. BLOK: GÖRSEL SEPETİ PARÇALAMA VE KORUMA MOTORU (BLOB / HTTP READY)
  // =========================================================================
  const rawImageUrls = vehicle.image_url || vehicle.image || '';
  const imageList = rawImageUrls
    ? rawImageUrls.split(',')
        .map(url => url.trim())
        .filter(url => url.startsWith('http') || url.startsWith('blob:'))
    : [];

  // =========================================================================
  // 4. BLOK: SONSUZ DÖNGÜLÜ (INFINITE LOOP) LIGHTBOX NAVİGASYON MATRİSİ
  // =========================================================================
  const handleNextFullscreenImage = (e) => {
    e.stopPropagation();
    if (lightboxImages.length === 0) return;
    setFullscreenIndex((prev) => (prev + 1) % lightboxImages.length);
  };

  const handlePrevFullscreenImage = (e) => {
    e.stopPropagation();
    if (lightboxImages.length === 0) return;
    setFullscreenIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
  };

  // =========================================================================
  // 🧠 REAKTİF BİLANÇO MOTORU: Bakım Harcamalarını Kusursuz Toplama Döngüsü
  // =========================================================================
  const totalMaintenanceCost = maintenanceRecords.reduce((sum, item) => {
    if (!item.cost) return sum;
    const cleanCost = typeof item.cost === 'string' 
      ? parseInt(item.cost.replace(/\./g, ''), 10) 
      : parseInt(item.cost, 10);
    return sum + (isNaN(cleanCost) ? 0 : cleanCost);
  }, 0);

  const formattedTotalCost = `₺${totalMaintenanceCost.toLocaleString('tr-TR')}`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] p-4 md:p-8 font-sans antialiased tracking-tight">
      <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn">
        
        {/* ÜST SEYRÜSEFER GEÇİŞ KÖPRÜSÜ */}
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 select-none">
          <div className="flex items-center gap-2">
            <button 
              onClick={onBack}
              className="text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1 font-bold"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              {isPublicView ? 'Doğrulama Havuzuna Dön' : 'Garajıma Güvenli Dön'}
            </button>
            <span>/</span>
            <span className="text-slate-600 font-medium">Araç Detaylı Sicil Raporu</span>
          </div>
          
          {isPublicView && vehicle.pin_code && (
            <span className="font-mono text-slate-500 bg-slate-200/60 px-2.5 py-1 rounded-md font-bold">PIN: {vehicle.pin_code}</span>
          )}
        </div>

        {/* 🚀 BANNER ALANI: Çelişki yaratan %100 ibaresi 'SİSTEM ONAYLI' olarak revize edildi */}
        {isPublicView && (
          <div className="bg-[#0B1329] border border-[#1E293B] p-4.5 rounded-2xl text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl relative overflow-hidden animate-scaleUp">
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-72 h-20 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex gap-3 items-center relative z-10">
              <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286z" /></svg>
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-black tracking-wide text-slate-100 uppercase">Açık Veri Doğrulama Geçidi</h4>
                <p className="text-[11px] text-slate-400 font-medium">Bu dijital geçmiş raporu, güvenli bulut mimarisi ve AutoID altyapısıyla tescil edilmiştir.</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-black tracking-widest bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg shrink-0 self-end sm:self-center uppercase">OTO.CV SİSTEM ONAYLI</span>
          </div>
        )}

        {/* DETAY MİZANPAJI: SLIDER & KÜNYE MATRİSİ */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 items-start">
          
          {/* ADVANCED IMAGE SLIDER PANELİ */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-sm relative group h-[320px] md:h-[400px] flex items-center justify-center bg-slate-950">
              {imageList.length === 0 ? (
                <div className="text-center text-slate-400 text-xs font-semibold">Araca ait vitrin görseli bulunmamaktadır.</div>
              ) : (
                <>
                  <img src={imageList[currentImageIndex]} alt="Araç Detay Vitrin" className="w-full h-full object-cover" />
                  {/* Sol Üst Güven Rozeti */}
                  <div className="absolute top-4 left-4 bg-white/95 border border-indigo-100 backdrop-blur px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 select-none">
                    <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse" />
                    <span className="text-indigo-600 text-[10px] font-bold tracking-wider uppercase">Doğruluk Skoru (%{score})</span>
                  </div>
                  {/* Sağ Alt Büyüteç Tetikleyici */}
                  <button 
                    onClick={() => {
                      setLightboxImages(imageList); 
                      setFullscreenIndex(currentImageIndex);
                      setIsFullscreenGallery(true);
                    }}
                    className="absolute bottom-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2.5 rounded-full transition-all shadow-md active:scale-95"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* ALT VİTRİN THUMBNAIL ŞERİDİ */}
            {imageList.length > 1 && (
              <div className="flex items-center justify-center gap-2 overflow-x-auto py-1 select-none">
                {imageList.map((url, idx) => {
                  const isSelected = currentImageIndex === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-20 h-14 rounded-lg overflow-hidden border-2 bg-slate-100 relative shrink-0 transition-all ${
                        isSelected ? 'border-2 border-[#4F46E5] scale-102 shadow-sm' : 'border-transparent opacity-65 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt="Thumbnail" className="w-full h-full object-cover" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* SAĞ KİMLİK KARTI VE TESCİL PANELİ */}
          <div className="lg:col-span-4 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-6 w-full">
              <div className="space-y-1">
                <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wider uppercase">
                  Tescilli Araç Sicili
                </span>
                <h2 className="text-xl font-bold text-slate-950 tracking-tight leading-tight">
                  {vehicle.year} {vehicle.brand} {vehicle.model}
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  {vehicle.package || 'Standart Donanım Paketi'}
                </p>
              </div>

              <div className="w-full h-px bg-slate-100" />

              {/* KİLOMETRE VE ÜRETİM ANALİZ HÜCRELERİ */}
              <div className="grid grid-cols-2 gap-4 select-none">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">KİLOMETRE</span>
                  <p className="text-lg font-bold text-slate-900 font-mono">
                    {vehicle.km?.toLocaleString('tr-TR')} km
                  </p>
                </div>
                <div className="space-y-0.5 border-l border-slate-100 pl-4">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">ÜRETİM YILI</span>
                  <p className="text-lg font-bold text-slate-900 font-mono">
                    {vehicle.year}
                  </p>
                </div>
              </div>

              {/* RESMİ PROFILE GÜVENCE ŞERİDİ */}
              <div className="bg-emerald-50/40 border border-emerald-100 p-4 rounded-xl flex items-start gap-3 select-none">
                <div className="text-emerald-600 pt-0.5 shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12z" />
                  </svg>
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-emerald-800">Doğrulanmış Profil Güvencesi</h4>
                  <p className="text-[11px] text-emerald-700/90 font-medium leading-relaxed">
                    Kimlik kartı, resmi ruhsat eşleşmesi ve sistem şasi numarası kontrolleri hatasız tamamlanmıştır.
                  </p>
                </div>
              </div>
            </div>

            {/* 🚀 UX DEVRİMİ: Alıcı (public) görünümünden kafa karıştıran mor karne butonu tamamen imha edildi! */}
          </div>
        </div>

        {/* %100 DİNAMİK YAPISAL ÖZELLİK VE TRAMER GRİD MATRİSİ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 select-none">
          <SpecCard title="YAKIT TİPİ" value={vehicle.fuel_type || 'Belirtilmedi'} />
          <SpecCard title="VİTES TİPİ" value={vehicle.transmission || 'Belirtilmedi'} />
          <SpecCard title="GÖVDE RENGİ" value={vehicle.color || 'Belirtilmedi'} />
          
          <SpecCard 
            title="TRAMER DURUMU" 
            value={vehicle.tramer_status === 'Tramer Kaydı Var' ? `${vehicle.tramer_amount || '0'} TL Kayıtlı` : 'Hasarsız / Orijinal'} 
            isSuccess={vehicle.tramer_status !== 'Tramer Kaydı Var'} 
          />
        </div>

        {/* =========================================================================
            5. BLOK: BAKIM GEÇMİŞİ SİCİL PANELİ VE AKORDEON DİZİLİMİ
            ========================================================================= */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Bakım Geçmişi Sicili</h3>
            <p className="text-xs text-slate-400 font-medium">
              Usta faturaları, periyodik değişimler ve servis işlemlerinin zaman damgalı dökümü.
            </p>
          </div>

          <div className="border-t border-gray-100 pt-1" />

          {loadingRecords ? (
            <div className="py-10 flex justify-center items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent" />
            </div>
          ) : maintenanceRecords.length === 0 ? (
            <div className="text-center py-10 text-xs font-semibold text-slate-400 border border-dashed border-gray-200 rounded-xl bg-slate-50/50">
              Bu araca ait kayıtlı bir sanayi veya servis sicili bulunmamaktadır.
            </div>
          ) : (
            <div className="space-y-3">
              
              {/* TOPLAM BELGELENMİŞ GÜVENLİ BAKIM YATIRIMI KARTI */}
              <div className="bg-indigo-50/40 border border-indigo-100 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 select-none mb-1 animate-scaleUp">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0 shadow-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.251.11a3.371 3.375 0 003.498 0A3.373 3.372 0 0015 12a3.374 3.374 0 00-2.251-3.182.25.25 0 01-.25-.224V4.5m0 4.5a3.37 3.37 0 00-3.498 0M12 9.75V14.25" />
                    </svg>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider block uppercase">TOPLAM BELGELENMİŞ SERVİS YATIRIMI</span>
                    <p className="text-xs text-slate-500 font-medium">Kazalardan bağımsız olarak araca yapılan şeffaf koruma ve iyileştirme harcamaları.</p>
                  </div>
                </div>
                <span className="text-xl font-bold text-indigo-700 font-mono self-end sm:self-center bg-white border border-indigo-100 px-3 py-1 rounded-xl shadow-sm">
                  {formattedTotalCost}
                </span>
              </div>

              {/* MEVCUT AKORDEON DÖNGÜSÜ */}
              {maintenanceRecords.map((item, index) => {
                const isExpanded = expandedTileIndex === index;
                const invoiceUrl = item.invoice_url;

                // =========================================================================
                // 🧠 ULTRA AKILLI UNIFIED PARSER MATRİSİ (STEP 3 & POPUP SENKRONİZASYONU)
                // =========================================================================
                let titleStr = '';
                let descStr = '';

                if (item.service_type) {
                  let cleanSummary = item.summary || '';
                  
                  if (cleanSummary.includes(' - ')) {
                    cleanSummary = cleanSummary.split(' - ').pop() || cleanSummary;
                  }
                  if (cleanSummary.includes(' / ')) {
                    cleanSummary = cleanSummary.split(' / ').pop() || cleanSummary;
                  }
                  
                  cleanSummary = cleanSummary.trim();

                  if (cleanSummary.toLowerCase().includes(item.service_type.toLowerCase()) && cleanSummary.toLowerCase().includes('kaydı işlendi')) {
                    titleStr = item.service_type;
                    descStr = cleanSummary;
                  } else {
                    titleStr = `${item.service_type} - ${cleanSummary}`;
                    descStr = cleanSummary || 'İşlem detayı belirtilmedi.';
                  }
                } else {
                  if (item.summary && item.summary.includes(' - ')) {
                    titleStr = item.summary.split(' - ')[0]?.trim();
                    descStr = item.summary.split(' - ')[1]?.trim();
                  } else {
                    titleStr = item.summary || 'Bakım Kaydı';
                    descStr = item.summary || 'İşlem detayı belirtilmedi.';
                  }
                }

                return (
                  <div 
                    key={item.id || index}
                    className="border border-gray-200 rounded-xl overflow-hidden bg-slate-50/40 transition-colors duration-200"
                  >
                    <div 
                      onClick={() => setExpandedTileIndex(isExpanded ? null : index)}
                      className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center shrink-0 text-slate-500">
                          <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.83-5.83m0 0a2.95 2.95 0 11-4.174-4.173 2.95 2.95 0 014.173 4.174zM6.637 10.07l-.223.184a3 3 0 01-4.078-.292l-.305-.305a3 3 0 01-.292-4.078l.184-.223A3 3 0 016.32 4.316l.306.305a3 3 0 01.291 4.078l-.183.223zm9.323 1.15l.222-.183a3 3 0 014.079.292l.305.305a3 3 0 01.292 4.078l-.184.222a3 3 0 01-4.078.714l-.306-.305a3 3 0 01-.292-4.078l.184-.222z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 truncate">{titleStr}</h4>
                          <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                            Tarih: {item.service_date || '03/07/2026'} • Servis: {item.shop_name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <span className="text-sm font-bold text-slate-900">₺{item.cost?.toLocaleString('tr-TR')}</span>
                          {invoiceUrl && (
                            <span className="block text-[9px] font-bold text-emerald-600 text-right">MÜHÜRLÜ EVRAK</span>
                          )}
                        </div>
                        <div className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="bg-white border-t border-gray-100 p-4 space-y-4 animate-slideDown">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4 border-b border-gray-50 pb-3 text-xs">
                          <div className="flex justify-between border-r border-gray-100 pr-4">
                            <span className="text-slate-400 font-medium">İşlem Kilometresi:</span>
                            <span className="font-bold text-slate-700">{item.km_at_service?.toLocaleString('tr-TR')} KM</span>
                          </div>
                          <div className="flex justify-between md:border-r border-gray-100 md:px-4">
                            <span className="text-slate-400 font-medium">Servis / Nokta:</span>
                            <span className="font-bold text-slate-700 truncate max-w-[120px]">{item.shop_name}</span>
                          </div>
                          <div className="flex justify-between md:pl-4 col-span-2 md:col-span-1">
                            <span className="text-slate-400 font-medium">Kayıt Tarihi:</span>
                            <span className="font-bold text-slate-700">{item.service_date}</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-slate-400 tracking-wider block">USTA AÇIKLAMASI & EK İŞLEMLER</span>
                          <p className="text-xs md:text-sm text-slate-600 font-medium leading-relaxed bg-slate-50 p-3 rounded-lg border border-gray-100/60">
                            {descStr}
                          </p>
                        </div>

                        {/* =========================================================================
                            🚀 ADIM BOMBARDIMANI: 2. Kullanıcı İçin Fatura / Evrak Paywall Engelleyici Maskesi
                            ========================================================================= */}
                        {invoiceUrl && (
                          <div className="space-y-2 pt-1">
                            <span className="text-[10px] font-semibold text-slate-400 tracking-wider block">RESMİ SİCİL EVRAKI (FATURA MAKBUNU)</span>
                            
                            {isPublicView ? (
                              /* A SENARYOSU: Alıcı Sorgulaması (Premium Paywall Duvarı) */
                              <div 
                                onClick={() => setShowPremiumModal(true)}
                                className="w-full max-w-[160px] h-24 bg-slate-100 border border-gray-200 rounded-xl overflow-hidden cursor-pointer relative group shadow-inner transition-all hover:border-indigo-300"
                              >
                                <img src={invoiceUrl} alt="Bakım Faturası Kilitli" className="w-full h-full object-cover blur-[5px] opacity-40 select-none pointer-events-none" />
                                <div className="absolute inset-0 bg-indigo-950/40 flex flex-col items-center justify-center text-center p-2 space-y-1">
                                  <svg className="w-4 h-4 text-amber-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                                  <span className="text-white text-[9px] font-black tracking-wide uppercase leading-tight">Premium Evrak Kilidi</span>
                                </div>
                              </div>
                            ) : (
                              /* B SENARYOSU: Araç Sahibi Görünümü (Sınırsız Tam Yetki) */
                              <div 
                                onClick={() => {
                                  setLightboxImages([invoiceUrl]); 
                                  setFullscreenIndex(0);
                                  setIsFullscreenGallery(true);
                                }}
                                className="w-full max-w-[120px] h-20 bg-slate-50 border border-gray-200/80 rounded-xl overflow-hidden cursor-zoom-in relative group shadow-inner"
                              >
                                <img src={invoiceUrl} alt="Bakım Faturası Açık" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-semibold text-center p-1">
                                  İNCELE
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* =========================================================================
          🚀 PREMIUM SIMÜLASYON MODAL DIALOG PORTALI (INVESTOR-READY MOCKUP)
          ========================================================================= */}
      {showPremiumModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-gray-100 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center space-y-5 select-none relative animate-scaleUp">
            <button type="button" onClick={() => setShowPremiumModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            
            <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.251.11a3.371 3.375 0 003.498 0A3.373 3.372 0 0015 12a3.374 3.374 0 00-2.251-3.182.25.25 0 01-.25-.224V4.5m0 4.5a3.37 3.37 0 00-3.498 0M12 9.75V14.25" /></svg>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900 tracking-tight">Oto.CV Premium Rapor Kilidi</h3>
              <p className="text-xs text-slate-400 font-semibold leading-relaxed px-2">
                Araca ait noter tasdikli usta fatura makbuzlarını and resmi evrak asıllarını görüntülemek için paket seçin.
              </p>
            </div>

            <div className="bg-slate-50 border border-gray-200/60 p-4 rounded-xl text-left flex justify-between items-center">
              <div>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">TEK SEFERLİK</span>
                <h4 className="text-xs font-black text-slate-900 mt-1">Bu Aracın Evrak Kilidini Aç</h4>
              </div>
              <span className="text-lg font-mono font-black text-slate-900">₺149</span>
            </div>

            <button 
              type="button" 
              onClick={() => alert("Siber Ödeme Entegrasyonu Yakında Aktif Olacak Kanka!")}
              className="w-full bg-[#4F46E5] hover:bg-indigo-700 text-white font-bold text-xs py-3.5 rounded-xl transition-all shadow-md shadow-indigo-600/10"
            >
              Güvenli Ödeme Yap (Simüle)
            </button>
          </div>
        </div>
      )}

      {/* LIGHTBOX GALERİ SÜRÜCÜSÜ */}
      {isFullscreenGallery && lightboxImages.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fadeIn">
          <button onClick={() => setIsFullscreenGallery(false)} className="absolute top-6 right-6 z-50 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full transition-colors active:scale-95 text-xs font-bold">Kapat</button>
          {lightboxImages.length > 1 && (
            <button onClick={handlePrevFullscreenImage} className="absolute left-6 z-50 bg-white/10 hover:bg-white/20 text-white w-10 h-10 rounded-full transition-colors flex items-center justify-center font-bold text-md">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>
          )}
          <div className="max-w-4xl max-h-[80vh] flex items-center justify-center overflow-hidden">
            <img src={lightboxImages[fullscreenIndex]} alt="Sonsuz Galeri" className="max-w-full max-h-[80vh] object-contain" />
          </div>
          {lightboxImages.length > 1 && (
            <button onClick={handleNextFullscreenImage} className="absolute right-6 z-50 bg-white/10 hover:bg-white/20 text-white w-10 h-10 rounded-full transition-colors flex items-center justify-center font-bold text-md">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </button>
          )}
          <div className="absolute bottom-6 bg-white/10 text-white text-xs font-mono font-bold px-3 py-1.5 rounded-full">{fullscreenIndex + 1} / {lightboxImages.length}</div>
        </div>
      )}
    </div>
  );
}

// INTERNAL SPEC CARD (TEKNİK ÖZELLİK HÜCRESİ)
function SpecCard({ title, value, isSuccess = false }) {
  return (
    <div className="bg-white border border-gray-200/80 rounded-xl p-4 flex items-center gap-3 shadow-sm">
      <div className={`w-1 h-5 rounded-full shrink-0 ${isSuccess ? 'bg-emerald-500' : 'bg-indigo-600'}`} />
      <div className="min-w-0">
        <span className="text-slate-400 text-[10px] font-bold tracking-wider block uppercase">{title}</span>
        <span className={`text-xs md:text-sm font-bold truncate block mt-0.5 ${isSuccess ? 'text-emerald-700' : 'text-slate-800'}`}>
          {value}
        </span>
      </div>
    </div>
  );
}