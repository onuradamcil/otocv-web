// =========================================================================
// OTO-CV VİTRİN BİLEŞENİ: HIGH-PERFORMANCE WEB VİTRİNİ (MarketplaceView.jsx)
// İşlev: Performans optimizasyonlu süzgeç motoru, ferah sol sidebar, 
//        Arabam.com tarzı aksiyonlu hizmet barı ve kurumsal Vitrin Paneli.
// =========================================================================

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { fetchMarketplaceListings } from '../../services/marketplaceService';
import { useToast } from '../../context/ToastContext';
import Icon from '../common/icons';
import GlobalStepLoader from '../common/GlobalStepLoader';

export default function MarketplaceView({ 
  onSelectVehicle, 
  onNavigateToGarage, 
  onNavigateToVerify, 
  onNavigateToInsurance, 
  onNavigateToMaintenance,
  onOpenCreateListingModal
}) {
  const toast = useToast();
  // =========================================================================
  // 1. BLOK: REAKTİF VERİ VE FİLTRE HAFIZASI
  // =========================================================================
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('Tümü');
  const [quickFilter, setQuickFilter] = useState('all'); 
  const [showAllVitrin, setShowAllVitrin] = useState(false);

  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    minYear: '',
    maxYear: '',
    minKm: '',
    maxKm: ''
  });

  useEffect(() => {
    loadLiveListings();
  }, []);

  const loadLiveListings = async () => {
    try {
      setLoading(true);
      const result = await fetchMarketplaceListings();
      if (result.success) {
        setListings(result.data || []);
      }
    } catch (error) {
      console.error("İlanlar yüklenirken hata oluştu:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    setSelectedBrand('Tümü');
    setSearchQuery('');
    setQuickFilter('all');
    setShowAllVitrin(false);
    setFilters({ minPrice: '', maxPrice: '', minYear: '', maxYear: '', minKm: '', maxKm: '' });
  };

  // =========================================================================
  // 2. BLOK: PERFORMANCE OPTIMIZED (useMemo) SÜZGEÇ ALGORİTMASI
  // =========================================================================
  
  // Markaları ve araç sayılarını tek geçişte hesapla (Performans için)
  const { uniqueBrands, brandCounts } = useMemo(() => {
    const counts = {};
    const brandsSet = new Set();
    
    listings.forEach(item => {
      if (item.brand) {
        brandsSet.add(item.brand);
        counts[item.brand] = (counts[item.brand] || 0) + 1;
      }
    });

    return {
      uniqueBrands: ['Tümü', ...Array.from(brandsSet)],
      brandCounts: counts
    };
  }, [listings]);

  // Vitrin İlanları (Sadece Dopingli İlanlar)
  const featuredListings = useMemo(() => {
    return listings
      .filter(item => item.is_featured === true)
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [listings]);

  // Filtrelenmiş İlanlar
  const filteredListings = useMemo(() => {
    const isSearching = searchQuery || filters.minPrice || filters.maxPrice || filters.minYear || filters.maxYear || filters.minKm || filters.maxKm || selectedBrand !== 'Tümü' || quickFilter !== 'all';
    
    return listings.filter(item => {
      if (!isSearching && !item.is_featured) return false;

      const matchesBrand = selectedBrand === 'Tümü' || item.brand === selectedBrand;
      
      const query = searchQuery.toLocaleLowerCase('tr-TR').trim();
      const matchesQuery = !query || 
        (item.brand && item.brand.toLocaleLowerCase('tr-TR').includes(query)) ||
        (item.model && item.model.toLocaleLowerCase('tr-TR').includes(query)) ||
        (item.listing_title && item.listing_title.toLocaleLowerCase('tr-TR').includes(query)) ||
        (item.pin_code && item.pin_code.toLocaleLowerCase('tr-TR').includes(query)) ||
        (item.city && item.city.toLocaleLowerCase('tr-TR').includes(query));

      const matchesQuick = 
        quickFilter === 'all' ? true :
        quickFilter === 'featured' ? item.is_featured === true :
        quickFilter === 'highTrust' ? (item.trust_score || 0) >= 80 :
        quickFilter === 'urgent' ? item.is_featured === true :
        quickFilter === 'priceDrop' ? true : true;

      const price = Number(item.price) || 0;
      const year = Number(item.year) || 0;

      return matchesBrand && matchesQuery && matchesQuick && 
             (!filters.minPrice || price >= Number(filters.minPrice)) &&
             (!filters.maxPrice || price <= Number(filters.maxPrice)) &&
             (!filters.minYear || year >= Number(filters.minYear)) &&
             (!filters.maxYear || year <= Number(filters.maxYear));
    });
  }, [listings, searchQuery, selectedBrand, quickFilter, filters]);

  const displayedVitrinListings = showAllVitrin ? featuredListings : featuredListings.slice(0, 12);

  // =========================================================================
  // 3. BLOK: ARAYÜZ RENDER KATMANI (DESKTOP WEB ENTERPRISE)
  // =========================================================================
  return (
    <div className="animate-fadeIn min-h-screen bg-[#F8FAFC] pb-16">
      
      {/* 3.1 HERO BANNER */}
      <div className="bg-[#0F172A] text-white py-8 px-4 border-b border-slate-800 select-none">
        <div className="max-w-7xl mx-auto text-center space-y-3">
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-100">
            Aracın DNA'sını Keşfedin, Güvenle Satın Alın
          </h1>
          
          <div className="max-w-2xl mx-auto bg-white p-1 rounded-md border border-slate-700 shadow-lg flex items-center gap-2">
            <div className="text-slate-400 pl-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Marka, model, şehir veya PIN kodu ile ara..." 
              className="w-full bg-transparent border-none outline-none text-xs text-slate-900 font-semibold placeholder:text-slate-400 pl-0.5" 
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Aramayı temizle"
                className="w-8 h-8 grid place-items-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                <Icon name="kapat" size="sm" />
              </button>
            )}
            <button type="button" className="bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs px-5 py-2 rounded-md transition-all active:scale-95 shrink-0 cursor-pointer">
              İlan Ara
            </button>
          </div>
        </div>
      </div>

      {/* 3.2 ANA MİZANPAJ (ÇİFT SÜTUN LU) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* SOL SIDEBAR: HIZLI RADAR & FİLTRELER */}
          <aside className="lg:col-span-3 space-y-5 select-none">
            
            {/* HIZLI SÜZGEÇ RADARI */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-2">
              <h4 className="text-xs font-extrabold text-slate-900 tracking-tight pb-2.5 border-b border-slate-100">
                Hızlı Süzgeç Radarı
              </h4>
              
              <div className="flex flex-col gap-0.5 text-xs font-semibold pt-1">
                
                <div 
                  onClick={() => setQuickFilter('all')} 
                  className={`px-3 py-2 rounded-md cursor-pointer flex justify-between items-center transition-colors duration-75 border-l-2 ${
                    quickFilter === 'all' 
                      ? 'bg-indigo-50/80 text-indigo-700 font-bold border-indigo-600' 
                      : 'border-transparent text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span>Vitrin İlanları</span>
                  <span className="text-xs text-slate-400 font-mono font-normal">({featuredListings.length})</span>
                </div>

                <div 
                  onClick={() => setQuickFilter('urgent')} 
                  className={`px-3 py-2 rounded-md cursor-pointer flex justify-between items-center transition-colors duration-75 border-l-2 ${
                    quickFilter === 'urgent' 
                      ? 'bg-indigo-50/80 text-indigo-700 font-bold border-indigo-600' 
                      : 'border-transparent text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span>Acil Satılıklar</span>
                </div>

                <div 
                  onClick={() => setQuickFilter('highTrust')} 
                  className={`px-3 py-2 rounded-md cursor-pointer flex justify-between items-center transition-colors duration-75 border-l-2 ${
                    quickFilter === 'highTrust' 
                      ? 'bg-indigo-50/80 text-indigo-700 font-bold border-indigo-600' 
                      : 'border-transparent text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span>Güven Skoru (%80+)</span>
                </div>

                <div 
                  onClick={() => setQuickFilter('priceDrop')} 
                  className={`px-3 py-2 rounded-md cursor-pointer flex justify-between items-center transition-colors duration-75 border-l-2 ${
                    quickFilter === 'priceDrop' 
                      ? 'bg-indigo-50/80 text-indigo-700 font-bold border-indigo-600' 
                      : 'border-transparent text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span>Fiyatı Düşenler</span>
                </div>

              </div>
            </div>

            {/* FİLTRE MATRİSİ */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-4">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                <h4 className="text-xs font-extrabold text-slate-900 tracking-tight">Filtreler</h4>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  aria-label="Tüm filtreleri sıfırla"
                  className="inline-flex items-center min-h-[24px] px-1.5 -mx-1.5 rounded text-xs text-indigo-600 font-bold hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                >
                  Sıfırla
                </button>
              </div>
              
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">Marka</span>
                <div className="flex flex-col gap-0.5 text-xs text-slate-700 max-h-48 overflow-y-auto pr-1">
                  {uniqueBrands.map((b) => {
                    const count = b === 'Tümü' ? listings.length : (brandCounts[b] || 0);
                    return (
                      <div 
                        key={b} 
                        onClick={() => setSelectedBrand(b)} 
                        className={`px-2.5 py-1.5 rounded cursor-pointer flex justify-between items-center transition-colors duration-75 ${
                          selectedBrand === b ? 'bg-slate-100 text-indigo-700 font-bold' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span>{b}</span>
                        <span className="text-[11px] text-slate-400 font-mono font-normal">({count})</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">Fiyat (₺)</span>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" placeholder="Min" value={filters.minPrice} onChange={(e) => handleFilterChange('minPrice', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs outline-none focus:border-indigo-600" />
                  <input type="number" placeholder="Max" value={filters.maxPrice} onChange={(e) => handleFilterChange('maxPrice', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs outline-none focus:border-indigo-600" />
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">Model Yılı</span>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" placeholder="Min" value={filters.minYear} onChange={(e) => handleFilterChange('minYear', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs outline-none focus:border-indigo-600" />
                  <input type="number" placeholder="Max" value={filters.maxYear} onChange={(e) => handleFilterChange('maxYear', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs outline-none focus:border-indigo-600" />
                </div>
              </div>

            </div>

          </aside>

          {/* SAĞ SAHA: HOVER AKSIYONLU HİZMET BAR & VİTRİN */}
          <section className="lg:col-span-9 space-y-6">
            
            {/* HOVER AKSIYONLU HİZMET KARTLARI */}
            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs select-none">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                
                {/* KART 1: GARAJ */}
                <button
                  type="button"
                  onClick={onNavigateToGarage}
                  className="bg-white border border-slate-200/90 rounded-md p-3 transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-slate-300 cursor-pointer group flex flex-col justify-between min-h-[110px] text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600"
                >
                  <div>
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center mb-2 shadow-xs">
                      <Icon name="arac" size="sm" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      Tescilli Garajım
                    </h4>
                    <p className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5">
                      Ruhsatlı araçlarınızı ve geçmişi yönetin.
                    </p>
                  </div>
                  <div className="mt-2 text-[10px] font-bold text-blue-600 border-b-2 border-blue-600 w-max opacity-80 group-hover:opacity-100 transition-all">
                    Garajıma Git &gt;
                  </div>
                </button>

                {/* KART 2: KÜNYE */}
                <button
                  type="button"
                  onClick={onNavigateToVerify}
                  className="bg-white border border-slate-200/90 rounded-md p-3 transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-slate-300 cursor-pointer group flex flex-col justify-between min-h-[110px] text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600"
                >
                  <div>
                    <div className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center mb-2 shadow-xs">
                      <Icon name="pinKod" size="sm" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
                      Künye Sorgula
                    </h4>
                    <p className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5">
                      PIN ile tescilli araç DNA'sını doğrulayın.
                    </p>
                  </div>
                  <div className="mt-2 text-[10px] font-bold text-rose-600 border-b-2 border-rose-600 w-max opacity-80 group-hover:opacity-100 transition-all">
                    Sorgulama Yap &gt;
                  </div>
                </button>

                {/* KART 3: SİGORTA */}
                <button
                  type="button"
                  onClick={onNavigateToInsurance}
                  className="bg-white border border-slate-200/90 rounded-md p-3 transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-slate-300 cursor-pointer group flex flex-col justify-between min-h-[110px] text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600"
                >
                  <div>
                    <div className="w-6 h-6 rounded-full bg-[#1e293b] text-white flex items-center justify-center mb-2 shadow-xs">
                      <Icon name="kalkan" size="sm" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-slate-900 transition-colors">
                      Sigorta & Kasko
                    </h4>
                    <p className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5">
                      Canlı poliçe tekliflerini karşılaştırın.
                    </p>
                  </div>
                  <div className="mt-2 text-[10px] font-bold text-slate-900 border-b-2 border-slate-900 w-max opacity-80 group-hover:opacity-100 transition-all">
                    Teklif Al &gt;
                  </div>
                </button>

                {/* KART 4: BAKIM */}
                <button
                  type="button"
                  onClick={onNavigateToMaintenance}
                  className="bg-white border border-slate-200/90 rounded-md p-3 transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-slate-300 cursor-pointer group flex flex-col justify-between min-h-[110px] text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600"
                >
                  <div>
                    <div className="w-6 h-6 rounded-full bg-slate-500 text-white flex items-center justify-center mb-2 shadow-xs">
                      <Icon name="anahtar" size="sm" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-slate-700 transition-colors">
                      Bakım Takvimi
                    </h4>
                    <p className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5">
                      Periyodik servis ve usta faturaları.
                    </p>
                  </div>
                  <div className="mt-2 text-[10px] font-bold text-slate-700 border-b-2 border-slate-700 w-max opacity-80 group-hover:opacity-100 transition-all">
                    Randevu Al &gt;
                  </div>
                </button>

                {/* KART 5: AI DEĞERLEME */}
                <button
                  type="button"
                  onClick={() => toast.bilgi('Yapay zeka fiyat endeksi yakında açılacak.')}
                  className="bg-white border border-slate-200/90 rounded-md p-3 transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-slate-300 cursor-pointer group flex flex-col justify-between min-h-[110px] text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600 col-span-2 md:col-span-1"
                >
                  <div>
                    <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center mb-2 shadow-xs">
                      <Icon name="parlama" size="sm" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                      AI Değerleme
                    </h4>
                    <p className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5">
                      Piyasa verilerine göre adil değer.
                    </p>
                  </div>
                  <div className="mt-2 text-[10px] font-bold text-amber-600 border-b-2 border-amber-500 w-max opacity-80 group-hover:opacity-100 transition-all">
                    Fiyat Öğren &gt;
                  </div>
                </button>

              </div>
            </div>

            {/* 🚀 3.3 VİTRİN ALANI VE YENİLENMİŞ VİTRİN PANEL HEADER'I */}
            <div className="space-y-4">
              
             {/* =========================================================================
    🚀 VİTRİN BÖLÜM BAŞLIĞI (SAYACSIZ, TERTEMİZ VE KURUMSAL)
   ========================================================================= */}
<div className="flex justify-between items-baseline pb-2 border-b border-slate-200 select-none mb-3">
  
  {/* SOL KANAT: SADE VE NET BAŞLIK */}
  <h3 className="text-lg font-black text-slate-900 tracking-tight">
    Vitrin İlanları
  </h3>

  {/* SAĞ KANAT: TÜMÜNÜ GÖSTER LINKI */}
  {featuredListings.length > 12 && (
    <button
      onClick={() => setShowAllVitrin(!showAllVitrin)}
      className="text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer flex items-center gap-1"
    >
      <span>{showAllVitrin ? 'Görünümü Daralt' : 'Tüm vitrin ilanları >'}</span>
    </button>
  )}
</div>

              {/* İLAN LİSTELEME GRİDİ */}
              {loading ? (
                /* Vitrin kart izgarasi bekleniyor -> kart iskeleti. */
                <GlobalStepLoader mode="iskelet" varyant="kart" kapsayici={false} baslik={false} adet={6} />
              ) : displayedVitrinListings.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-center space-y-2 bg-white rounded-md border border-dashed border-slate-200 p-6">
                  <h4 className="text-xs font-bold text-slate-900">Anasayfa Vitrininde İlan Bulunamadı</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Anasayfada sadece <b>₺250 Vitrin Dopingi</b> satın alınan ayrıcalıklı araçlar sergilenmektedir.
                  </p>
                  <button
                    onClick={onNavigateToGarage}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded transition-all cursor-pointer mt-1"
                  >
                    Aracınızı Vitrine Çıkartın
                  </button>
                </div>
              ) : (
                /* ARABAM.COM STYLE VİTRİN KARTLARI GRİDİ */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3.5">
                  {displayedVitrinListings.map((item) => (
                    <ArabamStyleVitrinCard key={item.listing_id || item.id} item={item} onSelectVehicle={onSelectVehicle} />
                  ))}
                </div>
              )}
            </div>

          </section>

        </div>
      </div>

    </div>
  );
}

// =========================================================================
// 🚀 ARABAM.COM PIXEL-PERFECT VİTRİN KARTI (ArabamStyleVitrinCard)
// =========================================================================
function ArabamStyleVitrinCard({ item, onSelectVehicle }) {
  const firstPhoto = item.image_url ? item.image_url.split(',')[0].trim() : null;

  return (
    <div 
      onClick={() => onSelectVehicle(item)} 
      className="bg-white border border-slate-200/90 hover:border-slate-400 rounded-md overflow-hidden shadow-2xs hover:shadow-md transition-all duration-150 cursor-pointer group flex flex-col justify-between select-none p-1.5"
    >
      <div className="h-36 w-full bg-[#F1F5F9] rounded flex items-center justify-center overflow-hidden shrink-0 relative">
        {firstPhoto ? (
          <img 
            src={firstPhoto} 
            alt={`${item.brand} ${item.model}`} 
            className="w-full h-full object-contain" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-400 bg-slate-100">
            GÖRSEL YOK
          </div>
        )}
      </div>
      
      <div className="pt-2 px-1 pb-1 flex-1 flex flex-col justify-between bg-white">
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs font-bold text-slate-900">
            <span className="truncate">{item.city || 'Ankara'}</span>
            <span className="text-slate-800 font-semibold">{item.year}</span>
          </div>

          <h4 className="text-[12px] font-normal text-slate-700 leading-snug line-clamp-2 min-h-[32px]">
            {item.listing_title || `${item.brand} ${item.model} ${item.package || ''}`}
          </h4>
        </div>

        <div className="mt-2 bg-slate-50 border border-slate-200/80 rounded px-2 py-1 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-medium">Güven Karne Skoru</span>
          <span className="text-[11px] font-bold text-indigo-600">%{item.trust_score ?? 60}</span>
        </div>

        <div className="mt-2 text-sm font-bold text-slate-900 tracking-tight">
          {item.price ? Number(item.price).toLocaleString('tr-TR') : '0'} TL
        </div>
      </div>
    </div>
  );
}