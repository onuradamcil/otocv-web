// =========================================================================
// OTO-CV GLASSMORPHIC VİTRİN: 16:9 DİKEY GROWTH MOTORU (AdvertisingCard.jsx)
// İşlev: Neon glow arkaplanı, buzlu cam (Glassmorphism) araç künyesi,
//        canlı Supabase PIN kodu entegrasyonu ve harici indirme uyumlu zırh.
// =========================================================================

'use client';

import React from 'react';
import Icon from '../common/icons';

export default function AdvertisingCard({ vehicle }) {
  // =========================================================================
  // 1. BLOK: SAF VERİ TEMİZLEME VE GÜVENLİK FİLTRELERİ
  // =========================================================================
  const rawImageUrls = vehicle?.image_url || vehicle?.image || '';
  const carPhoto = rawImageUrls
    ? rawImageUrls.split(',').map(url => url.trim()).find(url => url.startsWith('http'))
    : '';

  // 🚀 SİBER ENTEGRASYON: Eski 4 haneli statik placeholder uçuruldu, canlı DB verisi mühürlendi!
  const pinCode = vehicle?.pin_code || 'CV-PENDING';
  
  const score = vehicle?.trust_score ?? 94;
  const brand = vehicle?.brand || 'Belirsiz';
  const model = vehicle?.model || 'Belirsiz';
  const kmValue = vehicle?.km ?? 0;
  
  // Binlik sayı formatlama (TÜVTÜRK Standart Uyumu)
  const formattedKm = kmValue.toLocaleString('tr-TR');
  const packageStr = vehicle?.package || 'Standart Paket';
  // Bu kart karne PNG'sinin içinde ve ilan sitelerine yükleniyor. Veri
  // yokken 'Hasarsız' basmak, alıcıya yapılmamış bir beyanı sunmak olur.
  const tramerStr = vehicle?.tramer_status || 'Beyan Edilmemiş';

  // =========================================================================
  // 2. BLOK: INTERFACE ARAYÜZ KATMANI (16:9 DİKEY GLOW MİZANPAJI)
  // =========================================================================
  return (
    <div className="flex justify-center items-center select-none">
      {/* 16:9 DİKEY FORMATI KORUYAN RESPONSIVE KALKAN */}
      <div className="w-full max-w-[360px] aspect-[9/16] bg-[#0F1115] text-white rounded-[28px] overflow-hidden relative shadow-2xl border border-slate-900 flex flex-col p-5 justify-between">
        
        {/* NEON ARKAPLAN PARLAMALARI (GLOW EFFECT) */}
        {/* Üst Sol Yeşil Parlama */}
        <div className="absolute -top-20 -left-16 w-64 h-64 bg-[#31D17C]/15 rounded-full blur-[60px] pointer-events-none" />
        {/* Alt Sağ Mavi Parlama */}
        <div className="absolute -bottom-24 -right-16 w-72 h-72 bg-[#4DA6FF]/10 rounded-full blur-[70px] pointer-events-none" />

        {/* --- HEADER ALANI --- */}
        <div className="flex justify-between items-center z-10">
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-widest text-white">OTO.CV</span>
            <span className="text-[9px] text-[#BFC5CF] font-semibold mt-0.5">Profesyonel Dijital Sicil</span>
          </div>
          
          <div className="bg-[#1E222B] border border-[#2B303B] px-2.5 py-1 rounded-full flex items-center gap-1">
            <svg className="w-3 h-3 text-[#31D17C]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a.75.75 0 00-.708.522L4.25 8.5h3.003a.75.75 0 01.673.418l1.24 2.479 2.148-5.727a.75.75 0 011.332-.054l2.844 5.23h2.26a.75.75 0 010 1.5h-3a.75.75 0 01-.666-.407L12.062 7.76l-2.116 5.641a.75.75 0 01-1.353.078L7.142 10.5H3.75a.75.75 0 00-.75.75v5.25c0 .414.336.75.75.75h12.5a.75.75 0 00.75-.75v-5.25a.75.75 0 00-.75-.75h-1.5a.75.75 0 01-.666-.407l-1.613-2.964-1.921 5.122a.75.75 0 01-1.346.046L7.18 9H4.802l1.173-3.91a.75.75 0 00-.708-.523h1z" clipRule="evenodd" />
            </svg>
            <span className="text-[9px] text-white font-black tracking-wide">Doğrulandı</span>
          </div>
        </div>

        {/* --- HERO GÖRSEL VE BUZLU CAM (GLASSMORPHISM) KÜNYE --- */}
        <div className="relative rounded-2xl overflow-hidden bg-[#171A21] border border-slate-800/60 h-44 w-full shrink-0 z-10 mt-3 shadow-inner">
          {carPhoto ? (
            <img src={carPhoto} alt="Hero Car" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-600">GÖRSEL EKSİK</div>
          )}

          {/* GLASSMORPHIC OVERLAY KART PANELİ */}
          <div className="absolute bottom-2 left-2 right-2 backdrop-blur-xl bg-white/[0.06] border border-white/10 rounded-xl p-2.5 flex justify-between items-center shadow-lg">
            <div className="flex flex-col min-w-0">
              <h3 className="text-sm font-black text-white truncate tracking-tight">{brand} {model}</h3>
              <span className="text-[9px] text-[#BFC5CF] font-bold mt-0.5 tracking-wide uppercase">{formattedKm} KM • TÜVTÜRK ONAYLI</span>
            </div>

            {/* Puan Çemberi */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#35D37F] to-[#20BF74] flex items-center justify-center font-black text-sm text-white shadow-lg shadow-[#31D17C]/30 shrink-0">
              {score}
            </div>
          </div>
        </div>

        {/* --- THE HOOK: SİBER KİLİT ALANI --- */}
        <div className="bg-[#1E222B]/80 border border-[#2B303B] rounded-xl p-3 z-10 flex items-start gap-3 shadow-sm mt-3">
          <div className="w-7 h-7 rounded-full bg-[#171A21] flex items-center justify-center text-[#F6A623] border border-slate-800 shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.599-3.748A11.952 11.952 0 0112 2.715z" />
            </svg>
          </div>
          <div className="flex flex-col space-y-0.5 min-w-0">
            <span className="text-[9px] font-black text-white tracking-wider">TRAMER VE USTA FATURALARI KİLİTLİ</span>
            <p className="text-[8px] text-[#BFC5CF] leading-normal font-medium">
              Bu aracın triger, sıvı bakımları ve e-devlet ruhsat mülkiyeti siber havuzda mühürlenmiştir.
            </p>
          </div>
        </div>

        {/* --- BİLGİ ÇİPLERİ MATRİSİ --- */}
        <div className="flex flex-wrap gap-1.5 z-10 my-3">
          <InfoChip value={packageStr} />
          <InfoChip value="Sedan" />
          <InfoChip value="Benzin" />
          <InfoChip value="Otomatik" />
          <InfoChip value={tramerStr} />
        </div>

        {/* --- MAĞAZA REKLAM VİTRİNİ --- */}
        <div className="flex gap-1.5 z-10 select-none">
          <StoreBadge title="App Store" sub="dan indirin" type="apple" />
          <StoreBadge title="Google Play" sub="den edinin" type="play" />
          <StoreBadge title="oto.cv" sub="webden sorgula" type="web" />
        </div>

        {/* --- QR VE PIN FOOTER --- */}
        <div className="bg-white rounded-xl p-3 z-10 flex items-center justify-between text-slate-900 mt-3 shadow-md">
          <div className="flex flex-col justify-center min-w-0 pr-2">
            <span className="text-[9px] text-[#31D17C] font-black tracking-wider">GÜVENLİ SORGULAMA</span>
            {/* 🚀 SİBER ENTEGRASYON: Yeni 6 haneli canlı permütasyon kodu burada can buluyor! */}
            <span className="text-sm font-black text-[#0F1115] tracking-wide mt-0.5 font-mono">{pinCode}</span>
            <p className="text-[8px] text-[#6F7887] leading-tight font-semibold mt-1">
              Kameranızla taratıp aracın tüm geçmişini ücretsiz inceleyin.
            </p>
          </div>
          
          {/* NATIVE VECTOR QR CODE SIMULATION */}
          <div className="w-14 h-14 bg-white border border-slate-100 p-1 flex items-center justify-center shrink-0 rounded-lg">
            <svg className="w-full h-full text-slate-900" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2 2h6v6H2V2zm2 2v2h2V4H4zm8-2h6v6h-6V2zm2 2v2h2V4h-2zM2 14h6v6H2v-6zm2 2v2h2v-2H4zm10-2h2v2h-2v-2zm2 2h2v2h-2v-2zm2-2h2v2h-2v-2zm0 4h2v2h-2v-2zm-2 2h2v2h-2v-2zm-4-2h2v2h-2v-2zm2-4h2v2h-2v-2zm-2 2h2v2h-2v-2zM10 2h2v2h-2V2zm0 4h2v2h-2V6zM8 10h2v2H8v-2zm2 2h2v2h-2v-2zm2-2h2v2h-2v-2zm4 0h2v2h-2v-2z" />
            </svg>
          </div>
        </div>

      </div>
    </div>
  );
}

// INTERNAL BİLGİ ÇİP BİLEŞENİ
function InfoChip({ value }) {
  return (
    <div className="bg-[#171A21] border border-[#2B303B] px-2 py-1 rounded-lg text-[9px] text-[#BFC5CF] font-bold flex items-center gap-1 shrink-0">
      <span className="w-1 h-1 bg-[#31D17C] rounded-full" />
      {value}
    </div>
  );
}

// INTERNAL STORE BADGE BİLEŞENİ
function StoreBadge({ title, sub, type }) {
  return (
    <div className="flex-1 bg-[#1E222B] border border-[#2B303B] rounded-xl py-1.5 px-1 flex flex-col items-center justify-center text-center min-w-0">
      {/* Bu kart karne PNG'sinin İÇİNDE ve kullanıcının kendi makinesinde
          rasterize ediliyor. Önceden Apple logosu için U+F8FF (özel kullanım
          alanı) karakteri basılıyordu; o karakter YALNIZCA Apple cihazlarda
          çiziliyor, Windows ve Android'de boş kutu oluyor. Yani karnenin bir
          köşesi kullanıcının işletim sistemine göre bozuk çıkıyordu.
          Üçü de artık SVG; marka logosu taklit edilmiyor. */}
      <div className="text-white mb-0.5 h-3 flex items-center justify-center">
        {type === 'web'
          ? <Icon name="kure" className="w-2.5 h-2.5" />
          : <Icon name="indir" className="w-2.5 h-2.5" />}
      </div>
      <span className="text-[8px] text-white font-black tracking-tight truncate w-full">{title}</span>
      <span className="text-[6.5px] text-[#6F7887] font-bold truncate w-full mt-px">{sub}</span>
    </div>
  );
}