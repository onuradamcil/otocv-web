// =========================================================================
// MESAJLAR EKRANI
//
// -------------------------------------------------------------------------
// NİYE TEK ROTA, İKİ BÖLME
// -------------------------------------------------------------------------
// Liste ve yazışma ayrı rotalar olabilirdi (`/mesajlar` + `/mesajlar/[id]`).
// Tek rota seçildi çünkü masaüstünde ikisi aynı anda duruyor ve ayrı rota
// her konuşma değişiminde tam sayfa yükleme demek olurdu.
//
// Mobilde iki bölme yan yana sığmıyor: konuşma seçilince liste gizleniyor,
// geri düğmesi listeye dönüyor. Bu, mesajlaşma uygulamalarının standart
// davranışı ve kullanıcının beklediği şey.
//
// -------------------------------------------------------------------------
// ENGELLEME NASIL GÖRÜNÜYOR
// -------------------------------------------------------------------------
// Engelleyen taraf durumu görüyor ("Bu kullanıcıyı engellediniz") ve geri
// alabiliyor. Engellenen taraf HİÇBİR ŞEY görmüyor: mesajını yazıyor,
// gönderiyor, kendi ekranında duruyor. Sebebi ürün kararı — "engellendiniz"
// demek misilleme için ikinci hesap açmayı doğrudan teşvik ediyor.
// =========================================================================

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../common/icons';
import { dugme, ikonDugmesi } from '../common/dugme';
import { useToast } from '../../context/ToastContext';
import {
  konusmalarim, mesajlariGetir, mesajGonder, okunduIsaretle,
  konusmaEngelle, konusmaSikayetEt, mesajlariDinle, SIKAYET_SEBEPLERI,
} from '../../services/mesajService';
import SikayetDialog from './SikayetDialog';
import useCanliTazeleme from '../../hooks/useCanliTazeleme';

function saatBicimi(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const bugun = new Date();
  const ayniGun = d.toDateString() === bugun.toDateString();
  return ayniGun
    ? d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export default function MesajlarEkrani() {
  const toast = useToast();
  const [liste, setListe] = useState([]);
  const [listeDurum, setListeDurum] = useState('yukleniyor');
  const [secili, setSecili] = useState(null);
  const [konusma, setKonusma] = useState(null);
  const [mesajlar, setMesajlar] = useState([]);
  const [detayDurum, setDetayDurum] = useState('bos');
  const [taslak, setTaslak] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [sikayetAcik, setSikayetAcik] = useState(false);

  const akisSonu = useRef(null);

  /**
   * @param {boolean} iskeletGoster İlk yüklemede FALSE geçiliyor.
   *   Başlangıç durumu zaten 'yukleniyor'; efektin içinde onu bir kez daha
   *   yazmak gereksiz bir render turu açıyordu (lint de bunu yakalıyor).
   *   "Tekrar dene" ve tazeleme yollarında ise iskelet gerekiyor.
   */
  const listeyiYukle = useCallback(async (iskeletGoster = true) => {
    if (iskeletGoster) setListeDurum('yukleniyor');
    // ⚠ try/catch ŞART: reddedilen promise `error.js`'e ulaşmıyor, hata
    // sınırları yalnızca render sırasında fırlatılanı yakalıyor. Bu koruma
    // olmadan ağ kesintisi sonsuz iskelet bırakıyordu.
    try {
      const { veri, hata } = await konusmalarim();
      if (hata) { setListeDurum('hata'); return; }
      setListe(veri);
      setListeDurum(veri.length === 0 ? 'bos' : 'hazir');
    } catch {
      setListeDurum('hata');
    }
  }, []);

  useEffect(() => { listeyiYukle(false); }, [listeyiYukle]);

  // CANLI: AÇIK konuşmayı `mesajlariDinle` canlandırıyor, ama başka bir
  // konuşmaya gelen mesaj listede görünmüyordu. Bildirim sinyali onu da
  // kapatıyor: okunmamış sayacı ve son mesaj önizlemesi anlık tazeleniyor.
  useCanliTazeleme(['mesaj', 'info'], () => listeyiYukle(false));

  const konusmayiAc = useCallback(async (konusmaId) => {
    setSecili(konusmaId);
    setDetayDurum('yukleniyor');
    try {
      const { basarili, veri } = await mesajlariGetir(konusmaId);
      if (!basarili) { setDetayDurum('hata'); return; }
      setKonusma(veri.konusma);
      setMesajlar(veri.mesajlar || []);
      setDetayDurum('hazir');
      await okunduIsaretle(konusmaId);
      // Rozetin ve listedeki sayacın düşmesi için listeyi tazele.
      // İskelet gösterilmiyor: liste zaten ekranda, altından çekmek kötü.
      listeyiYukle(false);
    } catch {
      setDetayDurum('hata');
    }
  }, [listeyiYukle]);

  // ANLIK TESLİM. Abonelik konuşma değişince kapanıp yenisi açılıyor;
  // kapatmayı unutmak her seçimde bir kanal daha bırakırdı.
  useEffect(() => {
    if (!secili) return undefined;
    const kapat = mesajlariDinle(secili, (yeni) => {
      setMesajlar((onceki) => {
        if (onceki.some((m) => m.id === yeni.id)) return onceki;
        return [...onceki, { id: yeni.id, benim: false, govde: yeni.govde, olustu: yeni.olustu }];
      });
      okunduIsaretle(secili);
    });
    return kapat;
  }, [secili]);

  useEffect(() => {
    akisSonu.current?.scrollIntoView({ block: 'end' });
  }, [mesajlar.length]);

  async function gonder(e) {
    e.preventDefault();
    const govde = taslak.trim();
    if (!govde || gonderiliyor || !secili) return;

    setGonderiliyor(true);
    const { basarili, hata } = await mesajGonder(secili, govde);
    setGonderiliyor(false);

    if (!basarili) { toast.hata(hata); return; }

    // İyimser ekleme: Realtime kendi gönderdiğimiz satırı da yayıyor ama
    // yazının kutudan hemen kaybolması gerekiyor.
    setMesajlar((o) => [...o, {
      id: `yerel-${o.length}-${govde.length}`, benim: true, govde, olustu: new Date().toISOString(),
    }]);
    setTaslak('');
  }

  async function engelleDegistir() {
    const kaldir = !!konusma?.engelledim;
    const { basarili, veri, hata } = await konusmaEngelle(secili, kaldir);
    if (!basarili) { toast.hata(hata); return; }
    setKonusma((k) => ({ ...k, engelledim: veri.engelli }));
    toast.basari(veri.engelli
      ? 'Kullanıcı engellendi. Size bir daha mesaj ulaşmayacak.'
      : 'Engel kaldırıldı.');
    listeyiYukle(false);
  }

  async function sikayetGonder(sebep, aciklama) {
    const { basarili, hata } = await konusmaSikayetEt(secili, sebep, aciklama);
    if (!basarili) { toast.hata(hata); return; }
    setKonusma((k) => ({ ...k, sikayet_ettim: true }));
    setSikayetAcik(false);
    toast.basari('Şikayetiniz kaydedildi ve incelenecek.');
  }

  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 py-6">
      <h1 className="baslik-sayfa text-slate-900 mb-4">Mesajlarım</h1>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs grid grid-cols-1 md:grid-cols-12 min-h-[560px]">

        {/* SOL: KONUŞMA LİSTESİ.
            Mobilde konuşma seçiliyken gizleniyor — iki bölme 390px'e sığmaz. */}
        <aside className={`md:col-span-4 md:border-r border-slate-200 ${secili ? 'hidden md:block' : 'block'}`}>
          {listeDurum === 'yukleniyor' && (
            <ul className="p-3 space-y-2">
              {[0, 1, 2].map((i) => (
                <li key={i} className="h-16 rounded-lg bg-slate-100 animate-pulse" />
              ))}
            </ul>
          )}

          {listeDurum === 'hata' && (
            <div className="p-6 text-center space-y-3">
              <p className="metin-govde text-slate-600">Konuşmalar yüklenemedi.</p>
              {/* Ok fonksiyonu şart: doğrudan bağlanınca tıklama olayı
                  `iskeletGoster` parametresine düşüyor. Kazara doğru
                  çalışıyordu (olay nesnesi truthy), ama niyeti kod
                  söylemiyordu. */}
              <button type="button" onClick={() => listeyiYukle(true)} className={dugme('ikincil')}>
                Tekrar dene
              </button>
            </div>
          )}

          {listeDurum === 'bos' && (
            <div className="p-6 text-center space-y-2">
              <Icon name="zil" size="xl" className="text-slate-300 mx-auto" />
              <p className="metin-govde font-bold text-slate-700">Henüz mesajınız yok</p>
              <p className="metin-yardimci text-slate-500 leading-relaxed">
                Bir aracın sicil sayfasından araç sahibine mesaj gönderdiğinizde
                konuşmalarınız burada listelenir.
              </p>
            </div>
          )}

          {listeDurum === 'hazir' && (
            <ul className="divide-y divide-slate-100">
              {liste.map((k) => (
                <li key={k.konusma_id}>
                  <button
                    type="button"
                    onClick={() => konusmayiAc(k.konusma_id)}
                    aria-current={secili === k.konusma_id ? 'true' : undefined}
                    className={`w-full text-left px-3 py-3 flex gap-3 items-start transition-colors cursor-pointer
                      hover:bg-slate-50 focus-visible:outline-none focus-visible:bg-slate-50
                      ${secili === k.konusma_id ? 'bg-indigo-50/70' : ''}`}
                  >
                    <span className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 grid place-items-center">
                      {k.image_url
                        ? <img src={k.image_url} alt="" className="w-full h-full object-contain" />
                        : <Icon name="arac" size="md" className="text-slate-400" />}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="metin-govde font-bold text-slate-900 truncate">
                          {k.karsi_taraf}
                        </span>
                        <span className="metin-yardimci text-slate-400 shrink-0 font-mono">
                          {saatBicimi(k.son_mesaj_at)}
                        </span>
                      </span>
                      <span className="block metin-yardimci text-slate-500 truncate">
                        {k.year} {k.brand} {k.model}
                      </span>
                      <span className="flex items-center gap-2 mt-0.5">
                        <span className="metin-yardimci text-slate-600 truncate flex-1">
                          {k.son_mesaj || '—'}
                        </span>
                        {k.okunmamis > 0 && (
                          <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-black grid place-items-center">
                            {k.okunmamis}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* SAĞ: YAZIŞMA */}
        <section className={`md:col-span-8 flex flex-col ${secili ? 'flex' : 'hidden md:flex'}`}>
          {!secili && (
            <div className="flex-1 grid place-items-center p-8 text-center">
              <p className="metin-govde text-slate-500">
                Görüntülemek için soldan bir konuşma seçin.
              </p>
            </div>
          )}

          {secili && detayDurum === 'yukleniyor' && (
            <div className="flex-1 p-4 space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-lg bg-slate-100 animate-pulse" />)}
            </div>
          )}

          {secili && detayDurum === 'hata' && (
            <div className="flex-1 grid place-items-center p-8 text-center space-y-3">
              <div className="space-y-3">
                <p className="metin-govde text-slate-600">Konuşma yüklenemedi.</p>
                <button type="button" onClick={() => konusmayiAc(secili)} className={dugme('ikincil')}>
                  Tekrar dene
                </button>
              </div>
            </div>
          )}

          {secili && detayDurum === 'hazir' && konusma && (
            <>
              <header className="px-3 py-2.5 border-b border-slate-200 flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => { setSecili(null); setKonusma(null); setMesajlar([]); setDetayDurum('bos'); }}
                  aria-label="Konuşma listesine dön"
                  className={`${ikonDugmesi('sessiz')} md:hidden`}
                >
                  <Icon name="geri" size="md" />
                </button>

                <div className="min-w-0 flex-1">
                  <p className="metin-govde font-black text-slate-900 truncate">{konusma.karsi_taraf}</p>
                  <p className="metin-yardimci text-slate-500 truncate">
                    {konusma.year} {konusma.brand} {konusma.model}
                    <span className="font-mono text-indigo-600 ml-1.5">{konusma.pin_code}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={engelleDegistir}
                  className={dugme('ikincil', {
                    ek: konusma.engelledim ? 'text-rose-700 border-rose-200 hover:bg-rose-50' : '',
                  })}
                >
                  {konusma.engelledim ? 'Engeli kaldır' : 'Engelle'}
                </button>

                <button
                  type="button"
                  onClick={() => setSikayetAcik(true)}
                  disabled={konusma.sikayet_ettim}
                  className={dugme('sessiz')}
                >
                  {konusma.sikayet_ettim ? 'Şikayet edildi' : 'Şikayet et'}
                </button>
              </header>

              {konusma.engelledim && (
                <p className="px-3 py-2 bg-rose-50 border-b border-rose-100 metin-yardimci text-rose-800 font-semibold">
                  Bu kullanıcıyı engellediniz. Gönderdiği mesajlar size ulaşmıyor.
                </p>
              )}

              <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/60">
                {mesajlar.length === 0 && (
                  <p className="metin-yardimci text-slate-400 text-center py-6">Henüz mesaj yok.</p>
                )}
                {mesajlar.map((m) => (
                  <div key={m.id} className={`flex ${m.benim ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] rounded-2xl px-3 py-2 ${
                      m.benim
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                    }`}>
                      <p className="metin-govde whitespace-pre-wrap break-words">{m.govde}</p>
                      <p className={`metin-yardimci mt-0.5 font-mono ${m.benim ? 'text-indigo-200' : 'text-slate-400'}`}>
                        {saatBicimi(m.olustu)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={akisSonu} />
              </div>

              <form onSubmit={gonder} className="p-3 border-t border-slate-200 flex gap-2 shrink-0">
                <label htmlFor="mesaj-govde" className="sr-only">Mesajınız</label>
                <input
                  id="mesaj-govde"
                  type="text"
                  value={taslak}
                  onChange={(e) => setTaslak(e.target.value)}
                  maxLength={2000}
                  placeholder="Mesajınızı yazın…"
                  className="flex-1 min-h-[44px] px-3 rounded-xl border border-slate-200 bg-slate-50 metin-govde text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                />
                <button type="submit" disabled={!taslak.trim() || gonderiliyor} className={dugme('birincil')}>
                  {gonderiliyor ? 'Gönderiliyor…' : 'Gönder'}
                </button>
              </form>
            </>
          )}
        </section>
      </div>

      {sikayetAcik && (
        <SikayetDialog
          sebepler={SIKAYET_SEBEPLERI}
          onKapat={() => setSikayetAcik(false)}
          onGonder={sikayetGonder}
        />
      )}
    </div>
  );
}
