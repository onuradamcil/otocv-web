// =========================================================================
// OTO-CV İLAN VERME: MASTER 4. ADIM BİLEŞENİ (Step4PreviewAndPublish.jsx)
// İşlev: OTO.CV Güven Skoru Analizi, Yasal Onay Tikleri, Sanal Otopark Vitrin
//        Switch'i ve Nihai Kayıt / Tescil İşlemi.
// =========================================================================

'use client';

import React, { useState } from 'react';
import { supabase } from '../../../lib/supabase';

// --- EKSPERTİZ RENK VE ETİKET KATALOĞU ---
const DAMAGE_STATUSES = {
  ORIGINAL: { label: 'Orijinal', bg: 'bg-emerald-500', text: 'text-white' },
  PAINTED: { label: 'Boyanmış', bg: 'bg-amber-400', text: 'text-amber-950' },
  LOCAL_PAINTED: { label: 'Lokal Boyanmış', bg: 'bg-orange-500', text: 'text-white' },
  CHANGED: { label: 'Değişmiş', bg: 'bg-rose-600', text: 'text-white' },
  UNSPECIFIED: { label: 'Belirtilmemiş', bg: 'bg-slate-200', text: 'text-slate-600' }
};

const CAR_PARTS_MAP = {
  front_bumper: 'Ön Tampon',
  rear_bumper: 'Arka Tampon',
  front_bonnet: 'Motor Kaputu',
  roof: 'Tavan',
  trunk: 'Bagaj Kapağı',
  fender_front_left: 'Sol Ön Çamurluk',
  door_front_left: 'Sol Ön Kapı',
  door_rear_left: 'Sol Arka Kapı',
  fender_rear_left: 'Sol Arka Çamurluk',
  fender_front_right: 'Sağ Ön Çamurluk',
  door_front_right: 'Sağ Ön Kapı',
  door_rear_right: 'Sağ Arka Kapı',
  fender_rear_right: 'Sağ Arka Çamurluk'
};

export default function Step4PreviewAndPublish({ formData, updateFormData, onBack, onSuccess, user }) {
  // Galeri Aktif Fotoğraf State'i
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  
  // Yasal Onay Checkbox State'leri
  const [isLegalConfirmed, setIsLegalConfirmed] = useState(formData.isLegalConfirmed || false);
  const [isVinConfirmed, setIsVinConfirmed] = useState(formData.isVinConfirmed || false);
  const [isPublicShowcase, setIsPublicShowcase] = useState(formData.isPublicShowcase ?? true);

  // Kaydetme İşlemi Yükleniyor State'i
  const [isPublishing, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fotoğraf Dizisi Güvenlik Kontrolü
  const photos = Array.isArray(formData.photos) && formData.photos.length > 0 
    ? formData.photos 
    : ['/placeholder-car.jpg'];

  const activePlate = formData.plate || formData.plate_number || '-';
  const activeKm = formData.mileage || formData.km || '-';

  // 🧮 OTOMATİK OTO.CV GÜVEN SKORU HESAPLAMA MOTORU
  const calculateScore = () => {
    let score = 60; // Başlangıç Taban Skoru

    if (photos.length >= 3) score += 10;
    if (formData.registration_file) score += 10;
    if (formData.isFullyOriginal || formData.tramerStatus === 'Tramer Yok') score += 10;
    if (Array.isArray(formData.service_records) && formData.service_records.length > 0) score += 10;

    return Math.min(score, 100);
  };

  const calculatedScore = calculateScore();

  // 🚀 NİHAİ VERİTABANI KAYIT HANDLERI
  const handlePublishListing = async () => {
    if (!isLegalConfirmed || !isVinConfirmed) {
      setErrorMessage('Lütfen yayınlama öncesi zorunlu yasal beyan tiklerini onaylayınız.');
      return;
    }

    setIsSubmitted(true);
    setErrorMessage('');

    try {
      // 1. Veritabanı Payload Paketleme
      const listingPayload = {
        user_id: user?.id || null,
        title: formData.title,
        mileage: parseInt((activeKm.toString() || '0').replace(/[^0-9]/g, ''), 10),
        brand: formData.selectedBrand?.name || '',
        series: formData.selectedSeries?.name || '',
        model: formData.selectedModel?.name || '',
        package: formData.selectedPackage?.name || '',
        year: formData.selectedYear || new Date().getFullYear(),
        fuel_type: formData.selectedFuel || '',
        transmission: formData.transmission || '',
        body_type: formData.bodyType || '',
        color: formData.color?.name || 'Beyaz',
        vehicle_status: formData.vehicleStatus || 'İkinci El',
        plate: activePlate,
        traffic_insurance_end_date: formData.traffic_insurance_end_date || null,
        kasko_end_date: formData.kasko_end_date || null,
        inspection_end_date: formData.inspection_end_date || null,
        city: formData.city || 'İstanbul',
        district: formData.district || '',
        warranty: formData.warranty === 'Evet',
        swap: formData.swap === 'Evet',
        tramer_status: formData.tramerStatus || 'Tramer Yok',
        tramer_amount: formData.tramerAmount || '0',
        is_fully_original: !!formData.isFullyOriginal,
        damage_report: formData.damageReport || {},
        features: formData.selectedFeatures || [],
        description: formData.description || '',
        photos: photos,
        otocv_score: calculatedScore,
        is_public_showcase: isPublicShowcase,
        status: 'active',
        created_at: new Date().toISOString()
      };

      // 2. Supabase `listings` Tablosuna Kaydetme
      const { data, error } = await supabase
        .from('listings')
        .insert([listingPayload])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // 3. Başarılı İse Callback Tetikle
      if (onSuccess) {
        onSuccess(data);
      }

    } catch (err) {
      console.error("Kayıt oluşturulurken hata oluştu:", err);
      setErrorMessage(err.message || 'Araç kaydı oluşturulurken bir hata oluştu. Lütfen tekrar deneyiniz.');
    } finally {
      setIsSubmitted(false);
    }
  };

  return (
    <div className="pb-24 text-slate-900 font-sans antialiased space-y-6 select-none">
      
      {/* 📌 ÖN İZLEME BİLGİLENDİRME BARI */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs font-extrabold text-lg">
            👁️
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-indigo-950 tracking-tight">
              OTO.CV Araç Karnesi Ön İzleme Modu
            </h3>
            <p className="text-xs text-indigo-700 font-medium">
              Araç karneniz ve OTO.CV skorunuz tam olarak bu şekilde tescillenecektir. Kontrol edip onaylayabilirsiniz.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="hidden sm:flex items-center gap-1.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          ✏️ Bilgileri Düzenle
        </button>
      </div>

      {/* 📌 HATA BİLDİRİM BARI */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs font-bold animate-fadeIn">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* =========================================================================
          IZGARA DÜZENİ: SOL İÇERİK (65%) & SAĞ ÖZET KÜNYE KARTI (35%)
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ---------------------------------------------------------------------
            LEFT COLUMN: GALERİ, AÇIKLAMA, EKSPERTİZ & DONANIM (8 KOLON)
           --------------------------------------------------------------------- */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 📸 1. KART: FOTOĞRAF GALERİSİ */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="relative w-full h-[320px] sm:h-[420px] bg-slate-900 rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
              <img
                src={photos[selectedPhotoIndex]}
                alt={formData.title}
                className="w-full h-full object-contain object-center"
              />
              <span className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-xs font-mono font-bold px-3 py-1 rounded-full">
                {selectedPhotoIndex + 1} / {photos.length}
              </span>
            </div>

            {photos.length > 1 && (
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
                {photos.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedPhotoIndex(idx)}
                    className={`relative w-20 h-16 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                      selectedPhotoIndex === idx ? 'border-indigo-600 scale-105 shadow-xs' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={imgUrl} alt={`Fotoğraf ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 🛠️ 2. KART: EKSPERTİZ & TRAMER ÖZETİ */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Boya, Değişen ve Tramer Bilgisi</span>
              </h3>
              <span className="text-xs font-mono font-bold bg-amber-50 text-amber-700 px-3 py-1 rounded-full border border-amber-200/60">
                {formData.tramerStatus === 'Tramer Var' && formData.tramerAmount 
                  ? `Tramer: ${formData.tramerAmount} TL` 
                  : formData.tramerStatus}
              </span>
            </div>

            {formData.isFullyOriginal ? (
              <div className="bg-emerald-50 border border-emerald-200/80 p-4 rounded-xl flex items-center gap-3 text-emerald-800">
                <span className="text-xl">✨</span>
                <p className="text-xs font-bold">Bu araç hatasızdır! Tüm kaporta ve tampon parçaları tamamen orijinaldir.</p>
              </div>
            ) : Object.keys(formData.damageReport || {}).length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {Object.entries(formData.damageReport).map(([partId, statusKey]) => {
                  const status = DAMAGE_STATUSES[statusKey] || DAMAGE_STATUSES.UNSPECIFIED;
                  return (
                    <div key={partId} className="bg-slate-50 border border-slate-200/70 p-2.5 rounded-xl flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 truncate mr-1">
                        {CAR_PARTS_MAP[partId] || partId}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold shrink-0 ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-medium">Ekspertiz ve kaporta durumu belirtilmemiş.</p>
            )}
          </div>

          {/* ⚡ 3. KART: DONANIM ÖZELLİKLERİ */}
          {formData.selectedFeatures?.length > 0 && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Donanım Özellikleri
                </h3>
                <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100">
                  {formData.selectedFeatures.length} Özellik Seçildi
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {formData.selectedFeatures.map((feat, idx) => (
                  <span
                    key={idx}
                    className="bg-slate-100/90 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200/70 transition-colors"
                  >
                    ✓ {feat}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ✍️ 4. KART: ARAÇ ÖZETİ VE HİKAYESİ */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-900 tracking-tight border-b border-slate-100 pb-3">
              Araç Özerti & OTO-CV Hikayesi
            </h3>
            
            <div
              className="prose max-w-none text-xs sm:text-sm text-slate-800 leading-relaxed font-medium [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_p]:mb-2"
              dangerouslySetInnerHTML={{ __html: formData.description || 'Açıklama girilmemiş.' }}
            />
          </div>

          {/* 📜 5. YASAL BEYAN VE TESCİL TİKLERİ (ESKİ STEP 4 FÜZYONU) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-900 tracking-tight border-b border-slate-100 pb-3">
              Tescil & Güven Mührü Onayı
            </h3>

            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                <input 
                  type="checkbox"
                  checked={isLegalConfirmed}
                  onChange={(e) => {
                    setIsLegalConfirmed(e.target.checked);
                    if (updateFormData) updateFormData({ isLegalConfirmed: e.target.checked });
                  }}
                  className="mt-0.5 w-4 h-4 text-indigo-600 rounded cursor-pointer"
                />
                <span className="text-xs text-slate-700 font-semibold leading-relaxed">
                  TÜVTÜRK ve e-Devlet üzerindeki kilometre ve hak sahipliği beyanımın doğruluğunu kabul ediyorum. Aksi durumda tescilimin iptal edileceğini biliyorum. *
                </span>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                <input 
                  type="checkbox"
                  checked={isVinConfirmed}
                  onChange={(e) => {
                    setIsVinConfirmed(e.target.checked);
                    if (updateFormData) updateFormData({ isVinConfirmed: e.target.checked });
                  }}
                  className="mt-0.5 w-4 h-4 text-indigo-600 rounded cursor-pointer"
                />
                <span className="text-xs text-slate-700 font-semibold leading-relaxed">
                  Yüklediğim ruhsat ve fatura görsellerinin şasi numaralarının (VIN) birbiriyle eşleştiğini ve sisteme sahte evrak ibraz etmediğimi beyan ederim. *
                </span>
              </label>
            </div>

            {/* SANAL OTOPARK VİTRİN SWITCH */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900">Aracımı Sanal Otopark Vitrininde Sergile</h4>
                  <p className="text-[11px] text-slate-500 font-medium pt-0.5">Aracınız ana sayfa vitrininde ve kıyaslama salonunda sergilenir.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsPublicShowcase(!isPublicShowcase);
                    if (updateFormData) updateFormData({ isPublicShowcase: !isPublicShowcase });
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    isPublicShowcase ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isPublicShowcase ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* ---------------------------------------------------------------------
            RIGHT COLUMN: SAĞ SABİT KÜNYE & SKOR KARTI (4 KOLON)
           --------------------------------------------------------------------- */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-6 sticky top-24">
            
            {/* CANLI OTO.CV SKORU KARTI (FİYAT YERİNE) */}
            <div className="space-y-2 pb-4 border-b border-slate-100 bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl text-center">
              <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider block">
                TAHMİNİ OTO.CV GÜVEN SKORU
              </span>
              <div className="text-4xl font-black text-emerald-600 tracking-tight">
                %{calculatedScore}
              </div>
              <p className="text-[10px] font-bold text-emerald-700">
                Girdiğiniz evrak ve bakımlara göre hesaplanan şeffaflık puanı.
              </p>
            </div>

            {/* TEKNİK KÜNYE TABLOSU */}
            <div className="space-y-2.5 text-xs font-medium">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider pb-1">Araç Künyesi</h4>
              
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Marka</span>
                <span className="font-bold text-slate-900">{formData.selectedBrand?.name || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Seri</span>
                <span className="font-bold text-slate-900">{formData.selectedSeries?.name || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Model</span>
                <span className="font-bold text-slate-900">{formData.selectedModel?.name || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Yıl</span>
                <span className="font-bold text-slate-900">{formData.selectedYear || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Kilometre</span>
                <span className="font-bold text-slate-900">{activeKm ? `${activeKm} KM` : '-'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Vites Tipi</span>
                <span className="font-bold text-slate-900">{formData.transmission}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Yakıt Tipi</span>
                <span className="font-bold text-slate-900">{formData.selectedFuel || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Kasa Tipi</span>
                <span className="font-bold text-slate-900">{formData.bodyType}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Renk</span>
                <span className="font-bold text-slate-900">{formData.color?.name || 'Beyaz'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Plaka</span>
                <span className="font-bold text-slate-900 font-mono">{activePlate}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Trafik Sigortası</span>
                <span className="font-bold text-slate-900 font-mono">{formData.traffic_insurance_end_date || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Muayene Tarihi</span>
                <span className="font-bold text-slate-900 font-mono">{formData.inspection_end_date || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Garanti</span>
                <span className="font-bold text-slate-900">{formData.warranty}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Takas</span>
                <span className="font-bold text-slate-900">{formData.swap}</span>
              </div>
            </div>

            {/* 🚀 NİHAİ AKSİYON BUTONLARI */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                disabled={isPublishing || !isLegalConfirmed || !isVinConfirmed}
                onClick={handlePublishListing}
                className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:bg-emerald-300 disabled:cursor-not-allowed text-white font-black text-sm py-4 px-6 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {isPublishing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Tescil Ediliyor...</span>
                  </>
                ) : (
                  <>
                    <span>✓ Karneyi Onayla ve Garajıma Kaydet</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isPublishing}
                onClick={onBack}
                className="w-full bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 font-bold text-xs py-3 px-4 rounded-xl transition-all cursor-pointer text-center"
              >
                ‹ Geri Dön ve Bilgileri Düzenle
              </button>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}