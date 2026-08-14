// =========================================================================
// OTO-CV MOBİL ÇEKMECE (MobileDrawer.jsx)
// İşlev: md altında ana menünün karşılığı. Sağdan kayar, arkada karartma.
//
// Erişilebilirlik gereksinimleri (hepsi burada karşılanıyor):
//   - role=dialog + aria-modal + aria-label
//   - Esc ile kapanma
//   - açıkken sayfa kaydırmasının kilitlenmesi
//   - odak tuzağı: Tab panelin dışına çıkmaz
//   - kapanınca odağın hamburger butonuna dönmesi
//   - tüm dokunma alanları en az 44px
//   - prefers-reduced-motion: animasyon kapanır
// =========================================================================

'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import Icon from '../common/icons';

// Mobilde yer daha kısıtlı; masaüstü menüsüyle aynı düzen: devir üstte,
// karne sorgulama korunuyor (mobilde footer'a inmek zahmetli).
const MENU = [
  // "Pazaryeri Vitrini" -> "Anasayfa". Masaüstü menüsünden bu bağlantı
  // tamamen kaldırıldı çünkü logonun gittiği yere gidiyordu. Çekmecede
  // duruyor: çekmece açıkken logo erişilebilir değil, eve dönüş yolu
  // gerekiyor. Adı ise ne yaptığını söylüyor.
  { href: '/', label: 'Anasayfa' },
  { href: '/devir', label: 'Araç Devir' },
  { href: '/verify', label: 'Karne PIN Sorgula' },
];

const UYE_MENU = [
  { href: '/garage', label: 'Tescilli Taşıtlarım (Garaj)' },
  { href: '/my-listings', label: 'Vitrindeki Araçlarım' },
  { href: '/favorilerim', label: 'Favorilerim' },
  { href: '/mesajlar', label: 'Mesajlarım' },
  { href: '/dashboard', label: 'Bana Özel Özet' },
  { href: '/query-history', label: 'Sorgulama Geçmişim' },
  { href: '/packages', label: 'Ücretler & Ödemeler' },
  { href: '/account', label: 'Hesabım' },
];

const SATIR = 'flex items-center min-h-[44px] px-4 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-600';

export default function MobileDrawer({ open, onClose, user, onSignOut }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    // Çekmece açılmadan ÖNCE odakta olan öğe saklanıyor (hamburger butonu).
    // Kapanışta odak buraya geri verilir.
    //
    // Neden gerekli: modal kapanınca odak hiçbir yere atanmazsa tarayıcı onu
    // <body>'ye düşürür. Klavyeyle gezen kullanıcı çekmeceyi kapattığında
    // sayfanın en başına savrulur ve kaldığı yeri kaybeder. Ekran okuyucu
    // kullanıcısı için de bağlam kopar.
    //
    // Bu dosyanın başlığında gereksinim olarak yazılıydı ama uygulanmamıştı;
    // klavye testi yakaladı.
    const oncekiOdak = document.activeElement;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      // Odak tuzağı: Tab panelin dışına çıkmasın
      if (e.key === 'Tab' && panelRef.current) {
        const odaklanabilir = panelRef.current.querySelectorAll('a[href], button:not([disabled])');
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

    const t = setTimeout(() => {
      panelRef.current?.querySelector('a[href], button:not([disabled])')?.focus();
    }, 50);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = oncekiOverflow;
      clearTimeout(t);

      // Odağı açılıştaki öğeye geri ver. Öğe bu arada DOM'dan kalkmış
      // olabilir (isConnected kontrolü), o durumda dokunulmaz.
      if (oncekiOdak instanceof HTMLElement && oncekiOdak.isConnected) {
        oncekiOdak.focus();
      }
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
        className="absolute right-0 top-0 h-full w-[82%] max-w-[320px] bg-white shadow-2xl flex flex-col animate-drawerIn"
      >
        <div className="h-14 pl-4 pr-2 flex items-center justify-between border-b border-slate-200 shrink-0">
          <span className="text-sm font-display font-bold tracking-tight text-slate-900">OTO.CV</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Menüyü kapat"
            className="w-11 h-11 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            <Icon name="kapat" size="lg" />
          </button>
        </div>

        <nav aria-label="Mobil menü" className="flex-1 overflow-y-auto py-1">
          {MENU.map((m) => (
            <Link key={m.href} href={m.href} onClick={onClose} className={`${SATIR} text-slate-800 hover:bg-slate-50`}>
              {m.label}
            </Link>
          ))}

          <span className={`${SATIR} text-slate-300 cursor-not-allowed select-none`}>
            Kurumsal Çözümler
          </span>

          {user && (
            <>
              <div className="mt-1 px-4 py-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Hesabım</span>
              </div>
              {UYE_MENU.map((m) => (
                <Link key={m.href} href={m.href} onClick={onClose} className={`${SATIR} text-slate-700 font-semibold hover:bg-slate-50`}>
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
            className="flex items-center justify-center min-h-[44px] w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
          >
            {/* Masaüstü başlığıyla aynı: ürün önce sicil, ilan ikincil.
                "Ücretsiz" de artık yanlış olurdu — ilk araç ücretsiz, sonrası
                Ek Araç Kaydı gerektiriyor. */}
            Araç Kaydet
          </Link>

          {user ? (
            <button
              type="button"
              onClick={async () => { onClose(); await onSignOut(); }}
              className="flex items-center justify-center min-h-[44px] w-full text-rose-600 hover:bg-rose-50 font-bold text-xs rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              Çıkış Yap
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/login"
                onClick={onClose}
                className="flex items-center justify-center min-h-[44px] bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              >
                Giriş Yap
              </Link>
              <Link
                href="/register"
                onClick={onClose}
                className="flex items-center justify-center min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
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
