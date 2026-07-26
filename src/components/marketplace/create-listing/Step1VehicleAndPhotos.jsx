// =========================================================================
// OTO-CV İLAN VERME: 1. ADIM BİLEŞENİ (Step1VehicleAndPhotos.jsx)
// İşlev: Orijinal CreateListingScreen tasarımının sıfır kayıpsız Step 1 uyarlaması.
//        Fotoğraf yükleme kütüğü, eşit sütunlu araç seçim alanı ve Wizard veri senkronizasyonu.
// =========================================================================

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';

// =========================================================================
// SABİT KATALOG SİMÜLASYON VERİLERİ VE STİL SABİTLERİ (FALLBACK DATA)
// =========================================================================
const CATEGORIES = ['Otomobil', 'Arazi, SUV, Pick-up', 'Motosiklet', 'Minivan & Panelvan', 'Ticari Araçlar'];
const YEARS = Array.from({ length: 27 }, (_, i) => (2026 - i).toString());
const FUELS = ['Benzin', 'Dizel', 'LPG & Benzin', 'Hibrit', 'Elektrik'];

// 🚀 OK UCU (CHEVRON RIBBON TAB) POLİGON STİL SABİTİ
const arrowTabStyle = {
  clipPath: 'polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%)'
};

export default function Step1VehicleAndPhotos({ formData, updateFormData, userPackage, onNext }) {
  // =========================================================================
  // 1. BLOK: PROPS & MERKEZİ FORM HAFIZA BAĞLANTILARI
  // =========================================================================
  
  // Wizard Global State'inden Gelen Verilerin Ayıklanması
  const {
    photos = [],
    selectedCategory = null,
    selectedYear = null,
    selectedFuel = null,
    selectedBrand = null,
    selectedSeries = null,
    selectedModel = null,
    selectedPackage = null,
    isFinalConfirmed = false
  } = formData || {};

  // Yerel Yardımcı UI State'leri
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Supabase Veri Listeleri State'leri
  const [brands, setBrands] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [modelsList, setModelsList] = useState([]);
  const [packagesList, setPackagesList] = useState([]);

  // Otomatik Sağa Kaydırma Referansı
  const scrollContainerRef = useRef(null);

  // =========================================================================
  // 2. BLOK: SUPABASE VERİ ÇEKME VE İLİŞKİSEL İLERLEME HANDLERLARI
  // =========================================================================
  
  useEffect(() => {
    fetchBrands();
  }, []);

  // Sütun Seçildikçe Kütüğü Sağa Kaydıran Sensör
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: scrollContainerRef.current.scrollWidth,
        behavior: 'smooth'
      });
    }
  }, [selectedCategory, selectedYear, selectedFuel, selectedBrand, selectedSeries, selectedModel, selectedPackage]);

  // Marka Listesini Veritabanından Çeken Servis
  const fetchBrands = async () => {
    try {
      const { data } = await supabase.from('car_brands').select('*').order('name');
      setBrands(data || [
        { id: 1, name: 'Audi' }, { id: 2, name: 'BMW' }, { id: 3, name: 'Mercedes-Benz' }, 
        { id: 4, name: 'Renault' }, { id: 5, name: 'Volkswagen' }, { id: 6, name: 'Honda' }
      ]);
    } catch (err) {
      console.error("Markalar çekilemedi:", err);
    }
  };

  // Marka Tıklanınca Alt Serileri Yükler
  const handleBrandClick = async (brandObj) => {
    updateFormData({
      selectedBrand: brandObj,
      selectedSeries: null,
      selectedModel: null,
      selectedPackage: null,
      isFinalConfirmed: false
    });

    try {
      const { data } = await supabase.from('car_series').select('*').eq('brand_id', brandObj.id).order('name');
      setSeriesList(data && data.length > 0 ? data : [
        { id: 101, name: '3 Serisi' }, { id: 102, name: '4 Serisi' }, { id: 103, name: '5 Serisi' }
      ]);
    } catch (err) {
      console.error("Seriler çekilemedi:", err);
    }
  };

  // Seri Tıklanınca Alt Modelleri Yükler
  const handleSeriesClick = async (seriesObj) => {
    updateFormData({
      selectedSeries: seriesObj,
      selectedModel: null,
      selectedPackage: null,
      isFinalConfirmed: false
    });

    try {
      const { data } = await supabase.from('car_models').select('*').eq('series_id', seriesObj.id).order('name');
      setModelsList(data && data.length > 0 ? data : [
        { id: 201, name: '420i' }, { id: 202, name: '420i Gran Coupe' }, { id: 203, name: '430i xDrive' }
      ]);
    } catch (err) {
      console.error("Modeller çekilemedi:", err);
    }
  };

  // Model Tıklanınca Donanım Paketlerini Yükler
  const handleModelClick = async (modelObj) => {
    updateFormData({
      selectedModel: modelObj,
      selectedPackage: null,
      isFinalConfirmed: false
    });

    try {
      const { data } = await supabase.from('car_packages').select('*').eq('model_id', modelObj.id).order('name');
      setPackagesList(data && data.length > 0 ? data : [
        { id: 301, name: 'Edition M Sport' }, { id: 302, name: 'Sport Line' }, { id: 303, name: 'Luxury Line' }
      ]);
    } catch (err) {
      console.error("Paketler çekilemedi:", err);
    }
  };

  // =========================================================================
  // 3. BLOK: GERÇEK DRAG & DROP VE CANLI FOTOĞRAF İŞLEME SENSÖRÜ
  // =========================================================================
  
  const processFiles = (files) => {
    const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (!validFiles || validFiles.length === 0) return;

    if (photos.length + validFiles.length > 15) {
      alert("En fazla 15 adet fotoğraf ekleyebilirsiniz.");
      return;
    }

    setIsUploading(true);

    setTimeout(() => {
      const newPhotoUrls = validFiles.map(file => URL.createObjectURL(file));
      updateFormData({ photos: [...photos, ...newPhotoUrls] });
      setIsUploading(false);
    }, 1200);
  };

  const handlePhotoUploadInput = (e) => {
    processFiles(e.target.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemovePhoto = (index) => {
    updateFormData({ photos: photos.filter((_, i) => i !== index) });
  };

  // İlerleme Oranı ve Form Geçerlilik Hesabı
  const calculateProgress = () => {
    let score = 0;
    if (photos.length > 0) score += 25;
    if (selectedYear && selectedFuel) score += 25;
    if (selectedBrand && selectedSeries && selectedModel) score += 25;
    if (selectedPackage && isFinalConfirmed) score += 25;
    return score;
  };

  const progress = calculateProgress();
  const isFormValid = progress === 100;

  // =========================================================================
  // 4. BLOK: ARAYÜZ RENDER KATMANI (DESKTOP WEB ENTERPRISE)
  // =========================================================================
  return (
    <div className="pb-12 text-slate-900 select-none">
      
      {/* ---------------------------------------------------------------------
          4.1 YAPIŞKAN AKSİYON BARI
         --------------------------------------------------------------------- */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              Ücretsiz İlan Ver
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              <span className="text-rose-600 font-bold">*</span> ile işaretli zorunlu alanları doldurduktan sonra ilan verebilirsin.
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <button 
              disabled={!isFormValid}
              onClick={onNext}
              className="w-72 bg-[#FFF0F2] disabled:bg-[#FFF5F7] disabled:text-[#FFC2CB] text-[#E11D48] font-black text-sm py-3 px-6 rounded-md transition-all shadow-2xs disabled:cursor-not-allowed text-center cursor-pointer"
            >
              Devam Et: İlan Detayları ›
            </button>
            
            <div className="w-72 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
              <div 
                className="h-full bg-amber-400 transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

        </div>
      </div>

      {/* ---------------------------------------------------------------------
          4.2 ANA İÇERİK FORMU
         --------------------------------------------------------------------- */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        
        {/* BÖLÜM 1: BİREYSEL İLAN KOTASI */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 select-none">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-extrabold text-slate-900 tracking-tight">
                  Bireysel Yayınlama Kotası
                </h4>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-200/80">
                  {userPackage?.tierName || 'Standart Paket'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-normal leading-tight">
                Bireysel hesabınız kapsamında bu ay ücretsiz yayınlayabileceğiniz standart ilan limiti.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-lg">
              <span className="text-xs font-semibold text-slate-500">Kalan Ücretsiz Hak:</span>
              <span className="text-xs font-black text-indigo-600 bg-white px-2 py-0.5 rounded border border-slate-200/60 shadow-2xs font-mono">
                {userPackage?.remainingQuota ?? 1} Adet
              </span>
            </div>

            <button
              type="button"
              onClick={() => alert("Ekstra İlan Hakkı ve Üyelik Paketleri Sayfası Yakında Buraya Bağlanacak Kanka!")}
              className="bg-amber-400 hover:bg-amber-500 active:scale-95 text-slate-950 font-black text-xs px-3 py-1.5 rounded-lg transition-all shadow-2xs border border-amber-500/40 flex items-center gap-1 cursor-pointer"
            >
              <span>Paketi Yükselt</span>
              <span>⚡</span>
            </button>
          </div>
        </div>

        {/* BÖLÜM 2: FOTOĞRAF YÜKLEME KUTUSU */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-1.5">
            <span className="text-rose-600 font-black text-lg">*</span>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Fotoğraf</h3>
          </div>
          
          <div className="flex items-start gap-2 text-xs text-slate-600 pb-1">
            <span className="w-4 h-4 rounded-full border border-rose-500 text-rose-500 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
              i
            </span>
            <p className="leading-snug">
              Sadece bmp, jpeg, gif, tiff ve png türleri yüklenebilir. Aracın farklı açılarda dış (ön, arka, yan) ve iç (motor, konsol, koltuklar) fotoğraflarının eklenmesi önerilir.
            </p>
          </div>

          <div className="bg-[#F2F4F7] border border-slate-200/80 rounded-xl p-4 sm:p-5">
            <div className="bg-white border border-slate-200/90 rounded-lg p-5 shadow-2xs space-y-5">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[125px] text-center group ${
                    isDragging 
                      ? 'border-rose-600 bg-rose-100/60 scale-[1.01]' 
                      : 'border-rose-300 hover:border-rose-500 bg-rose-50/20 hover:bg-rose-50/50'
                  }`}
                >
                  <input type="file" multiple accept="image/*" onChange={handlePhotoUploadInput} className="hidden" />
                  <svg className="w-7 h-7 text-rose-600 mb-1.5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574v9.176c0 1.222.98 2.222 2.222 2.222h15.056c1.222 0 2.222-1 2.222-2.222V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                  <span className="text-xs font-bold text-rose-600">Fotoğraf Ekle</span>
                  <span className="text-[10px] text-slate-400 font-semibold mt-0.5">veya Sürükle Bırak</span>
                </label>

                <div className="border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center opacity-80 hover:opacity-100 transition-opacity cursor-not-allowed bg-slate-50/40 min-h-[125px]">
                  <svg className="w-7 h-7 text-rose-600 mb-1.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                  <span className="text-xs font-bold text-rose-600">Telefondan Ekle</span>
                  <span className="text-[10px] text-slate-400 font-semibold mt-0.5">Bildirim ile</span>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center opacity-80 hover:opacity-100 transition-opacity cursor-not-allowed bg-slate-50/40 min-h-[125px]">
                  <svg className="w-7 h-7 text-rose-600 mb-1.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 14.25h1.5v1.5h-1.5v-1.5zM16.5 14.25h1.5v1.5h-1.5v-1.5zM13.5 17.25h1.5v1.5h-1.5v-1.5zM18 17.25h1.5v1.5H18v-1.5z" />
                  </svg>
                  <span className="text-xs font-bold text-rose-600">Telefondan Ekle</span>
                  <span className="text-[10px] text-slate-400 font-semibold mt-0.5">QR Kod ile</span>
                </div>
              </div>

              <div className="pt-1">
                <span className="text-xs font-bold text-slate-800 block mb-3">
                  Eklenen Fotoğraflar: <span className="font-mono text-indigo-600 font-extrabold">{photos.length} / 15</span>
                </span>

                <div className="flex flex-wrap gap-3 items-center">
                  {photos.map((photoUrl, idx) => (
                    <div key={idx} className="relative w-28 h-28 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden group shadow-2xs">
                      <img src={photoUrl} alt={`Foto ${idx}`} className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute top-1 left-1 bg-rose-600 text-white font-bold text-[9px] px-1.5 py-0.5 rounded uppercase font-mono shadow-2xs">
                          Kapak
                        </span>
                      )}
                      <button 
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute top-1 right-1 bg-slate-900/80 hover:bg-rose-600 text-white w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center transition-colors cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {isUploading && (
                    <div className="w-28 h-28 bg-slate-100 border border-slate-200 rounded-lg flex flex-col items-center justify-center p-2 text-center animate-pulse">
                      <div className="w-6 h-6 border-2 border-rose-600 border-t-transparent rounded-full animate-spin mb-1" />
                      <span className="text-[10px] font-bold text-rose-600">Yükleniyor...</span>
                    </div>
                  )}

                  {isUploading && (
                    <div className="bg-amber-100/70 border border-amber-300 text-slate-800 p-3 rounded-lg flex items-start gap-2.5 max-w-sm animate-fadeIn">
                      <span className="text-amber-600 font-bold text-base">⏰</span>
                      <div className="text-[11px] leading-snug">
                        <strong className="block text-slate-900 font-extrabold mb-0.5">Fotoğraflar yükleniyor...</strong>
                        Yükleme işlemi devam ederken aracın hakkındaki bilgileri doldurabilirsiniz.
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* BÖLÜM 3: ARAÇ SEÇİMİ (EŞİT SÜTUN GENİŞLİKLİ VE INTER SOFT UI MİMARİSİ) */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-sm space-y-4 font-sans antialiased">
          
          {/* 1. ÖZGÜR & BOLD ANA BAŞLIK */}
          <div className="flex items-center gap-2">
            <span className="text-rose-600 font-black text-2xl sm:text-3xl leading-none">*</span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Araç Seçimi
            </h3>
          </div>

          {/* TEK PARÇA SADE GRİ KUTU CONTAINER */}
          <div className="bg-[#F2F4F7] border border-slate-200/80 rounded-xl p-4 sm:p-5 space-y-3">
            
            {/* 2. RAHATLATILMIŞ VE OKUNAKLI YOL HARİTASI (BREADCRUMB) */}
            <div className="text-xs sm:text-sm font-semibold text-slate-800 px-1 min-h-[26px] flex items-center">
              {!selectedCategory ? (
                <span className="text-slate-800 font-bold text-xs sm:text-sm">Kategori Seçerek Başlayın</span>
              ) : (
                <div className="text-rose-600 font-bold flex flex-wrap items-center gap-2 text-xs sm:text-sm tracking-normal">
                  <span>{selectedCategory}</span>
                  {selectedYear && <><span className="text-slate-400 font-normal">&gt;</span><span>{selectedYear}</span></>}
                  {selectedFuel && <><span className="text-slate-400 font-normal">&gt;</span><span>{selectedFuel}</span></>}
                  {selectedBrand && <><span className="text-slate-400 font-normal">&gt;</span><span>{selectedBrand.name}</span></>}
                  {selectedSeries && <><span className="text-slate-400 font-normal">&gt;</span><span>{selectedSeries.name}</span></>}
                  {selectedModel && <><span className="text-slate-400 font-normal">&gt;</span><span>{selectedModel.name}</span></>}
                  {selectedPackage && <><span className="text-slate-400 font-normal">&gt;</span><span>{selectedPackage.name}</span></>}
                </div>
              )}
            </div>

            {/* 3. BEYAZ BAZLI MİLİMETRİK EŞİT SÜTUN KÜTÜĞÜ (HER SÜTUN: w-44) */}
            <div 
              ref={scrollContainerRef}
              className="bg-white rounded-lg p-3 border border-slate-200/90 flex gap-2.5 overflow-x-auto min-h-[340px] scrollbar-thin shadow-2xs"
            >
              {/* Sütun 1: Kategori */}
              <div className="w-44 border-r border-slate-100 pr-1 shrink-0 space-y-1 overflow-y-auto max-h-[310px]">
                <div className="text-[11px] font-bold text-slate-600 tracking-normal mb-2 pb-1.5 border-b border-slate-100 sticky top-0 bg-white z-10 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 text-[10px] font-extrabold flex items-center justify-center shrink-0">1</span>
                  <span>Kategori</span>
                </div>
                {CATEGORIES.map(cat => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <div 
                      key={cat}
                      onClick={() => updateFormData({ 
                        selectedCategory: cat, 
                        selectedYear: null, 
                        selectedFuel: null, 
                        selectedBrand: null, 
                        selectedSeries: null, 
                        selectedModel: null, 
                        selectedPackage: null, 
                        isFinalConfirmed: false 
                      })}
                      style={isSelected ? arrowTabStyle : {}}
                      className={`px-3 py-2 text-xs font-semibold cursor-pointer transition-all flex items-center ${
                        isSelected 
                          ? 'bg-[#EEF1F6] text-slate-900 font-bold pr-4' 
                          : 'hover:bg-slate-50 text-slate-700 rounded'
                      }`}
                    >
                      <span className="truncate">{cat}</span>
                    </div>
                  );
                })}
              </div>

              {/* Sütun 2: Model Yılı */}
              {selectedCategory && (
                <div className="w-44 border-r border-slate-100 pr-1 shrink-0 space-y-1 overflow-y-auto max-h-[310px] animate-fadeIn">
                  <div className="text-[11px] font-bold text-slate-600 tracking-normal mb-2 pb-1.5 border-b border-slate-100 sticky top-0 bg-white z-10 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 text-[10px] font-extrabold flex items-center justify-center shrink-0">2</span>
                    <span>Model Yılı</span>
                  </div>
                  {YEARS.map(yr => {
                    const isSelected = selectedYear === yr;
                    return (
                      <div 
                        key={yr}
                        onClick={() => updateFormData({ 
                          selectedYear: yr, 
                          selectedFuel: null, 
                          selectedBrand: null, 
                          selectedSeries: null, 
                          selectedModel: null, 
                          selectedPackage: null, 
                          isFinalConfirmed: false 
                        })}
                        style={isSelected ? arrowTabStyle : {}}
                        className={`px-3 py-2 text-xs font-semibold cursor-pointer transition-all flex items-center ${
                          isSelected 
                            ? 'bg-[#EEF1F6] text-slate-900 font-bold pr-4' 
                            : 'hover:bg-slate-50 text-slate-700 rounded'
                        }`}
                      >
                        <span>{yr}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Sütun 3: Yakıt Tipi */}
              {selectedYear && (
                <div className="w-44 border-r border-slate-100 pr-1 shrink-0 space-y-1 overflow-y-auto max-h-[310px] animate-fadeIn">
                  <div className="text-[11px] font-bold text-slate-600 tracking-normal mb-2 pb-1.5 border-b border-slate-100 sticky top-0 bg-white z-10 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 text-[10px] font-extrabold flex items-center justify-center shrink-0">3</span>
                    <span>Yakıt Tipi</span>
                  </div>
                  {FUELS.map(fuel => {
                    const isSelected = selectedFuel === fuel;
                    return (
                      <div 
                        key={fuel}
                        onClick={() => updateFormData({ 
                          selectedFuel: fuel, 
                          selectedBrand: null, 
                          selectedSeries: null, 
                          selectedModel: null, 
                          selectedPackage: null, 
                          isFinalConfirmed: false 
                        })}
                        style={isSelected ? arrowTabStyle : {}}
                        className={`px-3 py-2 text-xs font-semibold cursor-pointer transition-all flex items-center ${
                          isSelected 
                            ? 'bg-[#EEF1F6] text-slate-900 font-bold pr-4' 
                            : 'hover:bg-slate-50 text-slate-700 rounded'
                        }`}
                      >
                        <span className="truncate">{fuel}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Sütun 4: Marka */}
              {selectedFuel && (
                <div className="w-44 border-r border-slate-100 pr-1 shrink-0 space-y-1 overflow-y-auto max-h-[310px] animate-fadeIn">
                  <div className="text-[11px] font-bold text-slate-600 tracking-normal mb-2 pb-1.5 border-b border-slate-100 sticky top-0 bg-white z-10 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 text-[10px] font-extrabold flex items-center justify-center shrink-0">4</span>
                    <span>Marka</span>
                  </div>
                  {brands.map(b => {
                    const isSelected = selectedBrand?.id === b.id;
                    return (
                      <div 
                        key={b.id}
                        onClick={() => handleBrandClick(b)}
                        style={isSelected ? arrowTabStyle : {}}
                        className={`px-3 py-2 text-xs font-semibold cursor-pointer transition-all flex items-center ${
                          isSelected 
                            ? 'bg-[#EEF1F6] text-slate-900 font-bold pr-4' 
                            : 'hover:bg-slate-50 text-slate-700 rounded'
                        }`}
                      >
                        <span className="truncate">{b.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Sütun 5: Seri */}
              {selectedBrand && (
                <div className="w-44 border-r border-slate-100 pr-1 shrink-0 space-y-1 overflow-y-auto max-h-[310px] animate-fadeIn">
                  <div className="text-[11px] font-bold text-slate-600 tracking-normal mb-2 pb-1.5 border-b border-slate-100 sticky top-0 bg-white z-10 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 text-[10px] font-extrabold flex items-center justify-center shrink-0">5</span>
                    <span>Seri</span>
                  </div>
                  {seriesList.map(s => {
                    const isSelected = selectedSeries?.id === s.id;
                    return (
                      <div 
                        key={s.id}
                        onClick={() => handleSeriesClick(s)}
                        style={isSelected ? arrowTabStyle : {}}
                        className={`px-3 py-2 text-xs font-semibold cursor-pointer transition-all flex items-center ${
                          isSelected 
                            ? 'bg-[#EEF1F6] text-slate-900 font-bold pr-4' 
                            : 'hover:bg-slate-50 text-slate-700 rounded'
                        }`}
                      >
                        <span className="truncate">{s.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Sütun 6: Model */}
              {selectedSeries && (
                <div className="w-44 border-r border-slate-100 pr-1 shrink-0 space-y-1 overflow-y-auto max-h-[310px] animate-fadeIn">
                  <div className="text-[11px] font-bold text-slate-600 tracking-normal mb-2 pb-1.5 border-b border-slate-100 sticky top-0 bg-white z-10 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 text-[10px] font-extrabold flex items-center justify-center shrink-0">6</span>
                    <span>Model</span>
                  </div>
                  {modelsList.map(m => {
                    const isSelected = selectedModel?.id === m.id;
                    return (
                      <div 
                        key={m.id}
                        onClick={() => handleModelClick(m)}
                        style={isSelected ? arrowTabStyle : {}}
                        className={`px-3 py-2 text-xs font-semibold cursor-pointer transition-all flex items-center ${
                          isSelected 
                            ? 'bg-[#EEF1F6] text-slate-900 font-bold pr-4' 
                            : 'hover:bg-slate-50 text-slate-700 rounded'
                        }`}
                      >
                        <span className="truncate">{m.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Sütun 7: Paket / Donanım */}
              {selectedModel && (
                <div className="w-44 border-r border-slate-100 pr-1 shrink-0 space-y-1 overflow-y-auto max-h-[310px] animate-fadeIn">
                  <div className="text-[11px] font-bold text-slate-600 tracking-normal mb-2 pb-1.5 border-b border-slate-100 sticky top-0 bg-white z-10 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 text-[10px] font-extrabold flex items-center justify-center shrink-0">7</span>
                    <span>Paket / Donanım</span>
                  </div>
                  {packagesList.map(p => {
                    const isSelected = selectedPackage?.id === p.id;
                    return (
                      <div 
                        key={p.id}
                        onClick={() => updateFormData({ selectedPackage: p, isFinalConfirmed: false })}
                        style={isSelected ? arrowTabStyle : {}}
                        className={`px-3 py-2 text-xs font-semibold cursor-pointer transition-all flex items-center ${
                          isSelected 
                            ? 'bg-[#EEF1F6] text-slate-900 font-bold pr-4' 
                            : 'hover:bg-slate-50 text-slate-700 rounded'
                        }`}
                      >
                        <span className="truncate">{p.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Sütun 8: Son Teyit Kartı */}
              {selectedPackage && (
                <div className="w-64 bg-slate-50 border border-slate-200 rounded-md p-3 shrink-0 flex flex-col justify-between animate-fadeIn">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 font-mono block uppercase">EŞLEŞEN ARAÇ KÜNYESİ</span>
                    
                    <div 
                      onClick={() => updateFormData({ isFinalConfirmed: true })}
                      className={`p-3 rounded-md border bg-white cursor-pointer transition-all ${
                        isFinalConfirmed ? 'border-rose-600 ring-1 ring-rose-600/30' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <input type="radio" checked={isFinalConfirmed} onChange={() => updateFormData({ isFinalConfirmed: true })} className="mt-0.5" />
                        <div>
                          <span className="text-[10px] font-bold text-rose-600 block">{selectedYear}</span>
                          <h4 className="text-xs font-extrabold text-slate-900 leading-snug mt-0.5">
                            {selectedSeries?.name} {selectedModel?.name} {selectedPackage?.name}
                          </h4>
                          <p className="text-[10px] text-slate-500 font-medium mt-1">
                            {selectedFuel}, Otomatik
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 mt-3">
                    Seçtiğiniz araç kombinasyonu ilanınıza otomatik bağlanacaktır.
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* 4. PANEL İÇİNE ENTEGRE EDİLMİŞ BİLGİ METNİ VE YAYINLAMA BUTONU */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
            <p className="text-xs text-slate-500 font-medium">
              İlan bilgileri ve detaylar için araç seçimini tamamlamalısın.
            </p>

            <button 
              disabled={!isFormValid}
              onClick={onNext}
              className="bg-rose-100 disabled:bg-rose-50 disabled:text-rose-300 text-rose-700 font-extrabold text-xs px-8 py-3 rounded transition-all shadow-2xs disabled:cursor-not-allowed cursor-pointer self-end sm:self-auto"
            >
              Devam Et: İlan Detayları ›
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}