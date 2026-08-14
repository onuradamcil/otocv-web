// =========================================================================
// OTO-CV İKON MOTORU (icons/Icon.jsx)
//
// Bu dosya ÇİZİM İÇERMEZ. Çizimler registry.jsx'te. Buradaki iş: her ikonun
// aynı kutuda, aynı çizgi kalınlığında, aynı erişilebilirlik davranışıyla
// basılmasını garanti etmek. Kütüphaneyi "kütüphane" yapan kısım budur —
// yoksa 127 tane elle yazılmış <svg> gibi her biri kendi kuralını uydurur.
//
// -------------------------------------------------------------------------
// NEDEN EMOJİ DEĞİL
// -------------------------------------------------------------------------
// Arayüzde ikon yerine emoji vardı (📍 🗓️ 🛡️ ⚠️ 👁 📁 🚗 …). Emoji ikon
// değildir ve kurumsal belge görünümünü üç yerden bozar:
//   1. Çizimi işletim sistemi seçer. Windows Segoe UI Emoji, iPhone Apple
//      Color Emoji, Android Noto basar — aynı sayfa üç cihazda üç farklı
//      görünür. Tasarım kontrolü tamamen kaybedilir.
//   2. Emoji kendi rengini taşır; metnin rengini almaz, hover'da değişmez,
//      koyu zeminde okunmaz, gri tonlu yazdırmada leke olur.
//   3. Ekran okuyucu emojiyi adıyla okur: "📍 Aksaray" → "yuvarlak iğne
//      Aksaray".
//
// -------------------------------------------------------------------------
// ÇİZİM IZGARASI (kütüphanenin tutarlılık sözü)
// -------------------------------------------------------------------------
//   • Kutu 24×24. Canlı alan 20×20 — her kenarda 2 birim boşluk bırakılır,
//     böylece farklı ikonlar yan yana geldiğinde optik olarak aynı büyüklükte
//     durur.
//   • stroke="currentColor" → ikon metnin rengini MİRAS ALIR. Bu yüzden
//     hover, koyu zemin ve yazdırma kendiliğinden doğru çalışır.
//   • fill="none", strokeLinecap/Join="round" → yumuşak, tek dil.
//   • Varsayılan kalınlık 2. Kod tabanındaki mevcut 127 inline SVG de 2
//     kullanıyor; kütüphane onlarla aynı ağırlıkta durması için 2'de kalıyor.
//
// -------------------------------------------------------------------------
// BOYUT ÖLÇEĞİ
// -------------------------------------------------------------------------
// Çağrı yerlerinde "w-3 h-3", "w-3.5 h-3.5", "w-4 h-4" diye serbest ölçü
// yazılırsa ikonlar sayfa sayfa kayar. Bu yüzden adlandırılmış ölçek var:
//   xs 12px · sm 14px · md 16px · lg 20px · xl 24px
// Satır içi metin yanında sm, buton içinde md, boş durum görselinde xl.
//
// -------------------------------------------------------------------------
// ERİŞİLEBİLİRLİK SÖZLEŞMESİ
// -------------------------------------------------------------------------
// Varsayılan: ikon SÜSTÜR → aria-hidden="true". Yanındaki metin anlamı
// taşıdığı için ekran okuyucu ikonu atlar. ("📍 Aksaray" örneğinde ikonun
// okunmasına gerek yok, "Aksaray" yeter.)
//
// Anlam yalnızca ikonda ise label verilir:
//     <Icon name="uyari" label="Uyarı" />
// Bu durumda role="img" + aria-label basılır.
//
// Kural: ikon TEK BAŞINA bir butonun içeriğiyse, label'ı ikona değil butona
// ver (aria-label butonda olur), ikon süs kalır.
// =========================================================================

import React from 'react';
import { CIZIMLER } from './registry';

// Adlandırılmış ölçek. Tailwind sınıfı olarak basılır ki JIT taraması görsün.
export const OLCEK = {
  xs: 'w-3 h-3',
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6',
  '2xl': 'w-8 h-8',
};

/**
 * @param {string} name    registry.jsx içindeki ikon adı
 * @param {string} size    xs | sm | md | lg | xl | 2xl  (varsayılan md)
 * @param {string} className  Renk ve ek düzen sınıfları (örn. "text-slate-400")
 * @param {string} label   Verilirse ikon anlam taşır → role="img" + aria-label
 * @param {number} strokeWidth  Varsayılan 2
 */
export default function Icon({
  name,
  size = 'md',
  className = '',
  label,
  strokeWidth = 2,
  // İçi dolu varyant. Kayıt tek çizgi ikon üzerine kurulu ama favori gibi
  // AÇIK/KAPALI durumu olan ikonlarda doluluk, durumu renkten bağımsız
  // olarak anlatıyor — renk körü kullanıcı için tek ayırt edici bu.
  dolu = false,
  ...rest
}) {
  const cizim = CIZIMLER[name];

  // Yazım hatası sessizce boş kutu basmasın — geliştirmede görünür olsun,
  // canlıda ise sayfayı çökertmek yerine hiç basmasın.
  if (!cizim) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `Icon: "${name}" kayıtlı değil. Kayıtlı adlar: ${Object.keys(CIZIMLER).join(', ')}`
      );
    }
    return null;
  }

  const erisim = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' };

  return (
    <svg
      viewBox="0 0 24 24"
      fill={dolu ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${OLCEK[size] || OLCEK.md} ${className}`}
      {...erisim}
      {...rest}
    >
      {cizim}
    </svg>
  );
}

// Galeri / test amaçlı: kayıtlı tüm ikon adları
export const IKON_ADLARI = Object.keys(CIZIMLER);
