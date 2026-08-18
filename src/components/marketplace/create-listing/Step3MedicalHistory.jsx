// =========================================================================
// OTO-CV WEB ADIM 3: MEDİKAL SİCİL & SERVİS GEÇMİŞİ (Step3Medical.jsx)
// İşlev: Sandwich UI Mimarisi, Akıllı Otomatik Çöp Kayıt Temizleyici ve Zırhlı Validasyon.
// =========================================================================

'use client';

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import Icon from '../../common/icons';
import { useToast } from '../../../context/ToastContext';
import {
  gorselSikistir, SIKISTIRMA,
  BELGE_ACCEPT, BELGE_TURLERI_METNI, belgeTuruUygun,
} from '../../../utils/gorselSikistir';

// --- İKON BİLEŞENLERİ (GOOGLE STITCH VEKTÖRLERİ) ---
const FileTextIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.744c0 3.89 2.421 7.22 5.824 8.535a9.245 9.245 0 0 0 6.352 0c3.403-1.315 5.824-4.645 5.824-8.535 0-1.29-.203-2.532-.577-3.698A11.959 11.959 0 0 1 12 2.25c-1.926 0-3.758.455-5.382 1.264Z" />
  </svg>
);

const Step3Medical = forwardRef(({  
  formData,  
  updateFormData,  
  setFormData,  
  onNext,  
  onBack,
  selectedYear 
}, ref) => {
  // Desteklenmeyen dosya türünü kullanıcıya söylemek için. Uygulamanın geri
  // kalanı (Step1, MaintenanceDialog) aynı yolu kullanıyor.
  const toast = useToast();

  const [touchedFields, setTouchedFields] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Üst bileşen ile uyumlu state senkronizasyonu
  const updateRecords = (records) => {
    if (updateFormData) {
      updateFormData({ service_records: records });
    } else if (setFormData) {
      setFormData({ ...formData, service_records: records });
    }
  };

  const activeRecords = formData.service_records || [];
  const vehicleProductionYear = selectedYear || formData.selectedYear || null;

  // ⚠ FATURA SIKIŞTIRMA `await` İÇERDİĞİ İÇİN GEREKİYOR.
  //
  // `handleInvoiceUpload` artık asenkron: bekleme sırasında kullanıcı başka
  // bir kayda yazabiliyor. Kapanışta yakalanan `activeRecords` o anda eskimiş
  // oluyor ve yazıldığında kullanıcının yeni girdisi SESSİZCE siliniyordu.
  // Ref her zaman en güncel diziyi tutuyor.
  //
  // Yazma render İÇİNDE değil, render SONRASI efektte yapılıyor: render
  // sırasında ref'e yazmak React'in eşzamanlı çalışmasında güvenli değil
  // (lint de bunu hata olarak veriyor). Efekt her commit'ten sonra koştuğu
  // için `await` çözüldüğünde ref güncel oluyor.
  const activeRecordsRef = useRef(activeRecords);
  // Bağımlılık dizisi BİLİNÇLİ OLARAK YOK: amaç her commit'ten sonra en son
  // değeri yazmak. `[activeRecords]` yazmak da aynı sonucu verirdi ama dizi
  // her render'da yeni referans olduğu için gereksiz bir uyarı üretiyor.
  useEffect(() => {
    activeRecordsRef.current = activeRecords;
  });

  // =========================================================================
  // 🧹 SÜPER YARDIMCI: TAMAMEN BOŞ KAYIT KONTROLÜ SENSÖRÜ
  // =========================================================================
  const isRecordCompletelyEmpty = (record) => {
    return (
      !record.shop_name?.trim() &&
      !record.km?.toString().trim() &&
      !record.cost?.toString().trim() &&
      !record.summary?.trim() &&
      !record.service_date?.trim() &&
      !record.invoice_file
    );
  };

  // =========================================================================
  // 1. BLOK: KOŞULLU VE AKILLI FORM GEÇERLİLİK DENETLEYİCİSİ
  // =========================================================================
  const isRecordValid = (record) => {
    if (isRecordCompletelyEmpty(record)) return false;

    const hasType = !!record.service_type;
    const hasShop = record.shop_name?.trim().length > 0;
    const hasKm = record.km?.toString().trim().length > 0;
    const hasCost = record.cost?.toString().trim().length > 0;
    const hasSummary = record.summary?.trim().length > 0;
    const hasValidDate = record.service_date?.trim().length === 10 && !record.date_error;

    return hasType && hasShop && hasKm && hasCost && hasSummary && hasValidDate;
  };

  const isStep3Valid = activeRecords.length === 0 || activeRecords.every(rec => isRecordCompletelyEmpty(rec) || isRecordValid(rec));

  const handleNextWithValidation = () => {
    setSubmitAttempted(true);

    // 1. Öncesinde tamamen boş bırakılmış çöp kayıtları otomatik buda
    const cleanedRecords = activeRecords.filter(rec => !isRecordCompletelyEmpty(rec));
    if (cleanedRecords.length !== activeRecords.length) {
      updateRecords(cleanedRecords);
    }

    // 2. Kalan kayıtların eksiksiz olduğunu doğrula
    const isValid = cleanedRecords.length === 0 || cleanedRecords.every(isRecordValid);
    return isValid;
  };

  useImperativeHandle(ref, () => ({
    handleNextWithValidation
  }));

  // =========================================================================
  // 2. BLOK: MEDYA SÜRÜCÜSÜ (CRASH KORUMALI FATURA YÜKLEYİCİ)
  // =========================================================================
  // Fatura BELGE profiliyle sıkıştırılıyor (2400 px / %88) — araç fotoğrafından
  // bilinçli olarak daha cömert. Faturada değerli olan OKUNABİLİRLİK: sicilin
  // güven puanı bu evraka dayanıyor, okunamayan bir fatura hiç yüklenmemiş
  // faturadan iyi değil. PDF seçilirse dosya dokunulmadan geçiyor.
  const handleInvoiceUpload = async (id, file) => {
    if (!file) return;
    const { dosya } = await gorselSikistir(file, SIKISTIRMA.belge);
    // ⚠ `activeRecords` YERİNE GÜNCEL DEĞER OKUNUYOR: `await` sırasında
    // kullanıcı başka bir kayda dokunmuş olabiliyor ve kapanışta yakalanan
    // eski dizi yazılırsa o değişiklik sessizce kaybolurdu.
    updateRecords(
      (activeRecordsRef.current || activeRecords).map((rec) =>
        rec.id === id ? { ...rec, invoice_file: dosya } : rec
      )
    );
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
      } else if (vehicleProductionYear && year < parseInt(vehicleProductionYear, 10)) {
        errorMsg = `Bakım tarihi araç üretim yılından (${vehicleProductionYear}) eski olamaz.`;
      }
    }

    const updatedRecords = activeRecords.map(rec => {
      if (rec.id === recordId) {
        return { ...rec, service_date: formattedDate, date_error: errorMsg };
      }
      return rec;
    });
    updateRecords(updatedRecords);
  };

  // =========================================================================
  // 4. BLOK: DİNAMİK SATIR MODÜLLERİ VE AKORDEON DRIVERLARI
  // =========================================================================
  
  // 🚀 AKILLI YENİ KAYIT EKLEYİCİ (Mevcut çöp kayıtları önceden süpürür)
  const addNewRecord = () => {
    const cleanedRecords = activeRecords.filter(rec => !isRecordCompletelyEmpty(rec));
    const closedRecords = cleanedRecords.map(rec => ({ ...rec, is_expanded: false }));
    
    updateRecords([
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
    ]);
  };

  const removeRecord = (idToRemove) => {
    const filtered = activeRecords.filter(rec => rec.id !== idToRemove);
    if (filtered.length > 0) {
      filtered[filtered.length - 1].is_expanded = true;
    }
    updateRecords(filtered);
  };

  // 🚀 AKILLI KAPATMA HANDLER'I (Boşsa SİLER, Veri varsa DARALTIR)
  const handleCloseRecord = (idToClose) => {
    const target = activeRecords.find(r => r.id === idToClose);
    if (target && isRecordCompletelyEmpty(target)) {
      removeRecord(idToClose);
    } else {
      toggleExpand(idToClose);
    }
  };

  const toggleExpand = (idToToggle) => {
    const updated = activeRecords.map(rec => {
      if (rec.id === idToToggle) {
        return { ...rec, is_expanded: !rec.is_expanded };
      }
      return rec;
    });
    updateRecords(updated);
  };

  const handleInputChange = (id, field, value) => {
    const updated = activeRecords.map(rec => {
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
    updateRecords(updated);
  };

  const handleFieldBlur = (recordId, field) => {
    setTouchedFields(prev => ({ ...prev, [`${recordId}-${field}`]: true }));
  };

  const isFieldInvalid = (record, field) => {
    if (isRecordCompletelyEmpty(record)) return false;

    const isTouched = touchedFields[`${record.id}-${field}`] || submitAttempted;
    const isEmpty = !record[field] || record[field].toString().trim() === '';
    return isTouched && isEmpty;
  };

  return (
    <div className="pb-24 text-slate-900 select-none font-sans antialiased">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">

        {/* 1. KATMAN: DIŞ BEYAZ PANEL */}
        <div className="bg-white border border-slate-200/90 rounded-lg p-6 sm:p-8 shadow-sm space-y-6">
          
          {/* TEK VE NET ÜST BAŞLIK */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-rose-600 font-semibold text-2xl sm:text-3xl leading-none">*</span>
                <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
                  Servis, Bakım ve Parça Geçmişi
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Aracınızın şeffaflık derecesini artırın ve OTO.CV Güven Skorunuzu yükseltin.
              </p>
            </div>

            <span className="text-etiket font-semibold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full border border-indigo-100 uppercase tracking-wider shrink-0 self-start sm:self-auto">
              MEDİKAL SİCİL
            </span>
          </div>

          {/* =========================================================================
              🚀 ZERO-STATE (KAYIT YOKSA GÖRÜNÜR)
             ========================================================================= */}
          {activeRecords.length === 0 && (
            <div className="w-full border border-slate-200/90 rounded-md bg-white shadow-2xs overflow-hidden font-sans select-none">
              
              {/* ÜST HEADER ALANI */}
              <div className="p-6 sm:p-7 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-md bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <svg className="w-6 h-6 text-indigo-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .415.117.802.321 1.132a2.378 2.378 0 0 0-.321 1.132c0 .231.035.454.1.664M4.5 12h15m-15 0a2.25 2.25 0 0 0-2.25 2.25v6.75c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-6.75A2.25 2.25 0 0 0 19.5 12M4.5 12V6.75A2.25 2.25 0 0 1 6.75 4.5h10.5a2.25 2.25 0 0 1 2.25 2.25V12" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                      Usta ve yetkili servis faturalarınızı dijital karnenize mühürleyin.
                    </p>
                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md text-emerald-700 text-etiket font-semibold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      +%15 OTO.CV SKOR BONUSU
                    </span>
                  </div>
                </div>

                {/* SAĞ ÜST KONTROL İCONU */}
                <div className="hidden sm:flex w-11 h-11 border border-slate-200 rounded-md items-center justify-center text-slate-500 bg-slate-50 shrink-0">
                  <ShieldCheckIcon />
                </div>
              </div>

              {/* MİKRO ÖZELLİK KARTLARI GRID */}
              <div className="p-6 sm:p-7 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-100">
                <div className="border border-slate-200/80 bg-slate-50/50 p-4 rounded-lg flex items-start gap-3 transition-all hover:bg-white hover:border-slate-300 hover:shadow-2xs">
                  <div className="w-10 h-10 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <FileTextIcon />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 mb-0.5">Fatura & Makbuz</h4>
                    <p className="text-yardimci text-slate-500 font-medium leading-relaxed">
                      PDF veya Fotoğraf yükleyin
                    </p>
                  </div>
                </div>

                <div className="border border-slate-200/80 bg-slate-50/50 p-4 rounded-lg flex items-start gap-3 transition-all hover:bg-white hover:border-slate-300 hover:shadow-2xs">
                  <div className="w-10 h-10 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <CalendarIcon />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 mb-0.5">Bakım Takvimi</h4>
                    <p className="text-yardimci text-slate-500 font-medium leading-relaxed">
                      Gelecek yağ değişimini takiple
                    </p>
                  </div>
                </div>

                <div className="border border-slate-200/80 bg-slate-50/50 p-4 rounded-lg flex items-start gap-3 transition-all hover:bg-white hover:border-slate-300 hover:shadow-2xs">
                  <div className="w-10 h-10 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <ShieldCheckIcon />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 mb-0.5">Şeffaf Garaj Mührü</h4>
                    <p className="text-yardimci text-slate-500 font-medium leading-relaxed">
                      Alıcı güvenini zirveye çıkar
                    </p>
                  </div>
                </div>
              </div>

              {/* ALT AKSİYON BUTONU */}
              <div className="p-6 sm:p-7 bg-slate-50/40 flex flex-col items-center justify-center gap-3 text-center">
                <button
                  type="button"
                  onClick={addNewRecord}
                  className="bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-semibold text-xs sm:text-sm py-3.5 px-8 rounded-md transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span>İlk Servis & Bakım Kaydını Ekle</span>
                </button>

                <div className="flex items-center justify-center gap-1.5 text-yardimci text-slate-500 font-medium pt-1">
                  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                  </svg>
                  <span>Sıfır km veya bakımsız araçlar için: Bu adım opsiyoneldir, doğrudan devam edebilirsiniz.</span>
                </div>
              </div>

            </div>
          )}

          {/* =========================================================================
              2. KATMAN: ORTA GRİ BAZA CONTAINER (SANDVİÇ MİMARİSİ)
             ========================================================================= */}
          {activeRecords.length > 0 && (
            <div className="bg-[#F2F4F7] border border-slate-200/80 rounded-md p-4 sm:p-5 space-y-4">
              
              {/* DİNAMİK SERVİS AKORDEON LİSTESİ */}
              <div className="space-y-4">
                {activeRecords.map((record, index) => {
                  const recordValid = isRecordValid(record);
                  return (
                    <div 
                      key={record.id}
                      className={`bg-white border border-slate-200/90 rounded-md overflow-hidden shadow-2xs transition-all duration-300 ${
                        record.is_expanded ? 'ring-1 ring-indigo-500/20 border-indigo-300 shadow-sm' : 'hover:border-slate-300'
                      }`}
                    >
                      {/* KAPALI YATAY BANT */}
                      {!record.is_expanded && (
                        <button type="button" 
                          onClick={() => toggleExpand(record.id)}
                          className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* DİNAMİK STATUS İKONU: GEÇERLİYSE YEŞİL TİK, EKSİKSE TURUNCU ÜNLEM */}
                            {recordValid ? (
                              <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0" title="Tamamlanmış Kayıt">
                                <Icon name="onay" size="xs" strokeWidth={3} />
                              </span>
                            ) : (
                              <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-semibold shrink-0" title="Eksik Bilgi">
                                !
                              </span>
                            )}
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-slate-900 truncate">
                                {record.shop_name || `Bakım Kaydı #${index + 1}`}
                              </h4>
                              <p className="text-yardimci text-slate-500 font-semibold font-mono mt-0.5">
                                {record.service_type} {record.km ? `• ${record.km} KM` : ''} {record.cost ? `• ₺${record.cost}` : ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 text-xs">
                            {!recordValid && (
                              <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-bold text-etiket">
                                Eksik Bilgi
                              </span>
                            )}
                            {record.invoice_file && (
                              <span className="text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-md font-bold text-etiket">
                                Fatura Yüklendi
                              </span>
                            )}
                            <Icon name="asagi" size="md" className="text-slate-400" strokeWidth={2.5} />
                          </div>
                        </button>
                      )}

                      {/* AÇIK İÇ İÇE FORM PANELİ */}
                      {record.is_expanded && (
                        <div className="p-5 sm:p-6 space-y-5 bg-white">
                          
                          {/* AKORDEON ÜST BAŞLIK & AKSİYONLAR */}
                          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                              <span className="bg-indigo-600 text-white w-5 h-5 rounded-full inline-flex items-center justify-center text-etiket font-mono font-bold">
                                {index + 1}
                              </span>
                              <span>Servis & Bakım Kaydı Detayı</span>
                            </h4>
                            
                            <div className="flex items-center gap-2">
                              <button 
                                type="button" 
                                onClick={() => removeRecord(record.id)}
                                className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-md text-xs font-bold transition-colors cursor-pointer"
                              >
                                Sil
                              </button>
                              {/* AKILLI KAPAT BUTONU */}
                              <button 
                                type="button" 
                                onClick={() => handleCloseRecord(record.id)}
                                className="px-2.5 py-1 text-slate-500 hover:bg-slate-100 rounded-md text-xs font-bold transition-colors cursor-pointer"
                              >
                                Kapat
                              </button>
                            </div>
                          </div>

                          {/* GRUP 1: İŞLEM TÜRÜ TABLARI */}
                          <div className="space-y-1.5">
                            <label className="text-yardimci font-semibold text-slate-600 uppercase tracking-wide block">
                              İşlem Türü <span className="text-rose-600">*</span>
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-1 bg-slate-100/80 border border-slate-200/80 rounded-md">
                              {['Periyodik Bakım', 'Mekanik Bakım', 'Tamir / Onarım', 'Sarf Malzeme', 'Dış İşlem'].map((type) => {
                                const isSel = record.service_type === type;
                                return (
                                  <button
                                    key={type} 
                                    type="button"
                                    onClick={() => handleInputChange(record.id, 'service_type', type)}
                                    className={`py-2 px-2 rounded-lg text-xs font-bold text-center transition-all cursor-pointer ${
                                      isSel ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/60'
                                    }`}
                                  >
                                    {type}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* YATAY AYIRICI ÇİZGİ */}
                          <div className="border-t border-slate-100 pt-4 space-y-4">
                            
                            {/* GRUP 2: TARİH, SERVİS VE KM MATRİSİ */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              
                              {/* İŞLEM TARİHİ */}
                              <div className="space-y-1.5">
                                <label className="text-yardimci font-semibold text-slate-600 uppercase tracking-wide">
                                  İşlem Tarihi <span className="text-rose-600">*</span>
                                </label>
                                <div className={`border rounded-md bg-white flex items-center h-11 px-3 transition-all ${
                                  record.date_error || isFieldInvalid(record, 'service_date') ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-slate-200 focus-within:border-indigo-600'
                                }`}>
                                  <input 
                                    type="text" 
                                    placeholder="GG/AA/YYYY" 
                                    value={record.service_date || ''}
                                    onBlur={() => handleFieldBlur(record.id, 'service_date')}
                                    className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-800 font-mono tracking-wider"
                                    onChange={(e) => validateAndFormatDate(e.target.value, record.id)}
                                  />
                                </div>
                                {record.date_error && <p className="text-etiket font-bold text-rose-600">{record.date_error}</p>}
                                {!record.date_error && isFieldInvalid(record, 'service_date') && <p className="text-etiket font-bold text-rose-600">Tarih alanı zorunludur.</p>}
                              </div>

                              {/* KURUM / USTA */}
                              <div className="space-y-1.5">
                                <label className="text-yardimci font-semibold text-slate-600 uppercase tracking-wide">
                                  Kurum / Servis Adı <span className="text-rose-600">*</span>
                                </label>
                                <div className={`border rounded-md bg-white flex items-center h-11 px-3 transition-all ${
                                  isFieldInvalid(record, 'shop_name') ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-slate-200 focus-within:border-indigo-600'
                                }`}>
                                  <input 
                                    type="text" 
                                    placeholder="Örn: Borusan Oto / Usta" 
                                    value={record.shop_name || ''} 
                                    maxLength={50}
                                    onBlur={() => handleFieldBlur(record.id, 'shop_name')}
                                    className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-800 tracking-wide"
                                    onChange={(e) => handleInputChange(record.id, 'shop_name', e.target.value)}
                                  />
                                </div>
                                {isFieldInvalid(record, 'shop_name') && <p className="text-etiket font-bold text-rose-600">Servis adı boş bırakılamaz.</p>}
                              </div>

                              {/* YAPILAN KİLOMETRE */}
                              <div className="space-y-1.5">
                                <label className="text-yardimci font-semibold text-slate-600 uppercase tracking-wide">
                                  İşlem Yapılan KM <span className="text-rose-600">*</span>
                                </label>
                                <div className={`border rounded-md bg-white flex items-center h-11 px-3 transition-all ${
                                  isFieldInvalid(record, 'km') ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-slate-200 focus-within:border-indigo-600'
                                }`}>
                                  <input 
                                    type="text" 
                                    placeholder="Örn: 60.000" 
                                    value={record.km || ''} 
                                    maxLength={11}
                                    onBlur={() => handleFieldBlur(record.id, 'km')}
                                    className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-800 font-mono tracking-wide"
                                    onChange={(e) => handleInputChange(record.id, 'km', e.target.value)}
                                  />
                                </div>
                                {isFieldInvalid(record, 'km') && <p className="text-etiket font-bold text-rose-600">Kilometre kaydı zorunludur.</p>}
                              </div>

                            </div>

                            {/* GRUP 3: TUTAR VE İŞLEM ÖZETİ */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              
                              {/* İŞLEM TUTARI */}
                              <div className="space-y-1.5">
                                <label className="text-yardimci font-semibold text-slate-600 uppercase tracking-wide">
                                  İşlem Tutarı (TL) <span className="text-rose-600">*</span>
                                </label>
                                <div className={`border rounded-md bg-white flex items-center h-11 px-3 transition-all ${
                                  isFieldInvalid(record, 'cost') ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-slate-200 focus-within:border-indigo-600'
                                }`}>
                                  <input 
                                    type="text" 
                                    placeholder="Örn: 15.000" 
                                    value={record.cost || ''} 
                                    maxLength={12}
                                    onBlur={() => handleFieldBlur(record.id, 'cost')}
                                    className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-800 font-mono tracking-wide"
                                    onChange={(e) => handleInputChange(record.id, 'cost', e.target.value)}
                                  />
                                </div>
                                {isFieldInvalid(record, 'cost') && <p className="text-etiket font-bold text-rose-600">Maliyet tutarı zorunludur.</p>}
                              </div>

                              {/* İŞLEM ÖZETİ */}
                              <div className="space-y-1.5 md:col-span-2">
                                <label className="text-yardimci font-semibold text-slate-600 uppercase tracking-wide">
                                  Yapılan İşlem Özeti <span className="text-rose-600">*</span>
                                </label>
                                <div className={`border rounded-md bg-white flex items-center h-11 px-3 transition-all ${
                                  isFieldInvalid(record, 'summary') ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-slate-200 focus-within:border-indigo-600'
                                }`}>
                                  <input 
                                    type="text" 
                                    placeholder="Örn: Triger seti ve periyodik sıvı bakımları yenilendi." 
                                    value={record.summary || ''} 
                                    maxLength={120}
                                    onBlur={() => handleFieldBlur(record.id, 'summary')}
                                    className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-800"
                                    onChange={(e) => handleInputChange(record.id, 'summary', e.target.value)}
                                  />
                                </div>
                                {isFieldInvalid(record, 'summary') && <p className="text-etiket font-bold text-rose-600">İşlem açıklaması zorunludur.</p>}
                              </div>

                            </div>

                            {/* KOŞULLU BİR SONRAKİ BAKIM KM ALANI */}
                            {record.service_type === 'Periyodik Bakım' && (
                              <div className="space-y-1.5 pt-1">
                                <label className="text-yardimci font-semibold text-indigo-600 uppercase tracking-wide block">
                                  Bir Sonraki Yağ Değişim Kilometresi (KM)
                                </label>
                                <div className="border border-indigo-200 rounded-md bg-indigo-50/30 flex items-center h-11 px-3">
                                  <input 
                                    type="text" 
                                    placeholder="Örn: 135.000 (Gelecek Bakım Hatırlatıcısı İçin)" 
                                    value={record.next_service_km || ''} 
                                    maxLength={11}
                                    className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-800 font-mono tracking-wide"
                                    onChange={(e) => handleInputChange(record.id, 'next_service_km', e.target.value)}
                                  />
                                </div>
                              </div>
                            )}

                          </div>

                          {/* YATAY AYIRICI ÇİZGİ & GRUP 4: FATURA YÜKLEME ALANI */}
                          <div className="pt-3 border-t border-slate-100 space-y-1.5">
                            <span className="text-yardimci font-semibold text-slate-600 uppercase tracking-wide block">
                              Servis Makbuzu / Faturası <span className="text-slate-500 font-normal font-mono">(Opsiyonel - %95+ Güven Skoru)</span>
                            </span>

                            {/* `accept` ve tür denetimi kovanın kabul listesiyle
                                AYNI kaynaktan geliyor. Eskiden
                                `accept="image/*,application/pdf"` idi ve
                                `vehicle-invoices` kovasının reddettiği türler
                                (TIFF gibi) seçilebiliyordu: dosya sunucuda
                                reddediliyor, kullanıcı faturasını eklediğini
                                sanıyordu.

                                ⚠ Denetim `accept`e GÜVENMİYOR: kullanıcı dosya
                                seçicide "tüm dosyalar"a geçebiliyor. */}
                            <input
                              type="file"
                              accept={BELGE_ACCEPT}
                              id={`invoice-${record.id}`}
                              className="hidden"
                              onChange={(e) => {
                                const secilen = e.target.files?.[0];
                                if (!secilen) return;
                                if (!belgeTuruUygun(secilen)) {
                                  toast.hata(`Bu dosya türü desteklenmiyor. ${BELGE_TURLERI_METNI} yükleyebilirsiniz.`);
                                  e.target.value = '';
                                  return;
                                }
                                handleInvoiceUpload(record.id, secilen);
                              }}
                            />

                            <label 
                              htmlFor={`invoice-${record.id}`}
                              className={`w-full border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                                !record.invoice_file ? 'bg-slate-50 border-slate-200 hover:border-indigo-400' : 'bg-emerald-50/50 border-emerald-500'
                              }`}
                            >
                              {!record.invoice_file ? (
                                <div className="flex items-center gap-2 text-indigo-600">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                  </svg>
                                  <span className="text-xs font-bold">Servis Faturası veya Makbuz Görseli Yükle</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                                    <Icon name="onay" className="w-2.5 h-2.5" strokeWidth={3} />
                                  </span>
                                  <span>Fatura Belgesi Bağlandı:</span>
                                  <span className="font-mono font-semibold text-slate-600 truncate max-w-xs">
                                    {record.invoice_file.name}
                                  </span>
                                </div>
                              )}
                            </label>
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 3. KATMAN - PANEL B: BAĞIMSIZ BEYAZ "YENİ KAYIT EKLE" KART BUTONU */}
              <button
                type="button" 
                onClick={addNewRecord}
                className="w-full py-4 bg-white hover:bg-slate-50/80 border border-slate-200/90 text-indigo-600 hover:text-indigo-700 font-semibold text-xs sm:text-sm rounded-md flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs hover:border-slate-300"
              >
                <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                  +
                </div>
                <span>Yeni Bir Servis / Bakım Kaydı Ekle</span>
              </button>

            </div>
          )}

        </div>

        {/* ALT AKSİYON BUTONLARI (SIHIRBAZ YÖNLENDİRME) */}
        <div className="flex items-center justify-between pt-6 pb-12">
          <button
            type="button"
            onClick={onBack}
            className="bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 font-bold text-xs sm:text-sm px-6 py-3.5 rounded-lg transition-all cursor-pointer select-none"
          >
            ‹ 2. Adıma Dön
          </button>

          <button 
            type="button"
            disabled={!isStep3Valid}
            onClick={() => {
              const isValid = handleNextWithValidation();
              if (isValid && onNext) onNext();
            }}
            className="bg-rose-500 hover:bg-rose-600 disabled:bg-[#FFF5F7] disabled:text-[#FFC2CB] text-white font-semibold text-xs sm:text-sm py-3.5 px-8 rounded-lg transition-all shadow-sm disabled:cursor-not-allowed cursor-pointer select-none active:scale-98"
          >
            Devam Et: Ön İzleme ve Tescil ›
          </button>
        </div>

      </div>
    </div>
  );
});

Step3Medical.displayName = 'Step3Medical';

export default Step3Medical;