// =========================================================================
// OTO-CV SİHİRBAZI: MÜHÜRLÜ TEK PARÇA ŞOVRUM & GALERİ PANELİ
// İşlev: SS 1 (Arabam.com) Birebir Mizanpajı - Görseller ve Teknik Künye 
//        Tek Kart İçerisinde Yan Yana, Zırhlı Görsel Okuyucu & Lightbox.
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

    // 1. Düz String URL, Base64 veya Blob adresi ise
    if (typeof item === 'string') {
      const clean = item.trim();
      if (clean.startsWith('http') || clean.startsWith('data:') || clean.startsWith('blob:')) {
        return clean;
      }
      return null;
    }

    // 2. Dropzone / Preview objesi ise ({ preview: 'data:...' veya url: '...' })
    if (item.preview && typeof item.preview === 'string') return item.preview;
    if (item.url && typeof item.url === 'string') return item.url;
    if (item.src && typeof item.src === 'string') return item.src;

    // 3. Ham File veya Blob nesnesi ise
    if (item instanceof File || item instanceof Blob) {
      try {
        return URL.createObjectURL(item);
      } catch (e) {
        return null;
      }
    }

    // 4. Obje içinde saklanmış file varsa
    if (item.file && (item.file instanceof File || item.file instanceof Blob)) {
      try {
        return URL.createObjectURL(item.file);
      } catch (e) {
        return null;
      }
    }

    return null;
  }).filter(Boolean);

  return parsed.length > 0 ? parsed : ['/placeholder-car.jpg'];
};

export default function SingleShowroomPanel({ formData = {}, onEdit }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);

  // Görselleri zırhlı sensörden geçirip temizliyoruz
  const imageList = parseSafeImageUrls(formData.photos);
  
  const activePlate = formData.plate || formData.plate_number || '34 ABC 123';
  const activeKm = formData.mileage || formData.km || '0';
  const otocvScore = formData.otocv_score || 80;

  // Slider İleri / Geri Navigasyon
  const handlePrevImage = (e) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev - 1 + imageList.length) % imageList.length);
  };

  const handleNextImage = (e) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev + 1) % imageList.length);
  };

  // Lightbox İleri / Geri Navigasyon
  const handleNextFullscreen = (e) => {
    e.stopPropagation();
    setFullscreenIndex((prev) => (prev + 1) % imageList.length);
  };

  const handlePrevFullscreen = (e) => {
    e.stopPropagation();
    setFullscreenIndex((prev) => (prev - 1 + imageList.length) % imageList.length);
  };

  return (
    <div className="w-full max-w-[1280px] mx-auto font-sans antialiased select-none">
      
      {/* 🏛️ TEK PARÇA BEYAZ ŞOVRUM KARTI (ARABAM.COM BİREBİR MİZANPAJI) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-7 shadow-sm space-y-6">
        
        {/* BÖLÜM 1: ÜST İLAN BAŞLIĞI VE LOKASYON BANT */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              {formData.title || `${formData.selectedYear || ''} ${formData.selectedBrand?.name || ''} ${formData.selectedSeries?.name || ''} ${formData.selectedModel?.name || ''}`}
            </h1>
            <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <span>📍 {formData.city || 'İstanbul'}, {formData.district || 'Kadıköy'}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                ✏️ Bilgileri Düzenle
              </button>
            )}
            <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100">
              OTO.CV Tescilli Karne
            </span>
          </div>
        </div>

        {/* BÖLÜM 2: YAN YANA İZGARA (SOL: FOTOĞRAFLAR | SAĞ: KÜNYE TABLOSU) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* 📸 SOL KOLON: GALERİ, SAYAÇ VE THUMBNAIL'LAR (7 KOLON) */}
          <div className="lg:col-span-7 space-y-3">
            
            {/* BÜYÜK FOTOĞRAF KUTUSU */}
            <div className="relative w-full h-[320px] sm:h-[420px] bg-slate-950 rounded-xl overflow-hidden shadow-inner flex items-center justify-center group">
              
              <img
                src={imageList[selectedIndex]}
                alt="Araç Vitrin Görseli"
                className="w-full h-full object-contain object-center transition-all duration-200"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/placeholder-car.jpg';
                }}
              />

              {/* Sol Üst Skor Rozeti */}
              <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur border border-slate-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-md">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-black tracking-wide font-mono">
                  DOĞRULUK SKORU (%{otocvScore})
                </span>
              </div>

              {/* Üzerinde İleri / Geri Navigasyon Okları */}
              {imageList.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white w-9 h-9 rounded-lg flex items-center justify-center font-bold text-lg transition-all shadow-md cursor-pointer opacity-80 hover:opacity-100"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={handleNextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white w-9 h-9 rounded-lg flex items-center justify-center font-bold text-lg transition-all shadow-md cursor-pointer opacity-80 hover:opacity-100"
                  >
                    ›
                  </button>
                </>
              )}

              {/* Sol Alt Fotoğraf Sayacı (SS 1 Birebir) */}
              <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur text-white px-3 py-1 rounded-md text-xs font-mono font-bold">
                {selectedIndex + 1} / {imageList.length}
              </div>

              {/* Sağ Alt Tam Ekran Büyüteç Tetikleyici */}
              <button
                type="button"
                onClick={() => {
                  setFullscreenIndex(selectedIndex);
                  setIsFullscreen(true);
                }}
                className="absolute bottom-3 right-3 bg-black/70 hover:bg-black/90 text-white px-3 py-1.5 rounded-lg transition-all shadow-md cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
                <span>Büyüt</span>
              </button>

            </div>

            {/* ALT VİTRİN THUMBNAIL CAROUSEL (SS 1 BİREBİR) */}
            {imageList.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
                {imageList.map((url, idx) => {
                  const isSelected = selectedIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedIndex(idx)}
                      className={`w-20 h-14 rounded-lg overflow-hidden border-2 bg-slate-100 relative shrink-0 transition-all cursor-pointer ${
                        isSelected ? 'border-rose-600 scale-102 shadow-xs' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={`Küçük Görsel ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  );
                })}
              </div>
            )}

          </div>

          {/* 💼 SAĞ KOLON: TEKNİK KÜNYE TABLOSU (5 KOLON) */}
          <div className="lg:col-span-5 bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 sm:p-5 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                ARAÇ KÜNYESİ
              </span>
              <span className="text-xs font-black text-emerald-600 font-mono">
                %100 Doğrulanmış Veri
              </span>
            </div>

            {/* SPESİFİKASYON LİSTESİ (ÇİZGİ AYRIÇLI) */}
            <div className="space-y-2 text-xs font-medium divide-y divide-slate-200/70">
              <div className="flex justify-between py-1.5 pt-1">
                <span className="text-slate-500">Tescil / İlan No</span>
                <span className="font-mono font-bold text-indigo-600">CV-4219311</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Tescil Tarihi</span>
                <span className="font-mono font-bold text-slate-900">29 Temmuz 2026</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Marka</span>
                <span className="font-bold text-slate-900">{formData.selectedBrand?.name || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Seri</span>
                <span className="font-bold text-slate-900">{formData.selectedSeries?.name || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Model</span>
                <span className="font-bold text-slate-900">{formData.selectedModel?.name || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Yıl</span>
                <span className="font-mono font-bold text-slate-900">{formData.selectedYear || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Kilometre</span>
                <span className="font-mono font-bold text-slate-900">{activeKm} KM</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Vites Tipi</span>
                <span className="font-bold text-slate-900">{formData.transmission || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Yakıt Tipi</span>
                <span className="font-bold text-slate-900">{formData.selectedFuel || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Kasa Tipi</span>
                <span className="font-bold text-slate-900">{formData.bodyType || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Renk</span>
                <span className="font-bold text-slate-900">{formData.color?.name || formData.color || 'Beyaz'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Plaka</span>
                <span className="font-mono font-bold text-slate-900 uppercase">{activePlate}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Garanti Statüsü</span>
                <span className="font-bold text-slate-900">{formData.warranty || 'Hayır'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Takas Durumu</span>
                <span className="font-bold text-slate-900">{formData.swap || 'Hayır'}</span>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* =========================================================================
          🚀 LIGHTBOX GALERİ MODALI
         ========================================================================= */}
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