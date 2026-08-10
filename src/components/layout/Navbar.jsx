// =========================================================================
// OTO-CV ÜST ŞERİT: PAYLAŞILAN NAVBAR (Navbar.jsx)
// İşlev: Logo, ana menü, İlan Ver açılır paneli, bildirim zili ve hesap
//        menüsü. Kendi oturum durumunu yönetir, sayfalardan bağımsızdır.
// =========================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import NotificationDropdown from '@/context/NotificationDropdown';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState(null);
  const [navbarName, setNavbarName] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isIlanMenuOpen, setIsIlanMenuOpen] = useState(false);

  // Oturum takibi
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Giriş yapan üyenin profil adını çeken sensör
  useEffect(() => {
    if (!user) {
      setNavbarName('');
      return;
    }

    supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (data && !error && data.first_name && data.last_name) {
          const formatted = `${data.first_name.charAt(0).toUpperCase()}${data.first_name.slice(1)} ${data.last_name.charAt(0).toUpperCase()}.`;
          setNavbarName(formatted);
        } else {
          setNavbarName('Hesabım');
        }
      });
  }, [user]);

  const closeMenus = () => {
    setIsDropdownOpen(false);
    setIsIlanMenuOpen(false);
  };

  const go = (path) => {
    closeMenus();
    router.push(path);
  };

  // Oturum gerektiren hedefler: oturum yoksa girişe gönder
  const goAuthed = (path) => {
    closeMenus();
    router.push(user ? path : '/login');
  };

  const handleSignOut = async () => {
    closeMenus();
    await supabase.auth.signOut();
    setUser(null);
    setNavbarName('');
    router.push('/');
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">

        <div className="flex items-center gap-8">
          <span onClick={() => go('/')} className="text-base font-black tracking-tight cursor-pointer text-slate-900">
            OTO.CV
          </span>
          <div className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-500">
            <span
              onClick={() => go('/')}
              className={`cursor-pointer transition-colors ${pathname === '/' ? 'text-indigo-600 font-extrabold' : 'hover:text-slate-900'}`}
            >
              Pazaryeri Vitrini
            </span>
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
                    onClick={() => goAuthed('/add-vehicle/step1')}
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
                    onClick={() => goAuthed('/garage')}
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

          <NotificationDropdown onNavigateToGarage={() => goAuthed('/garage')} />

          {!user ? (
            <div className="flex items-center gap-2.5 text-xs font-bold text-slate-600 pl-1">
              <span onClick={() => go('/login')} className="hover:text-indigo-600 cursor-pointer transition-colors">Giriş Yap</span>
              <span className="text-slate-200">|</span>
              <span onClick={() => go('/register')} className="hover:text-indigo-600 cursor-pointer transition-colors">Hesap Aç</span>
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
                    <DropdownRow title="Bana Özel Özet" onClick={() => go('/dashboard')} />
                    <DropdownRow title="Tescilli Taşıtlarım (Garaj)" onClick={() => go('/garage')} />
                    <DropdownRow title="Aktif İlanlarım" onClick={() => go('/my-listings')} />
                    <DropdownRow title="Sorgulama Geçmişim" onClick={() => go('/query-history')} />
                    <DropdownRow title="Paketlerim & Ödemeler" onClick={() => go('/packages')} />
                    <DropdownRow title="Hesabım" onClick={() => go('/account')} />
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
