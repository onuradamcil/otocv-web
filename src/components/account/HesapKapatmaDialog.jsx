// =========================================================================
// HESAP KAPATMA TALEBİ (HesapKapatmaDialog.jsx)
//
// -------------------------------------------------------------------------
// NİYE İKİ ADIM
// -------------------------------------------------------------------------
// Birinci adım araçları gösteriyor. Sebebi ürünün en pahalı hatasını
// engellemek:
//
// Hesap kapandığında araç SİLİNMİYOR — sicili yaşasın diye sahipsiz havuza
// düşüyor (`vehicles_sahipsizlik_izle`). Ama sahipsiz araç, onu satın almış
// olan kişi için sorun: sicili geri yüklemek için ücret ödemesi ve bekleme
// süresine katlanması gerekiyor. Oysa kullanıcı hesabını kapatmadan ÖNCE
// aracı devretse, alıcı hiçbir bedel ödemeden sicile kavuşuyor.
//
// Yani bu ekran bir uyarı değil, sahipsiz araç oluşmasını engelleyen ASIL
// önlem. Araç listesi sayı olarak değil PLAKA PLAKA gösteriliyor: "3 aracınız
// var" cümlesi kullanıcıya hangi araçları unuttuğunu söylemiyor.
//
// -------------------------------------------------------------------------
// NİYE DÜĞME DEĞİL TALEP
// -------------------------------------------------------------------------
// Kapatma geri alınamıyor ve canlı veritabanının yedeği yok. Talep ile
// uygulama arasındaki süre hem kullanıcıya hem bize gerçek bir geri dönüş
// penceresi bırakıyor. Talep `hesap_kapatma_talepleri` tablosuna RPC ile
// yazılıyor; istemci o tabloya yazamıyor.
// =========================================================================

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Icon from '../common/icons';

export default function HesapKapatmaDialog({ araclar = [], onKapat, onTalepEt, gonderiliyor }) {
  const [adim, setAdim] = useState(araclar.length > 0 ? 'araclar' : 'onay');
  const [onayMetni, setOnayMetni] = useState('');
  const [notMetni, setNotMetni] = useState('');
  const panelRef = useRef(null);

  useEffect(() => {
    const oncekiOdak = document.activeElement;
    const tusaBasildi = (e) => {
      if (e.key === 'Escape' && !gonderiliyor) onKapat();
    };
    document.addEventListener('keydown', tusaBasildi);
    const oncekiOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => panelRef.current?.querySelector('button, input')?.focus(), 50);

    return () => {
      document.removeEventListener('keydown', tusaBasildi);
      document.body.style.overflow = oncekiOverflow;
      clearTimeout(t);
      if (oncekiOdak instanceof HTMLElement && oncekiOdak.isConnected) oncekiOdak.focus();
    };
  }, [onKapat, gonderiliyor]);

  // Yazarak onay. Onay kutusu yerine bilerek: kutu refleksle işaretleniyor,
  // kelimeyi yazmak kullanıcıyı bir an durduruyor. Geri alınamayan işlemlerde
  // sektör standardı bu.
  //
  // ⚠ KELİMEDE 'i' HARFİ YOK VE BU BİLİNÇLİ.
  // İlk hâli "HESABIMI KAPAT" idi ve test yakaladı: Türkçe locale'de küçük
  // 'i' harfinin büyüğü 'I' değil 'İ'. Kullanıcı küçük harfle "hesabimi"
  // yazdığında `toLocaleUpperCase('tr-TR')` bunu "HESABİMİ" yapıyor ve
  // "HESABIMI" ile eşleşmiyordu. Yani klavyesinde noktasız ı'ya basmayan
  // hiç kimse hesabını kapatamıyordu.
  //
  // Karşılaştırmayı gevşetmek yerine kelime değiştirildi: "HESAP KAPAT"
  // içinde i/ı/I/İ geçmiyor, dolayısıyla hangi locale ile büyütülürse
  // büyütülsün aynı sonucu veriyor.
  const ONAY_KELIMESI = 'HESAP KAPAT';
  const onayVerildi = onayMetni.trim().toLocaleUpperCase('tr-TR') === ONAY_KELIMESI;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !gonderiliyor && onKapat()} aria-hidden="true" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kapatma-baslik"
        className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[88vh]"
      >
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-start gap-3 shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 grid place-items-center shrink-0">
            <Icon name="uyari" size="lg" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="kapatma-baslik" className="text-sm font-semibold text-slate-900 tracking-tight">
              {adim === 'araclar' ? 'Önce araçlarınıza bakalım' : 'Hesap kapatma talebi'}
            </h2>
            <p className="text-yardimci text-slate-500 font-semibold mt-0.5 leading-relaxed">
              {adim === 'araclar'
                ? 'Bu adım atlanabilir ama atlamanız aracınızı alan kişiye para ve zaman kaybettirir.'
                : 'Talebiniz kaydedilecek; kapatma elle uygulanacak.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onKapat}
            disabled={gonderiliyor}
            aria-label="Kapat"
            className="w-9 h-9 -mt-1 -mr-1 grid place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Icon name="kapat" size="md" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {adim === 'araclar' ? (
            <>
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 space-y-2">
                <p className="text-xs font-semibold text-amber-900">Araçlarınızın sicili silinmiyor</p>
                <p className="text-yardimci text-amber-900/80 font-semibold leading-relaxed">
                  Hesabınız kapansa bile bakım geçmişi ve belgeler araç kaydıyla birlikte
                  kalıyor. Ancak araç <strong>sahipsiz havuza</strong> düşüyor: aracı sizden
                  alan kişi sicile ulaşmak için ücret ödemek ve bekleme süresine katlanmak
                  zorunda kalıyor.
                </p>
                <p className="text-yardimci text-amber-900/80 font-semibold leading-relaxed">
                  Kapatmadan <strong>önce devrederseniz</strong> alıcı hiçbir bedel ödemeden
                  sicile kavuşuyor.
                </p>
              </div>

              <div>
                <p className="text-etiket font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Üzerinizdeki araçlar ({araclar.length})
                </p>
                <ul className="space-y-1.5">
                  {araclar.map((a) => (
                    <li key={a.plate_number} className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 bg-slate-50/60">
                      <span className="inline-flex items-center border-[1.5px] border-slate-800 rounded-md bg-white font-mono font-semibold h-6 overflow-hidden shrink-0">
                        <span className="bg-[#003399] text-white text-[8px] font-sans font-bold px-1 h-full flex items-center">TR</span>
                        <span className="px-2 text-slate-900 text-yardimci tracking-wider uppercase h-full flex items-center whitespace-nowrap">
                          {(a.plate_number || '').replace(/\s+/g, '').replace(/^(\d{2})([A-Z]{1,3})(\d{2,4})$/, '$1 $2 $3')}
                        </span>
                      </span>
                      <span className="text-xs font-bold text-slate-700 truncate">{a.brand} {a.model}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href="/devir"
                className="flex items-center justify-center gap-2 w-full min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-colors"
              >
                <Icon name="anahtar" size="sm" />
                Önce araçlarımı devredeyim
              </Link>
            </>
          ) : (
            <>
              <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-4 space-y-2">
                <p className="text-xs font-semibold text-rose-900">Bu işlem geri alınamıyor</p>
                <ul className="text-yardimci text-rose-900/80 font-semibold leading-relaxed space-y-1 list-disc pl-4">
                  <li>Profiliniz, vitrin kartlarınız ve bildirimleriniz silinecek.</li>
                  <li>Araç kayıtları ve bakım geçmişi silinmeyecek; sahipsiz havuza geçecek.</li>
                  <li>Aynı e-posta ile yeniden kayıt olabilirsiniz, ancak eski hesabınız geri gelmez.</li>
                </ul>
              </div>

              <label className="block">
                <span className="text-etiket font-semibold text-slate-400 uppercase tracking-wider">
                  Sebebiniz (isteğe bağlı)
                </span>
                <textarea
                  value={notMetni}
                  onChange={(e) => setNotMetni(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Ürünü geliştirmemize yardımcı olur."
                  className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-colors resize-none"
                />
              </label>

              <label className="block">
                <span className="text-etiket font-semibold text-slate-400 uppercase tracking-wider">
                  Onaylamak için <span className="text-slate-700 font-mono">{ONAY_KELIMESI}</span> yazın
                </span>
                <input
                  type="text"
                  value={onayMetni}
                  onChange={(e) => setOnayMetni(e.target.value)}
                  aria-label="Onay metni"
                  autoComplete="off"
                  className="mt-1.5 w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 tracking-wide focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-colors"
                />
              </label>
            </>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 shrink-0 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={onKapat}
            disabled={gonderiliyor}
            className="flex-1 min-h-[44px] bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            Vazgeç
          </button>

          {adim === 'araclar' ? (
            <button
              type="button"
              onClick={() => setAdim('onay')}
              className="flex-1 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Yine de devam et
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onTalepEt(notMetni)}
              disabled={!onayVerildi || gonderiliyor}
              className="flex-1 min-h-[44px] bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {gonderiliyor ? 'Gönderiliyor…' : 'Kapatma talebi gönder'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
