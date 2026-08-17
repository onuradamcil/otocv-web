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
import { aracKapakGorseli } from '../../utils/aracGorseli';
import { supabase } from '../../lib/supabase';
import AracGorseli from '../common/AracGorseli';

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
  // NOT: `benimKimligim` DURUMU KALDIRILDI, yerine `kimligimRef` geldi
  // (gerekçesi aşağıda, ref'in tanımında). Durum kullanmak, kimlik henüz
  // gelmemişken realtime dinleyicisinin yanlış karar vermesine yol açıyordu.

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

  // =========================================================================
  // KİMLİK ARTIK REF'TE — DURUMDA DEĞİL. NİYE?
  //
  // Kimlik `getUser()` ile asenkron geliyor. Realtime dinleyicisi durumdaki
  // değere baksa, kimlik henüz gelmemişken bir mesaj düşerse `benimMi` FALSE
  // hesaplanıyor ve kendi mesajımız KARŞI TARAFTAN gelmiş gibi çiziliyordu.
  //
  // Ayrıca dinleyici efekti `benimKimligim`e bağımlıydı: kimlik gelince kanal
  // kapanıp yeniden açılıyordu ve o kısa boşlukta gelen satır kaybedilebiliyordu.
  //
  // Ref + tembel çözüm ikisini birden kapatıyor: dinleyici artık yalnızca
  // `secili`ye bağlı ve kimliği gerektiği anda, gerekiyorsa bekleyerek çözüyor.
  // =========================================================================
  const kimligimRef = useRef(null);

  // Gonderilmis ama gercek satiri henuz gelmemis yer tutucularin kimlikleri.
  // Emniyet agi buna bakiyor; durum guncelleyicisi saf kaliyor.
  const bekleyenlerRef = useRef(new Set());

  // Kurulan emniyet zamanlayicilari. Bilesen sokulurken temizlenmeleri sart:
  // aksi halde ekran kapandiktan sonra `setMesajlar` cagirip React uyarisi
  // uretiyor ve gereksiz bir ag istegi atiyorlar.
  const zamanlayicilarRef = useRef(new Set());
  useEffect(() => () => {
    zamanlayicilarRef.current.forEach(clearTimeout);
    zamanlayicilarRef.current.clear();
  }, []);

  const kimligimiCoz = useCallback(async () => {
    if (kimligimRef.current) return kimligimRef.current;
    const { data } = await supabase.auth.getUser();
    kimligimRef.current = data?.user?.id ?? null;
    return kimligimRef.current;
  }, []);

  // Önden ısıtma: ilk mesaj gelmeden kimlik hazır olsun.
  useEffect(() => { kimligimiCoz(); }, [kimligimiCoz]);

  // ANLIK TESLİM. Abonelik konuşma değişince kapanıp yenisi açılıyor;
  // kapatmayı unutmak her seçimde bir kanal daha bırakırdı.
  useEffect(() => {
    if (!secili) return undefined;

    const kapat = mesajlariDinle(secili, async (yeni) => {
      // ⚠ KİMLİK BURADA, GEREKTİĞİ ANDA ÇÖZÜLÜYOR.
      // Kapanışta yakalanan bir değere bakmak, kimlik henüz gelmemişken
      // kendi mesajımızı "karşı taraftan" saymak anlamına geliyordu.
      const benId = await kimligimiCoz();
      const benimMi = !!benId && yeni.gonderen_id === benId;

      setMesajlar((onceki) => {
        // Aynı satır iki kez gelirse (yeniden abone olma) yok say.
        if (onceki.some((m) => m.id === yeni.id)) return onceki;

        if (benimMi) {
          // Kendi mesajımız: BEKLEYEN yer tutucuyu gerçek satırla değiştir,
          // yenisini ekleme.
          //
          // `bekliyor` bayrağına bakılıyor, kimlik önekine değil: yer tutucu
          // artık gerçek bir UUID taşıyor (React `key` çakışmasın diye) ve
          // "yerel-" gibi bir desenle ayırt edilemez.
          //
          // İlk eşleşen alınıyor: kullanıcı aynı metni iki kez gönderdiğinde
          // iki bekleyen kayıt oluyor ve iki realtime satırı sırayla birini
          // kapatıyor. Sıra korunduğu için eşleşme doğru.
          const yer = onceki.findIndex((m) => m.bekliyor && m.govde === yeni.govde);
          if (yer > -1) {
            bekleyenlerRef.current.delete(onceki[yer].id);
            const kopya = [...onceki];
            kopya[yer] = { id: yeni.id, benim: true, govde: yeni.govde, olustu: yeni.olustu };
            return kopya;
          }
        }

        // Buraya düşen iki meşru durum var: karşı tarafın mesajı, ya da kendi
        // mesajımızın BAŞKA bir sekmeden/cihazdan gönderilmiş olması.
        return [...onceki, { id: yeni.id, benim: benimMi, govde: yeni.govde, olustu: yeni.olustu }];
      });

      // Okundu işareti YALNIZCA karşı tarafın mesajı için. Kendi mesajımızı
      // okundu saymak, karşı taraf hiç açmadan "okundu" göstermek olurdu.
      if (!benimMi) okunduIsaretle(secili);
    });

    return kapat;
  }, [secili, kimligimiCoz]);

  useEffect(() => {
    akisSonu.current?.scrollIntoView({ block: 'end' });
  }, [mesajlar.length]);

  // =========================================================================
  // ⚠ ASIL HATA BURADAYDI: "İYİMSER" EKLEME AWAIT'TEN SONRA YAPILIYORDU.
  //
  // Eski sıra şöyleydi:
  //     await mesajGonder(...)        // satır veritabanına YAZILIYOR
  //     setMesajlar(... yer tutucu)   // yer tutucu ANCAK ŞİMDİ ekleniyor
  //
  // Realtime, `await` çözülmeden önce INSERT olayını getiriyor. Yani gerçek
  // sıra çoğu zaman şu oluyordu:
  //
  //   1. satır yazıldı
  //   2. realtime geldi -> değiştirilecek yer tutucu HENÜZ YOK -> satır EKLENDİ
  //   3. await döndü -> yer tutucu da EKLENDİ
  //
  // Sonuç: mesaj ekranda İKİ KEZ. Üstelik kimlik henüz çözülmemişse 2. adımda
  // eklenen kopya `benim: false` alıyor ve KARŞI TARAFTAN gelmiş gibi
  // çiziliyordu — kullanıcının bildirdiği belirti tam olarak buydu.
  //
  // "İyimser ekleme" adı doğruydu, yeri yanlıştı: iyimser olmak, sunucuyu
  // BEKLEMEDEN göstermek demek.
  // =========================================================================
  async function gonder(e) {
    e.preventDefault();
    const govde = taslak.trim();
    if (!govde || gonderiliyor || !secili) return;

    // Gerçek bir UUID: React `key`i çakışmasın ve yer tutucu ile realtime
    // satırı asla aynı kimliği taşımasın.
    const geciciId = `bekleyen-${crypto.randomUUID()}`;

    // ÖNCE ekrana, SONRA sunucuya.
    bekleyenlerRef.current.add(geciciId);
    setMesajlar((o) => [...o, {
      id: geciciId, benim: true, govde, olustu: new Date().toISOString(), bekliyor: true,
    }]);
    setTaslak('');
    setGonderiliyor(true);

    const { basarili, hata } = await mesajGonder(secili, govde);
    setGonderiliyor(false);

    if (!basarili) {
      // Baloncuk geri alınıyor VE yazı kullanıcıya geri veriliyor: gönderilemeyen
      // bir mesajın ekranda kalması "gitti" yanılgısı yaratır, yazının silinmesi
      // ise kullanıcının emeğini yok eder.
      bekleyenlerRef.current.delete(geciciId);
      setMesajlar((o) => o.filter((m) => m.id !== geciciId));
      setTaslak((mevcut) => (mevcut.trim() ? mevcut : govde));
      toast.hata(hata);
      return;
    }

    // Başarılı. Gerçek satırı realtime getirip yer tutucuyu değiştirecek.
    //
    // EMNİYET AĞI: kanal koptuysa realtime hiç gelmez ve baloncuk sonsuza
    // kadar `bekliyor` kalır — dahası, sonradan aynı metni gönderirsek onun
    // satırını yanlışlıkla yutabilir. Süre sonunda hâlâ bekliyorsa konuşma
    // sunucudan yeniden okunuyor; tek gerçek kaynak orası.
    //
    // ⚠ DENETİM REF'TEN YAPILIYOR, `setMesajlar` İÇİNDEN DEĞİL. Durum
    // güncelleyicisinin içinde dışarıdaki bir değişkeni yazmak React'in
    // güncelleyiciyi iki kez çağırabildiği durumlarda güvenilmez — kural
    // olarak güncelleyici saf kalmalı.
    const zamanlayici = setTimeout(async () => {
      if (!bekleyenlerRef.current.has(geciciId)) return;
      const { basarili: ok, veri } = await mesajlariGetir(secili);
      if (ok && veri) {
        bekleyenlerRef.current.delete(geciciId);
        setMesajlar(veri.mesajlar || []);
      }
    }, 5000);
    zamanlayicilarRef.current.add(zamanlayici);
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
                    {/* `relative` EKLENDİ: `AracGorseli` `fill` ile konumlanıyor. */}
                    <span className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 grid place-items-center relative">
                      {/* ⚠ HAM ALAN BASILAMAZ: `image_url` virgülle birleştirilmiş
                          ÇOKLU adres tutabiliyor. Denetimde bu ekranda iki
                          kırık görsel ölçüldü — devir ekranları düzeltilirken
                          burası atlanmıştı. */}
                      <AracGorseli
                        src={aracKapakGorseli(k.image_url)}
                        alt=""
                        sizes="44px"
                        bosMetin=""
                      />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="metin-govde font-bold text-slate-900 truncate">
                          {k.karsi_taraf}
                        </span>
                        <span className="metin-yardimci text-slate-500 shrink-0 font-mono">
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
                          <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-600 text-white text-etiket font-semibold grid place-items-center">
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
                  <p className="metin-govde font-semibold text-slate-900 truncate">{konusma.karsi_taraf}</p>
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
                  <p className="metin-yardimci text-slate-500 text-center py-6">Henüz mesaj yok.</p>
                )}
                {mesajlar.map((m) => (
                  <div key={m.id} className={`flex ${m.benim ? 'justify-end' : 'justify-start'}`}>
                    {/* `bekliyor`: sunucu onayı henüz gelmedi. Hafif saydamlık
                        kullanıcıya "gitti ama henüz kesinleşmedi" diyor —
                        mesajlaşma uygulamalarının yerleşik dili. Ayrı bir metin
                        eklenmiyor: baloncuğun içine "gönderiliyor" yazmak,
                        mesajın kendisiymiş gibi okunuyor. */}
                    <div className={`max-w-[78%] rounded-2xl px-3 py-2 transition-opacity ${
                      m.bekliyor ? 'opacity-60' : 'opacity-100'
                    } ${
                      m.benim
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                    }`}
                    aria-busy={m.bekliyor || undefined}>
                      <p className="metin-govde whitespace-pre-wrap break-words">{m.govde}</p>
                      <p className={`metin-yardimci mt-0.5 font-mono ${m.benim ? 'text-indigo-200' : 'text-slate-500'}`}>
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
                  className="flex-1 min-h-[44px] px-3 rounded-xl border border-slate-200 bg-slate-50 metin-govde text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
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
