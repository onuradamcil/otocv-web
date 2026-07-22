// =========================================================================
// OTO-CV ADIM 2: ARAÇ TEKNİK KATALOĞU (Step2DNA.jsx)
// İşlev: Dinamik 1950-2027+ Yıl Motoru, "Listede Yoksa Manuel Gir" kalkanı
//        ve Supabase Dynamic Catalog entegrasyonu.
// =========================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { 
  fetchCatalogBrands, 
  fetchCatalogSeries, 
  fetchCatalogModels, 
  fetchCatalogPackages 
} from '../../services/catalogService';

export default function Step2DNA({
  onValidationChanged, 
  submitAttempted,
  formData,
  setFormData
}) {

  // 1. REAKTİF KATALOG HAFIZALARI
  const [brands, setBrands] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [modelsList, setModelsList] = useState([]);
  const [packagesList, setPackagesList] = useState([]);

  // Selected IDs
  const [selectedBrandId, setSelectedBrandId] = useState(null);
  const [selectedSeriesId, setSelectedSeriesId] = useState(null);
  const [selectedModelId, setSelectedModelId] = useState(null);

  // Manuel Giriş Modu Sensörleri (Listede Bulamadım Kalkanı)
  const [isCustomSeries, setIsCustomSeries] = useState(false);
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [isCustomPackage, setIsCustomPackage] = useState(false);

  // Yükleme Durumları
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);

  // İlk Yüklemede Markaları Getir
  useEffect(() => {
    async function initBrands() {
      setLoadingBrands(true);
      const data = await fetchCatalogBrands();
      setBrands(data || []);
      setLoadingBrands(false);
    }
    initBrands();
  }, []);

  // 🚀 2. DİNAMİK YIL MOTORU (2027+ Otomasyonu & Klasik Araç Desteği)
  const currentYear = new Date().getFullYear();
  const maxYear = currentYear + 1; // Lansman modelleri (Örn: 2027)
  const minYear = 1950; // Klasik araçlar
  const availableYears = Array.from(
    { length: maxYear - minYear + 1 }, 
    (_, i) => (maxYear - i).toString()
  );

  // 3. SEÇİM HANDLERLARI
  const handleBrandChange = async (brandIdStr) => {
    if (!brandIdStr) {
      setSelectedBrandId(null);
      setSelectedSeriesId(null);
      setSelectedModelId(null);
      setSeriesList([]); setModelsList([]); setPackagesList([]);
      setIsCustomSeries(false); setIsCustomModel(false); setIsCustomPackage(false);
      setFormData(prev => ({ ...prev, brand: '', series: '', model: '', package: '' }));
      return;
    }

    const brandObj = brands.find(b => b.id.toString() === brandIdStr);
    const bId = brandObj ? brandObj.id : brandIdStr;

    setSelectedBrandId(bId);
    setSelectedSeriesId(null); setSelectedModelId(null);
    setIsCustomSeries(false); setIsCustomModel(false); setIsCustomPackage(false);

    setFormData(prev => ({
      ...prev,
      brand: brandObj ? brandObj.name : '',
      series: '', model: '', package: ''
    }));

    setLoadingSeries(true);
    const fetchedSeries = await fetchCatalogSeries(bId);
    setSeriesList(fetchedSeries || []);
    setLoadingSeries(false);
  };

  const handleSeriesChange = async (seriesVal) => {
    if (seriesVal === 'OTHER') {
      setIsCustomSeries(true);
      setSelectedSeriesId('OTHER');
      setSelectedModelId('OTHER');
      setIsCustomModel(true);
      setIsCustomPackage(true);
      setFormData(prev => ({ ...prev, series: '', model: '', package: '' }));
      return;
    }

    setIsCustomSeries(false);
    if (!seriesVal) {
      setSelectedSeriesId(null); setSelectedModelId(null);
      setModelsList([]); setPackagesList([]);
      setFormData(prev => ({ ...prev, series: '', model: '', package: '' }));
      return;
    }

    const seriesObj = seriesList.find(s => s.id.toString() === seriesVal);
    const sId = seriesObj ? seriesObj.id : seriesVal;

    setSelectedSeriesId(sId); setSelectedModelId(null);
    setIsCustomModel(false); setIsCustomPackage(false);

    setFormData(prev => ({
      ...prev,
      series: seriesObj ? seriesObj.name : seriesVal,
      model: '', package: ''
    }));

    setLoadingModels(true);
    const fetchedModels = await fetchCatalogModels(sId);
    setModelsList(fetchedModels || []);
    setLoadingModels(false);
  };

  const handleModelChange = async (modelVal) => {
    if (modelVal === 'OTHER') {
      setIsCustomModel(true);
      setSelectedModelId('OTHER');
      setIsCustomPackage(true);
      setFormData(prev => ({ ...prev, model: '', package: '' }));
      return;
    }

    setIsCustomModel(false);
    if (!modelVal) {
      setSelectedModelId(null); setPackagesList([]);
      setFormData(prev => ({ ...prev, model: '', package: '' }));
      return;
    }

    const modelObj = modelsList.find(m => m.id.toString() === modelVal);
    const mId = modelObj ? modelObj.id : modelVal;

    setSelectedModelId(mId);
    setIsCustomPackage(false);

    setFormData(prev => ({
      ...prev,
      model: modelObj ? modelObj.name : modelVal,
      package: ''
    }));

    setLoadingPackages(true);
    const fetchedPackages = await fetchCatalogPackages(mId);
    setPackagesList(fetchedPackages || []);
    setLoadingPackages(false);
  };

  // VALIDATION CONTROL
  useEffect(() => {
    const isTramerValid = 
      formData?.tramer_status !== 'Tramer Kaydı Var' || 
      (!!formData?.tramer_amount && formData?.tramer_amount.toString().trim() !== '');

    const isValid = 
      !!formData?.brand?.trim() && 
      !!formData?.series?.trim() && 
      !!formData?.model?.trim() && 
      !!formData?.year && 
      !!formData?.package?.trim() &&
      !!formData?.fuel_type &&
      !!formData?.transmission &&
      !!formData?.color?.trim() &&
      !!formData?.tramer_status &&
      isTramerValid;

    if (onValidationChanged) {
      onValidationChanged(isValid);
    }
  }, [
    formData?.brand, formData?.series, formData?.model, formData?.year, 
    formData?.package, formData?.fuel_type, formData?.transmission, 
    formData?.color, formData?.tramer_status, formData?.tramer_amount,
    onValidationChanged
  ]);

  const showError = (fieldValue) => submitAttempted && (!fieldValue || fieldValue === '');
  const handleDirectChange = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const formatTramerSeparator = (value) => {
    if (!value) return '';
    let clean = value.replace(/\./g, '').replace(/[^0-9]/g, '');
    if (clean.length > 9) clean = clean.substring(0, 9);
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      
      {/* BAŞLIK */}
      <div className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100/80 px-3 py-1.5 rounded-xl text-indigo-700 text-xs font-bold tracking-wide">
        TEKNİK FABRİKA KATALOĞU & DNA
      </div>

      <div className="space-y-1">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
          Araç Katalog ve DNA Doğrulaması
        </h2>
        <p className="text-xs md:text-sm text-slate-400 font-medium">
          Aracınızın tescil sicilini hatasız oluşturabilmek için verileri doğrulayın.
        </p>
      </div>

      {/* DROPDOWN KATALOG GRUBU */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
        
        {/* 1. MARKA */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 tracking-wide block uppercase">ÜRETİCİ / MARKA *</label>
          <select
            value={selectedBrandId ? selectedBrandId.toString() : ''}
            onChange={(e) => handleBrandChange(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-semibold text-sm focus:border-indigo-600"
          >
            <option value="">{loadingBrands ? 'Markalar Yükleniyor...' : 'Marka Seçin'}</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id.toString()}>{brand.name}</option>
            ))}
          </select>
        </div>

        {/* 2. MODEL SERİSİ (MANUEL GİRİŞ KALKANI DAHİL) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 tracking-wide block uppercase">MODEL SERİSİ *</label>
          {!isCustomSeries ? (
            <select
              value={selectedSeriesId ? selectedSeriesId.toString() : ''}
              disabled={!selectedBrandId || loadingSeries}
              onChange={(e) => handleSeriesChange(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-semibold text-sm focus:border-indigo-600 disabled:bg-slate-50"
            >
              <option value="">
                {loadingSeries ? 'Seriler Yükleniyor...' : selectedBrandId ? 'Seri Seçin' : 'Üretici Seçimi Bekleniyor...'}
              </option>
              {seriesList.map((s) => (
                <option key={s.id} value={s.id.toString()}>{s.name}</option>
              ))}
              {selectedBrandId && <option value="OTHER">➕ Listede Bulamadım (Manuel Gir)</option>}
            </select>
          ) : (
            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="Model serisini yazın (Örn: 3 Serisi)"
                value={formData.series || ''}
                onChange={(e) => handleDirectChange('series', e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-indigo-300 rounded-xl font-semibold text-sm focus:border-indigo-600"
              />
              <button 
                type="button"
                onClick={() => setIsCustomSeries(false)}
                className="px-3 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                Listeye Dön
              </button>
            </div>
          )}
        </div>

        {/* 3. MOTOR / ALT MODEL */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 tracking-wide block uppercase">MOTOR / ALT MODEL *</label>
          {!isCustomModel ? (
            <select
              value={selectedModelId ? selectedModelId.toString() : ''}
              disabled={!selectedSeriesId || loadingModels}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-semibold text-sm focus:border-indigo-600 disabled:bg-slate-50"
            >
              <option value="">
                {loadingModels ? 'Modeller Yükleniyor...' : selectedSeriesId ? 'Motor / Alt Model Seçin' : 'Seri Seçimi Bekleniyor...'}
              </option>
              {modelsList.map((m) => (
                <option key={m.id} value={m.id.toString()}>{m.name}</option>
              ))}
              {selectedSeriesId && <option value="OTHER">➕ Listede Bulamadım (Manuel Gir)</option>}
            </select>
          ) : (
            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="Motor/Model yazın (Örn: 320i)"
                value={formData.model || ''}
                onChange={(e) => handleDirectChange('model', e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-indigo-300 rounded-xl font-semibold text-sm focus:border-indigo-600"
              />
              <button 
                type="button"
                onClick={() => setIsCustomModel(false)}
                className="px-3 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                Listeye Dön
              </button>
            </div>
          )}
        </div>

        {/* 4. MODEL YILI (1950 - 2027 DİNAMİK LİSTE) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 tracking-wide block uppercase">MODEL YILI *</label>
          <select
            value={formData?.year || ''}
            disabled={!selectedModelId}
            onChange={(e) => handleDirectChange('year', e.target.value || null)}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-semibold text-sm focus:border-indigo-600 disabled:bg-slate-50"
          >
            <option value="">{selectedModelId ? 'Yıl Seçin' : 'Motor Seçimi Bekleniyor...'}</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* 5. DONANIM / PAKET */}
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-[11px] font-bold text-slate-500 tracking-wide block uppercase">DONANIM / PAKET *</label>
          {!isCustomPackage ? (
            <select
              value={formData?.package || ''}
              disabled={!formData?.year || loadingPackages}
              onChange={(e) => {
                if (e.target.value === 'OTHER') {
                  setIsCustomPackage(true);
                  handleDirectChange('package', '');
                } else {
                  handleDirectChange('package', e.target.value || null);
                }
              }}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-semibold text-sm focus:border-indigo-600 disabled:bg-slate-50"
            >
              <option value="">{loadingPackages ? 'Paketler Yükleniyor...' : formData?.year ? 'Paket Seçin' : 'Yıl Seçimi Bekleniyor...'}</option>
              {packagesList.map((p) => (
                <option key={p.id || p.name} value={p.name}>{p.name}</option>
              ))}
              {formData?.year && <option value="OTHER">➕ Listede Bulamadım (Manuel Gir)</option>}
            </select>
          ) : (
            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="Donanım paketini yazın (Örn: M Sport / Edition)"
                value={formData.package || ''}
                onChange={(e) => handleDirectChange('package', e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-indigo-300 rounded-xl font-semibold text-sm focus:border-indigo-600"
              />
              <button 
                type="button"
                onClick={() => setIsCustomPackage(false)}
                className="px-3 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                Listeye Dön
              </button>
            </div>
          )}
        </div>

      </div>

      <div className="w-full h-px bg-slate-100 pt-1" />

      {/* YAPISAL VE TRAMER ALANI (KORUNDU) */}
      <div className="space-y-5">
        <h3 className="text-xs font-bold text-indigo-600 tracking-wider uppercase">Araç Yapısal ve Tramer Nitelikleri</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* YAKIT TİPİ */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 tracking-wide block uppercase">YAKIT TİPİ *</label>
            <div className="grid grid-cols-4 gap-2 p-1 bg-slate-50 border border-gray-200 rounded-xl">
              {['Elektrik', 'Benzin', 'Dizel', 'Hibrit'].map((fuel) => (
                <button
                  key={fuel}
                  type="button"
                  onClick={() => handleDirectChange('fuel_type', fuel)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    formData?.fuel_type === fuel ? 'bg-[#4F46E5] text-white' : 'bg-white text-slate-600'
                  }`}
                >
                  {fuel}
                </button>
              ))}
            </div>
          </div>

          {/* VİTES TİPİ */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 tracking-wide block uppercase">VİTES TİPİ *</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-50 border border-gray-200 rounded-xl">
              {['Otomatik', 'Manuel'].map((trans) => (
                <button
                  key={trans}
                  type="button"
                  onClick={() => handleDirectChange('transmission', trans)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    formData?.transmission === trans ? 'bg-[#4F46E5] text-white' : 'bg-white text-slate-600'
                  }`}
                >
                  {trans}
                </button>
              ))}
            </div>
          </div>

          {/* GÖVDE RENGİ */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 tracking-wide block uppercase">GÖVDE RENGİ *</label>
            <input
              type="text"
              placeholder="Örn: Gümüş, İnci Beyazı"
              value={formData?.color || ''}
              onChange={(e) => handleDirectChange('color', e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl font-semibold text-sm focus:border-indigo-600"
            />
          </div>

          {/* TRAMER DURUMU */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 tracking-wide block uppercase">TRAMER / HASAR DURUMU *</label>
            <select
              value={formData?.tramer_status || ''}
              onChange={(e) => {
                const val = e.target.value || null;
                handleDirectChange('tramer_status', val);
                if (val !== 'Tramer Kaydı Var') handleDirectChange('tramer_amount', '');
              }}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-semibold text-sm focus:border-indigo-600"
            >
              <option value="">Tramer Durumunu Seçin</option>
              <option value="Hasarsız">Hasarsız / Orijinal</option>
              <option value="Tramer Kaydı Var">Tramer Kaydı Var</option>
            </select>
          </div>

          {/* KOŞULLU TRAMER TUTARI */}
          {formData?.tramer_status === 'Tramer Kaydı Var' && (
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[11px] font-bold text-indigo-600 tracking-wide block uppercase">TOPLAM TRAMER TUTARI (TL) *</label>
              <input
                type="text"
                placeholder="Örn: 12.500"
                value={formData?.tramer_amount || ''}
                onChange={(e) => handleDirectChange('tramer_amount', formatTramerSeparator(e.target.value))}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl font-semibold text-sm font-mono focus:border-indigo-600"
              />
            </div>
          )}

        </div>
      </div>

    </div>
  );
}