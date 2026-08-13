// =========================================================================
// OTO-CV HEADER (Header.jsx)
// İşlev: Logo, ana menü, İlan Ver açılır paneli, bildirim zili, hesap menüsü
//        ve md altında hamburger. Kendi oturum durumunu yönetir.
//
// Erişilebilirlik: gezinme öğeleri Link, aksiyonlar button — hepsi klavyeyle
//        kullanılabilir ve görünür odak halkası taşır. İkon butonları 44px
//        dokunma alanı ve aria-label ile geliyor.
// =========================================================================

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import NotificationDropdown from '@/context/NotificationDropdown';
import MobileDrawer from './MobileDrawer';
import Icon from '@/components/common/icons';

const ODAK = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState(null);
  const [navbarName, setNavbarName] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isIlanMenuOpen, setIsIlanMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Oturum takibi
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });
    return () => subscription?.unsubscribe();
  }, []);

  // Profil adı
  useEffect(() => {
    if (!user) { setNavbarName(''); return; }
    supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (data && !error && data.first_name && data.last_name) {
          setNavbarName(`${data.first_name.charAt(0).toUpperCase()}${data.first_name.slice(1)} ${data.last_name.charAt(0).toUpperCase()}.`);
        } else {
          setNavbarName('Hesabım');
        }
      });
  }, [user]);

  // Sticky gölge
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const closeMenus = () => { setIsDropdownOpen(false); setIsIlanMenuOpen(false); };

  const handleSignOut = async () => {
    closeMenus();
    await supabase.auth.signOut();
    setUser(null);
    setNavbarName('');
    router.push('/');
  };

  // Oturum gerektiren hedef: yoksa girişe gönder
  const uyeHedef = (path) => (user ? path : '/login');

  const HESAP_MENU = [
    { href: '/dashboard', label: 'Bana Özel Özet' },
    { href: '/garage', label: 'Tescilli Taşıtlarım (Garaj)' },
    { href: '/my-listings', label: 'Aktif İlanlarım' },
    { href: '/query-history', label: 'Sorgulama Geçmişim' },
    { href: '/packages', label: 'Ücretler & Ödemeler' },
    { href: '/account', label: 'Hesabım' },
  ];

  return (
    <>
      <header
        className={`bg-white sticky top-0 z-50 select-none transition-shadow print:hidden ${
          scrolled ? 'shadow-sm border-b border-slate-200' : 'border-b border-gray-200'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">

          <div className="flex items-center gap-8">
            <Link href="/" onClick={closeMenus} className={`text-base font-display font-bold tracking-tight text-slate-900 rounded ${ODAK}`}>
              OTO.CV
            </Link>

            <nav aria-label="Ana menü" className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-500">
              <Link
                href="/"
                onClick={closeMenus}
                className={`transition-colors rounded ${ODAK} ${pathname === '/' ? 'text-indigo-600 font-extrabold' : 'hover:text-slate-900'}`}
              >
                Pazaryeri Vitrini
              </Link>
              <Link
                href="/verify"
                onClick={closeMenus}
                className={`transition-colors rounded ${ODAK} ${pathname.startsWith('/verify') ? 'text-indigo-600 font-extrabold' : 'hover:text-slate-900'}`}
              >
                Karne Sorgula
              </Link>
              <span className="text-slate-400 cursor-not-allowed">Kurumsal Çözümler</span>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">

            {/* İLAN VER — masaüstü açılır panel */}
            <div
              className="relative hidden md:block"
              onMouseEnter={() => setIsIlanMenuOpen(true)}
              onMouseLeave={() => setIsIlanMenuOpen(false)}
            >
              <Link
                href={uyeHedef('/add-vehicle/step1')}
                className={`bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-md transition-all shadow-2xs flex items-center gap-1.5 border border-amber-500/30 ${ODAK}`}
              >
                <span>Ücretsiz İlan Ver</span>
                <svg className={`w-3 h-3 transition-transform duration-150 ${isIlanMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </Link>

              {isIlanMenuOpen && (
                <div className="absolute right-0 top-full pt-1.5 w-[540px] z-50 motion-safe:animate-fadeIn">
                  <div className="bg-white border border-slate-200 rounded-xl shadow-2xl p-4 grid grid-cols-2 gap-4 border-t-2 border-t-amber-500">
                    <Link
                      href={uyeHedef('/add-vehicle/step1')}
                      onClick={closeMenus}
                      className={`bg-[#FFFDF0] hover:bg-[#FFF9D6] border border-amber-200/80 rounded-lg p-4 transition-all group flex flex-col justify-between ${ODAK}`}
                    >
                      <div>
                        <div className="w-10 h-10 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center mx-auto mb-2 shadow-sm group-hover:scale-110 transition-transform">
                          <Icon name="ilan" size="lg" />
                        </div>
                        <h4 className="text-sm font-black text-slate-900 text-center mb-2 tracking-tight">Sıfırdan Araç Kaydet</h4>
                        <p className="text-[11px] text-slate-600 font-semibold text-center leading-relaxed">Kataloğumuzdan aracı seç, 4 adımda sicilini oluştur.</p>
                      </div>
                      <span className="mt-3 block w-full bg-amber-400 group-hover:bg-amber-500 text-slate-950 font-black text-xs py-2.5 rounded-md transition-colors text-center">Kayda Başla &gt;</span>
                    </Link>

                    <Link
                      href={uyeHedef('/garage')}
                      onClick={closeMenus}
                      className={`bg-[#F0F5FF] hover:bg-[#E2ECFF] border border-indigo-200/80 rounded-lg p-4 transition-all group flex flex-col justify-between ${ODAK}`}
                    >
                      <div>
                        <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center mx-auto mb-2 shadow-sm group-hover:scale-110 transition-transform">
                          <Icon name="arac" size="lg" />
                        </div>
                        <h4 className="text-sm font-black text-slate-900 text-center mb-2 tracking-tight">Garajımdan Seç</h4>
                        <p className="text-[11px] text-slate-600 font-semibold text-center leading-relaxed">Tescilli aracını garajdan seç, bilgiler otomatik yüklensin.</p>
                      </div>
                      <span className="mt-3 block w-full bg-indigo-600 group-hover:bg-indigo-700 text-white font-black text-xs py-2.5 rounded-md transition-colors text-center">Garaja Git &gt;</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <NotificationDropdown onNavigateToGarage={() => router.push(uyeHedef('/garage'))} />

            {/* HESAP — masaüstü */}
            {!user ? (
              <div className="hidden md:flex items-center gap-2.5 text-xs font-bold text-slate-600 pl-1">
                <Link href="/login" className={`hover:text-indigo-600 transition-colors rounded ${ODAK}`}>Giriş Yap</Link>
                <span className="text-slate-200" aria-hidden="true">|</span>
                <Link href="/register" className={`hover:text-indigo-600 transition-colors rounded ${ODAK}`}>Hesap Aç</Link>
              </div>
            ) : (
              <div className="relative hidden md:block pl-1">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  aria-expanded={isDropdownOpen}
                  className={`flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:text-indigo-600 transition-colors rounded ${ODAK}`}
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
                      {HESAP_MENU.map((m) => (
                        <Link
                          key={m.href}
                          href={m.href}
                          onClick={closeMenus}
                          className={`px-4 py-2.5 hover:bg-slate-50 flex justify-between items-center transition-colors text-slate-700 font-semibold text-xs group ${ODAK}`}
                        >
                          <span>{m.label}</span>
                          <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        </Link>
                      ))}
                    </div>

                    <div className="border-t border-slate-100 p-1.5">
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className={`w-full px-3 py-2 text-left font-semibold text-rose-600 hover:bg-rose-50 rounded flex items-center justify-between transition-colors text-xs group ${ODAK}`}
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

            {/* HAMBURGER — mobil, 44px dokunma alanı */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Menüyü aç"
              aria-expanded={drawerOpen}
              className={`md:hidden w-11 h-11 -mr-2 grid place-items-center rounded-lg text-slate-700 hover:bg-slate-100 transition-colors ${ODAK}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={user}
        onSignOut={handleSignOut}
      />
    </>
  );
}
