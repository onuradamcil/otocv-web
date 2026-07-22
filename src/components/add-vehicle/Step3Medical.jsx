// =========================================================================
// OTO-CV WEB ADIM 3: MEDİKAL SİCİL & SERVİS GEÇMİŞİ (Step3Medical.jsx)
// İşlev: Emojilerden arındırılmış kurumsal kimlik, akışkan segment seçiciler,
//        üretim yılı tabanlı zaman zırhı and koşullu zorunlu alan kalkanı.
// =========================================================================

'use client';

import React, { useEffect, useState } from 'react';

export default function Step3Medical({ 
  formData, 
  setFormData, 
  onValidationChanged, 
  submitAttempted,
  selectedYear // 🚀 Üst kabuktan gelen araç üretim yılı koruması
}) {
  const [touchedFields, setTouchedFields] = useState({});

  useEffect(() => {
    if (!formData.service_records) {
      setFormData({ ...formData, service_records: [] });
    }
  }, []);

  // =========================================================================
  // 1. BLOK: KOŞULLU VE AKILLI FORM GEÇERLİLİK DENETLEYİCİSİ
  // =========================================================================
  useEffect(() => {
    const records = formData.service_records || [];
    
    if (records.length === 0) {
      if (onValidationChanged) onValidationChanged(true);
      return;
    }

    const isValid = records.every(record => {
      // 🧠 KURAL: Eğer satır tamamen boşsa validasyonu kilitleme (Tescilde elenecek)
      const isEntirelyEmpty = !record.shop_name?.trim() && !record.km && !record.cost && !record.summary && !record.service_date;
      if (isEntirelyEmpty) return true;

      // 🧠 KURAL 2: Eğer tek bir alana dahi giriş yapıldıysa, artık tüm alanlar zorunludur!
      const hasType = !!record.service_type;
      const hasShop = record.shop_name?.trim().length > 0;
      const hasKm = record.km?.toString().trim().length > 0;
      const hasCost = record.cost?.toString().trim().length > 0;
      const hasSummary = record.summary?.trim().length > 0;
      const hasValidDate = record.service_date?.trim().length === 10 && !record.date_error;
      
      return hasType && hasShop && hasKm && hasCost && hasSummary && hasValidDate;
    });

    if (onValidationChanged) {
      onValidationChanged(isValid);
    }
  }, [formData.service_records, onValidationChanged]);

  // =========================================================================
  // 2. BLOK: MEDYA SÜRÜCÜSÜ (CRASH KORUMALI FATURA YÜKLEYİCİ)
  // =========================================================================
  const handleInvoiceUpload = (id, file) => {
    if (!file) return;
    const updated = (formData.service_records || []).map(rec => {
      if (rec.id === id) {
        return { ...rec, invoice_file: file };
      }
      return rec;
    });
    setFormData({ ...formData, service_records: updated });
  };

  // =========================================================================
  // 3. BLOK: ÜRETİM YILI DESTEKLİ GELİŞMİŞ TARİH MASKESİ VE ZAMAN ZIRHI
  // =========================================================================
  const validateAndFormatDate = (value, recordId) => {
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

    let formattedDate = '';
    for (let i = 0; i < raw.length; i++) {
      if (i === 2 || i === 4) formattedDate += '/';
      formattedDate += raw[i];
    }

    let errorMsg = '';
    if (formattedDate.length === 10) {
      const parts = formattedDate.split('/');
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; 
      const year = parseInt(parts[2], 10);
      
      const parsedDate = new Date(year, month, day);
      const today = new Date();

      if (parsedDate.getFullYear() !== year || parsedDate.getMonth() !== month || parsedDate.getDate() !== day) {
        errorMsg = 'Geçersiz takvim tarihi.';
      } else if (parsedDate > today) {
        errorMsg = 'Bakım tarihi gelecek bir tarih olamaz.';
      } else if (selectedYear && year < parseInt(selectedYear, 10)) {
        // 🚀 ÇÖZÜM: Araç üretim yılından daha eski tarih girilmesi durumunda kalkan tetiklenir
        errorMsg = `Bakım tarihi araç üretim yılından (${selectedYear}) eski olamaz.`;
      }
    }

    const updatedRecords = (formData.service_records || []).map(rec => {
      if (rec.id === recordId) {
        return { ...rec, service_date: formattedDate, date_error: errorMsg };
      }
      return rec;
    });
    setFormData({ ...formData, service_records: updatedRecords });
  };

  // =========================================================================
  // 4. BLOK: DİNAMİK SATIR MODÜLLERİ VE AKORDEON DRIVERLARI
  // =========================================================================
  const addNewRecord = () => {
    const closedRecords = (formData.service_records || []).map(rec => ({ ...rec, is_expanded: false }));
    setFormData({
      ...formData,
      service_records: [
        ...closedRecords,
        {
          id: Date.now(),
          service_type: 'Periyodik Bakım',
          shop_name: '',
          km: '',
          cost: '',
          summary: '',
          service_date: '',
          next_service_km: '',
          invoice_file: null,
          is_expanded: true,
          date_error: ''
        }
      ]
    });
  };

  const removeRecord = (idToRemove) => {
    const filtered = (formData.service_records || []).filter(rec => rec.id !== idToRemove);
    if (filtered.length > 0) {
      filtered[filtered.length - 1].is_expanded = true;
    }
    setFormData({ ...formData, service_records: filtered });
  };

  const toggleExpand = (idToToggle) => {
    const updated = (formData.service_records || []).map(rec => {
      if (rec.id === idToToggle) {
        return { ...rec, is_expanded: !rec.is_expanded };
      }
      return rec;
    });
    setFormData({ ...formData, service_records: updated });
  };

  const handleInputChange = (id, field, value) => {
    const updated = (formData.service_records || []).map(rec => {
      if (rec.id === id) {
        let finalValue = value;
        if (field === 'km' || field === 'cost' || field === 'next_service_km') {
          finalValue = value.replace(/[^0-9]/g, '');
          if (finalValue) finalValue = parseInt(finalValue, 10).toLocaleString('tr-TR');
        }
        return { ...rec, [field]: finalValue };
      }
      return rec;
    });
    setFormData({ ...formData, service_records: updated });
  };

  const handleFieldBlur = (recordId, field) => {
    setTouchedFields(prev => ({ ...prev, [`${recordId}-${field}`]: true }));
  };

  const isFieldInvalid = (record, field) => {
    // Eğer satır tamamen boşsa hata boyaması yapıp kullanıcıyı germe
    const isEntirelyEmpty = !record.shop_name?.trim() && !record.km && !record.cost && !record.summary && !record.service_date;
    if (isEntirelyEmpty) return false;

    const isTouched = touchedFields[`${record.id}-${field}`] || submitAttempted;
    const isEmpty = !record[field] || record[field].toString().trim() === '';
    return isTouched && isEmpty;
  };

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      
      {/* ÜST MÜHÜR BADGE */}
      <div className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100/80 px-3 py-1.5 rounded-xl text-indigo-700 text-xs font-bold tracking-wide">
        <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.67 2.67 0 1113.5 17.25l-5.83-5.83m5.83 3.75l-4.17-4.17m4.17 4.17L9.42 11.17M13.5 17.25l-4.17-4.17M11.42 15.17l-4.17-4.17M11.42 15.17L5.58 9.33A2.67 2.67 0 119.33 5.58l5.83 5.83M5.58 9.33l4.17 4.17M5.58 9.33L7.67 11.42M9.33 5.58l4.17 4.17M9.33 5.58L11.42 7.67" />
        </svg>
        MEDİKAL SİCİL & SERVİS GEÇMİŞİ
      </div>

      <div className="space-y-1">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Servis, Bakım ve Parça Değişimi</h2>
        <p className="text-xs md:text-sm text-slate-400 font-medium leading-relaxed">Aracınızın değerini belirleyen en önemli faktör belgelenmiş servis geçmişidir. Dijital pasaportunuzu mühürleyin.</p>
      </div>

      {/* ZERO-STATE REAKTIF KUTUSU */}
      {(!formData.service_records || formData.service_records.length === 0) && (
        <div className="text-center py-10 border border-dashed border-gray-200 rounded-2xl bg-slate-50/40 px-4 space-y-2 animate-fadeIn">
          <p className="text-xs font-semibold text-slate-400 leading-normal max-w-sm mx-auto">Kayıtlı bir geçmiş servis faturanız yok mu? Hiç sorun değil, bu adımı hiçbir şey doldurmadan "Sonraki Adım" diyerek esnekçe geçebilirsiniz.</p>
        </div>
      )}

      {/* DİNAMİK SERVİS MATRİSİ */}
      <div className="space-y-4">
        {(formData.service_records || []).map((record, index) => (
          <div 
            key={record.id}
            className={`border rounded-2xl overflow-hidden transform transition-all duration-500 ease-out origin-top animate-scaleUp ${
              record.is_expanded ? 'bg-white border-indigo-200 shadow-md scale-100' : 'bg-slate-50/70 border-gray-200 hover:border-gray-300 scale-99'
            }`}
          >
            {/* KAPALI KONUM */}
            {!record.is_expanded && (
              <div 
                onClick={() => toggleExpand(record.id)}
                className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 transition-colors duration-200"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 truncate">{record.shop_name || 'Servis Girdisi Düzenleniyor'}</h4>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5 font-mono">
                      {record.service_type} {record.km ? `• ${record.km} km` : ''} {record.cost ? `• ₺${record.cost}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs">
                  {record.invoice_file && <span className="text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md font-bold text-[10px]">Fatura Var</span>}
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                </div>
              </div>
            )}

            {/* AÇIK KONUM */}
            {record.is_expanded && (
              <div className="p-6 space-y-5 bg-white transition-opacity duration-300 animate-fadeIn">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span className="bg-indigo-600 text-white w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-mono font-bold">{index + 1}</span>
                    Servis / Bakım Detayı
                  </h4>
                  <div className="flex items-center gap-2">
                    <button 
                      type="button" onClick={() => removeRecord(record.id)}
                      className="px-2.5 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      Sil
                    </button>
                    <button 
                      type="button" onClick={() => toggleExpand(record.id)}
                      className="px-2.5 py-1.5 text-slate-400 hover:bg-slate-50 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      Kapat
                    </button>
                  </div>
                </div>

                {/* STRIPE TARZI SEGMENT SEÇİCİ */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 tracking-wide block uppercase">İŞLEM TÜRÜ VE KATEGORİZASYON *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-1 bg-slate-50 border border-gray-200 rounded-xl">
                    {['Periyodik Bakım', 'Mekanik Bakım', 'Tamir / Onarım', 'Sarf Malzeme', 'Dış İşlem'].map((type) => {
                      const isSel = record.service_type === type;
                      return (
                        <button
                          key={type} type="button"
                          onClick={() => handleInputChange(record.id, 'service_type', type)}
                          className={`py-2 px-1 rounded-lg text-[10px] sm:text-xs font-bold tracking-tight text-center transition-all ${
                            isSel ? 'bg-[#4F46E5] text-white shadow-sm' : 'bg-white text-slate-600 border border-gray-200/60 hover:text-slate-900'
                          }`}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {/* İŞLEM TARİHİ */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 tracking-wide uppercase">İŞLEM TARİHİ *</label>
                    <input 
                      type="text" placeholder="GG/AA/YYYY" value={record.service_date || ''}
                      onBlur={() => handleFieldBlur(record.id, 'service_date')}
                      className={`w-full px-3 py-2.5 bg-white border rounded-xl font-semibold text-sm font-mono tracking-wide focus:outline-none focus:ring-2 focus:ring-indigo-600/10 transition-all shadow-inner ${
                        record.date_error || mt-0.5 || isFieldInvalid(record, 'service_date') ? 'border-red-300 focus:border-red-500 bg-red-50/5 text-red-900' : 'border-gray-200 focus:border-indigo-600 text-slate-800'
                      }`}
                      onChange={(e) => validateAndFormatDate(e.target.value, record.id)}
                    />
                    {record.date_error && <p className="text-[10px] text-red-600 font-bold tracking-tight">⚠️ {record.date_error}</p>}
                    {!record.date_error && isFieldInvalid(record, 'service_date') && <p className="text-[10px] text-red-600 font-bold tracking-tight">Tarih alanı zorunludur.</p>}
                  </div>

                  {/* KURUM / USTA */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 tracking-wide uppercase">KURUM / USTA *</label>
                    <input 
                      type="text" placeholder="Örn: Borusan Oto" value={record.shop_name || ''} maxLength={50}
                      onBlur={() => handleFieldBlur(record.id, 'shop_name')}
                      className={`w-full px-3 py-2.5 bg-white border rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/10 transition-all shadow-inner ${
                        isFieldInvalid(record, 'shop_name') ? 'border-red-300 focus:border-red-500 bg-red-50/5 text-red-900' : 'border-gray-200 focus:border-indigo-600 text-slate-800'
                      }`}
                      onChange={(e) => handleInputChange(record.id, 'shop_name', e.target.value)}
                    />
                    {isFieldInvalid(record, 'shop_name') && <p className="text-[10px] text-red-600 font-bold tracking-tight">Servis ismi boş bırakılamaz.</p>}
                  </div>

                  {/* YAPILAN KİLOMETRE */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 tracking-wide uppercase">YAPILAN KİLOMETRE *</label>
                    <input 
                      type="text" placeholder="Örn: 60.000" value={record.km || ''} maxLength={11}
                      onBlur={() => handleFieldBlur(record.id, 'km')}
                      className={`w-full px-3 py-2.5 bg-white border rounded-xl font-semibold text-sm font-mono tracking-wide focus:outline-none focus:ring-2 focus:ring-indigo-600/10 transition-all shadow-inner ${
                        isFieldInvalid(record, 'km') ? 'border-red-300 focus:border-red-500 bg-red-50/5 text-red-900' : 'border-gray-200 focus:border-indigo-600 text-slate-800'
                      }`}
                      onChange={(e) => handleInputChange(record.id, 'km', e.target.value)}
                    />
                    {isFieldInvalid(record, 'km') && <p className="text-[10px] text-red-600 font-bold tracking-tight">Kilometre kaydı zorunludur.</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* İŞLEM TUTARI */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 tracking-wide uppercase">İŞLEM TUTARI (TL) *</label>
                    <input 
                      type="text" placeholder="Örn: 15.000" value={record.cost || ''} maxLength={12}
                      onBlur={() => handleFieldBlur(record.id, 'cost')}
                      className={`w-full px-3 py-2.5 bg-white border rounded-xl font-semibold text-sm font-mono tracking-wide focus:outline-none focus:ring-2 focus:ring-indigo-600/10 transition-all shadow-inner ${
                        isFieldInvalid(record, 'cost') ? 'border-red-300 focus:border-red-500 bg-red-50/5 text-red-900' : 'border-gray-200 focus:border-indigo-600 text-slate-800'
                      }`}
                      onChange={(e) => handleInputChange(record.id, 'cost', e.target.value)}
                    />
                    {isFieldInvalid(record, 'cost') && <p className="text-[10px] text-red-600 font-bold tracking-tight">Maliyet tutarı zorunludur.</p>}
                  </div>

                  {/* YAPILAN İŞLEM ÖZETI */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[11px] font-bold text-slate-500 tracking-wide uppercase">YAPILAN İŞLEM ÖZETİ *</label>
                    <input 
                      type="text" placeholder="Örn: Triger seti ve periyodik sıvı bakımları komple yenilendi." value={record.summary || ''} maxLength={120}
                      onBlur={() => handleFieldBlur(record.id, 'summary')}
                      className={`w-full px-3 py-2.5 bg-white border rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/10 transition-all shadow-inner ${
                        isFieldInvalid(record, 'summary') ? 'border-red-300 focus:border-red-500 bg-red-50/5 text-red-900' : 'border-gray-200 focus:border-indigo-600 text-slate-800'
                      }`}
                      onChange={(e) => handleInputChange(record.id, 'summary', e.target.value)}
                    />
                    {isFieldInvalid(record, 'summary') && <p className="text-[10px] text-red-600 font-bold tracking-tight">İşlem açıklaması zorunludur.</p>}
                  </div>
                </div>

                {/* KOŞULLU SİBER ALAN (GELECEK KM) */}
                {record.service_type === 'Periyodik Bakım' && (
                  <div className="space-y-1.5 transform transition-all duration-500 ease-out origin-top animate-scaleUp">
                    <label className="text-[11px] font-bold text-indigo-600 tracking-wide block uppercase">BİR SONRAKI YAĞ DEĞİŞİM KİLOMETRESİ (KM)</label>
                    <input 
                      type="text" placeholder="Örn: 135.000 (Opsiyonel / Akıllı Alarm)" value={record.next_service_km || ''} maxLength={11}
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 focus:border-indigo-600 rounded-xl font-semibold text-sm font-mono tracking-wide focus:outline-none focus:ring-2 focus:ring-indigo-600/10 transition-all shadow-inner text-slate-800"
                      onChange={(e) => handleInputChange(record.id, 'next_service_km', e.target.value)}
                    />
                  </div>
                )}

                {/* FATURA YÜKLEME ALANI (MÜHÜRLÜ REKORD) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 tracking-wide uppercase">SERVİS MAKBUZU / FATURASI (ZORUNLU DEĞİL)</label>
                  <div className="relative">
                    <input 
                      type="file" accept="image/*,application/pdf" id={`invoice-${record.id}`} className="hidden"
                      onChange={(e) => handleInvoiceUpload(record.id, e.target.files[0])}
                    />
                    <label 
                      htmlFor={`invoice-${record.id}`}
                      className={`w-full py-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all select-none ${
                        !record.invoice_file ? 'bg-slate-50/40 border-indigo-200 hover:bg-slate-50 hover:border-indigo-400' : 'bg-emerald-50/20 border-emerald-500'
                      }`}
                    >
                      {!record.invoice_file ? (
                        <>
                          <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
                          <span className="text-indigo-600 text-xs font-bold">Usta Faturasını Yüklemek İçin Tıklayın</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                          <span className="text-emerald-700 text-xs font-bold">Fatura Belgesi Başarıyla Bağlandı</span>
                          <span className="text-slate-400 text-[10px] max-w-xs truncate font-semibold font-mono mt-0.5">{record.invoice_file.name}</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>

              </div>
            )}
          </div>
        ))}
      </div>

      {/* YENİ KAYIT EKLEME BUTONU */}
      <button
        type="button" onClick={addNewRecord}
        className="w-full py-3.5 bg-indigo-50/40 hover:bg-indigo-50 border-2 border-dashed border-indigo-600 text-indigo-600 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-99 hover:scale-101 transition-all duration-300"
      >
        <svg className="w-3.5 h-3.5 text-indigo-600 animate-pulse" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
        Yeni Bir Servis / Bakım Kaydı Ekle
      </button>

    </div>
  );
}