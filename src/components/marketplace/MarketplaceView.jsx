// =========================================================================
// OTO-CV VİTRİN BİLEŞENİ: CANLI PAZARYERİ VE FİLTRELEME MOTORU (MarketplaceView.jsx)
// İşlev: Supabase 'listings' tablosundan canlı verileri çeker, marka ve kelime
//        bazlı filtreleme yapar, 2. SS kart tasarım standardını uygular.
// =========================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { fetchMarketplaceListings } from '../../services/marketplaceService';

export default function MarketplaceView({ 
  onSelectVehicle, 
  onNavigateToGarage, 
  onNavigateToVerify, 
  onNavigateToInsurance, 
  onNavigateToMaintenance 
}) {
  // =========================================================================
  // 1. BLOK: REAKTİF VERİ VE FİLTRE HAFIZASI
  // =========================================================================
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('Tümü');

  useEffect(() => {
    loadLiveListings();
  }, []);

  // Supabase'den canlı ilanları çeken motor
  const loadLiveListings = async () => {
    try {
      setLoading(true);
      const result = await fetchMarketplaceListings();
      if (result.success) {
        setListings(result.data || []);
      }
    } catch (error) {
      console.error("İlanlar yüklenirken hata oluştu:", error);
    } finally { // 🎯 HATA DÜZELTİLDİ: 'font-mono' İFADESİ BURADAN KALDIRILDI
      setLoading(false);
    }
  };

  // =========================================================================
  // 2. BLOK: DİNAMİK MARKA VE ARAMA FİLTRELERİ
  // =========================================================================
  // Veritabanındaki ilanlardan benzersiz markaları dinamik yakalar
  const uniqueBrands = ['Tümü', ...Array.from(new Set(listings.map(item => item.brand).filter(Boolean)))];

  // Arama ve Marka filtrelerini canlı uygulayan dizi
  const filteredListings = listings.filter(item => {
    const matchesBrand = selectedBrand === 'Tümü' || item.brand === selectedBrand;
    
    const query = searchQuery.toLocaleLowerCase('tr-TR').trim();
    const matchesQuery = !query || 
      (item.brand && item.brand.toLocaleLowerCase('tr-TR').includes(query)) ||
      (item.model && item.model.toLocaleLowerCase('tr-TR').includes(query)) ||
      (item.listing_title && item.listing_title.toLocaleLowerCase('tr-TR').includes(query)) ||
      (item.pin_code && item.pin_code.toLocaleLowerCase('tr-TR').includes(query)) ||
      (item.city && item.city.toLocaleLowerCase('tr-TR').includes(query));

    return matchesBrand && matchesQuery;
  });

  // =========================================================================
  // 3. BLOK: ARAYÜZ RENDER KATMANI
  // =========================================================================
  return (
    <div className="animate-fadeIn">
      
      {/* KANVAS ÜST BANNERI VE BİLGİ ARAMA BARI */}
      <div className="bg-slate-950 text-white py-10 px-4 relative overflow-hidden border-b border-slate-900 select-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[160px] bg-indigo-600/10 rounded-full blur-[90px] pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center space-y-3.5 relative z-10">
          <h1 className="text-xl md:text-2xl font-black tracking-tight">
            Aracın DNA'sını Keşfedin, Güvenle Satın Alın
          </h1>
          
          <div className="max-w-md mx-auto pt-1">
            <div className="w-full bg-white p-1 rounded-xl border border-gray-800 shadow-xl flex items-center gap-2">
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
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600 text-xs px-1"
                >
                  ✕
                </button>
              )}
              <button 
                type="button" 
                className="bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all active:scale-95 shrink-0 cursor-pointer"
              >
                İlan Ara
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ÇİFT SÜTUNLU ANA MİZANPAJ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* SOL SÜTUN: SERVİS HUB'I VE MARKA FİLTRE MATRİSİ */}
          <aside className="lg:col-span-3 space-y-5 select-none">
            
            {/* DİJİTAL TAŞIT HİZMETLERİ MENÜSÜ */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-[0_15px_35px_rgba(15,23,42,0.012)] space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 mt-1 tracking-tight leading-snug">
                  Dijital Taşıt Hizmetleri
                </h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5 leading-normal">
                  Aracınızın tescilli geçmişini mühürleyin ve servis süreçlerini yönetin.
                </p>
              </div>

              <div className="flex flex-col gap-0.5 text-xs font-semibold text-slate-700">
                <div onClick={onNavigateToGarage} className="px-2.5 py-2.5 rounded-xl hover:bg-slate-50 hover:text-indigo-600 cursor-pointer flex items-center gap-3 transition-colors duration-200 group">
                  <svg className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 0l-9 3.273m9-3.273v1.514" />
                  </svg>
                  <span>Tescilli Taşıtlarım (Garajım)</span>
                </div>
                
                <div onClick={onNavigateToVerify} className="px-2.5 py-2.5 rounded-xl hover:bg-slate-50 hover:text-indigo-600 cursor-pointer flex items-center gap-3 transition-colors duration-200 group">
                  <svg className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <span>Oto.CV Künyesi Sorgula</span>
                </div>

                <div onClick={onNavigateToInsurance} className="px-2.5 py-2.5 rounded-xl hover:bg-slate-50 hover:text-indigo-600 cursor-pointer flex items-center gap-3 transition-colors duration-200 group">
                  <svg className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286z" />
                  </svg>
                  <span>Akıllı Sigorta & Kasko Teklifi</span>
                </div>

                <div onClick={onNavigateToMaintenance} className="px-2.5 py-2.5 rounded-xl hover:bg-slate-50 hover:text-indigo-600 cursor-pointer flex items-center gap-3 transition-colors duration-200 group">
                  <svg className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.67 2.67 0 1113.42 17.17l-5.75-5.75a2.67 2.67 0 113.75-3.75l5.75 5.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Usta & Periyodik Bakım Takvimi</span>
                </div>

                <div onClick={() => alert('Yapay Zeka Fiyat ve Güven Endeksi Yakında Aktif Edilecek!')} className="px-2.5 py-2.5 rounded-xl hover:bg-slate-50 hover:text-indigo-600 cursor-pointer flex items-center gap-3 transition-colors duration-200 group">
                  <svg className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                  </svg>
                  <span>Yapay Zeka Araç Değerleme</span>
                </div>
              </div>
            </div>

            {/* FİLTRELEME MATRİSİ KARTI */}
            <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-800 tracking-wide uppercase">FİLTRELEME MATRİSİ</h4>
                <p className="text-[10px] text-slate-400 font-medium">Aktif pazaryeri araçlarını markaya göre süzün.</p>
              </div>
              <div className="w-full h-px bg-gray-100" />
              
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-700 tracking-wide block">Markalar</span>
                <div className="flex flex-col gap-0.5 text-xs font-bold text-slate-600">
                  {uniqueBrands.map((b) => {
                    const count = b === 'Tümü' ? listings.length : listings.filter(c => c.brand === b).length;
                    return (
                      <div 
                        key={b} 
                        onClick={() => setSelectedBrand(b)} 
                        className={`px-2.5 py-1.5 rounded-lg cursor-pointer flex justify-between items-center transition-colors ${
                          selectedBrand === b ? 'bg-indigo-50/80 text-indigo-600 font-extrabold' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span>{b}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono font-bold">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </aside>

          {/* SAĞ SÜTUN: CANLI VİTRİN İLAN KARTLARI DİZİLİMİ */}
          <section className="lg:col-span-9 space-y-4">
            
            <div className="flex justify-between items-center border-b border-gray-200 pb-3 select-none">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Öne Çıkan Dijital Sicilli Taşıtlar ({filteredListings.length})
              </h3>
              <span className="text-[11px] text-slate-400 font-bold font-mono">Sıralama: En Yeni İlanlar</span>
            </div>

            {loading ? (
              <div className="py-24 flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-2 bg-white rounded-3xl border border-dashed border-slate-200">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                </div>
                <h4 className="text-sm font-bold text-slate-900">Aranan Kriterlerde İlan Bulunamadı</h4>
                <p className="text-xs text-slate-400">Filtreleri değiştirmeyi veya arama terimini temizlemeyi deneyin.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredListings.map((item) => {
                  const firstPhoto = item.image_url ? item.image_url.split(',')[0].trim() : null;

                  return (
                    <div 
                      key={item.listing_id || item.plate_number} 
                      onClick={() => onSelectVehicle(item)} 
                      className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between"
                    >
                      {/* İLAN FOTOĞRAFI VE ÜST BADGE'LER */}
                      <div className="h-40 w-full relative bg-slate-100 overflow-hidden shrink-0">
                        {firstPhoto ? (
                          <img 
                            src={firstPhoto} 
                            alt={`${item.brand} ${item.model}`} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-400 bg-slate-100">
                            GÖRSEL YOK
                          </div>
                        )}

                        {/* GÜVEN SKORU ROZETİ */}
                        <div className="absolute top-3 left-3 bg-white/95 px-2 py-0.5 rounded-md text-[9px] font-extrabold text-indigo-600 border border-indigo-50 font-mono shadow-xs">
                          Skor: %{item.trust_score ?? 60}
                        </div>

                        {/* PIN KODU ROZETİ */}
                        {item.pin_code && (
                          <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-mono font-bold text-white tracking-widest">
                            {item.pin_code}
                          </div>
                        )}
                      </div>
                      
                      {/* İLAN DETAY ALANI */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-2.5 bg-white">
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase font-mono tracking-wider">
                            {item.year} • {item.fuel_type || 'Benzin'}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 tracking-tight leading-snug truncate">
                            {item.brand} {item.model}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate font-semibold">
                            {item.package || item.listing_title}
                          </p>
                        </div>
                        
                        {/* ALT FİYAT VE KM BARI */}
                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 font-bold">
                          <span className="font-mono text-slate-500">{item.km ? item.km.toLocaleString('tr-TR') : '0'} km</span>
                          <span className="font-extrabold text-slate-900 text-xs font-mono">
                            ₺{item.price ? Number(item.price).toLocaleString('tr-TR') : '0'}
                          </span>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </section>

        </div>
      </div>

    </div>
  );
}