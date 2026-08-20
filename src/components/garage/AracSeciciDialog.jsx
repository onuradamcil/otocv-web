// =========================================================================
// ARAÇ SEÇİCİ (AracSeciciDialog.jsx)
//
// -------------------------------------------------------------------------
// NİYE VAR
// -------------------------------------------------------------------------
// Garaj kartlarındaki "Satışa Çıkar" ve "Aracı Devret" şeritleri kaldırıldı:
// yılda bir kez yapılan işler her kartta yer kaplıyordu ve on araçta ekran
// okunmaz hâle geliyordu.
//
// Eylemler Araç Merkezi'ne taşındı. Ama merkezdeki bir düğme "hangi araç?"
// sorusunu cevaplamıyor — bu diyalog o soruyu soruyor ve sonra ZATEN VAR
// OLAN modalı açıyor. Yeni bir iş mantığı yazmıyor, yalnızca araç seçtiriyor.
//
// -------------------------------------------------------------------------
// ARAMA NİYE KOŞULLU
// -------------------------------------------------------------------------
// Üç araçlı bir listeye arama kutusu koymak, kullanıcıya olmayan bir
// karmaşıklığı işaret eder. Altı araca kadar liste zaten tek bakışta
// okunuyor; üstünde arama beliriyor. Eşik `ARAMA_ESIGI`.
//
// -------------------------------------------------------------------------
// DEVRE DIŞI ARAÇLAR GİZLENMİYOR
// -------------------------------------------------------------------------
// Satıştaki bir aracı yeniden satışa çıkaramazsınız. O aracı listeden
// SİLMEK yerine sebebiyle birlikte gösteriyoruz ("Zaten satışta"). Aksi
// hâlde kullanıcı aracını listede bulamayıp kaybolduğunu sanır — bu projede
// daha önce yaşanmış bir kalıp.
// =========================================================================

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../common/icons';
import TrPlaka from '../common/TrPlaka';

const ARAMA_ESIGI = 6;

// Plaka aramasında boşluk ve büyük/küçük harf yok sayılıyor: kullanıcı
// "34abc" yazınca "34 ABC 123" bulunmalı. Türkçe locale şart — 'i' harfinin
// büyüğü 'I' değil 'İ'.
const sadelestir = (s) => (s || '').toString().replace(/\s+/g, '').toLocaleUpperCase('tr-TR');

export default function AracSeciciDialog({
  baslik,
  aciklama,
  vehicles = [],
  onSec,
  onClose,
  devreDisi,       // (vehicle) => string | null  — doluysa sebep, seçilemez
  ikon = 'arac',
}) {
  const [arama, setArama] = useState('');
  const panelRef = useRef(null);
  const aramaRef = useRef(null);

  // Esc, odak tuzağı, kaydırma kilidi ve odağın geri verilmesi.
  // MobileDrawer'daki kalıbın aynısı — orada da tek tek gerekçelendirildi.
  useEffect(() => {
    const oncekiOdak = document.activeElement;

    const tusaBasildi = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const odaklanabilir = panelRef.current.querySelectorAll(
          'button:not([disabled]), input, a[href]'
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

    document.addEventListener('keydown', tusaBasildi);
    const oncekiOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const t = setTimeout(() => {
      (aramaRef.current || panelRef.current?.querySelector('button'))?.focus();
    }, 50);

    return () => {
      document.removeEventListener('keydown', tusaBasildi);
      document.body.style.overflow = oncekiOverflow;
      clearTimeout(t);
      if (oncekiOdak instanceof HTMLElement && oncekiOdak.isConnected) {
        oncekiOdak.focus();
      }
    };
  }, [onClose]);

  const aramaGorunur = vehicles.length > ARAMA_ESIGI;
  const anahtar = sadelestir(arama);
  const listelenen = anahtar
    ? vehicles.filter((v) =>
        sadelestir(v.plate_number).includes(anahtar) ||
        sadelestir(`${v.brand}${v.model}`).includes(anahtar)
      )
    : vehicles;

  // -------------------------------------------------------------------------
  // NİYE PORTAL — ÖLÇÜLDÜ, VARSAYILMADI
  //
  // Garaj rotası içeriği `<div className="animate-fadeIn relative">` içinde
  // açıyor. Bu sarmalayıcı, animasyon BİTTİKTEN sonra bile
  // `transform: matrix(1,0,0,1,0,0)` taşıyor — kimlik matrisi, hiçbir şeyi
  // taşımıyor. Ama CSS'e göre `none` DIŞINDAKİ her transform değeri,
  // `position: fixed` torunlar için yeni bir kapsayıcı blok yaratıyor.
  //
  // Sonuç: diyalog ekrana değil o kutuya göre ortalanıyordu ve uzun sayfada
  // alt kısmı görünmüyordu (ölçüldü: tepe 351px, yükseklik 748px, viewport
  // 1000px). Paywall'da aynı hata `backdrop-blur` yüzünden yaşanmıştı.
  //
  // `document.body`'ye taşımak kökten çözüyor. `typeof document` kontrolü
  // sunucu tarafı render için — mount bayrağı yerine bu kullanılıyor ki
  // efekt içinde setState çağrılmasın.
  // -------------------------------------------------------------------------
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm motion-safe:animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="arac-secici-baslik"
        className="relative w-full sm:max-w-lg bg-white rounded-t-lg sm:rounded-lg shadow-2xl border border-slate-200 flex flex-col max-h-[85vh]"
      >
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-start gap-3 shrink-0">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 grid place-items-center shrink-0">
            <Icon name={ikon} size="lg" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="arac-secici-baslik" className="text-govde font-semibold text-slate-900 tracking-tight">
              {baslik}
            </h2>
            <p className="text-yardimci text-slate-500 font-semibold mt-0.5 leading-relaxed">{aciklama}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="w-9 h-9 -mt-1 -mr-1 grid place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0 cursor-pointer"
          >
            <Icon name="kapat" size="md" />
          </button>
        </div>

        {aramaGorunur && (
          <div className="px-5 pt-4 shrink-0">
            <input
              ref={aramaRef}
              type="text"
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="Plaka, marka veya model ara"
              aria-label="Araç ara"
              className="w-full h-11 px-3.5 rounded-md border border-slate-200 bg-slate-50 text-mini font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-colors"
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {listelenen.length === 0 ? (
            <p className="text-mini text-slate-500 font-semibold text-center py-8">
              {anahtar ? `"${arama}" ile eşleşen araç yok.` : 'Garajınızda araç yok.'}
            </p>
          ) : (
            listelenen.map((v) => {
              const sebep = devreDisi ? devreDisi(v) : null;
              return (
                <button
                  key={v.id || v.plate_number}
                  type="button"
                  disabled={!!sebep}
                  onClick={() => onSec(v)}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    sebep
                      ? 'border-slate-100 bg-slate-50/70 cursor-not-allowed opacity-70'
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 active:scale-[0.99] cursor-pointer'
                  }`}
                >
                  {/* Bu yorumun yazdığı kural artık tek yerde uygulanıyor:
                      "Aynı plakayı iki ekranda iki farklı biçimde görmek,
                      kullanıcıya farklı araç hissi verir." -> TrPlaka */}
                  <TrPlaka plaka={v.plate_number} boyut="sm" />

                  <span className="min-w-0 flex-1">
                    <span className="block text-mini font-semibold text-slate-900 truncate">
                      {v.brand} {v.model}
                    </span>
                    <span className="block text-etiket text-slate-500 font-bold font-mono">
                      {v.year} • {v.km ? Number(v.km).toLocaleString('tr-TR') : '0'} km
                    </span>
                  </span>

                  {sebep ? (
                    <span className="text-etiket font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-lg shrink-0">
                      {sebep}
                    </span>
                  ) : (
                    <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
