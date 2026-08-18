// =========================================================================
// ARAÇ DEVRET DİYALOĞU — SATICI TARAFI
//
// İki sekme, çünkü devir iki yönden başlayabiliyor:
//
//   DEVRET   — satıcı başlatır: rıza onayı → kod → alıcıya iletir
//   TALEPLER — alıcı başlatmıştır: satıcı onaylar ya da reddeder
//
// -------------------------------------------------------------------------
// NİYE KOD EKRANI "TEK KULLANIMLIK GÖSTERİM" DEĞİL
// -------------------------------------------------------------------------
// Faz 1'de kod yalnızca fonksiyonun dönüşünde geliyordu; satıcı sayfayı
// kapatırsa bir daha göremiyordu. Bu diyalog açıldığında `devirDurumu` ile
// bekleyen kodu OKUYOR — yani satıcı kodu istediği zaman yeniden görebiliyor,
// kalan süreyi takip edebiliyor ve iptal edebiliyor.
//
// -------------------------------------------------------------------------
// RIZA METNİ TAM GÖRÜNÜYOR
// -------------------------------------------------------------------------
// Onay kutusunun yanında "şartları kabul ediyorum" yazıp metni gizlemek,
// devrin hukuki dayanağını zayıflatır. Metin olduğu gibi ekranda ve
// veritabanına AYNEN yazılıyor.
// =========================================================================

'use client';

import React, { useEffect, useState } from 'react';
import useModalErisim from '../../hooks/useModalErisim';
import Icon from '../common/icons';
import { useToast } from '../../context/ToastContext';
import { plakaBicimle } from '../../utils/plaka';
import {
  RIZA_METNI,
  devirDurumu,
  devirKoduUret,
  devirKoduIptal,
  devirIstekKarari,
} from '../../services/devirService';

/** Saniyeyi "1 gün 3 saat" gibi okunur süreye çevirir. */
function kalanSureMetni(saniye) {
  if (!saniye || saniye <= 0) return 'süresi doldu';
  const gun = Math.floor(saniye / 86400);
  const saat = Math.floor((saniye % 86400) / 3600);
  const dakika = Math.floor((saniye % 3600) / 60);
  if (gun > 0) return `${gun} gün ${saat} saat`;
  if (saat > 0) return `${saat} saat ${dakika} dakika`;
  return `${dakika} dakika`;
}

// DİKKAT — `isOpen` PROP'U YOK, BİLEREK.
//
// Diyalog kapalıyken hiç render edilmiyor; ebeveyn `{devirModalOpen && <... />}`
// ile koşullu basıyor (projedeki MaintenanceDialog kalıbı). Sebep: `isOpen`
// prop'uyla mount kalıcı olurdu ve her açılışta `useEffect` içinden senkron
// `setState` çağırmak gerekirdi — React o kalıbı haklı olarak uyarıyor
// (zincirleme render). Koşullu mount ile başlangıç durumu doğal olarak doğru
// ve veri her açılışta taze geliyor.
export default function AracDevretDialog({ vehicle, onClose, onSuccess }) {
  const toast = useToast();

  const [sekme, setSekme] = useState('devret');   // 'devret' | 'talepler'
  const [yukleniyor, setYukleniyor] = useState(true);
  const [islemde, setIslemde] = useState(false);
  const [onayVerildi, setOnayVerildi] = useState(false);
  const [gonderildi, setGonderildi] = useState(false);   // submitAttempted kalıbı
  const [hata, setHata] = useState('');
  const [kod, setKod] = useState(null);
  const [talepler, setTalepler] = useState([]);
  const [kopyalandi, setKopyalandi] = useState(false);

  const plaka = vehicle?.plate_number || vehicle?.plate || '';

  // VERİ ÇEKME EFFECT İÇİNDE SATIR İÇİ, `useCallback` İÇİNDE DEĞİL.
  //
  // İlk yazımda `durumuYukle` adında bir useCallback vardı ve effect onu
  // çağırıyordu; linter bunu "effect içinde senkron setState" diye işaretledi.
  // Haklıydı: callback sınırının arkasındaki await'i göremiyor. `useSicil`
  // hook'unda işe yarayan kalıp bu — iş effect'in içinde, yenileme ayrı bir
  // sayaçla tetikleniyor.
  const [tetik, setTetik] = useState(0);
  const yenile = () => setTetik((n) => n + 1);

  useEffect(() => {
    if (!plaka) return;

    // Bileşen sökülürse geç gelen yanıt state'e yazmasın.
    let iptal = false;

    (async () => {
      const sonuc = await devirDurumu(plaka);
      if (iptal) return;

      if (!sonuc.basarili) {
        setHata(sonuc.hata);
        setKod(null);
        setTalepler([]);
      } else {
        setKod(sonuc.veri?.kod || null);
        setTalepler(sonuc.veri?.talepler || []);
        // Bekleyen talep varsa doğrudan o sekmeyi aç: satıcının bakması
        // gereken şey o, kod üretmek değil.
        if ((sonuc.veri?.talepler || []).length > 0) setSekme('talepler');
      }
      setYukleniyor(false);
    })();

    return () => { iptal = true; };
  }, [plaka, tetik]);

  // Esc, odak tuzagi, odagin iadesi ve kaydirma kilidi.
  // ⚠ `acik` asagidaki erken cikisla AYNI kosul: kapaliyken kanca
  // etkinlesirse modal gorunmedigi halde sayfa kaydirmasi kilitlenir.
  const panelRef = useModalErisim(onClose, { acik: !!vehicle });

  if (!vehicle) return null;

  const kodUret = async () => {
    setGonderildi(true);
    if (!onayVerildi) return;          // hata alanın altında gösteriliyor

    setIslemde(true);
    setHata('');
    const sonuc = await devirKoduUret(plaka);
    setIslemde(false);

    if (!sonuc.basarili) {
      setHata(sonuc.hata);
      return;
    }
    yenile();
    toast.basari('Devir kodu oluşturuldu. Alıcıya iletebilirsiniz.');
  };

  const kodIptal = async () => {
    setIslemde(true);
    setHata('');
    const sonuc = await devirKoduIptal(plaka);
    setIslemde(false);
    if (!sonuc.basarili) { setHata(sonuc.hata); return; }
    setOnayVerildi(false);
    setGonderildi(false);
    yenile();
    toast.bilgi('Devir kodu iptal edildi.');
  };

  const kodKopyala = async () => {
    try {
      await navigator.clipboard.writeText(kod.kod);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 2000);
    } catch {
      // Pano izni yoksa sessiz kalmıyoruz: kullanıcı kodu elle seçebilir.
      toast.bilgi('Kopyalanamadı. Kodu elle seçip kopyalayabilirsiniz.');
    }
  };

  const kodPaylas = async () => {
    const metin =
      `OTO.CV araç devir kodu: ${kod.kod}\n\n` +
      `${vehicle.brand || ''} ${vehicle.model || ''} aracının dijital sicilini ` +
      `devralmak için bu kodu OTO.CV'de girin. Kod ${kalanSureMetni(kod.kalan_saniye)} geçerli.`;
    // Web Share API mobilde WhatsApp/SMS'i açıyor; masaüstünde çoğu tarayıcıda
    // yok, o yüzden panoya düşülüyor.
    if (navigator.share) {
      try { await navigator.share({ title: 'OTO.CV devir kodu', text: metin }); return; }
      catch { /* kullanıcı vazgeçti; panoya düşülüyor */ }
    }
    try {
      await navigator.clipboard.writeText(metin);
      toast.basari('Devir mesajı kopyalandı.');
    } catch {
      toast.bilgi('Paylaşım desteklenmiyor. Kodu elle iletebilirsiniz.');
    }
  };

  const talepKarari = async (istekId, onay) => {
    setIslemde(true);
    setHata('');
    const sonuc = await devirIstekKarari(istekId, onay);
    setIslemde(false);

    if (!sonuc.basarili) { setHata(sonuc.hata); return; }

    if (onay) {
      toast.basari('Araç devredildi. Artık garajınızda görünmeyecek.');
      onSuccess?.();
      onClose();
      return;
    }
    toast.bilgi('Talep reddedildi.');
    yenile();
  };

  const sekmeSinifi = (ad) =>
    `flex-1 text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer ${
      sekme === ad ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
    }`;

  return (
    <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Araç devret penceresi"
    >
      <div className="bg-white border border-gray-100 rounded-lg w-full max-w-[560px] shadow-2xl overflow-hidden animate-scaleIn flex flex-col max-h-[90vh]">

        {/* ÜST BAR */}
        <div className="px-6 py-4 flex justify-between items-center shrink-0 border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Icon name="arac" size="lg" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-base tracking-tight text-slate-900 truncate">
                Aracı Devret
              </h3>
              {/* Burada ROZET DEĞİL biçimli metin var: bu bir cümle içi
                  alt başlık ve tek satırda kesiliyor (`truncate`). Rozet
                  satırı iki katına çıkarırdı. Plaka yine de biçimleniyor —
                  önceden ham basılıyordu ('41IHH434'). */}
              <p className="text-yardimci text-slate-500 font-medium truncate">
                {[vehicle.brand, vehicle.model].filter(Boolean).join(' ')} · {plakaBicimle(plaka)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Pencereyi kapat"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors cursor-pointer shrink-0"
          >
            <Icon name="kapat" size="lg" strokeWidth={2.5} />
          </button>
        </div>

        {/* SEKMELER */}
        <div className="px-6 pt-4 shrink-0">
          <div className="bg-slate-100 p-1 rounded-md flex gap-1">
            <button type="button" onClick={() => setSekme('devret')} className={sekmeSinifi('devret')}>
              Devir Kodu
            </button>
            <button type="button" onClick={() => setSekme('talepler')} className={sekmeSinifi('talepler')}>
              Gelen Talepler{talepler.length > 0 ? ` (${talepler.length})` : ''}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {hata && (
            <div role="alert" className="bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-bold rounded-md p-3 flex items-start gap-2">
              <Icon name="uyari" size="sm" className="shrink-0 mt-0.5" />
              <span>{hata}</span>
            </div>
          )}

          {yukleniyor ? (
            <div className="py-10 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
              <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              Devir durumu okunuyor...
            </div>
          ) : sekme === 'devret' ? (
            kod ? (
              /* ---- KOD VAR: göster, paylaş, iptal ---- */
              <div className="space-y-4">
                <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-lg p-5 text-center space-y-3">
                  <p className="text-yardimci font-bold uppercase tracking-wider text-emerald-800">
                    Devir Kodu
                  </p>
                  <p className="text-2xl sm:text-3xl font-semibold font-mono tracking-widest text-slate-900 select-all break-all">
                    {kod.kod}
                  </p>
                  <p className="flex items-center justify-center gap-1.5 text-yardimci font-semibold text-emerald-700">
                    <Icon name="takvim" size="xs" />
                    {kalanSureMetni(kod.kalan_saniye)} geçerli
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={kodKopyala}
                    className="bg-white border border-gray-200 hover:bg-slate-50 text-slate-800 font-bold text-xs py-3 rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Icon name={kopyalandi ? 'onay' : 'pinKod'} size="sm" />
                    {kopyalandi ? 'Kopyalandı' : 'Kodu Kopyala'}
                  </button>
                  <button
                    type="button"
                    onClick={kodPaylas}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Icon name="indir" size="sm" />
                    Alıcıya Gönder
                  </button>
                </div>

                <div className="bg-slate-50/80 border border-slate-200 rounded-md p-3.5 space-y-1.5">
                  <p className="text-yardimci font-bold text-slate-700">Alıcı ne yapacak?</p>
                  <p className="text-yardimci text-slate-600 leading-relaxed">
                    OTO.CV&apos;de <strong>Araç Devir</strong> sayfasında bu aracın plakasını yazıp
                    &quot;Devir kodum var&quot; seçeneğinden bu kodu girmesi yeterli. Kodu girdiğinde
                    devralacağı sicili önce görecek, sonra onaylayacak.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={kodIptal}
                  disabled={islemde}
                  className="w-full text-rose-600 hover:bg-rose-50 font-bold text-xs py-3 rounded-md transition-colors cursor-pointer disabled:opacity-60"
                >
                  Kodu iptal et
                </button>
              </div>
            ) : (
              /* ---- KOD YOK: rıza + üret ---- */
              <div className="space-y-4">
                <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon name="kalkan" size="sm" className="text-slate-500" />
                    <p className="text-yardimci font-semibold uppercase tracking-wider text-slate-700">
                      Devirde ne aktarılıyor
                    </p>
                  </div>
                  {/* Rıza metni TAM görünüyor: gizlemek devrin dayanağını zayıflatır. */}
                  <p className="text-yardimci text-slate-600 leading-relaxed">{RIZA_METNI}</p>
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={onayVerildi}
                    onChange={(e) => { setOnayVerildi(e.target.checked); setHata(''); }}
                    className="mt-0.5 w-4 h-4 accent-indigo-600 shrink-0 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-800 leading-relaxed">
                    Yukarıdaki maddeleri okudum ve aracın sicilini devretmeyi onaylıyorum.
                  </span>
                </label>
                {gonderildi && !onayVerildi && (
                  <p className="text-yardimci font-bold text-rose-600 -mt-2">
                    Devam etmek için onay kutusunu işaretlemeniz gerekiyor.
                  </p>
                )}

                <button
                  type="button"
                  onClick={kodUret}
                  disabled={islemde}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-xs py-3.5 rounded-md transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {islemde ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Oluşturuluyor...
                    </>
                  ) : 'Devir Kodu Oluştur'}
                </button>
              </div>
            )
          ) : (
            /* ---- GELEN TALEPLER ---- */
            <div className="space-y-3">
              {talepler.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <p className="text-xs font-bold text-slate-700">Bekleyen talep yok</p>
                  <p className="text-yardimci text-slate-500 leading-relaxed max-w-xs mx-auto">
                    Aracı satın alan kişi OTO.CV&apos;den devir talebi gönderirse burada görünür.
                    Ya da yukarıdaki sekmeden kod üretip doğrudan iletebilirsiniz.
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-md p-3 flex items-start gap-2">
                    <Icon name="uyari" size="sm" className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-yardimci text-slate-700 leading-relaxed">
                      <strong>Tanımadığınız birini onaylamayın.</strong> Onaylamadığınız sürece
                      araç sizde kalır. Onayladığınızda sicil ve belgeler karşı tarafa geçer ve
                      bu işlem geri alınamaz.
                    </p>
                  </div>

                  {talepler.map((t) => (
                    <div key={t.id} className="border border-slate-200 rounded-md p-4 space-y-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {t.isteyen || 'İsim belirtilmemiş'}
                        </p>
                        <span className="text-etiket font-semibold text-slate-500 shrink-0 tabular-nums">
                          {new Date(t.olustu).toLocaleDateString('tr-TR', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {t.mesaj && (
                        <p className="text-yardimci text-slate-600 leading-relaxed bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
                          {t.mesaj}
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => talepKarari(t.id, false)}
                          disabled={islemde}
                          className="bg-white border border-gray-200 hover:bg-slate-50 text-slate-700 font-bold text-xs py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
                        >
                          <Icon name="kapat" size="sm" />
                          Reddet
                        </button>
                        <button
                          type="button"
                          onClick={() => talepKarari(t.id, true)}
                          disabled={islemde}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
                        >
                          <Icon name="onay" size="sm" strokeWidth={2.5} />
                          Onayla ve Devret
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
