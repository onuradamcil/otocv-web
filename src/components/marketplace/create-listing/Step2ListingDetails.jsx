// =========================================================================
// OTO-CV İLAN VERME: 2. ADIM BİLEŞENİ (Step2ListingDetails.jsx)
// İşlev: Modüler panel mimarisiyle ayrıştırılmış İlan Detayları Sayfası.
// Mimarî: Panellere (Panel 1-6) tam bölünmüş Constant, State ve Handler düzeni.
// =========================================================================

'use client';

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { TURKEY_LOCATIONS as turkeyLocations } from '../../../data/turkeyLocations';

// =========================================================================
// 🏛️ 1. BLOK: MODÜL SABİTLERİ (PANEL KATALOGLARI - COMPONENT DIŞI)
// =========================================================================

// --- PANEL 2 SABİTLERİ (TEMEL İLAN BİLGİLERİ & RENK SWATCH) ---
const COLOR_OPTIONS = [
  { name: 'Altın', hex: '#FFD700' },
  { name: 'Bej', hex: '#F5F5DC' },
  { name: 'Beyaz', hex: '#FFFFFF', border: true },
  { name: 'Bordo', hex: '#800000' },
  { name: 'Füme', hex: '#505050' },
  { name: 'Gri', hex: '#808080' },
  { name: 'Gri (Gümüş)', hex: '#C0C0C0' },
  { name: 'Gri (metalik)', hex: '#A9A9A9' },
  { name: 'Gri (titanyum)', hex: '#5A5D64' },
  { name: 'Kahverengi', hex: '#8B4513' },
  { name: 'Kırmızı', hex: '#E11D48' },
  { name: 'Lacivert', hex: '#1E1B4B' },
  { name: 'Mavi', hex: '#2563EB' },
  { name: 'Mavi (metalik)', hex: '#1D4ED8' },
  { name: 'Mor', hex: '#800080' },
  { name: 'Pembe', hex: '#FFC0CB' },
  { name: 'Sarı', hex: '#EAB308' },
  { name: 'Siyah', hex: '#000000' },
  { name: 'Şampanya', hex: '#F7E7CE' },
  { name: 'Turkuaz', hex: '#40E0D0' },
  { name: 'Turuncu', hex: '#F97316' },
  { name: 'Yeşil', hex: '#22C55E' },
  { name: 'Yeşil (metalik)', hex: '#15803D' },
  { name: 'Diğer', hex: 'linear-gradient(135deg, #FF0000, #00FF00, #0000FF)' }
];

const TRANSMISSION_TYPES = ['Otomatik', 'Manuel', 'Yarı Otomatik'];
const BODY_TYPES = ['Sedan', 'Hatchback 5 Kapı', 'Hatchback 3 Kapı', 'SUV / Crossover', 'Station Wagon', 'Coupe', 'Cabrio', 'MPV'];
const VEHICLE_STATUSES = ['İkinci El', 'Sıfır'];

// --- PANEL 2.5 SABİTLERİ (ARAÇ DETAYLARI - TEKNİK VERİLER) ---
const ENGINE_CAPACITIES = [
  '1200 cm3\'e kadar',
  '1201 - 1400 cm3',
  '1401 - 1600 cm3',
  '1601 - 1800 cm3',
  '1801 - 2000 cm3',
  '2001 - 2500 cm3',
  '2501 - 3000 cm3',
  '3001 - 3500 cm3',
  '3501 - 4000 cm3',
  '4001 - 4500 cm3',
  '4501 - 5000 cm3',
  '5001 - 5500 cm3',
  '5501 - 6000 cm3',
  '6001 cm3 ve üzeri'
];

const VEHICLE_TYPES = ['Bireysel', 'Ticari', 'Kurumsal'];
const PLATE_NATIONALITIES = ['(TR) Türkiye', 'Mavi Plaka (MA/MZ)', 'Yabancı Plakalı'];
const WARRANTY_OPTIONS = ['Var', 'Yok'];
const FIRST_OWNER_OPTIONS = ['İlk Sahibi Değilim', 'İlk Sahibiyim'];
const SWAP_OPTIONS = ['Evet', 'Hayır'];

// --- PANEL 4 SABİTLERİ (EKSPERTİZ & HASAR KAYDI) ---
const TRAMER_OPTIONS = ['Bilmiyorum', 'Tramer Yok', 'Tramer Var', 'Ağır Hasarlı'];

const DAMAGE_STATUSES = {
  UNSPECIFIED: { id: 'UNSPECIFIED', label: 'Belirtilmemiş', bg: 'bg-slate-200', text: 'text-slate-600', hex: '#E2E8F0', border: '#CBD5E1' },
  ORIGINAL: { id: 'ORIGINAL', label: 'Orijinal', bg: 'bg-emerald-500', text: 'text-emerald-700', hex: '#22C55E', border: '#16A34A' },
  PAINTED: { id: 'PAINTED', label: 'Boyanmış', bg: 'bg-amber-400', text: 'text-amber-700', hex: '#EAB308', border: '#D97706' },
  LOCAL_PAINTED: { id: 'LOCAL_PAINTED', label: 'Lokal Boyanmış', bg: 'bg-orange-500', text: 'text-orange-700', hex: '#F97316', border: '#EA580C' },
  CHANGED: { id: 'CHANGED', label: 'Değişmiş', bg: 'bg-rose-600', text: 'text-rose-700', hex: '#EF4444', border: '#DC2626' },
};

const CAR_PARTS = [
  { id: 'front_bumper', name: 'Ön Tampon' },
  { id: 'rear_bumper', name: 'Arka Tampon' },
  { id: 'front_bonnet', name: 'Motor Kaputu' },
  { id: 'roof', name: 'Tavan' },
  { id: 'trunk', name: 'Bagaj Kapağı' },
  { id: 'fender_front_left', name: 'Sol Ön Çamurluk' },
  { id: 'door_front_left', name: 'Sol Ön Kapı' },
  { id: 'door_rear_left', name: 'Sol Arka Kapı' },
  { id: 'fender_rear_left', name: 'Sol Arka Çamurluk' },
  { id: 'fender_front_right', name: 'Sağ Ön Çamurluk' },
  { id: 'door_front_right', name: 'Sağ Ön Kapı' },
  { id: 'door_rear_right', name: 'Sağ Arka Kapı' },
  { id: 'fender_rear_right', name: 'Sağ Arka Çamurluk' },
];

// --- PANEL 5 SABİTLERİ (KAPSAMLI TÜRKİYE OTOMOTİV DONANIM KATALOĞU) ---
const EQUIPMENT_CATEGORIES = [
  {
    title: 'Güvenlik',
    items: [
      'ABS (Kilitlenme Karşıtı Fren)', 'ESP / VSA (Elektronik Denge)', 'EBD (Fren Gücü Dağılımı)',
      'TCS / ASR (Çekiş Kontrol)', 'Hava Yastığı (Sürücü)', 'Hava Yastığı (Yolcu)',
      'Hava Yastığı (Yan)', 'Hava Yastığı (Perde)', 'Hava Yastığı (Diz)',
      'Isofix (Çocuk Koltuğu Bağlantısı)', 'Yokuş Kalkış Desteği (Hill Holder)', 'Kör Nokta Uyarı Sistemi',
      'Şerit Takip Sistemi / İkazı', 'Şerit Değiştirme Yardımcısı', 'Otomatik Çarpışma Önleyici',
      'Yorgunluk Tespit Sistemi', 'Gece Görüş Sistemi', 'Lastik Basınç Sensörü',
      'Merkezi Kilit', 'Immobilizer', 'Alarm'
    ]
  },
  {
    title: 'İç Donanım & Konfor',
    items: [
      'Deri Koltuk', 'Kumaş Koltuk', 'Yarı Deri Koltuk',
      'Koltuk Isıtma (Ön)', 'Koltuk Isıtma (Arka)', 'Koltuk Soğutma (Ön)',
      'Elektrikli Hafızalı Koltuklar', 'Masajlı Ön Koltuklar', 'Dijital Çift Bölge Klima',
      'Üç / Dört Bölge Otomatik Klima', 'Panoramik Cam Tavan', 'Sunroof',
      'Hayalet Gösterge Paneli', 'Head-Up Display', 'Hız Sabitleyici (Cruise Control)',
      'Adaptif Hız Sabitleyici (ACC)', 'Start / Stop Sistemi', 'Anahtarsız Giriş & Çalıştırma',
      'Isıtmalı Direksiyon', 'Deri Direksiyon', 'Direksiyondan F1 Vites Vites',
      'Elektrikli Arka Perde', 'Soğutmalı Torpido', 'Ön & Arka Kol Dayama',
      'Yol Bilgisayarı', 'Otomatik Kararan Dikiz Aynası'
    ]
  },
  {
    title: 'Dış Donanım & Stil',
    items: [
      'Alaşım Jantlar', 'Matrix / Laser LED Farlar', 'LED Farlar',
      'Bi-Xenon / Xenon Farlar', 'Gündüz LED Farları', 'Sis Farları',
      'Far Sensörü (Gece Sensörü)', 'Yağmur Sensörü', 'Park Sensörü (Ön)',
      'Park Sensörü (Arka)', '360 Derece Kamera', 'Geri Görüş Kamerası',
      'Otomatik Park Sistemi', 'Elektrikli Katlanır Isıtmalı Aynalar', 'Hafızalı Aynalar',
      'Elektrikli / Akıllı Bagaj Kapağı', 'Panoramik Ön Cam', 'Römork Çeki Demiri',
      'Tavan Çıtaları', 'Karartılmış Arka Camlar'
    ]
  },
  {
    title: 'Multimedya & Eğlence',
    items: [
      'Apple CarPlay', 'Android Auto', 'Kablosuz Şarj',
      'Bluetooth / Telefon', 'Navigasyon / GPS', 'Dokunmatik Büyük Ekran',
      'Premium Ses Sistemi (Bang&Olufsen/Harman Kardon)', 'USB / AUX Girişi',
      'Arka Eğlence Paketi (Ekranlar)', 'Radyo / MP3 Çalar', '6+ Hoparlör',
      'Sesli Komut Sistemi', 'Harddisk / Dahili Hafıza'
    ]
  }
];

// --- PANEL 6 SABİTLERİ (TINYMCE TARZI 5x5 RENK PALETİ MATRİSİ) ---
const EDITOR_COLOR_PALETTE = [
  ['#D5E8D4', '#FFF2CC', '#F8CECC', '#E1D5E7', '#DAE8FC'], // Açık / Pasteller
  ['#22C55E', '#EAB308', '#EF4444', '#A855F7', '#3B82F6'], // Canlı / Ana Renkler
  ['#15803D', '#CA8A04', '#B91C1C', '#7E22CE', '#1D4ED8'], // Koyu Renkler
  ['#059669', '#D97706', '#DC2626', '#9333EA', '#2563EB'], // Orta Tonlar
  ['#FFFFFF', '#E2E8F0', '#94A3B8', '#64748B', '#334155'], // Gri Skalası
];

const Step2ListingDetails = forwardRef(({ formData, updateFormData, onNext, onBack }, ref) => {

  // =========================================================================
  // 💾 2. BLOK: PANELLERE GÖRE TOPLU STATE HAFIZALARI (REACT HOOK TOPLULAŞTIRMA)
  // =========================================================================

  // 📌 PANEL 2 STATE'LERİ: TEMEL İLAN BİLGİLERİ (Fiyat Söküldü)
  const [title, setTitle] = useState(formData.title || '');
  const [mileage, setMileage] = useState(formData.mileage || '');
  const [transmission, setTransmission] = useState(formData.transmission || 'Otomatik');
  const [bodyType, setBodyType] = useState(formData.bodyType || 'Sedan');
  const [selectedColor, setSelectedColor] = useState(formData.color || COLOR_OPTIONS[2]); // Default Beyaz
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
  const [vehicleStatus, setVehicleStatus] = useState(formData.vehicleStatus || 'İkinci El');
  const [plate, setPlate] = useState(formData.plate || '');

  // 📌 PANEL 2.5 STATE'LERİ: ARAÇ DETAYLARI (TEKNİK KİMLİK)
  const [engineCapacity, setEngineCapacity] = useState(formData.engineCapacity || '');
  const [vehicleType, setVehicleType] = useState(formData.vehicleType || 'Bireysel');
  const [plateNationality, setPlateNationality] = useState(formData.plateNationality || '(TR) Türkiye');
  const [warranty, setWarranty] = useState(formData.warranty || 'Yok');
  const [isFirstOwner, setIsFirstOwner] = useState(formData.isFirstOwner || 'İlk Sahibi Değilim');
  const [swap, setSwap] = useState(formData.swap || 'Hayır');

  // 📌 PANEL 3 STATE'LERİ & REF'LERİ: ARAÇ KONUMU (ARANABİLİR İL / İLÇE DROPDOWN)
  const [city, setCity] = useState(formData.city || 'İstanbul');
  const [district, setDistrict] = useState(formData.district || 'Kadıköy');
  const [isCityOpen, setIsCityOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [isDistrictOpen, setIsDistrictOpen] = useState(false);
  const [districtSearch, setDistrictSearch] = useState('');
  const cityDropdownRef = useRef(null);
  const districtDropdownRef = useRef(null);

  // 📌 PANEL 4 STATE'LERİ: HASAR KAYDI, EKSPERTİZ & TRAMER
  const [tramerStatus, setTramerStatus] = useState(formData.tramerStatus || 'Tramer Yok');
  const [tramerAmount, setTramerAmount] = useState(formData.tramerAmount || '');
  const [isFullyOriginal, setIsFullyOriginal] = useState(formData.isFullyOriginal || false);
  const [damageReport, setDamageReport] = useState(formData.damageReport || {});
  const [hoveredPart, setHoveredPart] = useState(null);
  const [activePartMenu, setActivePartPopover] = useState(null);

  // 📌 PANEL 5 STATE'LERİ: ARAÇ DONANIM ÖZELLİKLERİ & AKORDİYON
  const [selectedFeatures, setSelectedFeatures] = useState(formData.selectedFeatures || []);
  const [featureSearch, setFeatureSearch] = useState('');
  const [openCategories, setOpenCategories] = useState({});

  // 📌 PANEL 6 STATE, REF VE POPOVER AÇILIŞ SENSÖRLERİ
  const [description, setDescription] = useState(formData.description || '');
  const [isTextColorOpen, setIsTextColorOpen] = useState(false);
  const [isBgColorOpen, setIsBgColorOpen] = useState(false);
  const editorRef = useRef(null);
  const colorPickerRef = useRef(null);

  // 📌 FORM DOĞRULAMA (VALIDATION & TOUCH) STATE'LERİ
  const [touchedFields, setTouchedFields] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Dışarı tıklayınca renk pencerelerini kapatma sensörü
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
        setIsTextColorOpen(false);
        setIsBgColorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  // =========================================================================
  // ⚙️ 3. BLOK: GENEL SİHİRBAZ VE ORKESTRASYON EFFECT'LERİ
  // =========================================================================

  // Otomatik İlan Başlığı Üretici Sensör (Sadece başlık boşsa çalışır)
  useEffect(() => {
    if (!title && formData.selectedBrand) {
      const generatedTitle = `${formData.selectedYear || ''} ${formData.selectedBrand?.name || ''} ${formData.selectedSeries?.name || ''} ${formData.selectedModel?.name || ''}`;
      setTitle(generatedTitle);
      updateFormData({ title: generatedTitle });
    }
  }, [formData.selectedBrand]);

  // Wizard Global State Senkronizatörü (Tüm paneller bu fonksiyonu kullanır)
  const handleFieldChange = (field, value) => {
    updateFormData({ [field]: value });
  };


  // =========================================================================
  // 🛠️ 4. BLOK: PANELLERE GÖRE SANİTİZER VE HANDLER FONKSİYONLARI
  // =========================================================================

  // -------------------------------------------------------------------------
  // 📌 FORM DOĞRULAMA (ONBLUR & VALIDATION) SENSÖRLERİ
  // -------------------------------------------------------------------------

  // 🧹 Metni HTML etiketlerinden, &nbsp; ve gizli karakterlerden arındıran temizleyici
  const getCleanText = (str) => {
    if (!str) return '';
    return str
      .replace(/<[^>]*>/g, '') 
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // 🎯 STEP 2 TAM VALIDASYON SENSÖRÜ (Fiyat Şartı Söküldü)
  // 🎯 STEP 2 TAM VALIDASYON SENSÖRÜ
  const cleanDescText = getCleanText(description);

  const isStep2Valid = 
    !!title && title.trim() !== '' &&
    !!transmission && transmission !== 'Seçiniz' &&
    !!bodyType && bodyType !== 'Seçiniz' &&
    !!vehicleStatus && vehicleStatus !== 'Seçiniz' &&
    !!city && city !== 'İl Seçiniz' && city !== '' &&
    !!district && district !== 'İlçe Seçiniz' && district !== '' &&
    cleanDescText.length >= 20;

  // Odak Kaybı Sensörü
  const handleBlur = (fieldName) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
  };

  // Alanın Hatalı (Kırmızı) Olup Olmadığını Hesaplayan Sensör
  const isFieldInvalid = (fieldName) => {
    const isTouched = touchedFields[fieldName] || isSubmitted;
    if (!isTouched) return false;

    switch (fieldName) {
      case 'title':
        return !title || title.trim() === '';
      case 'mileage':
        return !mileage || mileage.trim() === '';
      case 'transmission':
        return !transmission || transmission === 'Seçiniz';
      case 'bodyType':
        return !bodyType || bodyType === 'Seçiniz';
      case 'vehicleStatus':
        return !vehicleStatus || vehicleStatus === 'Seçiniz';
      case 'plate':
        return !plate || plate.trim() === '';
      case 'city':
        return !city || city === 'İl Seçiniz' || city === '';
      case 'district':
        return !district || district === 'İlçe Seçiniz' || district === '';
      case 'description': {
        return cleanDescText.length < 20;
      }
      default:
        return false;
    }
  };

  // 🚀 Sadece Doğrulama Yapar ve True/False Dönerek Sonsuz Döngüyü Kırar!
  const handleNextWithValidation = () => {
    setIsSubmitted(true);

    if (isStep2Valid) {
      return true;
    } else {
      window.scrollTo({ top: 200, behavior: 'smooth' });
      return false;
    }
  };

  // Wizard bileşeninin ref üzerinden doğrulama yapabilmesi için fonksiyonu dışa açıyoruz
  useImperativeHandle(ref, () => ({
    handleNextWithValidation
  }));


  // -------------------------------------------------------------------------
  // 📌 PANEL 2 HANDLERLARI (KM, PLAKA SANİTİZERLARI & BAŞLIK SAYAÇ)
  // -------------------------------------------------------------------------

  // Kilometre Sanitizer (Binlik Nokta Ayraçlı: Örn 150.000, Maks 7 Hane)
  const handleMileageInput = (rawValue) => {
    const rawNumbers = rawValue.replace(/[^0-9]/g, '');
    if (rawNumbers.length > 7) return;

    if (!rawNumbers) {
      setMileage('');
      handleFieldChange('mileage', '');
      return;
    }

    const formatted = new Intl.NumberFormat('tr-TR').format(rawNumbers);
    setMileage(formatted);
    handleFieldChange('mileage', formatted);
  };

  // Garajım Modülünden Alınan Birebir TR Plaka Formatörü (34 ABC 123)
  const formatTRPlate = (value) => {
    let raw = value.replace(/\s+/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    let out = '';
    let i = 0, cityDigits = 0;
    while (i < raw.length && cityDigits < 2) {
      if (/[0-9]/.test(raw[i])) { out += raw[i]; cityDigits++; }
      i++;
    }
    if (cityDigits === 2 && i < raw.length) out += ' ';
    let letters = 0;
    while (i < raw.length && letters < 3) {
      if (/[A-Z]/.test(raw[i])) { out += raw[i]; letters++; }
      else if (/[0-9]/.test(raw[i]) && letters > 0) break;
      i++;
    }
    if (letters > 0 && i < raw.length && /[0-9]/.test(raw[i])) out += ' ';
    let lastDigits = 0;
    while (i < raw.length && lastDigits < 4) {
      if (/[0-9]/.test(raw[i])) { out += raw[i]; lastDigits++; }
      i++;
    }
    return out;
  };

  const handlePlateInput = (rawValue) => {
    const formatted = formatTRPlate(rawValue);
    setPlate(formatted);
    handleFieldChange('plate', formatted);
  };

  // İlan Başlığı Karakter Sayacı ve Geçerlilik Hesabı
  const MAX_TITLE_LENGTH = 70;
  const remainingTitleChars = MAX_TITLE_LENGTH - title.length;


  // -------------------------------------------------------------------------
  // 📌 PANEL 3 HANDLERLARI (İL / İLÇE DROPDOWN FİLTRELEME VE TIKLAMA)
  // -------------------------------------------------------------------------

  // Şehir Listesi (A-Z Sıralı)
  const cityList = Object.keys(turkeyLocations || {}).sort((a, b) => a.localeCompare(b, 'tr'));

  // Filtrelenmiş Şehirler
  const filteredCities = cityList.filter(c => 
    c.toLowerCase('tr').includes(citySearch.toLowerCase('tr'))
  );

  // Seçili İle Göre Filtrelenmiş İlçeler
  const currentDistricts = (turkeyLocations && turkeyLocations[city]) ? turkeyLocations[city] : [];
  const filteredDistricts = currentDistricts.filter(d => 
    d.toLowerCase('tr').includes(districtSearch.toLowerCase('tr'))
  );

  // Dışarı Tıklayınca Açılır Menüleri Kapatma Sensörü
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target)) {
        setIsCityOpen(false);
      }
      if (districtDropdownRef.current && !districtDropdownRef.current.contains(event.target)) {
        setIsDistrictOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // İl Seçildiğinde Çalışacak Handler
  const handleSelectCity = (selectedCityName) => {
    setCity(selectedCityName);
    handleFieldChange('city', selectedCityName);
    
    // İlk ilçeyi otomatik seç ve arama state'lerini sıfırla
    const firstDist = turkeyLocations[selectedCityName]?.[0] || '';
    setDistrict(firstDist);
    handleFieldChange('district', firstDist);
    
    setIsCityOpen(false);
    setCitySearch('');
  };

  // İlçe Seçildiğinde Çalışacak Handler
  const handleSelectDistrict = (selectedDistrictName) => {
    setDistrict(selectedDistrictName);
    handleFieldChange('district', selectedDistrictName);
    setIsDistrictOpen(false);
    setDistrictSearch('');
  }; 


  // -------------------------------------------------------------------------
  // 📌 PANEL 4 HANDLERLARI (EKSPERTİZ & TRAMER İŞLEMLERİ)
  // -------------------------------------------------------------------------

  // Tramer Tutarı Sanitizer (Binlik Noktalı Format: Örn 15.500)
  const handleTramerAmountInput = (rawValue) => {
    const rawNumbers = rawValue.replace(/[^0-9]/g, '');
    if (rawNumbers.length > 10) return;
    
    if (!rawNumbers) {
      setTramerAmount('');
      handleFieldChange('tramerAmount', '');
      return;
    }

    const formatted = new Intl.NumberFormat('tr-TR').format(rawNumbers);
    setTramerAmount(formatted);
    handleFieldChange('tramerAmount', formatted);
  };

  // "Tamamı Orijinal" İşaretleme Handlerı
  const handleToggleFullyOriginal = (checked) => {
    setIsFullyOriginal(checked);
    if (checked) {
      const allOriginal = {};
      CAR_PARTS.forEach(p => { allOriginal[p.id] = 'ORIGINAL'; });
      setDamageReport(allOriginal);
      handleFieldChange('damageReport', allOriginal);
      handleFieldChange('isFullyOriginal', true);
    } else {
      setDamageReport({});
      handleFieldChange('damageReport', {});
      handleFieldChange('isFullyOriginal', false);
    }
  };

  // Parça Durum Değiştirme Handlerı
  const handleSetPartStatus = (partId, statusKey) => {
    const updated = { ...damageReport, [partId]: statusKey };
    setDamageReport(updated);
    handleFieldChange('damageReport', updated);
    
    if (statusKey !== 'ORIGINAL' && isFullyOriginal) {
      setIsFullyOriginal(false);
      handleFieldChange('isFullyOriginal', false);
    }
    setActivePartPopover(null);
  };

  // Anlık Hasar Özeti Sayacı
  const getDamageCounts = () => {
    const counts = { ORIGINAL: 0, PAINTED: 0, LOCAL_PAINTED: 0, CHANGED: 0 };
    Object.values(damageReport).forEach(status => {
      if (counts[status] !== undefined) counts[status]++;
    });
    return counts;
  };
  const damageSummary = getDamageCounts();


  // -------------------------------------------------------------------------
  // 📌 PANEL 5 HANDLERLARI (AKORDİYON, TÜMÜNÜ SEÇ VE SEÇİM TOGGLE)
  // -------------------------------------------------------------------------

  // Akordiyon Aç/Kapat Toggle
  const toggleCategoryAccordion = (catTitle) => {
    setOpenCategories(prev => ({ ...prev, [catTitle]: !prev[catTitle] }));
  };

  // Kategori Bazlı "Tümünü Seç / Kaldır" Handlerı
  const handleToggleSelectAllCategory = (catItems) => {
    const isAllSelected = catItems.every(item => selectedFeatures.includes(item));
    let updated;
    
    if (isAllSelected) {
      updated = selectedFeatures.filter(item => !catItems.includes(item));
    } else {
      const missing = catItems.filter(item => !selectedFeatures.includes(item));
      updated = [...selectedFeatures, ...missing];
    }
    
    setSelectedFeatures(updated);
    handleFieldChange('selectedFeatures', updated);
  };

  // Tekil Donanım Kutusu Seçme / Kaldırma Handlerı
  const toggleFeature = (featureName) => {
    const updated = selectedFeatures.includes(featureName)
      ? selectedFeatures.filter(item => item !== featureName)
      : [...selectedFeatures, featureName];
    
    setSelectedFeatures(updated);
    handleFieldChange('selectedFeatures', updated);
  };


  // -------------------------------------------------------------------------
  // 📌 PANEL 6 HANDLERLARI (ZENGİN METİN EDİTÖRÜ & AI AÇIKLAMA ÜRETİCİ)
  // -------------------------------------------------------------------------

  // Standart Editör Komut Çalıştırıcı
  const execCmd = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      const htmlContent = editorRef.current.innerHTML;
      setDescription(htmlContent);
      handleFieldChange('description', htmlContent);
    }
  };

  // Editör Yazı Giriş Sensörü (Kullanıcı yazarken tetiklenir)
  const handleEditorInput = () => {
    if (editorRef.current) {
      const htmlContent = editorRef.current.innerHTML;
      setDescription(htmlContent);
      handleFieldChange('description', htmlContent);
    }
  };

  // Yazı Rengi Uygulayıcı
  const handleApplyTextColor = (colorHex) => {
    execCmd('foreColor', colorHex);
    setIsTextColorOpen(false);
  };

  // Arka Plan / Vurgu Rengi Uygulayıcı
  const handleApplyBgColor = (colorHex) => {
    execCmd('hiliteColor', colorHex);
    setIsBgColorOpen(false);
  };

  // Yazı Rengini veya Vurguyu Sıfırla (Temizle)
  const handleResetColor = (type) => {
    if (type === 'text') {
      execCmd('foreColor', '#334155');
    } else {
      execCmd('hiliteColor', 'transparent');
    }
    setIsTextColorOpen(false);
    setIsBgColorOpen(false);
  };

  // 3. YAPAY ZEKA İLE DİNAMİK OTO-CV ARAÇ ÖZETİ ÜRETİCİ
  const handleGenerateAiDescription = () => {
    const year = formData.selectedYear || '';
    const brand = formData.selectedBrand?.name || 'Aracım';
    const series = formData.selectedSeries?.name || '';
    const model = formData.selectedModel?.name || '';
    const km = mileage || 'Düşük';
    const trans = transmission || 'Otomatik';
    const body = bodyType || 'Sedan';
    const clr = selectedColor?.name || 'Beyaz';
    const locCity = city || 'İstanbul';
    const locDistrict = district || '';
    
    // Ekspertiz ve Tramer Analizi (Nötr ve Şeffaf Dil)
    let tramerText = '';
    if (tramerStatus === 'Tramer Yok' || isFullyOriginal) {
      tramerText = 'Aracın sistem kayıtlarında ve geçmişinde Tramer/hasar kaydı bulunmadığı beyan edilmiştir.';
    } else if (tramerStatus === 'Tramer Var') {
      tramerText = tramerAmount 
        ? `Aracın sistem kayıtlarında toplam ${tramerAmount} TL tutarında Tramer kaydı mevcuttur.` 
        : 'Aracın Tramer kaydı bulunmaktadır.';
    } else {
      tramerText = `Tramer durumu: ${tramerStatus}.`;
    }

    // Seçilen Donanımları Metne Dökme
    const featuresListHtml = selectedFeatures.length > 0 
      ? `<li><b>Öne Çıkan Donanım Özellikleri:</b> ${selectedFeatures.join(', ')}</li>`
      : '<li>Aracın tüm fabrikasyon donanım özellikleri aktif durumdadır.</li>';

    // Dinamik OTO-CV Şablonu
    const formattedHtml = `
      <p><b>${locCity} ${locDistrict}</b> lokasyonunda dijital garaja tescillenen <b>${year} model ${brand} ${series} ${model}</b> aracına ait OTO-CV teknik ve genel durum özeti aşağıdadır. Araç <b>${km} KM</b> seviyesinde olup, <b>${trans}</b> vites ve <b>${body}</b> gövde tipindedir. Dış rengi <b>${clr}</b> olarak tescillenmiştir.</p>
      <br/>
      <p>${tramerText} Aracın genel kozmetik ve teknik durumu OTO-CV şeffaflık standartlarına uygun olarak kayıt altına alınmıştır.</p>
      <br/>
      <ul>
        ${featuresListHtml}
        <li><b>Takas / Değerlendirme Tercihi:</b> ${swap === 'Evet' ? 'Uygun segment araçlarla takas seçeneği değerlendirilebilir.' : 'Takas seçeneği kapalıdır.'}</li>
        <li><b>Garanti Statüsü:</b> ${warranty === 'Evet' ? 'Üretici / Yetkili servis garantisi aktif durumdadır.' : 'Garanti süresi dolmuştur.'}</li>
        <li><b>Dijital Karne Notu:</b> Aracın geçmiş bakım çizelgesi, servis faturaları ve periyodik kontrol kayıtları OTO-CV Garajım portalı üzerinden şeffafça takip edilebilir.</li>
      </ul>
    `.trim();

    if (editorRef.current) {
      editorRef.current.innerHTML = formattedHtml;
    }
    setDescription(formattedHtml);
    handleFieldChange('description', formattedHtml);
  };


  return (
    <div className="pb-24 text-slate-900 select-none font-sans antialiased">

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">

        {/* =========================================================================
            PANEL 1: SEÇİLEN ARAÇ KÜNYESİ ÖZETİ
           ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 overflow-hidden">
            <div className="w-11 h-11 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 17a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm8 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm-11-2 1.6-4.8A2 2 0 0 1 8.5 9h7c.8 0 1.6.4 2 1.2L19 15M3 15h18v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2Z" />
              </svg>
            </div>

            <div className="space-y-0.5 overflow-hidden">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 font-mono">
                Eşleşen Araç
              </span>
              <h3 className="text-sm font-black text-slate-900 truncate">
                {formData.selectedYear} {formData.selectedBrand?.name} {formData.selectedSeries?.name} {formData.selectedModel?.name} {formData.selectedPackage?.name}
              </h3>
            </div>
          </div>

          <button
            onClick={onBack}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 shrink-0 cursor-pointer"
          >
            Düzenle
          </button>
        </div>

       {/* =========================================================================
            PANEL 2: TEMEL ARAÇ & VİTRİN BİLGİLERİ (DÜPLİKE ALANLAR SÖKÜLDÜ)
           ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-sm space-y-6">
          
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Temel Araç & Vitrin Bilgileri</h3>
          </div>

          {/* 📌 PANEL 2.1: VİTRİN & ARAÇ BAŞLIĞI */}
          <div className="space-y-1.5 w-full">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <span className="text-rose-600 font-bold">*</span>
                <span>Vitrin & Araç Başlığı</span>
              </label>
              <span className="text-[11px] font-mono text-slate-400 font-semibold">
                {remainingTitleChars} karakter kaldı
              </span>
            </div>
            
            <input
              type="text"
              maxLength={MAX_TITLE_LENGTH}
              value={title}
              onBlur={() => handleBlur('title')}
              onChange={(e) => { setTitle(e.target.value); handleFieldChange('title', e.target.value); }}
              placeholder="Örn: Temiz Boyasız Düşük Kilometre Araç Karnesi"
              className={`w-full border rounded-md px-3.5 text-sm font-semibold text-slate-900 outline-none transition-all h-[42px] shadow-2xs ${
                isFieldInvalid('title')
                  ? 'border-rose-500 bg-rose-50/70 text-rose-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 placeholder:text-rose-300'
                  : 'border-slate-200/80 bg-slate-100/70 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 placeholder:text-slate-400'
              }`}
            />
            {isFieldInvalid('title') && (
              <p className="text-[11px] font-bold text-rose-600 pt-0.5 animate-fadeIn">Başlığı giriniz</p>
            )}
          </div>

          {/* 📌 PANEL 2.2: 3x2 NİZAMİ MATRİS (TOPLAM 6 DENGELİ ALAN) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* 1. VİTES TİPİ */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span className="text-rose-600 font-bold">*</span>
                <span>Vites Tipi</span>
              </label>
              <select
                value={transmission}
                onBlur={() => handleBlur('transmission')}
                onChange={(e) => { setTransmission(e.target.value); handleFieldChange('transmission', e.target.value); }}
                className={`w-full border rounded-md px-3 text-sm font-semibold outline-none cursor-pointer h-[42px] transition-all ${
                  isFieldInvalid('transmission')
                    ? 'border-rose-500 bg-rose-50/70 text-rose-900 focus:border-rose-600'
                    : 'border-slate-200/80 bg-slate-100/70 focus:bg-white text-slate-800 focus:border-indigo-600'
                }`}
              >
                {TRANSMISSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {isFieldInvalid('transmission') && (
                <p className="text-[11px] font-bold text-rose-600 pt-0.5 animate-fadeIn">Bu alan zorunludur</p>
              )}
            </div>

            {/* 2. KASA TİPİ */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span className="text-rose-600 font-bold">*</span>
                <span>Kasa Tipi</span>
              </label>
              <select
                value={bodyType}
                onBlur={() => handleBlur('bodyType')}
                onChange={(e) => { setBodyType(e.target.value); handleFieldChange('bodyType', e.target.value); }}
                className={`w-full border rounded-md px-3 text-sm font-semibold outline-none cursor-pointer h-[42px] transition-all ${
                  isFieldInvalid('bodyType')
                    ? 'border-rose-500 bg-rose-50/70 text-rose-900 focus:border-rose-600'
                    : 'border-slate-200/80 bg-slate-100/70 focus:bg-white text-slate-800 focus:border-indigo-600'
                }`}
              >
                {BODY_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              {isFieldInvalid('bodyType') && (
                <p className="text-[11px] font-bold text-rose-600 pt-0.5 animate-fadeIn">Bu alan zorunludur</p>
              )}
            </div>

            {/* 3. RENK SEÇİMİ */}
            <div className="space-y-1.5 relative">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span className="text-rose-600 font-bold">*</span>
                <span>Renk</span>
              </label>
              
              <div 
                onClick={() => setColorDropdownOpen(!colorDropdownOpen)}
                className={`w-full border rounded-md px-3 text-sm font-semibold outline-none cursor-pointer flex items-center justify-between shadow-2xs h-[42px] transition-all ${
                  isFieldInvalid('color')
                    ? 'border-rose-500 bg-rose-50/70 text-rose-900'
                    : 'border-slate-200/80 hover:border-slate-300 focus:border-indigo-600 bg-slate-100/70 hover:bg-slate-100 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span 
                    className="w-4 h-4 rounded-xs border border-slate-300 shrink-0 shadow-2xs" 
                    style={{ background: selectedColor?.hex || '#FFFFFF' }}
                  />
                  <span>{selectedColor?.name || selectedColor || 'Beyaz'}</span>
                </div>
                <span className="text-xs text-slate-400">▼</span>
              </div>

              {colorDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-xl z-30 max-h-56 overflow-y-auto p-1.5 space-y-0.5 animate-fadeIn">
                  {COLOR_OPTIONS.map((c) => (
                    <div
                      key={c.name}
                      onClick={() => {
                        setSelectedColor(c);
                        handleFieldChange('color', c);
                        setColorDropdownOpen(false);
                      }}
                      className={`flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-md cursor-pointer transition-colors ${
                        (selectedColor?.name || selectedColor) === c.name ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span 
                        className="w-4 h-4 rounded-xs border border-slate-300 shrink-0 shadow-2xs" 
                        style={{ background: c.hex }}
                      />
                      <span>{c.name}</span>
                    </div>
                  ))}
                </div>
              )}
              {isFieldInvalid('color') && (
                <p className="text-[11px] font-bold text-rose-600 pt-0.5 animate-fadeIn">Bu alan zorunludur</p>
              )}
            </div>

            {/* 4. ARAÇ DURUMU */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span className="text-rose-600 font-bold">*</span>
                <span>Araç Durumu</span>
              </label>
              <select
                value={vehicleStatus}
                onBlur={() => handleBlur('vehicleStatus')}
                onChange={(e) => { setVehicleStatus(e.target.value); handleFieldChange('vehicleStatus', e.target.value); }}
                className={`w-full border rounded-md px-3 text-sm font-semibold outline-none cursor-pointer h-[42px] transition-all ${
                  isFieldInvalid('vehicleStatus')
                    ? 'border-rose-500 bg-rose-50/70 text-rose-900 focus:border-rose-600'
                    : 'border-slate-200/80 bg-slate-100/70 focus:bg-white text-slate-800 focus:border-indigo-600'
                }`}
              >
                {VEHICLE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {isFieldInvalid('vehicleStatus') && (
                <p className="text-[11px] font-bold text-rose-600 pt-0.5 animate-fadeIn">Bu alan zorunludur</p>
              )}
            </div>

            {/* 5. GARANTİ DURUMU */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span className="text-rose-600 font-bold">*</span>
                <span>Garanti Durumu</span>
              </label>
              <div className="grid grid-cols-2 gap-2 h-[42px]">
                {['Evet', 'Hayır'].map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => { setWarranty(option); handleFieldChange('warranty', option); }}
                    className={`h-full px-3 text-xs font-bold rounded-md border transition-all cursor-pointer ${
                      warranty === option
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-700'
                        : 'bg-slate-100/80 border-slate-200/80 text-slate-600 hover:bg-slate-200/60'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* 6. TAKAS OLUR MU? */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span className="text-rose-600 font-bold">*</span>
                <span>Takas Olur mu?</span>
              </label>
              <div className="grid grid-cols-2 gap-2 h-[42px]">
                {['Evet', 'Hayır'].map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => { setSwap(option); handleFieldChange('swap', option); }}
                    className={`h-full px-3 text-xs font-bold rounded-md border transition-all cursor-pointer ${
                      swap === option
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-700'
                        : 'bg-slate-100/80 border-slate-200/80 text-slate-600 hover:bg-slate-200/60'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>


        {/* =========================================================================
            PANEL 2.5: ARAÇ DETAYLARI (OPSİYONEL TEKNİK BİLGİLER - 3x2 MATRİS DÜZENİ)
           ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-sm space-y-6">
          
          <div className="flex items-center pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 18H7.5m9-6h2.25m-2.25 0a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 12h8.25" />
              </svg>
              <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <span>Araç Detayları</span>
                <span className="text-xs font-semibold text-slate-400 font-sans font-normal">(Opsiyonel)</span>
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* 1. MOTOR HACMİ */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Motor Hacmi</label>
              <select
                value={engineCapacity}
                onChange={(e) => { setEngineCapacity(e.target.value); handleFieldChange('engineCapacity', e.target.value); }}
                className="w-full border border-slate-200/80 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-md px-3 text-sm font-semibold text-slate-800 bg-slate-100/70 focus:bg-white outline-none cursor-pointer h-[42px] transition-all"
              >
                <option value="">Seçiniz</option>
                {ENGINE_CAPACITIES.map(cap => (
                  <option key={cap} value={cap}>{cap}</option>
                ))}
              </select>
            </div>

            {/* 2. ARAÇ TÜRÜ */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Araç Türü</label>
              <select
                value={vehicleType}
                onChange={(e) => { setVehicleType(e.target.value); handleFieldChange('vehicleType', e.target.value); }}
                className="w-full border border-slate-200/80 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-md px-3 text-sm font-semibold text-slate-800 bg-slate-100/70 focus:bg-white outline-none cursor-pointer h-[42px] transition-all"
              >
                {VEHICLE_TYPES.map(vt => (
                  <option key={vt} value={vt}>{vt}</option>
                ))}
              </select>
            </div>

            {/* 3. PLAKA UYRUĞU */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Plaka Uyruğu</label>
              <select
                value={plateNationality}
                onChange={(e) => { setPlateNationality(e.target.value); handleFieldChange('plateNationality', e.target.value); }}
                className="w-full border border-slate-200/80 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-md px-3 text-sm font-semibold text-slate-800 bg-slate-100/70 focus:bg-white outline-none cursor-pointer h-[42px] transition-all"
              >
                {PLATE_NATIONALITIES.map(pn => (
                  <option key={pn} value={pn}>{pn}</option>
                ))}
              </select>
            </div>

            {/* 4. GARANTİ DURUMU */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Garanti Durumu</label>
              <select
                value={warranty}
                onChange={(e) => { setWarranty(e.target.value); handleFieldChange('warranty', e.target.value); }}
                className="w-full border border-slate-200/80 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-md px-3 text-sm font-semibold text-slate-800 bg-slate-100/70 focus:bg-white outline-none cursor-pointer h-[42px] transition-all"
              >
                {WARRANTY_OPTIONS.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>

            {/* 5. ARACIN İLK SAHİBİYİM */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Aracın İlk Sahibiyim</label>
              <select
                value={isFirstOwner}
                onChange={(e) => { setIsFirstOwner(e.target.value); handleFieldChange('isFirstOwner', e.target.value); }}
                className="w-full border border-slate-200/80 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-md px-3 text-sm font-semibold text-slate-800 bg-slate-100/70 focus:bg-white outline-none cursor-pointer h-[42px] transition-all"
              >
                {FIRST_OWNER_OPTIONS.map(fo => (
                  <option key={fo} value={fo}>{fo}</option>
                ))}
              </select>
            </div>

            {/* 6. TAKASA UYGUN */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Takasa Uygun</label>
              <select
                value={swap}
                onChange={(e) => { setSwap(e.target.value); handleFieldChange('swap', e.target.value); }}
                className="w-full border border-slate-200/80 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-md px-3 text-sm font-semibold text-slate-800 bg-slate-100/70 focus:bg-white outline-none cursor-pointer h-[42px] transition-all"
              >
                {SWAP_OPTIONS.map(sw => (
                  <option key={sw} value={sw}>{sw}</option>
                ))}
              </select>
            </div>

          </div>

        </div>


        {/* =========================================================================
            PANEL 3: ARAÇ KONUM BİLGİLERİ
           ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Araç Konumu</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* 📌 İL SEÇİMİ */}
            <div className={`space-y-1.5 relative w-full ${isCityOpen ? 'z-20' : ''}`} ref={cityDropdownRef}>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span className="text-rose-600 font-bold">*</span>
                <span>Bulunduğu İl</span>
              </label>
              
              <div 
                onClick={() => {
                  setIsCityOpen(!isCityOpen);
                  setIsDistrictOpen(false);
                  if (isCityOpen) handleBlur('city');
                }}
                className={`w-full px-3.5 py-2.5 border rounded-md text-sm font-semibold flex justify-between items-center cursor-pointer transition-all shadow-2xs h-[42px] ${
                  isFieldInvalid('city')
                    ? 'border-rose-500 bg-rose-50/70 text-rose-900'
                    : isCityOpen 
                      ? 'bg-white border-indigo-600 text-slate-900' 
                      : 'bg-slate-100/70 hover:bg-slate-100 border-slate-200/80 text-slate-900'
                }`}
              >
                <span className="truncate">{city || 'İl Seçiniz'}</span>
                <svg className={`w-4 h-4 transition-transform duration-200 shrink-0 ml-2 ${isFieldInvalid('city') ? 'text-rose-500' : 'text-slate-400'} ${isCityOpen ? 'rotate-180 text-indigo-600' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>

              {isCityOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-xl overflow-hidden z-30 animate-fadeIn">
                  <div className="p-2 border-b border-slate-100 bg-slate-50">
                    <input 
                      type="text"
                      autoFocus
                      value={citySearch}
                      onChange={(e) => setCitySearch(e.target.value)}
                      placeholder="İl ara..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-600 placeholder:font-normal"
                    />
                  </div>
                  <div className="max-h-52 overflow-y-auto divide-y divide-slate-50 scrollbar-thin">
                    {filteredCities.length === 0 ? (
                      <div className="p-3 text-center text-xs font-medium text-slate-400">İl bulunamadı</div>
                    ) : (
                      filteredCities.map(cityName => (
                        <div
                          key={cityName}
                          onClick={() => {
                            handleSelectCity(cityName);
                            handleBlur('city');
                          }}
                          className={`px-3.5 py-2.5 text-xs font-semibold cursor-pointer transition-colors flex justify-between items-center ${
                            city === cityName ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          <span className="truncate">{cityName}</span>
                          {city === cityName && (
                            <svg className="w-4 h-4 text-indigo-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              {isFieldInvalid('city') && (
                <p className="text-[11px] font-bold text-rose-600 pt-0.5 animate-fadeIn">Bu alan zorunludur</p>
              )}
            </div>

            {/* 📌 İLÇE SEÇİMİ */}
            <div className={`space-y-1.5 relative w-full ${isDistrictOpen ? 'z-20' : ''}`} ref={districtDropdownRef}>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span className="text-rose-600 font-bold">*</span>
                <span>İlçe</span>
              </label>

              <div 
                onClick={() => {
                  setIsDistrictOpen(!isDistrictOpen);
                  setIsCityOpen(false);
                  if (isDistrictOpen) handleBlur('district');
                }}
                className={`w-full px-3.5 py-2.5 border rounded-md text-sm font-semibold flex justify-between items-center cursor-pointer transition-all shadow-2xs h-[42px] ${
                  isFieldInvalid('district')
                    ? 'border-rose-500 bg-rose-50/70 text-rose-900'
                    : isDistrictOpen 
                      ? 'bg-white border-indigo-600 text-slate-900' 
                      : 'bg-slate-100/70 hover:bg-slate-100 border-slate-200/80 text-slate-900'
                }`}
              >
                <span className="truncate">{district || 'İlçe Seçiniz'}</span>
                <svg className={`w-4 h-4 transition-transform duration-200 shrink-0 ml-2 ${isFieldInvalid('district') ? 'text-rose-500' : 'text-slate-400'} ${isDistrictOpen ? 'rotate-180 text-indigo-600' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>

              {isDistrictOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-xl overflow-hidden z-30 animate-fadeIn">
                  <div className="p-2 border-b border-slate-100 bg-slate-50">
                    <input 
                      type="text"
                      autoFocus
                      value={districtSearch}
                      onChange={(e) => setDistrictSearch(e.target.value)}
                      placeholder="İlçe ara..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-600 placeholder:font-normal"
                    />
                  </div>
                  <div className="max-h-52 overflow-y-auto divide-y divide-slate-50 scrollbar-thin">
                    {filteredDistricts.length === 0 ? (
                      <div className="p-3 text-center text-xs font-medium text-slate-400">İlçe bulunamadı</div>
                    ) : (
                      filteredDistricts.map(distName => (
                        <div
                          key={distName}
                          onClick={() => {
                            handleSelectDistrict(distName);
                            handleBlur('district');
                          }}
                          className={`px-3.5 py-2.5 text-xs font-semibold cursor-pointer transition-colors flex justify-between items-center ${
                            district === distName ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          <span className="truncate">{distName}</span>
                          {district === distName && (
                            <svg className="w-4 h-4 text-indigo-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              {isFieldInvalid('district') && (
                <p className="text-[11px] font-bold text-rose-600 pt-0.5 animate-fadeIn">Bu alan zorunludur</p>
              )}
            </div>

          </div>
        </div>


        {/* =========================================================================
            PANEL 4: EKSPERTİZ, BOYA / DEĞİŞEN & TRAMER BİLGİSİ
           ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-sm space-y-5">
          
          <div className="flex flex-col gap-1 pb-2 border-b border-slate-100">
            <div className="flex items-center">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.259 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.105-2.574-.305-3.749A12.001 12.001 0 0112 2.713z" />
                </svg>
                <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                  <span>Boya, Değişen ve Tramer Bilgisi</span>
                  <span className="text-xs font-semibold text-slate-400 font-sans font-normal">(Opsiyonel)</span>
                </h3>
              </div>
            </div>
            
            <p className="text-xs text-slate-500 font-medium pl-7">
              Araç şeffaflık puanı için bu bilginin doğru ve eksiksiz belirtilmesi önerilir.
            </p>
          </div>

          <div className="bg-slate-100/80 border border-slate-200/60 rounded-2xl p-4 space-y-4">

            {/* 🥪 BEYAZ İÇ KART 1: TRAMER BİLGİSİ */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs space-y-4">
              <h4 className="text-xs font-bold text-slate-800 tracking-tight border-b border-slate-100 pb-2">
                Tramer Bilgisi
              </h4>

              <div className="flex flex-wrap items-center gap-6 py-1">
                {TRAMER_OPTIONS.map(opt => (
                  <label
                    key={opt}
                    className="flex items-center gap-2.5 cursor-pointer select-none group"
                  >
                    <input
                      type="radio"
                      name="tramerOption"
                      value={opt}
                      checked={tramerStatus === opt}
                      onChange={() => {
                        setTramerStatus(opt);
                        handleFieldChange('tramerStatus', opt);
                        if (opt !== 'Tramer Var') {
                          setTramerAmount('');
                          handleFieldChange('tramerAmount', '');
                        }
                      }}
                      className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-600 cursor-pointer accent-indigo-600"
                    />
                    <span className={`text-xs font-semibold transition-colors ${
                      tramerStatus === opt ? 'text-indigo-900 font-bold' : 'text-slate-700 group-hover:text-slate-900'
                    }`}>
                      {opt}
                    </span>
                  </label>
                ))}
              </div>

              <div className="space-y-1.5 pt-1 max-w-xs">
                <label className={`text-xs font-bold transition-colors ${
                  tramerStatus === 'Tramer Var' ? 'text-slate-700' : 'text-slate-400'
                }`}>
                  Tramer Tutarı
                </label>
                <div className="relative flex items-center h-[42px]">
                  <input
                    type="text"
                    disabled={tramerStatus !== 'Tramer Var'}
                    value={tramerAmount}
                    onChange={(e) => handleTramerAmountInput(e.target.value)}
                    placeholder={tramerStatus === 'Tramer Var' ? '0' : 'Tramer tutarı girilmez'}
                    className={`w-full border border-slate-200/80 rounded-md py-2.5 pl-3.5 pr-10 text-sm font-mono font-bold outline-none transition-all h-full ${
                      tramerStatus === 'Tramer Var'
                        ? 'bg-slate-100/70 focus:bg-white text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 cursor-text'
                        : 'bg-slate-100/40 text-slate-400 cursor-not-allowed placeholder:text-slate-300'
                    }`}
                  />
                  <span className={`absolute right-3 text-xs font-bold font-mono transition-colors ${
                    tramerStatus === 'Tramer Var' ? 'text-slate-500' : 'text-slate-300'
                  }`}>
                    TL
                  </span>
                </div>
              </div>
            </div>

            {/* 🥪 BEYAZ İÇ KART 2: BOYA VE DEĞİŞEN OTO-VEKTÖR ŞEMASI */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs space-y-4">
              
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <h4 className="text-xs font-bold text-slate-800 tracking-tight">
                  Boya ve Değişen Bilgisi
                </h4>

                <div className="flex items-center gap-3 text-[11px] font-bold">
                  <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> <span>Orijinal ({damageSummary.ORIGINAL})</span></div>
                  <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> <span>Boyalı ({damageSummary.PAINTED})</span></div>
                  <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> <span>Lokal ({damageSummary.LOCAL_PAINTED})</span></div>
                  <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span> <span>Değişen ({damageSummary.CHANGED})</span></div>
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none inline-flex">
                  <input
                    type="checkbox"
                    checked={isFullyOriginal}
                    onChange={(e) => handleToggleFullyOriginal(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer accent-indigo-600"
                  />
                  <span className="text-xs font-bold text-slate-800">Tamamı Orijinal (Hasarsız / Boyasız)</span>
                </label>
              </div>

              <div className="relative border border-slate-200/70 rounded-xl bg-slate-50/60 p-4 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-6 min-h-[420px]">
                
                <div className="absolute top-3 left-4 bg-white/90 backdrop-blur border border-slate-200 px-3 py-1 rounded-md text-xs font-bold text-slate-700 shadow-2xs z-10">
                  {hoveredPart ? CAR_PARTS.find(p => p.id === hoveredPart)?.name : 'Durumunu değiştirmek için parçaya tıklayın'}
                </div>

                <div className="relative w-full max-w-[320px] h-[380px] flex items-center justify-center my-auto">
                  
                  <svg version="1.1" viewBox="0 0 380 440" className="w-full h-full drop-shadow-xs select-none">
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

                          <path
                            d="m106.51 55.944c-0.52167 0.93363-0.66394 2.0147-0.33197 2.9974 0.85364 2.506 2.5609 4.5207 4.7899 5.7492l4.6476 2.506c9.5798 5.2087 20.345 7.9113 31.158 7.9113h13.421l3.13-17.248c1.3279-7.2233 1.9918-14.643 1.9918-21.965v-25.847c-2.4187 0-8.0622-0.049138-13.706-0.049138-4.3156 0-7.7776 0-10.196 0.049138-1.8496 0-3.794 1.081-5.3115 2.9483-1.1856 1.425-2.2764 2.9483-3.2723 4.5207-1.0433 1.6707-1.6599 2.9483-2.229 4.1767-0.71137 1.4741-1.3753 2.8992-2.6084 4.619-1.2805 1.769-2.798 3.4397-4.5053 4.9138-3.4146 2.9483-6.3075 6.388-8.5838 10.319l-0.047424 0.049138v0.049138l-8.3467 14.299zm5.027-0.88449c2.0393-1.769 4.6476-2.7517 7.3508-2.7517h40.548c0.80622 0 1.4227 0.73707 1.3279 1.5724l-2.4187 16.412c-0.23712 1.5724-1.5176 2.7026-3.0352 2.6535l-10.149-0.19655c-9.4849-0.19655-18.733-2.85-26.937-7.7638l-3.13-1.8673c-1.8021-1.081-3.2723-2.6535-4.2208-4.5699-0.61652-1.1793-0.33197-2.6535 0.66394-3.4888z"
                            fill={DAMAGE_STATUSES[damageReport['door_rear_left'] || 'UNSPECIFIED'].hex}
                            fillRule="nonzero" stroke="#CBD5E1" strokeWidth="1.5" className="cursor-pointer transition-colors hover:opacity-80"
                            onMouseEnter={() => setHoveredPart('door_rear_left')} onMouseLeave={() => setHoveredPart(null)} onClick={() => setActivePartPopover('door_rear_left')}
                          />

                          <path
                            d="m166.04 58.376l-3.0398 16.732 2.9448-0.14764c18.476-0.98425 36.62-6.7421 52.483-16.634 3.4197-2.1653 5.9845-5.561 7.0769-9.5472 3.2297-11.467 3.9897-23.72 2.1848-35.531l-0.28498-1.7224c-0.14249-0.88582-0.85493-1.5256-1.7574-1.5256h-57.613v25.886c0 7.5295-0.66495 15.108-1.9948 22.49zm-0.28498 12.352l3.8472-15.994c0.42747-1.7224 1.8524-2.9527 3.5622-3.0512l34.055-1.9193v-0.049212c0-2.559 1.9948-4.6752 4.5121-4.6752h7.3144c0.61745 0 1.1874 0.14764 1.7574 0.34449 0.23748 0.098425 0.33247 0.3937 0.23748 0.63976-0.094992 0.24606-0.37997 0.34449-0.61745 0.24606-0.42747-0.19685-0.90243-0.29527-1.3774-0.29527h-7.3144c-1.9948 0-3.6097 1.6732-3.6097 3.7401v0.049212c0 2.313 1.8049 4.1831 4.0372 4.1831h7.3144 0.23748l-0.37997 0.24606c-13.489 9.3012-28.783 15.305-44.836 17.52l-7.0769 0.98425c-0.99742 0.19685-1.8998-0.83661-1.6624-1.9685z"
                            fill={DAMAGE_STATUSES[damageReport['door_front_left'] || 'UNSPECIFIED'].hex}
                            fillRule="nonzero" stroke="#CBD5E1" strokeWidth="1.5" className="cursor-pointer transition-colors hover:opacity-80"
                            onMouseEnter={() => setHoveredPart('door_front_left')} onMouseLeave={() => setHoveredPart(null)} onClick={() => setActivePartPopover('door_front_left')}
                          />

                          <path d="m328.49 199.3c-2.1085 1.6125-3.6146 4.1094-3.8656 7.0223l-0.60244 7.0223c-0.30122 3.6412 2.2591 6.8142 5.7734 7.1263s6.5766-2.3408 6.8778-5.982l0.90366-10.611c4.2171 1.7166 8.6851 2.6009 13.254 2.6009h17.822c3.6648 0 6.7272-3.017 6.928-6.8142 0.80325-17.738 1.2551-36.256 1.2551-55.502v-0.41614c0-19.402-0.45183-38.077-1.2551-55.918-0.15061-3.7973-3.213-6.8142-6.928-6.8142h-17.772c-4.5685 0-9.0366 0.88429-13.254 2.6009l-0.90366-10.611c-0.30122-3.6412-3.4138-6.2941-6.8778-5.982-3.5142 0.3121-6.0746 3.5372-5.7734 7.1263l0.60244 7.0223c0.25102 2.913 1.7069 5.4098 3.8656 7.0223v111.11h-0.050203z" stroke="#CBD5E1" strokeWidth="1.5" />
                          <path
                            d="m340 201.35c3.7652 1.6125 7.7313 2.4968 11.798 2.4968h15.864c3.2632 0 5.9742-2.8609 6.1248-6.5021 0.70284-16.958 1.1547-34.643 1.1547-53.005v-0.41614c0-18.518-0.40162-36.36-1.1547-53.422-0.15061-3.6412-2.8616-6.5021-6.1248-6.5021h-15.864c-4.0664 0-8.0325 0.83227-11.798 2.4968v114.85z"
                            fill={DAMAGE_STATUSES[damageReport['front_bumper'] || 'UNSPECIFIED'].hex}
                            fillRule="nonzero" stroke="#CBD5E1" strokeWidth="1.5" className="cursor-pointer transition-colors hover:opacity-80"
                            onMouseEnter={() => setHoveredPart('front_bumper')} onMouseLeave={() => setHoveredPart(null)} onClick={() => setActivePartPopover('front_bumper')}
                          />

                          <path d="m300.87 101.87c-2.3093-4.3174-5.8738-7.6985-10.241-9.6752-2.711-1.2484-5.6729-1.8726-8.6349-1.8726h-54.119c-0.050203-0.26009-0.10041-0.41614-0.15061-0.52017-0.60244-2.0287-2.6608-8.7389-7.7815-11.08-1.8575-0.88429-3.2632-0.72824-3.5644-0.67622-0.20081 0-1.4057 0.15605-2.0081 0.67622-2.1587 1.8206 2.4097 8.3227 4.9199 11.6h-68.879c-2.1587 0-4.3677-0.26009-6.4762-0.83227-2.1085-0.57219-4.3175-0.83227-6.4762-0.83227h-51.559c-2.962 0-5.8738 0.57219-8.6349 1.6645-9.8398 3.9533-19.479 10.143-21.437 20.911-2.0081 10.82-2.3595 22.211-2.3595 32.927 0 8.999 0.25102 18.414 1.5061 27.621h-4.2673c-0.60244 0-1.6567 0-1.7069 3.4851 0 3.4331 1.3053 3.4851 3.3636 3.4851h3.7652c2.6106 9.7792 11.748 15.553 21.085 19.298 2.7612 1.0924 5.6729 1.6645 8.6349 1.6645h51.559c2.2089 0 4.3677-0.26008 6.4762-0.83227 2.1085-0.57219 4.3175-0.83227 6.4762-0.83227h68.879c-2.5102 3.2771-7.0786 9.7792-4.9199 11.6 0.60244 0.52017 1.8073 0.67622 2.0081 0.67622 0.30122 0.052018 1.7069 0.20807 3.5644-0.67622 5.0705-2.3408 7.1288-9.051 7.7815-11.08 0.050204-0.10403 0.10041-0.3121 0.15061-0.52017h54.119c2.962 0 5.924-0.62421 8.6349-1.8726 4.3175-1.9767 7.9321-5.3578 10.241-9.6752 4.4179-8.3748 10.844-23.668 10.844-42.342 0.050203-18.622-6.3758-33.915-10.794-42.29zm-186.3-4.4735h101.66c0.65264 0 0.80325 0.93631 0.15061 1.1444l-26.457 7.9586c-2.2089 0.67622-4.5183 0.98833-6.8276 0.98833h-44.38c-3.5142 0-6.9782-0.78026-10.141-2.2888l-14.258-6.7102c-0.55223-0.26009-0.35142-1.0924 0.25102-1.0924zm-14.91 83.279c-1.8575-11.08-2.9118-23.46-2.9118-36.464s1.0543-25.384 2.9118-36.464c0.30122-1.7686 2.1085-2.7049 3.6648-1.9767l14.057 7.0223c1.0041 0.52017 1.6065 1.6125 1.4559 2.7569-1.1045 8.2707-1.7571 18.102-1.7571 28.609 0 10.507 0.65264 20.339 1.7571 28.609 0.15061 1.1444-0.45183 2.2888-1.4559 2.7569l-14.057 7.0223c-1.5563 0.88429-3.3636-0.10404-3.6648-1.8726zm116.57 10.351h-101.66c-0.60244 0-0.80325-0.83228-0.25102-1.1444l14.258-6.7102c3.1628-1.5085 6.6268-2.2888 10.141-2.2888h44.38c2.3093 0 4.6187 0.36412 6.8276 0.98833l26.457 7.9586c0.60244 0.20807 0.50203 1.1964-0.15061 1.1964zm12.551-7.5425c-0.70284 2.6009-3.3134 4.1094-5.8236 3.3811l-26.708-7.8026c-2.4097-0.72824-3.8656-3.2251-3.3134-5.7739 1.8073-8.5828 2.8114-18.518 2.8114-29.13 0-10.611-1.0041-20.547-2.8114-29.13-0.50203-2.5488 0.90366-5.0457 3.3134-5.7739l26.708-7.8026c2.5102-0.72824 5.1207 0.78026 5.8236 3.3811 3.3636 12.016 5.2211 25.28 5.2211 39.325 0 14.045-1.8575 27.361-5.2211 39.325z" fill="#fff" fillRule="nonzero" stroke="#CBD5E1" strokeWidth="1.5" />

                          <path
                            d="m59.277 54.594s6.1176 1.9503 15.529 0.97517l5.3646 0.29255s9.2234 7.5088 12.047 7.2163c2.8235-0.34131 7.7175-8.4352 7.7175-8.4352l10.635-19.503c-0.14118 0.24379-15.2 3.4131-22.164-1.414-6.0234-4.1932-10.682-10.824-11.482-17.846l-0.79999-4.8759s-9.3175-0.39007-12.329 6.5824c-3.0117 6.9725-6.5411 9.4592-6.5411 9.4592s-0.94116 10.629 0.79999 13.262c1.6941 2.5842 1.2235 14.286 1.2235 14.286z"
                            fill={DAMAGE_STATUSES[damageReport['fender_rear_left'] || 'UNSPECIFIED'].hex}
                            fillRule="nonzero" stroke="#CBD5E1" strokeWidth="1.5" className="cursor-pointer transition-colors hover:opacity-80"
                            onMouseEnter={() => setHoveredPart('fender_rear_left')} onMouseLeave={() => setHoveredPart(null)} onClick={() => setActivePartPopover('fender_rear_left')}
                          />

                          <path
                            transform="translate(267.88 27.237) scale(-1) rotate(180) translate(-267.88 -27.237)"
                            d="m234.26 49.983l53.188-9.0296s15.014-4.4657 16.577-8.6861c1.563-4.2204 2.3681-7.0176 1.563-10.109-0.80516-3.0917-2.8418-10.502-2.8418-10.502s3.3154-6.1833-0.61572-6.1833c-3.9311 0-15.958-0.98148-15.958-0.98148s2.3211 32.474-25.531 32.907c-25.568 0.39668-24.904-28.637-24.904-28.637h-5.8815s5.7309 23.212 0 41.222h4.4042z"
                            fill={DAMAGE_STATUSES[damageReport['fender_front_left'] || 'UNSPECIFIED'].hex}
                            fillRule="nonzero" stroke="#CBD5E1" strokeWidth="1.5" className="cursor-pointer transition-colors hover:opacity-80"
                            onMouseEnter={() => setHoveredPart('fender_front_left')} onMouseLeave={() => setHoveredPart(null)} onClick={() => setActivePartPopover('fender_front_left')}
                          />

                          <path d="m305.44 252.31c-5.6227-4.3174-12.099-7.1784-19.027-8.3748l-43.928-7.6465-21.738-12.848c-18.174-10.768-38.757-16.437-59.691-16.437h-20.734c-5.8236 0.20807-12.701 0.83227-20.282 2.4968-0.60244 0.15605-1.2049 0.26009-1.8073 0.41614-11.095 2.6009-21.638 7.2824-31.327 13.576-2.6106 1.6645-5.1709 3.3811-7.7815 5.0457-0.55223 0.3121-1.2049 0.46816-1.8073 0.46816h-11.547c-3.2632 0-6.426 1.0403-9.0868 2.913-0.80325 0.57219-1.1045 1.5605-0.85345 2.4968 1.6065 6.4501-2.46 12.692-2.2089 19.142 0.10041 3.7452-1.6065 7.2824 0.25102 10.455 0.80325 0.88429 1.6567 1.8206 2.46 2.7049 1.8575 2.0287 3.4138 4.2654 4.6187 6.7622 0.70284 1.3524 1.7069 2.965 3.2632 4.4215 3.5644 3.3291 7.5807 3.7973 8.8859 3.9013l2.962 0.6242c1.4559 0.3121 2.8114-0.93631 2.711-2.4448-0.050203-0.67622-0.10041-1.3524-0.10041-2.0807 0-13.004 10.241-23.564 22.842-23.46 12.551 0.10403 22.642 11.288 22.491 24.292-0.050203 2.6009-0.15061 4.9936-0.50203 7.3344-0.20081 1.4045 0.85345 2.7049 2.2591 2.7049h110.55c1.3053 0 2.3595-1.1444 2.2591-2.4968-0.20081-2.7049-0.25102-5.3057-0.25102-8.3227 0-12.9 10.041-23.356 22.441-23.46 13.003-0.10403 23.244 11.34 22.842 24.76-0.050203 2.3928-0.30122 4.6295-0.50203 6.8142-0.15061 1.4565 1.0041 2.6529 2.4097 2.5488l19.931-1.1444c2.2089-0.10404 3.7652-2.1847 3.4138-4.4215l-0.40162-2.4448 2.8616-11.08c0.35142-1.3004 0.50203-2.5488 0.50203-3.8493 0-9.9353-6.3758-13.368-6.3758-13.368z" stroke="#CBD5E1" strokeWidth="1.5" />

                          <path
                            transform="translate(267.88 261.26) scale(-1, 1) rotate(180) translate(-267.88 -261.26)"
                            d="m234.26 284.01l53.188-9.0296s15.014-4.4657 16.577-8.6861c1.563-4.2204 2.3681-7.0176 1.563-10.109-0.80516-3.0917-2.8418-10.502-2.8418-10.502s3.3154-6.1833-0.61572-6.1833c-3.9311 0-15.958-0.98148-15.958-0.98148s2.3211 32.474-25.531 32.907c-25.568 0.39668-24.904-28.637-24.904-28.637h-5.8815s5.7309 23.212 0 41.222h4.4042z"
                            fill={DAMAGE_STATUSES[damageReport['fender_front_right'] || 'UNSPECIFIED'].hex}
                            fillRule="nonzero" stroke="#CBD5E1" strokeWidth="1.5" className="cursor-pointer transition-colors hover:opacity-80"
                            onMouseEnter={() => setHoveredPart('fender_front_right')} onMouseLeave={() => setHoveredPart(null)} onClick={() => setActivePartPopover('fender_front_right')}
                          />

                          <path
                            d="m114.9 247.46l0.047425 0.098276c2.2764 3.9311 5.1693 7.4199 8.5838 10.319 1.7547 1.4741 3.2723 3.1448 4.5053 4.9138 1.233 1.7198 1.897 3.1448 2.6084 4.619 0.61652 1.2285 1.233 2.5552 2.229 4.1767 0.99592 1.5724 2.0867 3.0957 3.2723 4.5207 1.5176 1.8181 3.462 2.8992 5.3115 2.9483 2.4661 0.049138 5.8806 0.049138 10.196 0.049138 5.5961 0 11.287-0.049138 13.706-0.049138v-25.847c0-7.3707-0.66394-14.741-1.9918-21.965l-3.13-17.248h-13.469c-10.813 0-21.578 2.7517-31.158 7.9113l-4.6476 2.506c-2.2764 1.2285-3.9362 3.2431-4.7899 5.7492-0.33197 0.98276-0.1897 2.0638 0.33197 2.9974l8.3941 14.299zm-3.9837-16.904c0.94849-1.9164 2.4187-3.4888 4.2208-4.5699l3.13-1.8673c8.2044-4.9138 17.452-7.5673 26.937-7.7638l10.149-0.19655c1.5176-0.049138 2.8455 1.1302 3.0352 2.6535l2.4187 16.412c0.14227 0.83535-0.47425 1.5724-1.3279 1.5724h-40.548c-2.7032 0-5.2641-0.98276-7.3508-2.7517-0.94849-0.83535-1.233-2.3095-0.66394-3.4888z"
                            fill={DAMAGE_STATUSES[damageReport['door_rear_right'] || 'UNSPECIFIED'].hex}
                            fillRule="nonzero" stroke="#CBD5E1" strokeWidth="1.5" className="cursor-pointer transition-colors hover:opacity-80"
                            onMouseEnter={() => setHoveredPart('door_rear_right')} onMouseLeave={() => setHoveredPart(null)} onClick={() => setActivePartPopover('door_rear_right')}
                          />

                          <path
                            d="m169.03 253.22v25.886h57.66c0.85493 0 1.6149-0.63976 1.7574-1.5256l0.28498-1.7224c1.8049-11.811 1.0449-24.065-2.1848-35.531-1.1399-3.9862-3.6572-7.3819-7.0769-9.5472-15.911-9.9409-34.055-15.65-52.531-16.634l-2.9448-0.14764 3.0398 16.732c1.3299 7.3819 1.9948 14.961 1.9948 22.49zm-0.52246-36.86l7.0769 0.98425c16.054 2.2146 31.395 8.2185 44.836 17.52l0.37997 0.24606h-0.23748-7.3144c-2.2323 0-4.0372 1.8701-4.0372 4.1831v0.049213c0 2.0669 1.6149 3.7401 3.6097 3.7401h7.3144c0.47496 0 0.94992-0.098425 1.3774-0.29528 0.23748-0.098425 0.52246 0 0.61745 0.24606 0.094992 0.24606 0 0.54134-0.23748 0.63976-0.56996 0.24606-1.1399 0.34449-1.7574 0.34449h-7.3144c-2.4698 0-4.5121-2.0669-4.5121-4.6752v-0.049213l-34.055-1.9193c-1.7099-0.098425-3.1348-1.3287-3.5622-3.0512l-3.8472-15.994c-0.33247-1.0827 0.56996-2.1161 1.6624-1.9685z"
                            fill={DAMAGE_STATUSES[damageReport['door_front_right'] || 'UNSPECIFIED'].hex}
                            fillRule="nonzero" stroke="#CBD5E1" strokeWidth="1.5" className="cursor-pointer transition-colors hover:opacity-80"
                            onMouseEnter={() => setHoveredPart('door_front_right')} onMouseLeave={() => setHoveredPart(null)} onClick={() => setActivePartPopover('door_front_right')}
                          />

                          <path
                            d="m58.43 234.06s6.5264-2.0807 16.567-1.0403l5.7232-0.3121s9.8398-8.0106 12.852-7.6985c3.0122 0.36412 8.2333 8.999 8.2333 8.999l11.346 20.807c-0.15061-0.26008-16.216-3.6412-23.646 1.5085-6.426 4.4735-11.396 11.548-12.25 19.038l-0.85345 5.2017s-9.9402 0.41614-13.153-7.0223c-3.213-7.4385-6.9782-10.091-6.9782-10.091s-1.0041-11.34 0.85345-14.149c1.8073-2.7569 1.3053-15.241 1.3053-15.241z"
                            fill={DAMAGE_STATUSES[damageReport['fender_rear_right'] || 'UNSPECIFIED'].hex}
                            fillRule="nonzero" stroke="#CBD5E1" strokeWidth="1.5" className="cursor-pointer transition-colors hover:opacity-80"
                            onMouseEnter={() => setHoveredPart('fender_rear_right')} onMouseLeave={() => setHoveredPart(null)} onClick={() => setActivePartPopover('fender_rear_right')}
                          />

                          <path
                            d="m230 100s14.961 40.833 0 87.129h53.968s20.633-8.1667 18.876-43.07c-1.7571-34.904-18.876-44.059-18.876-44.059h-53.968z"
                            fill={DAMAGE_STATUSES[damageReport['front_bonnet'] || 'UNSPECIFIED'].hex}
                            fillRule="nonzero" stroke="#CBD5E1" strokeWidth="1.5" className="cursor-pointer transition-colors hover:opacity-80"
                            onMouseEnter={() => setHoveredPart('front_bonnet')} onMouseLeave={() => setHoveredPart(null)} onClick={() => setActivePartPopover('front_bonnet')}
                          />

                          <path
                            d="m95.64 100.03h-23.897s-10.743-1.3004-10.743 13.004v65.594s1.7069 8.7909 8.4843 8.7909h26.156s-8.5345-37.712 0-87.389z"
                            fill={DAMAGE_STATUSES[damageReport['trunk'] || 'UNSPECIFIED'].hex}
                            fillRule="nonzero" stroke="#CBD5E1" strokeWidth="1.5" className="cursor-pointer transition-colors hover:opacity-80"
                            onMouseEnter={() => setHoveredPart('trunk')} onMouseLeave={() => setHoveredPart(null)} onClick={() => setActivePartPopover('trunk')}
                          />

                          <path
                            d="m126.16 111s-10.794 28.349-1.1547 64.501h63.658s8.7855-32.771 0-64.501h-62.503z"
                            fill={DAMAGE_STATUSES[damageReport['roof'] || 'UNSPECIFIED'].hex}
                            fillRule="nonzero" stroke="#CBD5E1" strokeWidth="1.5" className="cursor-pointer transition-colors hover:opacity-80"
                            onMouseEnter={() => setHoveredPart('roof')} onMouseLeave={() => setHoveredPart(null)} onClick={() => setActivePartPopover('roof')}
                          />

                          <path d="m361.78 111.14s0.050203-7.4385-2.6608-11.34c-2.711-3.9013-12.701-7.8026-12.701-7.8026s-2.9118 22.471 6.677 28.505c9.5888 6.034 8.6851-9.3631 8.6851-9.3631z" fill="#CBD5E1" fillRule="nonzero" />
                          <path d="m361.78 179.77s0.050203 7.4385-2.6608 11.34-12.701 7.8026-12.701 7.8026-2.9118-22.471 6.677-28.505c9.5888-6.034 8.6851 9.3631 8.6851 9.3631z" fill="#CBD5E1" fillRule="nonzero" />

                          <path d="m39.259 83.601c-4.2171-1.7166-8.6851-2.6009-13.254-2.6009h-17.822c-3.6648 0-6.7272 3.017-6.928 6.8142-0.80325 17.738-1.2551 36.256-1.2551 55.502v0.41614c0 19.402 0.45183 38.077 1.2551 55.918 0.15061 3.7973 3.213 6.8142 6.928 6.8142h17.822c4.5685 0 9.0366-0.88429 13.254-2.6009v-120.26z" stroke="#CBD5E1" strokeWidth="1.5" />
                          <path
                            d="m36.941 86.497c-3.7652-1.6125-7.7313-2.4968-11.798-2.4968h-15.864c-3.2632 0-5.9742 2.8609-6.1248 6.5021-0.70284 16.958-1.1547 34.643-1.1547 53.005v0.41614c0 18.518 0.40162 36.36 1.1547 53.422 0.15061 3.6412 2.8616 6.5021 6.1248 6.5021h15.864c4.0664 0 8.0325-0.83228 11.798-2.4968v-114.85z"
                            fill={DAMAGE_STATUSES[damageReport['rear_bumper'] || 'UNSPECIFIED'].hex}
                            fillRule="nonzero" stroke="#CBD5E1" strokeWidth="1.5" className="cursor-pointer transition-colors hover:opacity-80"
                            onMouseEnter={() => setHoveredPart('rear_bumper')} onMouseLeave={() => setHoveredPart(null)} onClick={() => setActivePartPopover('rear_bumper')}
                          />

                        </g>
                      </g>
                    </g>
                  </svg>

                  {/* 📌 AKILLI DİNAMİK POPUP */}
                  {activePartMenu && (() => {
                    const popoverPositions = {
                      front_bumper: { top: '10%', left: '50%' },
                      front_bonnet: { top: '24%', left: '50%' },
                      roof: { top: '50%', left: '50%' },
                      trunk: { top: '75%', left: '50%' },
                      rear_bumper: { top: '90%', left: '50%' },
                      fender_front_left: { top: '22%', left: '25%' },
                      door_front_left: { top: '40%', left: '25%' },
                      door_rear_left: { top: '60%', left: '25%' },
                      fender_rear_left: { top: '78%', left: '25%' },
                      fender_front_right: { top: '22%', left: '75%' },
                      door_front_right: { top: '40%', left: '75%' },
                      door_rear_right: { top: '60%', left: '75%' },
                      fender_rear_right: { top: '78%', left: '75%' },
                    };
                    const pos = popoverPositions[activePartMenu] || { top: '50%', left: '50%' };

                    return (
                      <div 
                        style={{ top: pos.top, left: pos.left }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 w-48 bg-white border border-slate-300 rounded-lg shadow-2xl z-30 overflow-hidden animate-fadeIn font-sans"
                      >
                        <div className="bg-slate-900 text-white px-3 py-1.5 flex items-center justify-between">
                          <span className="text-[11px] font-bold truncate">
                            {CAR_PARTS.find(p => p.id === activePartMenu)?.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setActivePartPopover(null)}
                            className="text-slate-400 hover:text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded cursor-pointer transition-colors"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="p-1 bg-slate-50 space-y-0.5">
                          {Object.values(DAMAGE_STATUSES).map((status) => (
                            <button
                              key={status.id}
                              type="button"
                              onClick={() => handleSetPartStatus(activePartMenu, status.id)}
                              className={`w-full text-left px-2.5 py-1.5 rounded text-[11px] font-bold flex items-center justify-between transition-colors cursor-pointer ${
                                damageReport[activePartMenu] === status.id 
                                  ? 'bg-rose-50 text-rose-700' 
                                  : 'hover:bg-white text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${status.bg} shrink-0 border border-slate-300`}></span>
                                <span>{status.label}</span>
                              </div>
                              {damageReport[activePartMenu] === status.id && (
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                </div>

                <div className="space-y-4 w-full md:w-80 text-xs text-slate-600 bg-white p-5 sm:p-6 rounded-xl border border-slate-200/90 shadow-2xs">
                  
                  <div className="border-b border-slate-100 pb-2.5 space-y-1">
                    <p className="font-black text-slate-900 tracking-tight text-sm">Nasıl Kullanılır?</p>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      Araç parçalarının üzerine tıklayarak ekspertiz durumunu seçebilirsiniz:
                    </p>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0 mt-0.5 border border-emerald-600/30 shadow-2xs"></span>
                      <div className="leading-snug">
                        <strong className="text-slate-900 font-bold">Orijinal:</strong>
                        <span className="text-slate-500 ml-1">İşlem görmemiş fabrikasyon parça.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0 mt-0.5 border border-amber-500/30 shadow-2xs"></span>
                      <div className="leading-snug">
                        <strong className="text-slate-900 font-bold">Boyalı:</strong>
                        <span className="text-slate-500 ml-1">Parça üzerinde tam boya işlemi mevcut.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="w-3 h-3 rounded-full bg-orange-500 shrink-0 mt-0.5 border border-orange-600/30 shadow-2xs"></span>
                      <div className="leading-snug">
                        <strong className="text-slate-900 font-bold">Lokal Boyalı:</strong>
                        <span className="text-slate-500 ml-1">Parçanın sadece bir kısmında boya var.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="w-3 h-3 rounded-full bg-rose-600 shrink-0 mt-0.5 border border-rose-700/30 shadow-2xs"></span>
                      <div className="leading-snug">
                        <strong className="text-slate-900 font-bold">Değişen:</strong>
                        <span className="text-slate-500 ml-1">Parça tamamen sökülüp yenilenmiş.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="w-3 h-3 rounded-full bg-slate-300 shrink-0 mt-0.5 border border-slate-400/30 shadow-2xs"></span>
                      <div className="leading-snug">
                        <strong className="text-slate-900 font-bold">Belirtilmemiş:</strong>
                        <span className="text-slate-500 ml-1">Durumu henüz seçilmemiş parça.</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-100 leading-tight">
                    * Eksiksiz ekspertiz bilgisi araç karnesinin şeffaflık puanını artırır.
                  </p>
                </div>

              </div>

            </div>
          </div>
        </div>   

        {/* =========================================================================
            PANEL 5: ARAÇ DONANIM ÖZELLİKLERİ
           ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-6">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center shrink-0 shadow-2xs">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                  <span>Araç Donanım Özellikleri</span>
                  <span className="text-xs font-semibold text-slate-400 font-sans font-normal">(Opsiyonel)</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">Donanım kategorilerine tıklayarak detayları inceleyin ve seçim yapın.</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={featureSearch}
                  onChange={(e) => setFeatureSearch(e.target.value)}
                  placeholder="Donanım ara (Örn: Isıtma)..."
                  className="w-full border border-slate-200/80 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-lg py-2 pl-8.5 pr-3 text-xs font-semibold text-slate-900 bg-slate-100/70 focus:bg-white outline-none transition-all placeholder:font-normal placeholder:text-slate-400 h-[40px]"
                />
                <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>

              <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-3.5 py-2 rounded-lg border border-indigo-100 shrink-0 h-[40px] flex items-center shadow-2xs">
                {selectedFeatures.length} Seçildi
              </span>
            </div>
          </div>

          <div className="space-y-3.5">
            {EQUIPMENT_CATEGORIES.map((cat) => {
              const filteredItems = cat.items.filter(item =>
                item.toLowerCase('tr').includes(featureSearch.toLowerCase('tr'))
              );

              if (filteredItems.length === 0) return null;

              const isSearching = featureSearch.trim().length > 0;
              const isOpen = isSearching || !!openCategories[cat.title];

              const categorySelectedCount = cat.items.filter(item => selectedFeatures.includes(item)).length;
              const isAllCatSelected = cat.items.length > 0 && categorySelectedCount === cat.items.length;

              return (
                <div 
                  key={cat.title} 
                  className={`border rounded-2xl overflow-hidden transition-all bg-white ${
                    categorySelectedCount > 0 
                      ? 'border-indigo-200 shadow-2xs' 
                      : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div 
                    onClick={() => toggleCategoryAccordion(cat.title)}
                    className="w-full px-5 py-4 bg-slate-50/80 hover:bg-slate-100/80 cursor-pointer flex items-center justify-between select-none transition-colors min-h-[56px]"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full transition-all shrink-0 ${
                        categorySelectedCount > 0 ? 'bg-indigo-600 ring-4 ring-indigo-100' : 'bg-slate-300'
                      }`} />
                      <span className="text-sm font-extrabold text-slate-900 tracking-tight">
                        {cat.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-3.5">
                      <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full transition-all border ${
                        categorySelectedCount > 0 
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs' 
                          : 'bg-slate-200/70 border-slate-300/60 text-slate-600'
                      }`}>
                        {categorySelectedCount} / {cat.items.length} seçim
                      </span>

                      <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/80 border border-slate-200/80 shrink-0">
                        <svg 
                          className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-300 ${
                            isOpen ? 'rotate-180 text-indigo-600' : ''
                          }`} 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2.5" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className={`grid transition-all duration-300 ease-in-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}>
                    <div className="overflow-hidden">
                      <div className="p-5 bg-white border-t border-slate-100 space-y-4">
                        
                        <div className="flex justify-end pb-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSelectAllCategory(cat.items);
                            }}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 cursor-pointer bg-indigo-50/60 px-2.5 py-1 rounded-md border border-indigo-100/60"
                          >
                            <span>{isAllCatSelected ? '✓ Tümünü Kaldır' : '＋ Tümünü Seç'}</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {filteredItems.map(item => {
                            const isChecked = selectedFeatures.includes(item);
                            return (
                              <div
                                key={item}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFeature(item);
                                }}
                                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between cursor-pointer transition-all select-none h-[46px] shadow-2xs ${
                                  isChecked
                                    ? 'bg-indigo-50/90 border-indigo-600 text-indigo-950 shadow-xs'
                                    : 'bg-slate-50/70 border-slate-200/80 text-slate-700 hover:bg-slate-100/80 hover:border-slate-300'
                                }`}
                              >
                                <span className="truncate mr-2">{item}</span>
                                
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  readOnly
                                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-600 border-slate-300 accent-indigo-600 shrink-0 pointer-events-none"
                                />
                              </div>
                            );
                          })}
                        </div>

                      </div>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

        </div>

        {/* =========================================================================
            PANEL 6: İLAN AÇIKLAMASI
           ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1">
                <span className="text-rose-600 font-bold">*</span>
                <span>İlan Açıklaması</span>
              </h3>
            </div>
            
            <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/60">
              {getCleanText(description).length} / 10000
            </span>
          </div>

          <div className={`border rounded-xl overflow-hidden transition-all shadow-2xs ${
            isFieldInvalid('description')
              ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/40'
              : 'border-slate-200/90 bg-white focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-600'
          }`}>
            
            <div ref={colorPickerRef} className="relative bg-slate-50/90 border-b border-slate-200/80 p-2 flex flex-wrap items-center justify-between gap-2 select-none">
              
              <div className="flex flex-wrap items-center gap-1">
                
                <div className="flex items-center pr-1.5 mr-1 border-r border-slate-200">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => execCmd('undo')}
                    title="Geri Al"
                    className="p-1.5 hover:bg-slate-200/70 rounded text-slate-700 transition-colors cursor-pointer"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6.4 8H12c3.7 0 6.2 2 6.8 5.1.6 2.7-.4 5.6-2.3 6.8a1 1 0 01-1-1.8c1.1-.6 1.8-2.7 1.4-4.6-.5-2.1-2.1-3.5-4.9-3.5H6.4l3.3 3.3a1 1 0 11-1.4 1.4l-5-5a1 1 0 010-1.4l5-5a1 1 0 011.4 1.4L6.4 8z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => execCmd('redo')}
                    title="Yinele"
                    className="p-1.5 hover:bg-slate-200/70 rounded text-slate-700 transition-colors cursor-pointer"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.6 10H12c-2.8 0-4.4 1.4-4.9 3.5-.4 2 .3 4 1.4 4.6a1 1 0 11-1 1.8c-2-1.2-2.9-4.1-2.3-6.8.6-3 3-5.1 6.8-5.1h5.6l-3.3-3.3a1 1 0 111.4-1.4l5 5a1 1 0 010 1.4l-5 5a1 1 0 01-1.4-1.4l3.3-3.3z" />
                    </svg>
                  </button>
                </div>

                <div className="flex items-center gap-0.5 pr-1.5 mr-1 border-r border-slate-200">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => execCmd('bold')}
                    title="Kalın (Bold)"
                    className="p-1.5 hover:bg-slate-200/70 rounded text-slate-800 font-black transition-colors cursor-pointer"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7.8 19c-.3 0-.5 0-.6-.2l-.2-.5V5.7c0-.2 0-.4.2-.5l.6-.2h5c1.5 0 2.7.3 3.5 1 .7.6 1.1 1.4 1.1 2.5a3 3 0 01-.6 1.9c-.4.6-1 1-1.6 1.2.4.1.9.3 1.3.6s.8.7 1 1.2c.4.4.5 1 .5 1.6 0 1.3-.4 2.3-1.3 3-.8.7-2.1 1-3.8 1H7.8zm5-8.3c.6 0 1.2-.1 1.6-.5.4-.3.6-.7.6-1.3 0-1.1-.8-1.7-2.3-1.7H9.3v3.5h3.4zm.5 6c.7 0 1.3-.1 1.7-.4.4-.4.6-.9.6-1.5s-.2-1-.7-1.4c-.4-.3-1-.4-2-.4H9.4v3.8h4z" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => execCmd('italic')}
                    title="İtalik"
                    className="p-1.5 hover:bg-slate-200/70 rounded text-slate-800 transition-colors cursor-pointer"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16.7 4.7l-.1.9h-.3c-.6 0-1 0-1.4.3-.3.3-.4.6-.5 1.1l-2.1 9.8v.6c0 .5.4.8 1.4.8h.2l-.2.8H8l.2-.8h.2c1.1 0 1.8-.5 2-1.5l2-9.8.1-.5c0-.6-.4-.8-1.4-.8h-.3l.2-.9h5.8z" />
                    </svg>
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setIsTextColorOpen(!isTextColorOpen); setIsBgColorOpen(false); }}
                      title="Yazı Rengi"
                      className="p-1.5 hover:bg-slate-200/70 rounded text-slate-800 transition-colors cursor-pointer flex items-center gap-0.5"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 18h18v3H3z" fill="#3B82F6" />
                        <path d="M8.7 16h-.8a.5.5 0 01-.5-.6l2.7-9c.1-.3.3-.4.5-.4h2.8c.2 0 .4.1.5.4l2.7 9a.5.5 0 01-.5.6h-.8a.5.5 0 01-.4-.4l-.7-2.2c0-.3-.3-.4-.5-.4h-3.4c-.2 0-.4.1-.5.4l-.7 2.2c0 .3-.2.4-.4.4zm2.6-7.6l-.6 2a.5.5 0 00.5.6h1.6a.5.5 0 00.5-.6l-.6-2c0-.3-.3-.4-.5-.4h-.4c-.2 0-.4.1-.5.4z" />
                      </svg>
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor"><path d="M8.7 2.2c.3-.3.8-.3 1 0 .4.4.4.9 0 1.2L5.7 7.8c-.3.3-.9.3-1.2 0L.2 3.4a.8.8 0 010-1.2c.3-.3.8-.3 1.1 0L5 6l3.7-3.8z" /></svg>
                    </button>

                    {isTextColorOpen && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-2xl p-2.5 z-50 w-52 space-y-2 animate-fadeIn">
                        <div className="grid grid-cols-5 gap-1.5">
                          {EDITOR_COLOR_PALETTE.flat().map((colorHex, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleApplyTextColor(colorHex)}
                              style={{ backgroundColor: colorHex }}
                              className="w-8 h-8 rounded border border-slate-300/80 hover:scale-110 transition-transform cursor-pointer shadow-2xs"
                            />
                          ))}
                        </div>
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleApplyTextColor('#000000')}
                            className="w-7 h-7 bg-black rounded border border-slate-400 cursor-pointer"
                            title="Siyah"
                          />
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleResetColor('text')}
                            className="w-7 h-7 bg-white rounded border border-slate-300 flex items-center justify-center text-rose-500 font-bold cursor-pointer"
                            title="Rengi Sıfırla"
                          >
                            ╱
                          </button>
                          <label className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 flex items-center justify-center cursor-pointer transition-colors" title="Özel Renk Seç">
                            🎨
                            <input
                              type="color"
                              onChange={(e) => handleApplyTextColor(e.target.value)}
                              className="sr-only"
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setIsBgColorOpen(!isBgColorOpen); setIsTextColorOpen(false); }}
                      title="Metni Vurgula (Arka Plan Rengi)"
                      className="p-1.5 hover:bg-slate-200/70 rounded text-slate-800 transition-colors cursor-pointer flex items-center gap-0.5"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 18h18v3H3z" fill="#EAB308" />
                        <path fillRule="evenodd" d="M7.7 16.7H3l3.3-3.3-.7-.8L10.2 8l4 4.1-4 4.2c-.2.2-.6.2-.8 0l-.6-.7-1.1 1.1zm5-7.5L11 7.4l3-2.9a2 2 0 012.6 0L18 6c.7.7.7 2 0 2.7l-2.9 2.9-1.8-1.8-.5-.6" />
                      </svg>
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor"><path d="M8.7 2.2c.3-.3.8-.3 1 0 .4.4.4.9 0 1.2L5.7 7.8c-.3.3-.9.3-1.2 0L.2 3.4a.8.8 0 010-1.2c.3-.3.8-.3 1.1 0L5 6l3.7-3.8z" /></svg>
                    </button>

                    {isBgColorOpen && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-2xl p-2.5 z-50 w-52 space-y-2 animate-fadeIn">
                        <div className="grid grid-cols-5 gap-1.5">
                          {EDITOR_COLOR_PALETTE.flat().map((colorHex, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleApplyBgColor(colorHex)}
                              style={{ backgroundColor: colorHex }}
                              className="w-8 h-8 rounded border border-slate-300/80 hover:scale-110 transition-transform cursor-pointer shadow-2xs"
                            />
                          ))}
                        </div>
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleApplyBgColor('#FEF08A')}
                            className="w-7 h-7 bg-yellow-200 rounded border border-yellow-400 cursor-pointer"
                            title="Sarı Vurgu"
                          />
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleResetColor('bg')}
                            className="w-7 h-7 bg-white rounded border border-slate-300 flex items-center justify-center text-rose-500 font-bold cursor-pointer"
                            title="Vurguyu Kaldır"
                          >
                            ╱
                          </button>
                          <label className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 flex items-center justify-center cursor-pointer transition-colors" title="Özel Vurgu Rengi">
                            🎨
                            <input
                              type="color"
                              onChange={(e) => handleApplyBgColor(e.target.value)}
                              className="sr-only"
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => execCmd('justifyLeft')}
                    title="Sola Hizala"
                    className="p-1.5 hover:bg-slate-200/70 rounded text-slate-700 transition-colors cursor-pointer"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M5 5h14c.6 0 1 .4 1 1s-.4 1-1 1H5a1 1 0 110-2zm0 4h8c.6 0 1 .4 1 1s-.4 1-1 1H5a1 1 0 110-2zm0 8h8c.6 0 1 .4 1 1s-.4 1-1 1H5a1 1 0 010-2zm0-4h14c.6 0 1 .4 1 1s-.4 1-1 1H5a1 1 0 010-2z" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => execCmd('justifyCenter')}
                    title="Ortala"
                    className="p-1.5 hover:bg-slate-200/70 rounded text-slate-700 transition-colors cursor-pointer"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M5 5h14c.6 0 1 .4 1 1s-.4 1-1 1H5a1 1 0 110-2zm3 4h8c.6 0 1 .4 1 1s-.4 1-1 1H8a1 1 0 110-2zm0 8h8c.6 0 1 .4 1 1s-.4 1-1 1H8a1 1 0 010-2zm-3-4h14c.6 0 1 .4 1 1s-.4 1-1 1H5a1 1 0 010-2z" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => execCmd('insertUnorderedList')}
                    title="Madde İşaretli Liste"
                    className="p-1.5 hover:bg-slate-200/70 rounded text-slate-700 transition-colors cursor-pointer"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11 5h8c.6 0 1 .4 1 1s-.4 1-1 1h-8a1 1 0 010-2zm0 6h8c.6 0 1 .4 1 1s-.4 1-1 1h-8a1 1 0 010-2zm0 6h8c.6 0 1 .4 1 1s-.4 1-1 1h-8a1 1 0 010-2zM4.5 6c0-.4.1-.8.4-1 .3-.4.7-.5 1.1-.5.4 0 .8.1 1 .4.4.3.5.7.5 1.1 0 .4-.1.8-.4 1-.3.4-.7.5-1.1.5-.4 0-.8-.1-1-.4-.4-.3-.5-.7-.5-1.1zm0 6c0-.4.1-.8.4-1 .3-.4.7-.5 1.1-.5.4 0 .8.1 1 .4.4.3.5.7.5 1.1 0 .4-.1.8-.4 1-.3.4-.7.5-1.1.5-.4 0-.8-.1-1-.4-.4-.3-.5-.7-.5-1.1zm0 6c0-.4.1-.8.4-1 .3-.4.7-.5 1.1-.5.4 0 .8.1 1 .4.4.3.5.7.5 1.1 0 .4-.1.8-.4 1-.3.4-.7.5-1.1.5-.4 0-.8-.1-1-.4-.4-.3-.5-.7-.5-1.1z" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => execCmd('insertOrderedList')}
                    title="Numaralı Liste"
                    className="p-1.5 hover:bg-slate-200/70 rounded text-slate-700 transition-colors cursor-pointer"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M10 17h8c.6 0 1 .4 1 1s-.4 1-1 1h-8a1 1 0 010-2zm0-6h8c.6 0 1 .4 1 1s-.4 1-1 1h-8a1 1 0 010-2zm0-6h8c.6 0 1 .4 1 1s-.4 1-1 1h-8a1 1 0 110-2zM6 4v3.5c0 .3-.2.5-.5.5a.5.5 0 01-.5-.5V5h-.5a.5.5 0 010-1H6zm-1 8.8l.2.2h1.3c.3 0 .5.2.5.5s-.2.5-.5.5H4.9a1 1 0 01-.9-1V13c0-.4.3-.8.6-1l1.2-.4.2-.3a.2.2 0 00-.2-.2H4.5a.5.5 0 01-.5-.5c0-.3.2-.5.5-.5h1.6c.5 0 .9.4.9 1v.1c0 .4-.3.8-.6 1l-1.2.4-.2.3zM7 17v2c0 .6-.4 1-1 1H4.5a.5.5 0 010-1h1.2c.2 0 .3-.1.3-.3 0-.2-.1-.3-.3-.3H4.4a.4.4 0 110-.8h1.3c.2 0 .3-.1.3-.3 0-.2-.1-.3-.3-.3H4.5a.5.5 0 110-1H6c.6 0 1 .4 1 1z" />
                    </svg>
                  </button>
                </div>

              </div>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleGenerateAiDescription}
                className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold px-3.5 py-1.5 rounded-md shadow-xs hover:shadow transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border border-indigo-500/30"
              >
                <svg className="w-3.5 h-3.5 text-indigo-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                </svg>
                <span>Yapay zeka ile oluştur</span>
              </button>

            </div>

            <div
              ref={editorRef}
              contentEditable
              onBlur={() => handleBlur('description')}
              onInput={handleEditorInput}
              suppressContentEditableWarning
              className="w-full p-4 text-xs sm:text-sm font-medium text-slate-800 outline-none min-h-[180px] max-h-[400px] overflow-y-auto leading-relaxed focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:font-normal [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1"
              data-placeholder="Aracın ek özellikleri, genel durumu ve bilmesi gereken detayları bu alana yazabilirsin..."
            />

          </div>

          {isFieldInvalid('description') && (
            <p className="text-[11px] font-bold text-rose-600 pt-0.5 animate-fadeIn">
              {cleanDescText.length === 0
                ? 'Bu alan zorunludur'
                : 'İlan açıklaması en az 20 karakter olmalıdır.'}
            </p>
          )}

        </div>

        {/* =========================================================================
            BLOK 3: ALT AKSİYON BUTONLARI
           ========================================================================= */}
        <div className="flex items-center justify-between pt-6 pb-12">
          
          <button
            type="button"
            onClick={onBack}
            className="bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 font-bold text-xs sm:text-sm px-6 py-3.5 rounded-lg transition-all cursor-pointer select-none"
          >
            ‹ 1. Adıma Dön
          </button>

          <button 
            type="button"
            disabled={!isStep2Valid}
            onClick={() => {
              const isValid = handleNextWithValidation();
              if (isValid && onNext) onNext();
            }}
            className="bg-rose-500 hover:bg-rose-600 disabled:bg-[#FFF5F7] disabled:text-[#FFC2CB] text-white font-extrabold text-xs sm:text-sm py-3.5 px-8 rounded-lg transition-all shadow-sm disabled:cursor-not-allowed cursor-pointer select-none active:scale-98"
          >
            Devam Et: Ön İzleme ve Yayınla ›
          </button>

        </div>

      </div>
    </div>
  );
});

Step2ListingDetails.displayName = 'Step2ListingDetails';

export default Step2ListingDetails;