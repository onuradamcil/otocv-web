// =========================================================================
// OTO-CV SİHİRBAZI: MÜHÜRLÜ KURUMSAL ŞOVRUM & DETAYLI İLAN PANELLERİ
// İşlev: Sahibinden / Arabam.com Birebir Mizanpajı - İki Katmanlı Sticky Header,
//        Dinamik Donanım Matrisi, Statik SVG ve Akıllı Bakım Sicili Paneli.
// =========================================================================

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../../../context/ToastContext';
import Icon from '../../common/icons';
import FaturaOnizleme from '../../common/FaturaOnizleme';
// Hasar katalogu ORTAK. Bu iki sabit eskiden uc dosyada ayri ayri tanimliydi
// ve birbirinden kaymisti: ayni parca iki farkli isimle, ayni durum iki farkli
// etiketle gorunuyordu. Gerekce: src/data/hasarKatalogu.js
import { CAR_PARTS, DAMAGE_STATUSES } from '../../../data/hasarKatalogu';
import { tramerVarMi } from '../../../utils/tramerHelper';
import { parseVehicleDate, formatTrDate } from '../../../utils/dateHelper';

// =========================================================================
// 🎨 SABİTLER VE YARDIMCI FONKSİYONLAR
// =========================================================================

// Hasar Durumu Renk & Etiket Haritası
// Kaporta Parçaları Listesi
// 📋 MASTER DONANIM KATALOĞU
const FEATURE_CATALOG = [
  {
    category: 'Güvenlik',
    items: [
      'ABS',
      'ESP / VSA (Elektronik Denge)',
      'Hava Yastığı (Sürücü)',
      'Hava Yastığı (Yolcu)',
      'Hava Yastığı (Yan)',
      'Hava Yastığı (Tavan)',
      'Isofix',
      'Yokuş Kalkış Desteği',
      'Lastik Basınç Kontrolü',
      'Merkezi Kilit',
      'Kör Nokta Uyarısı',
      'Şerit Takip Sistemi',
      'Fren Yardım Sistemi (Brake Assist)'
    ]
  },
  {
    category: 'İç Donanım',
    items: [
      'Klima (Analog)',
      'Klima (Dijital)',
      'Deri / Kumaş Koltuk',
      'Elektrikli Ön Camlar',
      'Elektrikli Arka Camlar',
      'Ön Kol Dayama',
      'Soğutmalı Torpido',
      'Start / Stop',
      'Yol Bilgisayarı',
      'Derinlik ve Yükseklik Ayarlı Direksiyon',
      'Koltuk Isıtma',
      'Hayalet Ekran'
    ]
  },
  {
    category: 'Dış Donanım',
    items: [
      'Yan Aynalar - Isıtmalı',
      'Yan Aynalar - Otomatik Kararan',
      'Yan Aynalar - Elektrikli Katlanır',
      'LED Matrix Farlar',
      'Far Sensörü',
      'Yağmur Sensörü',
      'Park Sensörü (Ön)',
      'Park Sensörü (Arka)',
      'Geri Görüş Kamerası',
      'Panoramik Cam Tavan / Sunroof',
      'Alaşım Jant'
    ]
  },
  {
    category: 'Multimedya & Konfor',
    items: [
      'Hız Sabitleme Sistemi (Cruise Control)',
      'Adaptif Hız Sabitleyici',
      'Kablosuz Şarj',
      'Bluetooth / Telefon Bağlantısı',
      'Dokunmatik Multimedya Ekranı',
      'Elektrikli Bagaj Kapama',
      'Keyless Go (Anahtarsız Çalıştırma)',
      'Navigasyon'
    ]
  }
];

// Görsel Sensörü (Bozuk Link Temizleyici)
const parseSafeImageUrls = (rawPhotos) => {
  if (!rawPhotos) return ['/placeholder-car.jpg'];
  let items = [];
  if (Array.isArray(rawPhotos)) items = rawPhotos;
  else if (typeof rawPhotos === 'string') items = rawPhotos.split(',').map(s => s.trim());
  else items = [rawPhotos];

  const parsed = items.map((item) => {
    if (!item) return null;
    if (typeof item === 'string') {
      const clean = item.trim();
      if (clean.startsWith('http') || clean.startsWith('data:') || clean.startsWith('blob:')) return clean;
      return null;
    }
    if (item.preview && typeof item.preview === 'string') return item.preview;
    if (item.url && typeof item.url === 'string') return item.url;
    if (item.src && typeof item.src === 'string') return item.src;
    if (item instanceof File || item instanceof Blob) {
      try { return URL.createObjectURL(item); } catch (e) { return null; }
    }
    return null;
  }).filter(Boolean);

  return parsed.length > 0 ? parsed : ['/placeholder-car.jpg'];
};

// ⏱️ GİZLİLİK ODAKLI TARİH KONTROL SENSÖRÜ
const getDynamicStatus = (dateInput, validLabel = 'Geçerli') => {
  if (!dateInput) return { text: 'Belirtilmemiş', class: 'text-slate-500 font-medium' };

  const dateStr = String(dateInput).trim();
  const today = new Date();

  if (/^\d{4}$/.test(dateStr)) {
    const yearVal = parseInt(dateStr, 10);
    if (yearVal >= today.getFullYear()) {
      return { text: validLabel, class: 'text-emerald-700 font-bold' };
    }
    return { text: 'Süresi Dolmuş', class: 'text-rose-600 font-bold' };
  }

  // Kendi ayristiricisi yerine tek kaynak kullaniliyor.
  // Onceki hali ISO tarihi (veritabani 'date' kolonu artik ISO donduruyor)
  // new Date('2027-12-12') ile ayristiriyordu; o ifade UTC gece yarisi demek
  // ve saat dilimine gore gunu kaydirabiliyor. parseVehicleDate ISO'yu yerel
  // bilesenlerden kuruyor.
  const parsedDate = parseVehicleDate(dateStr);

  if (!parsedDate || isNaN(parsedDate.getTime())) {
    return { text: 'Belirtilmemiş', class: 'text-slate-500 font-medium' };
  }

  if (parsedDate >= today) {
    return { text: validLabel, class: 'text-emerald-700 font-bold' };
  } else {
    return { text: 'Süresi Dolmuş', class: 'text-rose-600 font-bold' };
  }
};

// =========================================================================
// 🚀 ANA BİLEŞEN: SINGLE SHOWROOM PANEL
// =========================================================================
export default function Step4PreviewAndPublish({ formData = {}, updateFormData, onBack, onEdit, onSuccess, user = {} }) {
  const toast = useToast();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [thumbPage, setThumbPage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  
  // `showPhone` kaldırıldı: telefon açma düğmesiyle birlikte gitti.
  const [activeSection, setActiveSection] = useState('sec-description');
  const [isSticky, setIsSticky] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // Akerdiyon ve Fatura Lightbox State'i
  const [expandedTileIndex, setExpandedTileIndex] = useState(0);
  const [invoiceModalUrl, setInvoiceModalUrl] = useState(null);

  const navRef = useRef(null);

  const imageList = parseSafeImageUrls(formData.photos);
  const activeKm = formData.mileage || formData.km || '0';
  // NOT: `otocvScore` değişkeni kaldırıldı. Eskiden `formData.otocv_score || 92`
  // idi ve `otocv_score` hiçbir yerde set edilmediği için HER ZAMAN 92 basıyordu.
  // Kullanıcı ön izlemede 92 görüp yayımlıyor, sonra gerçek puanı (örneğin 45)
  // görüyordu. Ön izleme, yayımlanacak şeyi göstermek zorunda; bilmediğimiz bir
  // sayıyı göstermemeli. Puan yayımdan sonra veritabanında hesaplanıyor.

  // ⚠ ÜÇ UYDURMA ALAN KALDIRILDI — yukarıdaki "her zaman 92" hatasının aynısı:
  //     sellerName  = ... || 'Onur Adamcil'      (yedek olarak SABİT bir isim)
  //     sellerPhone = ... || '0 (532) 123 45 67' (uydurma telefon)
  //     memberSince = 'Mart 2026'                (her kullanıcıda sabit)
  //
  // Bunlar sağdaki "satıcı & iletişim" kartını besliyordu. Kart araç detay
  // sayfasından da kaldırıldı: telefon numarası araç sahibine ulaşmanın en
  // doğrudan yolu ve o kanal, plakanın kaldırılmasıyla aynı gerekçeyle
  // kapalı. Dolayısıyla ön izlemenin bu paneli göstermesi çifte hataydı —
  // hem uydurma veri, hem de yayımdan sonra var olmayacak bir panel.
  const damageReport = formData.damage_report || formData.damageReport || {};

  // Kullanıcının Seçtiği Donanımlar
  const userSelectedFeatures = Array.isArray(formData.selectedFeatures) 
    ? formData.selectedFeatures 
    : (Array.isArray(formData.features) ? formData.features : []);

  // Kataloğumuzda olmayan ekstra donanımları yakalama
  const catalogFlatItems = FEATURE_CATALOG.flatMap(cat => cat.items.map(i => String(i).trim().toLowerCase()));
  const extraFeatures = userSelectedFeatures.filter(
    sf => !catalogFlatItems.includes(String(sf).trim().toLowerCase())
  );

  const THUMBNAILS_PER_PAGE = 10;
  const totalPages = Math.ceil(imageList.length / THUMBNAILS_PER_PAGE);
  const currentThumbnails = imageList.slice(
    thumbPage * THUMBNAILS_PER_PAGE,
    (thumbPage + 1) * THUMBNAILS_PER_PAGE
  );

  // Servis Kayıtları ve Tutar Hesabı
  const rawServiceRecords = formData.service_records || formData.service_history || [];
  
  const totalMaintenanceCost = rawServiceRecords.reduce((sum, item) => {
    let costVal = 0;
    if (typeof item.cost === 'number') {
      costVal = item.cost;
    } else if (typeof item.cost === 'string') {
      const cleanCost = item.cost.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
      costVal = parseFloat(cleanCost) || 0;
    }
    return sum + costVal;
  }, 0);

  const formattedTotalCost = `${totalMaintenanceCost.toLocaleString('tr-TR')} TL`;

  // ⚙️ TEK VE TEMİZ SCROLL KONTROLCÜSÜ (89px Offset Hizalı)
  useEffect(() => {
    const handleScroll = () => {
      if (navRef.current) {
        const top = navRef.current.getBoundingClientRect().top;
        setIsSticky(top <= 91);
      }

      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);

    const sections = ['sec-description', 'sec-damage', 'sec-info', 'sec-features', 'sec-service'];
    const observerOptions = {
      root: null,
      rootMargin: '-190px 0px -40% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    if (sectionId === 'sec-service') {
      setExpandedTileIndex(0);
    }
    const el = document.getElementById(sectionId);
    if (el) {
      const yOffset = -190;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  // 🛠️ KAPORTA PARÇALARI GRUPLAMA FONKSİYONU VE DEĞİŞKENİ (BURAYA EKLENDİ)
  const getGroupedParts = () => {
    const grouped = { ORIGINAL: [], PAINTED: [], LOCAL_PAINTED: [], CHANGED: [], UNSPECIFIED: [] };
    CAR_PARTS.forEach((part) => {
      const status = damageReport[part.id] || 'ORIGINAL';
      if (grouped[status]) grouped[status].push(part.name);
      else grouped.ORIGINAL.push(part.name);
    });
    return grouped;
  };

  const groupedParts = getGroupedParts();

  return (
    <div className="w-full max-w-[1280px] mx-auto font-sans antialiased select-none space-y-4 relative">
      
      {/* 📜 2. ADIM: ARKA PLAN ÇAPRAZ FİLİGRAN (WATERMARK) KATMANI (ONARILMIŞ ÖN KATMAN) */}
      <div className="absolute inset-0 pointer-events-none select-none z-30 overflow-hidden flex flex-col justify-around opacity-[0.05] space-y-32 py-20">
        <div className="rotate-[-25deg] whitespace-nowrap text-slate-900 font-black text-4xl sm:text-6xl tracking-widest uppercase">
          OTO.CV TESCİL ÖN İZLEME • RESMİ GEÇERLİLİĞİ YOKTUR • OTO.CV TESCİL ÖN İZLEME
        </div>
        <div className="rotate-[-25deg] whitespace-nowrap text-slate-900 font-black text-4xl sm:text-6xl tracking-widest uppercase">
          OTO.CV TESCİL ÖN İZLEME • RESMİ GEÇERLİLİĞİ YOKTUR • OTO.CV TESCİL ÖN İZLEME
        </div>
        <div className="rotate-[-25deg] whitespace-nowrap text-slate-900 font-black text-4xl sm:text-6xl tracking-widest uppercase">
          OTO.CV TESCİL ÖN İZLEME • RESMİ GEÇERLİLİĞİ YOKTUR • OTO.CV TESCİL ÖN İZLEME
        </div>
        <div className="rotate-[-25deg] whitespace-nowrap text-slate-900 font-black text-4xl sm:text-6xl tracking-widest uppercase">
          OTO.CV TESCİL ÖN İZLEME • RESMİ GEÇERLİLİĞİ YOKTUR • OTO.CV TESCİL ÖN İZLEME
        </div>
      </div>
      
      {/* 🛡️ KURUMSAL DİJİTAL KARNE ÖN İZLEME & BİLGİ GÜNCELLEME BANTI */}
      <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md border border-slate-800 relative z-20 overflow-hidden">
        
        {/* Sol Taraf: Rozet, İkon ve Açıklama */}
        <div className="flex items-center gap-3.5 z-10">
          <div className="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-extrabold tracking-tight text-white">
                DİJİTAL KARNE ÖN İZLEME MODU
              </h4>
              <span className="text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded">
                Tescil Öncesi
              </span>
            </div>
            <p className="text-xs text-slate-300 font-normal leading-relaxed">
              Bu ekran tescil öncesi canlı simülasyondur. Bilgilerde eksik veya düzeltme varsa önceki adımlara dönebilirsiniz.
            </p>
          </div>
        </div>

        {/* Sağ Taraf: Önceki Adıma Dön / Bilgileri Düzenle Butonu */}
        <div className="w-full sm:w-auto shrink-0 z-10 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
          <button
            type="button"
            onClick={onEdit || (() => window.history.back())}
            className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white rounded-lg text-xs font-extrabold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 border border-indigo-500/50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
            </svg>
            <span>Bilgileri Düzenle</span>
          </button>
        </div>

      </div>

      {/* ANA İÇERİK + SİCİL ÖZETİ
          `items-start` kaldırıldı: sağdaki sütun içeriği kadar yükselince
          içindeki `sticky` kartın hareket alanı kalmıyor ve kart ilk ekranda
          kayboluyordu. Araç detay sayfasındaki aynı hatanın kopyası. */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 relative z-20">
        
        {/* SOL ANA KONTEYNER (9 KOLON) */}
        <div className="lg:col-span-9 space-y-5">
          
          {/* PANEL 1: GALERİ VE KÜNYE */}
          <div className="bg-white border border-slate-200 rounded-md p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                  {formData.title || `${formData.selectedYear || ''} ${formData.selectedBrand?.name || ''} ${formData.selectedSeries?.name || ''} ${formData.selectedModel?.name || ''}`}
                </h1>
                <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                  <Icon name="konum" size="sm" />
                  <span>{formData.city || 'Aksaray'}, {formData.district || 'Ağaçören'}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                {onEdit && (
                  <button type="button" onClick={onEdit} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200/80">
                    <Icon name="duzenle" size="sm" />
                    Bilgileri Düzenle
                  </button>
                )}
                <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-md border border-indigo-100">
                  OTO.CV Tescilli Karne
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              {/* SOL: GALERİ */}
              <div className="md:col-span-8 space-y-3">
                <div className="relative w-full h-[380px] sm:h-[460px] bg-slate-100/90 border border-slate-200 rounded-md overflow-hidden flex items-center justify-center group">
                  <img src={imageList[selectedIndex]} alt="Araç Vitrini" className="w-full h-full object-contain object-center transition-all duration-200" onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-car.jpg'; }} />
                  {imageList.length > 1 && (
                    <>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedIndex((prev) => (prev - 1 + imageList.length) % imageList.length); }} className="absolute left-2.5 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white w-8 h-8 rounded flex items-center justify-center font-bold text-lg cursor-pointer">‹</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedIndex((prev) => (prev + 1) % imageList.length); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white w-8 h-8 rounded flex items-center justify-center font-bold text-lg cursor-pointer">›</button>
                    </>
                  )}
                  <div className="absolute bottom-2.5 left-2.5 bg-slate-900/80 backdrop-blur text-white px-2.5 py-1 rounded text-[11px] font-mono font-bold">{selectedIndex + 1} / {imageList.length}</div>
                  <button type="button" onClick={() => { setFullscreenIndex(selectedIndex); setIsFullscreen(true); }} className="absolute bottom-2.5 right-2.5 bg-slate-900/80 hover:bg-slate-900 text-white px-2.5 py-1 rounded cursor-pointer flex items-center gap-1.5 text-[11px] font-bold">
                    <span>Büyüt</span>
                  </button>
                </div>

                <div className="bg-slate-50/60 border border-slate-200/80 rounded-md p-2 sm:p-2.5 space-y-2">
                  <div className="grid grid-cols-5 gap-1.5 min-h-[136px] sm:min-h-[152px] content-start">
                    {Array.from({ length: THUMBNAILS_PER_PAGE }).map((_, localIdx) => {
                      const actualIdx = thumbPage * THUMBNAILS_PER_PAGE + localIdx;
                      const url = currentThumbnails[localIdx];
                      if (!url) return <div key={`empty-${localIdx}`} className="h-16 sm:h-18 opacity-0 pointer-events-none" />;
                      return (
                        <button key={actualIdx} type="button" onClick={() => setSelectedIndex(actualIdx)}
                          aria-label={`${actualIdx + 1}. fotoğrafı göster`}
                          aria-current={selectedIndex === actualIdx ? 'true' : undefined} className={`h-16 sm:h-18 rounded overflow-hidden border bg-white relative cursor-pointer flex items-center justify-center p-0.5 ${selectedIndex === actualIdx ? 'border-indigo-600 ring-2 ring-indigo-600/30' : 'border-slate-200 opacity-85 hover:opacity-100'}`}>
                          <img src={url} alt="" className="w-full h-full object-contain" />
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-center pt-1.5 border-t border-slate-200/60">
                    <div className="flex items-center gap-3">
                      <button type="button" disabled={thumbPage === 0} onClick={() => setThumbPage(p => Math.max(p - 1, 0))} className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-200/90 rounded text-slate-700 cursor-pointer disabled:opacity-30">‹</button>
                      <div className="flex gap-2 px-1">
                        {Array.from({ length: Math.max(totalPages, 1) }).map((_, pIdx) => (
                          <div key={pIdx} onClick={() => totalPages > 1 && setThumbPage(pIdx)} className={`rounded-full ${totalPages > 1 ? 'cursor-pointer' : ''} ${thumbPage === pIdx ? 'w-2.5 h-2.5 bg-slate-700' : 'w-2 h-2 bg-slate-300'}`} />
                        ))}
                      </div>
                      <button type="button" disabled={thumbPage === totalPages - 1 || totalPages <= 1} onClick={() => setThumbPage(p => Math.min(p + 1, totalPages - 1))} className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-200/90 rounded text-slate-700 cursor-pointer disabled:opacity-30">›</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SAĞ: KÜNYE (STEP 4 ÖN İZLEME SENKRONİZE MATRİSİ) */}
              <div className="md:col-span-4 space-y-3">
                <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-md p-3.5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      <span className="text-[11px] font-extrabold uppercase text-slate-700 font-mono">SİCİL PUANI</span>
                    </div>
                    {/* Eskiden burada sabit 92 yazıyordu ve altında "Tescil Güven
                        Rozeti" ibaresi vardı. İkisi de yanlıştı: puan hesaplanmış
                        değildi ve "tescil" hiçbir yerde doğrulanmıyordu. Puan
                        yayımdan sonra veritabanında, gerçek veriden hesaplanıyor. */}
                    <p className="text-[11px] text-slate-500 font-medium">Yayımdan sonra hesaplanır</p>
                  </div>
                  <div className="text-right flex items-baseline gap-0.5">
                    <span className="text-2xl font-black font-mono text-slate-400">—</span>
                    <span className="text-xs font-bold text-slate-400 font-mono">/100</span>
                  </div>
                </div>

                <div className="bg-slate-50/80 border border-slate-200 rounded-md p-3.5 space-y-2">
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-[11px] font-black text-slate-900 uppercase">ARAÇ KÜNYESİ</span>
                    <span className="text-[11px] font-black text-emerald-600 font-mono">%100 Tescilli</span>
                  </div>
                  
                  <div className="space-y-1.5 text-xs divide-y divide-slate-200/70">
                    <div className="flex justify-between py-1 pt-0.5">
                      <span className="text-slate-900 font-medium">Tescil / İlan No</span>
                      <span className="font-mono font-semibold text-indigo-600 select-all">CV-TASLAK</span>
                    </div>
                    
                    {/* 🗓️ KAYIT TARİHİ (ÖN İZLEME ANLIK TARİHİ) */}
                    <div className="flex justify-between py-1">
                      <span className="text-slate-900 font-medium">Kayıt Tarihi</span>
                      <span className="font-mono text-slate-800 font-medium">
                        {new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-slate-900 font-medium">Marka</span>
                      <span className="text-slate-800 font-normal">{formData.selectedBrand?.name || formData.selectedBrand || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-900 font-medium">Seri</span>
                      <span className="text-slate-800 font-normal">{formData.selectedSeries?.name || formData.selectedSeries || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-900 font-medium">Model</span>
                      <span className="text-slate-800 font-normal">{formData.selectedModel?.name || formData.selectedModel || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-900 font-medium">Paket</span>
                      <span className="text-slate-800 font-normal">{formData.selectedPackage?.name || formData.selectedPackage || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-900 font-medium">Yıl</span>
                      <span className="font-mono text-slate-800 font-normal">{formData.selectedYear || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-900 font-medium">Kilometre</span>
                      <span className="font-mono text-slate-800 font-normal">{activeKm} KM</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-900 font-medium">Vites Tipi</span>
                      <span className="text-slate-800 font-normal">{formData.transmission || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-900 font-medium">Yakıt Tipi</span>
                      <span className="text-slate-800 font-normal">{formData.selectedFuel || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-900 font-medium">Kasa Tipi</span>
                      <span className="text-slate-800 font-normal">{formData.bodyType || '-'}</span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-slate-900 font-medium">Motor Hacmi</span>
                      <span className="text-slate-800 font-normal">
                        {formData.engineCapacity || formData.engine_capacity || '-'}
                      </span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-slate-900 font-medium">Renk</span>
                      <span className="text-slate-800 font-normal capitalize">
                        {typeof formData.color === 'object' ? (formData.color?.name || 'Belirtilmedi') : (formData.color || 'Belirtilmedi')}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-900 font-medium">Plaka Durumu</span>
                      <span className="font-mono text-slate-800 font-semibold text-[11px] uppercase bg-slate-200/60 px-1.5 py-0.5 rounded">TR (Gizlenmiş)</span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-slate-900 font-medium">Sahiplik</span>
                      <span className="text-slate-800 font-normal">{formData.isFirstOwner || 'İlk Sahibi Değilim'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-900 font-medium">Tramer Kaydı</span>
                      <span className="text-emerald-600 font-medium">
                        {tramerVarMi(formData) ? `${formData.tramerAmount || 0} TL` : 'Tramer Yok'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-900 font-medium">Garanti / Takas</span>
                      <span className="text-slate-800 font-normal">{formData.warranty || 'Yok'} / {formData.swap || 'Hayır'}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* PANEL 2: DETAYLAR KARTI (STICKY HEADER) */}
          <div className="bg-white border border-slate-200 rounded-md shadow-2xs relative">
            
            {/* 📡 GÖRÜNMEZ SENSÖR */}
            <div ref={navRef} className="absolute -top-px left-0 w-full h-[1px] opacity-0 pointer-events-none" />

            {/* 📌 YAPIŞKAN (STICKY TOP BANNER) - TAM HİZALANDI (top-[89px]) */}
            <div className="sticky top-[89px] z-25 bg-white border-b border-slate-200 shadow-sm flex flex-col w-full transition-all duration-300">
              
              {/* ÜST KATMAN: Araç Resmi & Başlığı (Sığdırılmış Görsel & Ferah Tipografi) */}
              <div className={`w-full flex items-center justify-between px-4 sm:px-6 transition-all duration-300 overflow-hidden bg-slate-50/95 backdrop-blur-md ${isSticky ? 'h-[76px] sm:h-[80px] border-b border-slate-200/90 opacity-100' : 'h-0 opacity-0 border-transparent'}`}>
                <div className="flex items-center gap-4 min-w-0 py-2">
                  
                  {/* Fotoğraf Çerçevesi: object-contain ile tam sığdırma */}
                  <div className="w-18 h-12 sm:w-20 sm:h-13 rounded-lg overflow-hidden bg-slate-200/60 border border-slate-300/80 shrink-0 shadow-2xs flex items-center justify-center p-0.5 relative">
                    <img 
                      src={imageList[0]} 
                      alt="Kapak" 
                      className="w-full h-full object-contain object-center" 
                      onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-car.jpg'; }}
                    />
                  </div>

                  {/* Araç Başlığı, Tescil Rozeti ve Araç Metaları */}
                  <div className="flex flex-col min-w-0 justify-center gap-1.5">
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight leading-snug truncate max-w-[280px] sm:max-w-[520px]">
                      {formData.title || `${formData.selectedBrand?.name || ''} ${formData.selectedSeries?.name || ''} ${formData.selectedModel?.name || ''}`}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      
                      <span className="text-xs text-slate-600 font-semibold font-mono leading-none hidden sm:inline">
                         {formData.selectedYear || ''} • {activeKm} KM
                      </span>
                    </div>
                  </div>

                </div>

                {/* Sağ Taraf: Karne Rozet Puanı */}
                <div className="hidden sm:flex items-center gap-2 shrink-0 py-2">
                  <div className="bg-white border border-slate-200/90 px-3.5 py-1.5 rounded-lg flex items-center gap-2 shadow-2xs">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase font-mono tracking-wider leading-none">KARNE PUANI</span>
                    <span className="text-xs sm:text-sm font-black font-mono text-slate-400 leading-none">—/100</span>
                  </div>
                </div>
              </div>

              {/* ALT KATMAN: Sekmeler Barı */}
              <div className="w-full flex items-center overflow-x-auto scrollbar-none px-5 bg-white">
                {[
                  { id: 'sec-description', label: 'Açıklama' },
                  { id: 'sec-damage', label: 'Boya ve Değişen' },
                  { id: 'sec-info', label: 'Araç Bilgileri' },
                  { id: 'sec-features', label: 'Donanım' },
                  { id: 'sec-service', label: 'Bakım Kayıtları' },
                ].map((tab) => {
                  const isActive = activeSection === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => scrollToSection(tab.id)}
                      className={`py-3.5 mr-6 sm:mr-8 text-[13px] font-bold transition-all cursor-pointer select-none whitespace-nowrap border-b-[3px] outline-none ${
                        isActive
                          ? 'border-rose-600 text-rose-600'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PANEL 2 İÇERİK BÖLÜMLERİ */}
            <div className="p-5 sm:p-7 space-y-12 divide-y divide-slate-100">
              
              {/* 1. BÖLÜM: AÇIKLAMA */}
              <div id="sec-description" className="space-y-3 pt-2 scroll-mt-32">
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-indigo-600 rounded-full" />
                  <span>Açıklama</span>
                </h3>

                {formData.description ? (
                  <div className="bg-slate-50/50 border border-slate-100 rounded-md p-4 h-[350px] overflow-y-auto custom-scrollbar">
                    <div 
                      className="prose prose-slate max-w-none text-xs sm:text-sm text-slate-700 leading-relaxed font-normal"
                      dangerouslySetInnerHTML={{ __html: formData.description }}
                    />
                  </div>
                ) : (
                  <div className="bg-slate-50/50 border border-slate-100 rounded-md p-4 h-[120px] flex items-center justify-center text-xs text-slate-500 italic">
                    Bu araç için henüz detaylı bir satıcı açıklaması eklenmemiştir.
                  </div>
                )}
              </div>

              {/* 2. BÖLÜM: BOYA, DEĞİŞEN VE TRAMER */}
              <div id="sec-damage" className="space-y-5 pt-8 scroll-mt-32">
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-indigo-600 rounded-full" />
                  <span>Boya, Değişen ve Tramer</span>
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  <div className="lg:col-span-6 bg-slate-50/80 border border-slate-200/80 rounded-md p-4 flex flex-col items-center justify-center min-h-[360px] relative">
                    <div className="relative w-full max-w-[280px] h-[320px] flex items-center justify-center my-auto pointer-events-none select-none">
                      <svg version="1.1" viewBox="0 0 380 440" className="w-full h-full drop-shadow-xs">
                        <defs>
                          <linearGradient id="Gradient_local" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" style={{ stopColor: '#ffffff', stopOpacity: 1 }} />
                            <stop offset="30%" style={{ stopColor: '#f97316', stopOpacity: 1 }} />
                            <stop offset="70%" style={{ stopColor: '#ffffff', stopOpacity: 1 }} />
                            <stop offset="100%" style={{ stopColor: '#f97316', stopOpacity: 1 }} />
                          </linearGradient>
                        </defs>
                        <g fill="none" fillRule="evenodd">
                          <g transform="translate(156.5 219.5) rotate(-90) translate(-188.5 -144.5)">
                            <g transform="translate(0)">
                              <path d="m311.85 23.096c0-1.3004-0.20081-2.5488-0.50203-3.8493l-2.8616-11.08 0.40162-2.4448c0.40162-2.2367-1.2049-4.3174-3.4138-4.4215l-19.931-1.1444c-1.4057-0.10403-2.5102 1.1444-2.4097 2.5488 0.20081 2.1847 0.45183 4.4215 0.50203 6.8142 0.40162 13.472-9.8398 24.916-22.842 24.76-12.4-0.10403-22.441-10.559-22.441-23.46 0-2.965 0.050203-5.6179 0.25102-8.3227 0.10041-1.3524-0.95386-2.4968-2.2591-2.4968h-110.6c-1.4057 0-2.46 1.2484-2.2591 2.7049 0.35142 2.3408 0.50203 4.7336 0.50203 7.3344 0.15061 13.004-9.9402 24.188-22.491 24.292-12.601 0.10403-22.842-10.455-22.842-23.46 0-0.67622 0.050203-1.4045 0.10041-2.0807 0.15061-1.5605-1.2551-2.7569-2.711-2.4448l-2.962 0.62421c-1.3053 0.10403-5.3215 0.57219-8.8859 3.9013-1.5563 1.4565-2.5604 3.017-3.2632 4.4215-1.2049 2.4448-2.7612 4.7336-4.6187 6.7622-0.80325 0.88429-1.6567 1.8206-2.46 2.7049-1.8575 3.2251-0.10041 6.7102-0.25102 10.455-0.20081 6.4501 3.8154 12.692 2.2089 19.142-0.25102 0.93631 0.10041 1.9767 0.85345 2.4968 2.6608 1.9246 5.8236 2.913 9.0868 2.913h11.547c0.65264 0 1.2551 0.15605 1.8073 0.46815 2.6106 1.6645 5.1709 3.3811 7.7815 5.0457 9.639 6.2941 20.182 10.924 31.327 13.576 0.60244 0.15605 1.2049 0.26009 1.8073 0.41614 7.5807 1.6645 14.509 2.3408 20.282 2.4968h20.734c20.935 0 41.518-5.6699 59.691-16.437l21.738-12.848 43.928-7.6465c6.8778-1.1964 13.404-4.0573 19.027-8.3748 0.050204-0.052017 6.426-3.4851 6.426-13.368z" stroke="#CBD5E1" strokeWidth="1.5" />
                              <path d="m106.51 55.944c-0.52167 0.93363-0.66394 2.0147-0.33197 2.9974 0.85364 2.506 2.5609 4.5207 4.7899 5.7492l4.6476 2.506c9.5798 5.2087 20.345 7.9113 31.158 7.9113h13.421l3.13-17.248c1.3279-7.2233 1.9918-14.643 1.9918-21.965v-25.847c-2.4187 0-8.0622-0.049138-13.706-0.049138-4.3156 0-7.7776 0-10.196 0.049138-1.8496 0-3.794 1.081-5.3115 2.9483-1.1856 1.425-2.2764 2.9483-3.2723 4.5207-1.0433 1.6707-1.6599 2.9483-2.229 4.1767-0.71137 1.4741-1.3753 2.8992-2.6084 4.619-1.2805 1.769-2.798 3.4397-4.5053 4.9138-3.4146 2.9483-6.3075 6.388-8.5838 10.319l-0.047424 0.049138v0.049138l-8.3467 14.299zm5.027-0.88449c2.0393-1.769 4.6476-2.7517 7.3508-2.7517h40.548c0.80622 0 1.4227 0.73707 1.3279 1.5724l-2.4187 16.412c-0.23712 1.5724-1.5176 2.7026-3.0352 2.6535l-10.149-0.19655c-9.4849-0.19655-18.733-2.85-26.937-7.7638l-3.13-1.8673c-1.8021-1.081-3.2723-2.6535-4.2208-4.5699-0.61652-1.1793-0.33197-2.6535 0.66394-3.4888z" fill={DAMAGE_STATUSES[damageReport['door_rear_left'] || 'ORIGINAL'].hex} fillRule="nonzero" stroke="#CBD5E1" strokeWidth="1.5" />
                              <path d="m166.04 58.376l-3.0398 16.732 2.9448-0.14764c18.476-0.98425 36.62-6.7421 52.483-16.634 3.4197-2.1653 5.9845-5.561 7.0769-9.5472 3.2297-11.467 3.9897-23.72 2.1848-35.531l-0.28498-1.7224c-0.14249-0.88582-0.85493-1.5256-1.7574-1.5256h-57.613v25.886c0 7.5295-0.66495 15.108-1.9948 22.49zm-0.28498 12.352l3.8472-15.994c0.42747-1.7224 1.8524-2.9527 3.5622-3.0512l34.055-1.9193v-0.049212c0-2.559 1.9948-4.6752 4.5121-4.6752h7.3144c0.61745 0 1.1874 0.14764 1.7574 0.34449 0.23748 0.098425 0.33247 0.3937 0.23748 0.63976-0.094992 0.24606-0.37997 0.34449-0.61745 0.24606-0.42747-0.19685-0.90243-0.29527-1.3774-0.29527h-7.3144c-1.9948 0-3.6097 1.6732-3.6097 3.7401v0.049212c0 2.313 1.8049 4.1831 4.0372 4.1831h7.3144 0.23748l-0.37997 0.24606c-13.489 9.3012-28.783 15.305-44.836 17.52l-7.0769 0.98425c-0.99742 0.19685-1.8998-0.83661-1.6624-1.9685z" fill={DAMAGE_STATUSES[damageReport['door_front_left'] || 'ORIGINAL'].hex} fillRule="nonzero" stroke="#CBD5E1" strokeWidth="1.5" />
                              <path d="m328.49 199.3c-2.1085 1.6125-3.6146 4.1094-3.8656 7.0223l-0.60244 7.0223c-0.30122 3.6412 2.2591 6.8142 5.7734 7.1263s6.5766-2.3408 6.8778-5.982l0.90366-10.611c4.2171 1.7166 8.6851 2.6009 13.254 2.6009h17.822c3.6648 0 6.7272-3.017 6.928-6.8142 0.80325-17.738 1.2551-36.256 1.2551-55.502v-0.41614c0-19.402-0.45183-38.077-1.2551-55.918-0.15061-3.7973-3.213-6.8142-6.928-6.8142h-17.772c-4.5685 0-9.0366 0.88429-13.254 2.6009l-0.90366-10.611c-0.30122-3.6412-3.4138-6.2941-6.8778-5.982-3.5142 0.3121-6.0746 3.5372-5.7734 7.1263l0.60244 7.0223c0.25102 2.913 1.7069 5.4098 3.8656 7.0223v111.11h-0.050203z" stroke="#CBD5E1" strokeWidth="1.5" />
                              <path d="m340 201.35c3.7652 1.6125 7.7313 2.4968 11.798 2.4968h15.864c3.2632 0 5.9742-2.8609 6.1248-6.5021 0.70284-16.958 1.1547-34.643 1.1547-53.005v-0.41614c0-18.518-0.40162-36.36-1.1547-53.422-0.15061-3.6412-2.8616-6.5021-6.1248-6.5021h-15.864c-4.0664 0-8.0325 0.83227-11.798 2.4968v114.85z" fill={DAMAGE_STATUSES[damageReport['front_bumper'] || 'ORIGINAL'].hex} fillRule="nonzero" stroke="#CBD5E1" strokeWidth="1.5" />
                              <path d="m300.87 101.87c-2.3093-4.3174-5.8738-7.6985-10.241-9.6752-2.711-1.2484-5.6729-1.8726-8.6349-1.8726h-54.119c-0.050203-0.26009-0.10041-0.41614-0.15061-0.52017-0.60244-2.0287-2.6608-8.7389-7.7815-11.08-1.8575-0.88429-3.2632-0.72824-3.5644-0.67622-0.20081 0-1.4057 0.15605-2.0081 0.67622-2.1587 1.8206 2.4097 8.3227 4.9199 11.6h-68.879c-2.1587 0-4.3677-0.26009-6.4762-0.83227-2.1085-0.57219-4.3175-0.83227-6.4762-0.83227h-51.559c-2.962 0-5.8738 0.57219-8.6349 1.6645-9.8398 3.9533-19.479 10.143-21.437 20.911-2.0081 10.82-2.3595 22.211-2.3595 32.927 0 8.999 0.25102 18.414 1.5061 27.621h-4.2673c-0.60244 0-1.6567 0-1.7069 3.4851 0 3.4331 1.3053 3.4851 3.3636 3.4851h3.7652c2.6106 9.7792 11.748 15.553 21.085 19.298 2.7612 1.0924 5.6729 1.6645 8.6349 1.6645h51.559c2.2089 0 4.3677-0.26008 6.4762-0.83227 2.1085-0.57219 4.3175-0.83227 6.4762-0.83227h68.879c-2.5102 3.2771-7.0786 9.7792-4.9199 11.6 0.60244 0.52017 1.8073 0.67622 2.0081 0.67622 0.30122 0.052018 1.7069 0.20807 3.5644-0.67622 5.0705-2.3408 7.1288-9.051 7.7815-11.08 0.050204-0.10403 0.10041-0.3121 0.15061-0.52017h54.119c2.962 0 5.924-0.62421 8.6349-1.8726 4.3175-1.9767 7.9321-5.3578 10.241-9.6752 4.4179-8.3748 10.844-23.668 10.844-42.342 0.050203-18.622-6.3758-33.915-10.794-42.29zm-186.3-4.4735h101.66c0.65264 0 0.80325 0.93631 0.15061 1.1444l-26.457 7.9586c-2.2089 0.67622-4.5183 0.98833-6.8276 0.98833h-44.38c-3.5142 0-6.9782-0.78026-10.141-2.2888l-14.258-6.7102c-0.55223-0.26009-0.35142-1.0924 0.25102-1.0924zm-14.91 83.279c-1.8575-11.08-2.9118-23.46-2.9118-36.464s1.0543-25.384 2.9118-36.464c0.30122-1.7686 2.1085-2.7049 3.6648-1.9767l14.057 7.0223c1.0041 0.52017 1.6065 1.6125 1.4559 2.7569-1.1045 8.2707-1.7571 18.102-1.7571 28.609 0 10.507 0.65264 20.339 1.7571 28.609 0.15061 1.1444-0.45183 2.2888-1.4559 2.7569l-14.057 7.0223c-1.5563 0.88429-3.3636-0.10404-3.6648-1.8726zm116.57 10.351h-101.66c-0.60244 0-0.80325-0.83228-0.25102-1.1444l14.258-6.7102c3.1628-1.5085 6.6268-2.2888 10.141-2.2888h44.38c2.3093 0 4.6187 0.36412 6.8276 0.98833l26.457 7.9586c0.60244 0.20807 0.50203 1.1964-0.15061 1.1964zm12.551-7.5425c-0.70284 2.6009-3.3134 4.1094-5.8236 3.3811l-26.708-7.8026c-2.4097-0.72824-3.8656-3.2251-3.3134-5.7739 1.8073-8.5828 2.8114-18.518 2.8114-29.13 0-10.611-1.0041-20.547-2.8114-29.13-0.50203-2.5488 0.90366-5.0457 3.3134-5.7739l26.708-7.8026c2.5102-0.72824 5.1207 0.78026 5.8236 3.3811 3.3636 12.016 5.2211 25.28 5.2211 39.325 0 14.045-1.8575 27.361-5.2211 39.325z" fill="#fff" fillRule="nonzero" stroke="#CBD5E1" strokeWidth="1.5" />
                              <path d="m59.277 54.594s6.1176 1.9503 15.529 0.97517l5.3646 0.29255s9.2234 7.5088 12.047 7.2163c2.8235-0.34131 7.7175-8.4352 7.7175-8.4352l10.635-19.503c-0.14118 0.24379-15.2 3.4131-22.164-1.414-6.0234-4.1932-10.682-10.824-11.482-17.846l-0.79999-4.8759s-9.3175-0.39007-12.329 6.5824c-3.0117 6.9725-6.5411 9.4592-6.5411 9.4592s-0.94116 10.629 0.79999 13.262c1.6941 2.5842 1.2235 14.286 1.2235 14.286z" fill={DAMAGE_STATUSES[damageReport['fender_rear_left'] || 'ORIGINAL'].hex} fillRule="nonzero" stroke="#CBD5E1" strokeWidth="1.5" />
                              <path transform="translate(267.88 27.237) scale(-1) rotate(180) translate(-267.88 -27.237)" d="m234.26 49.983l53.188-9.0296s15.014-4.4657 16.577-8.6861c1.563-4.2204 2.3681-7.0176 1.563-10.109-0.80516-3.0917-2.8418-10.502-2.8418-10.502s3.3154-6.1833-0.61572-6.1833c-3.9311 0-15.958-0.98148-15.958-0.98148s2.3211 32.474-25.531 32.907c-25.568 0.39668-24.904-28.637-24.904-28.637h-5.8815s5.7309 23.212 0 41.222h4.4042z" fill={DAMAGE_STATUSES[damageReport['fender_front_left'] || 'ORIGINAL'].hex} fillRule="nonzero" stroke="#CBD5E1" strokeWidth="1.5" />
                              <path d="m305.44 252.31c-5.6227-4.3174-12.099-7.1784-19.027-8.3748l-43.928-7.6465-21.738-12.848c-18.174-10.768-38.757-16.437-59.691-16.437h-20.734c-5.8236 0.20807-12.701 0.83227-20.282 2.4968-0.60244 0.15605-1.2049 0.26009-1.8073 0.41614-11.095 2.6009-21.638 7.2824-31.327 13.576-2.6106 1.6645-5.1709 3.3811-7.7815 5.0457-0.55223 0.3121-1.2049 0.46816-1.8073 0.46816h-11.547c-3.2632 0-6.426 1.0403-9.0868 2.913-0.80325 0.57219-1.1045 1.5605-0.85345 2.4968 1.6065 6.4501-2.46 12.692-2.2089 19.142 0.10041 3.7452-1.6065 7.2824 0.25102 10.455 0.80325 0.88429 1.6567 1.8206 2.46 2.7049 1.8575 2.0287 3.4138 4.2654 4.6187 6.7622 0.70284 1.3524 1.7069 2.965 3.2632 4.4215 3.5644 3.3291 7.5807 3.7973 8.8859 3.9013l2.962 0.6242c1.4559 0.3121 2.8114-0.93631 2.711-2.4448-0.050203-0.67622-0.10041-1.3524-0.10041-2.0807 0-13.004 10.241-23.564 22.842-23.46 12.551 0.10403 22.642 11.288 22.491 24.292-0.050203 2.6009-0.15061 4.9936-0.50203 7.3344-0.20081 1.4045 0.85345 2.7049 2.2591 2.7049h110.55c1.3053 0 2.3595-1.1444 2.2591-2.4968-0.20081-2.7049-0.25102-5.3057-0.25102-8.3227 0-12.9 10.041-23.356 22.441-23.46 13.003-0.10403 23.244 11.34 22.842 24.76-0.050203 2.3928-0.30122 4.6295-0.50203 6.8142-0.15061 1.4565 1.0041 2.6529 2.4097 2.5488l19.931-1.1444c2.2089-0.10404 3.7652-2.1847 3.4138-4.4215l-0.40162-2.4448 2.8616-11.08c0.35142-1.3004 0.50203-2.5488 0.50203-3.8493 0-9.9353-6.3758-13.368-6.3758-13.368z" stroke="#CBD5E1" strokeWidth="1.5" />
                              <path transform="translate(267.88 261.26) scale(-1, 1) rotate(180) translate(-267.88 -261.26)" d="m234.26 284.01l53.188-9.0296s15.014-4.4657 16.577-8.6861c1.563-4.2204 2.3681-7.0176 1.563-10.109-0.80516-3.0917-2.8418-10.502-2.8418-10.502s3.3154-6.1833-0.61572-6.1833c-3.9311 0-15.958-0.98148-15.958-0.98148s2.3211 32.474-25.531 32.907c-25.568 0.39668-24.904-28.637-24.904-28.637h-5.8815s5.7309 23.212 0 41.222h4.4042z" fill={DAMAGE_STATUSES[damageReport['fender_front_right'] || 'ORIGINAL'].hex} fillRule="nonzero" stroke="#CBD5E1" strokeWidth="1.5" />
                              <path d="m114.9 247.46l0.047425 0.098276c2.2764 3.9311 5.1693 7.4199 8.5838 10.319 1.7547 1.4741 3.2723 3.1448 4.5053 4.9138 1.233 1.7198 1.897 3.1448 2.6084 4.619 0.61652 1.2285 1.233 2.5552 2.229 4.1767 0.99592 1.5724 2.0867 3.0957 3.2723 4.5207 1.5176 1.8181 3.462 2.8992 5.3115 2.9483 2.4661 0.049138 5.8806 0.049138 10.196 0.049138 5.5961 0 11.287-0.049138 13.706-0.049138v-25.847c0-7.3707-0.66394-14.741-1.9918-21.965l-3.13-17.248h-13.469c-10.813 0-21.578 2.7517-31.158 7.9113l-4.6476 2.506c-2.2764 1.2285-3.9362 3.2431-4.7899 5.7492-0.33197 0.98276-0.1897 2.0638 0.33197 2.9974l8.3941 14.299zm-3.9837-16.904c0.94849-1.9164 2.4187-3.4888 4.2208-4.5699l3.13-1.8673c8.2044-4.9138 17.452-7.5673 26.937-7.7638l10.149-0.19655c1.5176-0.049138 2.8455 1.1302 3.0352 2.6535l2.4187 16.412c0.14227 0.83535-0.47425 1.5724-1.3279 1.5724h-40.548c-2.7032 0-5.2641-0.98276-7.3508-2.7517-0.94849-0.83535-1.233-2.3095-0.66394-3.4888z" fill={DAMAGE_STATUSES[damageReport['door_rear_right'] || 'ORIGINAL'].hex} fillRule="nonzero" stroke="#CBD5E1" strokeWidth="1.5" />
                              <path d="m169.03 253.22v25.886h57.66c0.85493 0 1.6149-0.63976 1.7574-1.5256l0.28498-1.7224c1.8049-11.811 1.0449-24.065-2.1848-35.531-1.1399-3.9862-3.6572-7.3819-7.0769-9.5472-15.911-9.9409-34.055-15.65-52.531-16.634l-2.9448-0.14764 3.0398 16.732c1.3299 7.3819 1.9948 14.961 1.9948 22.49zm-0.52246-36.86l7.0769 0.98425c16.054 2.2146 31.395 8.2185 44.836 17.52l0.37997 0.24606h-0.23748-7.3144c-2.2323 0-4.0372 1.8701-4.0372 4.1831v0.049213c0 2.0669 1.6149 3.7401 3.6097 3.7401h7.3144c0.47496 0 0.94992-0.098425 1.3774-0.29528 0.23748-0.098425 0.52246 0 0.61745 0.24606 0.094992 0.24606 0 0.54134-0.23748 0.63976-0.56996 0.24606-1.1399 0.34449-1.7574 0.34449h-7.3144c-2.4698 0-4.5121-2.0669-4.5121-4.6752v-0.049213l-34.055-1.9193c-1.7099-0.098425-3.1348-1.3287-3.5622-3.0512l-3.8472-15.994c-0.33247-1.0827 0.56996-2.1161 1.6624-1.9685z" fill={DAMAGE_STATUSES[damageReport['door_front_right'] || 'ORIGINAL'].hex} fillRule="nonzero" stroke="#CBD5E1" strokeWidth="1.5" />
                              <path d="m58.43 234.06s6.5264-2.0807 16.567-1.0403l5.7232-0.3121s9.8398-8.0106 12.852-7.6985c3.0122 0.36412 8.2333 8.999 8.2333 8.999l11.346 20.807c-0.15061-0.26008-16.216-3.6412-23.646 1.5085-6.426 4.4735-11.396 11.548-12.25 19.038l-0.85345 5.2017s-9.9402 0.41614-13.153-7.0223c-3.213-7.4385-6.9782-10.091-6.9782-10.091s-1.0041-11.34 0.85345-14.149c1.8073-2.7569 1.3053-15.241 1.3053-15.241z" fill={DAMAGE_STATUSES[damageReport['fender_rear_right'] || 'ORIGINAL'].hex} fillRule="nonzero" stroke="#CBD5E1" strokeWidth="1.5" />
                              <path d="m230 100s14.961 40.833 0 87.129h53.968s20.633-8.1667 18.876-43.07c-1.7571-34.904-18.876-44.059-18.876-44.059h-53.968z" fill={DAMAGE_STATUSES[damageReport['front_bonnet'] || 'ORIGINAL'].hex} fillRule="nonzero" stroke="#CBD5E1" strokeWidth="1.5" />
                              <path d="m95.64 100.03h-23.897s-10.743-1.3004-10.743 13.004v65.594s1.7069 8.7909 8.4843 8.7909h26.156s-8.5345-37.712 0-87.389z" fill={DAMAGE_STATUSES[damageReport['trunk'] || 'ORIGINAL'].hex} fillRule="nonzero" stroke="#CBD5E1" strokeWidth="1.5" />
                              <path d="m126.16 111s-10.794 28.349-1.1547 64.501h63.658s8.7855-32.771 0-64.501h-62.503z" fill={DAMAGE_STATUSES[damageReport['roof'] || 'ORIGINAL'].hex} fillRule="nonzero" stroke="#CBD5E1" strokeWidth="1.5" />
                              <path d="m361.78 111.14s0.050203-7.4385-2.6608-11.34c-2.711-3.9013-12.701-7.8026-12.701-7.8026s-2.9118 22.471 6.677 28.505c9.5888 6.034 8.6851-9.3631 8.6851-9.3631z" fill="#CBD5E1" fillRule="nonzero" />
                              <path d="m361.78 179.77s0.050203 7.4385-2.6608 11.34-12.701 7.8026-12.701 7.8026-2.9118-22.471 6.677-28.505c9.5888-6.034 8.6851 9.3631 8.6851 9.3631z" fill="#CBD5E1" fillRule="nonzero" />
                              <path d="m39.259 83.601c-4.2171-1.7166-8.6851-2.6009-13.254-2.6009h-17.822c-3.6648 0-6.7272 3.017-6.928 6.8142-0.80325 17.738-1.2551 36.256-1.2551 55.502v0.41614c0 19.402 0.45183 38.077 1.2551 55.918 0.15061 3.7973 3.213 6.8142 6.928 6.8142h17.822c4.5685 0 9.0366-0.88429 13.254-2.6009v-120.26z" stroke="#CBD5E1" strokeWidth="1.5" />
                              <path d="m36.941 86.497c-3.7652-1.6125-7.7313-2.4968-11.798-2.4968h-15.864c-3.2632 0-5.9742 2.8609-6.1248 6.5021-0.70284 16.958-1.1547 34.643-1.1547 53.005v0.41614c0 18.518 0.40162 36.36 1.1547 53.422 0.15061 3.6412 2.8616 6.5021 6.1248 6.5021h15.864c4.0664 0 8.0325-0.83228 11.798-2.4968v-114.85z" fill={DAMAGE_STATUSES[damageReport['rear_bumper'] || 'ORIGINAL'].hex} fillRule="nonzero" stroke="#CBD5E1" strokeWidth="1.5" />
                            </g>
                          </g>
                        </g>
                      </svg>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-3 text-[11px] font-bold text-slate-700">
                      <div className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${DAMAGE_STATUSES.ORIGINAL.bg}`} /><span>{DAMAGE_STATUSES.ORIGINAL.label}</span></div>
                      <div className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${DAMAGE_STATUSES.PAINTED.bg}`} /><span>{DAMAGE_STATUSES.PAINTED.label}</span></div>
                      <div className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${DAMAGE_STATUSES.LOCAL_PAINTED.bg}`} /><span>{DAMAGE_STATUSES.LOCAL_PAINTED.label}</span></div>
                      <div className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${DAMAGE_STATUSES.CHANGED.bg}`} /><span>{DAMAGE_STATUSES.CHANGED.label}</span></div>
                      <div className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${DAMAGE_STATUSES.UNSPECIFIED.bg}`} /><span>{DAMAGE_STATUSES.UNSPECIFIED.label}</span></div>
                    </div>
                  </div>

                  {/* SAĞ: METİN LİSTESİ VE TRAMER KARTI */}
                  <div className="lg:col-span-6 space-y-4">
                    <div className="bg-slate-50/80 border border-slate-200/80 rounded-md p-4 space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                          <span className={`w-2.5 h-2.5 rounded-full ${DAMAGE_STATUSES.ORIGINAL.bg}`} /><span>{DAMAGE_STATUSES.ORIGINAL.label} ({groupedParts.ORIGINAL.length})</span>
                        </div>
                        <p className="text-[11px] text-slate-600 font-normal leading-relaxed pl-4">{groupedParts.ORIGINAL.length > 0 ? groupedParts.ORIGINAL.join(' • ') : '-'}</p>
                      </div>
                      <div className="space-y-1 pt-1 border-t border-slate-200/60">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                          <span className={`w-2.5 h-2.5 rounded-full ${DAMAGE_STATUSES.LOCAL_PAINTED.bg}`} /><span>{DAMAGE_STATUSES.LOCAL_PAINTED.label} ({groupedParts.LOCAL_PAINTED.length})</span>
                        </div>
                        <p className="text-[11px] text-slate-600 font-normal leading-relaxed pl-4">{groupedParts.LOCAL_PAINTED.length > 0 ? groupedParts.LOCAL_PAINTED.join(' • ') : '-'}</p>
                      </div>
                      <div className="space-y-1 pt-1 border-t border-slate-200/60">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                          <span className={`w-2.5 h-2.5 rounded-full ${DAMAGE_STATUSES.PAINTED.bg}`} /><span>{DAMAGE_STATUSES.PAINTED.label} ({groupedParts.PAINTED.length})</span>
                        </div>
                        <p className="text-[11px] text-slate-600 font-normal leading-relaxed pl-4">{groupedParts.PAINTED.length > 0 ? groupedParts.PAINTED.join(' • ') : '-'}</p>
                      </div>
                      <div className="space-y-1 pt-1 border-t border-slate-200/60">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                          <span className={`w-2.5 h-2.5 rounded-full ${DAMAGE_STATUSES.CHANGED.bg}`} /><span>{DAMAGE_STATUSES.CHANGED.label} ({groupedParts.CHANGED.length})</span>
                        </div>
                        <p className="text-[11px] text-slate-600 font-normal leading-relaxed pl-4">{groupedParts.CHANGED.length > 0 ? groupedParts.CHANGED.join(' • ') : '-'}</p>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-md p-4 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-md ${tramerVarMi(formData) ? 'bg-amber-50 text-amber-600 border border-amber-200/80' : 'bg-emerald-50 text-emerald-600 border border-emerald-200/80'}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                          </div>
                          <span className="text-xs font-bold text-slate-800">Tramer Hasar Kaydı</span>
                        </div>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md ${tramerVarMi(formData) ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {tramerVarMi(formData) ? 'Hasar Kaydı Var' : 'Hasar Kaydı Yok'}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                        <span className="text-xs text-slate-500 font-medium">Toplam Hasar Tutarı</span>
                        <span className="text-base font-black font-mono text-slate-900">{tramerVarMi(formData) ? `${formData.tramerAmount || '0'} TL` : '0 TL'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. BÖLÜM: ARAÇ BİLGİLERİ */}
              <div id="sec-info" className="space-y-4 pt-10 scroll-mt-32">
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2 mb-5">
                  <span className="w-1.5 h-4 bg-indigo-600 rounded-full" />
                  <span>Araç Bilgileri</span>
                </h3>

                <div className="bg-white border border-slate-200 rounded-md shadow-2xs overflow-hidden">
                  
                  {/* GENEL BAKIŞ */}
                  <div className="space-y-0.5 divide-y divide-slate-100">
                    <div className="flex justify-between items-center py-2.5 px-4 bg-slate-50/50">
                      <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider">GENEL BAKIŞ</span>
                      <span className="text-[11px] font-black text-emerald-600 font-mono">%100 Tescilli</span>
                    </div>

                    {[
                      { label: 'Model Yılı', value: formData.selectedYear },
                      { label: 'Kilometre', value: `${activeKm} KM`, isMono: true },
                      { label: 'Yakıt Tipi', value: formData.selectedFuel },
                      { label: 'Vites Tipi', value: formData.transmission },
                      { label: 'Kasa Tipi', value: formData.bodyType },
                      { label: 'Renk', value: formData.color?.name || formData.color },
                      { 
                        label: 'Plaka Durumu', 
                        value: 'TR (Gizlenmiş Tescil)', 
                        isMono: true, 
                        textClass: 'text-slate-600 font-semibold' 
                      },
                      { label: 'Sahiplik Durumu', value: formData.isFirstOwner === 'Evet' ? 'İlk Sahibi' : 'İlk Sahibi Değilim' },
                      { 
                        label: 'Tramer Hasar Kaydı', 
                        value: tramerVarMi(formData) ? `${formData.tramerAmount} TL` : 'Tramer Yok', 
                        textClass: tramerVarMi(formData) ? 'text-amber-700' : 'text-emerald-700 font-bold' 
                      },
                      { label: 'Takas Durumu', value: formData.swap },
                    ].map((item, index) => (
                      <div key={item.label} className={`flex justify-between items-baseline py-2.5 px-5 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}`}>
                        <span className="text-xs font-medium text-slate-600 w-2/5">{item.label}</span>
                        <span className={`text-xs font-semibold ${item.textClass || 'text-slate-900'} ${item.isMono ? 'font-mono' : ''} text-right w-3/5 truncate`}>
                          {item.value || 'Belirtilmemiş'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* TESCİL VE BELGE DURUMU */}
                  <div className="space-y-0.5 divide-y divide-slate-100 border-t border-slate-200">
                    <div className="flex justify-between items-center py-2.5 px-4 bg-slate-50/50 mt-0.5">
                      <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider">TESCİL VE BELGE DURUMU</span>
                    </div>

                    {(() => {
                      const rawInspection = formData.inspection_end_date || formData.inspectionDate;
                      const rawInsurance = formData.traffic_insurance_end_date || formData.insuranceDate;
                      const rawKasko = formData.kasko_end_date || formData.kaskoDate;

                      const inspectionStatus = getDynamicStatus(rawInspection, 'Muayeneli');
                      const insuranceStatus = getDynamicStatus(rawInsurance, 'Sigortalı');
                      const kaskoStatus = getDynamicStatus(rawKasko, 'Kaskolu');

                      return [
                        { 
                          label: 'Muayene Durumu', 
                          value: inspectionStatus.text, 
                          textClass: inspectionStatus.class 
                        },
                        { 
                          label: 'Zorunlu Trafik Sigortası', 
                          value: insuranceStatus.text, 
                          textClass: insuranceStatus.class 
                        },
                        { 
                          label: 'Kasko Durumu', 
                          value: kaskoStatus.text, 
                          textClass: kaskoStatus.class 
                        },
                        { label: 'Yedek Anahtar', value: formData.spareKey || 'Var' },
                        { label: 'Garanti / İthalat Durumu', value: formData.warranty || 'Bayi Çıkışlı' },
                      ].map((item, index) => (
                        <div key={item.label} className={`flex justify-between items-baseline py-2.5 px-5 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}`}>
                          <span className="text-xs font-medium text-slate-600 w-2/5">{item.label}</span>
                          <span className={`text-xs ${item.textClass || 'text-slate-900 font-semibold'} text-right w-3/5 truncate`}>
                            {item.value}
                          </span>
                        </div>
                      ));
                    })()}
                  </div>

                </div>
              </div>

              {/* 4. BÖLÜM: DİNAMİK & KATEGORİZE EDİLMİŞ DONANIM MATRİSİ */}
              <div id="sec-features" className="space-y-6 pt-8 scroll-mt-32">
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-indigo-600 rounded-full" />
                  <span>Donanım Özellikleri</span>
                </h3>

                <div className="bg-white border border-slate-200/90 rounded-md p-4 sm:p-5 shadow-2xs space-y-6">
                  
                  {extraFeatures.length > 0 && (
                    <div className="space-y-3 bg-emerald-50/40 p-3.5 rounded-md border border-emerald-200/80">
                      <div className="flex items-center justify-between border-l-2 border-emerald-600 pl-2.5">
                        <span className="text-xs font-black text-emerald-900 uppercase tracking-wider">
                          Öne Çıkan & Ekstra Seçilen Donanımlar ({extraFeatures.length})
                        </span>
                        <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                          Tescilli Seçimler
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                        {extraFeatures.map((extFeat, exIdx) => (
                          <div 
                            key={exIdx} 
                            className="flex items-center justify-between p-2.5 rounded bg-white border border-emerald-300 text-slate-900 font-extrabold text-xs shadow-2xs"
                          >
                            <span className="truncate pr-2">{extFeat}</span>
                            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                              <Icon name="onay" size="xs" strokeWidth={3} />
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {FEATURE_CATALOG.map((catGroup, cIdx) => (
                    <div key={cIdx} className="space-y-3 border-b border-slate-100 last:border-0 pb-5 last:pb-0">
                      <div className="flex items-center gap-2 border-l-2 border-indigo-600 pl-2.5">
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          {catGroup.category}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-2.5 pt-1">
                        {catGroup.items.map((featName, fIdx) => {
                          const isSelected = userSelectedFeatures.some(
                            sf => String(sf).trim().toLowerCase() === String(featName).trim().toLowerCase()
                          );

                          return (
                            <div 
                              key={fIdx} 
                              className={`flex items-center justify-between p-2.5 rounded transition-all text-xs ${
                                isSelected 
                                  ? 'bg-emerald-50/80 border border-emerald-200 text-slate-900 font-extrabold shadow-2xs' 
                                  : 'bg-slate-50/40 border border-slate-100 text-slate-400 font-normal opacity-60'
                              }`}
                            >
                              <span className="truncate pr-2">{featName}</span>
                              {isSelected ? (
                                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                                  <Icon name="onay" size="xs" strokeWidth={3} />
                                </span>
                              ) : (
                                <span className="text-slate-300 font-bold px-1.5 select-none">−</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                </div>
              </div>

            </div>
          </div>

          {/* PANEL 3: BAKIM GEÇMİŞİ SİCİLİ */}
          <div id="sec-service" className="bg-white border border-slate-200 rounded-md p-5 sm:p-6 shadow-2xs space-y-4 scroll-mt-32">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-emerald-600 rounded-full" />
                  <span>Bakım Geçmişi Sicili (OTO.CV Onaylı)</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium pl-3.5">
                  Usta faturaları, periyodik değişimler ve servis işlemlerinin zaman damgalı dökümü.
                </p>
              </div>
              <span className="text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-md shrink-0">
                {rawServiceRecords.length} Onaylı İşlem
              </span>
            </div>

            {rawServiceRecords.length === 0 ? (
              <div className="text-center py-10 text-xs font-semibold text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                Bu araca ait henüz kayıtlı bir sanayi veya servis sicili eklenmemiştir.
              </div>
            ) : (
              <div className="space-y-3">
                
                {/* TOPLAM BELGELENMİŞ BAKIM YATIRIMI KARTI */}
                <div className="bg-slate-50/80 border border-slate-200/90 p-3.5 sm:p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 9h3.75m4.5 1.5h.008v.008H17.25v-.008zm0 3h.008v.008H17.25v-.008zm0 3h.008v.008H17.25v-.008zM4.5 19.5h15a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25h-15A2.25 2.25 0 002.25 6v11.25A2.25 2.25 0 004.5 19.5z" />
                      </svg>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-indigo-900 tracking-wider uppercase block">
                        TOPLAM BELGELENMİŞ SERVİS YATIRIMI
                      </span>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Araca yapılan tüm şeffaf bakımların belgelenmiş maliyet toplamı.
                      </p>
                    </div>
                  </div>

                  <div className="self-end sm:self-center bg-white border border-slate-200 px-3 py-1 rounded-md text-sm font-black font-mono text-indigo-700 shadow-2xs">
                    {formattedTotalCost}
                  </div>
                </div>

                {/* YENİLENMİŞ PREMİUM AKERDİYON SERVİS DÖNGÜSÜ */}
                {rawServiceRecords.map((item, index) => {
                  const isExpanded = expandedTileIndex === index;
                  
                  let invoiceUrl = null;
                  if (item.invoice_file) {
                    if (typeof item.invoice_file === 'string') invoiceUrl = item.invoice_file;
                    else if (item.invoice_file.preview) invoiceUrl = item.invoice_file.preview;
                    else if (item.invoice_file instanceof File || item.invoice_file instanceof Blob) {
                      try { invoiceUrl = URL.createObjectURL(item.invoice_file); } catch (e) { invoiceUrl = null; }
                    }
                  }
                  // Depoda duran bir kayıt (yalnızca bucket içi yol elde var).
                  // Eskiden burada `item.invoice_url` — tam public URL —
                  // doğrudan <img src> olarak basılıyordu. O URL'ler artık
                  // geçersiz; erişim imzalı bağlantıyla veriliyor ve onu
                  // FaturaOnizleme hallediyor.
                  const faturaYolu = !invoiceUrl ? (item.invoice_path || null) : null;
                  const belgeVar = !!invoiceUrl || !!faturaYolu;

                  let titleStr = item.service_type || item.title || 'Mekanik Bakım Kaydı';
                  let descStr = item.summary || item.details || 'İşlem detayı belirtilmedi.';
                  
                  let costFormatted = '0 TL';
                  if (item.cost) {
                    if (typeof item.cost === 'number') costFormatted = `${item.cost.toLocaleString('tr-TR')} TL`;
                    else costFormatted = `${item.cost.replace('₺', '').trim()} TL`;
                  }

                  return (
                    <div 
                      key={item.id || index}
                      className="border border-slate-200 rounded-lg overflow-hidden bg-white transition-all duration-150 hover:border-slate-300"
                    >
                      <div 
                        onClick={() => setExpandedTileIndex(isExpanded ? null : index)}
                        className="p-3.5 sm:p-4 flex justify-between items-center cursor-pointer select-none gap-3 hover:bg-slate-50/50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded border border-indigo-100 shrink-0">
                            {item.km ? `${item.km} KM` : '0 KM'}
                          </span>

                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{titleStr}</h4>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-2">
                              <span className="inline-flex items-center gap-1">
                                <Icon name="anahtar" size="xs" />
                                {item.shop_name || 'Özel Servis'}
                              </span>
                              <span aria-hidden="true">•</span>
                              <span className="inline-flex items-center gap-1">
                                <Icon name="takvim" size="xs" />
                                {formatTrDate(item.service_date, 'Belirtilmemiş')}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <span className="text-xs sm:text-sm font-bold font-mono text-slate-900">{costFormatted}</span>
                            {belgeVar && (
                              <span className="flex items-center justify-end gap-1 text-[10px] font-bold text-emerald-600 mt-0.5">
                                <Icon name="onay" size="xs" strokeWidth={2.5} />
                                Mühürlü Evrak
                              </span>
                            )}
                          </div>

                          <div className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                            <Icon name="asagi" size="md" />
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="bg-slate-50/60 border-t border-slate-100 p-4 space-y-3 animate-fadeIn">
                          
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white p-3 rounded-md border border-slate-200/80 text-xs">
                            <div>
                              <span className="text-slate-400 font-medium block text-[10px] uppercase">İşlem KM</span>
                              <span className="font-bold text-slate-800 font-mono">{item.km || '0'} KM</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium block text-[10px] uppercase">Servis Noktası</span>
                              <span className="font-bold text-slate-800 truncate block">{item.shop_name || 'Belirtilmedi'}</span>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                              <span className="text-slate-400 font-medium block text-[10px] uppercase">İşlem Tarihi</span>
                              <span className="font-bold text-slate-800">{formatTrDate(item.service_date, 'Belirtilmedi')}</span>
                            </div>
                          </div>

                          {descStr && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 tracking-wider block uppercase">İşlem Detayı & Usta Notu</span>
                              <p className="text-xs text-slate-700 font-normal leading-relaxed bg-white p-3 rounded-md border border-slate-200/80">
                                {descStr}
                              </p>
                            </div>
                          )}

                          {invoiceUrl && (
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[10px] font-bold text-slate-400 tracking-wider block uppercase">Servis Faturası / Evrak</span>
                              <button
                                type="button"
                                onClick={() => setInvoiceModalUrl(invoiceUrl)}
                                className="flex items-center gap-2 bg-white border border-slate-200 hover:border-indigo-300 p-1.5 pr-3 rounded-lg text-xs font-bold text-indigo-600 transition-colors group"
                              >
                                {/* Yerel dosya önizlemesi (blob:). Henüz yüklenmedi,
                                    imzalı bağlantı gerekmez. */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={invoiceUrl} alt="" className="w-10 h-10 object-cover rounded border border-slate-100" />
                                <span className="group-hover:underline">Fatura / Evrak Görselini Büyüt</span>
                              </button>
                            </div>
                          )}

                          {faturaYolu && (
                            <FaturaOnizleme yol={faturaYolu} onBuyut={setInvoiceModalUrl} />
                          )}

                        </div>
                      )}
                    </div>
                  );
                })}

              </div>
            )}

          </div>

        </div>

        {/* SAĞ SÜTUN: SİCİL ÖZETİ — araç detay sayfasındakinin aynısı.
            Ön izlemenin işi yayımlanacak sayfayı göstermek; burada farklı
            bir panel göstermek kullanıcıya olmayan bir şey vaat etmek olur.
            Kayıt anında henüz bilinmeyen alanlar sayı uydurmak yerine ne
            zaman doldurulacağını söylüyor. */}
        <div className="lg:col-span-3">
          <div className="sticky top-20 space-y-4">
            <div className="bg-white border border-slate-200 rounded-md shadow-2xs overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                  Sicil Özeti
                </span>
              </div>

              <dl className="px-4 py-3 space-y-2 text-[11px]">
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-slate-500 font-semibold">Sicil puanı</dt>
                  <dd className="font-bold text-slate-500">Kayıttan sonra</dd>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-slate-500 font-semibold">Bakım kaydı</dt>
                  <dd className="font-mono font-bold text-slate-800 tabular-nums">0</dd>
                </div>
                <div className="flex items-baseline justify-between gap-2 border-t border-slate-100 pt-2">
                  <dt className="text-slate-500 font-semibold">Sicil no</dt>
                  <dd className="font-bold text-slate-500">Kayıttan sonra</dd>
                </div>
              </dl>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-md p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-indigo-700 font-bold text-xs">
                <Icon name="kalkan" size="sm" />
                <span>Bu sayfayı ziyaretçi böyle görecek</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                Plakanız ve iletişim bilgileriniz ziyaretçiye gösterilmez. Sicil puanı, kayıt
                tamamlandıktan sonra girdiğiniz veriden hesaplanır.
              </p>
            </div>
          </div>
        </div>

      </div>

     {/* 🚀 ALT AKSİYON BUTONLARI */}
      <div className="flex items-center justify-between pt-6 pb-12 relative z-20">
        <button
          type="button"
          onClick={onBack || onEdit || (() => window.history.back())}
          className="bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 font-bold text-xs sm:text-sm px-6 py-3.5 rounded-lg transition-all cursor-pointer select-none"
        >
          ‹ 3. Adıma Dön
        </button>

        <button 
          type="button"
          onClick={onSuccess}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm py-3.5 px-8 rounded-lg transition-all shadow-sm cursor-pointer select-none active:scale-98 flex items-center gap-2"
        >
          <span>Onayla ve Tescille</span>
          <span className="text-base">›</span>
        </button>
      </div>

      {/* 🚀 LIGHTBOX GALERİ MODALI */}
      {isFullscreen && imageList.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fadeIn">
          <button type="button" onClick={() => setIsFullscreen(false)} className="absolute top-6 right-6 z-50 bg-white/10 hover:bg-white/20 text-white px-4 py-2 min-h-[44px] rounded-full font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            <Icon name="kapat" size="md" />
            Kapat
          </button>
          {imageList.length > 1 && <button type="button" onClick={() => setFullscreenIndex((prev) => (prev - 1 + imageList.length) % imageList.length)} className="absolute left-6 z-50 bg-white/10 hover:bg-white/20 text-white w-10 h-10 rounded-full font-bold cursor-pointer">‹</button>}
          <div className="max-w-5xl max-h-[85vh] flex items-center justify-center overflow-hidden">
            <img src={imageList[fullscreenIndex]} alt="Galeri Büyütülmüş" className="max-w-full max-h-[85vh] object-contain" />
          </div>
          {imageList.length > 1 && <button type="button" onClick={() => setFullscreenIndex((prev) => (prev + 1) % imageList.length)} className="absolute right-6 z-50 bg-white/10 hover:bg-white/20 text-white w-10 h-10 rounded-full font-bold cursor-pointer">›</button>}
          <div className="absolute bottom-6 bg-white/10 text-white text-xs font-mono font-bold px-3 py-1.5 rounded-full">
            {fullscreenIndex + 1} / {imageList.length}
          </div>
        </div>
      )}

      {/* 📑 FATURA GÖRSELİ ÖN İZLEME MODALI */}
      {invoiceModalUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fadeIn">
          <button type="button" onClick={() => setInvoiceModalUrl(null)} className="absolute top-6 right-6 z-50 bg-white/20 hover:bg-white/30 text-white px-4 py-2 min-h-[44px] rounded-full font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            <Icon name="kapat" size="md" />
            Kapat
          </button>
          <div className="max-w-4xl max-h-[85vh] bg-white p-2 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center">
            <img src={invoiceModalUrl} alt="Fatura Evrakı" className="max-w-full max-h-[80vh] object-contain" />
          </div>
        </div>
      )}

      {/* 🚀 4. ADIM: YÜZEN YUKARI ÇIK BUTONU (SCROLL TO TOP) */}
      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 bg-slate-900/90 hover:bg-slate-900 text-white p-3 rounded-full shadow-lg backdrop-blur transition-all duration-300 hover:scale-110 cursor-pointer flex items-center justify-center group border border-slate-700/50"
          title="Yukarı Çık"
        >
          <svg className="w-5 h-5 transition-transform duration-200 group-hover:-translate-y-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
        </button>
      )}

    </div>
  );
}