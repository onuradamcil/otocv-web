# Site Çatısı ve Sayfa İskeleti — Uygulama Planı

> **Ajan çalışanlar için:** Bu planı görev görev uygulamak için `superpowers:subagent-driven-development` (önerilen) veya `superpowers:executing-plans` alt-skill'ini kullanın. Adımlar takip için checkbox (`- [ ]`) sözdizimi kullanır.

**Hedef:** Her sayfayı üç çatı katmanından birine oturtmak; üst şerit, header, mobil çekmece, breadcrumb ve footer'ı kurmak; erişilebilirliği klavye kullanılabilir seviyeye çıkarmak; SEO ve sistem sayfalarını eklemek.

**Mimari:** Route grupları layout taşıyıcısı olarak kullanılır — `(site)` tam çatı, `(auth)` sade çatı, `(wizard)` adım çubuklu çatı. Mevcut `Navbar.jsx` üç bileşene bölünür (`TopBar`, `Header`, `MobileDrawer`). Ekran bileşenlerine dokunulmaz; çatı layout katmanında yaşar.

**Teknoloji:** Next.js 16.2.10 (App Router, Turbopack), React 19.2.4, Tailwind v4, Supabase JS v2.

## Global Kısıtlar

- **Veritabanına dokunulmaz.** Tablo, kolon, RLS, storage değişmez. Tek satır SQL yok.
- **Mevcut ekran bileşenlerinin prop arayüzleri değişmez.** Çatı layout'ta yaşar.
- **Tasarım dili korunur:** zemin `#FFFDFB`, metin `#0F172A`, vurgu `indigo-600`, CTA `amber-400`, tehlike `rose-600`, kenarlık `slate-200`, köşe `rounded-xl`, başlık `font-black`/`font-bold`, kod/plaka `font-mono`, yoğun küçük punto ölçeği (`text-xs`, `text-[10px]`, `text-[11px]`).
- **Yükleme göstergesi deseni:** `animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent`.
- **Tüm kullanıcıya görünen metinler Türkçe.** İngilizce kelime karışmaz (kod tabanında daha önce "and" sızmıştı, tekrarlanmamalı).
- **Next.js 16 kuralı:** `params` bir Promise'tir; client component'lerde `useParams()` kullanılır.
- **Import yolu:** yeni dosyalarda `@/` alias'ı.
- **KVKK:** plaka hiçbir ziyaretçi yüzeyinde ve hiçbir URL'de görünmez. Bu kural çatı çalışmasında da korunur.
- **Çerez onay banner'ı eklenmez** (spec 9. bölüm).
- **Her görev sonunda:** 35 maddelik regresyon paketi + `npm run build` + ekran görüntüsü (masaüstü 1280px ve mobil 390px).

## Doğrulama araçları

Mevcut regresyon paketi: `<scratchpad>/regresyon.py` — 35 madde, oturumsuz + oturumlu.
Kimlik bilgileri ortam değişkeninden okunur (`OTOCV_TEST_EMAIL`, `OTOCV_TEST_PASSWORD`),
betiğe asla yazılmaz.

Bu projede birim test çatısı yok (`package.json`'da test script'i, Jest/Vitest yok).
Doğrulama tarayıcıda Playwright ile yapılır. Test çatısı kurmak ayrı bir iş kalemidir.

**Test yazarken dikkat** (bu oturumda üç kez tuzağa düşüldü):
1. Yokluk iddiaları (`X sayfada YOK`) hata sayfasında da geçer → her bölümden önce
   sayfanın gerçekten yüklendiğini doğrulayan bir **kapı** iddiası koy.
2. `check()` fonksiyonu **bool döndürmeli**, yoksa `if check(...)` daima false olur.
3. `inner_text()` CSS `text-transform` uygular; `uppercase` sınıflı metni ararken
   `text_content()` kullan.
4. İstemci tarafı gezinmede `wait_for_load_state("networkidle")` popstate tamamlanmadan
   dönebilir → `wait_for_url()` kullan.

## Dosya yapısı

| Dosya | Sorumluluk | Görev |
|---|---|---|
| `src/components/layout/TopBar.jsx` | İnce üst şerit: PIN sorgulama girişi + Kurumsal | 1 |
| `src/components/layout/MobileDrawer.jsx` | Yandan çekmece: dialog semantiği, Esc, odak tuzağı, kaydırma kilidi | 1 |
| `src/components/layout/Header.jsx` | Logo, ana menü, İlan Ver, bildirim, hesap menüsü, hamburger | 1 |
| `src/components/layout/Footer.jsx` | 4 sütun + yasal şerit | 2 |
| `src/components/layout/SkipLink.jsx` | "İçeriğe geç" bağlantısı | 2 |
| `src/app/(site)/layout.js` | Tam çatı birleştirici | 2 |
| `src/components/layout/Breadcrumb.jsx` | Kırıntı yol | 3 |
| `src/components/layout/AuthHeader.jsx` | Sade çatı başlığı | 4 |
| `src/app/(auth)/layout.js` | Sade çatı | 4 |
| `src/components/layout/WizardHeader.jsx` | Adım göstergeli başlık | 5 |
| `src/app/(wizard)/layout.js` | Sihirbaz çatısı | 5 |
| `src/app/not-found.js` · `error.js` · `loading.js` | Sistem sayfaları | 6 |
| `src/app/robots.js` · `sitemap.js` · `manifest.js` · `opengraph-image.js` | SEO ve paylaşım | 7 |
| Her `page.js`'e `metadata` | Sayfa başına başlık/açıklama | 7 |

**Silinen/taşınan:** `src/components/layout/Navbar.jsx` → `Header.jsx` (Görev 1).
`(shell)` → `(site)`, `(full)` → `(auth)` + `(wizard)` (Görev 2, 4, 5).

---

### Görev 1: Header üçe bölünüyor — TopBar, MobileDrawer, Header

**Dosyalar:**
- Oluştur: `src/components/layout/TopBar.jsx`
- Oluştur: `src/components/layout/MobileDrawer.jsx`
- Oluştur: `src/components/layout/Header.jsx`
- Sil: `src/components/layout/Navbar.jsx`
- Değiştir: `src/app/(shell)/layout.js` (Navbar → TopBar + Header)

**Arayüzler:**
- Kullanır: `supabase` (`@/lib/supabase`), `NotificationDropdown` (`@/context/NotificationDropdown`)
- Üretir:
  - `TopBar()` — prop almaz
  - `MobileDrawer({ open, onClose, user, onSignOut })` — `open: boolean`, `onClose: () => void`, `user: object|null`, `onSignOut: () => Promise<void>`
  - `Header()` — prop almaz, kendi oturum durumunu yönetir

**Bu görevin erişilebilirlik yükü:** mevcut `Navbar.jsx`'teki tüm `<span onClick>` öğeleri
`<button>`'a çevrilir, ikon butonlarına `aria-label` eklenir, odak halkası tanımlanır.

- [ ] **Adım 1: TopBar bileşenini oluştur**

`src/components/layout/TopBar.jsx`:

```jsx
// =========================================================================
// OTO-CV ÜST ŞERİT (TopBar.jsx)
// İşlev: Kazanım hunisinin girişini her sayfada en üstte tutar. Alıcı,
//        rakip ilan sitesindeki karne görselinden gelip PIN'i buradan girer.
// Mobil: yalnızca PIN bağlantısı kalır, Kurumsal çekmeceye taşınır.
// =========================================================================

'use client';

import React from 'react';
import Link from 'next/link';

export default function TopBar() {
  return (
    <div className="bg-[#0F172A] text-white print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between">
        <Link
          href="/verify"
          className="group flex items-center gap-1.5 text-[11px] font-bold tracking-tight text-slate-200 hover:text-white transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F172A]"
        >
          <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.642z" />
          </svg>
          <span>Karne PIN&apos;i ile araç sorgula</span>
          <span className="text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">&rsaquo;</span>
        </Link>

        <span className="hidden sm:inline text-[11px] font-semibold text-slate-400 cursor-not-allowed select-none">
          Kurumsal Çözümler
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Adım 2: MobileDrawer bileşenini oluştur**

`src/components/layout/MobileDrawer.jsx`. Dialog semantiği, Esc, kaydırma kilidi ve
odak tuzağı bu dosyada:

```jsx
// =========================================================================
// OTO-CV MOBİL ÇEKMECE (MobileDrawer.jsx)
// İşlev: md altında ana menünün karşılığı. Sağdan kayar, arkada karartma.
// Erişilebilirlik: role=dialog + aria-modal, Esc ile kapanma, kaydırma
//        kilidi, odak tuzağı, kapanınca odağın hamburger'a dönmesi.
// =========================================================================

'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';

const MENU = [
  { href: '/', label: 'Pazaryeri Vitrini' },
  { href: '/verify', label: 'Karne PIN Sorgula' },
];

const UYE_MENU = [
  { href: '/garage', label: 'Tescilli Taşıtlarım (Garaj)' },
  { href: '/my-listings', label: 'Aktif İlanlarım' },
  { href: '/dashboard', label: 'Bana Özel Özet' },
  { href: '/query-history', label: 'Sorgulama Geçmişim' },
  { href: '/packages', label: 'Paketlerim & Ödemeler' },
  { href: '/account', label: 'Hesabım' },
];

export default function MobileDrawer({ open, onClose, user, onSignOut }) {
  const panelRef = useRef(null);

  // Esc ile kapatma + kaydırma kilidi
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      // Odak tuzağı: Tab panelin dışına çıkmasın
      if (e.key === 'Tab' && panelRef.current) {
        const odaklanabilir = panelRef.current.querySelectorAll(
          'a[href], button:not([disabled])'
        );
        if (odaklanabilir.length === 0) return;
        const ilk = odaklanabilir[0];
        const son = odaklanabilir[odaklanabilir.length - 1];
        if (e.shiftKey && document.activeElement === ilk) {
          e.preventDefault();
          son.focus();
        } else if (!e.shiftKey && document.activeElement === son) {
          e.preventDefault();
          ilk.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const oncekiOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Açılışta ilk odaklanabilir öğeye odaklan
    const t = setTimeout(() => {
      panelRef.current?.querySelector('a[href], button:not([disabled])')?.focus();
    }, 50);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = oncekiOverflow;
      clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="md:hidden fixed inset-0 z-[60] print:hidden">
      {/* KARARTMA */}
      <div
        className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm motion-safe:animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* PANEL */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Ana menü"
        className="absolute right-0 top-0 h-full w-[82%] max-w-[320px] bg-white shadow-2xl flex flex-col"
      >
        <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200 shrink-0">
          <span className="text-sm font-black tracking-tight text-slate-900">OTO.CV</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Menüyü kapat"
            className="w-9 h-9 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {MENU.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              onClick={onClose}
              className="block px-4 py-3 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:bg-indigo-50"
            >
              {m.label}
            </Link>
          ))}

          <span className="block px-4 py-3 text-xs font-bold text-slate-300 cursor-not-allowed select-none">
            Kurumsal Çözümler
          </span>

          {user && (
            <>
              <div className="mt-2 px-4 py-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Hesabım</span>
              </div>
              {UYE_MENU.map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  onClick={onClose}
                  className="block px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:bg-indigo-50"
                >
                  {m.label}
                </Link>
              ))}
            </>
          )}
        </nav>

        <div className="p-3 border-t border-slate-200 shrink-0 space-y-2">
          <Link
            href={user ? '/add-vehicle/step1' : '/login'}
            onClick={onClose}
            className="block w-full text-center bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs py-3 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
          >
            Ücretsiz İlan Ver
          </Link>

          {user ? (
            <button
              type="button"
              onClick={async () => { onClose(); await onSignOut(); }}
              className="w-full text-center text-rose-600 hover:bg-rose-50 font-bold text-xs py-2.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              Çıkış Yap
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/login"
                onClick={onClose}
                className="text-center bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs py-2.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              >
                Giriş Yap
              </Link>
              <Link
                href="/register"
                onClick={onClose}
                className="text-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              >
                Hesap Aç
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Adım 3: Header bileşenini oluştur**

`src/components/layout/Header.jsx`. Mevcut `Navbar.jsx`'in içeriği taşınır; tüm
`<span onClick>` öğeleri `<button>` veya `<Link>` olur, hamburger eklenir, sticky
gölge davranışı gelir:

```jsx
// =========================================================================
// OTO-CV HEADER (Header.jsx)
// İşlev: Logo, ana menü, İlan Ver açılır paneli, bildirim zili, hesap menüsü
//        ve md altında hamburger. Kendi oturum durumunu yönetir.
// Erişilebilirlik: gezinme öğeleri Link, aksiyonlar button; hepsi klavyeyle
//        kullanılabilir ve görünür odak halkası taşır.
// =========================================================================

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import NotificationDropdown from '@/context/NotificationDropdown';
import MobileDrawer from './MobileDrawer';

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

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });
    return () => subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setNavbarName(''); return; }
    supabase.from('profiles').select('first_name, last_name').eq('id', user.id).single()
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

  const uyeHedef = (path) => (user ? path : '/login');

  return (
    <>
      <header
        className={`bg-white sticky top-0 z-50 select-none transition-shadow print:hidden ${
          scrolled ? 'shadow-sm border-b border-slate-200' : 'border-b border-gray-200'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">

          <div className="flex items-center gap-8">
            <Link href="/" onClick={closeMenus} className={`text-base font-black tracking-tight text-slate-900 rounded ${ODAK}`}>
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
                      className={`bg-[#FFFDF0] hover:bg-[#FFF9D6] border border-amber-200/80 rounded-lg p-4 transition-all cursor-pointer group flex flex-col justify-between ${ODAK}`}
                    >
                      <div>
                        <div className="w-10 h-10 rounded-full bg-amber-400 text-slate-950 font-black text-base flex items-center justify-center mx-auto mb-2 shadow-sm group-hover:scale-110 transition-transform">📋</div>
                        <h4 className="text-sm font-black text-slate-900 text-center mb-2 tracking-tight">Sıfırdan Araç Kaydet</h4>
                        <p className="text-[11px] text-slate-600 font-semibold text-center leading-relaxed">Kataloğumuzdan aracı seç, 4 adımda sicilini oluştur.</p>
                      </div>
                      <span className="mt-3 block w-full bg-amber-400 group-hover:bg-amber-500 text-slate-950 font-black text-xs py-2.5 rounded-md transition-colors text-center">Kayda Başla &gt;</span>
                    </Link>

                    <Link
                      href={uyeHedef('/garage')}
                      onClick={closeMenus}
                      className={`bg-[#F0F5FF] hover:bg-[#E2ECFF] border border-indigo-200/80 rounded-lg p-4 transition-all cursor-pointer group flex flex-col justify-between ${ODAK}`}
                    >
                      <div>
                        <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-black text-base flex items-center justify-center mx-auto mb-2 shadow-sm group-hover:scale-110 transition-transform">🚗</div>
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
                      {[
                        { href: '/dashboard', label: 'Bana Özel Özet' },
                        { href: '/garage', label: 'Tescilli Taşıtlarım (Garaj)' },
                        { href: '/my-listings', label: 'Aktif İlanlarım' },
                        { href: '/query-history', label: 'Sorgulama Geçmişim' },
                        { href: '/packages', label: 'Paketlerim & Ödemeler' },
                        { href: '/account', label: 'Hesabım' },
                      ].map((m) => (
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

            {/* HAMBURGER — mobil */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Menüyü aç"
              aria-expanded={drawerOpen}
              className={`md:hidden w-9 h-9 grid place-items-center rounded-lg text-slate-700 hover:bg-slate-100 transition-colors ${ODAK}`}
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
```

- [ ] **Adım 4: Eski Navbar'ı kaldır ve layout'u güncelle**

```bash
git rm "src/components/layout/Navbar.jsx"
```

`src/app/(shell)/layout.js` içeriğini değiştir:

```jsx
'use client';

import React from 'react';
import TopBar from '@/components/layout/TopBar';
import Header from '@/components/layout/Header';

export default function ShellLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#FFFDFB] text-[#0F172A] font-sans antialiased tracking-tight">
      <TopBar />
      <Header />
      {children}
    </div>
  );
}
```

- [ ] **Adım 5: Doğrula**

Çalıştır: `npm run dev`

Masaüstü (1280px):
1. `/` → üst şerit görünüyor, "Karne PIN'i ile araç sorgula" tıklanınca `/verify` açılıyor
2. Header'da "Karne Sorgula" menü öğesi var ve `/verify`'da aktif renkte
3. Sayfayı kaydır → header gölge kazanıyor
4. "Ücretsiz İlan Ver" üstüne gelince açılır panel çıkıyor
5. **Klavye:** Tab ile logo → menü → İlan Ver → bildirim → Giriş Yap sırayla geziliyor, her birinde **görünür odak halkası** var
6. **Klavye:** menü öğesinde Enter → sayfa açılıyor

Mobil (390px):
7. Ana menü gizli, hamburger görünüyor
8. Hamburger → çekmece sağdan açılıyor, arkada karartma
9. Karartmaya bas → kapanıyor
10. Tekrar aç, **Esc** → kapanıyor
11. Açıkken arka sayfa kaydırılamıyor
12. **Tab** ile odak çekmecenin içinde dönüyor, dışına çıkmıyor
13. Üst şeritte yalnızca PIN bağlantısı var ("Kurumsal Çözümler" gizli)

Ek: `npm run build` hatasız; 35 maddelik regresyon paketi tam geçiyor.

- [ ] **Adım 6: Commit**

```bash
git add src/components/layout/TopBar.jsx src/components/layout/MobileDrawer.jsx src/components/layout/Header.jsx "src/app/(shell)/layout.js"
git commit -m "feat(catki): ust serit, header ve mobil cekmece

Navbar.jsx uc bilesene bolundu. Tum span onClick ogeleri Link/button
oldu, gorunur odak halkasi eklendi, ikon butonlarina aria-label geldi.
Mobilde hamburger + yandan cekmece: Esc, kaydirma kilidi, odak tuzagi."
```

---

### Görev 2: Footer, skip link ve `(site)` çatısı

**Dosyalar:**
- Oluştur: `src/components/layout/Footer.jsx`
- Oluştur: `src/components/layout/SkipLink.jsx`
- Taşı: `src/app/(shell)/` → `src/app/(site)/`
- Değiştir: `src/app/(site)/layout.js`

**Arayüzler:**
- Kullanır: Görev 1'in `TopBar`, `Header` bileşenleri
- Üretir: `Footer()`, `SkipLink()` — ikisi de prop almaz; `(site)` çatısı `<main id="icerik">` sağlar

- [ ] **Adım 1: SkipLink bileşenini oluştur**

`src/components/layout/SkipLink.jsx`:

```jsx
// =========================================================================
// OTO-CV İÇERİĞE GEÇ BAĞLANTISI (SkipLink.jsx)
// İşlev: Klavye kullanıcısı menüyü atlayıp doğrudan içeriğe gidebilir.
//        Normalde görünmez, yalnızca odaklanınca ortaya çıkar.
// =========================================================================

'use client';

import React from 'react';

export default function SkipLink() {
  return (
    <a
      href="#icerik"
      className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-3 focus:left-3 focus:px-4 focus:py-2.5 focus:bg-indigo-600 focus:text-white focus:font-bold focus:text-xs focus:rounded-lg focus:shadow-lg print:hidden"
    >
      İçeriğe geç
    </a>
  );
}
```

- [ ] **Adım 2: Footer bileşenini oluştur**

`src/components/layout/Footer.jsx`. Linkler mevcut yer tutucu sayfalara gider;
yazılmamış yasal metinler için `/account` gibi yanlış hedef **verilmez** — onlar
`title` özniteliğiyle "yakında" olarak işaretlenir ve tıklanamaz:

```jsx
// =========================================================================
// OTO-CV FOOTER (Footer.jsx)
// İşlev: Kurumsal, yasal ve destek bağlantıları + telif şeridi.
// NOT: Yasal metinler ve kurumsal bilgiler henüz yazılmadı. Sahte link
//      konmuyor; hazır olmayanlar "yakında" olarak işaretli ve tıklanamaz.
//      Metinler hazırlandıkça buradaki span'ler Link'e çevrilecek.
// =========================================================================

'use client';

import React from 'react';
import Link from 'next/link';

function Sutun({ baslik, children }) {
  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-black text-slate-900 tracking-wider uppercase">{baslik}</h3>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function HazirLink({ href, children }) {
  return (
    <li>
      <Link
        href={href}
        className="text-[11px] font-semibold text-slate-600 hover:text-indigo-600 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
      >
        {children}
      </Link>
    </li>
  );
}

function YakindaOge({ children }) {
  return (
    <li>
      <span className="text-[11px] font-semibold text-slate-400 cursor-not-allowed select-none" title="Yakında">
        {children}
      </span>
    </li>
  );
}

export default function Footer() {
  const yil = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-slate-200 mt-16 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">

          <div className="space-y-3">
            <span className="text-base font-black tracking-tight text-slate-900 block">OTO.CV</span>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed max-w-[240px]">
              Aracınızın bakım geçmişini dijital sicil olarak tutun, tarih hatırlatmalarını
              kaçırmayın, karnenizi tek bağlantıyla paylaşın.
            </p>
          </div>

          <Sutun baslik="Kurumsal">
            <YakindaOge>Hakkımızda</YakindaOge>
            <YakindaOge>İletişim</YakindaOge>
            <YakindaOge>Kurumsal Çözümler</YakindaOge>
          </Sutun>

          <Sutun baslik="Yasal">
            <YakindaOge>KVKK Aydınlatma Metni</YakindaOge>
            <YakindaOge>Gizlilik Politikası</YakindaOge>
            <YakindaOge>Kullanım Şartları</YakindaOge>
          </Sutun>

          <Sutun baslik="Destek">
            <HazirLink href="/verify">PIN ile Araç Sorgula</HazirLink>
            <YakindaOge>Sık Sorulan Sorular</YakindaOge>
            <YakindaOge>Nasıl Çalışır?</YakindaOge>
          </Sutun>
        </div>
      </div>

      <div className="border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-[10px] font-semibold text-slate-400">
            © {yil} Oto.CV · Tüm hakları saklıdır
          </span>
          <span className="text-[10px] font-medium text-slate-300">
            Yasal metinler hazırlanıyor
          </span>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Adım 3: Route grubunu yeniden adlandır**

```bash
git mv "src/app/(shell)" "src/app/(site)"
```

- [ ] **Adım 4: `(site)` çatısını kur**

`src/app/(site)/layout.js`:

```jsx
// =========================================================================
// OTO-CV TAM ÇATI ((site)/layout.js)
// İşlev: Üst şerit + header + içerik + footer. Kamuya açık ve üye
//        sayfalarının tamamı bu çatının altında.
// =========================================================================

'use client';

import React from 'react';
import SkipLink from '@/components/layout/SkipLink';
import TopBar from '@/components/layout/TopBar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function SiteLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDFB] text-[#0F172A] font-sans antialiased tracking-tight">
      <SkipLink />
      <TopBar />
      <Header />
      <main id="icerik" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Adım 5: Sunucuyu temiz başlat**

Route grubu adı değiştiği için Turbopack önbelleği eski adı hatırlar
(yönlendirme geçişinde bu yaşandı, `'pin' !== 'plate'` hatası alındı):

```bash
rm -rf .next
npm run dev
```

- [ ] **Adım 6: Doğrula**

1. `/` → footer görünüyor, 4 sütun, "PIN ile Araç Sorgula" tıklanabilir
2. "Hakkımızda" gibi yazılmamış öğeler gri ve tıklanamaz (imleç `not-allowed`)
3. Mobilde (390px) footer sütunları alt alta diziliyor
4. **İlk Tab** → "İçeriğe geç" bağlantısı ortaya çıkıyor; Enter → odak içeriğe atlıyor
5. Sayfa kaynağında `<main id="icerik">` var
6. Telif satırında içinde bulunduğumuz yıl yazıyor
7. `npm run build` hatasız; 35 maddelik regresyon tam geçiyor

- [ ] **Adım 7: Commit**

```bash
git add -A
git commit -m "feat(catki): footer, skip link ve (site) tam catisi

(shell) -> (site) olarak yeniden adlandirildi. Footer 4 sutun + telif
seridi; yazilmamis yasal metinler icin sahte link konmadi, yakinda
olarak isaretlendi. main id=icerik ve skip link eklendi."
```

---

### Görev 3: Breadcrumb

**Dosyalar:**
- Oluştur: `src/components/layout/Breadcrumb.jsx`
- Değiştir: `src/app/(site)/layout.js` (Breadcrumb'ı ekle)

**Arayüzler:**
- Üretir: `Breadcrumb()` — prop almaz, yolu `usePathname()` ile kendisi çözer

- [ ] **Adım 1: Breadcrumb bileşenini oluştur**

`src/components/layout/Breadcrumb.jsx`. Anasayfada ve tek seviyeli sayfalarda
basılmaz — kırıntı yol yalnızca derinlik varsa anlam taşır:

```jsx
// =========================================================================
// OTO-CV KIRINTI YOL (Breadcrumb.jsx)
// İşlev: Derin sayfalarda konum bildirir. Anasayfada ve tek seviyeli
//        sayfalarda basılmaz — orada bilgi taşımaz, yalnızca gürültü olur.
// KVKK: dinamik segment (PIN) yol metnine yazılmaz.
// =========================================================================

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ETIKET = {
  garage: 'Garajım',
  'my-listings': 'Aktif İlanlarım',
  verify: 'Karne Sorgula',
  details: 'Araç Detayı',
  karne: 'Oto-Karne',
  dashboard: 'Bana Özel Özet',
  'query-history': 'Sorgulama Geçmişim',
  packages: 'Paketlerim & Ödemeler',
  account: 'Hesabım',
  'insurance-offer': 'Sigorta Teklifleri',
  'maintenance-planner': 'Bakım Planlayıcı',
};

export default function Breadcrumb() {
  const pathname = usePathname();
  const parcalar = pathname.split('/').filter(Boolean);

  // Yalnızca iki veya daha derin yollarda göster (/details/CV-XXX gibi)
  if (parcalar.length < 2) return null;

  const kok = parcalar[0];
  const etiket = ETIKET[kok];
  if (!etiket) return null;

  return (
    <nav aria-label="Konum" className="border-b border-slate-100 bg-white/60 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-1.5 text-[11px] font-semibold">
        <Link
          href="/"
          className="text-slate-500 hover:text-indigo-600 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
        >
          Anasayfa
        </Link>
        <span className="text-slate-300" aria-hidden="true">›</span>
        <span className="text-slate-900 font-bold">{etiket}</span>
      </div>
    </nav>
  );
}
```

- [ ] **Adım 2: `(site)` çatısına ekle**

`src/app/(site)/layout.js` içinde `<Header />` ile `<main>` arasına `<Breadcrumb />` ekle:

```jsx
      <TopBar />
      <Header />
      <Breadcrumb />
      <main id="icerik" className="flex-1">
```

ve import satırını ekle:

```jsx
import Breadcrumb from '@/components/layout/Breadcrumb';
```

- [ ] **Adım 3: Doğrula**

1. `/` → breadcrumb **yok** (tek seviye)
2. `/garage` → breadcrumb **yok** (tek seviye)
3. `/details/CV-D7JMLH` → "Anasayfa › Araç Detayı" görünüyor
4. `/karne/CV-D7JMLH` → "Anasayfa › Oto-Karne"
5. **KVKK:** breadcrumb metninde PIN kodu yazmıyor
6. "Anasayfa" tıklanınca `/` açılıyor
7. `npm run build` hatasız; regresyon tam geçiyor

- [ ] **Adım 4: Commit**

```bash
git add src/components/layout/Breadcrumb.jsx "src/app/(site)/layout.js"
git commit -m "feat(catki): kirinti yol (breadcrumb)

Yalnizca iki ve daha derin yollarda basiliyor. Dinamik segment (PIN)
yol metnine yazilmiyor."
```

---

### Görev 4: `(auth)` sade çatısı

**Dosyalar:**
- Oluştur: `src/components/layout/AuthHeader.jsx`
- Oluştur: `src/app/(auth)/layout.js`
- Taşı: `src/app/(full)/login`, `register`, `reset-password` → `src/app/(auth)/`

**Arayüzler:**
- Üretir: `AuthHeader()` — prop almaz

- [ ] **Adım 1: AuthHeader bileşenini oluştur**

`src/components/layout/AuthHeader.jsx`:

```jsx
// =========================================================================
// OTO-CV SADE ÇATI BAŞLIĞI (AuthHeader.jsx)
// İşlev: Giriş, kayıt ve şifre sıfırlama ekranlarının başlığı. Ana menü
//        YOK — sektör standardı: auth ekranında menü dikkat dağıtır.
//        Kullanıcı hangi sitede olduğunu görür, ama akıştan sapmaz.
// =========================================================================

'use client';

import React from 'react';
import Link from 'next/link';

export default function AuthHeader() {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          <span>Anasayfa</span>
        </Link>

        <Link
          href="/"
          className="text-base font-black tracking-tight text-slate-900 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
        >
          OTO.CV
        </Link>
      </div>
    </header>
  );
}
```

- [ ] **Adım 2: `(auth)` çatısını kur**

`src/app/(auth)/layout.js`:

```jsx
// =========================================================================
// OTO-CV SADE ÇATI ((auth)/layout.js)
// İşlev: Kimlik ekranları için başlık + içerik + yasal şerit.
// =========================================================================

'use client';

import React from 'react';
import SkipLink from '@/components/layout/SkipLink';
import AuthHeader from '@/components/layout/AuthHeader';

export default function AuthLayout({ children }) {
  const yil = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDFB] text-[#0F172A] font-sans antialiased tracking-tight">
      <SkipLink />
      <AuthHeader />
      <main id="icerik" className="flex-1 flex flex-col">
        {children}
      </main>
      <div className="border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-1.5">
          <span className="text-[10px] font-semibold text-slate-400">
            © {yil} Oto.CV · Tüm hakları saklıdır
          </span>
          <span className="text-[10px] font-medium text-slate-300">
            Yasal metinler hazırlanıyor
          </span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Adım 3: Sayfaları taşı**

```bash
git mv "src/app/(full)/login" "src/app/(auth)/login"
git mv "src/app/(full)/register" "src/app/(auth)/register"
git mv "src/app/(full)/reset-password" "src/app/(auth)/reset-password"
```

- [ ] **Adım 4: Ekranların kendi "geri" başlıklarını gözden geçir**

`VehicleAuthScreen` ve `ResetPasswordScreen` kendi içlerinde "Ana Sayfaya Dön" ve
"OTO.CV" başlığı taşıyor (ekran görüntüsünde görülmüştü). `AuthHeader` aynı işi
yaptığı için bu ikisi **çift** görünür.

Kontrol et: `grep -n "Ana Sayfaya Dön\|OTO.CV" src/components/VehicleAuthScreen.jsx src/components/ResetPasswordScreen.jsx`

Bulunan bloklar bileşenden **kaldırılır** (çatı artık bu işi yapıyor). Bu, ekran
bileşenine dokunulan tek yerdir ve gerekçesi çift başlık.

- [ ] **Adım 5: Sunucuyu temiz başlat ve doğrula**

```bash
rm -rf .next
npm run dev
```

1. `/login` → üstte "‹ Anasayfa" ve sağda "OTO.CV" var, **ana menü yok**
2. Altta telif şeridi var
3. Ekranın kendi başlığı ile çatı başlığı **çift görünmüyor**
4. `/register` ve `/reset-password` aynı çatıda
5. Mobilde (390px) başlık ve şerit taşmıyor
6. `/login` formundan gerçek giriş → `/garage`
7. `npm run build` hatasız; regresyon tam geçiyor

- [ ] **Adım 6: Commit**

```bash
git add -A
git commit -m "feat(catki): (auth) sade catisi

Giris, kayit ve sifre sifirlama ekranlari artik catili. Ana menu yok
(sektor standardi: auth ekraninda menu dikkat dagitir). Ekranlarin
kendi cift baslıklari kaldirildi."
```

---

### Görev 5: `(wizard)` sihirbaz çatısı

**Dosyalar:**
- Oluştur: `src/components/layout/WizardHeader.jsx`
- Oluştur: `src/app/(wizard)/layout.js`
- Taşı: `src/app/(full)/add-vehicle` → `src/app/(wizard)/add-vehicle`
- Sil: boşalan `src/app/(full)/` altındaki `details` ve `karne` → Görev 6'da `(site)`'a taşınıyor

**Arayüzler:**
- Üretir: `WizardHeader()` — prop almaz; adım numarasını `useParams()` ile URL'den okur

- [ ] **Adım 1: WizardHeader bileşenini oluştur**

`src/components/layout/WizardHeader.jsx`:

```jsx
// =========================================================================
// OTO-CV SİHİRBAZ BAŞLIĞI (WizardHeader.jsx)
// İşlev: Araç kayıt sihirbazının başlığı. Ana menü YOK — kullanıcı
//        akıştan çıkmamalı. Yerine adım göstergesi ve çıkış var.
// Not: Adım numarası URL'den okunur (/add-vehicle/step2 -> 2). Sihirbazın
//      kendi iç adım state'i ile eşleşmesi ayrı bir iş kalemi.
// =========================================================================

'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const ADIMLAR = ['Araç ve Fotoğraflar', 'Detaylar', 'Bakım Geçmişi', 'Önizleme'];

export default function WizardHeader() {
  const params = useParams();
  const ham = String(params?.step || 'step1');
  const eslesme = ham.match(/\d+/);
  const aktif = eslesme ? Math.min(Math.max(parseInt(eslesme[0], 10), 1), 4) : 1;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="text-base font-black tracking-tight text-slate-900 shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
        >
          OTO.CV
        </Link>

        <ol className="hidden md:flex items-center gap-2 flex-1 justify-center" aria-label="Kayıt adımları">
          {ADIMLAR.map((ad, i) => {
            const no = i + 1;
            const tamam = no < aktif;
            const su = no === aktif;
            return (
              <li key={ad} className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 rounded-full grid place-items-center text-[10px] font-black shrink-0 ${
                    tamam ? 'bg-emerald-500 text-white'
                    : su ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-400'
                  }`}
                  aria-current={su ? 'step' : undefined}
                >
                  {tamam ? '✓' : no}
                </span>
                <span className={`text-[11px] font-bold ${su ? 'text-slate-900' : 'text-slate-400'}`}>
                  {ad}
                </span>
                {no < 4 && <span className="w-6 h-px bg-slate-200 mx-1" aria-hidden="true" />}
              </li>
            );
          })}
        </ol>

        <span className="md:hidden text-[11px] font-bold text-slate-500">
          Adım {aktif}/4
        </span>

        <Link
          href="/garage"
          className="text-[11px] font-bold text-slate-500 hover:text-rose-600 transition-colors shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
        >
          Çıkış
        </Link>
      </div>
    </header>
  );
}
```

- [ ] **Adım 2: `(wizard)` çatısını kur**

`src/app/(wizard)/layout.js`:

```jsx
// =========================================================================
// OTO-CV SİHİRBAZ ÇATISI ((wizard)/layout.js)
// İşlev: Araç kayıt akışı için adım göstergeli başlık + içerik.
//        Footer yok: akış içinde dikkat dağıtmamalı.
// =========================================================================

'use client';

import React from 'react';
import SkipLink from '@/components/layout/SkipLink';
import WizardHeader from '@/components/layout/WizardHeader';

export default function WizardLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDFB] text-[#0F172A] font-sans antialiased tracking-tight">
      <SkipLink />
      <WizardHeader />
      <main id="icerik" className="flex-1">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Adım 3: Sihirbazı taşı**

```bash
git mv "src/app/(full)/add-vehicle" "src/app/(wizard)/add-vehicle"
```

- [ ] **Adım 4: Sunucuyu temiz başlat ve doğrula**

```bash
rm -rf .next
npm run dev
```

Oturum açık olarak:
1. `/add-vehicle/step1` → üstte adım göstergesi, 1. adım indigo, diğerleri gri
2. `/add-vehicle/step2` yaz → gösterge 2. adımı işaretliyor, 1. adım yeşil ✓
3. "Çıkış" → `/garage`
4. Ana menü **yok**
5. Mobilde (390px) gösterge "Adım 1/4" metnine dönüyor
6. Sihirbazın kendi içindeki ilerleme çalışmaya devam ediyor
7. `npm run build` hatasız; regresyon tam geçiyor

- [ ] **Adım 5: Commit**

```bash
git add -A
git commit -m "feat(catki): (wizard) sihirbaz catisi

Adim gostergeli baslik, ana menu yok (kullanici akistan cikmamali).
Adim numarasi URL'den okunuyor, mobilde 'Adim N/4' metnine donuyor."
```

---

### Görev 6: `/details` ve `/karne` tam çatıya taşınıyor

**Dosyalar:**
- Taşı: `src/app/(full)/details` → `src/app/(site)/details`
- Taşı: `src/app/(full)/karne` → `src/app/(site)/karne`
- Sil: boşalan `src/app/(full)/` klasörü
- Değiştir: `src/components/karne/OtoKarneScreen.jsx` (sticky çakışması)
- Değiştir: `src/components/VehicleDetailsScreen.jsx` (sticky çakışması)

**Arayüzler:** yeni arayüz üretmez; mevcut sayfalar çatı kazanır.

**Bu görev en riskli olan.** İki sayfa navbar kazanıyor ve her ikisi de kendi içinde
`sticky top-0` başlık taşıyor. Site header'ı da sticky olduğu için üst üste binerler.

- [ ] **Adım 1: Sticky çakışmasını tespit et**

```bash
grep -n "sticky top-0\|sticky top-" src/components/karne/OtoKarneScreen.jsx src/components/VehicleDetailsScreen.jsx
```

Bulunan her `sticky top-0` için karar: site header'ının yüksekliği 64px (`h-16`),
üst şerit 36px (`h-9`). Sayfa kaydırıldığında yalnızca header sticky kalır
(üst şerit kayar), yani sayfa içi sticky başlıklar `top-16` olmalıdır.

- [ ] **Adım 2: Sayfa içi sticky başlıkları hizala**

`OtoKarneScreen.jsx` içindeki app bar'ı bul:

```jsx
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md ...">
```

`top-0` → `top-16` ve `z-40` korunur (site header `z-50`, altında kalması doğru):

```jsx
      <header className="sticky top-16 z-40 bg-white/80 backdrop-blur-md ...">
```

`VehicleDetailsScreen.jsx` içinde `isSticky` state'i ve sticky bölüm menüsü var;
aynı mantıkla `top-0` kullanan yerler `top-16`'ya çevrilir.

- [ ] **Adım 3: Sayfaları taşı**

```bash
git mv "src/app/(full)/details" "src/app/(site)/details"
git mv "src/app/(full)/karne" "src/app/(site)/karne"
rmdir "src/app/(full)" 2>/dev/null || true
```

- [ ] **Adım 4: Sunucuyu temiz başlat ve doğrula**

```bash
rm -rf .next
npm run dev
```

Oturumsuz:
1. `/details/CV-D7JMLH` → üst şerit + header + breadcrumb + araç detayı + footer
2. Sayfayı kaydır → site header üstte kalıyor, **çakışma yok**
3. Araç detayının kendi bölüm menüsü header'ın altında doğru konumda
4. `/karne/CV-D7JMLH` → çatılı açılıyor, karne app bar'ı header'ın altında
5. **KVKK:** plaka hâlâ hiçbir yerde yok (breadcrumb dahil)

Yazdırma:
6. `/karne/CV-D7JMLH` → tarayıcı yazdırma önizlemesi (Ctrl+P) → **üst şerit, header,
   breadcrumb, footer görünmüyor**, yalnızca belge var

Oturum açık:
7. `/details/CV-D7JMLH` → sahip görünümü korunuyor ("Garajımda Yönet" var,
   iletişim paneli yok, tam plaka görünüyor)

Ek: `npm run build` hatasız; 35 maddelik regresyon tam geçiyor.

- [ ] **Adım 5: Commit**

```bash
git add -A
git commit -m "feat(catki): arac detayi ve karne tam catiya tasindi

(full) grubu kalktı; artik ucu de kendi catisinda:
(site) icerik, (auth) kimlik, (wizard) sihirbaz.
Sayfa ici sticky basliklar site header'i ile cakismamasi icin
top-16'ya hizalandi. Yazdirmada cati gizli."
```

---

### Görev 7: Sistem sayfaları — 404, hata, yüklenme

**Dosyalar:**
- Oluştur: `src/app/not-found.js`
- Oluştur: `src/app/error.js`
- Oluştur: `src/app/loading.js`

**Arayüzler:** Next.js'in özel dosya sözleşmesi; başka görev bunlara dayanmaz.

- [ ] **Adım 1: 404 sayfasını oluştur**

`src/app/not-found.js`. Kök seviyede olduğu için çatı bileşenlerini kendisi çağırır:

```jsx
// =========================================================================
// OTO-CV 404 SAYFASI (not-found.js)
// İşlev: Olmayan adres istendiğinde Next.js'in çıplak varsayılanı yerine
//        tasarım diline uygun, yol gösteren bir sayfa.
// =========================================================================

import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Sayfa bulunamadı',
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FFFDFB] text-[#0F172A] font-sans antialiased flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 md:p-10 max-w-md w-full text-center space-y-5 shadow-sm">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-slate-500 text-[10px] font-black tracking-wider uppercase">
          Hata 404
        </span>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sayfa bulunamadı</h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed">
            Aradığınız sayfa taşınmış ya da hiç var olmamış olabilir. Aşağıdaki yollardan
            devam edebilirsiniz.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
          <Link
            href="/verify"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-3 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
          >
            PIN ile Araç Sorgula
          </Link>
          <Link
            href="/"
            className="bg-white hover:bg-slate-50 text-slate-800 border border-gray-200 font-bold text-xs px-6 py-3 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
          >
            Anasayfa
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Adım 2: Hata sınırını oluştur**

`src/app/error.js`. Client component olmak **zorunda** (Next.js sözleşmesi).
Teknik hata metni kullanıcıya gösterilmez, konsola yazılır:

```jsx
// =========================================================================
// OTO-CV HATA SINIRI (error.js)
// İşlev: Bir sayfa çökerse beyaz ekran yerine kurtarma yolu sunar.
// Not: Teknik hata metni kullanıcıya gösterilmez (güvenlik ve okunabilirlik),
//      konsola yazılır.
// =========================================================================

'use client';

import React, { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('Sayfa hatası:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#FFFDFB] text-[#0F172A] font-sans antialiased flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 md:p-10 max-w-md w-full text-center space-y-5 shadow-sm">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-100 rounded-full text-rose-600 text-[10px] font-black tracking-wider uppercase">
          Beklenmeyen Hata
        </span>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Bir şeyler ters gitti</h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed">
            Sayfa yüklenirken bir sorun oluştu. Tekrar denemek çoğu zaman yeterli oluyor.
            Sorun sürerse bir süre sonra tekrar deneyin.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
          <button
            type="button"
            onClick={() => reset()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-3 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
          >
            Tekrar Dene
          </button>
          <a
            href="/"
            className="bg-white hover:bg-slate-50 text-slate-800 border border-gray-200 font-bold text-xs px-6 py-3 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
          >
            Anasayfa
          </a>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Adım 3: Yüklenme iskeletini oluştur**

`src/app/loading.js`:

```jsx
// =========================================================================
// OTO-CV YÜKLENME İSKELETİ (loading.js)
// İşlev: Sayfa geçişlerinde yerleşimi koruyan gri iskelet. Boş ekran ya
//        da zıplayan yerleşim (layout shift) yerine sabit bir doluluk.
// =========================================================================

import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-[60vh] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
      <div className="h-7 w-56 bg-slate-200 rounded-lg" />
      <div className="h-3 w-80 bg-slate-100 rounded mt-3" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="h-32 bg-slate-100 rounded-lg" />
            <div className="h-4 w-3/4 bg-slate-200 rounded" />
            <div className="h-3 w-1/2 bg-slate-100 rounded" />
            <div className="h-9 bg-slate-100 rounded-lg mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Adım 4: Doğrula**

1. `http://localhost:3000/olmayan-bir-adres` → 404 kartı, tasarım diline uygun
2. 404'te "PIN ile Araç Sorgula" → `/verify`
3. Sekme başlığı "Sayfa bulunamadı | Oto.CV" (Görev 8'deki şablonla)
4. Yavaş bağlantı benzetmesi (tarayıcı geliştirici araçlarında ağı yavaşlat) →
   sayfa geçişinde iskelet görünüyor, ekran boş kalmıyor
5. `npm run build` hatasız; regresyon tam geçiyor

Hata sınırını denemek için geçici olarak bir sayfaya `throw new Error('deneme')`
eklenip kaldırılabilir — kalıcı değişiklik yapılmaz.

- [ ] **Adım 5: Commit**

```bash
git add src/app/not-found.js src/app/error.js src/app/loading.js
git commit -m "feat(sistem): 404, hata sinirri ve yuklenme iskeleti

Next.js'in ciplak varsayilanlari yerine tasarim diline uygun sayfalar.
Hata sayfasi teknik metni kullaniciya gostermiyor, konsola yaziyor."
```

---

### Görev 8: SEO — metadata, robots, sitemap, manifest, paylaşım kartı

**Dosyalar:**
- Değiştir: `src/app/layout.js` (metadataBase + başlık şablonu)
- Oluştur: `src/app/robots.js`
- Oluştur: `src/app/sitemap.js`
- Oluştur: `src/app/manifest.js`
- Oluştur: `src/app/opengraph-image.js`
- Değiştir: her `page.js`'e `metadata` veya `generateMetadata`

**Arayüzler:** Next.js metadata sözleşmesi.

- [ ] **Adım 1: Kök metadata'yı genişlet**

`src/app/layout.js` içindeki `metadata` bloğunu değiştir:

```jsx
export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'Oto.CV | Dijital Taşıt Sicil ve Bakım Karnesi',
    template: '%s | Oto.CV',
  },
  description:
    'Aracınızın bakım geçmişini dijital sicil olarak tutun, sigorta ve muayene tarihlerini kaçırmayın, karnenizi tek bağlantıyla paylaşın.',
  applicationName: 'Oto.CV',
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    siteName: 'Oto.CV',
    title: 'Oto.CV | Dijital Taşıt Sicil ve Bakım Karnesi',
    description:
      'Aracınızın bakım geçmişini dijital sicil olarak tutun, karnenizi tek bağlantıyla paylaşın.',
  },
  robots: { index: true, follow: true },
};
```

`.env.local` dosyasına eklenecek satır (kullanıcı ekler, gizli değer değil):

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Adım 2: robots.js oluştur**

`src/app/robots.js`. Spec 10. bölümdeki indeksleme politikası:

```js
// =========================================================================
// OTO-CV ARAMA MOTORU TALİMATI (robots.js)
// Politika: kamuya açık sayfalar indekslenir; oturum gerektiren alanlar,
//   sahibinin belge aracı (/karne) ve içeriksiz yer tutucular hariç tutulur.
//   İçeriksiz sayfaların indekslenmesi sitenin kalite sinyalini düşürür.
// =========================================================================

const TABAN = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/garage',
          '/my-listings',
          '/add-vehicle/',
          '/login',
          '/register',
          '/reset-password',
          '/karne/',
          '/dashboard',
          '/query-history',
          '/packages',
          '/account',
          '/insurance-offer',
          '/maintenance-planner',
        ],
      },
    ],
    sitemap: `${TABAN}/sitemap.xml`,
  };
}
```

- [ ] **Adım 3: sitemap.js oluştur**

`src/app/sitemap.js`:

```js
// =========================================================================
// OTO-CV SAYFA HARİTASI (sitemap.js)
// Not: Yalnızca indekslenmesi istenen route'lar. /details/[pin] dinamik ve
//   sayısı artacak; ilk aşamada haritaya eklenmiyor, gerekirse ikinci
//   aşamada veritabanından üretilir.
// =========================================================================

const TABAN = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default function sitemap() {
  const simdi = new Date();
  return [
    { url: `${TABAN}/`, lastModified: simdi, changeFrequency: 'daily', priority: 1 },
    { url: `${TABAN}/verify`, lastModified: simdi, changeFrequency: 'monthly', priority: 0.8 },
  ];
}
```

- [ ] **Adım 4: manifest.js oluştur**

`src/app/manifest.js`:

```js
// =========================================================================
// OTO-CV PWA MANIFEST (manifest.js)
// İşlev: Telefonda "ana ekrana ekle" desteği ve tarayıcı tema rengi.
// =========================================================================

export default function manifest() {
  return {
    name: 'Oto.CV — Dijital Taşıt Sicili',
    short_name: 'Oto.CV',
    description:
      'Aracınızın bakım geçmişini dijital sicil olarak tutun, tarih hatırlatmalarını kaçırmayın.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFFDFB',
    theme_color: '#0F172A',
    lang: 'tr',
    icons: [
      { src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
    ],
  };
}
```

- [ ] **Adım 5: Paylaşım kartı görselini oluştur**

`src/app/opengraph-image.js`. Next.js'in `ImageResponse` API'si ile üretilir:

```jsx
// =========================================================================
// OTO-CV PAYLAŞIM KARTI (opengraph-image.js)
// İşlev: WhatsApp, X ve diğer mecralarda link paylaşıldığında çıkan görsel.
//        Tasarım dili korunur: koyu slate zemin, amber vurgu.
// =========================================================================

import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: '#0F172A',
          color: '#FFFDFB',
        }}
      >
        <div style={{ fontSize: 34, fontWeight: 800, color: '#FBBF24', letterSpacing: 2 }}>
          OTO.CV
        </div>
        <div style={{ fontSize: 68, fontWeight: 800, marginTop: 28, lineHeight: 1.15 }}>
          Dijital Taşıt Sicili ve
        </div>
        <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.15 }}>
          Bakım Karnesi
        </div>
        <div style={{ fontSize: 30, marginTop: 32, color: '#94A3B8' }}>
          Bakım geçmişini tut · Tarihleri kaçırma · Karneni paylaş
        </div>
      </div>
    ),
    size
  );
}
```

- [ ] **Adım 6: Sayfa başına metadata ekle**

Her statik sayfaya `metadata` eklenir. Client component olan sayfalarda `metadata`
export edilemez, o yüzden bu sayfalarda ayrı bir sunucu sarmalayıcı gerekir.
**Bunun yerine daha basit yol:** her route klasörüne bir `layout.js` eklemek yerine,
metadata'yı client sayfanın **üstündeki** grup layout'una veremeyeceğimiz için,
yalnızca yeni `metadata` taşıyabilen yerlere eklenir.

Uygulanacak yöntem: her `page.js` için kardeş bir `layout.js` dosyası oluşturulur ve
metadata orada tanımlanır. Örnek — `src/app/(site)/garage/layout.js`:

```jsx
export const metadata = {
  title: 'Garajım',
  description: 'Tescilli araçlarınız, poliçe tarihleri ve bakım kayıtları.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }) {
  return children;
}
```

Aynı desenle oluşturulacak dosyalar ve değerleri:

| Dosya | title | robots index |
|---|---|---|
| `(site)/garage/layout.js` | `Garajım` | false |
| `(site)/my-listings/layout.js` | `Aktif İlanlarım` | false |
| `(site)/verify/layout.js` | `Karne PIN Sorgula` | true |
| `(site)/dashboard/layout.js` | `Bana Özel Özet` | false |
| `(site)/query-history/layout.js` | `Sorgulama Geçmişim` | false |
| `(site)/packages/layout.js` | `Paketlerim & Ödemeler` | false |
| `(site)/account/layout.js` | `Hesabım` | false |
| `(site)/insurance-offer/layout.js` | `Sigorta Teklifleri` | false |
| `(site)/maintenance-planner/layout.js` | `Bakım Planlayıcı` | false |
| `(auth)/login/layout.js` | `Giriş Yap` | false |
| `(auth)/register/layout.js` | `Hesap Aç` | false |
| `(auth)/reset-password/layout.js` | `Şifre Sıfırlama` | false |
| `(wizard)/add-vehicle/layout.js` | `Araç Kaydı` | false |
| `(site)/karne/layout.js` | `Oto-Karne` | false |

Açıklama metinleri her sayfanın işini bir cümleyle anlatır; örnek olarak
`verify` için: `PIN kodu ile aracın bakım geçmişini ve sicilini sorgulayın.`

- [ ] **Adım 7: Doğrula**

1. `/` sekme başlığı: `Oto.CV | Dijital Taşıt Sicil ve Bakım Karnesi`
2. `/garage` sekme başlığı: `Garajım | Oto.CV`
3. `/verify` sekme başlığı: `Karne PIN Sorgula | Oto.CV`
4. `http://localhost:3000/robots.txt` → `/garage`, `/karne/` ve yer tutucular
   `Disallow` listesinde
5. `http://localhost:3000/sitemap.xml` → yalnızca `/` ve `/verify` var
6. `http://localhost:3000/manifest.webmanifest` → JSON dönüyor
7. `http://localhost:3000/opengraph-image` → 1200×630 PNG görüntüleniyor
8. `/garage` kaynağında `<meta name="robots" content="noindex, nofollow">` var
9. `npm run build` hatasız; regresyon tam geçiyor

- [ ] **Adım 8: Commit**

```bash
git add -A
git commit -m "feat(seo): metadata, robots, sitemap, manifest ve paylasim karti

Baslik sablonu %s | Oto.CV; her sayfaya kendi basligi ve aciklamasi.
Indeksleme politikasi: kamuya acik sayfalar index; oturum alanlari,
/karne (sahibinin belge araci) ve iceriksiz yer tutucular noindex."
```

---

## Öz-denetim

**Spec kapsamı:** Spec'in her bölümü bir göreve bağlandı —
4. bölüm çatı katmanları (G2, G4, G5, G6), 5. dosya yapısı (tüm görevler),
6. üst şerit (G1), 7. header ve çekmece (G1), 8. erişilebilirlik (G1 span→button
ve odak halkası, G2 skip link ve `<main>`, G1 çekmece dialog semantiği),
9. çerez kararı (kod yazılmıyor, karar spec'te kayıtlı — plan bilinçli olarak
banner görevi içermiyor), 10. SEO ve indeksleme (G8), 11. footer (G2),
12. sistem sayfaları (G7), 13. yazdırma (G1/G2/G3'te `print:hidden`, G6'da doğrulama),
14. riskler (G6 sticky çakışması adım adım ele alınıyor).

**Yer tutucu taraması:** Hiçbir adımda "TBD" veya belirsiz talimat yok; her kod adımı
çalıştırılabilir kod içeriyor. Görev 8 Adım 6'daki 14 dosya tek şablondan üretiliyor ve
tablo her dosyanın tam değerlerini veriyor — "diğerleri benzer" denmiyor.

**Tip ve isim tutarlılığı:** `MobileDrawer({ open, onClose, user, onSignOut })` G1'de
tanımlanıp aynı imzayla `Header`'da kullanılıyor. `TopBar()`, `Header()`, `Footer()`,
`SkipLink()`, `Breadcrumb()`, `AuthHeader()`, `WizardHeader()` hiçbiri prop almıyor ve
her yerde öyle çağrılıyor. `<main id="icerik">` üç çatıda aynı; `SkipLink` `#icerik`
hedefliyor. Sticky hizalaması G1'de header `h-16` olarak belirlendi, G6'da `top-16`
buna dayanıyor.

**Bilinen ve kabul edilmiş sınırlar:**
- Görev 8 Adım 6'da her sayfa için ayrı `layout.js` açılıyor. Sebep: sayfalar client
  component ve client component'ten `metadata` export edilemez. Alternatif (her sayfayı
  sunucu sarmalayıcıya bölmek) daha çok dosya ve daha çok risk üretirdi.
- Sihirbaz başlığındaki adım göstergesi URL'den okunuyor; sihirbazın kendi iç adım
  state'iyle eşleşmesi ayrı iş kalemi (yönlendirme planı Görev 7).
