// =========================================================================
// OTO-CV MODÜL 2: PREMIUM BAKIM KAYDI POPUP MOTORU (MaintenanceDialog.jsx)
// İşlev: Gofraj kabartmalı TR resmi plaka vitrini, submit denetimli 
//        red-border zorunlu alan kalkanı, mikro-etkileşimli yeşil başarı 
//        onay motoru ve Frankfurt DB entegrasyonu.
// =========================================================================

'use client';

import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import Icon from '../common/icons';
import { toIsoDate } from '../../utils/dateHelper';

export default function MaintenanceDialog({ vehicle, plateNumber, isOpen, onClose, onRecordAdded }) {
  const toast = useToast();
  // =========================================================================
  // 1. BLOK: FORM KONTROLCÜLERİ VE YENİ NESİL REAKTİF HAFIZA
  // =========================================================================
  const [serviceType, setServiceType] = useState('Periyodik Bakım');
  const [shopName, setShopName] = useState('');
  const [km, setKm] = useState('');
  const [cost, setCost] = useState('');
  const [summary, setSummary] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [nextServiceKm, setNextServiceKm] = useState(''); 
  
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [dateError, setDateError] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false); // 🚀 Akıllı hata boyama tetikleyicisi
  const [isSuccess, setIsSuccess] = useState(false); // 🚀 Başarı efekti tetikleyicisi

  if (!isOpen) return null;

  // Güvenli Kimlik Tespiti
  const activePlate = vehicle?.plate_number || vehicle?.plate || plateNumber || '34 ABC 123';
  const activeBrand = vehicle?.brand || '';
  const activeModel = vehicle?.model || '';
  const activeCarName = activeBrand ? `${activeBrand} ${activeModel}`.trim() : '';
  const activeYear = vehicle?.year ? parseInt(vehicle.year, 10) : null;

  // =========================================================================
  // 2. BLOK: ÇİFT YÖNLÜ HİBRİT TARİH ZIRHI AND MASKING
  // =========================================================================
  const handleDateChange = (value) => {
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

    let formatted = '';
    for (let i = 0; i < raw.length; i++) {
      if (i === 2 || i === 4) formatted += '/';
      formatted += raw[i];
    }
    setServiceDate(formatted);

    if (formatted.length === 10) {
      const parts = formatted.split('/');
      const parsedDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      const today = new Date();

      if (parsedDate > today) {
        setDateError('Bugünden ileri bir tarih girilemez.');
      } else if (activeYear && parsedDate.getFullYear() < activeYear) {
        setDateError(`Tarih, araç üretim yılından (${activeYear}) eski olamaz.`);
      } else {
        setDateError('');
      }
    } else {
      setDateError('');
    }
  };

  const formatNumberInput = (value, setter) => {
    const clean = value.replace(/\./g, '').replace(/[^0-9]/g, '');
    if (!clean) {
      setter('');
      return;
    }
    setter(parseInt(clean, 10).toLocaleString('tr-TR'));
  };

  // =========================================================================
  // 3. BLOK: GEÇERLİLİK KONTROLÜ VE VERİTABANI GÜVENLİK KİLİDİ
  // =========================================================================
  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true); 

    // 🚀 PLAN ENTEGRASYONU: summary.trim() zorunlu kontrol mekanizmasına mühürlendi!
    const isFormValid = serviceType && shopName.trim() && km && cost && serviceDate && (serviceDate.length === 10) && !dateError && summary.trim();

    if (!isFormValid) {
      return; 
    }

    try {
      setIsSaving(true);
      let invoiceUrl = null;

      if (invoiceFile) {
        const fileExt = invoiceFile.name.split('.').pop();
        const fileName = `invoice_${Date.now()}.${fileExt}`;
        const filePath = `${activePlate}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('vehicle-images')
          .upload(filePath, invoiceFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('vehicle-images').getPublicUrl(filePath);
        invoiceUrl = data.publicUrl;
      }

      // 🚀 PLAN ENTEGRASYONU: summary verisi "Kategori - Özet" formatında birleştirilerek mühürlendi
      await supabase.from('maintenance_records').insert({
        vehicle_plate: activePlate,
        shop_name: shopName.trim(),
        km_at_service: parseInt(km.replace(/\./g, ''), 10) || 0,
        cost: parseFloat(cost.replace(/\./g, '')) || 0.0,
        // Ozet yalnizca bir kez yaziliyor. Onceden `${serviceType} / ${summary} - ${summary}`
        // seklindeydi: hem tekrar ediyordu hem de service_type zaten ayri kolon.
        summary: summary.trim(),
        invoice_url: invoiceUrl,
        // ISO olarak yazılıyor. Kolon artık Postgres 'date' tipinde ve
        // '08/05/2023' gibi biçimlendirilmiş metin göndermek sunucunun
        // DateStyle ayarına bağlı bir kumar olurdu ('05/06/2023' sessizce
        // 6 Mayıs'a dönebilir). ISO tek kesin biçim.
        service_date: toIsoDate(serviceDate),
        service_type: serviceType,
        next_service_km: nextServiceKm ? parseInt(nextServiceKm.replace(/\./g, ''), 10) : null
      });

      const { data: carData, error: fetchError } = await supabase
        .from('vehicles')
        .select('trust_score')
        .eq('plate_number', activePlate)
        .single();

      if (!fetchError && carData) {
        const currentScore = carData.trust_score || 60;
        const newScore = Math.min(Math.max(currentScore + 5, 60), 98);

        await supabase
          .from('vehicles')
          .update({ trust_score: newScore })
          .eq('plate_number', activePlate);
      }

      // UX DEVRİMİ: Başarı durumunu tetikleyip 1.2 saniye sonra sayfayı kapatma döngüsü
      setIsSuccess(true);
      
      setTimeout(() => {
        onRecordAdded();
        onClose();
        setIsSuccess(false); // Reset zırhı
      }, 1200);

    } catch (err) {
      console.error(err);
      toast.hata('Bakım kaydı işlenemedi. Lütfen bilgileri kontrol edip tekrar deneyin.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn select-none">
      <div className="bg-white border border-gray-100 rounded-3xl w-full max-w-[560px] shadow-2xl overflow-hidden animate-scaleIn flex flex-col max-h-[90vh]">
        
        {/* HEADR BAR PANELİ */}
        <div className="bg-[#111827] px-6 py-5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3 text-white">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.67 2.67 0 1113.5 17.25l-5.83-5.83m5.83 3.75l-4.17-4.17m4.17 4.17L9.42 11.17M13.5 17.25l-4.17-4.17M11.42 15.17l-4.17-4.17M11.42 15.17L5.58 9.33A2.67 2.67 0 119.33 5.58l5.83 5.83M5.58 9.33l4.17 4.17M5.58 9.33L7.67 11.42M9.33 5.58l4.17 4.17M9.33 5.58L11.42 7.67" />
            </svg>
            <h3 className="font-black text-base tracking-wide">Servis & Bakım Kaydı İşle</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
            <Icon name="kapat" size="lg" strokeWidth={2.5} />
          </button>
        </div>

        {/* 🚀 ROZET ALANI: DÜZ YAZIDAN KURUMSAL KABARTMA GOFRAJ PLAKAYA GEÇİŞ */}
        <div className="bg-slate-50 border-b border-gray-100 px-6 py-3.5 flex items-center gap-4">
          <div className="inline-flex items-center border-[1.5px] border-slate-800 rounded-md bg-white font-mono font-black text-xs h-7 overflow-hidden shadow-sm shrink-0">
            <div className="bg-[#003399] text-white text-[9px] font-sans font-bold flex flex-col items-center justify-center px-1.5 h-full leading-none shrink-0">
              <span>TR</span>
            </div>
            <div className="px-3 text-slate-900 tracking-wider uppercase h-full flex items-center bg-white font-mono text-sm font-black shrink-0">
              {activePlate.replace(/\s+/g, '').replace(/^(\d{2})([A-Z]{1,3})(\d{2,4})$/, '$1 $2 $3')}
            </div>
          </div>
          {activeCarName && (
            <span className="text-xs font-bold text-slate-500 tracking-tight">{activeCarName}</span>
          )}
        </div>

        {/* B) FORM ELEMENTLERİ GÖVDESİ */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* SEGMENT SEÇİCİ */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 tracking-wide block uppercase">İŞLEM TÜRÜ VE KATEGORİZASYON *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 p-1.5 bg-slate-50 border border-gray-200 rounded-xl">
              {['Periyodik Bakım', 'Mekanik Bakım', 'Tamir / Onarım', 'Sarf Malzeme', 'Dış İşlem'].map((type) => {
                const isSel = serviceType === type;
                return (
                  <button
                    key={type} type="button" onClick={() => setServiceType(type)}
                    className={`py-2 px-1 rounded-lg text-[10px] sm:text-[11px] font-bold tracking-tight text-center transition-all ${
                      isSel ? 'bg-[#4F46E5] text-white shadow-sm' : 'bg-white text-slate-600 border border-gray-200/60 hover:text-slate-900'
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* İŞLEM TARİHİ VE USTA ALANLARI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 tracking-wide block uppercase">İşlem Tarihi *</label>
              <input 
                type="text" placeholder="GG/AA/YYYY" value={serviceDate}
                className={`w-full px-3 py-2.5 bg-white border rounded-xl text-sm font-semibold font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600/10 transition-all ${
                  dateError || (submitAttempted && !serviceDate) ? 'border-red-400 focus:border-red-500 bg-red-50/10 text-red-900' : 'border-gray-300 focus:border-indigo-600 text-[#0F172A]'
                }`}
                onChange={(e) => handleDateChange(e.target.value)}
              />
              {dateError && (
                <p role="alert" className="text-[10px] text-red-600 font-bold tracking-wide mt-1 flex items-center gap-1">
                  <Icon name="uyari" size="xs" />
                  {dateError}
                </p>
              )}
              {!dateError && submitAttempted && !serviceDate && <p className="text-[10px] text-red-500 font-bold mt-1">Takvim tarihi zorunludur.</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 tracking-wide block uppercase">Kurum / Usta *</label>
              <input 
                type="text" placeholder="Örn: Yetkili Servis (Borusan)" value={shopName}
                className={`w-full px-3 py-2.5 bg-white border rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600/10 transition-all ${
                  submitAttempted && !shopName.trim() ? 'border-red-400 focus:border-red-500 bg-red-50/10 text-red-900' : 'border-gray-300 focus:border-indigo-600 text-[#0F172A]'
                }`}
                onChange={(e) => setShopName(e.target.value)}
              />
              {submitAttempted && !shopName.trim() && <p className="text-[10px] text-red-500 font-bold mt-1">Servis / Atölye ismi zorunludur.</p>}
            </div>
          </div>

          {/* KM VE MALİYET ALANLARI */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 tracking-wide block uppercase">Servis KM *</label>
              <input 
                type="text" placeholder="Örn: 42.000" value={km}
                className={`w-full px-3 py-2.5 bg-white border rounded-xl text-sm font-semibold font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600/10 transition-all ${
                  submitAttempted && !km ? 'border-red-400 focus:border-red-500 bg-red-50/10 text-red-900' : 'border-gray-300 focus:border-indigo-600 text-[#0F172A]'
                }`}
                onChange={(e) => formatNumberInput(e.target.value, setKm)}
              />
              {submitAttempted && !km && <p className="text-[10px] text-red-500 font-bold mt-1">Servis kilometresi zorunludur.</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 tracking-wide block uppercase">Tutar (TL) *</label>
              <input 
                type="text" placeholder="Örn: 8.500" value={cost}
                className={`w-full px-3 py-2.5 bg-white border rounded-xl text-sm font-semibold font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600/10 transition-all ${
                  submitAttempted && !cost ? 'border-red-400 focus:border-red-500 bg-red-50/10 text-red-900' : 'border-gray-300 focus:border-indigo-600 text-[#0F172A]'
                }`}
                onChange={(e) => formatNumberInput(e.target.value, setCost)}
              />
              {submitAttempted && !cost && <p className="text-[10px] text-red-500 font-bold mt-1">Maliyet faturası zorunludur.</p>}
            </div>
          </div>

          {/* KOŞULLU GELECEK KM ALANI */}
          {serviceType === 'Periyodik Bakım' && (
            <div className="space-y-1.5 transform transition-all duration-500 ease-out origin-top animate-scaleUp">
              <label className="text-[11px] font-bold text-indigo-600 tracking-wide block uppercase">BİR SONRAKI YAĞ DEĞİŞİM KİLOMETRESİ (KM)</label>
              <input 
                type="text" placeholder="Örn: 135.000 (Opsiyonel / Akıllı Alarm)" value={nextServiceKm} maxLength={11}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 focus:border-indigo-600 rounded-xl font-semibold text-sm font-mono tracking-wide focus:outline-none focus:ring-2 focus:ring-indigo-600/10 transition-all shadow-inner text-slate-800"
                onChange={(e) => formatNumberInput(e.target.value, setNextServiceKm)}
              />
            </div>
          )}

          {/* CLOUD DROPZONE */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-bold text-slate-500 tracking-wide block uppercase">Servis Makbuzu / Faturası</label>
            <input 
              type="file" id="dialog-invoice" accept="image/*,application/pdf" className="hidden"
              onChange={(e) => setInvoiceFile(e.target.files[0])}
            />
            <label 
              htmlFor="dialog-invoice"
              className={`w-full py-4 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 ${
                !invoiceFile 
                  ? 'bg-slate-50/50 border-gray-300 text-indigo-600 hover:bg-slate-50 hover:border-indigo-400' 
                  : 'bg-emerald-50/40 border-emerald-500 text-emerald-700'
              }`}
            >
              {!invoiceFile ? (
                <>
                  <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
                  <span className="text-xs font-bold">Fatura Yükle (Önerilir)</span>
                </>
              ) : (
                <>
                  <Icon name="onay" size="lg" className="text-emerald-600" strokeWidth={2.5} />
                  <span className="text-xs font-bold truncate max-w-[280px]">Belge Eklendi ({invoiceFile.name})</span>
                </>
              )}
            </label>
          </div>

          {/* 🚀 PLAN ENTEGRASYONU: YAPILAN İŞLEM ÖZETİ (ZORUNLU ALAN & 60 KARAKTER SINIRI) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 tracking-wide block uppercase">Yapılan İşlem Özeti *</label>
            <textarea 
              placeholder="Örn: Ön fren balataları yenilendi ve hidrolik sıvıları tamamlandı."
              value={summary} rows={3}
              maxLength={60} // Destan yazmayı önleyen kurumsal uzunluk kalkanı
              className={`w-full px-3 py-2.5 bg-white border rounded-xl text-sm font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-indigo-600/10 transition-all resize-none ${
                submitAttempted && !summary.trim() ? 'border-red-400 focus:border-red-500 bg-red-50/10 text-red-900' : 'border-gray-300 focus:border-indigo-600'
              }`}
              onChange={(e) => setSummary(e.target.value)}
            />
            {submitAttempted && !summary.trim() && (
              <p className="text-[10px] text-red-500 font-bold mt-1">Yapılan işlem özeti zorunludur (Maks. 60 karakter).</p>
            )}
          </div>

        </form>

        {/* FOOTER BUTON ALANI */}
        <div className="border-t border-gray-100 p-5 flex justify-end items-center gap-3 shrink-0">
          <button 
            type="button" onClick={onClose} disabled={isSaving || isSuccess}
            className="text-gray-400 hover:text-gray-700 font-bold text-sm px-4 py-2 transition-colors"
          >
            İptal
          </button>
          
          {/* REAKTİF MÜHÜRLENDİ REÇETESİ BUTONU */}
          <button
            type="button" onClick={handleSave} disabled={isSaving || dateError || isSuccess}
            className={`w-40 py-3 rounded-xl font-black text-xs shadow-md transition-all duration-300 flex items-center justify-center gap-2 ${
              isSuccess
                ? 'bg-emerald-600 text-white scale-102 shadow-emerald-600/20' 
                : isSaving || dateError
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' 
                  : 'bg-[#4F46E5] hover:bg-indigo-700 text-white active:scale-98' 
            }`}
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isSuccess ? (
              <>
                <Icon name="onay" size="md" className="text-white animate-scaleUp" strokeWidth={3} />
                Mühürlendi!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Kaydet
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}