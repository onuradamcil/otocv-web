// =========================================================================
// ŞİKAYET DİYALOĞU
//
// Modal, çünkü tek karar ve geri dönülür — projedeki kural bu. Çok alanlı
// formlar sayfaya taşınıyor, onay/seçim diyalogları modal kalıyor.
//
// Sebep ZORUNLU: serbest metinle gelen şikayet incelenemiyor. Açıklama
// isteğe bağlı ama taciz iddiasında bağlamı taşıyan tek alan o.
// =========================================================================

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../common/icons';
import { dugme } from '../common/dugme';

export default function SikayetDialog({ sebepler, onKapat, onGonder }) {
  const [sebep, setSebep] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    const oncekiOdak = document.activeElement;
    const tusaBasildi = (e) => { if (e.key === 'Escape' && !gonderiliyor) onKapat(); };
    document.addEventListener('keydown', tusaBasildi);
    const oncekiOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => panelRef.current?.querySelector('input, button')?.focus(), 50);

    return () => {
      document.removeEventListener('keydown', tusaBasildi);
      document.body.style.overflow = oncekiOverflow;
      clearTimeout(t);
      if (oncekiOdak instanceof HTMLElement && oncekiOdak.isConnected) oncekiOdak.focus();
    };
  }, [onKapat, gonderiliyor]);

  if (typeof document === 'undefined') return null;

  async function gonder() {
    if (!sebep || gonderiliyor) return;
    setGonderiliyor(true);
    await onGonder(sebep, aciklama);
    setGonderiliyor(false);
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={() => !gonderiliyor && onKapat()}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sikayet-baslik"
        className="relative w-full sm:max-w-md bg-white rounded-t-lg sm:rounded-lg shadow-2xl border border-slate-200 flex flex-col max-h-[88vh]"
      >
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-start gap-3 shrink-0">
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 grid place-items-center shrink-0">
            <Icon name="uyari" size="lg" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="sikayet-baslik" className="baslik-bolum text-slate-900">Konuşmayı şikayet et</h2>
            <p className="metin-yardimci text-slate-500 mt-0.5 leading-relaxed">
              Şikayetiniz konuşma kaydıyla birlikte incelenmek üzere saklanır.
            </p>
          </div>
          <button
            type="button"
            onClick={onKapat}
            disabled={gonderiliyor}
            aria-label="Kapat"
            className="w-9 h-9 -mt-1 -mr-1 grid place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Icon name="kapat" size="md" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <fieldset className="space-y-2">
            <legend className="etiket text-slate-500">Sebep</legend>
            {sebepler.map((s) => (
              <label
                key={s.kod}
                className={`flex items-center gap-2.5 p-2.5 rounded-md border cursor-pointer transition-colors ${
                  sebep === s.kod ? 'border-indigo-300 bg-indigo-50/60' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="sikayet-sebep"
                  value={s.kod}
                  checked={sebep === s.kod}
                  onChange={() => setSebep(s.kod)}
                  className="accent-indigo-600"
                />
                <span className="metin-govde text-slate-800">{s.ad}</span>
              </label>
            ))}
          </fieldset>

          <label className="block">
            <span className="etiket text-slate-500">Açıklama (isteğe bağlı)</span>
            <textarea
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Ne olduğunu kısaca anlatın."
              className="mt-1.5 w-full px-3 py-2.5 rounded-md border border-slate-200 bg-slate-50 metin-govde text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors resize-none"
            />
          </label>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 shrink-0 flex flex-col sm:flex-row gap-2">
          <button type="button" onClick={onKapat} disabled={gonderiliyor} className={dugme('ikincil', { tamGenislik: true })}>
            Vazgeç
          </button>
          <button type="button" onClick={gonder} disabled={!sebep || gonderiliyor} className={dugme('yikici', { tamGenislik: true })}>
            {gonderiliyor ? 'Gönderiliyor…' : 'Şikayeti gönder'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
