// =========================================================================
// OTO-CV İLAN VERME: 3. ADIM BİLEŞENİ (Step3PreviewAndPublish.jsx)
// İşlev: İlan Kartı Ön İzleme, Son Kontrol ve Supabase Veritabanına Yayınlama.
// =========================================================================

'use client';

import React from 'react';

export default function Step3PreviewAndPublish({ formData, onBack, onSuccess }) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6 pb-24 font-sans antialiased">
      <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Ön İzleme ve Yayınla</h2>
          <p className="text-xs text-slate-500 mt-1">İlanınız yayına girmeden önceki son kontrol ekranı.</p>
        </div>
        <button onClick={onBack} className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 px-4 py-2 rounded-lg cursor-pointer">
          ‹ 2. Adıma Dön
        </button>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-xl p-8 text-center space-y-4 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 font-black text-2xl flex items-center justify-center mx-auto">
          🚀
        </div>
        <h3 className="text-lg font-black text-slate-900">3. Adım: Ön İzleme Ekranı Hazır!</h3>
        <button 
          onClick={onSuccess} 
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-8 py-3 rounded-xl cursor-pointer shadow-md"
        >
          İlanı Canlıya Al ve Yayınla ✨
        </button>
      </div>
    </div>
  );
}