// =========================================================================
// OTO-CV WEB ADIM 4: GÜVEN MÜHRÜ VE FINAL ONAY KALKANI (Step4Verification.jsx)
// İşlev: Dinamik akıllı skorlama motoru, emojilerden arındırılmış kurumsal kimlik,
//        klik hassasiyeti yüksek UX onay kutuları ve kademeli hata paneli.
// =========================================================================

'use client';

import React, { useState, useEffect } from 'react';

export default function Step4Verification({ 
  formData, 
  setFormData, 
  onValidationChanged, // 🚀 ÇÖZÜM: Üst kabukla tam eşleşen prop ismi mühürlendi
  submitAttempted
}) {
  // Onay Kutularının Reaktif Hafızası
  const [isTuvturkAccepted, setIsTuvturkAccepted] = useState(false);
  const [isVinAccepted, setIsVinAccepted] = useState(false);
  const [dynamicScore, setDynamicScore] = useState(60);

  // =========================================================================
  // 🧠 OTO.CV AKILLI SKORLAMA MOTORU (DART FORMÜLÜ TRANSLATION)
  // =========================================================================
  useEffect(() => {
    let score = 60; // Her araç temel 60 taban puanıyla marş basar

    // 1. Ruhsat Bonusu (+15 Puan) - Step 1 registration_file senkronizasyonu sağlandı
    if (formData.registration_file || formData.ruhsat_image) {
      score += 15;
    }

    // 2. Faturalı Servis Kaydı Bonusu (Her tescilli usta faturası +5 Puan)
    if (formData.service_records && formData.service_records.length > 0) {
      formData.service_records.forEach(record => {
        if (record.invoice_file && record.shop_name?.trim().length > 0) {
          score += 5;
        }
      });
    }

    // 3. Güvenlik Üst Sınırı (Score Max %98)
    if (score > 98) {
      score = 98;
    }

    setDynamicScore(score);

    // Güncel güven skorunu parent katmanına Supabase kaydı için raporlar
    if (formData.trust_score !== score) {
      setFormData(prev => ({ ...prev, trust_score: score }));
    }
  }, [formData.registration_file, formData.ruhsat_image, formData.service_records, setFormData]);

  // =========================================================================
  // GÜVENLİK KALKANI: INTERAKTIF ONAY SÖZLEŞMESİ DENETLEYİCİSİ
  // =========================================================================
  useEffect(() => {
    const isValid = isTuvturkAccepted && isVinAccepted;
    if (onValidationChanged) {
      onValidationChanged(isValid);
    }
  }, [isTuvturkAccepted, isVinAccepted, onValidationChanged]);

  // DİNAMİK METİN VE RENK ATAMA MOTORLARI
  const getScoreMeta = () => {
    if (dynamicScore >= 90) {
      return {
        message: 'Evrak yüklemeleri eksiksiz ve faturalandırılmış servis geçmişi sunulduğu için aracınız en üst tescil mührünü almaya hak kazanıyor.',
        colorClass: 'text-indigo-700 bg-indigo-50/40 border-indigo-200/60',
        iconColor: 'text-indigo-600'
      };
    } else if (dynamicScore >= 75) {
      return {
        message: 'Yüklediğiniz resmi belgeler Oto.CV güven standardını karşılıyor. Daha fazla faturalı servis kaydı ekleyerek skorunuzu %98\'e yükseltebilirsiniz.',
        colorClass: 'text-indigo-700 bg-indigo-50/40 border-indigo-200/60',
        iconColor: 'text-indigo-600'
      };
    } else {
      return {
        message: 'Evrak eksiklikleri nedeniyle aracınız standart başlangıç skoruna sahiptir. Güven değerini artırmak için geri dönüp ruhsat ve fatura ekleyebilirsiniz.',
        colorClass: 'text-amber-700 bg-amber-50/40 border-amber-200/60',
        iconColor: 'text-amber-600'
      };
    }
  };

  const meta = getScoreMeta();

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      
      {/* ÜST MÜHÜR BADGE (SAF SVG) */}
      <div className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100/80 px-3 py-1.5 rounded-xl text-indigo-700 text-xs font-bold tracking-wide">
        <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
        </svg>
        OTO.CV GÜVEN MÜHRÜ
      </div>

      {/* BAŞLIK GRUBU */}
      <div className="space-y-1">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
          Tescil ve Güven Skoru Analizi
        </h2>
        <p className="text-xs md:text-sm text-slate-400 font-medium leading-relaxed">
          Girdiğiniz resmi evraklar ve fatura görselleri yapay zeka ve eksper onay mekanizmamız tarafından incelenerek güven mührüyle tescillenecektir.
        </p>
      </div>

      {/* =========================================================================
          👑 BLOK A: DİNAMİK SKOR KART PANOSU (DASHBOARD ELEMENT)
          ========================================================================= */}
      <div className={`border p-6 rounded-2xl flex flex-col sm:flex-row items-center sm:items-start gap-5 shadow-sm transition-all duration-300 ${meta.colorClass}`}>
        <div className={`shrink-0 ${meta.iconColor} select-none pt-0.5`}>
          <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9l3 9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
          </svg>
        </div>
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="text-base md:text-lg font-bold tracking-tight text-slate-900">
            Tahmini Oto.CV Güven Skoru: %{dynamicScore}
          </h4>
          <p className="text-xs md:text-sm font-medium text-slate-600 leading-relaxed">
            {meta.message}
          </p>
        </div>
      </div>

      <div className="border-t border-gray-100 my-4" />

      {/* =========================================================================
          👑 BLOK B: INTERAKTIF SÖZLEŞME VE BEYAN ONAY KUTULARI
          ========================================================================= */}
      <div className="space-y-3">
        
        {/* SÖZLEŞME SATIRI 1 */}
        <div 
          onClick={() => setIsTuvturkAccepted(!isTuvturkAccepted)}
          className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-150 group ${
            isTuvturkAccepted 
              ? 'bg-indigo-50/20 border-indigo-200' 
              : submitAttempted 
                ? 'bg-red-50/10 border-red-200' 
                : 'bg-white border-gray-100 hover:bg-slate-50'
          }`}
        >
          <div className="pt-0.5 shrink-0">
            <input 
              type="checkbox"
              checked={isTuvturkAccepted}
              onChange={(e) => setIsTuvturkAccepted(e.target.checked)}
              onClick={(e) => e.stopPropagation()} 
              className={`w-4 h-4 rounded border-gray-300 transition-all cursor-pointer text-indigo-600 focus:ring-indigo-600/20`}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs md:text-sm font-semibold text-slate-800 leading-relaxed group-hover:text-indigo-950 transition-colors">
              TÜVTÜRK ve e-Devlet üzerindeki kilometre ve hak sahipliği beyanlarımın doğruluğunu, aksi bir durumda tescilimin iptal edileceğini kabul ediyorum. <span className="text-red-500 font-bold">*</span>
            </p>
            {submitAttempted && !isTuvturkAccepted && (
              <p className="text-[10px] text-red-600 font-bold tracking-tight">Devam edebilmek için bu beyanı onaylamanız yasal olarak zorunludur.</p>
            )}
          </div>
        </div>

        {/* SÖZLEŞME SATIRI 2 */}
        <div 
          onClick={() => setIsVinAccepted(!isVinAccepted)}
          className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-150 group ${
            isVinAccepted 
              ? 'bg-indigo-50/20 border-indigo-200' 
              : submitAttempted 
                ? 'bg-red-50/10 border-red-200' 
                : 'bg-white border-gray-100 hover:bg-slate-50'
          }`}
        >
          <div className="pt-0.5 shrink-0">
            <input 
              type="checkbox"
              checked={isVinAccepted}
              onChange={(e) => setIsVinAccepted(e.target.checked)}
              onClick={(e) => e.stopPropagation()}
              className={`w-4 h-4 rounded border-gray-300 transition-all cursor-pointer text-indigo-600 focus:ring-indigo-600/20`}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs md:text-sm font-semibold text-slate-800 leading-relaxed group-hover:text-indigo-950 transition-colors">
              Yüklediğim ruhsat ve fatura görsellerinin şasi numaralarının (VIN) birbiriyle eşleştiğini ve sisteme sahte evrak ibraz etmediğimi beyan ederim. <span className="text-red-500 font-bold">*</span>
            </p>
            {submitAttempted && !isVinAccepted && (
              <p className="text-[10px] text-red-600 font-bold tracking-tight">Devam edebilmek için şasi numarası doğruluk beyanını mühürlemeniz zorunludur.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}