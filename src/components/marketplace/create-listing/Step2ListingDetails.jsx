// =========================================================================
// OTO-CV İLAN VERME: 2. ADIM BİLEŞENİ (Step2ListingDetails.jsx)
// İşlev: Modüler panel mimarisiyle ayrıştırılmış İlan Detayları Sayfası.
// Panel 2: Yenilenmiş Hiyerarşi (Başlık En Üstte), Sıkı Input Validasyonu
//          ve Orijinal TR Mavi Mühürlü Plaka Mimarisi (Sıfır Emoji).
// =========================================================================

'use client';

import React, { useState, useEffect } from 'react';

// =========================================================================
// KATALOG 1: RENK SWATCH LİSTESİ (24 ADET ÖZEL HEX VE GRADIENT KUTUCUKLARI)
// =========================================================================
const COLOR_OPTIONS = [
  { name: 'Altın', hex: '#FFD700' },
  { name: 'Bej', hex: '#F5F5DC' },
  { name: 'Beyaz', hex: '#FFFFFF', border: true },
  { name: 'Bordo', hex: '#800000' },
  { name: 'Füme', hex: '#505050' },
  { name: 'Gri', hex: '#808080' },
  { name: 'Gri (Gümüş)', hex: '#C0C0C0' },
  { name: 'Gri (metalik)', hex: '#A9A9A9' },
  { name: 'Gri (titanyum)', hex: '#5A5D64' },
  { name: 'Kahverengi', hex: '#8B4513' },
  { name: 'Kırmızı', hex: '#E11D48' },
  { name: 'Lacivert', hex: '#1E1B4B' },
  { name: 'Mavi', hex: '#2563EB' },
  { name: 'Mavi (metalik)', hex: '#1D4ED8' },
  { name: 'Mor', hex: '#800080' },
  { name: 'Pembe', hex: '#FFC0CB' },
  { name: 'Sarı', hex: '#EAB308' },
  { name: 'Siyah', hex: '#000000' },
  { name: 'Şampanya', hex: '#F7E7CE' },
  { name: 'Turkuaz', hex: '#40E0D0' },
  { name: 'Turuncu', hex: '#F97316' },
  { name: 'Yeşil', hex: '#22C55E' },
  { name: 'Yeşil (metalik)', hex: '#15803D' },
  { name: 'Diğer', hex: 'linear-gradient(135deg, #FF0000, #00FF00, #0000FF)' }
];

// =========================================================================
// KATALOG 2: SEÇENEK SİMÜLASYON DİZİLERİ (VİTES, KASA, DURUM, KONUM, DONANIM)
// =========================================================================
const TRANSMISSION_TYPES = ['Otomatik', 'Manuel', 'Yarı Otomatik'];
const BODY_TYPES = ['Sedan', 'Hatchback 5 Kapı', 'Hatchback 3 Kapı', 'SUV / Crossover', 'Station Wagon', 'Coupe', 'Cabrio', 'MPV'];
const VEHICLE_STATUSES = ['İkinci El', 'Sıfır'];

const CITIES = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Kocaeli', 'Gaziantep'];
const DISTRICTS_MOCK = {
  'İstanbul': ['Kadıköy', 'Beşiktaş', 'Üsküdar', 'Ataşehir', 'Şişli', 'Beylikdüzü'],
  'Ankara': ['Çankaya', 'Yenimahalle', 'Keçiören', 'Etimesgut', 'Gölbaşı'],
  'İzmir': ['Karşıyaka', 'Bornova', 'Konak', 'Alsancak', 'Çeşme'],
};

const EQUIPMENT_CATEGORIES = [
  {
    title: 'Güvenlik',
    items: ['ABS', 'ESP / VSA', 'EBD', 'Hava Yastığı (Sürücü)', 'Hava Yastığı (Yolcu)', 'Hava Yastığı (Yan)', 'Kör Nokta Uyarı', 'Şerit Takip Sistemi', 'Isofix']
  },
  {
    title: 'İç Donanım & Konfor',
    items: ['Deri Koltuk', 'Koltuk Isıtma', 'Dijital Klima', 'Hız Sabitleyici (Cruise Control)', 'Panoramik Cam Tavan', 'Start / Stop', 'Anahtarsız Çalıştırma', 'Geri Görüş Kamerası']
  },
  {
    title: 'Dış Donanım & Stil',
    items: ['Alaşım Jant', 'LED Farlar', 'Xenon Far', 'Sis Farı', 'Park Sensörü (Arka)', 'Park Sensörü (Ön)', 'Elektrikli Aynalar', 'Sunroof']
  },
  {
    title: 'Multimedya & Eğlence',
    items: ['Bluetooth', 'Apple CarPlay', 'Android Auto', 'Navigasyon', 'USB / AUX', 'Kablosuz Şarj', 'Ses Sistemi (Premium)']
  }
];

export default function Step2ListingDetails({ formData, updateFormData, onNext, onBack }) {
  // =========================================================================
  // BLOK 1: MERKEZİ STATE HAFIZASI
  // =========================================================================
  
  const [title, setTitle] = useState(formData.title || '');
  const [price, setPrice] = useState(formData.price || '');
  const [mileage, setMileage] = useState(formData.mileage || '');
  const [transmission, setTransmission] = useState(formData.transmission || 'Otomatik');
  const [bodyType, setBodyType] = useState(formData.bodyType || 'Sedan');
  const [selectedColor, setSelectedColor] = useState(formData.color || COLOR_OPTIONS[2]); // Default Beyaz
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
  const [vehicleStatus, setVehicleStatus] = useState(formData.vehicleStatus || 'İkinci El');
  const [plate, setPlate] = useState(formData.plate || '');
  
  const [warranty, setWarranty] = useState(formData.warranty || 'Hayır');
  const [swap, setSwap] = useState(formData.swap || 'Hayır');

  const [city, setCity] = useState(formData.city || 'İstanbul');
  const [district, setDistrict] = useState(formData.district || 'Kadıköy');
  const [description, setDescription] = useState(formData.description || '');
  
  const [hasTramer, setHasTramer] = useState(formData.hasTramer || 'Yok');
  const [tramerAmount, setTramerAmount] = useState(formData.tramerAmount || '');
  const [selectedFeatures, setSelectedFeatures] = useState(formData.selectedFeatures || []);

  // Otomatik İlan Başlığı Oluşturucu Sensör
  useEffect(() => {
    if (!title && formData.selectedBrand) {
      const generatedTitle = `${formData.selectedYear || ''} ${formData.selectedBrand?.name || ''} ${formData.selectedSeries?.name || ''} ${formData.selectedModel?.name || ''}`;
      setTitle(generatedTitle);
      updateFormData({ title: generatedTitle });
    }
  }, [formData.selectedBrand]);

  // Wizard Global State Senkronizatörü
  const handleFieldChange = (field, value) => {
    updateFormData({ [field]: value });
  };

  // =========================================================================
  // BLOK 1.1: SANİTİZER VE INPUT KISITLAMA FONKSİYONLARI (BİNLİK AYRAÇLI & TR PLAKA)
  // =========================================================================

  // 🚀 FİYAT SANİTİZERI (Binlik Nokta Ayraçlı: Örn 2.500.000, Maks 10 Haneli Sayı)
  const handlePriceInput = (rawValue) => {
    const rawNumbers = rawValue.replace(/[^0-9]/g, '');
    if (rawNumbers.length > 10) return;
    
    if (!rawNumbers) {
      setPrice('');
      handleFieldChange('price', '');
      return;
    }

    const formatted = new Intl.NumberFormat('tr-TR').format(rawNumbers);
    setPrice(formatted);
    handleFieldChange('price', formatted);
  };

  // 🚀 KİLOMETRE SANİTİZERI (Binlik Nokta Ayraçlı: Örn 150.000, Maks 7 Haneli Sayı)
  const handleMileageInput = (rawValue) => {
    const rawNumbers = rawValue.replace(/[^0-9]/g, '');
    if (rawNumbers.length > 7) return;

    if (!rawNumbers) {
      setMileage('');
      handleFieldChange('mileage', '');
      return;
    }

    const formatted = new Intl.NumberFormat('tr-TR').format(rawNumbers);
    setMileage(formatted);
    handleFieldChange('mileage', formatted);
  };

  // 🚀 GARAJIM MODÜLÜNDEN ALINAN BİREBİR TR PLAKA ALGORİTMASI
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

  const handlePlateInput = (rawValue) => {
    const formatted = formatTRPlate(rawValue);
    setPlate(formatted);
    handleFieldChange('plate', formatted);
  };

  // Donanım Ekleme/Çıkarma Handlerı
  const toggleFeature = (featureName) => {
    const updated = selectedFeatures.includes(featureName)
      ? selectedFeatures.filter(item => item !== featureName)
      : [...selectedFeatures, featureName];
    
    setSelectedFeatures(updated);
    handleFieldChange('selectedFeatures', updated);
  };

  // Başlık Karakter Sayacı
  const MAX_TITLE_LENGTH = 70;
  const remainingTitleChars = MAX_TITLE_LENGTH - title.length;

  // 2. Adım Form Geçerlilik Hesabı
  const isStep2Valid = price !== '' && mileage !== '' && title !== '';

  return (
    <div className="pb-24 text-slate-900 select-none font-sans antialiased">
      
      {/* =========================================================================
          BLOK 2: YAPIŞKAN AKSİYON BARI (STICKY HEADER)
         ========================================================================= */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              İlan Bilgileri
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              <span className="text-rose-600 font-bold">*</span> İlan fiyatı, kilometre ve araç detaylarını eksiksiz doldurun.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onBack}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-5 py-3 rounded-md transition-colors cursor-pointer"
            >
              ‹ Adım 1'e Dön
            </button>

            <button 
              disabled={!isStep2Valid}
              onClick={onNext}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-100 disabled:text-indigo-300 text-white font-bold text-xs px-7 py-3 rounded-md transition-all shadow-2xs disabled:cursor-not-allowed cursor-pointer"
            >
              Devam Et: Ön İzleme ›
            </button>
          </div>

        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">

        {/* =========================================================================
            PANEL 1: SEÇİLEN ARAÇ KÜNYESİ ÖZETİ
           ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 overflow-hidden">
            <div className="w-11 h-11 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 17a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm8 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm-11-2 1.6-4.8A2 2 0 0 1 8.5 9h7c.8 0 1.6.4 2 1.2L19 15M3 15h18v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2Z" />
              </svg>
            </div>

            <div className="space-y-0.5 overflow-hidden">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 font-mono">
                Eşleşen Araç
              </span>
              <h3 className="text-sm font-black text-slate-900 truncate">
                {formData.selectedYear} {formData.selectedBrand?.name} {formData.selectedSeries?.name} {formData.selectedModel?.name} {formData.selectedPackage?.name}
              </h3>
            </div>
          </div>

          <button
            onClick={onBack}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 shrink-0 cursor-pointer"
          >
            Düzenle
          </button>
        </div>

        {/* =========================================================================
            PANEL 2: TEMEL İLAN BİLGİLERİ (BİNLİK AYRAÇLI & GARAJDAN ALINAN ORİJİNAL TR PLAKA)
           ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-sm space-y-6">
          
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Temel İlan Bilgileri</h3>
          </div>

          {/* 📌 PANEL 2.1: EN ÜSTTE İLAN BAŞLIĞI VE KARAKTER SAYAÇ BARI */}
          <div className="space-y-1.5 bg-slate-50/60 p-4 rounded-lg border border-slate-200/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <span className="text-rose-600 font-bold">*</span>
                <span>İlan Başlığı</span>
              </label>
              <span className="text-[11px] font-mono text-slate-400 font-semibold">
                {remainingTitleChars} karakter kaldı
              </span>
            </div>
            
            <input
              type="text"
              maxLength={MAX_TITLE_LENGTH}
              value={title}
              onChange={(e) => { setTitle(e.target.value); handleFieldChange('title', e.target.value); }}
              placeholder="Örn: Sahibinden Temiz Boyasız Düşük Kilometre"
              className="w-full border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-md py-2.5 px-3.5 text-sm font-semibold text-slate-900 bg-white outline-none transition-all placeholder:font-normal placeholder:text-slate-400 shadow-2xs"
            />
          </div>

          {/* 📌 PANEL 2.2: GRID ROW 1 - FİYAT (BİNLİK AYRAÇLI), KİLOMETRE, VİTES, KASA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. SATIŞ FİYATI (BİNLİK AYRAÇLI: 2.343.232.423 TL) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span className="text-rose-600 font-bold">*</span>
                <span>Fiyat</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={price}
                  onChange={(e) => handlePriceInput(e.target.value)}
                  placeholder="0"
                  className="w-full border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-md py-2.5 pl-3.5 pr-10 text-sm font-mono font-bold text-slate-900 outline-none transition-all"
                />
                <span className="absolute right-3 text-xs font-bold text-slate-400 font-mono">TL</span>
              </div>
            </div>

            {/* 2. KİLOMETRE (BİNLİK AYRAÇLI: 3.242.343 KM) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span className="text-rose-600 font-bold">*</span>
                <span>Kilometre</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={mileage}
                  onChange={(e) => handleMileageInput(e.target.value)}
                  placeholder="0"
                  className="w-full border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-md py-2.5 pl-3.5 pr-10 text-sm font-mono font-bold text-slate-900 outline-none transition-all"
                />
                <span className="absolute right-3 text-xs font-bold text-slate-400 font-mono">KM</span>
              </div>
            </div>

            {/* 3. VİTES TİPİ */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span className="text-rose-600 font-bold">*</span>
                <span>Vites Tipi</span>
              </label>
              <select
                value={transmission}
                onChange={(e) => { setTransmission(e.target.value); handleFieldChange('transmission', e.target.value); }}
                className="w-full border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-md py-2.5 px-3 text-sm font-semibold text-slate-800 bg-white outline-none cursor-pointer"
              >
                {TRANSMISSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* 4. KASA TİPİ */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span className="text-rose-600 font-bold">*</span>
                <span>Kasa Tipi</span>
              </label>
              <select
                value={bodyType}
                onChange={(e) => { setBodyType(e.target.value); handleFieldChange('bodyType', e.target.value); }}
                className="w-full border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-md py-2.5 px-3 text-sm font-semibold text-slate-800 bg-white outline-none cursor-pointer"
              >
                {BODY_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

          </div>

          {/* 📌 PANEL 2.3: GRID ROW 2 - RENK, ARAÇ DURUMU, TR STANDARTLARINDA MÜHÜRLÜ PLAKA */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            
            {/* RENK SEÇİMİ */}
            <div className="space-y-1.5 relative">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span className="text-rose-600 font-bold">*</span>
                <span>Renk</span>
              </label>
              
              <div 
                onClick={() => setColorDropdownOpen(!colorDropdownOpen)}
                className="w-full border border-slate-200 hover:border-slate-300 focus:border-indigo-600 rounded-md py-2.5 px-3 text-sm font-semibold text-slate-800 bg-white outline-none cursor-pointer flex items-center justify-between shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <span 
                    className="w-4 h-4 rounded-xs border border-slate-300 shrink-0 shadow-2xs" 
                    style={{ background: selectedColor?.hex || '#FFFFFF' }}
                  />
                  <span>{selectedColor?.name || selectedColor || 'Beyaz'}</span>
                </div>
                <span className="text-xs text-slate-400">▼</span>
              </div>

              {colorDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-xl z-30 max-h-56 overflow-y-auto p-1.5 space-y-0.5 animate-fadeIn">
                  {COLOR_OPTIONS.map((c) => (
                    <div
                      key={c.name}
                      onClick={() => {
                        setSelectedColor(c);
                        handleFieldChange('color', c);
                        setColorDropdownOpen(false);
                      }}
                      className={`flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-md cursor-pointer transition-colors ${
                        (selectedColor?.name || selectedColor) === c.name ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span 
                        className="w-4 h-4 rounded-xs border border-slate-300 shrink-0 shadow-2xs" 
                        style={{ background: c.hex }}
                      />
                      <span>{c.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ARAÇ DURUMU */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span className="text-rose-600 font-bold">*</span>
                <span>Araç Durumu</span>
              </label>
              <select
                value={vehicleStatus}
                onChange={(e) => { setVehicleStatus(e.target.value); handleFieldChange('vehicleStatus', e.target.value); }}
                className="w-full border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-md py-2.5 px-3 text-sm font-semibold text-slate-800 bg-white outline-none cursor-pointer"
              >
                {VEHICLE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

           {/* 🚘 TR STANDARTLARINDA PLAKA KUTUSU (BOYUTU DİĞER INPUTLARLA BİREBİR EŞİTLENMİŞ) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span className="text-rose-600 font-bold">*</span>
                <span>Plaka</span>
              </label>
              
              <div className="relative flex items-center border border-slate-200 focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-600 rounded-md overflow-hidden bg-white shadow-2xs transition-all h-[42px]">
                {/* SOL MAVİ TR ŞERİT (EŞİT YÜKSEKLİKTE VE BÜYÜTÜLMÜŞ ORTALI TR) */}
                <div className="bg-[#003399] text-white w-9 h-full flex items-center justify-center shrink-0 select-none">
                  <span className="text-xs font-black font-mono tracking-tight">TR</span>
                </div>

                {/* PLAKA INPUT METNİ */}
                <input
                  type="text"
                  value={plate}
                  onChange={(e) => handlePlateInput(e.target.value)}
                  placeholder="34 ABC 123"
                  className="w-full bg-transparent border-none outline-none text-sm font-mono font-bold text-slate-900 tracking-widest pl-3 uppercase placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-300"
                />
              </div>

              <p className="text-[10px] text-slate-500 font-medium leading-tight pt-0.5">
                EİDS (Elektronik İlan Doğrulama Sistemi) üzerinden satış yetkisi sorgulamak için zorunludur.
              </p>
            </div>

          </div>

          {/* 📌 PANEL 2.4: GARANTİ VE TAKAS SEÇENEKLERİ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span className="text-rose-600 font-bold">*</span>
                <span>Garanti Durumu</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['Evet', 'Hayır'].map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => { setWarranty(option); handleFieldChange('warranty', option); }}
                    className={`py-2 px-3 text-xs font-bold rounded-md border transition-all cursor-pointer ${
                      warranty === option
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span className="text-rose-600 font-bold">*</span>
                <span>Takas Olur mu?</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['Evet', 'Hayır'].map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => { setSwap(option); handleFieldChange('swap', option); }}
                    className={`py-2 px-3 text-xs font-bold rounded-md border transition-all cursor-pointer ${
                      swap === option
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* =========================================================================
            PANEL 3: ARAÇ KONUM BİLGİLERİ (İL, İLÇE)
           ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Araç Konumu</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span className="text-rose-600 font-bold">*</span>
                <span>İl</span>
              </label>
              <select
                value={city}
                onChange={(e) => {
                  const newCity = e.target.value;
                  setCity(newCity);
                  handleFieldChange('city', newCity);
                  const firstDist = DISTRICTS_MOCK[newCity]?.[0] || '';
                  setDistrict(firstDist);
                  handleFieldChange('district', firstDist);
                }}
                className="w-full border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-md py-2.5 px-3 text-sm font-semibold text-slate-800 bg-white outline-none cursor-pointer"
              >
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span className="text-rose-600 font-bold">*</span>
                <span>İlçe</span>
              </label>
              <select
                value={district}
                onChange={(e) => { setDistrict(e.target.value); handleFieldChange('district', e.target.value); }}
                className="w-full border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-md py-2.5 px-3 text-sm font-semibold text-slate-800 bg-white outline-none cursor-pointer"
              >
                {(DISTRICTS_MOCK[city] || ['Merkez']).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* =========================================================================
            PANEL 4: EKSPERTİZ VE TRAMER BİLGİSİ
           ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.259 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.105-2.574-.305-3.749A12.001 12.001 0 0112 2.713z" />
            </svg>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Hasar Kaydı & Tramer</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-lg border border-slate-200/80">
              <span className="text-xs font-bold text-slate-800">Tramer Kaydı Var mı?</span>
              <div className="flex gap-2">
                {['Yok', 'Var'].map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => { setHasTramer(option); handleFieldChange('hasTramer', option); }}
                    className={`py-1.5 px-4 text-xs font-bold rounded-md border transition-all cursor-pointer ${
                      hasTramer === option
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {hasTramer === 'Var' && (
              <div className="space-y-1.5 animate-fadeIn">
                <label className="text-xs font-bold text-slate-700">Tramer Hasar Tutarı</label>
                <div className="relative flex items-center max-w-xs">
                  <input
                    type="text"
                    value={tramerAmount}
                    onChange={(e) => handlePriceInput(e.target.value)}
                    placeholder="0"
                    className="w-full border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-md py-2.5 pl-3.5 pr-10 text-sm font-mono font-bold text-slate-900 outline-none"
                  />
                  <span className="absolute right-3 text-xs font-bold text-slate-400 font-mono">TL</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            PANEL 5: ARAÇ DONANIMLARI & ÖZELLİKLERİ
           ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
              <h3 className="text-base font-black text-slate-900 tracking-tight">Araç Donanım Özellikleri</h3>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded border border-indigo-100">
              {selectedFeatures.length} Seçildi
            </span>
          </div>

          <div className="space-y-6">
            {EQUIPMENT_CATEGORIES.map((cat, idx) => (
              <div key={idx} className="space-y-2.5">
                <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider font-mono">
                  {cat.title}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {cat.items.map(item => {
                    const isChecked = selectedFeatures.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleFeature(item)}
                        className={`p-2.5 text-left text-xs font-semibold rounded-md border transition-all flex items-center justify-between cursor-pointer ${
                          isChecked
                            ? 'bg-indigo-50/80 border-indigo-600 text-indigo-900 font-bold shadow-2xs'
                            : 'bg-slate-50/50 border-slate-200/80 text-slate-700 hover:bg-slate-100/70'
                        }`}
                      >
                        <span className="truncate mr-1">{item}</span>
                        <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] shrink-0 border ${
                          isChecked ? 'bg-indigo-600 border-indigo-600 text-white font-bold' : 'border-slate-300 bg-white'
                        }`}>
                          {isChecked && '✓'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* =========================================================================
            PANEL 6: İLAN AÇIKLAMASI
           ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              <h3 className="text-base font-black text-slate-900 tracking-tight">İlan Açıklaması</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono font-medium">
              {description.length} / 2000
            </span>
          </div>

          <textarea
            rows="6"
            maxLength={2000}
            value={description}
            onChange={(e) => { setDescription(e.target.value); handleFieldChange('description', e.target.value); }}
            placeholder="Aracınızın bakımları, ekstra aksesuarları ve satış koşulları hakkında detaylı bilgi yazın..."
            className="w-full border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-md p-3.5 text-sm font-normal text-slate-900 outline-none transition-all leading-relaxed"
          />
        </div>

        {/* =========================================================================
            BLOK 3: ALT AKSİYON BUTONLARI (BOTTOM BAR)
           ========================================================================= */}
        <div className="flex items-center justify-between pt-4 pb-12">
          <button
            onClick={onBack}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-6 py-3.5 rounded-md transition-colors cursor-pointer"
          >
            ‹ 1. Adıma Dön
          </button>

          <button 
            disabled={!isStep2Valid}
            onClick={onNext}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-100 disabled:text-indigo-300 text-white font-bold text-xs px-8 py-3.5 rounded-md transition-all shadow-md disabled:cursor-not-allowed cursor-pointer"
          >
            Devam Et: Ön İzleme ve Yayınla ›
          </button>
        </div>

      </div>
    </div>
  );
}