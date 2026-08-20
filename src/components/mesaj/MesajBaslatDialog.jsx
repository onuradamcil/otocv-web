// =========================================================================
// MESAJ BAŞLATMA DİYALOĞU
//
// -------------------------------------------------------------------------
// KALDIRILAN TELEFONUN YERİNE GELEN KANAL
// -------------------------------------------------------------------------
// Araç detayında "Cep Telefonunu Göster" düğmesi vardı ve arkasındaki
// numara uydurmaydı. Kaldırıldı; ama kaldırılınca araç sahibine ulaşmanın
// hiçbir yolu kalmamıştı. Bu diyalog o boşluğu dolduruyor.
//
// Telefon geri getirilmedi çünkü numara sahibin kontrol edemediği kalıcı
// bir kanal: verildikten sonra geri alınamıyor, engellenemiyor, kayıt
// altına alınamıyor. Mesajlaşmada üçü de var.
//
// -------------------------------------------------------------------------
// NİYE MODAL
// -------------------------------------------------------------------------
// Projedeki kural: modal = tek karar, kısa, geri dönülür. İlk mesaj tek
// alanlı ve kullanıcı aracın sayfasından ayrılmak istemiyor — bağlam
// arkasında dursun diye modal.
// =========================================================================

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../common/icons';
import { dugme } from '../common/dugme';

// ⚠ ALT SINIR YOK.
// Eskiden 10 karakter isteniyordu. Gerekçesi "anlamsız mesaj gelmesin"di ama
// ilk mesaj çoğu zaman kısa ve meşru oluyor: "Merhaba", "Aracı görebilir
// miyim?". Sunucu zaten boş gövdeyi reddediyor (`govde_gecersiz`), yani
// sınırı kaldırmak hiçbir kapı açmıyor — sadece meşru kullanıcıyı
// engellemeyi bırakıyor.

export default function MesajBaslatDialog({ arac, onKapat, onGonder }) {
  const [govde, setGovde] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    const oncekiOdak = document.activeElement;
    const tusaBasildi = (e) => { if (e.key === 'Escape' && !gonderiliyor) onKapat(); };
    document.addEventListener('keydown', tusaBasildi);
    const oncekiOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => panelRef.current?.querySelector('textarea')?.focus(), 50);

    return () => {
      document.removeEventListener('keydown', tusaBasildi);
      document.body.style.overflow = oncekiOverflow;
      clearTimeout(t);
      if (oncekiOdak instanceof HTMLElement && oncekiOdak.isConnected) oncekiOdak.focus();
    };
  }, [onKapat, gonderiliyor]);

  if (typeof document === 'undefined') return null;

  const yeterli = govde.trim().length > 0;

  async function gonder() {
    if (!yeterli || gonderiliyor) return;
    setGonderiliyor(true);
    await onGonder(govde.trim());
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
        aria-labelledby="mesaj-baslik"
        className="relative w-full sm:max-w-lg bg-white rounded-t-lg sm:rounded-lg shadow-2xl border border-slate-200 flex flex-col max-h-[88vh]"
      >
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-start gap-3 shrink-0">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 grid place-items-center shrink-0">
            <Icon name="zil" size="lg" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="mesaj-baslik" className="baslik-bolum text-slate-900">Araç sahibine mesaj</h2>
            <p className="metin-yardimci text-slate-500 mt-0.5 leading-relaxed truncate">
              {arac?.year} {arac?.brand} {arac?.model}
              <span className="font-mono text-indigo-600 ml-1.5">{arac?.pin_code}</span>
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

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <label className="block">
            <span className="etiket text-slate-500">Mesajınız</span>
            <textarea
              value={govde}
              onChange={(e) => setGovde(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="Aracın bakım geçmişi hakkında bilgi almak istiyorum…"
              className="mt-1.5 w-full px-3 py-2.5 rounded-md border border-slate-200 bg-slate-50 metin-govde text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors resize-none"
            />
            <span className="metin-yardimci text-slate-500 mt-1 block">
              {govde.length}/2000
            </span>
          </label>

          {/* Beklentiyi baştan doğru kurmak: kullanıcı telefon numarası
              bekliyordu, artık öyle çalışmıyor. */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-md p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-indigo-700 metin-govde">
              <Icon name="kalkan" size="sm" />
              <span>Nasıl çalışıyor</span>
            </div>
            <p className="metin-yardimci text-slate-500 leading-relaxed">
              Yazışma platform içinde kalır; telefon numaranız veya e-postanız paylaşılmaz.
              Araç sahibi sizi engelleyebilir, siz de konuşmayı şikayet edebilirsiniz.
            </p>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 shrink-0 flex flex-col sm:flex-row gap-2">
          <button type="button" onClick={onKapat} disabled={gonderiliyor} className={dugme('ikincil', { tamGenislik: true })}>
            Vazgeç
          </button>
          <button type="button" onClick={gonder} disabled={!yeterli || gonderiliyor} className={dugme('birincil', { tamGenislik: true })}>
            {gonderiliyor ? 'Gönderiliyor…' : 'Mesajı gönder'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
