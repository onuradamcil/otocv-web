// =========================================================================
// OTO-CV GLOBAL ADIM & YÜKLEME EKRANI (GlobalStepLoader.jsx)
// İşlev: Tüm site genelinde (Step geçişleri, form gönderimleri, API yüklemeleri)
//        kullanılabilen buzlu cam (backdrop-blur) efektli dinamik loader.
// =========================================================================

'use client';

import React from 'react';

export default function GlobalStepLoader({ 
  isLoading = false, 
  title = "İşleminiz Gerçekleştiriliyor...", 
  subtitle = "Lütfen pencereyi kapatmayınız." 
}) {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white/85 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none animate-fadeIn font-sans antialiased">
      
      {/* 🌀 DÖNEN ANİMASYONLU HALKA VE MERKEZ LOGO ALANI */}
      <div className="relative flex items-center justify-center">
        
        {/* Dış Dönen Gradyanlı Halka */}
        <div className="w-24 h-24 border-4 border-slate-100 border-t-indigo-600 border-r-rose-500 rounded-full animate-spin" />
        
        {/* İç Logomuz (İleride logo değiştiğinde doğrudan burayı güncelleyebilirsin) */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-black text-slate-900 tracking-tight font-display select-none">
            OTO<span className="text-indigo-600">.CV</span>
          </span>
        </div>

      </div>

      {/* 📝 DİNAMİK BİLGİLENDİRME METİNLERİ */}
      <div className="mt-6 text-center space-y-1.5 max-w-sm px-4">
        <h4 className="text-base font-black text-slate-900 tracking-tight leading-snug">
          {title}
        </h4>
        <p className="text-xs font-medium text-slate-500 leading-relaxed">
          {subtitle}
        </p>
      </div>

    </div>
  );
}