// =========================================================================
// OTO-CV VİTRİN BİLEŞENİ: HIGH-PERFORMANCE WEB VİTRİNİ (MarketplaceView.jsx)
// İşlev: Performans optimizasyonlu süzgeç motoru, ferah sol sidebar, 
//        Arabam.com tarzı aksiyonlu hizmet barı ve kurumsal Vitrin Paneli.
// =========================================================================

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { favoriKimlikleri, favoriDegistir } from '../../services/favoriService';
import { fetchMarketplaceListings } from '../../services/marketplaceService';
import { useToast } from '../../context/ToastContext';
import { useRouter } from 'next/navigation';
import Icon from '../common/icons';
import { pinNormalize } from '../../utils/pinUretici';
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

  // Favoriler ayrı çekiliyor: vitrin listesi oturumsuz da görünüyor, favori
  // ise oturuma bağlı. İkisini tek sorguya bağlamak listeyi oturum
  // gerektirir hâle getirirdi.
  const router = useRouter();
  // Dar ekranda süzgeç panelinin açık/kapalı durumu.
  const [suzgecAcik, setSuzgecAcik] = useState(false);
  const [favoriler, setFavoriler] = useState(() => new Set());

  useEffect(() => {
    let iptal = false;
    favoriKimlikleri().then((k) => { if (!iptal) setFavoriler(k); });
    return () => { iptal = true; };
  }, []);

  const favoriTikla = async (pin) => {
    if (!pin) return;
    const suAn = favoriler.has(pin);

    // İYİMSER GÜNCELLEME: kalp anında dönüyor. Ağ yanıtını beklemek, tek
    // tıklık bir işlemi yavaş hissettiriyor. Hata gelirse geri alınıyor.
    setFavoriler((önceki) => {
      const yeni = new Set(önceki);
      if (suAn) yeni.delete(pin); else yeni.add(pin);
      return yeni;
    });

    const { favorili, hata } = await favoriDegistir(pin, suAn);

    setFavoriler((önceki) => {
      const yeni = new Set(önceki);
      if (favorili) yeni.add(pin); else yeni.delete(pin);
      return yeni;
    });

    if (hata) toast.hata(hata);
  };

  const loadLiveListings = async () => {
    try {
      setLoading(true);
      const result = await fetchMarketplaceListings();
      if (result.success) {
        setListings(result.data || []);
      }
    } catch (error) {
      console.error("Vitrin yüklenirken hata oluştu:", error);
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

  // Vitrindeki Araçlar (Sadece Dopingli İlanlar)
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
        true;

      // Fiyat süzgeci KALDIRILDI: tutar hiç gösterilmediği için süzülecek
      // bir şey de yok.
      const year = Number(item.year) || 0;

      return matchesBrand && matchesQuery && matchesQuick && 
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
          {/* "Güvenle Satın Alın" KALKTI: satış sitesi başlığıydı. Ürünün
              vaadi aracı satmak değil, geçmişini belgelemek. */}
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-100">
            Aracın Geçmişini Bilin, Kararınızı Belgeyle Verin
          </h1>
          
          {/* ARAMA — PIN ARTIK GERÇEKTEN İŞLENİYOR.
              Yer tutucu "PIN kodu ile ara" diyordu ama girdi yalnızca vitrin
              listesini süzüyordu: PIN yazan kullanıcı hiçbir sonuç almıyor ve
              sitenin çalışmadığını sanıyordu. Vaat edip yapmamak, hiç
              vaat etmemekten kötü.

              Artık girdi PIN desenine uyuyorsa doğrudan karneye gidiliyor;
              uymuyorsa liste süzülüyor. `pinNormalize` alfabe dışı karakteri
              zaten reddediyor, yani marka adı yanlışlıkla PIN sanılmıyor. */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const pin = pinNormalize(searchQuery);
              if (pin) router.push(`/karne/${encodeURIComponent(pin)}`);
            }}
            className="max-w-2xl mx-auto bg-white p-1 rounded-xl border border-slate-700 shadow-lg flex items-center gap-2"
          >
            <div className="text-slate-400 pl-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Marka, model, şehir veya PIN ile ara"
              placeholder="Marka, model, şehir veya PIN kodu ile ara..."
              className="w-full bg-transparent border-none outline-none text-sm text-slate-900 font-semibold placeholder:text-slate-400 placeholder:font-normal pl-0.5"
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
            <button type="submit" className="bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs px-5 min-h-[40px] rounded-lg transition-all active:scale-95 shrink-0 cursor-pointer">
              Ara
            </button>
          </form>
        </div>
      </div>

      {/* 3.2 ANA MİZANPAJ (ÇİFT SÜTUN LU) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* SOL SIDEBAR: HIZLI RADAR & FİLTRELER */}
          {/* KENAR ÇUBUĞU — DAR EKRANDA GİZLİ.
              Izgara `grid-cols-1 lg:grid-cols-12` olduğu için 1024px altında
              TEK SÜTUNA düşüyordu ve kenar çubuğu tam genişlik olup listenin
              üstünü baştan aşağı kaplıyordu: kullanıcı araçları görmek için
              tüm süzgeçleri kaydırmak zorundaydı.

              Eşik `lg` (1024px): tablet dikey ve altı için yatay süzgeç
              şeridi, üstünde klasik kenar çubuğu. Eşiği daha aşağı çekmek
              (md = 768px) kenar çubuğunu okunamayacak kadar daraltıyordu. */}
          <aside className="hidden lg:block lg:col-span-3 space-y-5 select-none">
            
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
                  <span>Vitrindeki Araçlar</span>
                  <span className="text-xs text-slate-400 font-mono font-normal">({featuredListings.length})</span>
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

            {/* DAR EKRAN SÜZGEÇ ŞERİDİ — yalnızca lg altında.
                Kenar çubuğunun tamamını dikey olarak listenin üstüne yığmak
                yerine, en çok kullanılan üç hızlı süzgeç yatay kaydırılabilir
                çip olarak duruyor. Marka ve yıl süzgeçleri "Filtreler"
                düğmesiyle açılıyor; kapalıyken hiç yer kaplamıyor.

                Yatay kaydırma bilerek: mobilde çipleri alt satıra sarmak
                şeridin yüksekliğini iki-üç katına çıkarıyor ve yine listeyi
                aşağı itiyordu. */}
            <div className="lg:hidden space-y-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {[
                  { anahtar: 'all',       ad: 'Tümü' },
                  { anahtar: 'featured',  ad: `Vitrindeki (${featuredListings.length})` },
                  { anahtar: 'highTrust', ad: 'Güven %80+' },
                ].map((c) => (
                  <button
                    key={c.anahtar}
                    type="button"
                    onClick={() => setQuickFilter(c.anahtar)}
                    aria-pressed={quickFilter === c.anahtar}
                    className={`shrink-0 min-h-[38px] px-3.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                      quickFilter === c.anahtar
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {c.ad}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setSuzgecAcik((a) => !a)}
                  aria-expanded={suzgecAcik}
                  className={`shrink-0 min-h-[38px] px-3.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer inline-flex items-center gap-1.5 ml-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                    suzgecAcik ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  Filtreler
                  <svg className={`w-3 h-3 transition-transform ${suzgecAcik ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              </div>

              {suzgecAcik && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 motion-safe:animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="etiket text-slate-400">Marka</span>
                    <button type="button" onClick={clearAllFilters} className="text-[11px] font-black text-indigo-600 hover:underline cursor-pointer">
                      Sıfırla
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {uniqueBrands.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleFilterChange('brand', m)}
                        className={`min-h-[34px] px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                          filters.brand === m
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <span className="etiket text-slate-400">Model Yılı</span>
                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                      <input type="number" placeholder="Min" value={filters.minYear} onChange={(e) => handleFilterChange('minYear', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 min-h-[38px] text-xs outline-none focus:border-indigo-600" />
                      <input type="number" placeholder="Max" value={filters.maxYear} onChange={(e) => handleFilterChange('maxYear', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 min-h-[38px] text-xs outline-none focus:border-indigo-600" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            
            {/* =====================================================================
                HİZMET ŞERİDİ — BEŞ EŞİT KARTTAN HİYERARŞİYE

                Eski hâli beş kutuydu: aynı boyut, aynı ağırlık, aynı sesle
                bağıran beş öğe. Hepsi eşit olunca hiçbiri öne çıkmıyor ve
                şerit "bir şeyler koyalım" gibi duruyordu.

                İki somut kusur vardı:
                  · "Künye Sorgula" ve "Sicil Sorgula" AYNI yere gidiyordu
                    (ikisi de `onNavigateToVerify`). Kullanıcıya iki kapı
                    gösterip tek odaya çıkarmak.
                  · Hero arama kutusu "PIN kodu ile ara" diyor ama PIN'i hiç
                    işlemiyordu — o da düzeltildi.

                Yeni yapı: ürünün ÇEKİRDEK eylemi (PIN ile sicil sorgulama)
                geniş ve baskın; yardımcı üç hizmet yanında ince bir sütunda.
                Şerit artık ne yapılacağını söylüyor, seçenek sıralamıyor.
            ===================================================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 select-none">

              {/* ÇEKİRDEK EYLEM */}
              <button
                type="button"
                onClick={onNavigateToVerify}
                className="lg:col-span-2 group text-left bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-700 text-white rounded-2xl p-5 flex flex-col justify-between min-h-[128px] transition-all shadow-sm hover:shadow-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
              >
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 rounded-xl bg-white/15 grid place-items-center shrink-0 group-hover:bg-white/25 transition-colors">
                    <Icon name="pinKod" size="lg" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black tracking-tight">Sicil Sorgula</h3>
                    <p className="text-[11px] text-indigo-100 font-medium leading-relaxed mt-0.5">
                      Elinizdeki PIN ile aracın bakım geçmişini, poliçe durumunu ve
                      sicil puanını görün.
                    </p>
                  </div>
                </div>
                <span className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-black">
                  Karneyi aç
                  <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </button>

              {/* YARDIMCI HİZMETLER */}
              <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { ad: 'Garajım',        ozet: 'Tescilli araçlarınız ve geçmişi.', ikon: 'arac',   eylem: onNavigateToGarage,      renk: 'text-blue-600 bg-blue-50 border-blue-100' },
                  { ad: 'Sigorta & Kasko', ozet: 'Poliçe tekliflerini karşılaştırın.', ikon: 'kalkan', eylem: onNavigateToInsurance,  renk: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                  { ad: 'Bakım Takvimi',  ozet: 'Periyodik servis ve faturalar.',   ikon: 'takvim', eylem: onNavigateToMaintenance, renk: 'text-amber-600 bg-amber-50 border-amber-100' },
                ].map((h) => (
                  <button
                    key={h.ad}
                    type="button"
                    onClick={h.eylem}
                    className="group text-left bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm rounded-2xl p-4 flex flex-col justify-between min-h-[128px] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                  >
                    <span className={`w-9 h-9 rounded-xl grid place-items-center border ${h.renk}`}>
                      <Icon name={h.ikon} size="md" />
                    </span>
                    <span className="mt-3 block">
                      <span className="block text-xs font-black text-slate-900 tracking-tight">{h.ad}</span>
                      <span className="block text-[11px] text-slate-500 font-medium leading-relaxed mt-0.5">{h.ozet}</span>
                    </span>
                  </button>
                ))}
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
    Vitrindeki Araçlar
  </h3>

  {/* SAĞ KANAT: TÜMÜNÜ GÖSTER LINKI */}
  {featuredListings.length > 12 && (
    <button
      onClick={() => setShowAllVitrin(!showAllVitrin)}
      className="text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer flex items-center gap-1"
    >
      <span>{showAllVitrin ? 'Görünümü Daralt' : 'Tüm vitrin araçları >'}</span>
    </button>
  )}
</div>

              {/* İLAN LİSTELEME GRİDİ */}
              {loading ? (
                /* Vitrin kart izgarasi bekleniyor -> kart iskeleti. */
                <GlobalStepLoader mode="iskelet" varyant="kart" kapsayici={false} baslik={false} adet={6} />
              ) : displayedVitrinListings.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-center space-y-2 bg-white rounded-md border border-dashed border-slate-200 p-6">
                  <h4 className="text-xs font-bold text-slate-900">Vitrinde Araç Bulunamadı</h4>
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
                    <ArabamStyleVitrinCard
                      key={item.listing_id || item.id}
                      item={item}
                      onSelectVehicle={onSelectVehicle}
                      favorili={favoriler.has(item.pin_code)}
                      onFavori={favoriTikla}
                    />
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
function ArabamStyleVitrinCard({ item, onSelectVehicle, favorili = false, onFavori }) {
  const firstPhoto = item.image_url ? item.image_url.split(',')[0].trim() : null;

  return (
    // KART ARTIK `div` DEĞİL — KLAVYEYLE AÇILABİLİYOR.
    // Eskiden `<div onClick>` idi: fare olmadan hiçbir araca girilemiyordu.
    // Kalp ayrı bir düğme olduğu için kart `button` değil `article` +
    // içindeki başlık bağlantısı olmalıydı; ama mevcut düzeni bozmadan en
    // küçük doğru çözüm: karta `role="button"`, `tabIndex` ve klavye
    // işleyicisi vermek.
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelectVehicle(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectVehicle(item); }
      }}
      aria-label={`${item.brand || ''} ${item.model || ''} ${item.year || ''} — sicilini görüntüle`}
      className="bg-white border border-slate-200/90 hover:border-slate-400 rounded-md overflow-hidden shadow-2xs hover:shadow-md transition-all duration-150 cursor-pointer group flex flex-col justify-between select-none p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1"
    >
      <div className="h-36 w-full bg-[#F1F5F9] rounded flex items-center justify-center overflow-hidden shrink-0 relative">
        {/* FAVORİ — kartın kendi tıklamasını TETİKLEMEMELİ.
            `stopPropagation` olmadan kalbe basmak aracı da açardı. */}
        {onFavori && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onFavori(item.pin_code); }}
            aria-pressed={!!favorili}
            aria-label={favorili ? 'Favorilerden çıkar' : 'Favorilere ekle'}
            className={`absolute top-1.5 right-1.5 z-10 w-9 h-9 grid place-items-center rounded-full bg-white/90 backdrop-blur-sm border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
              favorili
                ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                : 'border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200'
            }`}
          >
            {/* `dolu`: durum yalnızca RENKLE anlatılmıyor. Renk körü
                kullanıcı dolu/boş farkını biçimden görüyor. */}
            <Icon name="kalp" size="md" dolu={!!favorili} />
          </button>
        )}
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
          <span className="text-[11px] font-bold text-indigo-600">{item.trust_score ?? 0}/100</span>
        </div>

        {/* ⚠ TUTAR GÖSTERİLMİYOR — HUKUKİ.
            Ürüne ait herhangi bir fiyat, platformu satış sitesi konumuna
            sokuyor. Bu ürün dijital taşıt sicili. Kartın vurgusu bedel
            değil SİCİL: karne, kartın asıl vaadi. */}
        <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-indigo-600">
          <Icon name="karne" size="xs" />
          Sicil karnesini gör
        </div>
      </div>
    </div>
  );
}