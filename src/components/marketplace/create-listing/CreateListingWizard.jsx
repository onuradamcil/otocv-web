// =========================================================================
// OTO-CV İLAN & GARAJ SİHİRBAZI: MİMARİ ORKESTRA ŞEFİ (CreateListingWizard.jsx)
// İşlev: Step 1-4 Parçalı Persistent DB Kaydı ('vehicle_drafts'), Storage Görsel
//        Yükleyici, Katı Validasyonlar ve Konsol Hata Sensörlü Recovery Modal.
// =========================================================================

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import Step1VehicleAndPhotos from './Step1VehicleAndPhotos';
import Step2ListingDetails from './Step2ListingDetails';
import Step3MedicalHistory from './Step3MedicalHistory';
import Step4PreviewAndPublish from './Step4PreviewAndPublish';

export default function CreateListingWizard({ onBack, onSuccess, user }) {
  // =========================================================================
  // 1. BLOK: AKILLI STEP TAKİBİ VE GLOBAL FORM STATE'İ (4 ADIMLI MASTER)
  // =========================================================================
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);

  const [userPackage, setUserPackage] = useState({
    tierName: 'Standart Paket',
    remainingQuota: 1,
    totalQuota: 1
  });

  const [draftData, setDraftData] = useState(null);
  const [showDraftModal, setShowDraftModal] = useState(false);

  // TÜM İLAN SİHİRBAZININ MERKEZİ VERİ HAFIZASI (VARSAYILANLAR SEÇİNİZ / BOŞ SIFIRLANDI)
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
    plate: '',
    plate_number: '',
    mileage: '',
    km: '',
    traffic_insurance_end_date: '',
    kasko_end_date: '',
    inspection_end_date: '',
    registration_file: null,

    // 2. Adım Verileri (VARSAYILANLAR TEMİZLENDİ -> SEÇİNİZ)
    title: '',
    transmission: '',     // 'Otomatik' -> Boş (Seçiniz)
    bodyType: '',         // 'Sedan' -> Boş (Seçiniz)
    color: null,          // Renk Seçiniz
    vehicleStatus: '',    // 'İkinci El' -> Boş (Seçiniz)
    warranty: '',         // Boş
    swap: '',             // Boş
    city: '',             // 'İstanbul' -> Boş (İl Seçiniz)
    district: '',         // 'Kadıköy' -> Boş (İlçe Seçiniz)
    tramerStatus: '',     // 'Tramer Yok' -> Boş
    tramerAmount: '',
    isFullyOriginal: false,
    damageReport: {},
    selectedFeatures: [],
    description: '',

    // 3. Adım Verileri
    service_records: [],

    // 4. Adım Verileri
    isLegalConfirmed: false,
    isVinConfirmed: false,
    isPublicShowcase: true
  });

  const updateFormData = (fields) => {
    setFormData(prev => ({ ...prev, ...fields }));
  };

  const step2Ref = useRef(null);
  const step3Ref = useRef(null);

  // =========================================================================
  // 📸 2. BLOK: SUPABASE STORAGE FOTOĞRAF YÜKLEME MOTORU (ZIRHLI BLOB DESTEKLİ)
  // =========================================================================
  const uploadPhotosToSupabaseStorage = async (photosToUpload) => {
    if (!photosToUpload || photosToUpload.length === 0) return [];

    const uploadedUrls = [];
    const activePlate = (formData.plate || formData.plate_number || 'drafts').trim();
    // Klasör adındaki özel karakterleri temizleme
    const folderName = activePlate.replace(/[^a-zA-Z0-9]/g, '_') || 'drafts';

    for (let i = 0; i < photosToUpload.length; i++) {
      const photoItem = photosToUpload[i];

      // Eğer zaten Supabase CDN veya harici kalıcı HTTPS linkiyse tekrar yükleme
      if (typeof photoItem === 'string' && photoItem.startsWith('http') && !photoItem.includes('localhost') && !photoItem.startsWith('blob:')) {
        uploadedUrls.push(photoItem);
        continue;
      }

      let fileObj = null;

      // 1. Doğrudan File veya Blob objesi ise
      if (photoItem instanceof File || photoItem instanceof Blob) {
        fileObj = photoItem;
      } else if (photoItem?.file && (photoItem.file instanceof File || photoItem.file instanceof Blob)) {
        fileObj = photoItem.file;
      } else {
        // 2. 'blob:http://...' string'i veya { preview: 'blob:...' } ise FETCH ile binary Blob'a dönüştür
        const blobUrl = typeof photoItem === 'string' ? photoItem : photoItem?.preview;
        if (blobUrl && typeof blobUrl === 'string' && blobUrl.startsWith('blob:')) {
          try {
            const blobRes = await fetch(blobUrl);
            fileObj = await blobRes.blob();
          } catch (e) {
            console.error('Blob URL binary veriye dönüştürülemedi:', e);
          }
        }
      }

      if (!fileObj) {
        if (typeof photoItem === 'string') uploadedUrls.push(photoItem);
        else if (photoItem?.preview) uploadedUrls.push(photoItem.preview);
        continue;
      }

      try {
        const fileExt = fileObj.type ? (fileObj.type.split('/')[1] || 'jpg') : 'jpg';
        const fileName = `${Date.now()}_${i}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${folderName}/${fileName}`;

        // 📌 SUPABASE 'vehicle-images' BUCKET YÜKLEMESİ
        const { error: uploadError } = await supabase.storage
          .from('vehicle-images')
          .upload(filePath, fileObj, { 
            upsert: true,
            contentType: fileObj.type || 'image/jpeg'
          });

        if (uploadError) {
          console.error(`🔴 Supabase Storage Yükleme Hatası (${filePath}):`, uploadError.message);
          uploadedUrls.push(typeof photoItem === 'string' ? photoItem : (photoItem?.preview || URL.createObjectURL(fileObj)));
          continue;
        }

        const { data: publicUrlData } = supabase.storage
          .from('vehicle-images')
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          console.log(`🟢 Fotoğraf Supabase Storage'a yüklendi (${i + 1}/${photosToUpload.length}):`, publicUrlData.publicUrl);
          uploadedUrls.push(publicUrlData.publicUrl);
        }
      } catch (err) {
        console.error('Fotoğraf yükleme hatası:', err);
        uploadedUrls.push(typeof photoItem === 'string' ? photoItem : (photoItem?.preview || '/placeholder-car.jpg'));
      }
    }

    return uploadedUrls;
  };

  // =========================================================================
  // 📊 3. BLOK: KÜRESEL İLERLEME SENSÖRÜ (4 ADIM BAZLI CANLI PROGRESS)
  // =========================================================================

  const calculateGlobalProgress = () => {
    let progress = 0;

    const hasPhotos = Array.isArray(formData.photos) && formData.photos.length > 0;
    const activePlate = formData.plate || formData.plate_number;
    const activeKm = formData.mileage || formData.km;

    const step1Fields = [
      hasPhotos,
      !!formData.selectedCategory,
      !!formData.selectedYear,
      !!formData.selectedFuel,
      !!formData.selectedBrand,
      !!formData.selectedSeries,
      !!formData.selectedModel,
      !!formData.selectedPackage,
      !!formData.isFinalConfirmed,
      !!activePlate && activePlate.trim().length >= 7,
      !!activeKm && activeKm.toString().trim().length > 0,
      !!formData.traffic_insurance_end_date && formData.traffic_insurance_end_date.length === 10,
      !!formData.inspection_end_date && formData.inspection_end_date.length === 10
    ];
    
    const filledStep1 = step1Fields.filter(Boolean).length;
    progress += (filledStep1 / step1Fields.length) * 25;

    if (currentStep >= 2) {
      const descText = (formData.description || '').replace(/<[^>]*>/g, '').trim();
      const step2Validations = [
        !!formData.title && formData.title.trim() !== '',
        !!formData.transmission && formData.transmission !== 'Seçiniz' && formData.transmission !== '',
        !!formData.bodyType && formData.bodyType !== 'Seçiniz' && formData.bodyType !== '',
        !!formData.vehicleStatus && formData.vehicleStatus !== 'Seçiniz' && formData.vehicleStatus !== '',
        !!formData.city && formData.city !== 'İl Seçiniz' && formData.city !== '',
        !!formData.district && formData.district !== 'İlçe Seçiniz' && formData.district !== '',
        descText.length >= 20
      ];
      const filledStep2 = step2Validations.filter(Boolean).length;
      progress += (filledStep2 / step2Validations.length) * 25;
    }

    if (currentStep >= 3) progress += 25;
    if (currentStep === 4) progress += 25;

    return Math.min(Math.round(progress), 100);
  };

  const globalProgress = calculateGlobalProgress();

  // =========================================================================
  // 💾 4. BLOK: 'vehicle_drafts' TABLOSUNA BUTON BAZLI DRAFT KAYDI
  // =========================================================================
  
  const hasCheckedDraftRef = useRef(false);

  useEffect(() => {
    fetchUserProfilePackage();

    if (!hasCheckedDraftRef.current) {
      hasCheckedDraftRef.current = true;
      checkExistingDraft();
    }
  }, [user]);

  const checkExistingDraft = async () => {
    try {
      if (user?.id) {
        const { data: dbDraft, error } = await supabase
          .from('vehicle_drafts')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) console.error("Supabase taslak okuma uyarısı:", error.message);

        if (dbDraft && dbDraft.form_data && dbDraft.form_data.selectedBrand) {
          setDraftData({
            formData: dbDraft.form_data,
            savedStep: dbDraft.current_step || 1
          });
          setShowDraftModal(true);
          return;
        }
      }

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

  // YALNIZCA DEVAM ET / GERİ DÖN BUTONLARI TIKLANDIĞINDA ÇALIŞAN DB KAYDI
  const saveDraftToDatabase = async (updatedStep, updatedFormData) => {
    const dataToSave = updatedFormData || formData;
    const stepToSave = updatedStep || currentStep;

    if (!dataToSave.selectedBrand) return;

    // Local Storage yedekleme
    const storageKey = `otocv_draft_${user?.id || 'guest'}`;
    const payload = {
      formData: dataToSave,
      savedStep: stepToSave,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));

    // Supabase 'vehicle_drafts' Tablosuna Kayıt
    if (user?.id) {
      try {
        const dbPayload = {
          user_id: user.id,
          current_step: stepToSave,
          form_data: dataToSave
        };

        const { error } = await supabase
          .from('vehicle_drafts')
          .upsert(dbPayload, { onConflict: 'user_id' });

        if (error) {
          console.error("🔴 Supabase 'vehicle_drafts' Kayıt Hatası:", error.message);
        } else {
          console.log(`🟢 Supabase 'vehicle_drafts' Adım ${stepToSave} Başarıyla Kaydedildi!`);
        }
      } catch (err) {
        console.error("Supabase draft kaydedilemedi:", err);
      }
    } else {
      console.warn("⚠️ Oturum açmış kullanıcı ID'si bulunamadı. Taslak sadece localStorage'a kaydedildi.");
    }
  };

  const handleResumeDraft = () => {
    if (!draftData) return;
    setFormData(draftData.formData);
    setCurrentStep(draftData.savedStep || 1);
    setShowDraftModal(false);
  };

  const handleDiscardDraft = async () => {
    const storageKey = `otocv_draft_${user?.id || 'guest'}`;
    localStorage.removeItem(storageKey);

    if (user?.id) {
      try {
        await supabase
          .from('vehicle_drafts')
          .delete()
          .eq('user_id', user.id);
      } catch (err) {
        console.error("Supabase draft silinemedi:", err);
      }
    }

    setDraftData(null);
    setShowDraftModal(false);
  };

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
  // 5. BLOK: MERKEZİ ADIM GEÇİŞ VE KATI VALIDASYON TETİĞİ
  // =========================================================================
  
  const checkIsStep2ValidDirectly = () => {
    const descText = (formData.description || '').replace(/<[^>]*>/g, '').trim();
    return (
      !!formData.title && formData.title.trim() !== '' &&
      !!formData.transmission && formData.transmission !== 'Seçiniz' && formData.transmission !== '' &&
      !!formData.bodyType && formData.bodyType !== 'Seçiniz' && formData.bodyType !== '' &&
      !!formData.vehicleStatus && formData.vehicleStatus !== 'Seçiniz' && formData.vehicleStatus !== '' &&
      !!formData.city && formData.city !== 'İl Seçiniz' && formData.city !== '' &&
      !!formData.district && formData.district !== 'İlçe Seçiniz' && formData.district !== '' &&
      descText.length >= 20
    );
  };

  const handleNextStep = async () => {
    // 📌 STEP 1 -> STEP 2 GEÇİŞİ (STORAGE YÜKLEMESİ BURADA TETİKLENİR)
    if (currentStep === 1) {
      if (!isStep1Valid) return;

      setIsUploadingPhotos(true);
      try {
        const cdnPhotoUrls = await uploadPhotosToSupabaseStorage(formData.photos);
        
        const updatedStep1Data = {
          ...formData,
          photos: cdnPhotoUrls.length > 0 ? cdnPhotoUrls : formData.photos
        };

        setFormData(updatedStep1Data);
        await saveDraftToDatabase(2, updatedStep1Data);

        setCurrentStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        console.error("Step 1 geçiş hatası:", err);
      } finally {
        setIsUploadingPhotos(false);
      }
      return;
    }

    // 📌 STEP 2 -> STEP 3 GEÇİŞİ
    if (currentStep === 2) {
      let isStep2Valid = false;
      if (step2Ref.current?.handleNextWithValidation) {
        isStep2Valid = step2Ref.current.handleNextWithValidation();
      } else {
        isStep2Valid = checkIsStep2ValidDirectly();
      }

      if (!isStep2Valid) return;

      await saveDraftToDatabase(3, formData);
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 📌 STEP 3 -> STEP 4 (ÖN İZLEME) GEÇİŞİ
    if (currentStep === 3) {
      let isStep3Valid = true;
      if (step3Ref.current?.handleNextWithValidation) {
        isStep3Valid = step3Ref.current.handleNextWithValidation();
      }
      if (!isStep3Valid) return;

      await saveDraftToDatabase(4, formData);
      setCurrentStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
  };

  const handlePrevStep = () => {
    const prevStep = Math.max(currentStep - 1, 1);
    setCurrentStep(prevStep);
    saveDraftToDatabase(prevStep, formData);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 🎯 VALIDASYON ŞARTLARI
  const activePlate = formData.plate || formData.plate_number;
  const activeKm = formData.mileage || formData.km;
  const hasPhotos = Array.isArray(formData.photos) && formData.photos.length > 0;

  const isStep1Valid = hasPhotos &&
                       !!formData.selectedBrand && 
                       !!formData.selectedSeries && 
                       !!formData.selectedModel && 
                       !!formData.selectedPackage && 
                       !!formData.isFinalConfirmed &&
                       !!activePlate && activePlate.trim().length >= 7 &&
                       !!activeKm && activeKm.toString().trim().length > 0 &&
                       !!formData.traffic_insurance_end_date && formData.traffic_insurance_end_date.length === 10 &&
                       !!formData.inspection_end_date && formData.inspection_end_date.length === 10;

  const getCleanText = (str) => {
    if (!str) return '';
    return str
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const descText = getCleanText(formData.description);
  const isStep2Valid = 
    !!formData.title && formData.title.trim() !== '' &&
    !!formData.transmission && formData.transmission !== 'Seçiniz' && formData.transmission !== '' &&
    !!formData.bodyType && formData.bodyType !== 'Seçiniz' && formData.bodyType !== '' &&
    !!formData.vehicleStatus && formData.vehicleStatus !== 'Seçiniz' && formData.vehicleStatus !== '' &&
    !!formData.city && formData.city !== 'İl Seçiniz' && formData.city !== '' &&
    !!formData.district && formData.district !== 'İlçe Seçiniz' && formData.district !== '' &&
    descText.length >= 20;

  const activeRecords = formData.service_records || [];
  const isStep3Valid = activeRecords.length === 0 || activeRecords.every(rec => {
    const isEntirelyEmpty = !rec.shop_name?.trim() && !rec.km && !rec.cost && !rec.summary && !rec.service_date;
    if (isEntirelyEmpty) return true;
    return !!rec.service_type && rec.shop_name?.trim().length > 0 && !!rec.km && !!rec.cost && rec.summary?.trim().length > 0 && rec.service_date?.trim().length === 10 && !rec.date_error;
  });

  return (
    <div className="min-h-screen bg-[#F2F4F7] text-slate-900 select-none font-sans antialiased relative">
      
      {/* TOP HEADER BARI */}
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

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3 py-1 rounded-full">
            <span className="text-xs font-semibold text-slate-500">Adım {currentStep} / 4</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map(step => (
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

      {/* MERKEZİ YAPIŞKAN STICKY BARI */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
              {currentStep === 1 && "Garaja Araç Ekle & Tescil"}
              {currentStep === 2 && "Araç Detayları & Ekspertiz"}
              {currentStep === 3 && "Servis & Bakım Geçmişi"}
              {currentStep === 4 && "OTO.CV Karne Ön İzleme & Tescil"}
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              <span className="text-rose-600 font-bold">*</span> ile işaretli zorunlu alanları doldurarak dijital karnenizi oluşturun.
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {currentStep < 4 && (
              <button 
                disabled={
                  isUploadingPhotos ||
                  (currentStep === 1 && !isStep1Valid) ||
                  (currentStep === 2 && !isStep2Valid) ||
                  (currentStep === 3 && !isStep3Valid)
                }
                onClick={handleNextStep}
                className="w-64 sm:w-72 bg-rose-500 hover:bg-rose-600 disabled:bg-[#FFF5F7] disabled:text-[#FFC2CB] text-white font-extrabold text-xs sm:text-sm py-2.5 sm:py-3 px-5 rounded-md transition-all shadow-xs disabled:cursor-not-allowed text-center cursor-pointer active:scale-98 flex items-center justify-center gap-2"
              >
                {isUploadingPhotos ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Görseller Yükleniyor...</span>
                  </>
                ) : (
                  <>
                    {currentStep === 1 && "Devam Et: Araç Detayları ›"}
                    {currentStep === 2 && "Devam Et: Servis Geçmişi ›"}
                    {currentStep === 3 && "Devam Et: Ön İzleme & Tescil ›"}
                  </>
                )}
              </button>
            )}

            <div className="w-64 sm:w-72 h-3 bg-slate-200/80 rounded-sm overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 rounded-sm transition-all duration-300"
                style={{ width: `${globalProgress}%` }}
              />
            </div>
          </div>

        </div>
      </div>

      {/* ADIM BİLEŞENLERİ */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
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
            ref={step2Ref}
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNextStep}
            onBack={handlePrevStep}
          />
        )}

        {currentStep === 3 && (
          <Step3MedicalHistory
            ref={step3Ref}
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNextStep}
            onBack={handlePrevStep}
            selectedYear={formData.selectedYear}
          />
        )}

        {currentStep === 4 && (
          <Step4PreviewAndPublish
            formData={formData}
            updateFormData={updateFormData}
            onBack={handlePrevStep}
            user={user}
            onSuccess={async () => {
              await handleDiscardDraft();
              if (onSuccess) onSuccess();
            }}
          />
        )}
      </div>

      {/* YARIM KALAN İLAN (DRAFT RECOVERY) MODAL BİLEŞENİ */}
      {showDraftModal && draftData && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-6 relative border border-slate-100 font-sans antialiased">
            
            <button 
              onClick={handleDiscardDraft}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center font-semibold text-lg cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-3">
              <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-800 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                  Yarım kalan kaydınız var
                </h3>
                <p className="text-sm text-slate-500 font-normal leading-relaxed">
                  Araç karnenizi oluşturmaya kaldığınız yerden devam etmek ister misiniz?
                </p>
              </div>
            </div>

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="w-full bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold text-sm py-3.5 px-4 rounded-md transition-all cursor-pointer text-center"
              >
                Sıfırdan Başla
              </button>
              
              <button
                type="button"
                onClick={handleResumeDraft}
                className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-sm py-3.5 px-4 rounded-md transition-all cursor-pointer text-center shadow-sm"
              >
                Bu kayıtla devam et
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}