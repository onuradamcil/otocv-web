// =========================================================================
// OTO-CV İLAN VERME SİHİRBAZI: MİMARİ ORKESTRA ŞEFİ (CreateListingWizard.jsx)
// İşlev: Adım takibi (Step 1-2-3), Global İlan Form Hafızası, 
//        Yarım Kalan İlan (Draft Recovery) Modalı ve Supabase Taslak Senkronizasyonu.
// =========================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import Step1VehicleAndPhotos from './Step1VehicleAndPhotos';
import Step2ListingDetails from './Step2ListingDetails';
import Step3PreviewAndPublish from './Step3PreviewAndPublish';

export default function CreateListingWizard({ onBack, onSuccess, user }) {
  // =========================================================================
  // 1. BLOK: AKILLI STEP TAKİBİ VE GLOBAL FORM STATE'İ
  // =========================================================================
  
  // Aktif Adım Sayacı (1: Araç/Foto, 2: Detaylar, 3: Ön İzleme)
  const [currentStep, setCurrentStep] = useState(1);

  // Profil Paketi ve İlan Kotası State'i
  const [userPackage, setUserPackage] = useState({
    tierName: 'Standart Paket',
    remainingQuota: 1,
    totalQuota: 1
  });

  // Yarım Kalan İlan (Draft) State'leri
  const [draftData, setDraftData] = useState(null);
  const [showDraftModal, setShowDraftModal] = useState(false);

  // TÜM İLAN SİHİRBAZININ MERKEZİ VERİ HAFIZASI
  const [formData, setFormData] = useState({
    // 1. Adım Verileri
    photos: [],
    selectedCategory: null,
    selectedYear: null,
    selectedFuel: null,
    selectedBrand: null,
    selectedSeries: null,
    selectedModel: null,
    selectedPackage: null,
    isFinalConfirmed: false,

    // 2. Adım Verileri (Gelecek Adım)
    price: '',
    mileage: '',
    city: '',
    district: '',
    color: '',
    description: '',
    tramerStatus: 'Hasarsız'
  });

  // Form Verilerini Kısmi Güncelleyen Yardımcı Fonksiyon
  const updateFormData = (fields) => {
    setFormData(prev => ({ ...prev, ...fields }));
  };

  // =========================================================================
  // 2. BLOK: YARIM KALAN İLAN (DRAFT RECOVERY) HAFIZA SENSÖRÜ
  // =========================================================================
  
  useEffect(() => {
    fetchUserProfilePackage();
    checkExistingDraft();
  }, [user]);

  // Hafızadaki Taslak Kontrolü
  const checkExistingDraft = () => {
    try {
      const storageKey = `otocv_draft_${user?.id || 'guest'}`;
      const savedDraft = localStorage.getItem(storageKey);
      
      if (savedDraft) {
        const parsedDraft = JSON.parse(savedDraft);
        // Eğer taslakta en azından marka/model seçildiyse Modalı aç
        if (parsedDraft?.formData?.selectedBrand && parsedDraft?.formData?.selectedModel) {
          setDraftData(parsedDraft);
          setShowDraftModal(true);
        }
      }
    } catch (err) {
      console.error("Taslak verisi okunamadı:", err);
    }
  };

  // Taslağı Yükle ve Kaldığı Adımdan Devam Et
  const handleResumeDraft = () => {
    if (!draftData) return;
    setFormData(draftData.formData);
    setCurrentStep(draftData.savedStep || 1);
    setShowDraftModal(false);
  };

  // Taslağı Temizle ve 1. Adımdan Sıfırdan Başla
  const handleDiscardDraft = () => {
    const storageKey = `otocv_draft_${user?.id || 'guest'}`;
    localStorage.removeItem(storageKey);
    setDraftData(null);
    setShowDraftModal(false);
  };

  // Kullanıcı Değişiklik Yaptıkça Taslağı Sessizce Saklayan Sensör
  useEffect(() => {
    if (formData.selectedBrand && formData.selectedModel && formData.isFinalConfirmed) {
      const storageKey = `otocv_draft_${user?.id || 'guest'}`;
      const draftPayload = {
        formData,
        savedStep: currentStep,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(storageKey, JSON.stringify(draftPayload));
    }
  }, [formData, currentStep]);

  // Profil Paketini Çeken Servis
  const fetchUserProfilePackage = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_tier, listing_quota')
        .eq('id', user.id)
        .single();

      if (data && !error) {
        setUserPackage({
          tierName: data.subscription_tier || 'Standart Paket',
          remainingQuota: data.listing_quota ?? 1,
          totalQuota: data.listing_quota ?? 1
        });
      }
    } catch (err) {
      console.log("Profil paket verisi varsayılan değerde tutuldu:", err);
    }
  };

  // =========================================================================
  // 3. BLOK: ADIM GEÇİŞ YÖNETİMİ VE RENDER KATMANI
  // =========================================================================
  
  const handleNextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, 3));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F2F4F7] text-slate-900 select-none font-sans antialiased relative">
      
      {/* ---------------------------------------------------------------------
          3.1 TOP LOGO VE GERİ BARI
         --------------------------------------------------------------------- */}
      <div className="relative z-20 bg-white border-b border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div 
            onClick={onBack} 
            className="flex items-center gap-2 cursor-pointer select-none group py-1"
          >
            <span className="text-xl font-black tracking-tight text-slate-900 font-display group-hover:text-indigo-600 transition-colors">
              OTO.CV
            </span>
          </div>

          {/* SİHİRBAZ ADIM SAYACI ROZETİ */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3 py-1 rounded-full">
            <span className="text-xs font-semibold text-slate-500">Adım {currentStep} / 3</span>
            <div className="flex gap-1">
              {[1, 2, 3].map(step => (
                <div 
                  key={step} 
                  className={`w-2 h-2 rounded-full transition-colors ${
                    step <= currentStep ? 'bg-rose-600' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------
          3.2 AKTİF ADIM BİLEŞENİ
         --------------------------------------------------------------------- */}
      {currentStep === 1 && (
        <Step1VehicleAndPhotos
          formData={formData}
          updateFormData={updateFormData}
          userPackage={userPackage}
          onNext={handleNextStep}
        />
      )}

      {currentStep === 2 && (
        <Step2ListingDetails
          formData={formData}
          updateFormData={updateFormData}
          onNext={handleNextStep}
          onBack={handlePrevStep}
        />
      )}

      {currentStep === 3 && (
        <Step3PreviewAndPublish
          formData={formData}
          onBack={handlePrevStep}
          onSuccess={onSuccess}
        />
      )}

      {/* =========================================================================
          🚀 4. BLOK: YARIM KALAN İLAN (DRAFT RECOVERY) MODAL BİLEŞENİ
          İşlev: Inter UI standartlarında tipografik hiyerarşi, ferahlatılmış buton metinleri,
                 yüksek okuma konforu ve Oto.CV kurumsal indigo/mavi renk paleti.
         ========================================================================= */}
      {showDraftModal && draftData && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-6 relative border border-slate-100 font-sans antialiased">
            
            {/* KAPAT X BUTONU */}
            <button 
              onClick={handleDiscardDraft}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center font-semibold text-lg cursor-pointer"
            >
              ✕
            </button>

            {/* MODAL BAŞLIK VE SAAT İKONU */}
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-800 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              {/* TİPOGRAFİK HİYERARŞİ: BOLD BAŞLIK & SOFT ALT METİN */}
              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                  Yarım kalan ilanınız var
                </h3>
                <p className="text-sm text-slate-500 font-normal leading-relaxed">
                  İlan vermeye kaldığınız yerden devam etmek ister misiniz?
                </p>
              </div>
            </div>

            {/* 🥪 SANDVİÇ YAPILI ARAÇ BİLGİ KARTI */}
            <div className="bg-slate-100/80 p-3 sm:p-3.5 rounded-xl">
              <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 flex items-center gap-3.5 shadow-2xs">
                
                {/* 🚗 BİNEK ARAÇ SVG İKONU */}
                <div className="w-11 h-11 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 17a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm8 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm-11-2 1.6-4.8A2 2 0 0 1 8.5 9h7c.8 0 1.6.4 2 1.2L19 15M3 15h18v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2Z" />
                  </svg>
                </div>

                <div className="space-y-0.5 overflow-hidden">
                  <h4 className="text-sm font-bold text-slate-900 tracking-tight truncate">
                    {draftData.formData?.selectedBrand?.name} {draftData.formData?.selectedSeries?.name} {draftData.formData?.selectedModel?.name} {draftData.formData?.selectedPackage?.name}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    {draftData.formData?.selectedYear} • {draftData.formData?.selectedFuel}
                  </p>
                </div>
              </div>
            </div>

            {/* 🚀 FERAH VE BELİRGİN TİPOGRAFİLİ WEB BUTONLARI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="w-full bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold text-sm py-3.5 px-4 rounded-md transition-all cursor-pointer text-center tracking-normal"
              >
                Yeni bir ilan ver
              </button>
              
              <button
                type="button"
                onClick={handleResumeDraft}
                className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-sm py-3.5 px-4 rounded-md transition-all cursor-pointer text-center shadow-sm tracking-normal"
              >
                Bu ilanla devam et
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}