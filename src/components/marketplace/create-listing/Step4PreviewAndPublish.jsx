// =========================================================================
// OTO-CV SİHİRBAZI: BAĞIMSIZ ŞOVRUM & SATICI İLETİŞİM PANELERİ
// İşlev: Sahibinden / Arabam.com Birebir Mizanpajı - Sol Kart (Galeri & Künye),
//        Sağ Bağımsız Kart (Satıcı Profil, İletişim & Güvenlik Kartı).
// =========================================================================

'use client';

import React, { useState } from 'react';

// 🛡️ DRAFT, FILE, BLOB VE JSONB BOZULMALARINI %100 ÇÖZEN GÖRSEL SENSÖRÜ
const parseSafeImageUrls = (rawPhotos) => {
  if (!rawPhotos) return ['/placeholder-car.jpg'];

  let items = [];
  if (Array.isArray(rawPhotos)) {
    items = rawPhotos;
  } else if (typeof rawPhotos === 'string') {
    items = rawPhotos.split(',').map(s => s.trim());
  } else {
    items = [rawPhotos];
  }

  const parsed = items.map((item) => {
    if (!item) return null;

    if (typeof item === 'string') {
      const clean = item.trim();
      if (clean.startsWith('http') || clean.startsWith('data:') || clean.startsWith('blob:')) {
        return clean;
      }
      return null;
    }

    if (item.preview && typeof item.preview === 'string') return item.preview;
    if (item.url && typeof item.url === 'string') return item.url;
    if (item.src && typeof item.src === 'string') return item.src;

    if (item instanceof File || item instanceof Blob) {
      try { return URL.createObjectURL(item); } catch (e) { return null; }
    }

    if (item.file && (item.file instanceof File || item.file instanceof Blob)) {
      try { return URL.createObjectURL(item.file); } catch (e) { return null; }
    }

    return null;
  }).filter(Boolean);

  return parsed.length > 0 ? parsed : ['/placeholder-car.jpg'];
};

export default function SingleShowroomPanel({ formData = {}, onEdit, user = {} }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [thumbPage, setThumbPage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [showPhone, setShowPhone] = useState(false);

  // Görselleri zırhlı sensörden geçirip temizliyoruz
  const imageList = parseSafeImageUrls(formData.photos);
  
  const activePlate = formData.plate || formData.plate_number || '06 ONR 997';
  const activeKm = formData.mileage || formData.km || '0';
  const otocvScore = formData.otocv_score || 92;

  // Kullanıcı ve İletişim Bilgileri
  const sellerName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Onur Adamcil';
  const sellerPhone = user?.user_metadata?.phone || '0 (532) 123 45 67';
  const memberSince = 'Mart 2026';

  // THUMBNAIL SAYFALAMA MANTIĞI (5x2 = Sayfa başı 10 Görsel)
  const THUMBNAILS_PER_PAGE = 10;
  const totalPages = Math.ceil(imageList.length / THUMBNAILS_PER_PAGE);
  const currentThumbnails = imageList.slice(
    thumbPage * THUMBNAILS_PER_PAGE,
    (thumbPage + 1) * THUMBNAILS_PER_PAGE
  );

  // Slider İleri / Geri Navigasyon
  const handlePrevImage = (e) => {
    e.stopPropagation();
    setSelectedIndex((prev) => {
      const newIdx = (prev - 1 + imageList.length) % imageList.length;
      setThumbPage(Math.floor(newIdx / THUMBNAILS_PER_PAGE));
      return newIdx;
    });
  };

  const handleNextImage = (e) => {
    e.stopPropagation();
    setSelectedIndex((prev) => {
      const newIdx = (prev + 1) % imageList.length;
      setThumbPage(Math.floor(newIdx / THUMBNAILS_PER_PAGE));
      return newIdx;
    });
  };

  // Lightbox Navigasyon
  const handleNextFullscreen = (e) => {
    e.stopPropagation();
    setFullscreenIndex((prev) => (prev + 1) % imageList.length);
  };

  const handlePrevFullscreen = (e) => {
    e.stopPropagation();
    setFullscreenIndex((prev) => (prev - 1 + imageList.length) % imageList.length);
  };

  return (
    <div className="w-full max-w-[1380px] mx-auto font-sans antialiased select-none">
      
      {/* 🏛️ 2 BAĞIMSIZ KARTLI MİZANPAAJ (SOL: İLAN KART HÜCRESİ | SAĞ: SATICI KART HÜCRESİ) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* =========================================================================
            🏛️ 1. SOL BAĞIMSIZ KART: İLAN DETAYLARI & ŞOVRUM (9 KOLON)
           ========================================================================= */}
        <div className="lg:col-span-9 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-7 shadow-sm space-y-6">
          
          {/* BÖLÜM 1: ÜST İLAN BAŞLIĞI VE LOKASYON BANT */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                {formData.title || `${formData.selectedYear || ''} ${formData.selectedBrand?.name || ''} ${formData.selectedSeries?.name || ''} ${formData.selectedModel?.name || ''}`}
              </h1>
              <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <span>📍 {formData.city || 'Aksaray'}, {formData.district || 'Ağaçören'}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  ✏️ Bilgileri Düzenle
                </button>
              )}
              <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg border border-indigo-100">
                OTO.CV Tescilli Karne
              </span>
            </div>
          </div>

          {/* BÖLÜM 2: YAN YANA İZGARA (SOL: 7 KOLON FOTOĞRAFLAR | SAĞ: 5 KOLON TEKNİK KÜNYE) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* 📸 SOL KOLON: BÜYÜTÜLMÜŞ VİTRİN & 5x2 THUMBNAIL IZGARASI (7 KOLON) */}
            <div className="md:col-span-7 space-y-4">
              
              {/* BÜYÜK FOTOĞRAF KUTUSU */}
              <div className="relative w-full h-[340px] sm:h-[420px] bg-slate-950 rounded-2xl overflow-hidden shadow-md flex items-center justify-center group">
                
                <img
                  src={imageList[selectedIndex]}
                  alt="Araç Vitrin Görseli"
                  className="w-full h-full object-contain object-center transition-all duration-200"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/placeholder-car.jpg';
                  }}
                />

                {/* Üzerinde İleri / Geri Navigasyon Okları */}
                {imageList.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrevImage}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xl transition-all shadow-md cursor-pointer active:scale-95"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={handleNextImage}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xl transition-all shadow-md cursor-pointer active:scale-95"
                    >
                      ›
                    </button>
                  </>
                )}

                {/* Sol Alt Fotoğraf Sayacı */}
                <div className="absolute bottom-3.5 left-3.5 bg-black/75 backdrop-blur text-white px-3 py-1 rounded-lg text-xs font-mono font-bold tracking-wider">
                  {selectedIndex + 1} / {imageList.length}
                </div>

                {/* Sağ Alt Tam Ekran Büyüteç Tetikleyici */}
                <button
                  type="button"
                  onClick={() => {
                    setFullscreenIndex(selectedIndex);
                    setIsFullscreen(true);
                  }}
                  className="absolute bottom-3.5 right-3.5 bg-black/75 hover:bg-black/90 text-white px-3.5 py-1.5 rounded-lg transition-all shadow-md cursor-pointer flex items-center gap-1.5 text-xs font-bold active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  </svg>
                  <span>Büyüt</span>
                </button>

              </div>

              {/* 5x2 DÜZENDE SABİT THUMBNAIL IZGARASI */}
              <div className="space-y-2.5">
                <div className="grid grid-cols-5 gap-2">
                  {currentThumbnails.map((url, localIdx) => {
                    const actualIdx = thumbPage * THUMBNAILS_PER_PAGE + localIdx;
                    const isSelected = selectedIndex === actualIdx;
                    return (
                      <button
                        key={actualIdx}
                        type="button"
                        onClick={() => setSelectedIndex(actualIdx)}
                        className={`h-16 sm:h-18 rounded-xl overflow-hidden border-2 bg-slate-900/5 relative transition-all cursor-pointer flex items-center justify-center p-1 ${
                          isSelected ? 'border-indigo-600 ring-2 ring-indigo-600/30 scale-102 shadow-xs' : 'border-slate-200/80 hover:border-slate-300 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <img 
                          src={url} 
                          alt={`Küçük Görsel ${actualIdx + 1}`} 
                          className="w-full h-full object-contain" 
                        />
                      </button>
                    );
                  })}
                </div>

                {/* MİNİMALİST ORTALANMIŞ SLIDER KONTROLCÜSÜ */}
                <div className="flex items-center justify-center pt-2 pb-1">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={thumbPage === 0 || totalPages <= 1}
                      onClick={() => setThumbPage(prev => Math.max(prev - 1, 0))}
                      className="w-8 h-8 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 rounded-lg flex items-center justify-center text-slate-700 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                      </svg>
                    </button>

                    <div className="flex items-center gap-2 px-1">
                      {Array.from({ length: Math.max(totalPages, 1) }).map((_, pIdx) => (
                        <div
                          key={pIdx}
                          onClick={() => totalPages > 1 && setThumbPage(pIdx)}
                          className={`rounded-full transition-all duration-200 ${
                            totalPages > 1 ? 'cursor-pointer' : 'cursor-default'
                          } ${
                            thumbPage === pIdx
                              ? 'w-3 h-3 bg-slate-600'
                              : 'w-2.5 h-2.5 bg-slate-300 hover:bg-slate-400'
                          }`}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      disabled={thumbPage === totalPages - 1 || totalPages <= 1}
                      onClick={() => setThumbPage(prev => Math.min(prev + 1, totalPages - 1))}
                      className="w-8 h-8 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 rounded-lg flex items-center justify-center text-slate-700 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  </div>
                </div>

              </div>

            </div>

            {/* 📋 2. SAĞ İÇ KOLON: DİJİTAL SKOR KARTUŞU & TEKNİK KÜNYE TABLOSU (5 KOLON) */}
            <div className="md:col-span-5 space-y-4">
              
              {/* OTO-CV DİJİTAL SKOR KARTUŞU */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white shadow-md relative overflow-hidden flex items-center justify-between">
                <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />

                <div className="space-y-0.5 z-10">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 font-mono">
                      KARNE PUANI
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Tescil Güven Rozeti
                  </p>
                </div>

                <div className="z-10 text-right">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black font-mono tracking-tight text-emerald-400">
                      {otocvScore}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">/ 100</span>
                  </div>
                </div>

              </div>

              {/* DARALTILMIŞ TEKNİK KÜNYE TABLOSU */}
              <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 space-y-2.5 shadow-2xs">
                
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    ARAÇ KÜNYESİ
                  </span>
                  <span className="text-[11px] font-black text-emerald-600 font-mono">
                    %100 Tescilli
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px] font-medium divide-y divide-slate-200/60">
                  <div className="flex justify-between py-1 pt-0.5">
                    <span className="text-slate-500">Tescil / İlan No</span>
                    <span className="font-mono font-bold text-indigo-600">CV-0699725</span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Marka</span>
                    <span className="font-bold text-slate-900">{formData.selectedBrand?.name || '-'}</span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Seri</span>
                    <span className="font-bold text-slate-900">{formData.selectedSeries?.name || '-'}</span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Model</span>
                    <span className="font-bold text-slate-900">{formData.selectedModel?.name || '-'}</span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Paket</span>
                    <span className="font-bold text-slate-900">{formData.selectedPackage?.name || '-'}</span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Yıl</span>
                    <span className="font-mono font-bold text-slate-900">{formData.selectedYear || '-'}</span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Kilometre</span>
                    <span className="font-mono font-bold text-slate-900">{activeKm} KM</span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Vites Tipi</span>
                    <span className="font-bold text-slate-900">{formData.transmission || '-'}</span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Yakıt Tipi</span>
                    <span className="font-bold text-slate-900">{formData.selectedFuel || '-'}</span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Kasa Tipi</span>
                    <span className="font-bold text-slate-900">{formData.bodyType || '-'}</span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Motor Hacmi</span>
                    <span className="font-bold text-slate-900">{formData.engineCapacity || '-'}</span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Renk</span>
                    <span className="font-bold text-slate-900">{formData.color?.name || formData.color || 'Gri'}</span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Plaka</span>
                    <span className="font-mono font-bold text-slate-900 uppercase">{activePlate}</span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Sahiplik</span>
                    <span className="font-bold text-slate-900">{formData.isFirstOwner || 'İlk Sahibi Değilim'}</span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Tramer Kaydı</span>
                    <span className="font-bold text-emerald-600">
                      {formData.tramerStatus === 'Tramer Var' ? `${formData.tramerAmount} TL` : 'Tramer Yok'}
                    </span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Garanti / Takas</span>
                    <span className="font-bold text-slate-900">{formData.warranty || 'Yok'} / {formData.swap || 'Hayır'}</span>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>

        {/* =========================================================================
            📞 2. SAĞ BAĞIMSIZ KART: SATICI & İLETİŞİM PANELİ (3 KOLON)
           ========================================================================= */}
        <div className="lg:col-span-3 space-y-4">
          
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-4 sticky top-20">
            
            {/* Profil Başlığı & Üyelik Rozeti */}
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5">
              <div className="w-12 h-12 rounded-full bg-slate-900 text-white font-black text-base flex items-center justify-center shrink-0 shadow-xs border border-slate-800">
                {sellerName.substring(0, 2).toUpperCase()}
              </div>
              <div className="space-y-0.5 overflow-hidden">
                <h3 className="text-base font-black text-slate-900 tracking-tight truncate">
                  {sellerName}
                </h3>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono">Bireysel Üye</span>
                  <span>• {memberSince}</span>
                </div>
              </div>
            </div>

            {/* İLETİŞİM AKSİYON BUTONLARI */}
            <div className="space-y-2.5">
              
              {/* 1. MASKELİ / TIKLAYINCA AÇILAN TELEFON BUTONU */}
              <button
                type="button"
                onClick={() => setShowPhone(!showPhone)}
                className="w-full bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-extrabold text-xs sm:text-sm py-3.5 px-4 rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.828-1.42-5.11-3.702-6.53-6.529l1.294-.97c.362-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                <span>
                  {showPhone ? sellerPhone : `Cep Telefonunu Göster`}
                </span>
              </button>

              {/* 2. MESAJ GÖNDER BUTONU */}
              <button
                type="button"
                onClick={() => alert("Mesaj modülü açılıyor...")}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm py-3 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 border border-slate-200/80"
              >
                <svg className="w-4 h-4 text-slate-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <span>Satıcıya Mesaj Gönder</span>
              </button>

            </div>

            {/* GÜVENLİK İPUCU */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-indigo-700 font-bold text-xs">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751A11.959 11.959 0 0112 2.714z" />
                </svg>
                <span>OTO.CV Güvenlik İpucu</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                Güvenliğiniz için aracı görmeden, ruhsat sahibini doğrulamadan kapora veya ödeme yapmayınız.
              </p>
            </div>

          </div>

        </div>

      </div>

      {/* 🚀 LIGHTBOX GALERİ MODALI */}
      {isFullscreen && imageList.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fadeIn">
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="absolute top-6 right-6 z-50 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full transition-colors active:scale-95 text-xs font-bold cursor-pointer"
          >
            ✕ Kapat
          </button>

          {imageList.length > 1 && (
            <button
              type="button"
              onClick={handlePrevFullscreen}
              className="absolute left-6 z-50 bg-white/10 hover:bg-white/20 text-white w-10 h-10 rounded-full transition-colors flex items-center justify-center font-bold text-md cursor-pointer"
            >
              ‹
            </button>
          )}

          <div className="max-w-5xl max-h-[85vh] flex items-center justify-center overflow-hidden">
            <img
              src={imageList[fullscreenIndex]}
              alt="Sonsuz Galeri Görseli"
              className="max-w-full max-h-[85vh] object-contain"
            />
          </div>

          {imageList.length > 1 && (
            <button
              type="button"
              onClick={handleNextFullscreen}
              className="absolute right-6 z-50 bg-white/10 hover:bg-white/20 text-white w-10 h-10 rounded-full transition-colors flex items-center justify-center font-bold text-md cursor-pointer"
            >
              ›
            </button>
          )}

          <div className="absolute bottom-6 bg-white/10 text-white text-xs font-mono font-bold px-3 py-1.5 rounded-full">
            {fullscreenIndex + 1} / {imageList.length}
          </div>
        </div>
      )}

    </div>
  );
}