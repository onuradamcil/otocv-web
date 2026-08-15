// =========================================================================
// OTO-CV GÜVENLİK AYAKLARI: YENİ ŞİFRE TESCİL GEÇİDİ (ResetPasswordScreen.jsx)
// İşlev: E-posta kurtarma linkiyle gelen üyelerin yeni şifre belirlemesini
//        ve subpixel netlik standartlarında buluta mühürlenmesini sağlar.
// =========================================================================

'use client';

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import Icon from './common/icons';

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
      setErrorMessage('Şifreniz en az 6 karakter olmalıdır.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Girdiğiniz şifreler birbiriyle eşleşmiyor.');
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
      setErrorMessage('Şifre güncellenemedi. Bağlantınızın süresi dolmuş olabilir; giriş ekranından yeni bağlantı isteyin.');
    } finally {
      setLoading(false);
    }
  };

  // Kendi baslik seridi ve min-h-screen kaldirildi: (auth) catisi artik
  // AuthHeader'i ve tam yuksekligi sagliyor. Ikisi birlikte kalsa logo ve
  // "Anasayfa" baglantisi cift gorunur, ayrica cift yukseklik olusur.
  return (
    <div className="flex-1 flex flex-col justify-center select-none">

      {/* MERKEZİ ODAK KARTI */}
      <div className="w-full mx-auto px-4 py-12 flex-1 flex flex-col justify-center items-center">
        
        <div className="w-full max-w-md bg-white border border-slate-200/60 rounded-[32px] shadow-[0_20px_50px_rgba(15,23,42,0.01)] p-8 md:p-10 flex flex-col space-y-6 relative overflow-hidden">
          
          <div className="space-y-1.5 text-center">
            <h1 className="text-xl font-semibold tracking-tight text-[#0F172A]">Yeni Şifre Belirle</h1>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">Hesap güvenliğiniz için akılda kalıcı ve güçlü bir şifre tescil edin.</p>
          </div>

          {errorMessage && (
            <div role="alert" className="bg-red-50 border border-red-100 text-red-600 text-yardimci font-semibold px-4 py-2.5 rounded-xl flex items-start gap-2 animate-fadeIn">
              <Icon name="uyari" size="sm" className="mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div role="status" className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-yardimci font-semibold px-4 py-2.5 rounded-xl flex items-start gap-2 animate-fadeIn">
              <Icon name="onay" size="sm" className="mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-1 relative">
              <label className="text-etiket font-semibold text-slate-500 uppercase tracking-wider pl-0.5">Yeni Şifre</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full py-2.5 px-3.5 bg-[#FFFDFB] border border-slate-200 focus:border-[#0F172A] text-xs font-medium rounded-xl focus:outline-none shadow-sm" />
                {/* Etiket ikonda değil BUTONDA: içeriği tek başına ikon olan
                    butonun adını ekran okuyucu ancak buradan öğrenir. */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  aria-pressed={showPassword}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 grid place-items-center rounded-lg text-slate-500 hover:text-[#0F172A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]"
                >
                  <Icon name={showPassword ? 'gozKapali' : 'goz'} size="md" />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-etiket font-semibold text-slate-500 uppercase tracking-wider pl-0.5">Şifreyi Tekrarla</label>
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