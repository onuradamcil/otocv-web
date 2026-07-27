// =========================================================================
// OTO-CV İLAN VERME SİHİRBAZI: MİMARİ ORKESTRA ŞEFİ (CreateListingWizard.jsx)
// İşlev: Adım takibi (Step 1-2-3), Supabase JSONB Hibrit Draft (Taslak)
//        Yönetimi, useRef Tekil Modal Tetikleyicisi ve İlan Yayınlama Flow'u.
// =========================================================================

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import Step1VehicleAndPhotos from './Step1VehicleAndPhotos';
import Step2ListingDetails from './Step2ListingDetails';
import Step3PreviewAndPublish from './Step3PreviewAndPublish';

export default function CreateListingWizard({ onBack, onSuccess, user }) {
  // =========================================================================
  // 1. BLOK: AKILLI STEP TAKİBİ VE GLOBAL FORM STATE'İ
  // =========================================================================
  
  const [currentStep, setCurrentStep] = useState(1);

  const [userPackage, setUserPackage] = useState({
    tierName: 'Standart Paket',
    remainingQuota: 1,
    totalQuota: 1
  });

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

    // 2. Adım Verileri (Geliştirme Aşamasındaki Dinamik Yapı)
    title: '',
    price: '',
    mileage: '',
    transmission: 'Otomatik',
    bodyType: 'Sedan',
    color: null,
    vehicleStatus: 'İkinci El',
    plate: '',
    warranty: 'Hayır',
    swap: 'Hayır',
    city: 'İstanbul',
    district: 'Kadıköy',
    hasTramer: 'Yok',
    tramerAmount: '',
    selectedFeatures: [],
    description: ''
  });

  const updateFormData = (fields) => {
    setFormData(prev => ({ ...prev, ...fields }));
  };

  // =========================================================================
  // 2. BLOK: HİBRİT TASLAK (DRAFT) SENSÖRÜ VE SADECE 1 KERE ÇALIŞAN KİLİT
  // =========================================================================
  
  // 🚀 Sekmeler arası geçişlerde modalın sürekli fırlamasını engelleyen mühür
  const hasCheckedDraftRef = useRef(false);

  useEffect(() => {
    fetchUserProfilePackage();

    // Sadece sayfa ilk yüklendiğinde 1 defa çalışır
    if (!hasCheckedDraftRef.current) {
      hasCheckedDraftRef.current = true;
      checkExistingDraft();
    }
  }, [user]);

  // Supabase & LocalStorage Çift Katmanlı Taslak Kontrolü
  const checkExistingDraft = async () => {
    try {
      // A) Öncelik: Giriş Yapmış Kullanıcı İçin Supabase Taslak Sorgusu
      if (user?.id) {
        const { data: dbDraft, error } = await supabase
          .from('listing_drafts')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (dbDraft && dbDraft.form_data && dbDraft.form_data.selectedBrand) {
          setDraftData({
            formData: dbDraft.form_data,
            savedStep: dbDraft.current_step || 1
          });
          setShowDraftModal(true);
          return;
        }
      }

      // B) Fallback: Misafir veya Offline Kullanıcı İçin LocalStorage Sorgusu
      const storageKey = `otocv_draft_${user?.id || 'guest'}`;
      const savedDraft = localStorage.getItem(storageKey);
      if (savedDraft) {
        const parsedDraft = JSON.parse(savedDraft);
        if (parsedDraft?.formData?.selectedBrand) {
          setDraftData(parsedDraft);
          setShowDraftModal(true);
        }
      }
    } catch (err) {
      console.error("Taslak verisi kontrol edilirken hata oluştu:", err);
    }
  };

  // 🚀 SUPABASE & LOCALSTORAGE OTOMATİK SAVE FONKSİYONU (UPSERT)
  const saveDraftToDatabase = async (updatedStep, updatedFormData) => {
    const dataToSave = updatedFormData || formData;
    const stepToSave = updatedStep || currentStep;

    // Minimum kayıt şartı: En azından bir marka seçilmiş olmalı
    if (!dataToSave.selectedBrand) return;

    // 1. LocalStorage Güncelle
    const storageKey = `otocv_draft_${user?.id || 'guest'}`;
    const payload = {
      formData: dataToSave,
      savedStep: stepToSave,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));

    // 2. Supabase `listing_drafts` Tablosuna Kaydet (Giriş Yapmışsa)
    if (user?.id) {
      try {
        await supabase
          .from('listing_drafts')
          .upsert({
            user_id: user.id,
            current_step: stepToSave,
            form_data: dataToSave,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
      } catch (err) {
        console.error("Supabase draft kaydedilemedi:", err);
      }
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
  const handleDiscardDraft = async () => {
    // LocalStorage temizle
    const storageKey = `otocv_draft_${user?.id || 'guest'}`;
    localStorage.removeItem(storageKey);

    // Supabase temizle
    if (user?.id) {
      try {
        await supabase
          .from('listing_drafts')
          .delete()
          .eq('user_id', user.id);
      } catch (err) {
        console.error("Supabase draft silinemedi:", err);
      }
    }

    setDraftData(null);
    setShowDraftModal(false);
  };

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
  // 3. BLOK: ADIM GEÇİŞ YÖNETİMİ VE OTOMATİK DRAFT SENSÖRÜ
  // =========================================================================
  
  const handleNextStep = () => {
    const nextStep = Math.min(currentStep + 1, 3);
    setCurrentStep(nextStep);
    // 🚀 Her adıma geçildiğinde Supabase'e sessizce kaydet
    saveDraftToDatabase(nextStep, formData);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    const prevStep = Math.max(currentStep - 1, 1);
    setCurrentStep(prevStep);
    saveDraftToDatabase(prevStep, formData);
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
                    step <= currentStep ? 'bg-indigo-600' : 'bg-slate-200'
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
          onSuccess={async () => {
            // İlan başarıyla yayınlandığında draft'ı temizliyoruz
            await handleDiscardDraft();
            if (onSuccess) onSuccess();
          }}
        />
      )}

      {/* =========================================================================
          🚀 4. BLOK: YARIM KALAN İLAN (DRAFT RECOVERY) MODAL BİLEŞENİ
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

            {/* BOTUNLAR */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="w-full bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold text-sm py-3.5 px-4 rounded-md transition-all cursor-pointer text-center"
              >
                Yeni bir ilan ver
              </button>
              
              <button
                type="button"
                onClick={handleResumeDraft}
                className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-sm py-3.5 px-4 rounded-md transition-all cursor-pointer text-center shadow-sm"
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