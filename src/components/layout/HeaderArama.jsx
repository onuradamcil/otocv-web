// =========================================================================
// BAŞLIK ŞERİDİ ARAMASI (HeaderArama.jsx)
//
// -------------------------------------------------------------------------
// NİYE VAR — KOYU KAHRAMAN BLOĞU KALKTI
// -------------------------------------------------------------------------
// Arama kutusu anasayfadaki `#0F172A` kahraman bloğunun içindeydi. O blok
// ekranın üst üçte birini kaplıyor, sayfanın asıl işi olan araç ızgarasını
// aşağı itiyordu. Ürün sahibinin kararıyla blok kaldırıldı ve arama
// başlık şeridine taşındı — yani artık HER SAYFADA erişilebilir.
//
// -------------------------------------------------------------------------
// ⚠ MANTIK BİREBİR TAŞINDI, SADELEŞTİRİLMEDİ
// -------------------------------------------------------------------------
// Girdi PIN BİÇİMİNDEYSE doğrudan karneye, değilse arama ekranına gidiyor.
// Bu ayrım tarihsel bir hatanın onarımı ve korunması şart:
//
//   `pinNormalize("bmw")` -> `CV-BMW`
//
// Eski kod bunu geçerli sayıp `/karne/CV-BMW`'ye yönlendiriyordu; marka
// arayan kullanıcı VAR OLMAYAN bir karne sayfasına düşüyordu. Türkçe
// karakter girildiğinde ise boş dönüyor ve Enter hiçbir şey yapmıyordu.
// Bu yüzden soru ayrı soruluyor: girdi gerçekten PIN biçiminde mi?
//
// ⚠ HEDEF ARTIK DOĞRUDAN `/arama`. Eski kod `/vitrin?q=`ye itiyor, adres
// senkronu da onu `/arama`ya çeviriyordu — kullanıcı iki adres değişikliği
// yaşıyor ve geçmişte gereksiz bir kayıt kalıyordu.
//
// -------------------------------------------------------------------------
// ⚠ `aria-label` DEĞİŞMEZ
// -------------------------------------------------------------------------
// Test paketi arama kutusunu `getByLabel(/PIN ile ara/i)` ile buluyor.
// Etiketi değiştirmek dört testi sessizce kırar.
// =========================================================================

'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { pinNormalize, pinBicimiMi } from '../../utils/pinUretici';

const ODAK = 'focus-visible:ring-offset-2';

/**
 * ⚠ ADRESTEKİ SORGU KUTUYA YANSITILIYOR.
 * `/arama?q=bmw` adresine gelen kullanıcı kutuyu BOŞ görüyordu: aradığı
 * kelimeyi ne görebiliyor ne düzeltebiliyordu, baştan yazmak zorundaydı.
 *
 * `key={q}` ile yeniden bağlanıyor — böylece adres değişince kutu yeni
 * sorguyla tazeleniyor. Bunu `useEffect` + `setState` ile yapmak bu
 * projenin lint kuralına (`react-hooks/set-state-in-effect`) takılıyor;
 * `key` aynı sonucu React'in kendi mekanizmasıyla veriyor. Yazarken
 * yeniden bağlanma OLMUYOR, çünkü adres yalnızca gönderimde değişiyor.
 */
export default function HeaderArama({ mobil = false }) {
  const adrestekiSorgu = useSearchParams().get('q') ?? '';
  return <AramaFormu key={adrestekiSorgu} baslangic={adrestekiSorgu} mobil={mobil} />;
}

function AramaFormu({ baslangic, mobil }) {
  const router = useRouter();
  const [sorgu, setSorgu] = useState(baslangic);

  const gonder = (e) => {
    e.preventDefault();
    const q = sorgu.trim();
    if (!q) return;

    if (pinBicimiMi(q)) {
      const pin = pinNormalize(q);
      if (pin) router.push(`/karne/${encodeURIComponent(pin)}`);
      return;
    }
    router.push(`/arama?q=${encodeURIComponent(q)}`);
  };

  return (
    <form
      onSubmit={gonder}
      role="search"
      /* ⚠ GENİŞLİK 576px'TEN 512px'E ÇEKİLDİ. Şeridin %40'ını kaplıyordu
         ve logoyla eylemleri kenara itiyordu; arama önemli ama şeridin
         sahibi değil. Yer tutucu da kısaltıldı ki dar kutuda kırpılmasın —
         `aria-label` DEĞİŞMEDİ, testler onu arıyor.

         ⚠ TEK ODAK HALKASI — ÖNCEDEN İKİ TANE ÇİZİLİYORDU.
         Ölçüldü: girdi global `:focus-visible` kuralından
         `outline: 2px solid #4f46e5` alıyor, form da `focus-within` ile
         kenarlığını indigoya çeviriyordu. Sonuç iç içe iki mavi çerçeveydi.
         Artık halka YALNIZCA kapsayıcıda: bütün arama alanını (ikon dahil)
         çevreliyor, girdininki bastırılıyor.

         ⚠ Girdinin outline'ını bastırmak ancak kapsayıcı GÖRÜNÜR bir halka
         çizdiği için güvenli — globals.css'te yazılı olan tuzak tam olarak
         "outline'ı kaldırıp yerine bir şey koymamak"tı.

         Zemin beyaz: koyu şeritte en okunaklı ve aramayı şeridin odağı
         yapıyor — kutuyu şeride taşıma kararının amacı buydu. */
      className={`flex items-center gap-2 bg-white border border-slate-300 rounded-md px-3 h-11 w-full transition-shadow
        focus-within:ring-2 focus-within:ring-amber-400 focus-within:border-amber-400
        ${mobil ? '' : 'max-w-lg'}`}
    >
      <span className="text-slate-500 shrink-0" aria-hidden="true">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </span>

      {/* ⚠ Bu etiket TEST ÇAPASI — bkz. dosya başı. */}
      <input
        type="text"
        value={sorgu}
        onChange={(e) => setSorgu(e.target.value)}
        aria-label="Marka, model, şehir veya PIN ile ara"
        placeholder="Marka, model veya PIN ile ara"
        autoComplete="off"
        /* `min-h-[44px]` HER İKİ YERLEŞİMDE: masaüstünde de tıklanabilir
           alan yazı boyu kadar kalmamalı (WCAG 2.5.8).
           `focus-visible:outline-none`: halkayı kapsayıcı çiziyor (yukarı
           bak) — iki çerçeve üst üste binmesin diye. */
        className="odak-kapsayicida w-full min-h-[44px] bg-transparent border-none outline-none text-govde text-slate-900 placeholder:text-slate-500"
      />

      {sorgu && (
        <button
          type="button"
          onClick={() => setSorgu('')}
          aria-label="Aramayı temizle"
          /* 44px: şeritte dar görünse de dokunma hedefi eşiği aşağı
             çekilmiyor (WCAG 2.5.5). Genişlik `w-8` ama yükseklik tam. */
          className={`shrink-0 grid place-items-center w-8 min-h-[44px] text-slate-500 hover:text-slate-900 rounded ${ODAK}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </form>
  );
}
