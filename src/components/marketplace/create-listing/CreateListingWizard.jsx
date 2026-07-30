// =========================================================================
// OTO-CV İLAN & GARAJ SİHİRBAZI: MİMARİ ORKESTRA ŞEFİ (CreateListingWizard.jsx)
// İşlev: Step 1-4 Persistent DB Kaydı, Storage Görsel Yükleyici, Katı Validasyonlar,
//        Zırhlı Storage Purge (RLS & JSON Parse Korumalı), Boşluksuz Mükerrer Plaka
//        Modalı (TR Plaka Görselli), Storage Purge ve Global Loader.
// =========================================================================

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import Step1VehicleAndPhotos from './Step1VehicleAndPhotos';
import Step2ListingDetails from './Step2ListingDetails';
import Step3MedicalHistory from './Step3MedicalHistory';
import Step4PreviewAndPublish from './Step4PreviewAndPublish';
import GlobalStepLoader from '../../common/GlobalStepLoader';

export default function CreateListingWizard({ onBack, onSuccess, user }) {
  // =========================================================================
  // 1. BLOK: AKILLI STEP TAKİBİ VE GLOBAL FORM STATE'İ (4 ADIMLI MASTER)
  // =========================================================================
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);

  // GLOBAL STEP LOADER STATE'İ
  const [stepLoader, setStepLoader] = useState({
    isLoading: false,
    title: '',
    subtitle: ''
  });

  const [userPackage, setUserPackage] = useState({
    tierName: 'Standart Paket',
    remainingQuota: 1,
    totalQuota: 1
  });

  const [draftData, setDraftData] = useState(null);
  const [showDraftModal, setShowDraftModal] = useState(false);

  // 🛑 MÜKERRER PLAKA MODAL STATE'LERİ
  const [showDuplicatePlateModal, setShowDuplicatePlateModal] = useState(false);
  const [duplicatePlateNumber, setDuplicatePlateNumber] = useState('');

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
  // 🧹 SUPABASE STORAGE ÖLÜ DOSYA SÜPÜRÜCÜ MOTORU (STORAGE PURGE)
  // =========================================================================
  const deleteStorageFolder = async (plateToClean) => {
    if (!plateToClean) {
      console.warn("⚠️ Silinecek plaka bulunamadı, Storage temizliği atlandı.");
      return;
    }

    const folderName = plateToClean.replace(/[^a-zA-Z0-9]/g, '_');
    if (!folderName || folderName === 'drafts') return;

    console.log(`🔍 Storage Temizlik İsteği Başlatıldı: Klasör -> '${folderName}'`);

    try {
      // 1. Klasördeki tüm dosyaları listele
      const { data: fileList, error: listError } = await supabase.storage
        .from('vehicle-images')
        .list(folderName);

      if (listError) {
        console.error(`🔴 Storage klasör listeleme hatası (${folderName}):`, listError.message);
        return;
      }

      if (fileList && fileList.length > 0) {
        const pathsToDelete = fileList.map(file => `${folderName}/${file.name}`);
        
        // 2. Dosyaları sil
        const { error: deleteError } = await supabase.storage
          .from('vehicle-images')
          .remove(pathsToDelete);

        if (deleteError) {
          console.error(`🔴 Storage dosyaları silinirken RLS veya İzin Hatası:`, deleteError.message);
        } else {
          console.log(`🟢 Storage Temizlendi: '${folderName}' klasöründeki ${pathsToDelete.length} ölü görsel silindi!`);
        }
      } else {
        console.log(`ℹ️ '${folderName}' klasöründe silinecek görsel bulunamadı.`);
      }
    } catch (err) {
      console.error('Storage purge hatası:', err);
    }
  };

  // =========================================================================
  // 📸 2. BLOK: SUPABASE STORAGE FOTOĞRAF YÜKLEME MOTORU (ZIRHLI BLOB DESTEKLİ)
  // =========================================================================
  const uploadPhotosToSupabaseStorage = async (photosToUpload) => {
    if (!photosToUpload || photosToUpload.length === 0) return [];

    const uploadedUrls = [];
    const activePlate = (formData.plate || formData.plate_number || 'drafts').trim();
    const folderName = activePlate.replace(/[^a-zA-Z0-9]/g, '_') || 'drafts';

    for (let i = 0; i < photosToUpload.length; i++) {
      const photoItem = photosToUpload[i];

      if (typeof photoItem === 'string' && photoItem.startsWith('http') && !photoItem.includes('localhost') && !photoItem.startsWith('blob:')) {
        uploadedUrls.push(photoItem);
        continue;
      }

      let fileObj = null;

      if (photoItem instanceof File || photoItem instanceof Blob) {
        fileObj = photoItem;
      } else if (photoItem?.file && (photoItem.file instanceof File || photoItem.file instanceof Blob)) {
        fileObj = photoItem.file;
      } else {
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

        if (dbDraft && dbDraft.form_data) {
          let parsedFormData = dbDraft.form_data;
          if (typeof parsedFormData === 'string') {
            try { parsedFormData = JSON.parse(parsedFormData); } catch (e) {}
          }

          if (parsedFormData?.selectedBrand) {
            setDraftData({
              formData: parsedFormData,
              savedStep: dbDraft.current_step || 1
            });
            setShowDraftModal(true);
            return;
          }
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

  const saveDraftToDatabase = async (updatedStep, updatedFormData) => {
    const dataToSave = updatedFormData || formData;
    const stepToSave = updatedStep || currentStep;

    if (!dataToSave.selectedBrand) return;

    const storageKey = `otocv_draft_${user?.id || 'guest'}`;
    const payload = {
      formData: dataToSave,
      savedStep: stepToSave,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));

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

  const handleDiscardDraft = async (deleteStoragePhotos = true) => {
    const storageKey = `otocv_draft_${user?.id || 'guest'}`;
    localStorage.removeItem(storageKey);

    let rawFormData = draftData?.formData || formData;
    if (typeof rawFormData === 'string') {
      try { rawFormData = JSON.parse(rawFormData); } catch (e) {}
    }

    const targetPlate = rawFormData?.plate || rawFormData?.plate_number || formData.plate || formData.plate_number;

    if (deleteStoragePhotos && targetPlate) {
      await deleteStorageFolder(targetPlate);
    }

    if (user?.id) {
      try {
        await supabase
          .from('vehicle_drafts')
          .delete()
          .eq('user_id', user.id);
        console.log("🧹 'vehicle_drafts' tablosundaki geçici taslak silindi.");
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
  // 5. BLOK: MERKEZİ ADIM GEÇİŞİ VE GLOBAL LOADER TETİKLEYİCİSİ
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
    // 📌 STEP 1 -> STEP 2 GEÇİŞİ (ZIRHLI & BOŞLUKSUZ MÜKERRER PLAKA SENSÖRÜ)
    if (currentStep === 1) {
      if (!isStep1Valid) return;

      const rawPlate = (formData.plate || formData.plate_number || '').trim();
      const cleanInputPlate = rawPlate.replace(/\s+/g, '').toUpperCase();

      // 1. AŞAMA: OTO-CV SİSTEMİNDE (vehicles TABLOSUNDA) MÜKERRER PLAKA SORGUSU
      setStepLoader({
        isLoading: true,
        title: 'Plaka Tescili Sorgulanıyor',
        subtitle: 'Aracın OTO-CV veritabanındaki dijital sicil kaydı kontrol ediliyor...'
      });

      try {
        const { data: allVehicles, error: plateCheckError } = await supabase
          .from('vehicles')
          .select('plate_number');

        if (plateCheckError) {
          console.error("🔴 Plaka sorgulama veritabanı hatası:", plateCheckError.message);
          setStepLoader({ isLoading: false, title: '', subtitle: '' });
          return;
        }

        // Hem veritabanındaki hem girdiği plakadaki TÜM BOŞLUKLARI TEMİZLEYİP KARŞILAŞTIR
        const duplicateVehicle = (allVehicles || []).find(v => {
          const dbPlateClean = (v.plate_number || '').replace(/\s+/g, '').toUpperCase();
          return dbPlateClean === cleanInputPlate;
        });

        // 🛑 EĞER ARAÇ 'vehicles' TABLOSUNDA ZATEN VARSA İŞLEMİ ANINDA DURDUR!
        if (duplicateVehicle) {
          setStepLoader({ isLoading: false, title: '', subtitle: '' }); // LOADER ANINDA KAPANIR
          setDuplicatePlateNumber(rawPlate); // Plakayı kaydet
          setShowDuplicatePlateModal(true);  // Özel Modalı Aç!
          return; // Fotoğraf yüklemesini ve Step 2'ye geçişi KESİNLİKLE BLOKE ET!
        }
      } catch (err) {
        console.error("Plaka kontrolünde beklenmeyen hata:", err);
        setStepLoader({ isLoading: false, title: '', subtitle: '' });
        return;
      }

      // 2. AŞAMA: PLAKA TEMİZSE GÖRSELLERİ BULUTA YÜKLE
      setIsUploadingPhotos(true);
      setStepLoader({
        isLoading: true,
        title: 'Görseller Bulut Depolamaya Aktarılıyor',
        subtitle: 'Fotoğraflarınız işleniyor ve güvenli klasörünüze yükleniyor...'
      });

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
        setStepLoader({ isLoading: false, title: '', subtitle: '' });
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

      setStepLoader({
        isLoading: true,
        title: 'Araç Detayları Kaydediliyor',
        subtitle: 'Ekspertiz ve vitrin bilgileriniz taslağınıza tescilleniyor...'
      });

      try {
        await saveDraftToDatabase(3, formData);
        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        console.error("Step 2 geçiş hatası:", err);
      } finally {
        setStepLoader({ isLoading: false, title: '', subtitle: '' });
      }
      return;
    }

    // 📌 STEP 3 -> STEP 4 (ÖN İZLEME) GEÇİŞİ
    if (currentStep === 3) {
      let isStep3Valid = true;
      if (step3Ref.current?.handleNextWithValidation) {
        isStep3Valid = step3Ref.current.handleNextWithValidation();
      }
      if (!isStep3Valid) return;

      setStepLoader({
        isLoading: true,
        title: 'OTO.CV Karnesi Hazırlanıyor',
        subtitle: 'Tüm verileriniz kontrol edilerek ön izleme ekranına aktarılıyor...'
      });

      try {
        await saveDraftToDatabase(4, formData);
        setCurrentStep(4);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        console.error("Step 3 geçiş hatası:", err);
      } finally {
        setStepLoader({ isLoading: false, title: '', subtitle: '' });
      }
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
                  stepLoader.isLoading ||
                  (currentStep === 1 && !isStep1Valid) ||
                  (currentStep === 2 && !isStep2Valid) ||
                  (currentStep === 3 && !isStep3Valid)
                }
                onClick={handleNextStep}
                className="w-64 sm:w-72 bg-rose-500 hover:bg-rose-600 disabled:bg-[#FFF5F7] disabled:text-[#FFC2CB] text-white font-extrabold text-xs sm:text-sm py-2.5 sm:py-3 px-5 rounded-md transition-all shadow-xs disabled:cursor-not-allowed text-center cursor-pointer active:scale-98 flex items-center justify-center gap-2"
              >
                {isUploadingPhotos || stepLoader.isLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>İşlem Yapılıyor...</span>
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

      {/* ADIM BİLEŞENLERİ KAPSAYICISI (DİNAMİK GENİŞLİK SENSÖRLÜ) */}
      <div className={`${currentStep === 4 ? 'max-w-[1280px]' : 'max-w-5xl'} mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6 transition-all duration-300`}>
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
              setStepLoader({
                isLoading: true,
                title: "Araç Karneniz Tescilleniyor",
                subtitle: "İlanınız başarıyla tescil ediliyor ve OTO-CV dijital garajınıza aktarılıyor..."
              });

              try {
                await handleDiscardDraft(false);
                if (onSuccess) await onSuccess();
              } catch (err) {
                console.error("Yayınlama hatası:", err);
              } finally {
                setStepLoader({ isLoading: false, title: '', subtitle: '' });
              }
            }}
          />
        )}
      </div>

      {/* YARIM KALAN İLAN (DRAFT RECOVERY) MODAL BİLEŞENİ */}
      {showDraftModal && draftData && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-6 relative border border-slate-100 font-sans antialiased">
            
            <button 
              onClick={() => handleDiscardDraft(true)}
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
                onClick={() => handleDiscardDraft(true)}
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

      {/* 🛑 MÜKERRER PLAKA UYARI MODAL BİLEŞENİ (MERKEZİ VE SADELEŞTİRİLMİŞ UI) */}
      {showDuplicatePlateModal && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4 animate-fadeIn font-sans antialiased">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-6 relative border border-slate-100">
            
            {/* Kapat Butonu */}
            <button 
              onClick={() => setShowDuplicatePlateModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center font-semibold text-lg cursor-pointer"
            >
              ✕
            </button>

            {/* ÜSTE ORTALANMIŞ İKON VE BAŞLIK BLOĞU */}
            <div className="flex flex-col items-center text-center space-y-3 pt-1">
              <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 shrink-0 shadow-2xs">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008zM12 3a9 9 0 100 18 9 9 0 000-18z" />
                </svg>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                  Bu Araç Zaten Kayıtlı!
                </h3>
                <p className="text-sm text-slate-500 font-normal leading-relaxed">
                  Girdiğiniz plaka OTO-CV veritabanında aktif tescillidir. Bir araç dijital garaja yalnızca bir kez kaydedilebilir.
                </p>
              </div>
            </div>

            {/* SADECE ORTALANMIŞ VE ÖN PLANDA DURAN PLAKA ROZETİ */}
            <div className="bg-slate-100/80 p-4 sm:p-5 rounded-xl flex items-center justify-center">
              <div className="inline-flex items-center bg-white border-2 border-slate-900 rounded-lg overflow-hidden shadow-xs h-11 sm:h-12">
                <div className="bg-[#003399] text-white px-3 h-full flex items-center justify-center font-mono font-black text-xs sm:text-sm select-none border-r border-slate-900">
                  TR
                </div>
                <div className="px-5 font-mono font-black text-lg sm:text-xl text-slate-900 uppercase tracking-widest select-all">
                  {duplicatePlateNumber}
                </div>
              </div>
            </div>

            {/* İKAZ / DESTEK BİLGİ KUTUSU */}
            <div className="bg-rose-50/70 border border-rose-100 p-3.5 rounded-xl flex items-start gap-3">
              <div className="p-1.5 bg-rose-100/80 text-rose-600 rounded-lg shrink-0 mt-0.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
              </div>
              <div className="space-y-0.5 text-xs text-left">
                <p className="font-bold text-rose-950">Araç sahibi siz misiniz?</p>
                <p className="text-rose-800/80 font-medium leading-relaxed">
                  Sahiplik transferi, devir işlemleri veya plaka düzeltme talepleriniz için destek ekibiyle iletişime geçebilirsiniz.
                </p>
              </div>
            </div>

            {/* AKSİYON BUTONU */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowDuplicatePlateModal(false)}
                className="w-full bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-bold text-sm py-3.5 px-4 rounded-xl transition-all cursor-pointer text-center shadow-xs"
              >
                Anladım, Plakayı Düzelt
              </button>
            </div>

          </div>
        </div>
      )}
      {/* GLOBAL STEP LOADER OVERLAY (TÜM ADIM GEÇİŞLERİ VE ONAY İÇİN) */}
      <GlobalStepLoader 
        isLoading={stepLoader.isLoading}
        title={stepLoader.title}
        subtitle={stepLoader.subtitle}
      />

    </div>
  );
}