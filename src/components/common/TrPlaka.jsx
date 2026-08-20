// =========================================================================
// TR PLAKA ROZETİ — TEK GÖRSEL KAYNAK
//
// -------------------------------------------------------------------------
// NİYE VAR
// -------------------------------------------------------------------------
// Plaka uygulamada DOKUZ ayrı yerde elle çiziliyordu ve dokuzu da farklıydı.
// Ölçüldü:
//
//   çerçeve kalınlığı : 3 farklı  (1px · 1.5px · 2px)
//   çerçeve rengi     : 3 farklı  (slate-200/80 · slate-800 · slate-900)
//   köşe yuvarlaklığı : 3 farklı  (rounded · rounded-md · rounded-lg)
//   TR yazı tipi      : 2 farklı  (mono · sans)
//   TR boyutu         : 5 farklı  (8px → 14px)
//   yükseklik         : 5 farklı  (24 · 28 · 42 · 44/48 · sabit değil)
//   harf aralığı      : 2 farklı  (wider · widest)
//
// Dört yerde ise plaka rozetsiz ve HAM basılıyordu. Plaka veritabanında
// boşluksuz durduğu için ('41IHH434') kullanıcı aynı aracı bir ekranda
// "41 IHH 434", diğerinde "41IHH434" olarak görüyordu.
//
// -------------------------------------------------------------------------
// GÖRSEL DİL: STEP1 REFERANS ALINDI
// -------------------------------------------------------------------------
// Step1'deki plaka girişi baz: mavi TR şeridi (#003399), tek aralıklı yazı,
// büyük harf, geniş harf aralığı. Tek fark ÇERÇEVE — Step1'inki bir GİRİŞ
// ALANI çerçevesi (ince, açık, odak halkalı). Salt-okunur bir rozete
// taşınsaydı pasif form alanı gibi görünür, kullanıcı tıklanabilir sanırdı.
// Gösterimde gerçek plakadaki gibi koyu çerçeve kullanılıyor; zaten sekiz
// gösterim yerinin sekizi de koyu çerçeve kullanıyordu.
//
// -------------------------------------------------------------------------
// ⚠ BOYUTLAR TİPOGRAFİ ÖLÇEĞİNE BAĞLI DEĞİL — BİLEREK
// -------------------------------------------------------------------------
// Bu bir metin değil, fiziksel bir nesnenin taklidi. Oranları gerçek
// plakadan geliyor (TR şeridi dar ve tam boy, yazı tek aralıklı ve geniş).
// `karne/` klasöründeki basılı belge gibi kendi ölçeği var. Bu yüzden
// `.metin-govde` / `.etiket` yerine açık piksel değerleri kullanılıyor.
// =========================================================================

'use client';

import React from 'react';
import { plakaBicimle } from '@/utils/plaka';

// -------------------------------------------------------------------------
// ⚠ ÇERÇEVE KALINLIĞI: `border-[1.5px]` ÇALIŞMIYOR — ÖLÇÜLDÜ
// -------------------------------------------------------------------------
// Eski kodda beş yerde `border-[1.5px]` yazıyordu ve hiçbiri 1.5px
// çizmiyordu. Tarayıcıda ölçüldü:
//
//     border                 -> 1px    ✔
//     border-2               -> 2px    ✔
//     border-[1.5px]         -> 1px    ✘ sessizce `border`e düşüyor
//     border-[length:1.5px]  -> 0px    ✘ çerçeve tamamen kayboluyor
//
// Bu Tailwind v4 kurulumunda keyfi çerçeve kalınlığı üretilmiyor; yalnızca
// ölçek değerleri (`border`, `border-2`, `border-4`) çalışıyor. Yani beş
// ekran aylardır niyet edilenden ince çizim yapıyordu ve kimse fark
// edemezdi — sınıf sessizce yok sayılıyor, hata vermiyor.
//
// Kalınlık artık BOYUTA ORANLI: gerçek plakada da çerçeve plakayla birlikte
// büyüyor. Oran her üç boyutta da ~%4 tutuluyor:
//     sm 1/24 = %4.2   ·   md 1/28 = %3.6   ·   lg 2/44 = %4.5
// -------------------------------------------------------------------------

// Üç boyut. Hangisinin nerede kullanılacağı çağıran ekranın kararı:
//   sm -> liste satırları (araç seçici, hesap kapatma, ilan kartı)
//   md -> kart ve panel başlıkları (garaj, bakım, vitrin kartı, devir)
//   lg -> odak ekranları (devral, mükerrer plaka uyarısı)
const BOYUTLAR = {
  sm: {
    cerceve: 'h-6 border',
    tr: 'px-1.5 text-[10px]',
    plaka: 'px-2 text-[13px]',
  },
  md: {
    cerceve: 'h-7 border',
    tr: 'px-1.5 text-[11px]',
    plaka: 'px-2.5 text-govde',
  },
  lg: {
    cerceve: 'h-11 border-2',
    tr: 'px-3 text-govde',
    plaka: 'px-4 text-bolum',
  },
};

/**
 * TR plaka rozeti.
 *
 * @param {object} props
 * @param {string} props.plaka   Ham ya da biçimli plaka. Boşsa hiçbir şey
 *                               basılmıyor — "TR" yazan boş bir rozet,
 *                               plakası olmayan araç varmış izlenimi verir.
 * @param {'sm'|'md'|'lg'} [props.boyut='md']
 * @param {string} [props.className]  Yerleşim için (shrink-0, self-start...).
 */
export default function TrPlaka({ plaka, boyut = 'md', className = '' }) {
  const bicimli = plakaBicimle(plaka);
  if (!bicimli) return null;

  const o = BOYUTLAR[boyut] || BOYUTLAR.md;

  return (
    <span
      className={`inline-flex items-center border-slate-900 rounded-md bg-white overflow-hidden shrink-0 select-none ${o.cerceve} ${className}`}
    >
      {/* Ülke şeridi. Ekran okuyucudan gizli: plakanın kendisi zaten
          okunuyor, "TR" ayrıca okununca "TR 41 IHH 434" gibi bir dize
          çıkıyor ve bu plakanın gerçek okunuşu değil. */}
      <span
        aria-hidden="true"
        className={`bg-[#003399] text-white font-mono font-bold h-full flex items-center justify-center leading-none ${o.tr}`}
      >
        TR
      </span>
      <span
        className={`font-mono font-bold text-slate-900 uppercase tracking-widest h-full flex items-center whitespace-nowrap tabular-nums ${o.plaka}`}
      >
        {bicimli}
      </span>
    </span>
  );
}
