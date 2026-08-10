// =========================================================================
// OTO-CV BİLDİRİM ŞERİDİ (ToastContext.jsx)
// İşlev: Site genelinde tek bir geri bildirim dili. alert() yerine kullanılır.
//
// NEDEN alert() DEĞİL:
//   - tarayıcının yerel penceresi tasarımın dışında kalır
//   - sayfayı bloke eder, kullanıcı başka bir şey yapamaz
//   - mobilde kaba durur ve alan adını gösterir
//   - biçimlendirilemez, ikon veya renk taşıyamaz
//
// Erişilebilirlik: bölge aria-live ile duyurulur, hata mesajları assertive
// (hemen okunur), bilgi/başarı polite (sıra bekler). Kapat butonu etiketli.
// prefers-reduced-motion'a saygı gösterilir.
// =========================================================================

'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import Icon from '../components/common/icons';

const ToastContext = createContext(null);

const SURE = 4000;

// İkon çizimleri burada TUTULMAZ; merkezi ikon kütüphanesinden gelir.
// Önceden bu dosya kendi SVG yollarını taşıyordu — aynı onay/uyarı işaretinin
// sitede iki ayrı tanımı olması, birini değiştirince diğerinin geride
// kalmasına yol açar. Tek kaynak: components/common/icons.
const TIPLER = {
  success: {
    kenar: 'border-emerald-200',
    zemin: 'bg-emerald-50',
    metin: 'text-emerald-900',
    ikonRenk: 'text-emerald-600',
    ikon: 'onay',
  },
  error: {
    kenar: 'border-rose-200',
    zemin: 'bg-rose-50',
    metin: 'text-rose-900',
    ikonRenk: 'text-rose-600',
    ikon: 'uyari',
  },
  info: {
    kenar: 'border-indigo-200',
    zemin: 'bg-indigo-50',
    metin: 'text-indigo-900',
    ikonRenk: 'text-indigo-600',
    ikon: 'bilgi',
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const sayacRef = useRef(0);

  const kapat = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const gonder = useCallback((mesaj, tip = 'info') => {
    if (!mesaj) return;
    const id = ++sayacRef.current;
    setToasts((prev) => [...prev, { id, mesaj, tip: TIPLER[tip] ? tip : 'info' }]);
    setTimeout(() => kapat(id), SURE);
  }, [kapat]);

  // Çağrı yerlerinde okunabilir olsun diye kısayollar
  const toast = {
    basari: (m) => gonder(m, 'success'),
    hata: (m) => gonder(m, 'error'),
    bilgi: (m) => gonder(m, 'info'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* ŞERİT: sağ üstte, header'ın üstünde, yazdırmada gizli */}
      <div
        className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none print:hidden"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((t) => {
          const s = TIPLER[t.tip];
          return (
            <div
              key={t.id}
              role={t.tip === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto flex items-start gap-2.5 ${s.zemin} ${s.kenar} border rounded-xl shadow-lg px-4 py-3 motion-safe:animate-slideIn`}
            >
              <Icon name={s.ikon} size="md" className={`mt-0.5 ${s.ikonRenk}`} />

              <p className={`flex-1 text-[11px] font-semibold leading-relaxed ${s.metin}`}>
                {t.mesaj}
              </p>

              <button
                type="button"
                onClick={() => kapat(t.id)}
                aria-label="Bildirimi kapat"
                className={`shrink-0 w-6 h-6 grid place-items-center rounded-md ${s.ikonRenk} hover:bg-black/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current`}
              >
                <Icon name="kapat" size="sm" strokeWidth={2.5} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast, ToastProvider içinde kullanılmalıdır.');
  }
  return ctx;
}
