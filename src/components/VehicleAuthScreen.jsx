// =========================================================================
// OTO-CV MODÜL 5: PREMIUM KİMLİK DOĞRULAMA VE AUTH GEÇİDİ (VehicleAuthScreen.jsx)
// İşlev: Google OAuth girişi aktif, Apple girişi rezerve, resmi kurumsal dilli
//        ve "Oturum Açık Kalsın" checkbox altyapısı işlevselleştirilmiş geçit.
// =========================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Icon from './common/icons';

export default function VehicleAuthScreen({ initialMode = 'login', onAuthSuccess, onBack }) {
  // =========================================================================
  // 1. BLOK: REAKTİF MOD VE FORM INPUT HAFIZA ODALARI
  // =========================================================================
  const [authMode, setAuthMode] = useState('login'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [rememberMe, setRememberMe] = useState(true); // Kurumsal UX standardı gereği varsayılan aktiftir
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    setAuthMode(initialMode);
    setErrorMessage('');
    setSuccessMessage('');
  }, [initialMode]);

  useEffect(() => {
    setErrorMessage('');
    setSuccessMessage('');
  }, [authMode]);

  // =========================================================================
  // 2. BLOK: INPUT FILTRELEME VE TELEFON SÜRÜCÜLERI
  // =========================================================================
  const handlePhoneChange = (e) => {
    const rawInput = e.target.value;
    let cleaned = rawInput.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    setPhone(cleaned);
  };

  const handleRegisterStep1Submit = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setAuthMode('register_step2'); 
  };

  // =========================================================================
  // 3. BLOK: ASENKRON KURUMSAL AUTH VE SOSYAL MEDYA MOTORU
  // =========================================================================
  
  // Alternatif Sosyal Giriş Yönetimi (Google Entegrasyonu Tamamlandı)
  const handleSocialLogin = async (provider) => {
    if (provider === 'apple') return; // Apple geliştirici hesabı adımı için beklemede

    try {
      setErrorMessage('');
      setLoading(true);

      // Kalıcılık tercihini sosyal girişe de iletiyoruz
      localStorage.setItem('otocv_remember_me', rememberMe.toString());

      // Google OAuth Giriş Protokolü Tetikleniyor
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`,
          queryParams: {
            prompt: rememberMe ? 'consent' : 'select_account',
          }
        }
      });
      if (error) throw error;
    } catch (err) {
      setErrorMessage("Google ile giriş işlemi şu anda gerçekleştirilemiyor. Lütfen daha sonra tekrar deneyiniz.");
    } finally {
      setLoading(false);
    }
  };

  // Şifre Kurtarma Bağlantısı Gönderme Motoru
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    if (!email.trim()) {
      setErrorMessage("Lütfen geçerli bir e-posta adresi giriniz.");
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`, 
      });
      if (error) throw error;
      setSuccessMessage("Şifre sıfırlama bağlantısı e-posta adresinize başarıyla gönderilmiştir.");
    } catch (err) {
      setErrorMessage("Şifre sıfırlama bağlantısı gönderilemedi. Lütfen bilgilerinizi kontrol ediniz.");
    } finally {
      setLoading(false);
    }
  };

  // Standart E-posta ve Şifre ile Kayıt/Giriş Motoru
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim() || !password) {
      setErrorMessage("Lütfen gerekli alanları eksiksiz doldurunuz.");
      return;
    }

    try {
      setLoading(true);

      // 🚀 Arayüzdeki Remember Me verisini supabase.js siber köprüsünün okuyacağı odaya mühürlüyoruz
      localStorage.setItem('otocv_remember_me', rememberMe.toString());

      if (authMode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });
        if (error) throw error;
        onAuthSuccess(data.user);
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
        });
        if (authError) throw authError;

        if (authData?.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              phone_number: phone.trim() 
            });

          if (profileError) throw profileError;
          onAuthSuccess(authData.user);
        }
      }
    } catch (err) {
      if (err.message.includes('Invalid login credentials')) {
        setErrorMessage("E-posta adresiniz veya şifreniz hatalı. Lütfen kontrol ediniz.");
      } else if (err.message.includes('User already registered')) {
        setErrorMessage("Bu e-posta adresiyle kayıtlı bir hesap zaten mevcut.");
      } else if (err.message.includes('Password should be at least')) {
        setErrorMessage("Şifreniz güvenlik gereği en his en az 6 karakterden oluşmalıdır.");
      } else {
        setErrorMessage("İşlem gerçekleştirilirken bir sistem hatası oluştu. Lütfen tekrar deneyiniz.");
      }
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // 4. BLOK: INTERFACE GÖRSEL RENDER KATMANI
  // =========================================================================
  // Kendi baslik seridi, ortadaki logo ve min-h-screen kaldirildi: (auth)
  // catisi artik AuthHeader'i ve tam yuksekligi sagliyor. Logo catida
  // durdugu icin burada tekrari gereksiz.
  return (
    <div className="flex-1 flex flex-col justify-center select-none">

      {/* MERKEZİ GÖVDE PANELİ */}
      <div className="w-full mx-auto px-4 py-10 flex-1 flex flex-col justify-center items-center">

        {/* REAKTİF ODAK KARTI */}
        <div className="w-full max-w-md bg-white border border-slate-200/70 rounded-[32px] shadow-[0_20px_50px_rgba(15,23,42,0.01)] p-8 md:p-9 flex flex-col space-y-5 relative overflow-hidden">
          
          {/* BAŞLIK GRUBU */}
          <div className="space-y-1 text-center">
            <h1 className="text-xl font-semibold tracking-tight text-[#0F172A]">
              {authMode === 'login' && 'Giriş Yap'}
              {authMode === 'register_step1' && 'Hesap Aç'}
              {authMode === 'register_step2' && 'Profili Tamamla'}
              {authMode === 'forgot_password' && 'Şifremi Unuttum'}
            </h1>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              {authMode === 'login' && 'Oto.CV tescilli dünyasına güvenle adım atın.'}
              {authMode === 'register_step1' && 'Dijital garajınızı kurmak için ilk adımı atın.'}
              {authMode === 'register_step2' && 'Kurumsal kimlik tesciliniz için bilgileri doldurun.'}
              {authMode === 'forgot_password' && 'Hesabınıza kayıtlı e-posta adresini girin.'}
            </p>
          </div>

          {/* SİBER HATA AND BAŞARI ALERT BANNERLARI */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-[11px] font-semibold px-4 py-2.5 rounded-xl flex items-start gap-2 animate-fadeIn">
              <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-semibold px-4 py-2.5 rounded-xl flex items-start gap-2 animate-fadeIn">
              <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>{successMessage}</span>
            </div>
          )}

          {/* AKIŞ A: LOGIN FORMU */}
          {authMode === 'login' && (
            <form onSubmit={handleAuthSubmit} className="space-y-4 animate-fadeIn">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-0.5">E-posta Adresi</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@otocv.com" className="w-full py-2.5 px-3.5 bg-[#FFFDFB] border border-slate-200 focus:border-[#0F172A] text-xs font-medium rounded-xl focus:outline-none transition-colors shadow-sm" />
              </div>
              
              <div className="space-y-1 relative">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-0.5">Şifre</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full py-2.5 px-3.5 bg-[#FFFDFB] border border-slate-200 focus:border-[#0F172A] text-xs font-medium rounded-xl focus:outline-none transition-colors pr-12 shadow-sm" />
                  {/* Etiket BUTONDA: içeriği tek başına ikon olan butonun adını ekran
                      okuyucu ancak buradan öğrenir. aria-pressed açık/kapalı
                      durumunu bildirir. 44px dokunma alanı WCAG asgarisi. */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    aria-pressed={showPassword}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 grid place-items-center rounded-lg text-slate-400 hover:text-[#0F172A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]"
                  >
                    <Icon name={showPassword ? 'gozKapali' : 'goz'} size="md" />
                  </button>
                </div>
              </div>

              {/* 🚀 AKILLI GEÇİŞ KÖPRÜLÜ SEÇENEK ALANI */}
              <div className="flex justify-between items-center px-0.5 text-xs font-semibold select-none">
                <label className="flex items-center gap-2 text-slate-500 hover:text-slate-800 cursor-pointer transition-colors font-medium">
                  <input 
                    type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 accent-[#0F172A]" 
                  />
                  <span>Oturum açık kalsın</span>
                </label>
                <span onClick={() => setAuthMode('forgot_password')} className="text-indigo-600 hover:text-indigo-800 cursor-pointer transition-colors font-bold">
                  Şifremi unuttum
                </span>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-[#0F172A] hover:bg-slate-800 text-white py-3 rounded-xl font-semibold text-xs tracking-wide shadow-sm transition-colors active:scale-[0.99]">
                {loading ? 'Doğrulanıyor...' : 'E-posta ile giriş yap'}
              </button>

              {/* ARA BÖLÜCÜ ÇİZGİ */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="flex-shrink mx-3 text-[10px] text-slate-300 font-bold uppercase tracking-widest">veya</span>
                <div className="flex-grow border-t border-slate-100"></div>
              </div>

              {/* 🚀 SOSYAL MEDYA GİRİŞ AKSİYONLARI */}
              <div className="grid grid-cols-2 gap-3">
                {/* GOOGLE GİRİŞ BUTONU (TAMAMEN AKTİF) */}
                <button 
                  type="button" onClick={() => handleSocialLogin('google')}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors active:scale-[0.98]"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span>Google ile giriş yap</span>
                </button>
                
                {/* APPLE GİRİŞ BUTONU (GELİŞTİRİCİ HESABI BEKLEMEDE / ŞIK PASİF) */}
                <button 
                  type="button" 
                  disabled={true}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 border border-slate-100 rounded-xl bg-slate-50/50 text-slate-300 text-xs font-semibold cursor-not-allowed opacity-50 select-none"
                >
                  <svg className="w-3.5 h-3.5 shrink-0 fill-current text-slate-300" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.07 2.47.3 3.64 2.18-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42.14-.68.63zM15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.37-.6.62-1.12 1.76-1 2.87 1.07.08 2.17-.37 2.83-1.18z" />
                  </svg>
                  <span>Apple ile giriş yap</span>
                </button>
              </div>
            </form>
          )}

          {/* AKIŞ B: KAYIT ADIM 1 */}
          {authMode === 'register_step1' && (
            <form onSubmit={handleRegisterStep1Submit} className="space-y-4 animate-fadeIn">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-0.5">E-posta Adresi</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@otocv.com" className="w-full py-2.5 px-3.5 bg-[#FFFDFB] border border-slate-200 focus:border-[#0F172A] text-xs font-medium rounded-xl focus:outline-none transition-colors shadow-sm" />
              </div>
              <button type="submit" className="w-full bg-[#0F172A] hover:bg-slate-800 text-white py-3 rounded-xl font-semibold text-xs tracking-wide shadow-sm transition-colors active:scale-[0.99] flex items-center justify-center gap-1 mt-2">
                E-posta ile Devam Et
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              </button>
            </form>
          )}

          {/* AKIŞ C: KAYIT ADIM 2 */}
          {authMode === 'register_step2' && (
            <form onSubmit={handleAuthSubmit} className="space-y-3.5 animate-fadeIn">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-0.5">Adınız</label>
                  <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Örn: Ahmet" className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#0F172A] transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-0.5">Soyadınız</label>
                  <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Örn: Yılmaz" className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#0F172A] transition-colors" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-0.5">Cep Telefonu (Sıfırsız)</label>
                <input 
                  type="tel" required maxLength={10} value={phone} onChange={handlePhoneChange} 
                  placeholder="5XX XXX XX XX" 
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#0F172A] transition-colors font-mono tracking-widest text-slate-800" 
                />
              </div>
              <div className="space-y-1 relative">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-0.5">Şifre Belirle</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#0F172A] pr-12 transition-colors" />
                  {/* Etiket BUTONDA: içeriği tek başına ikon olan butonun adını ekran
                      okuyucu ancak buradan öğrenir. aria-pressed açık/kapalı
                      durumunu bildirir. 44px dokunma alanı WCAG asgarisi. */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    aria-pressed={showPassword}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 grid place-items-center rounded-lg text-slate-400 hover:text-[#0F172A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]"
                  >
                    <Icon name={showPassword ? 'gozKapali' : 'goz'} size="md" />
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-semibold text-xs tracking-wide shadow-md transition-colors active:scale-[0.98] mt-2">
                {loading ? 'Kaydediliyor...' : 'Tescili Tamamla ve Garaja Gir'}
              </button>
            </form>
          )}

          {/* AKIŞ D: ŞİFREMİ UNUTTUM */}
          {authMode === 'forgot_password' && (
            <form onSubmit={handlePasswordReset} className="space-y-4 animate-fadeIn">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-0.5">E-posta Adresi</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Kayıtlı e-posta adresinizi girin..." className="w-full py-2.5 px-3.5 bg-[#FFFDFB] border border-slate-200 focus:border-[#0F172A] text-xs font-medium rounded-xl focus:outline-none transition-colors shadow-sm" />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-[#0F172A] hover:bg-slate-800 text-white py-3 rounded-xl font-semibold text-xs tracking-wide shadow-sm transition-colors active:scale-[0.99] mt-2 flex justify-center items-center gap-1.5">
                {loading ? 'Gönderiliyor...' : 'Bağlantı Gönder'}
                {!loading && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>}
              </button>
            </form>
          )}

          {/* ALT PANEL: SEKMESEL MOD DEĞİŞTİRİCİ */}
          <div className="text-center pt-4 mt-1 border-t border-slate-100 flex flex-col gap-2">
            {authMode !== 'login' && (
              <button 
                type="button" onClick={() => setAuthMode('login')}
                className="text-xs font-semibold text-slate-500 hover:text-[#0F172A] transition-colors"
              >
                Giriş Ekranına Dön
              </button>
            )}
            
            {/* "Henüz hesabın yok mu?" Başlığı and Lüks Buton Formu */}
            {authMode === 'login' && (
              <div className="space-y-2 pt-1">
                <span className="text-xs font-semibold text-slate-700 block">Henüz hesabın yok mu?</span>
                <button 
                  type="button" onClick={() => setAuthMode('register_step1')}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors border border-slate-200 shadow-sm"
                >
                  Hesap aç
                </button>
              </div>
            )}
          </div>

        </div>

        {/* YASAL LINK ŞERİDİ */}
        <div className="text-[11px] text-slate-400 font-medium flex gap-3 tracking-wide mt-8">
          <span className="hover:text-[#0F172A] cursor-pointer transition-colors">Bireysel Hesap Sözleşmesi</span>
          <span>•</span>
          <span className="hover:text-[#0F172A] cursor-pointer transition-colors">KVKK Aydınlatma Metni</span>
        </div>
      </div>
    </div>
  );
}