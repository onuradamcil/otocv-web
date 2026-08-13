// =========================================================================
// OTO-CV HEADER (Header.jsx)
// İşlev: Logo, ana menü, "Araç Kaydet" düğmesi, bildirim zili, hesap menüsü
//        ve md altında hamburger. Kendi oturum durumunu yönetir.
//
// Erişilebilirlik: gezinme öğeleri Link, aksiyonlar button — hepsi klavyeyle
//        kullanılabilir ve görünür odak halkası taşır. İkon butonları 44px
//        dokunma alanı ve aria-label ile geliyor.
// =========================================================================

'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  // Açılır menü başlığı için: ham e-posta yerine ad, baş harfler ve üyelik.
  // Bu bilgi garaj ekranındaki profil kartından buraya taşındı.
  const [profil, setProfil] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const hesapMenuRef = useRef(null);

  // Oturum takibi
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });
    return () => subscription?.unsubscribe();
  }, []);

  // Profil adı ve üyelik. `is_premium` de çekiliyor: açılır menü başlığı
  // artık ham e-posta değil, kimliği gösteren bir kart.
  useEffect(() => {
    if (!user) { setNavbarName(''); setProfil(null); return; }
    supabase
      .from('profiles')
      .select('first_name, last_name, is_premium')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (data && !error && data.first_name && data.last_name) {
          setNavbarName(`${data.first_name.charAt(0).toUpperCase()}${data.first_name.slice(1)} ${data.last_name.charAt(0).toUpperCase()}.`);
          setProfil(data);
        } else {
          setNavbarName('Hesabım');
          setProfil(data || null);
        }
      });
  }, [user]);

  // -------------------------------------------------------------------------
  // DIŞARI TIKLAYINCA VE ESC İLE KAPANMA
  //
  // Hesap menüsü yalnızca kendi düğmesine tekrar tıklayınca kapanıyordu:
  // sayfanın başka bir yerine tıklamak onu açık bırakıyor, kullanıcı menüyü
  // "kovalamak" zorunda kalıyordu. Esc de çalışmıyordu.
  //
  // `mousedown` kullanılıyor, `click` değil: menü içindeki bir bağlantıya
  // tıklandığında `click` sırasında öğe DOM'dan kalkmış olabiliyor ve
  // `contains` yanlış cevap veriyor. `PublishListingModal` da aynı olayı
  // kullanıyor.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!isDropdownOpen) return;

    const disariTiklama = (e) => {
      if (hesapMenuRef.current && !hesapMenuRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    // `closeMenus` bu efektten SONRA tanımlanıyor; setter doğrudan
    // çağrılıyor ki bildirim sırasına bağımlılık doğmasın.
    const escBasildi = (e) => {
      if (e.key === 'Escape') setIsDropdownOpen(false);
    };

    document.addEventListener('mousedown', disariTiklama);
    document.addEventListener('keydown', escBasildi);
    return () => {
      document.removeEventListener('mousedown', disariTiklama);
      document.removeEventListener('keydown', escBasildi);
    };
  }, [isDropdownOpen]);

  // Sticky gölge
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const closeMenus = () => setIsDropdownOpen(false);

  const handleSignOut = async () => {
    closeMenus();
    await supabase.auth.signOut();
    setUser(null);
    setNavbarName('');
    router.push('/');
  };

  // Oturum gerektiren hedef: yoksa girişe gönder
  const uyeHedef = (path) => (user ? path : '/login');

  // Menü başlığında kullanılan türetilmiş değerler. State'e yazılmıyor:
  // profilden hesaplanabilen bir şeyi ayrıca tutmak, ikisinin kayması demek.
  const tamAd = profil?.first_name && profil?.last_name
    ? `${profil.first_name} ${profil.last_name}`
    : '';
  const basHarfler = tamAd
    ? tamAd.split(' ').filter(Boolean).slice(0, 2).map((p) => p.charAt(0).toLocaleUpperCase('tr-TR')).join('')
    : (user?.email?.charAt(0)?.toLocaleUpperCase('tr-TR') || '?');

  const HESAP_MENU = [
    { href: '/dashboard', label: 'Bana Özel Özet' },
    { href: '/garage', label: 'Tescilli Taşıtlarım (Garaj)' },
    { href: '/my-listings', label: 'Vitrindeki Araçlarım' },
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
              {/* "Karne Sorgula" BURADAN KALKTI, yerine devir geldi.
                  Gerekçe: karne sorgulama anasayfadaki "Künye Sorgula"
                  kartında, footer'da ve /devir sayfasının altında zaten var —
                  menüdeki dördüncü kopyaydı. Devrin ise hiçbir bağımsız
                  girişi yoktu: satın aldığı aracın sicilini devralmak isteyen
                  kişi ilan sihirbazına girip plaka yazmak zorundaydı. */}
              <Link
                href="/devir"
                onClick={closeMenus}
                className={`transition-colors rounded ${ODAK} ${pathname.startsWith('/devir') ? 'text-indigo-600 font-extrabold' : 'hover:text-slate-900'}`}
              >
                Araç Devir
              </Link>
              <span className="text-slate-400 cursor-not-allowed">Kurumsal Çözümler</span>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">

            {/* ARAÇ KAYDET — tek düğme, açılır panel YOK.
                -----------------------------------------------------------
                Eskiden üzerine gelince iki kartlı bir panel açılıyordu:
                "Yeni Araç Kaydet" ve "Aracımı Satışa Çıkar". Kaldırıldı,
                üç sebeple:

                1. İkisi aynı işin iki yolu DEĞİLDİ. Birincisi sihirbazı
                   açıyordu, ikincisi yalnızca /garage'a gidiyordu — orada
                   aracı bulup "Satışa Çıkar"a basmak gerekiyordu. Yani
                   panel bir seçim sunuyor gibi görünüp aslında bir
                   yönlendirme yapıyordu. Eski ilan sitesinin
                   "sıfırdan ilan / garajımdan seç" ikilisinden kalmaydı.

                2. Panel yalnızca `onMouseEnter` ile açılıyordu. Klavyeyle
                   gezen ya da dokunmatik kullanan biri ikinci karta HİÇ
                   ulaşamıyordu; "iki yol" fare kullanıcısına özeldi.

                3. Mobil çekmecede zaten tek bağlantı vardı. Masaüstü ve
                   mobil artık aynı şeyi yapıyor.

                "Satışa çıkar" niyeti kaybolmuyor: garaj kartında,
                /my-listings'te ve filo panelinde duruyor.

                Metin "Ücretsiz İlan Ver" değil, iki sebeple:
                  - Ürün önce SİCİL, ilan ikincil; araç kaydetmek için
                    ilan vermek gerekmiyor.
                  - "Ücretsiz" artık YANLIŞ olurdu: ilk araç ücretsiz ama
                    ikinci ve sonrası Ek Araç Kaydı gerektiriyor. */}
            <Link
              href={uyeHedef('/add-vehicle/step1')}
              onClick={closeMenus}
              className={`hidden md:flex bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-md transition-all shadow-2xs items-center gap-1.5 border border-amber-500/30 ${ODAK}`}
            >
              <Icon name="ilan" size="xs" />
              <span>Araç Kaydet</span>
            </Link>

            <NotificationDropdown onNavigateToGarage={() => router.push(uyeHedef('/garage'))} />

            {/* HESAP — masaüstü */}
            {!user ? (
              <div className="hidden md:flex items-center gap-2.5 text-xs font-bold text-slate-600 pl-1">
                <Link href="/login" className={`hover:text-indigo-600 transition-colors rounded ${ODAK}`}>Giriş Yap</Link>
                <span className="text-slate-200" aria-hidden="true">|</span>
                <Link href="/register" className={`hover:text-indigo-600 transition-colors rounded ${ODAK}`}>Hesap Aç</Link>
              </div>
            ) : (
              <div className="relative hidden md:block pl-1" ref={hesapMenuRef}>
                {/* aria-controls + aria-haspopup: ekran okuyucuya bu düğmenin
                    bir menü açtığını ve hangisini açtığını söylüyor. Sayfada
                    `aria-expanded` taşıyan başka düğmeler de var (bildirim
                    zili), bu yüzden menünün kendi kimliği olması gerekiyor. */}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="menu"
                  aria-controls="hesap-menusu"
                  className={`flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:text-indigo-600 transition-colors rounded ${ODAK}`}
                >
                  <span>{navbarName || 'Hesabım'}</span>
                  <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                </button>

                {isDropdownOpen && (
                  <div id="hesap-menusu" className="absolute right-0 mt-3 w-72 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 text-sm">
                    {/* BAŞLIK: eskiden yalnızca ham e-posta yazıyordu.
                        Garaj ekranından kaldırılan profil kartının taşıdığı
                        bilgi (baş harfler, ad soyad, üyelik) buraya taşındı —
                        bilgi kaybolmadı, ait olduğu yere geldi. */}
                    <div className="px-4 py-3.5 border-b border-slate-100 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xs shrink-0 font-display">
                        {basHarfler}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-slate-900 font-black text-xs truncate">
                          {tamAd || 'Hesabım'}
                        </p>
                        <p className="text-slate-400 font-medium text-[11px] truncate">{user.email}</p>
                        <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-black tracking-wide ${
                          profil?.is_premium ? 'text-amber-600' : 'text-slate-500'
                        }`}>
                          {profil?.is_premium && <Icon name="yildiz" size="xs" />}
                          {profil?.is_premium ? 'Premium Üyelik' : 'Standart Üyelik'}
                        </span>
                      </div>
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
