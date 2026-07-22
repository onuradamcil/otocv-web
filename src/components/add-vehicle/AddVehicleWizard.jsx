// =========================================================================
// SİHİRBAZ ANA GÖVDESİ: 4 ADIMLI DİNAMİK TESCİL MOTORU (AddVehicleWizard.jsx)
// İşlev: Dynamic Lazy Catalog akışını, adımlar arası durum geçişlerini, mükerrer plaka
//        korumasını, ARKA PLANDA PIN ÜRETİMİNİ, resim/fatura yüklemelerini,
//        bakım kayıtlarını ve SİBER KULLANICI BAĞLANTISINI yönetir.
// =========================================================================

'use client';

import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import Step1Identity from './Step1Identity';
import Step2DNA from './Step2DNA';
import Step3Medical from './Step3Medical';
import Step4Verification from './Step4Verification';

export default function AddVehicleWizard({ onWizardComplete, onBack }) {
  // =========================================================================
  // 1. BLOK: ADIM VE FORM DURUM KONTROLCÜLERİ
  // =========================================================================
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 4;
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Merkezi Hafıza Odası (series sütun desteği eklendi)
  const [formData, setFormData] = useState({
    plate_number: '',
    km: '',
    brand: '',
    series: '',       // 🚀 YENİ: Model Serisi (Örn: 3 Serisi, Clio, Passat)
    model: '',        // Motor / Alt Model (Örn: 320i, 1.0 TCe)
    year: '',
    package: '',
    fuel_type: 'Benzin',
    transmission: 'Otomatik',
    color: '',
    tramer_status: 'Hasarsız',
    tramer_amount: '',
    traffic_insurance_end_date: '',
    kasko_end_date: '',
    inspection_end_date: '',
    vehicle_images: [],
    ruhsat_image: null,
    trust_score: 60,
    service_records: []
  });

  // Canlı Adım Validasyon Kalkanları
  const [isStep1Valid, setIsStep1Valid] = useState(false);
  const [isStep2Valid, setIsStep2Valid] = useState(false);
  const [isStep3Valid, setIsStep3Valid] = useState(false);
  const [isStep4Valid, setIsStep4Valid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // =========================================================================
  // 2. BLOK: YARDIMCI SİBER MOTORLAR (ARKA PLAN PIN ÜRETİCİSİ)
  // =========================================================================
  const generateUniqueVehiclePin = () => {
    const allowedChars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'; 
    let randomPool = '';
    for (let i = 0; i < 6; i++) {
      randomPool += allowedChars.charAt(Math.floor(Math.random() * allowedChars.length));
    }
    return `CV-${randomPool}`;
  };

  // =========================================================================
  // 3. BLOK: ASENKRON SİCİL TESCİL VE BULUT MÜHÜRLEME MOTORU
  // =========================================================================
  const handleNextStep = async () => {
    setSubmitAttempted(true);

    if (currentStep === 0 && !isStep1Valid) return;
    if (currentStep === 1 && !isStep2Valid) return;
    if (currentStep === 2 && !isStep3Valid) return;
    if (currentStep === 3 && !isStep4Valid) return;

    setSubmitAttempted(false); 

    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
      return;
    }

    // FINAL ETAP: SUPABASE BULUT TESCİL OPERASYONU
    try {
      setIsSubmitting(true);

      // 🚀 SİBER GÜVENLİK KALKANI: Aracı ekleyen aktif kullanıcının kimlik oturumunu yakala
      const { data: { user }, error: authUserError } = await supabase.auth.getUser();
      if (authUserError) throw authUserError;

      if (!user) {
        alert("⚠️ Oturum zaman aşımına uğramış kanka! Lütfen tekrar giriş yapın.");
        setIsSubmitting(false);
        return;
      }

      const formattedPlate = formData.plate_number.replace(/\s+/g, '').toUpperCase();

      // Mükerrer Plaka Kontrolü
      const { data: checkPlate, error: checkError } = await supabase
        .from('vehicles')
        .select('plate_number')
        .eq('plate_number', formattedPlate);

      if (checkError) throw checkError;

      if (checkPlate && checkPlate.length > 0) {
        alert(`⚠️ ${formattedPlate} plakalı araç sistemde zaten kayıtlıdır kanka!`);
        setIsSubmitting(false);
        return;
      }

      // Araç Görsellerini Storage'a Yükleme Motoru
      const uploadedUrls = [];
      for (let i = 0; i < formData.vehicle_images.length; i++) {
        const file = formData.vehicle_images[i];
        const fileExt = file.name ? (file.name.split('.').pop() || 'jpg') : 'jpg';
        const fileName = `car_photo_${i}_${Date.now()}.${fileExt}`;
        const filePath = `${formattedPlate}/${fileName}`;

        if (file instanceof File) {
          const { error: uploadError } = await supabase.storage
            .from('vehicle-images')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('vehicle-images')
            .getPublicUrl(filePath);

          uploadedUrls.push(publicUrl);
        } else {
          uploadedUrls.push(file);
        }
      }
      const mergedImageUrls = uploadedUrls.join(',');

      const finalGeneratedPin = generateUniqueVehiclePin();

      // Ana Araç Satırını Mühürleme (series sütunu dahil edildi)
      const { error: insertVehicleError } = await supabase.from('vehicles').insert({
        plate_number: formattedPlate,
        pin_code: finalGeneratedPin, 
        user_id: user.id, // 🚀 Araba doğrudan bu üyenin UUID'sine zimmetlenir!
        km: parseInt(formData.km.toString().replace(/\./g, ''), 10) || 0,
        brand: formData.brand || 'Belirsiz',
        series: formData.series || 'Belirsiz', // 🎯 Yeni eklenen Model Serisi
        model: formData.model || 'Belirsiz',
        year: parseInt(formData.year, 10) || new Date().getFullYear(),
        package: formData.package || 'Standart Paket',
        traffic_insurance_end_date: formData.traffic_insurance_end_date || null,
        kasko_end_date: formData.kasko_end_date || null,
        inspection_end_date: formData.inspection_end_date || null,
        trust_score: formData.trust_score || 60,
        image_url: mergedImageUrls,
        fuel_type: formData.fuel_type,
        transmission: formData.transmission,
        color: formData.color,
        tramer_status: formData.tramer_status,
        tramer_amount: formData.tramer_amount || '0'
      });

      if (insertVehicleError) throw insertVehicleError;

      // BAKIM REKORLARI YÜKLEME VE BOŞ SATIR FİLTRELEME MOTORU
      if (formData.service_records && formData.service_records.length > 0) {
        for (let index = 0; index < formData.service_records.length; index++) {
          const record = formData.service_records[index];
          
          const isEntirelyEmpty = !record.shop_name?.trim() && !record.km && !record.cost && !record.summary;
          if (isEntirelyEmpty) continue;

          if (record.shop_name?.trim().length > 0) {
            let recordInvoiceUrl = null;

            if (record.invoice_file instanceof File) {
              const rExt = record.invoice_file.name.split('.').pop() || 'jpg';
              const rFileName = `history_invoice_${Date.now()}_${index}.${rExt}`;
              const rFilePath = `${formattedPlate}/${rFileName}`;

              const { error: rUploadError } = await supabase.storage
                .from('vehicle-images')
                .upload(rFilePath, record.invoice_file);

              if (rUploadError) throw rUploadError;

              const { data: { publicUrl } } = supabase.storage
                .from('vehicle-images')
                .getPublicUrl(rFilePath);

              recordInvoiceUrl = publicUrl;
            } else {
              recordInvoiceUrl = record.invoice_file;
            }

            await supabase.from('maintenance_records').insert({
              vehicle_plate: formattedPlate,
              shop_name: record.shop_name.trim(),
              km_at_service: parseInt(record.km?.toString().replace(/\./g, ''), 10) || 0,
              cost: parseFloat(record.cost?.toString().replace(/\./g, '')) || 0.0,
              summary: record.summary?.trim() || '',
              invoice_url: recordInvoiceUrl,
              service_date: record.service_date?.trim() || '10/07/2026',
              service_type: record.service_type || 'Periyodik Bakım',
              next_service_km: record.next_service_km ? parseInt(record.next_service_km.toString().replace(/\./g, ''), 10) : null
            });
          }
        }
      }

      if (onWizardComplete) {
        onWizardComplete();
      }
    } catch (e) {
      console.error("🚨 Supabase Tescil Hatası kardo:", e);
      alert(`Hata: Araç veritabanına tescil edilemedi! (${e.message})`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
    else if (onBack) onBack();
  };

  // =========================================================================
  // 4. BLOK: ADIM GEÇİŞ KANALLARININ SEÇİM ENJEKTÖRÜ (ROUTER ELEMANI)
  // =========================================================================
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Step1Identity 
            formData={formData} 
            setFormData={setFormData} 
            onValidationChanged={setIsStep1Valid}
            submitAttempted={submitAttempted}
          />
        );
      case 1:
        return (
          <Step2DNA 
            formData={formData}
            setFormData={setFormData}
            onValidationChanged={setIsStep2Valid}
            submitAttempted={submitAttempted}
          />
        );
      case 2:
        return (
          <Step3Medical 
            formData={formData} 
            setFormData={setFormData} 
            onValidationChanged={setIsStep3Valid} 
            submitAttempted={submitAttempted} 
            selectedYear={formData.year} 
          />
        );
      case 3:
        return (
          <Step4Verification 
            formData={formData} 
            setFormData={setFormData} 
            onValidationChanged={setIsStep4Valid} 
            submitAttempted={submitAttempted} 
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans antialiased">
      
      {/* NAVBAR */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <span onClick={handlePreviousStep} className="text-base font-extrabold tracking-wider cursor-pointer text-slate-900">
              OTO.CV
            </span>
            <div className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-500">
              <span className="hover:text-slate-900 cursor-pointer">Pazaryeri Vitrini</span>
              <span className="hover:text-slate-900 cursor-pointer">Kurumsal Çözümler</span>
              <span className="hover:text-slate-900 cursor-pointer">Doğrulama Havuzu</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="text-slate-400 hover:text-slate-600 relative p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full absolute top-1.5 right-1.5" />
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </button>

            <button 
              onClick={handlePreviousStep}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-gray-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 0l-9 3.273m9-3.273v1.514" />
              </svg>
              Garajım Paneli
            </button>
          </div>
        </div>
      </nav>

      {/* SİHİRBAZ ANA KAPSAYICI KATMANI */}
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 select-none mt-4">
        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm text-center space-y-2">
          <span className="text-[#4F46E5] font-bold text-xs tracking-widest block uppercase">
            OTO.CV DETAYLI RESMİ SİCİL REHBERİ
          </span>
          <h2 className="text-[#0F172A] font-bold text-xl md:text-2xl tracking-tight">
            Adım {currentStep + 1} / {totalSteps}
          </h2>
          
          <div className="flex gap-2 pt-4 max-w-md mx-auto">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div 
                key={index} 
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  index <= currentStep ? 'bg-[#4F46E5]' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* INTERFACE ADIM KART YUVASI */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 md:p-10 shadow-xl shadow-slate-100 flex flex-col justify-between space-y-8">
          <div className="flex-1 py-2">
            {renderStepContent()}
          </div>

          <div className="border-t border-gray-100 pt-6 flex justify-between items-center">
            {currentStep > 0 ? (
              <button
                type="button"
                onClick={handlePreviousStep}
                disabled={isSubmitting}
                className="text-slate-500 hover:text-slate-900 font-bold text-xs px-4 py-2 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                Geri Dön
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleNextStep}
              className="px-6 py-3.5 rounded-xl text-xs font-bold tracking-wide flex items-center gap-1.5 shadow-md transition-all duration-200 bg-[#0F172A] hover:bg-slate-800 text-white active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : currentStep === totalSteps - 1 ? (
                <>
                  Tescili Tamamla ve Mühürle
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                  </svg>
                </>
              ) : (
                <>
                  Sonraki Adım
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}