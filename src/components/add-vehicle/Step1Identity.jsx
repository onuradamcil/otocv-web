// =========================================================================
// OTO-CV ADIM 1: RESMİ SİCİL EVRAKLARI (Step1Identity.jsx)
// İşlev: Saf girdi ve maskeleme katmanıdır. Navigasyon butonları içermez.
//        Resimlerin geçici metin adreslerini değil, ham "File" nesnelerini 
//        hafızada tutarak Supabase Storage yükleme hattını eksiksiz tetikler.
// =========================================================================

'use client';

import React, { useState, useEffect } from 'react';

export default function Step1Identity({
  formData,
  setFormData,
  onValidationChanged,
  submitAttempted
}) {
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});

  // =========================================================================
  // 1. BLOK: ANLIK VE KADEMELİ HATA DENETİM MOTORU (ZAMAN ZIRHLI)
  // =========================================================================
  const validateFields = (data) => {
    let tempErrors = {};
    
    // 🧠 REAKTİF ZAMAN ÖLÇER: Sistem 2026 yılına göre milimetrik kıyaslama yapar
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Metinsel tarihi JS Date nesnesine güvenle dönüştüren yardımcı fonksiyon
    const parseDateString = (dateStr) => {
      if (!dateStr || dateStr.trim().length < 10) return null;
      const [day, month, year] = dateStr.split('/').map(num => parseInt(num, 10));
      return new Date(year, month - 1, day);
    };

    if (!data.plate_number || data.plate_number.trim().length < 7) {
      tempErrors.plate_number = 'Geçerli bir TR plakası girilmesi zorunludur.';
    }

    if (!data.km || data.km.toString().trim().length === 0) {
      tempErrors.km = 'Güncel kilometre verisi boş bırakılamaz.';
    }

    // Trafik Sigortası Validasyon ve Geçmiş Zaman Kalkanı
    if (!data.traffic_insurance_end_date || data.traffic_insurance_end_date.trim().length < 10) {
      tempErrors.traffic_insurance_end_date = 'Zorunlu trafik sigortası tarihi eksiksiz olmalıdır.';
    } else {
      const parsedDate = parseDateString(data.traffic_insurance_end_date);
      if (!parsedDate || isNaN(parsedDate.getTime())) {
        tempErrors.traffic_insurance_end_date = 'Geçerli bir tarih formatı giriniz.';
      } else if (parsedDate < today) {
        tempErrors.traffic_insurance_end_date = 'Sigorta bitiş tarihi geçmiş bir tarih olamaz.';
      }
    }

    // TÜVTÜRK Muayene Validasyon ve Geçmiş Zaman Kalkanı
    if (!data.inspection_end_date || data.inspection_end_date.trim().length < 10) {
      tempErrors.inspection_end_date = 'TÜVTÜRK muayene geçerlilik tarihi zorunludur.';
    } else {
      const parsedDate = parseDateString(data.inspection_end_date);
      if (!parsedDate || isNaN(parsedDate.getTime())) {
        tempErrors.inspection_end_date = 'Geçerli bir tarih formatı giriniz.';
      } else if (parsedDate < today) {
        tempErrors.inspection_end_date = 'Muayene geçerlilik tarihi geçmiş bir tarih olamaz.';
      }
    }

    // Kasko Validasyon ve Geçmiş Zaman Kalkanı (Opsiyonel Alan Kontrolü)
    if (data.kasko_end_date && data.kasko_end_date.trim().length === 10) {
      const parsedDate = parseDateString(data.kasko_end_date);
      if (!parsedDate || isNaN(parsedDate.getTime())) {
        tempErrors.kasko_end_date = 'Geçerli bir tarih formatı giriniz.';
      } else if (parsedDate < today) {
        tempErrors.kasko_end_date = 'Kasko bitiş tarihi geçmiş bir tarih olamaz.';
      }
    }

    if (!data.vehicle_images || data.vehicle_images.length === 0) {
      tempErrors.vehicle_images = 'En az 1 adet araç görseli yüklemek zorunludur.';
    }

    setErrors(tempErrors);

    const isValid = Object.keys(tempErrors).length === 0;
    if (onValidationChanged) {
      onValidationChanged(isValid);
    }
  };

  useEffect(() => {
    validateFields(formData);
  }, [formData]);

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // =========================================================================
  // 2. BLOK: FORMATTER VE INLINE AUTO-CORRECT ALGORİTMALARI
  // =========================================================================
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

  const formatThousandsSeparator = (value) => {
    if (!value) return '';
    let clean = value.replace(/\./g, '').replace(/[^0-9]/g, '');
    if (clean.length > 7) clean = clean.substring(0, 7);
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const formatDateInput = (value, maxYear) => {
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
    // 🧠 INLINE FORCE: Kullanıcı 2026 yılından daha eski yazmaya çalışırsa sistem tabanı 2026'ya sabitler
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

  // =========================================================================
  // 3. BLOK: GÖRSEL SEÇİM SÜRÜCÜSÜ (HAM DOSYA KORUMA MODÜLÜ)
  // =========================================================================
  const handlePickVehicleImages = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    
    let currentImages = formData.vehicle_images || [];
    if (currentImages.length >= 5) return;
    
    // 🚀 ÇÖZÜM: Artık önizleme string'i değil, dosyanın ham halini (File) saklıyoruz!
    let updatedList = [...currentImages, ...files];
    if (updatedList.length > 5) updatedList = updatedList.slice(0, 5);
    
    setFormData({ ...formData, vehicle_images: updatedList });
    setTouched((prev) => ({ ...prev, vehicle_images: true }));
  };

  const handleRemoveVehicleImage = (index) => {
    let currentImages = formData.vehicle_images || [];
    const updatedList = currentImages.filter((_, idx) => idx !== index);
    setFormData({ ...formData, vehicle_images: updatedList });
  };

  const handlePickRuhsat = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // 🚀 ÇÖZÜM: Ruhsat için de ham dosya (File) saklanıyor
      setFormData({ ...formData, registration_file: file });
    }
  };

  const shouldShowError = (field) => {
    return touched[field] || submitAttempted;
  };

  return (
    <div className="space-y-6">
      
      {/* GÖRSEL SEÇİM ALANI */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-800 tracking-wide block uppercase">
          Araç Görselleri * <span className="text-slate-400 font-medium font-mono normal-case">(En az 1, Maks 5 Adet)</span>
        </label>
        
        <div className={`w-full bg-slate-50 border p-3 rounded-xl min-h-[120px] flex items-center gap-3 overflow-x-auto ${shouldShowError('vehicle_images') && errors.vehicle_images ? 'border-red-300 bg-red-50/5' : 'border-gray-200/60'}`}>
          {(formData.vehicle_images || []).map((file, index) => {
            // 🚀 ÇÖZÜM: Render anında nesne File ise geçici url üret, değilse direkt bas
            const srcUrl = file instanceof File ? URL.createObjectURL(file) : file;
            return (
              <div key={index} className="w-24 h-20 rounded-lg border border-gray-200 shadow-sm overflow-hidden relative shrink-0 group">
                <img src={srcUrl} alt="Araç Görsel" className="w-full h-full object-cover" />
                <button 
                  type="button"
                  onClick={() => handleRemoveVehicleImage(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full shadow"
                >
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}

          {(!formData.vehicle_images || formData.vehicle_images.length < 5) && (
            <label className="flex-1 min-w-[140px] h-20 border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-lg bg-white flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors text-center px-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="text-[10px] font-bold text-indigo-600">Görsel Ekle</span>
              <input type="file" multiple accept="image/*" onChange={handlePickVehicleImages} className="hidden" />
            </label>
          )}
        </div>
        {shouldShowError('vehicle_images') && errors.vehicle_images && (
          <p className="text-[11px] font-semibold text-red-600">{errors.vehicle_images}</p>
        )}
      </div>

      <div className="w-full h-px bg-gray-100" />

      {/* DETAY INPUT MATRİSİ */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-800 tracking-wider uppercase">Araç Temel Bilgileri</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* PLAKA */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 tracking-wide uppercase">Araç Plakası *</label>
            <div className={`relative flex items-center border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-600/10 bg-white h-12 ${shouldShowError('plate_number') && errors.plate_number ? 'border-red-300 focus-within:border-red-500' : 'border-gray-200 focus-within:border-indigo-600'}`}>
              <div className="bg-[#003399] text-white text-[11px] font-bold flex flex-col items-center justify-end pb-2 w-10 h-full select-none shrink-0 leading-none">
                <span>TR</span>
              </div>
              <input 
                type="text"
                value={formData.plate_number || ''}
                onBlur={() => handleBlur('plate_number')}
                onChange={(e) => setFormData({ ...formData, plate_number: formatTRPlate(e.target.value) })}
                placeholder="34 ABC 123"
                className="w-full bg-transparent border-none outline-none text-base font-bold text-slate-900 font-mono tracking-widest pl-3 uppercase"
              />
            </div>
            {shouldShowError('plate_number') && errors.plate_number && (
              <p className="text-[11px] font-semibold text-red-600">{errors.plate_number}</p>
            )}
          </div>

          {/* KİLOMETRE */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 tracking-wide uppercase">Güncel Kilometre (km) *</label>
            <div className={`border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-600/10 bg-white flex items-center h-12 px-3 ${shouldShowError('km') && errors.km ? 'border-red-300 focus-within:border-red-500' : 'border-gray-200 focus-within:border-indigo-600'}`}>
              <input 
                type="text"
                value={formData.km || ''}
                onBlur={() => handleBlur('km')}
                onChange={(e) => setFormData({ ...formData, km: formatThousandsSeparator(e.target.value) })}
                placeholder="Örn: 42.500"
                className="w-full bg-transparent border-none outline-none text-sm font-bold text-slate-800 font-mono tracking-wide"
              />
            </div>
            {shouldShowError('km') && errors.km && (
              <p className="text-[11px] font-semibold text-red-600">{errors.km}</p>
            )}
          </div>
        </div>

        {/* SİGORTA, KASKO VE MUAYENE DÖNEMLERİ */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold text-indigo-600 tracking-wider uppercase">SİGORTA, KASKO VE MUAYENE DÖNEMLERİ</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* TRAFİK SİGORTASI */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 tracking-tight block uppercase leading-snug">Zorunlu Trafik Sigortası Bitiş *</label>
              <div className={`border rounded-xl focus-within:ring-2 focus-within:ring-indigo-600/10 bg-white flex items-center justify-between h-11 px-3 ${shouldShowError('traffic_insurance_end_date') && errors.traffic_insurance_end_date ? 'border-red-300 focus-within:border-red-500' : 'border-gray-200 focus-within:border-indigo-600'}`}>
                <input 
                  type="text"
                  value={formData.traffic_insurance_end_date || ''}
                  onBlur={() => handleBlur('traffic_insurance_end_date')}
                  onChange={(e) => setFormData({ ...formData, traffic_insurance_end_date: formatDateInput(e.target.value, 2027) })}
                  placeholder="GG/AA/YYYY"
                  className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-800 font-mono tracking-wider"
                />
              </div>
              {shouldShowError('traffic_insurance_end_date') && errors.traffic_insurance_end_date && (
                <p className="text-[10px] font-semibold text-red-600 leading-tight">{errors.traffic_insurance_end_date}</p>
              )}
            </div>

            {/* KASKO POLİÇESİ */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 tracking-tight block uppercase leading-snug">Kasko Poliçesi Bitiş Tarihi</label>
              <div className={`border rounded-xl focus-within:ring-2 focus-within:ring-indigo-600/10 bg-white flex items-center justify-between h-11 px-3 ${shouldShowError('kasko_end_date') && errors.kasko_end_date ? 'border-red-300 focus-within:border-red-500' : 'border-gray-200 focus-within:border-indigo-600'}`}>
                <input 
                  type="text"
                  value={formData.kasko_end_date || ''}
                  onBlur={() => handleBlur('kasko_end_date')}
                  onChange={(e) => setFormData({ ...formData, kasko_end_date: formatDateInput(e.target.value, 2027) })}
                  placeholder="GG/AA/YYYY (Opsiyonel)"
                  className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-800 font-mono tracking-wider"
                />
              </div>
              {shouldShowError('kasko_end_date') && errors.kasko_end_date && (
                <p className="text-[10px] font-semibold text-red-600 leading-tight">{errors.kasko_end_date}</p>
              )}
            </div>

            {/* TÜVTÜRK MUAYENE */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 tracking-tight block uppercase leading-snug">TÜVTÜRK Muayene Geçerlilik *</label>
              <div className={`border rounded-xl focus-within:ring-2 focus-within:ring-indigo-600/10 bg-white flex items-center justify-between h-11 px-3 ${shouldShowError('inspection_end_date') && errors.inspection_end_date ? 'border-red-300 focus-within:border-red-500' : 'border-gray-200 focus-within:border-indigo-600'}`}>
                <input 
                  type="text"
                  value={formData.inspection_end_date || ''}
                  onBlur={() => handleBlur('inspection_end_date')}
                  onChange={(e) => setFormData({ ...formData, inspection_end_date: formatDateInput(e.target.value, 2029) })}
                  placeholder="GG/AA/YYYY"
                  className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-800 font-mono tracking-wider"
                />
              </div>
              {shouldShowError('inspection_end_date') && errors.inspection_end_date && (
                <p className="text-[10px] font-semibold text-red-600 leading-tight">{errors.inspection_end_date}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full h-px bg-gray-100" />

      {/* RUHSAT FOTOĞRAFI */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-slate-800 tracking-wide block uppercase">Ruhsat Fotoğrafı (Opsiyonel)</label>
          <div className="bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-md flex items-center gap-1 text-[10px] font-bold text-indigo-700">
            AI ONAYLI
          </div>
        </div>

        <label className={`w-full border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
          formData.registration_file ? 'bg-emerald-50/20 border-emerald-500' : 'bg-slate-50 border-gray-200 hover:border-indigo-400'
        }`}>
          {formData.registration_file ? (
            <span className="text-xs font-bold text-emerald-700">✓ Ruhsat Belgesi Yüklendi! (Rozet Aktif)</span>
          ) : (
            <span className="text-xs font-bold text-indigo-600">Ruhsat Ön Yüzünü Yükle</span>
          )}
          <input type="file" accept="image/*,.pdf" onChange={handlePickRuhsat} className="hidden" />
        </label>
      </div>

    </div>
  );
}