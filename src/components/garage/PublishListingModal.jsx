// =========================================================================
// OTO-CV UI MODÜLÜ: KURUMSAL PAZARYERİ İLAN SİHİRBAZI (PublishListingModal.jsx)
// İşlev: Genişletilmiş modal ekranı, İl/İlçe seçimi ve DEMO DOPİNG / VİTRİN SEÇİMİ.
// =========================================================================

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { publishVehicleListing, unpublishVehicleListing } from '../../services/marketplaceService';
import { TURKEY_LOCATIONS } from '../../data/turkeyLocations';
import Icon from '../common/icons';
import PaywallDialog from '../common/PaywallDialog';
import { URUNLER, fiyatYaz } from '../../data/paketler';

export default function PublishListingModal({ isOpen, onClose, vehicle, onSuccess }) {
  // =========================================================================
  // 1. BLOK: YARDIMCI BİNLİK AYRAÇ VE RAKAM FORMATLAYICILAR
  // =========================================================================
  const formatDisplayNumber = (val) => {
    if (val === null || val === undefined || val === '') return '';
    const raw = val.toString().replace(/\D/g, '');
    if (raw === '') return '';
    return new Intl.NumberFormat('tr-TR').format(raw);
  };

  const parseRawNumber = (val) => {
    if (val === '' || val === null || val === undefined) return null;
    const cleaned = val.toString().replace(/\D/g, '');
    if (cleaned === '') return null;
    return parseInt(cleaned, 10);
  };

  // =========================================================================
  // 2. BLOK: FORM DURUM VE ARAMA HAFIZASI
  // =========================================================================
  const [priceDisplay, setPriceDisplay] = useState('');
  const [tramerDisplay, setTramerDisplay] = useState('0');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Başlangıç BOŞ: kullanıcının seçmediği bir şehri onun adına seçmiyoruz.
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');

  // 💎 DEMO VİTRİN / DOPİNG STATE'İ
  const [isFeatured, setIsFeatured] = useState(false);
  // Vitrin ücretli bir işlem: seçim artık doğrudan çevrilmiyor, paywall'dan
  // geçiyor. Kaldırmak paywall gerektirmiyor — para iadesi değil, sadece
  // henüz yayınlanmamış bir ilanın tercihinden vazgeçmek.
  const [paywallAcik, setPaywallAcik] = useState(false);

  // Custom Dropdown Açık/Kapalı ve Arama State'leri
  const [isCityOpen, setIsCityOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  
  const [isDistrictOpen, setIsDistrictOpen] = useState(false);
  const [districtSearch, setDistrictSearch] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  const cityDropdownRef = useRef(null);
  const districtDropdownRef = useRef(null);

  // Dışarı tıklamaları dinleyip dropdown'ları kapatan sensör
  useEffect(() => {
    function handleClickOutside(event) {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target)) {
        setIsCityOpen(false);
      }
      if (districtDropdownRef.current && !districtDropdownRef.current.contains(event.target)) {
        setIsDistrictOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Modal açıldığında verileri biçimlendirip yükleyen sensör
  useEffect(() => {
    if (vehicle && isOpen) {
      setPriceDisplay(vehicle.price ? formatDisplayNumber(vehicle.price) : '');
      setTramerDisplay(vehicle.tramer_amount !== undefined && vehicle.tramer_amount !== null ? formatDisplayNumber(vehicle.tramer_amount) : '0');
      
      setTitle(vehicle.listing_title || `${vehicle.year} ${vehicle.brand} ${vehicle.model}`);
      setDescription(vehicle.listing_description || '');
      setIsFeatured(vehicle.is_featured || false);
      
      // SABİT "Ankara / Çankaya" VARSAYILANI KALDIRILDI.
      //
      // Eskiden araçta il yoksa doğrudan 'Ankara', ilçe yoksa o ilin İLK
      // ilçesi ('Çankaya') seçiliyordu. İki sorun vardı:
      //   · `GarageScreen` il/ilçeyi null'a ezdiği için araç vitrinde
      //     değilken bu dal HER ZAMAN çalışıyordu — sihirbazda İzmir/Konak
      //     seçen kullanıcı burada Ankara buluyordu.
      //   · Kullanıcının seçmediği bir konumu onun adına seçmek, aracı
      //     yanlış şehirde göstermek demek. Boş bırakmak dürüst: doğrulama
      //     zaten il ve ilçeyi zorunlu tutuyor.
      const gecerliIl = vehicle.city && TURKEY_LOCATIONS[vehicle.city] ? vehicle.city : '';
      setSelectedCity(gecerliIl);

      const ilIlceleri = TURKEY_LOCATIONS[gecerliIl] || [];
      setSelectedDistrict(
        vehicle.district && ilIlceleri.includes(vehicle.district) ? vehicle.district : ''
      );
      
      setErrorMessage(null);
      setValidationErrors({});
      setIsCityOpen(false);
      setIsDistrictOpen(false);
      setCitySearch('');
      setDistrictSearch('');
    }
  }, [vehicle, isOpen]);

  if (!isOpen || !vehicle) return null;

  // =========================================================================
  // 3. BLOK: İL VE İLÇE SEÇİM AKIŞLARI
  // =========================================================================
  const handleSelectCity = (city) => {
    setSelectedCity(city);
    setIsCityOpen(false);
    setCitySearch('');
    if (validationErrors.city) setValidationErrors(prev => ({ ...prev, city: null }));
    
    const districts = TURKEY_LOCATIONS[city] || [];
    setSelectedDistrict(districts[0] || '');
    if (validationErrors.district) setValidationErrors(prev => ({ ...prev, district: null }));
  };

  const handleSelectDistrict = (district) => {
    setSelectedDistrict(district);
    setIsDistrictOpen(false);
    setDistrictSearch('');
    if (validationErrors.district) setValidationErrors(prev => ({ ...prev, district: null }));
  };

  // =========================================================================
  // 4. BLOK: FORM DOĞRULAMA VE İLAN YAYINLAMA
  // =========================================================================
  const handleSubmitListing = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    const errors = {};
    const rawPrice = parseRawNumber(priceDisplay);
    const rawTramer = parseRawNumber(tramerDisplay);

    if (!title.trim()) {
      errors.title = 'İlan başlığı zorunludur.';
    }
    if (rawPrice === null || rawPrice <= 0) {
      errors.price = 'Geçerli bir satış fiyatı giriniz.';
    }
    if (rawTramer === null) {
      errors.tramer = 'Hasar/Tramer tutarı zorunludur (Yoksa 0 giriniz).';
    }
    if (!selectedCity) {
      errors.city = 'İl seçimi zorunludur.';
    }
    if (!selectedDistrict) {
      errors.district = 'İlçe seçimi zorunludur.';
    }
    if (!description.trim() || description.trim().length < 10) {
      errors.description = 'Açıklama en az 10 karakter olmalıdır.';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setErrorMessage('Lütfen tüm zorunlu alanları eksiksiz ve doğru şekilde doldurunuz.');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        price: rawPrice,
        title: title.trim(),
        description: description.trim(),
        city: selectedCity,
        district: selectedDistrict,
        tramerAmount: rawTramer,
        isFeatured: isFeatured, // 💎 Doping bilgisi servise gönderiliyor
        photos: vehicle.image_url ? vehicle.image_url.split(',') : []
      };

      const result = await publishVehicleListing(vehicle, payload);

      if (result.success) {
        onSuccess && onSuccess();
        onClose();
      } else {
        setErrorMessage(`Sistem Hatası: ${result.error}`);
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnpublish = async () => {
    if (!confirm('Bu aracı pazaryeri satışından kaldırmak istediğinize emin misiniz?')) return;

    try {
      setSubmitting(true);
      const result = await unpublishVehicleListing(vehicle);

      if (result.success) {
        onSuccess && onSuccess();
        onClose();
      } else {
        setErrorMessage(`Sistem Hatası: ${result.error}`);
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtrelenmiş Şehir ve İlçe Dizileri
  const filteredCities = Object.keys(TURKEY_LOCATIONS).filter(c => 
    c.toLocaleLowerCase('tr-TR').includes(citySearch.toLocaleLowerCase('tr-TR'))
  );

  const availableDistricts = TURKEY_LOCATIONS[selectedCity] || [];
  const filteredDistricts = availableDistricts.filter(d => 
    d.toLocaleLowerCase('tr-TR').includes(districtSearch.toLocaleLowerCase('tr-TR'))
  );

  // =========================================================================
  // 5. BLOK: ARAYÜZ RENDER KATMANI
  // =========================================================================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fadeIn select-none">
      
      <div className="bg-white border border-slate-200/90 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* MODAL ÜST BARI */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/70 shrink-0">
          <div>
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block font-mono">
              PAZARYERİ YÖNETİMİ
            </span>
            <h3 className="text-base font-black text-slate-900 tracking-tight mt-0.5">
              {vehicle.is_listed ? 'İlan Detaylarını Düzenle' : 'Pazaryerinde İlan Oluştur'}
            </h3>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <Icon name="kapat" size="lg" strokeWidth={2.5} />
          </button>
        </div>

        {/* FORM İÇERİK BÖLGESİ */}
        <form onSubmit={handleSubmitListing} className="p-6 pb-28 space-y-4 overflow-y-auto scrollbar-thin">
          
          {/* SEÇİLİ ARAÇ ÖZET KARTI */}
          <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-black text-slate-900 block">{vehicle.brand} {vehicle.model} ({vehicle.year})</span>
              <span className="text-[11px] font-bold text-slate-500 font-mono">{vehicle.plate_number} • {vehicle.km ? vehicle.km.toLocaleString('tr-TR') : '0'} KM</span>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-extrabold px-3 py-1 rounded-xl font-mono">
              Skor: {vehicle.trust_score ?? 0}/100
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-rose-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* İLAN BAŞLIĞI (*) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 flex justify-between items-center">
              <span>İlan Başlığı <span className="text-rose-600 font-black ml-0.5">*</span></span>
              <span className="text-[10px] font-semibold text-slate-400 font-mono">{title.length}/70</span>
            </label>
            <input 
              type="text"
              maxLength={70}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (validationErrors.title) setValidationErrors(prev => ({ ...prev, title: null }));
              }}
              placeholder="Örn: 2021 BMW 3 Serisi Executive MSport"
              className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold text-slate-900 focus:outline-none transition-all ${
                validationErrors.title 
                  ? 'border-rose-500 bg-rose-50/20 ring-1 ring-rose-500/20' 
                  : 'border-slate-200/90 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20'
              }`}
            />
            {validationErrors.title && <p className="text-[11px] font-bold text-rose-600 mt-0.5">{validationErrors.title}</p>}
          </div>

          {/* SATIŞ FİYATI (*) VE HASAR TUTARI (*) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* SATIŞ FİYATI */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800">
                Satış Fiyatı <span className="text-rose-600 font-black ml-0.5">*</span>
              </label>
              <div className="relative">
                <input 
                  type="text"
                  value={priceDisplay}
                  onChange={(e) => {
                    setPriceDisplay(formatDisplayNumber(e.target.value));
                    if (validationErrors.price) setValidationErrors(prev => ({ ...prev, price: null }));
                  }}
                  placeholder="2.350.000"
                  className={`w-full pl-3.5 pr-8 py-2.5 border rounded-xl text-xs font-bold font-mono text-slate-900 focus:outline-none transition-all ${
                    validationErrors.price 
                      ? 'border-rose-500 bg-rose-50/20 ring-1 ring-rose-500/20' 
                      : 'border-slate-200/90 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20'
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 font-mono">₺</span>
              </div>
              {validationErrors.price && <p className="text-[11px] font-bold text-rose-600 mt-0.5">{validationErrors.price}</p>}
            </div>

            {/* HASAR TUTARI */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800">
                Hasar / Tramer Tutarı <span className="text-rose-600 font-black ml-0.5">*</span>
              </label>
              <div className="relative">
                <input 
                  type="text"
                  value={tramerDisplay}
                  onChange={(e) => {
                    setTramerDisplay(formatDisplayNumber(e.target.value));
                    if (validationErrors.tramer) setValidationErrors(prev => ({ ...prev, tramer: null }));
                  }}
                  placeholder="0"
                  className={`w-full pl-3.5 pr-8 py-2.5 border rounded-xl text-xs font-bold font-mono text-slate-900 focus:outline-none transition-all ${
                    validationErrors.tramer 
                      ? 'border-rose-500 bg-rose-50/20 ring-1 ring-rose-500/20' 
                      : 'border-slate-200/90 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20'
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 font-mono">₺</span>
              </div>
              {validationErrors.tramer && <p className="text-[11px] font-bold text-rose-600 mt-0.5">{validationErrors.tramer}</p>}
            </div>

          </div>

          {/* İL (*) VE İLÇE (*) DROPDOWN ALANI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* İL SEÇİMİ */}
            <div className={`space-y-1 relative ${isCityOpen ? 'z-30' : 'z-10'}`} ref={cityDropdownRef}>
              <label className="text-xs font-bold text-slate-800">
                Bulunduğu İl <span className="text-rose-600 font-black ml-0.5">*</span>
              </label>
              
              <div 
                onClick={() => {
                  setIsCityOpen(!isCityOpen);
                  setIsDistrictOpen(false);
                }}
                className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-bold text-slate-900 bg-white flex justify-between items-center cursor-pointer transition-all ${
                  validationErrors.city ? 'border-rose-500' : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                <span>{selectedCity}</span>
                <svg className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isCityOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>

              {isCityOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
                  <div className="p-2 border-b border-slate-100 bg-slate-50/90">
                    <input 
                      type="text"
                      autoFocus
                      value={citySearch}
                      onChange={(e) => setCitySearch(e.target.value)}
                      placeholder="Şehir ara..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-50 scrollbar-thin">
                    {filteredCities.length === 0 ? (
                      <div className="p-3 text-center text-xs font-medium text-slate-400">Şehir bulunamadı</div>
                    ) : (
                      filteredCities.map(city => (
                        <div
                          key={city}
                          onClick={() => handleSelectCity(city)}
                          className={`px-3.5 py-2.5 text-xs font-semibold cursor-pointer transition-colors flex justify-between items-center ${
                            selectedCity === city ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          <span>{city}</span>
                          {selectedCity === city && (
                            <Icon name="onay" size="sm" className="text-indigo-600" strokeWidth={2.5} />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              {validationErrors.city && <p className="text-[11px] font-bold text-rose-600 mt-0.5">{validationErrors.city}</p>}
            </div>

            {/* İLÇE SEÇİMİ */}
            <div className={`space-y-1 relative ${isDistrictOpen ? 'z-30' : 'z-10'}`} ref={districtDropdownRef}>
              <label className="text-xs font-bold text-slate-800">
                İlçe <span className="text-rose-600 font-black ml-0.5">*</span>
              </label>

              <div 
                onClick={() => {
                  setIsDistrictOpen(!isDistrictOpen);
                  setIsCityOpen(false);
                }}
                className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-bold text-slate-900 bg-white flex justify-between items-center cursor-pointer transition-all ${
                  validationErrors.district ? 'border-rose-500' : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                <span>{selectedDistrict || 'İlçe Seçin'}</span>
                <svg className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isDistrictOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>

              {isDistrictOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
                  <div className="p-2 border-b border-slate-100 bg-slate-50/90">
                    <input 
                      type="text"
                      autoFocus
                      value={districtSearch}
                      onChange={(e) => setDistrictSearch(e.target.value)}
                      placeholder="İlçe ara..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-50 scrollbar-thin">
                    {filteredDistricts.length === 0 ? (
                      <div className="p-3 text-center text-xs font-medium text-slate-400">İlçe bulunamadı</div>
                    ) : (
                      filteredDistricts.map(dist => (
                        <div
                          key={dist}
                          onClick={() => handleSelectDistrict(dist)}
                          className={`px-3.5 py-2.5 text-xs font-semibold cursor-pointer transition-colors flex justify-between items-center ${
                            selectedDistrict === dist ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          <span>{dist}</span>
                          {selectedDistrict === dist && (
                            <Icon name="onay" size="sm" className="text-indigo-600" strokeWidth={2.5} />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              {validationErrors.district && <p className="text-[11px] font-bold text-rose-600 mt-0.5">{validationErrors.district}</p>}
            </div>

          </div>

          {/* İLAN AÇIKLAMASI KANVASI (*) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 flex justify-between items-center">
              <span>İlan Detay Açıklaması <span className="text-rose-600 font-black ml-0.5">*</span></span>
              <span className="text-[10px] font-semibold text-slate-400 font-mono">{description.length}/1000</span>
            </label>
            <textarea 
              rows="3"
              maxLength={1000}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (validationErrors.description) setValidationErrors(prev => ({ ...prev, description: null }));
              }}
              placeholder="Aracınızın genel durumu, bakım geçmişi ve alıcının bilmesi gereken detayları açıklayınız..."
              className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-medium text-slate-900 focus:outline-none transition-all resize-none leading-relaxed ${
                validationErrors.description 
                  ? 'border-rose-500 bg-rose-50/20 ring-1 ring-rose-500/20' 
                  : 'border-slate-200/90 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20'
              }`}
            />
            {validationErrors.description && <p className="text-[11px] font-bold text-rose-600 mt-0.5">{validationErrors.description}</p>}
          </div>

          {/* 💎 DEMO VİTRİN / DOPİNG SEÇİM BARI */}
          <div className="pt-2">
            <div
              onClick={() => (isFeatured ? setIsFeatured(false) : setPaywallAcik(true))}
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                isFeatured 
                  ? 'bg-gradient-to-r from-amber-50 to-indigo-50 border-amber-400 ring-2 ring-amber-400/30' 
                  : 'bg-slate-50 border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                  isFeatured ? 'bg-amber-400 border-amber-500 text-slate-950' : 'bg-white border-slate-300'
                }`}>
                  {isFeatured && <Icon name="onay" size="xs" strokeWidth={3} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900">Anasayfa Vitrinine Çıkar</span>
                    <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded font-mono uppercase">
                      PREMIUM
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    İlanınız pazaryerinde en üst sıradaki karanlık Vitrin rafında 10x daha fazla görüntülensin.
                  </p>
                </div>
              </div>
              {/* Fiyat paketler.js'ten. Ekrana elle yazılan ikinci bir
                  rakam bırakmıyoruz: iki yerde duran fiyat kayar. */}
              <div className="text-right shrink-0 pl-3">
                <span className="text-xs font-black font-mono text-indigo-700">
                  {fiyatYaz(URUNLER.vitrin.fiyat)}
                </span>
                <span className="text-[9px] block text-slate-400 font-bold">
                  {isFeatured ? 'SEÇİLDİ' : 'TEK SEFERLİK'}
                </span>
              </div>
            </div>
          </div>

          {/* AKSİYON BUTONLARI */}
          <div className="pt-3 flex flex-col sm:flex-row gap-2.5 justify-end border-t border-slate-100">
            {vehicle.is_listed && (
              <button 
                type="button"
                onClick={handleUnpublish}
                disabled={submitting}
                className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 text-rose-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                İlandan Kaldır
              </button>
            )}

            <button 
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-[#4F46E5] hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
              ) : (
                // Ödeme artık paywall'da alınıyor; düğme yalnızca yayınlıyor.
                // Eski metin ("₺250 Öde & Vitrine Çıkar") iki kez ödeme
                // yapılıyormuş izlenimi verirdi.
                vehicle.is_listed ? 'İlanı Güncelle' : (isFeatured ? 'Vitrinle Yayınla' : 'İlanı Yayınla')
              )}
            </button>
          </div>

        </form>

      </div>

      {/* VİTRİN PAYWALL'I. Koşullu render: kapalıyken mount edilmiyor,
          böylece her açılışta durumu sıfırdan kuruyor — projedeki diğer
          diyalogların kalıbı. */}
      {paywallAcik && (
        <PaywallDialog
          urunKodu="vitrin"
          onKapat={() => setPaywallAcik(false)}
          onSatinAl={() => {
            // Satın alma kaydı PaywallDialog içinde ÜRETİLDİ; burada yalnızca
            // tercih işaretleniyor. `listings_vitrin_denetle` tetikleyicisi
            // kaydı arıyor — kayıt olmadan is_featured yazılamıyor, yani bu
            // satır tek başına ayrıcalık vermiyor.
            setIsFeatured(true);
            setPaywallAcik(false);
          }}
          detay={
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
              <div className="inline-flex items-center bg-white border-2 border-slate-900 rounded overflow-hidden shrink-0 h-8">
                <div className="bg-[#003399] text-white px-2 h-full flex items-center font-mono font-black text-[10px] border-r border-slate-900">
                  TR
                </div>
                <div className="px-2.5 font-mono font-black text-xs text-slate-900 uppercase tracking-wider">
                  {vehicle?.plate_number}
                </div>
              </div>
              <p className="text-xs font-bold text-slate-700 truncate">
                {vehicle?.brand} {vehicle?.model}
              </p>
            </div>
          }
        />
      )}
    </div>
  );
}