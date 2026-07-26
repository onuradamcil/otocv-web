// =========================================================================
// OTO-CV İLAN VERME: 2. ADIM BİLEŞENİ (Step2ListingDetails.jsx)
// İşlev: Fiyat, Kilometre, İl/İlçe, Açıklama ve Araç Tramer/Ekspertiz Formu.
// =========================================================================

'use client';

import React from 'react';

export default function Step2ListingDetails({ formData, updateFormData, onNext, onBack }) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6 pb-24 font-sans antialiased">
      
      {/* 2. ADIM BAŞLIK PANERİ */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">İlan Detayları</h2>
          <p className="text-xs text-slate-500 mt-1">
            Aracınızın fiyatını, kilometresini ve detaylı bilgilerini girin.
          </p>
        </div>

        <button
          onClick={onBack}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 px-4 py-2 rounded-lg cursor-pointer transition-colors"
        >
          ‹ 1. Adıma Dön
        </button>
      </div>

      {/* İSKELET GÖVDE (Tasarımını Birazdan Yapacağız Bro!) */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-8 text-center space-y-4 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 font-black text-2xl flex items-center justify-center mx-auto">
          📝
        </div>
        <h3 className="text-lg font-black text-slate-900">2. Adım Ekranı Hazır!</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Fiyat, Kilometre, İl/İlçe seçimi ve Açıklama alanlarının tasarımına geçmek için hazırız.
        </p>

        <div className="pt-4 flex justify-center gap-3">
          <button
            onClick={onNext}
            className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-6 py-3 rounded-xl transition-all cursor-pointer shadow-sm"
          >
            3. Adıma Geç (Ön İzle) ›
          </button>
        </div>
      </div>

    </div>
  );
}