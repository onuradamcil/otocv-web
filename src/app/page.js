// =========================================================================
// OTO-CV ANA OMURGA MOTORU: PREMIUM PAZARYERİ VE GARAJ GEÇİŞ KÖPRÜSÜ (page.js)
// İşlev: Canlı OAuth takibi, e-posta şifre kurtarma radarı, modüler yönlendirmeler,
//        Masaüstü Web Standartlarında HOVER (Açılır) İlan Ver Menüsü.
// =========================================================================

'use client';

import React, { useState, useEffect } from 'react';
import GarageScreen from '../components/GarageScreen'; 
import OtoKarneScreen from '../components/karne/OtoKarneScreen';
import VehicleDetailsScreen from '../components/VehicleDetailsScreen';
import ResetPasswordScreen from '../components/ResetPasswordScreen'; 

// Alt bileşenler ve Modüler Entegrasyonlar
import AddVehicleWizard from '../components/add-vehicle/AddVehicleWizard';
import MaintenanceDialog from '../components/garage/MaintenanceDialog';
import VehicleVerificationScreen from '../components/VehicleVerificationScreen'; 
import VehicleAuthScreen from '../components/VehicleAuthScreen'; 
import NotificationDropdown from "../context/NotificationDropdown";
import MarketplaceView from '../components/marketplace/MarketplaceView'; 
import MyListingsScreen from '../components/marketplace/MyListingsScreen'; 
import CreateListingScreen from '../components/marketplace/CreateListingScreen'; // 🚀 TAM SAYFA İLAN SİHİRBAZI
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
  const [isIlanMenuOpen, setIsIlanMenuOpen] = useState(false); 
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

  // =========================================================================
  // YÖNLENDİRME VE AKSİYON HANDLERLARI
  // =========================================================================
  const handleGarageNavigation = () => {
    setIsDropdownOpen(false);
    setIsIlanMenuOpen(false);
    if (user) {
      setViewState('garage');
    } else {
      setAuthInitialMode('login'); 
      setViewState('auth');
    }
  };

  const handleMyListingsNavigation = () => {
    setIsDropdownOpen(false);
    setIsIlanMenuOpen(false);
    if (user) {
      setViewState('my-listings');
    } else {
      setAuthInitialMode('login');
      setViewState('auth');
    }
  };

  const handleOpenWizard = () => {
    setIsIlanMenuOpen(false);
    if (user) {
      setViewState('create-listing');
    } else {
      setAuthInitialMode('login');
      setViewState('auth');
    }
  };

  const handleOpenGarageListing = () => {
    setIsIlanMenuOpen(false);
    if (user) {
      setViewState('garage');
    } else {
      setAuthInitialMode('login');
      setViewState('auth');
    }
  };

  const handleSignOut = async () => {
    setIsDropdownOpen(false);
    setIsIlanMenuOpen(false);
    await supabase.auth.signOut();
    setUser(null);
    setNavbarName('');
    setViewState('landing');
  };

  // =========================================================================
  // 3. BLOK: SEYRÜSEFER EKRAN ROTASYON DÖNGÜLERİ (ERKEN DÖNÜŞLER)
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
      <OtoKarneScreen vehicle={selectedVehicle} onBack={() => setViewState('details')} isPublicView={isPublicMode} />
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

  // 🚀 TAM SAYFA ARABAM.COM STİLİ SIFIRDAN İLAN VERME EKRANI (FULL PAGE - ANA NAVBAR'SIZ)
  if (viewState === 'create-listing') {
    return (
      <CreateListingScreen 
        user={user}
        onBack={() => setViewState('landing')}
        onSuccess={() => setViewState('landing')}
      />
    );
  }

  // =========================================================================
  // 4. BLOK: GLOBAL MASAÜSTÜ NAVBAR VE HOVER İLAN MENÜSÜ
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#FFFDFB] text-[#0F172A] font-sans antialiased tracking-tight">
      
      {/* NAVBAR ÜST PANEL ŞERİDİ */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          
          <div className="flex items-center gap-8">
            <span onClick={() => { setIsDropdownOpen(false); setViewState('landing'); }} className="text-base font-black tracking-tight cursor-pointer text-slate-900 font-display">
              OTO.CV
            </span>
            <div className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-500">
              <span onClick={() => { setIsDropdownOpen(false); setViewState('landing'); }} className={`cursor-pointer transition-colors ${viewState === 'landing' ? 'text-indigo-600 font-extrabold' : 'hover:text-slate-900'}`}>Pazaryeri Vitrini</span>
              <span className="hover:text-slate-900 cursor-not-allowed text-slate-400">Kurumsal Çözümler</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            
            <div 
              className="relative"
              onMouseEnter={() => setIsIlanMenuOpen(true)}
              onMouseLeave={() => setIsIlanMenuOpen(false)}
            >
              <button
                type="button"
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-md transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer border border-amber-500/30"
              >
                <span>Ücretsiz İlan Ver</span>
                <svg className={`w-3 h-3 transition-transform duration-150 ${isIlanMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {isIlanMenuOpen && (
                <div className="absolute right-0 top-full pt-1.5 w-[540px] z-50 animate-fadeIn">
                  <div className="bg-white border border-slate-200 rounded-xl shadow-2xl p-4 grid grid-cols-2 gap-4 border-t-2 border-t-amber-500">
                    
                    <div 
                      onClick={handleOpenWizard}
                      className="bg-[#FFFDF0] hover:bg-[#FFF9D6] border border-amber-200/80 rounded-lg p-4 transition-all duration-200 cursor-pointer group flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-10 h-10 rounded-full bg-amber-400 text-slate-950 font-black text-base flex items-center justify-center mx-auto mb-2 shadow-sm group-hover:scale-110 transition-transform">
                          📋
                        </div>
                        <h4 className="text-sm font-black text-slate-900 text-center mb-3 tracking-tight">
                          Sıfırdan İlan Ver
                        </h4>

                        <div className="relative pl-5 space-y-2.5 my-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-amber-300/80">
                          <div className="relative text-[11px] text-slate-700 font-bold flex items-center">
                            <span className="absolute -left-5 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-100" />
                            <span>Kataloğumuzdan aracı seç</span>
                          </div>
                          <div className="relative text-[11px] text-slate-700 font-bold flex items-center">
                            <span className="absolute -left-5 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-100" />
                            <span>2 dakikada ilana çıkar</span>
                          </div>
                          <div className="relative text-[11px] text-slate-700 font-bold flex items-center">
                            <span className="absolute -left-5 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-100" />
                            <span>Binlerce alıcıya hızlıca ulaş</span>
                          </div>
                        </div>
                      </div>

                      <button className="mt-3 w-full bg-amber-400 group-hover:bg-amber-500 text-slate-950 font-black text-xs py-2.5 rounded-md transition-colors shadow-sm cursor-pointer">
                        Sıfırdan İlan Aç &gt;
                      </button>
                    </div>

                    <div 
                      onClick={handleOpenGarageListing}
                      className="bg-[#F0F5FF] hover:bg-[#E2ECFF] border border-indigo-200/80 rounded-lg p-4 transition-all duration-200 cursor-pointer group flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-black text-base flex items-center justify-center mx-auto mb-2 shadow-sm group-hover:scale-110 transition-transform">
                          🚗
                        </div>
                        <h4 className="text-sm font-black text-slate-900 text-center mb-3 tracking-tight">
                          Garajımdan İlan Ver
                        </h4>

                        <div className="relative pl-5 space-y-2.5 my-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-indigo-300">
                          <div className="relative text-[11px] text-slate-700 font-bold flex items-center">
                            <span className="absolute -left-5 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-2 ring-indigo-100" />
                            <span>Tescilli aracını garajdan seç</span>
                          </div>
                          <div className="relative text-[11px] text-slate-700 font-bold flex items-center">
                            <span className="absolute -left-5 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-2 ring-indigo-100" />
                            <span>Bilgiler otomatik yüklensin</span>
                          </div>
                          <div className="relative text-[11px] text-slate-700 font-bold flex items-center">
                            <span className="absolute -left-5 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-2 ring-indigo-100" />
                            <span>Tek tıkla anında yayına al</span>
                          </div>
                        </div>
                      </div>

                      <button className="mt-3 w-full bg-indigo-600 group-hover:bg-indigo-700 text-white font-black text-xs py-2.5 rounded-md transition-colors shadow-sm cursor-pointer">
                        Garajdan İlan Çıkar &gt;
                      </button>
                    </div>

                  </div>
                </div>
              )}
            </div>

            <NotificationDropdown onNavigateToGarage={handleGarageNavigation} />

            {!user ? (
              <div className="flex items-center gap-2.5 text-xs font-bold text-slate-600 pl-1">
                <span onClick={() => { setAuthInitialMode('login'); setViewState('auth'); }} className="hover:text-indigo-600 cursor-pointer transition-colors">Giriş Yap</span>
                <span className="text-slate-200">|</span>
                <span onClick={() => { setAuthInitialMode('register_step1'); setViewState('auth'); }} className="hover:text-indigo-600 cursor-pointer transition-colors">Hesap Aç</span>
              </div>
            ) : (
              <div className="relative pl-1">
                <button 
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  <span>{navbarName || 'Hesabım'}</span>
                  <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-64 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden z-50 text-sm">
                    <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Hesap Detayı</span>
                      <span className="text-slate-800 font-semibold text-xs truncate mt-0.5">{user.email}</span>
                    </div>

                    <div className="py-1 flex flex-col">
                      <DropdownRow title="Bana Özel Özet" onClick={() => { setIsDropdownOpen(false); setViewState('dashboard'); }} />
                      <DropdownRow title="Tescilli Taşıtlarım (Garaj)" onClick={() => { setIsDropdownOpen(false); setViewState('garage'); }} />
                      <DropdownRow title="Aktif İlanlarım" onClick={handleMyListingsNavigation} />
                      <DropdownRow title="Sorgulama Geçmişim" onClick={() => { setIsDropdownOpen(false); setViewState('sorgu-gecmisi'); }} />
                      <DropdownRow title="Paketlerim & Ödemeler" onClick={() => { setIsDropdownOpen(false); setViewState('paketler'); }} />
                      <DropdownRow title="Hesabım" onClick={() => { setIsDropdownOpen(false); setViewState('hesabim'); }} />
                    </div>

                    <div className="border-t border-slate-100 p-1.5">
                      <button 
                        type="button" 
                        onClick={handleSignOut}
                        className="w-full px-3 py-2 text-left font-semibold text-rose-600 hover:bg-rose-50 rounded flex items-center justify-between transition-colors cursor-pointer text-xs group"
                      >
                        <span>Çıkış Yap</span>
                        <svg className="w-4 h-4 text-rose-400 group-hover:text-rose-600 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25V15M12 9l3 3m0 0l-3 3m3-3H8.25" />
                        </svg>
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
      ) : viewState === 'my-listings' ? (
        <MyListingsScreen user={user} onNavigateToGarage={() => setViewState('garage')} />
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
      ) : (
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
          onOpenCreateListingModal={handleOpenWizard}
        />
      )}

    </div>
  );
}

function DropdownRow({ title, onClick }) {
  return (
    <div 
      onClick={onClick}
      className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer flex justify-between items-center transition-colors text-slate-700 font-semibold text-xs group"
    >
      <span>{title}</span>
      <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </div>
  );
}