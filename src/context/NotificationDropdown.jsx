// =========================================================================
// OTO-CV UI MODÜLÜ: PREMIUM REAL-TIME BİLDİRİM DROPDOWN PANELİ
// İşlev: Tıklandığında anlık okundu işaretleme, sayaç düşürme ve
//        404-Korumalı güvenli yönlendirme motoru.
// =========================================================================

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { tiklanabilir } from '../utils/tiklanabilir';

export default function NotificationDropdown({ onNavigate }) {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // TIKLAMA: OKUNDU İŞARETLE + BİLDİRİMİN KENDİ HEDEFİNE GİT
  //
  // ⚠ Prop'un adı eskiden `onNavigateToGarage` idi ve `Header` ona
  // `() => router.push('/garage')` veriyordu — yani ARGÜMANI YOK SAYIYORDU.
  // Sonuç: hangi bildirime tıklanırsa tıklansın garaj açılıyordu. Mesaj
  // bildirimi de, devir bildirimi de. Adı `onNavigate` oldu ki çağıranın
  // bildirimi kullanması gerektiği imzadan anlaşılsın.
  const handleNotificationClick = (item) => {
    // Okunmamışsa anında okundu yap ve sayacı düşür (0ms tepki).
    if (!item.is_read) {
      markAsRead(item.id);
    }

    setIsOpen(false);

    if (typeof onNavigate === 'function') {
      onNavigate(item);
    }
  };

  const getTypeStyles = (type) => {
    switch (type) {
      case 'danger':
        return { bg: 'bg-rose-50 border-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' };
      case 'warning':
        return { bg: 'bg-amber-50 border-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' };
      case 'success':
        return { bg: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' };
      default:
        return { bg: 'bg-slate-50 border-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' };
    }
  };

  return (
    <div className="relative inline-block text-left select-none" ref={dropdownRef}>
      
      {/* NAVBAR ZİL BUTONU */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={unreadCount > 0 ? `Bildirimler, ${unreadCount} okunmamış` : 'Bildirimler'}
        aria-expanded={isOpen}
        /* `w-11 h-11` = 44x44. `p-2.5` ile 42 px çıkıyordu — iki piksel
           eksikti ve ölçümde her seferinde eşiğin altında görünüyordu. */
        className="relative w-11 h-11 grid place-items-center text-slate-500 hover:text-[#0F172A] bg-slate-50 hover:bg-slate-100 rounded-full transition-colors active:scale-95 border border-slate-100 focus-visible:ring-offset-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>

        {/* =================================================================
            ROZET ÜÇ HANEDE TAŞIYORDU — ÖLÇÜMLE BULUNDU.
            =================================================================
            Dış kap SABİT 16x16 idi (`h-4 w-4`) ama içteki sayı içeriğe göre
            büyüyor. Sayaç iki haneyi geçince metin kabı taşıp kesiliyordu.

            Canlıda 229 okunmamış bildirimle yakalandı: üç ayrı mobil testi
            ("MOBİLDE ... kesik metin yok") aynı anda düştü ve kesilen metin
            üçünde de "229" idi. Sayaç 99'un altında kaldığı sürece hata
            görünmüyordu — bu yüzden aylarca fark edilmemiş.

            İki düzeltme birlikte:
              1. Değer 99 üstünde "99+" diye gösteriliyor. Rozetin işi tam
                 sayıyı vermek değil, "bakılacak bir şey var" demek; 229 ile
                 99+ arasındaki fark kullanıcı için bir davranış değişikliği
                 yaratmıyor.
              2. Dış kap içeriğe göre büyüyor. Yalnızca kısaltma yapmak
                 yetmezdi: dar bir kap 99+ ile de taşabilirdi.

            ⚠ TAM SAYI KAYBOLMUYOR: `aria-label` (yukarıda) gerçek değeri
            yazıyor, yani ekran okuyucu kullanıcısı "229 okunmamış" duyuyor.
            Kısaltma görsel bir karar; bilgiyi eksiltmiyor.
            ================================================================= */}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 inline-flex">
            <span className="animate-ping absolute inset-0 rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-[18px] min-w-[18px] px-1 bg-rose-600 etiket text-white items-center justify-center shadow-sm tabular-nums">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* DROPDOWN PANELİ */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white border border-slate-200/80 rounded-[24px] shadow-[0_20px_50px_rgba(15,23,42,0.08)] z-50 overflow-hidden animate-fadeIn">
          
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="baslik-kart text-slate-900">Bildirimler</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-rose-100 text-rose-700 etiket rounded-full">
                  {unreadCount} Yeni
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-yardimci font-bold text-indigo-600 hover:text-indigo-800 transition-colors focus:outline-none"
              >
                Tümünü Okundu İşaretle
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
            {loading ? (
              <div className="p-8 text-center text-xs font-medium text-slate-500">
                Bildirim havuzu kontrol ediliyor...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center justify-center space-y-2">
                <div className="p-3 bg-slate-50 text-slate-500 rounded-full">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <p className="text-xs font-bold text-slate-700">Güncel bildiriminiz bulunmuyor</p>
                <p className="text-yardimci text-slate-500 leading-relaxed max-w-[200px]">Aracınızın sigorta, kasko ve muayene periyotları yaklaştığında burada listelenir.</p>
              </div>
            ) : (
              notifications.map((item) => {
                const styles = getTypeStyles(item.type);
                return (
                  <div
                    key={item.id}
                    {...tiklanabilir(() => handleNotificationClick(item))}
                    className={`p-4 transition-all flex items-start gap-3 relative cursor-pointer group ${
                      item.is_read 
                        ? 'bg-white opacity-60 hover:opacity-100 hover:bg-slate-50/50' 
                        : 'bg-indigo-50/30 hover:bg-indigo-50/50'
                    }`}
                  >
                    {!item.is_read && (
                      <span className={`absolute left-0 top-0 bottom-0 w-1 ${item.type === 'danger' ? 'bg-rose-500' : item.type === 'warning' ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                    )}

                    <div className={`p-1.5 rounded-lg border ${styles.bg} ${styles.text} shrink-0 mt-0.5`}>
                      <span className={`block w-1.5 h-1.5 rounded-full ${styles.dot}`} />
                    </div>

                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-2">
                        <p className={`metin-govde truncate ${item.is_read ? 'text-slate-500' : 'font-semibold text-slate-900'}`}>
                          {item.title}
                        </p>
                        <span className="etiket text-slate-500 shrink-0 font-mono">
                          {new Date(item.created_at).toLocaleDateString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className={`text-yardimci leading-relaxed ${item.is_read ? 'text-slate-500 font-normal' : 'text-slate-600 font-semibold'}`}>
                        {item.message}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(item.id);
                      }}
                      title="Bildirimi Sil"
                      aria-label="Bildirimi sil"
                      className="opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 focus-visible:opacity-100 text-slate-500 hover:text-rose-600 p-2.5 rounded-md hover:bg-rose-50 transition-all shrink-0 self-center"
                    >
                      <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>

                  </div>
                );
              })
            )}
          </div>

        </div>
      )}
    </div>
  );
}