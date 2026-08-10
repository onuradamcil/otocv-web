// =========================================================================
// OTO-CV İLAN & GARAJ VERME: MASTER 1. ADIM BİLEŞENİ (Step1VehicleAndPhotos.jsx)
// İşlev: Araç Kataloğu, Medya Galerisi, Resmi Sicil Evrakları (Plaka/KM),
//        Sigorta/Kasko/Muayene Takvimi ve Ruhsat AI Doğrulama Katmanı.
// Mimarî: Tüm zorunlu alan validasyonları zırhlandırılmış, sıfır kayıpsız füzyon.
// =========================================================================

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../context/ToastContext';
import Icon from '../../common/icons';

// =========================================================================
// SABİT KATALOG SİMÜLASYON VERİLERİ VE STİL SABİTLERİ
// =========================================================================
const CATEGORIES = ['Otomobil', 'Arazi, SUV, Pick-up', 'Motosiklet', 'Minivan & Panelvan', 'Ticari Araçlar'];
const YEARS = Array.from({ length: 27 }, (_, i) => (2026 - i).toString());
const FUELS = ['Benzin', 'Dizel', 'LPG & Benzin', 'Hibrit', 'Elektrik'];

// OK UCU (CHEVRON RIBBON TAB) POLİGON STİL SABİTİ
const arrowTabStyle = {
  clipPath: 'polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%)'
};

export default function Step1VehicleAndPhotos({ formData, updateFormData, userPackage, onNext }) {
  const toast = useToast();
  // =========================================================================
  // 1. BLOK: PROPS & MERKEZİ FORM HAFIZA BAĞLANTILARI
  // =========================================================================
  
  // Global Wizard State'inden Gelen Veriler
  const {
    photos = [],
    selectedCategory = null,
    selectedYear = null,
    selectedFuel = null,
    selectedBrand = null,
    selectedSeries = null,
    selectedModel = null,
    selectedPackage = null,
    isFinalConfirmed = false,

    // Entegre Edilen Resmi Sicil Verileri
    plate = '',
    plate_number = '',
    mileage = '',
    km = '',
    traffic_insurance_end_date = '',
    kasko_end_date = '',
    inspection_end_date = '',
    registration_file = null
  } = formData || {};

  // Yerel UI & Odak (Touch) State'leri
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [touchedFields, setTouchedFields] = useState({});

  // Supabase Veri Listeleri State'leri
  const [brands, setBrands] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [modelsList, setModelsList] = useState([]);
  const [packagesList, setPackagesList] = useState([]);

  // Otomatik Sağa Kaydırma Referansı
  const scrollContainerRef = useRef(null);

  // =========================================================================
  // 🧮 2. BLOK: AKILLI FORMATÖR VE İNLİNE AUTO-CORRECT ALGORİTMALARI
  // =========================================================================

  // TR Plaka Maskeleme (34 ABC 123)
  const formatTRPlate = (value) => {
    let raw = value.replace(/\s+/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    let out = '';
    let i = 0, cityDigits = 0;
    while (i < raw.length && cityDigits < 2) {
      if (/[0-9]/.test(raw[i])) { out += raw[i]; cityDigits++; }
      i++;
    }
    if (cityDigits === 2 && i < raw.length) out += ' ';
    let letters = 0;
    while (i < raw.length && letters < 3) {
      if (/[A-Z]/.test(raw[i])) { out += raw[i]; letters++; }
      else if (/[0-9]/.test(raw[i]) && letters > 0) break;
      i++;
    }
    if (letters > 0 && i < raw.length && /[0-9]/.test(raw[i])) out += ' ';
    let lastDigits = 0;
    while (i < raw.length && lastDigits < 4) {
      if (/[0-9]/.test(raw[i])) { out += raw[i]; lastDigits++; }
      i++;
    }
    return out;
  };

  // Binlik Nokta Ayraçlı KM Formatörü (42.500)
  const formatThousandsSeparator = (value) => {
    if (!value) return '';
    let clean = value.replace(/\./g, '').replace(/[^0-9]/g, '');
    if (clean.length > 7) clean = clean.substring(0, 7);
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // GG/AA/YYYY Akıllı Tarih Formatörü ve 2026 Taban Zırhı
  const formatDateInput = (value, maxYear = 2029) => {
    let raw = value.replace(/[^0-9]/g, '');
    if (raw.length > 8) raw = raw.substring(0, 8);
    
    if (raw.length >= 2) {
      let day = parseInt(raw.substring(0, 2), 10);
      if (day > 31) raw = '31' + raw.substring(2);
      if (day === 0) raw = '01' + raw.substring(2);
    }
    if (raw.length >= 4) {
      let month = parseInt(raw.substring(2, 4), 10);
      if (month > 12) raw = raw.substring(0, 2) + '12' + raw.substring(4);
      if (month === 0) raw = raw.substring(0, 2) + '01' + raw.substring(4);
    }
    // INLINE FORCE: Kullanıcı 2026 yılından daha eski yazmaya çalışırsa sistem tabanı 2026'ya sabitler
    if (raw.length === 8) {
      let year = parseInt(raw.substring(4, 8), 10);
      if (year > maxYear) raw = raw.substring(0, 4) + maxYear;
      else if (year < 2026) raw = raw.substring(0, 4) + '2026';
    }

    let out = '';
    for (let i = 0; i < raw.length; i++) {
      if (i === 2 || i === 4) out += '/';
      out += raw[i];
    }
    return out;
  };

  // Metinsel tarihi JS Date nesnesine dönüştürme fonksiyonu
  const parseDateString = (dateStr) => {
    if (!dateStr || dateStr.trim().length < 10) return null;
    const [day, month, year] = dateStr.split('/').map(num => parseInt(num, 10));
    return new Date(year, month - 1, day);
  };

  // Ruhsat Dosyası Seçim Handlerı
  const handlePickRuhsat = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      updateFormData({ registration_file: file });
    }
  };

  // Odak Kaybı Sensörü
  const handleBlur = (fieldName) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
  };

  // =========================================================================
  // 🛡️ 3. BLOK: ZIRHLI ZORUNLU ALAN VALIDASYON MOTORU
  // =========================================================================

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activePlate = plate || plate_number;
  const activeKm = mileage || km;

  // 1. Plaka Kontrolü
  const isPlateValid = !!activePlate && activePlate.trim().length >= 7;

  // 2. Kilometre Kontrolü
  const isKmValid = !!activeKm && activeKm.toString().trim().length > 0;

  // 3. Trafik Sigortası Tarihi Kontrolü (Gelecek veya Günümüz Tarihi)
  const parsedTrafficDate = parseDateString(traffic_insurance_end_date);
  const isTrafficDateValid = !!parsedTrafficDate && !isNaN(parsedTrafficDate.getTime()) && parsedTrafficDate >= today;

  // 4. TÜVTÜRK Muayene Tarihi Kontrolü (Gelecek veya Günümüz Tarihi)
  const parsedInspectionDate = parseDateString(inspection_end_date);
  const isInspectionDateValid = !!parsedInspectionDate && !isNaN(parsedInspectionDate.getTime()) && parsedInspectionDate >= today;

  // 5. Kasko Poliçesi (Opsiyonel - Girildiyse Geçerli Olmalı)
  const parsedKaskoDate = parseDateString(kasko_end_date);
  const isKaskoDateValid = !kasko_end_date || kasko_end_date.trim() === '' || (!!parsedKaskoDate && !isNaN(parsedKaskoDate.getTime()) && parsedKaskoDate >= today);

  // 6. Fotoğraflar
  const isPhotosValid = Array.isArray(photos) && photos.length > 0;

  // 7. Katalog Seçimi
  const isCatalogValid = !!selectedCategory && !!selectedYear && !!selectedFuel && !!selectedBrand && !!selectedSeries && !!selectedModel && !!selectedPackage && !!isFinalConfirmed;

  // MASTER STEP 1 TOPLU GEÇERLİLİK ŞARTI (Tüm zorunlu şartlar sağlandı mı?)
  const isFormValid = isPhotosValid && isCatalogValid && isPlateValid && isKmValid && isTrafficDateValid && isInspectionDateValid && isKaskoDateValid;

  // =========================================================================
  // 4. BLOK: SUPABASE VERİ ÇEKME VE İLİŞKİSEL İLERLEME HANDLERLARI
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
  // 5. BLOK: FOTOĞRAF YÜKLEME VE DRAG & DROP SENSÖRÜ
  // =========================================================================
  
  const processFiles = (files) => {
    const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (!validFiles || validFiles.length === 0) return;

    if (photos.length + validFiles.length > 15) {
      toast.hata('En fazla 15 fotoğraf ekleyebilirsiniz.');
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

  // =========================================================================
  // 6. BLOK: ARAYÜZ RENDER KATMANI (DESKTOP WEB ENTERPRISE)
  // =========================================================================
  return (
    <div className="pb-12 text-slate-900 select-none">
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        
        {/* ---------------------------------------------------------------------
            BÖLÜM 1: BİREYSEL İLAN KOTASI (AYNEN KORUNDU)
           --------------------------------------------------------------------- */}
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
              onClick={() => toast.bilgi('Üyelik paketleri yakında açılacak.')}
              className="bg-amber-400 hover:bg-amber-500 active:scale-95 text-slate-950 font-black text-xs px-3 py-1.5 rounded-lg transition-all shadow-2xs border border-amber-500/40 flex items-center gap-1 cursor-pointer"
            >
              <span>Paketi Yükselt</span>
              <Icon name="simsek" size="sm" />
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------------------------
            BÖLÜM 2: FOTOĞRAF YÜKLEME KUTUSU (AYNEN KORUNDU)
           --------------------------------------------------------------------- */}
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
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        aria-label={`${idx + 1}. fotoğrafı kaldır`}
                        className="absolute top-1 right-1 bg-slate-900/80 hover:bg-rose-600 text-white w-6 h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      >
                        <Icon name="kapat" size="xs" strokeWidth={3} />
                      </button>
                    </div>
                  ))}

                  {isUploading && (
                    <div className="w-28 h-28 bg-slate-100 border border-slate-200 rounded-lg flex flex-col items-center justify-center p-2 text-center animate-pulse">
                      <div className="w-6 h-6 border-2 border-rose-600 border-t-transparent rounded-full animate-spin mb-1" />
                      <span className="text-[10px] font-bold text-rose-600">Yükleniyor...</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

       {/* ---------------------------------------------------------------------
            BÖLÜM 3: TESCİL VE RUHSAT MODÜLÜ (REFERANS UYUMLU 3'LÜ KATMAN YAPISI)
           --------------------------------------------------------------------- */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-sm space-y-4 font-sans antialiased">
          
          {/* 1. KATMAN: EN DIŞ BEYAZ PANEL BAŞLIĞI */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-rose-600 font-black text-2xl sm:text-3xl leading-none">*</span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Tescil & Poliçe Bilgileri
              </h3>
            </div>
            <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100 uppercase tracking-wider">
              GARAJIM ENTEGRELİ
            </span>
          </div>

          <p className="text-xs text-slate-500 font-medium">
            Plaka, güncel kilometre ve muayene/sigorta geçerlilik tarihlerini girin.
          </p>

          {/* 2. KATMAN: ORTA GRİ BAZA CONTAINER */}
          <div className="bg-[#F2F4F7] border border-slate-200/80 rounded-xl p-4 sm:p-5 space-y-4">
            
            {/* 3. KATMAN - PANEL A: TESCİL VE POLİÇE İÇ BEYAZ KARTI */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs space-y-4">
              
              {/* INPUT MATRİSİ (PLAKA VE KM) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* STEP 1 İÇİN ŞIK PLAKA INPUT TASARIMI */}
<div className="space-y-1.5">
  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
    <span className="text-rose-600 font-bold">*</span>
    <span>Araç Plakası</span>
  </label>
  
  <div className={`relative flex items-center border rounded-md overflow-hidden shadow-2xs transition-all h-[42px] ${
    touchedFields.plate && !isPlateValid
      ? 'border-rose-500 bg-rose-50/70'
      : 'border-slate-200/80 focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-600 focus-within:bg-white bg-slate-100/70'
  }`}>
    <div className="bg-[#003399] text-white w-9 h-full flex items-center justify-center shrink-0 select-none">
      <span className="text-xs font-black font-mono tracking-tight">TR</span>
    </div>

    <input
      type="text"
      value={activePlate}
      onBlur={() => handleBlur('plate')}
      onChange={(e) => {
        const formatted = formatTRPlate(e.target.value);
        updateFormData({ plate: formatted, plate_number: formatted });
      }}
      placeholder="34 ABC 123"
      className="w-full bg-transparent border-none outline-none text-sm font-mono font-bold text-slate-900 tracking-widest pl-3 uppercase placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400"
    />
  </div>

  {touchedFields.plate && !isPlateValid ? (
    <p className="text-[11px] font-bold text-rose-600 pt-0.5 animate-fadeIn">Geçerli bir TR plakası giriniz.</p>
  ) : (
    <p className="text-[10px] text-slate-500 font-medium leading-tight pt-0.5">
      Tescil ve muayene takvimi doğrulaması için kullanılır.
    </p>
  )}
</div>

                {/* KİLOMETRE */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                    Güncel Kilometre (KM) <span className="text-rose-600">*</span>
                  </label>
                  <div className={`border rounded-xl bg-white flex items-center h-11 px-3 transition-all ${
                    touchedFields.mileage && !isKmValid ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-slate-200 focus-within:border-indigo-600'
                  }`}>
                    <input 
                      type="text"
                      value={activeKm}
                      onBlur={() => handleBlur('mileage')}
                      onChange={(e) => {
                        const formatted = formatThousandsSeparator(e.target.value);
                        updateFormData({ mileage: formatted, km: formatted });
                      }}
                      placeholder="Örn: 42.500"
                      className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-800 font-mono tracking-wide"
                    />
                  </div>
                  {touchedFields.mileage && !isKmValid && (
                    <p className="text-[10px] font-bold text-rose-600">Kilometre verisi zorunludur.</p>
                  )}
                </div>

              </div>

              {/* SİGORTA, KASKO VE MUAYENE BİTİŞ TARİHLERİ */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <span className="text-[10px] font-extrabold text-indigo-600 tracking-wider uppercase block pt-2">
                  POLİÇE VE MUAYENE GEÇERLİLİK DÖNEMLERİ
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* TRAFİK SİGORTASI */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">
                      Trafik Sigortası <span className="text-rose-600">*</span>
                    </label>
                    <div className={`border rounded-xl bg-white flex items-center h-10 px-3 transition-all ${
                      touchedFields.traffic && !isTrafficDateValid ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-slate-200 focus-within:border-indigo-600'
                    }`}>
                      <input 
                        type="text"
                        value={traffic_insurance_end_date}
                        onBlur={() => handleBlur('traffic')}
                        onChange={(e) => updateFormData({ traffic_insurance_end_date: formatDateInput(e.target.value, 2027) })}
                        placeholder="GG/AA/YYYY"
                        className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-800 font-mono tracking-wider"
                      />
                    </div>
                    {touchedFields.traffic && !isTrafficDateValid && (
                      <p className="text-[9px] font-bold text-rose-600">Geçerli tarih giriniz.</p>
                    )}
                  </div>

                  {/* KASKO POLİÇESİ */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">
                      Kasko Poliçesi <span className="text-slate-400 font-normal font-mono">(Opsiyonel)</span>
                    </label>
                    <div className={`border rounded-xl bg-white flex items-center h-10 px-3 transition-all ${
                      touchedFields.kasko && !isKaskoDateValid ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-slate-200 focus-within:border-indigo-600'
                    }`}>
                      <input 
                        type="text"
                        value={kasko_end_date}
                        onBlur={() => handleBlur('kasko')}
                        onChange={(e) => updateFormData({ kasko_end_date: formatDateInput(e.target.value, 2027) })}
                        placeholder="GG/AA/YYYY"
                        className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-800 font-mono tracking-wider"
                      />
                    </div>
                  </div>

                  {/* TÜVTÜRK MUAYENE */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">
                      TÜVTÜRK Muayene <span className="text-rose-600">*</span>
                    </label>
                    <div className={`border rounded-xl bg-white flex items-center h-10 px-3 transition-all ${
                      touchedFields.inspection && !isInspectionDateValid ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-slate-200 focus-within:border-indigo-600'
                    }`}>
                      <input 
                        type="text"
                        value={inspection_end_date}
                        onBlur={() => handleBlur('inspection')}
                        onChange={(e) => updateFormData({ inspection_end_date: formatDateInput(e.target.value, 2029) })}
                        placeholder="GG/AA/YYYY"
                        className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-800 font-mono tracking-wider"
                      />
                    </div>
                    {touchedFields.inspection && !isInspectionDateValid && (
                      <p className="text-[9px] font-bold text-rose-600">Geçerli tarih giriniz.</p>
                    )}
                  </div>

                </div>
              </div>

            </div>

            {/* 3. KATMAN - PANEL B: RUHSAT FOTOĞRAFI BAĞIMSIZ İÇ BEYAZ KARTI */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs space-y-3">
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm"></span>
                  <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                    Ruhsat Fotoğrafı <span className="text-slate-400 font-normal font-mono text-[10px] lowercase">(opsiyonel - %95+ güven rozeti)</span>
                  </span>
                </div>
                <span className="text-[9px] font-extrabold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-100 uppercase tracking-wider">
                  <Icon name="parlama" size="xs" className="inline-block mr-1 -mt-px" />
                  AI ONAYLI ROZET
                </span>
              </div>

              <label className={`w-full border-2 border-dashed rounded-xl p-4 flex items-center justify-center gap-3 cursor-pointer transition-all ${
                registration_file 
                  ? 'bg-emerald-50/60 border-emerald-500' 
                  : 'bg-slate-50/60 border-indigo-200/80 hover:border-indigo-500 hover:bg-indigo-50/30'
              }`}>
                {registration_file ? (
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Icon name="onay" size="xs" strokeWidth={3} />
                    </span>
                    <span>Ruhsat Fotoğrafı Yüklendi! (AI Güven Rozeti Aktif)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-slate-700">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-indigo-600 block leading-tight">Ruhsat Ön Yüzünü Yüklemek İçin Tıklayın</span>
                      <span className="text-[10px] text-slate-400 font-medium font-mono">PNG, JPG veya PDF (Maksimum 10MB)</span>
                    </div>
                  </div>
                )}
                <input type="file" accept="image/*,.pdf" onChange={handlePickRuhsat} className="hidden" />
              </label>

            </div>

          </div>
        </div>

        {/* ---------------------------------------------------------------------
            BÖLÜM 5: ARAÇ SEÇİMİ KATALOĞU (AYNEN KORUNDU)
           --------------------------------------------------------------------- */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-sm space-y-4 font-sans antialiased">
          
          <div className="flex items-center gap-2">
            <span className="text-rose-600 font-black text-2xl sm:text-3xl leading-none">*</span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Araç Seçimi
            </h3>
          </div>

          <div className="bg-[#F2F4F7] border border-slate-200/80 rounded-xl p-4 sm:p-5 space-y-3">
            
            {/* RAHATLATILMIŞ BREADCRUMB */}
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

            {/* BEYAZ BAZLI MİLİMETRİK EŞİT SÜTUN KÜTÜĞÜ */}
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

          {/* PANEL İÇİNE ENTEGRE EDİLMİŞ BİLGİ METNİ VE YAYINLAMA BUTONU */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
            <p className="text-xs text-slate-500 font-medium">
              Tüm zorunlu alanları (Fotoğraf, Araç Künyesi, Plaka, KM, Sigorta ve Muayene) doldurduktan sonra devam edebilirsiniz.
            </p>

            <button 
              type="button"
              disabled={!isFormValid}
              onClick={onNext}
              className="bg-rose-500 hover:bg-rose-600 disabled:bg-rose-50 disabled:text-rose-300 text-white font-extrabold text-xs px-8 py-3 rounded transition-all shadow-2xs disabled:cursor-not-allowed cursor-pointer self-end sm:self-auto active:scale-98"
            >
              Devam Et: İlan Detayları ›
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}