// =========================================================================
// OTO-CV GÜVENLİK AYAKLARI: YENİ ŞİFRE TESCİL GEÇİDİ (ResetPasswordScreen.jsx)
// İşlev: E-posta kurtarma linkiyle gelen üyelerin yeni şifre belirlemesini
//        ve subpixel netlik standartlarında buluta mühürlenmesini sağlar.
// =========================================================================

'use client';

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function ResetPasswordScreen({ onSuccess, onBack }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (password.length < 6) {
      setErrorMessage('Güvenliğiniz için şifre en az 6 karakter olmalıdır kanka.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Girdiğin şifreler birbiriyle eşleşmiyor brom.');
      return;
    }

    try {
      setLoading(true);
      // Supabase mevcut aktif kurtarma session'ı üzerinden şifreyi günceller
      const { error } = await supabase.auth.updateUser({ password: password });
      
      if (error) throw error;

      setSuccessMessage('Harika! Yeni şifreniz Supabase bulutuna tescillendi. Ana sayfaya yönlendiriliyorsunuz...');
      setTimeout(() => {
        onSuccess();
      }, 2500);
    } catch (err) {
      setErrorMessage(`Şifre tescil edilemedi kanka: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDFB] text-[#0F172A] font-sans antialiased flex flex-col justify-between select-none">
      
      {/* NAVBAR ÜST ŞERİDİ */}
      <div className="max-w-5xl w-full mx-auto px-4 pt-8 flex justify-between items-center">
        <button type="button" onClick={onBack} className="flex items-center gap-1 text-slate-500 hover:text-[#0F172A] transition-colors font-semibold text-xs">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          Ana Sayfaya Dön
        </button>
        <span className="text-xl font-display font-black tracking-tight text-[#0F172A]">OTO.CV</span>
      </div>

      {/* MERKEZİ ODAK KARTI */}
      <div className="w-full mx-auto px-4 py-12 flex-1 flex flex-col justify-center items-center">
        
        <div className="w-full max-w-md bg-white border border-slate-200/60 rounded-[32px] shadow-[0_20px_50px_rgba(15,23,42,0.01)] p-8 md:p-10 flex flex-col space-y-6 relative overflow-hidden">
          
          <div className="space-y-1.5 text-center">
            <h2 className="text-xl font-semibold tracking-tight text-[#0F172A]">Yeni Şifre Belirle</h2>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">Hesap güvenliğiniz için akılda kalıcı ve güçlü bir şifre tescil edin.</p>
          </div>

          {errorMessage && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-[11px] font-semibold px-4 py-2.5 rounded-xl flex items-start gap-2 animate-fadeIn">
              <span>⚠️ {errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-semibold px-4 py-2.5 rounded-xl flex items-start gap-2 animate-fadeIn">
              <span>✓ {successMessage}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-1 relative">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-0.5">Yeni Şifre</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full py-2.5 px-3.5 bg-[#FFFDFB] border border-slate-200 focus:border-[#0F172A] text-xs font-medium rounded-xl focus:outline-none shadow-sm" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0F172A]">
                  {showPassword ? '👁' : '👁‍🗨'}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-0.5">Şifreyi Tekrarla</label>
              <input type={showPassword ? 'text' : 'password'} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full py-2.5 px-3.5 bg-[#FFFDFB] border border-slate-200 focus:border-[#0F172A] text-xs font-medium rounded-xl focus:outline-none shadow-sm" />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-[#0F172A] hover:bg-slate-800 text-white py-3 rounded-xl font-semibold text-xs tracking-wide shadow-sm transition-colors mt-2">
              {loading ? 'Şifre Güncelleniyor...' : 'Şifreyi Güncelle'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}