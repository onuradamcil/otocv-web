// =========================================================================
// OTO-CV BİLEŞENİ: MÜŞTERİ AKTİF İLAN YÖNETİM MERKEZİ (MyListingsScreen.jsx)
// İşlev: Kullanıcının yayındaki ilanlarını, favori/görüntülenme istatistiklerini
//        ve doping/düzenleme aksiyonlarını bağımsız ekranda sunar.
// =========================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { fetchMarketplaceListings } from '../../services/marketplaceService';
import PublishListingModal from '../garage/PublishListingModal';
import Icon from '../common/icons';
import GlobalStepLoader from '../common/GlobalStepLoader';

export default function MyListingsScreen({ user, onNavigateToGarage }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedListingForEdit, setSelectedListingForEdit] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    loadMyListings();
  }, [user]);

  const loadMyListings = async () => {
    if (!user) return;
    try {
      setLoading(true);
      // Süzgeç SUNUCUDA. Eskiden `fetchMarketplaceListings()` çağrılıp tüm
      // aktif ilanlar indiriliyor, sonra istemcide `user_id` ile süzülüyordu:
      // üç ilanı olan kullanıcı bütün pazaryerini indiriyordu.
      const res = await fetchMarketplaceListings({ userId: user.id });
      if (res.success) {
        setListings(res.data || []);
      }
    } catch (err) {
      console.error("İlanlar yüklenirken hata:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn space-y-6 select-none">
      
      {/* ÜST BAŞLIK BARI */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <span className="text-[10px] font-bold text-indigo-600 uppercase font-mono tracking-wider block">
            PAZARYERİ İLAN MERKEZİ
          </span>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Aktif Satıştaki İlanlarım ({listings.length})
          </h1>
        </div>
        <button 
          onClick={onNavigateToGarage}
          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
        >
          ← Garajıma Dön
        </button>
      </div>

      {/* İLAN DİZİLİM İÇERİĞİ */}
      {loading ? (
        /* Ilan kartlari bekleniyor -> kart iskeleti. */
        <GlobalStepLoader mode="iskelet" varyant="kart" kapsayici={false} baslik={false} adet={3} />
      ) : listings.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-3 bg-white rounded-3xl border border-dashed border-slate-200">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
            <Icon name="arac" size="xl" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-900">Aktif Yayında İlanınız Bulunmamaktadır</h3>
          <p className="text-xs text-slate-400 max-w-sm">Garajınızdaki araçları pazaryerine çıkararak ilanlarınızı buradan yönetebilirsiniz.</p>
          <button 
            onClick={onNavigateToGarage}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            Garajımdaki Araçları İlana Çıkar
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((item) => {
            const firstPhoto = item.image_url ? item.image_url.split(',')[0].trim() : null;

            return (
              <div key={item.id || item.listing_id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between p-4 space-y-4">
                
                <div className="space-y-3">
                  {/* FOTOĞRAF VE ROZETLER */}
                  {/* alt HER ZAMAN bir dize olmalı. Önceden alt={item.title}
                      yazıyordu; başlık boş geldiğinde React özniteliği hiç
                      basmıyor ve görsel "alt'sız" kalıyordu — ekran okuyucu o
                      zaman dosya adını okur. Yedek olarak marka/model, o da
                      yoksa boş dize (süs görsel) kullanılıyor. */}
                  <div className="h-40 w-full bg-slate-100 rounded-xl overflow-hidden relative">
                    {firstPhoto ? (
                      <img
                        src={firstPhoto}
                        alt={item.title || `${item.brand || ''} ${item.model || ''}`.trim() || ''}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-400">GÖRSEL YOK</div>
                    )}
                    
                    {item.is_featured && (
                      <div className="absolute top-3 left-3 bg-amber-400 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded font-mono uppercase shadow-xs">
                        VİTRİN İLANI
                      </div>
                    )}
                  </div>

                  {/* İLAN BAŞLIK VE LOKASYON */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">{item.year} • {item.vehicle_plate || item.plate_number}</span>
                    <h4 className="text-sm font-extrabold text-slate-900 truncate">{item.brand} {item.model}</h4>
                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{item.title}</p>
                  </div>

                  {/* 📊 İSTATİSTİK BARI (GÖRÜNTÜLENME VE FAVORİ SAYISI) */}
                  <div className="bg-slate-50 p-2.5 rounded-xl flex justify-between items-center text-xs font-semibold text-slate-600 border border-slate-100">
                    <div className="flex items-center gap-1.5" title="Görüntülenme Sayısı">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 123.572M12 20.25c4.97 0 9.185-3.223 10.675-7.69a1.75 1.75 0 000-1.12C21.185 6.973 16.97 3.75 12 3.75s-9.185 3.223-10.675 7.69a1.75 1.75 0 000 1.12C2.815 17.027 7.03 20.25 12 20.25z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{item.views_count || 0} Kez Okundu</span>
                    </div>

                    <div className="flex items-center gap-1.5" title="Favoriye Ekleyenler">
                      <svg className="w-4 h-4 text-rose-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                      </svg>
                      <span className="text-slate-900 font-bold">{item.favorite_count || 0} Favori</span>
                    </div>
                  </div>

                  {/* FİYAT VE KONUM */}
                  <div className="flex justify-between items-center text-xs font-mono font-bold pt-1">
                    <span className="text-slate-500">{item.city} / {item.district}</span>
                    <span className="text-indigo-600 text-sm font-black">₺{Number(item.price).toLocaleString('tr-TR')}</span>
                  </div>
                </div>

                {/* YÖNETİM BUTONU */}
                <button 
                  onClick={() => {
                    setSelectedListingForEdit({
                      id: item.id || item.listing_id,
                      brand: item.brand,
                      model: item.model,
                      year: item.year,
                      plate_number: item.vehicle_plate || item.plate_number,
                      km: item.km,
                      price: item.price,
                      // ⚠ ALAN ADLARI SERVİSİN DÖNDÜRDÜĞÜ ADLAR.
                      // Eskiden `item.title` ve `item.description` okunuyordu
                      // ama `fetchMarketplaceListings` bu alanları
                      // `listing_title` / `listing_description` adıyla
                      // düzleştiriyor. Sonuç: düzenleme ekranı açıklamayı HER
                      // SEFERİNDE boş açıyordu ve en az 10 karakter zorunlu
                      // olduğu için kullanıcı eski metnini yeniden yazmadan
                      // kaydedemiyordu — yazınca da eskisinin üstüne yazıyordu.
                      listing_title: item.listing_title ?? item.title,
                      listing_description: item.listing_description ?? item.description,
                      city: item.city,
                      district: item.district,
                      tramer_amount: item.tramer_amount,
                      is_featured: item.is_featured,
                      is_listed: true
                    });
                    setIsEditModalOpen(true);
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl transition-all text-center cursor-pointer"
                >
                  İlanı Düzenle / Vitrin Yükle
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* İLAN DÜZENLEME MODALI */}
      {selectedListingForEdit && (
        <PublishListingModal 
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          vehicle={selectedListingForEdit}
          onSuccess={loadMyListings}
        />
      )}
    </div>
  );
}