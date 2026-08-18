// =========================================================================
// OTO-CV YÜKLEME BİLEŞENİ (GlobalStepLoader.jsx)
//
// Sitenin TEK yükleme dili. İki kipi var ve hangisinin kullanılacağı
// keyfî değil — beklenen şeye göre belirlenir:
//
//   mode="islem"    Tam ekran kilit. Kullanıcının BAŞLATTIĞI, yarıda
//                   kesilmemesi gereken işlemler için: tescil gönderimi,
//                   ilan yayınlama, kayıt işleme. Arka plan kilitlenir
//                   çünkü kullanıcı o an başka bir şey yapmamalı.
//
//   mode="iskelet"  İçerik biçimli yer tutucu. Sayfa/bölüm ilk yüklenirken
//                   GELEN İÇERİĞİN şeklini taklit eder. Çatı (header,
//                   footer, menü) ekranda kalır.
//
// -------------------------------------------------------------------------
// NEDEN İLK YÜKLEMEYE TAM EKRAN KİLİT KONMUYOR
// -------------------------------------------------------------------------
// Tam ekran beyaz örtü, header'ı ve menüyü de gizlediği için kullanıcı
// nerede olduğunu kaybeder; içerik hazır olmadan hiçbir şey göstermediği
// için site DAHA YAVAŞ hissettirir; ve tehlikeli bir şey olmadığı hâlde
// etkileşimi kilitler. Sektör ayrımı nettir: gelen şey içerikse iskelet,
// yapılan şey işlemse kilit.
//
// -------------------------------------------------------------------------
// ZAMANLAMA EŞİKLERİ — neden iki sabit var
// -------------------------------------------------------------------------
// Kullanıcı 100 ms'i "anlık", 1 sn'ye kadarını "beklemedim" sayar. Bu
// aralıkta gösterge basmak siteyi yavaş hissettirir. Ayrıca hızlı biten
// işlemde loader bir "çak" edip kaybolur; bu göz için gürültüdür.
//
//   GECIKME_MS  İşlem bundan önce biterse loader HİÇ görünmez.
//   ASGARI_MS   Bir kez göründüyse en az bu kadar kalır. Yoksa 210 ms'de
//               açılıp kapanan bir örtü oluşur.
// =========================================================================

'use client';

import React, { useState, useEffect, useRef } from 'react';

const GECIKME_MS = 200;
const ASGARI_MS = 400;

// =========================================================================
// KİP 1: TAM EKRAN İŞLEM KİLİDİ
// =========================================================================
function IslemKilidi({ title, subtitle }) {
  const kutuRef = useRef(null);

  // ODAK KİLİDİ VE KAYDIRMA KİLİDİ
  // Örtü açıkken Tab ile arkadaki forma geçilebiliyorsa kilit sahtedir —
  // kullanıcı görmediği bir alana yazabilir. Tab engellenir, odak örtüye
  // alınır, kapanınca önceki öğeye geri verilir.
  useEffect(() => {
    const oncekiOdak = document.activeElement;
    kutuRef.current?.focus();

    const tusYakala = (e) => {
      if (e.key === 'Tab') e.preventDefault();
    };
    document.addEventListener('keydown', tusYakala);

    const oncekiTasma = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', tusYakala);
      document.body.style.overflow = oncekiTasma;
      if (oncekiOdak instanceof HTMLElement) oncekiOdak.focus();
    };
  }, []);

  return (
    <div
      ref={kutuRef}
      tabIndex={-1}
      // role/aria-live: ekran okuyucu "yükleniyor" durumunu duyurur.
      // aria-busy: yardımcı teknolojiye bölgenin şu an değiştiğini bildirir.
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[90] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none outline-none motion-safe:animate-fadeIn print:hidden"
    >
      {/* DÖNEN HALKA VE MERKEZ LOGO
          motion-safe: hareket azaltma açıkken halka DÖNMEZ. Vestibüler
          rahatsızlığı olan kullanıcılar için dönen öğe baş dönmesi
          yaratabilir; onlarda nabız atan bir halka gösterilir. */}
      <div className="relative flex items-center justify-center">
        <div className="w-24 h-24 border-4 border-slate-100 border-t-indigo-600 border-r-rose-500 rounded-full motion-safe:animate-spin motion-reduce:animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold text-slate-900 tracking-tight font-display">
            OTO<span className="text-indigo-600">.CV</span>
          </span>
        </div>
      </div>

      {/* BİLGİLENDİRME METNİ
          Başlık ne olduğunu, alt satır kullanıcıdan ne beklendiğini söyler. */}
      <div className="mt-6 text-center space-y-1.5 max-w-sm px-4">
        <h4 className="text-base font-semibold text-slate-900 tracking-tight leading-snug">
          {title}
        </h4>
        <p className="text-xs font-medium text-slate-500 leading-relaxed">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

// =========================================================================
// KİP 2: İSKELET (İÇERİK BİÇİMLİ YER TUTUCU)
//
// Varyantlar gerçek yerleşimleri taklit eder. Yanlış biçimli iskelet hiç
// göstermemekten KÖTÜDÜR: kullanıcıya gelmeyecek bir şeyin beklentisini
// kurar ve içerik gelince yerleşim zıplar.
//
//   kart   → garaj, vitrin, ilanlarım (kart ızgarası)
//   detay  → araç detayı, karne (solda galeri + sağda künye paneli)
//   liste  → bakım geçmişi gibi satır listeleri
//   form   → sorgulama ve giriş formları
// =========================================================================

// Tek yerden gelen gri tonlar. Elle "bg-slate-200" yazmak yerine bunlar
// kullanılır ki iskeletin tonu her yerde aynı olsun.
const KOYU = 'bg-slate-200';
const ACIK = 'bg-slate-100';

function Cizgi({ w = 'w-full', h = 'h-3', ton = ACIK }) {
  return <div className={`${w} ${h} ${ton} rounded`} />;
}

// baslik: rota geçişinde (loading.js) sayfanın başlığı da henüz yok, o yüzden
// iskelet başlık satırlarını da basar. Ama SAYFA İÇİ bir bölümü beklerken
// başlık zaten ekranda — orada baslik={false} verilir, yoksa ekranda iki
// başlık üst üste görünür.
function KartIskeleti({ adet = 3, baslik = true }) {
  return (
    <>
      {baslik && (
        <div className="space-y-3 mb-8">
          <Cizgi w="w-56" h="h-7" ton={KOYU} />
          <Cizgi w="w-80" />
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: adet }).map((_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-md p-5 space-y-3">
            <div className={`h-32 ${ACIK} rounded-lg`} />
            <Cizgi w="w-3/4" h="h-4" ton={KOYU} />
            <Cizgi w="w-1/2" />
            <div className={`h-9 ${ACIK} rounded-lg mt-2`} />
          </div>
        ))}
      </div>
    </>
  );
}

function DetayIskeleti() {
  return (
    <>
      <div className="space-y-3">
        <Cizgi w="w-2/3 max-w-md" h="h-8" ton={KOYU} />
        <Cizgi w="w-40" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-6">
        {/* SOL: galeri alanı */}
        <div className="md:col-span-8 space-y-3">
          <div className={`h-[300px] sm:h-[380px] ${ACIK} rounded-md`} />
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`h-16 ${ACIK} rounded`} />
            ))}
          </div>
        </div>
        {/* SAĞ: künye paneli */}
        <div className="md:col-span-4 space-y-3">
          <div className={`h-20 ${ACIK} rounded-md`} />
          <div className="bg-white border border-slate-200 rounded-md p-3.5 space-y-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex justify-between gap-4">
                <Cizgi w="w-24" />
                <Cizgi w="w-16" ton={KOYU} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function ListeIskeleti({ adet = 4 }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: adet }).map((_, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center gap-3">
          <div className={`w-10 h-10 ${ACIK} rounded-lg shrink-0`} />
          <div className="flex-1 space-y-2">
            <Cizgi w="w-1/3" h="h-4" ton={KOYU} />
            <Cizgi w="w-1/2" />
          </div>
          <Cizgi w="w-16" h="h-4" ton={KOYU} />
        </div>
      ))}
    </div>
  );
}

function FormIskeleti({ adet = 3 }) {
  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="space-y-2 text-center">
        <div className={`h-7 w-48 ${KOYU} rounded-lg mx-auto`} />
        <div className={`h-3 w-64 ${ACIK} rounded mx-auto`} />
      </div>
      {Array.from({ length: adet }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Cizgi w="w-24" h="h-2.5" />
          <div className={`h-11 ${ACIK} rounded-md`} />
        </div>
      ))}
      <div className={`h-11 ${KOYU} rounded-md`} />
    </div>
  );
}

// SADE: biçimi bilinmeyen rota geçişleri için nötr iskelet.
//
// Neden gerekli: bir loading.js kendi segmentinin ALTINDAKİ tüm rotalara da
// uygulanır. (site) grubunda hem kart ızgaralı sayfalar (garaj, vitrin) hem
// araç detayı hem de veri çekmeyen "yakında" yer tutucuları var. Grup
// seviyesinde kart ızgarası basmak, detay sayfasına giren kullanıcıya
// gelmeyecek bir şeyin beklentisini kurar. Bu yüzden grup seviyesi nötr
// kalır; şekli belli olan rotalar kendi loading.js'inde kendi varyantını
// verir.
function SadeIskelet() {
  return (
    <div className="space-y-3">
      <Cizgi w="w-56" h="h-7" ton={KOYU} />
      <Cizgi w="w-80" />
      <div className="pt-6 space-y-2.5">
        <Cizgi w="w-full" />
        <Cizgi w="w-11/12" />
        <Cizgi w="w-4/5" />
      </div>
    </div>
  );
}

const VARYANTLAR = {
  sade: SadeIskelet,
  kart: KartIskeleti,
  detay: DetayIskeleti,
  liste: ListeIskeleti,
  form: FormIskeleti,
};

// gecikmeMs: iskeleti geciktirmeli basmak için.
//
// Neden gerekli: bazı beklemeler çok kısa. Örneğin garaj sayfasındaki
// oturum kontrolü yerel bir okuma — genelde 50 ms'den az sürüyor. Oraya
// koşulsuz iskelet basmak, her ziyarette bir "çak" edip kaybolan yer
// tutucu demek. Kullanıcı 100 ms'i anlık sayar; o aralıkta gösterge
// göstermek siteyi yavaş hissettirir.
//
// Rota geçişlerinde (loading.js) buna gerek YOK: Next.js onu zaten
// yalnızca gerçekten iş varken basıyor.
function Iskelet({ varyant = 'kart', adet, kapsayici = true, baslik = true, gecikmeMs = 0 }) {
  const [gorunur, setGorunur] = useState(gecikmeMs === 0);

  useEffect(() => {
    if (gecikmeMs === 0) return;
    const zamanlayici = setTimeout(() => setGorunur(true), gecikmeMs);
    return () => clearTimeout(zamanlayici);
  }, [gecikmeMs]);

  if (!gorunur) return null;

  const Secilen = VARYANTLAR[varyant] || KartIskeleti;
  const govde = <Secilen {...(adet ? { adet } : {})} baslik={baslik} />;

  return (
    <div
      // aria-hidden: iskelet SAHTE içeriktir. Ekran okuyucuya okutulursa
      // kullanıcı anlamsız kutuları dinler. Durum bilgisi aşağıdaki
      // gizli metinle bir kez veriliyor.
      className={
        kapsayici
          ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 motion-safe:animate-pulse print:hidden'
          : 'motion-safe:animate-pulse print:hidden'
      }
    >
      <span className="sr-only" role="status" aria-live="polite">
        İçerik yükleniyor
      </span>
      <div aria-hidden="true">{govde}</div>
    </div>
  );
}

// =========================================================================
// GİRİŞ NOKTASI
//
// Geriye dönük uyumlu: mode verilmezse "islem" varsayılır ve eski
// çağrı biçimi (isLoading + title + subtitle) aynen çalışır.
// =========================================================================
export default function GlobalStepLoader({
  mode = 'islem',
  isLoading = false,
  title = 'İşleminiz gerçekleştiriliyor',
  subtitle = 'Lütfen pencereyi kapatmayınız.',
  varyant,
  adet,
  kapsayici,
  baslik,
  gecikmeMs,
}) {
  if (mode === 'iskelet') {
    return (
      <Iskelet
        varyant={varyant}
        adet={adet}
        kapsayici={kapsayici}
        baslik={baslik}
        gecikmeMs={gecikmeMs}
      />
    );
  }

  return <IslemKilidiEsikli isLoading={isLoading} title={title} subtitle={subtitle} />;
}

// =========================================================================
// EŞİK SARMALAYICI
// Kilidi doğrudan basmak yerine bu sarmalayıcıdan geçiririz: 200 ms'den
// kısa işlemlerde hiç görünmez, göründüyse en az 400 ms kalır.
// =========================================================================
function IslemKilidiEsikli({ isLoading, title, subtitle }) {
  const [gorunur, setGorunur] = useState(false);
  const acilisZamani = useRef(0);

  useEffect(() => {
    let zamanlayici;

    if (isLoading && !gorunur) {
      // Gecikmeli açılış: kısa işlem hiç loader görmez.
      zamanlayici = setTimeout(() => {
        acilisZamani.current = Date.now();
        setGorunur(true);
      }, GECIKME_MS);
    } else if (!isLoading && gorunur) {
      // Asgari süre dolmadan kapatma yok.
      const gecen = Date.now() - acilisZamani.current;
      zamanlayici = setTimeout(() => setGorunur(false), Math.max(0, ASGARI_MS - gecen));
    }

    return () => clearTimeout(zamanlayici);
  }, [isLoading, gorunur]);

  if (!gorunur) return null;

  return <IslemKilidi title={title} subtitle={subtitle} />;
}
