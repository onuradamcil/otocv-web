// =========================================================================
// GELEN DEVİR TALEPLERİ (araç sahibi tarafı)
//
// -------------------------------------------------------------------------
// NİYE VAR — TALEBİ GÖRMEK İÇİN ARAÇLARI TEK TEK AÇMAK GEREKİYORDU
// -------------------------------------------------------------------------
// Devir sayfasında araç sahibine gelen talepleri gösteren hiçbir bölüm
// yoktu. Talepler yalnızca `AracDevretDialog`'un "Gelen Talepler"
// sekmesinde ve PLAKA BAZINDA görünüyordu: sahibin hangi aracına talep
// geldiğini öğrenmesi için araçlarını tek tek açması gerekiyordu.
//
// Devralan tarafın simetriği (`BekleyenDevirlerim`) yazılmıştı, araç sahibi
// tarafı yazılmamıştı. Veri kaynağı ise hazır ve yetkilendirilmiş hâlde
// duruyordu ama hiç çağrılmıyordu: `devirGelenTalepler()`.
//
// -------------------------------------------------------------------------
// ONAYIN AĞIRLIĞI EKRANDA
// -------------------------------------------------------------------------
// Onay geri alınamıyor ve sicili karşı tarafa geçiriyor. Bu yüzden uyarı
// listenin üstünde duruyor ve onay düğmesi tek tıkla değil; kart açıkken
// hangi araç olduğu, kimin istediği ve ne zaman istendiği görünüyor.
// =========================================================================

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Icon from '../common/icons';
import { dugme } from '../common/dugme';
import { useToast } from '../../context/ToastContext';
import { devirGelenTalepler, devirIstekKarari } from '../../services/devirService';
import useCanliTazeleme from '../../hooks/useCanliTazeleme';
import { aracKapakGorseli } from '../../utils/aracGorseli';
import AracGorseli from '../common/AracGorseli';

function tarihBicimi(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function GelenDevirTalepleri({ kart, onDegisti }) {
  const toast = useToast();
  const [durum, setDurum] = useState('yukleniyor'); // yukleniyor | hazir | hata
  const [liste, setListe] = useState([]);
  const [islemde, setIslemde] = useState(null); // istek_id

  const yukle = useCallback(async (iskeletGoster = true) => {
    if (iskeletGoster) setDurum('yukleniyor');
    // ⚠ try/catch ŞART: reddedilen promise hata sınırına ulaşmıyor ve ekran
    // sonsuza kadar iskelette kalıyor.
    try {
      const r = await devirGelenTalepler();
      if (!r.basarili) { setDurum('hata'); return; }
      setListe(Array.isArray(r.veri) ? r.veri : []);
      setDurum('hazir');
    } catch {
      setDurum('hata');
    }
  }, []);

  useEffect(() => { yukle(false); }, [yukle]);

  // CANLI: devralan kodu kullandığı anda talep burada beliriyor. Araç
  // sahibinin sayfayı yenilemesi gerekmiyor.
  useCanliTazeleme(['devir', 'warning', 'success'], () => yukle(false));

  async function karar(istekId, onay) {
    setIslemde(istekId);
    const r = await devirIstekKarari(istekId, onay);
    setIslemde(null);

    if (!r.basarili) { toast.hata(r.hata); yukle(false); return; }

    toast.basari(onay
      ? 'Devir onaylandı. Devralan ücreti ödediğinde araç ona geçecek.'
      : 'Talep reddedildi.');
    onDegisti?.();
    yukle(false);
  }

  // Bekleyen talep yoksa bölüm HİÇ basılmıyor: boş bir kart, kullanıcıya
  // eksik bir şey varmış hissi veriyor.
  if (durum === 'yukleniyor' || (durum === 'hazir' && liste.length === 0)) return null;

  if (durum === 'hata') {
    return (
      <section className={kart}>
        <h2 className="baslik-bolum text-slate-900">Size gelen devir talepleri</h2>
        <p className="metin-yardimci text-slate-500">Liste yüklenemedi.</p>
        <button type="button" onClick={() => yukle(true)} className={dugme('ikincil')}>
          Tekrar dene
        </button>
      </section>
    );
  }

  const bekleyen = liste.filter((t) => t.durum === 'bekliyor');

  return (
    <section className={kart}>
      <div className="space-y-1">
        <h2 className="baslik-bolum text-slate-900">Size gelen devir talepleri</h2>
        <p className="metin-yardimci text-slate-500 leading-relaxed">
          Ürettiğiniz devir kodunu kullanan kişiler.
        </p>
      </div>

      {bekleyen.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-md p-3 flex items-start gap-2">
          <Icon name="uyari" size="sm" className="text-amber-600 shrink-0 mt-0.5" />
          <p className="metin-yardimci text-slate-700 leading-relaxed">
            <strong>Tanımadığınız birini onaylamayın.</strong> Onaylamadığınız sürece araç
            sizde kalır. Onayladığınızda sicil ve belgeler karşı tarafa geçer ve bu işlem
            geri alınamaz.
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {liste.map((t) => {
          const onaylandi = t.durum === 'onaylandi';

          return (
            <li key={t.istek_id} className="border border-slate-200 rounded-md p-4 space-y-3">
              <div className="flex items-start gap-3">
                {/* `relative` EKLENDİ: `AracGorseli` `fill` ile konumlanıyor ve
                    konumlanmış bir ata olmadan en yakın üst kutuya taşar. */}
                <span className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 grid place-items-center relative">
                  {/* ⚠ HAM ALAN BASILAMAZ: `image_url` virgülle birleştirilmiş
                      ÇOKLU adres tutabiliyor (canlıda 6 adres / 719 karakter
                      ölçüldü) ve doğrudan `src`e verilince kırık görsel
                      çıkıyor. Kapak için ilk geçerli adres alınıyor.

                      `bosMetin=""`: 48 px'lik kutuya "GÖRSEL YOK" sığmıyor,
                      görselsiz durumda boş gri kutu bırakılıyor. */}
                  <AracGorseli
                    src={aracKapakGorseli(t.image_url)}
                    alt=""
                    sizes="48px"
                    bosMetin=""
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="metin-govde text-slate-900 truncate">
                    {t.year} {t.brand} {t.model}
                  </p>
                  {/* PLAKA DEĞİL PIN: araç kimliği hep PIN ile gösteriliyor. */}
                  <p className="metin-yardimci font-mono text-indigo-600">{t.pin_code}</p>
                </div>
                <span className="metin-yardimci text-slate-500 shrink-0 tabular-nums">
                  {tarihBicimi(t.olustu)}
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-md p-3">
                <p className="metin-yardimci text-slate-500">Talep eden</p>
                {/* YALNIZCA AD: soyadı, e-posta ve telefon gösterilmiyor. */}
                <p className="metin-govde text-slate-900">{t.talep_eden}</p>
              </div>

              {onaylandi ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 flex items-start gap-2">
                  <Icon name="onay" size="sm" className="text-emerald-600 shrink-0 mt-0.5" />
                  <p className="metin-yardimci text-emerald-900 leading-relaxed">
                    Onayladınız. Devralan devir ücretini ödediğinde araç ona geçecek.
                    Ödeme yapılmazsa işlem kendiliğinden düşer ve araç sizde kalır.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => karar(t.istek_id, false)}
                    disabled={islemde === t.istek_id}
                    className={dugme('ikincil', { tamGenislik: true })}
                  >
                    <Icon name="kapat" size="sm" />
                    Reddet
                  </button>
                  <button
                    type="button"
                    onClick={() => karar(t.istek_id, true)}
                    disabled={islemde === t.istek_id}
                    className={dugme('birincil', { tamGenislik: true })}
                  >
                    <Icon name="onay" size="sm" />
                    {islemde === t.istek_id ? 'İşleniyor…' : 'Onayla ve devret'}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
