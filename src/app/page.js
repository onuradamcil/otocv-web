// =========================================================================
// OTO-CV ANA OMURGA MOTORU: PREMIUM PAZARYERİ VE GARAJ GEÇİŞ KÖPRÜSÜ (page.js)
// İşlev: Canlı OAuth takibi, e-posta şifre kurtarma radarı, modüler alt
//        bileşen yönlendirmeleri ve temiz ana sayfa kabuğu.
// =========================================================================

'use client';

import React, { useState, useEffect } from 'react';
import GarageScreen from '../components/GarageScreen'; 
import OtoKarneScreen from '../components/karne/OtoKarneScreen';
import VehicleDetailsScreen from '../components/VehicleDetailsScreen';
import ResetPasswordScreen from '../components/ResetPasswordScreen'; 

// Alt bileşenler ve Modüler Vitrin Entegrasyonu
import AddVehicleWizard from '../components/add-vehicle/AddVehicleWizard';
import MaintenanceDialog from '../components/garage/MaintenanceDialog';
import VehicleVerificationScreen from '../components/VehicleVerificationScreen'; 
import VehicleAuthScreen from '../components/VehicleAuthScreen'; 
import NotificationDropdown from "../context/NotificationDropdown";
import MarketplaceView from '../components/marketplace/MarketplaceView'; // 🚀 CANLI VİTRİN BİLEŞENİ
import { supabase } from '../lib/supabase';

export default function Home() {
  // =========================================================================
  // 1. BLOK: ROTASYON STATE'LERİ VE ORKESTRASYON MERKEZİ
  // =========================================================================
  const [viewState, setViewState] = useState('landing'); 
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [activeMaintenanceVehicle, setActiveMaintenanceVehicle] = useState(null);
  const [isPublicMode, setIsPublicMode] = useState(false);
  
  const [user, setUser] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [navbarName, setNavbarName] = useState('');
  const [authInitialMode, setAuthInitialMode] = useState('login');

  // =========================================================================
  // 2. BLOK: SUPABASE AUTH SENSÖRLERİ VE COLD-START RADARI
  // =========================================================================
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('type') === 'recovery') {
        setViewState('reset-password');
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (event === 'PASSWORD_RESET') {
        setIsDropdownOpen(false);
        setViewState('reset-password');
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Giriş yapan üyenin profil adını çeken sensör
  useEffect(() => {
    if (user) {
      const fetchNavbarProfile = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();

        if (data && !error) {
          const formatted = `${data.first_name.charAt(0).toUpperCase()}${data.first_name.slice(1)} ${data.last_name.charAt(0).toUpperCase()}.`;
          setNavbarName(formatted);
        } else {
          setNavbarName('Hesabım');
        }
      };
      fetchNavbarProfile();
    } else {
      setNavbarName('');
    }
  }, [user]);

  const handleGarageNavigation = () => {
    setIsDropdownOpen(false);
    if (user) {
      setViewState('garage');
    } else {
      setAuthInitialMode('login'); 
      setViewState('auth');
    }
  };

  const handleSignOut = async () => {
    setIsDropdownOpen(false);
    await supabase.auth.signOut();
    setUser(null);
    setNavbarName('');
    setViewState('landing');
  };

  // =========================================================================
  // 3. BLOK: SEYRÜSEFER EKRAN ROTASYON DÖNGÜLERİ
  // =========================================================================
  if (viewState === 'auth') {
    return (
      <VehicleAuthScreen 
        initialMode={authInitialMode} 
        onAuthSuccess={(sessionUser) => {
          setUser(sessionUser);
          setViewState('garage');
        }}
        onBack={() => setViewState('landing')}
      />
    );
  }

  if (viewState === 'reset-password') {
    return (
      <ResetPasswordScreen 
        onSuccess={() => setViewState('landing')}
        onBack={() => setViewState('landing')}
      />
    );
  }

  if (viewState === 'details' && selectedVehicle) {
    return (
      <VehicleDetailsScreen 
        vehicle={selectedVehicle} 
        isPublicView={isPublicMode} 
        onBack={() => {
          if (isPublicMode) {
            setViewState('landing');
          } else {
            setViewState('garage');
          }
        }} 
        onViewKarne={() => setViewState('karne')}
      />
    );
  }

  if (viewState === 'karne' && selectedVehicle) {
    return (
      <OtoKarneScreen vehicle={selectedVehicle} onBack={() => setViewState('details')} />
    );
  }

  if (viewState === 'add-vehicle') {
    return (
      <AddVehicleWizard 
        onBack={() => setViewState('garage')} 
        onWizardComplete={() => setViewState('garage')}
      />
    );
  }

  // =========================================================================
  // 4. BLOK: GLOBAL NAVBAR PANELİ VE RESMİ MİZANPAJ ŞABLONU
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#FFFDFB] text-[#0F172A] font-sans antialiased tracking-tight">
      
      {/* NAVBAR ÜST PANEL ŞERİDİ */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          
          {/* SOL KANAT: LOGO VE LİNKLER */}
          <div className="flex items-center gap-8">
            <span onClick={() => { setIsDropdownOpen(false); setViewState('landing'); }} className="text-base font-black tracking-tight cursor-pointer text-slate-900 font-display">
              OTO.CV
            </span>
            <div className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-500">
              <span onClick={() => { setIsDropdownOpen(false); setViewState('landing'); }} className={`cursor-pointer transition-colors ${viewState === 'landing' ? 'text-indigo-600 font-extrabold' : 'hover:text-slate-900'}`}>Pazaryeri Vitrini</span>
              <span className="hover:text-slate-900 cursor-not-allowed text-slate-400">Kurumsal Çözümler</span>
            </div>
          </div>

          {/* SAĞ KANAT: KULLANICI OTURUM KONTROLLERİ */}
          <div className="flex items-center gap-4 relative">
            <NotificationDropdown onNavigateToGarage={handleGarageNavigation} />

            {!user ? (
              <div className="flex items-center gap-2.5 text-xs font-bold text-slate-600">
                <span onClick={() => { setAuthInitialMode('login'); setViewState('auth'); }} className="hover:text-indigo-600 cursor-pointer transition-colors">Giriş Yap</span>
                <span className="text-slate-200">|</span>
                <span onClick={() => { setAuthInitialMode('register_step1'); setViewState('auth'); }} className="hover:text-indigo-600 cursor-pointer transition-colors">Hesap Aç</span>
              </div>
            ) : (
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  <span>{navbarName || 'Hesabım'}</span>
                  <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-56 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden z-50 text-xs font-semibold text-slate-700">
                    <div className="bg-slate-50 px-4 py-3 border-b border-gray-100 flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase font-mono">HESAP DETAYI</span>
                      <span className="text-slate-800 font-bold truncate mt-0.5">{user.email}</span>
                    </div>

                    <div className="py-1">
                      <DropdownRow title="Bana Özel Özet" onClick={() => { setIsDropdownOpen(false); setViewState('dashboard'); }} />
                      <DropdownRow title="Tescilli Taşıtlarım" onClick={() => { setIsDropdownOpen(false); setViewState('garage'); }} />
                      <DropdownRow title="Sorgulama Geçmişim" onClick={() => { setIsDropdownOpen(false); setViewState('sorgu-gecmisi'); }} />
                      <DropdownRow title="Paketlerim & Ödemeler" onClick={() => { setIsDropdownOpen(false); setViewState('paketler'); }} />
                      <DropdownRow title="Hesabım" onClick={() => { setIsDropdownOpen(false); setViewState('hesabim'); }} />
                    </div>

                    <div className="border-t border-gray-100 bg-rose-50/30">
                      <button 
                        type="button" 
                        onClick={handleSignOut}
                        className="w-full px-4 py-3 text-left font-bold text-rose-600 hover:bg-rose-50 flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span>Çıkış Yap</span>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25V15M12 9l3 3m0 0l-3 3m3-3H8.25" /></svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* SUB-ROUTE YÖNLENDİRME AKIŞLARI */}
      {viewState === 'garage' ? (
        <div className="animate-fadeIn relative">
          <GarageScreen 
            onViewDetails={(car) => { setSelectedVehicle(car); setIsPublicMode(false); setViewState('details'); }}
            onViewKarne={(car) => { setSelectedVehicle(car); setViewState('karne'); }}
            onOpenMaintenance={(incomingVehicle) => setActiveMaintenanceVehicle(incomingVehicle)}
            onNavigateToAdd={() => setViewState('add-vehicle')}
          />
          {activeMaintenanceVehicle && (
            <MaintenanceDialog isOpen={true} vehicle={activeMaintenanceVehicle} onClose={() => setActiveMaintenanceVehicle(null)} onRecordAdded={() => {}} />
          )}
        </div>
      ) : viewState === 'verify' ? (
        <div className="animate-fadeIn">
          <VehicleVerificationScreen 
            onVehicleFound={(car, role) => {
              setSelectedVehicle(car);
              setIsPublicMode(role === 'public'); 
              setViewState('details'); 
            }}
          />
        </div>
      ) : viewState === 'dashboard' ? (
        <div className="max-w-4xl mx-auto py-20 text-center text-slate-400 text-xs font-bold animate-fadeIn">
          📊 Bana Özel Özet / Dashboard Sayfası Yakında Buraya Enjekte Edilecek Kanka!
        </div>
      ) : viewState === 'sorgu-gecmisi' ? (
        <div className="max-w-4xl mx-auto py-20 text-center text-slate-400 text-xs font-bold animate-fadeIn">
          🔍 Sorgulama Geçmişim Sayfası Yakında Buraya Enjekte Edilecek Kanka!
        </div>
      ) : viewState === 'paketler' ? (
        <div className="max-w-4xl mx-auto py-20 text-center text-slate-400 text-xs font-bold animate-fadeIn">
          💳 Paketlerim & Ödeme Geçmişi Yönetim Sayfası Yakında Buraya Enjekte Edilecek Kanka!
        </div>
      ) : viewState === 'hesabim' ? (
        <div className="max-w-4xl mx-auto py-20 text-center text-slate-400 text-xs font-bold animate-fadeIn">
          👤 Hesabım / Profil ve Şifre Ayarları Yönetim Sayfası Yakında Buraya Enjekte Edilecek Kanka!
        </div>
      ) : viewState === 'sigorta-teklif' ? (
        <div className="max-w-4xl mx-auto py-20 text-center text-slate-400 text-xs font-bold animate-fadeIn">
          🛡️ Akıllı Sigorta & Kasko Teklif Robotu Yakında Buraya Enjekte Edilecek Kanka!
        </div>
      ) : viewState === 'bakim-planlayici' ? (
        <div className="max-w-4xl mx-auto py-20 text-center text-slate-400 text-xs font-bold animate-fadeIn">
          🔧 Dijital Periyodik Bakım & Usta Takip Planlayıcısı Yakında Buraya Enjekte Edilecek Kanka!
        </div>
      ) : (
        /* 🚀 MODÜLER CANLI VİTRİN BİLEŞENİ (MarketplaceView.jsx) */
        <MarketplaceView 
          onSelectVehicle={(item) => {
            setSelectedVehicle(item);
            setIsPublicMode(true);
            setViewState('details');
          }}
          onNavigateToGarage={handleGarageNavigation}
          onNavigateToVerify={() => setViewState('verify')}
          onNavigateToInsurance={() => setViewState('sigorta-teklif')}
          onNavigateToMaintenance={() => setViewState('bakim-planlayici')}
        />
      )}

    </div>
  );
}

// INTERNAL DROPDOWN BİLEŞENİ
function DropdownRow({ title, onClick }) {
  return (
    <div 
      onClick={onClick}
      className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer flex justify-between items-center transition-colors text-slate-700 hover:text-slate-950 font-bold text-xs"
    >
      <span>{title}</span>
      <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
    </div>
  );
}